/*
  Proxy Worker
*/
import {createProxyServer} from 'http-proxy';
import {StatusCodes} from 'http-status-codes';
import {ProxyCache} from './proxy-cache';
import {
  extractBody,
  cacheExtractedProxyResponse,
  cacheEmptyResponse,
  trimKey,
} from './cache-helpers';
import {IncomingMessage, ServerResponse} from 'http';
import net from 'net';

export const handleProxyResponse = async ({
  cacheInstance,
  proxyRes,
  originalRequest,
  responseToBrowser,
}: {
  cacheInstance: ProxyCache;
  proxyRes: IncomingMessage;
  originalRequest: IncomingMessage;
  responseToBrowser: ServerResponse;
}) => {
  await extractBody(proxyRes)
    .then((bodyBuffer) =>
      cacheExtractedProxyResponse(
        cacheInstance,
        bodyBuffer,
        proxyRes,
        originalRequest
      )
    )
    .then((bodyBuffer) => {
      responseToBrowser.writeHead(StatusCodes.OK, proxyRes.headers);
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
    console.log(`📥 Response received for ${trimKey(originalRequest?.url)}`);
    handleProxyResponse({
      cacheInstance: cache,
      proxyRes,
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
