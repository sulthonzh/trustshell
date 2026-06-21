import { readFileSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '../utils/logger.js';

export interface TrustshellConfig {
  depth: 'basic' | 'comprehensive' | 'deep';
  testFrameworks: string[];
  security: {
    enabled: boolean;
    threshold: number;
    rules: string[];
  };
  performance: {
    enabled: boolean;
    maxExecutionTime: number;
    memoryLimit: string;
  };
  customTests?: string;
  aiSource?: string | undefined;
  benchmark?: boolean;
  verbose?: boolean;
  recursive?: boolean;
  languages: {
    [language: string]: {
      testFramework: string;
      linting: boolean;
    };
  };
}

export const DEFAULT_CONFIG: TrustshellConfig = {
  depth: 'basic',
  testFrameworks: ['jest'],
  security: {
    enabled: true,
    threshold: 80,
    rules: ['no-eval', 'no-unsafe-inline', 'no-xss', 'no-sqli']
  },
  performance: {
    enabled: true,
    maxExecutionTime: 5000,
    memoryLimit: '100MB'
  },
  customTests: './tests/custom-test-cases.json',
  aiSource: undefined,
  benchmark: false,
  verbose: false,
  recursive: false,
  languages: {
    javascript: {
      testFramework: 'jest',
      linting: true
    },
    typescript: {
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
    },
    rust: {
      testFramework: 'cargo',
      linting: true
    },
    java: {
      testFramework: 'junit',
      linting: true
    },
    csharp: {
      testFramework: 'nunit',
      linting: true
    }
  }
};

export async function loadConfig(configPath?: string): Promise<TrustshellConfig> {
  let config = DEFAULT_CONFIG;
  
  // Load from config file if provided (throw on error for explicit config)
  if (configPath) {
    const fileConfig = await loadConfigFile(configPath);
    config = mergeConfig(config, fileConfig);
    logger.debug(`Loaded configuration from: ${configPath}`);
  }
  
  // Load from default config file if it exists
  const defaultConfigPath = join(process.cwd(), 'trustshell.config.js');
  if (existsSync(defaultConfigPath)) {
    try {
      const fileConfig = await loadConfigFile(defaultConfigPath);
      config = mergeConfig(config, fileConfig);
      logger.debug('Loaded default configuration file');
    } catch (error) {
      logger.warn(`Failed to load default config file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Override with environment variables (only if not explicitly set via configPath)
  if (!configPath) {
    config = overrideWithEnvVars(config);
  }
  
  logger.debug('Final configuration loaded');
  
  return config;
}

async function loadConfigFile(configPath: string): Promise<TrustshellConfig> {
  try {
    // Use dynamic import for ESM compatibility
    const configModule = await import(configPath);
    const config = configModule.default || configModule;
    
    // Validate the configuration
    validateConfig(config);
    
    return config;
  } catch (error) {
    throw new Error(`Failed to load config file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function validateConfig(config: Partial<TrustshellConfig>): void {
  // Validate depth option
  if (config.depth && !['basic', 'comprehensive', 'deep'].includes(config.depth)) {
    throw new Error(`Invalid depth option: ${config.depth}. Must be 'basic', 'comprehensive', or 'deep'`);
  }
  
  // Validate test frameworks
  if (config.testFrameworks) {
    const validFrameworks = ['jest', 'mocha', 'pytest', 'go', 'cargo', 'junit', 'nunit'];
    const invalidFrameworks = config.testFrameworks.filter(tf => !validFrameworks.includes(tf));
    if (invalidFrameworks.length > 0) {
      throw new Error(`Invalid test frameworks: ${invalidFrameworks.join(', ')}`);
    }
  }
  
  // Validate security settings
  if (config.security) {
    if (config.security.threshold < 0 || config.security.threshold > 100) {
      throw new Error(`Security threshold must be between 0 and 100, got: ${config.security.threshold}`);
    }
    
    if (config.security.enabled && (!Array.isArray(config.security.rules) || config.security.rules.length === 0)) {
      throw new Error('Security enabled but no rules provided');
    }
  }
  
  // Validate performance settings
  if (config.performance) {
    if (config.performance.maxExecutionTime <= 0) {
      throw new Error(`Max execution time must be positive, got: ${config.performance.maxExecutionTime}`);
    }
    
    if (config.performance.memoryLimit && !config.performance.memoryLimit.match(/^\d+[KMG]?B$/i)) {
      throw new Error(`Invalid memory limit format: ${config.performance.memoryLimit}`);
    }
  }
  
  // Validate language configurations
  if (config.languages) {
    const validLanguages = ['javascript', 'typescript', 'python', 'go', 'rust', 'java', 'csharp'];
    const invalidLanguages = Object.keys(config.languages).filter(lang => !validLanguages.includes(lang));
    if (invalidLanguages.length > 0) {
      throw new Error(`Invalid language configurations: ${invalidLanguages.join(', ')}`);
    }
    
    // Validate each language configuration
    Object.entries(config.languages).forEach(([lang, langConfig]) => {
      if (langConfig.testFramework && !['jest', 'mocha', 'pytest', 'go', 'cargo', 'junit', 'nunit'].includes(langConfig.testFramework)) {
        throw new Error(`Invalid test framework for ${lang}: ${langConfig.testFramework}`);
      }
      
      if (typeof langConfig.linting !== 'boolean') {
        throw new Error(`Linting setting for ${lang} must be boolean`);
      }
    });
  }
}

export function mergeConfig(base: TrustshellConfig, override: Partial<TrustshellConfig>): TrustshellConfig {
  const merged = { ...base };
  
  // Simple merge for top-level properties
  if (override.depth) merged.depth = override.depth;
  if (override.testFrameworks) merged.testFrameworks = override.testFrameworks;
  if (override.security) merged.security = { ...merged.security, ...override.security };
  if (override.performance) merged.performance = { ...merged.performance, ...override.performance };
  if (override.customTests !== undefined) merged.customTests = override.customTests;
  if (override.aiSource !== undefined) merged.aiSource = override.aiSource;
  if (override.benchmark !== undefined) merged.benchmark = override.benchmark;
  if (override.verbose !== undefined) merged.verbose = override.verbose;
  if (override.recursive !== undefined) merged.recursive = override.recursive;
  if (override.languages) merged.languages = { ...merged.languages, ...override.languages };
  
  return merged;
}

export function overrideWithEnvVars(config: TrustshellConfig): TrustshellConfig {
  const env = process.env;
  
  // Override depth from environment
  if (env.TRUSTSHELL_DEPTH) {
    const depth = env.TRUSTSHELL_DEPTH.toLowerCase() as 'basic' | 'comprehensive' | 'deep';
    if (['basic', 'comprehensive', 'deep'].includes(depth)) {
      config.depth = depth;
    }
  }
  
  // Override security threshold from environment
  if (env.TRUSTSHELL_SECURITY_THRESHOLD) {
    const threshold = parseInt(env.TRUSTSHELL_SECURITY_THRESHOLD);
    if (!isNaN(threshold) && threshold >= 0 && threshold <= 100) {
      config.security.threshold = threshold;
    }
  }
  
  // Override verbose mode from environment
  if (env.TRUSTSHELL_VERBOSE) {
    config.verbose = env.TRUSTSHELL_VERBOSE.toLowerCase() === 'true';
  }
  
  // Override performance settings from environment
  if (env.TRUSTSHELL_MAX_EXECUTION_TIME) {
    const maxTime = parseInt(env.TRUSTSHELL_MAX_EXECUTION_TIME);
    if (!isNaN(maxTime) && maxTime > 0) {
      config.performance.maxExecutionTime = maxTime;
    }
  }
  
  // Override memory limit from environment
  if (env.TRUSTSHELL_MEMORY_LIMIT) {
    if (env.TRUSTSHELL_MEMORY_LIMIT.match(/^\d+[KMG]?B$/i)) {
      config.performance.memoryLimit = env.TRUSTSHELL_MEMORY_LIMIT;
    }
  }
  
  // Override test frameworks from environment
  if (env.TRUSTSHELL_TEST_FRAMEWORKS) {
    const frameworks = env.TRUSTSHELL_TEST_FRAMEWORKS.split(',').map(f => f.trim());
    const validFrameworks = ['jest', 'mocha', 'pytest', 'go', 'cargo', 'junit', 'nunit'];
    const validFrameworksList = frameworks.filter(f => validFrameworks.includes(f));
    if (validFrameworksList.length > 0) {
      config.testFrameworks = validFrameworksList;
    }
  }
  
  // Override security enabled from environment
  if (env.TRUSTSHELL_SECURITY_ENABLED) {
    config.security.enabled = env.TRUSTSHELL_SECURITY_ENABLED.toLowerCase() === 'true';
  }
  
  // Override AI source from environment
  if (env.TRUSTSHELL_AI_SOURCE) {
    config.aiSource = env.TRUSTSHELL_AI_SOURCE;
  }
  
  // Override benchmark mode from environment
  if (env.TRUSTSHELL_BENCHMARK) {
    config.benchmark = env.TRUSTSHELL_BENCHMARK.toLowerCase() === 'true';
  }
  
  // Override recursive mode from environment
  if (env.TRUSTSHELL_RECURSIVE) {
    config.recursive = env.TRUSTSHELL_RECURSIVE.toLowerCase() === 'true';
  }
  
  return config;
}

// Utility function to save configuration
export async function saveConfig(config: TrustshellConfig, outputPath: string): Promise<void> {
  const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
  
  try {
    await writeFile(outputPath, configContent, 'utf8');
    logger.info(`Configuration saved to: ${outputPath}`);
  } catch (error) {
    throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Utility function to validate configuration file
export async function validateConfigFile(configPath: string): Promise<void> {
  try {
    await loadConfig(configPath);
    logger.info(`Configuration file is valid: ${configPath}`);
  } catch (error) {
    throw new Error(`Configuration file validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Get configuration schema for validation
export function getConfigSchema(): any {
  return {
    type: 'object',
    properties: {
      depth: {
        type: 'string',
        enum: ['basic', 'comprehensive', 'deep'],
        default: 'basic'
      },
      testFrameworks: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['jest', 'mocha', 'pytest', 'go', 'cargo', 'junit', 'nunit']
        },
        default: ['jest']
      },
      security: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          threshold: { type: 'number', minimum: 0, maximum: 100, default: 80 },
          rules: {
            type: 'array',
            items: { type: 'string' },
            default: ['no-eval', 'no-unsafe-inline', 'no-xss', 'no-sqli']
          }
        },
        required: ['enabled', 'threshold', 'rules']
      },
      performance: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          maxExecutionTime: { type: 'number', minimum: 1, default: 5000 },
          memoryLimit: { type: 'string', pattern: '^\\d+[KMG]?B$', default: '100MB' }
        },
        required: ['enabled', 'maxExecutionTime', 'memoryLimit']
      },
      customTests: { type: 'string' },
      aiSource: { type: 'string' },
      benchmark: { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      recursive: { type: 'boolean', default: false },
      languages: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            testFramework: {
              type: 'string',
              enum: ['jest', 'mocha', 'pytest', 'go', 'cargo', 'junit', 'nunit']
            },
            linting: { type: 'boolean' }
          },
          required: ['testFramework', 'linting']
        }
      }
    },
    required: ['depth', 'testFrameworks', 'security', 'performance', 'languages']
  };
}