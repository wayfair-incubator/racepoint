import lighthouse from 'lighthouse';
import {launch} from 'chrome-launcher';
import {Flags} from 'lighthouse/types/externs';
import puppeteer from 'puppeteer-core';
import {LighthouseResultsRepository} from './repository';
import {UsageLock} from '../usageLock';
import {
  LighthouseResultsWrapper,
  UserFlowResultsWrapper,
} from '@racepoint/shared';
import {
  RaceProfileCommand,
  RaceFlowCommand,
  TestCaseType,
  RaceContext,
  FlowContext,
  constructChromeOptions,
  constructLighthouseFlags,
} from './config';
import api from 'lighthouse/lighthouse-core/fraggle-rock/api.js';
/**
 * Starts a lighthouse run asynchronously, returning a job id immediately.
 *
 * @param command the  RaceProfileCommand dictating the instruction of the profiling to do.
 */
export const submitLighthouseRun = async (
  command: RaceProfileCommand
): Promise<number> => {
  const jobId = await LighthouseResultsRepository.getNextId();
  const context = new RaceContext(jobId, command);
  // execute a Lighthouse run. This is an async function and as such the jobId is returned immediately.
  profileWithLighthouse(context);
  return jobId;
};

/**
 * Starts a user flow script asynchronously, returning a job id immediately.
 *
 * @param command the  RaceProfileCommand dictating the instruction of the profiling to do.
 */
export const submitUserFlow = async (
  command: RaceFlowCommand,
  testCase: TestCaseType
): Promise<number> => {
  const jobId = await LighthouseResultsRepository.getNextId();
  const context = new FlowContext(jobId, command, testCase);
  // execute a user flow script This is an async function and as such the jobId is returned immediately.
  runUserFlow(context);
  return jobId;
};

const runUserFlow = async (context: FlowContext) => {
  const browser = await puppeteer.launch({
    // headless: false,
    args: context.chromeFlags,
    executablePath: '/usr/bin/chromium-browser',
  });

  try {
    console.log('Attempting to run test...');
    const resultFlow = await context.testCase.connect(browser, api);
    // Closing browser if not closed...
    await browser.close();

    const resultsFile = (await resultFlow?.generateReport()) || '';
    const flowResult = (await resultFlow?.createFlowResult()) || {};

    const resultData: UserFlowResultsWrapper = {
      steps: flowResult?.steps,
      name: flowResult?.name,
      report: resultsFile,
    };

    await LighthouseResultsRepository.write(context.jobId, resultData);
    await UsageLock.getInstance().release();
  } catch (e) {
    console.error('Error trying to run test!');
    await browser.close();
    await UsageLock.getInstance().release();
  }
};

const profileWithLighthouse = async (context: RaceContext) => {
  // chrome takes a moment or two to spinup
  console.log('Preparing Chrome');
  //todo: debug log the context?
  const chrome = await launch(constructChromeOptions(context));
  // setup the Lighthouse flags. This differs from the third argument to lighthouse, which is test or 'pass' information.
  const lighthouseFlags = constructLighthouseFlags(chrome.port, context);
  // and go
  console.log('Starting Lighthouse');
  const results = await launchLighthouse(
    context.targetUrl,
    lighthouseFlags,
    context.blockedUrlPatterns
  );

  // Re-format the results object into a shared user flow type
  // Essentially a flow with a single step
  const formattedResults: UserFlowResultsWrapper = {
    steps: [
      {
        lhr: results.lhr,
        name: 'Single Run',
      },
    ],
    report: results.report,
  };

  // don't forget the cleanup
  await chrome.kill();
  await LighthouseResultsRepository.write(context.jobId, formattedResults);
  await UsageLock.getInstance().release();
};

const launchLighthouse = async (
  targetUrl: string,
  lighthouseFlags: Flags,
  blockedUrlPatterns: string[]
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
          pauseAfterFcpMs: 1000,
          pauseAfterLoadMs: 1000,
          networkQuietThresholdMs: 5000,
          cpuQuietThresholdMs: 5000,
          blockedUrlPatterns,
          gatherers: [
            'trace',
            'trace-compat',
            'trace-elements',
            //   'css-usage',
            //   'js-usage',
            //   'viewport-dimensions',
            //   'console-messages',
            //   'anchor-elements',
            'image-elements',
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
        throttlingMethod: 'provided',
        // Config for throttliing settings if necessary
        // throttling: {
        //   rttMs: 0,
        //   throughputKbps: 0,
        //   requestLatencyMs: 0,
        //   downloadThroughputKbps: 0,
        //   uploadThroughputKbps: 0,
        //   cpuSlowdownMultiplier: 1
        // }
      },
    }).then((lighthouseResults: LighthouseResultsWrapper) =>
      resolve(lighthouseResults)
    );
  });
};
