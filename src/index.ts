#!/usr/bin/env node

import { Command } from 'commander';
import { verifyCode } from './verifier/verifier.js';
import { loadConfig } from './config/config.js';
import { logger } from './utils/logger.js';
import { generateReport } from './reporter/reporter.js';

const program = new Command();

program
  .name('trustshell')
  .description('AI Code Output Verifier CLI - Verify AI-generated code quality and functionality')
  .version('1.0.0');

program
  .command('verify')
  .description('Verify AI-generated code for quality and functionality')
  .argument('<file>', 'Code file to verify')
  .option('-t, --test-cases <file>', 'Custom test cases file')
  .option('-d, --depth <level>', 'Verification depth (basic|comprehensive|deep)', 'basic')
  .option('-o, --output <file>', 'Output file for report')
  .option('-c, --config <file>', 'Configuration file')
  .option('--ai-source <source>', 'AI source (cursor|claude|copilot|custom)')
  .option('--strict', 'Exit with non-zero code on any failure')
  .option('--verbose', 'Verbose output')
  .option('--benchmark', 'Run performance benchmarking')
  .option('--security', 'Enable security scanning')
  .option('--security-threshold <score>', 'Minimum security score (0-100)', '80')
  .option('--performance', 'Enable performance testing')
  .option('--max-time <ms>', 'Maximum execution time in milliseconds', '5000')
  .option('--recursive', 'Process files recursively in directory')
  .action(async (file, options) => {
    try {
      logger.info(`Starting verification for: ${file}`);
      
      // Load configuration
      const config = await loadConfig(options.config);
      
      // Override config with command line options
      if (options.depth) config.depth = options.depth;
      if (options.testCases) config.customTests = options.testCases;
      if (options.security) config.security.enabled = true;
      if (options.securityThreshold) config.security.threshold = parseInt(options.securityThreshold);
      if (options.performance) config.performance.enabled = true;
      if (options.maxTime) config.performance.maxExecutionTime = parseInt(options.maxTime);
      if (options.benchmark) config.benchmark = true;
      if (options.verbose) config.verbose = true;
      
      // Run verification
      const result = await verifyCode(file, '', {
        ...config,
        aiSource: options.aiSource,
        recursive: options.recursive
      });
      
      // Generate report if requested
      if (options.output) {
        await generateReport(result, options.output);
        logger.info(`Report generated: ${options.output}`);
      }
      
      // Output results
      console.log('\n=== Verification Results ===');
      console.log(`Status: ${result.status.toUpperCase()}`);
      console.log(`Confidence Score: ${result.confidenceScore}%`);
      console.log(`Functional Tests: ${result.findings.functionalTests.passed}/${result.findings.functionalTests.passed + result.findings.functionalTests.failed} passed (${result.findings.functionalTests.coverage})`);
      console.log(`Code Quality: ${result.findings.codeQuality.score}/100`);
      console.log(`Security: ${result.findings.security.score}/100`);
      
      if (result.findings.security.vulnerabilities.length > 0) {
        console.log(`\nSecurity Issues: ${result.findings.security.vulnerabilities.length} found`);
        result.findings.security.vulnerabilities.forEach(vuln => {
          console.log(`  - ${vuln.type}: ${vuln.severity} (line ${vuln.line})`);
        });
      }
      
      if (result.recommendations.length > 0) {
        console.log('\nRecommendations:');
        result.recommendations.forEach(rec => {
          console.log(`  - ${rec}`);
        });
      }
      
      // Exit with appropriate code
      if (options.strict && result.status !== 'verified') {
        process.exit(1);
      }
      
      logger.info('Verification completed successfully');
      
    } catch (error) {
      logger.error('Verification failed:', error instanceof Error ? error.message : String(error));
      if (options.verbose) {
        console.error((error as Error).stack);
      }
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Generate configuration file')
  .option('-o, --output <file>', 'Output file', 'trustshell.config.js')
  .action(async (options) => {
    try {
      const configTemplate = `module.exports = {
  // Test frameworks to use
  testFrameworks: ['jest', 'mocha'],
  
  // Security scanning configuration
  security: {
    enabled: true,
    threshold: 80, // Minimum security score
    rules: ['no-eval', 'no-unsafe-inline']
  },
  
  // Performance thresholds
  performance: {
    enabled: true,
    maxExecutionTime: 5000,
    memoryLimit: '100MB'
  },
  
  // Custom test cases
  customTests: './tests/custom-test-cases.json',
  
  // Language-specific settings
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
};`;
      
      require('fs').writeFileSync(options.output, configTemplate);
      logger.info(`Configuration file generated: ${options.output}`);
      
    } catch (error) {
      logger.error('Failed to generate configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('demo')
  .description('Run trustshell demo')
  .action(async () => {
    try {
      // Create a simple demo code
      const demoCode = `// Demo: Simple addition function
function add(a, b) {
  return a + b;
}

// Test cases
console.log(add(1, 2)); // Should output 3
console.log(add(-1, 5)); // Should output 4
console.log(add(0, 0)); // Should output 0`;

      const fs = require('fs');
      const demoFile = '/tmp/demo-code.js';
      fs.writeFileSync(demoFile, demoCode);
      
      logger.info(`Demo code created: ${demoFile}`);
      logger.info('Running verification...');
      
      // Run verification
      const result = await verifyCode(demoFile, '', {
        depth: 'basic',
        testFrameworks: ['jest'],
        security: { enabled: true, threshold: 80, rules: ['no-eval'] },
        performance: { enabled: false, maxExecutionTime: 5000, memoryLimit: '100MB' },
        verbose: false
      });
      
      console.log('\n=== Demo Results ===');
      console.log(`Status: ${result.status.toUpperCase()}`);
      console.log(`Confidence Score: ${result.confidenceScore}%`);
      
      // Clean up
      fs.unlinkSync(demoFile);
      
    } catch (error) {
      logger.error('Demo failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Parse command line arguments
program.parse();