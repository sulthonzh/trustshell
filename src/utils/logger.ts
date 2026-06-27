export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

function formatArg(arg: any): string {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (arg instanceof Error) return arg.message;
  if (typeof arg === 'object') {
    try { return JSON.stringify(arg); } catch { return String(arg); }
  }
  return String(arg);
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
      process.stderr.write(`${prefix}${prefix ? ' ' : ''}${message}${args.length ? ' ' + args.map(formatArg).join(' ') : ''}\n`);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      const prefix = this.isVerbose ? '[INFO]' : '';
      process.stderr.write(`${prefix}${prefix ? ' ' : ''}${message}${args.length ? ' ' + args.map(formatArg).join(' ') : ''}\n`);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      process.stderr.write(`⚠️  ${message}${args.length ? ' ' + args.map(formatArg).join(' ') : ''}\n`);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      process.stderr.write(`❌ ${message}${args.length ? ' ' + args.map(formatArg).join(' ') : ''}\n`);
    }
  }
}

// Export singleton instance
// Suppress all logging during tests to avoid corrupting Node's test runner IPC
const isTest = process.env.NODE_ENV === 'test' || !!process.env.NODE_TEST_CONTEXT;
export const logger = new Logger(isTest ? LogLevel.ERROR : LogLevel.INFO);

// Configure logging level from environment
if (process.env.NODE_ENV === 'development') {
  logger.setVerbose(true);
}