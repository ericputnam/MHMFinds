#!/usr/bin/env bash
# scripts/agents/merge-gate.sh — the merge-serialization check as a standalone gate that can actually gate.
#
# Why: on 2026-09-21 two agents merged 5 s apart (#133, #132). Vercel built both, the alias went to whichever
# build finished last (the parent, without #132's change), and deploy-verify graded PASS against a build that was
# not serving. The "≥4 min apart" rule existed as prose chained after `gh pr merge` in one command — it could not
# stop anything. This script exits non-zero while the newest commit on origin/main is younger than MIN_AGE seconds,
# so `./scripts/agents/merge-gate.sh && gh pr merge N --squash --delete-branch` merges only when the gate is open.
#
# Usage: merge-gate.sh [--min-age 240] [--wait [--max-wait 600]] [--quiet]
#   --wait      poll every 20 s until the gate opens (or --max-wait elapses → exit 1)
# Exit: 0 gate open · 1 gate closed (too soon) · 2 could not read origin/main
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIN_AGE=240; WAIT=0; MAX_WAIT=600; QUIET=0
while [ $# -gt 0 ]; do
  case "$1" in
    --min-age) MIN_AGE="$2"; shift ;;
    --wait) WAIT=1 ;;
    --max-wait) MAX_WAIT="$2"; shift ;;
    --quiet) QUIET=1 ;;
    *) echo "unknown argument: $1"; exit 64 ;;
  esac
  shift
done
say() { [ "$QUIET" = 1 ] || echo "$*"; }
# An autonomous `funnel(ledger): ...` commit (scripts/agents/ledger-commit.sh) that touches only
# reports/funnel/** ships no application code and needs no serialization against a real Vercel build —
# it is exempt from needing its own ledger row / deploy-verify (see deploy-verify.sh's
# is_ledger_only_commit()). Find the newest commit that ISN'T one of those and gate on its age, so a
# docs-only ledger push landing between two real merges doesn't hold the gate closed for MIN_AGE
# for no reason.
is_ledger_only_commit() {  # $1 sha
  local sha="$1" msg files f
  msg="$(cd "$ROOT" && git log -1 --format=%s "$sha" 2>/dev/null)"
  case "$msg" in funnel\(ledger\):*) ;; *) return 1 ;; esac
  files="$(cd "$ROOT" && git diff-tree --no-commit-id --name-only -r "$sha" 2>/dev/null)"
  [ -n "$files" ] || return 1
  while IFS= read -r f; do
    case "$f" in reports/funnel/*) ;; *) return 1 ;; esac
  done <<<"$files"
  return 0
}
newest_gateable_commit() {  # walks origin/main back past any ledger-only commits, prints "ct sha"
  local n=0 line sha
  while [ "$n" -lt 20 ]; do
    line="$( (cd "$ROOT" && git log -1 --format='%ct %h' --skip="$n" origin/main) 2>/dev/null)"
    [ -n "$line" ] || { echo ""; return; }
    sha="${line#* }"
    if is_ledger_only_commit "$sha"; then n=$((n + 1)); continue; fi
    echo "$line"; return
  done
  echo ""
}
START=$(date +%s)
while :; do
  if ! (cd "$ROOT" && git fetch -q origin main >/dev/null 2>&1); then say "merge-gate: could not fetch origin/main"; exit 2; fi
  read -r TS SHA <<<"$(newest_gateable_commit)"
  [ -n "${TS:-}" ] || { say "merge-gate: could not read origin/main"; exit 2; }
  AGE=$(( $(date +%s) - TS ))
  if [ "$AGE" -ge "$MIN_AGE" ]; then say "merge-gate: OPEN — newest commit on origin/main ($SHA) is ${AGE}s old (≥${MIN_AGE}s)"; exit 0; fi
  if [ "$WAIT" = 1 ] && [ $(( $(date +%s) - START )) -lt "$MAX_WAIT" ]; then
    say "merge-gate: closed — $SHA landed ${AGE}s ago; waiting $(( MIN_AGE - AGE ))s more"; sleep 20; continue
  fi
  say "merge-gate: CLOSED — newest commit on origin/main ($SHA) is ${AGE}s old (<${MIN_AGE}s). Do other work and retry; never merge on top of a build still in flight."
  exit 1
done
