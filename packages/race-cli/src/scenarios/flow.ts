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
import fs from 'fs/promises';

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

    // logger.info('Executing warming run...');
    // await executeWarmingRun({
    //   data: context,
    // });

    // await enableOutboundRequests(false);
    // logger.info('Warming runs complete!');

    // Configure how we want the results reported
    const resultsReporter = new LHResultsReporter({
      outputs: [
        ReportingTypes.Aggregate,
        // ...(context.includeIndividual
        //   ? [ReportingTypes.IndividualRunsReporter]
        //   : []),
        ...(context.outputFormat.includes(FORMAT_HTML)
          ? [ReportingTypes.LighthouseHtml]
          : []),
        // ...(context.outputFormat.includes(FORMAT_CSV)
        //   ? [ReportingTypes.Repository]
        //   : []),
      ],
      repositoryId: 'blah', //context.repositoryId,
      targetUrl: 'blah', //context.targetUrl,
      deviceType: context.deviceType,
      outputFormat: context.outputFormat,
      outputTarget: context.outputTarget,
      numberRuns: context.numberRuns,
    });

    await resultsReporter.prepare();
    logger.info(`Beginning User flows from script ${context.testFile}`);

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

    // resultsArray.forEach(async (result, i) => {
    //   console.log(`Result report ${i}`, result.report?.slice(0, 100));

    //   // Just write the file for now
    //   return await fs
    //     .writeFile(`./results/my_report_${i}.html`, result.report || '', {
    //       flag: 'w',
    //     })
    //     .catch((e) => console.log('fs error', e?.message));
    // });

    process.exit(0);
  }
}
