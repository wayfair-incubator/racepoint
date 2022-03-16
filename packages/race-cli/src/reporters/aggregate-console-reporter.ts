import {std, mean, round} from 'mathjs';
import fs from 'fs/promises';
import json2md from 'json2md';
import {LighthouseResultsWrapper} from '@racepoint/shared';
import {BaseRacepointReporter, LightHouseAuditKeys} from '../types';
import logger from '../logger';

const STD_DEVIATION_KEY = 'Std Dev';
const MEAN_KEY = 'Mean';

const resultsToMarkdown = (data: any) => {
  const rows = Array.from(Object.keys(data), (key) => ({
    ['Index']: key,
    [MEAN_KEY]: data[key][MEAN_KEY],
    [STD_DEVIATION_KEY]: data[key][STD_DEVIATION_KEY],
  }));

  return json2md([
    {h1: 'Lighthouse Aggregated Results'},
    {
      table: {
        headers: ['Index', MEAN_KEY, STD_DEVIATION_KEY],
        rows,
      },
    },
  ]);
};

export class AggregateConsoleReporter extends BaseRacepointReporter {
  private collectedData: {[key: string]: number[]} = {};
  private reportPath: string;
  private outputMarkdown: boolean;

  constructor(outputTarget: string, outputMarkdown: boolean) {
    super();
    Object.values(LightHouseAuditKeys).forEach((value) => {
      this.collectedData[value] = [];
    });
    this.reportPath = outputTarget || '';
    this.outputMarkdown = outputMarkdown || false;
  }

  process = async (results: LighthouseResultsWrapper) => {
    Object.values(LightHouseAuditKeys).forEach((value) => {
      this.collectedData[value].push(results.lhr.audits[value].numericValue);
    });
  };

  async finalize(): Promise<void> {
    logger.info('Calculating Summary:');
    let table: {[metric: string]: SummaryRow} = {};
    Object.entries(LightHouseAuditKeys).forEach(([key, value]) => {
      table[key] = this.calculateRow(this.collectedData[value]);
    });

    console.table(table);

    const report = resultsToMarkdown(table);

    return this.outputMarkdown
      ? fs
          .writeFile(`${this.reportPath}/aggregate-report.md`, report, {
            flag: 'w',
          })
          .then(() => {
            logger.debug(`Lighthouse HTML results successfully saved`);
          })
          .catch((e) => {
            logger.error('Failed to write results', e);
          })
      : Promise.resolve();
  }

  private calculateRow(data: number[]): SummaryRow {
    std;
    return {
      [MEAN_KEY]: round(mean(data), 4),
      [STD_DEVIATION_KEY]: round(std(data, 'unbiased'), 4),
    };
  }
}

interface SummaryRow {
  [MEAN_KEY]: number;
  [STD_DEVIATION_KEY]: number;
}
