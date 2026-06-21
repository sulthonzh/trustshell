/**
 * Tests for config module - Configuration loading, validation, and merging
 */

import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { unlinkSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  loadConfig,
  DEFAULT_CONFIG,
  mergeConfig,
  validateConfig,
  overrideWithEnvVars,
  saveConfig,
  validateConfigFile,
  getConfigSchema
} from '../dist/config/config.js';

describe('config module', () => {

  describe('DEFAULT_CONFIG', () => {
    it('should have all required configuration fields', () => {
      assert.strictEqual(typeof DEFAULT_CONFIG.depth, 'string');
      assert.strictEqual(typeof DEFAULT_CONFIG.testFrameworks, 'object');
      assert.strictEqual(typeof DEFAULT_CONFIG.security, 'object');
      assert.strictEqual(typeof DEFAULT_CONFIG.performance, 'object');
      assert.strictEqual(typeof DEFAULT_CONFIG.languages, 'object');
    });

    it('should have valid default depth', () => {
      assert(['basic', 'comprehensive', 'deep'].includes(DEFAULT_CONFIG.depth));
    });

    it('should have valid default test frameworks', () => {
      assert(Array.isArray(DEFAULT_CONFIG.testFrameworks));
      assert(DEFAULT_CONFIG.testFrameworks.length > 0);
    });

    it('should have security enabled by default', () => {
      assert.strictEqual(DEFAULT_CONFIG.security.enabled, true);
      assert.strictEqual(DEFAULT_CONFIG.security.threshold, 80);
      assert(Array.isArray(DEFAULT_CONFIG.security.rules));
      assert(DEFAULT_CONFIG.security.rules.length > 0);
    });

    it('should have performance enabled by default', () => {
      assert.strictEqual(DEFAULT_CONFIG.performance.enabled, true);
      assert.strictEqual(DEFAULT_CONFIG.performance.maxExecutionTime, 5000);
      assert.strictEqual(DEFAULT_CONFIG.performance.memoryLimit, '100MB');
    });

    it('should have language configurations', () => {
      assert(Object.keys(DEFAULT_CONFIG.languages).length > 0);
      assert(DEFAULT_CONFIG.languages.javascript);
      assert(DEFAULT_CONFIG.languages.javascript.testFramework);
      assert.strictEqual(typeof DEFAULT_CONFIG.languages.javascript.linting, 'boolean');
    });
  });

  describe('mergeConfig', () => {
    it('should merge depth override', () => {
      const merged = mergeConfig(DEFAULT_CONFIG, { depth: 'comprehensive' });
      assert.strictEqual(merged.depth, 'comprehensive');
      assert.strictEqual(merged.testFrameworks.length, DEFAULT_CONFIG.testFrameworks.length);
    });

    it('should merge test frameworks override', () => {
      const newFrameworks = ['mocha', 'pytest'];
      const merged = mergeConfig(DEFAULT_CONFIG, { testFrameworks: newFrameworks });
      assert.deepStrictEqual(merged.testFrameworks, newFrameworks);
    });

    it('should merge security override', () => {
      const securityOverride = { enabled: false, threshold: 90, rules: ['no-eval'] };
      const merged = mergeConfig(DEFAULT_CONFIG, { security: securityOverride });
      assert.strictEqual(merged.security.enabled, false);
      assert.strictEqual(merged.security.threshold, 90);
      assert.deepStrictEqual(merged.security.rules, ['no-eval']);
    });

    it('should merge performance override', () => {
      const performanceOverride = { enabled: false, maxExecutionTime: 10000, memoryLimit: '200MB' };
      const merged = mergeConfig(DEFAULT_CONFIG, { performance: performanceOverride });
      assert.strictEqual(merged.performance.enabled, false);
      assert.strictEqual(merged.performance.maxExecutionTime, 10000);
      assert.strictEqual(merged.performance.memoryLimit, '200MB');
    });

    it('should merge languages override', () => {
      const languagesOverride = {
        python: { testFramework: 'pytest', linting: false }
      };
      const merged = mergeConfig(DEFAULT_CONFIG, { languages: languagesOverride });
      assert.deepStrictEqual(merged.languages.python, { testFramework: 'pytest', linting: false });
      assert.strictEqual(merged.languages.javascript.testFramework, DEFAULT_CONFIG.languages.javascript.testFramework);
    });

    it('should preserve defaults when no override provided', () => {
      const merged = mergeConfig(DEFAULT_CONFIG, {});
      assert.strictEqual(merged.depth, DEFAULT_CONFIG.depth);
      assert.deepStrictEqual(merged.testFrameworks, DEFAULT_CONFIG.testFrameworks);
      assert.strictEqual(merged.security.threshold, DEFAULT_CONFIG.security.threshold);
    });

    it('should handle multiple overrides simultaneously', () => {
      const overrides = {
        depth: 'deep' as const,
        testFrameworks: ['mocha'],
        security: { enabled: false, threshold: 50, rules: [] },
        performance: { enabled: false, maxExecutionTime: 1000, memoryLimit: '10MB' }
      };
      const merged = mergeConfig(DEFAULT_CONFIG, overrides);
      assert.strictEqual(merged.depth, 'deep');
      assert.deepStrictEqual(merged.testFrameworks, ['mocha']);
      assert.strictEqual(merged.security.enabled, false);
      assert.strictEqual(merged.security.threshold, 50);
      assert.strictEqual(merged.performance.enabled, false);
    });
  });

  describe('overrideWithEnvVars', () => {
    it('should override depth from environment variable', () => {
      process.env.TRUSTSHELL_DEPTH = 'comprehensive';
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.strictEqual(config.depth, 'comprehensive');
      delete process.env.TRUSTSHELL_DEPTH;
    });

    it('should reject invalid depth from environment variable', () => {
      process.env.TRUSTSHELL_DEPTH = 'invalid';
      const originalDepth = DEFAULT_CONFIG.depth;
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.strictEqual(config.depth, originalDepth);
      delete process.env.TRUSTSHELL_DEPTH;
    });

    it('should override security threshold from environment variable', () => {
      process.env.TRUSTSHELL_SECURITY_THRESHOLD = '90';
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.strictEqual(config.security.threshold, 90);
      delete process.env.TRUSTSHELL_SECURITY_THRESHOLD;
    });

    it('should reject invalid security threshold from environment variable', () => {
      process.env.TRUSTSHELL_SECURITY_THRESHOLD = '150';
      const originalThreshold = DEFAULT_CONFIG.security.threshold;
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.strictEqual(config.security.threshold, originalThreshold);
      delete process.env.TRUSTSHELL_SECURITY_THRESHOLD;
    });

    it('should override verbose mode from environment variable', () => {
      process.env.TRUSTSHELL_VERBOSE = 'true';
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.strictEqual(config.verbose, true);
      delete process.env.TRUSTSHELL_VERBOSE;
    });

    it('should handle verbose=false from environment variable', () => {
      process.env.TRUSTSHELL_VERBOSE = 'false';
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.strictEqual(config.verbose, false);
      delete process.env.TRUSTSHELL_VERBOSE;
    });

    it('should override performance settings from environment variables', () => {
      process.env.TRUSTSHELL_MAX_EXECUTION_TIME = '10000';
      process.env.TRUSTSHELL_MEMORY_LIMIT = '200MB';
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.strictEqual(config.performance.maxExecutionTime, 10000);
      assert.strictEqual(config.performance.memoryLimit, '200MB');
      delete process.env.TRUSTSHELL_MAX_EXECUTION_TIME;
      delete process.env.TRUSTSHELL_MEMORY_LIMIT;
    });

    it('should reject invalid memory limit format from environment variable', () => {
      process.env.TRUSTSHELL_MEMORY_LIMIT = 'invalid';
      const originalLimit = DEFAULT_CONFIG.performance.memoryLimit;
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.strictEqual(config.performance.memoryLimit, originalLimit);
      delete process.env.TRUSTSHELL_MEMORY_LIMIT;
    });

    it('should override test frameworks from environment variable', () => {
      process.env.TRUSTSHELL_TEST_FRAMEWORKS = 'mocha,pytest';
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.deepStrictEqual(config.testFrameworks, ['mocha', 'pytest']);
      delete process.env.TRUSTSHELL_TEST_FRAMEWORKS;
    });

    it('should filter invalid test frameworks from environment variable', () => {
      process.env.TRUSTSHELL_TEST_FRAMEWORKS = 'mocha,invalid-framework';
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.deepStrictEqual(config.testFrameworks, ['mocha']);
      delete process.env.TRUSTSHELL_TEST_FRAMEWORKS;
    });

    it('should override security enabled from environment variable', () => {
      process.env.TRUSTSHELL_SECURITY_ENABLED = 'false';
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.strictEqual(config.security.enabled, false);
      delete process.env.TRUSTSHELL_SECURITY_ENABLED;
    });

    it('should handle multiple environment variables simultaneously', () => {
      process.env.TRUSTSHELL_DEPTH = 'deep';
      process.env.TRUSTSHELL_SECURITY_THRESHOLD = '95';
      process.env.TRUSTSHELL_VERBOSE = 'true';
      const config = overrideWithEnvVars({ ...DEFAULT_CONFIG });
      assert.strictEqual(config.depth, 'deep');
      assert.strictEqual(config.security.threshold, 95);
      assert.strictEqual(config.verbose, true);
      delete process.env.TRUSTSHELL_DEPTH;
      delete process.env.TRUSTSHELL_SECURITY_THRESHOLD;
      delete process.env.TRUSTSHELL_VERBOSE;
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      assert.doesNotThrow(() => validateConfig(DEFAULT_CONFIG));
    });

    it('should reject invalid depth option', () => {
      const invalidConfig = { ...DEFAULT_CONFIG, depth: 'invalid' as any };
      assert.throws(() => validateConfig(invalidConfig), /Invalid depth option/);
    });

    it('should reject invalid test frameworks', () => {
      const invalidConfig = { ...DEFAULT_CONFIG, testFrameworks: ['invalid-framework'] };
      assert.throws(() => validateConfig(invalidConfig), /Invalid test frameworks/);
    });

    it('should reject security threshold out of range (negative)', () => {
      const invalidConfig = { ...DEFAULT_CONFIG, security: { ...DEFAULT_CONFIG.security, threshold: -10 } };
      assert.throws(() => validateConfig(invalidConfig), /Security threshold must be between 0 and 100/);
    });

    it('should reject security threshold out of range (>100)', () => {
      const invalidConfig = { ...DEFAULT_CONFIG, security: { ...DEFAULT_CONFIG.security, threshold: 150 } };
      assert.throws(() => validateConfig(invalidConfig), /Security threshold must be between 0 and 100/);
    });

    it('should reject security enabled with no rules', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        security: { enabled: true, threshold: 80, rules: [] }
      };
      assert.throws(() => validateConfig(invalidConfig), /Security enabled but no rules provided/);
    });

    it('should reject non-positive max execution time', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        performance: { ...DEFAULT_CONFIG.performance, maxExecutionTime: 0 }
      };
      assert.throws(() => validateConfig(invalidConfig), /Max execution time must be positive/);
    });

    it('should reject negative max execution time', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        performance: { ...DEFAULT_CONFIG.performance, maxExecutionTime: -1000 }
      };
      assert.throws(() => validateConfig(invalidConfig), /Max execution time must be positive/);
    });

    it('should reject invalid memory limit format', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        performance: { ...DEFAULT_CONFIG.performance, memoryLimit: 'invalid' }
      };
      assert.throws(() => validateConfig(invalidConfig), /Invalid memory limit format/);
    });

    it('should reject invalid language configurations', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        languages: { invalidLanguage: { testFramework: 'jest', linting: true } }
      };
      assert.throws(() => validateConfig(invalidConfig), /Invalid language configurations/);
    });

    it('should reject invalid test framework for language', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        languages: { javascript: { testFramework: 'invalid', linting: true } }
      };
      assert.throws(() => validateConfig(invalidConfig), /Invalid test framework for javascript/);
    });

    it('should reject non-boolean linting setting', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        languages: { javascript: { testFramework: 'jest', linting: 'yes' as any } }
      };
      assert.throws(() => validateConfig(invalidConfig), /Linting setting for javascript must be boolean/);
    });
  });

  describe('getConfigSchema', () => {
    it('should return a valid schema object', () => {
      const schema = getConfigSchema();
      assert.strictEqual(typeof schema, 'object');
      assert.strictEqual(schema.type, 'object');
      assert.strictEqual(typeof schema.properties, 'object');
    });

    it('should include all configuration properties in schema', () => {
      const schema = getConfigSchema();
      assert(schema.properties.depth);
      assert(schema.properties.testFrameworks);
      assert(schema.properties.security);
      assert(schema.properties.performance);
      assert(schema.properties.languages);
    });

    it('should have correct schema structure for depth property', () => {
      const schema = getConfigSchema();
      const depthSchema = schema.properties.depth;
      assert.strictEqual(depthSchema.type, 'string');
      assert(Array.isArray(depthSchema.enum));
      assert(depthSchema.enum.includes('basic'));
      assert(depthSchema.enum.includes('comprehensive'));
      assert(depthSchema.enum.includes('deep'));
    });

    it('should have correct schema structure for testFrameworks property', () => {
      const schema = getConfigSchema();
      const testFrameworksSchema = schema.properties.testFrameworks;
      assert.strictEqual(testFrameworksSchema.type, 'array');
      assert.strictEqual(testFrameworksSchema.items.type, 'string');
      assert(Array.isArray(testFrameworksSchema.items.enum));
    });

    it('should have correct schema structure for security property', () => {
      const schema = getConfigSchema();
      const securitySchema = schema.properties.security;
      assert.strictEqual(securitySchema.type, 'object');
      assert(securitySchema.properties);
      assert(securitySchema.properties.enabled);
      assert(securitySchema.properties.threshold);
      assert(securitySchema.properties.rules);
    });

    it('should have correct schema structure for performance property', () => {
      const schema = getConfigSchema();
      const performanceSchema = schema.properties.performance;
      assert.strictEqual(performanceSchema.type, 'object');
      assert(performanceSchema.properties);
      assert(performanceSchema.properties.enabled);
      assert(performanceSchema.properties.maxExecutionTime);
      assert(performanceSchema.properties.memoryLimit);
    });

    it('should have correct schema structure for languages property', () => {
      const schema = getConfigSchema();
      const languagesSchema = schema.properties.languages;
      assert.strictEqual(languagesSchema.type, 'object');
      assert(languagesSchema.additionalProperties);
    });
  });
});

describe('config file operations', () => {
  const testConfigPath = '/tmp/trustshell-test-config.js';
  const invalidConfigPath = '/tmp/trustshell-test-config-invalid.js';

  // Clean up before tests
  const cleanup = () => {
    try {
      if (existsSync(testConfigPath)) unlinkSync(testConfigPath);
      if (existsSync(invalidConfigPath)) unlinkSync(invalidConfigPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  const before = cleanup;
  const after = cleanup;

  describe('saveConfig', () => {
    it('should save configuration to file', () => {
      const testConfig = {
        ...DEFAULT_CONFIG,
        depth: 'comprehensive' as const
      };
      assert.doesNotThrow(() => saveConfig(testConfig, testConfigPath));
      assert(existsSync(testConfigPath));
    });

    it('should save configuration as valid JavaScript module', async () => {
      const testConfig = DEFAULT_CONFIG;
      await saveConfig(testConfig, testConfigPath);
      const content = readFileSync(testConfigPath, 'utf8');
      assert(content.startsWith('export default'));
      assert(content.endsWith(';'));
    });

    it('should save configuration with custom settings', async () => {
      const customConfig = {
        depth: 'deep' as const,
        testFrameworks: ['mocha'],
        security: {
          enabled: false,
          threshold: 50,
          rules: ['no-eval']
        },
        performance: {
          enabled: false,
          maxExecutionTime: 1000,
          memoryLimit: '10MB'
        },
        languages: {
          javascript: { testFramework: 'mocha', linting: false }
        }
      };
      await saveConfig(customConfig, testConfigPath);
      const content = readFileSync(testConfigPath, 'utf8');
      const jsonStr = content.replace('export default ', '').replace(/;$/, '');
      const loadedConfig = JSON.parse(jsonStr);
      assert.strictEqual(loadedConfig.depth, 'deep');
      assert.deepStrictEqual(loadedConfig.testFrameworks, ['mocha']);
      assert.strictEqual(loadedConfig.security.enabled, false);
    });

    it('should throw error for invalid output path', () => {
      const invalidPath = '/nonexistent/directory/config.js';
      assert.rejects(async () => {
        await saveConfig(DEFAULT_CONFIG, invalidPath);
      });
    });
  });

  describe('validateConfigFile', () => {
    it('should validate a valid configuration file', async () => {
      const validConfig = DEFAULT_CONFIG;
      await saveConfig(validConfig, testConfigPath);
      assert.doesNotThrow(async () => await validateConfigFile(testConfigPath));
    });

    it('should throw error for invalid configuration file', async () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        depth: 'invalid' as any
      };
      await saveConfig(invalidConfig, invalidConfigPath);
      await assert.rejects(async () => {
        await validateConfigFile(invalidConfigPath);
      }, /Configuration file validation failed/);
    });

    it('should throw error for non-existent file', async () => {
      await assert.rejects(async () => {
        await validateConfigFile('/nonexistent/path.js');
      }, /Configuration file validation failed/);
    });
  });

  describe('loadConfig', () => {
    it('should load default configuration when no config path provided', async () => {
      const config = await loadConfig();
      assert.strictEqual(config.depth, DEFAULT_CONFIG.depth);
      assert.strictEqual(config.security.threshold, DEFAULT_CONFIG.security.threshold);
    });

    it('should load configuration from provided path', async () => {
      const customConfig = {
        ...DEFAULT_CONFIG,
        depth: 'comprehensive' as const,
        testFrameworks: ['mocha'],
        security: {
          enabled: true,
          threshold: 90,
          rules: ['no-eval', 'no-xss']
        },
        performance: {
          enabled: true,
          maxExecutionTime: 3000,
          memoryLimit: '50MB'
        },
        languages: {
          javascript: { testFramework: 'mocha', linting: true }
        }
      };
      await saveConfig(customConfig, testConfigPath);
      const config = await loadConfig(testConfigPath);
      assert.strictEqual(config.depth, 'comprehensive');
      assert.deepStrictEqual(config.testFrameworks, ['mocha']);
      assert.strictEqual(config.security.threshold, 90);
    });

    it('should handle invalid config file gracefully', async () => {
      await saveConfig({ 
        ...DEFAULT_CONFIG,
        depth: 'invalid' as any
      }, invalidConfigPath);
      const config = await loadConfig(invalidConfigPath);
      // Should fall back to default config
      assert.strictEqual(config.depth, DEFAULT_CONFIG.depth);
    });

    it('should handle non-existent config file gracefully', async () => {
      const config = await loadConfig('/nonexistent/path.js');
      // Should fall back to default config
      assert.strictEqual(config.depth, DEFAULT_CONFIG.depth);
    });

    it('should apply environment variable overrides', async () => {
      process.env.TRUSTSHELL_DEPTH = 'deep';
      process.env.TRUSTSHELL_SECURITY_THRESHOLD = '95';
      const config = await loadConfig();
      assert.strictEqual(config.depth, 'deep');
      assert.strictEqual(config.security.threshold, 95);
      delete process.env.TRUSTSHELL_DEPTH;
      delete process.env.TRUSTSHELL_SECURITY_THRESHOLD;
    });

    it('should merge file config with environment overrides', async () => {
      // Clear any existing env vars
      delete process.env.TRUSTSHELL_DEPTH;
      delete process.env.TRUSTSHELL_SECURITY_THRESHOLD;
      
      const customConfig = {
        ...DEFAULT_CONFIG,
        depth: 'comprehensive' as const,
        testFrameworks: ['mocha'],
        security: {
          enabled: true,
          threshold: 80,
          rules: ['no-eval']
        },
        performance: {
          enabled: true,
          maxExecutionTime: 5000,
          memoryLimit: '100MB'
        },
        languages: {
          javascript: { testFramework: 'mocha', linting: true }
        }
      };
      saveConfig(customConfig, testConfigPath);
      process.env.TRUSTSHELL_SECURITY_THRESHOLD = '95';
      const config = await loadConfig(testConfigPath);
      assert.strictEqual(config.depth, 'comprehensive');
      assert.strictEqual(config.security.threshold, 95);
      delete process.env.TRUSTSHELL_SECURITY_THRESHOLD;
    });
  });
});