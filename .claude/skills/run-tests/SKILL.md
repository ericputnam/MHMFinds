---
name: run-tests
description: Runs unit tests using Vitest. Use when user asks to run tests, execute tests, check tests, test the code, run unit tests, or verify tests pass.
allowed-tools: [Bash(npm:*), Bash(npx:*), Bash(vitest:*)]
---

# Run Tests Skill

## Purpose
Executes unit tests using Vitest and reports results. Supports multiple testing modes including one-time runs, watch mode, coverage reports, and UI mode.

## Instructions

When asked to run tests, follow these steps:

### 1. Determine Test Mode

Based on user request, choose the appropriate command:

**Standard One-Time Run** (default):
```bash
npm run test:run
```
Use when: "run tests", "run all tests", "check if tests pass"

**Watch Mode**:
```bash
npm run test:watch
```
Use when: "run tests in watch mode", "watch tests"

**Coverage Report**:
```bash
npm run test:coverage
```
Use when: "run tests with coverage", "check test coverage", "coverage report"

**UI Mode**:
```bash
npm run test:ui
```
Use when: "run tests with UI", "open test UI"

### 2. Execute Tests

Run the appropriate npm command based on the mode selected.

### 3. Analyze Results

After tests complete, analyze the output:
- ✅ **All Passing**: Report success with test count
- ❌ **Failures**: List which tests failed and why
- ⚠️ **Warnings**: Note any warnings or deprecation notices
- 📊 **Coverage**: If coverage run, summarize coverage percentages

### 4. Report to User

Provide a clear summary:
```
Test Results:
✅ 42 tests passed
❌ 2 tests failed
⏱️  Completed in 3.2s

Failed Tests:
  - ModCard.test.tsx > renders correctly
  - SearchBar.test.tsx > handles empty query
```

If tests fail, ask if the user wants you to investigate or fix the failures.

## Examples

### Example 1: Simple Test Run
```bash
npm run test:run
```

### Example 2: Coverage Report
```bash
npm run test:coverage
```

### Example 3: Specific Test File
```bash
npx vitest run path/to/test.test.tsx
```

### Example 4: Filter by Name
```bash
npx vitest run --grep "ModCard"
```

## Test Output Interpretation

**Success Output:**
```
✓ src/components/ModCard.test.tsx (5)
✓ src/components/SearchBar.test.tsx (3)

Test Files  2 passed (2)
     Tests  8 passed (8)
  Start at  10:30:45
  Duration  1.23s
```

**Failure Output:**
```
✓ src/components/ModCard.test.tsx (4)
✕ src/components/SearchBar.test.tsx (3)
  ✕ handles empty query
    Expected: ""
    Received: undefined

Test Files  1 failed | 1 passed (2)
     Tests  1 failed | 7 passed (8)
```

## Advanced Options

### Run Specific Test File
```bash
npx vitest run src/components/ModCard.test.tsx
```

### Run Tests Matching Pattern
```bash
npx vitest run --grep "ModCard"
```

### Run with Verbose Output
```bash
npx vitest run --reporter=verbose
```

### Update Snapshots
```bash
npx vitest run -u
```

## Common Test Issues

### Issue: Tests Fail Due to Missing Dependencies
**Solution**: Run `npm install` to ensure all test dependencies are installed

### Issue: Tests Timeout
**Solution**: Increase timeout with `--testTimeout=10000`

### Issue: Database/API Tests Failing
**Solution**: Check if test database is seeded, mocks are configured

### Issue: Snapshot Mismatches
**Solution**: Review changes, update with `-u` flag if intentional

## Best Practices

1. **Always run tests before committing**: Verify changes don't break existing functionality
2. **Check coverage**: Aim for >80% coverage on critical paths
3. **Fix failures immediately**: Don't let failing tests accumulate
4. **Run specific tests during development**: Use `--grep` to focus on what you're working on
5. **Watch mode for TDD**: Use `npm run test:watch` when doing test-driven development

## Notes

- Vitest is configured to run in Node environment with jsdom
- Tests use @testing-library/react for component testing
- MSW (Mock Service Worker) is available for API mocking
- Coverage reports are generated in `/coverage` directory
- Test files use `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` extensions
