/**
 * Adapter for querying into the results repository.
 * Supports fetching html and json results
 *
 */
import {RegisteredEndpoint, EndpointResponse} from '../server/utils';
import {
  LighthouseResultsRepository,
  RepositoryRecord,
} from '../profiling/repository';
import {IncomingMessage} from 'http';

export const ResultsEndpoint: RegisteredEndpoint<object> = {
  path: '/results/{resultId}',
  method: 'GET',
  handler: async (req, res, parsedUrl, args) => {
    return LighthouseResultsRepository.read(
      parseInt(args!!['resultId']!!)
    ).then((record) => {
      let response = new EndpointResponse({});
      if (record) {
        response = selectResponseTypeByHeader(req, record);
      } else {
        response.withStatusCode(404);
      }
      return Promise.resolve(response);
    });
  },
};

const CONTENT_TYPE = 'content-type';
const MIME_HTML = 'text/html';

const selectResponseTypeByHeader = (
  req: IncomingMessage,
  record: RepositoryRecord
): EndpointResponse<any> => {
  if (
    req.headers[CONTENT_TYPE] &&
    req.headers[CONTENT_TYPE]!!.startsWith(MIME_HTML)
  ) {
    return new EndpointResponse(record.results.report).withHeader(
      CONTENT_TYPE,
      MIME_HTML
    );
  } else {
    return new EndpointResponse(record.results.lhr).withHeader(
      CONTENT_TYPE,
      'application/json'
    );
  }
};
