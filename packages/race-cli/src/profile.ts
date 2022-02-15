import {ScenarioContext, Scenario} from './types';
import path from 'path';
import compose from 'docker-compose';
import axios, {AxiosError, AxiosResponse} from 'axios';
import retry from 'async-await-retry';

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 50;

export const PROFILE_COMMAND = 'profile';

class ProfileContext implements ScenarioContext {
  url: string;
  deviceType: 'Mobile' | 'Desktop';
  numberRuns: number;
  outputFormat: 'JSON' | 'HTML';
  overrideChromeFlags: boolean;
  raceproxyPort: number;
  racerPort: number;

  constructor(userArgs: any) {
    this.url = userArgs?.url || '';
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
    const dockerPath = path.join(__dirname, '..', '..');

    compose.buildAll({cwd: dockerPath}).then(() =>
      compose.upAll({cwd: dockerPath, log: true}).then(
        async () => {
          const racerUrl = `http://localhost:${context.racerPort}/fetch?url=${context.url}`;

          const fetchUrl = () =>
            axios
              .get(racerUrl, {
                responseType: 'json',
                insecureHTTPParser: true,
                data: context,
              })
              .then(function (response: AxiosResponse) {
                // handle success
                console.log(response.statusText);
              })
              .catch(function (error: AxiosError) {
                // handle error
                if (error.code === 'ECONNRESET') {
                  throw new Error(`Racer was not ready yet!)`);
                } else {
                  throw new Error();
                }
              });

          await retry(fetchUrl, [], {
            retriesMax: MAX_RETRIES,
            interval: RETRY_INTERVAL_MS,
          }).catch((err) => {
            console.log(`Fetch failed after ${MAX_RETRIES} retries!`);
          });

          // Shut down container if success or failure
          compose.down();
        },
        (err) => {
          console.log('Something went wrong:', err.message);
        }
      )
    );
  }
}
