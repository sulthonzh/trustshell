/**
 * Tests for security module - Security vulnerability detection
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { checkSecurity } from '../dist/security/security.js';
import { createTestFile, cleanupTestDir, createTestDir } from './setup.js';

describe('security module', () => {

  describe('checkSecurity', () => {
    let testDir: string;

    const setup = () => {
      testDir = createTestDir();
    };

    const teardown = () => {
      cleanupTestDir(testDir);
    };

    it('should return score 100 when security is disabled', async () => {
      setup();
      const code = 'console.log("test");';
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: false, threshold: 80, rules: ['no-eval'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert.strictEqual(result.score, 100);
      assert.strictEqual(result.vulnerabilities.length, 0);
      teardown();
    });

    it('should detect eval usage in JavaScript', async () => {
      setup();
      const code = `
eval("console.log('dangerous')");
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert.strictEqual(typeof result.score, 'number');
      assert(result.score < 100);
      assert(result.vulnerabilities.length > 0);
      const hasEvalIssue = result.vulnerabilities.some((vuln: any) =>
        vuln.type === 'no-eval' || vuln.description.toLowerCase().includes('eval')
      );
      assert(hasEvalIssue, 'Should detect eval usage');
      teardown();
    });

    it('should detect Function constructor usage in JavaScript', async () => {
      setup();
      const code = `
const func = new Function('a', 'b', 'return a + b');
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert(result.vulnerabilities.length > 0);
      const hasFuncIssue = result.vulnerabilities.some((vuln: any) =>
        vuln.type === 'no-eval' || vuln.description.toLowerCase().includes('function')
      );
      assert(hasFuncIssue, 'Should detect Function constructor');
      teardown();
    });

    it('should detect setTimeout with string argument in JavaScript', async () => {
      setup();
      const code = `
setTimeout("console.log('dangerous')", 1000);
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert(result.vulnerabilities.length > 0);
      teardown();
    });

    it('should detect setInterval with string argument in JavaScript', async () => {
      setup();
      const code = `
setInterval("console.log('dangerous')", 1000);
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert(result.vulnerabilities.length > 0);
      teardown();
    });

    it('should detect innerHTML usage in JavaScript', async () => {
      setup();
      const code = `
document.getElementById('test').innerHTML = '<script>alert(1)</script>';
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-xss'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert(result.vulnerabilities.length > 0);
      const hasXssIssue = result.vulnerabilities.some((vuln: any) =>
        vuln.type === 'no-xss' || vuln.description.toLowerCase().includes('xss') ||
        vuln.description.toLowerCase().includes('innerhtml')
      );
      assert(hasXssIssue, 'Should detect innerHTML XSS vulnerability');
      teardown();
    });

    it('should detect dangerouslySetInnerHTML in React-like code', async () => {
      setup();
      const code = `
<div dangerouslySetInnerHTML={{ __html: userContent }} />;
`;
      const filePath = createTestFile(testDir, 'test.jsx', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-xss'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert(result.vulnerabilities.length > 0);
      teardown();
    });

    it('should detect hardcoded passwords in JavaScript', async () => {
      setup();
      const code = `
const password = "secret123";
const apiKey = "sk-1234567890abcdefghijklmnopqrstuvwxyz";
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-hardcoded-secrets'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert(result.vulnerabilities.length > 0);
      const hasSecretIssue = result.vulnerabilities.some((vuln: any) =>
        vuln.type === 'no-hardcoded-secrets' ||
        vuln.description.toLowerCase().includes('password') ||
        vuln.description.toLowerCase().includes('api key') ||
        vuln.description.toLowerCase().includes('secret')
      );
      assert(hasSecretIssue, 'Should detect hardcoded secrets');
      teardown();
    });

    it('should detect API keys in JavaScript', async () => {
      setup();
      const code = `
const API_KEY = "sk-1234567890abcdefghijklmnopqrstuvwxyz";
const SECRET_TOKEN = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-hardcoded-secrets'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert(result.vulnerabilities.length > 0);
      teardown();
    });

    it('should detect SQL injection patterns in JavaScript', async () => {
      setup();
      const code = `
const query = "SELECT * FROM users WHERE id = " + userInput;
db.execute(query);
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-sqli'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert(result.vulnerabilities.length > 0);
      const hasSqliIssue = result.vulnerabilities.some((vuln: any) =>
        vuln.type === 'no-sqli' || vuln.description.toLowerCase().includes('sql injection')
      );
      assert(hasSqliIssue, 'Should detect SQL injection patterns');
      teardown();
    });

    it('should detect Python eval usage', async () => {
      setup();
      const code = `
eval("print('dangerous')")
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval'] }
      };
      const result = await checkSecurity(filePath, 'python', config);
      assert(result.vulnerabilities.length > 0);
      teardown();
    });

    it('should detect Python exec usage', async () => {
      setup();
      const code = `
exec("print('dangerous')")
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval'] }
      };
      const result = await checkSecurity(filePath, 'python', config);
      assert(result.vulnerabilities.length > 0);
      teardown();
    });

    it('should detect Python os.system usage', async () => {
      setup();
      const code = `
import os
os.system("rm -rf /")
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-shell'] }
      };
      const result = await checkSecurity(filePath, 'python', config);
      assert(result.vulnerabilities.length > 0);
      const hasShellIssue = result.vulnerabilities.some((vuln: any) =>
        vuln.type === 'no-shell' || vuln.description.toLowerCase().includes('shell') ||
        vuln.description.toLowerCase().includes('command')
      );
      assert(hasShellIssue, 'Should detect shell command execution');
      teardown();
    });

    it('should detect Python subprocess with shell=True', async () => {
      setup();
      const code = `
import subprocess
subprocess.run("ls -la", shell=True)
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-shell'] }
      };
      const result = await checkSecurity(filePath, 'python', config);
      assert(result.vulnerabilities.length > 0);
      teardown();
    });

    it('should detect Python pickle usage', async () => {
      setup();
      const code = `
import pickle
data = pickle.loads(untrusted_data)
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-unsafe-deserialization'] }
      };
      const result = await checkSecurity(filePath, 'python', config);
      assert(result.vulnerabilities.length > 0);
      teardown();
    });

    it('should detect Python SQL injection patterns', async () => {
      setup();
      const code = `
import sqlite3
query = "SELECT * FROM users WHERE id = " + user_id
cursor.execute(query)
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-sqli'] }
      };
      const result = await checkSecurity(filePath, 'python', config);
      assert(result.vulnerabilities.length > 0);
      teardown();
    });

    it('should detect hardcoded secrets in Python', async () => {
      setup();
      const code = `
PASSWORD = "secret123"
API_KEY = "sk-1234567890abcdefghijklmnopqrstuvwxyz"
`;
      const filePath = createTestFile(testDir, 'test.py', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-hardcoded-secrets'] }
      };
      const result = await checkSecurity(filePath, 'python', config);
      assert(result.vulnerabilities.length > 0);
      teardown();
    });

    it('should handle empty code files', async () => {
      setup();
      const code = '';
      const filePath = createTestFile(testDir, 'empty.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert.strictEqual(result.score, 100);
      assert.strictEqual(result.vulnerabilities.length, 0);
      teardown();
    });

    it('should return correct vulnerability structure', async () => {
      setup();
      const code = 'eval("dangerous");';
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      if (result.vulnerabilities.length > 0) {
        const vuln = result.vulnerabilities[0];
        assert.strictEqual(typeof vuln.type, 'string');
        assert.strictEqual(typeof vuln.severity, 'string');
        assert.strictEqual(typeof vuln.description, 'string');
        assert(['low', 'medium', 'high', 'critical'].includes(vuln.severity));
        if (vuln.line !== undefined) {
          assert.strictEqual(typeof vuln.line, 'number');
        }
      }
      teardown();
    });

    it('should calculate severity based on rule', async () => {
      setup();
      const code = 'eval("dangerous");';
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      if (result.vulnerabilities.length > 0) {
        const vuln = result.vulnerabilities[0];
        assert(['low', 'medium', 'high', 'critical'].includes(vuln.severity));
      }
      teardown();
    });

    it('should return score based on vulnerabilities', async () => {
      setup();
      const code = `
eval("dangerous1");
eval("dangerous2");
const password = "secret123";
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval', 'no-hardcoded-secrets'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert(result.score < 100);
      assert(result.score >= 0);
      teardown();
    });

    it('should handle code with no vulnerabilities', async () => {
      setup();
      const code = `
function add(a, b) {
  return a + b;
}
`;
      const filePath = createTestFile(testDir, 'clean.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval', 'no-xss'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert.strictEqual(result.score, 100);
      assert.strictEqual(result.vulnerabilities.length, 0);
      teardown();
    });

    it('should detect multiple vulnerabilities in same file', async () => {
      setup();
      const code = `
eval("dangerous");
const password = "secret123";
document.getElementById('x').innerHTML = userInput;
`;
      const filePath = createTestFile(testDir, 'test.js', code);
      const config = {
        security: { enabled: true, threshold: 80, rules: ['no-eval', 'no-xss', 'no-hardcoded-secrets'] }
      };
      const result = await checkSecurity(filePath, 'javascript', config);
      assert(result.vulnerabilities.length >= 2);
      teardown();
    });
  });
});