import {RegisteredEndpoint} from './server/utils';
import {FetchEndpoint} from './controllers/fetch';
import {ProfileEndpoint} from './controllers/profile';
import {FlowEndpoint} from './controllers/flow';
import {ResultsGet, ResultsDelete} from './controllers/results';
import {initialize} from './server';

//start server, parse url, match the first segment against one of our controllers

const endpoints: RegisteredEndpoint<any>[] = [
  FetchEndpoint,
  ProfileEndpoint,
  FlowEndpoint,
  ResultsGet,
  ResultsDelete,
];

const goSpeedRacer = async () => {
  const server = initialize(endpoints);
  console.log('Go Speed Racer Go!!!');
  server.listen(process.env?.RACER_PORT || 3000);
};

goSpeedRacer();
