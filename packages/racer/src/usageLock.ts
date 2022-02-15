/**
 * Represents a Mutex or Lock used to track if Lighthouse is running or not.
 * Implemented as a singleton to allow other services to use but not reinstantiate.
 */
export class UsageLock {
  private static instance: UsageLock;
  private claimed = false;

  // no op, prevent users from instantiating
  private constructor() {}

  public static getInstance(): UsageLock {
    if (!UsageLock.instance) {
      UsageLock.instance = new UsageLock();
    }
    return UsageLock.instance;
  }

  public tryAcquire(): Promise<boolean> {
    // caller tries to get claim,
    if (this.claimed) {
      return Promise.resolve(false);
    } else {
      this.claimed = true;
      return Promise.resolve(true);
    }
  }

  public release(): Promise<void> {
    this.claimed = false;
    return Promise.resolve();
  }

  // note that the above may not be sufficient due to potential race condition
}
