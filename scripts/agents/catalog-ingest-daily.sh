#!/usr/bin/env bash
# Incremental catalog ingest from the writer's blog posts (Nova, 2026-09-09).
#
# Why this exists: between 2026-08-09 and 2026-09-09 the catalog gained 0 mods.
# Nothing broke — ingest had never been scheduled. `scrape:mhm` only ran when a
# human ran it, and its freshness state lived in an untracked CSV in the
# operator's checkout, so no worktree or scheduled job could run it safely.
#
# This wrapper is safe from ANY checkout: `--new-only` derives freshness from the
# database (posts that already have a Mod row are skipped) and `--since` limits
# the sitemap scan to recent posts, so a normal day fetches 0–3 pages.
#
# Usage:
#   ./scripts/agents/catalog-ingest-daily.sh            # live, last 21 days, <=25 posts
#   ./scripts/agents/catalog-ingest-daily.sh --dry-run  # preview only
#   INGEST_SINCE_DAYS=45 INGEST_LIMIT=60 ./scripts/agents/catalog-ingest-daily.sh
#
# Exit codes: 0 = ran (possibly nothing to do), 1 = scraper failed, 2 = could not run.
# Always writes one summary line to logs/catalog-ingest.log so silence is falsifiable.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT" || exit 2

SINCE_DAYS="${INGEST_SINCE_DAYS:-21}"
LIMIT="${INGEST_LIMIT:-25}"
TODAY="$(date +%F)"
LOG_DIR="$ROOT/logs"
mkdir -p "$LOG_DIR"
RUN_LOG="$LOG_DIR/catalog-ingest-$TODAY.log"
SUMMARY_LOG="$LOG_DIR/catalog-ingest.log"

# macOS `date -v` first, GNU `date -d` fallback.
SINCE="$(date -v-"${SINCE_DAYS}"d +%F 2>/dev/null || date -d "${SINCE_DAYS} days ago" +%F 2>/dev/null || true)"
if [[ -z "$SINCE" ]]; then
  echo "$(date -u +%FT%TZ) catalog-ingest COULD-NOT-RUN reason=date-arith" | tee -a "$SUMMARY_LOG"
  exit 2
fi

if [[ ! -f "$ROOT/.env.local" ]]; then
  echo "$(date -u +%FT%TZ) catalog-ingest COULD-NOT-RUN reason=no-env-local" | tee -a "$SUMMARY_LOG"
  exit 2
fi
if [[ ! -x "$ROOT/node_modules/.bin/tsx" ]]; then
  echo "$(date -u +%FT%TZ) catalog-ingest COULD-NOT-RUN reason=no-node-modules" | tee -a "$SUMMARY_LOG"
  exit 2
fi

EXTRA=()
MODE="live"
for arg in "$@"; do
  case "$arg" in
    --dry-run) EXTRA+=("--dry-run"); MODE="dry-run" ;;
    *) EXTRA+=("$arg") ;;
  esac
done

echo "== catalog-ingest $TODAY mode=$MODE since=$SINCE limit=$LIMIT" | tee -a "$RUN_LOG"
"$ROOT/node_modules/.bin/tsx" scripts/scrape-musthavemods.ts \
  --new-only --since "$SINCE" --limit "$LIMIT" "${EXTRA[@]}" 2>&1 | tee -a "$RUN_LOG"
STATUS=${PIPESTATUS[0]}

pages="$(grep -E '^📄 Pages scraped:' "$RUN_LOG" | tail -1 | grep -oE '[0-9]+$' || echo '?')"
created="$(grep -E '^✅ Mods (that would be imported|imported) \(new\):' "$RUN_LOG" | tail -1 | grep -oE '[0-9]+$' || echo '?')"
updated="$(grep -E '^🔄 Mods (that would be updated|updated):' "$RUN_LOG" | tail -1 | grep -oE '[0-9]+$' || echo '?')"
errors="$(grep -E '^❌ Errors:' "$RUN_LOG" | tail -1 | grep -oE '[0-9]+$' || echo 0)"
# Early exit "Nothing to do" prints no summary block — that is a clean zero, not unknown.
if grep -qE 'Nothing to do: every matching post already has mods' "$RUN_LOG"; then
  pages=0; created=0; updated=0
fi

if [[ "$STATUS" -eq 0 ]]; then
  echo "$(date -u +%FT%TZ) catalog-ingest OK mode=$MODE since=$SINCE pages=$pages created=$created updated=$updated errors=$errors" | tee -a "$SUMMARY_LOG"
  exit 0
fi
echo "$(date -u +%FT%TZ) catalog-ingest FAIL mode=$MODE since=$SINCE exit=$STATUS pages=$pages created=$created log=$RUN_LOG" | tee -a "$SUMMARY_LOG"
exit 1
