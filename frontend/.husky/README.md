# Husky Pre-Commit Hooks

This directory contains Git hooks managed by Husky that automatically run before each commit to ensure code quality and consistency.

## Setup

The pre-commit hooks have been automatically installed via `pnpm husky install`.

## What Gets Checked

The pre-commit hook (`pre-commit`) runs the following checks in order:

### 1. **Prettier Formatting**
   - Automatically formats all code files
   - Ensures consistent code style across the project
   - Fixes indentation, spacing, quotes, etc.

### 2. **ESLint Linting & Fixing**
   - Runs ESLint with auto-fix enabled
   - Detects and fixes code quality issues
   - Checks for React best practices, TypeScript issues, code smells
   - Enforces:
     - No unused variables
     - Consistent type imports
     - React hooks rules
     - Code complexity limits
     - No console.log in production code (warnings)
     - No debugger statements

### 3. **TypeScript Type Checking** 
   - Runs `tsc --noEmit` to verify type safety
   - Catches type errors before they reach the codebase
   - Does not emit any files, only checks for errors

### 4. **Unit Tests**
   - Runs all tests in the project using Vitest
   - Only allows commits if all tests pass
   - If there are no tests yet, this step will still run but may be skipped

### 5. **Lint-Staged**
   - Re-runs linting/formatting on staged changes
   - Ensures final committed code meets all standards

## Linting Rules

### ESLint Configuration

The project uses comprehensive ESLint rules including:

#### TypeScript Rules
- `@typescript-eslint/no-unused-vars` - Error on unused variables
- `@typescript-eslint/consistent-type-imports` - Type-only imports use `type` keyword
- `@typescript-eslint/explicit-function-return-types` - Warn on implicit return types
- `@typescript-eslint/no-floating-promises` - Warn on unhandled promises
- `@typescript-eslint/no-misused-promises` - Warn on promise misuse

#### Code Quality (Smell Detection)
- `complexity` - Warn if function complexity > 10
- `max-depth` - Warn if nesting > 4 levels
- `max-nested-callbacks` - Warn if callbacks > 3 levels
- `no-nested-ternary` - Warn on nested ternary operators
- `no-console` - Warn on console usage (except warn/error)
- `no-debugger` - Warn on debugger statements
- `no-param-reassign` - Warn on reassigning function parameters
- `eqeqeq` - Enforce strict equality (=== and !==)
- `prefer-const` - Enforce const over let where possible
- `no-var` - Error on var usage (use let/const instead)

#### React Best Practices
- `react-hooks/rules-of-hooks` - Error on hooks rule violations
- `react-hooks/exhaustive-deps` - Warn on missing dependencies

#### General Best Practices
- `no-eval` - Error on eval usage
- `no-new-func` - Error on Function constructor
- `require-await` - Warn on async functions without await

## Prettier Configuration

Located in `.prettierrc.json`:
- Print width: 100 characters
- Tab width: 2 spaces
- Semicolons: enabled
- Trailing commas: all
- Single quotes: disabled (double quotes)
- Arrow parens: always

## Running Checks Manually

If you want to run these checks manually without committing:

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check

# Lint and fix
pnpm lint:fix

# Type check
pnpm typecheck

# Run tests
pnpm test
pnpm test:run    # Single run
pnpm test:coverage  # With coverage report
```

## Bypassing Hooks (Not Recommended)

If you absolutely need to bypass pre-commit hooks:

```bash
git commit --no-verify
```

⚠️ **Use with caution!** Bypassing these hooks can introduce bugs and inconsistencies.

## Troubleshooting

### Hook not running
- Ensure Husky is installed: `pnpm husky install`
- Check that `.husky/pre-commit` exists and is executable
- Verify Git hooks permissions: `chmod +x .husky/pre-commit`

### Tests fail before commit
- Run `pnpm test:run` to see what's failing
- Fix the failing tests before committing
- Or update tests to match the new code

### Type checking fails
- Run `pnpm typecheck` to see type errors
- Fix type errors in your code
- Use `as unknown as Type` sparingly as a last resort

### ESLint keeps failing
- Run `pnpm lint:fix` to auto-fix issues
- Some rules may require manual fixes
- Check ESLint config in `eslint.config.js`

### Prettier conflicts with ESLint
- The pre-commit hook runs Prettier first, then ESLint
- Both tools are configured to work together
- If conflicts persist, check `.prettierrc.json` and `eslint.config.js`

## Files Modified by Hooks

The pre-commit hook may modify these files before committing:
- Any `.js`, `.ts`, `.jsx`, `.tsx` files (formatted + linted)
- Any `.json`, `.css`, `.md` files (formatted)

Make sure to review changes before committing!

## See Also

- [Husky Documentation](https://typicode.github.io/husky/)
- [ESLint Configuration](./eslint.config.js)
- [Prettier Configuration](./.prettierrc.json)
- [Vitest Configuration](./vitest.config.ts)
