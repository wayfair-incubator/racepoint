/*
  Proxy Worker
*/
import {createProxyServer} from 'http-proxy';
import {StatusCodes} from 'http-status-codes';
import {ProxyCache} from './proxy-cache';
import {extractBody, cacheExtractedProxyResponse} from './cache-helpers';
import {IncomingMessage, ServerResponse} from 'http';

const handleProxyResponse = ({
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
  extractBody(proxyRes)
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

export const buildProxyWorker = ({cache}: {cache: ProxyCache}) => {
  const proxy = createProxyServer({
    selfHandleResponse: true,
  });

  proxy.on('proxyRes', (proxyRes, originalRequest, responseToBrowser) => {
    handleProxyResponse({
      cacheInstance: cache,
      proxyRes,
      originalRequest,
      responseToBrowser,
    });
  });

  proxy.on('error', (err) => {
    console.log('Error from the proxy!', err);
  });

  return proxy;
};
