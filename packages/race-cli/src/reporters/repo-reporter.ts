import {
  LighthouseResultsWrapper,
  LighthouseResults,
  UserFlowResultsWrapper,
} from '@racepoint/shared';
import {
  connectRepository,
  ReportingRepository,
  ReportingRow,
} from './repository';
import logger from '../logger';
import {LightHouseAuditKeys, BaseRacepointReporter} from '../types';

/**
 * Report Lighthouse results to some ReportingRepository.
 *
 * If repository id does not exist, will attempt to create one
 *
 */
export class RepositoryReporter extends BaseRacepointReporter {
  private _repositoryLocation: string;
  private _targetUrl: string;
  private _repository: ReportingRepository | undefined; // lateinit

  constructor(
    targetUrl: string,
    repositoryId: string | undefined,
    outputTarget: string | undefined
  ) {
    super();
    this._targetUrl = targetUrl;
    this._repositoryLocation = `${outputTarget}/${repositoryId}`;
  }

  initialize = (): Promise<void> =>
    connectRepository(this._repositoryLocation)
      .then((receivedRepository: ReportingRepository) => {
        this._repository = receivedRepository;
      })
      .catch((e) => {
        logger.error('Failed to connect to repository');
      });

  process = (
    results: LighthouseResultsWrapper | UserFlowResultsWrapper
  ): Promise<void> | undefined => {
    return;
    // return (
    //   this._repository &&
    //   this._repository.write(this.mapResultsToRow(results.lhr))
    // );
  };

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
