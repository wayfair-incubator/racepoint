/*
  Functions for initializing servers
*/
import https from 'https';
import http from 'http';
import Server from 'http-proxy';
import stream from 'stream';
import {StatusCodes} from 'http-status-codes';
import {generateCACertificate, generateSPKIFingerprint} from './tls';
import {ProxyCache} from './proxy-cache';
import {
  CACHE_KEY_HEADER,
  extractBody,
  calculateCacheKey,
} from './cache-helpers';
import {buildProxyWorker} from './proxy-worker';
import {IncomingMessage, ServerResponse} from 'http';

const handleIncomingRequest = async ({
  cache,
  proxy,
  request,
  response,
}: {
  cache: ProxyCache;
  proxy: Server;
  request: IncomingMessage;
  response: ServerResponse;
}) => {
  console.log('📫 Incoming request!');

  const requestData = await extractBody(request);
  const cacheKey = calculateCacheKey(request, requestData);

  // Check if the resource is in the cache
  if (cache.contains(cacheKey)) {
    console.log(`🔑 Key found - ${cacheKey.slice(0, 150)}`);
    const cachedResponse = cache.read(cacheKey)!!;

    response.writeHead(cachedResponse.status, cachedResponse.headers);
    response.write(cachedResponse.data);
    response.end();
  } else {
    console.log(`🆕 Key created - ${cacheKey.slice(0, 150)}`);

    // If we don't have it, we need to get it and cache it
    const url = request.url || '';

    // @TODO why do some request URLs include the hostname, but not others?
    const destinationUrl = url.startsWith('http')
      ? url
      : `https://${request.headers.host}${url}`;

    const proxyBufferStream = new stream.PassThrough();

    proxyBufferStream.write(requestData);

    // Add this key for correlation
    request.headers[CACHE_KEY_HEADER] = cacheKey;

    // Have the proxy get that URL
    proxy.web(request, response, {
      target: destinationUrl,
      autoRewrite: true,
      changeOrigin: true,
      followRedirects: true,
      ignorePath: true,
      // Not sure if this is needed yet...
      // buffer: proxyBufferStream,
    });
  }
};

/*
  Build a HTTP reverse proxy server instance
*/
export const buildHttpReverseProxy = async (cache: ProxyCache) => {
  const proxy = buildProxyWorker({cache});

  const requestListener = async function (request: any, response: any) {
    handleIncomingRequest({cache, proxy, request, response});
  };

  const server = await http.createServer(requestListener);

  return server;
};

/*
  Build a HTTPS reverse proxy server instance
*/
export const buildHttpsReverseProxy = async (cache: ProxyCache) => {
  const proxy = buildProxyWorker({cache});
  const {key, cert} = await generateCACertificate();
  const spkiFingerprint = generateSPKIFingerprint(cert);
  const options = {
    key,
    cert,
    rejectUnauthorized: false,
  };
  const server = await https.createServer(options);

  server.on('request', async (request, response) => {
    // On warm-up, the racer will need to get the fingerprint
    if (
      request.headers?.host?.includes('raceproxy') &&
      request.url === '/fingerprint'
    ) {
      response.writeHead(StatusCodes.OK, {
        'Content-Type': 'application/json',
      });
      response.write(JSON.stringify({spkiFingerprint}));
      response.end();
    }

    // Otherwise treat it as a normal request
    else {
      handleIncomingRequest({cache, proxy, request, response});
    }
  });

  server.on('error', (err) => {
    console.log('Error!', err);
  });

  return server;
};
