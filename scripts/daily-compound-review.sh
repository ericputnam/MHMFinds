#!/bin/bash

# scripts/daily-compound-review.sh
# Runs BEFORE auto-compound.sh to update CLAUDE.md with learnings
# Adapted for Claude Code (instead of Amp)

set -e

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
LOG_FILE="$PROJECT_DIR/logs/compound-review.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cd "$PROJECT_DIR"

log "Starting daily compound review..."

# Ensure we're on main and up to date
git checkout main
git pull origin main

log "Running Claude Code to review threads and compound learnings..."

# Use Claude Code to review recent work and update CLAUDE.md
# --dangerously-skip-permissions allows autonomous operation
claude -p "Review the git log and recent changes from the last 24 hours. For each significant change or feature:

1. Extract key learnings, patterns discovered, and gotchas encountered
2. Update CLAUDE.md with any new patterns, best practices, or warnings that would help future development
3. If you find any recurring issues or patterns, add them to the appropriate section in CLAUDE.md

Focus on:
- Bug fixes and what caused them
- New patterns that worked well
- Things that broke and how they were fixed
- Performance improvements
- Security considerations

After updating CLAUDE.md, commit the changes with a message like 'chore: compound learnings from [date]' and push to main.

Use these commands to review recent work:
- git log --since='24 hours ago' --oneline
- git diff HEAD~10..HEAD --stat (adjust number based on commits)" --dangerously-skip-permissions

log "Compound review complete."
