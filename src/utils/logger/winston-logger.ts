import { createLogger, format, transports } from "winston";
import { Logger, LogMetadata } from "./index";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "development" ? "debug" : "warn";
};

// Define custom format
const customFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : "";
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`;
  })
);

// Create Winston logger
const winstonLogger = createLogger({
  level: level(),
  levels,
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    // Write logs to console
    new transports.Console({
      format: format.combine(
        format.colorize(),
        customFormat
      ),
    }),
    // Write errors to error.log
    new transports.File({ 
      filename: "logs/error.log", 
      level: "error",
      format: customFormat
    }),
    // Write all logs to combined.log
    new transports.File({ 
      filename: "logs/combined.log",
      format: customFormat 
    }),
  ],
});

// Winston logger wrapper that implements our Logger interface
export class WinstonLogger implements Logger {
  debug(message: string, meta?: LogMetadata): void {
    winstonLogger.debug(message, meta);
  }

  info(message: string, meta?: LogMetadata): void {
    winstonLogger.info(message, meta);
  }

  warn(message: string, meta?: LogMetadata): void {
    winstonLogger.warn(message, meta);
  }

  error(message: string, meta?: LogMetadata): void {
    winstonLogger.error(message, meta);
  }
}

// Create and export a default logger
export const logger: Logger = new WinstonLogger(); 