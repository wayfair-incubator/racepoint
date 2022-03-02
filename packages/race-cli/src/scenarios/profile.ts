import {ScenarioContext, Scenario} from '../types';
import path from 'path';
import compose from 'docker-compose';
import async from 'async';
import retry from 'async-await-retry';
import {LHResultsReporter, ReportingTypes} from '../reporters/index';
import {handleStartRacer, collectAndPruneResults} from './handlers';
import {LighthouseResultsWrapper} from '@racepoint/shared';
import logger from '../logger';
import cliProgress from 'cli-progress';
import chalk from 'chalk';

const MAX_RETRIES = 100;
const RETRY_INTERVAL_MS = 3000;
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
  raceproxyPort: string;
  racerPort: string;
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

    logger.info('Preparing Docker images...');
    try {
      await compose.buildAll({
        cwd: dockerPath,
        log: isDebug,
      });
    } catch (e) {
      logger.info('Failed to start. Is Docker running?');
      process.exit();
    }
    try {
      await compose.upAll({
        cwd: dockerPath,
        log: isDebug,
        env: {
          ...process.env,
          RACER_PORT: context.racerPort,
          RACEPROXY_PORT: context.raceproxyPort,
        },
      });
    } catch (e) {
      logger.info('Failed to start. Check your Docker configuration');
      process.exit();
    }

    const processingQueue = async.queue(() => {
      // Number of elements to be processed.
      const remaining = processingQueue.length();
      if (remaining === 0) {
        logger.debug('Queue complete');
      }
    }, 2);

    const multibar = new cliProgress.MultiBar(
      {
        // Hide the multibar in debug mode so it doesn't mess up the other logs
        format: isDebug
          ? ''
          : '{step} |' +
            chalk.green('{bar}') +
            '| {percentage}% | {value}/{total}',
      },
      cliProgress.Presets.rect
    );

    const runsCounter = multibar.create(context.numberRuns, 0, {
      step: 'Runs requested',
    });
    const resultsCounter = multibar.create(context.numberRuns, 0, {
      step: 'Results received',
    });

    const checkQueue = async () => {
      return new Promise<void>((resolve, reject) => {
        if (numProcessed + numFailed === context.numberRuns) {
          resolve();
        } else {
          reject('Queue is not done processing');
        }
      });
    };

    const raceUrlAndProcess = async () =>
      handleStartRacer({
        port: parseInt(context.racerPort, 10),
        data: context,
      }).then((jobId: number) => {
        const tryGetResults = retry(
          () =>
            collectAndPruneResults({
              jobId,
              port: parseInt(context.racerPort, 10),
              retrieveHtml: context.outputFormat.includes(FORMAT_HTML),
            }).then((result: LighthouseResultsWrapper) => {
              resultsArray.push(result);
              numProcessed++;
              // Update the counter for number of results received
              resultsCounter.update(numProcessed);
            }),
          [],
          {
            retriesMax: MAX_RETRIES,
            interval: RETRY_INTERVAL_MS,
          }
        ).catch(() => {
          numFailed++;
          logger.error(`Results failed after ${MAX_RETRIES} retries!`);
        });

        processingQueue.push(tryGetResults);
      });

    // Configure how we want the results reported
    const resultsReporter = new LHResultsReporter({
      outputs: [
        ReportingTypes.ConsoleReporter,
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
    logger.info(`Beginning Lighthouse runs for ${context.targetUrl}`);

    for (let i = 1; i <= context.numberRuns; i++) {
      try {
        await retry(raceUrlAndProcess, [], {
          retriesMax: MAX_RETRIES,
          interval: RETRY_INTERVAL_MS,
        });
      } catch {
        logger.error(`Fetch failed after ${MAX_RETRIES} retries!`);
      }
      // Update the counter for fetches sent
      runsCounter.update(i);
    }

    // Wait until all the results have been processed
    await retry(checkQueue, [], {
      retriesMax: 100,
      interval: RETRY_INTERVAL_MS,
    });

    // Stop the progress bar
    multibar.stop();

    // Shut down container if success or failure
    compose.down({
      log: isDebug,
    });

    // Time to process the results
    resultsArray.forEach((result: LighthouseResultsWrapper) => {
      resultsReporter.process(result);
    });
  }
}
