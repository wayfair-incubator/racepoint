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

const RESULT_ID = 'resultId';

export const ResultsGet: RegisteredEndpoint<object> = {
  path: `/results/{${RESULT_ID}}`,
  method: 'GET',
  handler: async (req, res, parsedUrl, args) => {
    console.log('RESULT_ID', parseInt(args!![RESULT_ID]!!));

    const record = await LighthouseResultsRepository.read(
      parseInt(args!![RESULT_ID]!!)
    );
    let response = new EndpointResponse({});
    if (record) {
      response = selectResponseTypeByHeader(req, record);
    } else {
      console.log('Nothing found');
      response.withStatusCode(404);
    }
    return response;
  },
};

export const ResultsDelete: RegisteredEndpoint<any> = {
  path: `/results/{${RESULT_ID}}`,
  method: 'DELETE',
  handler: async (req, res, parsedUrl, args) => {
    const response = new EndpointResponse({});
    if (args && args[RESULT_ID]) {
      await LighthouseResultsRepository.delete(parseInt(args[RESULT_ID]));
      console.log(`Result for job '${args[RESULT_ID]}' deleted`);
      response.withStatusCode(204);
    } else {
      response.withStatusCode(404);
    }
    return response;
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
