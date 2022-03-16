import {LighthouseResultsWrapper} from '@racepoint/shared';
import logger from '../logger';
import {IndividualRunsReporter} from './individual-reporter';
import {RepositoryReporter} from './repo-reporter';
import {HtmlReporter} from './html-reporter';
import {AggregateConsoleReporter} from './aggregate-console-reporter';
import {LLReporter} from '../types';

export interface ReporterSettings {
  targetUrl: string;
  outputs: ReportingTypes[];
  repositoryId?: string;
  requestedRuns?: number;
  outputTarget: string;
}

export enum ReportingTypes {
  IndividualRunsReporter,
  ConsoleRunCounter,
  Repository,
  LighthouseHtml,
  Aggregate,
}

/**
 * Main entrypoint for reporting
 */
export class LHResultsReporter {
  // will listen for Lighthouse Results, and begin outputting to both screen and a csv file
  private _settings: ReporterSettings;
  private _reporters: (LLReporter | undefined)[];

  constructor(options: ReporterSettings) {
    this._settings = options;

    // initialize reporters based on options, as we add more reporting types, add them here
    this._reporters = options.outputs.map((type: ReportingTypes) => {
      if (type === ReportingTypes.IndividualRunsReporter) {
        return new IndividualRunsReporter();
      } else if (type === ReportingTypes.Aggregate) {
        return new AggregateConsoleReporter(options.outputTarget, true);
      } else if (type === ReportingTypes.LighthouseHtml) {
        // for now, hardcode the result. We could make it a setting in ReporterSettings but as it stands, it feels weird to add
        // more file path locations there. hmm
        return new HtmlReporter(options.outputTarget);
      } else if (type === ReportingTypes.Repository) {
        return new RepositoryReporter(
          options.targetUrl,
          options.repositoryId,
          options.outputTarget
        );
      } else {
        logger.error('Unknown reporting type of:', type);
      }
    });
  }

  async prepare() {
    await Promise.all(
      this._reporters.map((reporter) => reporter?.initialize())
    );
  }

  // receive results and process them according to configuration and/or settings
  // do not hold on to reports more than necessary
  //

  async process(report: LighthouseResultsWrapper): Promise<any> {
    return Promise.all(
      this._reporters.map((reporter) => reporter?.process(report))
    );
  }

  async finalize(): Promise<any> {
    return Promise.all(this._reporters.map((reporter) => reporter?.finalize()));
  }
}
