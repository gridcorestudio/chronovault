# Contributing to ChronoVault

Thank you for your interest in contributing to ChronoVault! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building something great together.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include:
   - Clear description of the issue
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Solana version, OS, etc.)

### Suggesting Features

1. Check existing feature requests
2. Describe the use case
3. Explain why this would benefit the protocol

### Pull Requests

1. Fork the repository
2. Create a feature branch from `develop`
3. Write clear, documented code
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit PR with detailed description

## Development Setup

```bash
# Prerequisites
- Rust 1.70+
- Solana CLI 2.0+
- Anchor CLI 0.32.0+
- Node.js 18+

# Setup
git clone https://github.com/YOUR_USERNAME/chronovault.git
cd chronovault
npm install
anchor build
anchor test
```

## Code Style

### Rust

- Follow Rust conventions
- Use `cargo fmt` before committing
- Run `cargo clippy` and address warnings

### TypeScript

- Use TypeScript strict mode
- Document public APIs
- Use async/await over callbacks

## Testing

- Write unit tests for new functions
- Add integration tests for new features
- Ensure existing tests pass

```bash
# Run all tests
anchor test

# Run specific test file
anchor test -- --grep "pattern"
```

## Commit Messages

Use conventional commits:

```
feat: add recurring payments
fix: correct fee calculation overflow
docs: update SDK examples
test: add keeper execution tests
```

## Review Process

1. All PRs require at least one review
2. Address review comments
3. Squash commits before merge
4. PRs are merged by maintainers

## Security

If you discover a security vulnerability, please email security@chronovault.io instead of opening a public issue.

## Questions?

- Open a Discussion on GitHub
- Join our Discord

Thank you for contributing!
