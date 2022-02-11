import https from 'https';
import http from 'http';

/**
 * An Https agent specific for talking to the Race Proxy
 */
export const RaceProxyHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  host: 'raceproxy',
  port: 443,
});

/**
 * An Http agent specific for talking to the Race Proxy
 */
export const RaceProxyHttpAgent = new http.Agent({
  host: 'raceproxy',
  port: 80,
});

/**
 * Chooses the Agent to use based on the url protocol
 *
 * @param targetUrl A url string we're attempting to reach out to
 * @returns the appropriate Agent for the protocol
 */
export const selectAgentForProtocol = (
  targetUrl: string
): http.Agent | https.Agent => {
  if (targetUrl.startsWith('https')) {
    return RaceProxyHttpsAgent;
  } else if (targetUrl.startsWith('http')) {
    return RaceProxyHttpAgent;
  } else {
    throw new Error(`Unknown protocol for url ${targetUrl}`);
  }
};
