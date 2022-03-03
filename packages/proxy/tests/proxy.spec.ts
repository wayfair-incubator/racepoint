/*
  Proxy Mocha Test
*/
import {
  buildHttpReverseProxy,
  buildHttpsReverseProxy,
} from '../src/reverse-proxy';
import {ProxyCache} from '../src/proxy-cache';
import {Server} from 'http';
import chai, {expect} from 'chai';
import chaiHttp from 'chai-http';
import rp from 'request-promise';
import {CACHE_KEY_HEADER} from '../src/cache-helpers';

chai.use(chaiHttp);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Can't be 80 or 3000 etc.
const TEST_PORT = 900;

// @TODO instead of going into the wild internet for a URL,
// we should be stubbing out a response using a mock API like wiremock
// Follow-up ticket: SFPERF-2250
const testOptions = {
  url: 'http://github.com/',
  method: 'GET',
  proxy: 'http://localhost:900',
  resolveWithFullResponse: true,
};

describe('HTTP Server', () => {
  let httpProxy: Server;
  let testCache: ProxyCache;

  before(async () => {
    testCache = new ProxyCache();
    httpProxy = await buildHttpReverseProxy(testCache);
    httpProxy.listen(900);
  });

  after(() => {
    httpProxy.close();
  });

  it('should start an HTTP proxy server on a given port', async () => {
    expect(httpProxy.listening).to.be.true;
  });

  // describe('Caching works', async () => {
  //   it('should receive response from server', async () => {
  //     await rp(testOptions)
  //       .then((response) => {
  //         expect(response.statusCode).to.equal(200);
  //         // Expect some blob of HTML
  //         expect(response.body.length > 10);
  //       })
  //       .catch((e) => {
  //         console.log(e);
  //       });
  //   });

  //   it('should receive cached response from server upon retry', async () => {
  //     await rp(testOptions)
  //       .then((response) => {
  //         expect(response.statusCode).to.equal(200);
  //         expect(response.body.length > 0);
  //         expect(response.headers).to.have.property(CACHE_KEY_HEADER);
  //       })
  //       .catch((e) => {
  //         console.log(e);
  //       });
  //   });
  // });
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
