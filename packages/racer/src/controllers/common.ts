import url from 'url';
import https from 'https';
import http from 'http';
import {IncomingMessage, ServerResponse} from 'http';

export interface RegisteredEndpoint<T> {
  path: string;
  method: string;
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
    url: url.UrlWithParsedQuery
  ) => Promise<EndpointResponse<T>>;
}

export class EndpointResponse<T> {
  private statusCode = 200;
  private body: T;

  constructor(body: T) {
    this.body = body;
  }

  public withBody(body: T): EndpointResponse<T> {
    this.body = body;
    return this;
  }

  public withStatusCode(updatedCode: number): EndpointResponse<T> {
    this.statusCode = updatedCode;
    return this;
  }

  public getStatusCode() {
    return this.statusCode;
  }

  public getBody() {
    return this.body;
  }
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

export const extractBodyFromRequest = (
  request: IncomingMessage
): Promise<object> =>
  new Promise((resolve, reject) => {
    let payload = '';
    request.on('data', (chunk) => {
      payload += chunk;
    });
    request.on('end', () => {
      resolve(JSON.parse(payload));
    });
  });
