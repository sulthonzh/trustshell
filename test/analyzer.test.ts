/**
 * Tests for analyzer module - Code quality analysis
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { analyzeCode } from '../dist/analyzer/analyzer.js';
import { createTestFile, cleanupTestDir, createTestDir } from './setup.ts';

describe('analyzer module', () => {

  describe('analyzeCode', () => {
    let testDir: string;

    const setup = () => {
      testDir = createTestDir();
    };

    const teardown = () => {
      cleanupTestDir(testDir);
    };

    it('should analyze JavaScript code successfully', async () => {
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
      const result = await analyzeCode(filePath, 'javascript', {});
      assert.strictEqual(typeof result.codeQuality.score, 'number');
      assert(result.codeQuality.score >= 0 && result.codeQuality.score <= 100);
      assert(Array.isArray(result.codeQuality.issues));
      teardown();
    });

    it('should detect missing semicolons in JavaScript', async () => {
      setup();
      const code = `
function add(a, b) {
  return a + b
}
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const result = await analyzeCode(filePath, 'javascript', {});
      const hasStyleIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'style');
      assert(hasStyleIssue, 'Should detect style issues like missing semicolons');
      teardown();
    });

    it('should detect unused variables in JavaScript', async () => {
      setup();
      const code = `
function add(a, b) {
  const unusedVar = 42;
  return a + b;
}
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const result = await analyzeCode(filePath, 'javascript', {});
      const hasLogicIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'logic');
      assert(hasLogicIssue, 'Should detect logic issues like unused variables');
      teardown();
    });

    it('should detect long functions in JavaScript', async () => {
      setup();
      const code = `
function veryLongFunction() {
  // Many lines of code
  const a = 1;
  const b = 2;
  const c = 3;
  const d = 4;
  const e = 5;
  const f = 6;
  const g = 7;
  const h = 8;
  const i = 9;
  const j = 10;
  const k = 11;
  const l = 12;
  const m = 13;
  const n = 14;
  const o = 15;
  const p = 16;
  const q = 17;
  const r = 18;
  const s = 19;
  const t = 20;
  const u = 21;
  const v = 22;
  const w = 23;
  const x = 24;
  const y = 25;
  const z = 26;
  return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q + r + s + t + u + v + w + x + y + z;
}
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const result = await analyzeCode(filePath, 'javascript', {});
      const hasPerformanceIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'performance');
      assert(hasPerformanceIssue, 'Should detect performance issues like long functions');
      teardown();
    });

    it('should analyze Python code successfully', async () => {
      setup();
      const code = `
def add(a, b):
    return a + b

def greet(name):
    return f"Hello, {name}!"
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const result = await analyzeCode(filePath, 'python', {});
      assert.strictEqual(typeof result.codeQuality.score, 'number');
      assert(result.codeQuality.score >= 0 && result.codeQuality.score <= 100);
      assert(Array.isArray(result.codeQuality.issues));
      teardown();
    });

    it('should detect missing docstrings in Python', async () => {
      setup();
      const code = `
def add(a, b):
    return a + b
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const result = await analyzeCode(filePath, 'python', {});
      const hasStyleIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'style');
      assert(hasStyleIssue, 'Should detect style issues like missing docstrings');
      teardown();
    });

    it('should detect unused imports in Python', async () => {
      setup();
      const code = `
import os
import sys

def add(a, b):
    return a + b
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const result = await analyzeCode(filePath, 'python', {});
      const hasLogicIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'logic');
      assert(hasLogicIssue, 'Should detect logic issues like unused imports');
      teardown();
    });

    it('should detect too many arguments in Python functions', async () => {
      setup();
      const code = `
def many_args(a, b, c, d, e, f, g, h):
    return a + b + c + d + e + f + g + h
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const result = await analyzeCode(filePath, 'python', {});
      const hasLogicIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'logic');
      assert(hasLogicIssue, 'Should detect logic issues like too many arguments');
      teardown();
    });

    it('should analyze Go code successfully', async () => {
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
      const result = await analyzeCode(filePath, 'go', {});
      assert.strictEqual(typeof result.codeQuality.score, 'number');
      assert(result.codeQuality.score >= 0 && result.codeQuality.score <= 100);
      assert(Array.isArray(result.codeQuality.issues));
      teardown();
    });

    it('should detect missing error handling in Go', async () => {
      setup();
      const code = `
package main

import (
    "os"
)

func openFile() *os.File {
    f, _ := os.Open("file.txt")
    return f
}
`;
      const filePath = createTestFile(testDir, 'test.go', code);
      const result = await analyzeCode(filePath, 'go', {});
      const hasLogicIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'logic');
      assert(hasLogicIssue, 'Should detect logic issues like missing error handling');
      teardown();
    });

    it('should detect unused variables in Go', async () => {
      setup();
      const code = `
package main

func add(a, b int) int {
    c := a + b
    return a + b
}
`;
      const filePath = createTestFile(testDir, 'test.go', code);
      const result = await analyzeCode(filePath, 'go', {});
      const hasLogicIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'logic');
      assert(hasLogicIssue, 'Should detect logic issues like unused variables');
      teardown();
    });

    it('should analyze TypeScript code successfully', async () => {
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
      const result = await analyzeCode(filePath, 'typescript', {});
      assert.strictEqual(typeof result.codeQuality.score, 'number');
      assert(result.codeQuality.score >= 0 && result.codeQuality.score <= 100);
      assert(Array.isArray(result.codeQuality.issues));
      teardown();
    });

    it('should detect missing type annotations in TypeScript', async () => {
      setup();
      const code = `
function add(a, b) {
  return a + b;
}
`;
      const filePath = createTestFile(testDir, 'test.ts', code);
      const result = await analyzeCode(filePath, 'typescript', {});
      const hasStyleIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'style');
      assert(hasStyleIssue, 'Should detect style issues like missing type annotations');
      teardown();
    });

    it('should detect any types in TypeScript', async () => {
      setup();
      const code = `
function processData(data: any): void {
  console.log(data);
}
`;
      const filePath = createTestFile(testDir, 'test.ts', code);
      const result = await analyzeCode(filePath, 'typescript', {});
      const hasStyleIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'style');
      assert(hasStyleIssue, 'Should detect style issues like any types');
      teardown();
    });

    it('should handle empty code files', async () => {
      setup();
      const code = '';
      const filePath = createTestFile(testDir, 'empty.js', code);
      const result = await analyzeCode(filePath, 'javascript', {});
      assert.strictEqual(typeof result.codeQuality.score, 'number');
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
      const result = await analyzeCode(filePath, 'javascript', {});
      const hasSyntaxIssue = result.codeQuality.issues.some((issue: any) => issue.type === 'syntax');
      assert(hasSyntaxIssue, 'Should detect syntax errors');
      teardown();
    });

    it('should return correct issue structure', async () => {
      setup();
      const code = `
function add(a, b) {
  return a + b
}
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const result = await analyzeCode(filePath, 'javascript', {});
      if (result.codeQuality.issues.length > 0) {
        const issue = result.codeQuality.issues[0];
        assert.strictEqual(typeof issue.type, 'string');
        assert.strictEqual(typeof issue.message, 'string');
        assert.strictEqual(typeof issue.severity, 'string');
        assert(['low', 'medium', 'high'].includes(issue.severity));
        if (issue.line !== undefined) {
          assert.strictEqual(typeof issue.line, 'number');
        }
      }
      teardown();
    });

    it('should handle code with no issues', async () => {
      setup();
      const code = `
function add(a, b) {
  return a + b;
}
`;
      const filePath = createTestFile(testDir, 'clean.js', code);
      const result = await analyzeCode(filePath, 'javascript', {});
      assert(result.codeQuality.score > 80, 'Clean code should have a high score');
      teardown();
    });

    it('should give lower score for code with many issues', async () => {
      setup();
      const code = `
function add(a,b){return a+b}

function veryLongFunctionWithManyIssues(){
const x=1;const y=2;const z=3;const w=4;const v=5;const u=6;
const t=7;const s=8;const r=9;const q=10;const p=11;const o=12;
const n=13;const m=14;const l=15;const k=16;const j=17;const i=18;
const h=19;const g=20;const f=21;const e=22;const d=23;const c=24;
return x+y+z+w+v+u+t+s+r+q+p+o+n+m+l+k+j+i+h+g+f+e+d+c;
}

// TODO: fix this
// FIXME: implement this
`;
      const filePath = createTestFile(testDir, 'messy.js', code);
      const result = await analyzeCode(filePath, 'javascript', {});
      assert(result.codeQuality.score < 70, 'Code with many issues should have a low score');
      assert(result.codeQuality.issues.length > 0);
      teardown();
    });

    it('should calculate score based on issue severity', async () => {
      setup();
      const code = `
function add(a, b) {
  const unusedVar = 42;
  return a + b;
}
`;
      const filePath = createTestFile(testDir, 'score.js', code);
      const result = await analyzeCode(filePath, 'javascript', {});
      assert(result.codeQuality.score > 0 && result.codeQuality.score <= 100);
      teardown();
    });

    it('should detect code comments with TODO/FIXME', async () => {
      setup();
      const code = `
function processData() {
  // TODO: implement this
  // FIXME: fix that
  return null;
}
`;
      const filePath = createTestFile(testDir, 'todos.js', code);
      const result = await analyzeCode(filePath, 'javascript', {});
      const hasTodo = result.codeQuality.issues.some((issue: any) =>
        issue.message.toLowerCase().includes('todo') || issue.message.toLowerCase().includes('fixme')
      );
      assert(hasTodo, 'Should detect TODO/FIXME comments');
      teardown();
    });
  });
});