import fs from 'fs/promises';
import {
  LighthouseResultsWrapper,
  LighthouseResults,
  LightHouseAuditKeys,
} from '@racepoint/shared';
import {
  connectRepository,
  ReportingRepository,
  ReportingRow,
} from './repository';
// import env from '../common/env';

export interface LLReporter {
  initialize: () => Promise<void>;
  process: (results: LighthouseResultsWrapper) => Promise<void>;
}

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

/**
 * Rather than Print Row by Row, this reporter will keep a tally of accumulated runs vs the expected number of them
 */
export class RunCountConsole implements LLReporter {
  private _maxRuns: number;
  private _completedRuns: number = 0;

  constructor(requestedRuns: number | undefined) {
    if (!requestedRuns) {
      throw new Error('Number of requested runs must be provided');
    }
    this._maxRuns = requestedRuns;
  }

  initialize = (): Promise<void> => Promise.resolve();

  process = (results: LighthouseResultsWrapper): Promise<void> =>
    new Promise((resolve) => {
      this._completedRuns++;
      console.log(this.buildMessage());
      resolve();
    });

  private buildMessage = (): string =>
    `Completed ${this._completedRuns} / ${this._maxRuns}`;
}

/**
 * Report Lighthouse results to some ReportingRepository.
 *
 * If repository id does not exist, will attempt to create one
 *
 */
export class RepositoryReporter implements LLReporter {
  private _repositoryLocation: string;
  private _targetUrl: string;
  private _repository: ReportingRepository | undefined; // lateinit

  constructor(targetUrl: string, repositoryId: string | undefined) {
    this._targetUrl = targetUrl;
    if (!repositoryId) {
      throw new Error(
        'A repository identifier must be provided in order to use it'
      );
    }

    this._repositoryLocation = '/'; //`${env.RP_PATH}/${repositoryId}`;
  }

  initialize = (): Promise<void> =>
    // TODO add correct type
    connectRepository(this._repositoryLocation).then(
      (receivedRepository: any) => {
        this._repository = receivedRepository;
      }
    );

  process = (results: LighthouseResultsWrapper): Promise<void> =>
    this._repository!!.write(this.mapResultsToRow(results.lhr));

  private mapResultsToRow = (results: LighthouseResults): ReportingRow => {
    const row = {
      dateOccured: new Date().toISOString(),
      profiledUrl: this._targetUrl,
      lighthouseTime: results.timing.total,
      speedIndex: results.audits[LightHouseAuditKeys.SI].numericValue,
      fcp: results.audits[LightHouseAuditKeys.FCP].numericValue,
      lcp: results.audits[LightHouseAuditKeys.LCP].numericValue,
      cls: results.audits[LightHouseAuditKeys.CLS].numericValue,
      mpfid: results.audits[LightHouseAuditKeys.MaxFID].numericValue,
      tbt: results.audits[LightHouseAuditKeys.TotalBlocking].numericValue,
    };
    return row;
  };
}

/**
 * Writes a single lighthouse result to an html file
 */
export class HtmlReporter implements LLReporter {
  private _reportPath: string;
  constructor(requestedPath: string) {
    this._reportPath = requestedPath;
  }

  // for now, just resolve. We can get fancy and not overwrite by checking fs.access and selecting a new reportPath name
  initialize = (): Promise<void> => Promise.resolve();

  process = (results: LighthouseResultsWrapper): Promise<void> =>
    fs
      .writeFile(this._reportPath, results.report, {flag: 'w'})
      .then(() => console.log(`Lighthouse HTML results successfully saved`));
}
