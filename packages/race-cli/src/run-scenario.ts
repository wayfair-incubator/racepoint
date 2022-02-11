import {ScenarioContext, Scenario} from './types';
import path from 'path';
import compose from 'docker-compose';
import axios, {AxiosError, AxiosResponse} from 'axios';

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 50;

class RunContext implements ScenarioContext {
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

export class RunScenario extends Scenario<RunContext> {
  getCommand(): string {
    return 'run';
  }

  buildContext(userArgs: any): RunContext {
    return new RunContext(userArgs);
  }

  async runScenario(context: RunContext): Promise<void> {
    const dockerPath = path.join(__dirname, '..', '..');

    compose.buildAll({cwd: dockerPath}).then(() =>
      compose.upAll({cwd: dockerPath, log: true}).then(
        async () => {
          let retry = 0;

          const racerUrl = `http://localhost:${context.racerPort}/fetch?url=${context.url}`;

          const tryFetchAndRepeat = async () => {
            try {
              await axios
                .get(racerUrl, {
                  responseType: 'json',
                  insecureHTTPParser: true,
                  data: context,
                })
                .then(function (response: AxiosResponse) {
                  // handle success
                  console.log(response.statusText);

                  compose.down();
                })
                .catch(function (error: AxiosError) {
                  // handle error
                  if (error.code === 'ECONNRESET' && retry <= MAX_RETRIES) {
                    console.log(`Racer was not ready yet! (${retry} retries)`);
                    retry++;
                    setTimeout(() => {
                      tryFetchAndRepeat();
                    }, RETRY_INTERVAL_MS);
                  } else {
                    // Shut down after max retries
                    compose.down();
                  }
                });
            } catch (e) {
              console.log('Caught');
            }
          };

          tryFetchAndRepeat();
        },
        (err) => {
          console.log('something went wrong:', err.message);
        }
      )
    );
  }
}
