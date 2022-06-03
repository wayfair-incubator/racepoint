/*
  The 'Main' entry point for wiring up the underlying proxies, configures both an HTTP and HTTP/2 
  server, to be used by the main index.ts file.
*/
import http2, {Http2ServerRequest, Http2ServerResponse} from 'http2';
import http, {IncomingMessage, ServerResponse} from 'http';
import {StatusCodes} from 'http-status-codes';
import url from 'url';
import {ProxyCache} from './proxy-cache';
import {
  CACHE_KEY_HEADER,
  extractBodyBuffer,
  extractBodyFromRequest,
  calculateCacheKey,
  trimKey,
  cacheEmptyResponse,
  parseIntQueryParam,
} from './cache-helpers';
import {buildProxyWorker, http2Proxy} from './proxy-worker';
import {generateCACertificate} from './tls';
import {RequestLock} from './request-lock';
import {getProxyMetrics} from './proxy-metrics';
import {getProxyEventObservable, CommonEvents} from './proxy-observable';

const raceProxyServer = process.env?.RACEPROXY_SERVER || 'localhost';
export const CACHE_CONTROL_ENDPOINT = '/rp-cache-control';
// a hopefully unique url to signal to the proxy that this particular incoming request
// should be treated differently
const CACHE_INFO_URL = '/rp-cache-info';

/*
  Handler for proxying an external request or fetching it from cache
*/
const handleProxyRequest = async ({
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
  const requestData = await extractBodyBuffer(request);
  const cacheKey = calculateCacheKey(request, requestData);

  getProxyEventObservable().emit(CommonEvents.requestReceived);
  // Check if the resource is in the cache
  const cachedResponse = cache.read(cacheKey);
  // in order to register a cache miss, we should attempt to actually grab it
  if (cachedResponse) {
    console.log(`🔑 Key found - ${trimKey(cacheKey)}`);
    const cachedResponse = cache.read(cacheKey)!!;

    if (cachedResponse.url !== request.url) {
      console.warn(
        `Warning: URL for key does not match cache. Consider adding it to the blocked URL patterns.\nOriginal Request: ${cachedResponse.url}\nIncoming Request: ${request.url}`
      );
    }

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
  Handler to respond with cache metrics
*/
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

/*
  Handler for controlling the outgoing request lock
*/
const handleLockControlRequest = async ({
  request,
  response,
  lock,
}: {
  request: IncomingMessage | Http2ServerRequest;
  response: ServerResponse | Http2ServerResponse;
  lock: RequestLock;
}) => {
  const requestData: any = await extractBodyFromRequest(request);
  const hasValidProperty = 'enableOutboundRequests' in requestData;
  if (hasValidProperty) {
    lock.setStatus(requestData.enableOutboundRequests);
  }
  response.writeHead(hasValidProperty ? StatusCodes.OK : StatusCodes.ACCEPTED);
  response.end();
};

/*
  Handles the incoming request and decides if it's to a server endpoint or external request  
*/
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
  if (
    request.url === CACHE_CONTROL_ENDPOINT &&
    request.headers.host === raceProxyServer
  ) {
    return handleLockControlRequest({
      request,
      response,
      lock,
    });
  } else if (request.url?.startsWith(CACHE_INFO_URL)) {
    return respondWithMetrics(request, response, cache);
  } else {
    return handleProxyRequest({
      request,
      response,
      cache,
      handleUncached,
    });
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
