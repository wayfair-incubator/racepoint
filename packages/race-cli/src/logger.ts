import {createLogger, format, transports} from 'winston';

const customFormat = format.combine(
  format.printf((log) => log.message),
  format.colorize({all: true})
);

const logger = createLogger();

// Enable debug logs or info only
if (process.env.LOG_LEVEL === 'debug') {
  logger.add(
    new transports.Console({
      level: 'debug',
      format: customFormat,
    })
  );
} else {
  logger.add(
    new transports.Console({
      level: 'info',
      format: customFormat,
    })
  );
}

export default logger;
