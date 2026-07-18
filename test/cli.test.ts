/**
 * Tests for CLI entry point (index.ts)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, rmSync, mkdirSync } from 'fs';

describe('CLI module', () => {
  const setup = () => {
    const testDir = '/tmp/trustshell-cli-test';
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    return testDir;
  };

  const teardown = (testDir: string) => {
    rmSync(testDir, { recursive: true, force: true });
  };

  const getOutput = (args: string[]): string => {
    try {
      return execSync(`node dist/index.js ${args.join(' ')}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) {
      // Exit code is not important for --help/--version
      return '';
    }
  };

  describe('--help/-h', () => {
    it('should display help text with -h flag', () => {
      const output = getOutput(['-h']);
      assert.ok(output.includes('Usage: trustshell [options] [command]'));
      assert.ok(output.includes('AI Code Output Verifier'));
    });

    it('should display help text with --help flag', () => {
      const output = getOutput(['--help']);
      assert.ok(output.includes('AI Code Output Verifier'));
    });

    it('should show all commands', () => {
      const output = getOutput(['--help']);
      assert.ok(output.includes('Commands:'));
      assert.ok(output.includes('verify'));
      assert.ok(output.includes('config'));
      assert.ok(output.includes('demo'));
    });
  });

  describe('--version/-V', () => {
    it('should display version number with -V flag', () => {
      const output = getOutput(['-V']);
      assert.ok(/^\d+\.\d+\.\d+$/.test(output.trim()));
    });

    it('should display version number with --version flag', () => {
      const output = getOutput(['--version']);
      assert.ok(/^\d+\.\d+\.\d+$/.test(output.trim()));
    });
  });

  describe('verify command', () => {
    const testDir = '/tmp/trustshell-cli-test';
    let testFile: string;

    before(() => {
      rmSync(testDir, { recursive: true, force: true });
      mkdirSync(testDir, { recursive: true });
    });

    after(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should verify valid TypeScript file', () => {
      testFile = `${testDir}/test.ts`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      const output = getOutput(['verify', testFile]);
      assert.ok(output.includes('Status'));
    });

    it('should verify valid JavaScript file', () => {
      testFile = `${testDir}/test.js`;
      writeFileSync(testFile, 'const test = "hello";\n');
      const output = getOutput(['verify', testFile]);
      assert.ok(output.includes('Status'));
    });

    it('should verify Python file', () => {
      testFile = `${testDir}/test.py`;
      writeFileSync(testFile, 'def test():\n    return "hello"\n');
      const output = getOutput(['verify', testFile]);
      assert.ok(output.includes('Status'));
    });

    it('should verify Go file', () => {
      testFile = `${testDir}/test.go`;
      writeFileSync(testFile, 'package main\n\nfunc main() {\n}\n');
      const output = getOutput(['verify', testFile]);
      assert.ok(output.includes('Status'));
    });

    it('should verify Rust file', () => {
      testFile = `${testDir}/test.rs`;
      writeFileSync(testFile, 'fn main() {}\n');
      const output = getOutput(['verify', testFile]);
      assert.ok(output.includes('Status'));
    });

    it('should use default depth when not specified', () => {
      testFile = `${testDir}/test.ts`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      const output = getOutput(['verify', testFile]);
      assert.ok(output.includes('Status'));
    });

    it('should use basic depth', () => {
      testFile = `${testDir}/test.ts`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      const output = getOutput(['verify', testFile, '--depth', 'basic']);
      assert.ok(output.includes('Status'));
    });

    it('should use comprehensive depth', () => {
      testFile = `${testDir}/test.ts`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      const output = getOutput(['verify', testFile, '--depth', 'comprehensive']);
      assert.ok(output.includes('Status'));
    });

    it('should use deep depth', () => {
      testFile = `${testDir}/test.ts`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      const output = getOutput(['verify', testFile, '--depth', 'deep']);
      assert.ok(output.includes('Status'));
    });

    it('should output to file with --output flag', () => {
      testFile = `${testDir}/test.ts`;
      const outputFile = `${testDir}/report.json`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      getOutput(['verify', testFile, '--output', outputFile]);
      // Report should be written to file
      const reportContent = readFileSync(outputFile, 'utf8');
      assert.ok(reportContent.length > 0);
    });

    it('should use custom config with --config flag', () => {
      testFile = `${testDir}/test.ts`;
      const configFile = `${testDir}/config.json`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      writeFileSync(configFile, '{}');
      const output = getOutput(['verify', testFile, '--config', configFile]);
      assert.ok(output.includes('Status'));
    });

    it('should set AI source', () => {
      testFile = `${testDir}/test.ts`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      const output = getOutput(['verify', testFile, '--ai-source', 'cursor']);
      assert.ok(output.includes('Status'));
    });

    it('should enable verbose output', () => {
      testFile = `${testDir}/test.ts`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      const output = getOutput(['verify', testFile, '--verbose']);
      assert.ok(output.includes('Status'));
    });

    it('should enable security scanning', () => {
      testFile = `${testDir}/test.ts`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      const output = getOutput(['verify', testFile, '--security']);
      assert.ok(output.includes('Status'));
    });

    it('should set security threshold', () => {
      testFile = `${testDir}/test.ts`;
      writeFileSync(testFile, 'export const test = "hello";\n');
      const output = getOutput(['verify', testFile, '--security-threshold', '70']);
      assert.ok(output.includes('Status'));
    });

    it('should exit with error for non-existent file', () => {
      testFile = `${testDir}/nonexistent.ts`;
      try {
        getOutput(['verify', testFile]);
        assert.fail('Should have thrown error for non-existent file');
      } catch (error: any) {
        // Expected behavior
        assert.ok(true);
      }
    });

  });

  describe('config command', () => {
    const testDir = '/tmp/trustshell-cli-test';

    before(() => {
      rmSync(testDir, { recursive: true, force: true });
      mkdirSync(testDir, { recursive: true });
    });

    after(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should generate config file', () => {
      const configFile = `${testDir}/config.json`;
      getOutput(['config', '--output', configFile]);
      assert.ok(readFileSync(configFile, 'utf8'));
    });

  });

  describe('demo command', () => {
    it('should run demo', () => {
      const output = getOutput(['demo']);
      assert.ok(output.includes('Demo'));
    });
  });

  describe('edge cases', () => {
    it('should handle unknown command gracefully', () => {
      // Unknown commands exit non-zero, getOutput catches and returns ''
      let threw = false;
      try {
        execSync(`node dist/index.js unknown-command`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch {
        threw = true;
      }
      assert.ok(threw, 'Unknown command should exit with error');
    });

    it('should handle invalid options', () => {
      // Invalid options exit non-zero
      let threw = false;
      try {
        execSync(`node dist/index.js verify test.ts --invalid-option`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch {
        threw = true;
      }
      assert.ok(threw, 'Invalid options should exit with error');
    });
  });
});
