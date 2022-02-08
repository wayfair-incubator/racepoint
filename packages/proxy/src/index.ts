import {ProxyCache} from './proxy-cache';
import {buildHttpReverseProxy, buildHttpsReverseProxy} from './reverse-proxy';

const HTTP_DEFAULT_PORT = 80;
const HTTPS_DEFAULT_PORT = 443;

const runProxy = async () => {
  // Inject for testability
  const cache = new ProxyCache();

  const HttpProxyServer = await buildHttpReverseProxy(cache);

  HttpProxyServer.listen(HTTP_DEFAULT_PORT);
  console.log(`Starting HTTP server on port: ${HTTP_DEFAULT_PORT}`);

  const HttpsProxyServer = await buildHttpsReverseProxy(cache);
  console.log(`Starting HTTPS server on port: ${HTTPS_DEFAULT_PORT}`);

  HttpsProxyServer.listen(HTTPS_DEFAULT_PORT);
};

runProxy();