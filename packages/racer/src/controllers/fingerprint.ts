/**
 * Responsible for fetching the Fingerprint from the Proxy.
 * At first this will just be a simple async/await fetch, but over time this
 * should evolve into a cache of the fingerprint.
 *
 * Requests should check the fingerprint, and retrieve the fingerprint when it's time to race
 * (retrieving the fingerprint on startup can result in a race condition of the proxy hasn't started yet)
 */
import fetch from 'node-fetch';
import {
  RegisteredEndpoint,
  EndpointResponse,
  RaceProxyHttpsAgent,
} from './common';

// this should be configurable and / or an env var (e.g. locally we'd want this to be localhost)
const FINGERPRINT_ENDPOINT = 'https://raceproxy.com/fingerprint';

const fetchFingerprint = async (): Promise<object> => {
  console.log('Retrieving fingerprint from proxy...');

  const response = await fetch(FINGERPRINT_ENDPOINT, {
    agent: RaceProxyHttpsAgent,
  });
  const data = await response.json();
  const fingerprint = data?.spkiFingerprint;
  console.log(`Received fingerprint: ${fingerprint}`);
  return {fingerprint};
};

export const FingerprintEndpoint: RegisteredEndpoint<object> = {
  path: '/fingerprint',
  method: 'GET',
  handler: async (request, response, url) =>
    new EndpointResponse(fetchFingerprint()),
};
