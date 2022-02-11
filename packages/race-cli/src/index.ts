#! /usr/bin/env node
import commander from 'commander';
import {argumentHelper, descriptionHelper, raceLogo} from './cli-helpers';
import {RunScenario} from './run-scenario';

const program = new commander.Command();

function parseIntArg(value: any) {
  // parseInt takes a string and a radix
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new commander.InvalidArgumentError('Not a number.');
  }
  return parsedValue;
}

// function myParseURL(value: any) {
//   if (typeof value === 'string' && value?.startsWith('http')) {
//     return value;
//   } else {
//     throw new commander.InvalidArgumentError('Not a valid URL.');
//   }
// }

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
  .command('run')
  .description(
    descriptionHelper('Perform a number of Lighthouse runs against a target')
  )
  .argument('<url>', argumentHelper('URL to race'))
  .showHelpAfterError()
  // Keep these alphabetical
  .option(
    '--chrome-flags <string>',
    descriptionHelper(
      'Chrome flags for the emulated browser. Will be merged with defaults unless --override-chrome-flags parameter is used.'
    )
  )
  .option(
    '-d, --device-type <device>',
    descriptionHelper('Device type to emulate'),
    'Mobile'
  )
  .option(
    '-n, --number-runs <number>',
    descriptionHelper('Number of Lighthouse runs per URL'),
    parseIntArg,
    1
  )
  .option(
    '--output-location <string>',
    descriptionHelper('Location to save results')
  )
  .option(
    '--output-format <string>',
    descriptionHelper('Save results as JSON or HTML'),
    'JSON'
  )
  // Does this make sense? Most people don't want to override the basics ie. headless, disable-gpu, etc. but they should have a way to do so
  .option(
    '--override-chrome-flags <bool>',
    descriptionHelper(
      'Override existing default Chrome flags for browser and only use passed in flags'
    ),
    false
  )
  .option(
    '--raceproxy-port <number>',
    descriptionHelper('Port to start the raceproxy container'),
    '443'
  )
  .option(
    '--racer-port <number>',
    descriptionHelper('Port to start the racer container'),
    '3000'
  )
  .usage('http://neopets.com')
  .action((url: string, options: any) => {
    new RunScenario().enter({
      url,
      ...options,
    });
  });

// program
//   .command('start')
//   .description(
//     descriptionHelper('Initialize a Race-point reverse proxy server')
//   )
//   .option('-p, --port <number>', 'Port to start on', 80)
//   // .argument('<url>', 'URL to race')
//   .action((str: any, options: any) => {
//     console.log(str, options);
//   });

// program
//   .command('get')
//   .description(descriptionHelper('Retrieve a result from the data store'))
//   .argument('<jobId>', 'Job ID')
//   .action((str: any, options: any) => {
//     console.log(str, options);
//   });

program.parse();
