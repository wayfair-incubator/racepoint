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
