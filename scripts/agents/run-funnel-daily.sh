#!/bin/bash
# scripts/agents/run-funnel-daily.sh — the funnel team's daily loop, headless.
#
# 1. Waits for the network (launchd fires at wake, before Wi-Fi is back).
# 2. Creates a fresh `git worktree` from origin/main (SD-6) so the operator's
#    uncommitted work never blocks the run and the run never touches it. This is
#    the failure that silently killed scripts/compound/auto-compound.sh for weeks
#    ("Your local changes … would be overwritten by checkout").
# 3. Runs the scoreboard, then the revenue circuit breaker
#    (scripts/agents/revenue-guardrail.ts). Operator's rule #2: "if your change
#    significantly hurts RPM and revenue we go under — fix it quickly." A 🔴
#    red-rpm day with a production deploy inside the window is rolled back HERE,
#    before Quinn starts, via deploy-verify.sh --rollback. A failed blog-marker
#    check is fixed by re-pushing functions.php from git.
# 4. Runs Quinn (claude -p) with the daily prompt + the guardrail status.
# 5. Copies the digest, scoreboard, guardrail report, ledger and incidents back
#    into the operator's tree so they are readable without a pull, and appends
#    to logs/funnel-daily.log.
#
# Manual run:  ./scripts/agents/run-funnel-daily.sh
# Dry run:     FUNNEL_DRY_RUN=1 ./scripts/agents/run-funnel-daily.sh   (scoreboard + guardrail only)
# No auto-rollback: FUNNEL_AUTO_ROLLBACK=0 ./scripts/agents/run-funnel-daily.sh

set -uo pipefail

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
LOG_FILE="$PROJECT_DIR/logs/funnel-daily.log"
WORKTREE_ROOT="$HOME/.mhm-worktrees"
TODAY="$(date '+%Y-%m-%d')"
WT="$WORKTREE_ROOT/funnel-$TODAY-$$"
PROMPT_FILE="$PROJECT_DIR/scripts/agents/funnel-daily-prompt.md"
MODEL="${FUNNEL_MODEL:-claude-fable-5}"
MAX_TURNS="${FUNNEL_MAX_TURNS:-400}"

mkdir -p "$PROJECT_DIR/logs" "$WORKTREE_ROOT" "$PROJECT_DIR/reports/funnel"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# --- network readiness (see run-mediavine-daily-report.sh) -------------------
NET_OK=0
for _ in $(seq 1 30); do
  if curl -sf -o /dev/null --max-time 3 https://www.google.com/generate_204; then NET_OK=1; break; fi
  sleep 3
done
[ "$NET_OK" -eq 1 ] || log "Network never came up after 90s — running anyway."

# --- clean worktree from origin/main (never the operator's tree) --------------
cd "$PROJECT_DIR" || { log "cannot cd to $PROJECT_DIR"; exit 1; }
git fetch origin main --quiet || log "git fetch failed (offline?) — using last known origin/main"
# Prune stale worktrees from crashed runs (older than 2 days).
find "$WORKTREE_ROOT" -maxdepth 1 -type d -name 'funnel-*' -mtime +2 -exec git worktree remove --force {} \; 2>/dev/null
git worktree prune
if ! git worktree add --detach "$WT" origin/main >>"$LOG_FILE" 2>&1; then
  log "git worktree add failed — aborting (operator tree untouched)"; exit 1
fi
cleanup() {
  cd "$PROJECT_DIR" || exit 0
  git worktree remove --force "$WT" >/dev/null 2>&1 || true
  git worktree prune >/dev/null 2>&1 || true
}
trap cleanup EXIT

cd "$WT" || exit 1
# Secrets stay in the operator's .env.local; symlink so scripts (DB, Mediavine) work. Never copied, never committed (.gitignore covers .env*).
[ -f "$PROJECT_DIR/.env.local" ] && ln -sf "$PROJECT_DIR/.env.local" "$WT/.env.local"
[ -f "$PROJECT_DIR/scripts/mcp-mediavine/.env.local" ] && ln -sf "$PROJECT_DIR/scripts/mcp-mediavine/.env.local" "$WT/scripts/mcp-mediavine/.env.local"
# Reuse the operator's node_modules (identical lockfile on origin/main is the common case; falls back to npm ci if not).
if cmp -s "$PROJECT_DIR/package-lock.json" "$WT/package-lock.json" && [ -d "$PROJECT_DIR/node_modules" ]; then
  ln -s "$PROJECT_DIR/node_modules" "$WT/node_modules"
else
  log "lockfile differs from origin/main — npm ci in worktree"
  npm ci --no-audit --no-fund >>"$LOG_FILE" 2>&1 || { log "npm ci failed"; exit 1; }
fi
npx prisma generate >>"$LOG_FILE" 2>&1 || log "prisma generate failed (continuing; DB section will report)"
mkdir -p "$WT/reports/funnel" "$WT/reports/funnel/drafts" "$WT/logs"
# Bootstrap: until the funnel-team files are merged to main, copy them in from the operator's tree
# so the loop can run. Logged loudly so the operator merges soon (the copies are not committed here).
if [ ! -f "$WT/scripts/agents/funnel-scoreboard.ts" ]; then
  log "funnel team files are NOT on origin/main yet — bootstrapping from the operator tree (merge them!)"
  mkdir -p "$WT/.claude/agents/mhm-funnel" "$WT/scripts/agents"
  cp -R "$PROJECT_DIR/.claude/agents/mhm-funnel/." "$WT/.claude/agents/mhm-funnel/"
  for f in mhm-gm mhm-distribution mhm-search-ai mhm-content-creators mhm-capture mhm-product-revenue; do
    cp "$PROJECT_DIR/.claude/agents/$f.md" "$WT/.claude/agents/$f.md"
  done
  cp "$PROJECT_DIR"/scripts/agents/funnel-*.{ts,md,sh} "$WT/scripts/agents/" 2>/dev/null
  for f in scripts/agents/revenue-guardrail.ts scripts/agents/deploy-verify.sh scripts/agents/smoke-render.ts scripts/staging/push-blog-functions-prod.sh; do
    cp "$PROJECT_DIR/$f" "$WT/$f" 2>/dev/null
  done
fi
# The ledger and incidents live in the operator's tree (they are written by deploy-verify.sh into both);
# seed the worktree copy so Quinn can read what changed since the last digest.
[ -f "$PROJECT_DIR/reports/funnel/changelog.md" ] && cp "$PROJECT_DIR/reports/funnel/changelog.md" "$WT/reports/funnel/changelog.md"
[ -d "$PROJECT_DIR/reports/funnel/incidents" ] && mkdir -p "$WT/reports/funnel/incidents" && cp "$PROJECT_DIR"/reports/funnel/incidents/*.md "$WT/reports/funnel/incidents/" 2>/dev/null

# --- 1. scoreboard ----------------------------------------------------------
log "Scoreboard…"
if npx tsx scripts/agents/funnel-scoreboard.ts >"$WT/reports/funnel/scoreboard.out" 2>>"$LOG_FILE"; then
  cp "$WT/reports/funnel/$TODAY".md "$WT/reports/funnel/$TODAY".json "$PROJECT_DIR/reports/funnel/" 2>/dev/null
  log "Scoreboard written to reports/funnel/$TODAY.md"
else
  log "Scoreboard FAILED — Quinn will run with partial data"
fi
# --- 1b. circuit breaker (operator's rule #2) --------------------------------
GUARD_MD="reports/funnel/guardrail-$TODAY.md"; GUARD_JSON="reports/funnel/guardrail-$TODAY.json"
GUARD_STATUS="unknown"; GUARD_ACTION="none"; GUARD_ROLLBACK_TO=""
log "Circuit breaker…"
npx tsx scripts/agents/revenue-guardrail.ts --quiet --json "$WT/$GUARD_JSON" --md "$WT/$GUARD_MD" >>"$LOG_FILE" 2>&1
GUARD_EXIT=$?
if [ -f "$WT/$GUARD_JSON" ]; then
  read -r GUARD_STATUS GUARD_ACTION GUARD_ROLLBACK_TO <<<"$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(d.get("status","unknown"), d.get("action","none"), d.get("rollbackTo") or "")' "$WT/$GUARD_JSON" 2>/dev/null)"
  cp "$WT/$GUARD_MD" "$WT/$GUARD_JSON" "$PROJECT_DIR/reports/funnel/" 2>/dev/null
fi
log "Circuit breaker: status=$GUARD_STATUS action=$GUARD_ACTION (exit $GUARD_EXIT)"
if [ "$GUARD_ACTION" = "rollback" ] && [ -n "$GUARD_ROLLBACK_TO" ]; then
  if [ "${FUNNEL_AUTO_ROLLBACK:-1}" = "0" ]; then
    log "🔴 red-rpm with an in-window deploy — FUNNEL_AUTO_ROLLBACK=0, NOT rolling back (Quinn will report)"
  else
    log "🔴 red-rpm with an in-window deploy — rolling production back to $GUARD_ROLLBACK_TO"
    ./scripts/agents/deploy-verify.sh --rollback --to "$GUARD_ROLLBACK_TO" --label "circuit-breaker: $GUARD_STATUS on $TODAY" >>"$LOG_FILE" 2>&1
    log "rollback exit $? — see reports/funnel/changelog.md and reports/funnel/incidents/"
  fi
fi
if [ "$GUARD_STATUS" = "red-health" ] && ! ./scripts/agents/check-blog-sidebar.sh --quiet >>"$LOG_FILE" 2>&1; then
  log "🔴 blog markers missing — restoring functions.php from git"
  ./scripts/staging/push-blog-functions-prod.sh --yes >>"$LOG_FILE" 2>&1 && log "functions.php restored" || log "functions.php restore FAILED"
fi
if [ "${FUNNEL_DRY_RUN:-0}" = "1" ]; then log "Dry run — stopping after scoreboard + circuit breaker."; exit 0; fi

# --- 2. Quinn ----------------------------------------------------------------
log "Running Quinn ($MODEL)…"
DIGEST="$WT/reports/funnel/digest-$TODAY.md"
GUARD_LINE="CIRCUIT BREAKER TODAY: status=$GUARD_STATUS action=$GUARD_ACTION$( [ -n "$GUARD_ROLLBACK_TO" ] && echo " rollbackTo=$GUARD_ROLLBACK_TO" ) — full report: $GUARD_MD. If the runner rolled back, the ledger row and incident file are already written; you are in incident mode."
if claude -p "$(cat "$PROMPT_FILE")

$GUARD_LINE" \
    --model "$MODEL" \
    --max-turns "$MAX_TURNS" \
    --permission-mode acceptEdits \
    --allowedTools "Agent,Read,Glob,Grep,Bash,Write,Edit,WebSearch,WebFetch,mcp__google-analytics__*,mcp__gsc__*,mcp__mediavine-reporting__*" \
    >"$WT/reports/funnel/quinn-$TODAY.out" 2>>"$LOG_FILE"; then
  log "Quinn finished."
else
  log "Quinn exited non-zero (see logs)."
fi
# The digest is the deliverable; Quinn writes it, we also keep stdout as a fallback.
if [ -f "$DIGEST" ]; then
  cp "$DIGEST" "$PROJECT_DIR/reports/funnel/"
else
  cp "$WT/reports/funnel/quinn-$TODAY.out" "$PROJECT_DIR/reports/funnel/digest-$TODAY.md"
  log "Quinn did not write the digest file — saved stdout as the digest."
fi
# Operator-facing files Quinn edited on its branch are on origin/main after its merge; also sync the queue so the operator's tree is current.
for f in .claude/agents/mhm-funnel/operator-queue.md .claude/agents/mhm-funnel/experiments.md .claude/agents/mhm-funnel/ideas-inbox.md; do
  [ -f "$WT/$f" ] && ! cmp -s "$WT/$f" "$PROJECT_DIR/$f" && cp "$WT/$f" "$PROJECT_DIR/$f" && log "synced $f"
done
# Ledger + incidents: deploy-verify.sh writes to both trees, but merge any rows Quinn's worktree has that the operator's does not.
if [ -f "$WT/reports/funnel/changelog.md" ]; then
  mkdir -p "$PROJECT_DIR/reports/funnel"
  python3 - "$WT/reports/funnel/changelog.md" "$PROJECT_DIR/reports/funnel/changelog.md" <<'PY'
import sys,os
src,dst=sys.argv[1],sys.argv[2]
rows=[l for l in open(src) if l.startswith('| 20')]
have=set(open(dst).read().splitlines()) if os.path.exists(dst) else set()
if not os.path.exists(dst):
    open(dst,'w').write(''.join(l for l in open(src) if not l.startswith('| 20')))
with open(dst,'a') as f:
    for r in rows:
        if r.rstrip('\n') not in have: f.write(r)
PY
fi
[ -d "$WT/reports/funnel/incidents" ] && mkdir -p "$PROJECT_DIR/reports/funnel/incidents" && cp -n "$WT"/reports/funnel/incidents/*.md "$PROJECT_DIR/reports/funnel/incidents/" 2>/dev/null
log "Done. Digest: reports/funnel/digest-$TODAY.md"
