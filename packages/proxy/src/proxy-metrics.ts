import {Http2ServerRequest} from 'http2';
import {IncomingMessage} from 'http';
import url from 'url';
import {ProxyCache} from './proxy-cache';
import {CommonEvents, getProxyEventObservable} from './proxy-observable';

let instance: ProxyMetricsObserver | undefined = undefined;

interface MissCount {
  url: string;
  misses: number;
}

interface ProxyMetricData {
  totalRequests: number;
  keys: number;
  hits: number;
  misses: number;
  topMissCounts: MissCount[];
}

/**
 * The first major use case of such a pipeline is tracking overall stats on how the Proxy is doing
 */
class ProxyMetricsObserver {
  private data: ProxyMetricData = {
    totalRequests: 0,
    keys: 0,
    hits: 0,
    misses: 0,
    topMissCounts: [],
  };

  private trackedMissedUrls: {[url: string]: number} = {};

  private observable = getProxyEventObservable();

  constructor() {
    // on, on ,on
    this.observable.on(CommonEvents.requestReceived, () => {
      this.data.totalRequests++;
    });

    this.observable.on(
      CommonEvents.requestUrlNotInCache,
      (request: IncomingMessage | Http2ServerRequest) => {
        const parsedUrl = url.parse(request.url!!, true);
        const path = parsedUrl.pathname!!;
        if (parsedUrl === undefined) {
          console.warn(
            'Received an event for a requested url, but not url found in the request'
          );
          return;
        }
        // track as a hash the paths (not including query params) long with the individual
        // counts. We could use the full url, but the idea here is that if there's a miss
        // it's likely due to non-determinism in the URL (e.g. timestamp in a query param).
        if (this.trackedMissedUrls[path] === undefined) {
          this.trackedMissedUrls[path] = 0;
        }
        this.trackedMissedUrls[path]++;
      }
    );

    console.log('Metrics Observer initialized');
  }

  report(cache: ProxyCache, topN: number = 10): ProxyMetricData {
    // reuse the data tracked by the proxy cache
    this.data.keys = cache.stats().count;
    this.data.hits = cache.stats().hits;
    this.data.misses = cache.stats().misses;
    // find the top N cache misses by miss count
    this.data.topMissCounts = Object.entries(this.trackedMissedUrls)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map((d) => {
        return {url: d[0], misses: d[1]};
      });
    return this.data;
  }
}

export const getProxyMetrics = (): ProxyMetricsObserver => {
  if (instance === undefined) {
    instance = new ProxyMetricsObserver();
  }
  return instance;
};
