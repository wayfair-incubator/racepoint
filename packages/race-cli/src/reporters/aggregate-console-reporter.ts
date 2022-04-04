import {std, mean, round} from 'mathjs';
import fs from 'fs/promises';
import json2md from 'json2md';
import {LighthouseResultsWrapper} from '@racepoint/shared';
import {
  BaseRacepointReporter,
  LightHouseAuditKeys,
  ProfileConfig,
} from '../types';
import logger from '../logger';

const STD_DEVIATION_KEY = 'Standard Deviation';
const MEAN_KEY = 'Mean';
const METRIC_KEY = 'Metric';
const FORMAT_MD = 'md';

const resultsToMarkdown = (data: any, settings: ProfileConfig) => {
  const rows = Array.from(Object.keys(data), (key) => ({
    [METRIC_KEY]: key,
    [MEAN_KEY]: data[key][MEAN_KEY],
    [STD_DEVIATION_KEY]: data[key][STD_DEVIATION_KEY],
  }));

  return json2md([
    {h2: 'Racepoint Aggregated Results'},
    {p: `Device Type: ${settings.deviceType}`},
    {p: `Target Url: ${settings.targetUrl}`},
    {p: `Number of Runs: ${settings.numberRuns}`},
    {
      table: {
        headers: [METRIC_KEY, MEAN_KEY, STD_DEVIATION_KEY],
        rows,
      },
    },
  ]);
};

export class AggregateConsoleReporter extends BaseRacepointReporter {
  private collectedData: {[key: string]: number[]} = {};
  private reportPath: string;
  private outputMarkdown: boolean;
  private settings: ProfileConfig;

  constructor(options: ProfileConfig) {
    super();
    Object.values(LightHouseAuditKeys).forEach((value) => {
      this.collectedData[value] = [];
    });
    this.reportPath = options.outputTarget || '';
    this.outputMarkdown = options.outputFormat.includes(FORMAT_MD) || false;
    this.settings = options;
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

    return this.outputMarkdown
      ? fs
          .writeFile(
            `${this.reportPath}/aggregate-report.md`,
            resultsToMarkdown(table, this.settings),
            {
              flag: 'w',
            }
          )
          .then(() => {
            logger.debug(`Aggregate results Markdown file successfully saved`);
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
