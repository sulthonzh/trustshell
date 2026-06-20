#!/usr/bin/env node

/**
 * Test runner for trustshell using node:test (zero dependency)
 */

import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFiles = [
  'test/config.test.ts',
  'test/logger.test.ts',
  'test/analyzer.test.ts',
  'test/security.test.ts',
  'test/reporter.test.ts',
  'test/tester.test.ts',
  'test/verifier.test.ts'
];

console.log('Running trustshell tests with node:test...\n');

let failedTests = 0;
let passedTests = 0;

for (const testFile of testFiles) {
  console.log(`Running ${testFile}...`);

  const cmd = `node --test ${join(__dirname, testFile)}`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ ${testFile} FAILED`);
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      failedTests++;
    } else {
      console.log(`✅ ${testFile} PASSED`);
      passedTests++;
    }
  });
}