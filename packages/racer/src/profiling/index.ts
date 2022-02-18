import lighthouse from 'lighthouse';
import {launch, Options} from 'chrome-launcher';
import {LighthouseResultsRepository} from './repository';
import {UsageLock} from '../usageLock';
import {LighthouseResults, LighthouseResultsWrapper} from '@racepoint/shared';

/**
 * Starts a lighthouse run asynchronously, returning a job id immediately.
 *
 * @param targetUrl string of the url to profile
 */
export const submitLighthouseRun = async ({
  targetUrl,
  deviceType = 'Desktop',
  chromeFlags = [],
  overrideChromeFlags = false,
}: {
  targetUrl: string;
  deviceType?: 'Desktop' | 'Mobile';
  chromeFlags?: string[];
  overrideChromeFlags?: boolean;
}): Promise<number> => {
  const jobId = await LighthouseResultsRepository.getNextId();
  // todo: need a better name for this function; take a pass on this when updating Lighthouse runs to receive configuration
  doLighthouse({
    assignedJobId: jobId,
    targetUrl,
    chromeFlags,
    overrideChromeFlags,
    deviceType,
  });
  return jobId;
};

const doLighthouse = async ({
  assignedJobId,
  targetUrl,
  chromeFlags,
  overrideChromeFlags,
  // Where does this go ?
  deviceType,
}: {
  assignedJobId: number;
  targetUrl: string;
  deviceType?: 'Desktop' | 'Mobile';
  chromeFlags?: string[];
  overrideChromeFlags?: boolean;
}) => {
  const chromeFlagDefaults = [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--ignore-certificate-errors',
  ];

  const getChromeFlags = () => {
    if (overrideChromeFlags) {
      return chromeFlags;
    } else {
      return [...chromeFlagDefaults, ...chromeFlags];
    }
  };

  const chromeOptions: Options = {
    logLevel: 'error',
    chromeFlags: getChromeFlags(),
    // formFactor: userConfig.formFactor,
    // screenEmulation: userConfig.screenEmulation,
  };

  // chrome takes a moment or two to spinup
  console.log('Preparing Chrome');
  const chrome = await launch(chromeOptions);
  // setup the Lighthouse flags. This differs from the third argument, which is test or 'pass' information
  const lhFlags = {
    //   chromeOptions.chromeFlags,
    output: 'html',
    port: chrome.port,
    // unfortunately, setting a max wait causes the lighthouse run to break. can investigate in the future
    // maxWaitForLoad: 12500
  };

  // and go
  const results = await launchLighthouse(targetUrl, lhFlags);
  // don't forget the cleanup
  await chrome.kill();
  await LighthouseResultsRepository.write(assignedJobId, results);
  await UsageLock.getInstance().release();
};

const launchLighthouse = async (
  targetUrl: string,
  lighthouseFlags: object
): Promise<LighthouseResultsWrapper> => {
  // extracting the actual lighthouse execution into this wrapped Promise.
  // in general, we'd like to follow async/await patterns instead of chaining Promises. However, because the lighthouse package does not have TS types,
  // Typescript is upset that our lighthouse function is not async (or rather, it cannot tell)
  // in this one case, we'll create a promise.

  // todo: explore creating some high level global type to capture this
  // todo: explore which 'passes' we'd like to actually use. Perhaps make them configurable?

  return new Promise((resolve, _) => {
    lighthouse(targetUrl, lighthouseFlags, {
      extends: 'lighthouse:default',
      passes: [
        {
          passName: 'defaultPass',
          recordTrace: true,
          useThrottling: false,
          pauseAfterFcpMs: 1000,
          pauseAfterLoadMs: 1000,
          networkQuietThresholdMs: 5000,
          cpuQuietThresholdMs: 5000,
          // todo: bring these blocked URL patterns in via some config
          blockedUrlPatterns: ['*log*'],
          gatherers: [
            'trace',
            'trace-compat',
            'trace-elements',
            //   'css-usage',
            //   'js-usage',
            //   'viewport-dimensions',
            //   'console-messages',
            //   'anchor-elements',
            //   'image-elements',
            //   'link-elements',
            //   'meta-elements',
            //   'script-elements',
            //   'iframe-elements',
            //   'form-elements',
            //   'main-document-content',
            //   'gather-context',
            //   'global-listeners',
            //   'dobetterweb/appcache',
            //   'dobetterweb/doctype',
            //   'dobetterweb/domstats',
            //   'dobetterweb/optimized-images',
            //   'dobetterweb/password-inputs-with-prevented-paste',
            //   'dobetterweb/response-compression',
            //   'dobetterweb/tags-blocking-first-paint',
            //   'seo/font-size',
            //   'seo/embedded-content',
            //   'seo/robots-txt',
            //   'seo/tap-targets',
            'accessibility',
            //   'inspector-issues',
            //   'source-maps',
            //   'full-page-screenshot',
          ],
        },
      ],
      settings: {
        onlyCategories: ['performance'],
      },
    }).then((lighthouseResults: LighthouseResultsWrapper) =>
      resolve(lighthouseResults)
    );
  });
};
