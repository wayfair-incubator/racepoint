/*
  Request Lock
*/
export class RequestLock {
  private _allowOutgoing: boolean;

  constructor() {
    this._allowOutgoing = true;
  }

  setStatus(status: boolean) {
    console.log(
      `🔏 Outgoing request lock is now ${status ? 'enabled' : 'disabled'}`
    );
    this._allowOutgoing = status;
  }

  getStatus() {
    return this._allowOutgoing;
  }
}
