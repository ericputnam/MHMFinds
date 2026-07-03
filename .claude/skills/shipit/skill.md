---
name: shipit
description: Production deployment workflow for BOTH deploy targets - the Next.js app (Vercel) and the WordPress blog (BigScoots SSH push scripts). Runs linting, tests, build, updates docs, commits, deploys to the right target(s), and verifies each deployment (Vercel status + domain aliases, WordPress staging + prod curl checks). Use when user says "ship it", "deploy", "push to production", or wants to release code.
allowed-tools: [Bash(git:*), Bash(npm:*), Bash(npx:*), Bash(vercel:*), Bash(./scripts/staging/*), Bash(./scripts/agents/*), Bash(curl:*), Bash(ssh:*), Bash(diff:*), Bash(cp:*), Read, Glob, Grep, Edit, Write, TodoWrite, AskUserQuestion]
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
8. **Deploy to the RIGHT target** - Changes under `staging/wordpress/` deploy over SSH via the push scripts, NOT via Vercel. A git push alone does NOT deploy WordPress changes.
9. **Never edit WordPress files directly on the server via SSH** - the push scripts' scp overwrite will eventually wipe such edits (this caused the Mar 2026 Mediavine sidebar wipe, ~$2K/month). Always edit the git-tracked files in `staging/wordpress/` and deploy with the push scripts.
10. **Always verify AFTER deploying** - Vercel: build Ready + aliases + curl. WordPress: `./scripts/agents/check-blog-sidebar.sh`. A deploy is not done until verification passes.

## Step 0: Determine Deploy Targets

Before anything else, classify the changes:

```bash
git diff --name-only origin/main...HEAD
git status --short
```

- Any file under `staging/wordpress/` changed → **WordPress target** (see "WordPress Deployment Track" below)
- Any other file changed (app/, lib/, components/, middleware.ts, vercel.json, etc.) → **Vercel target** (Steps 1-13)
- Both kinds changed → run BOTH tracks: Vercel first (Steps 1-13), then the WordPress track.

Note: `middleware.ts` and `vercel.json` changes deploy via Vercel but can break the WordPress *proxy* (`/blog/*`, search, pagination). If either changed, the blog verification step is mandatory even though no WordPress file was touched.

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

Run the dev server as a proper background task using the harness's background execution (Bash tool with `run_in_background: true`, or the preview_start tool if available) — do NOT use a bare `npm run dev &`, which dies when the shell exits.

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

2. **Trigger production deployment with cache clear:**
   ```bash
   vercel --prod --force
   ```

   **Why `--force`?** Vercel caches build artifacts. Without `--force`, old cached code may be served even after a new deployment. The `--force` flag clears the build cache ensuring the latest code is deployed.

3. **Get the deployment URL:**
   ```bash
   vercel ls 2>&1 | head -10
   ```

4. **Report initial status:**
   - Deployment URL
   - Current build status (Building/Ready/Error)

### Step 12: Monitor Vercel Build (Feedback Loop)

**CRITICAL: Do not consider deployment complete until Vercel build succeeds.**

1. **Wait for build to complete (poll every 15-20 seconds):**
   ```bash
   sleep 20 && vercel ls 2>&1 | head -10
   ```

2. **Check deployment status:**
   - Look for the most recent deployment matching your branch
   - Status will be: `● Building`, `● Ready`, or `● Error`

3. **If status is `● Building`:**
   - Wait and poll again
   - Continue until status changes to Ready or Error

4. **If status is `● Ready`:**
   - Deployment succeeded!
   - Proceed to Step 13 (Domain Alias Verification)
   - Report success to user with preview URL

5. **If status is `● Error`:**
   - **DO NOT stop here - fix the error!**
   - Get the deployment URL from the `vercel ls` output
   - Fetch build logs to understand the error:
     ```bash
     # Get logs from Vercel dashboard or inspect output
     vercel inspect <deployment-url> 2>&1
     ```
   - Common error patterns:
     - "Failed to collect page data" → Module initialization at build time
     - "Cannot find module" → Missing dependency or import path
     - "Type error" → TypeScript issue
     - Prisma errors → Database/migration issues

6. **Fix the error:**
   - Identify the failing file from the error message
   - Read the file and understand the issue
   - Apply the fix
   - Run local build to verify: `npm run build`
   - Commit and push the fix:
     ```bash
     git add -A
     git commit -m "fix: <description of fix>"
     git push origin <branch>
     ```

7. **Repeat monitoring:**
   - After pushing fix, go back to step 1 of this section
   - Continue until deployment succeeds

**Example Vercel monitoring loop:**
```
🔄 Monitoring Vercel deployment...

   Poll 1: ● Building (waiting 20s...)
   Poll 2: ● Building (waiting 20s...)
   Poll 3: ● Error - Build failed!

   📋 Fetching error details...
   Error: Failed to collect page data for /api/subscription/create-checkout

   🔧 Fixing: Lazy-load Stripe client to avoid build-time initialization
   ✅ Fix committed and pushed

   Poll 4: ● Building (waiting 20s...)
   Poll 5: ● Ready

   ✅ Deployment successful!
   📍 Preview: https://mhm-finds-xxx.vercel.app
```

**Never leave a deployment in Error state.** The workflow is only complete when Vercel shows `● Ready`.

### Step 13: Verify Domain Aliases

**CRITICAL: Custom domains may not automatically point to the latest deployment.**

After deployment shows `● Ready`:

1. **Get the deployment URL from the latest deployment:**
   ```bash
   vercel ls 2>&1 | head -5
   ```
   Copy the deployment URL (e.g., `mhm-finds-xxx-ericputnams-projects.vercel.app`)

2. **Update custom domain aliases to point to the new deployment:**
   ```bash
   # Alias the main domain
   vercel alias <deployment-url> musthavemods.com

   # Also alias the www subdomain
   vercel alias <deployment-url> www.musthavemods.com
   ```

3. **Verify the aliases are set:**
   ```bash
   vercel alias ls
   ```
   - Confirm both `musthavemods.com` and `www.musthavemods.com` point to the new deployment

4. **Smoke-check production with curl (do this yourself, don't just ask the user):**
   ```bash
   # App is up
   curl -s -o /dev/null -w "%{http_code}\n" https://musthavemods.com          # expect 200
   # Blog proxy still works (middleware serves WordPress content through Vercel)
   ./scripts/agents/check-blog-sidebar.sh                                     # expect exit 0
   ```
   The blog-sidebar check is mandatory after EVERY production Vercel deploy — middleware/rewrite changes can silently break the WordPress proxy and Mediavine sidebar (~$2K/month) even when the Vercel build is green.

5. **Test visually:**
   - Open `https://musthavemods.com` in an incognito window, hard refresh
   - Verify the changes are visible

**Why this matters:** Vercel deployments create new URLs each time. Custom domain aliases need to be updated to point to the latest deployment. Without this step, users may see cached/old versions of the site.

### Step 14: Merge Back to Main (Deconfliction)

**CRITICAL:** `vercel --prod` deployed your *branch* state to production, but Vercel's git integration auto-deploys `main` on every push to main. If your branch is not merged, the NEXT push to main will deploy production WITHOUT your changes — silently rolling them back.

After a successful production deploy from a feature/worktree branch:
1. Ask the user whether to merge to main now (recommended) or open a PR.
2. If merging: `git checkout main && git pull origin main && git merge <branch> && git push origin main`, then confirm the resulting main auto-deploy also goes Ready.
3. Never leave a CLI-deployed branch unmerged overnight.

**Example:**
```
🔗 Updating domain aliases...
   ✅ vercel alias mhm-finds-abc123.vercel.app musthavemods.com
   ✅ vercel alias mhm-finds-abc123.vercel.app www.musthavemods.com
   ✅ Verified: Both domains now point to latest deployment
```

## WordPress Deployment Track

Run this track when Step 0 identified WordPress changes (files under `staging/wordpress/`). Vercel Steps 11-13 do NOT deploy these. Both WP environments live on the same BigScoots host (`nginx@74.121.204.122`, port 2222, key `~/.ssh/bigscoots_staging`); only the remote path and URL differ:

| Env | URL | Local git-tracked file |
|---|---|---|
| Staging (WP test) | `blogmusthavemodscom.bigscoots-staging.com` | `staging/wordpress/kadence-child/functions.php` |
| Production | `blog.musthavemods.com` | `staging/wordpress/kadence-child-prod/functions.php` |

The local files are the source of truth. The push scripts lint PHP, verify CRITICAL_MARKERS, diff against the live server, back up the remote file, scp, re-lint remotely, and flush the WP cache.

### WP Step 1: Pull Before You Push (Deconfliction)

```bash
./scripts/staging/pull-blog-functions.sh        # staging → local
./scripts/staging/pull-blog-functions-prod.sh   # prod → local
git status staging/wordpress/
```

If the pull shows server-side changes that are not in git, **STOP** — someone (or a plugin/admin) edited the server directly. Commit or reconcile that drift first, or the push will wipe it. This is the single most important WordPress deconfliction step.

### WP Step 2: Deploy to Staging First

```bash
./scripts/staging/push-blog-functions.sh
```

Verify staging before touching prod:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://blogmusthavemodscom.bigscoots-staging.com/   # expect 200
```
Then spot-check the specific feature on the staging URL (curl the page and grep for your feature's marker/output).

### WP Step 3: Promote Staging → Production

```bash
# Review exactly what you're promoting
diff staging/wordpress/kadence-child/functions.php staging/wordpress/kadence-child-prod/functions.php

# Promote and push (the prod script is interactive — review its diff and confirm)
cp staging/wordpress/kadence-child/functions.php staging/wordpress/kadence-child-prod/functions.php
./scripts/staging/push-blog-functions-prod.sh
```

**If you shipped a new revenue or routing feature**: add a `"<grep-pattern>|<human-name>"` entry to the `CRITICAL_MARKERS` array in BOTH push scripts AND a curl assertion to `scripts/agents/check-blog-sidebar.sh` — CLAUDE.md makes this mandatory, no exceptions.

### WP Step 4: Verify Production (MANDATORY)

```bash
./scripts/agents/check-blog-sidebar.sh
```

This curls real production articles and asserts the Mediavine sidebar, wrapper class, and script loader are present. If it fails, follow its printed runbook — the prod push script printed the exact server-side backup-restore command; roll back first, diagnose second.

### WP Step 5: Commit the Snapshots

The `staging/wordpress/` files must be committed to git after a successful deploy (per repo rules, ask the user before committing). An undeployed-but-committed file is recoverable; a deployed-but-uncommitted file is exactly the state that caused the Mar 2026 sidebar wipe.

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

**How to diagnose:**
```bash
# List recent deployments
vercel ls 2>&1 | head -10

# Inspect a specific deployment
vercel inspect <deployment-url> 2>&1
```

**Common Vercel Build Errors:**

| Error Pattern | Cause | Fix |
|--------------|-------|-----|
| `Failed to collect page data for /api/...` | Module initializes at build time (e.g., `new Stripe(...)` at top level) | Use lazy initialization with getter |
| `Cannot find module '...'` | Missing dependency or wrong import path | Check imports, run `npm install` |
| `Type error: ...` | TypeScript error not caught locally | Fix the type issue |
| `Error: Dynamic server usage` | Using `cookies()` or `headers()` in static context | Add `export const dynamic = 'force-dynamic'` |
| Prisma errors | Database not accessible during build | Ensure Prisma client is lazy-loaded |
| `ENOMEM` / memory errors | Build uses too much memory | Optimize imports, check for circular deps |

**Lazy initialization pattern (fixes most build-time errors):**
```typescript
// ❌ BAD - initializes at module load (build time)
private static client = new SomeClient(process.env.API_KEY!);

// ✅ GOOD - initializes on first use (runtime only)
private static _client: SomeClient | null = null;
private static get client(): SomeClient {
  if (!this._client) {
    this._client = new SomeClient(process.env.API_KEY!);
  }
  return this._client;
}
```

**Reference:** `docs/VERCEL_DEPLOYMENT_CHECKLIST.md`

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
   ✅ Vercel deployment triggered with --force (cache cleared)
   📍 Preview: https://mhm-finds-xxx.vercel.app

⏳ Step 12: Monitor Build
   ● Building... (polling)
   ✅ Build succeeded!

🔗 Step 13: Domain Aliases
   ✅ musthavemods.com → mhm-finds-xxx.vercel.app
   ✅ www.musthavemods.com → mhm-finds-xxx.vercel.app
   ✅ Verified in incognito browser
```

## Notes

- This workflow is designed for feature branches that merge to main
- Pushing to `main` triggers automatic Vercel production deployment; other branches get preview deployments
- Always run this workflow before creating PRs or deploying
- If you need to skip a step (rare), explicitly ask the user for permission

## Deconfliction Model (How Parallel Work Stays Safe)

- **Next.js app**: every Claude Code session runs in an isolated git worktree on its own `claude/<name>` branch; the nightly compound pipeline uses `compound/<task>-<date>` branches with draft PRs. `main` is the single production trunk. Step 2 (merge origin/main before testing) and Step 14 (merge back to main after a CLI deploy) are the two ends of the deconfliction loop.
- **WordPress**: there is NO branch isolation — one `functions.php` per environment, shared by all sessions. Deconfliction relies entirely on: (1) pull-before-edit (WP Step 1), (2) the push scripts' server-vs-local diff + CRITICAL_MARKERS wipe guard, and (3) committing snapshots immediately after deploy (WP Step 5). Never have two sessions editing `staging/wordpress/` concurrently.
- **Known footgun**: `package.json`'s `vercel-build` script includes `prisma migrate deploy`, but `vercel.json`'s `buildCommand` (which takes precedence) correctly omits it. Do not "fix" builds by switching to the package.json script — CLAUDE.md forbids migrations in the build command. Apply migrations manually with `npm run db:deploy` before deploying.
