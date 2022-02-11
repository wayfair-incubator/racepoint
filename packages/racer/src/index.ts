import url from 'url';
import http from 'http';
import {IncomingMessage, ServerResponse} from 'http';
import {fetchUrlFromProxy} from './scenarios/fetch';
import {fetchFingerprint} from './fingerprint';

// two modes: one, starts the racer server. This is the chief mode of
// operation and is what will be hit by external services
// second is a test 'fetch' mode which will grab the SPIFKey and execute a fetch through the
// proxy

const runProxy = async () => {
  const server = await http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      console.log('Received a hit to this place', req.url);

      console.log(req.url, req.url && req.url.startsWith('/fetch'));

      if (req.url && req.url.startsWith('/fetch')) {
        console.log('fetching! ', req.headers['host']);

        const queryObject = url.parse(req.url, true);

        console.log(queryObject);

        // queryObject.query;

        // fetchUrlFromProxy(queryObject['url']!!.toString());
        res.statusCode = 200;
      } else if (req.url && req.url.startsWith('/fingerprint')) {
        console.log(fetchFingerprint());
      } else {
        console.log('We are intending to do this');
        res.statusCode = 404;
      }

      res.end();
    }
  );
  console.log('Go Speed Racer Go');
  server.listen(3000);
};
runProxy();
