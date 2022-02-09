/**
 * The 'main' controller. Receives a payload detailing a request to make using
 * Lighthouse
 */
import {
  RegisteredEndpoint,
  EndpointResponse,
  extractBodyFromRequest,
} from './common';
import {UsageLock} from '../usageLock';
import {submitLighthouseRun} from '../profiling/index';

/**
 * Defines the configuration and properties we expect for a given Lighthouse run
 */
interface RaceContext {
  targetUrl: string;
  flags?: string;
}

const isValid = (context: RaceContext): boolean => {
  //trivial validation for now
  return context != undefined && context.targetUrl != undefined;
};

const maybeRunLighthouse = async (
  context: RaceContext
): Promise<EndpointResponse<object>> => {
  // check for lock. try and acquire, if it doesn't lock, reject the request
  //
  // const locked = await UsageLock.getInstance().tryAcquire()
  // if (locked) {

  // }
  return UsageLock.getInstance()
    .tryAcquire()
    .then((obtained) => {
      //   const response = new EndpointResponse({});
      // return a promise, either resolving the locked response or the initating of lighthouse
      if (obtained === false) {
        return new EndpointResponse({
          error: 'Racer is currently in use',
        }).withStatusCode(503);
      } else {
        // kick start Lighthouse
        // const jobId = submitLighthouseRun(context.targetUrl);
        // console.log('Job Id ', jobId);
        // response.withBody({jobId});
        return submitLighthouseRun(context.targetUrl).then(
          (jobId) => new EndpointResponse({jobId})
        );
      }
      //   return Promise.resolve(response);
    });

  // get lock, then, if locked return failure, otherwise execute lighthouse
};

export const ProfileEndpoint: RegisteredEndpoint<object> = {
  path: '/race',
  method: 'POST',
  handler: async (req, res, parsedUrl) => {
    const payload = (await extractBodyFromRequest(req)) as RaceContext;
    if (isValid(payload)) {
      return maybeRunLighthouse(payload);
    } else {
      return new EndpointResponse({
        error: 'Payload is not valid',
      }).withStatusCode(400);
    }
  },
};
