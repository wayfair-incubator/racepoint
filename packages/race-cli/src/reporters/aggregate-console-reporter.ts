import {std, mean, round} from 'mathjs';
import {LighthouseResultsWrapper, LightHouseAuditKeys} from '@racepoint/shared';
import {BaseRacepointReporter} from '../types';

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
    console.log('Calculating Summary:');
    let table: {[metric: string]: SummaryRow} = {};
    Object.entries(LightHouseAuditKeys).forEach(([key, value]) => {
      table[key] = {
        Mean: round(mean(this.collectedData[value]), 4),
        'Std Dev': round(std(...this.collectedData[value]), 4),
      };
    });

    console.table(table);
  }
}

interface SummaryRow {
  Mean: number;
  'Std Dev': number;
}
