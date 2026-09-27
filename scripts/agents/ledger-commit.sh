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
#   ledger-commit.sh --merge-local <src changelog.md> --into <dst changelog.md>  # local-only mirror, no git
#
# Idempotency (E126, 2026-09-27). A ledger row has an IDENTITY, not just bytes: rows get re-labelled on
# main ("PR #145 …" -> "Quinn: PR #145 …") and false alarms get a correcting row instead of the original
# ("06:55 ROLLED BACK" -> "07:14 after-merge (correcting row …)"). The runner's seed step compared bytes
# only, so every morning it re-appended both superseded originals from the operator tree into Quinn's
# checkout of main (2 duplicate rows on 2026-09-27). Two identity rules, both in row_is_duplicate():
#   strict    — exact line, or same (when, mode-word, commit) [or (when, mode-word, label) if no commit].
#               Used by --flush-pending: a queued row already on main by identity is dropped from the queue.
#   supersede — strict, OR the destination already has ANY row for the same (mode-word, commit). Used by
#               --merge-local, the non-durable same-run mirror: a row that main already accounts for
#               (relabelled or corrected) must never be resurrected from a stale tree.
# Both log "ledger: flush skipped N duplicate row(s)".
#
# --incident <file> must be named incidents/<YYYY-MM-DD-HHMMSS>.md already — it is copied by basename and
# funnel-history.ts only parses that name. Anything else is refused up front (exit 64) instead of landing
# under the wrong name (the 2026-09-26 closure landed as e111-incident.md and needed a fix-up commit).
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
ROW=""; LABEL="ledger-commit"; INCIDENT=""; DRY_RUN=0; REMOTE_URL=""; BRANCH="main"; FLUSH=0; MERGE_SRC=""; MERGE_DST=""
while [ $# -gt 0 ]; do
  case "$1" in
    --row) ROW="$2"; shift ;;
    --label) LABEL="$2"; shift ;;
    --incident) INCIDENT="$2"; shift ;;
    --dry-run) DRY_RUN=1 ;;
    --remote-url) REMOTE_URL="$2"; shift ;;
    --branch) BRANCH="$2"; shift ;;
    --flush-pending) FLUSH=1 ;;
    --merge-local) MERGE_SRC="$2"; shift ;;
    --into) MERGE_DST="$2"; shift ;;
    *) echo "ledger-commit: unknown argument: $1"; exit 64 ;;
  esac
  shift
done

# ---------------------------------------------------------------- row identity (E126)
# row_is_duplicate <row> <changelog> <strict|supersede>  -> 0 if the changelog already has this row by identity.
row_is_duplicate() {
  [ -f "$2" ] || return 1
  python3 - "$1" "$2" "$3" <<'PY'
import sys
row, path, mode = sys.argv[1], sys.argv[2], sys.argv[3]
def ident(line):
    c = [x.strip() for x in line.rstrip("\n").split("|")]
    if len(c) < 6 or not c[1].startswith("20"):
        return None
    word = c[2].split()[0] if c[2] else ""
    return c[1], word, c[3], c[4]
lines = [l.rstrip("\n") for l in open(path, encoding="utf-8", errors="replace")]
if row.rstrip("\n") in lines:
    sys.exit(0)
me = ident(row)
if me is None:
    sys.exit(1)
when, word, label, sha = me
for l in lines:
    o = ident(l)
    if o is None:
        continue
    if sha:
        if o[1] == word and o[3] == sha and (mode == "supersede" or o[0] == when):
            sys.exit(0)
    elif o[0] == when and o[1] == word and o[2] == label:
        sys.exit(0)
sys.exit(1)
PY
}

if [ -n "$MERGE_SRC" ] || [ -n "$MERGE_DST" ]; then
  # Local-only, append-only mirror of dated rows from one changelog into another. No git, no network.
  [ -n "$MERGE_SRC" ] && [ -n "$MERGE_DST" ] || { echo "ledger-commit: --merge-local needs --into"; exit 64; }
  [ -f "$MERGE_SRC" ] || { echo "ledger: merge source $MERGE_SRC missing — nothing to do"; exit 0; }
  [ -f "$MERGE_DST" ] || { cp "$MERGE_SRC" "$MERGE_DST"; echo "ledger: seeded $MERGE_DST from $MERGE_SRC"; exit 0; }
  added=0; skipped=0
  while IFS= read -r line; do
    case "$line" in "| 20"[0-9][0-9]-*) ;; *) continue ;; esac
    if row_is_duplicate "$line" "$MERGE_DST" supersede; then
      skipped=$((skipped + 1)); echo "ledger: skip (already accounted for on dst): ${line:0:90}"
    else
      printf '%s\n' "$line" >>"$MERGE_DST"; added=$((added + 1))
    fi
  done <"$MERGE_SRC"
  echo "ledger: merge-local appended $added row(s)"
  echo "ledger: flush skipped $skipped duplicate row(s)"
  exit 0
fi

if [ -n "$INCIDENT" ]; then
  case "$(basename "$INCIDENT")" in
    [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9].md) ;;
    *) echo "ledger-commit: --incident must be named YYYY-MM-DD-HHMMSS.md (got $(basename "$INCIDENT")) — rename it first; nothing landed"; exit 64 ;;
  esac
fi

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
  STATUS=0; SKIPPED=0
  # Snapshot of the branch's changelog for identity checks (a relabelled/corrected copy of a pending row
  # is not byte-identical, so land_one's exact-line check alone would append it a second time).
  MAIN_CHANGELOG=""
  if (cd "$ROOT" && git fetch -q "$REMOTE_URL" "$BRANCH") 2>/dev/null; then
    MAIN_CHANGELOG="$(mktemp "${TMPDIR:-/tmp}/ledger-main.XXXXXX")"
    (cd "$ROOT" && git show FETCH_HEAD:reports/funnel/changelog.md) >"$MAIN_CHANGELOG" 2>/dev/null || { rm -f "$MAIN_CHANGELOG"; MAIN_CHANGELOG=""; }
  fi
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
    if [ -n "$MAIN_CHANGELOG" ] && row_is_duplicate "$p_row" "$MAIN_CHANGELOG" strict; then
      SKIPPED=$((SKIPPED + 1)); echo "ledger-commit: pending row already on $BRANCH by identity — dropped from queue ($p_label)"
      continue
    fi
    if land_one "$p_row" "flush: $p_label" "$p_incident"; then
      echo "ledger-commit: flushed pending row ($p_label)"
    else
      echo "$line" >>"$TMP_REMAIN"; STATUS=2
    fi
  done <"$PENDING"
  mv "$TMP_REMAIN" "$PENDING"
  [ -s "$PENDING" ] || rm -f "$PENDING"
  [ -n "$MAIN_CHANGELOG" ] && rm -f "$MAIN_CHANGELOG"
  echo "ledger: flush skipped $SKIPPED duplicate row(s)"
  exit "$STATUS"
fi

[ -n "$ROW" ] || { echo "ledger-commit: --row is required (or use --flush-pending)"; exit 64; }
if land_one "$ROW" "$LABEL" "$INCIDENT"; then
  exit 0
else
  pending_append "$ROW" "$LABEL" "$INCIDENT"
  exit 2
fi
