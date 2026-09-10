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
# 4. Creates one worktree per agent, then runs Quinn (claude -p) with the daily prompt, the guardrail
#    status and the agent worktree paths.
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
MODEL="${FUNNEL_MODEL:-claude-fable-5-1}"   # operator 2026-09-05: Fable is the advisor; specialists get cheaper models per operating-model.md §7
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
  local d
  for d in "$WT" "$WT"-*; do [ -d "$d" ] && git worktree remove --force "$d" >/dev/null 2>&1; done
  git worktree prune >/dev/null 2>&1 || true
}
trap cleanup EXIT

cd "$WT" || exit 1
# Secrets: COPY .env.local into the throwaway worktrees — never symlink it. Webpack follows the link and
# parses the target as a module, which breaks `next build` (Quinn, 2026-09-02). .gitignore covers .env*,
# and cleanup() deletes the worktrees, so the copies never outlive the run.
copy_env() {  # $1 worktree
  if [ -f "$PROJECT_DIR/.env.local" ]; then cp "$PROJECT_DIR/.env.local" "$1/.env.local"; chmod 600 "$1/.env.local"; fi
  if [ -f "$PROJECT_DIR/scripts/mcp-mediavine/.env.local" ] && [ -d "$1/scripts/mcp-mediavine" ]; then
    cp "$PROJECT_DIR/scripts/mcp-mediavine/.env.local" "$1/scripts/mcp-mediavine/.env.local"; chmod 600 "$1/scripts/mcp-mediavine/.env.local"
  fi
  return 0
}
# A checkout must NEVER carry a node_modules symlink. PR #20 accidentally tracked one pointing at the
# operator's tree (.gitignore's `node_modules/` ignores directories, not links); `npm ci` through it
# emptied the operator's node_modules on 2026-09-02 and concurrent checkouts kept restoring the link
# mid-run. Drop any link before touching npm, and never share the operator's install with the run.
drop_nm_link() { if [ -L "$1/node_modules" ]; then rm "$1/node_modules"; log "removed node_modules symlink in $1"; fi; return 0; }
copy_env "$WT"; drop_nm_link "$WT"
log "npm ci + prisma generate in the worktree (the operator's node_modules is never shared or touched)"
npm ci --no-audit --no-fund >>"$LOG_FILE" 2>&1 || { log "npm ci failed"; exit 1; }
npx prisma generate >>"$LOG_FILE" 2>&1 || log "prisma generate failed (continuing; DB section will report)"
mkdir -p "$WT/reports/funnel" "$WT/reports/funnel/drafts" "$WT/logs"

# --- one worktree per agent ---------------------------------------------------
# Five agents committing in ONE checkout race on git state: on 2026-09-02 three of five PRs carried other
# agents' commits and Quinn had to rebuild them by hand. Each agent now gets its own detached checkout of
# origin/main with its OWN `npm ci` (secrets copied); Quinn passes the paths down and every agent does all
# git/build/test/PR work inside its own directory.
# Why not a symlink into Quinn's node_modules: one shared link is a single point of failure — Quinn's
# install was emptied mid-run on 2026-09-07 (4 agents reinstalled by hand) and again on 2026-09-08 (Quinn's
# own `npm install` for a lockfile change killed Nova's build). `--prefer-offline` makes the five installs
# ~30–60 s each from the npm cache; the log stays under logs/ (gitignored) so it can never ride into a PR.
export FUNNEL_PRIMARY_WT="$WT"   # deploy-verify.sh mirrors ledger rows + incidents here so Quinn's digest sees them
AGENT_WT_LINE="AGENT WORKTREES — one per agent, each a clean detached checkout of origin/main with its OWN node_modules and .env.local ready. An agent does ALL of its git/branch/build/test/PR/merge/deploy-verify work inside its OWN directory (prefix every Bash command with \`cd <its path> &&\`), never in yours (Quinn: $WT) or another agent's:"
for a in pip sage nova cass rio; do
  AWT="$WT-$a"
  if git worktree add --detach "$AWT" origin/main >>"$LOG_FILE" 2>&1; then
    drop_nm_link "$AWT"; copy_env "$AWT"
    mkdir -p "$AWT/reports/funnel/incidents" "$AWT/logs"
    if ( cd "$AWT" && npm ci --prefer-offline --no-audit --no-fund >"$AWT/logs/npm-ci.log" 2>&1 && npx prisma generate >>"$AWT/logs/npm-ci.log" 2>&1 ); then
      log "npm ci ok in $AWT ($(ls "$AWT/node_modules" 2>/dev/null | wc -l | tr -d ' ') entries)"
    else
      log "npm ci FAILED in $AWT — see $AWT/logs/npm-ci.log; the agent must run npm ci itself before building"
    fi
    AGENT_WT_LINE="$AGENT_WT_LINE $a=$AWT"
  else
    log "worktree for $a failed — that agent must work in Quinn's worktree today"
  fi
done
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
# seed the worktree copy so Quinn can read what changed since the last digest — APPEND-ONLY. The committed
# copy on origin/main can be newer than the operator's (resolved incidents, rows folded into a daily PR);
# a blind `cp` overwrote the resolved 2026-09-07 incident file on 09-08 and again on 09-09.
if [ -f "$PROJECT_DIR/reports/funnel/changelog.md" ]; then
  if [ -f "$WT/reports/funnel/changelog.md" ]; then
    grep -F -x -v -f "$WT/reports/funnel/changelog.md" "$PROJECT_DIR/reports/funnel/changelog.md" | grep -E '^\| 20[0-9]{2}-' >>"$WT/reports/funnel/changelog.md" || true
  else
    cp "$PROJECT_DIR/reports/funnel/changelog.md" "$WT/reports/funnel/changelog.md"
  fi
fi
if [ -d "$PROJECT_DIR/reports/funnel/incidents" ]; then
  mkdir -p "$WT/reports/funnel/incidents"
  for f in "$PROJECT_DIR"/reports/funnel/incidents/*.md; do
    [ -f "$f" ] || continue
    [ -e "$WT/reports/funnel/incidents/$(basename "$f")" ] || cp "$f" "$WT/reports/funnel/incidents/"
  done
fi

# --- 0c. catalog ingest (Nova, E28, PR #73) -----------------------------------
# Incremental, idempotent, <=25 posts/run; a normal day fetches 0–3 pages. Non-fatal: the loop runs either way,
# and the wrapper's own summary line is copied into this log so "did not run" is never silent.
log "Catalog ingest (incremental)…"
if [ -x "$WT/scripts/agents/catalog-ingest-daily.sh" ]; then
  "$WT/scripts/agents/catalog-ingest-daily.sh" >>"$LOG_FILE" 2>&1 || log "catalog ingest exited non-zero (non-fatal)"
  [ -f "$WT/logs/catalog-ingest.log" ] && tail -n 1 "$WT/logs/catalog-ingest.log" >>"$LOG_FILE"
else
  log "catalog-ingest-daily.sh not present or not executable — skipped"
fi

# --- 0d. operator-did probe (Rio, E35) ------------------------------------------
# Read-only: Vercel Production env var NAMES (via the operator tree, the only Vercel-linked checkout), Patreon
# tier titles/prices/published/patron_count, functions.php markers — diffed against yesterday's snapshot so the
# digest thanks the operator the same day instead of re-asking. Exit 2 = could not observe (not logged in, no
# token); non-fatal either way. Its own summary line lands in logs/operator-did.log and is tailed here.
log "Operator-did probe…"
if [ -f "$WT/scripts/agents/operator-did-probe.ts" ]; then
  (cd "$WT" && MHM_OPERATOR_TREE="$PROJECT_DIR" npx tsx scripts/agents/operator-did-probe.ts >"$WT/reports/funnel/operator-did.out" 2>>"$LOG_FILE") \
    || log "operator-did probe exited non-zero (non-fatal; 2 = could-not-run, 1 = real failure)"
  [ -f "$WT/logs/operator-did.log" ] && tail -n 1 "$WT/logs/operator-did.log" >>"$LOG_FILE"
else
  log "operator-did-probe.ts not present — skipped"
fi

# --- 1. scoreboard ----------------------------------------------------------
# MHM_PROJECT_DIR: the scoreboard writes its dated files to that dir (default: the operator tree). Without it
# the copy below found nothing and Quinn regenerated the scoreboard by hand on 09-04, 09-08 and 09-09.
log "Scoreboard…"
if MHM_PROJECT_DIR="$WT" npx tsx scripts/agents/funnel-scoreboard.ts >"$WT/reports/funnel/scoreboard.out" 2>>"$LOG_FILE"; then
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
# The nested CLI must authenticate on its own (keychain OAuth), not through the desktop session that
# launched the scheduled task: strip the host-session vars so it self-refreshes, and prove it can reach
# the API before spending the run. A dead token is the #1 silent failure of this run (2026-09-02: the
# keychain token had expired in April; the API returned 401 ten times and Quinn never started).
CLAUDE_CLEAN=(env -u ANTHROPIC_BASE_URL -u CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH -u CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH \
  -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN \
  -u CLAUDE_CODE_HOST_SESSION_ID -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_PID)
PREFLIGHT_OUT="$PROJECT_DIR/logs/funnel-preflight-$TODAY.json"
claude_preflight() {
  perl -e 'alarm 240; exec @ARGV' "${CLAUDE_CLEAN[@]}" claude -p "Reply with exactly: ok" --model "$MODEL" --max-turns 1 \
    --strict-mcp-config --mcp-config '{"mcpServers":{}}' --output-format json </dev/null >"$PREFLIGHT_OUT" 2>>"$LOG_FILE"
  grep -q '"is_error":false' "$PREFLIGHT_OUT"
}
# Why the preflight failed — the fix differs, so the digest must not blame auth for everything
# (2026-09-06/07: the CLI was 2.1.108, Fable needs >= 2.1.251; the digest said "run claude auth login" and
# two days were lost). Echoes one of: CLI_TOO_OLD | AUTH | OTHER, plus a short sanitized excerpt.
preflight_diagnosis() {
  local out; out="$(tr -d '\n\r' <"$PREFLIGHT_OUT" 2>/dev/null | head -c 4000)"
  local excerpt; excerpt="$(printf '%s' "$out" | grep -oE '"(error|message)":"[^"]{0,200}' | head -2 | tr '\n' ' ' | sed -E 's/[A-Za-z0-9_-]{25,}/<redacted>/g')"
  if printf '%s' "$out" | grep -q 'claude_code_version_too_old'; then echo "CLI_TOO_OLD|$excerpt"
  elif printf '%s' "$out" | grep -qiE 'authentication|not logged in|401|invalid.*token|oauth'; then echo "AUTH|$excerpt"
  else echo "OTHER|$excerpt"; fi
}
token_expiry() {
  security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null | python3 -c 'import json,sys,datetime
try:
    e=(json.load(sys.stdin).get("claudeAiOauth") or {}).get("expiresAt")
    print(datetime.datetime.fromtimestamp(e/1000).strftime("%Y-%m-%d %H:%M") if e else "unknown")
except Exception:
    print("unknown")' 2>/dev/null || echo unknown
}
DIGEST="$WT/reports/funnel/digest-$TODAY.md"
if ! claude_preflight; then
  EXP="$(token_expiry)"
  DIAG="$(preflight_diagnosis)"; DIAG_KIND="${DIAG%%|*}"; DIAG_EXCERPT="${DIAG#*|}"
  CLI_VER="$(claude --version 2>/dev/null | head -1 || echo unknown)"
  case "$DIAG_KIND" in
    CLI_TOO_OLD) CAUSE="The installed Claude CLI ($CLI_VER) is too old for model \`$MODEL\` (the API answered \`claude_code_version_too_old\`). Auth is fine. **Run \`brew upgrade claude-code@latest\`** (the plain \`claude-code\` cask stops at 2.1.236; Fable needs ≥ 2.1.251)";;
    AUTH)        CAUSE="The Claude CLI could not authenticate headlessly (keychain OAuth token expiry: $EXP; the API rejected the token and it could not be refreshed). **Open a terminal and run \`claude auth login\`**";;
    *)           CAUSE="The Claude CLI preflight failed for a reason that is neither auth nor version — see logs/funnel-preflight-$TODAY.json (excerpt: ${DIAG_EXCERPT:-none}). Try \`claude -p 'ok' --model $MODEL\` in a terminal";;
  esac
  log "🔴 Quinn cannot run: preflight=$DIAG_KIND cli=$CLI_VER token-expiry=$EXP ${DIAG_EXCERPT:+excerpt=$DIAG_EXCERPT}"
  GUARD_SUMMARY="status=$GUARD_STATUS action=$GUARD_ACTION$( [ -n "$GUARD_ROLLBACK_TO" ] && echo " rollbackTo=$GUARD_ROLLBACK_TO" )"
  cat >"$PROJECT_DIR/reports/funnel/digest-$TODAY.md" <<EOF
# Funnel digest — $TODAY (DEGRADED: Quinn did not run)

🔴 **Quinn could not start.** $CAUSE, then run \`npm run funnel:daily\` or wait for tomorrow's pulse. No agent can fix this. Reminder: the 06:30 / 18:30 routines only fire while the Claude desktop app is open on this Mac.

What still ran today (deterministic scripts, no LLM):
- Scoreboard: reports/funnel/$TODAY.md
- Circuit breaker: $GUARD_MD — $GUARD_SUMMARY
- Ledger: reports/funnel/changelog.md (the 18:30 evening deploy check still runs on its own)

Changed today: nothing merged by the team (Quinn did not run).
EOF
  log "Wrote degraded digest: reports/funnel/digest-$TODAY.md"
  exit 4
fi
log "Running Quinn ($MODEL)…"
GUARD_LINE="CIRCUIT BREAKER TODAY: status=$GUARD_STATUS action=$GUARD_ACTION$( [ -n "$GUARD_ROLLBACK_TO" ] && echo " rollbackTo=$GUARD_ROLLBACK_TO" ) — full report: $GUARD_MD. If the runner rolled back, the ledger row and incident file are already written; you are in incident mode."
if "${CLAUDE_CLEAN[@]}" claude -p "$(cat "$PROMPT_FILE")

$GUARD_LINE

$AGENT_WT_LINE" \
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
