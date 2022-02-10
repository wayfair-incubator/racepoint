import url from 'url';
import http from 'http';
import {IncomingMessage, ServerResponse} from 'http';
import {RegisteredEndpoint} from './controllers/common';
import {FetchEndpoint} from './controllers/fetch';
import {FingerprintEndpoint} from './controllers/fingerprint';
import {ProfileEndpoint} from './controllers/profile';
import {ResultsEndpoint} from './controllers/results';

const endpoints: RegisteredEndpoint<any>[] = [
  FetchEndpoint,
  FingerprintEndpoint,
  ProfileEndpoint,
  ResultsEndpoint,
];

export const initialize = (): http.Server => {
  return http.createServer((req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = url.parse(req.url!!, true);
    // todo: 1. extract the path in the parsed Url into segments, and only match the first segment
    // 2. pass the segments to the handlers
    // 3.update the res.writeHead to write the headers block
    // 4. update the endpoint response to also support headers
    const endpoint = endpoints.find(
      (endpoint) =>
        endpoint.path === parsedUrl.pathname &&
        endpoint.method.toUpperCase() === req.method!!.toUpperCase()
    );

    if (endpoint === undefined) {
      console.log('No matching endpoint found for ' + parsedUrl.pathname);
      res.statusCode = 404;
      res.end();
      return;
    }

    endpoint
      // todo: update the handler so that it responds with a context containing some instruction (e.g. status code, errors)
      // on what to do next
      .handler(req, res, parsedUrl)
      .then((value) => {
        res.writeHead(value.getStatusCode(), value.getHeaders());
        if (value != undefined) {
          res.write(JSON.stringify(value.getBody()));
        }
      })
      .catch((reason) => {
        console.error('Could not process request', reason);
        res.statusCode = 500;
      })
      .finally(() => res.end());
  });
};
