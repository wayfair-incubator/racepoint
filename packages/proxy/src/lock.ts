export class RequestLock {
  private _allowOutgoing: boolean;

  constructor() {
    this._allowOutgoing = true;
  }

  setStatus(status: boolean) {
    console.log(`Lock status is now ${status}`);
    this._allowOutgoing = status;
  }

  getStatus() {
    return this._allowOutgoing;
  }
}
