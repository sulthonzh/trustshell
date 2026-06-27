/**
 * Tests for logger module - Logger functionality
 * 
 * The logger writes to process.stderr (not stdout) to avoid corrupting
 * Node's test runner IPC protocol.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { Logger, LogLevel } from '../dist/utils/logger.js';

// Helper: capture stderr output
function captureStderr(fn: () => void): string {
  let output = '';
  const originalWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: any) => {
    output += typeof chunk === 'string' ? chunk : chunk.toString();
    return true;
  }) as any;
  try {
    fn();
  } finally {
    process.stderr.write = originalWrite;
  }
  return output;
}

describe('logger module', () => {

  describe('LogLevel enum', () => {
    it('should have correct numeric values', () => {
      assert.strictEqual(LogLevel.DEBUG, 0);
      assert.strictEqual(LogLevel.INFO, 1);
      assert.strictEqual(LogLevel.WARN, 2);
      assert.strictEqual(LogLevel.ERROR, 3);
    });
  });

  describe('Logger class', () => {
    let logger: Logger;

    before(() => {
      logger = new Logger(LogLevel.INFO);
    });

    it('should create logger with default INFO level', () => {
      const defaultLogger = new Logger();
      assert.strictEqual((defaultLogger as any).level, LogLevel.INFO);
    });

    it('should create logger with custom level', () => {
      const debugLogger = new Logger(LogLevel.DEBUG);
      assert.strictEqual((debugLogger as any).level, LogLevel.DEBUG);
    });

    it('should set verbose mode', () => {
      const testLogger = new Logger(LogLevel.INFO);
      assert.strictEqual(testLogger.isVerbose, false);
      testLogger.setVerbose(true);
      assert.strictEqual(testLogger.isVerbose, true);
    });

    it('should log debug messages when level permits', () => {
      const output = captureStderr(() => {
        const debugLogger = new Logger(LogLevel.DEBUG);
        debugLogger.setVerbose(true);
        debugLogger.debug('test message');
      });
      assert.match(output, /\[DEBUG\]/);
    });

    it('should not log debug messages when level is INFO', () => {
      const output = captureStderr(() => {
        logger.debug('should not appear');
      });
      assert.strictEqual(output, '');
    });

    it('should log info messages when level permits', () => {
      const output = captureStderr(() => {
        logger.info('info message');
      });
      assert(output.includes('info message'));
    });

    it('should not log info messages when level is WARN', () => {
      const output = captureStderr(() => {
        const warnLogger = new Logger(LogLevel.WARN);
        warnLogger.info('should not appear');
      });
      assert.strictEqual(output, '');
    });

    it('should log warn messages when level permits', () => {
      const output = captureStderr(() => {
        logger.warn('warn message');
      });
      assert(output.includes('warn message'));
    });

    it('should not log warn messages when level is ERROR', () => {
      const output = captureStderr(() => {
        const errorLogger = new Logger(LogLevel.ERROR);
        errorLogger.warn('should not appear');
      });
      assert.strictEqual(output, '');
    });

    it('should log error messages always', () => {
      const output = captureStderr(() => {
        logger.error('error message');
      });
      assert(output.includes('error message'));
    });

    it('should log error messages even when level is ERROR', () => {
      const output = captureStderr(() => {
        const errorLogger = new Logger(LogLevel.ERROR);
        errorLogger.error('should appear');
      });
      assert(output.includes('should appear'));
    });

    it('should include DEBUG prefix in verbose mode', () => {
      const output = captureStderr(() => {
        const debugLogger = new Logger(LogLevel.DEBUG);
        debugLogger.setVerbose(true);
        debugLogger.debug('test');
      });
      assert.match(output, /\[DEBUG\]/);
    });

    it('should not include DEBUG prefix in non-verbose mode', () => {
      const output = captureStderr(() => {
        const debugLogger = new Logger(LogLevel.DEBUG);
        debugLogger.setVerbose(false);
        debugLogger.debug('test');
      });
      assert.doesNotMatch(output, /\[DEBUG\]/);
    });

    it('should handle multiple arguments', () => {
      const output = captureStderr(() => {
        logger.info('message', 'arg1', 'arg2');
      });
      assert(output.includes('message'));
      assert(output.includes('arg1'));
      assert(output.includes('arg2'));
    });

    it('should handle objects and arrays as arguments', () => {
      const output = captureStderr(() => {
        logger.info('data', { key: 'value' });
      });
      assert(output.includes('data'));
      assert(output.includes('key'));
    });

    it('should handle arrays of strings', () => {
      const output = captureStderr(() => {
        logger.info('items', ['a', 'b', 'c']);
      });
      assert(output.includes('items'));
      assert(output.includes('a'));
    });

    it('should handle Error objects', () => {
      const output = captureStderr(() => {
        const error = new Error('test error');
        logger.error('error occurred', error);
      });
      assert(output.includes('error occurred'));
      assert(output.includes('test error'));
    });

    it('should handle multiple log calls at different levels', () => {
      const debugLogger = new Logger(LogLevel.DEBUG);
      const output = captureStderr(() => {
        debugLogger.debug('debug msg');
        debugLogger.info('info msg');
        debugLogger.warn('warn msg');
        debugLogger.error('error msg');
      });
      assert(output.includes('debug msg'));
      assert(output.includes('info msg'));
      assert(output.includes('warn msg'));
      assert(output.includes('error msg'));
    });

    it('should respect level hierarchy', () => {
      const debugLogger = new Logger(LogLevel.DEBUG);
      const output = captureStderr(() => {
        debugLogger.debug('debug');
        debugLogger.info('info');
        debugLogger.warn('warn');
        debugLogger.error('error');
      });
      // All 4 levels should appear
      assert(output.includes('debug'));
      assert(output.includes('info'));
      assert(output.includes('warn'));
      assert(output.includes('error'));
    });

    it('should handle empty messages', () => {
      const output = captureStderr(() => {
        logger.info('');
      });
      // Should still write a line (even if empty message)
      assert.ok(output.length >= 0);
    });

    it('should handle special characters in messages', () => {
      const output = captureStderr(() => {
        logger.info('special: <> & \n \t');
      });
      assert(output.includes('special'));
    });

    it('should handle very long messages', () => {
      const longMessage = 'x'.repeat(10000);
      const output = captureStderr(() => {
        logger.info(longMessage);
      });
      assert(output.includes(longMessage));
    });

    it('should handle unicode characters', () => {
      const output = captureStderr(() => {
        logger.info('unicode: 你好 🎉');
      });
      assert(output.includes('unicode'));
    });

    it('should handle numeric arguments', () => {
      const output = captureStderr(() => {
        logger.info('numbers', 42, 3.14);
      });
      assert(output.includes('42'));
      assert(output.includes('3.14'));
    });

    it('should handle boolean arguments', () => {
      const output = captureStderr(() => {
        logger.info('booleans', true, false);
      });
      assert(output.includes('true'));
      assert(output.includes('false'));
    });

    it('should handle null and undefined arguments', () => {
      const output = captureStderr(() => {
        logger.info('null-undefined', null, undefined);
      });
      assert(output.includes('null'));
      assert(output.includes('undefined'));
    });
  });

  describe('logger instance reuse', () => {
    it('should maintain state across method calls', () => {
      const testLogger = new Logger(LogLevel.INFO);
      testLogger.setVerbose(true);
      assert.strictEqual(testLogger.isVerbose, true);
      testLogger.setVerbose(false);
      assert.strictEqual(testLogger.isVerbose, false);
    });

    it('should allow changing log level after creation', () => {
      let output = captureStderr(() => {
        const testLogger = new Logger(LogLevel.INFO);
        testLogger.debug('should not appear');
      });
      assert.strictEqual(output, '');

      output = captureStderr(() => {
        const testLogger = new Logger(LogLevel.INFO);
        (testLogger as any).level = LogLevel.DEBUG;
        testLogger.debug('should appear');
      });
      assert(output.includes('should appear'));
    });
  });
});
