#!/usr/bin/env bash
# scripts/agents/ledger-commit.sh — lands a ledger row (and an optional incident file) durably on main.
#
# Root cause this fixes: deploy-verify.sh's ledger() used to printf-append a row into up to THREE
# working trees ($ROOT, $FUNNEL_PRIMARY_WT, $OPERATOR_DIR) and never ran git add/commit/push. A row
# only reached origin/main if some later, unrelated PR happened to carry reports/funnel/changelog.md
# along with its own diff — three copies of a non-durable write, not redundancy. See CLAUDE.md:
# "Appending to a file in a working tree is not a record — only a commit on main is."
#
# What this script does: fetches the target branch into a throwaway `git worktree` under $TMPDIR,
# appends the row to reports/funnel/changelog.md (skipping it if an identical line is already present
# — idempotent), optionally copies one incident file into reports/funnel/incidents/, commits ONLY
# those paths, and pushes straight to the branch (main is unprotected in this repo — verified). On a
# push race it re-fetches and retries up to 3 times total. If it still cannot land the row (offline,
# repeated race, no push access) it appends the row to reports/funnel/ledger-pending.jsonl in the
# operator's own tree (never the ephemeral per-agent worktree this script is usually called from —
# see PERSIST_DIR below) and exits 2 (WARN) — it NEVER fails the caller. deploy-verify's own verification verdict (PASS/FAIL/
# rolled back) stands regardless of whether the row made it to main on the first try; the runner's
# first step flushes any pending rows on the next run via --flush-pending.
#
# Usage:
#   ledger-commit.sh --row "<literal changelog.md table row, including leading/trailing |>"
#                     [--label "<short text for the commit message>"] [--incident <path to .md file>]
#                     [--dry-run] [--remote-url <url>] [--branch main]
#   ledger-commit.sh --flush-pending [--remote-url <url>] [--branch main]   # replays ledger-pending.jsonl, oldest first
#
# Env: LEDGER_COMMIT=0   — no-op (exit 0 without touching git); used by tests and dry runs that only
#                          want deploy-verify's LOCAL append (to $ROOT/$FUNNEL_PRIMARY_WT), no push.
# Exit: 0 landed on the branch (or nothing to do / dry-run) · 2 could not land — queued in
#       reports/funnel/ledger-pending.jsonl (WARN, non-fatal to the caller) · 64 bad usage
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Callers of THIS script run from an EPHEMERAL per-agent worktree (run-funnel-daily.sh creates one per
# agent under $HOME/.mhm-worktrees and deletes it at the end of the run). A pending-rows fallback file
# written under $ROOT would vanish with the worktree — the one place that must survive across runs is
# the operator's own checkout. Same constant as deploy-verify.sh's OPERATOR_DIR. Fall back to $ROOT
# (e.g. for tests that point ROOT elsewhere, or if that path does not exist on this machine).
PERSIST_DIR="/Users/eputnam/java_projects/MHMFinds"
[ -d "$PERSIST_DIR" ] || PERSIST_DIR="$ROOT"
ROW=""; LABEL="ledger-commit"; INCIDENT=""; DRY_RUN=0; REMOTE_URL=""; BRANCH="main"; FLUSH=0
while [ $# -gt 0 ]; do
  case "$1" in
    --row) ROW="$2"; shift ;;
    --label) LABEL="$2"; shift ;;
    --incident) INCIDENT="$2"; shift ;;
    --dry-run) DRY_RUN=1 ;;
    --remote-url) REMOTE_URL="$2"; shift ;;
    --branch) BRANCH="$2"; shift ;;
    --flush-pending) FLUSH=1 ;;
    *) echo "ledger-commit: unknown argument: $1"; exit 64 ;;
  esac
  shift
done

# LEDGER_PENDING_FILE lets tests point the pending queue at a scratch location instead of the real
# operator tree.
PENDING="${LEDGER_PENDING_FILE:-$PERSIST_DIR/reports/funnel/ledger-pending.jsonl}"

if [ "${LEDGER_COMMIT:-1}" = "0" ]; then
  echo "ledger-commit: LEDGER_COMMIT=0 — no-op (caller's local append, if any, stands alone)"
  exit 0
fi

[ -n "$REMOTE_URL" ] || REMOTE_URL="$(cd "$ROOT" && git remote get-url origin 2>/dev/null)"
[ -n "$REMOTE_URL" ] || { echo "ledger-commit: could not determine a remote url (pass --remote-url)"; exit 2; }

# ---------------------------------------------------------------- one row, one worktree, one push
land_one() {  # $1 row  $2 label  $3 incident-path-or-empty  -> 0 landed / no-op, 2 could not land
  local row="$1" label="$2" incident="$3"
  local wt attempt=0 fetch_sha
  wt="$(mktemp -d "${TMPDIR:-/tmp}/ledger-commit.XXXXXX")"
  rm -rf "$wt"
  cleanup_wt() { [ -n "${wt:-}" ] && [ -d "$wt" ] && (cd "$ROOT" && git worktree remove --force "$wt" >/dev/null 2>&1); [ -n "${wt:-}" ] && rm -rf "$wt" 2>/dev/null || true; }
  while [ "$attempt" -lt 3 ]; do
    attempt=$((attempt + 1))
    cleanup_wt
    if ! (cd "$ROOT" && git fetch -q "$REMOTE_URL" "$BRANCH") 2>/dev/null; then
      echo "ledger-commit: fetch failed (attempt $attempt/3)"; sleep 2; continue
    fi
    fetch_sha="$(cd "$ROOT" && git rev-parse FETCH_HEAD 2>/dev/null)"
    [ -n "$fetch_sha" ] || { echo "ledger-commit: could not resolve FETCH_HEAD (attempt $attempt/3)"; sleep 2; continue; }
    if ! (cd "$ROOT" && git worktree add --detach "$wt" "$fetch_sha") >/dev/null 2>&1; then
      echo "ledger-commit: worktree add failed (attempt $attempt/3)"; sleep 2; continue
    fi
    local changelog="$wt/reports/funnel/changelog.md"
    mkdir -p "$(dirname "$changelog")"
    [ -f "$changelog" ] || printf '# Production change ledger\n\nAppended automatically by `scripts/agents/deploy-verify.sh` (via `ledger-commit.sh`) on every production deploy, evening check and rollback, so the operator can see exactly what changed and whether it was verified. Newest at the bottom.\n\n| when | mode | who / what | commit | deployment | result | notes |\n|---|---|---|---|---|---|---|\n' >"$changelog"
    if grep -qF -- "$row" "$changelog" 2>/dev/null; then
      echo "ledger-commit: identical row already on $BRANCH — nothing to do"
      cleanup_wt; return 0
    fi
    printf '%s\n' "$row" >>"$changelog"
    if [ -n "$incident" ] && [ -f "$incident" ]; then
      mkdir -p "$wt/reports/funnel/incidents"
      cp "$incident" "$wt/reports/funnel/incidents/"
    fi
    if [ "$DRY_RUN" = 1 ]; then
      echo "ledger-commit: --dry-run — would commit and push to $REMOTE_URL $BRANCH:"
      (cd "$wt" && git --no-pager diff --stat -- reports/funnel/changelog.md; [ -n "$incident" ] && [ -f "$incident" ] && echo "  + reports/funnel/incidents/$(basename "$incident")")
      cleanup_wt; return 0
    fi
    (cd "$wt" && git add reports/funnel/changelog.md)
    [ -n "$incident" ] && [ -f "$incident" ] && (cd "$wt" && git add "reports/funnel/incidents/$(basename "$incident")")
    if ! (cd "$wt" && git -c user.email="funnel-bot@musthavemods.com" -c user.name="MHM Funnel Bot" \
        commit -q -m "funnel(ledger): $label

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"); then
      echo "ledger-commit: commit failed (attempt $attempt/3)"; sleep 2; continue
    fi
    if (cd "$wt" && git push -q "$REMOTE_URL" "HEAD:$BRANCH") 2>&1; then
      echo "ledger-commit: pushed $(cd "$wt" && git rev-parse --short HEAD) to $BRANCH ($label)"
      cleanup_wt; return 0
    fi
    echo "ledger-commit: push rejected (attempt $attempt/3) — re-fetching and retrying"; sleep 3
  done
  cleanup_wt
  return 2
}

pending_append() {  # $1 row  $2 label  $3 incident-path-or-empty
  mkdir -p "$(dirname "$PENDING")"
  python3 - "$PENDING" "$1" "$2" "$3" <<'PY'
import json, sys, datetime
pending, row, label, incident = sys.argv[1:5]
rec = {"ts": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "label": label, "row": row, "incident": incident or None}
with open(pending, "a") as f:
    f.write(json.dumps(rec) + "\n")
PY
  echo "ledger-commit: could not land on $BRANCH after 3 tries — queued in $PENDING"
}

if [ "$FLUSH" = 1 ]; then
  [ -f "$PENDING" ] || { echo "ledger-commit: no pending rows"; exit 0; }
  TMP_REMAIN="$(mktemp "${TMPDIR:-/tmp}/ledger-pending.XXXXXX")"
  : >"$TMP_REMAIN"
  STATUS=0
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    # Fields can contain spaces and pipes (it's a markdown table row) — never split on whitespace.
    # Emit row/label/incident separated by \x1f (unit separator, cannot appear in our own content) in
    # ONE python call and split on that exact byte in bash, instead of nesting python calls through
    # word-split command substitution (which silently mis-parsed multi-word fields).
    parsed="$(python3 -c '
import json,sys
d=json.loads(sys.argv[1])
sys.stdout.write(d.get("row","") + "\x1f" + d.get("label","") + "\x1f" + (d.get("incident") or ""))
' "$line")"
    IFS=$'\x1f' read -r p_row p_label p_incident <<<"$parsed"
    if land_one "$p_row" "flush: $p_label" "$p_incident"; then
      echo "ledger-commit: flushed pending row ($p_label)"
    else
      echo "$line" >>"$TMP_REMAIN"; STATUS=2
    fi
  done <"$PENDING"
  mv "$TMP_REMAIN" "$PENDING"
  [ -s "$PENDING" ] || rm -f "$PENDING"
  exit "$STATUS"
fi

[ -n "$ROW" ] || { echo "ledger-commit: --row is required (or use --flush-pending)"; exit 64; }
if land_one "$ROW" "$LABEL" "$INCIDENT"; then
  exit 0
else
  pending_append "$ROW" "$LABEL" "$INCIDENT"
  exit 2
fi
