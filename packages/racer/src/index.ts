import http from 'http';
import {IncomingMessage, ServerResponse} from 'http';
import {fetchUrlFromProxy} from './scenarios/fetch';
import url from 'url';

// two modes: one, starts the racer server. This is the chief mode of
// operation and is what will be hit by external services
// second is a test 'fetch' mode which will grab the SPIFKey and execute a fetch through the
// proxy

const runProxy = async () => {
  const server = await http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      console.log('received a hit to ', req.url);

      if (req.url && req.url.startsWith('/fetch')) {
        console.log('fetching! ', req.headers['host']);
        const queryObject = url.parse(req.url, true).query;
        console.log(queryObject['url']);
        fetchUrlFromProxy(queryObject['url']!!.toString());
        res.statusCode = 200;
      } else {
        res.statusCode = 404;
      }

      res.end();
    }
  );
  console.log('Go Speed Racer Go');
  server.listen(3000);
};
runProxy();
