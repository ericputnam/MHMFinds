---
name: shipit
description: Production deployment workflow. Runs linting, tests, build, updates docs, commits, and deploys to Vercel. Use when user says "ship it", "deploy", "push to production", or wants to release code.
allowed-tools: [Bash(git:*), Bash(npm:*), Bash(npx:*), Bash(vercel:*), Read, Glob, Grep, Edit, Write, TodoWrite, AskUserQuestion]
---

# Ship It - Production Deployment Workflow

## Purpose
Ensures code is production-ready before any commits or deployments. This skill runs through a comprehensive checklist to validate, test, build, and deploy code safely.

## Critical Rules

**NEVER violate these rules:**

1. **Never skip failed tests** - All tests must pass. Fix failures before proceeding.
2. **Never skip failed linting** - All lint errors must be fixed.
3. **Never skip failed builds** - Build must succeed before committing.
4. **Never leave dev server stopped** - Always restart dev server after build.
5. **Always verify deployment-readiness** - Complete all checks before committing.
6. **Ask questions when uncertain** - If something is unclear or a decision is needed, ask the user.
7. **Follow patterns in AGENTS.md** - Reference this file for build and restart workflow patterns.

## Workflow Steps

Execute these steps in order. If any step fails, fix the issue before proceeding.

### Step 1: Assess Current State

Ask clarifying questions if anything is unclear about the changes being shipped.

Run these commands to understand the current state:
```bash
git status
git branch --show-current
git diff --name-only
git log --oneline -5
```

Report to the user:
- Current branch name
- Files modified but not staged
- Files staged for commit
- Untracked files that might need to be added
- Recent commit context

### Step 2: Sync with Main Branch

**IMPORTANT:** Before testing and deploying, ensure the feature branch has the latest changes from main.

1. **Fetch latest from origin:**
   ```bash
   git fetch origin
   ```

2. **Check if main has new commits:**
   ```bash
   git log HEAD..origin/main --oneline
   ```

3. **If there are new commits, merge main into feature branch:**
   ```bash
   git merge origin/main
   ```

4. **Handle merge conflicts (if any):**
   - If conflicts occur, resolve them carefully
   - Ask the user for help if conflicts are complex
   - After resolving: `git add .` and `git commit`

5. **Verify merge succeeded:**
   ```bash
   git status
   git log --oneline -3
   ```

**Why this matters:** We need to test the code WITH the latest main changes to ensure everything works together before deploying.

### Step 3: Update Documentation (if needed)

Automatically detect and update documentation based on changed files:

1. **Get list of changed files:**
   ```bash
   git diff --name-only HEAD
   git diff --name-only --staged
   ```

2. **Identify related documentation:**
   - If API routes changed (`app/api/**`) → Check `docs/` for related API docs
   - If components changed → Check for component documentation
   - If database schema changed (`prisma/`) → Check `DATABASE_*.md` files
   - If environment config changed → Check `docs/ENV_MANAGEMENT.md`
   - If new features added → Update `README.md`, `QUICKSTART.md`, or feature docs

3. **Review and update relevant docs:**
   - Read the documentation files
   - Identify outdated sections
   - Update with accurate information
   - Stage the doc changes

### Step 4: Run Linter

```bash
npm run lint
```

**If linting fails:**
1. Review the errors
2. Fix each linting error
3. Re-run linter until all errors are resolved
4. Stage the fixes

**Do NOT proceed until linting passes with zero errors.**

### Step 5: Run All Tests

```bash
npm run test:run
```

**If tests fail:**
1. Analyze the failure output
2. Identify the root cause
3. Fix the failing tests or the code causing failures
4. Re-run tests until ALL tests pass

**Target: Zero test failures. Do NOT proceed with any failing tests.**

### Step 6: Run Build

```bash
npm run build
```

**If build fails:**
1. Review the build errors
2. Fix TypeScript errors, import issues, or other build problems
3. Re-run build until successful

**Do NOT proceed until build succeeds.**

### Step 7: Restart Dev Server

After build completes, the dev server needs to be restarted:

1. **Check if dev server is running** (look for existing process)
2. **Start fresh dev server:**
   ```bash
   npm run dev
   ```

**IMPORTANT:** Never leave the dev server stopped. The user needs it running for local development.

Run the dev server in the background so it doesn't block the workflow:
```bash
npm run dev &
```

Or inform the user to restart it manually if background execution isn't possible.

### Step 8: Final Verification

Confirm all previous steps completed successfully:

- [ ] Git status reviewed
- [ ] Synced with main (merged latest changes)
- [ ] Documentation updated (if needed)
- [ ] Linting passed (zero errors)
- [ ] All tests passed (zero failures)
- [ ] Build succeeded
- [ ] Dev server restarted

Create a summary for the user showing the status of each step.

### Step 9: Commit Changes

Only if ALL previous steps passed:

1. **Stage all relevant changes:**
   ```bash
   git add -A
   ```

2. **Create a clean commit message** following conventional commit format:
   ```bash
   git commit -m "<type>: <description>"
   ```

   Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

3. **Verify commit succeeded:**
   ```bash
   git status
   git log --oneline -1
   ```

### Step 10: Request Push Permission

**ALWAYS ask the user before pushing:**

"All checks passed. Ready to push to origin and trigger Vercel deployment.

Changes to be pushed:
- [list commits]

Push to origin/{branch}? This will trigger a production Vercel build."

Wait for explicit user confirmation before proceeding.

### Step 11: Push and Deploy

After user confirms:

1. **Push to remote:**
   ```bash
   git push origin <current-branch>
   ```

2. **Monitor Vercel deployment:**
   ```bash
   vercel ls --limit 5
   ```

3. **Report deployment status:**
   - Deployment URL
   - Build status
   - Any deployment errors

**If deployment fails:**
1. Check Vercel build logs: `vercel logs <deployment-url>`
2. Fix the issue
3. Repeat the shipit process

## Error Handling

### Lint Errors
```bash
# Run lint with auto-fix where possible
npm run lint -- --fix
```

### Test Failures
- Read test output carefully
- Check if it's a code bug or a test bug
- Fix the root cause, don't just make tests pass

### Build Errors
- TypeScript errors: Fix type issues
- Import errors: Check file paths and exports
- Missing dependencies: Run `npm install`

### Deployment Errors
- Check Vercel build logs
- Common issues: Environment variables, Prisma migrations, memory limits
- Reference `docs/VERCEL_DEPLOYMENT_CHECKLIST.md`

## Example Output

```
🚀 Ship It - Production Deployment Workflow
============================================

📋 Step 1: Current State
   - Branch: feature/new-feature
   - 3 files modified
   - 1 file staged

🔄 Step 2: Sync with Main
   ✅ Fetched latest from origin
   ✅ Merged origin/main (2 new commits)
   ✅ No conflicts

📝 Step 3: Documentation
   ✅ No documentation updates needed

🔍 Step 4: Linting
   ✅ Passed (0 errors, 0 warnings)

🧪 Step 5: Tests
   ✅ 42 tests passed in 3.2s

🏗️  Step 6: Build
   ✅ Build completed successfully

🔄 Step 7: Dev Server
   ✅ Dev server restarted on localhost:3000

✅ Step 8: Verification
   All checks passed!

💾 Step 9: Commit
   ✅ Committed: feat: Add new feature

❓ Step 10: Ready to push?
   Awaiting confirmation...

🚀 Step 11: Deploy
   ✅ Pushed to origin/feature/new-feature
   ✅ Vercel deployment triggered
   📍 Preview: https://mhm-finds-xxx.vercel.app
```

## Notes

- This workflow is designed for feature branches that merge to main
- Pushing to origin triggers automatic Vercel deployments
- Always run this workflow before creating PRs or deploying
- If you need to skip a step (rare), explicitly ask the user for permission
