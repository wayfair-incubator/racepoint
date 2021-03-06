import {ProxyCache} from './proxy-cache';
import {buildHttpReverseProxy, buildHttp2ReverseProxy} from './reverse-proxy';
import {RequestLock} from './request-lock';
import {getProxyMetrics} from './proxy-metrics';

const HTTP_DEFAULT_PORT = 80;
const HTTPS_DEFAULT_PORT = 443;

const runProxy = async () => {
  // Inject for testability
  const cache = new ProxyCache();
  // in order to appropriately listen for events occurring in both of these servers, let's create
  // a ProxyObservable, which acts as a pipeline for events originating in both locations
  // then, a ProxyMetricsObserver which is consuming both of these.
  getProxyMetrics();

  const lock = new RequestLock();

  const HttpProxyServer = await buildHttpReverseProxy(cache, lock);
  HttpProxyServer.listen(HTTP_DEFAULT_PORT);
  console.log(`Starting HTTP server on port: ${HTTP_DEFAULT_PORT}`);

  const Http2ProxyServer = await buildHttp2ReverseProxy(cache, lock);
  console.log(`Starting HTTP2 server on port: ${HTTPS_DEFAULT_PORT}`);
  Http2ProxyServer.listen(HTTPS_DEFAULT_PORT);
};

runProxy();
