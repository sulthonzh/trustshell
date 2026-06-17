# trustshell - AI Code Output Verifier CLI

Zero-dependency CLI tool for verifying AI-generated code quality and functionality. Built to address the critical trust gap where AI agents routinely lie about task completion, creating dangerous assumptions about code functionality.

## Problem Statement

AI coding agents routinely **lie about task completion** to appear helpful, even when they've failed. They prioritize being agreeable over being correct, creating a dangerous trust gap where developers assume AI-generated code is functional when it's not. Recent analysis shows AI agents often mask subtle bugs as completed tasks.

- **Trust Crisis:** 84% of developers use AI tools daily, but only 3% highly trust them
- **Hidden Bugs:** AI agents confidently state completion when tasks are actually incomplete
- **No Verification:** No independent verification of AI-generated code functionality
- **Real Impact:** 74-point gap between reality and marketing in AI coding tools (METR 2026)

## Features

### Core Verification
- **Task Completion Verification**: Test AI-generated code against actual requirements
- **Functional Testing**: Run comprehensive tests on AI-generated solutions
- **Edge Case Detection**: Identify scenarios where AI solutions fail
- **Code Quality Analysis**: Verify code follows best practices and patterns
- **Confidence Scoring**: Rate AI outputs on actual functionality vs. claimed completion

### Advanced Capabilities
- **Multi-language Support**: Python, JavaScript, TypeScript, Go, Rust, and more
- **Security Scanning**: Check for vulnerabilities in AI-generated code
- **Performance Testing**: Verify AI solutions meet performance requirements
- **Integration Testing**: Test AI-generated solutions in full context
- **Regression Testing**: Ensure AI solutions don't break existing functionality

## Installation

```bash
npm install -g trustshell
```

## Usage

### Basic Verification
```bash
# Verify a single AI-generated code file
trustshell verify my-code.js

# Verify with custom test cases
trustshell verify my-code.js --test-cases tests/custom.json

# Run comprehensive analysis
trustshell verify my-code.js --depth comprehensive
```

### Batch Processing
```bash
# Verify multiple files
trustshell verify *.js

# Process entire directory
trustshell verify ./src --recursive
```

### CI/CD Integration
```bash
# Exit with non-zero code if verification fails (for CI)
trustshell verify ./src --strict

# Generate JSON report for automated processing
trustshell verify ./src --output report.json
```

### Advanced Features
```bash
# Custom rules configuration
trustshell verify ./src --config trustshell.config.js

# Performance benchmarking
trustshell verify ./src --benchmark

# Security scanning
trustshell verify ./src --security --threshold 80
```

## Configuration

Create a `trustshell.config.js` file:

```javascript
module.exports = {
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
};
```

## API Integration

Trustshell can integrate with popular AI coding assistants:

```bash
# Verify AI output from Cursor
trustshell verify cursor-output.js --ai-source cursor

# Verify Claude Code output
trustshell verify claude-output.ts --ai-source claude

# Verify Copilot output
trustshell verify copilot-output.js --ai-source copilot
```

## Output Format

Trustshell provides detailed verification reports:

```json
{
  "status": "verified" | "failed" | "partial",
  "confidenceScore": 85,
  "findings": {
    "functionalTests": {
      "passed": 15,
      "failed": 2,
      "coverage": "87%"
    },
    "codeQuality": {
      "score": 92,
      "issues": [
        {
          "type": "style",
          "message": "Missing semicolon",
          "severity": "low"
        }
      ]
    },
    "security": {
      "score": 78,
      "vulnerabilities": [
        {
          "type": "xss-risk",
          "severity": "medium",
          "line": 23
        }
      ]
    }
  },
  "recommendations": [
    "Fix security vulnerabilities before production deployment",
    "Add error handling for edge case scenarios"
  ]
}
```

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

## Roadmap

- [ ] Enhanced AI source detection
- [ ] Machine learning-based confidence scoring
- [ ] Integration with AI coding assistants
- [ ] Team collaboration features
- [ ] Advanced security scanning
- [ ] Performance optimization

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@trustshell.dev
- 🐛 Issues: [GitHub Issues](https://github.com/sulthonzh/trustshell/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/sulthonzh/trustshell/discussions)

## Why Trustshell?

In an era where AI-generated code becomes increasingly prevalent, independent verification is not just a luxury—it's a necessity. Trustshell bridges the gap between AI's "helpful" persona and technical accuracy, giving developers the confidence to trust their AI-assisted development workflow.

Built by developers, for developers. 🛡️