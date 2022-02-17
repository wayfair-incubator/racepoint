import {ScenarioContext, Scenario} from './types';
import path from 'path';
import compose from 'docker-compose';
import axios, {AxiosError, AxiosResponse} from 'axios';
import async from 'async';
import retry from 'async-await-retry';
import {LHResultsReporter, ReportingTypes} from './report';
import {deleteResult, handleRacerError} from './handlers';
import {LighthouseResultsWrapper} from '@racepoint/shared';
import logger from './logger';

const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 500;

export const PROFILE_COMMAND = 'profile';

class ProfileContext implements ScenarioContext {
  targetUrl: string;
  deviceType: 'Mobile' | 'Desktop';
  numberRuns: number;
  outputFormat: 'JSON' | 'HTML';
  outputTarget: string;
  overrideChromeFlags: boolean;
  raceproxyPort: number;
  racerPort: number;

  constructor(userArgs: any) {
    this.targetUrl = userArgs?.targetUrl || '';
    this.deviceType = userArgs?.deviceType;
    this.numberRuns = userArgs?.numberRuns;
    this.outputFormat = userArgs?.outputFormat;
    this.outputTarget = userArgs?.outputTarget;
    this.overrideChromeFlags = userArgs?.overrideChromeFlags;
    this.raceproxyPort = userArgs?.raceproxyPort;
    this.racerPort = userArgs?.racerPort;
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

    const fetchResults = async (
      jobId: number,
      callback: Function = () => {}
    ): Promise<void> =>
      axios
        .get(`http://localhost:${context.racerPort}/results/${jobId}`)
        .then((response: AxiosResponse) => {
          callback();

          logger.debug(`Success fetching ${jobId}`);

          const result: LighthouseResultsWrapper = {
            lhr: response.data,
            report: '',
          };

          resultsArray.push(result);
          numProcessed++;
        })
        .catch((error: AxiosError) => {
          logger.debug('Still awaiting results...');
          // results for this ID aren't ready yet, so throw an error and try again
          throw new Error();
        });

    const collectAndPruneResults = async (jobId: number) =>
      fetchResults(jobId).then(async () =>
        deleteResult(jobId, context.racerPort)
      );

    const dockerPath = path.join(__dirname, '..', '..');

    const processingQueue = async.queue((task: any, completed: any) => {
      // console.log("Currently Busy Processing Task " + task);
      // Number of elements to be processed.
      const remaining = processingQueue.length();
      completed(null, {task, remaining});
    }, 2);

    compose.buildAll({cwd: dockerPath}).then(() =>
      compose.upAll({cwd: dockerPath, log: true}).then(
        async () => {
          // Configure how we want the results reported
          const resultsReporter = new LHResultsReporter({
            outputs: [
              ReportingTypes.Console,
              // ReportingTypes.ConsoleRunCounter,
              // ReportingTypes.Repository,
            ],
            repositoryId: context.outputTarget,
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
                  logger.info(`Successfully queued ${jobId}`);

                  const item = retry(() => collectAndPruneResults(jobId), [], {
                    retriesMax: 20,
                    interval: 3000,
                  }).catch((err) => {
                    numFailed++;
                    console.log(`Results failed after ${20} retries!`);
                  });

                  processingQueue.push(
                    item,
                    (error: any, {item, remaining}: any) => {
                      if (error) {
                        console.log('Processing queue failure');
                      } else if (remaining === 0) {
                        console.log('Queue complete');
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
            }).catch((err) => {
              console.log(`Fetch failed after ${20} retries!`);
            });
          }

          console.log('Now checking for results');

          const checkQueue = async () => {
            return new Promise<void>((resolve, reject) => {
              if (numProcessed + numFailed === context.numberRuns) {
                resolve();
              } else {
                reject('Queue is not done');
              }
            });
          };

          // Wait until all the results have been processed
          await retry(checkQueue, [], {
            retriesMax: 100,
            interval: 3000,
          }).catch((e) => {
            // Do nothing atm
          });

          // console.log(resultsArray);
          compose.down({
            //log: true
          });

          // Time to process the results
          resultsArray.forEach((result: LighthouseResultsWrapper) => {
            resultsReporter.process(result);
          });

          // Shut down container if success or failure
        },
        (err) => {
          console.log('Something went wrong:', err.message);
        }
      )
    );
  }
}
