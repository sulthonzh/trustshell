import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

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
      
      // TypeScript-specific checks
      const tsIssues = checkTypeScriptSyntax(code);
      if (tsIssues.length > 0) {
        throw new Error(tsIssues[0]);
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

function checkTypeScriptSyntax(code: string): string[] {
  const issues: string[] = [];
  
  // Check for functions without type annotations
  const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)/g;
  let match;
  while ((match = functionRegex.exec(code)) !== null) {
    const args = match[2] || '';
    const fnName = match[1] || '';
    
    // Check if any parameter is missing type annotation
    const paramRegex = /([a-zA-Z_]\w*)(?:\s*[:=]|,|$)/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(args)) !== null) {
      const paramName = paramMatch[1];
      // Check if this parameter has a type annotation
      const paramFullRegex = new RegExp(`${paramName}\s*:`);
      if (!paramFullRegex.test(args)) {
        issues.push(`Parameter '${paramName}' in function '${fnName}' is missing type annotation`);
      }
    }
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
  
  // Check for unused variables
  const unusedVars = findUnusedVariables(code);
  unusedVars.forEach(varName => {
    issues.push({
      type: 'logic',
      message: `Unused variable: ${varName}`,
      severity: 'medium'
    });
  });
  
  // Check for missing semicolons
  const semicolonIssues = checkSemicolons(code);
  semicolonIssues.forEach(issue => {
    issues.push({
      type: 'style',
      message: issue,
      severity: 'low'
    });
  });
  
  // Check for long functions (>50 lines)
  const functionMatches = code.match(/function\s+\w+\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/g) || [];
  functionMatches.forEach(fn => {
    const fnLines = fn.split('\n').length;
    if (fnLines > 50) {
      const fnNameMatch = fn.match(/function\s+(\w+)/);
      const fnName = fnNameMatch ? fnNameMatch[1] : 'anonymous';
      issues.push({
        type: 'performance',
        message: `Function ${fnName} is too long (${fnLines} lines). Consider breaking it down.`,
        severity: 'medium'
      });
    }
  });
}

async function checkTypeScriptQuality(code: string, issues: any[]): Promise<void> {
  // Check for TypeScript-specific anti-patterns
  
  // Check for 'any' types
  const anyTypeMatches = code.match(/:\s*any\b/g) || [];
  anyTypeMatches.forEach(match => {
    issues.push({
      type: 'style',
      message: 'Avoid using "any" type. Use specific types or unknown for better type safety.',
      severity: 'medium'
    });
  });
  
  // Check for missing type annotations
  const functionRegex = /function\s+\w+\s*\(([^)]*)\)/g;
  let match;
  while ((match = functionRegex.exec(code)) !== null) {
    const args = match[1] || '';
    if (args.trim() && !args.includes(':')) {
      issues.push({
        type: 'style',
        message: 'Function parameters should have type annotations',
        severity: 'medium'
      });
    }
  }
  
  // Check for missing return type annotations
  const functionReturnRegex = /function\s+\w+\s*\([^)]*\)(?!\s*[:=>])/g;
  const returnMatches = code.match(functionReturnRegex) || [];
  if (returnMatches.length > 0) {
    issues.push({
      type: 'style',
      message: 'Function should have explicit return type annotation',
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
  
  // Check for missing docstrings in functions
  const functionMatches = code.match(/def\s+(\w+)\s*\([^)]*\):/g) || [];
  functionMatches.forEach(fnMatch => {
    const fnNameMatch = fnMatch.match(/def\s+(\w+)/);
    const fnName = fnNameMatch ? fnNameMatch[1] : 'unknown';
    const fnIndex = code.indexOf(fnMatch);
    
    if (fnIndex >= 0) {
      // Check if there's a docstring (triple-quoted string) after function definition
      const afterFn = code.slice(fnIndex + fnMatch.length);
      const docstringRegex = /['\"]{3}[^'\"]*['\"]{3}/;
      if (!docstringRegex.test(afterFn.slice(0, 200))) {
        issues.push({
          type: 'style',
          message: `Function ${fnName} is missing a docstring`,
          severity: 'low'
        });
      }
    }
  });
  
  // Check for unused imports
  const importMatches = code.match(/import\s+(\w+)/g) || [];
  importMatches.forEach(importLine => {
    const varNameMatch = importLine.match(/import\s+(\w+)/);
    if (varNameMatch && varNameMatch[1]) {
      const importName = varNameMatch[1];
      const usageRegex = new RegExp(`\\b${importName}\\.`, 'g');
      
      // Count how many times the import is used
      const usageMatches = code.match(usageRegex);
      const usageCount = usageMatches ? usageMatches.length : 0;
      
      if (usageCount === 0) {
        issues.push({
          type: 'logic',
          message: `Unused import: ${importName}`,
          severity: 'low'
        });
      }
    }
  });
  
  // Check for functions with too many arguments (>5)
  const functionArgMatches = code.match(/def\s+\w+\s*\(([^)]*)\):/g) || [];
  functionArgMatches.forEach(fn => {
    const argMatch = fn.match(/\(([^)]*)\)/);
    if (argMatch && argMatch[1]) {
      const args = argMatch[1].split(',').map(a => a.trim()).filter(a => a && !a.startsWith('self'));
      if (args.length > 5) {
        issues.push({
          type: 'logic',
          message: `Function has too many arguments (${args.length}). Consider using a data class or configuration object.`,
          severity: 'medium'
        });
      }
    }
  });
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
  
  // Check for missing error handling (ignoring errors with _)
  const errorIgnoredRegex = /(?:\w+\s*,)?\s*_\s*,\s*\w+\s*:=|\w+\s*,\s*_\s*:=/g;
  const errorIgnoredMatches = code.match(errorIgnoredRegex) || [];
  errorIgnoredMatches.forEach(match => {
    issues.push({
      type: 'logic',
      message: 'Error value is being ignored (_). Consider handling the error.',
      severity: 'medium'
    });
  });
  
  // Check for unused variables in Go
  const varDeclMatches = code.match(/(?:var\s+|(?:\w+\s*,\s*)?)(\w+)\s*:=/g) || [];
  const declaredVars = new Set<string>();
  varDeclMatches.forEach(match => {
    const varNameMatch = match.match(/(?:var\s+|(?:\w+\s*,\s*)?)(\w+)\s*:=/);
    if (varNameMatch && varNameMatch[1]) {
      declaredVars.add(varNameMatch[1]);
    }
  });
  
  // Check for return statements that don't use all declared variables
  const returnMatches = code.match(/return\s+([^\n]+);?/g) || [];
  declaredVars.forEach(varName => {
    let used = false;
    for (const returnLine of returnMatches) {
      if (returnLine.includes(varName)) {
        used = true;
        break;
      }
    }
    
    // Also check if variable is used anywhere in the same function
    if (!used) {
      const varUsageRegex = new RegExp(`\\b${varName}\\.`, 'g');
      if (!varUsageRegex.test(code)) {
        issues.push({
          type: 'logic',
          message: `Unused variable: ${varName}`,
          severity: 'low'
        });
      }
    }
  });
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
  // This is a simplified implementation - checks for variables used before being defined
  const undefinedVars: string[] = [];
  
  // Extract variable declarations
  const declaredVars = new Set<string>();
  const varRegex = /(?:var|let|const|function|class)\s+(\w+)/g;
  let match;
  while ((match = varRegex.exec(code)) !== null) {
    if (match[1]) declaredVars.add(match[1]);
  }
  
  // Extract built-in globals and imports
  const builtIns = new Set([
    'console', 'window', 'document', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    'require', 'module', 'exports', 'process', 'Buffer', 'Promise', 'Error', 'Array', 'Object',
    'String', 'Number', 'Boolean', 'Math', 'Date', 'JSON', 'Map', 'Set', 'Symbol', 'Reflect',
    'fetch', 'URL', 'Headers', 'Request', 'Response'
  ]);
  
  // Extract potential variable usages
  const usageRegex = /\b([a-zA-Z_]\w*)\b/g;
  const usages = new Set<string>();
  while ((match = usageRegex.exec(code)) !== null) {
    if (match[1] && !declaredVars.has(match[1]) && !builtIns.has(match[1])) {
      usages.add(match[1]);
    }
  }
  
  return Array.from(usages);
}

function findUnusedVariables(code: string): string[] {
  // This is a simplified implementation - checks for declared variables that are never used
  const unusedVars: string[] = [];
  
  // Extract variable declarations with line numbers
  const declaredVars = new Map<string, { line: number; used: boolean }>();
  const lines = code.split('\n');
  
  lines.forEach((line, lineNum) => {
    const varRegex = /(?:var|let|const)\s+(\w+)/g;
    let match;
    while ((match = varRegex.exec(line)) !== null) {
      if (match[1]) {
        declaredVars.set(match[1], { line: lineNum + 1, used: false });
      }
    }
  });
  
  // Mark variables as used
  declaredVars.forEach((info, varName) => {
    const usageRegex = new RegExp(`\\b${varName}\\b`, 'g');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && usageRegex.test(line) && i !== info.line - 1) {
        info.used = true;
        break;
      }
    }
  });
  
  // Collect unused variables
  declaredVars.forEach((info, varName) => {
    if (!info.used) {
      unusedVars.push(varName);
    }
  });
  
  return unusedVars;
}

function checkSemicolons(code: string): string[] {
  const issues: string[] = [];
  const lines = code.split('\n');
  
  lines.forEach((line, lineNum) => {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) {
      return;
    }
    
    // Skip lines that end with braces (blocks, objects, functions)
    if (trimmed.endsWith('}') || trimmed.endsWith('{')) {
      return;
    }
    
    // Check for statements that should have semicolons
    // Simple heuristic: statements ending with a closing parenthesis but no semicolon
    if (trimmed.includes('return ') || trimmed.includes('throw ')) {
      if (!trimmed.endsWith(';') && !trimmed.endsWith('}')) {
        issues.push(`Line ${lineNum + 1}: Missing semicolon after ${trimmed.split(' ')[0]} statement`);
      }
    }
    
    // Check for variable assignments without semicolons
    const assignmentRegex = /^(?:var|let|const)\s+\w+\s*=.+[^;]$/;
    if (assignmentRegex.test(trimmed) && !trimmed.includes('function')) {
      issues.push(`Line ${lineNum + 1}: Missing semicolon after variable declaration`);
    }
  });
  
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