import axios, {AxiosError, AxiosResponse} from 'axios';
import logger from './logger';

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

export const deleteResult = async (jobId: number, port: number) => {
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
      logger.debug('Something went wrong in deletion');
      // Do some sort of cleanup here?
    });
};

// export const fetchResults = async (jobId: number, port, callback): Promise<void> =>
//   axios
//     .get(`http://localhost:${port}/results/${jobId}`)
//     .then((response: AxiosResponse) => {
//       console.log(`Success fetching ${jobId}!`);
//       callback();
//       // resultsArray.push({
//       //   lighthouseVersion: response.data.lighthouseVersion,
//       //   requestedUrl: response.data?.requestedUrl,
//       //   finalUrl: response.data?.finalUrl,
//       //   fetchTime: response.data?.fetchTime,
//       // });
//       // numProcessed++;
//     })
//     .catch((error: AxiosError) => {
//       console.log('Still awaiting results...');
//       // results for this ID aren't ready yet, so throw an error and try again
//       throw new Error();
//     });

// export const deleteResults = async (jobId: number, port: number) => {
//   axios
//     .delete(`http://localhost:${port}/results/${jobId}`)
//     .then((response: AxiosResponse) => {
//       console.log(`Success deleting ${jobId}!`);
//     })
//     .catch((error: AxiosError) => {
//       console.log('Something went wrong in deletion');
//       // Do some sort of cleanup here?
//     });
// };
