/**
 * Coverage gaps round 10 — executor.ts lines 37-42, 47-61, 66-82, 87-89, 299-305
 * tester.ts additional matcher coverage
 *
 * Strategy: Monkey-patch child_process.spawn BEFORE dynamically importing
 * executor module inside before hooks. This avoids top-level await.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'events';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';

// Use createRequire to get a mutable CJS namespace — ESM imports are frozen (read-only)
// so `childProcess.spawn = mock` fails with "Cannot assign to read only property".
// executor.ts also uses createRequire for the same module object, so monkey-patching
// here affects executor's calls too.
const childProcess = createRequire(import.meta.url)('child_process') as typeof import('child_process');

const originalSpawn = childProcess.spawn;

function createMockSpawn(opts: {
  stdoutData?: Buffer[];
  stderrData?: Buffer[];
  exitCode?: number;
  delay?: number;
  hang?: boolean;
  trackStdin?: boolean;
}) {
  const tracker = { stdinWritten: false, stdinEnded: false };
  const fn = function mockSpawn(..._args: unknown[]) {
    const ee = new EventEmitter() as any;
    ee.pid = 12345;
    ee.killed = false;
    ee.kill = (_sig?: string) => { ee.killed = true; return true; };
    ee.stdout = new EventEmitter();
    ee.stderr = new EventEmitter();
    ee.stdin = opts.trackStdin ? {
      write: (_d: unknown) => { tracker.stdinWritten = true; return true; },
      end: () => { tracker.stdinEnded = true; }
    } : { write: () => true, end: () => {} };

    if (opts.hang) return ee;

    const delay = opts.delay ?? 10;
    setTimeout(() => {
      for (const d of opts.stdoutData ?? []) ee.stdout.emit('data', d);
      for (const d of opts.stderrData ?? []) ee.stderr.emit('data', d);
      setTimeout(() => ee.emit('close', opts.exitCode ?? 0), delay);
    }, delay);
    return ee;
  };
  return { fn, tracker };
}

describe('executor.ts — stdout/stderr/close handlers (lines 37-61)', () => {
  let executeCode: (filePath: string, language: string, options: { timeout: number; input?: string; cwd?: string }) => Promise<{ output: string; error?: string; exitCode: number }>;

  before(async () => {
    childProcess.spawn = createMockSpawn({
      stdoutData: [Buffer.from('hello world output')],
      exitCode: 0,
      delay: 5
    }).fn as any;
    const mod = await import('../dist/utils/executor.js');
    executeCode = mod.executeCode;
  });

  after(() => { childProcess.spawn = originalSpawn; });

  it('captures stdout data via handler (line 37)', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 't.js');
    writeFileSync(f, 'console.log("hello");');
    const result = await executeCode(f, 'javascript', { timeout: 5000 });
    assert.strictEqual(result.output, 'hello world output');
    assert.strictEqual(result.exitCode, 0);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('executor.ts — stderr handler (line 42)', () => {
  let executeCode: (filePath: string, language: string, options: { timeout: number; input?: string }) => Promise<{ output: string; error?: string; exitCode: number }>;

  before(async () => {
    childProcess.spawn = createMockSpawn({
      stdoutData: [Buffer.from('normal output')],
      stderrData: [Buffer.from('warning message')],
      exitCode: 0,
      delay: 5
    }).fn as any;
    const mod = await import('../dist/utils/executor.js');
    executeCode = mod.executeCode;
  });

  after(() => { childProcess.spawn = originalSpawn; });

  it('captures stderr data and includes in error (line 42)', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 't.js');
    writeFileSync(f, 'console.error("warn");');
    const result = await executeCode(f, 'javascript', { timeout: 5000 });
    assert.ok(result.error!.includes('warning message'));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('executor.ts — non-zero exit code (lines 47-61)', () => {
  let executeCode: (filePath: string, language: string, options: { timeout: number }) => Promise<{ output: string; error?: string; exitCode: number }>;

  before(async () => {
    childProcess.spawn = createMockSpawn({
      stdoutData: [Buffer.from('done')],
      exitCode: 42,
      delay: 5
    }).fn as any;
    const mod = await import('../dist/utils/executor.js');
    executeCode = mod.executeCode;
  });

  after(() => { childProcess.spawn = originalSpawn; });

  it('returns non-zero exit code from close event', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 't.js');
    writeFileSync(f, 'process.exit(42);');
    const result = await executeCode(f, 'javascript', { timeout: 5000 });
    assert.strictEqual(result.exitCode, 42);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('executor.ts — empty stderr → undefined error (line 59)', () => {
  let executeCode: (filePath: string, language: string, options: { timeout: number }) => Promise<{ output: string; error?: string; exitCode: number }>;

  before(async () => {
    childProcess.spawn = createMockSpawn({
      stdoutData: [Buffer.from('clean')],
      stderrData: [],
      exitCode: 0,
      delay: 5
    }).fn as any;
    const mod = await import('../dist/utils/executor.js');
    executeCode = mod.executeCode;
  });

  after(() => { childProcess.spawn = originalSpawn; });

  it('returns undefined error when stderr is empty', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 't.js');
    writeFileSync(f, 'console.log("clean");');
    const result = await executeCode(f, 'javascript', { timeout: 5000 });
    assert.strictEqual(result.error, undefined);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('executor.ts — timeout handler (lines 66-82)', () => {
  let executeCode: (filePath: string, language: string, options: { timeout: number }) => Promise<{ output: string; error?: string; exitCode: number }>;

  before(async () => {
    childProcess.spawn = createMockSpawn({ hang: true }).fn as any;
    const mod = await import('../dist/utils/executor.js');
    executeCode = mod.executeCode;
  });

  after(() => { childProcess.spawn = originalSpawn; });

  it('rejects with timeout error and kills process', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 't.js');
    writeFileSync(f, 'while(true){}');
    await assert.rejects(
      () => executeCode(f, 'javascript', { timeout: 50 }),
      (err: Error) => {
        assert.ok(err.message.includes('timed out'));
        assert.ok(err.message.includes('50ms'));
        return true;
      }
    );
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('executor.ts — stdin input (lines 87-89)', () => {
  let executeCode: (filePath: string, language: string, options: { timeout: number; input?: string }) => Promise<{ output: string; error?: string; exitCode: number }>;
  let tracker: { stdinWritten: boolean; stdinEnded: boolean };

  before(async () => {
    const mock = createMockSpawn({
      stdoutData: [Buffer.from('output')],
      exitCode: 0,
      delay: 5,
      trackStdin: true
    });
    tracker = mock.tracker;
    childProcess.spawn = mock.fn as any;
    const mod = await import('../dist/utils/executor.js');
    executeCode = mod.executeCode;
  });

  after(() => { childProcess.spawn = originalSpawn; });

  it('writes input to stdin', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 't.js');
    writeFileSync(f, 'console.log("x");');
    const result = await executeCode(f, 'javascript', { timeout: 5000, input: 'test-input' });
    assert.ok(tracker.stdinWritten, 'stdin.write called');
    assert.ok(tracker.stdinEnded, 'stdin.end called');
    assert.strictEqual(result.output, 'output');
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('executor.ts — cleanupScript on close (lines 53-55, 299-305)', () => {
  let executeCode: (filePath: string, language: string, options: { timeout: number }) => Promise<{ output: string; error?: string; exitCode: number }>;

  before(async () => {
    childProcess.spawn = createMockSpawn({
      stdoutData: [Buffer.from('done')],
      exitCode: 0,
      delay: 5
    }).fn as any;
    const mod = await import('../dist/utils/executor.js');
    executeCode = mod.executeCode;
  });

  after(() => { childProcess.spawn = originalSpawn; });

  it('cleans up script on successful close', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 't.js');
    writeFileSync(f, 'console.log("done");');
    const result = await executeCode(f, 'javascript', { timeout: 5000 });
    assert.strictEqual(result.output, 'done');
    // Give cleanupScript async .catch() a tick to complete
    await new Promise(r => setTimeout(r, 100));
    rmSync(dir, { recursive: true, force: true });
  });
});

// --- tester.ts tests (no mock needed — generateAndRunBasicTests does static analysis) ---

import { runTests } from '../dist/tester/tester.js';

describe('tester.ts — Python generateAndRunBasicTests', () => {
  it('generates Python function validation tests', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 'app.py');
    writeFileSync(f, 'def add(a, b):\n    return a + b\n\ndef multiply(a, b):\n    return a * b\n');
    const result = await runTests(f, 'python', {});
    assert.ok(result.details.length > 0);
    const funcTest = result.details.find(d => d.name.includes('Function'));
    assert.ok(funcTest, 'should have function validation test');
    assert.strictEqual(funcTest!.status, 'passed');
    rmSync(dir, { recursive: true, force: true });
  });

  it('handles Python code with no functions', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 'empty.py');
    writeFileSync(f, '# just a comment\n');
    const result = await runTests(f, 'python', {});
    const funcTest = result.details.find(d => d.name.includes('Function'));
    if (funcTest) assert.strictEqual(funcTest.status, 'failed');
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('tester.ts — JS generateAndRunBasicTests edge cases', () => {
  it('handles JS with arrow functions but no async', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 'arrow.js');
    writeFileSync(f, 'const add = (a, b) => a + b;\nconst sub = (a, b) => a - b;\n');
    const result = await runTests(f, 'javascript', {});
    const arrowTest = result.details.find(d => d.name.includes('Arrow'));
    assert.ok(arrowTest);
    assert.strictEqual(arrowTest!.status, 'passed');
    rmSync(dir, { recursive: true, force: true });
  });

  it('handles JS with no functions (arrow test fails)', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 'empty.js');
    writeFileSync(f, '// just a comment\n');
    const result = await runTests(f, 'javascript', {});
    const arrowTest = result.details.find(d => d.name.includes('Arrow'));
    if (arrowTest) assert.strictEqual(arrowTest.status, 'failed');
    rmSync(dir, { recursive: true, force: true });
  });

  it('handles JS with async functions', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 'async.js');
    writeFileSync(f, 'async function fetchData() { return data; }\n');
    const result = await runTests(f, 'javascript', {});
    const asyncTest = result.details.find(d => d.name.includes('Async'));
    assert.ok(asyncTest);
    assert.strictEqual(asyncTest!.status, 'passed');
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('tester.ts — custom test matchers (pass + fail)', () => {
  function makeFile(content: string): { path: string; cleanup: () => void } {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 't.js');
    writeFileSync(f, content);
    return { path: f, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
  }

  it('toEqual pass', async () => {
    const { path, cleanup } = makeFile('function getObj() { return { a: 1 }; }');
    const r = await runTests(path, 'javascript', { customTests: "test('o', () => { const o={a:1}; expect(o).toEqual({a:1}); });" });
    assert.ok(r.passed >= 1);
    cleanup();
  });

  it('toEqual fail', async () => {
    const { path, cleanup } = makeFile('function getObj() { return { a: 1 }; }');
    const r = await runTests(path, 'javascript', { customTests: "test('o', () => { const o={a:1}; expect(o).toEqual({a:2}); });" });
    assert.ok(r.failed >= 1);
    cleanup();
  });

  it('toBeTruthy pass', async () => {
    const { path, cleanup } = makeFile('function getBool() { return true; }');
    const r = await runTests(path, 'javascript', { customTests: "test('t', () => { expect(getBool()).toBeTruthy(); });" });
    assert.ok(r.passed >= 1);
    cleanup();
  });

  it('toBeTruthy fail', async () => {
    const { path, cleanup } = makeFile('function getZero() { return 0; }');
    const r = await runTests(path, 'javascript', { customTests: "test('f', () => { expect(getZero()).toBeTruthy(); });" });
    assert.ok(r.failed >= 1);
    cleanup();
  });

  it('toBeFalsy pass', async () => {
    const { path, cleanup } = makeFile('function getX() { return false; }');
    const r = await runTests(path, 'javascript', { customTests: "test('f', () => { expect(getX()).toBeFalsy(); });" });
    assert.ok(r.passed >= 1);
    cleanup();
  });

  it('toBeFalsy fail', async () => {
    const { path, cleanup } = makeFile('function getX() { return 1; }');
    const r = await runTests(path, 'javascript', { customTests: "test('f', () => { expect(getX()).toBeFalsy(); });" });
    assert.ok(r.failed >= 1);
    cleanup();
  });

  it('toBeGreaterThan pass', async () => {
    const { path, cleanup } = makeFile('function getCount() { return 10; }');
    const r = await runTests(path, 'javascript', { customTests: "test('g', () => { expect(getCount()).toBeGreaterThan(5); });" });
    assert.ok(r.passed >= 1);
    cleanup();
  });

  it('toBeGreaterThan fail', async () => {
    const { path, cleanup } = makeFile('function getNum() { return 5; }');
    const r = await runTests(path, 'javascript', { customTests: "test('g', () => { expect(getNum()).toBeGreaterThan(10); });" });
    assert.ok(r.failed >= 1);
    cleanup();
  });

  it('toBeLessThan pass', async () => {
    const { path, cleanup } = makeFile('function getNum() { return 5; }');
    const r = await runTests(path, 'javascript', { customTests: "test('l', () => { expect(getNum()).toBeLessThan(10); });" });
    assert.ok(r.passed >= 1);
    cleanup();
  });

  it('toBeLessThan fail', async () => {
    const { path, cleanup } = makeFile('function getNum() { return 100; }');
    const r = await runTests(path, 'javascript', { customTests: "test('l', () => { expect(getNum()).toBeLessThan(10); });" });
    assert.ok(r.failed >= 1);
    cleanup();
  });

  it('toContain pass', async () => {
    const { path, cleanup } = makeFile('function getMsg() { return "hello world"; }');
    const r = await runTests(path, 'javascript', { customTests: "test('c', () => { expect(getMsg()).toContain('hello'); });" });
    assert.ok(r.passed >= 1);
    cleanup();
  });

  it('toContain fail', async () => {
    const { path, cleanup } = makeFile('function getMsg() { return "hello"; }');
    const r = await runTests(path, 'javascript', { customTests: "test('c', () => { expect(getMsg()).toContain('world'); });" });
    assert.ok(r.failed >= 1);
    cleanup();
  });

  it('toBe fail', async () => {
    const { path, cleanup } = makeFile('function getNum() { return 42; }');
    const r = await runTests(path, 'javascript', { customTests: "test('b', () => { expect(getNum()).toBe(99); });" });
    assert.ok(r.failed >= 1);
    cleanup();
  });
});

describe('tester.ts — coverage edge cases', () => {
  it('returns 0% coverage when customTests has no test blocks', async () => {
    const dir = join(tmpdir(), `ts-c10-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 't.js');
    writeFileSync(f, 'const x = 1;');
    const result = await runTests(f, 'javascript', { customTests: '// just a comment' });
    assert.strictEqual(result.coverage, '0%');
    rmSync(dir, { recursive: true, force: true });
  });

  it('catches errors from nonexistent file path', async () => {
    const result = await runTests('/nonexistent/path/file.js', 'javascript', {
      customTests: "test('x', () => { expect(1).toBe(1) });"
    });
    assert.strictEqual(result.failed, 1);
    assert.strictEqual(result.passed, 0);
    assert.ok(result.errorMessages.length > 0);
  });
});
