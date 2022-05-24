import EventEmitter from 'events';

let instance: ProxyEventObservable | undefined = undefined;

/**
 * Given that the Proxy is really multiple simultaneous web servers, it is useful to have a common
 * 'Pipeline' that events can be emitted 'out' of.
 */
class ProxyEventObservable extends EventEmitter {
  constructor() {
    super();
    console.log('Proxy event stream initialized');
  }
}

/**
 * a map of the events we expect to be used throughout the system
 */
export const CommonEvents = {
  requestReceived: 'request-received', // denotes a request to the proxy, this will occur frequently
  requestUrlNotInCache: 'url-not-cached', // should emit when a url was not found in the cache. Should include the request object in the event
};

export const getProxyEventObservable = (): ProxyEventObservable => {
  if (instance === undefined) {
    instance = new ProxyEventObservable();
  }
  return instance;
};
