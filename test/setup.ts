/**
 * Common test setup and utilities for trustshell tests
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Create a temporary directory for test fixtures
 */
export function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), 'trustshell-test-'));
}

/**
 * Clean up a test directory
 */
export function cleanupTestDir(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Create a test file with given content
 */
export function createTestFile(dir: string, filename: string, content: string): string {
  const filepath = join(dir, filename);
  writeFileSync(filepath, content, 'utf8');
  return filepath;
}

/**
 * Sample test code snippets for different languages
 */
export const TEST_CODE_SNIPPETS = {
  javascript: `
function add(a, b) {
  return a + b;
}

function greet(name) {
  return \`Hello, \${name}!\`;
}

const PI = 3.14159;
`,

  javascriptWithIssues: `
function add(a, b) {
  // TODO: implement
  return a + b;
}

eval("console.log('dangerous')");

const unusedVar = 42;
`,

  python: `
def add(a, b):
    return a + b

def greet(name):
    return f"Hello, {name}!"

PI = 3.14159
`,

  pythonWithSecurityIssues: `
import subprocess
import os

def add(a, b):
    return a + b

# Dangerous: using eval
eval("print('dangerous')")

# Dangerous: shell injection
os.system("rm -rf /")

# Dangerous: subprocess.run with shell=True
subprocess.run("ls -la", shell=True)

password = "secret123"
api_key = "sk-1234567890abcdefghijklmnopqrstuvwxyz"
`,

  go: `
package main

import "fmt"

func add(a, b int) int {
    return a + b
}

func main() {
    fmt.Println(add(1, 2))
}
`,

  goWithIssues: `
package main

import (
    "fmt"
    "unsafe"
)

func add(a, b int) int {
    return a + b
}

// TODO: add more functions

// TODO: handle errors

func main() {
    var ptr unsafe.Pointer
    fmt.Println(add(1, 2))
}
`,

  rust: `
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    println!("{}", add(1, 2));
}
`,

  rustWithIssues: `
fn add(a: i32, b: i32) -> i32 {
    // FIXME: implement
    a + b
}

unsafe fn dangerous_function() {
    let ptr: *const i32 = std::ptr::null();
    // TODO: add safety checks
}

fn main() {
    println!("{}", add(1, 2));
}
`,

  typescript: `
interface User {
  id: number;
  name: string;
}

function createUser(id: number, name: string): User {
  return { id, name };
}

function greet(user: User): string {
  return \`Hello, \${user.name}!\`;
}
`,

  typescriptWithIssues: `
interface User {
  id: number;
  name: string;
}

function createUser(id: number, name: string): User {
  return { id, name };
}

// TODO: add validation

eval("console.log('dangerous')");

const password = "secret123";
`
};

/**
 * Sample configurations for testing
 */
export const SAMPLE_CONFIGS = {
  basic: {
    depth: 'basic' as const,
    testFrameworks: ['jest'],
    security: {
      enabled: true,
      threshold: 80,
      rules: ['no-eval', 'no-unsafe-inline']
    },
    performance: {
      enabled: true,
      maxExecutionTime: 5000,
      memoryLimit: '100MB'
    },
    languages: {
      javascript: {
        testFramework: 'jest',
        linting: true
      }
    }
  },

  comprehensive: {
    depth: 'comprehensive' as const,
    testFrameworks: ['jest', 'mocha'],
    security: {
      enabled: true,
      threshold: 90,
      rules: ['no-eval', 'no-unsafe-inline', 'no-xss', 'no-sqli']
    },
    performance: {
      enabled: true,
      maxExecutionTime: 3000,
      memoryLimit: '50MB'
    },
    languages: {
      javascript: {
        testFramework: 'jest',
        linting: true
      },
      python: {
        testFramework: 'pytest',
        linting: true
      }
    }
  },

  deep: {
    depth: 'deep' as const,
    testFrameworks: ['jest', 'mocha', 'pytest'],
    security: {
      enabled: true,
      threshold: 95,
      rules: ['no-eval', 'no-unsafe-inline', 'no-xss', 'no-sqli', 'no-hardcoded-secrets']
    },
    performance: {
      enabled: true,
      maxExecutionTime: 1000,
      memoryLimit: '10MB'
    },
    languages: {
      javascript: {
        testFramework: 'jest',
        linting: true
      },
      python: {
        testFramework: 'pytest',
        linting: true
      },
      go: {
        testFramework: 'go',
        linting: false
      }
    }
  }
};