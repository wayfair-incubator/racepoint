import {IncomingMessage} from 'http';
import {Http2ServerRequest} from 'http2';
import {ProxyCache} from './proxy-cache';
import {StatusCodes} from 'http-status-codes';
import hash from 'object-hash';

export const CACHE_KEY_HEADER = 'll-cache-key';

/**
 * Extract the body from a request or response
 *
 * @param httpMessage
 */
export const extractBody = async (
  httpMessage: IncomingMessage | Http2ServerRequest
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
 * Determines the cache key to use based on the request and its body.
 *
 * @param request
 * @param requestBody
 * @returns
 */
export const calculateCacheKey = (
  request: IncomingMessage,
  requestBody: Buffer
): string => {
  const payload = {
    headers: request.headers,
    url: request.url,
  };

  // If there's any request body from POST/GET/etc. include it in the key
  if (requestBody.toString().length > 0) {
    return `${request?.headers['host']}${request?.url}_${hash(
      requestBody.toJSON()
    )}`;
  } else {
    return `${request?.headers['host']}${request?.url}_${hash(payload)}`;
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
 * Takes a request and writes it to cache if not present
 * along with the original request
 *
 * @param cacheInstance
 * @param proxyBodyData
 * @param proxyResponse
 * @param originalRequest
 * @returns
 */
export const cacheExtractedProxyResponse = async (
  cacheInstance: ProxyCache,
  proxyBodyData: Buffer,
  proxyResponse: IncomingMessage,
  originalRequest: IncomingMessage
): Promise<Buffer> =>
  new Promise((resolve) => {
    const key = originalRequest.headers[CACHE_KEY_HEADER] as string | undefined;

    // if (key && !cacheInstance.contains(key)) {
    //   console.log(`💾 Writing data to cache - ${trimKey(key)}`);
    //   cacheInstance.write(key, {
    //     headers: {
    //       ...proxyResponse.headers,
    //       [CACHE_KEY_HEADER]: key,
    //     },
    //     status: proxyResponse.statusCode
    //       ? proxyResponse.statusCode
    //       : StatusCodes.OK,
    //     data: proxyBodyData,
    //   });
    // }
    console.log(
      '💽 Data to cache is:',
      proxyBodyData.slice(0, 50),
      proxyBodyData.slice(proxyBodyData.length - 50, proxyBodyData.length)
    );
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
  originalRequest: IncomingMessage
) => {
  const buffer = Buffer.from('');
  const key = originalRequest.headers[CACHE_KEY_HEADER] as string | undefined;

  if (key && !cacheInstance.contains(key)) {
    console.log(`💾 Caching empty data for failed request - ${trimKey(key)}`);
    cacheInstance.write(key, {
      headers: {
        [CACHE_KEY_HEADER]: key,
      },
      status: StatusCodes.NOT_FOUND,
      data: buffer,
    });
  }
};
