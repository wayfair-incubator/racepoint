/*
  Proxy Cache 
*/
import NodeCache from 'node-cache';
import {IncomingHttpHeaders} from 'node:http';
import {EventEmitter} from 'stream';

export interface ProxyCacheItem {
  status: number;
  headers: IncomingHttpHeaders;
  url: string;
  data: Buffer;
}

export interface CacheStats {
  count: number;
  hitPercentage: number;
  missPercentage: number;
}

export enum CacheEvents {
  CacheWrite = 'cache-written',
  CacheHit = 'cache-hit', // use sparingly
}

// note: adding wrappers around the underlying caching mechanism in case we need to swap out the library or
// implementation.

export class ProxyCache extends EventEmitter {
  private _cache: NodeCache;

  constructor() {
    super();
    this._cache = new NodeCache();
  }

  write(key: string, item: ProxyCacheItem): boolean {
    if (this.contains(key)) {
      return false;
    }
    const cacheResult = this._cache.set(key, item);
    if (cacheResult) {
      this.emit(CacheEvents.CacheWrite);
    }
    return cacheResult;
  }

  contains(key: string): boolean {
    return this._cache.has(key);
  }

  getKeys() {
    return this._cache.keys();
  }

  read(key: string): ProxyCacheItem | undefined {
    if (this.contains(key)) {
      this.emit(CacheEvents.CacheHit, key);
    }
    return this._cache.get(key);
  }

  stats(): CacheStats {
    return {
      count: this._cache.stats.keys,
      hitPercentage: this._cache.stats.hits,
      missPercentage: this._cache.stats.misses,
    };
  }
}
