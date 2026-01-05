# Contributing to TTS Middleware

We love your input! We want to make contributing to TTS Middleware as easy and transparent as possible.

## Development Process

We use GitHub to sync code, track issues and feature requests, as well as accept pull requests.

## Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project.

## Report bugs using GitHub's [issue tracker](https://github.com/loonylabs-dev/tts-middleware/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/loonylabs-dev/tts-middleware/issues/new).

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/loonylabs-dev/tts-middleware.git
   cd tts-middleware
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Run tests:
   ```bash
   npm test
   ```

## Coding Style

- Use TypeScript for all new code
- Follow the existing code style (we use Prettier and ESLint)
- Write meaningful commit messages
- Add JSDoc comments for public APIs
- Keep functions focused and small
- Use descriptive variable and function names

## Testing

- Write tests for new features
- Ensure existing tests still pass
- Maintain >90% test coverage
- Test edge cases and error conditions

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments to new public APIs
- Update the CHANGELOG.md for notable changes
- Include examples in documentation

## Adding New TTS Providers

When adding support for a new TTS provider:

1. Create a new provider class extending `BaseTTSProvider`
2. Implement the required `synthesize()` method
3. Add provider-specific types to `provider-options.types.ts`
4. Add comprehensive tests (aim for >95% coverage on new code)
5. Update the README with provider-specific documentation
6. Add environment variables to `.env.example`

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to reach out! You can:
- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Contact the maintainers directly

Thank you for contributing to TTS Middleware!
