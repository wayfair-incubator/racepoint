/*
  Functions for initializing servers
*/

import https from 'https';
import http2, {Http2ServerRequest, Http2ServerResponse} from 'http2';
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
import {http as redirectHttps, RedirectableRequest} from 'follow-redirects';

const {HTTP2_HEADER_PATH, HTTP2_HEADER_STATUS} = http2.constants;

type RequestType = IncomingMessage | Http2ServerRequest;
type ResponseType = ServerResponse | Http2ServerResponse;

const isHttpRequest = (obj: RequestType): obj is IncomingMessage => {
  return (obj as IncomingMessage).httpVersion.startsWith('1');
};

const isHttpResponse = (obj: ResponseType): obj is ServerResponse => {
  return (obj as ServerResponse).hasOwnProperty('shouldKeepAlive');
};

export const handleIncomingRequest = async ({
  request,
  response,
  cache,
  handleUncached,
}: {
  request: RequestType;
  response: ResponseType;
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

const http2Proxy = ({
  request,
  response,
}: {
  request: Http2ServerRequest;
  response: Http2ServerResponse;
}) => {
  const client = http2.connect(`${request.scheme}://${request.authority}`);

  client.on('error', (err) => console.error('Client error', err));

  const req = client.request({
    [HTTP2_HEADER_PATH]: request?.url || '',
    ':method': request.headers[':method'],
    ':authority': request.headers[':authority'],
    ':scheme': 'https',
    ':path': request.url,
    ...request.headers,
  });
  // since we don't have any more data to send as
  // part of the request, we can end it
  req.end();

  req.on('response', (headers) => {
    console.log(`📥 Response received for ${trimKey(request.url)}`);

    const headersToWrite: any = {};

    for (const name in headers) {
      // Remove psuedo-headers
      if (!name.startsWith(':')) {
        headersToWrite[name] = headers[name];
      }
    }

    const bodyData: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      bodyData.push(chunk);
    });

    req.on('end', () => {
      // @ts-ignore Typescript doesn't think statusCode is always number
      const statusCode: number = headers[HTTP2_HEADER_STATUS]
        ? headers[HTTP2_HEADER_STATUS]
        : 0;
      // In this case, we don't want to make any more
      // requests, so we can close the session
      client.close();
      response.writeHead(statusCode, headersToWrite);
      response.write(Buffer.concat(bodyData));
      response.end();
    });
  });

  req.on('error', (err) => console.error('Request error', err));
};

/*
  Proxy a URL target

  Isolated for testing purposes
*/
const proxyTrueDestination = ({
  request,
  response,
  proxy,
}: {
  request: IncomingMessage;
  response: ServerResponse;
  proxy: Server;
}) => {
  // Should this ever be http?
  const target = `https://${request.headers.host}${request.url}`;

  console.log(`🌐 Proxying for URL - ${trimKey(target)}`);
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
      request,
      response,
      handleUncached: ({
        request,
        response,
      }: {
        request: IncomingMessage;
        response: ServerResponse;
      }) => proxyTrueDestination({request, response, proxy}),
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
      request,
      response,
      handleUncached: ({
        request,
        response,
      }: {
        request: IncomingMessage;
        response: ServerResponse;
      }) => proxyTrueDestination({request, response, proxy}),
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
  const {key, cert} = await generateCACertificate();

  const server = http2.createSecureServer({
    key,
    cert,
    allowHTTP1: true,
    rejectUnauthorized: false,
    // enableTrace: true
  });

  server.on('request', async (request, response) => {
    await handleIncomingRequest({
      cache,
      request,
      response,
      handleUncached: http2Proxy,
    });
  });

  server.on('steam', (stream) => {
    console.log('🍅 Im streaming!', stream);
  });

  server.on('error', (err) => {
    console.log('🍅 Error!', err);
  });

  server.on('session', (a) => {
    console.log('🌵 New session!');
  });

  server.on('timeout', (a: any) => {
    console.log('🍅 Timeout!', a);
  });

  server.on('sessionError', (a) => {
    console.log('🍅 Error in session!', a);
  });

  server.on('unknownProtocol', (a) => {
    console.log('🍅 Unknown protocol!', a);
  });

  return server;
};
