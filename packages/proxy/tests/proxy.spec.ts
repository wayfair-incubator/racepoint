/*
  Proxy Mocha Test
*/
import {
  buildHttpReverseProxy,
  buildHttpsReverseProxy,
  handleIncomingRequest,
} from '../src/reverse-proxy';
import {ProxyCache} from '../src/proxy-cache';
import {buildProxyWorker} from '../src/proxy-worker';
import {calculateCacheKey, extractBody} from '../src/cache-helpers';
import {handleProxyResponse} from '../src/proxy-worker';
import {Server} from 'http';
import {StatusCodes} from 'http-status-codes';
import {CACHE_KEY_HEADER} from '../src/cache-helpers';
import mockHttp from 'mock-http';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/*
  HTTP 

  it should cache a new request 
  it should fire off the handler when it's new
  it should return cached data
  it should not call handler 

*/

// Can't be 80 or 3000 etc.
const TEST_PORT = 80;

const requestConfig = {
  url: 'http://example.com',
  method: 'GET',
  buffer: Buffer.from('name=mock&version=first'),
  headers: {
    host: 'test',
  },
};

describe('HTTP Server', () => {
  let httpProxy: Server;
  const testCache = new ProxyCache();
  const proxy = buildProxyWorker({cache: testCache});

  beforeAll(async () => {
    // testCache = new ProxyCache();
    console.log('This runs');
    httpProxy = await buildHttpReverseProxy(testCache);
    httpProxy.listen(TEST_PORT);
  });

  afterAll(() => {
    httpProxy.close();
  });

  it('should start an HTTP proxy server on a given port', async () => {
    expect(httpProxy.listening).toBe(true);
  });

  describe('Caching works', () => {
    const mockProxyHandler = jest.fn();

    it('should proxy an incoming request', async () => {
      const req = new mockHttp.Request(requestConfig);
      const res = new mockHttp.Response();

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
      const res = new mockHttp.Response();
      const requestData = await extractBody(req);
      const cacheKey = calculateCacheKey(req, requestData);

      expect(testCache.contains(cacheKey)).toBe(true);
      expect(testCache.read(cacheKey)?.headers[CACHE_KEY_HEADER]).toBe(
        cacheKey
      );
      expect(JSON.stringify(testCache.read(cacheKey)?.data)).toEqual(
        JSON.stringify(requestData)
      );
    });
  });
});

// describe('HTTPS Server', () => {
//   let httpsProxy: Server;
//   let testCache: ProxyCache;

//   beforeEach(async () => {
//     testCache = new ProxyCache();
//     httpsProxy = await buildHttpsReverseProxy(testCache);
//     httpsProxy.listen(443);
//   });

//   afterEach(() => {
//     if (httpsProxy) {
//       httpsProxy.close();
//     }
//   });

//   it('should start an HTTPS proxy server on a given port', async () => {
//     expect(httpsProxy.listening).to.be.true;
//   });

//   it('should receive a fingerprint when requesting HTTPS proxy', async () => {
//     let fingerprint;

//     await rp({
//       uri: 'https://localhost:443/fingerprint',
//       headers: {
//         'User-Agent': 'Request-Promise',
//         host: 'raceproxy',
//       },
//       resolveWithFullResponse: true,
//     })
//       .then((response) => {
//         const parsedBody = JSON.parse(response.body);
//         fingerprint = parsedBody.spkiFingerprint;
//         expect(response.statusCode).to.equal(200);
//         expect(fingerprint).to.have.lengthOf.at.least(1);
//       })
//       .catch((e) => {
//         console.log(e);
//       });
//   });

//   // @TODO caching tests similar to HTTP when we figure out insecure requests
// });
