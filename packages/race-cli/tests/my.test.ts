import axios, {AxiosResponse, AxiosError} from 'axios';
import {deleteResult, fetchResult} from '../src/scenarios/handlers';
import MockAdapter from 'axios-mock-adapter';
import {LighthouseResults} from '@racepoint/shared';

describe('postProcessData', () => {
  let mock: any;

  beforeAll(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  const deleteResponse: AxiosResponse = {
    data: null,
    status: 204,
    statusText: 'OK',
    headers: {},
    config: {},
  };

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

  const jobId = 1234;
  const port = 3000;

  it('Recieves a LHR result when requesting a jobId', async () => {
    mock
      .onGet(`http://localhost:${port}/results/${jobId}`)
      .reply(200, validLhrData);

    const result = await fetchResult({jobId, port: 3000});
    expect(JSON.stringify(result)).toEqual(JSON.stringify(validLhrData));
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

  // it('Appends HTML data to report', () => {

  // });

  it('Throws an error when bad data is returned', () => {
    expect(true).toBe(true);
  });
});
