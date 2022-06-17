import {FlowContext, Scenario} from '../types';
import {
  collectAndPruneResults,
  retryableQueue,
  handleStartUserFlow,
  executeWarmingRun,
  enableOutboundRequests,
  retrieveCacheStatistics,
} from './racer-client';
import {LHResultsReporter, ReportingTypes} from '../reporters/index';
import {UserFlowResultsWrapper} from '@racepoint/shared';
import logger from '../logger';

export const FLOW_COMMAND = 'flow';
const FORMAT_HTML = 'html';

export class FlowScenario extends Scenario<FlowContext> {
  getCommand(): string {
    return FLOW_COMMAND;
  }

  buildContext(userArgs: any): FlowContext {
    return new FlowContext(userArgs);
  }

  async runScenario(context: FlowContext): Promise<void> {
    process.on('SIGINT', function () {
      logger.warn('\nGracefully shutting down from SIGINT (Ctrl-C)');
      process.exit(0);
    });

    logger.info('Executing warming run...');
    await executeWarmingRun({
      data: context,
      warmingFunc: handleStartUserFlow,
    });

    await enableOutboundRequests(false);
    logger.info('Warming runs complete!');

    // Configure how we want the results reported
    const resultsReporter = new LHResultsReporter({
      outputs: [
        ReportingTypes.Aggregate,
        ...(context.outputFormat.includes(FORMAT_HTML)
          ? [ReportingTypes.LighthouseHtml]
          : []),
      ],
      repositoryId: '',
      targetUrl: context.testFilename,
      deviceType: context.deviceType,
      outputFormat: context.outputFormat,
      outputTarget: context.outputTarget,
      numberRuns: context.numberRuns,
    });

    await resultsReporter.prepare();
    logger.info(
      `Beginning Lighthouse user flows from script ${context.testFilename}`
    );

    const resultsArray: UserFlowResultsWrapper[] = await retryableQueue({
      enqueue: async () =>
        handleStartUserFlow({
          data: context,
        }),
      processResult: async (jobId: number) =>
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

    const cacheStats = await retrieveCacheStatistics();
    // Re-enable outbound requests
    await enableOutboundRequests(true);

    await resultsReporter.finalize(cacheStats);
    process.exit(0);
  }
}
