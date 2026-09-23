#!/bin/bash

# scripts/compound/auto-compound.sh
# Full pipeline: report → PRD → tasks → implementation → PR
# Adapted for Claude Code (instead of Amp)

set -e

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
LOG_FILE="$PROJECT_DIR/logs/auto-compound.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# status_row(): a "did not fire" / "ran with nothing to do" run must become a row, not a
# sentence buried in logs/auto-compound.log (CLAUDE.md SD: "Silence from a scheduled job
# must become a row, not a sentence in a digest"). Written to $PROJECT_DIR (the operator's
# own tree, not the ephemeral detached worktree this script runs in, which is deleted on EXIT).
status_row() {  # $1 result  $2 branch-or-empty  $3 priority_item-or-empty  $4 commits_ahead
    mkdir -p "$PROJECT_DIR/reports/compound"
    python3 - "$PROJECT_DIR/reports/compound/status.jsonl" "$1" "${2:-}" "${3:-}" "${4:-0}" <<'PY'
import json, sys, datetime
path, result, branch, item, ahead = sys.argv[1:6]
rec = {
    "ts": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "result": result,
    "branch": branch or None,
    "priority_item": item or None,
    "commits_ahead": int(ahead) if str(ahead).lstrip("-").isdigit() else 0,
}
with open(path, "a") as f:
    f.write(json.dumps(rec) + "\n")
PY
}

cd "$PROJECT_DIR"

log "Starting auto-compound pipeline..."

# Source environment if exists
if [ -f .env.local ]; then
    source .env.local
fi

# Fetch latest (including tonight's CLAUDE.md updates)
log "Fetching latest from main..."
git fetch origin main
# SD-6 (2026-09-01): never `git checkout main` in the operator's tree — uncommitted
# work made this fail silently for weeks. Work in a detached worktree of origin/main.
WT="$HOME/.mhm-worktrees/compound-$(date +%Y%m%d)-$$"
mkdir -p "$HOME/.mhm-worktrees"
git worktree prune
git worktree add --detach "$WT" origin/main || { log "worktree add failed"; exit 1; }
trap 'cd "$PROJECT_DIR" && git worktree remove --force "$WT" >/dev/null 2>&1; git worktree prune >/dev/null 2>&1' EXIT
[ -f "$PROJECT_DIR/.env.local" ] && ln -sf "$PROJECT_DIR/.env.local" "$WT/.env.local"
[ -d "$PROJECT_DIR/node_modules" ] && ln -s "$PROJECT_DIR/node_modules" "$WT/node_modules"
cd "$WT"

# Find the latest prioritized report
LATEST_REPORT=$(ls -t reports/*.md 2>/dev/null | head -1)

if [ -z "$LATEST_REPORT" ]; then
    log "No priority reports found in reports/. Creating sample report..."
    cat > reports/priorities-$(date +%Y-%m-%d).md << 'EOF'
# Priority Report

## High Priority
1. [ ] Fix any failing tests
2. [ ] Address any TypeScript errors
3. [ ] Review and update documentation

## Medium Priority
1. [ ] Improve test coverage
2. [ ] Refactor complex functions
3. [ ] Add missing error handling

## Low Priority
1. [ ] Code cleanup and formatting
2. [ ] Update dependencies
3. [ ] Performance optimizations
EOF
    LATEST_REPORT="reports/priorities-$(date +%Y-%m-%d).md"
    log "Created sample report: $LATEST_REPORT"
fi

log "Using report: $LATEST_REPORT"

# Analyze and pick #1 priority
log "Analyzing report for top priority..."
ANALYSIS=$("$PROJECT_DIR/scripts/compound/analyze-report.sh" "$LATEST_REPORT")
PRIORITY_ITEM=$(echo "$ANALYSIS" | jq -r '.priority_item')
BRANCH_NAME=$(echo "$ANALYSIS" | jq -r '.branch_name')

if [ -z "$PRIORITY_ITEM" ] || [ "$PRIORITY_ITEM" = "null" ]; then
    log "No actionable priority items found. Exiting."
    status_row "no-op: empty queue" "" "" 0
    exit 2
fi

log "Top priority: $PRIORITY_ITEM"
log "Branch name: $BRANCH_NAME"

# Create feature branch
log "Creating feature branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" || git checkout "$BRANCH_NAME"
# BASE_SHA anchors "did tonight's run actually produce anything" — see the commits-ahead
# check below. It is origin/main's HEAD at fetch time (this branch was just cut from it).
BASE_SHA="$(git rev-parse HEAD)"

# Create PRD using Claude Code
log "Creating PRD..."
claude -p "Create a Product Requirements Document (PRD) for the following task:

$PRIORITY_ITEM

Save the PRD to: tasks/prd-${BRANCH_NAME}.md

The PRD should include:
1. Overview - What we're building and why
2. Requirements - Specific acceptance criteria
3. Technical Approach - How to implement it
4. Files to Modify - Which files need changes
5. Testing Plan - How to verify it works
6. Risks - Potential issues to watch for

Keep it concise but complete." --dangerously-skip-permissions

# Convert PRD to tasks JSON
log "Converting PRD to tasks..."
claude -p "Read the PRD at tasks/prd-${BRANCH_NAME}.md and create a tasks JSON file.

Save to: scripts/compound/prd.json

Format:
{
  \"tasks\": [
    {
      \"id\": 1,
      \"title\": \"Task title\",
      \"description\": \"What to do\",
      \"status\": \"pending\"
    }
  ]
}

Break the PRD into small, atomic tasks that can be completed one at a time." --dangerously-skip-permissions

# Run the execution loop
log "Starting execution loop..."
"$PROJECT_DIR/scripts/compound/loop.sh" 25

# Check whether tonight's run actually produced anything durable. A working-tree diff
# check is not enough: every task in loop.sh's prompt instructs Claude to commit its own
# change, so by the time we get here any real work is ALREADY committed and `git diff
# --quiet` on the working tree passes trivially whether 0 or 20 commits were made. What
# distinguishes "ran and shipped" from "ran with an all-completed prd.json / a PRD step
# that silently failed to write pending tasks / a report with no actionable items" is
# commits ahead of the branch's own base — so count those instead.
AHEAD="$(git rev-list --count "$BASE_SHA"..HEAD 2>/dev/null || echo 0)"

if [ "${AHEAD:-0}" -eq 0 ]; then
    log "0 commits ahead of origin/main on $BRANCH_NAME — nothing to ship tonight. Not pushing; deleting local branch."
    status_row "no-op: empty queue" "$BRANCH_NAME" "$PRIORITY_ITEM" 0
    # Detach before deleting — the branch is currently checked out in this worktree, and
    # branch refs are shared with $PROJECT_DIR (same repo), so it must be deletable from
    # here without another worktree holding it.
    git checkout --detach "$BASE_SHA" >/dev/null 2>&1
    git branch -D "$BRANCH_NAME" >/dev/null 2>&1 || log "WARN: could not delete local branch $BRANCH_NAME"
    log "Auto-compound pipeline: no-op (empty queue). Exiting 2 (WARN) — 'ran' and 'ran with nothing to do' must not both read as success."
    exit 2
fi

log "$AHEAD commit(s) ahead of origin/main on $BRANCH_NAME — pushing."

# Push and create PR
log "Pushing branch and creating PR..."
git push -u origin "$BRANCH_NAME"

# Create draft PR
gh pr create --draft \
    --title "Compound: $PRIORITY_ITEM" \
    --body "## Auto-generated PR

This PR was automatically created by the compound automation system.

**Priority Item:** $PRIORITY_ITEM

**Report:** $LATEST_REPORT

---
*Review the changes carefully before merging.*" \
    --base main

status_row "shipped" "$BRANCH_NAME" "$PRIORITY_ITEM" "$AHEAD"
log "Auto-compound pipeline complete!"
