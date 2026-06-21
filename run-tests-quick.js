#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run tests and capture output
const testProc = spawn('node', ['--test', 'test/*.test.js'], {
  cwd: __dirname,
  stdio: 'pipe',
  shell: true
});

let output = '';
let error = '';

testProc.stdout.on('data', (data) => {
  output += data.toString();
});

testProc.stderr.on('data', (data) => {
  error += data.toString();
});

testProc.on('close', (code) => {
  console.log(output);
  if (error) console.error(error);
  process.exit(code);
});