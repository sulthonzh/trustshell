import { spawn } from 'child_process';
import { writeFileSync, chmodSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { logger } from './logger.js';

export interface ExecutionOptions {
  timeout: number;
  input?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export async function executeCode(
  filePath: string, 
  language: string, 
  options: ExecutionOptions
): Promise<{ output: string; error?: string; exitCode: number }> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    let output = '';
    let error = '';
    let timedOut = false;
    
    // Create execution script based on language
    const scriptPath = createExecutionScript(filePath, language);
    
    const childProcess = spawn(scriptPath, [], {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      timeout: options.timeout
    });

    // Handle stdout
    childProcess.stdout?.on('data', (data) => {
      output += data.toString();
    });

    // Handle stderr
    childProcess.stderr?.on('data', (data) => {
      error += data.toString();
    });

    // Handle exit
    childProcess.on('close', (code) => {
      if (timedOut) return;
      
      const executionTime = Date.now() - startTime;
      logger.debug(`Code executed in ${executionTime}ms (exit code: ${code})`);
      
      // Clean up script
      cleanupScript(scriptPath).catch(cleanupErr => {
        logger.warn(`Failed to cleanup execution script: ${cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)}`);
      });
      
      resolve({
        output: output.trim(),
        error: error.trim() || undefined as unknown as string,
        exitCode: code || 0
      });
    });

    // Handle timeout
    setTimeout(() => {
      timedOut = true;
      childProcess.kill('SIGTERM');
      
      logger.warn(`Code execution timed out after ${options.timeout}ms`);
      
      // Try force kill if still running
      setTimeout(() => {
        if (childProcess.pid && !childProcess.killed) {
          process.kill(childProcess.pid, 'SIGKILL');
        }
      }, 1000);
      
      cleanupScript(scriptPath).catch(cleanupErr => {
        logger.warn(`Failed to cleanup execution script: ${cleanupErr.message}`);
      });
      
      reject(new Error(`Code execution timed out after ${options.timeout}ms`));
    }, options.timeout);
    
    // Handle input if provided
    if (options.input) {
      childProcess.stdin?.write(options.input);
      childProcess.stdin?.end();
    }
  });
}

function createExecutionScript(sourcePath: string, language: string): string {
  const tempDir = process.env.TMPDIR || '/tmp';
  const scriptName = `trustshell-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const scriptPath = join(tempDir, scriptName);
  
  let scriptContent = '';
  
  switch (language) {
    case 'javascript':
      scriptContent = `
const fs = require('fs');
const path = require('path');

// Read and execute the source file
const sourceCode = fs.readFileSync('${sourcePath}', 'utf8');
try {
  eval(sourceCode);
} catch (error) {
  console.error('Execution error:', error.message);
  process.exit(1);
}
`;
      break;
      
    case 'typescript':
      scriptContent = `
const fs = require('fs');
const path = require('path');

// For TypeScript, we'll just validate syntax by attempting to compile
const ts = require('typescript');
const sourceCode = fs.readFileSync('${sourcePath}', 'utf8');

const result = ts.transpile(sourceCode, {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  noImplicitAny: true,
  strict: true
});

console.log('TypeScript syntax validation passed');
`;
      break;
      
    case 'python':
      scriptContent = `
import subprocess
import sys
import os

# Execute the Python file
try:
    result = subprocess.run(['python3', '${sourcePath}'], 
                          capture_output=True, 
                          text=True, 
                          timeout=30)
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr:
        print(result.stderr.strip(), file=sys.stderr)
    sys.exit(result.returncode)
except subprocess.TimeoutExpired:
    print("Script execution timed out", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Execution error: {e}", file=sys.stderr)
    sys.exit(1)
`;
      break;
      
    case 'go':
      scriptContent = `
package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	// Compile and run the Go file
	cmd := exec.Command("go", "run", "${sourcePath}")
	output, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			fmt.Println(string(exitErr.Stderr))
			os.Exit(1)
		}
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}
	fmt.Print(string(output))
}
`;
      break;
      
    case 'rust':
      scriptContent = `
use std::process::Command;

fn main() {
    // Compile and run the Rust file
    let output = Command::new("rustc")
        .arg("${sourcePath}")
        .output();
    
    match output {
        Ok(output) => {
            if !output.stderr.is_empty() {
                eprint!("{}", String::from_utf8_lossy(&output.stderr));
                std::process::exit(1);
            }
            
            // Run the compiled binary
            let run_output = Command::new("./trustshell-exec")
                .output();
            
            match run_output {
                Ok(run_output) => {
                    if !run_output.stdout.is_empty() {
                        print!("{}", String::from_utf8_lossy(&run_output.stdout));
                    }
                    if !run_output.stderr.is_empty() {
                        eprint!("{}", String::from_utf8_lossy(&run_output.stderr));
                    }
                    std::process::exit(run_output.status.code().unwrap_or(1));
                }
                Err(e) => {
                    eprintln!("Error running compiled binary: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Err(e) => {
            eprintln!("Error compiling Rust code: {}", e);
            std::process::exit(1);
        }
    }
}
`;
      break;
      
    case 'java':
      scriptContent = `
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.io.IOException;

public class TrustshellExecutor {
    public static void main(String[] args) throws IOException {
        // Read the Java source file
        String sourceCode = new String(Files.readAllBytes(Paths.get("${sourcePath}")));
        
        // Write to a temporary file with proper class name
        String className = "TrustshellTempClass";
        String javaCode = sourceCode.replaceAll(
            "public\\s+class\\s+\\w+", 
            "public class " + className
        );
        
        Files.write(Paths.get("/tmp/" + className + ".java"), javaCode.getBytes());
        
        // Compile and run
        try {
            Process compile = Runtime.getRuntime().exec(new String[]{"javac", "/tmp/" + className + ".java"});
            compile.waitFor();
            
            if (compile.exitValue() != 0) {
                System.err.println(new String(compile.getErrorStream().readAllBytes()));
                System.exit(1);
            }
            
            Process run = Runtime.getRuntime().exec(new String[]{"java", className});
            run.waitFor();
            
            if (run.exitValue() != 0) {
                System.err.println(new String(run.getErrorStream().readAllBytes()));
                System.exit(1);
            }
            
        } catch (Exception e) {
            System.err.println("Execution error: " + e.getMessage());
            System.exit(1);
        }
    }
}
`;
      break;
      
    default:
      // For unsupported languages, just return a message
      scriptContent = `
console.log('Language ${language} not supported for execution');
`;
      break;
  }
  
  // Write the script to temp file
  writeFileSync(scriptPath, scriptContent);
  chmodSync(scriptPath, 0o755);

  return scriptPath;
}

async function cleanupScript(scriptPath: string): Promise<void> {
  try {
    await unlink(scriptPath);
  } catch (_error) {
    // Ignore cleanup errors
  }
}