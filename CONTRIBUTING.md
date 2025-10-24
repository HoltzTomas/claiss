# Contributing to Claiss 🤝

Thank you for your interest in contributing to Claiss! This document provides guidelines and instructions for contributing to the project.

## 🌟 Ways to Contribute

- 🐛 **Report bugs** - Help us identify and fix issues
- 💡 **Suggest features** - Share ideas for new functionality
- 📝 **Improve documentation** - Help make our docs clearer
- 💻 **Write code** - Submit bug fixes or new features
- 🎨 **Improve UI/UX** - Enhance the user experience
- 🧪 **Write tests** - Increase code coverage

## 🚀 Getting Started

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/classia-frontend.git
   cd classia-frontend
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Fill in your API keys (see [README.md](README.md) for details)

5. **Set up Modal.com**:
   ```bash
   pip install modal
   modal token new
   modal deploy modal_manim.py
   ```

6. **Run the dev server**:
   ```bash
   pnpm dev
   ```

7. **Create a new branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📋 Code Style & Standards

### TypeScript/React

- Use **TypeScript** for type safety
- Follow **functional components** with hooks
- Use **meaningful variable names**
- Add **JSDoc comments** for complex functions
- Keep components **small and focused**
- Prefer **composition over inheritance**

### File Organization

- Place React components in `components/`
- Place hooks in `lib/hooks/`
- Place utilities in `lib/`
- Place API routes in `app/api/`
- Name files using **kebab-case** (e.g., `scene-timeline.tsx`)

### Code Formatting

- We use **Prettier** and **ESLint** (run `pnpm lint`)
- 2-space indentation
- Use semicolons
- Single quotes for strings (except JSX)
- Trailing commas

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add video export functionality
fix: resolve scene compilation timeout issue
docs: update installation instructions
style: improve button hover animations
refactor: simplify scene manager logic
test: add unit tests for scene parser
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## 🔄 Pull Request Process

1. **Update your fork** with the latest changes:
   ```bash
   git remote add upstream https://github.com/HoltzTomas/classia-frontend.git
   git fetch upstream
   git merge upstream/main
   ```

2. **Make your changes** and commit them:
   ```bash
   git add .
   git commit -m "feat: your awesome feature"
   ```

3. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Fill out the PR template
   - Reference any related issues
   - Add screenshots/videos for UI changes

5. **Address review feedback**:
   - Respond to comments
   - Make requested changes
   - Push updates to the same branch

6. **Celebrate!** 🎉 Once approved, your PR will be merged

## 🐛 Reporting Bugs

**Before submitting a bug report:**
- Check if the bug has already been reported in [Issues](https://github.com/HoltzTomas/classia-frontend/issues)
- Try to reproduce the bug with the latest version
- Collect relevant information (browser, OS, error messages)

**When submitting a bug report, include:**
- Clear, descriptive title
- Steps to reproduce the bug
- Expected behavior vs actual behavior
- Screenshots or videos if applicable
- Browser and OS information
- Error messages or console logs
- Relevant code snippets

Use the bug report template when creating an issue.

## 💡 Suggesting Features

**Before suggesting a feature:**
- Check the [Roadmap](ROADMAP.md) to see if it's already planned
- Search existing [Issues](https://github.com/HoltzTomas/classia-frontend/issues) for similar requests
- Consider if it aligns with Claiss's goals

**When suggesting a feature, include:**
- Clear, descriptive title
- Problem you're trying to solve
- Proposed solution or implementation
- Alternative solutions considered
- Any relevant examples or mockups

Use the feature request template when creating an issue.

## 🧪 Testing

- Write tests for new features and bug fixes
- Ensure all tests pass before submitting PR:
  ```bash
  pnpm test
  ```
- Test in multiple browsers if changing UI
- Test with different API key configurations

## 📖 Documentation

When contributing code, also update:
- Code comments and JSDoc
- README.md (if adding new features)
- ROADMAP.md (if implementing roadmap items)
- API documentation (if changing APIs)

## 🎯 Good First Issues

New to the project? Look for issues labeled `good-first-issue`:
- [Good First Issues](https://github.com/HoltzTomas/classia-frontend/labels/good-first-issue)

These are beginner-friendly tasks that help you get familiar with the codebase.

## 💬 Questions?

- 💬 [GitHub Discussions](https://github.com/HoltzTomas/classia-frontend/discussions) - Ask questions
- 🐛 [GitHub Issues](https://github.com/HoltzTomas/classia-frontend/issues) - Report bugs or request features

## 📜 Code of Conduct

Be respectful and constructive:
- Welcome newcomers
- Be patient and helpful
- Focus on the best solution, not being "right"
- Accept constructive criticism gracefully
- Respect different viewpoints and experiences

## 🙏 Thank You!

Your contributions make Claiss better for everyone. We appreciate your time and effort!

---

**Happy coding! 🚀**
