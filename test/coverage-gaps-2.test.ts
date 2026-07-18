/**
 * Coverage gap tests for trustshell
 * Targets: security.ts (Python/Rust/Java/Go/generic), config.ts (env vars), reporter.ts (formats)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { checkSecurity } from '../dist/security/security.js';
import { loadConfig, saveConfig } from '../dist/config/config.js';
import { generateReport } from '../dist/reporter/reporter.js';

describe('Security coverage gaps - language-specific checks', () => {
  let testDir: string;

  before(() => {
    testDir = mkdtempSync(join(tmpdir(), 'trustshell-sec-'));
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const makeFile = (name: string, content: string): string => {
    const p = join(testDir, name);
    writeFileSync(p, content);
    return p;
  };

  const secConfig = { security: { enabled: true, threshold: 80, rules: [] } };

  it('should detect Python security issues', async () => {
    const code = `
import pickle
exec("dangerous code")
eval("more dangerous")
password = "supersecret123"
secret = "anothersecret"
token = "abcdefghijklmnop"
`;
    const result = await checkSecurity(makeFile('test.py', code), 'python', secConfig);
    const types = result.vulnerabilities.map(v => v.type);
    assert.ok(types.includes('dangerous-import'), 'Should detect pickle/dangerous import');
    assert.ok(types.includes('code-injection'), 'Should detect exec() injection');
    assert.ok(types.includes('eval-usage'), 'Should detect eval() usage');
    assert.ok(types.includes('hardcoded-secret'), 'Should detect hardcoded secrets');
    assert.ok(result.score < 100);
  });

  it('should detect Python hardcoded credentials', async () => {
    const code = `
password = "supersecret123"
`;
    const result = await checkSecurity(makeFile('test2.py', code), 'python', secConfig);
    const types = result.vulnerabilities.map(v => v.type);
    assert.ok(types.includes('hardcoded-credential') || types.includes('hardcoded-secret'),
      'Should detect hardcoded credential, got: ' + JSON.stringify(types));
  });

  it('should detect Rust security issues', async () => {
    const code = `
unsafe {
    let x = 1;
}
fn leak() {
    let b = Box::new(42);
    std::mem::forget(b);
}
let s = str::from_utf8(bytes);
`;
    const result = await checkSecurity(makeFile('test.rs', code), 'rust', secConfig);
    const types = result.vulnerabilities.map(v => v.type);
    assert.ok(types.includes('unsafe-code'), 'Should detect unsafe block');
    assert.ok(types.includes('memory-leak'), 'Should detect memory leak pattern');
    assert.ok(types.includes('unsanitized-input'), 'Should detect unsanitized input');
  });

  it('should detect Rust deprecated function', async () => {
    const code = `
// deprecated function used here
fn old() {}
`;
    const result = await checkSecurity(makeFile('test2.rs', code), 'rust', secConfig);
    const types = result.vulnerabilities.map(v => v.type);
    assert.ok(types.includes('deprecated-function'), 'Should detect deprecated, got: ' + JSON.stringify(types));
  });

  it('should detect Java security issues', async () => {
    const code = `
public class Test {
    public void run() {
        Runtime.exec("cmd");
        ProcessBuilder pb = new ProcessBuilder("cmd");
        Class.forName("Evil");
        String password = "hardcodedpass";
        ObjectInputStream ois = new ObjectInputStream();
        ois.readObject();
    }
}
`;
    const result = await checkSecurity(makeFile('Test.java', code), 'java', secConfig);
    const types = result.vulnerabilities.map(v => v.type);
    assert.ok(types.includes('dangerous-method'), 'Should detect dangerous methods');
    assert.ok(types.includes('hardcoded-credential'), 'Should detect hardcoded credentials');
    assert.ok(types.includes('deserialization'), 'Should detect deserialization');
  });

  it('should detect Go security issues', async () => {
    const code = `
package main
import (
    "os/exec"
    "unsafe"
)
func main() {
    exec.Command("ls")
    ptr := unsafe.Pointer(nil)
    buf := make([]byte, 100)
    _ = unsafe.Sizeof(buf)
}
`;
    const result = await checkSecurity(makeFile('test.go', code), 'go', secConfig);
    const types = result.vulnerabilities.map(v => v.type);
    assert.ok(types.includes('dangerous-function'), 'Should detect exec.Command');
    assert.ok(types.includes('unsafe-pointer'), 'Should detect unsafe.Pointer');
    assert.ok(types.includes('buffer-overflow'), 'Should detect buffer overflow');
  });

  it('should run generic security checks for unknown language', async () => {
    const code = `
password = "mysecretpassword"
system("rm -rf /")
eval("dangerous()")
`;
    const result = await checkSecurity(makeFile('test.txt', code), 'text', secConfig);
    assert.ok(result.vulnerabilities.length > 0, 'Should detect generic issues');
  });

  it('should detect insecure logging of sensitive info', async () => {
    const code = `
const password = "secret123";
console.log("User password is: " + password);
`;
    const result = await checkSecurity(makeFile('logging.js', code), 'javascript', secConfig);
    const types = result.vulnerabilities.map(v => v.type);
    assert.ok(types.includes('insecure-logging'), 'Should detect insecure logging');
  });

  it('should detect timing attack vulnerability', async () => {
    const code = `
const password = "admin123";
if (userInput == password) {
  return true;
}
`;
    const result = await checkSecurity(makeFile('timing.js', code), 'javascript', secConfig);
    const types = result.vulnerabilities.map(v => v.type);
    assert.ok(types.includes('timing-attack'), 'Should detect timing attack');
  });

  it('should detect lack of error handling', async () => {
    const code = `
try {
  doSomething();
}
`;
    const result = await checkSecurity(makeFile('errhandle.js', code), 'javascript', secConfig);
    const types = result.vulnerabilities.map(v => v.type);
    assert.ok(types.includes('error-handling'), 'Should detect missing catch');
  });
});

describe('Config coverage gaps - env var overrides', () => {
  const origEnv = { ...process.env };

  after(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in origEnv)) delete process.env[key];
    }
    Object.assign(process.env, origEnv);
  });

  it('should override config with env vars', async () => {
    process.env.TRUSTSHELL_SECURITY_ENABLED = 'true';
    process.env.TRUSTSHELL_AI_SOURCE = 'copilot';
    process.env.TRUSTSHELL_BENCHMARK = 'true';
    process.env.TRUSTSHELL_RECURSIVE = 'false';

    const config = await loadConfig();
    assert.strictEqual(config.security.enabled, true);
    assert.strictEqual(config.aiSource, 'copilot');
    assert.strictEqual(config.benchmark, true);
    assert.strictEqual(config.recursive, false);

    delete process.env.TRUSTSHELL_SECURITY_ENABLED;
    delete process.env.TRUSTSHELL_AI_SOURCE;
    delete process.env.TRUSTSHELL_BENCHMARK;
    delete process.env.TRUSTSHELL_RECURSIVE;
  });

  it('should handle falsey env vars', async () => {
    process.env.TRUSTSHELL_SECURITY_ENABLED = 'false';
    process.env.TRUSTSHELL_BENCHMARK = 'false';
    process.env.TRUSTSHELL_RECURSIVE = 'false';

    const config = await loadConfig();
    assert.strictEqual(config.security.enabled, false);
    assert.strictEqual(config.benchmark, false);

    delete process.env.TRUSTSHELL_SECURITY_ENABLED;
    delete process.env.TRUSTSHELL_BENCHMARK;
    delete process.env.TRUSTSHELL_RECURSIVE;
  });
});

describe('Reporter coverage gaps - formats and score paths', () => {
  let testDir: string;

  before(() => {
    testDir = mkdtempSync(join(tmpdir(), 'trustshell-rep-'));
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const mockResult = {
    status: 'verified' as const,
    confidenceScore: 85,
    findings: {
      functionalTests: {
        passed: 45,
        failed: 0,
        coverage: '90%',
        errorMessages: [] as string[],
      },
      codeQuality: {
        score: 85,
        issues: [
          { type: 'style' as const, message: 'Missing semicolon', severity: 'low' as const, line: 5 },
          { type: 'performance' as const, message: 'Slow loop', severity: 'medium' as const, line: 10 },
          { type: 'logic' as const, message: 'Bug', severity: 'high' as const, line: 15 },
        ],
      },
      security: {
        score: 80,
        vulnerabilities: [
          { type: 'eval-usage', severity: 'critical' as const, line: 10, description: 'eval() is dangerous' },
          { type: 'innerhtml', severity: 'medium' as const, line: 20, description: 'XSS risk' },
          { type: 'commented-code', severity: 'low' as const, line: 30, description: 'TODO found' },
        ],
      },
      performance: {
        executionTime: 150,
        memoryUsage: 1048576,
        efficiency: 88,
      },
    },
    recommendations: ['Add more tests', 'Fix eval usage', 'Remove TODO comments'],
    metadata: {
      file: 'test.ts',
      language: 'typescript',
      timestamp: new Date().toISOString(),
      verificationDepth: 'standard',
      aiSource: 'chatgpt',
    },
  };

  it('should generate JSON report to file', async () => {
    const outputPath = join(testDir, 'report.json');
    await generateReport(mockResult, outputPath, { type: 'json' });
    const content = readFileSync(outputPath, 'utf8');
    assert.ok(content.includes('verified'));
    assert.ok(content.includes('confidenceScore'));
  });

  it('should generate Markdown report with vulnerabilities', async () => {
    const outputPath = join(testDir, 'report.md');
    await generateReport(mockResult, outputPath, { type: 'markdown' });
    const content = readFileSync(outputPath, 'utf8');
    assert.ok(content.includes('#'));
  });

  it('should generate console report to file', async () => {
    const outputPath = join(testDir, 'report.txt');
    await generateReport(mockResult, outputPath, { type: 'console' });
    const content = readFileSync(outputPath, 'utf8');
    assert.ok(content.length > 0);
  });

  it('should handle failed verification status in report', async () => {
    const outputPath = join(testDir, 'report-failed.txt');
    const failedResult = { ...mockResult, status: 'failed' as const, confidenceScore: 30 };
    await generateReport(failedResult, outputPath, { type: 'console' });
    const content = readFileSync(outputPath, 'utf8');
    assert.ok(content.length > 0);
  });

  it('should handle partial verification status in report', async () => {
    const outputPath = join(testDir, 'report-partial.txt');
    const partialResult = { ...mockResult, status: 'partial' as const, confidenceScore: 60 };
    await generateReport(partialResult, outputPath, { type: 'console' });
    const content = readFileSync(outputPath, 'utf8');
    assert.ok(content.length > 0);
  });

  it('should handle low scores in markdown report', async () => {
    const outputPath = join(testDir, 'report-low.md');
    const lowScoreResult = {
      ...mockResult,
      confidenceScore: 35,
      findings: {
        ...mockResult.findings,
        codeQuality: { score: 45, issues: [] },
        security: { score: 25, vulnerabilities: [{ type: 'eval', severity: 'critical' as const, description: 'bad' }] },
      },
    };
    await generateReport(lowScoreResult, outputPath, { type: 'markdown' });
    const content = readFileSync(outputPath, 'utf8');
    assert.ok(content.length > 0);
  });

  it('should generate XML report to file', async () => {
    const outputPath = join(testDir, 'report.xml');
    await generateReport(mockResult, outputPath, { type: 'xml' });
    const content = readFileSync(outputPath, 'utf8');
    assert.ok(content.length > 0);
  });

  it('should generate HTML report to file', async () => {
    const outputPath = join(testDir, 'report.html');
    await generateReport(mockResult, outputPath, { type: 'html' });
    const content = readFileSync(outputPath, 'utf8');
    assert.ok(content.length > 0);
  });

  it('should generate markdown with no vulnerabilities', async () => {
    const outputPath = join(testDir, 'report-clean.md');
    const cleanResult = {
      ...mockResult,
      findings: {
        ...mockResult.findings,
        security: { score: 100, vulnerabilities: [] },
        codeQuality: { score: 100, issues: [] },
      },
    };
    await generateReport(cleanResult, outputPath, { type: 'markdown' });
    const content = readFileSync(outputPath, 'utf8');
    assert.ok(content.length > 0);
  });
});

describe('saveConfig', () => {
  let testDir: string;

  before(() => {
    testDir = mkdtempSync(join(tmpdir(), 'trustshell-cfg-'));
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should save config to file', async () => {
    const config: any = {
      verification: { depth: 'standard', strict: true },
      security: { enabled: true, threshold: 80, rules: [] },
      reporting: { format: { type: 'console' } },
      aiSource: 'chatgpt',
      benchmark: false,
      recursive: false,
    };
    const outputPath = join(testDir, 'config.js');
    await saveConfig(config, outputPath);
    const content = readFileSync(outputPath, 'utf8');
    assert.ok(content.includes('export default'));
    assert.ok(content.includes('"aiSource"'));
  });
});
