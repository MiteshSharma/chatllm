// Strongly typed logger setup
export interface LogMetadata {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, meta?: LogMetadata): void;
  info(message: string, meta?: LogMetadata): void;
  warn(message: string, meta?: LogMetadata): void;
  error(message: string, meta?: LogMetadata): void;
}

// Simple console logger implementation
export class ConsoleLogger implements Logger {
  debug(message: string, meta?: LogMetadata): void {
    console.debug(message, meta ? JSON.stringify(meta) : "");
  }

  info(message: string, meta?: LogMetadata): void {
    console.info(message, meta ? JSON.stringify(meta) : "");
  }

  warn(message: string, meta?: LogMetadata): void {
    console.warn(message, meta ? JSON.stringify(meta) : "");
  }

  error(message: string, meta?: LogMetadata): void {
    console.error(message, meta ? JSON.stringify(meta) : "");
  }
}

// Create and export a default logger
export const logger: Logger = new ConsoleLogger();
