import {ProfileContext, Scenario} from '../types';
import {LHResultsReporter, ReportingTypes} from '../reporters/index';
import {
  handleStartRacer,
  collectAndPruneResults,
  executeWarmingRun,
  enableOutboundRequests,
  retrieveCacheStatistics,
  retryableQueue,
} from './racer-client';
import {UserFlowResultsWrapper} from '@racepoint/shared';
import logger from '../logger';

const FORMAT_CSV = 'csv';
const FORMAT_HTML = 'html';

export const PROFILE_COMMAND = 'profile';

export class ProfileScenario extends Scenario<ProfileContext> {
  getCommand(): string {
    return PROFILE_COMMAND;
  }

  buildContext(userArgs: any): ProfileContext {
    return new ProfileContext(userArgs);
  }

  async runScenario(context: ProfileContext): Promise<void> {
    process.on('SIGINT', function () {
      logger.warn('\nGracefully shutting down from SIGINT (Ctrl-C)');
      process.exit(0);
    });

    logger.info('Executing warming run...');
    await executeWarmingRun({
      data: context,
      warmingFunc: handleStartRacer,
    });

    await enableOutboundRequests(false);
    logger.info('Warming runs complete!');

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

    const resultsArray = await retryableQueue({
      enqueue: () =>
        handleStartRacer({
          data: context,
        }),
      processResult: (jobId: number) =>
        collectAndPruneResults({
          jobId,
          retrieveHtml: context.outputFormat.includes(FORMAT_HTML),
        }),
      numberRuns: context.numberRuns,
    });

    // Time to process the results
    resultsArray.forEach(async (result: UserFlowResultsWrapper) => {
      await resultsReporter.process(result);
    });

    // Do we want an option to disable this?
    const cacheStats = await retrieveCacheStatistics();
    // Re-enable outbound requests
    await enableOutboundRequests(true);

    await resultsReporter.finalize(cacheStats);
    process.exit(0);
  }
}
