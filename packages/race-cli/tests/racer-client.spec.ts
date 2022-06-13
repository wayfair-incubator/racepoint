import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {StatusCodes} from 'http-status-codes';
import {
  LighthouseResults,
  UserFlowResultsWrapper,
  UserFlowStep,
} from '@racepoint/shared';
import {
  handleStartRacer,
  deleteResult,
  fetchResult,
  fetchAndAppendHtml,
} from '../src/scenarios/racer-client';
import {ProfileContext} from '../src/types';

const validLhrData: UserFlowStep[] = [
  {
    name: 'Test',
    lhr: {
      lighthouseVersion: '9.1.0',
      requestedUrl: 'http://example.com/',
      finalUrl: 'http://example.com/',
      fetchTime: '2022-02-22T15:04:43.185Z',
      runWarnings: [],
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
      runtimeError: '',
      audits: {},
      timing: {
        entries: [
          {
            startTime: 121.2,
            name: 'lh:init:config',
            duration: 251.2,
            entryType: 'measure',
          },
        ],
        total: 5928.1,
      },
    },
  },
];

const invalidLhrData = [
  {
    fakeEntry: true,
    fakeProperty1: 12345,
    fakeProperty2: 'banana',
  },
];

const validHtmlData = `
    <html>
      <body>
        Hello world!
      </body>
    </html>
  `;
const testPort = 3000;
const jobId = 1234;
const data: ProfileContext = {
  targetUrl: 'http://meow.com',
  numberRuns: 1,
  deviceType: 'Desktop',
  outputFormat: ['json'],
  outputTarget: '',
  repositoryId: 'lhruns',
  includeIndividual: false,
};

describe('Race CLI request handlers work as expected', () => {
  let mock: any;

  beforeAll(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  describe('The fetch endpoint works as expected', () => {
    it('Receives a jobId when submitting a URL', async () => {
      mock
        .onPost(`http://localhost:${testPort}/race`)
        .reply(StatusCodes.OK, {jobId});

      const result = await handleStartRacer({data});
      expect(JSON.stringify(result)).toEqual(JSON.stringify(jobId));
    });

    it('Receives a busy error when submitting a URL while running Lighthouse', async () => {
      mock
        .onPost(`http://localhost:${testPort}/race`)
        .reply(StatusCodes.SERVICE_UNAVAILABLE);

      try {
        await await handleStartRacer({data});
      } catch (error: any) {
        // expect(error).toHaveProperty('isAxiosError');
        expect(error.message).toEqual(
          'Racer is currently running a lighthouse report'
        );
      }
    });
  });

  describe('The results endpoint works as expected', () => {
    it('Receives a LHR result when requesting a jobId', async () => {
      mock
        .onGet(`http://localhost:${testPort}/results/${jobId}`)
        .reply(StatusCodes.OK, validLhrData);

      const result = await fetchResult({jobId});
      expect(JSON.stringify(result)).toEqual(JSON.stringify(validLhrData));
    });

    it('Receives a HTML result when requesting a jobId', async () => {
      mock
        .onGet(`http://localhost:${testPort}/results/${jobId}`)
        // Technically we should be altering the headers for the HTML request, but the mock client doesn't care
        .reply(StatusCodes.OK, validHtmlData);

      const result = await fetchResult({jobId, isHtml: true});
      expect(JSON.stringify(result)).toEqual(JSON.stringify(validHtmlData));
    });

    it('Throws an error when bad data is returned', async () => {
      mock
        .onGet(`http://localhost:${testPort}/results/${jobId}`)
        .reply(StatusCodes.OK, invalidLhrData);

      try {
        await fetchResult({jobId});
      } catch (error: any) {
        expect(error).rejects.toThrowError;
        expect(error.message).toEqual('Received bad data');
      }
    });

    it('Throws an axios error when the result is not ready', async () => {
      mock
        .onGet(`http://localhost:${testPort}/results/${jobId}`)
        .reply(StatusCodes.NOT_FOUND);

      try {
        await fetchResult({jobId});
      } catch (error: any) {
        expect(error).rejects.toThrowError;
        expect(error.message).toEqual('Still awaiting results');
      }
    });
  });

  describe('The delete endpoint works as expected', () => {
    it('Receives an OK status when deleting a jobId', async () => {
      mock
        .onDelete(`http://localhost:${testPort}/results/${jobId}`)
        .reply(StatusCodes.NO_CONTENT);

      const request = await deleteResult({jobId});

      expect(request).not.toThrowError;
    });

    it('Does not throw an error if deletion failed', async () => {
      mock
        .onDelete(`http://localhost:${testPort}/results/${jobId}`)
        .reply(StatusCodes.IM_A_TEAPOT);

      const deletion = await deleteResult({jobId});
      expect(deletion).not.toThrowError;
    });
  });

  it('Appends HTML data to report', async () => {
    mock
      .onGet(`http://localhost:${testPort}/results/${jobId}`)
      // Technically we should be altering the headers for the HTML request, but the mock client doesn't care
      .reply(StatusCodes.OK, validHtmlData);

    const resultsWrapper: UserFlowResultsWrapper = {
      steps: validLhrData,
      report: '',
    };

    const request = await fetchAndAppendHtml({jobId, resultsWrapper});
    expect(JSON.stringify(request.report)).toEqual(
      JSON.stringify(validHtmlData)
    );
  });
});
