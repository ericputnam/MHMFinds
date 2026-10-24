#!/usr/bin/env bash
# scripts/agents/artifacts-land.sh — lands the day's deterministic funnel artifacts on main, independently of Quinn.
#
# Why (E271, 2026-10-24): the scoreboard (reports/funnel/DATE.{md,json}), the circuit-breaker report
# (guardrail-DATE.{md,json}) and the operator-did probe (operator-did-DATE.{md,json}) reached main ONLY because
# funnel-daily-prompt.md step 8 asks Quinn to `git add` them. Any run that dies after the scoreboard and before
# step 8 (the 10-22 pattern, a --max-turns stop, an unpushed daily branch as on 10-15) strands them in a worktree
# that cleanup() then deletes; on 10-23 they were landed by hand. The runner writes these files itself, so the
# runner is the step that KNOWS they are true — it lands them, the same way ledger-commit.sh lands a ledger row
# and digest-land.sh lands an accepted digest.
#
# What it does: fetch the branch into a throwaway `git worktree` on FETCH_HEAD, copy each allowlisted file that
# exists and is non-empty into reports/funnel/, `git add` ONLY those paths, and commit only if the index differs
# from FETCH_HEAD — identical content on main is "nothing to do", never an empty commit (idempotent: a second
# run the same day is a no-op). Push, re-fetch + retry on a race, 3 tries total. Never fatal to the caller.
#
# Allowlist, failing closed: the six names are DERIVED from --date (which must match YYYY-MM-DD) — no caller-
# supplied path is ever committed, a symlink is refused, and nothing outside reports/funnel/ can be staged.
#
# NOT landed here, on purpose: reports/funnel/history.json. It is build-relevant (next.config.js
# outputFileTracingIncludes ships it to /api/admin/funnel/history; deploy-verify.sh is_paper_path() returns 1
# for it), and every push to main builds production (vercel.json ignoreCommand skips previews only). A runner
# push of history.json would be an UNVERIFIED production deploy with no ledger row. It stays on Quinn's daily PR,
# which runs the ship protocol + deploy-verify. Everything this script commits is paper under is_paper_path(), and
# the subject is `funnel(ledger): …` touching only reports/funnel/** — exactly what merge-gate.sh and
# deploy-verify.sh treat as a ledger-only commit (exempt from the 240 s gate and from its own verify), so it
# cannot hold the gate closed or be mistaken for a team merge.
#
# Ordering vs Quinn's step 8 (no race): the runner calls this BEFORE the Quinn invocation. Quinn's daily PR later
# commits the same files; when Quinn has not regenerated them the blobs are identical, so the squash merge has no
# diff for them (an identical add on both sides is not a conflict). If Quinn re-ran the scoreboard, her copy is
# newer and her PR carries the change as an ordinary modification on top of this commit. HELD (exit 2, nothing
# pushed) when a funnel/quinn/daily-DATE branch already exists on the remote — a same-day re-run must not move
# files under an open daily PR.
#
# Fallback: none needed beyond a log line — the runner has already copied every one of these files into the
# operator checkout, Quinn's step 8 is still the second path, and E264's digest-land --extra is the third.
#
# Usage: artifacts-land.sh --date YYYY-MM-DD [--src-dir <dir holding the files, default $ROOT/reports/funnel>]
#                          [--remote-url <url>] [--branch main] [--dry-run]
# Exit:  0 landed / already identical on the branch / nothing to land / dry-run · 2 could not land or HELD (WARN,
#        never fatal) · 64 bad usage
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DATE=""; SRC_DIR=""; REMOTE_URL=""; BRANCH="main"; DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --date) DATE="${2:-}"; shift ;;
    --src-dir) SRC_DIR="${2:-}"; shift ;;
    --remote-url) REMOTE_URL="${2:-}"; shift ;;
    --branch) BRANCH="${2:-}"; shift ;;
    --dry-run) DRY_RUN=1 ;;
    *) echo "artifacts-land: unknown argument: $1"; exit 64 ;;
  esac
  shift
done
printf '%s' "$DATE" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' || { echo "artifacts-land: --date YYYY-MM-DD required"; exit 64; }
[ -n "$SRC_DIR" ] || SRC_DIR="$ROOT/reports/funnel"
[ -d "$SRC_DIR" ] || { echo "artifacts-land: source dir missing: $SRC_DIR"; exit 64; }

# The allowlist. Names only, derived from the validated date; history.json deliberately absent (see header).
NAMES="$DATE.md $DATE.json guardrail-$DATE.md guardrail-$DATE.json operator-did-$DATE.md operator-did-$DATE.json"
FOUND=""
for b in $NAMES; do
  f="$SRC_DIR/$b"
  if [ -L "$f" ]; then echo "artifacts-land: $b is a symlink — refused"; continue; fi
  if [ ! -f "$f" ] || [ ! -s "$f" ]; then echo "artifacts-land: $b missing or empty — skipped"; continue; fi
  FOUND="$FOUND $b"
done
FOUND="${FOUND# }"
[ -n "$FOUND" ] || { echo "artifacts-land: none of the $DATE artifacts exist in $SRC_DIR — nothing to land"; exit 0; }

[ -n "$REMOTE_URL" ] || REMOTE_URL="$(cd "$ROOT" && git remote get-url origin 2>/dev/null)"
[ -n "$REMOTE_URL" ] || { echo "artifacts-land: no remote url (pass --remote-url)"; exit 2; }

if (cd "$ROOT" && git ls-remote --exit-code --heads "$REMOTE_URL" "funnel/quinn/daily-$DATE") >/dev/null 2>&1; then
  echo "artifacts-land: HELD — funnel/quinn/daily-$DATE exists on the remote (the open daily PR carries the artifacts)"
  exit 2
fi

wt=""; attempt=0
cleanup_wt() { [ -n "$wt" ] && [ -d "$wt" ] && (cd "$ROOT" && git worktree remove --force "$wt" >/dev/null 2>&1); [ -n "$wt" ] && rm -rf "$wt" 2>/dev/null; return 0; }
trap cleanup_wt EXIT
while [ "$attempt" -lt 3 ]; do
  attempt=$((attempt + 1))
  cleanup_wt
  if ! (cd "$ROOT" && git fetch -q "$REMOTE_URL" "$BRANCH") 2>/dev/null; then
    echo "artifacts-land: fetch failed (attempt $attempt/3)"; sleep 2; continue
  fi
  fetch_sha="$(cd "$ROOT" && git rev-parse FETCH_HEAD 2>/dev/null)"
  wt="$(mktemp -d "${TMPDIR:-/tmp}/artifacts-land.XXXXXX")"; rm -rf "$wt"
  if [ -z "$fetch_sha" ] || ! (cd "$ROOT" && git worktree add --detach "$wt" "$fetch_sha") >/dev/null 2>&1; then
    echo "artifacts-land: worktree add failed (attempt $attempt/3)"; sleep 2; continue
  fi
  mkdir -p "$wt/reports/funnel"
  PATHS=""
  for b in $FOUND; do cp "$SRC_DIR/$b" "$wt/reports/funnel/$b" && PATHS="$PATHS reports/funnel/$b"; done
  # shellcheck disable=SC2086  # PATHS are allowlisted names with no whitespace (date-derived)
  (cd "$wt" && git add -- $PATHS)
  if (cd "$wt" && git diff --cached --quiet); then
    echo "artifacts-land: $DATE artifacts already identical on $BRANCH — nothing to do ($FOUND)"; exit 0
  fi
  CHANGED="$(cd "$wt" && git diff --cached --name-only | sed 's#^reports/funnel/##' | tr '\n' ' ')"
  if [ "$DRY_RUN" = 1 ]; then
    echo "artifacts-land: --dry-run — would commit ${CHANGED% } and push to $BRANCH"; exit 0
  fi
  if ! (cd "$wt" && git -c user.email="funnel-bot@musthavemods.com" -c user.name="MHM Funnel Bot" \
      commit -q -m "funnel(ledger): artifacts $DATE scoreboard/guardrail/operator-did (Tier 0, paper)

Landed by scripts/agents/artifacts-land.sh before Quinn starts (E271): ${CHANGED% }

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"); then
    echo "artifacts-land: commit failed (attempt $attempt/3)"; sleep 2; continue
  fi
  if (cd "$wt" && git push -q "$REMOTE_URL" "HEAD:$BRANCH") 2>&1; then
    echo "artifacts-land: pushed $(cd "$wt" && git rev-parse --short HEAD) to $BRANCH — ${CHANGED% }"; exit 0
  fi
  echo "artifacts-land: push rejected (attempt $attempt/3) — re-fetching"; sleep 3
done
echo "artifacts-land: could not land the $DATE artifacts after 3 tries (copies remain in the operator checkout; Quinn's step 8 is the second path)"
exit 2
