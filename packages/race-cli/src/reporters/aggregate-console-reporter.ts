import {std, mean, round} from 'mathjs';
import fs from 'fs/promises';
import json2md from 'json2md';
import {UserFlowStep, UserFlowResultsWrapper} from '@racepoint/shared';
import {
  BaseRacepointReporter,
  LightHouseAuditKeys,
  ProfileConfig,
  MathOperation,
  StepData,
  StepDataCollection,
  ComputedStepDataCollection,
  LabeledStepDataCollection,
} from '../types';
import {MissCount, CacheMetricData} from '@racepoint/shared';
import logger from '../logger';
import {formatFilename} from '../helpers';

const STD_DEVIATION_KEY = 'Standard Deviation';
const MEAN_KEY = 'Mean';
const METRIC_KEY = 'Measurement';
const FORMAT_MD = 'md';

const resultsToMarkdown = (
  data: LabeledStepDataCollection[],
  settings: ProfileConfig,
  cacheStats?: CacheMetricData
) => {
  const getTables = () =>
    data.map((stepData: LabeledStepDataCollection, i: number) => {
      const rows = Object.entries(stepData.table).map(
        ([key, value]: [key: string, value: any]) => {
          return {
            [METRIC_KEY]: key,
            ...value,
          };
        }
      );

      return [
        {
          p: `Step ${i + 1} - ${stepData.name}`,
        },
        {
          table: {
            headers: [METRIC_KEY, ...Object.keys(LightHouseAuditKeys)],
            rows,
          },
        },
      ];
    });

  const getCacheStats = () =>
    cacheStats
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
      : [];

  return json2md([
    {h2: 'Racepoint Aggregated Results'},
    {p: `Target Url: ${settings.targetUrl}`},
    {p: `Device Type: ${settings.deviceType}`},
    {p: `Number of Runs: ${settings.numberRuns}`},
    ...getTables(),
    ...getCacheStats(),
  ]);
};

const emptyStep = (step: string): StepData => ({
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

  private _stepDataCollection: StepDataCollection = {};

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
    results.steps.forEach((step: UserFlowStep, i: number) => {
      const stepKey = `step_${i}`;

      // Initialize a new empty step if it doesn't exist
      if (!this._stepDataCollection[stepKey]) {
        this._stepDataCollection[stepKey] = emptyStep(
          step.name || `Step #${i}`
        );
      }
      const activeStep = this._stepDataCollection[stepKey];

      Object.values(LightHouseAuditKeys).forEach((value) => {
        if (step.lhr.audits[value]) {
          activeStep[value].push(step.lhr.audits[value].numericValue);
        }
      });
    });
  };

  async finalize(cacheStats?: CacheMetricData): Promise<void> {
    const mathBook: MathOperation[] = [
      {
        name: MEAN_KEY,
        operation: (data: number[]) => round(mean(data), 4),
      },
      {
        name: STD_DEVIATION_KEY,
        operation: (data: number[]) => round(std(data, 'unbiased'), 4),
      },
    ];

    const resultsByStep: LabeledStepDataCollection[] = [];

    logger.info('Calculating Summary...');

    // 1. Loop through each step
    // 2. Loop through each calculation type
    // 3. Loop through every step data property
    Object.keys(this._stepDataCollection).forEach((step: string) => {
      let table: ComputedStepDataCollection = {};

      const stepData: StepData =
        this._stepDataCollection[step as keyof StepDataCollection];

      mathBook.forEach((calc: MathOperation) => {
        const computedStep: any = {};

        Object.entries(LightHouseAuditKeys).forEach(([key, value]) => {
          computedStep[key] = null;
          // It's not going to be a string, that's just to support the name property
          const metricData: number[] | string =
            stepData[value as keyof StepData];
          try {
            computedStep[key] = calc.operation(metricData);
          } catch {
            // Do nothing
          }
        });
        // ComputedStepData
        table[calc.name] = computedStep;
      });

      console.log(`Results for step: ${stepData.step}`);
      console.table(table);

      // Need to reformat slightly to pass to the Markdown function
      const formattedStepThing: LabeledStepDataCollection = {
        name: stepData.step,
        table,
      };
      resultsByStep.push(formattedStepThing);
    });

    return this._outputMarkdown
      ? fs
          .writeFile(
            `${this._reportPath}/${formatFilename({
              url: this._settings.targetUrl,
              suffix: 'aggregate-report.md',
            })}`,
            resultsToMarkdown(resultsByStep, this._settings, cacheStats),
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
}
