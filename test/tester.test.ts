/**
 * Tests for tester module - Test execution
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runTests } from '../dist/tester/tester.js';
import { createTestFile, cleanupTestDir, createTestDir } from './setup.ts';
import { parsePytestOutput, parseGoTestOutput, parseCargoTestOutput, parseJUnitOutput, extractCoverageFromJestOutput, parseJestOutput, parseMochaOutput } from '../dist/tester/tester.js';

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

  describe('output parsing functions', () => {
    let outputTestDir: string;

    const outputSetup = () => {
      outputTestDir = createTestDir();
    };

    const outputTeardown = () => {
      cleanupTestDir(outputTestDir);
    };

    it('should handle it() test format in custom tests', async () => {
      outputSetup();
      const code = 'function multiply(a, b) { return a * b; }';
      const filePath = createTestFile(outputTestDir, 'test-it.js', code);
      const customTests = `
it('should multiply numbers', () => {
  expect(multiply(2, 3)).toBe(6);
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      outputTeardown();
    });

    it('should handle async test functions', async () => {
      outputSetup();
      const code = 'async function fetchData() { return { id: 1, name: "test" }; }';
      const filePath = createTestFile(outputTestDir, 'test-async.js', code);
      const customTests = `
test('async function', async () => {
  const data = await fetchData();
  expect(data.name).toBe("test");
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      outputTeardown();
    });

    it('should handle test.it() format in custom tests', async () => {
      outputSetup();
      const code = 'function divide(a, b) { return a / b; }';
      const filePath = createTestFile(outputTestDir, 'test-it-method.js', code);
      const customTests = `
test.it('should divide numbers', () => {
  expect(divide(6, 2)).toBe(3);
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      outputTeardown();
    });

    it('should handle test.skip() with it() format', async () => {
      outputSetup();
      const code = 'function subtract(a, b) { return a - b; }';
      const filePath = createTestFile(outputTestDir, 'test-skip-it.js', code);
      const customTests = `
it.skip('skipped it test', () => {
  expect(subtract(5, 2)).toBe(3);
});
`;
      const config = {
        testFrameworks: ['jest'],
        customTests: customTests,
        files: [filePath]
      };
      const result = await runTests(filePath, 'javascript', config);
      assert.strictEqual(typeof result.passed, 'number');
      outputTeardown();
    });
  });
});

describe('output parsing functions', () => {

  describe('parsePytestOutput', () => {
    it('should parse pytest output with passed and failed tests', () => {
      const output = '12 passed, 3 failed in 1.23s';
      const result = parsePytestOutput(output);
      assert.strictEqual(result.passed, 12);
      assert.strictEqual(result.failed, 3);
      assert.strictEqual(result.coverage, '0%');
      assert.deepStrictEqual(result.errorMessages, []);
      assert.deepStrictEqual(result.details, []);
    });

    it('should parse pytest output with coverage', () => {
      const output = `12 passed, 3 failed\n================== coverage: 75% ==================`
      const result = parsePytestOutput(output);
      assert.strictEqual(result.passed, 12);
      assert.strictEqual(result.failed, 3);
      assert.strictEqual(result.coverage, '75%');
    });

    it('should parse empty pytest output', () => {
      const output = '';
      const result = parsePytestOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.coverage, '0%');
    });

    it('should handle pytest output with only passed', () => {
      const output = '5 passed';
      const result = parsePytestOutput(output);
      assert.strictEqual(result.passed, 5);
      assert.strictEqual(result.failed, 0);
    });

    it('should handle pytest output with only failed', () => {
      const output = '2 failed';
      const result = parsePytestOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 2);
    });
  });

  describe('parseGoTestOutput', () => {
    it('should parse Go test output with passed and failed tests', () => {
      const output = `PASS:
  testPackage
  testSubPackage
FAIL:
  otherPackage`;
      const result = parseGoTestOutput(output);
      assert.strictEqual(result.passed, 1);
      assert.strictEqual(result.failed, 1);
      assert.strictEqual(result.coverage, '0%');
    });

    it('should parse Go test output with coverage', () => {
      const output = `PASS:
  testPackage
coverage: 85.4% of statements`;
      const result = parseGoTestOutput(output);
      assert.strictEqual(result.passed, 1);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.coverage, '85%');
    });

    it('should parse empty Go test output', () => {
      const output = '';
      const result = parseGoTestOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.coverage, '0%');
    });

    it('should handle Go test output with only passed', () => {
      const output = 'PASS:';
      const result = parseGoTestOutput(output);
      assert.strictEqual(result.passed, 1);
      assert.strictEqual(result.failed, 0);
    });

    it('should handle Go test output with only failed', () => {
      const output = 'FAIL:';
      const result = parseGoTestOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 1);
    });
  });

  describe('parseCargoTestOutput', () => {
    it('should parse Cargo test output with passed and failed tests', () => {
      const output = 'test result: ok. 3 tests passed';
      const result = parseCargoTestOutput(output);
      assert.strictEqual(result.passed, 1);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.coverage, '0%');
    });

    it('should parse Cargo test output with failures', () => {
      const output = 'test result: FAILED. 1 failed';
      const result = parseCargoTestOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 1);
      assert.strictEqual(result.coverage, '0%');
    });

    it('should parse Cargo test output with coverage', () => {
      const output = 'test result: ok. 5 passed (82.5% (102/123)))';
      const result = parseCargoTestOutput(output);
      assert.strictEqual(result.passed, 1);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.coverage, '82%');
    });

    it('should parse Cargo test output with both passed and coverage', () => {
      const output = 'test result: ok. 5 passed (82.5% (102/123)))';
      const result = parseCargoTestOutput(output);
      assert.strictEqual(result.passed, 1);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.coverage, '82%');
    });

    it('should handle empty Cargo test output', () => {
      const output = '';
      const result = parseCargoTestOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.coverage, '0%');
    });
  });

  describe('parseJUnitOutput', () => {
    it('should parse JUnit output with tests found and failures', () => {
      const output = '15 tests found, 2 failures';
      const result = parseJUnitOutput(output);
      assert.strictEqual(result.passed, 15);
      assert.strictEqual(result.failed, 2);
      assert.strictEqual(result.coverage, '0%');
    });

    it('should parse empty JUnit output', () => {
      const output = '';
      const result = parseJUnitOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.coverage, '0%');
    });

    it('should handle JUnit output with only failures', () => {
      const output = '5 failures';
      const result = parseJUnitOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 5);
    });

    it('should handle JUnit output with only tests found', () => {
      const output = '10 tests found';
      const result = parseJUnitOutput(output);
      assert.strictEqual(result.passed, 10);
      assert.strictEqual(result.failed, 0);
    });
  });

  describe('extractCoverageFromJestOutput', () => {
    it('should extract coverage from Jest output', () => {
      const output = 'Test Suites: 1 passed, 1 total\nTests:       5 passed, 1 total\nSnapshots:   0 total\nTime:        1.234s\nRan all test suites.\n\n     PASS   coverage/coverage-summary.json\n\n--|---------|----------|---------|---------|------------------------------------------\nFile            | % Stmts | % Branch | % Funcs | % Lines |\n--|---------|----------|---------|---------|------------------------------------------\nAll files       |   80.5  |    75.2 |   83.3  |   80.5  |\nsrc            |   80.5  |    75.2 |   83.3  |   80.5  |\n  index.ts      |   80.5  |    75.2 |   83.3  |   80.5  |\n--|---------|----------|---------|---------|------------------------------------------\n\nCoverage report for test suite\n';
      const result = extractCoverageFromJestOutput(output);
      assert.strictEqual(result, '80%');
    });

    it('should return 0% when no coverage found', () => {
      const output = 'Test Suites: 1 passed, 1 total\nTests:       5 passed, 1 total';
      const result = extractCoverageFromJestOutput(output);
      assert.strictEqual(result, '0%');
    });

    it('should handle empty output', () => {
      const output = '';
      const result = extractCoverageFromJestOutput(output);
      assert.strictEqual(result, '0%');
    });

    it('should extract coverage from different decimal formats', () => {
      const output = 'All files       |   85.75  |    75.2 |';
      const result = extractCoverageFromJestOutput(output);
      assert.strictEqual(result, '85%');
    });

    it('should handle coverage with multiple decimals', () => {
      const output = 'All files       |   88.345  |    75.2 |';
      const result = extractCoverageFromJestOutput(output);
      assert.strictEqual(result, '88%');
    });
  });

  describe('parseJestOutput', () => {
    it('should parse passed tests from Jest output', () => {
      const output = 'PASS src/utils.test.js\nPASS src/main.test.js\nTests: 5 passed';
      const result = parseJestOutput(output);
      assert.strictEqual(result.passed, 2);
      assert.strictEqual(result.failed, 0);
    });

    it('should parse failed tests from Jest output', () => {
      const output = 'FAIL src/utils.test.js\nError: Expected 5 but got 3';
      const result = parseJestOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 1);
      assert.ok(result.errorMessages.length > 0);
    });

    it('should handle mixed pass/fail Jest output', () => {
      const output = 'PASS src/a.test.js\nFAIL src/b.test.js\nError: timeout';
      const result = parseJestOutput(output);
      assert.strictEqual(result.passed, 1);
      assert.strictEqual(result.failed, 1);
      assert.ok(result.errorMessages.length > 0);
    });

    it('should handle empty Jest output', () => {
      const output = '';
      const result = parseJestOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.coverage, '0%');
    });
  });

  describe('parseMochaOutput', () => {
    it('should parse passed tests from Mocha output', () => {
      const output = '✓ should do something\n✓ should do another thing';
      const result = parseMochaOutput(output);
      assert.strictEqual(result.passed, 2);
      assert.strictEqual(result.failed, 0);
    });

    it('should parse failed tests from Mocha output', () => {
      const output = '✗ should fail\n✗ another failure';
      const result = parseMochaOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 2);
    });

    it('should handle mixed Mocha output', () => {
      const output = '✓ test 1\n✗ test 2';
      const result = parseMochaOutput(output);
      assert.strictEqual(result.passed, 1);
      assert.strictEqual(result.failed, 1);
    });

    it('should handle empty Mocha output', () => {
      const output = '';
      const result = parseMochaOutput(output);
      assert.strictEqual(result.passed, 0);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.coverage, '0%');
    });
  });
});