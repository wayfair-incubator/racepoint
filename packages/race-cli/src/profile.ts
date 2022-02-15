import {ScenarioContext, Scenario} from './types';
import path from 'path';
import compose from 'docker-compose';
import axios, {AxiosError, AxiosResponse} from 'axios';
import async from 'async';
import retry from 'async-await-retry';

const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 500;

export const PROFILE_COMMAND = 'profile';

class ProfileContext implements ScenarioContext {
  targetUrl: string;
  deviceType: 'Mobile' | 'Desktop';
  numberRuns: number;
  outputFormat: 'JSON' | 'HTML';
  overrideChromeFlags: boolean;
  raceproxyPort: number;
  racerPort: number;

  constructor(userArgs: any) {
    this.targetUrl = userArgs?.targetUrl || '';
    this.deviceType = userArgs?.deviceType;
    this.numberRuns = userArgs?.numberRuns;
    this.outputFormat = userArgs?.outputFormat;
    this.overrideChromeFlags = userArgs?.overrideChromeFlags;
    this.raceproxyPort = userArgs?.raceproxyPort;
    this.racerPort = userArgs?.racerPort;
  }
}

export class ProfileScenario extends Scenario<ProfileContext> {
  getCommand(): string {
    return PROFILE_COMMAND;
  }

  buildContext(userArgs: any): ProfileContext {
    return new ProfileContext(userArgs);
  }

  async runScenario(context: ProfileContext): Promise<void> {
    let resultsArray: any = [];
    let numProcessed = 0;
    let numFailed = 0;

    const fetchResults = async (jobId: number) =>
      axios
        .get(`http://localhost:${context.racerPort}/results/${jobId}`)
        .then((response: AxiosResponse) => {
          console.log(`Success fetching ${jobId}!`);
          // console.log(Object.keys(response.data));
          resultsArray.push({
            lighthouseVersion: response.data.lighthouseVersion,
            requestedUrl: response.data?.requestedUrl,
            finalUrl: response.data?.finalUrl,
            fetchTime: response.data?.fetchTime,
          });
          numProcessed++;
        })
        .catch((error: AxiosError) => {
          console.log('Still awaiting results...');
          throw new Error();
        });

    const deleteResults = async (jobId: number) => {
      axios
        .get(`http://localhost:${context.racerPort}/results/${jobId}`)
        .then((response: AxiosResponse) => {
          console.log(`Success deleting ${jobId}!`);
        })
        .catch((error: AxiosError) => {
          console.log('Still awaiting results...');
          throw new Error();
        });
    };

    const dockerPath = path.join(__dirname, '..', '..');

    const processingQueue = async.queue((task: any, completed: any) => {
      // console.log("Currently Busy Processing Task " + task);
      // Number of elements to be processed.
      const remaining = processingQueue.length();
      completed(null, {task, remaining});
    }, 2);

    compose.buildAll({cwd: dockerPath}).then(() =>
      compose.upAll({cwd: dockerPath, log: true}).then(
        async () => {
          const racerUrl = `http://localhost:${context.racerPort}/race`;

          const fetchUrl = async () =>
            axios
              .post(racerUrl, context)
              .then(async (response: AxiosResponse) => {
                const jobId = response.data?.jobId;
                if (jobId) {
                  console.log(`Successfully queued ${jobId}`);

                  const item = retry(() => fetchResults(jobId), [], {
                    retriesMax: 20,
                    interval: 3000,
                  }).catch((err) => {
                    numFailed++;
                    console.log(`Results failed after ${MAX_RETRIES} retries!`);
                  });

                  processingQueue.push(
                    item,
                    (error: any, {item, remaining}: any) => {
                      if (error) {
                        console.log('Processing queue failure');
                      }
                    }
                  );

                  return jobId;
                }
              })
              .catch((error: AxiosError) => {
                // handle error
                if (error.code === 'ECONNRESET') {
                  throw new Error('Racer server was not ready yet!)');
                } else if (error.response && error.response.status === 503) {
                  console.log('Racer is currently running a lighthouse report');
                  throw new Error();
                } else {
                  console.log('Some other error');
                  throw new Error();
                }
              });

          for (let i = 0; i < context.numberRuns; i++) {
            await retry(fetchUrl, [], {
              retriesMax: 20,
              interval: 3000,
            }).catch((err) => {
              console.log(`Fetch failed after ${20} retries!`);
            });
          }

          const checkQueue = async () => {
            return new Promise<void>((resolve, reject) => {
              if (numProcessed + numFailed === context.numberRuns) {
                resolve();
              } else {
                reject('Queue is not done');
              }
            });
          };

          // Wait until all the results have been processed
          await retry(checkQueue, [], {
            retriesMax: 100,
            interval: 3000,
          }).catch((e) => {
            console.log('Results fetcher', e);
          });

          console.log(resultsArray);

          // Shut down container if success or failure
          compose.down({log: true});
        },
        (err) => {
          console.log('Something went wrong:', err.message);
        }
      )
    );
  }
}
