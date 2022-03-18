import {std, mean, round} from 'mathjs';
import {LighthouseResultsWrapper, LightHouseAuditKeys} from '@racepoint/shared';
import {BaseRacepointReporter} from '../types';
import logger from '../logger';

export class AggregateConsoleReporter extends BaseRacepointReporter {
  private collectedData: {[key: string]: number[]} = {};

  constructor() {
    super();
    Object.values(LightHouseAuditKeys).forEach((value) => {
      this.collectedData[value] = [];
    });
  }

  process = async (results: LighthouseResultsWrapper) => {
    Object.values(LightHouseAuditKeys).forEach((value) => {
      this.collectedData[value].push(results.lhr.audits[value].numericValue);
    });
  };

  async finalize() {
    logger.info('Calculating Summary:');
    let table: {[metric: string]: SummaryRow} = {};
    Object.entries(LightHouseAuditKeys).forEach(([key, value]) => {
      table[key] = this.calculateRow(this.collectedData[value]);
    });

    console.table(table);
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
