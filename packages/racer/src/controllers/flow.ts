/**
 * Flow controller
 */
import {
  RegisteredEndpoint,
  EndpointResponse,
  extractBodyFromRequest,
} from '../server/utils';
import {UsageLock} from '../usageLock';
import {submitUserFlow} from '../profiling/index';
import {RaceFlowCommand, TestCaseType} from '../profiling/config';
import {requireFromString} from 'module-from-string';

const maybeRunUserFlow = async (
  context: RaceFlowCommand
): Promise<EndpointResponse<object>> => {
  const response = new EndpointResponse<object>({});

  const testCase: TestCaseType = requireFromString(context.testModule);

  // Check that there is a connect method we can run
  if (typeof testCase.connect !== 'function') {
    response
      .withBody({
        error:
          'Module incorrectly formatted. Module should have "connect" method!',
      })
      .withStatusCode(400);
  }
  // try to get a lock; if LH is currently in use, send back a 503!
  else if (await UsageLock.getInstance().tryAcquire()) {
    const jobId = await submitUserFlow(context, testCase);
    response.withBody({jobId}).withStatusCode(200);
  } else {
    response.withBody({error: 'Racer is currently in use'}).withStatusCode(503);
  }

  return response;
};

export const FlowEndpoint: RegisteredEndpoint<object> = {
  path: '/flow',
  method: 'POST',
  handler: async (req) => {
    return maybeRunUserFlow(
      (await extractBodyFromRequest(req)) as RaceFlowCommand
    );
  },
};
