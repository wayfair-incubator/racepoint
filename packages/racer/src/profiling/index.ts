import lighthouse from 'lighthouse';
import {launch, Options} from 'chrome-launcher';
import {LighthouseWrapper} from './results';
import {LighthouseResultsRepository} from './repository';
import {UsageLock} from '../usageLock';

export {LighthouseResults} from './results';

/**
 * Starts a lighthouse run asynchronously, returning a job id immediately.
 *
 * @param targetUrl string of the url to profile
 */
export const submitLighthouseRun = (targetUrl: string): Promise<number> => {
  return LighthouseResultsRepository.getNextId().then((jobId) => {
    doLighthouse(jobId, targetUrl);
    return jobId;
  });
};

const doLighthouse = (assignedJobId: number, targetUrl: string) => {
  const chromeOptions: Options = {
    // startingUrl: context.getStartingUrl(),
    logLevel: 'error',
    chromeFlags: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--ignore-certificate-errors',
    ],
    // formFactor: userConfig.formFactor,
    // screenEmulation: userConfig.screenEmulation,
  };
  launch(chromeOptions).then((chrome) => {
    const lhFlags = {
      //   chromeOptions.chromeFlags,
      port: chrome.port,
      output: 'html',
      // unfortunately, setting a max wait causes the lighthouse run to break. can investigate in the future
      // maxWaitForLoad: 12500
    };
    return new Promise((resolve, reject) => {
      lighthouse(targetUrl, lhFlags, {
        output: 'html',
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
      }).then((results: LighthouseWrapper) => {
        //cleanup and save results
        chrome
          .kill()
          .then(() => LighthouseResultsRepository.write(assignedJobId, results))
          .then(() => UsageLock.getInstance().release());
      });
    });
  });
};
