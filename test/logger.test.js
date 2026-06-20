import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { Logger, LogLevel } from '../dist/utils/logger.js';
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
        let logger;
        let consoleLogSpy;
        let originalConsoleLog;
        before(() => {
            originalConsoleLog = console.log;
            logger = new Logger(LogLevel.INFO);
        });
        after(() => {
            console.log = originalConsoleLog;
        });
        it('should create logger with default INFO level', () => {
            const defaultLogger = new Logger();
            assert.strictEqual(defaultLogger.level, LogLevel.INFO);
        });
        it('should create logger with custom level', () => {
            const debugLogger = new Logger(LogLevel.DEBUG);
            assert.strictEqual(debugLogger.level, LogLevel.DEBUG);
        });
        it('should set verbose mode', () => {
            const testLogger = new Logger(LogLevel.INFO);
            assert.strictEqual(testLogger.isVerbose, false);
            testLogger.setVerbose(true);
            assert.strictEqual(testLogger.isVerbose, true);
        });
        it('should log debug messages when level permits', () => {
            console.log = (...args) => {
                assert.match(args[0], /\[DEBUG\]/);
            };
            const debugLogger = new Logger(LogLevel.DEBUG);
            debugLogger.debug('test message');
            console.log = originalConsoleLog;
        });
        it('should not log debug messages when level is INFO', () => {
            let called = false;
            console.log = () => { called = true; };
            logger.debug('should not appear');
            console.log = originalConsoleLog;
            assert.strictEqual(called, false);
        });
        it('should log info messages when level permits', () => {
            let called = false;
            let message = '';
            console.log = (...args) => {
                called = true;
                message = args[0];
            };
            logger.info('info message');
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
            assert(message.includes('info message'));
        });
        it('should not log info messages when level is WARN', () => {
            let called = false;
            console.log = () => { called = true; };
            const warnLogger = new Logger(LogLevel.WARN);
            warnLogger.info('should not appear');
            console.log = originalConsoleLog;
            assert.strictEqual(called, false);
        });
        it('should log warn messages when level permits', () => {
            let called = false;
            let message = '';
            console.log = () => {
                called = true;
                message = arguments[0];
            };
            logger.warn('warn message');
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
            assert(message.includes('warn message'));
        });
        it('should not log warn messages when level is ERROR', () => {
            let called = false;
            console.log = () => { called = true; };
            const errorLogger = new Logger(LogLevel.ERROR);
            errorLogger.warn('should not appear');
            console.log = originalConsoleLog;
            assert.strictEqual(called, false);
        });
        it('should log error messages always', () => {
            let called = false;
            let message = '';
            console.log = () => {
                called = true;
                message = arguments[0];
            };
            logger.error('error message');
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
            assert(message.includes('error message'));
        });
        it('should log error messages even when level is ERROR', () => {
            let called = false;
            console.log = () => { called = true; };
            const errorLogger = new Logger(LogLevel.ERROR);
            errorLogger.error('should appear');
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should include DEBUG prefix in verbose mode', () => {
            console.log = (...args) => {
                assert.match(args[0], /\[DEBUG\]/);
            };
            const debugLogger = new Logger(LogLevel.DEBUG);
            debugLogger.setVerbose(true);
            debugLogger.debug('test');
            console.log = originalConsoleLog;
        });
        it('should not include DEBUG prefix in non-verbose mode', () => {
            console.log = (...args) => {
                assert.doesNotMatch(args[0], /\[DEBUG\]/);
            };
            const debugLogger = new Logger(LogLevel.DEBUG);
            debugLogger.setVerbose(false);
            debugLogger.debug('test');
            console.log = originalConsoleLog;
        });
        it('should handle multiple arguments', () => {
            let called = false;
            console.log = (...args) => {
                called = true;
                assert.strictEqual(args.length, 3);
                assert.strictEqual(args[0], 'message');
                assert.strictEqual(args[1], 'arg1');
                assert.strictEqual(args[2], 'arg2');
            };
            logger.info('message', 'arg1', 'arg2');
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should handle objects and arrays as arguments', () => {
            let called = false;
            console.log = (...args) => {
                called = true;
                assert.strictEqual(args.length, 2);
                assert.deepStrictEqual(args[1], { key: 'value' });
            };
            logger.info('data', { key: 'value' });
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should handle arrays of strings', () => {
            let called = false;
            console.log = (...args) => {
                called = true;
                assert.deepStrictEqual(args[1], ['a', 'b', 'c']);
            };
            logger.info('items', ['a', 'b', 'c']);
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should handle Error objects', () => {
            let called = false;
            const error = new Error('test error');
            console.log = (...args) => {
                called = true;
                assert(args[1] instanceof Error);
                assert.strictEqual(args[1].message, 'test error');
            };
            logger.error('error occurred', error);
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should handle multiple log calls at different levels', () => {
            let calls = [];
            console.log = (...args) => {
                calls.push(args[0]);
            };
            const debugLogger = new Logger(LogLevel.DEBUG);
            debugLogger.debug('debug msg');
            debugLogger.info('info msg');
            debugLogger.warn('warn msg');
            debugLogger.error('error msg');
            console.log = originalConsoleLog;
            assert.strictEqual(calls.length, 4);
            assert(calls.some((call) => call.includes('debug msg')));
            assert(calls.some((call) => call.includes('info msg')));
            assert(calls.some((call) => call.includes('warn msg')));
            assert(calls.some((call) => call.includes('error msg')));
        });
        it('should respect level hierarchy', () => {
            const calls = [];
            console.log = (...args) => {
                const arg = args[0];
                if (typeof arg === 'string') {
                    calls.push({ level: arg.includes('[DEBUG]') ? 'DEBUG' : arg.includes('[INFO]') ? 'INFO' : arg.includes('[WARN]') ? 'WARN' : 'ERROR', message: arg });
                }
            };
            const debugLogger = new Logger(LogLevel.DEBUG);
            debugLogger.debug('debug');
            debugLogger.info('info');
            debugLogger.warn('warn');
            debugLogger.error('error');
            console.log = originalConsoleLog;
            assert.strictEqual(calls.length, 4);
        });
        it('should handle empty messages', () => {
            let called = false;
            console.log = () => { called = true; };
            logger.info('');
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should handle special characters in messages', () => {
            let called = false;
            console.log = (...args) => {
                called = true;
                assert.match(args[0], /special: .*.*. \n \t/);
            };
            logger.info('special: <> & \n \t');
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should handle very long messages', () => {
            let called = false;
            const longMessage = 'x'.repeat(10000);
            console.log = (...args) => {
                called = true;
                assert(args[0].includes(longMessage));
            };
            logger.info(longMessage);
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should handle unicode characters', () => {
            let called = false;
            console.log = (...args) => {
                called = true;
                assert(args[0].includes('unicode: 你好 🎉'));
            };
            logger.info('unicode: 你好 🎉');
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should handle numeric arguments', () => {
            let called = false;
            console.log = (...args) => {
                called = true;
                assert.strictEqual(args[1], 42);
                assert.strictEqual(args[2], 3.14);
            };
            logger.info('numbers', 42, 3.14);
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should handle boolean arguments', () => {
            let called = false;
            console.log = (...args) => {
                called = true;
                assert.strictEqual(args[1], true);
                assert.strictEqual(args[2], false);
            };
            logger.info('booleans', true, false);
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
        });
        it('should handle null and undefined arguments', () => {
            let called = false;
            console.log = (...args) => {
                called = true;
                assert.strictEqual(args[1], null);
                assert.strictEqual(args[2], undefined);
            };
            logger.info('null-undefined', null, undefined);
            console.log = originalConsoleLog;
            assert.strictEqual(called, true);
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
            let debugCalled = false;
            console.log = () => { debugCalled = true; };
            const testLogger = new Logger(LogLevel.INFO);
            testLogger.debug('should not appear');
            assert.strictEqual(debugCalled, false);
            testLogger.level = LogLevel.DEBUG;
            testLogger.debug('should appear');
            assert.strictEqual(debugCalled, true);
            console.log = originalConsoleLog;
        });
    });
});
//# sourceMappingURL=logger.test.js.map