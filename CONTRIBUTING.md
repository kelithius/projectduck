# Contributing to ProjectDuck

Thank you for your interest in contributing to ProjectDuck! This document provides guidelines and standards for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Code Review Checklist](#code-review-checklist)

## Code of Conduct

- Be respectful and constructive in all interactions
- Focus on technical merit and project goals
- Provide clear, actionable feedback in code reviews
- Welcome contributions from developers of all skill levels

## Development Setup

### Prerequisites

- Node.js 20+ and npm
- Git

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd ProjectDuck

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Commands

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Create production build
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
npm test             # Run tests
```

## Code Standards

### Zero Warnings Policy

**All ESLint and TypeScript warnings must be fixed before committing.**

- Pre-commit hooks will automatically check for linting issues
- CI pipeline will reject PRs with any warnings
- Use `npm run lint` before committing
- Use `npm run type-check` to catch TypeScript issues

### Code Style

1. **Language**
   - All code, comments, and documentation must be in **English**
   - No Chinese comments in source code
   - Technical terms should use industry-standard English terminology

2. **TypeScript**
   - Use strict type checking
   - Avoid `any` types unless absolutely necessary
   - Prefer interfaces over type aliases for object shapes
   - Use proper type imports: `import type { ... }`

3. **React/Next.js**
   - Use functional components with hooks
   - Follow React hooks rules (checked by ESLint)
   - Use CSS Modules for component-specific styles
   - Prefer server components unless client interactivity is needed

4. **File Organization**
   - Group related files in feature folders
   - Keep components small and focused
   - Use index files for clean imports
   - Follow the existing project structure

5. **Naming Conventions**
   - Components: PascalCase (e.g., `FileTree.tsx`)
   - Files: camelCase for utilities, PascalCase for components
   - Variables/Functions: camelCase
   - Constants: UPPER_SNAKE_CASE
   - CSS Modules: camelCase for class names

### Error Handling

- Use specific error types instead of generic Error
- Provide user-friendly error messages
- Log errors with sufficient context for debugging
- Never expose sensitive information in error messages
- Use categorized error handling (see `securityService.categorizeError`)

### Performance

- Lazy load heavy components with `React.lazy()`
- Use `useMemo` and `useCallback` appropriately
- Avoid unnecessary re-renders
- Implement proper caching strategies

### Security

- Validate all user inputs
- Sanitize file paths to prevent directory traversal
- Use the `SecurityService` for path validation
- Follow the principle of least privilege
- Never commit secrets or API keys

## Git Workflow

### Branch Naming

```
feature/<feature-name>   # New features
fix/<bug-name>          # Bug fixes
refactor/<description>  # Code refactoring
docs/<description>      # Documentation updates
chore/<description>     # Maintenance tasks
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `test`: Test additions or changes
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Example:**

```
feat(file-tree): add search functionality with auto-expand

Implement real-time search in file tree with the following features:
- Case-insensitive search
- Auto-expand matching nodes
- Highlight search results
- Clear search functionality

Closes #123
```

### Pre-commit Checks

Pre-commit hooks will automatically run:

- ESLint with auto-fix
- Prettier formatting
- Type checking

If any check fails, the commit will be rejected. Fix the issues and try again.

## Pull Request Process

### Before Creating a PR

1. **Update your branch with main**

   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run all checks locally**

   ```bash
   npm run lint          # Must pass with zero warnings
   npm run type-check    # Must pass
   npm run build         # Must succeed
   npm test              # All tests must pass
   ```

3. **Test your changes**
   - Verify functionality works as expected
   - Test edge cases
   - Check browser console for errors
   - Test both light and dark themes

### Creating the PR

1. Use the PR template (auto-populated)
2. Fill in all sections completely
3. Link related issues
4. Add screenshots for UI changes
5. Request review from appropriate team members

### PR Review Process

- At least one approval required
- All CI checks must pass
- No merge conflicts
- Code review feedback addressed
- Documentation updated if needed

## Code Review Checklist

### For Authors

- [ ] Code follows project standards
- [ ] All comments and docs are in English
- [ ] No linter warnings
- [ ] Type checking passes
- [ ] Tests added/updated
- [ ] Manual testing completed
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Documentation updated
- [ ] Commit messages follow conventions

### For Reviewers

- [ ] Code is clear and maintainable
- [ ] Logic is correct
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No security vulnerabilities
- [ ] Performance is acceptable
- [ ] Tests are comprehensive
- [ ] Documentation is complete
- [ ] Follows project architecture
- [ ] No unnecessary complexity

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Ant Design Documentation](https://ant.design/docs/react/introduce)

## Questions?

If you have questions or need help:

- Check existing issues and discussions
- Review the codebase documentation
- Ask in pull request comments
- Contact the maintainers

Thank you for contributing to ProjectDuck! 🦆
