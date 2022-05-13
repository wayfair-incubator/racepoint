/*
  Functions for initializing servers
*/
import https from 'https';
import http, {IncomingMessage, ServerResponse} from 'http';
import Server from 'http-proxy';
import {ProxyCache} from './proxy-cache';
import {
  CACHE_KEY_HEADER,
  extractBody,
  calculateCacheKey,
  trimKey,
} from './cache-helpers';
import {buildProxyWorker} from './proxy-worker';
import {generateCACertificate} from './tls';

export const handleIncomingRequest = async ({
  request,
  response,
  cache,
  proxy,
  handleUncached,
}: {
  request: IncomingMessage;
  response: ServerResponse;
  cache: ProxyCache;
  proxy: Server;
  handleUncached: Function;
}) => {
  const requestData = await extractBody(request);
  const cacheKey = calculateCacheKey(request, requestData);

  // Check if the resource is in the cache
  if (cache.contains(cacheKey)) {
    console.log(`🔑 Key found - ${trimKey(cacheKey)}`);
    const cachedResponse = cache.read(cacheKey)!!;

    response.writeHead(cachedResponse.status, cachedResponse.headers);
    response.write(cachedResponse.data);
    response.end();
  } else {
    console.log(
      `✅ Key created - ${trimKey(cacheKey)}`,
      requestData.toString().length > 0
        ? `\nWith data - ${requestData.toString()}`
        : ''
    );
    // If we don't have it, we need to get it and cache it
    const url = request.url || '';

    // @TODO why do some request URLs include the hostname, but not others?
    const destinationUrl = url.startsWith('http')
      ? url
      : `https://${request.headers.host}${url}`;

    // Add this key for correlation
    request.headers[CACHE_KEY_HEADER] = cacheKey;

    // Handle the response if it's not cached
    await handleUncached({request, response, proxy, target: destinationUrl});
  }
};

/*
  Proxy a URL target

  Isolated for testing purposes
*/
const proxyTrueDestination = ({
  request,
  response,
  proxy,
  target,
}: {
  request: IncomingMessage;
  response: ServerResponse;
  proxy: Server;
  target: string;
}) => {
  console.log(`🌐 Proxying for URL - ${trimKey(request?.url || '')}`);
  // Have the proxy get that URL
  proxy.web(request, response, {
    target,
  });
};

/*
  Build a HTTP reverse proxy server instance
*/
export const buildHttpReverseProxy = async (cache: ProxyCache) => {
  const proxy = buildProxyWorker({cache});

  const requestListener = async function (request: any, response: any) {
    handleIncomingRequest({
      cache,
      proxy,
      request,
      response,
      handleUncached: proxyTrueDestination,
    });
  };

  const server = http.createServer(requestListener);

  return server;
};

/*
  Build a HTTPS reverse proxy server instance
*/
export const buildHttpsReverseProxy = async (cache: ProxyCache) => {
  const proxy = buildProxyWorker({cache});
  const {key, cert} = await generateCACertificate();

  const server = https.createServer({
    key,
    cert,
    rejectUnauthorized: false,
  });

  server.on('request', async (request, response) => {
    await handleIncomingRequest({
      cache,
      proxy,
      request,
      response,
      handleUncached: proxyTrueDestination,
    });
  });

  server.on('error', (err) => {
    console.log('Error!', err);
  });

  return server;
};
