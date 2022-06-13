import {std, mean, round} from 'mathjs';
import fs from 'fs/promises';
import json2md from 'json2md';
import {
  LighthouseResultsWrapper,
  UserFlowStep,
  UserFlowResultsWrapper,
} from '@racepoint/shared';
import {
  BaseRacepointReporter,
  LightHouseAuditKeys,
  ProfileConfig,
} from '../types';
import {MissCount, CacheMetricData} from '@racepoint/shared';
import logger from '../logger';
import {formatFilename} from '../helpers';
import {MULTIPLE_CHOICES} from 'http-status-codes';

const STD_DEVIATION_KEY = 'Standard Deviation';
const MEAN_KEY = 'Mean';
const METRIC_KEY = 'Metric';
const FORMAT_MD = 'md';

const resultsToMarkdown = (
  data: any,
  settings: ProfileConfig,
  cacheStats?: CacheMetricData
) => {
  const rows = Array.from(Object.keys(data), (key) => ({
    [METRIC_KEY]: key,
    [MEAN_KEY]: data[key][MEAN_KEY],
    [STD_DEVIATION_KEY]: data[key][STD_DEVIATION_KEY],
  }));

  return json2md([
    {h2: 'Racepoint Aggregated Results'},
    {p: `Target Url: ${settings.targetUrl}`},
    {p: `Device Type: ${settings.deviceType}`},
    {p: `Number of Runs: ${settings.numberRuns}`},
    {
      table: {
        headers: [METRIC_KEY, MEAN_KEY, STD_DEVIATION_KEY],
        rows,
      },
    },
    ...(cacheStats
      ? [
          {h3: 'Cache Stats'},
          {p: `Total requests: ${cacheStats.totalRequests}`},
          {p: `Keys cached: ${cacheStats.keys}`},
          {p: `Cache hits: ${cacheStats.hits}`},
          {p: `Cache misses: ${cacheStats.misses}`},
          ...(cacheStats.topMissCounts.length > 0
            ? [
                {p: `Top missed items:`},
                {
                  ol: cacheStats.topMissCounts
                    .filter((missedItem) => missedItem.misses > 0)
                    .map(
                      (missedItem: MissCount) =>
                        `URL: <a href="${missedItem.url}">${missedItem.url}</a><br>Misses: ${missedItem.misses}`
                    ),
                },
              ]
            : []),
        ]
      : []),
  ]);
};

interface StepData {
  step: number;
  [LightHouseAuditKeys.SI]: number[];
  [LightHouseAuditKeys.LCP]: number[];
  [LightHouseAuditKeys.FCP]: number[];
  [LightHouseAuditKeys.CLS]: number[];
  [LightHouseAuditKeys.MaxFID]: number[];
  [LightHouseAuditKeys.TotalBlocking]: number[];
}

const emptyStep = (step: number): StepData => ({
  step,
  [LightHouseAuditKeys.SI]: [],
  [LightHouseAuditKeys.LCP]: [],
  [LightHouseAuditKeys.FCP]: [],
  [LightHouseAuditKeys.CLS]: [],
  [LightHouseAuditKeys.MaxFID]: [],
  [LightHouseAuditKeys.TotalBlocking]: [],
});

export class AggregateConsoleReporter extends BaseRacepointReporter {
  private _collectedData: {[key: string]: number[]} = {};
  private _reportPath: string;
  private _outputMarkdown: boolean;
  private _settings: ProfileConfig;

  private _stepDataCollection: {[key: number]: StepData} = {};

  constructor(options: ProfileConfig) {
    super();
    Object.values(LightHouseAuditKeys).forEach((value) => {
      this._collectedData[value] = [];
    });
    this._reportPath = options.outputTarget || '';
    this._outputMarkdown = options.outputFormat.includes(FORMAT_MD) || false;
    this._settings = options;
  }

  process = async (results: UserFlowResultsWrapper) => {
    console.log(`Processing result ${results.steps[0].name}`);

    results.steps.forEach((step: UserFlowStep, i) => {
      // Initialize a new empty step if it doesn't exist
      if (!this._stepDataCollection[i]) {
        this._stepDataCollection[i] = emptyStep(i);
      }
      const activeStep = this._stepDataCollection[i];

      Object.values(LightHouseAuditKeys).forEach((value) => {
        if (step.lhr.audits.hasOwnProperty(value)) {
          activeStep[value].push(step.lhr.audits[value].numericValue);
        }
      });
    });

    console.log('🃏 Processed successfully!', this._stepDataCollection);
  };

  async finalize(cacheStats?: CacheMetricData): Promise<void> {
    logger.info('Calculating Summary:', cacheStats);
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
            resultsToMarkdown(table, this._settings, cacheStats),
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
    let realMean = 0;
    let stdDeviation = 0;
    try {
      (realMean = round(mean(data), 4)),
        (stdDeviation = round(std(data, 'unbiased'), 4));
    } catch (e) {
      logger.error('Error in math', e);
    }

    return {
      [MEAN_KEY]: realMean,
      [STD_DEVIATION_KEY]: stdDeviation,
    };
  }
}

interface SummaryRow {
  [MEAN_KEY]: number;
  [STD_DEVIATION_KEY]: number;
}
