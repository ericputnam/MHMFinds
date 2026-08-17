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

# launchd fires this job at wake-from-sleep, which can beat Wi-Fi/DNS
# re-association — every network call then fails ("fetch failed", "Can't reach
# database server"). Wait up to 90s for the network before starting
# (false-red pulses Aug 10–16 2026; see reports/traffic-drop-diagnosis-2026-08-16.md).
NET_OK=0
for _ in $(seq 1 30); do
  if curl -sf -o /dev/null --max-time 3 https://www.google.com/generate_204; then
    NET_OK=1
    break
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Waiting for network…" >> "$LOG_FILE"
  sleep 3
done
if [ "$NET_OK" -ne 1 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Network never came up after 90s — running anyway so the log tells the story." >> "$LOG_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running affiliate daily pulse…" >> "$LOG_FILE"

if npx tsx scripts/agents/affiliate-daily-pulse.ts >> "$LOG_FILE" 2>&1; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done." >> "$LOG_FILE"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAILED (exit $?) — check DB connectivity / env vars." >> "$LOG_FILE"
fi
