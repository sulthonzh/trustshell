/**
 * Coverage gaps Round 8 — logger.ts verbose prefixes + formatArg circular,
 * index.ts process handlers and error paths (in-process coverage via c8)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Logger, LogLevel } from '../dist/utils/logger.js';

// Helper: capture stderr output
function captureStderr(fn: () => void): string {
  let output = '';
  const originalWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: unknown) => {
    output += typeof chunk === 'string' ? chunk : (chunk as Buffer).toString();
    return true;
  }) as typeof process.stderr.write;
  try {
    fn();
  } finally {
    process.stderr.write = originalWrite;
  }
  return output;
}

describe('Logger coverage gaps - verbose prefixes and formatArg', () => {
  it('should include [INFO] prefix in verbose mode', () => {
    const log = new Logger(LogLevel.INFO);
    log.setVerbose(true);
    const out = captureStderr(() => log.info('hello'));
    assert.match(out, /\[INFO\]/);
    assert(out.includes('hello'));
  });

  it('should include [INFO] prefix with args in verbose mode', () => {
    const log = new Logger(LogLevel.INFO);
    log.setVerbose(true);
    const out = captureStderr(() => log.info('msg', { a: 1 }));
    assert.match(out, /\[INFO\]/);
    assert(out.includes('msg'));
    assert(out.includes('"a"'));
  });

  it('should not include [INFO] prefix in non-verbose mode', () => {
    const log = new Logger(LogLevel.INFO);
    log.setVerbose(false);
    const out = captureStderr(() => log.info('hello'));
    assert.doesNotMatch(out, /\[INFO\]/);
    assert(out.includes('hello'));
  });

  it('should include [DEBUG] prefix with args in verbose mode', () => {
    const log = new Logger(LogLevel.DEBUG);
    log.setVerbose(true);
    const out = captureStderr(() => log.debug('dbg', 'extra'));
    assert.match(out, /\[DEBUG\]/);
    assert(out.includes('dbg'));
    assert(out.includes('extra'));
  });

  it('should include [INFO] prefix in verbose mode when level is DEBUG', () => {
    const log = new Logger(LogLevel.DEBUG);
    log.setVerbose(true);
    const out = captureStderr(() => log.info('info-msg'));
    assert.match(out, /\[INFO\]/);
  });

  it('should handle warn with args', () => {
    const log = new Logger(LogLevel.WARN);
    const out = captureStderr(() => log.warn('warn-msg', 'detail'));
    assert(out.includes('warn-msg'));
    assert(out.includes('detail'));
  });

  it('should handle error with args', () => {
    const log = new Logger(LogLevel.ERROR);
    const out = captureStderr(() => log.error('err-msg', 'detail'));
    assert(out.includes('err-msg'));
    assert(out.includes('detail'));
  });

  it('should handle circular object in formatArg (JSON.stringify catch)', () => {
    const log = new Logger(LogLevel.INFO);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    // Should not throw — falls back to String(obj)
    const out = captureStderr(() => log.info('circular', circular));
    assert(out.includes('circular'));
    // String([object Object]) appears in output
    assert(out.includes('[object Object]') || out.includes('self'));
  });

  it('should handle debug in verbose mode with no prefix space when prefix is empty', () => {
    const log = new Logger(LogLevel.DEBUG);
    log.setVerbose(false);
    const out = captureStderr(() => log.debug('no-prefix'));
    // No [DEBUG] prefix, just the message
    assert(out.includes('no-prefix'));
    assert.doesNotMatch(out, /\[DEBUG\]/);
  });

  it('should handle info with no args (empty args.length branch)', () => {
    const log = new Logger(LogLevel.INFO);
    const out = captureStderr(() => log.info('just-message'));
    assert(out.includes('just-message'));
    // Should end with newline, no trailing space
    assert(out.trimEnd().endsWith('just-message'));
  });

  it('should handle debug with no args in verbose mode', () => {
    const log = new Logger(LogLevel.DEBUG);
    log.setVerbose(true);
    const out = captureStderr(() => log.debug('just-debug'));
    assert.match(out, /\[DEBUG\]/);
    assert(out.includes('just-debug'));
  });

  it('should handle warn with no args', () => {
    const log = new Logger(LogLevel.WARN);
    const out = captureStderr(() => log.warn('just-warn'));
    assert(out.includes('just-warn'));
    assert(out.includes('⚠️'));
  });

  it('should handle error with no args', () => {
    const log = new Logger(LogLevel.ERROR);
    const out = captureStderr(() => log.error('just-error'));
    assert(out.includes('just-error'));
    assert(out.includes('❌'));
  });
});

describe('Logger - formatArg edge cases', () => {
  it('should format null argument', () => {
    const log = new Logger(LogLevel.INFO);
    const out = captureStderr(() => log.info('test', null));
    assert(out.includes('null'));
  });

  it('should format undefined argument', () => {
    const log = new Logger(LogLevel.INFO);
    const out = captureStderr(() => log.info('test', undefined));
    assert(out.includes('undefined'));
  });

  it('should format Error argument', () => {
    const log = new Logger(LogLevel.INFO);
    const out = captureStderr(() => log.info('test', new Error('boom')));
    assert(out.includes('boom'));
  });

  it('should format object argument via JSON.stringify', () => {
    const log = new Logger(LogLevel.INFO);
    const out = captureStderr(() => log.info('test', { key: 'val' }));
    assert(out.includes('key'));
    assert(out.includes('val'));
  });

  it('should format primitive argument via String()', () => {
    const log = new Logger(LogLevel.INFO);
    const out = captureStderr(() => log.info('test', 42));
    assert(out.includes('42'));
  });
});
