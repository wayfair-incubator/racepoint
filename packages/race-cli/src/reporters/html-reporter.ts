import {LighthouseResultsWrapper} from '@racepoint/shared';
import fs from 'fs/promises';
import {LLReporter} from '../types';
import logger from '../logger';

/**
 * Writes a single lighthouse result to an html file
 */
export class HtmlReporter implements LLReporter {
  private _reportPath: string;
  constructor(outputTarget: string) {
    this._reportPath = outputTarget; //`${outputTarget}/results.html`;
  }

  // for now, just resolve. We can get fancy and not overwrite by checking fs.access and selecting a new reportPath name
  initialize = (): Promise<void> => Promise.resolve();

  process = (results: LighthouseResultsWrapper): Promise<void> => {
    const htmlPath = `${this._reportPath}/results_${results.lhr.fetchTime}.html`;
    return fs
      .writeFile(htmlPath, results.report, {flag: 'w'})
      .then(() => {
        logger.debug(`Lighthouse HTML results successfully saved`);
      })
      .catch((e) => {
        logger.error('Failed to write results', e);
      });
  };
}
