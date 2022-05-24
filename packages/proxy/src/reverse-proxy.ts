/*
  The 'Main' entry point for wiring up the underlying proxies, configures both an HTTP and HTTP/2 
  server, to be used by the main index.ts file.
*/
import http2, {Http2ServerRequest, Http2ServerResponse} from 'http2';
import http, {IncomingMessage, ServerResponse} from 'http';
import url from 'url';
import {ProxyCache} from './proxy-cache';
import {
  CACHE_KEY_HEADER,
  extractBody,
  calculateCacheKey,
  trimKey,
  parseIntQueryParam,
} from './cache-helpers';
import {buildProxyWorker, http2Proxy} from './proxy-worker';
import {generateCACertificate} from './tls';
import {getProxyMetrics} from './proxy-metrics';
import {getProxyEventObservable, CommonEvents} from './proxy-observable';

// a hopefully unique url to signal to the proxy that this particular incoming request
// should be treated differently
const CACHE_INFO_URL = '/rp-cache-info';

const respondWithMetrics = (
  request: IncomingMessage | Http2ServerRequest,
  response: ServerResponse | Http2ServerResponse,
  cache: ProxyCache
) => {
  // support a query param to expand the top 'n' urls that have been missed
  const topN = parseIntQueryParam(url.parse(request.url!!, true), 'n');
  response.writeHead(200);
  // the stats of the cache itself were note sufficient
  response.end(JSON.stringify(getProxyMetrics().report(cache, topN)));
};

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
  if (request.url?.startsWith(CACHE_INFO_URL)) {
    return respondWithMetrics(request, response, cache);
  }
  const requestData = await extractBody(request);
  const cacheKey = calculateCacheKey(request, requestData);

  getProxyEventObservable().emit(CommonEvents.requestReceived);
  // Check if the resource is in the cache
  const cachedResponse = cache.read(cacheKey);
  // in order to register a cache miss, we should attempt to actually grab it
  if (cachedResponse) {
    console.log(`🔑 Key found - ${trimKey(cacheKey)}`);
    response.writeHead(cachedResponse.status, cachedResponse.headers);
    // @ts-ignore
    response.write(cachedResponse.data);
    response.end();
  } else {
    getProxyEventObservable().emit(CommonEvents.requestUrlNotInCache, request);
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
    console.error('Server error:', err);
  });

  return server;
};
