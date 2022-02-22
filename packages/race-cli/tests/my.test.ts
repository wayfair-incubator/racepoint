import axios, {AxiosResponse, AxiosError} from 'axios';
import {
  handleStartRacer,
  deleteResult,
  fetchResult,
} from '../src/scenarios/handlers';
import MockAdapter from 'axios-mock-adapter';
import {LighthouseResults} from '@racepoint/shared';

const validLhrData: LighthouseResults = {
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
};

const invalidLhrData = {
  fakeEntry: true,
  fakeProperty1: 12345,
  fakeProperty2: 'banana',
};

const validHtmlData = `
    <html>
      <body>
        Hello world!
      </body>
    </html>
  `;

const jobId = 1234;
const port = 3000;
const data = {
  targetUrl: 'http://meow.com',
};

describe('postProcessData', () => {
  let mock: any;

  beforeAll(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  describe('The fetch endpoint works as expected', () => {
    it('Receives a jobId when submitting a URL', async () => {
      mock.onPost(`http://localhost:${port}/race`).reply(200, {jobId});

      const result = await handleStartRacer({port: 3000, data});
      expect(JSON.stringify(result)).toEqual(JSON.stringify(jobId));
    });

    it('Receives a busy error when submitting a URL while running Lighthouse', async () => {
      mock.onPost(`http://localhost:${port}/race`).reply(503, {jobId});

      try {
        await await handleStartRacer({port: 3000, data});
      } catch (error: any) {
        expect(error).toHaveProperty('isAxiosError');
        expect(error.message).toEqual(
          'Racer is currently running a lighthouse report'
        );
      }
    });
  });

  describe('The results endpoint works as expected', () => {
    it('Receives a LHR result when requesting a jobId', async () => {
      mock
        .onGet(`http://localhost:${port}/results/${jobId}`)
        .reply(200, validLhrData);

      const result = await fetchResult({jobId, port: 3000});
      expect(JSON.stringify(result)).toEqual(JSON.stringify(validLhrData));
    });

    it('Receives a HTML result when requesting a jobId', async () => {
      mock
        .onGet(`http://localhost:${port}/results/${jobId}`)
        // Technically we should be altering the headers for the HTML request, but the mock client doesn't care
        .reply(200, validHtmlData);

      const result = await fetchResult({jobId, port: 3000, isHtml: true});
      expect(JSON.stringify(result)).toEqual(JSON.stringify(validHtmlData));
    });

    it('Throws an error when bad data is returned', async () => {
      mock
        .onGet(`http://localhost:${port}/results/${jobId}`)
        .reply(200, invalidLhrData);

      try {
        await fetchResult({jobId, port});
      } catch (error: any) {
        expect(error).rejects.toThrowError;
        expect(error.message).toEqual('Received bad data');
      }
    });

    it('Throws an axios error when the result is not ready', async () => {
      mock.onGet(`http://localhost:${port}/results/${jobId}`).reply(404);

      try {
        await fetchResult({jobId, port});
      } catch (error: any) {
        expect(error).rejects.toThrowError;
        expect(error.message).toEqual('Still awaiting results');
      }
    });
  });

  describe('The delete endpoint works as expected', () => {
    it('Receives an OK status when deleting a jobId', async () => {
      mock.onDelete(`http://localhost:${port}/results/${jobId}`).reply(204);

      const request = await deleteResult({jobId, port});

      expect(request).not.toThrowError;
    });

    it('Throws an error if deletion failed', async () => {
      mock.onDelete(`http://localhost:${port}/results/${jobId}`).reply(205);

      try {
        await deleteResult({jobId, port});
      } catch (error: any) {
        expect(error).rejects.toThrowError;
        expect(error.message).toEqual(`Failed to delete ${jobId}`);
      }
    });
  });

  // it('Appends HTML data to report', () => {

  // });
});
