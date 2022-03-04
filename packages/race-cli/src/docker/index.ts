import path from 'path';
import compose from 'docker-compose';
import logger from '../logger';

const dockerPath = path.join(__dirname, '..', '..');
const isDebug = process.env.LOG_LEVEL === 'debug';

/**
 *  Initializes the Racer and Proxy docker containers.
 *
 *
 * @param racerPort
 * @param raceproxyPort
 * @returns
 */
export const establishRacers = async (
  racerPort: string,
  raceproxyPort: string
) => {
  logger.info('Preparing required Docker images...');
  return compose
    .buildAll({cwd: dockerPath, log: isDebug})
    .then(
      () => {
        logger.info('Images prepared. Initializing containers');
        return compose.upAll({
          cwd: dockerPath,
          log: isDebug,
          env: {
            ...process.env,
            RACER_PORT: racerPort,
            RACEPROXY_PORT: raceproxyPort,
          },
        });
      },
      (e) => {
        logger.error('Failed to start. Is Docker running?', e);
        process.exit();
      }
    )
    .then(
      () => {
        logger.info('Containers successfully launched');
      },
      (reason) => {
        logger.error(
          'Failed to start Racers. Check your Docker configuration',
          reason
        );
        process.exit();
      }
    );
};

/**
 * Brings down the racer and proxy containers.
 *
 * @returns the result of the shutdown
 */
export const haltRacers = async () =>
  compose.down({
    log: isDebug,
  });

/**
 * Place holder for now. In the future this could be used to obtain the url of a racer (to avoid hard coding)
 */
export const inspectServices = async () => {
  compose.ps().then((result) => {
    console.log('docker ps', result);
  });
};
