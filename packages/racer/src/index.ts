import {initialize} from './server';

//start server, parse url, match the first segment against one of our controllers

const goSpeedRacer = async () => {
  const server = initialize();
  console.log('Go Speed Racer Go');
  server.listen(3000);
};
goSpeedRacer();
