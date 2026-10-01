#!/usr/bin/env bash
# scripts/agents/merge-gate.sh — the merge-serialization check as a standalone gate that can actually gate.
#
# Why: on 2026-09-21 two agents merged 5 s apart (#133, #132). Vercel built both, the alias went to whichever
# build finished last (the parent, without #132's change), and deploy-verify graded PASS against a build that was
# not serving. The "≥4 min apart" rule existed as prose chained after `gh pr merge` in one command — it could not
# stop anything. This script exits non-zero while the newest commit on origin/main is younger than MIN_AGE seconds,
# so `./scripts/agents/merge-gate.sh && gh pr merge N --squash --delete-branch` merges only when the gate is open.
#
# E155 (2026-10-01): the age check alone was check-then-act with no lock — on 09-30 #229/#228/#227 all passed ONE
# poll and merged 06:55:31/33/37, so deploy-verify graded one head for three PRs. The gate now takes an ATOMIC LOCK
# (`mkdir`) before it reads origin/main and, when it opens, KEEPS it for the caller's merge.
#
# LOCK CONTRACT (read this before you chain anything after the gate):
#   - Where: "$(git rev-parse --git-common-dir)/mhm-merge-gate.lock" — the .git dir every worktree of this repo shares,
#     so all sibling agent worktrees contend for ONE lock (override: MERGE_GATE_LOCK=/path).
#   - Holder: the shell that ran the gate (its $PPID), recorded with who/tree/host/time in "$LOCK/owner".
#     who = $MERGE_GATE_WHO, else $FUNNEL_AGENT, else the worktree's directory name.
#   - Exit 0 = gate OPEN and the lock is YOURS. Merge IN THE SAME COMMAND, joined with `&&` only:
#         ./scripts/agents/merge-gate.sh && gh pr merge N --squash --delete-branch && gh pr view N --json state,mergeCommit
#     A gate run in one Bash call and a merge in the next is NOT protected: the holder shell has exited, so the lock is
#     already free (see release rule 2).
#   - Released (any one is enough):
#       1. your merge lands — a non-ledger commit on origin/main newer than the lock takes over (the 240 s age gate
#          then holds everyone else off on its own);
#       2. the holder shell exits (its pid is gone on this host) — the chain ended, merged or not;
#       3. TTL (default 600 s, never more) — a hung or foreign-host holder cannot strand six other agents;
#       4. `merge-gate.sh --release` from the same worktree (or `--release --force` from anywhere);
#       5. the gate itself, on every non-zero exit (closed / could not run) — a closed gate never keeps the lock.
#   - Exit 1 while another agent holds it, printing "held by <who> (pid, tree) since <time>, frees in ≤Ns".
#   Fetch happens AFTER the lock is taken, so a holder whose merge landed a second ago is always seen.
#   Breaking a stale lock is an atomic rename; a breaker that finds it renamed a FRESH lock puts it back.
#
# Usage: merge-gate.sh [--min-age 240] [--wait [--max-wait 600]] [--quiet] [--ttl 600]
#        merge-gate.sh --status | --release [--force]
#   --wait      poll every 20 s until the gate opens and the lock is free (or --max-wait elapses → exit 1)
# Exit: 0 gate open, lock held by the caller · 1 gate closed (too soon) or lock held by another agent ·
#       2 could not read origin/main / could not create the lock (could-not-run — never "go")
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIN_AGE=240; WAIT=0; MAX_WAIT=600; QUIET=0; TTL="${MERGE_GATE_TTL:-600}"; ACTION=gate; FORCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --min-age) MIN_AGE="$2"; shift ;;
    --wait) WAIT=1 ;;
    --max-wait) MAX_WAIT="$2"; shift ;;
    --quiet) QUIET=1 ;;
    --ttl) TTL="$2"; shift ;;
    --status) ACTION=status ;;
    --release) ACTION=release ;;
    --force) FORCE=1 ;;
    *) echo "unknown argument: $1"; exit 64 ;;
  esac
  shift
done
case "$TTL" in ''|*[!0-9]*) TTL=600 ;; esac
[ "$TTL" -le 600 ] || TTL=600   # the contract caps a stranded lock at 10 minutes
say() { [ "$QUIET" = 1 ] || echo "$*"; }

COMMON="$( (cd "$ROOT" && git rev-parse --git-common-dir) 2>/dev/null)"
case "$COMMON" in /*) ;; ?*) COMMON="$ROOT/$COMMON" ;; esac
LOCK="${MERGE_GATE_LOCK:-${COMMON:+$COMMON/mhm-merge-gate.lock}}"
WHO="${MERGE_GATE_WHO:-${FUNNEL_AGENT:-$(basename "$ROOT")}}"
HOST="$(hostname 2>/dev/null || echo unknown)"
HOLDER_PID="$PPID"
TOKEN="$$-$(date +%s)-$RANDOM"
HAVE_LOCK=0

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

# ---------------------------------------------------------------- lock
owner_field() { sed -n "s/^$2=//p" "$1/owner" 2>/dev/null | head -1; }  # $1 lock dir, $2 key
pid_alive() { [ -n "$1" ] && ps -p "$1" >/dev/null 2>&1; }             # ps, not kill -0: no EPERM false-dead
fmt_time() { date -r "$1" '+%H:%M:%S' 2>/dev/null || date -d "@$1" '+%H:%M:%S' 2>/dev/null || echo "$1"; }
lock_stale_reason() {  # prints why the current lock is stale; empty = live. Needs a fresh origin/main for rule 1.
  local epoch pid host now age ts
  epoch="$(owner_field "$LOCK" epoch)"; pid="$(owner_field "$LOCK" pid)"; host="$(owner_field "$LOCK" host)"
  now=$(date +%s)
  case "$epoch" in ''|*[!0-9]*)
    # mkdir done, owner not yet written: give the writer a moment, then treat by the dir's own mtime
    epoch="$(stat -c %Y "$LOCK" 2>/dev/null || stat -f %m "$LOCK" 2>/dev/null || echo "$now")" ;;
  esac
  age=$(( now - epoch ))
  [ "$age" -ge "$TTL" ] && { echo "older than TTL ${TTL}s (${age}s)"; return; }
  if [ -n "$pid" ] && [ "$host" = "$HOST" ] && ! pid_alive "$pid"; then echo "holder shell pid $pid has exited"; return; fi
  read -r ts _ <<<"$(newest_gateable_commit)"
  if [ -n "${ts:-}" ] && [ "$ts" -ge "$epoch" ]; then echo "a merge landed on origin/main after it was taken"; return; fi
  echo ""
}
lock_holder_msg() {
  local epoch who pid root
  epoch="$(owner_field "$LOCK" epoch)"; who="$(owner_field "$LOCK" who)"; pid="$(owner_field "$LOCK" pid)"
  root="$(owner_field "$LOCK" root)"
  case "$epoch" in ''|*[!0-9]*) echo "held (owner not written yet)"; return ;; esac
  echo "held by ${who:-?} (pid ${pid:-?}, $(basename "${root:-?}")) since $(fmt_time "$epoch") ($(( $(date +%s) - epoch ))s ago; frees when its merge lands, its shell exits, or in ≤$(( TTL - ($(date +%s) - epoch) ))s)"
}
write_owner() {
  printf 'token=%s\nwho=%s\npid=%s\nhost=%s\nroot=%s\nepoch=%s\nsince=%s\n' \
    "$TOKEN" "$WHO" "$HOLDER_PID" "$HOST" "$ROOT" "$(date +%s)" "$(date '+%Y-%m-%d %H:%M:%S')" >"$LOCK/owner.$TOKEN" \
    && mv -f "$LOCK/owner.$TOKEN" "$LOCK/owner"
}
release_lock() {  # only ever removes a lock carrying OUR token
  [ "$HAVE_LOCK" = 1 ] || return 0
  if [ "$(owner_field "$LOCK" token)" = "$TOKEN" ]; then rm -rf "$LOCK"; fi
  HAVE_LOCK=0
}
try_lock() {  # 0 acquired · 1 held by a live holder (message in LOCK_MSG) · 2 cannot create
  LOCK_MSG=""
  [ -n "$LOCK" ] || { LOCK_MSG="no git common dir for $ROOT"; return 2; }
  if mkdir "$LOCK" 2>/dev/null; then
    write_owner || { rm -rf "$LOCK"; LOCK_MSG="could not write $LOCK/owner"; return 2; }
    HAVE_LOCK=1; return 0
  fi
  [ -d "$LOCK" ] || { LOCK_MSG="could not create $LOCK"; return 2; }
  # held: fetch first so "its merge landed" is judged on a fresh origin/main
  (cd "$ROOT" && git fetch -q origin main >/dev/null 2>&1) || true
  local why seen grave
  seen="$(owner_field "$LOCK" token)"
  why="$(lock_stale_reason)"
  if [ -z "$why" ]; then LOCK_MSG="$(lock_holder_msg)"; return 1; fi
  # Break atomically: rename, then confirm we renamed the lock we judged (same token). If someone broke and
  # re-took it in between, put theirs back and report busy.
  grave="$LOCK.stale.$TOKEN"
  mv "$LOCK" "$grave" 2>/dev/null || { LOCK_MSG="$(lock_holder_msg)"; return 1; }
  if [ "$(owner_field "$grave" token)" != "$seen" ]; then
    [ -e "$LOCK" ] || mv "$grave" "$LOCK" 2>/dev/null
    rm -rf "$grave" 2>/dev/null
    LOCK_MSG="$(lock_holder_msg)"; return 1
  fi
  say "merge-gate: broke stale lock ($(owner_field "$grave" who), since $(owner_field "$grave" since)): $why"
  rm -rf "$grave"
  if mkdir "$LOCK" 2>/dev/null; then
    write_owner || { rm -rf "$LOCK"; LOCK_MSG="could not write $LOCK/owner"; return 2; }
    HAVE_LOCK=1; return 0
  fi
  LOCK_MSG="$(lock_holder_msg)"; return 1
}

case "$ACTION" in
  status)
    if [ -d "$LOCK" ]; then
      (cd "$ROOT" && git fetch -q origin main >/dev/null 2>&1) || true
      w="$(lock_stale_reason)"; echo "merge-gate lock $LOCK: $(lock_holder_msg)${w:+ — STALE: $w}"
    else echo "merge-gate lock $LOCK: free"; fi
    exit 0 ;;
  release)
    [ -d "$LOCK" ] || { say "merge-gate: lock already free"; exit 0; }
    if [ "$FORCE" = 1 ] || [ "$(owner_field "$LOCK" root)" = "$ROOT" ]; then
      rm -rf "$LOCK"; say "merge-gate: lock released"; exit 0
    fi
    say "merge-gate: NOT releasing — $(lock_holder_msg) (another tree; use --force only if that agent is gone)"; exit 1 ;;
esac

trap 'release_lock' INT TERM HUP
START=$(date +%s)
while :; do
  try_lock; rc=$?
  if [ "$rc" -eq 2 ]; then say "merge-gate: could not take the lock: $LOCK_MSG"; exit 2; fi
  if [ "$rc" -eq 1 ]; then
    if [ "$WAIT" = 1 ] && [ $(( $(date +%s) - START )) -lt "$MAX_WAIT" ]; then
      say "merge-gate: lock $LOCK_MSG; waiting"; sleep 20; continue
    fi
    say "merge-gate: CLOSED — merge lock $LOCK_MSG. Do other work and retry."
    exit 1
  fi
  # lock is ours from here; every non-zero exit below releases it
  if ! (cd "$ROOT" && git fetch -q origin main >/dev/null 2>&1); then release_lock; say "merge-gate: could not fetch origin/main"; exit 2; fi
  read -r TS SHA <<<"$(newest_gateable_commit)"
  [ -n "${TS:-}" ] || { release_lock; say "merge-gate: could not read origin/main"; exit 2; }
  AGE=$(( $(date +%s) - TS ))
  if [ "$AGE" -ge "$MIN_AGE" ]; then
    say "merge-gate: OPEN — newest commit on origin/main ($SHA) is ${AGE}s old (≥${MIN_AGE}s); merge lock held by $WHO (shell pid $HOLDER_PID) until your merge lands, that shell exits, or ${TTL}s — merge in this same && chain"
    exit 0
  fi
  release_lock
  if [ "$WAIT" = 1 ] && [ $(( $(date +%s) - START )) -lt "$MAX_WAIT" ]; then
    say "merge-gate: closed — $SHA landed ${AGE}s ago; waiting $(( MIN_AGE - AGE ))s more"; sleep 20; continue
  fi
  say "merge-gate: CLOSED — newest commit on origin/main ($SHA) is ${AGE}s old (<${MIN_AGE}s). Do other work and retry; never merge on top of a build still in flight."
  exit 1
done
