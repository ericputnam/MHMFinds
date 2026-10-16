#!/usr/bin/env bash
# scripts/agents/digest-land.sh — lands an already-accepted daily digest on main when the daily PR did not.
#
# Why (E222, 2026-10-16): on 10-15 the runner logged "Quinn finished." and "digest: Quinn's file digest
# accepted", then `daily-pr-ledger: DID NOT FIRE — 'funnel: daily run 2026-10-15' not merged to origin/main
# yet after 600s`. Quinn's daily branch was never pushed, so the digest existed only in the operator checkout
# and the next morning's liveness grader read the day as MISSED. An accepted digest is a fact the runner
# knows; it must land on main in the step that knows it (same pattern as ledger-commit.sh).
#
# What it does: fetch the branch; if reports/funnel/digest-DATE.md is already on it → exit 0 (nothing to do,
# idempotent). If the remote has a `funnel/quinn/daily-DATE` branch → exit 2 and leave it alone (an open daily
# PR would conflict with a digest committed under it; the PR is the better record). Otherwise copy the file
# into a throwaway worktree on FETCH_HEAD, commit ONLY that path as `funnel(ledger): digest DATE …` (the
# merge gate ignores ledger commits; the subject never matches `daily run DATE (#N)`), push, 3 tries.
#
# Usage: digest-land.sh --date YYYY-MM-DD --file <digest.md> [--remote-url <url>] [--branch main] [--dry-run]
# Exit:  0 landed / already on the branch / dry-run · 2 could not land or held (WARN, never fatal) · 64 bad usage
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DATE=""; FILE=""; REMOTE_URL=""; BRANCH="main"; DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --date) DATE="$2"; shift ;;
    --file) FILE="$2"; shift ;;
    --remote-url) REMOTE_URL="$2"; shift ;;
    --branch) BRANCH="$2"; shift ;;
    --dry-run) DRY_RUN=1 ;;
    *) echo "digest-land: unknown argument: $1"; exit 64 ;;
  esac
  shift
done
printf '%s' "$DATE" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' || { echo "digest-land: --date YYYY-MM-DD required"; exit 64; }
[ -s "$FILE" ] || { echo "digest-land: digest file missing or empty: $FILE"; exit 64; }
[ -n "$REMOTE_URL" ] || REMOTE_URL="$(cd "$ROOT" && git remote get-url origin 2>/dev/null)"
[ -n "$REMOTE_URL" ] || { echo "digest-land: no remote"; exit 2; }
if grep -q 'DEGRADED: Quinn did not run' "$FILE"; then
  echo "digest-land: $FILE is a DEGRADED digest — not landing it (Quinn did not run)"; exit 2
fi
REL="reports/funnel/digest-$DATE.md"

if (cd "$ROOT" && git ls-remote --exit-code --heads "$REMOTE_URL" "funnel/quinn/daily-$DATE") >/dev/null 2>&1; then
  echo "digest-land: HELD — funnel/quinn/daily-$DATE exists on the remote (an open daily PR carries the digest; merge it)"
  exit 2
fi

wt=""; attempt=0
cleanup_wt() { [ -n "$wt" ] && [ -d "$wt" ] && (cd "$ROOT" && git worktree remove --force "$wt" >/dev/null 2>&1); [ -n "$wt" ] && rm -rf "$wt" 2>/dev/null; return 0; }
trap cleanup_wt EXIT
while [ "$attempt" -lt 3 ]; do
  attempt=$((attempt + 1))
  cleanup_wt
  if ! (cd "$ROOT" && git fetch -q "$REMOTE_URL" "$BRANCH") 2>/dev/null; then
    echo "digest-land: fetch failed (attempt $attempt/3)"; sleep 2; continue
  fi
  fetch_sha="$(cd "$ROOT" && git rev-parse FETCH_HEAD 2>/dev/null)"
  if (cd "$ROOT" && git cat-file -e "$fetch_sha:$REL") 2>/dev/null; then
    echo "digest-land: $REL already on $BRANCH — nothing to do"; exit 0
  fi
  wt="$(mktemp -d "${TMPDIR:-/tmp}/digest-land.XXXXXX")"; rm -rf "$wt"
  if ! (cd "$ROOT" && git worktree add --detach "$wt" "$fetch_sha") >/dev/null 2>&1; then
    echo "digest-land: worktree add failed (attempt $attempt/3)"; sleep 2; continue
  fi
  mkdir -p "$wt/reports/funnel" && cp "$FILE" "$wt/$REL"
  if [ "$DRY_RUN" = 1 ]; then
    echo "digest-land: --dry-run — would commit $REL ($(wc -c <"$FILE" | tr -d ' ') B) and push to $BRANCH"; exit 0
  fi
  (cd "$wt" && git add "$REL")
  if ! (cd "$wt" && git -c user.email="funnel-bot@musthavemods.com" -c user.name="MHM Funnel Bot" \
      commit -q -m "funnel(ledger): digest $DATE landed by runner (daily PR did not merge)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"); then
    echo "digest-land: commit failed (attempt $attempt/3)"; sleep 2; continue
  fi
  if (cd "$wt" && git push -q "$REMOTE_URL" "HEAD:$BRANCH") 2>&1; then
    echo "digest-land: pushed $(cd "$wt" && git rev-parse --short HEAD) — $REL on $BRANCH"; exit 0
  fi
  echo "digest-land: push rejected (attempt $attempt/3) — re-fetching"; sleep 3
done
echo "digest-land: could not land $REL after 3 tries"
exit 2
