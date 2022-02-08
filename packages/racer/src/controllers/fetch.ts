/**
 * Do a straight pass-through fetch of a url through the proxy.
 * This should be used for testing purposes. Has an optional parameter
 * to control just how much text comes back
 */
import fetch from 'node-fetch';
import {
  RegisteredEndpoint,
  EndpointResponse,
  selectAgentForProtocol,
} from './common';

const URL = 'url';
const SIZE = 'size';

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

export const FetchEndpoint: RegisteredEndpoint<object> = {
  path: '/fetch',
  method: 'GET',
  handler: async (req, res, parsedUrl) => {
    const response = new EndpointResponse({});
    const target = parsedUrl.query[URL];

    if (target === undefined) {
      // throw new Error(`This endpoint requires a value for ${URL}`);
      return response
        .withBody({error: `This endpoint requires a value for ${URL}`})
        .withStatusCode(400);
    }

    const html = await fetchUrlFromProxy(
      target.toString(),
      parsedUrl.query[SIZE]
        ? parseInt(parsedUrl.query[SIZE]!!.toString())
        : undefined
    );
    return response.withBody({html});
  },
};
