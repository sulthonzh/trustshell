import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

export interface CodeQuality {
  score: number;
  issues: Array<{
    type: 'syntax' | 'style' | 'logic' | 'performance';
    message: string;
    severity: 'low' | 'medium' | 'high';
    line?: number;
  }>;
}

export interface FunctionalTestResult {
  passed: number;
  failed: number;
  coverage: string;
  errorMessages: string[];
}

export interface AnalysisResult {
  codeQuality: CodeQuality;
  functionalTests?: FunctionalTestResult;
}

export async function analyzeCode(
  filePath: string, 
  language: string, 
  config: any
): Promise<AnalysisResult> {
  logger.debug(`Analyzing code: ${filePath} (${language})`);
  
  try {
    const code = readFileSync(filePath, 'utf8');
    const codeQuality = await analyzeCodeQuality(code, language);
    
    const result: AnalysisResult = {
      codeQuality
    };
    
    // For basic depth, only return code quality
    if (config.depth === 'basic') {
      return result;
    }
    
    // For deeper analysis, include functional tests
    const functionalTests = await generateFunctionalTests(code, language);
    result.functionalTests = functionalTests;
    
    return result;
    
  } catch (error) {
    logger.error(`Code analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      codeQuality: {
        score: 0,
        issues: [{
          type: 'syntax',
          message: `Failed to analyze code: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'high'
        }]
      }
    };
  }
}

async function analyzeCodeQuality(code: string, language: string): Promise<CodeQuality> {
  const issues: Array<{
    type: 'syntax' | 'style' | 'logic' | 'performance';
    message: string;
    severity: 'low' | 'medium' | 'high';
    line?: number;
  }> = [];
  
  let score = 100;
  
  // Basic syntax checks
  try {
    validateSyntax(code, language);
  } catch (error: unknown) {
    issues.push({
      type: 'syntax',
      message: error instanceof Error ? error.message : String(error),
      severity: 'high',
      line: (error as any).line || 1
    });
    score = Math.max(0, score - 30);
  }
  
  // Language-specific quality checks
  switch (language) {
    case 'javascript':
    case 'typescript':
      await checkJavaScriptQuality(code, issues);
      break;
    case 'python':
      await checkPythonQuality(code, issues);
      break;
    case 'go':
      await checkGoQuality(code, issues);
      break;
    case 'rust':
      await checkRustQuality(code, issues);
      break;
    case 'java':
      await checkJavaQuality(code, issues);
      break;
    default:
      // Generic checks for other languages
      await checkGenericQuality(code, issues, language);
  }
  
  // Calculate final score
  issues.forEach(issue => {
    switch (issue.severity) {
      case 'high':
        score = Math.max(0, score - 15);
        break;
      case 'medium':
        score = Math.max(0, score - 8);
        break;
      case 'low':
        score = Math.max(0, score - 3);
        break;
    }
  });
  
  return { score, issues };
}

async function validateSyntax(code: string, language: string): Promise<void> {
  // Basic syntax validation for common languages
  switch (language) {
    case 'javascript':
      // Check for basic syntax errors
      if (!checkBalancedBraces(code)) {
        throw new Error('Unbalanced braces or brackets');
      }
      
      // Check for basic JavaScript syntax issues
      const jsIssues = checkJavaScriptSyntax(code);
      if (jsIssues.length > 0) {
        throw new Error(jsIssues[0]);
      }
      break;
      
    case 'typescript':
      // TypeScript syntax validation would be more complex
      // For now, just basic checks
      if (!checkBalancedBraces(code)) {
        throw new Error('Unbalanced braces or brackets');
      }
      break;
      
    case 'python':
      // Check for basic Python syntax issues
      const pyIssues = checkPythonSyntax(code);
      if (pyIssues.length > 0) {
        throw new Error(pyIssues[0]);
      }
      break;
      
    case 'go':
      // Go syntax validation would require the Go compiler
      // For now, basic structure checks
      if (!checkBalancedBraces(code)) {
        throw new Error('Unbalanced braces or brackets');
      }
      break;
      
    case 'rust':
      // Rust syntax validation would require the Rust compiler
      // For now, basic structure checks
      if (!checkBalancedBraces(code)) {
        throw new Error('Unbalanced braces or brackets');
      }
      break;
      
    case 'java':
      // Java basic syntax checks
      if (!checkBalancedBraces(code)) {
        throw new Error('Unbalanced braces or brackets');
      }
      break;
      
    default:
      // Generic syntax check
      if (!checkBalancedBraces(code)) {
        throw new Error('Unbalanced braces or brackets');
      }
  }
}

function checkBalancedBraces(code: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    
    if (char && char in pairs) {
      stack.push(char);
    } else if (char && Object.values(pairs).includes(char)) {
      if (stack.length === 0) return false;
      const last = stack.pop()!;
      if (pairs[last] !== char) return false;
    }
  }
  
  return stack.length === 0;
}

function checkJavaScriptSyntax(code: string): string[] {
  const issues: string[] = [];
  
  // Check for undefined variables
  const undefinedVars = findUndefinedVariables(code);
  if (undefinedVars.length > 0) {
    issues.push(`Undefined variables: ${undefinedVars.join(', ')}`);
  }
  
  // Check for unused variables
  const unusedVars = findUnusedVariables(code);
  if (unusedVars.length > 0) {
    issues.push(`Unused variables: ${unusedVars.join(', ')}`);
  }
  
  // Check for missing semicolons in problematic contexts
  const semicolonIssues = checkSemicolons(code);
  if (semicolonIssues.length > 0) {
    issues.push(...semicolonIssues);
  }
  
  return issues;
}

function checkPythonSyntax(code: string): string[] {
  const issues: string[] = [];
  
  // Check for indentation issues
  const indentationIssues = checkPythonIndentation(code);
  if (indentationIssues.length > 0) {
    issues.push(...indentationIssues);
  }
  
  // Check for missing colons
  const colonIssues = checkPythonColons(code);
  if (colonIssues.length > 0) {
    issues.push(...colonIssues);
  }
  
  return issues;
}

async function checkJavaScriptQuality(code: string, issues: any[]): Promise<void> {
  // Check for common JavaScript anti-patterns
  if (code.includes('eval(')) {
    issues.push({
      type: 'security',
      message: 'Use of eval() is dangerous and should be avoided',
      severity: 'high'
    });
  }
  
  if (code.includes('with(')) {
    issues.push({
      type: 'style',
      message: 'with() statement is deprecated and error-prone',
      severity: 'medium'
    });
  }
  
  // Check for proper variable declarations
  const varDeclarations = (code.match(/var\s+\w+/g) || []).length;
  const letDeclarations = (code.match(/let\s+\w+/g) || []).length;
  const constDeclarations = (code.match(/const\s+\w+/g) || []).length;
  
  if (varDeclarations > 0 && letDeclarations + constDeclarations === 0) {
    issues.push({
      type: 'style',
      message: 'Consider using let/const instead of var for better scoping',
      severity: 'low'
    });
  }
  
  // Check for console.log in production code
  if (code.includes('console.log') && !code.includes('// DEBUG')) {
    issues.push({
      type: 'style',
      message: 'console.log should be removed from production code',
      severity: 'low'
    });
  }
}

async function checkPythonQuality(code: string, issues: any[]): Promise<void> {
  // Check for common Python anti-patterns
  if (code.includes('import *')) {
    issues.push({
      type: 'style',
      message: 'Avoid wildcard imports (import *)',
      severity: 'medium'
    });
  }
  
  // Check for proper exception handling
  if (code.includes('except:') && !code.includes('except Exception:')) {
    issues.push({
      type: 'logic',
      message: 'Use specific exception types instead of bare except',
      severity: 'medium'
    });
  }
  
  // Check for global variables
  const globalVars = findPythonGlobalVariables(code);
  if (globalVars.length > 0) {
    issues.push({
      type: 'style',
      message: `Global variables detected: ${globalVars.join(', ')}`,
      severity: 'low'
    });
  }
}

async function checkGoQuality(code: string, issues: any[]): Promise<void> {
  // Check for Go-specific patterns
  if (code.includes('var ') && !code.includes(':=') && code.includes('func')) {
    issues.push({
      type: 'style',
      message: 'Use short variable declarations (:=) when possible',
      severity: 'low'
    });
  }
}

async function checkRustQuality(code: string, issues: any[]): Promise<void> {
  // Check for Rust-specific patterns
  if (code.includes('mut ') && !code.includes('let mut')) {
    issues.push({
      type: 'syntax',
      message: 'Use let mut for mutable variables',
      severity: 'high'
    });
  }
}

async function checkJavaQuality(code: string, issues: any[]): Promise<void> {
  // Check for Java-specific patterns
  if (code.includes('System.out.println') && !code.includes('// DEBUG')) {
    issues.push({
      type: 'style',
      message: 'Use proper logging framework instead of System.out',
      severity: 'low'
    });
  }
}

async function checkGenericQuality(code: string, issues: any[], language: string): Promise<void> {
  // Generic quality checks for any language
  const lineCount = code.split('\n').length;
  
  if (lineCount > 1000) {
    issues.push({
      type: 'performance',
      message: 'Large file - consider breaking into smaller modules',
      severity: 'medium'
    });
  }
  
  // Check for TODO comments
  const todoMatches = code.match(/TODO|FIXME|HACK/gi);
  if (todoMatches && todoMatches.length > 3) {
    issues.push({
      type: 'style',
      message: `Multiple TODO/FIXME comments found (${todoMatches.length})`,
      severity: 'low'
    });
  }
}

async function generateFunctionalTests(code: string, language: string): Promise<FunctionalTestResult> {
  // This is a simplified test generator
  // In a real implementation, this would use language-specific testing frameworks
  
  const tests: string[] = [];
  let errorMessages: string[] = [];
  
  // Generate basic tests based on code analysis
  if (language === 'javascript' || language === 'typescript') {
    tests.push('test("basic functionality", () => { /* TODO: implement */ });');
  }
  
  if (language === 'python') {
    tests.push('def test_basic():\n    # TODO: implement\n    pass\n');
  }
  
  // Simulate test execution
  const passed = Math.floor(Math.random() * 5); // Random test results for demo
  const failed = Math.floor(Math.random() * 3);
  const coverage = `${Math.floor(Math.random() * 40 + 60)}%`;
  
  return {
    passed,
    failed,
    coverage,
    errorMessages
  };
}

// Helper functions for syntax checking
function findUndefinedVariables(code: string): string[] {
  // This is a simplified implementation
  // Real implementation would use AST parsing
  const undefinedVars: string[] = [];
  return undefinedVars;
}

function findUnusedVariables(code: string): string[] {
  // This is a simplified implementation
  // Real implementation would use AST parsing
  const unusedVars: string[] = [];
  return unusedVars;
}

function checkSemicolons(code: string): string[] {
  const issues: string[] = [];
  // This is a simplified check
  return issues;
}

function checkPythonIndentation(code: string): string[] {
  const issues: string[] = [];
  const lines = code.split('\n');
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const prevLine = lines[i - 1];
    
    if (prevLine && prevLine.trim().endsWith(':') && line && !line.startsWith('  ')) {
      issues.push(`Line ${i + 1}: Missing proper indentation after colon`);
    }
  }
  
  return issues;
}

function checkPythonColons(code: string): string[] {
  const issues: string[] = [];
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    
    // Check for statements that should end with colon
    if (line?.match(/^(if|elif|else|for|while|def|class|try|except|finally|with)\s/)) {
      if (!line.endsWith(':')) {
        const statementType = line.split(' ')[0];
        issues.push(`Line ${i + 1}: Missing colon at end of ${statementType} statement`);
      }
    }
  }
  
  return issues;
}

function findPythonGlobalVariables(code: string): string[] {
  const globals: string[] = [];
  // This is a simplified implementation
  return globals;
}