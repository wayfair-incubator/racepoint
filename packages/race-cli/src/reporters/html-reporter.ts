import {LighthouseResultsWrapper} from '@racepoint/shared';
import fs from 'fs/promises';
import {BaseRacepointReporter} from '../types';
import logger from '../logger';

/*
  Helper function to format ISO date and full URL for the report HTML
  Matches the output from Lighthouse
*/
const formatFilename = (url: string, date: string) => {
  const title = url.replace(/(http(s)?:\/\/)|(\/.*){1}/g, '');
  const formattedDate = new Date(date);
  const y = formattedDate.getFullYear();
  // Format date values (months, seconds, etc) to always be 2 digits
  const mo = ('0' + (formattedDate.getMonth() + 1)).slice(-2);
  const d = ('0' + formattedDate.getDate()).slice(-2);
  const h = ('0' + formattedDate.getHours()).slice(-2);
  const mi = ('0' + formattedDate.getMinutes()).slice(-2);
  const s = ('0' + formattedDate.getSeconds()).slice(-2);

  return `${title}_${y}-${mo}-${d}_${h}-${mi}-${s}.race.html`;
};

/**
 * Writes a single lighthouse result to an html file
 */
export class HtmlReporter extends BaseRacepointReporter {
  private _reportPath: string;
  constructor(outputTarget: string) {
    super();
    this._reportPath = outputTarget; //`${outputTarget}/results.html`;
  }

  process = (results: LighthouseResultsWrapper): Promise<void> => {
    const htmlPath = `${this._reportPath}/${formatFilename(
      results.lhr.requestedUrl,
      results.lhr.fetchTime
    )}`;

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
