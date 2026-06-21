/**
 * Tests for reporter module - Report generation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  generateReport,
  generateJsonReport,
  generateHtmlReport,
  generateMarkdownReport,
  generateXmlReport,
  generateConsoleReport,
  DEFAULT_REPORT_CONFIG,
  validateReportOutput,
  generateMultipleReports
} from '../dist/reporter/reporter.js';
import type { VerificationResult } from '../dist/verifier/verifier.js';
import type { ReportConfig } from '../dist/reporter/reporter.js';

describe('reporter module', () => {
  let testDir: string;

  const setup = () => {
    testDir = mkdtempSync(join(tmpdir(), 'trustshell-reporter-test-'));
  };

  const teardown = () => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  };

  const getMockVerificationResult = (): VerificationResult => {
    return {
      status: 'verified',
      confidenceScore: 85,
      findings: {
        functionalTests: {
          passed: 10,
          failed: 2,
          coverage: '75%',
          errorMessages: ['Test 3 failed', 'Test 7 failed']
        },
        codeQuality: {
          score: 78,
          issues: [
            { type: 'style', message: 'Missing semicolon', severity: 'low', line: 5 },
            { type: 'logic', message: 'Unused variable', severity: 'medium', line: 12 }
          ]
        },
        security: {
          score: 90,
          vulnerabilities: [
            { type: 'no-eval', severity: 'critical', line: 3, description: 'Dangerous eval usage' }
          ]
        }
      },
      recommendations: [
        'Fix eval usage for security',
        'Remove unused variables',
        'Add more unit tests'
      ],
      metadata: {
        file: '/path/to/test.js',
        language: 'javascript',
        verificationDepth: 'comprehensive',
        timestamp: new Date().toISOString(),
        aiSource: 'GPT-4'
      }
    };
  };

  describe('DEFAULT_REPORT_CONFIG', () => {
    it('should have correct default values', () => {
      assert.strictEqual(DEFAULT_REPORT_CONFIG.includeDetails, true);
      assert.strictEqual(DEFAULT_REPORT_CONFIG.includeCode, false);
      assert.strictEqual(DEFAULT_REPORT_CONFIG.includeRecommendations, true);
      assert.strictEqual(DEFAULT_REPORT_CONFIG.includeTimestamp, true);
      assert.strictEqual(DEFAULT_REPORT_CONFIG.includeMetrics, true);
      assert.strictEqual(DEFAULT_REPORT_CONFIG.customTemplate, undefined);
    });
  });

  describe('generateJsonReport', () => {
    it('should generate valid JSON report', () => {
      const result = getMockVerificationResult();
      const json = generateJsonReport(result);
      assert.doesNotThrow(() => JSON.parse(json));
    });

    it('should include all required fields', () => {
      const result = getMockVerificationResult();
      const json = generateJsonReport(result);
      const parsed = JSON.parse(json);
      assert.strictEqual(parsed.status, result.status);
      assert.strictEqual(parsed.confidenceScore, result.confidenceScore);
      assert(parsed.findings);
      assert(parsed.findings.functionalTests);
      assert(parsed.findings.codeQuality);
      assert(parsed.findings.security);
      assert(parsed.metadata);
    });

    it('should include recommendations when configured', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: true };
      const json = generateJsonReport(result, config);
      const parsed = JSON.parse(json);
      assert(Array.isArray(parsed.recommendations));
      assert.strictEqual(parsed.recommendations.length, result.recommendations.length);
    });

    it('should not include recommendations when disabled', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: false };
      const json = generateJsonReport(result, config);
      const parsed = JSON.parse(json);
      assert(!parsed.recommendations);
    });

    it('should include timestamp when configured', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeTimestamp: true };
      const json = generateJsonReport(result, config);
      const parsed = JSON.parse(json);
      assert(parsed.generatedAt);
      assert.doesNotThrow(() => new Date(parsed.generatedAt));
    });

    it('should not include timestamp when disabled', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeTimestamp: false };
      const json = generateJsonReport(result, config);
      const parsed = JSON.parse(json);
      assert(!parsed.generatedAt);
    });

    it('should include details when configured', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeDetails: true };
      const json = generateJsonReport(result, config);
      const parsed = JSON.parse(json);
      assert(parsed.details);
      assert.strictEqual(parsed.details.totalTests, 12);
      assert.strictEqual(parsed.details.totalIssues, 2);
      assert.strictEqual(parsed.details.totalVulnerabilities, 1);
    });

    it('should not include details when disabled', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeDetails: false };
      const json = generateJsonReport(result, config);
      const parsed = JSON.parse(json);
      assert(!parsed.details);
    });

    it('should include metrics when configured', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeMetrics: true };
      const json = generateJsonReport(result, config);
      const parsed = JSON.parse(json);
      assert(parsed.metrics);
      assert(typeof parsed.metrics.codeQualityScore === 'number');
      assert(typeof parsed.metrics.securityScore === 'number');
      assert(typeof parsed.metrics.testPassRate === 'number');
    });

    it('should handle empty recommendations', () => {
      const result = getMockVerificationResult();
      result.recommendations = [];
      const json = generateJsonReport(result);
      const parsed = JSON.parse(json);
      assert(!parsed.recommendations);
    });

    it('should handle no vulnerabilities', () => {
      const result = getMockVerificationResult();
      result.findings.security.vulnerabilities = [];
      const json = generateJsonReport(result);
      const parsed = JSON.parse(json);
      assert.strictEqual(parsed.findings.security.vulnerabilities.length, 0);
    });

    it('should handle no code quality issues', () => {
      const result = getMockVerificationResult();
      result.findings.codeQuality.issues = [];
      const json = generateJsonReport(result);
      const parsed = JSON.parse(json);
      assert.strictEqual(parsed.findings.codeQuality.issues.length, 0);
    });
  });

  describe('generateHtmlReport', () => {
    it('should generate valid HTML report', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.startsWith('<!DOCTYPE html>'));
      assert(html.endsWith('</html>'));
      assert(html.includes('<html'));
      assert(html.includes('</html>'));
    });

    it('should include basic HTML structure', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes('<head>'));
      assert(html.includes('</head>'));
      assert(html.includes('<body>'));
      assert(html.includes('</body>'));
    });

    it('should include report title', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes('Trustshell Verification Report'));
    });

    it('should include confidence score', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes(`${result.confidenceScore}%`));
    });

    it('should include status', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes(result.status.toUpperCase()));
    });

    it('should include CSS styles', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes('<style>'));
      assert(html.includes('</style>'));
      assert(html.includes('font-family'));
    });

    it('should include metadata', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes(result.metadata.file));
      assert(html.includes(result.metadata.language));
      assert(html.includes(result.metadata.verificationDepth));
    });

    it('should include AI source if available', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes(result.metadata.aiSource!));
    });

    it('should include functional test results', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes(`${result.findings.functionalTests.passed}`));
      assert(html.includes(`${result.findings.functionalTests.failed}`));
      assert(html.includes(result.findings.functionalTests.coverage));
    });

    it('should include code quality score', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes(`${result.findings.codeQuality.score}`));
    });

    it('should include security score', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes(`${result.findings.security.score}`));
    });

    it('should include code quality issues', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes('Issues Found'));
      assert(html.includes(result.findings.codeQuality.issues[0].message));
    });

    it('should include vulnerabilities', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      assert(html.includes('Vulnerabilities Found'));
      assert(html.includes(result.findings.security.vulnerabilities[0].description));
    });

    it('should include recommendations when configured', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: true };
      const html = generateHtmlReport(result, config);
      assert(html.includes('Recommendations'));
      result.recommendations.forEach(rec => {
        assert(html.includes(rec));
      });
    });

    it('should not include recommendations when disabled', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: false };
      const html = generateHtmlReport(result, config);
      assert(!html.includes('Recommendations'));
    });

    it('should include metrics when configured', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeMetrics: true };
      const html = generateHtmlReport(result, config);
      assert(html.includes('Summary Metrics'));
      assert(html.includes('Code Quality'));
      assert(html.includes('Security'));
      assert(html.includes('Test Pass Rate'));
    });

    it('should handle empty recommendations', () => {
      const result = getMockVerificationResult();
      result.recommendations = [];
      const html = generateHtmlReport(result);
      assert(!html.includes('Recommendations'));
    });

    it('should handle no vulnerabilities', () => {
      const result = getMockVerificationResult();
      result.findings.security.vulnerabilities = [];
      const html = generateHtmlReport(result);
      assert(html.includes('No security vulnerabilities found'));
    });

    it('should handle no code quality issues', () => {
      const result = getMockVerificationResult();
      result.findings.codeQuality.issues = [];
      const html = generateHtmlReport(result);
      assert(html.includes('No code quality issues found'));
    });

    it('should color-code severity levels', () => {
      const result = getMockVerificationResult();
      const html = generateHtmlReport(result);
      // Check for CSS classes that style different severities
      assert(html.includes('critical'));
      assert(html.includes('low'));
      assert(html.includes('medium'));
    });
  });

  describe('generateMarkdownReport', () => {
    it('should generate valid markdown report', () => {
      const result = getMockVerificationResult();
      const markdown = generateMarkdownReport(result);
      assert(markdown.startsWith('# Trustshell Verification Report'));
      assert(markdown.includes('## Summary'));
    });

    it('should include summary section', () => {
      const result = getMockVerificationResult();
      const markdown = generateMarkdownReport(result);
      assert(markdown.includes('## Summary'));
      assert(markdown.includes(`- **Status:** ${result.status.toUpperCase()}`));
      assert(markdown.includes(`- **Confidence Score:** ${result.confidenceScore}%`));
    });

    it('should include functional tests section', () => {
      const result = getMockVerificationResult();
      const markdown = generateMarkdownReport(result);
      assert(markdown.includes('## Functional Tests'));
      assert(markdown.includes(`- **Passed:** ${result.findings.functionalTests.passed}`));
      assert(markdown.includes(`- **Failed:** ${result.findings.functionalTests.failed}`));
    });

    it('should include code quality section', () => {
      const result = getMockVerificationResult();
      const markdown = generateMarkdownReport(result);
      assert(markdown.includes('## Code Quality'));
      assert(markdown.includes(`- **Score:** ${result.findings.codeQuality.score}/100`));
    });

    it('should include security section', () => {
      const result = getMockVerificationResult();
      const markdown = generateMarkdownReport(result);
      assert(markdown.includes('## Security'));
      assert(markdown.includes(`- **Score:** ${result.findings.security.score}/100`));
    });

    it('should include recommendations when configured', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: true };
      const markdown = generateMarkdownReport(result, config);
      assert(markdown.includes('## Recommendations'));
      result.recommendations.forEach(rec => {
        assert(markdown.includes(rec));
      });
    });

    it('should not include recommendations when disabled', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: false };
      const markdown = generateMarkdownReport(result, config);
      assert(!markdown.includes('## Recommendations'));
    });

    it('should include timestamp when configured', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeTimestamp: true };
      const markdown = generateMarkdownReport(result, config);
      assert(markdown.includes('**Generated:**'));
    });

    it('should handle empty recommendations', () => {
      const result = getMockVerificationResult();
      result.recommendations = [];
      const markdown = generateMarkdownReport(result);
      assert(!markdown.includes('## Recommendations'));
    });

    it('should format issues with severity', () => {
      const result = getMockVerificationResult();
      const markdown = generateMarkdownReport(result);
      assert(markdown.includes(`(${result.findings.codeQuality.issues[0].severity.toUpperCase()})`));
    });
  });

  describe('generateXmlReport', () => {
    it('should generate valid XML report', () => {
      const result = getMockVerificationResult();
      const xml = generateXmlReport(result);
      assert(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
      assert(xml.includes('<report>'));
      assert(xml.endsWith('</report>'));
    });

    it('should escape XML special characters', () => {
      const result = getMockVerificationResult();
      result.findings.codeQuality.issues[0].message = 'Test <script> & "quotes"';
      const xml = generateXmlReport(result);
      assert(!xml.includes('<script>'));
      assert(xml.includes('&lt;script&gt;'));
      assert(xml.includes('&amp;'));
      assert(xml.includes('&quot;'));
    });

    it('should include all required elements', () => {
      const result = getMockVerificationResult();
      const xml = generateXmlReport(result);
      assert(xml.includes('<status>'));
      assert(xml.includes('<confidenceScore>'));
      assert(xml.includes('<metadata>'));
      assert(xml.includes('<functionalTests>'));
      assert(xml.includes('<codeQuality>'));
      assert(xml.includes('<security>'));
    });

    it('should include recommendations when configured', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: true };
      const xml = generateXmlReport(result, config);
      assert(xml.includes('<recommendations>'));
      assert(xml.includes('<recommendation>'));
    });

    it('should not include recommendations when disabled', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: false };
      const xml = generateXmlReport(result, config);
      assert(!xml.includes('<recommendations>'));
    });

    it('should include generatedAt', () => {
      const result = getMockVerificationResult();
      const xml = generateXmlReport(result);
      assert(xml.includes('<generatedAt>'));
      assert(xml.includes('</generatedAt>'));
    });

    it('should handle empty recommendations', () => {
      const result = getMockVerificationResult();
      result.recommendations = [];
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: true };
      const xml = generateXmlReport(result, config);
      assert(xml.includes('<recommendations>'));
      assert(xml.includes('</recommendations>'));
      assert(!xml.includes('<recommendation>'));
    });
  });

  describe('generateConsoleReport', () => {
    it('should generate console report with header', () => {
      const result = getMockVerificationResult();
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes('TRUSTSHELL VERIFICATION REPORT'));
      assert(consoleReport.includes('═'));
    });

    it('should include summary section', () => {
      const result = getMockVerificationResult();
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes('SUMMARY'));
      assert(consoleReport.includes('────────────────'));
    });

    it('should include status with emoji', () => {
      const result = getMockVerificationResult();
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes(result.status.toUpperCase()));
      // Check for emoji
      assert(/[✅⚠️❌❓]/.test(consoleReport));
    });

    it('should include confidence score with emoji', () => {
      const result = getMockVerificationResult();
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes(`${result.confidenceScore}%`));
      // Check for emoji
      assert(/[🟢🟡🟠🔴]/.test(consoleReport));
    });

    it('should include functional tests section', () => {
      const result = getMockVerificationResult();
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes('FUNCTIONAL TESTS'));
      assert(consoleReport.includes(`✅ Passed: ${result.findings.functionalTests.passed}`));
      assert(consoleReport.includes(`❌ Failed: ${result.findings.functionalTests.failed}`));
    });

    it('should include code quality section', () => {
      const result = getMockVerificationResult();
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes('CODE QUALITY'));
      assert(consoleReport.includes('📈 Score:'));
    });

    it('should include security section', () => {
      const result = getMockVerificationResult();
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes('SECURITY'));
      assert(consoleReport.includes('🛡️'));
    });

    it('should include recommendations when configured', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: true };
      const consoleReport = generateConsoleReport(result, config);
      assert(consoleReport.includes('RECOMMENDATIONS'));
      assert(consoleReport.includes('💡'));
    });

    it('should not include recommendations when disabled', () => {
      const result = getMockVerificationResult();
      const config: ReportConfig = { ...DEFAULT_REPORT_CONFIG, includeRecommendations: false };
      const consoleReport = generateConsoleReport(result, config);
      assert(!consoleReport.includes('RECOMMENDATIONS'));
    });

    it('should include test errors when present', () => {
      const result = getMockVerificationResult();
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes('Test Errors:'));
    });

    it('should use appropriate emojis for severity levels', () => {
      const result = getMockVerificationResult();
      const consoleReport = generateConsoleReport(result);
      assert(/[🚨⚠️⚡🔸]/.test(consoleReport));
    });

    it('should handle empty recommendations', () => {
      const result = getMockVerificationResult();
      result.recommendations = [];
      const consoleReport = generateConsoleReport(result);
      assert(!consoleReport.includes('RECOMMENDATIONS'));
    });
  });

  describe('generateReport', () => {
    it('should write report to file', async () => {
      setup();
      const result = getMockVerificationResult();
      const outputPath = join(testDir, 'report.json');
      await generateReport(result, outputPath, { type: 'json' });
      assert.strictEqual(readFileSync(outputPath, 'utf8').trim().length > 0, true);
      teardown();
    });

    it('should create output directory if it does not exist', async () => {
      setup();
      const result = getMockVerificationResult();
      const outputPath = join(testDir, 'nested', 'report.json');
      await generateReport(result, outputPath, { type: 'json' });
      assert.strictEqual(readFileSync(outputPath, 'utf8').trim().length > 0, true);
      teardown();
    });

    it('should generate JSON format', async () => {
      setup();
      const result = getMockVerificationResult();
      const outputPath = join(testDir, 'report.json');
      await generateReport(result, outputPath, { type: 'json' });
      const content = readFileSync(outputPath, 'utf8');
      assert.doesNotThrow(() => JSON.parse(content));
      teardown();
    });

    it('should generate HTML format', async () => {
      setup();
      const result = getMockVerificationResult();
      const outputPath = join(testDir, 'report.html');
      await generateReport(result, outputPath, { type: 'html' });
      const content = readFileSync(outputPath, 'utf8');
      assert(content.startsWith('<!DOCTYPE html>'));
      teardown();
    });

    it('should generate XML format', async () => {
      setup();
      const result = getMockVerificationResult();
      const outputPath = join(testDir, 'report.xml');
      await generateReport(result, outputPath, { type: 'xml' });
      const content = readFileSync(outputPath, 'utf8');
      assert(content.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
      teardown();
    });

    it('should generate Markdown format', async () => {
      setup();
      const result = getMockVerificationResult();
      const outputPath = join(testDir, 'report.md');
      await generateReport(result, outputPath, { type: 'markdown' });
      const content = readFileSync(outputPath, 'utf8');
      assert(content.startsWith('# Trustshell Verification Report'));
      teardown();
    });

    it('should throw error for unsupported format', async () => {
      setup();
      const result = getMockVerificationResult();
      const outputPath = join(testDir, 'report.txt');
      await assert.rejects(async () => {
        await generateReport(result, outputPath, { type: 'txt' as any });
      }, /Unsupported report format/);
      teardown();
    });

    it('should use custom config', async () => {
      setup();
      const result = getMockVerificationResult();
      const outputPath = join(testDir, 'report.json');
      const config: ReportConfig = {
        includeDetails: false,
        includeRecommendations: false,
        includeTimestamp: false,
        includeMetrics: false,
        includeCode: false,
        customTemplate: undefined
      };
      await generateReport(result, outputPath, { type: 'json' }, config);
      const content = readFileSync(outputPath, 'utf8');
      const parsed = JSON.parse(content);
      assert(!parsed.details);
      assert(!parsed.recommendations);
      assert(!parsed.generatedAt);
      teardown();
    });
  });

  describe('validateReportOutput', () => {
    it('should return true for existing file', () => {
      setup();
      const result = getMockVerificationResult();
      const outputPath = join(testDir, 'report.json');
      writeFileSync(outputPath, '{}');
      assert.strictEqual(validateReportOutput(outputPath, 'json'), true);
      teardown();
    });

    it('should return false for non-existent file', () => {
      const result = getMockVerificationResult();
      const outputPath = '/tmp/nonexistent-report.json';
      assert.strictEqual(validateReportOutput(outputPath, 'json'), false);
    });
  });

  describe('generateMultipleReports', () => {
    it('should generate multiple formats', async () => {
      setup();
      const result = getMockVerificationResult();
      await generateMultipleReports(result, testDir, ['json', 'html', 'markdown']);
      assert(readFileSync(join(testDir, 'report.json'), 'utf8').length > 0);
      assert(readFileSync(join(testDir, 'report.html'), 'utf8').length > 0);
      assert(readFileSync(join(testDir, 'report.markdown'), 'utf8').length > 0);
      teardown();
    });

    it('should create output directory if it does not exist', async () => {
      setup();
      const result = getMockVerificationResult();
      const outputDir = join(testDir, 'reports');
      await generateMultipleReports(result, outputDir, ['json']);
      assert(readFileSync(join(outputDir, 'report.json'), 'utf8').length > 0);
      teardown();
    });

    it('should use default formats if none provided', async () => {
      setup();
      const result = getMockVerificationResult();
      await generateMultipleReports(result, testDir);
      // Default formats are ['json', 'html', 'markdown']
      assert(readFileSync(join(testDir, 'report.json'), 'utf8').length > 0);
      assert(readFileSync(join(testDir, 'report.html'), 'utf8').length > 0);
      assert(readFileSync(join(testDir, 'report.markdown'), 'utf8').length > 0);
      teardown();
    });

    it('should use custom config', async () => {
      setup();
      const result = getMockVerificationResult();
      const config: ReportConfig = {
        includeDetails: false,
        includeRecommendations: false,
        includeTimestamp: false,
        includeMetrics: false,
        includeCode: false,
        customTemplate: undefined
      };
      await generateMultipleReports(result, testDir, ['json'], config);
      const content = readFileSync(join(testDir, 'report.json'), 'utf8');
      const parsed = JSON.parse(content);
      assert(!parsed.details);
      assert(!parsed.recommendations);
      assert(!parsed.generatedAt);
      teardown();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle result with no AI source', () => {
      const result = getMockVerificationResult();
      result.metadata.aiSource = undefined;
      const html = generateHtmlReport(result);
      assert(!html.includes('AI Source:'));
    });

    it('should handle result with no test errors', () => {
      const result = getMockVerificationResult();
      result.findings.functionalTests.errorMessages = [];
      const consoleReport = generateConsoleReport(result);
      assert(!consoleReport.includes('Test Errors:'));
    });

    it('should handle result with critical severity', () => {
      const result = getMockVerificationResult();
      result.findings.security.vulnerabilities[0].severity = 'critical';
      const html = generateHtmlReport(result);
      assert(html.includes('critical'));
    });

    it('should handle result with high severity', () => {
      const result = getMockVerificationResult();
      result.findings.codeQuality.issues[0].severity = 'high';
      const html = generateHtmlReport(result);
      assert(html.includes('high'));
    });

    it('should handle result with line numbers', () => {
      const result = getMockVerificationResult();
      const xml = generateXmlReport(result);
      assert(xml.includes('line='));
    });

    it('should handle result without line numbers', () => {
      const result = getMockVerificationResult();
      // Remove all line numbers from issues and vulnerabilities
      result.findings.codeQuality.issues.forEach(issue => { issue.line = undefined; });
      result.findings.security.vulnerabilities.forEach(vuln => { vuln.line = undefined; });
      const xml = generateXmlReport(result);
      assert(!xml.includes('line='));
    });

    it('should handle zero confidence score', () => {
      const result = getMockVerificationResult();
      result.confidenceScore = 0;
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes('0%'));
      assert(consoleReport.includes('🔴'));
    });

    it('should handle perfect confidence score', () => {
      const result = getMockVerificationResult();
      result.confidenceScore = 100;
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes('100%'));
      assert(consoleReport.includes('🟢'));
    });

    it('should handle failed status', () => {
      const result = getMockVerificationResult();
      result.status = 'failed';
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes('FAILED'));
      assert(consoleReport.includes('❌'));
    });

    it('should handle partial status', () => {
      const result = getMockVerificationResult();
      result.status = 'partial';
      const consoleReport = generateConsoleReport(result);
      assert(consoleReport.includes('PARTIAL'));
      assert(consoleReport.includes('⚠️'));
    });
  });
});