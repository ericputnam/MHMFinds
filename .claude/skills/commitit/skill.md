---
name: commitit
description: Commits changes to a feature branch with a descriptive message. Creates a new feature branch if on main. Use when user says "commit it", "save my work", "commit changes", or wants to checkpoint progress before running /shipit.
allowed-tools: [Bash(git:*), Bash(npm run security:*), Read, Glob, Grep]
---

# Commit It - Feature Branch Commit Workflow

## Purpose
Saves work-in-progress to a feature branch with clear, descriptive commit messages. This is the "checkpoint" command used during development. Run `/shipit` when ready to deploy.

## Workflow: /commitit → /shipit

```
Development Flow:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Develop   │ ──▶ │  /commitit  │ ──▶ │  /shipit    │
│   Features  │     │  (save)     │     │  (deploy)   │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          ▼                    ▼
                    Feature Branch       Push + Deploy
                    with commits         to Production
```

## Workflow Steps

### Step 1: Check Current Branch

```bash
git branch --show-current
```

**If on `main` or `master`:**
- Analyze changes to generate a feature branch name
- Create and switch to new feature branch

**If already on a feature branch:**
- Continue with commit on current branch

### Step 2: Generate Feature Branch Name (if needed)

When creating a new branch, analyze the changes to generate a descriptive name:

```bash
git diff --name-only
git diff --name-only --staged
```

**Branch naming convention:**
```
feature/<short-description>
fix/<short-description>
chore/<short-description>
```

Examples:
- `feature/affiliate-toggle-fix`
- `feature/oyrosy-products`
- `fix/prisma-connection-pooling`
- `chore/update-dependencies`

**Create the branch:**
```bash
git checkout -b <branch-name>
```

### Step 3: Analyze Changes

Understand what was built/changed:

```bash
# See all changes
git status

# Review unstaged changes
git diff

# Review staged changes
git diff --staged

# List modified files
git diff --name-only HEAD
```

**Analyze the changes to understand:**
- What feature was added?
- What bug was fixed?
- What was refactored?
- What files were affected?

### Step 4: Run Security Checks

**If any files in `app/api/admin/` were modified**, run the security scanner:

```bash
npm run security:check-admin-auth
```

**If the scanner fails (exit code 1):**
- STOP the commit process
- Report the security issue to the user
- Do NOT proceed until all admin routes have proper authentication

**If the scanner passes (exit code 0):**
- Continue with the commit workflow

This ensures no unprotected admin API routes are ever committed.

**If any files under `staging/wordpress/` were modified**, verify the CRITICAL_MARKERS are still present before committing:

```bash
for m in mhm_inject_mediavine_sidebar mhm_mediavine_sidebar_css mhm_search_form_rewrite_js is_from_apex_rewrite; do
  grep -q "$m" staging/wordpress/kadence-child-prod/functions.php || echo "MISSING MARKER: $m"
done
```

If any marker is missing, STOP — a revenue feature is about to be regressed (see CLAUDE.md's WordPress push-script rules). Also remind the user that committing does NOT deploy WordPress files; /shipit's WordPress track handles that.

### Step 5: Stage Changes

Stage all relevant changes:

```bash
# Stage all changes
git add -A

# Or stage specific files
git add <file1> <file2>
```

**Review what's staged:**
```bash
git diff --staged --stat
```

### Step 6: Generate Commit Message

Based on the analysis, create a descriptive commit message:

**Format:**
```
<type>: <concise description of what was done>

<optional body with more details>
```

**Types:**
- `feat`: New feature or functionality
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic changes)
- `refactor`: Code restructuring
- `test`: Adding or updating tests
- `chore`: Maintenance, dependencies, config

**Good commit messages describe WHAT and WHY:**
```
feat: Add Oyrosy affiliate products with fashion categories

- Added 37 fashion items (dresses, skirts, shorts, pants, jewelry)
- Set priority 95 for new items, moved existing to priority 90
- Products added as disabled for review before enabling
```

```
fix: Resolve affiliate toggle race condition

Use optimistic updates instead of refetching entire list
after each toggle to prevent UI flickering and state conflicts.
```

### Step 7: Commit

```bash
git commit -m "<message>"
```

For multi-line messages:
```bash
git commit -m "$(cat <<'EOF'
<type>: <summary>

<body>
EOF
)"
```

### Step 8: Confirm Success

```bash
git status
git log --oneline -3
```

Report to user:
- Branch name
- Commit hash
- Summary of what was committed
- Reminder: "Run /shipit when ready to deploy"

## Branch Naming Examples

| Changes | Branch Name |
|---------|-------------|
| Added new API endpoint for users | `feature/user-api-endpoint` |
| Fixed login page crash | `fix/login-crash` |
| Updated affiliate products | `feature/affiliate-updates` |
| Refactored database queries | `refactor/db-queries` |
| Added unit tests for ModCard | `test/modcard-tests` |
| Updated dependencies | `chore/dependency-updates` |

## Commit Message Examples

### Feature Addition
```
feat: Add affiliate offer management admin panel

- Create CRUD operations for affiliate offers
- Add toggle for enabling/disabling offers
- Implement priority-based sorting
- Track impressions and clicks
```

### Bug Fix
```
fix: Prevent disabled affiliates from showing on site

The API was not filtering by isActive status.
Added isActive: true filter to the where clause.
```

### Refactoring
```
refactor: Extract affiliate service into separate module

Move affiliate-related logic from route handlers
into dedicated service class for better testability.
```

### Chore
```
chore: Update Prisma to v6.19

- Regenerated Prisma client
- Updated type definitions
- No breaking changes
```

## What NOT to Include

❌ Don't include in commit messages:
- Claude Code branding or tokens
- Timestamps or generation markers
- Conversation context
- Hardcoded/stale model names (e.g. an old model in a Co-Authored-By line)

✅ Co-Authored-By trailer: this repo's convention (see `git log`) is to end commits with a trailer naming the model actually running the session, e.g. `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Include it unless the user says otherwise.

✅ Do include:
- Clear description of changes
- Reasoning when helpful
- List of major changes for large commits

## Example Output

```
🔀 Commit It - Feature Branch Workflow
======================================

📍 Current branch: main
   Creating new feature branch...

🌿 Created branch: feature/affiliate-toggle-optimization

📝 Changes detected:
   - app/admin/monetization/affiliates/page.tsx (modified)
   - 1 file changed, 25 insertions(+), 12 deletions(-)

💾 Committed: fix: Optimize affiliate toggle with optimistic updates

   Branch: feature/affiliate-toggle-optimization
   Commit: a1b2c3d

✅ Work saved! Run /shipit when ready to deploy.
```

## Notes

- This command does NOT push to remote (that's what /shipit does)
- You can run /commitit multiple times to save incremental progress
- Each commit should be a logical unit of work
- Keep feature branches focused on one feature/fix
- When ready to deploy, run /shipit for the full workflow
