#! /usr/bin/env node
import commander from 'commander';
import {
  argumentHelper,
  descriptionHelper,
  raceLogo,
  parseIntArg,
  parseUrlArg,
} from './helpers';
import {ProfileScenario, PROFILE_COMMAND} from './profile';

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
  .argument('<targetUrl>', argumentHelper('URL to race'), parseUrlArg)
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
  .action((targetUrl: string, options: any) => {
    new ProfileScenario().enter({
      targetUrl,
      ...options,
    });
  });

program.parse();