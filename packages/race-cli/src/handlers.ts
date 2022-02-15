import axios, {AxiosError, AxiosResponse} from 'axios';

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
