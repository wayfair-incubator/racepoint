import {LighthouseResultsWrapper} from './shared';

export interface ScenarioContext {}

/**
 * A Scenario defines a mode in which RacePoint can run. It defines the underlying behavior that should be executed,
 * scopes the various switches that can be used in the mode, and provides help descriptive help text for that Scenario
 */
export abstract class Scenario<SC extends ScenarioContext> {
  /**
   * What must the user type to activate this scenario?
   */
  abstract getCommand(): string;

  /**
   * The 'main' method that each scenario must execute
   *
   * @param userArgs
   */
  abstract runScenario(userArgs: any): void;

  /**
   *
   * @param userArgs
   */
  abstract buildContext(userArgs: any): SC;

  /**
   * The main entry point that all scenarios need to go through
   *
   * @param userArgs
   */
  enter(userArgs: any): void {
    this.runScenario(this.buildContext(userArgs));
  }
}

export interface LLReporter {
  initialize: () => Promise<void>;
  process: (results: LighthouseResultsWrapper) => Promise<void> | undefined;
}

export class ProfileContext implements ScenarioContext {
  targetUrl: string;
  deviceType: 'Mobile' | 'Desktop';
  numberRuns: number;
  outputFormat: string[];
  outputTarget: string;
  overrideChromeFlags: boolean;
  raceproxyPort: string;
  racerPort: string;
  repositoryId: string;

  constructor(userArgs: any) {
    this.targetUrl = userArgs?.targetUrl || '';
    this.deviceType = userArgs?.deviceType;
    this.numberRuns = userArgs?.numberRuns;
    this.outputFormat = userArgs?.outputFormat;
    this.outputTarget = userArgs?.outputTarget;
    this.overrideChromeFlags = userArgs?.overrideChromeFlags;
    this.raceproxyPort = userArgs?.raceproxyPort;
    this.racerPort = userArgs?.racerPort;
    this.repositoryId = userArgs?.repositoryId;
  }
}
