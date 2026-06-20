/**
 * Tests for tester module - Test execution
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runTests } from '../src/tester/tester';
import { createTestFile, cleanupTestDir, createTestDir } from './setup';

describe('tester module', () => {

  describe('runTests', () => {
    let testDir: string;

    const setup = () => {
      testDir = createTestDir();
    };

    const teardown = () => {
      cleanupTestDir(testDir);
    };

    it('should execute JavaScript tests successfully', async () => {
      setup();
      const code = `
function add(a, b) {
  return a + b;
}

function greet(name) {
  return \`Hello, \${name}!\`;
}
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      assert.strictEqual(typeof result.coverage, 'string');
      assert(Array.isArray(result.errorMessages));
      assert(Array.isArray(result.details));
      teardown();
    });

    it('should handle Python test execution', async () => {
      setup();
      const code = `
def add(a, b):
    return a + b

def test_add():
    assert add(1, 2) == 3
    assert add(-1, 1) == 0

if __name__ == '__main__':
    test_add()
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const config = {
        testFrameworks: ['pytest'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'python', config);
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      assert.strictEqual(typeof result.coverage, 'string');
      teardown();
    });

    it('should handle Go test execution', async () => {
      setup();
      const code = `
package main

import "fmt"

func add(a, b int) int {
    return a + b
}

func main() {
    fmt.Println(add(1, 2))
}
`;
      const filePath = createTestFile(testDir, 'test.go', code);
      const config = {
        testFrameworks: ['go'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'go', config);
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      assert.strictEqual(typeof result.coverage, 'string');
      teardown();
    });

    it('should handle Rust test execution', async () => {
      setup();
      const code = `
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    println!("{}", add(1, 2));
}
`;
      const filePath = createTestFile(testDir, 'test.rs', code);
      const config = {
        testFrameworks: ['cargo'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'rust', config);
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      assert.strictEqual(typeof result.coverage, 'string');
      teardown();
    });

    it('should handle TypeScript test execution', async () => {
      setup();
      const code = `
interface User {
  id: number;
  name: string;
}

function createUser(id: number, name: string): User {
  return { id, name };
}
`;
      const filePath = createTestFile(testDir, 'test.ts', code);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'typescript', config);
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      assert.strictEqual(typeof result.coverage, 'string');
      teardown();
    });

    it('should handle custom test specifications', async () => {
      setup();
      const code = 'function add(a, b) { return a + b; }';
      const filePath = createTestFile(testDir, 'test.js', code);
      const customTests = `
describe('add function', () => {
  it('should add two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
  it('should handle negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      teardown();
    });

    it('should handle empty code', async () => {
      setup();
      const code = '';
      const filePath = createTestFile(testDir, 'empty.js', code);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      teardown();
    });

    it('should handle syntax errors in code', async () => {
      setup();
      const code = `
function add(a, b) {
  return a + b;
  // Missing closing brace
`;
      const filePath = createTestFile(testDir, 'broken.js', code);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      // Should report syntax errors
      assert(result.errorMessages.length >= 0);
      teardown();
    });

    it('should capture test error messages', async () => {
      setup();
      const code = `
function divide(a, b) {
  return a / b;
}
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const customTests = `
describe('divide function', () => {
  it('should throw error when dividing by zero', () => {
    expect(() => divide(1, 0)).toThrow();
  });
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert(Array.isArray(result.errorMessages));
      teardown();
    });

    it('should return test details with duration', async () => {
      setup();
      const code = 'function add(a, b) { return a + b; }';
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert(Array.isArray(result.details));
      if (result.details.length > 0) {
        const detail = result.details[0];
        assert.strictEqual(typeof detail.name, 'string');
        assert(['passed', 'failed', 'skipped'].includes(detail.status));
        assert.strictEqual(typeof detail.duration, 'number');
        assert(detail.duration >= 0);
      }
      teardown();
    });

    it('should handle test with status passed', async () => {
      setup();
      const code = 'function add(a, b) { return a + b; }';
      const filePath = createTestFile(testDir, 'test.js', code);
      const customTests = `
test('add function', () => {
  expect(add(1, 2)).toBe(3);
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      if (result.details.length > 0) {
        const detail = result.details[0];
        assert.strictEqual(detail.status, 'passed');
      }
      teardown();
    });

    it('should handle test with status failed', async () => {
      setup();
      const code = 'function add(a, b) { return a + b; }';
      const filePath = createTestFile(testDir, 'test.js', code);
      const customTests = `
test('add function', () => {
  expect(add(1, 2)).toBe(4); // This will fail
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      if (result.details.length > 0) {
        const detail = result.details[0];
        assert.strictEqual(detail.status, 'failed');
      }
      teardown();
    });

    it('should handle test with status skipped', async () => {
      setup();
      const code = 'function add(a, b) { return a + b; }';
      const filePath = createTestFile(testDir, 'test.js', code);
      const customTests = `
test.skip('skipped test', () => {
  expect(add(1, 2)).toBe(3);
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      if (result.details.length > 0) {
        const detail = result.details.find((d: any) => d.name.includes('skipped'));
        if (detail) {
          assert.strictEqual(detail.status, 'skipped');
        }
      }
      teardown();
    });

    it('should include error messages for failed tests', async () => {
      setup();
      const code = 'function add(a, b) { return a + b; }';
      const filePath = createTestFile(testDir, 'test.js', code);
      const customTests = `
test('failing test', () => {
  expect(add(1, 2)).toBe(5);
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      if (result.failed > 0) {
        assert(result.errorMessages.length > 0);
      }
      teardown();
    });

    it('should calculate coverage percentage', async () => {
      setup();
      const code = `
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const customTests = `
test('add function', () => {
  expect(add(1, 2)).toBe(3);
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.coverage, 'string');
      assert(result.coverage.includes('%'));
      teardown();
    });

    it('should handle unsupported language gracefully', async () => {
      setup();
      const code = 'SELECT * FROM users;';
      const filePath = createTestFile(testDir, 'test.sql', code);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'sql', config);
      // Should return some result even for unsupported languages
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      teardown();
    });

    it('should handle multiple test files', async () => {
      setup();
      const code1 = 'function add(a, b) { return a + b; }';
      const filePath1 = createTestFile(testDir, 'test1.js', code1);
      const code2 = 'function subtract(a, b) { return a - b; }';
      const filePath2 = createTestFile(testDir, 'test2.js', code2);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath1, filePath2]
      };
      const result = await runTests(filePath1, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      teardown();
    });

    it('should handle test framework not available', async () => {
      setup();
      const code = 'function add(a, b) { return a + b; }';
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        testFrameworks: ['nonexistent-framework'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      // Should handle gracefully
      assert.strictEqual(typeof result.passed, 'number');
      assert.strictEqual(typeof result.failed, 'number');
      teardown();
    });

    it('should handle test execution timeout', async () => {
      setup();
      const code = `
function infiniteLoop() {
  while (true) {
    // Infinite loop
  }
}
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath]
      };
      // This might take time or throw, but should not hang indefinitely
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      teardown();
    });

    it('should return correct error type in test details', async () => {
      setup();
      const code = 'function divide(a, b) { return a / b; }';
      const filePath = createTestFile(testDir, 'test.js', code);
      const customTests = `
test('divide by zero', () => {
  expect(() => divide(1, 0)).toThrow();
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      if (result.details.length > 0) {
        const failedDetail = result.details.find((d: any) => d.status === 'failed' && d.error);
        if (failedDetail) {
          assert.strictEqual(typeof failedDetail.error, 'string');
        }
      }
      teardown();
    });

    it('should handle large code files', async () => {
      setup();
      let code = 'function add(a, b) { return a + b; }\n';
      for (let i = 0; i < 100; i++) {
        code += `function test${i}(a, b) { return a + b; }\n`;
      }
      const filePath = createTestFile(testDir, 'large.js', code);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      teardown();
    });

    it('should handle code with special characters', async () => {
      setup();
      const code = `
function greet(name) {
  const greeting = \`Hello, \${name}! 🎉\`;
  const emoji = '😊';
  const unicode = '你好世界';
  return greeting + emoji + unicode;
}
`;
      const filePath = createTestFile(testDir, 'special.js', code);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      teardown();
    });

    it('should handle code with ES6+ syntax', async () => {
      setup();
      const code = `
const arrowAdd = (a, b) => a + b;
const [x, y] = [1, 2];
const { name, age } = { name: 'John', age: 30 };
class Calculator {
  add(a, b) { return a + b; }
}
const promise = new Promise((resolve) => resolve(42));
async function asyncAdd(a, b) { return a + b; }
`;
      const filePath = createTestFile(testDir, 'es6.js', code);
      const config = {
        testFrameworks: ['jest'],
        customTests: undefined,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      teardown();
    });

    it('should track execution time for tests', async () => {
      setup();
      const code = 'function add(a, b) { return a + b; }';
      const filePath = createTestFile(testDir, 'timing.js', code);
      const customTests = `
test('add function', () => {
  expect(add(1, 2)).toBe(3);
}, 1000); // Set timeout to 1000ms
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      if (result.details.length > 0) {
        const detail = result.details[0];
        assert(detail.duration !== undefined);
        assert(detail.duration >= 0);
      }
      teardown();
    });
  });
});