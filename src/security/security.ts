import { readFileSync } from 'fs';
import { logger } from '../utils/logger.js';

export interface SecurityConfig {
  enabled: boolean;
  threshold: number;
  rules: string[];
}

export interface SecurityResult {
  score: number;
  vulnerabilities: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    line?: number;
    description: string;
  }>;
}

export async function checkSecurity(
  filePath: string, 
  language: string, 
  config: any
): Promise<SecurityResult> {
  if (!config.security?.enabled) {
    return {
      score: 100,
      vulnerabilities: []
    };
  }
  
  logger.debug(`Running security scan for: ${filePath} (${language})`);
  
  try {
    const code = readFileSync(filePath, 'utf8');
    const vulnerabilities = await detectVulnerabilities(code, language, config);
    
    // Calculate security score
    let score = 100;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          criticalCount++;
          break;
        case 'high':
          score -= 15;
          highCount++;
          break;
        case 'medium':
          score -= 8;
          mediumCount++;
          break;
        case 'low':
          score -= 3;
          lowCount++;
          break;
      }
    });
    
    // Ensure score is between 0-100
    score = Math.max(0, Math.min(100, score));
    
    logger.debug(`Security scan completed: ${score}% (${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low)`);
    
    return {
      score,
      vulnerabilities
    };
    
  } catch (error) {
    logger.error(`Security scan failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      score: 0,
      vulnerabilities: [{
        type: 'scanner-error',
        severity: 'critical',
        description: `Security scan failed: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

async function detectVulnerabilities(
  code: string, 
  language: string, 
  config: any
): Promise<Array<{
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line?: number;
  description: string;
}>> {
  const vulnerabilities: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    line?: number;
    description: string;
  }> = [];
  
  // Run language-specific security checks
  switch (language) {
    case 'javascript':
    case 'typescript':
      await checkJavaScriptSecurity(code, vulnerabilities);
      break;
    case 'python':
      await checkPythonSecurity(code, vulnerabilities);
      break;
    case 'go':
      await checkGoSecurity(code, vulnerabilities);
      break;
    case 'rust':
      await checkRustSecurity(code, vulnerabilities);
      break;
    case 'java':
      await checkJavaSecurity(code, vulnerabilities);
      break;
    default:
      await checkGenericSecurity(code, vulnerabilities, language);
  }
  
  // Run common security checks across all languages
  await checkCommonSecurityPatterns(code, vulnerabilities);
  
  return vulnerabilities;
}

async function checkJavaScriptSecurity(code: string, vulnerabilities: any[]): Promise<void> {
  // Check for dangerous global variables
  const dangerousGlobals = [
    'eval', 'Function', 'setTimeout', 'setInterval', 'document',
    'window', 'global', 'process', 'require', 'module'
  ];
  
  dangerousGlobals.forEach(global => {
    const regex = new RegExp(`\\b${global}\\s*\\(`, 'g');
    const matches = code.match(regex);
    if (matches) {
      vulnerabilities.push({
        type: 'dangerous-global',
        severity: 'high',
        line: findLineNumber(code, matches[0]),
        description: `Use of dangerous global variable '${global}'`
      });
    }
  });
  
  // Check for eval usage
  if (code.includes('eval(')) {
    vulnerabilities.push({
      type: 'eval-usage',
      severity: 'critical',
      line: findLineNumber(code, 'eval('),
      description: 'Use of eval() is extremely dangerous and should be avoided'
    });
  }
  
  // Check for document.write
  if (code.includes('document.write')) {
    vulnerabilities.push({
      type: 'document-write',
      severity: 'high',
      line: findLineNumber(code, 'document.write'),
      description: 'document.write can cause security issues and performance problems'
    });
  }
  
  // Check for innerHTML
  if (code.includes('.innerHTML')) {
    vulnerabilities.push({
      type: 'innerhtml',
      severity: 'medium',
      line: findLineNumber(code, '.innerHTML'),
      description: 'innerHTML can lead to XSS vulnerabilities'
    });
  }

  // Check for React's dangerouslySetInnerHTML
  if (code.includes('dangerouslySetInnerHTML')) {
    vulnerabilities.push({
      type: 'dangerously-set-inner-html',
      severity: 'high',
      line: findLineNumber(code, 'dangerouslySetInnerHTML'),
      description: 'React dangerouslySetInnerHTML bypasses XSS protection and should be used with extreme caution'
    });
  }
  
  // Check for regex with potentially catastrophic backtracking
  const regexPattern = /\/[^\/]*\([^)]*\)[^\/]*\{[^}]*\*\s*\}/g;
  const dangerousRegex = code.match(regexPattern);
  if (dangerousRegex) {
    vulnerabilities.push({
      type: 'dangerous-regex',
      severity: 'high',
      line: findLineNumber(code, dangerousRegex[0]),
      description: 'Potential catastrophic backtracking in regular expression'
    });
  }
  
  // Check for prototype pollution
  if (code.includes('__proto__') || code.includes('constructor.prototype')) {
    vulnerabilities.push({
      type: 'prototype-pollution',
      severity: 'critical',
      line: findLineNumber(code, '__proto__'),
      description: 'Potential prototype pollution vulnerability'
    });
  }
  
  // Check for direct DOM manipulation without sanitization
  if (code.includes('createElement') && code.includes('appendChild')) {
    vulnerabilities.push({
      type: 'dom-manipulation',
      severity: 'medium',
      line: findLineNumber(code, 'appendChild'),
      description: 'Direct DOM manipulation without proper sanitization'
    });
  }
  
  // Check for using untrusted sources in dangerous contexts
  if ((code.includes('location.hash') || code.includes('location.search')) && 
      (code.includes('eval') || code.includes('Function'))) {
    vulnerabilities.push({
      type: 'untrusted-input',
      severity: 'critical',
      line: findLineNumber(code, 'location'),
      description: 'Using untrusted input (location) in dangerous context'
    });
  }
  
  // Check for CORS misconfiguration indicators
  if (code.includes('Access-Control-Allow-Origin') && code.includes('*')) {
    vulnerabilities.push({
      type: 'cors-misconfiguration',
      severity: 'high',
      line: findLineNumber(code, 'Access-Control-Allow-Origin'),
      description: 'CORS misconfiguration allowing any origin (*)'
    });
  }

  // Check for SQL injection in JavaScript
  if (code.match(/\b(?:execute|query|raw)\s*\(.*\+/g) || 
      code.match(/['"]SELECT.*['"]\s*\+/g) ||
      code.match(/\bINSERT\s+INTO.*['"]\s*\+/gi) ||
      code.match(/\bUPDATE.*SET.*['"]\s*\+/gi) ||
      code.match(/\bDELETE\s+FROM.*['"]\s*\+/gi)) {
    vulnerabilities.push({
      type: 'sql-injection',
      severity: 'high',
      line: findLineNumber(code, code.match(/['"]SELECT.*['"]\s*\+/)?.[0] || 'execute'),
      description: 'Potential SQL injection vulnerability through string concatenation'
    });
  }
}

async function checkPythonSecurity(code: string, vulnerabilities: any[]): Promise<void> {
  // Check for dangerous imports
  const dangerousImports = [
    'subprocess', 'os.system', 'eval', 'exec', 'compile',
    'pickle', 'marshal', 'shelve', 'sqlite3', 'ctypes'
  ];
  
  dangerousImports.forEach(imp => {
    const regex = new RegExp(`import\\s+${imp}`, 'g');
    const matches = code.match(regex);
    if (matches) {
      vulnerabilities.push({
        type: 'dangerous-import',
        severity: 'medium',
        line: findLineNumber(code, matches[0]),
        description: `Import of potentially dangerous module '${imp}'`
      });
    }
  });
  
  // Check for shell injection
  if (code.includes('os.system') || code.includes('subprocess.run')) {
    vulnerabilities.push({
      type: 'shell-injection',
      severity: 'critical',
      line: findLineNumber(code, 'os.system'),
      description: 'Potential shell injection vulnerability'
    });
  }
  
  // Check for pickle usage
  if (code.includes('pickle.loads') || code.includes('pickle.load')) {
    vulnerabilities.push({
      type: 'pickle-usage',
      severity: 'critical',
      line: findLineNumber(code, 'pickle'),
      description: 'Pickle can execute arbitrary code and is unsafe'
    });
  }
  
  // Check for code injection in exec
  if (code.includes('exec(') && !code.includes('safe')) {
    vulnerabilities.push({
      type: 'code-injection',
      severity: 'critical',
      line: findLineNumber(code, 'exec('),
      description: 'Potential code injection through exec()'
    });
  }

  // Check for eval usage (Python)
  if (code.includes('eval(')) {
    vulnerabilities.push({
      type: 'eval-usage',
      severity: 'critical',
      line: findLineNumber(code, 'eval('),
      description: 'Python eval() can execute arbitrary code and is unsafe'
    });
  }
  
  // Check for hardcoded passwords
  if (code.includes('password') || code.includes('secret') || code.includes('token')) {
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      if (line.match(/password\s*=\s*['"][^'"]{8,}['"]/i) ||
          line.match(/secret\s*=\s*['"][^'"]{8,}['"]/i) ||
          line.match(/token\s*=\s*['"][^'"]{16,}['"]/i)) {
        vulnerabilities.push({
          type: 'hardcoded-secret',
          severity: 'high',
          line: index + 1,
          description: 'Hardcoded secret/password detected'
        });
      }
    });
  }
  
  // Check for dangerous file operations
  if (code.includes('open') && code.includes('w') && !code.includes('r')) {
    vulnerabilities.push({
      type: 'unsafe-file-write',
      severity: 'medium',
      line: findLineNumber(code, 'open'),
      description: 'Potential unsafe file operation'
    });
  }
  
  // Check for code injection in exec
  if (code.includes('exec(') && !code.includes('safe')) {
    vulnerabilities.push({
      type: 'code-injection',
      severity: 'critical',
      line: findLineNumber(code, 'exec('),
      description: 'Potential code injection through exec()'
    });
  }
}

async function checkGoSecurity(code: string, vulnerabilities: any[]): Promise<void> {
  // Check for dangerous function calls
  const dangerousFunctions = [
    'exec.Command', 'os/exec.Command', 'syscall.Exec', 'os.StartProcess',
    'runtime.GC', 'debug.SetGCPercent', 'debug.SetPanicOnFault'
  ];
  
  dangerousFunctions.forEach(func => {
    const regex = new RegExp(`${func}`, 'g');
    const matches = code.match(regex);
    if (matches) {
      vulnerabilities.push({
        type: 'dangerous-function',
        severity: 'medium',
        line: findLineNumber(code, matches[0]),
        description: `Use of potentially dangerous function '${func}'`
      });
    }
  });
  
  // Check for unsafe pointer operations
  if (code.includes('unsafe.Pointer')) {
    vulnerabilities.push({
      type: 'unsafe-pointer',
      severity: 'high',
      line: findLineNumber(code, 'unsafe.Pointer'),
      description: 'Unsafe pointer operations can cause memory corruption'
    });
  }
  
  // Check for race conditions
  if (code.includes('go ') && code.includes('sync.')) {
    vulnerabilities.push({
      type: 'potential-race',
      severity: 'medium',
      line: findLineNumber(code, 'go '),
      description: 'Potential race condition with goroutines and sync operations'
    });
  }
  
  // Check for buffer overflows
  if (code.includes('make([]byte') && code.includes('unsafe')) {
    vulnerabilities.push({
      type: 'buffer-overflow',
      severity: 'critical',
      line: findLineNumber(code, 'make([]byte'),
      description: 'Potential buffer overflow with unsafe operations'
    });
  }
}

async function checkRustSecurity(code: string, vulnerabilities: any[]): Promise<void> {
  // Check for unsafe code
  if (code.includes('unsafe')) {
    vulnerabilities.push({
      type: 'unsafe-code',
      severity: 'high',
      line: findLineNumber(code, 'unsafe'),
      description: 'Unsafe code can cause memory safety issues'
    });
  }
  
  // Check for use of deprecated functions
  if (code.includes('deprecated')) {
    vulnerabilities.push({
      type: 'deprecated-function',
      severity: 'low',
      line: findLineNumber(code, 'deprecated'),
      description: 'Use of deprecated function'
    });
  }
  
  // Check for potential memory leaks
  if (code.includes('Box::new') && code.includes('forget')) {
    vulnerabilities.push({
      type: 'memory-leak',
      severity: 'medium',
      line: findLineNumber(code, 'Box::new'),
      description: 'Potential memory leak with Box::new and forget'
    });
  }
  
  // Check for unsanitized input
  if (code.includes('str::from_utf8') && !code.includes('validate')) {
    vulnerabilities.push({
      type: 'unsanitized-input',
      severity: 'medium',
      line: findLineNumber(code, 'str::from_utf8'),
      description: 'Potential unsanitized input handling'
    });
  }
}

async function checkJavaSecurity(code: string, vulnerabilities: any[]): Promise<void> {
  // Check for dangerous methods
  const dangerousMethods = [
    'Runtime.exec', 'ProcessBuilder', 'Class.forName',
    'System.load', 'System.loadLibrary', 'Class.newInstance'
  ];
  
  dangerousMethods.forEach(method => {
    const regex = new RegExp(`${method}`, 'g');
    const matches = code.match(regex);
    if (matches) {
      vulnerabilities.push({
        type: 'dangerous-method',
        severity: 'high',
        line: findLineNumber(code, matches[0]),
        description: `Use of potentially dangerous method '${method}'`
      });
    }
  });
  
  // Check for SQL injection
  if (code.includes('PreparedStatement') && code.includes('+')) {
    vulnerabilities.push({
      type: 'sql-injection',
      severity: 'high',
      line: findLineNumber(code, 'PreparedStatement'),
      description: 'Potential SQL injection vulnerability'
    });
  }
  
  // Check for hardcoded credentials
  if (code.includes('String password') || code.includes('String secret')) {
    vulnerabilities.push({
      type: 'hardcoded-credential',
      severity: 'high',
      line: findLineNumber(code, 'String password'),
      description: 'Hardcoded credentials detected'
    });
  }
  
  // Check for deserialization issues
  if (code.includes('ObjectInputStream') || code.includes('readObject')) {
    vulnerabilities.push({
      type: 'deserialization',
      severity: 'critical',
      line: findLineNumber(code, 'ObjectInputStream'),
      description: 'Potential insecure deserialization vulnerability'
    });
  }
}

async function checkGenericSecurity(code: string, vulnerabilities: any[], language: string): Promise<void> {
  // Generic security checks that apply to any language
  
  // Check for hardcoded secrets
  const secretPatterns = [
    /password\s*=\s*['"][^'"]{4,}['"]/i,
    /secret\s*=\s*['"][^'"]{4,}['"]/i,
    /token\s*=\s*['"][^'"]{8,}['"]/i,
    /api[_-]?key\s*=\s*['"][^'"]{8,}['"]/i,
    /private[_-]?key\s*=\s*['"][^'"]{16,}['"]/i
  ];
  
  const lines = code.split('\n');
  lines.forEach((line, index) => {
    secretPatterns.forEach(pattern => {
      if (line.match(pattern)) {
        vulnerabilities.push({
          type: 'hardcoded-secret',
          severity: 'high',
          line: index + 1,
          description: 'Hardcoded secret detected'
        });
      }
    });
  });
  
  // Check for dangerous functions that exist in multiple languages
  const dangerousFunctions = [
    /system\s*\(/,
    /exec\s*\(/,
    /eval\s*\(/,
    /spawn\s*\(/,
    /fork\s*\(/,
    /kill\s*\(/,
    /getenv\s*\(/,
    /setenv\s*\(/,
    /chown\s*\(/,
    /chmod\s*\(/,
    /mkdir\s*\(/,
    /rm\s*[-rf]/
  ];
  
  lines.forEach((line, index) => {
    dangerousFunctions.forEach(pattern => {
      if (line.match(pattern)) {
        vulnerabilities.push({
          type: 'dangerous-function',
          severity: 'medium',
          line: index + 1,
          description: 'Use of potentially dangerous function'
        });
      }
    });
  });
  
  // Check for commented-out debug code
  if (code.includes('// TODO') || code.includes('// FIXME')) {
    const todoLines = lines.filter(line => line.includes('// TODO') || line.includes('// FIXME'));
    todoLines.forEach((line, index) => {
      const globalIndex = lines.indexOf(line);
      vulnerabilities.push({
        type: 'commented-code',
        severity: 'low',
        line: globalIndex + 1,
        description: 'Commented TODO/FIXME code should be removed or implemented'
      });
    });
  }
  
  // Check for overly permissive file operations
  if (code.includes('777') || code.includes('rwx')) {
    vulnerabilities.push({
      type: 'overly-permissive',
      severity: 'low',
      line: findLineNumber(code, '777'),
      description: 'Overly permissive file permissions detected'
    });
  }
}

async function checkCommonSecurityPatterns(code: string, vulnerabilities: any[]): Promise<void> {
  // Common security patterns across all languages
  
  // Check for hardcoded credentials in string literals
  // Pattern 1: "password" = "value" style (strings with password/secret/etc)
  const credentialPattern = /["`](?:password|secret|key|token|api[_-]?key|private[_-]?key|auth[_-]?token|access[_-]?token)["`]\s*[:=]\s*["`][^"`]{4,}["`]/gi;
  const matches = code.match(credentialPattern);
  
  if (matches) {
    matches.forEach(match => {
      vulnerabilities.push({
        type: 'hardcoded-credential',
        severity: 'critical',
        line: findLineNumber(code, match),
        description: 'Hardcoded credentials detected in source code'
      });
    });
  }
  
  // Pattern 2: const password = "value" or API_KEY = "value" style
  const linePattern = /(?:const|let|var)?\s*(?:password|secret|key|token|api[_-]?key|api[_-]?secret|private[_-]?key|auth[_-]?token|access[_-]?token)\s*=\s*["'][^"']{4,}["']/gi;
  const lines = code.split('\n');
  lines.forEach((line, index) => {
    const match = line.match(linePattern);
    if (match) {
      // Determine which keyword matched
      const keywordMatch = line.match(/(password|secret|key|token|api[_-]?key|api[_-]?secret|private[_-]?key|auth[_-]?token|access[_-]?token)/i);
      const keyword = keywordMatch && keywordMatch[1] ? keywordMatch[1].toLowerCase() : 'credential';
      
      vulnerabilities.push({
        type: 'hardcoded-credential',
        severity: 'high',
        line: index + 1,
        description: `Hardcoded ${keyword} detected in variable assignment`
      });
    }
  });
  
  // Check for dangerous input validation
  if (code.includes('input') && !code.includes('validate') && !code.includes('sanitize')) {
    vulnerabilities.push({
      type: 'input-validation',
      severity: 'medium',
      line: findLineNumber(code, 'input'),
      description: 'Input validation should be implemented'
    });
  }
  
  // Check for insecure logging
  if (code.includes('console.log') && code.includes('password')) {
    vulnerabilities.push({
      type: 'insecure-logging',
      severity: 'high',
      line: findLineNumber(code, 'console.log'),
      description: 'Insecure logging of sensitive information'
    });
  }
  
  // Check for lack of error handling
  if (code.includes('try') && !code.includes('catch')) {
    vulnerabilities.push({
      type: 'error-handling',
      severity: 'low',
      line: findLineNumber(code, 'try'),
      description: 'Missing error handling in try block'
    });
  }
  
  // Check for timing attacks
  if (code.includes('==') && code.includes('password')) {
    vulnerabilities.push({
      type: 'timing-attack',
      severity: 'medium',
      line: findLineNumber(code, '=='),
      description: 'Potential timing attack vulnerability in comparison'
    });
  }
}

function findLineNumber(code: string, text: string): number {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.includes(text)) {
      return i + 1;
    }
  }
  return 1; // Default to line 1 if not found
}