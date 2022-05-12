import {createLogger, format, transports} from 'winston';

const customFormat = format.combine(
  format.printf((log) => log.message),
  format.colorize({all: true})
);

const logger = createLogger({
  transports: [
    new transports.Console({
      level: 'info',
      format: customFormat,
    }),
  ],
});

export default logger;
