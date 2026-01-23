---
name: reviewit
description: Reviews a feature branch before deployment. Shows diff summary, checks for issues, and prepares for /shipit. Use when user says "review it", "review the PR", "review changes", or wants to see what an agent did before deploying.
allowed-tools: [Bash(git:*), Bash(npm:*), Read, Glob, Grep]
---

# Review It - Pre-Deployment PR Review

## Purpose
Reviews changes made on a feature branch before running /shipit. This is the checkpoint between agent work and production deployment. Provides a clear summary of changes, identifies potential issues, and confirms readiness.

## Workflow: /commitit → /reviewit → /shipit

```
Agent Development Flow:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  /commitit  │ ──▶ │  /reviewit  │ ──▶ │  /shipit    │
│  (saves)    │     │  (reviews)  │     │  (deploys)  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
 Feature Branch      PR Summary         Production
 with commits        + Approval         Deployment
```

## Workflow Steps

### Step 1: Identify Current State

```bash
# Current branch
git branch --show-current

# Commits ahead of main
git log main..HEAD --oneline

# Overall stats
git diff main --stat
```

**Report:**
- Current branch name
- Number of commits ahead of main
- Total files changed, insertions, deletions

### Step 2: Summarize Commits

```bash
# Detailed commit log
git log main..HEAD --pretty=format:"%h %s" --reverse
```

**Create a summary table:**

| Commit | Description |
|--------|-------------|
| abc123 | feat(CTB-001): Add content type audit |
| def456 | feat(CTB-002): Create missing facets |

### Step 3: Show Changed Files by Category

```bash
# List all changed files
git diff main --name-only
```

**Categorize changes:**

**API Routes:**
- `app/api/admin/facets/route.ts` (new)
- `app/api/admin/mods/route.ts` (modified)

**Components:**
- `components/FacetEditor.tsx` (new)

**Database/Scripts:**
- `scripts/ralph/ctb-001-audit.ts` (new)
- `prisma/schema.prisma` (modified)

**Config/Other:**
- `package.json` (modified)

### Step 4: Highlight Key Changes

For the most significant files, show abbreviated diffs:

```bash
# Show changes for key files (limit to important ones)
git diff main -- <important-file> | head -50
```

**Identify and summarize:**
- New features added
- Bug fixes applied
- Database schema changes
- API changes
- Breaking changes (if any)

### Step 5: Run Quick Validation

```bash
# Type check (fast)
npm run type-check

# Check for common issues
git diff main --name-only | grep -E '\.(env|key|pem|secret)' || echo "No sensitive files"
```

**Check for:**
- [ ] TypeScript errors
- [ ] Sensitive files accidentally committed
- [ ] Large files (> 1MB)
- [ ] Console.log statements left in production code
- [ ] TODO/FIXME comments that should be addressed

### Step 6: Check Task/PRD Progress

If this is agent work, check the progress:

```bash
# Check for progress files
cat scripts/ralph/progress*.txt 2>/dev/null | tail -30 || echo "No progress file"
```

**Report:**
- Which stories were completed
- Any stories that failed or were skipped
- Remaining work (if any)

### Step 7: Generate Review Summary

Create a clear summary for the user:

```
## Review Summary: feature/content-type-backfill

### Branch Info
- **Branch:** feature/content-type-backfill
- **Commits:** 5 ahead of main
- **Files changed:** 12 (+450, -32)

### What Was Done
- CTB-001: Audit script created, found 12 null contentTypes
- CTB-002: Created 15 new FacetDefinitions
- CTB-003: Built contentTypeDetector.ts library
- CTB-004: Tests passing at 94% accuracy
- CTB-005: Fixed 234 eyebrow mods

### Files Changed
| Category | Files |
|----------|-------|
| API | 2 modified |
| Components | 1 new |
| Scripts | 5 new |
| Lib | 1 new |

### Validation
- [ ] TypeCheck: PASSED
- [ ] No sensitive files
- [ ] No oversized files

### Potential Issues
- None detected

### Ready for /shipit?
All checks passed. Run /shipit to deploy, or request specific changes.
```

### Step 8: Ask for Decision

Present options to the user:

**Options:**
1. **Approve** - "Looks good, run /shipit"
2. **Request changes** - "Fix X before deploying"
3. **View more details** - "Show me the diff for <file>"
4. **Abort** - "Don't deploy, I'll handle it manually"

## Issue Detection

### Common Issues to Flag

**Critical (Block deployment):**
- `.env` or secrets in diff
- Database migrations without review
- Deleted critical files
- TypeScript errors

**Warning (Highlight but don't block):**
- Large number of changes (> 500 lines)
- Console.log in production code
- TODO comments
- Disabled tests

**Info (Just mention):**
- New dependencies added
- Config file changes
- Documentation updates needed

## Example Output

```
🔍 Review It - Pre-Deployment PR Review
========================================

📍 Branch: feature/content-type-backfill
📊 Commits: 5 ahead of main
📁 Changed: 12 files (+450, -32)

────────────────────────────────────
📋 COMMITS
────────────────────────────────────
a1b2c3d feat(CTB-001): Add content type audit script
d4e5f6g feat(CTB-002): Create missing FacetDefinitions
h7i8j9k feat(CTB-003): Build contentTypeDetector library
l0m1n2o feat(CTB-004): Add detection test suite
p3q4r5s feat(CTB-005): Fix eyebrow mod categorization

────────────────────────────────────
📁 FILES BY CATEGORY
────────────────────────────────────
API Routes (2):
  M app/api/admin/facets/route.ts
  M app/api/admin/mods/route.ts

Libraries (1):
  A lib/services/contentTypeDetector.ts

Scripts (5):
  A scripts/ralph/ctb-001-audit.ts
  A scripts/ralph/ctb-002-create-facets.ts
  A scripts/ralph/ctb-003-detector.ts
  A scripts/ralph/ctb-004-tests.ts
  A scripts/ralph/ctb-005-fix-eyebrows.ts

────────────────────────────────────
✅ VALIDATION
────────────────────────────────────
TypeCheck: ✅ Passed
Sensitive files: ✅ None detected
Large files: ✅ None detected
Console.logs: ⚠️  2 found (scripts only - OK)

────────────────────────────────────
📈 PRD PROGRESS
────────────────────────────────────
Completed: CTB-001 through CTB-005
Remaining: CTB-006 through CTB-010
Status: 50% complete

────────────────────────────────────
❓ DECISION
────────────────────────────────────
Ready to deploy? Options:
  1. "ship it" - Run /shipit workflow
  2. "show <file>" - View specific file diff
  3. "fix <issue>" - Address an issue first
  4. "abort" - Cancel and handle manually
```

## Notes

- This skill is read-only - it doesn't modify any files
- Always run this BEFORE /shipit for agent-generated code
- If issues are found, fix them with another /commitit before /shipit
- For large PRs, you may want to review in smaller chunks
