import axios, {AxiosError, AxiosResponse} from 'axios';
import logger from './logger';
import {LighthouseResultsWrapper} from '@racepoint/shared';

/*
  Handler for the different error responses from the Racer
*/
export const handleRacerError = (error: AxiosError) => {
  if (error.code === 'ECONNRESET') {
    // TODO: Add custom retry handler so the interval isn't as long in this situation
    throw new Error('Racer server was not ready yet');
  } else if (error.code === 'ECONNREFUSED') {
    throw new Error('Racer server is not responsive');
  } else if (error.response && error.response.status === 503) {
    throw new Error('Racer is currently running a lighthouse report');
  } else {
    console.log('Unknown Racer error', error?.code);
    throw new Error();
  }
};

const CONTENT_TYPE = 'content-type';
const MIME_HTML = 'text/html';

/*
  Fetch data from a jobId from the results endpoint
*/
const fetchResult = async ({
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
      return response.data;
    })
    .catch((error: AxiosError) => {
      logger.debug('Still awaiting results...');
      // results for this ID aren't ready yet, so throw an error and try again
      throw new Error();
    });
};

/*
  Fetch additional HTML data and append to results
*/
const fetchAndAppendHtml = async ({
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
const deleteResult = async ({jobId, port}: {jobId: number; port: number}) => {
  axios
    .delete(`http://localhost:${port}/results/${jobId}`)
    .then((response: AxiosResponse) => {
      if (response.status === 204) {
        logger.debug(`Success deleting ${jobId}`);
      } else {
        logger.debug('Response from DELETE endpoint', response.status);
      }
    })
    .catch((error: AxiosError) => {
      logger.debug(`Failed to delete ${jobId}`, error.code);
      // Do some sort of cleanup here?
    });
};

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
