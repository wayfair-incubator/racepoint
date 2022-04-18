import chai, {expect} from 'chai';
import exp from 'constants';
import {
  RaceContext,
  RaceProfileCommand,
  constructChromeOptions,
  constructLighthouseFlags,
} from '../src/profiling/config';

describe('Race Context parsing', () => {
  it('should have appropriate defaults', () => {
    const defaultContext = new RaceContext(1, {
      targetUrl: 'https://www.google.com',
    });
    expect(defaultContext.targetUrl).to.be.equal('https://www.google.com');
    expect(defaultContext.deviceType).to.be.equal('desktop');
    expect(defaultContext.chromeFlags).to.be.empty;
    expect(defaultContext.jobId).to.be.equal(1);
    expect(defaultContext.disableStorageReset).to.be.false;
  });

  it('should allow for overrides', () => {
    const overriddenContext = new RaceContext(42, {
      targetUrl: 'https://www.example.com',
      chromeFlags: ['--crash-on-failure', '--disable-notifications'],
      deviceType: 'mobile',
      disableStorageReset: true,
    });

    expect(overriddenContext.targetUrl).to.be.equal('https://www.example.com');
    expect(overriddenContext.deviceType).to.be.equal('mobile');
    expect(overriddenContext.chromeFlags.length).to.be.equal(2);
    expect(overriddenContext.jobId).to.be.equal(42);
    expect(overriddenContext.disableStorageReset).to.be.true;
  });
});

describe('Chrome Options construction', () => {
  it('should ignore empty flags', () => {
    const bare = new RaceContext(5, {
      targetUrl: 'https://www.example.com',
    });

    const options = constructChromeOptions(bare);
    expect(options.logLevel).to.be.equal('info');
    expect(options.chromeFlags).to.not.be.empty;
    expect(options.chromeFlags!!.length).to.be.equal(6);
  });

  it('should include additional flags', () => {
    const options = constructChromeOptions(
      new RaceContext(10, {
        targetUrl: 'https://www.example.com',
        chromeFlags: ['--crash-on-failure', '--disable-notifications'],
      })
    );
    expect(options.logLevel).to.be.equal('info');
    expect(options.chromeFlags!!.length).to.be.equal(8);
    expect(options.chromeFlags!!).to.contain('--crash-on-failure');
    expect(options.chromeFlags!!).to.contain('--disable-notifications');
  });
});

describe('Lighthouse Flags construction', () => {
  it('should construct a desktop settings block for desktop deviceType', () => {
    const lhFlags = constructLighthouseFlags(
      3001,
      new RaceContext(10, {
        targetUrl: 'https://www.example.com',
      })
    );
    expect(lhFlags.output).to.be.equal('html');
    expect(lhFlags.port).to.be.equal(3001);
    expect(lhFlags.logLevel).to.be.equal('info');
    expect(lhFlags.formFactor).to.be.equal('desktop');
    expect(lhFlags.screenEmulation).to.eql({
      mobile: false,
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    });
  });
  it('should respect mobile deviceType', () => {
    const lhFlags = constructLighthouseFlags(
      3001,
      new RaceContext(10, {
        targetUrl: 'https://www.example.com',
        deviceType: 'mobile',
      })
    );
    expect(lhFlags.output).to.be.equal('html');
    expect(lhFlags.port).to.be.equal(3001);
    expect(lhFlags.logLevel).to.be.equal('info');
    expect(lhFlags.formFactor).to.be.equal('mobile');
    expect(lhFlags.screenEmulation).to.eql({
      mobile: true,
      width: 360,
      height: 640,
      deviceScaleFactor: 2,
    });
  });

  it('should allow for extra headers', () => {
    const lhFlags = constructLighthouseFlags(
      3001,
      new RaceContext(10, {
        targetUrl: 'https://www.example.com',
        extraHeaders: {'Content-Type': 'application/json', 'x-men': 'banshee'},
      })
    );
    expect(lhFlags.extraHeaders).to.eql({
      'Content-Type': 'application/json',
      'x-men': 'banshee',
    });
  });
});
