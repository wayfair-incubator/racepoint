const chalk = require('chalk');
const commander = require('commander');
const figlet = require('figlet');
const {textSync} = figlet;

// Format command descriptions
export const descriptionHelper = (str: string) => chalk.italic.blue(str);

// Format command arguments
export const argumentHelper = (str: string) => chalk.green(str);

export const raceLogo = `${chalk.bgBlue.bold(textSync('RacePoint'))}
`;

export const parseIntArg = (value: string) => {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new commander.InvalidArgumentError('Not a number.');
  }
  return parsedValue;
};

export const parseUrlArg = (value: string) => {
  if (value?.startsWith('http:') || value?.startsWith('https:')) {
    return value;
  } else {
    throw new commander.InvalidArgumentError('Not a valid URL.');
  }
};

/*
  Helper function to format ISO date and full URL for report files
  Matches the output from Lighthouse
*/
export const formatFilename = ({
  url,
  suffix,
  date,
}: {
  url: string;
  suffix: string;
  date?: string;
}) => {
  const title = url.replace(/(http(s)?:\/\/)|(\/.*){1}/g, '');
  // New date from passed in date
  const formattedDate = date ? new Date(date) : new Date();
  const y = formattedDate.getFullYear();
  // Format date values (months, seconds, etc) to always be 2 digits
  const mo = ('0' + (formattedDate.getMonth() + 1)).slice(-2);
  const d = ('0' + formattedDate.getDate()).slice(-2);
  const h = ('0' + formattedDate.getHours()).slice(-2);
  const mi = ('0' + formattedDate.getMinutes()).slice(-2);
  const s = ('0' + formattedDate.getSeconds()).slice(-2);

  return `${title}_${y}-${mo}-${d}_${h}-${mi}-${s}.${suffix}`;
};
