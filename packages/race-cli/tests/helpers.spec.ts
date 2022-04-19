import {expect} from 'chai';
import {splitChromeArgs} from '../src/helpers';

describe('Chrome flags helper', () => {
  it('should handle a single flag', () => {
    const flags = splitChromeArgs('--test-me');
    expect(flags).to.eql(['--test-me']);
  });

  it('should split multiple', () => {
    const flags = splitChromeArgs('--test-me,--disable-cache,--foo-bar');
    expect(flags).to.eql(['--test-me', '--disable-cache', '--foo-bar']);
  });

  it('should fail if an invalid flag is passed', () => {
    const failure = () => {
      splitChromeArgs('--test-me,--foo-bar,BLARG,--valid-flag');
    };
    expect(failure).to.throw('flags must start with "--"');
  });
});
