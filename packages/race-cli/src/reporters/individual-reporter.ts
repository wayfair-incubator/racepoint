import {LighthouseResults, UserFlowResultsWrapper} from '@racepoint/shared';
import logger from '../logger';
import {LightHouseAuditKeys} from '../types';
import {BaseRacepointReporter} from '../types';

interface MetricHeader {
  name: string;
  key: string;
}

export class IndividualRunsReporter extends BaseRacepointReporter {
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
    super();
    this._hasBegun = false;
  }

  process = (results: UserFlowResultsWrapper): Promise<void> =>
    new Promise((resolve) => {
      if (results.steps.length > 1) {
        logger.warn(
          'Individual reporter does not support Lighthouse user flows at this time'
        );
        resolve();
      }
      if (this._hasBegun === false) {
        this._hasBegun = true;
        console.log(this.buildHeaders());
      }
      console.log(this.buildRow(results.steps[0].lhr));
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
