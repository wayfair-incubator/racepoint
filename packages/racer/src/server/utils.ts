import url from 'url';
import {IncomingMessage, ServerResponse} from 'http';

export interface RequestContext {
  request: IncomingMessage;
  response: ServerResponse;
  url: url.UrlWithParsedQuery;
  args: any[];
}

/**
 * Used to Register a Listener / handler for a given url
 */
export interface RegisteredEndpoint<T> {
  path: string;
  method: string;
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
    url: url.UrlWithParsedQuery,
    args?: {[key: string]: string}
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
