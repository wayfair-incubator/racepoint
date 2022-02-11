import url from 'url';
import http from 'http';
import {IncomingMessage, ServerResponse} from 'http';
import {RegisteredEndpoint} from './utils';
import {RouteMatcher} from './routeMatcher';

export const initialize = (
  registeredEndpoints: RegisteredEndpoint<any>[]
): http.Server => {
  const matcher = new RouteMatcher(registeredEndpoints);
  return http.createServer((req: IncomingMessage, res: ServerResponse) => {
    const parsedUrl = url.parse(req.url!!, true);

    const context = matcher.match(parsedUrl.path!!, req.method!!);

    if (context === undefined) {
      console.log('No matching endpoint found for ' + parsedUrl.pathname);
      res.statusCode = 404;
      res.end();
      return;
    }

    context.endpoint
      // todo: update the handler so that it responds with a context containing some instruction (e.g. status code, errors)
      // on what to do next
      .handler(req, res, parsedUrl, context.args)
      .then((value) => {
        res.writeHead(value.getStatusCode(), value.getHeaders());
        if (typeof value.getBody() == 'string') {
          // no op
        } else if (typeof value.getBody() == 'string') {
          res.write(value.getBody());
        } else if (typeof value.getBody() == 'object') {
          res.write(JSON.stringify(value.getBody()));
        } else {
          console.log('unknown type ', typeof value.getBody());
        }
      })
      .catch((reason) => {
        console.error('Could not process request', reason);
        res.statusCode = 500;
      })
      .finally(() => res.end());
  });
};
