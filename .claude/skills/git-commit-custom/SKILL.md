---
name: git-commit-custom
description: Creates git commits with clean commit messages. Use when user asks to commit changes, create commits, make commits, or save changes to git. Generates concise commit messages without Claude Code footer tokens.
allowed-tools: [Bash(git:*), Bash(gh:*)]
---

# Custom Git Commit Skill

## Purpose
Creates clean, professional git commits without Claude Code footer tokens. Generates commit messages following conventional commit style based on staged changes.

## Instructions

When creating a git commit, follow these steps:

### 1. Review Current State
Run these commands in parallel to understand the repository state:
- `git status` - See all untracked and modified files
- `git diff --staged` - Review staged changes that will be committed
- `git log --oneline -5` - Check recent commit message style for consistency

### 2. Analyze Changes and Draft Message
- Review ALL staged changes to understand what's being committed
- Determine the type of change: feat, fix, docs, style, refactor, test, chore, perf
- Write a clear, concise commit message following this format:

```
<type>: <short summary in present tense>

[optional body explaining what and why]
```

**Message Guidelines:**
- Summary line: 50 characters or less, present tense imperative
- Use type prefixes: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`, `perf:`
- Be specific: "fix: Handle null values in search filter" not "fix: bug fix"
- Body (optional): Explain what changed and why, wrapped at 72 characters
- **CRITICAL: Do NOT include Claude Code footer tokens, co-authored-by tags, or generation markers**

### 3. Stage Files and Commit
If there are relevant unstaged files, add them first, then create the commit:
```bash
git add <files>
git commit -m "<your message here>"
```

**IMPORTANT:** Use the `-m` flag with a simple string for single-line messages. For multi-line messages, use a heredoc:
```bash
git commit -m "$(cat <<'EOF'
<type>: <summary>

<body>
EOF
)"
```

### 4. Verify Success
After committing, run `git status` to confirm the commit succeeded and show the clean working tree.

## Examples

### Single-line Commit
```bash
git commit -m "fix: Handle null values in search filter"
```

### Multi-line Commit
```bash
git commit -m "$(cat <<'EOF'
feat: Add privacy-enhanced content aggregation

Implements stealth mode with proxy rotation, user agent spoofing,
and randomized request timing to avoid rate limiting.
EOF
)"
```

## What NOT to Include

❌ Do NOT add these to commit messages:
- "🤖 Generated with [Claude Code]..."
- "Co-Authored-By: Claude Sonnet..."
- Any Claude Code branding or tokens
- Analysis headers or conversation markers
- Code review comments

✅ DO create:
- Clean, professional commit messages
- Clear explanations of what changed
- Conventional commit format

## Handling Pre-commit Hooks

If a pre-commit hook fails:
1. Review the error message
2. Fix the issue (linting, formatting, tests, etc.)
3. Stage the fixes
4. Create a NEW commit (don't amend unless explicitly requested)

## Creating Pull Requests

When asked to create a PR, follow the same process:
1. Review commit history with `git log origin/main..HEAD`
2. Push to remote if needed
3. Create PR with `gh pr create --title "..." --body "..."`
4. **Do NOT include Claude Code tokens in PR body**
5. Format PR body with clean markdown (## Summary, ## Changes, ## Testing)
