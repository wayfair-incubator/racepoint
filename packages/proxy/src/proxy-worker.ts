/*
  Proxy Worker
*/
import {createProxyServer} from 'http-proxy';
import {StatusCodes} from 'http-status-codes';
import {ProxyCache} from './proxy-cache';
import {extractBody, cacheExtractedProxyResponse} from './cache-helpers';
import {IncomingMessage, ServerResponse} from 'http';
import net from 'net';

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

const handleErrorResponse = ({
  error,
  originalRequest,
  responseToBrowser,
}: {
  error: Error;
  originalRequest: IncomingMessage;
  responseToBrowser: ServerResponse | net.Socket;
}) => {
  if (error) {
    console.error(error);
  } else if (responseToBrowser instanceof ServerResponse) {
    responseToBrowser.writeHead(StatusCodes.NOT_FOUND);
    responseToBrowser.end();
  } else {
    console.error(`Cannot process response to ${originalRequest?.url}`);
  }
};

export const buildProxyWorker = ({cache}: {cache: ProxyCache}) => {
  const proxy = createProxyServer({
    selfHandleResponse: true,
  });

  proxy.on('proxyRes', (proxyRes, originalRequest, responseToBrowser) => {
    const key = originalRequest.headers['ll-cache-key'];

    if (proxyRes.statusCode === 404 || proxyRes.statusCode === 403) {
      console.error(`🆘 Status code for ${key} was:`, proxyRes.statusCode);
    } else if (proxyRes.statusCode === 400 || proxyRes.statusCode === 500) {
      console.error(`🆚 Status code for ${key} was:`, proxyRes.statusCode);
    } else if (proxyRes.statusCode !== 200) {
      console.error(`🈯 Status code for ${key} was:`, proxyRes.statusCode);
    }

    handleProxyResponse({
      cacheInstance: cache,
      proxyRes,
      originalRequest,
      responseToBrowser,
    });
  });

  // proxy.on('proxyReq', function (proxyReq, req, res, options) {
  //   proxyReq.setHeader('X-Special-Proxy-Header', 'pepperoni');
  // });

  proxy.on('error', (error, originalRequest, responseToBrowser) => {
    handleErrorResponse({
      error,
      originalRequest,
      responseToBrowser,
    });
  });

  return proxy;
};
