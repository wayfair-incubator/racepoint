import url from 'url';
import http from 'http';
import {IncomingMessage, ServerResponse} from 'http';
import {RegisteredEndpoint} from './controllers/common';
import {FetchEndpoint} from './controllers/fetch';
import {FingerprintEndpoint} from './controllers/fingerprint';

const endpoints: RegisteredEndpoint[] = [FetchEndpoint, FingerprintEndpoint];

export const initialize = (): http.Server => {
  return http.createServer((req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = url.parse(req.url!!, true);
    const endpoint = endpoints.find(
      (endpoint) => endpoint.path === parsedUrl.pathname
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
        res.writeHead(200, {'Content-Type': 'application/json'});
        if (value != undefined) {
          res.write(JSON.stringify(value));
        }
      })
      .catch((reason) => {
        console.error('Could not process request', reason);
        res.statusCode = 500;
      })
      .finally(() => res.end());
  });
};
