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

// Enable debug logs
if (process.env.LOG_LEVEL === 'debug') {
  logger.add(
    new transports.Console({
      level: 'debug',
      format: format.printf((log) => log.message),
    })
  );
}

export default logger;
