/**
 * Storage repository for lighthouse results.
 *
 */

import {LighthouseResultsWrapper} from './results';

interface RepositoryRecord {
  jobId: number;
  timestamp: Date;
  results: LighthouseResultsWrapper;
}

// at first this will be an in-memory queue, but eventually should make use of writing files to tmp or even better, a datastore
// initial support retrieving and deleting by id
export class LighthouseResultsRepository {
  // for now, treating the store as just a queue/list we keep appending to
  // a map would also work, but I want this to generate the 'next' id for us. With a map I would need to keep track of a secondary incrementing
  // int to return the next id.
  // A map would be a faster read of course, but the list is still linear time which is _fine_ for now
  // additional note: using Promises as return values even though it's all in memory to build towards the day when the calls will be async (e.g. file io)
  private static _store: RepositoryRecord[] = [];

  private constructor() {}

  public static read(jobId: number): Promise<RepositoryRecord | undefined> {
    return Promise.resolve(
      this._store.find((record) => record.jobId === jobId)
    );
  }

  public static write(
    jobId: number,
    data: LighthouseResultsWrapper
  ): Promise<number> {
    this._store.push({
      jobId,
      timestamp: new Date(),
      results: data,
    });
    console.log('repository size is now ', this._store.length);
    return Promise.resolve(jobId);
  }

  public static delete(jobId: number): Promise<void> {
    this._store = this._store.filter((item) => item.jobId !== jobId);
    return Promise.resolve();
  }

  public static purge(): Promise<void> {
    this._store = [];
    return Promise.resolve();
  }

  public static getNextId(): Promise<number> {
    return Promise.resolve(
      this._store.length === 0
        ? 1
        : this._store[this._store.length - 1].jobId + 1
    );
  }
}
