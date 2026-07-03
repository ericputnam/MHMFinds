#!/bin/bash
# scripts/agents/run-affiliate-weekly-report.sh
# Generates the affiliate weekly performance report.
# Invoked by ~/Library/LaunchAgents/com.mhmfinds.affiliate-weekly-report.plist each Wednesday.
#
# Writes a dated report to reports/affiliates/ and appends a run line to
# logs/affiliate-weekly-report.log. Run manually with: ./scripts/agents/run-affiliate-weekly-report.sh

set -euo pipefail

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
LOG_FILE="$PROJECT_DIR/logs/affiliate-weekly-report.log"

cd "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR/logs"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running affiliate weekly report…" >> "$LOG_FILE"

if npx tsx scripts/agents/affiliate-weekly-report.ts >> "$LOG_FILE" 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done." >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAILED (exit $?) — check DB connectivity / env vars." >> "$LOG_FILE"
fi
