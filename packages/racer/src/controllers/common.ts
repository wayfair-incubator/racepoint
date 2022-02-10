import url from 'url';
import https from 'https';
import http from 'http';
import {IncomingMessage, ServerResponse} from 'http';

/**
 * Used to Register a Listener / handler for a given url
 */
export interface RegisteredEndpoint<T> {
  path: string;
  method: string;
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
    url: url.UrlWithParsedQuery
  ) => Promise<EndpointResponse<T>>;
}

/**
 * A response context object, used to signal to the main server handler function the status, headers, and body back to the
 * http response
 */
export class EndpointResponse<T> {
  private statusCode = 200;
  private body: T;
  private headers: {[name: string]: string} = {
    'Content-Type': 'application/json',
  };

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

  public withHeader(name: string, value: string): EndpointResponse<T> {
    this.headers[name] = value;
    return this;
  }

  public getStatusCode() {
    return this.statusCode;
  }

  public getBody() {
    return this.body;
  }

  public getHeaders() {
    return this.headers;
  }
}

/**
 * An Https agent specific for talking to the Race Proxy
 */
export const RaceProxyHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  host: 'raceproxy',
  port: 443,
});

/**
 * An Http agent specific for talking to the Race Proxy
 */
export const RaceProxyHttpAgent = new http.Agent({
  host: 'raceproxy',
  port: 80,
});

/**
 * Chooses the Agent to use based on the url protocol
 *
 * @param targetUrl A url string we're attempting to reach out to
 * @returns the appropriate Agent for the protocol
 */
export const selectAgentForProtocol = (
  targetUrl: string
): http.Agent | https.Agent => {
  if (targetUrl.startsWith('https')) {
    return RaceProxyHttpsAgent;
  } else if (targetUrl.startsWith('http')) {
    return RaceProxyHttpAgent;
  } else {
    throw new Error(`Unknown protocol for url ${targetUrl}`);
  }
};

/**
 *
 * @param request the IncomingMessage we want to extract a payload from
 * @param parser The parser to use to process the payload. Defaults to JSON.parse
 * @returns any
 */
export const extractBodyFromRequest = (
  request: IncomingMessage,
  parser: (data: string) => any = JSON.parse
): Promise<object> =>
  new Promise((resolve, reject) => {
    let payload = '';
    request.on('data', (chunk) => {
      payload += chunk;
    });
    request.on('end', () => {
      resolve(parser(payload));
    });
  });
