import axios, {AxiosError, AxiosResponse} from 'axios';
import logger from './logger';
import {LighthouseResultsWrapper} from '@racepoint/shared';

export const handleRacerError = (error: AxiosError) => {
  // handle error
  if (error.code === 'ECONNRESET') {
    // TODO: Add custom retry handler so the interval isn't as long in this situation
    throw new Error('Racer server was not ready yet!)');
  } else if (error.code === 'ECONNREFUSED') {
    throw new Error('Racer server is not responsive!');
  } else if (error.response && error.response.status === 503) {
    // console.log('Racer is currently running a lighthouse report');
    throw new Error('Racer is currently running a lighthouse report!');
  } else {
    console.log('Some other error!', error?.code);
    throw new Error();
  }
};

const fetchResult = async (
  jobId: number,
  port: number,
  callback: Function = () => {}
): Promise<void> =>
  axios
    .get(`http://localhost:${port}/results/${jobId}`)
    .then((response: AxiosResponse) => {
      logger.debug(`Success fetching ${jobId}`);

      const result: LighthouseResultsWrapper = {
        lhr: response.data,
        report: '',
      };

      callback(result);
    })
    .catch((error: AxiosError) => {
      logger.debug('Still awaiting results...');
      // results for this ID aren't ready yet, so throw an error and try again
      throw new Error();
    });

const deleteResult = async (jobId: number, port: number) => {
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

export const collectAndPruneResults = async (
  jobId: number,
  port: number,
  callback: Function
) =>
  fetchResult(jobId, port, callback).then(async () =>
    deleteResult(jobId, port)
  );
