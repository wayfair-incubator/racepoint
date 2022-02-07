/**
 * Do a straight pass-through fetch of a url through the proxy.
 * This should be used for testing purposes. Has an optional parameter
 * to control just how much text comes back
 */
import fetch from 'node-fetch';
import {
  RegisteredEndpoint,
  RaceProxyHttpsAgent,
  selectAgentForProtocol,
} from './common';

const fetchUrlFromProxy = async (
  url: string,
  requestedLength: number = 100
) => {
  const response = await fetch(url, {
    agent: selectAgentForProtocol(url),
  });
  const body = await response.text();
  // potential metric location: successful response
  return body.slice(0, requestedLength);
};

export const FetchEndpoint: RegisteredEndpoint = {
  path: '/fetch',
  handler: async (req, res, parsedUrl) => {
    const target = parsedUrl.query['url'];
    if (target === undefined) {
      throw new Error('This endpoint requires a url');
    }

    const html = await fetchUrlFromProxy(
      target.toString(),
      parsedUrl.query['size']
        ? parseInt(parsedUrl.query['size'].toString())
        : undefined
    );
    return {html};
  },
};
