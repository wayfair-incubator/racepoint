/*
  Functions for initializing servers
*/
import http2, {Http2ServerRequest, Http2ServerResponse} from 'http2';
import http, {IncomingMessage, ServerResponse} from 'http';
import {StatusCodes} from 'http-status-codes';
import {ProxyCache} from './proxy-cache';
import {
  CACHE_KEY_HEADER,
  extractBodyBuffer,
  extractBodyFromRequest,
  calculateCacheKey,
  trimKey,
  cacheEmptyResponse,
} from './cache-helpers';
import {buildProxyWorker, http2Proxy} from './proxy-worker';
import {generateCACertificate} from './tls';
import {RequestLock} from './lock';

const raceProxyServer = process.env?.RACEPROXY_SERVER || 'localhost';
const CACHE_CONTROL_ENDPOINT = '/rp-cache-control';

export const handleIncomingRequest = async ({
  request,
  response,
  cache,
  handleUncached,
  lock,
}: {
  request: IncomingMessage | Http2ServerRequest;
  response: ServerResponse | Http2ServerResponse;
  cache: ProxyCache;
  handleUncached: Function;
  lock: RequestLock;
}) => {
  const extractBodyFromRequest = (
    request: IncomingMessage | Http2ServerRequest,
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

  if (
    request.url === CACHE_CONTROL_ENDPOINT &&
    request.headers.host === raceProxyServer
  ) {
    console.log('📍 Ping ping ping!');
    const requestData = await extractBodyFromRequest(request);
    // Add verify
    console.log(requestData);
    lock.setStatus(false);
    response.writeHead(StatusCodes.OK);
    response.end();
    return;
  }

  const requestData = await extractBodyBuffer(request);
  const cacheKey = calculateCacheKey(request, requestData);

  // Check if the resource is in the cache
  if (cache.contains(cacheKey)) {
    console.log(`🔑 Key found - ${trimKey(cacheKey)}`);

    const cachedResponse = cache.read(cacheKey)!!;

    if (cachedResponse.url !== request.url) {
      console.log(
        `Key paths do not match! ${cacheKey}`,
        cachedResponse.url,
        request.url
      );
    }

    response.writeHead(cachedResponse.status, cachedResponse.headers);
    // @ts-ignore
    response.write(cachedResponse.data);
    response.end();
  } else {
    console.log(
      `✅ Key created - ${trimKey(cacheKey)}`,
      requestData.toString().length > 0
        ? `\nWith data - ${requestData.toString()}`
        : ''
    );
    // Add this key for correlation
    request.headers[CACHE_KEY_HEADER] = cacheKey;

    // Handle the response if it's not cached
    await handleUncached({request, response});
  }
};

/*
  Build a HTTP reverse proxy server instance
*/
export const buildHttpReverseProxy = (cache: ProxyCache, lock: RequestLock) => {
  const proxy = buildProxyWorker({cache});

  const handleUncached = (
    {
      request,
      response,
    }: {
      request: IncomingMessage;
      response: ServerResponse;
    } // Have the proxy get that URL
  ) => {
    // Should this ever be http?
    const target = `https://${request.headers.host}${request.url}`;

    if (lock.getStatus()) {
      proxy.web(request, response, {
        target,
      });
    } else {
      cacheEmptyResponse(cache, request);
      response.writeHead(StatusCodes.NO_CONTENT);
      response.end();
    }
  };

  const requestListener = function (request: any, response: any) {
    handleIncomingRequest({
      cache,
      request,
      response,
      handleUncached,
      lock,
    });
  };

  const server = http.createServer(requestListener);

  return server;
};

/*
  Build a HTTP2 reverse proxy server instance
*/
export const buildHttp2ReverseProxy = async (
  cache: ProxyCache,
  lock: RequestLock
) => {
  const {key, cert} = await generateCACertificate();

  const server = http2.createSecureServer({
    key,
    cert,
    allowHTTP1: true,
    rejectUnauthorized: false,
  });

  const handleUncached = ({
    request,
    response,
  }: {
    request: Http2ServerRequest;
    response: Http2ServerResponse;
  }) => {
    if (lock.getStatus()) {
      http2Proxy({request, response, cache});
    } else {
      cacheEmptyResponse(cache, request);
      response.writeHead(StatusCodes.NO_CONTENT);
      response.end();
    }
  };

  server.on('request', (request, response) => {
    handleIncomingRequest({
      cache,
      request,
      response,
      handleUncached,
      lock,
    });
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  return server;
};
