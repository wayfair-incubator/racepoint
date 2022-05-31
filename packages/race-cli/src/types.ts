import {LighthouseResultsWrapper} from '@racepoint/shared';

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
  finalize: (cacheStats?: CacheStats) => Promise<void>;
}

export abstract class BaseRacepointReporter implements LLReporter {
  initialize(): Promise<void> {
    return Promise.resolve();
  }
  finalize(cacheStats?: CacheStats): Promise<void> {
    return Promise.resolve();
  }
  abstract process: (
    results: LighthouseResultsWrapper
  ) => Promise<void> | undefined;
}

export class ProfileContext implements ScenarioContext {
  targetUrl: string;
  deviceType: 'Mobile' | 'Desktop';
  numberRuns: number;
  outputFormat: string[];
  outputTarget: string;
  repositoryId: string;
  includeIndividual: boolean;
  chromeFlags?: string[];
  extraHeaders?: Record<string, string>;
  disableStorageReset?: boolean;
  blockedUrlPatterns?: string[];

  constructor(userArgs: any) {
    this.targetUrl = userArgs?.targetUrl || '';
    this.deviceType = userArgs?.deviceType;
    this.numberRuns = userArgs?.numberRuns;
    this.outputFormat = userArgs?.outputFormat;
    this.outputTarget = userArgs?.outputTarget;
    this.repositoryId = userArgs?.repositoryId;
    this.includeIndividual = userArgs.includeIndividual;
    this.chromeFlags = userArgs?.chromeFlags;
    this.extraHeaders = userArgs?.extraHeaders;
    this.disableStorageReset = userArgs?.disableStorageReset;
    this.blockedUrlPatterns = userArgs?.blockedUrlPatterns;
  }
}

/**
 * The keys (among many dozens) in a Lighthouse Report that we wish to look into
 */
export enum LightHouseAuditKeys {
  SI = 'speed-index',
  FCP = 'first-contentful-paint',
  LCP = 'largest-contentful-paint',
  CLS = 'cumulative-layout-shift',
  MaxFID = 'max-potential-fid',
  TotalBlocking = 'total-blocking-time',
}

export interface ProfileConfig {
  targetUrl: string;
  deviceType: 'Desktop' | 'Mobile';
  numberRuns: number;
  outputFormat: string[];
  outputTarget: string;
  repositoryId?: string;
}

export interface CacheStats {
  totalRequests: number;
  keys: number;
  hits: number;
  misses: number;
  topMissCounts: MissCountType[];
}

export interface MissCountType {
  url: string;
  misses: number;
}
