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
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {StatusCodes} from 'http-status-codes';
import chaiHttp from 'chai-http';
import rp from 'request-promise';
import {CACHE_KEY_HEADER} from '../src/cache-helpers';
import {IncomingMessage, ServerResponse} from 'http';
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

describe('HTTP Server', () => {
  let httpProxy: Server;
  let testCache = new ProxyCache();
  let mock: any;

  beforeAll(async () => {
    // testCache = new ProxyCache();
    console.log('This runs');
    httpProxy = await buildHttpReverseProxy(testCache);
    httpProxy.listen(TEST_PORT);
  });

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  afterAll(() => {
    httpProxy.close();
  });

  it('should start an HTTP proxy server on a given port', async () => {
    expect(httpProxy.listening).toBe(true);
  });

  describe('Caching works', () => {
    const mockProxyHandler = jest.fn();

    const proxy = buildProxyWorker({cache: testCache});

    it('should proxy an incoming request', async () => {
      const req = new mockHttp.Request({
        url: 'http://example.com',
        method: 'GET',
        buffer: Buffer.from('name=mock&version=first'),
        headers: {
          host: 'doop',
        },
      });

      const res = new mockHttp.Response();

      await handleIncomingRequest({
        cache: testCache,
        proxy,
        request: req,
        response: res,
        handleUncached: mockProxyHandler,
      });

      expect(mockProxyHandler).toHaveBeenCalled();
    });

    it('should cache an incoming request', async () => {
      const req = new mockHttp.Request({
        url: 'http://example.com',
        method: 'GET',
        headers: {
          host: 'doop',
        },
      });

      const req2 = new mockHttp.Request({
        url: 'http://example.com',
        method: 'GET',
        headers: {
          host: 'doop',
        },
      });

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
            proxyRes: req2,
            originalRequest: req,
            responseToBrowser: res,
          });
        },
      });

      const cacheStats = testCache.stats();
      expect(cacheStats.count).toBe(1);
    });

    // it('should receive cached response from server upon retry', async () => {
    //   await rp(testOptions)
    //     .then((response) => {
    //       expect(response.statusCode).to.equal(200);
    //       expect(response.body.length > 0);
    //       expect(response.headers).to.have.property(CACHE_KEY_HEADER);
    //     })
    //     .catch((e) => {
    //       console.log(e);
    //     });
    // });
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
