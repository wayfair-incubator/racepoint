/*
  Functions for initializing servers
*/
import http2, {Http2ServerRequest, Http2ServerResponse} from 'http2';
import http, {IncomingMessage, ServerResponse} from 'http';
import {StatusCodes} from 'http-status-codes';
import {ProxyCache} from './proxy-cache';
import {
  CACHE_KEY_HEADER,
  RP_CACHE_POLICY_HEADER,
  extractBody,
  calculateCacheKey,
  trimKey,
  cacheEmptyResponse,
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
  // Remove the cache policy header as this could change between requests
  // Thereby creating a new cache key
  const cachePolicyAction = request.headers[RP_CACHE_POLICY_HEADER];

  console.log('cachePolicyAction', cachePolicyAction);

  delete request.headers[RP_CACHE_POLICY_HEADER];

  console.log('cachePolicyAction', cachePolicyAction);

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
    await handleUncached({request, response, cachePolicyAction});
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

  let enableNewRequestCache = true;

  const setCachePolicy = (status: boolean) => {
    if (status !== enableNewRequestCache) {
      console.log(`🔁 ${status ? 'Enabling' : 'Disabling'} outbound requests`);
      enableNewRequestCache = status;
    }
  };

  const handleUncached = ({
    request,
    response,
    cachePolicyAction,
  }: {
    request: Http2ServerRequest;
    response: Http2ServerResponse;
    cachePolicyAction: string;
  }) => {
    if (enableNewRequestCache) {
      http2Proxy({request, response, cache});
    } else {
      cacheEmptyResponse(cache, request);
      response.writeHead(StatusCodes.OK);
      response.end();
    }
    // If this has the request header to disable it, do so after the initial proxy/cacheing
    if (cachePolicyAction === 'disable') {
      setCachePolicy(false);
    } else if (cachePolicyAction === 'enable') {
      setCachePolicy(true);
    }
  };

  server.on('request', (request, response) => {
    handleIncomingRequest({
      cache,
      request,
      response,
      handleUncached,
    });
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
  });

  return server;
};
