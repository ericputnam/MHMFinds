#!/bin/bash
# scripts/agents/run-mediavine-daily-report.sh
# Generates the Mediavine daily revenue + ad-health report.
# Invoked by ~/Library/LaunchAgents/com.mhmfinds.mediavine-daily-report.plist each morning.
#
# Writes a dated report to reports/mediavine/ and appends a run line to
# logs/mediavine-daily-report.log. Run manually with: ./scripts/agents/run-mediavine-daily-report.sh

set -euo pipefail

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
LOG_FILE="$PROJECT_DIR/logs/mediavine-daily-report.log"

cd "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR/logs"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running Mediavine daily report…" >> "$LOG_FILE"

if npx tsx scripts/agents/mediavine-daily-report.ts >> "$LOG_FILE" 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done." >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAILED (exit $?) — check token / network." >> "$LOG_FILE"
fi
