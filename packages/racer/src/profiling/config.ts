import {Options} from 'chrome-launcher';
import {OutputMode} from 'lighthouse/types/lhr/settings';
import {Flags} from 'lighthouse/types/externs';

/**
 * Defines the configuration and properties we expect for a given Lighthouse run
 */
export interface RaceProfileCommand {
  targetUrl: string;
  deviceType?: 'desktop' | 'mobile';
  chromeFlags?: string[];
  extraHeaders?: Record<string, string>;
  disableStorageReset?: boolean;
}

/**
 * encapsulates all of the variables and defaults that are needed as part of the Lighthouse and Chrome runs. Utilizes the RaceProfileCommand
 * but ensures various defaults are set
 */
export class RaceContext {
  jobId: number;
  targetUrl: string;
  deviceType = 'desktop';
  chromeFlags: string[] = [];
  disableStorageReset = false;
  extraHeaders: Record<string, string> = {};

  constructor(requestedJobId: number, command: RaceProfileCommand) {
    this.jobId = requestedJobId;
    this.targetUrl = command.targetUrl;
    this.deviceType = command.deviceType || this.deviceType;
    this.disableStorageReset =
      command.disableStorageReset || this.disableStorageReset;
    // equivalent of java '.addAll()'
    this.chromeFlags.push(...(command.chromeFlags || []));

    this.extraHeaders = command.extraHeaders || this.extraHeaders;
  }
}

export const constructChromeOptions = (context: RaceContext): Options => {
  return {
    logLevel: 'info',
    chromeFlags: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--ignore-certificate-errors',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      ...context.chromeFlags,
    ],
  };
};

export const constructLighthouseFlags = (
  chromePort: number,
  context: RaceContext
): Flags => {
  const desktopSettings = {
    formFactor: 'desktop' as const,
    screenEmulation: {
      mobile: false,
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    },
  };
  //--screenEmulation.mobile --screenEmulation.width=360 --screenEmulation.height=640 --screenEmulation.deviceScaleFactor=2
  // are these acceptable mobile defaults? taken from the suggested lighthouse flags (the line above)
  const mobileSettings = {
    formFactor: 'mobile' as const,
    screenEmulation: {
      mobile: true,
      width: 360,
      height: 640,
      deviceScaleFactor: 2,
    },
  };

  const lhFlags: Flags = {
    output: 'html' as OutputMode,
    port: chromePort,
    logLevel: 'info',
    extraHeaders: context.extraHeaders,
    // unfortunately, setting a max wait causes the lighthouse run to break. can investigate in the future
    // maxWaitForLoad: 12500
    ...(context.deviceType === 'desktop'
      ? {...desktopSettings}
      : {...mobileSettings}),
  };

  return lhFlags;
};
