/*
  Proxy Worker
*/
import http2, {
  ClientHttp2Stream,
  Http2ServerRequest,
  Http2ServerResponse,
} from 'http2';
import {IncomingMessage, ServerResponse} from 'http';
import {StatusCodes} from 'http-status-codes';
import net from 'net';
import {createProxyServer} from 'http-proxy';
import {ProxyCache} from './proxy-cache';
import {
  extractBody,
  cacheExtractedProxyResponse,
  cacheEmptyResponse,
  trimKey,
} from './cache-helpers';

const {HTTP2_HEADER_PATH, HTTP2_HEADER_STATUS} = http2.constants;

export const handleProxyResponse = async ({
  cacheInstance,
  proxyRes,
  responseHeaders,
  statusCode,
  originalRequest,
  responseToBrowser,
}: {
  cacheInstance: ProxyCache;
  proxyRes: IncomingMessage | ClientHttp2Stream;
  responseHeaders: any;
  statusCode?: number;
  originalRequest: IncomingMessage | Http2ServerRequest;
  responseToBrowser: ServerResponse | Http2ServerResponse;
}) => {
  console.log(`📥 Response received for ${trimKey(originalRequest?.url)}`);

  await extractBody(proxyRes)
    .then((bodyBuffer) =>
      cacheExtractedProxyResponse({
        cacheInstance,
        proxyBodyData: bodyBuffer,
        responseHeaders: responseHeaders,
        statusCode: statusCode,
        originalRequest,
      })
    )
    .then((bodyBuffer) => {
      responseToBrowser.writeHead(StatusCodes.OK, responseHeaders);
      /*
        The Buffer class is a subclass of JavaScript's Uint8Array class and extends it with methods that cover additional use cases. 
        Node.js APIs accept plain Uint8Arrays wherever Buffers are supported as well.
      */ // @ts-ignore
      responseToBrowser.write(bodyBuffer);
      responseToBrowser.end();
    })
    .catch((err) => console.error(err));
};

const handleErrorResponse = async ({
  cacheInstance,
  originalRequest,
  responseToBrowser,
}: {
  cacheInstance: ProxyCache;
  originalRequest: IncomingMessage;
  responseToBrowser: ServerResponse | net.Socket;
}) => {
  cacheEmptyResponse(cacheInstance, originalRequest);
  if (responseToBrowser instanceof ServerResponse) {
    responseToBrowser.writeHead(StatusCodes.NOT_FOUND);
    responseToBrowser.end();
  }
};

export const buildProxyWorker = ({cache}: {cache: ProxyCache}) => {
  const proxy = createProxyServer({
    selfHandleResponse: true,
    autoRewrite: true,
    changeOrigin: true,
    followRedirects: true,
    ignorePath: true,
  });

  proxy.on('proxyRes', (proxyRes, originalRequest, responseToBrowser) => {
    handleProxyResponse({
      cacheInstance: cache,
      proxyRes,
      responseHeaders: proxyRes.headers,
      statusCode: proxyRes.statusCode,
      originalRequest,
      responseToBrowser,
    });
  });

  proxy.on('econnreset', (error, originalRequest, responseToBrowser) => {
    console.log(
      `🏓 Ecconreset requesting ${trimKey(originalRequest?.url)} - ${
        error.message
      }`
    );
    handleErrorResponse({
      cacheInstance: cache,
      originalRequest,
      responseToBrowser,
    });
  });

  proxy.on('error', (error, originalRequest, responseToBrowser) => {
    console.log(
      `⛑ Error found requesting ${trimKey(originalRequest?.url)} - ${
        error.message
      }`
    );
    handleErrorResponse({
      cacheInstance: cache,
      originalRequest,
      responseToBrowser,
    });
  });

  return proxy;
};

export const http2Proxy = ({
  request,
  response,
  cache,
}: {
  request: Http2ServerRequest;
  response: Http2ServerResponse;
  cache: ProxyCache;
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

  req.on('response', async (headers) => {
    const headersToWrite: any = {};

    for (const name in headers) {
      // Remove psuedo-headers
      if (!name.startsWith(':')) {
        headersToWrite[name] = headers[name];
      }
    }
    // @ts-ignore Typescript doesn't think statusCode is always number
    const statusCode: number = headers[HTTP2_HEADER_STATUS]
      ? headers[HTTP2_HEADER_STATUS]
      : 0;

    await handleProxyResponse({
      cacheInstance: cache,
      responseHeaders: headersToWrite,
      proxyRes: req,
      statusCode,
      originalRequest: request,
      responseToBrowser: response,
    }).finally(() => {
      client.close();
    });
  });

  req.on('error', (err) => console.error('Request error', err));
};
