const chalk = require('chalk');
const figlet = require('figlet');
const {textSync} = figlet;

// Format command descriptions
export const descriptionHelper = (str: string) => chalk.italic.blue(str);

// Format command arguments
export const argumentHelper = (str: string) => chalk.green(str);

export const raceLogo = `${chalk.bgBlue.bold(textSync('RacePoint'))}
`;
