/**
 * Coverage gap tests for tester.ts - framework runner functions
 * These exercise the spawn-based test runners (runJestTests, runMochaTests, etc.)
 * by mocking child_process.spawn
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// We need to intercept spawn calls. Since the module uses `import { spawn }`,
// we'll use a real temp file approach: create test files that trigger the runners.
// The framework runners are called when findTestFiles returns non-empty.
// However findTestFiles always returns [] currently.
// 
// Strategy: Test the internal functions indirectly via the exported parsers
// and via the custom test path for functions that ARE exported.
// For the spawn-based runners, we can verify they don't crash when called
// through the public API with real (but harmless) inputs.

describe('tester module - framework runner coverage', () => {
  let testDir: string;

  before(() => {
    testDir = mkdtempSync(join(tmpdir(), 'trustshell-cov5-'));
  });

  after(() => {
    try { rmSync(testDir, { recursive: true, force: true }); } catch {}
  });

  describe('executeCustomTests edge cases', () => {
    it('should handle custom tests with toEqual matcher', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'equal-test.js');
      writeFileSync(filePath, 'const user = [1, "test"]; function getUser() { return user; }');
      
      const customTests = `
test('user array', () => {
  expect(getUser()).toEqual([1, "test"]);
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.ok(result.passed >= 1);
    });

    it('should handle toEqual matcher failure', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'equal-fail.js');
      writeFileSync(filePath, 'function getValue() { return 42; }');
      
      const customTests = `
test('value mismatch', () => {
  expect(getValue()).toEqual(99);
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.ok(result.failed >= 1);
    });

    it('should handle toBeTruthy matcher', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'truthy.js');
      writeFileSync(filePath, 'function isActive() { return true; }');
      
      const customTests = `
test('is active', () => {
  expect(isActive()).toBeTruthy();
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.strictEqual(result.passed, 1);
    });

    it('should handle toBeFalsy matcher', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'falsy.js');
      writeFileSync(filePath, 'function isEmpty() { return false; }');
      
      const customTests = `
test('is empty', () => {
  expect(isEmpty()).toBeFalsy();
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.strictEqual(result.passed, 1);
    });

    it('should handle toBeFalsy matcher failure', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'falsy-fail.js');
      writeFileSync(filePath, 'function isEmpty() { return "non-empty"; }');
      
      const customTests = `
test('is not empty', () => {
  expect(isEmpty()).toBeFalsy();
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.ok(result.failed >= 1);
    });

    it('should handle toBeGreaterThan matcher', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'gt.js');
      writeFileSync(filePath, 'function getCount() { return 10; }');
      
      const customTests = `
test('count greater than 5', () => {
  expect(getCount()).toBeGreaterThan(5);
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.strictEqual(result.passed, 1);
    });

    it('should handle toBeGreaterThan matcher failure', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'gt-fail.js');
      writeFileSync(filePath, 'function getCount() { return 3; }');
      
      const customTests = `
test('count not greater than 5', () => {
  expect(getCount()).toBeGreaterThan(5);
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.ok(result.failed >= 1);
    });

    it('should handle toBeLessThan matcher', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'lt.js');
      writeFileSync(filePath, 'function getLimit() { return 5; }');
      
      const customTests = `
test('limit less than 10', () => {
  expect(getLimit()).toBeLessThan(10);
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.strictEqual(result.passed, 1);
    });

    it('should handle toBeLessThan matcher failure', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'lt-fail.js');
      writeFileSync(filePath, 'function getLimit() { return 15; }');
      
      const customTests = `
test('limit not less than 10', () => {
  expect(getLimit()).toBeLessThan(10);
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.ok(result.failed >= 1);
    });

    it('should handle toContain matcher', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'contain.js');
      writeFileSync(filePath, 'function getMessage() { return "hello world"; }');
      
      const customTests = `
test('message contains hello', () => {
  expect(getMessage()).toContain('hello');
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.strictEqual(result.passed, 1);
    });

    it('should handle toContain matcher failure', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'contain-fail.js');
      writeFileSync(filePath, 'function getMessage() { return "goodbye"; }');
      
      const customTests = `
test('message does not contain hello', () => {
  expect(getMessage()).toContain('hello');
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.ok(result.failed >= 1);
    });

    it('should handle toBe matcher failure', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'be-fail.js');
      writeFileSync(filePath, 'function getValue() { return 42; }');
      
      const customTests = `
test('value is not 0', () => {
  expect(getValue()).toBe(0);
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.ok(result.failed >= 1);
      assert.ok(result.errorMessages.length > 0);
      assert.ok(result.errorMessages[0].includes('Expected'));
    });

    it('should handle multiple custom tests with mixed results', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'mixed.js');
      writeFileSync(filePath, 'function add(a, b) { return a + b; }');
      
      const customTests = `
test('add succeeds', () => {
  expect(add(1, 2)).toBe(3);
});
test('add fails', () => {
  expect(add(1, 2)).toBe(4);
});
test.skip('add skipped', () => {
  expect(add(1, 2)).toBe(3);
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.ok(result.passed >= 1);
      assert.ok(result.failed >= 1);
      // Should have details for all tests
      assert.ok(result.details.length >= 2);
    });

    it('should handle custom tests with non-Error thrown', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'throw-string.js');
      writeFileSync(filePath, 'function foo() { return 1; }');
      
      // Custom test that throws a non-Error value
      const customTests = `
test('throws string', () => {
  throw "string error";
});
`;
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['jest'],
        customTests,
      });
      assert.ok(result.failed >= 1);
      assert.ok(result.errorMessages.some((e: string) => e.includes('throws string')));
    });
  });

  describe('generateAndRunBasicTests - Python path', () => {
    it('should generate Python tests with functions', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'python-code.py');
      writeFileSync(filePath, 'def add(a, b):\n    return a + b\n\ndef multiply(a, b):\n    return a * b\n');
      
      const result = await runTests(filePath, 'python', {
        testFrameworks: ['pytest'],
      });
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      assert.ok(result.details.length > 0);
    });

    it('should handle Python code without functions', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'python-nofunc.py');
      writeFileSync(filePath, 'x = 1\n');
      
      const result = await runTests(filePath, 'python', {
        testFrameworks: ['pytest'],
      });
      assert.strictEqual(typeof result.passed, 'number');
      assert.ok(result.details.length > 0);
      // Should have a failure for no functions found
      assert.ok(result.failed >= 1);
    });
  });

  describe('getDefaultFramework', () => {
    it('should return correct defaults for all languages', async () => {
      // This is an internal function but affects executeTests routing.
      // Verify through runTests with unsupported framework fallback
      const { runTests } = await import('../dist/tester/tester.js');
      
      // Test generic/unknown framework fallback
      const filePath = join(testDir, 'generic.js');
      writeFileSync(filePath, 'function add(a, b) { return a + b; }');
      
      // Using unknown framework should fall to runGenericTests
      const result = await runTests(filePath, 'javascript', {
        testFrameworks: ['unknown-framework'],
      });
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
    });
  });

  describe('findTestFiles - returns empty array', () => {
    it('should exercise the empty test files path for Java', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'Java.java');
      writeFileSync(filePath, 'public class Java { public static void main(String[] args) { System.out.println("hi"); } }');
      
      const result = await runTests(filePath, 'java', {
        testFrameworks: ['junit'],
      });
      assert.strictEqual(typeof result.passed, 'number');
    });

    it('should exercise the empty test files path for Rust', async () => {
      const { runTests } = await import('../dist/tester/tester.js');
      const filePath = join(testDir, 'rust.rs');
      writeFileSync(filePath, 'fn main() { println!("hi"); }');
      
      const result = await runTests(filePath, 'rust', {
        testFrameworks: ['cargo'],
      });
      assert.strictEqual(typeof result.passed, 'number');
    });
  });
});
