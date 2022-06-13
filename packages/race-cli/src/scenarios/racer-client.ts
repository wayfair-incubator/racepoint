/**
 * Methods for interacting with the Racer.
 */
import axios, {AxiosError, AxiosResponse} from 'axios';
import async from 'async';
import retry from 'async-await-retry';
import {
  CacheMetricData,
  UserFlowResultsWrapper,
  UserFlowStep,
} from '@racepoint/shared';
import {StatusCodes} from 'http-status-codes';
import logger from '../logger';
import {ProfileContext, FlowContext} from '../types';

const racerServer = process.env?.RACER_SERVER || 'localhost';
const racerPort = process.env?.RACER_PORT || 3000;

const CACHE_CONTROL_ENDPOINT = '/rp-cache-control';
const CACHE_INFO_URL = '/rp-cache-info';
const raceProxyServer = process.env?.RACEPROXY_SERVER || 'localhost';

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
  data,
}: {
  data: ProfileContext;
}): Promise<number> =>
  axios
    .post(`http://${racerServer}:${racerPort}/race`, data)
    .then(async (response: AxiosResponse) => {
      const jobId = response.data?.jobId;
      if (jobId) {
        logger.debug(`Success queuing job #${jobId}`);
        return jobId;
      } else {
        throw 'No job ID received';
      }
    })
    .catch((error: AxiosError) => handleRacerError(error));

/*
 Handler to request initializing Lighthouse User Flow
*/
export const handleStartUserFlow = async ({
  data,
}: {
  data: FlowContext;
}): Promise<number> =>
  axios
    .post(`http://${racerServer}:${racerPort}/flow`, data)
    .then(async (response: AxiosResponse) => {
      const jobId = response.data?.jobId;
      if (jobId) {
        logger.info(`Success queuing job #${jobId}`);
        return jobId;
      } else {
        throw 'No job ID received';
      }
    })
    // @TODO Add new handler
    .catch((error: AxiosError) => handleRacerError(error));

/*
  Validate the response is either HTML or a LHR
*/
const validateResponseData = (data: UserFlowStep[] | string) => {
  if (
    (typeof data !== 'string' && data[0].lhr) ||
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
  isHtml = false,
}: {
  jobId: number;
  isHtml?: boolean;
}) => {
  const options = isHtml
    ? {
        headers: {[CONTENT_TYPE]: MIME_HTML},
      }
    : {};

  return axios
    .get(`http://${racerServer}:${racerPort}/results/${jobId}`, options)
    .then(async (response: AxiosResponse) => {
      logger.debug(`Success fetching job #${jobId} ${isHtml ? 'HTML' : 'LHR'}`);

      // @TODO support user flow report
      if (validateResponseData(response.data)) {
        return response.data;
      } else {
        throw new Error('Received bad data');
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
  resultsWrapper,
}: {
  jobId: number;
  resultsWrapper: UserFlowResultsWrapper;
}) => {
  return fetchResult({
    jobId,
    isHtml: true,
  }).then((data) => {
    resultsWrapper.report = data;

    return resultsWrapper;
  });
};

/*
  Delete a jobId from the results endpoint
*/
export const deleteResult = async ({jobId}: {jobId: number}) =>
  axios
    .delete(`http://${racerServer}:${racerPort}/results/${jobId}`)
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
  retrieveHtml = false,
}: {
  jobId: number;
  retrieveHtml: boolean;
}) => {
  let resultsWrapper: UserFlowResultsWrapper;

  return fetchResult({jobId})
    .then((data: UserFlowStep[]) => {
      resultsWrapper = {
        steps: data,
        report: '',
        name: `result_${jobId}`,
      };
      if (retrieveHtml) {
        return fetchAndAppendHtml({jobId, resultsWrapper});
      } else {
        return resultsWrapper;
      }
    })
    .then(async () => {
      deleteResult({jobId});
    })
    .then(() => resultsWrapper);
};

export const executeWarmingRun = async ({data}: {data: ProfileContext}) => {
  // start a race, but for this case do it in a retry loop to account for the lag in racer startup time
  // this works for this version, but in the future we'll need to get a bit more sophisticated, perhaps tracking 'awake' racers.
  let jobId = 0;

  try {
    jobId = await retry(() => handleStartRacer({data}), [], {
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
    await retry(() => fetchResult({jobId}), [], {
      retriesMax: 50,
      interval: 1000,
    });
  } catch (e) {
    logger.error(`Warming run failed!`);
    process.exit();
  }
  // we may want to rethink these try catches, and signal upwards that an error occurred. In other hand, if the warming run fails we may want to guarantee
  // a stop

  return deleteResult({jobId});
};

export const enableOutboundRequests = async (enable: boolean) =>
  axios
    .post(`http://${raceProxyServer}${CACHE_CONTROL_ENDPOINT}`, {
      enableOutboundRequests: enable,
    })
    .then((response: AxiosResponse) => {
      logger.debug(
        `Cache successfully ${enable ? 'enabled' : 'disabled'} with code: ${
          response.status
        }`
      );
    })
    .catch((error: Error | AxiosError) => {
      logger.error(error);
    });

export const retrieveCacheStatistics = async (): Promise<
  CacheMetricData | undefined
> =>
  axios
    .get(`http://${raceProxyServer}${CACHE_INFO_URL}`)
    .then((response: AxiosResponse): any => {
      return response?.data;
    })
    .catch((error: Error | AxiosError) => {
      logger.error(error);
    });

const MAX_RETRIES = 100;
const RETRY_INTERVAL_MS = 3000;

/*
    For n number of runs, this function accepts a function to enqueue, expecting that to return a jobId #
    It then enqueues a second function that typically processes said ID #
    Every function is retried a # of times until success or max retry
    The result of each run is returned in an array
*/
export const retryableQueue = async ({
  enqueue,
  processResult,
  numberRuns,
}: {
  enqueue: any;
  processResult: Function;
  numberRuns: number;
}): Promise<Array<any>> => {
  let resultsArray: any = [];
  let numProcessed = 0;
  let numFailed = 0;

  const processingQueue = async.queue(() => {
    // Number of elements to be processed.
    const remaining = processingQueue.length();
    if (remaining === 0) {
      logger.debug('Queue complete');
    }
  }, 2);

  const checkQueue = async () => {
    return new Promise<void>((resolve, reject) => {
      if (numProcessed + numFailed === numberRuns) {
        resolve();
      } else {
        reject('Queue is not done processing');
      }
    });
  };

  const enqueueAndProcess = async () =>
    enqueue().then((jobId: number) => {
      const tryGetResults = retry(
        () =>
          processResult(jobId).then((result: any) => {
            resultsArray.push(result);
            numProcessed++;
            logger.info(`Results received [${numProcessed}/${numberRuns}]`);
          }),
        [],
        {
          retriesMax: MAX_RETRIES,
          interval: RETRY_INTERVAL_MS,
        }
      ).catch(() => {
        numFailed++;
        logger.error(`Results failed after ${MAX_RETRIES} retries!`);
      });

      processingQueue.push(tryGetResults);
    });

  // Loop through runs, queueing up the fetch command, retrying if we don't have the ready reponse
  for (let i = 1; i <= numberRuns; i++) {
    try {
      await retry(enqueueAndProcess, [], {
        retriesMax: MAX_RETRIES,
        interval: RETRY_INTERVAL_MS,
      });
    } catch {
      logger.error(`Fetch failed after ${MAX_RETRIES} retries!`);
    }
  }

  // Wait until all the results have been processed
  await retry(checkQueue, [], {
    retriesMax: 100,
    interval: RETRY_INTERVAL_MS,
  });

  return resultsArray;
};
