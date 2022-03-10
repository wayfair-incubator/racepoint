import {LighthouseResultsWrapper, LighthouseResults} from '@racepoint/shared';
import {LLReporter, LightHouseAuditKeys} from '../types';

interface MetricHeader {
  name: string;
  key: string;
}

export class ConsoleReporter implements LLReporter {
  private metricHeaders: MetricHeader[] = [
    {name: 'SI', key: LightHouseAuditKeys.SI},
    {name: 'FCP', key: LightHouseAuditKeys.FCP},
    {name: 'LCP', key: LightHouseAuditKeys.LCP},
    {name: 'CLS', key: LightHouseAuditKeys.CLS},
    {name: 'MP-FID', key: LightHouseAuditKeys.MaxFID},
    {name: 'TBT', key: LightHouseAuditKeys.TotalBlocking},
  ];

  // state to know if we've begun writing to the screen yet
  private _hasBegun: boolean;

  constructor() {
    this._hasBegun = false;
  }

  initialize = (): Promise<void> => Promise.resolve();

  process = (results: LighthouseResultsWrapper): Promise<void> =>
    new Promise((resolve) => {
      if (this._hasBegun === false) {
        this._hasBegun = true;
        console.log(this.buildHeaders());
      }
      console.log(this.buildRow(results.lhr));
      resolve();
    });

  private _buildMetricsRow = (
    mapper: (header: MetricHeader) => string
  ): string => this.metricHeaders.map((header) => mapper(header)).join('\t|\t');

  private buildHeaders = (): string =>
    this._buildMetricsRow((header) => header.name);

  private buildRow = (results: LighthouseResults): string =>
    this._buildMetricsRow((header) => {
      return results.audits[header.key].displayValue;
    });
}
