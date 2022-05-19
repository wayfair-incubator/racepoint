/*
  Functions for initializing servers
*/

import http2, {Http2ServerRequest, Http2ServerResponse} from 'http2';
import http, {IncomingMessage, ServerResponse} from 'http';
import {ProxyCache} from './proxy-cache';
import {
  CACHE_KEY_HEADER,
  extractBody,
  calculateCacheKey,
  trimKey,
} from './cache-helpers';
import {buildProxyWorker, http2Proxy} from './proxy-worker';
import {generateCACertificate} from './tls';

export const handleIncomingRequest = async ({
  request,
  response,
  cache,
  handleUncached,
}: {
  request: IncomingMessage | Http2ServerRequest;
  response: ServerResponse | Http2ServerResponse;
  cache: ProxyCache;
  handleUncached: Function;
}) => {
  const requestData = await extractBody(request);
  const cacheKey = calculateCacheKey(request, requestData);

  // Check if the resource is in the cache
  if (cache.contains(cacheKey)) {
    console.log(`🔑 Key found - ${trimKey(cacheKey)}`);
    const cachedResponse = cache.read(cacheKey)!!;

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
export const buildHttpReverseProxy = (cache: ProxyCache) => {
  const proxy = buildProxyWorker({cache});

  const requestListener = function (request: any, response: any) {
    // Should this ever be http?
    const target = `https://${request.headers.host}${request.url}`;

    handleIncomingRequest({
      cache,
      request,
      response,
      handleUncached: (
        {
          request,
          response,
        }: {
          request: IncomingMessage;
          response: ServerResponse;
        } // Have the proxy get that URL
      ) =>
        proxy.web(request, response, {
          target,
        }),
    });
  };

  const server = http.createServer(requestListener);

  return server;
};

/*
  Build a HTTP2 reverse proxy server instance
*/
export const buildHttp2ReverseProxy = async (cache: ProxyCache) => {
  const {key, cert} = await generateCACertificate();

  const server = http2.createSecureServer({
    key,
    cert,
    allowHTTP1: true,
    rejectUnauthorized: false,
    // enableTrace: true
  });

  server.on('request', (request, response) => {
    handleIncomingRequest({
      cache,
      request,
      response,
      handleUncached: ({
        request,
        response,
      }: {
        request: Http2ServerRequest;
        response: Http2ServerResponse;
      }) => http2Proxy({request, response, cache}),
    });
  });

  server.on('error', (err) => {
    console.log('🍅 Error!', err);
  });

  server.on('timeout', (err: any) => {
    console.log('🍅 Timeout!', err);
  });

  server.on('sessionError', (err) => {
    console.log('🍅 Error in session!', err);
  });

  server.on('unknownProtocol', (err) => {
    console.log('🍅 Unknown protocol!', err);
  });

  return server;
};
