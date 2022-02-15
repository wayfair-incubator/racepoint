import {RegisteredEndpoint} from './server/utils';
import {FetchEndpoint} from './controllers/fetch';
import {FingerprintEndpoint} from './controllers/fingerprint';
import {ProfileEndpoint} from './controllers/profile';
import {ResultsGet, ResultsDelete} from './controllers/results';
import {initialize} from './server';

//start server, parse url, match the first segment against one of our controllers

const endpoints: RegisteredEndpoint<any>[] = [
  FetchEndpoint,
  FingerprintEndpoint,
  ProfileEndpoint,
  ResultsGet,
  ResultsDelete,
];

const goSpeedRacer = async () => {
  const server = initialize(endpoints);
  console.log('Go Speed Racer Go');
  server.listen(3000);
};
goSpeedRacer();
