import {ScenarioContext, Scenario} from './types';
import path from 'path';
import compose from 'docker-compose';
import axios, {AxiosError, AxiosResponse} from 'axios';
import async from 'async';
import retry from 'async-await-retry';
import {LHResultsReporter, ReportingTypes} from './report';
import {collectAndPruneResults, handleRacerError} from './handlers';
import {LighthouseResultsWrapper} from '@racepoint/shared';
import logger from './logger';

const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 500;
const FORMAT_CSV = 'csv';
const FORMAT_HTML = 'html';

const isDebug = process.env.LOG_LEVEL === 'debug';

export const PROFILE_COMMAND = 'profile';

class ProfileContext implements ScenarioContext {
  targetUrl: string;
  deviceType: 'Mobile' | 'Desktop';
  numberRuns: number;
  outputFormat: string[];
  outputTarget: string;
  overrideChromeFlags: boolean;
  raceproxyPort: number;
  racerPort: number;
  repositoryId: string;

  constructor(userArgs: any) {
    this.targetUrl = userArgs?.targetUrl || '';
    this.deviceType = userArgs?.deviceType;
    this.numberRuns = userArgs?.numberRuns;
    this.outputFormat = userArgs?.outputFormat;
    this.outputTarget = userArgs?.outputTarget;
    this.overrideChromeFlags = userArgs?.overrideChromeFlags;
    this.raceproxyPort = userArgs?.raceproxyPort;
    this.racerPort = userArgs?.racerPort;
    this.repositoryId = userArgs?.repositoryId;
  }
}

export class ProfileScenario extends Scenario<ProfileContext> {
  getCommand(): string {
    return PROFILE_COMMAND;
  }

  buildContext(userArgs: any): ProfileContext {
    return new ProfileContext(userArgs);
  }

  async runScenario(context: ProfileContext): Promise<void> {
    let resultsArray: any = [];
    let numProcessed = 0;
    let numFailed = 0;

    const dockerPath = path.join(__dirname, '..', '..');

    const processingQueue = async.queue((task: any, completed: any) => {
      // logger.info("Currently Busy Processing Task " + task);
      // Number of elements to be processed.
      const remaining = processingQueue.length();
      completed(null, {task, remaining});
    }, 2);

    const checkQueue = async () => {
      return new Promise<void>((resolve, reject) => {
        if (numProcessed + numFailed === context.numberRuns) {
          resolve();
        } else {
          reject('Queue is not done processing');
        }
      });
    };

    compose.buildAll({cwd: dockerPath}).then(() =>
      compose.upAll({cwd: dockerPath, log: isDebug}).then(
        async () => {
          // Configure how we want the results reported
          const resultsReporter = new LHResultsReporter({
            outputs: [
              ReportingTypes.Console,
              ...(context.outputFormat.includes(FORMAT_HTML)
                ? [ReportingTypes.LighthouseHtml]
                : []),
              ...(context.outputFormat.includes(FORMAT_CSV)
                ? [ReportingTypes.Repository]
                : []),
            ],
            repositoryId: context.repositoryId,
            targetUrl: context.targetUrl,
            requestedRuns: context.numberRuns,
            outputTarget: context.outputTarget,
          });

          await resultsReporter.prepare();

          const racerUrl = `http://localhost:${context.racerPort}/race`;

          const fetchUrl = async () =>
            axios
              .post(racerUrl, context)
              .then(async (response: AxiosResponse) => {
                const jobId = response.data?.jobId;
                if (jobId) {
                  logger.debug(`Success queuing ${jobId}`);

                  const tryGetResults = retry(
                    () =>
                      collectAndPruneResults(
                        jobId,
                        context.racerPort,
                        (result: LighthouseResultsWrapper) => {
                          resultsArray.push(result);
                          numProcessed++;
                        }
                      ),
                    [],
                    {
                      retriesMax: 20,
                      interval: 3000,
                    }
                  ).catch((err) => {
                    numFailed++;
                    logger.debug(`Results failed after ${20} retries!`);
                  });

                  processingQueue.push(
                    tryGetResults,
                    (error: any, {remaining}: any) => {
                      if (error) {
                        logger.debug('Processing queue failure');
                      } else if (remaining === 0) {
                        logger.debug('Queue complete');
                      }
                    }
                  );

                  return jobId;
                }
              })
              .catch((error: AxiosError) => handleRacerError(error));

          for (let i = 0; i < context.numberRuns; i++) {
            await retry(fetchUrl, [], {
              retriesMax: 20,
              interval: 3000,
            }).catch((error: AxiosError) => {
              logger.info(`Fetch failed after ${20} retries!`);
            });
          }

          logger.info('Now checking for results');

          // Wait until all the results have been processed
          await retry(checkQueue, [], {
            retriesMax: 100,
            interval: 3000,
          }).catch((e) => {
            // Do nothing atm
          });

          // Shut down container if success or failure
          compose.down({
            log: isDebug,
          });

          // Time to process the results
          resultsArray.forEach((result: LighthouseResultsWrapper) => {
            resultsReporter.process(result);
          });
        },
        (err) => {
          logger.info('Something went wrong:', err.message);
        }
      )
    );
  }
}
