import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { VerificationResult } from '../verifier/verifier.js';

export interface ReportFormat {
  type: 'json' | 'html' | 'xml' | 'markdown' | 'console';
  path?: string;
  template?: string;
}

export interface ReportConfig {
  includeDetails: boolean;
  includeCode: boolean;
  includeRecommendations: boolean;
  includeTimestamp: boolean;
  includeMetrics: boolean;
  customTemplate?: string | undefined;
}

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  includeDetails: true,
  includeCode: false,
  includeRecommendations: true,
  includeTimestamp: true,
  includeMetrics: true,
  customTemplate: undefined
};

export async function generateReport(
  result: VerificationResult,
  outputPath: string,
  format: ReportFormat = { type: 'json' },
  config: ReportConfig = DEFAULT_REPORT_CONFIG
): Promise<void> {
  logger.debug(`Generating ${format.type} report to: ${outputPath}`);
  
  try {
    // Ensure output directory exists
    const outputDir = join(outputPath, '..');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate report based on format
    let reportContent: string;
    
    switch (format.type) {
      case 'json':
        reportContent = generateJsonReport(result, config);
        break;
      case 'html':
        reportContent = generateHtmlReport(result, config);
        break;
      case 'xml':
        reportContent = generateXmlReport(result, config);
        break;
      case 'markdown':
        reportContent = generateMarkdownReport(result, config);
        break;
      case 'console':
        reportContent = generateConsoleReport(result, config);
        break;
      default:
        throw new Error(`Unsupported report format: ${format.type}`);
    }
    
    // Write report to file
    writeFileSync(outputPath, reportContent, 'utf8');
    
    logger.info(`Report generated successfully: ${outputPath}`);
    
  } catch (error) {
    logger.error(`Failed to generate report: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export function generateJsonReport(
  result: VerificationResult,
  config: ReportConfig = DEFAULT_REPORT_CONFIG
): string {
  const report: any = {
    status: result.status,
    confidenceScore: result.confidenceScore,
    findings: {
      functionalTests: result.findings.functionalTests,
      codeQuality: result.findings.codeQuality,
      security: result.findings.security
    },
    metadata: result.metadata
  };
  
  // Include optional data based on config
  if (config.includeRecommendations && result.recommendations.length > 0) {
    report.recommendations = result.recommendations;
  }
  
  if (config.includeTimestamp) {
    report.generatedAt = new Date().toISOString();
  }
  
  if (config.includeDetails) {
    report.details = {
      totalTests: result.findings.functionalTests.passed + result.findings.functionalTests.failed,
      totalIssues: result.findings.codeQuality.issues.length,
      totalVulnerabilities: result.findings.security.vulnerabilities.length,
      functionalTestCoverage: result.findings.functionalTests.coverage
    };
  }
  
  // Add metrics if requested
  if (config.includeMetrics) {
    report.metrics = {
      codeQualityScore: result.findings.codeQuality.score,
      securityScore: result.findings.security.score,
      testPassRate: result.findings.functionalTests.passed / 
        (result.findings.functionalTests.passed + result.findings.functionalTests.failed) || 0,
      totalVulnerabilities: result.findings.security.vulnerabilities.length,
      criticalVulnerabilities: result.findings.security.vulnerabilities.filter(v => v.severity === 'critical').length,
      highVulnerabilities: result.findings.security.vulnerabilities.filter(v => v.severity === 'high').length,
      mediumVulnerabilities: result.findings.security.vulnerabilities.filter(v => v.severity === 'medium').length,
      lowVulnerabilities: result.findings.security.vulnerabilities.filter(v => v.severity === 'low').length
    };
  }
  
  return JSON.stringify(report, null, 2);
}

export function generateHtmlReport(
  result: VerificationResult,
  config: ReportConfig = DEFAULT_REPORT_CONFIG
): string {
  const timestamp = config.includeTimestamp ? new Date().toISOString() : '';
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trustshell Verification Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .confidence-score {
            font-size: 3em;
            font-weight: bold;
            margin: 10px 0;
        }
        .status {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 25px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.9em;
        }
        .status.verified {
            background-color: #4CAF50;
            color: white;
        }
        .status.partial {
            background-color: #FF9800;
            color: white;
        }
        .status.failed {
            background-color: #F44336;
            color: white;
        }
        .content {
            padding: 30px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #667eea;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .metric-label {
            color: #666;
            margin-top: 5px;
        }
        .issues-list {
            list-style: none;
            padding: 0;
        }
        .issue-item {
            background: #f8f9fa;
            margin-bottom: 10px;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #ddd;
        }
        .issue-item.critical {
            border-left-color: #F44336;
        }
        .issue-item.high {
            border-left-color: #FF5722;
        }
        .issue-item.medium {
            border-left-color: #FF9800;
        }
        .issue-item.low {
            border-left-color: #4CAF50;
        }
        .issue-title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .issue-description {
            color: #666;
            font-size: 0.9em;
        }
        .issue-line {
            font-size: 0.8em;
            color: #999;
            margin-top: 5px;
        }
        .recommendations {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
        }
        .recommendations h3 {
            color: #2e7d32;
            margin-top: 0;
        }
        .recommendations ul {
            margin-bottom: 0;
        }
        .recommendations li {
            margin-bottom: 10px;
        }
        .timestamp {
            text-align: center;
            color: #666;
            font-size: 0.9em;
            margin-top: 20px;
        }
        .file-info {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .file-info strong {
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Trustshell Verification Report</h1>
            <div class="confidence-score">${result.confidenceScore}%</div>
            <div class="status ${result.status}">${result.status.toUpperCase()}</div>
        </div>
        
        <div class="content">
            <div class="file-info">
                <p><strong>File:</strong> ${result.metadata.file}</p>
                <p><strong>Language:</strong> ${result.metadata.language}</p>
                <p><strong>Verification Depth:</strong> ${result.metadata.verificationDepth}</p>
                ${result.metadata.aiSource ? `<p><strong>AI Source:</strong> ${result.metadata.aiSource}</p>` : ''}
            </div>
            
            ${config.includeMetrics ? generateMetricsHtml(result) : ''}
            
            <div class="section">
                <h2>Functional Tests</h2>
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-value">${result.findings.functionalTests.passed}</div>
                        <div class="metric-label">Passed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${result.findings.functionalTests.failed}</div>
                        <div class="metric-label">Failed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${result.findings.functionalTests.coverage}</div>
                        <div class="metric-label">Coverage</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>Code Quality</h2>
                <div class="metric-card" style="margin-bottom: 20px;">
                    <div class="metric-value">${result.findings.codeQuality.score}/100</div>
                    <div class="metric-label">Quality Score</div>
                </div>
                
                ${result.findings.codeQuality.issues.length > 0 ? `
                    <h3>Issues Found</h3>
                    <ul class="issues-list">
                        ${result.findings.codeQuality.issues.map(issue => `
                            <li class="issue-item ${issue.severity}">
                                <div class="issue-title">${issue.type}: ${issue.severity.toUpperCase()}</div>
                                <div class="issue-description">${issue.message}</div>
                                ${issue.line ? `<div class="issue-line">Line ${issue.line}</div>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                ` : '<p>No code quality issues found.</p>'}
            </div>
            
            <div class="section">
                <h2>Security Scan</h2>
                <div class="metric-card" style="margin-bottom: 20px;">
                    <div class="metric-value">${result.findings.security.score}/100</div>
                    <div class="metric-label">Security Score</div>
                </div>
                
                ${result.findings.security.vulnerabilities.length > 0 ? `
                    <h3>Vulnerabilities Found</h3>
                    <ul class="issues-list">
                        ${result.findings.security.vulnerabilities.map(vuln => `
                            <li class="issue-item ${vuln.severity}">
                                <div class="issue-title">${vuln.type}: ${vuln.severity.toUpperCase()}</div>
                                <div class="issue-description">${vuln.description}</div>
                                ${vuln.line ? `<div class="issue-line">Line ${vuln.line}</div>` : ''}
                            </li>
                        `).join('')}
                    </ul>
                ` : '<p>No security vulnerabilities found.</p>'}
            </div>
            
            ${config.includeRecommendations && result.recommendations.length > 0 ? `
                <div class="section">
                    <div class="recommendations">
                        <h3>Recommendations</h3>
                        <ul>
                            ${result.recommendations.map(rec => `<li>• ${rec}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            ` : ''}
            
            ${config.includeTimestamp ? `
                <div class="timestamp">
                    Generated on ${timestamp}
                </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;
  
  return html;
}

function generateMetricsHtml(result: VerificationResult): string {
  return `
        <div class="section">
            <h2>Summary Metrics</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">${result.findings.codeQuality.score}</div>
                    <div class="metric-label">Code Quality</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${result.findings.security.score}</div>
                    <div class="metric-label">Security</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${Math.round((result.findings.functionalTests.passed / (result.findings.functionalTests.passed + result.findings.functionalTests.failed)) * 100) || 0}%</div>
                    <div class="metric-label">Test Pass Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${result.findings.security.vulnerabilities.length}</div>
                    <div class="metric-label">Vulnerabilities</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${result.findings.codeQuality.issues.length}</div>
                    <div class="metric-label">Quality Issues</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${result.confidenceScore}%</div>
                    <div class="metric-label">Confidence</div>
                </div>
            </div>
        </div>`;
}

export function generateMarkdownReport(
  result: VerificationResult,
  config: ReportConfig = DEFAULT_REPORT_CONFIG
): string {
  let markdown = `# Trustshell Verification Report\n\n`;
  
  if (config.includeTimestamp) {
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
  }
  
  markdown += `## Summary\n\n`;
  markdown += `- **Status:** ${result.status.toUpperCase()}\n`;
  markdown += `- **Confidence Score:** ${result.confidenceScore}%\n`;
  markdown += `- **File:** ${result.metadata.file}\n`;
  markdown += `- **Language:** ${result.metadata.language}\n`;
  markdown += `- **Verification Depth:** ${result.metadata.verificationDepth}\n`;
  
  if (result.metadata.aiSource) {
    markdown += `- **AI Source:** ${result.metadata.aiSource}\n`;
  }
  
  markdown += `\n## Functional Tests\n\n`;
  markdown += `- **Passed:** ${result.findings.functionalTests.passed}\n`;
  markdown += `- **Failed:** ${result.findings.functionalTests.failed}\n`;
  markdown += `- **Coverage:** ${result.findings.functionalTests.coverage}\n`;
  
  if (result.findings.functionalTests.errorMessages.length > 0) {
    markdown += `\n### Test Errors\n\n`;
    result.findings.functionalTests.errorMessages.forEach(error => {
      markdown += `- ${error}\n`;
    });
  }
  
  markdown += `\n## Code Quality\n\n`;
  markdown += `- **Score:** ${result.findings.codeQuality.score}/100\n`;
  
  if (result.findings.codeQuality.issues.length > 0) {
    markdown += `\n### Issues\n\n`;
    result.findings.codeQuality.issues.forEach(issue => {
      markdown += `#### ${issue.type} (${issue.severity.toUpperCase()})\n`;
      markdown += `${issue.message}\n`;
      if (issue.line) {
        markdown += `Line ${issue.line}\n`;
      }
      markdown += `\n`;
    });
  }
  
  markdown += `\n## Security\n\n`;
  markdown += `- **Score:** ${result.findings.security.score}/100\n`;
  
  if (result.findings.security.vulnerabilities.length > 0) {
    markdown += `\n### Vulnerabilities\n\n`;
    result.findings.security.vulnerabilities.forEach(vuln => {
      markdown += `#### ${vuln.type} (${vuln.severity.toUpperCase()})\n`;
      markdown += `${vuln.description}\n`;
      if (vuln.line) {
        markdown += `Line ${vuln.line}\n`;
      }
      markdown += `\n`;
    });
  }
  
  if (config.includeRecommendations && result.recommendations.length > 0) {
    markdown += `\n## Recommendations\n\n`;
    result.recommendations.forEach(rec => {
      markdown += `- ${rec}\n`;
    });
    markdown += `\n`;
  }
  
  return markdown;
}

export function generateXmlReport(
  result: VerificationResult,
  config: ReportConfig = DEFAULT_REPORT_CONFIG
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<report>\n`;
  xml += `  <status>${result.status}</status>\n`;
  xml += `  <confidenceScore>${result.confidenceScore}</confidenceScore>\n`;
  xml += `  <metadata>\n`;
  xml += `    <file>${result.metadata.file}</file>\n`;
  xml += `    <language>${result.metadata.language}</language>\n`;
  xml += `    <verificationDepth>${result.metadata.verificationDepth}</verificationDepth>\n`;
  xml += `    <timestamp>${result.metadata.timestamp}</timestamp>\n`;
  if (result.metadata.aiSource) {
    xml += `    <aiSource>${result.metadata.aiSource}</aiSource>\n`;
  }
  xml += `  </metadata>\n`;
  
  xml += `  <functionalTests>\n`;
  xml += `    <passed>${result.findings.functionalTests.passed}</passed>\n`;
  xml += `    <failed>${result.findings.functionalTests.failed}</failed>\n`;
  xml += `    <coverage>${result.findings.functionalTests.coverage}</coverage>\n`;
  if (result.findings.functionalTests.errorMessages.length > 0) {
    xml += `    <errors>\n`;
    result.findings.functionalTests.errorMessages.forEach(error => {
      xml += `      <error>${escapeXml(error)}</error>\n`;
    });
    xml += `    </errors>\n`;
  }
  xml += `  </functionalTests>\n`;
  
  xml += `  <codeQuality>\n`;
  xml += `    <score>${result.findings.codeQuality.score}</score>\n`;
  if (result.findings.codeQuality.issues.length > 0) {
    xml += `    <issues>\n`;
    result.findings.codeQuality.issues.forEach(issue => {
      xml += `      <issue type="${issue.type}" severity="${issue.severity}"`;
      if (issue.line) {
        xml += ` line="${issue.line}"`;
      }
      xml += `>${escapeXml(issue.message)}</issue>\n`;
    });
    xml += `    </issues>\n`;
  }
  xml += `  </codeQuality>\n`;
  
  xml += `  <security>\n`;
  xml += `    <score>${result.findings.security.score}</score>\n`;
  if (result.findings.security.vulnerabilities.length > 0) {
    xml += `    <vulnerabilities>\n`;
    result.findings.security.vulnerabilities.forEach(vuln => {
      xml += `      <vulnerability type="${vuln.type}" severity="${vuln.severity}"`;
      if (vuln.line) {
        xml += ` line="${vuln.line}"`;
      }
      xml += `>${escapeXml(vuln.description)}</vulnerability>\n`;
    });
    xml += `    </vulnerabilities>\n`;
  }
  xml += `  </security>\n`;
  
  if (config.includeRecommendations && result.recommendations.length > 0) {
    xml += `  <recommendations>\n`;
    result.recommendations.forEach(rec => {
      xml += `    <recommendation>${escapeXml(rec)}</recommendation>\n`;
    });
    xml += `  </recommendations>\n`;
  }
  
  xml += `  <generatedAt>${new Date().toISOString()}</generatedAt>\n`;
  xml += `</report>`;
  
  return xml;
}

export function generateConsoleReport(
  result: VerificationResult,
  config: ReportConfig = DEFAULT_REPORT_CONFIG
): string {
  let consoleReport = '\n';
  consoleReport += '╔════════════════════════════════════════════════════════════════════════════════════════════════════╗' + '\n';
  consoleReport += '║                                TRUSTSHELL VERIFICATION REPORT                                        ║' + '\n';
  consoleReport += '╚════════════════════════════════════════════════════════════════════════════════════════════════════╝' + '\n';
  
  consoleReport += '\n📊 SUMMARY\n';
  consoleReport += '────────────────────────────────────────────────────────────────────────────────────────────────────\n';
  consoleReport += `Status: ${result.status.toUpperCase()} ${getStatusEmoji(result.status)}\n`;
  consoleReport += `Confidence Score: ${getConfidenceEmoji(result.confidenceScore)} ${result.confidenceScore}%\n`;
  consoleReport += `File: ${result.metadata.file}\n`;
  consoleReport += `Language: ${result.metadata.language}\n`;
  consoleReport += `Verification Depth: ${result.metadata.verificationDepth}\n`;
  
  if (result.metadata.aiSource) {
    consoleReport += `AI Source: ${result.metadata.aiSource}\n`;
  }
  
  consoleReport += '\n🧪 FUNCTIONAL TESTS\n';
  consoleReport += '────────────────────────────────────────────────────────────────────────────────────────────────────\n';
  consoleReport += `✅ Passed: ${result.findings.functionalTests.passed}\n`;
  consoleReport += `❌ Failed: ${result.findings.functionalTests.failed}\n`;
  consoleReport += `📊 Coverage: ${result.findings.functionalTests.coverage}\n`;
  
  if (result.findings.functionalTests.errorMessages.length > 0) {
    consoleReport += '\n⚠️  Test Errors:\n';
    result.findings.functionalTests.errorMessages.forEach((error, index) => {
      consoleReport += `${index + 1}. ${error}\n`;
    });
  }
  
  consoleReport += '\n🔍 CODE QUALITY\n';
  consoleReport += '────────────────────────────────────────────────────────────────────────────────────────────────────\n';
  consoleReport += `📈 Score: ${result.findings.codeQuality.score}/100 ${getScoreEmoji(result.findings.codeQuality.score)}\n`;
  
  if (result.findings.codeQuality.issues.length > 0) {
    consoleReport += '\n🐛 Issues Found:\n';
    result.findings.codeQuality.issues.forEach((issue, index) => {
      consoleReport += `${index + 1}. ${getSeverityEmoji(issue.severity)} ${issue.type.toUpperCase()}: ${issue.message}\n`;
      if (issue.line) {
        consoleReport += `   Line ${issue.line}\n`;
      }
    });
  }
  
  consoleReport += '\n🔒 SECURITY\n';
  consoleReport += '────────────────────────────────────────────────────────────────────────────────────────────────────\n';
  consoleReport += `🛡️  Score: ${result.findings.security.score}/100 ${getSecurityScoreEmoji(result.findings.security.score)}\n`;
  
  if (result.findings.security.vulnerabilities.length > 0) {
    consoleReport += '\n🚨 Vulnerabilities Found:\n';
    result.findings.security.vulnerabilities.forEach((vuln, index) => {
      consoleReport += `${index + 1}. ${getSecuritySeverityEmoji(vuln.severity)} ${vuln.type.toUpperCase()}: ${vuln.description}\n`;
      if (vuln.line) {
        consoleReport += `   Line ${vuln.line}\n`;
      }
    });
  }
  
  if (config.includeRecommendations && result.recommendations.length > 0) {
    consoleReport += '\n💡 RECOMMENDATIONS\n';
    consoleReport += '────────────────────────────────────────────────────────────────────────────────────────────────────\n';
    result.recommendations.forEach((rec, index) => {
      consoleReport += `${index + 1}. 💬 ${rec}\n`;
    });
  }
  
  if (config.includeTimestamp) {
    consoleReport += `\n🕐 Generated: ${new Date().toISOString()}\n`;
  }
  
  consoleReport += '\n' + '═'.repeat(80) + '\n';
  
  return consoleReport;
}

// Helper functions for console formatting
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'verified':
      return '✅';
    case 'partial':
      return '⚠️';
    case 'failed':
      return '❌';
    default:
      return '❓';
  }
}

function getConfidenceEmoji(score: number): string {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

function getScoreEmoji(score: number): string {
  if (score >= 90) return '🌟';
  if (score >= 70) return '👍';
  if (score >= 50) return '👌';
  return '👎';
}

function getSecurityScoreEmoji(score: number): string {
  if (score >= 90) return '🔒';
  if (score >= 70) return '🔐';
  if (score >= 50) return '🔓';
  return '💀';
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'high':
      return '⚠️';
    case 'medium':
      return '⚡';
    case 'low':
      return '🔸';
    default:
      return '❓';
  }
}

function getSecuritySeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🚨 CRITICAL';
    case 'high':
      return '⚠️ HIGH';
    case 'medium':
      return '⚡ MEDIUM';
    case 'low':
      return '🔸 LOW';
    default:
      return '❓';
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Utility function to validate report output
export function validateReportOutput(outputPath: string, format: string): boolean {
  // This would validate that the report was generated correctly
  // For now, just check if file exists
  const fs = require('fs');
  return fs.existsSync(outputPath);
}

// Generate multiple report formats
export async function generateMultipleReports(
  result: VerificationResult,
  outputDir: string,
  formats: string[] = ['json', 'html', 'markdown'],
  config: ReportConfig = DEFAULT_REPORT_CONFIG
): Promise<void> {
  logger.debug(`Generating multiple report formats to: ${outputDir}`);
  
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate each format
  for (const format of formats) {
    const outputPath = join(outputDir, `report.${format}`);
    await generateReport(result, outputPath, { type: format as any }, config);
  }
  
  logger.info(`Generated ${formats.length} report formats to: ${outputDir}`);
}