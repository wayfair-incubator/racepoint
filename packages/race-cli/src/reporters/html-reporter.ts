import {LighthouseResultsWrapper} from '@racepoint/shared';
import fs from 'fs';
import {BaseRacepointReporter} from '../types';
import logger from '../logger';
import {formatFilename} from '../helpers';

/**
 * Writes a single lighthouse result to an html file
 */
export class HtmlReporter extends BaseRacepointReporter {
  private _reportPath: string;

  constructor(outputTarget: string) {
    super();
    this._reportPath = outputTarget || '.';
  }

  process = (results: LighthouseResultsWrapper): undefined => {
    const htmlPath = `${this._reportPath}/${formatFilename({
      url: results.lhr.requestedUrl,
      date: results.lhr.fetchTime,
      suffix: 'race.html',
    })}`;

    // Need to use synchronous file save as the promise version often had partial writes
    try {
      fs.writeFileSync(htmlPath, results.report, {flag: 'w'});
      logger.debug(`Lighthouse HTML results successfully saved`);
    } catch (e) {
      logger.error('Failed to write results', e);
    }
    return;
  };
}
