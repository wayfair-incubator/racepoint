import {FlowContext, Scenario} from '../types';
import {
  collectAndPruneResults,
  retryableQueue,
  handleStartUserFlow,
} from './racer-client';
import logger from '../logger';
import fs from 'fs/promises';

export const FLOW_COMMAND = 'flow';

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

    const resultsArray = await retryableQueue({
      enqueue: async () =>
        handleStartUserFlow({
          data: context,
        }),
      processResult: async (jobId: number) =>
        collectAndPruneResults({
          jobId,
          retrieveHtml: true, //context.outputFormat.includes(FORMAT_HTML),
        }),
      numberRuns: context.numberRuns,
    });

    // Just write the file for now
    await fs
      .writeFile('./results/my_report.html', resultsArray[0].report, {
        flag: 'w',
      })
      .catch((e) => console.log('fs error', e?.message));

    process.exit(0);
  }
}
