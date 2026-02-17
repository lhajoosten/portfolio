# Contributing to Portfolio Frontend

## Welcome! 👋

Thank you for contributing to the portfolio frontend project. This guide explains our development workflow, code standards, and pre-commit hooks.

## Development Workflow

### 1. Clone and Setup

```bash
git clone <repository>
cd portfolio/frontend
pnpm install
pnpm husky install
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Follow naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code improvements
- `docs/` - Documentation
- `chore/` - Dependencies, config, etc.

### 3. Make Your Changes

During development, use these commands frequently:

```bash
# Format code
pnpm format

# Check linting (shows errors)
pnpm lint

# Auto-fix linting errors
pnpm lint:fix

# Type checking
pnpm typecheck

# Run tests in watch mode
pnpm test

# Run dev server
pnpm dev
```

### 4. Create Tests

Add tests for your code in `src/__tests__/`:

```typescript
import { describe, it, expect } from 'vitest';
import { yourFunction } from '../path-to-module';

describe('YourComponent', () => {
  it('should do something', () => {
    const result = yourFunction();
    expect(result).toBe(expectedValue);
  });
});
```

Run tests: `pnpm test:run`

### 5. Commit Your Changes

The pre-commit hook will automatically:

```
✓ Format code with Prettier
✓ Lint and fix with ESLint
✓ Check types with TypeScript
✓ Run all tests
✓ Validate final changes
```

Simply commit normally:

```bash
git add .
git commit -m "feat: add new feature"
```

If the hook fails, fix the issues and retry.

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Create a PR and request review from team members.

## Code Standards

### TypeScript

- Use `const` by default, `let` when needed
- Always add explicit return types on functions
- Use type imports: `import type { ComponentProps } from 'react'`
- Avoid `any` type - use proper types instead

```typescript
// ✅ Good
import type { FC } from 'react';

const MyComponent: FC<Props> = ({ prop }) => {
  return <div>{prop}</div>;
};

// ❌ Bad
const MyComponent = ({ prop }: any) => {
  return <div>{prop}</div>;
};
```

### React

- Use functional components with hooks
- Keep components under 200 lines
- Extract logic into custom hooks
- Follow hooks rules (ESLint will enforce)

```typescript
// ✅ Good
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// ❌ Bad - Missing dependency
useEffect(() => {
  document.title = `Count: ${count}`;
}, []); // Missing 'count'!
```

### Code Quality

- Keep functions simple (complexity < 10)
- Avoid deep nesting (max 4 levels)
- Don't reassign function parameters
- Use `===` and `!==` instead of `==` and `!=`
- Avoid nested ternary operators

```typescript
// ✅ Good
if (condition) {
  return handleA();
} else if (otherCondition) {
  return handleB();
} else {
  return handleC();
}

// ❌ Bad - Nested ternaries are hard to read
const result = condition ? handleA() : otherCondition ? handleB() : handleC();
```

### Formatting

All code is automatically formatted with Prettier:
- Line width: 100 characters
- Tab width: 2 spaces
- Double quotes
- Trailing commas
- Semicolons enabled

Don't worry about formatting - the hook handles it!

## Pre-Commit Hooks

### What Gets Checked

When you commit, these checks run in order:

1. **Prettier** - Auto-formats code
2. **ESLint** - Finds and fixes issues
3. **TypeScript** - Type checking
4. **Tests** - All tests must pass
5. **Lint-Staged** - Final validation

### Commit Blocked?

The hook prevents commits if checks fail. To fix:

```bash
# Fix type errors
pnpm typecheck

# Auto-fix linting
pnpm lint:fix

# Run failing tests
pnpm test:run

# Manual fixes may also be needed

# Try commit again
git commit
```

### Emergency Bypass

Only if absolutely necessary:

```bash
git commit --no-verify
```

⚠️ **Use sparingly!** This skips all quality checks.

## Testing Requirements

- Write tests for new features
- Keep tests up-to-date with code changes
- Aim for reasonable coverage (70%+)
- Run `pnpm test:coverage` to check coverage

```bash
# Run tests
pnpm test              # Watch mode
pnpm test:run          # Single run
pnpm test:coverage     # With coverage report
```

## Linting Rules

### Rules You'll Encounter

**Must Fix (Errors):**
- Using `var` instead of `const`/`let`
- Using `==` instead of `===`
- Unused variables
- Missing hook dependencies

**Should Fix (Warnings):**
- `console.log` in code (use sparingly)
- Functions too complex
- Too much nesting
- Debugger statements left in code

Most errors can be auto-fixed:

```bash
pnpm lint:fix
```

## Git Commit Messages

Follow conventional commits format:

```
feat: add user authentication
fix: resolve navbar z-index issue
docs: update README with setup instructions
refactor: simplify component structure
chore: update dependencies
```

Format: `type: brief description`

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code improvement
- `test:` - Test additions/changes
- `chore:` - Dependencies, config, build

## File Structure

```
src/
├── components/     # React components
├── hooks/          # Custom hooks
├── routes/         # Route definitions
├── lib/            # Utilities and helpers
├── __tests__/      # Test files
└── main.tsx        # Entry point
```

Keep related files close together. One component = one file (unless very small).

## Common Issues

### "Type check failed"

```bash
pnpm typecheck
# Fix the type errors shown
```

### "Tests failing"

```bash
pnpm test:run
# Fix the failing tests or code
```

### "ESLint errors"

```bash
pnpm lint:fix
# Manual fixes may be needed for complex cases
```

### "Prettier format issues"

```bash
pnpm format
# Prettier auto-fixes these
```

## Performance Tips

- Run `pnpm format` and `pnpm lint:fix` frequently
- Type check regularly: `pnpm typecheck`
- Keep test suite fast (< 5 seconds)
- Use `.eslintignore` and `.prettierignore` for generated files

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Vitest Testing](https://vitest.dev/)
- [ESLint Rules](./eslint.config.js)
- [Husky Hooks](./.husky/README.md)

## Getting Help

1. Check existing documentation in `.husky/README.md`
2. Review `eslint.config.js` for rule details
3. Run `pnpm typecheck` and `pnpm test:run` to debug
4. Ask team members for code review

## Questions?

See:
- `.husky/README.md` - Pre-commit hook details
- `HUSKY_SETUP.md` - Setup information
- `PRE_COMMIT_SUMMARY.md` - Configuration summary

---

**Happy coding! Let's build something awesome together!** 🚀