export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private level: LogLevel;
  private isVerbose: boolean = false;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  setVerbose(verbose: boolean): void {
    this.isVerbose = verbose;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      const prefix = this.isVerbose ? '[DEBUG]' : '';
      console.log(`${prefix}${prefix ? ' ' : ''}${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      const prefix = this.isVerbose ? '[INFO]' : '';
      console.log(`${prefix}${prefix ? ' ' : ''}${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.log(`⚠️  ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.log(`❌ ${message}`, ...args);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Configure logging level from environment
if (process.env.NODE_ENV === 'development') {
  logger.setVerbose(true);
}