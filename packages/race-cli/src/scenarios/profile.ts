import async from 'async';
import retry from 'async-await-retry';
import {ProfileContext, Scenario} from '../types';
import {LHResultsReporter, ReportingTypes} from '../reporters/index';
import {
  handleStartRacer,
  collectAndPruneResults,
  executeWarmingRun,
} from './racer-client';
import {LighthouseResultsWrapper} from '@racepoint/shared';
import logger from '../logger';
import axios, {AxiosError, AxiosResponse} from 'axios';

const MAX_RETRIES = 100;
const RETRY_INTERVAL_MS = 3000;
const FORMAT_CSV = 'csv';
const FORMAT_HTML = 'html';

const CACHE_CONTROL_ENDPOINT = '/rp-cache-control';
const raceProxyServer = process.env?.RACEPROXY_SERVER || 'localhost';

export const PROFILE_COMMAND = 'profile';

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

    process.on('SIGINT', function () {
      logger.warn('\nGracefully shutting down from SIGINT (Ctrl-C)');
      process.exit(0);
    });

    logger.info('Executing warming run...');
    await executeWarmingRun({
      data: context,
    });
    logger.info('Warming runs complete!');

    // Do something here to turn off cache
    await axios
      .post(`http://${raceProxyServer}${CACHE_CONTROL_ENDPOINT}`, {
        enableOutboundRequests: false,
      })
      .then((response: AxiosResponse) => {
        console.log('🐞 Cache disabled after warmup', response.status);
      })
      .catch((error: Error | AxiosError) => {
        console.log('👹', error);
      });

    console.log('Moving onward');

    const processingQueue = async.queue(() => {
      // Number of elements to be processed.
      const remaining = processingQueue.length();
      if (remaining === 0) {
        logger.debug('Queue complete');
      }
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
    // Do we want a flag for this?
    const blockAfterWarming = true;

    const raceUrlAndProcess = async () =>
      handleStartRacer({
        data: {
          ...context,
          extraHeaders: {
            ...context?.extraHeaders,
            //...(blockAfterWarming && {[RP_CACHE_POLICY_HEADER]: 'disable'}),
          },
        },
      }).then((jobId: number) => {
        const tryGetResults = retry(
          () =>
            collectAndPruneResults({
              jobId,
              retrieveHtml: context.outputFormat.includes(FORMAT_HTML),
            }).then((result: LighthouseResultsWrapper) => {
              resultsArray.push(result);
              numProcessed++;
              logger.info(
                `Results received [${numProcessed}/${context.numberRuns}]`
              );
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
        ReportingTypes.Aggregate,
        ...(context.includeIndividual
          ? [ReportingTypes.IndividualRunsReporter]
          : []),
        ...(context.outputFormat.includes(FORMAT_HTML)
          ? [ReportingTypes.LighthouseHtml]
          : []),
        ...(context.outputFormat.includes(FORMAT_CSV)
          ? [ReportingTypes.Repository]
          : []),
      ],
      repositoryId: context.repositoryId,
      targetUrl: context.targetUrl,
      deviceType: context.deviceType,
      outputFormat: context.outputFormat,
      outputTarget: context.outputTarget,
      numberRuns: context.numberRuns,
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
      logger.debug(`Requested run [${i}/${context.numberRuns}]`);
    }

    // Wait until all the results have been processed
    await retry(checkQueue, [], {
      retriesMax: 100,
      interval: RETRY_INTERVAL_MS,
    });

    // Time to process the results
    resultsArray.forEach(async (result: LighthouseResultsWrapper) => {
      await resultsReporter.process(result);
    });

    await resultsReporter.finalize();
    process.exit(0);
  }
}
