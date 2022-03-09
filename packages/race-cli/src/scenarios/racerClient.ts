/**
 * Methods for interacting with the Racer.
 */
import axios, {AxiosError, AxiosResponse} from 'axios';
import retry from 'async-await-retry';
import {LighthouseResultsWrapper, LighthouseResults} from '@racepoint/shared';
import {StatusCodes} from 'http-status-codes';
import logger from '../logger';
import {ProfileContext} from '../types';

/*
  Handler for the different error responses from the Racer
*/
const handleRacerError = (error: AxiosError) => {
  if (error.code === 'ECONNRESET') {
    // TODO: Add custom retry handler so the interval isn't as long in this situation
    throw new Error('Racer server was not ready yet');
  } else if (error.code === 'ECONNREFUSED') {
    throw new Error('Racer server is not responsive');
  } else if (
    error.response &&
    error.response.status === StatusCodes.SERVICE_UNAVAILABLE
  ) {
    throw new Error('Racer is currently running a lighthouse report');
  } else {
    logger.debug('Unknown Racer error', error?.code);
    throw new Error();
  }
};

/*
  Handler to request initializing Lighthouse run
*/
export const handleStartRacer = async ({
  port,
  data,
}: {
  port: number;
  data: ProfileContext;
}): Promise<number> =>
  axios
    .post(`http://localhost:${port}/race`, data) // the url will not always be localhost
    .then(async (response: AxiosResponse) => {
      const jobId = response.data?.jobId;
      if (jobId) {
        logger.debug(`Success queuing ${jobId}`);
        return jobId;
      } else {
        throw 'No job ID received';
      }
    })
    .catch((error: AxiosError) => handleRacerError(error));

/*
  Validate the response is either HTML or a LHR
*/
const validateResponseData = (data: LighthouseResults | string) => {
  if (
    (typeof data !== 'string' && data.lighthouseVersion) ||
    (typeof data === 'string' && data.length > 0)
  ) {
    return true;
  } else {
    return false;
  }
};

const CONTENT_TYPE = 'content-type';
const MIME_HTML = 'text/html';

/*
  Fetch data from a jobId from the results endpoint
*/
export const fetchResult = async ({
  jobId,
  port,
  isHtml = false,
}: {
  jobId: number;
  port: number;
  isHtml?: boolean;
}) => {
  const options = isHtml
    ? {
        headers: {[CONTENT_TYPE]: MIME_HTML},
      }
    : {};

  return axios
    .get(`http://localhost:${port}/results/${jobId}`, options)
    .then((response: AxiosResponse) => {
      logger.debug(`Success fetching ${jobId} ${isHtml ? 'HTML' : 'LHR'}`);
      if (validateResponseData(response.data)) {
        return response.data;
      } else {
        throw {};
      }
    })
    .catch((error: Error | AxiosError) => {
      if (axios.isAxiosError(error)) {
        throw new Error('Still awaiting results');
        // results for this ID aren't ready yet, so throw an error and try again
      } else {
        throw new Error('Received bad data');
      }
    });
};

/*
  Fetch additional HTML data and append to results
*/
export const fetchAndAppendHtml = async ({
  jobId,
  port,
  resultsWrapper,
}: {
  jobId: number;
  port: number;
  resultsWrapper: LighthouseResultsWrapper;
}) => {
  return fetchResult({
    jobId,
    port,
    isHtml: true,
  }).then((data) => {
    resultsWrapper.report = data;

    return resultsWrapper;
  });
};

/*
  Delete a jobId from the results endpoint
*/
export const deleteResult = async ({
  jobId,
  port,
}: {
  jobId: number;
  port: number;
}) =>
  axios
    .delete(`http://localhost:${port}/results/${jobId}`)
    .then((response: AxiosResponse) => {
      if (response.status === StatusCodes.NO_CONTENT) {
        logger.debug(`Success deleting ${jobId}`);
      }
    })
    .catch((error: Error | AxiosError) => {
      logger.debug(`Failed to delete ${jobId}`);
    });

/*
  Fetch Lighthouse Results from the endpoint and delete the jobId after
*/
export const collectAndPruneResults = async ({
  jobId,
  port,
  retrieveHtml = false,
}: {
  jobId: number;
  port: number;
  retrieveHtml: boolean;
}) => {
  let resultsWrapper: LighthouseResultsWrapper;

  return fetchResult({jobId, port})
    .then((data: any) => {
      resultsWrapper = {
        lhr: data,
        report: '',
      };
      if (retrieveHtml) {
        return fetchAndAppendHtml({jobId, port, resultsWrapper});
      } else {
        return resultsWrapper;
      }
    })
    .then(async () => {
      deleteResult({jobId, port});
    })
    .then(() => resultsWrapper);
};

export const executeWarmingRun = async ({
  port,
  data,
}: {
  port: number;
  data: ProfileContext;
}) => {
  // start a race, but for this case do it in a retry loop to account for the lag in racer startup time
  // this works for this version, but in the future we'll need to get a bit more sophisticated, perhaps tracking 'awake' racers.
  let jobId = 0;

  try {
    jobId = await retry(() => handleStartRacer({port, data}), [], {
      retriesMax: 10,
      interval: 250,
    });
  } catch (e) {
    logger.error(
      `Could not initiate warming run. Did the Racer container actually start?`
    );
    process.exit();
  }

  try {
    await retry(() => fetchResult({jobId, port}), [], {
      retriesMax: 50,
      interval: 1000,
    });
  } catch (e) {
    logger.error(`Warming run failed!`);
    process.exit();
  }
  // we may want to rethink these try catches, and signal upwards that an error occurred. In other hand, if the warming run fails we may want to guarantee
  // a stop

  return deleteResult({jobId, port});
};