/**
 * Coverage Gap Closures Round 9 (2026-07-31)
 * Targets: reporter.ts emoji helper branches (lines 670-722),
 *          config.ts default-config-file error path (lines 99-106),
 *          index.ts config/demo CLI commands (lines 89-99, 146-148, 190-192, 197-198, 203-204)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

import {
  generateConsoleReport,
} from '../dist/reporter/reporter.js';
import type { VerificationResult } from '../dist/verifier/verifier.js';
import type { ReportConfig } from '../dist/reporter/reporter.js';

function makeResult(overrides: Partial<VerificationResult> = {}): VerificationResult {
  return {
    status: 'verified',
    confidenceScore: 85,
    findings: {
      functionalTests: {
        passed: 10,
        failed: 2,
        coverage: '75%',
        errorMessages: ['Test 3 failed', 'Test 7 failed'],
      },
      codeQuality: {
        score: 78,
        issues: [
          { type: 'style', message: 'Missing semicolon', severity: 'low', line: 5 },
          { type: 'logic', message: 'Unused variable', severity: 'medium', line: 12 },
        ],
      },
      security: {
        score: 90,
        vulnerabilities: [
          { type: 'no-eval', severity: 'critical', line: 3, description: 'Dangerous eval usage' },
        ],
      },
    },
    recommendations: ['Fix eval usage', 'Add more tests'],
    metadata: {
      file: '/path/to/test.js',
      language: 'javascript',
      verificationDepth: 'comprehensive',
      timestamp: new Date().toISOString(),
      aiSource: 'GPT-4',
    },
    ...overrides,
  };
}

// ===========================================
// reporter.ts: emoji helper branch coverage
// ===========================================

describe('Coverage Gaps 9: reporter.ts emoji helpers', () => {
  describe('getStatusEmoji — default branch (line 671)', () => {
    it('returns ❓ for unknown status', () => {
      const result = makeResult({ status: 'unknown' as any });
      const report = generateConsoleReport(result);
      assert(report.includes('❓'));
    });
  });

  describe('getConfidenceEmoji — all branches (lines 683-687)', () => {
    it('returns 🟢 for score >= 90', () => {
      const result = makeResult({ confidenceScore: 95 });
      const report = generateConsoleReport(result);
      assert(report.includes('🟢'));
    });

    it('returns 🟡 for score 70-89', () => {
      const result = makeResult({ confidenceScore: 75 });
      const report = generateConsoleReport(result);
      assert(report.includes('🟡'));
    });

    it('returns 🟠 for score 50-69', () => {
      const result = makeResult({ confidenceScore: 55 });
      const report = generateConsoleReport(result);
      assert(report.includes('🟠'));
    });

    it('returns 🔴 for score < 50', () => {
      const result = makeResult({ confidenceScore: 30 });
      const report = generateConsoleReport(result);
      assert(report.includes('🔴'));
    });
  });

  describe('getScoreEmoji — all branches (lines 692-694)', () => {
    it('returns 🌟 for codeQuality score >= 90', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 95, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 50, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('🌟'));
    });

    it('returns 👍 for codeQuality score 70-89', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 75, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 50, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('👍'));
    });

    it('returns 👌 for codeQuality score 50-69', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 55, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 50, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('👌'));
    });

    it('returns 👎 for codeQuality score < 50', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 30, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 50, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('👎'));
    });
  });

  describe('getSecurityScoreEmoji — all branches (lines 698-699)', () => {
    it('returns 🔒 for security score >= 90', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 50, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 95, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('🔒'));
    });

    it('returns 🔐 for security score 70-89', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 50, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 75, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('🔐'));
    });

    it('returns 🔓 for security score 50-69', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 50, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 55, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('🔓'));
    });

    it('returns 💀 for security score < 50', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 50, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 30, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('💀'));
    });
  });

  describe('getSeverityEmoji — all branches (line 706-707)', () => {
    it('returns 🚨 for critical severity issue', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: {
            score: 50,
            issues: [{ type: 'security', message: 'bad', severity: 'critical', line: 1 }],
          },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 50, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('🚨'));
    });

    it('returns ⚡ for medium severity issue', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: {
            score: 50,
            issues: [{ type: 'style', message: 'bad', severity: 'medium', line: 1 }],
          },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 50, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('⚡'));
    });

    it('returns 🔸 for low severity issue', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: {
            score: 50,
            issues: [{ type: 'style', message: 'bad', severity: 'low', line: 1 }],
          },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 50, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('🔸'));
    });

    it('returns ❓ for unknown severity issue', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: {
            score: 50,
            issues: [{ type: 'style', message: 'bad', severity: 'unknown' as any, line: 1 }],
          },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: { score: 50, vulnerabilities: [] },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('❓'));
    });
  });

  describe('getSecuritySeverityEmoji — all branches (lines 715-722)', () => {
    it('returns 🚨 CRITICAL for critical vulnerability', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 50, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: {
            score: 50,
            vulnerabilities: [{ type: 'xss', severity: 'critical', line: 1, description: 'xss' }],
          },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('🚨 CRITICAL'));
    });

    it('returns ⚠️ HIGH for high vulnerability', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 50, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: {
            score: 50,
            vulnerabilities: [{ type: 'xss', severity: 'high', line: 1, description: 'xss' }],
          },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('⚠️ HIGH'));
    });

    it('returns ⚡ MEDIUM for medium vulnerability', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 50, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: {
            score: 50,
            vulnerabilities: [{ type: 'xss', severity: 'medium', line: 1, description: 'xss' }],
          },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('⚡ MEDIUM'));
    });

    it('returns 🔸 LOW for low vulnerability', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 50, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: {
            score: 50,
            vulnerabilities: [{ type: 'xss', severity: 'low', line: 1, description: 'xss' }],
          },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('🔸 LOW'));
    });

    it('returns ❓ for unknown severity vulnerability', () => {
      const result = makeResult({
        findings: {
          ...makeResult().findings,
          codeQuality: { score: 50, issues: [] },
          functionalTests: { passed: 5, failed: 0, coverage: '100%', errorMessages: [] },
          security: {
            score: 50,
            vulnerabilities: [{ type: 'xss', severity: 'unknown' as any, line: 1, description: 'xss' }],
          },
        },
      });
      const report = generateConsoleReport(result);
      assert(report.includes('❓'));
    });
  });
});

// ===========================================
// config.ts: default config file error path (lines 99-106)
// ===========================================

describe('Coverage Gaps 9: config.ts default config file error', () => {
  let originalCwd: string;
  let tempDir: string;

  before(() => {
    originalCwd = process.cwd();
    tempDir = mkdtempSync(join(tmpdir(), 'trustshell-config-cov-'));
  });

  after(() => {
    process.chdir(originalCwd);
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('falls back to default when trustshell.config.js exists but is invalid', async () => {
    // Create a trustshell.config.js that exists but will fail to parse
    writeFileSync(
      join(tempDir, 'trustshell.config.js'),
      'export default { invalid json !!! not parseable'
    );
    process.chdir(tempDir);

    const { loadConfig, DEFAULT_CONFIG } = await import('../dist/config/config.js');
    const config = await loadConfig();
    // Should fall back to defaults
    assert.strictEqual(config.depth, DEFAULT_CONFIG.depth);
  });
});

// ===========================================
// index.ts: CLI config and demo commands
// ===========================================

describe('Coverage Gaps 9: index.ts CLI commands', () => {
  const distPath = join(process.cwd(), 'dist', 'index.js');

  it('config command generates config file', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'trustshell-cli-cfg-'));
    try {
      const outputFile = join(tempDir, 'my-config.js');
      execFileSync('node', [distPath, 'config', '-o', outputFile], {
        timeout: 15000,
        encoding: 'utf8',
      });
      assert(existsSync(outputFile));
      const content = readFileSync(outputFile, 'utf8');
      assert(content.includes('testFrameworks'));
      assert(content.includes('security'));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('config command generates default trustshell.config.js', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'trustshell-cli-cfg2-'));
    try {
      process.chdir(tempDir);
      execFileSync('node', [distPath, 'config'], {
        timeout: 15000,
        encoding: 'utf8',
        cwd: tempDir,
      });
      const expectedPath = join(tempDir, 'trustshell.config.js');
      assert(existsSync(expectedPath));
    } finally {
      process.chdir(__dirname);
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('demo command runs successfully', () => {
    const output = execFileSync('node', [distPath, 'demo'], {
      timeout: 30000,
      encoding: 'utf8',
    });
    assert(output.includes('Demo') || output.includes('demo') || output.includes('==='));
  });
});
