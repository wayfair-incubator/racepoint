import {Http2ServerRequest, ClientHttp2Stream} from 'http2';
import {IncomingMessage} from 'http';
import {ProxyCache} from './proxy-cache';
import {StatusCodes} from 'http-status-codes';
import hash from 'object-hash';
import {UrlWithParsedQuery} from 'url';

export const CACHE_KEY_HEADER = 'll-cache-key';

export const isHttpRequest = (
  obj: IncomingMessage | Http2ServerRequest
): obj is IncomingMessage => {
  return (obj as IncomingMessage).httpVersion.startsWith('1');
};

/**
 * Extract the body from a request or response
 *
 * @param httpMessage
 */
export const extractBodyBuffer = async (
  httpMessage: IncomingMessage | Http2ServerRequest | ClientHttp2Stream
): Promise<Buffer> =>
  new Promise((resolve) => {
    const bodyData: Buffer[] = [];
    httpMessage.on('data', function (data: Buffer) {
      bodyData.push(data);
    });
    httpMessage.on('end', function () {
      resolve(Buffer.concat(bodyData));
    });
  });

/**
 * Extract the response object
 *
 * @param httpMessage
 */
export const extractBodyFromRequest = (
  request: IncomingMessage | Http2ServerRequest,
  parser: (data: string) => any = JSON.parse
): Promise<object> =>
  new Promise((resolve) => {
    let payload = '';
    request.on('data', (chunk) => {
      payload += chunk;
    });
    request.on('end', () => {
      resolve(parser(payload));
    });
  });

/**
 * Determines the cache key to use based on the request and its body.
 *
 * @param request
 * @param requestBody
 * @returns
 */
export const calculateCacheKey = (
  request: IncomingMessage | Http2ServerRequest,
  requestData: Buffer
): string => {
  const pathname = new URL(
    request?.url || '',
    isHttpRequest(request)
      ? `http://${request.headers.host}`
      : `https://${request.authority}`
  ).pathname;

  const payload = {
    headers: {
      ...request.headers,
      ':path': pathname,
    },
    pathname,
  };

  const baseUrl = isHttpRequest(request)
    ? `${request.headers.host}${pathname}`
    : `${request.authority}${pathname}`;

  // If there's any request body from POST/GET/etc. include it in the key
  if (requestData.toString().length > 0) {
    return `${baseUrl}_${hash(requestData.toJSON())}`;
  } else {
    return `${baseUrl}_${hash(payload)}`;
  }
};

/**
 * Helper function to make long keys (URLs) more readable
 *
 * @param key
 */
export const trimKey = (key: string = '') =>
  key.length > 100
    ? key.slice(0, 50).concat('...', key.slice(key.length - 50, key.length))
    : key;

/**
 * Extracts an integer from a query param, or undefined
 *
 *
 * @param url
 * @param paramName
 * @returns
 */
export const parseIntQueryParam = (
  url: UrlWithParsedQuery,
  paramName: string
): number | undefined => {
  if (url.query[paramName] === undefined) {
    return undefined;
  }

  const parsed = parseInt(url.query[paramName]?.toString()!!);
  if (isNaN(parsed)) {
    return undefined;
  }
  return parsed;
};

/**
 * Takes a request and writes it to cache if not present
 * along with the original request
 *
 * @param cacheInstance
 * @param proxyBodyData
 * @param responseHeaders
 * @param statusCode
 * @param originalRequest
 * @returns
 */
export const cacheExtractedProxyResponse = async ({
  cacheInstance,
  proxyBodyData,
  responseHeaders,
  statusCode,
  originalRequest,
}: {
  cacheInstance: ProxyCache;
  proxyBodyData: Buffer;
  responseHeaders: any;
  statusCode?: number;
  originalRequest: Http2ServerRequest | IncomingMessage;
}): Promise<Buffer> =>
  new Promise((resolve) => {
    const key = originalRequest.headers[CACHE_KEY_HEADER] as string | undefined;

    if (key && !cacheInstance.contains(key)) {
      console.log(`💾 Writing data to cache - ${trimKey(key)}`);
      cacheInstance.write(key, {
        headers: {
          ...responseHeaders,
          [CACHE_KEY_HEADER]: key,
        },
        status: statusCode ? statusCode : StatusCodes.OK,
        data: proxyBodyData,
        url: originalRequest.url || '',
      });
    }

    resolve(proxyBodyData);
  });

/**
 * Takes a request and writes it to cache if not present
 * along with the original request
 *
 * @param cacheInstance
 * @param proxyBodyData
 * @param proxyResponse
 * @param originalRequest
 * @returns
 */
export const cacheEmptyResponse = (
  cacheInstance: ProxyCache,
  originalRequest: IncomingMessage | Http2ServerRequest
) => {
  const buffer = Buffer.from('');
  const key = originalRequest.headers[CACHE_KEY_HEADER] as string | undefined;

  if (key && !cacheInstance.contains(key)) {
    console.log(`💾 Caching empty data for request - ${trimKey(key)}`);
    cacheInstance.write(key, {
      headers: {
        [CACHE_KEY_HEADER]: key,
      },
      status: StatusCodes.NOT_FOUND,
      data: buffer,
      url: originalRequest.url || '',
    });
  }
};
