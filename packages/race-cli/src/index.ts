#! /usr/bin/env node
import commander from 'commander';
import {
  argumentHelper,
  descriptionHelper,
  raceLogo,
  parseIntArg,
  parseUrlArg,
  splitChromeArgs,
} from './helpers';
import {ProfileScenario, PROFILE_COMMAND} from './scenarios/profile';

const program = new commander.Command();

program
  .name('race')
  .addHelpText('before', raceLogo)
  .version(
    require('../package.json').version,
    '-v, --version',
    descriptionHelper('Output the version number')
  )
  .helpOption('', descriptionHelper('Display help for command'))
  .addHelpCommand(false)
  .usage('[command]');

program
  .command(PROFILE_COMMAND)
  .description(
    descriptionHelper('Perform a number of Lighthouse runs against a target')
  )
  .argument('<url>', argumentHelper('URL to race'), parseUrlArg)
  .showHelpAfterError()
  // Keep these alphabetical
  .option(
    '--chrome-flags <string>',
    descriptionHelper(
      'Chrome flags for the emulated browser. Will be merged with necessary defaults. Should be a comma-delimited list of arguments.'
    ),
    splitChromeArgs,
    []
  )
  .option(
    '-d, --device-type <device>',
    descriptionHelper('Device type to emulate'),
    'Mobile'
  )
  .option(
    '--include-individual',
    descriptionHelper(
      'Will display the results of individual runs to the console'
    ),
    false
  )
  .option(
    '--disable-storage-reset',
    descriptionHelper(
      'If set, will preserve the browser cache between runs. By default this is false in order to treat the experience as a brand new user each iteration.'
    ),
    false
  )
  .option(
    '--extra-headers <JSON string>',
    descriptionHelper(
      'A JSON strong of Headers that you wish to be included on each request. e.g. "{\\"Cookie\\":\\"monster=blue\\", \\"x-men\\":\\"wolverine\\"}"'
    ),
    JSON.parse
  )
  .option(
    '-n, --number-runs <number>',
    descriptionHelper('Number of Lighthouse runs per URL'),
    parseIntArg,
    1
  )
  .option(
    '--output-target <string>',
    descriptionHelper('Location to save results'),
    'results'
  )
  .option(
    '--output-format [string...]',
    descriptionHelper('Save results as CSV, HTML, and/or MD')
  )
  .option(
    '--repository-id <string>',
    descriptionHelper('Name of the repository file'),
    'lighthouse-runs'
  )
  .usage('http://neopets.com')
  .action((targetUrl: string, options: any) => {
    new ProfileScenario().enter({
      ...options,
      targetUrl,
      outputFormat: options.outputFormat
        ? options.outputFormat.map((format: string) => format.toLowerCase())
        : [],
      outputTarget: options.outputTarget ? options.outputTarget : process.cwd(),
    });
  });

program.parse();
