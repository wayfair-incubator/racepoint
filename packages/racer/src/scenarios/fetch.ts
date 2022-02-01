/**
 * Do a straight pass-through fetch of a url through the proxy.
 * This should be used for testing purposes
 */
import fetch from 'node-fetch';
import http from 'http';
import https from 'https';
import {fetchFingerprint} from '../fingerprint';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  host: 'raceproxy',
  port: 443,
});

export const fetchUrlFromProxy = async (url: string) => {
  fetchFingerprint();

  const response = await fetch(url, {
    agent: httpsAgent,
  });
  const body = await response.text();
  console.log('Here is the response:', body.slice(0, 100));
};
