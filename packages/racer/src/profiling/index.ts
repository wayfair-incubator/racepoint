import lighthouse from 'lighthouse';
import {launch, Options} from 'chrome-launcher';
import {EventEmitter} from 'stream';
import {LighthouseWrapper} from './results';
import {UsageLock} from '../usageLock';

export {LighthouseResults} from './results';

/**
 * Starts a lighthouse run asynchronously, returning a job id immediately.
 *
 * @param targetUrl string of the url to profile
 */
export const submitLighthouseRun = (targetUrl: string) => {
  // what should the id be? a uuid? something based on url hash? incrementing based on the runs already found?
  // for now, we'll just return a 1 for testing ;)

  doLighthouse(targetUrl);
  return 1;
};

const doLighthouse = (targetUrl: string) => {
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
    // this.emit(ProfilerEvents.ChromeStarted);
    const lhFlags = {
      //   chromeOptions.chromeFlags,
      port: chrome.port,
      // unfortunately, setting a max wait causes the lighthouse run to break. can investigate in the future
      // maxWaitForLoad: 12500
    };
    return new Promise((resolve, reject) => {
      //   this.emit(ProfilerEvents.LighthouseStarted);
      const lighthouseStart = Date.now();
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
      }).then((results: any) => {
        console.log('Ahh done!', results);
        UsageLock.getInstance().release();
      });
    });
  });
};
