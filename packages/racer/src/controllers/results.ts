/**
 * Adapter for querying into the results repository.
 * Supports fetching html and json results
 *
 */
import {RegisteredEndpoint, EndpointResponse} from './common';
import {LighthouseResultsRepository} from '../profiling/repository';

export const ResultsEndpoint: RegisteredEndpoint<object> = {
  path: '/results',
  method: 'GET',
  handler: async (req, res, parsedUrl) => {
    console.log(req.headers);
    console.log(parsedUrl);
    return new EndpointResponse({});
  },
};
