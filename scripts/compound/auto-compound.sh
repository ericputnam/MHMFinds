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

cd "$PROJECT_DIR"

log "Starting auto-compound pipeline..."

# Source environment if exists
if [ -f .env.local ]; then
    source .env.local
fi

# Fetch latest (including tonight's CLAUDE.md updates)
log "Fetching latest from main..."
git fetch origin main
git checkout main
git reset --hard origin/main

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
    exit 0
fi

log "Top priority: $PRIORITY_ITEM"
log "Branch name: $BRANCH_NAME"

# Create feature branch
log "Creating feature branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" || git checkout "$BRANCH_NAME"

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

# Check if we have changes to commit
if git diff --quiet && git diff --staged --quiet; then
    log "No changes to commit. Cleaning up branch."
    git checkout main
    git branch -D "$BRANCH_NAME" 2>/dev/null || true
    exit 0
fi

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

log "Auto-compound pipeline complete!"
