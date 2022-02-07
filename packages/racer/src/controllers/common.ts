import url from 'url';
import https from 'https';
import http, {Agent} from 'http';
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

export const RaceProxyHttpAgent = new http.Agent({
  host: 'raceproxy',
  port: 80,
});

export const selectAgentForProtocol = (
  targetUrl: string
): http.Agent | https.Agent => {
  if (targetUrl.startsWith('https')) {
    return RaceProxyHttpsAgent;
  } else {
    return RaceProxyHttpAgent;
  }
};
