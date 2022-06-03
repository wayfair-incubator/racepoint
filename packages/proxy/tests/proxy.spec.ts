/*
  Proxy Mocha Test
*/
import mockHttp from 'mock-http';
import {
  handleIncomingRequest,
  CACHE_CONTROL_ENDPOINT,
} from '../src/reverse-proxy';
import {ProxyCache} from '../src/proxy-cache';
import {calculateCacheKey, extractBodyBuffer} from '../src/cache-helpers';
import {handleProxyResponse} from '../src/proxy-worker';
import {CACHE_KEY_HEADER} from '../src/cache-helpers';
import {RequestLock} from '../src/request-lock';

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
  const testLock = new RequestLock();

  it('should proxy an incoming request', async () => {
    const req = new mockHttp.Request(requestConfig);
    const res = new mockHttp.Response();
    const mockProxyHandler = jest.fn();

    await handleIncomingRequest({
      cache: testCache,
      request: req,
      response: res,
      handleUncached: mockProxyHandler,
      lock: testLock,
    });

    expect(mockProxyHandler).toBeCalled();
  });

  it('should cache an incoming request', async () => {
    const req = new mockHttp.Request(requestConfig);
    const proxyRes = new mockHttp.Request(requestConfig);
    const res = new mockHttp.Response();

    await handleIncomingRequest({
      cache: testCache,
      request: req,
      response: res,
      handleUncached: async () => {
        // Skip proxying the real URL and just handle the response
        await handleProxyResponse({
          cacheInstance: testCache,
          proxyRes,
          responseHeaders: {},
          statusCode: 200,
          originalRequest: req,
          responseToBrowser: res,
        });
      },
      lock: testLock,
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
      request: req,
      response: res,
      handleUncached: uncalledProxyHandler,
      lock: testLock,
    });

    expect(uncalledProxyHandler).not.toBeCalled();
  });

  it('should return the correct cached data', async () => {
    const req = new mockHttp.Request(requestConfig);
    const requestData = await extractBodyBuffer(req);
    const cacheKey = calculateCacheKey(req, requestData);

    expect(testCache.contains(cacheKey)).toBe(true);
    expect(testCache.read(cacheKey)?.headers[CACHE_KEY_HEADER]).toBe(cacheKey);
    expect(JSON.stringify(testCache.read(cacheKey)?.data)).toEqual(
      JSON.stringify(requestData)
    );
  });

  it('should prevent outgoing requests when the endpoint is hit', async () => {
    const requestLockConfig = {
      url: CACHE_CONTROL_ENDPOINT,
      method: 'POST',
      buffer: Buffer.from('{"enableOutboundRequests": false}'),
      headers: {
        host: 'localhost',
      },
    };

    const req = new mockHttp.Request(requestLockConfig);
    const res = new mockHttp.Response();

    expect(testLock.getStatus()).toBe(true);

    await handleIncomingRequest({
      cache: testCache,
      request: req,
      response: res,
      handleUncached: jest.fn(),
      lock: testLock,
    });

    expect(testLock.getStatus()).toBe(false);
  });

  it('should re-enable outgoing requests when the endpoint is hit', async () => {
    const requestLockConfig = {
      url: CACHE_CONTROL_ENDPOINT,
      method: 'POST',
      buffer: Buffer.from('{"enableOutboundRequests": true}'),
      headers: {
        host: 'localhost',
      },
    };

    const req = new mockHttp.Request(requestLockConfig);
    const res = new mockHttp.Response();

    expect(testLock.getStatus()).toBe(false);

    await handleIncomingRequest({
      cache: testCache,
      request: req,
      response: res,
      handleUncached: jest.fn(),
      lock: testLock,
    });

    expect(testLock.getStatus()).toBe(true);
  });
});
