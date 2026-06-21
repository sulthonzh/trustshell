# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-21

### Added
- Initial release of trustshell - AI Code Output Verifier CLI
- Zero-dependency CLI tool for verifying AI-generated code quality and functionality
- Core verification features:
  - Task completion verification
  - Functional testing
  - Edge case detection
  - Code quality analysis
  - Confidence scoring
- Multi-language support: Python, JavaScript, TypeScript, Go, Rust, and more
- Security scanning for vulnerabilities in AI-generated code
- Performance testing capabilities
- Integration testing support
- Regression testing features
- CLI commands: verify, config, demo
- Custom configuration support via trustshell.config.js
- JSON report output for CI/CD integration
- AI source tracking (cursor, claude, copilot, custom)
- Strict mode for CI/CD with non-zero exit on failure
- Verbose output mode for debugging
- Performance benchmarking option
- Security threshold configuration
- Recursive file processing

### Testing
- 267 functional tests passing (100%)
- 34 test suites covering all modules
- Comprehensive test coverage for:
  - Logger module (29 tests)
  - Config module (28 tests)
  - Security module (65 tests)
  - Analyzer module (35 tests)
  - Verifier module (84 tests)
  - Reporter module (26 tests)

### Security
- Security scanning implementation with vulnerability detection
- Detection for SQL injection, eval usage, hardcoded secrets
- React dangerouslySetInnerHTML detection
- Python eval() and exec() detection
- JavaScript SQL injection pattern detection
- API key and password credential detection
- Input validation throughout codebase

### Documentation
- Comprehensive README with problem statement and features
- Installation and usage instructions
- Configuration file template generation
- API integration examples
- Output format documentation
- Development setup instructions

## [Unreleased]

---

[1.0.0]: https://github.com/sulthonzh/trustshell/releases/tag/v1.0.0