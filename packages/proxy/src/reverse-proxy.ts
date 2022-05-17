/*
  Functions for initializing servers
*/
// @ts-nocheck
import https from 'https';
import http2, {Http2ServerRequest, Http2ServerResponse} from 'http2';
import http, {IncomingMessage, ServerResponse, ClientRequest} from 'http';
import Server from 'http-proxy';
import {ProxyCache} from './proxy-cache';
import {
  CACHE_KEY_HEADER,
  extractBody,
  calculateCacheKey,
  trimKey,
} from './cache-helpers';
import {buildProxyWorker, handleProxyResponse} from './proxy-worker';
import {generateCACertificate} from './tls';
import {http as redirectHttps, RedirectableRequest} from 'follow-redirects';
import {keys} from 'object-hash';

const {HTTP2_HEADER_PATH, HTTP2_HEADER_STATUS} = http2.constants;

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

// const createSession(request)

export const handleIncomingRequest2 = async ({
  request,
  response,
  cache,
  // proxy,
  handleUncached,
}: {
  request: Http2ServerRequest;
  response: Http2ServerResponse;
  cache: ProxyCache;
  // proxy: Server;
  handleUncached: Function;
}) => {
  console.log(`📥 New request for https://${request.authority}${request.url}`);

  const session = http2.connect(`https://${request.authority}`);

  session.on('error', (err) => console.error(err));

  session.on('stream', (pushedStream, requestHeaders) => {
    console.log('Streaming!');

    pushedStream.on('push', (responseHeaders) => {
      // Process response headers
    });
    pushedStream.on('data', (chunk) => {
      /* handle pushed data */
    });
  });

  const req = session.request({[HTTP2_HEADER_PATH]: request?.url});

  // To fetch the response body, we set the encoding
  // we want and initialize an empty data string
  // req.setEncoding('utf8')

  // since we don't have any more data to send as
  // part of the request, we can end it
  req.end();

  let data = '';
  const headersToWrite = {};
  let statusCode = 200;

  // This callback is fired once we receive a response
  // from the server
  req.on('response', (headers) => {
    // console.log("📜 Listing headers...")
    // we can log each response header here
    for (const name in headers) {
      if (!name.startsWith(':')) {
        headersToWrite[name] = headers[name];
      }
      if (name === ':status:') {
        statusCode = headers[name];
      }
    }

    // append response data to the data string every time
    // we receive new data chunks in the response
    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('push', (headers) => {
      console.log('🗿 Pushed these headers', headers);
    });

    // Once the response is finished, log the entire data
    // that we received
    req.on('end', () => {
      // console.log(`\n${data}`)
      // In this case, we don't want to make any more
      // requests, so we can close the session
      session.close();
      console.log('Data is ', data.slice(0, 200));

      response.writeHead(statusCode, headersToWrite);
      response.write(data);
      response.end();
    });

    req.on('error', (err) => console.error('Request error', err));
  });

  // const requestData = await extractBody(request);
  // const cacheKey = calculateCacheKey(request, requestData);

  // // Check if the resource is in the cache
  // if (cache.contains(cacheKey)) {
  //   console.log(`🔑 Key found - ${trimKey(cacheKey)}`);
  //   const cachedResponse = cache.read(cacheKey)!!;

  //   response.writeHead(cachedResponse.status, cachedResponse.headers);
  //   response.write(cachedResponse.data);
  //   response.end();
  // } else {
  //   console.log(
  //     `✅ Key created - ${trimKey(cacheKey)}`,
  //     requestData.toString().length > 0
  //       ? `\nWith data - ${requestData.toString()}`
  //       : ''
  //   );
  //   // If we don't have it, we need to get it and cache it
  //   const url = request.url || '';

  //   // @TODO why do some request URLs include the hostname, but not others?
  //   const destinationUrl = url.startsWith('http')
  //     ? url
  //     : `https://${request.headers.host}${url}`;

  //   // Add this key for correlation
  //   request.headers[CACHE_KEY_HEADER] = cacheKey;

  //   // Handle the response if it's not cached
  //   await handleUncached({ request, response, proxy, target: destinationUrl });
  // }
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
    console.log('Request received http!');
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
    console.log('Request received 1');
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

/*
  Build a HTTPS reverse proxy server instance
*/
export const buildHttp2ReverseProxy = async (cache: ProxyCache) => {
  // const proxy = buildProxyWorker({ cache });
  const {key, cert} = await generateCACertificate();

  const server = http2.createSecureServer({
    key,
    cert,
    allowHTTP1: true,
    rejectUnauthorized: false,
  });

  server.on('request', async (request, response) => {
    await handleIncomingRequest2({
      cache,
      // proxy,
      request,
      response,
      handleUncached: proxyTrueDestination,
    });
  });

  server.on('steam', (stream) => {
    console.log('Im streaming!', stream);
  });

  server.on('error', (err) => {
    console.log('Error!', err);
  });

  return server;
};
