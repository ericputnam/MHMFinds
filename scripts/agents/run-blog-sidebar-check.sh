#!/bin/bash
# scripts/agents/run-blog-sidebar-check.sh
# Daily Mediavine sidebar health check for blog.musthavemods.com.
# Invoked by ~/Library/LaunchAgents/com.mhmfinds.blog-sidebar-check.plist each morning.
#
# Runs scripts/agents/check-blog-sidebar.sh --quiet and appends a run line to
# logs/blog-sidebar-check.log. On failure it logs loudly AND fires a macOS
# notification — missing sidebar markers cost ~$2K/month (Mar 17 2026 regression).
# Run manually with: ./scripts/agents/run-blog-sidebar-check.sh

set -euo pipefail

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
LOG_FILE="$PROJECT_DIR/logs/blog-sidebar-check.log"

cd "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR/logs"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running blog sidebar health check…" >> "$LOG_FILE"

if ./scripts/agents/check-blog-sidebar.sh --quiet >> "$LOG_FILE" 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Healthy." >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] *** FAILED — Mediavine sidebar markers missing on prod (~\$2K/month at risk). See check output above. ***" >> "$LOG_FILE"
  osascript -e 'display notification "Mediavine sidebar markers MISSING on prod (~$2K/month at risk). See logs/blog-sidebar-check.log" with title "MHM: Blog Sidebar Check FAILED" sound name "Basso"' || true
  exit 1
fi
