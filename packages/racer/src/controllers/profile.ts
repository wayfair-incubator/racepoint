/**
 * The 'main' controller. Receives a payload detailing a request to make using
 * Lighthouse
 */
import {
  RegisteredEndpoint,
  EndpointResponse,
  extractBodyFromRequest,
} from '../server/utils';
import {UsageLock} from '../usageLock';
import {submitLighthouseRun} from '../profiling/index';

/**
 * Defines the configuration and properties we expect for a given Lighthouse run
 */
interface RaceContext {
  targetUrl: string;
  flags?: string;
  deviceType: 'Desktop' | 'Mobile';
  chromeFlags?: string[];
  overrideChromeFlags?: boolean;
}

const isValid = (context: RaceContext): boolean => {
  //trivial validation for now
  return context != undefined && context.targetUrl != undefined;
};

const maybeRunLighthouse = async (
  context: RaceContext
): Promise<EndpointResponse<object>> => {
  // try to get a lock; if LH is currently in use, send back a 503!
  if (await UsageLock.getInstance().tryAcquire()) {
    return new EndpointResponse({
      // submit lighthouse run; it will return nearly immediately but then run an additional async process
      jobId: await submitLighthouseRun({context}),
    });
  } else {
    return new EndpointResponse({
      error: 'Racer is currently in use',
    }).withStatusCode(503);
  }
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
