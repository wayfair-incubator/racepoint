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
import {formatFilename} from '../helpers';

const STD_DEVIATION_KEY = 'Standard Deviation';
const MEAN_KEY = 'Mean';
const METRIC_KEY = 'Metric';
const FORMAT_MD = 'md';

const resultsToMarkdown = (data: any, _settings: ProfileConfig) => {
  const rows = Array.from(Object.keys(data), (key) => ({
    [METRIC_KEY]: key,
    [MEAN_KEY]: data[key][MEAN_KEY],
    [STD_DEVIATION_KEY]: data[key][STD_DEVIATION_KEY],
  }));

  return json2md([
    {h2: 'Racepoint Aggregated Results'},
    {p: `Target Url: ${_settings.targetUrl}`},
    {p: `Device Type: ${_settings.deviceType}`},
    {p: `Number of Runs: ${_settings.numberRuns}`},
    {
      table: {
        headers: [METRIC_KEY, MEAN_KEY, STD_DEVIATION_KEY],
        rows,
      },
    },
  ]);
};

export class AggregateConsoleReporter extends BaseRacepointReporter {
  private _collectedData: {[key: string]: number[]} = {};
  private _reportPath: string;
  private _outputMarkdown: boolean;
  private _settings: ProfileConfig;

  constructor(options: ProfileConfig) {
    super();
    Object.values(LightHouseAuditKeys).forEach((value) => {
      this._collectedData[value] = [];
    });
    this._reportPath = options.outputTarget || '';
    this._outputMarkdown = options.outputFormat.includes(FORMAT_MD) || false;
    this._settings = options;
  }

  process = async (results: LighthouseResultsWrapper) => {
    Object.values(LightHouseAuditKeys).forEach((value) => {
      this._collectedData[value].push(results.lhr.audits[value].numericValue);
    });
  };

  async finalize(): Promise<void> {
    logger.info('Calculating Summary:');
    let table: {[metric: string]: SummaryRow} = {};
    Object.entries(LightHouseAuditKeys).forEach(([key, value]) => {
      table[key] = this.calculateRow(this._collectedData[value]);
    });

    console.table(table);

    return this._outputMarkdown
      ? fs
          .writeFile(
            `${this._reportPath}/${formatFilename({
              url: this._settings.targetUrl,
              suffix: 'aggregate-report.md',
            })}`,
            resultsToMarkdown(table, this._settings),
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
