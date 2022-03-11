/*
  Proxy Mocha Test
*/
import mockHttp from 'mock-http';
import {handleIncomingRequest} from '../src/reverse-proxy';
import {ProxyCache} from '../src/proxy-cache';
import {buildProxyWorker} from '../src/proxy-worker';
import {calculateCacheKey, extractBody} from '../src/cache-helpers';
import {handleProxyResponse} from '../src/proxy-worker';
import {CACHE_KEY_HEADER} from '../src/cache-helpers';

const requestConfig = {
  url: 'http://example.com',
  method: 'GET',
  buffer: Buffer.from('name=mock&version=first'),
  headers: {
    host: 'test',
  },
};

describe('Cache mechanism', () => {
  const testCache = new ProxyCache();
  const proxy = buildProxyWorker({cache: testCache});

  it('should proxy an incoming request', async () => {
    const req = new mockHttp.Request(requestConfig);
    const res = new mockHttp.Response();
    const mockProxyHandler = jest.fn();

    await handleIncomingRequest({
      cache: testCache,
      proxy,
      request: req,
      response: res,
      handleUncached: mockProxyHandler,
    });

    expect(mockProxyHandler).toBeCalled();
  });

  it('should cache an incoming request', async () => {
    const req = new mockHttp.Request(requestConfig);
    const proxyRes = new mockHttp.Request(requestConfig);
    const res = new mockHttp.Response();

    await handleIncomingRequest({
      cache: testCache,
      proxy,
      request: req,
      response: res,
      handleUncached: async () => {
        // Skip proxying the real URL and just handle the response
        await handleProxyResponse({
          cacheInstance: testCache,
          proxyRes,
          originalRequest: req,
          responseToBrowser: res,
        });
      },
    });

    const cacheStats = testCache.stats();
    expect(cacheStats.count).toBe(1);
  });

  it('should not proxy for cached content', async () => {
    const req = new mockHttp.Request(requestConfig);
    const res = new mockHttp.Response();
    const uncalledProxyHandler = jest.fn();

    await handleIncomingRequest({
      cache: testCache,
      proxy,
      request: req,
      response: res,
      handleUncached: uncalledProxyHandler,
    });

    expect(uncalledProxyHandler).not.toBeCalled();
  });

  it('should return the correct cached data', async () => {
    const req = new mockHttp.Request(requestConfig);
    const requestData = await extractBody(req);
    const cacheKey = calculateCacheKey(req, requestData);

    expect(testCache.contains(cacheKey)).toBe(true);
    expect(testCache.read(cacheKey)?.headers[CACHE_KEY_HEADER]).toBe(cacheKey);
    expect(JSON.stringify(testCache.read(cacheKey)?.data)).toEqual(
      JSON.stringify(requestData)
    );
  });
});
