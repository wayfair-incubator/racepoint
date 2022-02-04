import url from 'url';
import https from 'https';
import {IncomingMessage, ServerResponse} from 'http';

export interface RegisteredEndpoint {
  path: string;
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
    url: url.UrlWithParsedQuery
  ) => Promise<any>;
}

export const RaceProxyHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  host: 'raceproxy',
  port: 443,
});
