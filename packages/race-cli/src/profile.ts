import {ScenarioContext, Scenario} from './types';
import path from 'path';
import compose from 'docker-compose';
import axios, {AxiosError, AxiosResponse} from 'axios';
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

    const fetchResults = async (jobId: number) =>
      axios
        .get(`http://localhost:${context.racerPort}/results/${jobId}`)
        .then((response: AxiosResponse) => {
          console.log('Success!', response.status);
          // console.log(Object.keys(response.data));
          resultsArray.push({
            lighthouseVersion: response.data.lighthouseVersion,
            requestedUrl: response.data?.requestedUrl,
            finalUrl: response.data?.finalUrl,
            fetchTime: response.data?.fetchTime,
          });
        })
        .catch((error: AxiosError) => {
          console.log('Still writing results...');
          throw new Error();
        });

    const dockerPath = path.join(__dirname, '..', '..');

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

                  await retry(() => fetchResults(jobId), [], {
                    retriesMax: 10,
                    interval: 5000,
                  }).catch((err) => {
                    console.log(`Results failed after ${MAX_RETRIES} retries!`);
                  });
                }
              })
              .catch((error: AxiosError) => {
                // handle error
                if (error.code === 'ECONNRESET') {
                  throw new Error(`Racer was not ready yet!)`);
                } else {
                  console.log('Other error');
                  throw new Error();
                }
              });

          for (let i = 0; i < context.numberRuns; i++) {
            await retry(fetchUrl, [], {
              retriesMax: MAX_RETRIES,
              interval: RETRY_INTERVAL_MS,
            }).catch((err) => {
              console.log(`Fetch failed after ${MAX_RETRIES} retries!`);
            });
          }

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
