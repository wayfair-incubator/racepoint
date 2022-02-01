import {IncomingMessage} from 'http';
import md5 from 'md5';
import {ProxyCache} from './proxy-cache';
import {StatusCodes} from 'http-status-codes';
import hash from 'object-hash';

export const CACHE_KEY_HEADER = 'll-cache-key';

/**
 * Extract the body from a request or response
 *
 * @param httpMessage
 */
export const extractBody = (httpMessage: IncomingMessage): Promise<Buffer> =>
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
  let key = '';

  const payload = {
    headers: request.headers,
    url: request.url,
  };

  // for now we only differentiate between graphql and non graphql requests, but we can improve
  if (request.url?.startsWith('/graphql')) {
    key = `/graphql?hash=${md5(requestBody.toString())}`;
  } else {
    key = `${request?.headers['host']}${request?.url}_${hash(payload)}`;
  }
  return key;
};

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

    if (key && !cacheInstance.contains(key)) {
      console.log('Writing to cache...');

      cacheInstance.write(key, {
        headers: proxyResponse.headers,
        status: proxyResponse.statusCode
          ? proxyResponse.statusCode
          : StatusCodes.OK,
        data: proxyBodyData,
      });
    }

    resolve(proxyBodyData);
  });
