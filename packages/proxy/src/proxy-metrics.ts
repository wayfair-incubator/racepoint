import {Http2ServerRequest} from 'http2';
import {IncomingMessage} from 'http';
import {ProxyCache} from './proxy-cache';
import {isHttpRequest} from './cache-helpers';
import {CommonEvents, getProxyEventObservable} from './proxy-observable';
import {CacheMetricData} from '@racepoint/shared';

let instance: ProxyMetricsObserver | undefined = undefined;

/**
 * The first major use case of such a pipeline is tracking overall stats on how the Proxy is doing
 */
class ProxyMetricsObserver {
  private data: CacheMetricData = {
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
        const pathname = new URL(
          request?.url || '',
          isHttpRequest(request)
            ? `http://${request.headers.host}`
            : `https://${request.authority}`
        ).pathname;

        if (pathname === undefined) {
          console.warn(
            'Received an event for a requested url, but not url found in the request'
          );
          return;
        }

        const baseUrl = isHttpRequest(request)
          ? `http://${request.headers.host}${pathname}`
          : `https://${request.authority}${pathname}`;

        // track as a hash the paths (not including query params) long with the individual
        // counts. We could use the full url, but the idea here is that if there's a miss
        // it's likely due to non-determinism in the URL (e.g. timestamp in a query param).
        if (this.trackedMissedUrls[baseUrl] === undefined) {
          this.trackedMissedUrls[baseUrl] = 0;
        } else {
          this.trackedMissedUrls[baseUrl]++;
        }
      }
    );

    console.log('Metrics Observer initialized');
  }

  report(cache: ProxyCache, topN: number = 10): CacheMetricData {
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
