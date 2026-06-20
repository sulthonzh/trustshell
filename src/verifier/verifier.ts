import { executeCode } from '../utils/executor.js';
import { analyzeCode } from '../analyzer/analyzer.js';
import { runTests } from '../tester/tester.js';
import { checkSecurity } from '../security/security.js';
import { logger } from '../utils/logger.js';

export interface VerificationConfig {
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
  aiSource?: string;
  benchmark?: boolean;
  verbose?: boolean;
  recursive?: boolean;
}

export interface VerificationResult {
  status: 'verified' | 'failed' | 'partial';
  confidenceScore: number;
  findings: {
    functionalTests: {
      passed: number;
      failed: number;
      coverage: string;
      errorMessages: string[];
    };
    codeQuality: {
      score: number;
      issues: Array<{
        type: 'syntax' | 'style' | 'logic' | 'performance';
        message: string;
        severity: 'low' | 'medium' | 'high';
        line?: number;
      }>;
    };
    security: {
      score: number;
      vulnerabilities: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        line?: number;
        description: string;
      }>;
    };
    performance?: {
      executionTime: number;
      memoryUsage: string;
      efficiency: number;
    };
  };
  recommendations: string[];
  metadata: {
    file: string;
    language: string;
    timestamp: string;
    verificationDepth: string;
    aiSource?: string;
  };
}

export async function verifyCode(
  filePath: string,
  language: string,
  config: VerificationConfig
): Promise<VerificationResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Use provided language or detect from file extension
  const detectedLanguage = language || detectLanguage(filePath);
  logger.info(`Starting verification for ${filePath} (${detectedLanguage}) with depth: ${config.depth}`);
  logger.debug(`Using language: ${detectedLanguage}`);
  
  // Initialize result
  const result: VerificationResult = {
    status: 'verified',
    confidenceScore: 100,
    findings: {
      functionalTests: {
        passed: 0,
        failed: 0,
        coverage: '0%',
        errorMessages: []
      },
      codeQuality: {
        score: 100,
        issues: []
      },
      security: {
        score: 100,
        vulnerabilities: []
      }
    },
    recommendations: [],
    metadata: {
      file: filePath,
      language: detectedLanguage,
      timestamp,
      verificationDepth: config.depth,
      ...(config.aiSource && { aiSource: config.aiSource })
    }
  };
  
  try {
    // 1. Code Analysis
    logger.debug('Running code analysis...');
    const analysis = await analyzeCode(filePath, detectedLanguage, config);
    result.findings.codeQuality = analysis.codeQuality;
    if (analysis.functionalTests) {
      result.findings.functionalTests = analysis.functionalTests;
    }
    
    // Update confidence score based on code quality
    result.confidenceScore = Math.min(100, result.confidenceScore - (100 - result.findings.codeQuality.score) / 2);
    
    // 2. Functional Testing
    if (config.depth !== 'basic') {
      logger.debug('Running functional tests...');
      const testResults = await runTests(filePath, detectedLanguage, config);
      result.findings.functionalTests = {
        ...result.findings.functionalTests,
        ...testResults
      };
      
      // Update confidence score based on test results
      const testPassRate = result.findings.functionalTests.passed / 
        (result.findings.functionalTests.passed + result.findings.functionalTests.failed);
      result.confidenceScore = Math.min(100, result.confidenceScore * testPassRate);
    }
    
    // 3. Security Scanning
    if (config.security.enabled) {
      logger.debug('Running security scan...');
      const securityResults = await checkSecurity(filePath, detectedLanguage, config);
      result.findings.security = securityResults;
      
      // Update confidence score based on security results
      result.confidenceScore = Math.min(100, result.confidenceScore * (result.findings.security.score / 100));
      
      if (result.findings.security.score < config.security.threshold) {
        result.status = 'failed';
        result.recommendations.push(`Security score ${result.findings.security.score}% below threshold ${config.security.threshold}%`);
      }
    }
    
    // 4. Performance Testing (if enabled)
    if (config.performance.enabled && config.depth !== 'basic') {
      logger.debug('Running performance tests...');
      const perfStart = Date.now();
      try {
        await executeCode(filePath, detectedLanguage, { timeout: config.performance.maxExecutionTime });
        const executionTime = Date.now() - perfStart;
        
        result.findings.performance = {
          executionTime,
          memoryUsage: 'N/A', // TODO: Implement memory tracking
          efficiency: Math.max(0, 100 - (executionTime / config.performance.maxExecutionTime) * 100)
        };
        
        // Update confidence score based on performance
        if (result.findings.performance.efficiency < 70) {
          result.confidenceScore *= result.findings.performance.efficiency / 100;
          result.recommendations.push('Performance below optimal threshold');
        }
        
      } catch (error) {
        result.findings.performance = {
          executionTime: Date.now() - perfStart,
          memoryUsage: 'N/A',
          efficiency: 0
        };
        result.status = 'failed';
        result.recommendations.push('Performance test failed: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
    
    // 5. Generate recommendations
    generateRecommendations(result);
    
    // Determine final status
    if (result.confidenceScore < 70) {
      result.status = 'failed';
    } else if (result.confidenceScore < 90 || result.findings.functionalTests.failed > 0) {
      result.status = 'partial';
    }
    
    const totalTime = Date.now() - startTime;
    logger.debug(`Verification completed in ${totalTime}ms`);
    logger.debug(`Final confidence score: ${result.confidenceScore}%`);
    logger.debug(`Final status: ${result.status}`);
    
    return result;
    
  } catch (error) {
    logger.error('Verification failed:', error instanceof Error ? error.message : String(error));
    result.status = 'failed';
    result.recommendations.push(`Verification error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala'
  };
  
  return languageMap[ext] || 'unknown';
}

function generateRecommendations(result: VerificationResult): void {
  const recommendations: string[] = [];
  
  // Functional test recommendations
  if (result.findings.functionalTests.failed > 0) {
    recommendations.push(`Fix ${result.findings.functionalTests.failed} failing test cases`);
  }
  
  // Code quality recommendations
  const highSeverityIssues = result.findings.codeQuality.issues.filter(issue => issue.severity === 'high');
  if (highSeverityIssues.length > 0) {
    recommendations.push(`Address ${highSeverityIssues.length} high-priority code quality issues`);
  }
  
  // Security recommendations
  const criticalVulnerabilities = result.findings.security.vulnerabilities.filter(vuln => vuln.severity === 'critical');
  if (criticalVulnerabilities.length > 0) {
    recommendations.push(`Fix ${criticalVulnerabilities.length} critical security vulnerabilities before deployment`);
  }
  
  const mediumVulnerabilities = result.findings.security.vulnerabilities.filter(vuln => vuln.severity === 'medium');
  if (mediumVulnerabilities.length > 0) {
    recommendations.push(`Address ${mediumVulnerabilities.length} medium-security issues`);
  }
  
  // Performance recommendations
  if (result.findings.performance) {
    if (result.findings.performance.efficiency < 50) {
      recommendations.push('Optimize performance - execution time significantly above threshold');
    } else if (result.findings.performance.efficiency < 80) {
      recommendations.push('Consider performance optimizations');
    }
  }
  
  // General recommendations
  if (result.status === 'partial') {
    recommendations.push('Code needs improvement before production use');
  }
  
  if (result.status === 'failed') {
    recommendations.push('Do not deploy - critical issues found');
  }
  
  result.recommendations = recommendations;
}