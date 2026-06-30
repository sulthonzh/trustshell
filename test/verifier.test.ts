/**
 * Tests for verifier module - Main verification orchestration
 */

import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { verifyCode } from '../dist/verifier/verifier.js';
import { createTestFile, cleanupTestDir, createTestDir, SAMPLE_CONFIGS } from './setup.ts';

describe('verifier module', () => {
  let testDir: string;
  let testFilePath: string;

  beforeEach(() => {
    testDir = createTestDir();
  });

  const teardown = () => {
    cleanupTestDir(testDir);
  };

  describe('verify', () => {
    it('should verify JavaScript code successfully', async () => {
      const code = `
function add(a, b) {
  return a + b;
}

function greet(name) {
  return \`Hello, \${name}!\`;
}
`;
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: 'GPT-4',
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(typeof result.status, 'string');
      assert(['verified', 'partial', 'failed'].includes(result.status));
      assert.strictEqual(typeof result.confidenceScore, 'number');
      assert(result.confidenceScore >= 0 && result.confidenceScore <= 100);
      assert(result.findings);
      assert(result.findings.functionalTests);
      assert(result.findings.codeQuality);
      assert(result.findings.security);
      assert(result.metadata);
      assert.strictEqual(result.metadata.file, testFilePath);
      assert.strictEqual(result.metadata.language, 'javascript');
      assert(Array.isArray(result.recommendations));
      teardown();
    });

    it('should use comprehensive depth setting', async () => {
      const code = 'function add(a, b) { return a + b; }';
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.comprehensive,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(result.metadata.verificationDepth, 'comprehensive');
      teardown();
    });

    it('should use deep depth setting', async () => {
      const code = 'function add(a, b) { return a + b; }';
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.deep,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(result.metadata.verificationDepth, 'deep');
      teardown();
    });

    it('should handle Python code', async () => {
      const code = `
def add(a, b):
    return a + b

def greet(name):
    return f"Hello, {name}!"
`;
      testFilePath = createTestFile(testDir, 'test.py', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: 'Claude',
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'python', config);
      assert.strictEqual(result.metadata.language, 'python');
      teardown();
    });

    it('should handle Go code', async () => {
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
      testFilePath = createTestFile(testDir, 'test.go', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'go', config);
      assert.strictEqual(result.metadata.language, 'go');
      teardown();
    });

    it('should handle Rust code', async () => {
      const code = `
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    println!("{}", add(1, 2));
}
`;
      testFilePath = createTestFile(testDir, 'test.rs', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'rust', config);
      assert.strictEqual(result.metadata.language, 'rust');
      teardown();
    });

    it('should handle TypeScript code', async () => {
      const code = `
interface User {
  id: number;
  name: string;
}

function createUser(id: number, name: string): User {
  return { id, name };
}
`;
      testFilePath = createTestFile(testDir, 'test.ts', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: 'GPT-4',
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'typescript', config);
      assert.strictEqual(result.metadata.language, 'typescript');
      teardown();
    });

    it('should include AI source in metadata when provided', async () => {
      const code = 'function add(a, b) { return a + b; }';
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: 'GPT-4',
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(result.metadata.aiSource, 'GPT-4');
      teardown();
    });

    it('should handle security disabled', async () => {
      const code = `
eval("console.log('dangerous')");
function add(a, b) { return a + b; }
`;
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        security: { enabled: false, threshold: 80, rules: [] },
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(result.findings.security.score, 100);
      teardown();
    });

    it('should handle performance disabled', async () => {
      const code = 'function add(a, b) { return a + b; }';
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        performance: { enabled: false, maxExecutionTime: 0, memoryLimit: '0MB' },
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert(result.metadata);
      teardown();
    });

    it('should calculate confidence score based on findings', async () => {
      const code = `
function add(a, b) {
  const unusedVar = 42;
  return a + b;
}

eval("console.log('test')");
`;
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert(result.confidenceScore < 100);
      assert(result.confidenceScore >= 0);
      teardown();
    });

    it('should determine status based on confidence score', async () => {
      const cleanCode = `
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
      testFilePath = createTestFile(testDir, 'clean.js', cleanCode);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      // Clean code should have high confidence
      assert(['verified', 'partial'].includes(result.status));
      teardown();
    });

    it('should generate recommendations based on findings', async () => {
      const code = `
function add(a, b) {
  const unusedVar = 42;
  return a + b;
}

eval("console.log('dangerous')");
`;
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert(Array.isArray(result.recommendations));
      // Should have recommendations for security and code quality issues
      assert(result.recommendations.length > 0);
      teardown();
    });

    it('should handle empty code', async () => {
      const code = '';
      testFilePath = createTestFile(testDir, 'empty.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(typeof result.status, 'string');
      teardown();
    });

    it('should handle code with syntax errors', async () => {
      const code = `
function add(a, b) {
  return a + b;
  // Missing closing brace
`;
      testFilePath = createTestFile(testDir, 'broken.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      // Should handle syntax errors gracefully
      assert.strictEqual(typeof result.status, 'string');
      teardown();
    });

    it('should handle custom test specifications', async () => {
      const code = 'function add(a, b) { return a + b; }';
      testFilePath = createTestFile(testDir, 'test.js', code);
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
        ...SAMPLE_CONFIGS.basic,
        customTests: customTests,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(typeof result.status, 'string');
      teardown();
    });

    it('should handle benchmark mode', async () => {
      const code = 'function add(a, b) { return a + b; }';
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: true,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(typeof result.status, 'string');
      teardown();
    });

    it('should handle verbose mode', async () => {
      const code = 'function add(a, b) { return a + b; }';
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: true,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(typeof result.status, 'string');
      teardown();
    });

    it('should handle recursive mode', async () => {
      const code = 'function add(a, b) { return a + b; }';
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: true,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(typeof result.status, 'string');
      teardown();
    });

    it('should return correct status for low confidence', async () => {
      const badCode = `
eval("dangerous");
eval("also dangerous");
const password = "secret123";
const apiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyz";
function add(a, b) { return a + b; }
`;
      testFilePath = createTestFile(testDir, 'bad.js', badCode);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert(['partial', 'failed'].includes(result.status));
      teardown();
    });

    it('should return correct status for high confidence', async () => {
      const goodCode = `
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
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
`;
      testFilePath = createTestFile(testDir, 'good.js', goodCode);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert(['verified', 'partial'].includes(result.status));
      teardown();
    });

    it('should include timestamp in metadata', async () => {
      const code = 'function add(a, b) { return a + b; }';
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert(result.metadata.timestamp);
      assert.doesNotThrow(() => new Date(result.metadata.timestamp));
      teardown();
    });

    it('should include all findings in result', async () => {
      const code = 'function add(a, b) { return a + b; }';
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);
      assert(result.findings.functionalTests);
      assert(result.findings.codeQuality);
      assert(result.findings.security);
      assert.strictEqual(typeof result.findings.functionalTests.passed, 'number');
      assert.strictEqual(typeof result.findings.codeQuality.score, 'number');
      assert.strictEqual(typeof result.findings.security.score, 'number');
      teardown();
    });

    it('should handle unsupported languages gracefully', async () => {
      const code = 'SELECT * FROM users;';
      testFilePath = createTestFile(testDir, 'test.sql', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'sql', config);
      assert.strictEqual(typeof result.status, 'string');
      teardown();
    });
  });

  describe('verification orchestration', () => {
    beforeEach(() => {
      testDir = createTestDir();
    });

    const teardown = () => {
      cleanupTestDir(testDir);
    };

    it('should run all verification steps in order', async () => {
      const code = `
function add(a, b) {
  return a + b;
}
`;
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);

      // Check that all modules were called and results are present
      assert(result.findings.codeQuality);
      assert(result.findings.security);
      assert(result.findings.functionalTests);
      assert(result.confidenceScore >= 0 && result.confidenceScore <= 100);
      teardown();
    });

    it('should handle module failures gracefully', async () => {
      const code = `
function add(a, b) {
  return a + b;
}
`;
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      // Even if one module fails, verification should continue
      const result = await verifyCode(testFilePath, 'javascript', config);
      assert.strictEqual(typeof result.status, 'string');
      teardown();
    });

    it('should aggregate results from all modules', async () => {
      const code = `
function add(a, b) {
  const unusedVar = 42;
  return a + b;
}

eval("console.log('test')");
`;
      testFilePath = createTestFile(testDir, 'test.js', code);
      const config = {
        ...SAMPLE_CONFIGS.basic,
        aiSource: undefined,
        benchmark: false,
        verbose: false,
        recursive: false,
        customTests: undefined
      };

      const result = await verifyCode(testFilePath, 'javascript', config);

      // Check that all modules contributed to the result
      assert(result.findings.codeQuality.issues.length > 0 || result.findings.codeQuality.score < 100);
      assert(result.findings.security.vulnerabilities.length > 0 || result.findings.security.score < 100);
      teardown();
    });
  });
});