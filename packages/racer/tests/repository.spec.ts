import {LighthouseResultsRepository} from '../src/profiling/repository';
import {expect} from 'chai';

describe('Empty LighthouseResults Repository', () => {
  it('should generate a next Id', async () => {
    expect(await LighthouseResultsRepository.getNextId()).to.equal(1);
  });
  it('should not fail on purges', async () => {
    // basically, don't throw
    expect(await LighthouseResultsRepository.purge()).to.be.undefined;
  });
  it('should return undefined when no valid jobId is read', async () => {
    expect(await LighthouseResultsRepository.read(25)).to.be.undefined;
  });
});

const samplePayload = {
  report: '<html></html>',
  steps: [
    {
      name: 'Test',
      lhr: {
        userAgent: 'WF tester 1.1',
        lighthouseVersion: '0.1.0',
        fetchTime: '123',
        requestedUrl: 'https://www.foo.com',
        finalUrl: 'https://www.foo.com',
        runWarnings: [],
        runtimeError: undefined,
        audits: {},
        timing: {
          entries: [],
          total: 0,
        },
      },
    },
  ],
};

describe('Lighthouse Results Repository CRUD operations', () => {
  afterEach(async () => {
    LighthouseResultsRepository.purge();
  });

  it('should persist without failure and increment the next Id', async () => {
    expect(
      await LighthouseResultsRepository.getNextId().then((nextId) =>
        LighthouseResultsRepository.write(nextId, samplePayload)
      )
    ).to.equal(1);
    expect(await LighthouseResultsRepository.getNextId()).to.equal(2);
  });

  it('should read and delete', async () => {
    const jobId = await LighthouseResultsRepository.getNextId().then((nextId) =>
      LighthouseResultsRepository.write(nextId, samplePayload)
    );
    const retrieved = await LighthouseResultsRepository.read(jobId);
    expect(retrieved).to.not.be.undefined;
    expect(retrieved!!.timestamp).to.not.be.undefined;
    expect(retrieved!!.jobId).to.equal(jobId);
    expect(retrieved!!.results.report).to.equal('<html></html>');
    expect(retrieved!!.results.steps[0].lhr.requestedUrl).to.equal(
      'https://www.foo.com'
    );

    await LighthouseResultsRepository.delete(jobId);
    expect(await LighthouseResultsRepository.read(jobId)).to.be.undefined;
  });
});
