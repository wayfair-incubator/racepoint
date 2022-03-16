import {std, mean, round} from 'mathjs';
import fs from 'fs/promises';
import {LighthouseResultsWrapper} from '@racepoint/shared';
import {BaseRacepointReporter, LightHouseAuditKeys} from '../types';
import logger from '../logger';

export class AggregateConsoleReporter extends BaseRacepointReporter {
  private collectedData: {[key: string]: number[]} = {};
  private reportPath: string;
  private outputJson: boolean;

  constructor(outputTarget: string, outputJson: boolean) {
    super();
    Object.values(LightHouseAuditKeys).forEach((value) => {
      this.collectedData[value] = [];
    });
    this.reportPath = outputTarget || '';
    this.outputJson = outputJson || false;
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

    // console.log(table)
    const tableData = JSON.stringify(table);
    return this.outputJson
      ? fs
          .writeFile(`${this.reportPath}/results.json`, tableData, {flag: 'w'})
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
      Mean: round(mean(data), 4),
      'Std Dev': round(std(data, 'unbiased'), 4),
    };
  }
}

interface SummaryRow {
  Mean: number;
  'Std Dev': number;
}
