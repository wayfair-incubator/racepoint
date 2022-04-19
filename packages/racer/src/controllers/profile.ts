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
import {RaceProfileCommand} from '../profiling/config';

const isValid = (context: RaceProfileCommand): boolean => {
  //trivial validation for now
  return context != undefined && context.targetUrl != undefined;
};

const maybeRunLighthouse = async (
  context: RaceProfileCommand
): Promise<EndpointResponse<object>> => {
  const response = new EndpointResponse<object>({});
  // first check validity. Currently this is a trivial operation
  if (!isValid(context)) {
    response.withBody({error: 'Payload is not valid'}).withStatusCode(400);
  }
  // try to get a lock; if LH is currently in use, send back a 503!
  else if (await UsageLock.getInstance().tryAcquire()) {
    const jobId = await submitLighthouseRun(context);
    response.withBody({jobId}).withStatusCode(200);
  } else {
    response.withBody({error: 'Racer is currently in use'}).withStatusCode(503);
  }
  return response;
};

export const ProfileEndpoint: RegisteredEndpoint<object> = {
  path: '/race',
  method: 'POST',
  handler: async (req, res, parsedUrl) => {
    return maybeRunLighthouse(
      // we parse the instruction from the cli as a context object pulled from the 'lower level'; we're reaching across a boundary here
      // it may be wise to create a specific API object and add some mapping code later to separate what we
      // expect callers to send to us versus what the internal operations work on
      (await extractBodyFromRequest(req)) as RaceProfileCommand
    );
  },
};
