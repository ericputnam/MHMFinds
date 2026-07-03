#!/bin/bash
# scripts/agents/run-affiliate-daily-pulse.sh
# Generates the affiliate daily pulse snapshot.
# Invoked by ~/Library/LaunchAgents/com.mhmfinds.affiliate-daily-pulse.plist each morning.
#
# Writes a dated report to reports/affiliates/daily/ and appends a run line to
# logs/affiliate-daily-pulse.log. Run manually with: ./scripts/agents/run-affiliate-daily-pulse.sh

set -euo pipefail

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
LOG_FILE="$PROJECT_DIR/logs/affiliate-daily-pulse.log"

cd "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR/logs"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running affiliate daily pulse…" >> "$LOG_FILE"

if npx tsx scripts/agents/affiliate-daily-pulse.ts >> "$LOG_FILE" 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done." >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAILED (exit $?) — check DB connectivity / env vars." >> "$LOG_FILE"
fi
