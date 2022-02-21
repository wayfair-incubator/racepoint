/**
 * This tool needs the ability to store and retrieve results over time
 */

import fs from 'fs/promises';
import logger from '../logger';

export interface ReportingRepository {
  write: (row: ReportingRow) => Promise<void>;
  countForUrl: (url: string) => Promise<number>;
  readRowsForUrl: (url: string) => Promise<ReportingRow[]>;
}

/**
 *
 * Connect to the underlying repository storage
 *
 * @param repositoryId name of the Repository file
 * @returns
 */
export const connectRepository = async (
  repositoryId: string
): Promise<CSVReportingRepository> => {
  // while currently the underlying storage is a CSV, eventually it could be a database of some kind
  // todo: for now we rely on purging the underlying csv file to clear out results, but in the future we may want the ability to search by date or some similar
  const filePath = repositoryId + '.csv';
  return fs
    .access(filePath)
    .catch(() => {
      return fs.writeFile(
        filePath,
        KnownColumns.map((column) => column.header).join(FILE_DELIMETER) + '\n',
        {
          flag: 'w',
        }
      );
    })
    .then(() => new CSVReportingRepository(filePath));
};

const FILE_DELIMETER = ';';

/**
 * A Reporting Repository using a CSV file
 */
class CSVReportingRepository implements ReportingRepository {
  private _filePath: string;

  /**
   *
   * @param repositoryId a string or path to the targeted repository
   */
  constructor(repositoryId: string) {
    this._filePath = repositoryId;
  }

  write = (row: ReportingRow): Promise<void> => {
    logger.debug(`Writing row to ${this._filePath}`);
    return fs.writeFile(this._filePath, this.convertToCSVRow(row), {flag: 'a'});
  };

  private convertToCSVRow = (reportingRow: ReportingRow): string =>
    KnownColumns.map((column) => column.from(reportingRow)).join(
      FILE_DELIMETER
    ) + '\n';

  countForUrl = (url: string): Promise<number> =>
    this.readRowsForUrl(url).then((rows) => Promise.resolve(rows.length));

  readRowsForUrl = (url: string): Promise<ReportingRow[]> =>
    fs.readFile(this._filePath).then((data) =>
      Promise.resolve(
        data
          .toString()
          .split(/\r?\n/)
          .slice(1)
          .map((row) => this.mapCSVRowToReportingRow(row.split(FILE_DELIMETER)))
          .filter((row) => row.profiledUrl === url)
      )
    );

  private mapCSVRowToReportingRow(csvSegments: string[]): ReportingRow {
    let reportingRow = new ReportingRow();
    csvSegments.forEach((segment, index) => {
      KnownColumns[index].to(reportingRow, segment);
    });
    return reportingRow;
  }
}

/**
 * DAO encapsulating the data to be persisted in our Repository
 */
export class ReportingRow {
  dateOccured: string = '';
  profiledUrl: string = ''; // the 'key' field
  lighthouseTime: number = 0;
  speedIndex: number = 0;
  fcp: number = 0;
  lcp: number = 0;
  cls: number = 0;
  mpfid: number = 0;
  tbt: number = 0;
}

const KnownColumns: CSVColumn[] = [
  {
    header: 'Date',
    from: (row) => row.dateOccured,
    to: (row, value) => (row.dateOccured = value as string),
  },
  {
    header: 'URL',
    from: (row) => row.profiledUrl,
    to: (row, value) => (row.profiledUrl = value as string),
  },
  {
    header: 'LightHouse Time',
    from: (row) => row.lighthouseTime,
    to: (row, value) => (row.lighthouseTime = Number(value)),
  },
  {
    header: 'Speed Index',
    from: (row) => row.speedIndex,
    to: (row, value) => (row.speedIndex = Number(value)),
  },
  {
    header: 'First Contentful Paint (FCP)',
    from: (row) => row.fcp,
    to: (row, value) => (row.fcp = Number(value)),
  },
  {
    header: 'Largest Contentful Paint (LCP)',
    from: (row) => row.lcp,
    to: (row, value) => (row.lcp = Number(value)),
  },
  {
    header: 'Cumulative Layout Shift (CLS)',
    from: (row) => row.cls,
    to: (row, value) => (row.cls = Number(value)),
  },
  {
    header: 'Maximum Potential First Input Delay',
    from: (row) => row.mpfid,
    to: (row, value) => (row.mpfid = Number(value)),
  },
  {
    header: 'Total Blocking Time (TBT)',
    from: (row) => row.tbt,
    to: (row, value) => (row.tbt = Number(value)),
  },
];

interface CSVColumn {
  header: string;
  from: (providedRow: ReportingRow) => string | number;
  to: (row: ReportingRow, value: string | number) => void;
}
