// Because Lighthouse doesn't expose Typescript types, we create a little interface here to represent the fields that we need from the results object

/*
{
  id: 'largest-contentful-paint',
  title: 'Largest Contentful Paint',
  description: 'Largest Contentful Paint marks the time at which the largest text or image is painted. [Learn more](https://web.dev/lighthouse-largest-contentful-paint/)',
  score: 0.98,
  scoreDisplayMode: 'numeric',
  numericValue: 1871.208,
  numericUnit: 'millisecond',
  displayValue: '1.9s',
  explanation: undefined,
  errorMessage: undefined,
  warnings: undefined,
  details: undefined
}
*/
interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: number;
  scoreDisplayMode: string;
  displayValue: string;
  numericValue: number;
  numericUnit: string;
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

interface LighthouseTiming {
  entries: any[];
  total: number;
}

export interface LighthouseWrapper {
  lhr: LighthouseResults;
  report: string; // the raw text of the html
}

export interface LighthouseResults {
  userAgent: string;
  lighthouseVersion: string;
  fetchTime: string;
  requestedUrl: string;
  finalUrl: string;
  runWarnings: string[];
  runtimeError: string | undefined;
  audits: {[key: string]: LighthouseAudit};
  timing: LighthouseTiming;
}

//timing: { entries: [Array], total: 13843.27 },

/*
lhr: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/92.0.4515.131 Safari/537.36',
    environment: {
      networkUserAgent: 'Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4420.0 Mobile Safari/537.36 Chrome-Lighthouse',
      hostUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/92.0.4515.131 Safari/537.36',
      benchmarkIndex: 1813,
      credits: [Object]
    },
    lighthouseVersion: '8.1.0',
    fetchTime: '2021-08-05T18:40:59.096Z',
    requestedUrl: 'https://www.google.com/',
    finalUrl: 'https://www.google.com/',
    runWarnings: [],
    runtimeError: undefined,
    audits: {
*/
