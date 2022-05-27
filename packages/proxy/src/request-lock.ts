/*
  Request Lock

  Controls whether or not outgoing requests are allowed in the proxy server
  If false, empty data will be returned if there is no cached data for a request
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
