#!/usr/bin/env bash
# scripts/agents/deploy-verify.sh — Rule 1 and the fast half of Rule 2, for Vercel + WordPress.
#
#   Rule 1: "Always check if you broke something — Vercel during deployment, or viewing WordPress.
#            Restore from WordPress backups or roll back Vercel."
#   Rule 2: "If your change significantly hurts RPM and revenue we go under. Fix it quickly."
#
# What it checks (scripts/agents/smoke-render.ts + check-blog-sidebar.sh + Vercel 5xx logs):
#   - every key production page renders in headless Chromium with the Mediavine loader,
#     the sidebar anchor (aside#secondary) and in-content anchors (.mv-ads) present after hydration
#   - no uncaught client errors / Next.js "Application error"
#   - the WordPress blog still carries every CRITICAL_MARKER (sidebar, search rewrite, cross-links)
#   - no flood of 5xx in Vercel runtime logs
# What it does on failure: rolls Vercel production back to the previous READY deployment and/or
# re-pushes functions.php from git, re-checks, writes reports/funnel/incidents/<stamp>.md.
# Every run appends a row to reports/funnel/changelog.md — the operator's ledger of what changed.
#
# Modes:
#   --after-merge [--sha <commit>] [--label "<who / PR>"] [--wait-min 25]
#         wait for the production deploy of <sha> (default: the newest), verify, roll back on failure
#   --check [--label "<who>"]        verify what is live now (evening check); roll back / restore on failure
#   --rollback [--to <url>]          roll production back (default: previous READY deployment), then verify
#   --smoke-only                     verify only; never roll back (exit 1 on failure)
# Env: FUNNEL_NO_ROLLBACK=1 → report only, never roll back.
# Exit: 0 pass · 1 smoke-only failure · 2 failed and rolled back / build failed · 3 still failing after rollback
# A check that CANNOT RUN (no node_modules/playwright in a fresh worktree, Chromium missing) is INCONCLUSIVE:
# it is logged, the ledger row says INCONCLUSIVE, exit stays 0 and nothing is rolled back. Only a smoke run that
# actually rendered pages and saw them fail (or a 5xx flood / missing blog markers) can trigger a rollback.
# (2026-09-05: two false-alarm rollbacks in 24 h came from 'smoke-render: could not run' in dependency-less worktrees.)
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OPERATOR_DIR="/Users/eputnam/java_projects/MHMFinds"
PROD_ALIAS="musthavemods.com"
MODE=""; SHA=""; LABEL="manual"; TO=""; WAIT_MIN=25
while [ $# -gt 0 ]; do
  case "$1" in
    --after-merge|--check|--rollback|--smoke-only) MODE="${1#--}" ;;
    --sha) SHA="$2"; shift ;;
    --label) LABEL="$2"; shift ;;
    --to) TO="$2"; shift ;;
    --wait-min) WAIT_MIN="$2"; shift ;;
    *) echo "unknown argument: $1"; exit 64 ;;
  esac
  shift
done
[ -n "$MODE" ] || { sed -n '2,29p' "$0"; exit 64; }

TS="$(date '+%Y-%m-%d %H:%M')"; STAMP="$(date '+%Y-%m-%d-%H%M%S')"
INC_DIR="$ROOT/reports/funnel/incidents"; mkdir -p "$INC_DIR" "$ROOT/logs"
LOG="$ROOT/logs/deploy-verify.log"
log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

# ---------------------------------------------------------------- vercel helpers
vls() { (cd "$ROOT" && vercel ls --format json --yes 2>/dev/null); }
current_prod() {  # inspect prints on stderr; the CLI occasionally aborts, so retry
  local u i
  for i in 1 2 3; do
    u="$( (cd "$ROOT" && vercel inspect "$PROD_ALIAS" 2>&1) 2>/dev/null | awk '$1=="url"{print $2; exit}')"  # outer 2> hides the CLI's occasional "Abort trap"
    [ -n "$u" ] && { echo "$u"; return 0; }; sleep 3
  done
  return 1
}
previous_ready() {  # newest READY production deployment older than $1
  vls | python3 -c '
import json,sys
cur=sys.argv[1].replace("https://","")
d=[x for x in json.load(sys.stdin)["deployments"] if x.get("target")=="production"]
d.sort(key=lambda x:x["createdAt"], reverse=True)
c=[x for x in d if x["url"]==cur]; t=c[0]["createdAt"] if c else 10**20
for x in d:
    if x["createdAt"]<t and x["state"]=="READY": print("https://"+x["url"]); break
' "$1"
}
find_deploy() {  # prints "STATE https://url" for the newest production deploy of sha $1 (or newest overall if empty)
  vls | python3 -c '
import json,sys
sha=sys.argv[1]
d=[x for x in json.load(sys.stdin)["deployments"] if x.get("target")=="production"]
d.sort(key=lambda x:x["createdAt"], reverse=True)
for x in d:
    if not sha or ((x.get("meta") or {}).get("githubCommitSha","")).startswith(sha):
        print(x["state"], "https://"+x["url"]); break
' "$1"
}

# ---------------------------------------------------------------- checks
FAILS=""; FIVEXX=0; INCONCLUSIVE=""; SMOKE_JSON="$ROOT/logs/smoke-$STAMP.json"
addfail() { FAILS="${FAILS}${FAILS:+; }$1"; }
smoke_dir() {  # first tree that has the deps smoke-render needs — fresh runner worktrees have no node_modules
  local d
  for d in "$ROOT" "${FUNNEL_PRIMARY_WT:-}" "$OPERATOR_DIR"; do
    [ -n "$d" ] && [ -d "$d/node_modules/playwright" ] && [ -f "$d/scripts/agents/smoke-render.ts" ] && { echo "$d"; return 0; }
  done
  return 1
}
smoke() {
  FAILS=""; INCONCLUSIVE=""
  local sdir out="$SMOKE_JSON.out"
  rm -f "$SMOKE_JSON"
  if sdir="$(smoke_dir)"; then
    log "check: rendering production pages in headless Chromium (deps from $sdir)…"
    (cd "$sdir" && npx tsx scripts/agents/smoke-render.ts --json "$SMOKE_JSON") >"$out" 2>&1; cat "$out" >>"$LOG"
    if [ -f "$SMOKE_JSON" ]; then  # smoke-render writes the JSON only after it really rendered every page
      local fl
      fl="$(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(" | ".join(f["path"]+" -> "+", ".join(f["failures"]) for f in d["failed"]))' "$SMOKE_JSON" 2>/dev/null)"
      [ -n "$fl" ] && addfail "smoke-render: $fl"
    else
      INCONCLUSIVE="smoke-render could not run: $(grep -m1 -oE "Cannot find module '[^']*'|browserType\.launch.{0,100}|Error: .{0,100}" "$out" || echo 'no output')"
    fi
  else
    INCONCLUSIVE="smoke-render could not run: no tree with node_modules/playwright (looked in $ROOT, ${FUNNEL_PRIMARY_WT:-<unset>}, $OPERATOR_DIR)"
  fi
  [ -n "$INCONCLUSIVE" ] && log "WARN: $INCONCLUSIVE — a check that cannot run is INCONCLUSIVE, never a rollback trigger"
  log "check: WordPress critical markers…"
  local blog_out
  if ! blog_out="$("$ROOT/scripts/agents/check-blog-sidebar.sh" --quiet 2>&1)"; then
    addfail "check-blog-sidebar: $(echo "$blog_out" | grep FAIL | head -3 | tr '\n' ' ')"
  fi
  local n5
  n5="$( (cd "$ROOT" && vercel logs --no-branch --environment production --status-code 5xx --since 15m 2>/dev/null) | grep -cE '^[0-9]{2}:[0-9]{2}:[0-9]{2}' || true)"
  FIVEXX="${n5:-0}"
  # The WordPress proxy returns a trickle of 502s for font files at all times; only a flood counts.
  [ "$FIVEXX" -gt 60 ] && addfail "$FIVEXX 5xx responses in the last 15 min (threshold 60)"
  log "check: 5xx in last 15m = $FIVEXX · failures: ${FAILS:-none}${INCONCLUSIVE:+ · smoke INCONCLUSIVE}"
  [ -z "$FAILS" ]
}
verdict() { if [ -n "$INCONCLUSIVE" ]; then echo "INCONCLUSIVE"; else echo "PASS"; fi; }
vnotes() { echo "${INCONCLUSIVE:+$INCONCLUSIVE · blog markers + 5xx checked, smoke NOT — verify by hand: npx tsx scripts/agents/smoke-render.ts · }$1"; }
do_rollback() {
  log "ROLLING BACK production to $1"
  if (cd "$ROOT" && vercel rollback "$1" --timeout 5m --yes >>"$LOG" 2>&1) || (cd "$ROOT" && vercel rollback "$1" --timeout 5m >>"$LOG" 2>&1); then
    sleep 20; log "rollback done; production now serves $(current_prod)"; return 0
  fi
  log "rollback command FAILED — see $LOG"; return 1
}
restore_functions_php() {
  log "blog markers missing → re-pushing functions.php from git (this tree's copy = origin/main in the runner)"
  if "$ROOT/scripts/staging/push-blog-functions-prod.sh" --yes >>"$LOG" 2>&1; then log "functions.php re-pushed"; else log "functions.php re-push FAILED — see $LOG"; fi
}
ledger() {  # $1 result, $2 notes — written to this checkout, Quinn's primary worktree (if set) and the operator's tree
  local dir f seen=" "
  for dir in "$ROOT/reports/funnel" "${FUNNEL_PRIMARY_WT:-}/reports/funnel" "$OPERATOR_DIR/reports/funnel"; do
    [ "$dir" = "/reports/funnel" ] && continue
    case "$seen" in *" $dir "*) continue;; esac; seen="$seen$dir "
    [ -d "$dir" ] || continue
    f="$dir/changelog.md"
    [ -f "$f" ] || printf '# Production change ledger\n\nAppended automatically by `scripts/agents/deploy-verify.sh` on every production deploy, evening check and rollback, so the operator can see exactly what changed and whether it was verified. Newest at the bottom.\n\n| when | mode | who / what | commit | deployment | result | notes |\n|---|---|---|---|---|---|---|\n' >"$f"
    printf '| %s | %s | %s | %s | %s | %s | %s |\n' "$TS" "$MODE" "$LABEL" "${SHA:0:7}" "${DEPLOY_URL:-}" "$1" "$(echo "$2" | tr '|' '/' | tr '\n' ' ')" >>"$f"
  done
}
incident() {  # $1 title, $2 action taken
  local f="$INC_DIR/$STAMP.md"
  {
    echo "# Incident $TS — $1"; echo
    echo "**Mode:** $MODE · **Label:** $LABEL · **Commit:** ${SHA:-n/a} · **Deployment:** ${DEPLOY_URL:-n/a}"; echo
    echo "## Failures"; echo "$FAILS" | tr ';' '\n' | sed 's/^ */- /'; echo
    echo "## Action taken"; echo "$2"; echo
    echo "## For Quinn"
    echo "- Lead today's digest with this incident. No Tier 1 merges until it is closed."
    echo "- Root-cause the rolled-back change. A fix PR must pass \`npx tsx scripts/agents/smoke-render.ts --base <its preview URL>\` before it is merged again."
    echo "- Smoke output: $SMOKE_JSON"
  } >"$f"
  log "incident written: $f"
  local d
  for d in "${FUNNEL_PRIMARY_WT:-}" "$OPERATOR_DIR"; do
    [ -n "$d" ] && [ "$d" != "$ROOT" ] && { mkdir -p "$d/reports/funnel/incidents"; cp "$f" "$d/reports/funnel/incidents/" 2>/dev/null; }
  done
}
fail_and_fix() {  # $1 = rollback target (may be empty)
  local first="$FAILS"
  if [ "${FUNNEL_NO_ROLLBACK:-0}" = "1" ]; then
    ledger "FAIL (no-rollback mode)" "$first"; incident "verification failed" "FUNNEL_NO_ROLLBACK=1 — nothing rolled back. Operator must act."; exit 2
  fi
  if echo "$first" | grep -q "smoke-render\|5xx"; then
    if [ -n "$1" ]; then do_rollback "$1"; else log "no rollback target known"; fi
  fi
  if echo "$first" | grep -q "check-blog-sidebar"; then restore_functions_php; fi
  if smoke; then
    FAILS="$first"; ledger "ROLLED BACK -> ${1:-functions.php restored}" "$(vnotes "was: $first")"
    incident "verification failed; rolled back" "Rolled production back to ${1:-(unchanged)}${first##*check-blog-sidebar*} and/or re-pushed functions.php. Re-check PASSES."; exit 2
  fi
  local second="$FAILS"; FAILS="$first"
  ledger "ROLLED BACK, STILL FAILING" "was: $first / now: $second"
  incident "still failing after rollback" "Rolled back to ${1:-(no target)}; re-check STILL fails: $second. Escalate to the operator: Vercel dashboard, BigScoots backup restore."; exit 3
}

# ---------------------------------------------------------------- modes
case "$MODE" in
  after-merge)
    PREV="$(current_prod)"; log "production before: ${PREV:-unknown} · waiting for deploy of ${SHA:-newest} (≤${WAIT_MIN}m)"
    START=$(date +%s); DEPLOY_URL=""
    while :; do
      read -r STATE URL <<<"$(find_deploy "$SHA")"
      if [ -n "${URL:-}" ] && { [ -n "$SHA" ] || [ "$URL" != "$PREV" ]; }; then
        case "$STATE" in
          READY) DEPLOY_URL="$URL"; break ;;
          ERROR|CANCELED)
            DEPLOY_URL="$URL"; ledger "BUILD $STATE" "never promoted; production still $PREV"
            FAILS="Vercel build $STATE for ${SHA:-newest} ($URL)"; incident "build $STATE" "Nothing to roll back — the build failed before promotion. Production still serves $PREV. Fix the build (vercel inspect $URL --logs)."; exit 2 ;;
        esac
      fi
      if [ $(( $(date +%s) - START )) -ge $(( WAIT_MIN * 60 )) ]; then
        ledger "TIMEOUT" "no READY production deploy for ${SHA:-newest} within ${WAIT_MIN}m; production still $PREV"; exit 2
      fi
      sleep 30
    done
    log "deployment READY: $DEPLOY_URL"; sleep 15
    CUR="$(current_prod)"; [ "$CUR" = "$DEPLOY_URL" ] || log "note: alias serves $CUR (expected $DEPLOY_URL) — verifying what is live"
    if smoke; then ledger "$(verdict)" "$(vnotes "verified live · 5xx/15m=$FIVEXX")"; log "$(verdict)"; exit 0; fi
    fail_and_fix "$PREV" ;;
  check)
    DEPLOY_URL="$(current_prod)"; PREV="$(previous_ready "$DEPLOY_URL")"
    log "checking live production $DEPLOY_URL (rollback target if needed: ${PREV:-none})"
    if smoke; then ledger "$(verdict)" "$(vnotes "evening/ad-hoc check · 5xx/15m=$FIVEXX")"; log "$(verdict)"; exit 0; fi
    fail_and_fix "$PREV" ;;
  rollback)
    CUR="$(current_prod)"; TARGET="${TO:-$(previous_ready "$CUR")}"; DEPLOY_URL="$TARGET"
    [ -n "$TARGET" ] || { log "no rollback target"; exit 2; }
    do_rollback "$TARGET" || exit 2
    if smoke; then ledger "ROLLED BACK from $CUR" "$(vnotes "requested by $LABEL · re-check passes")"; exit 0; fi
    ledger "ROLLED BACK from $CUR, STILL FAILING" "$FAILS"; incident "rollback did not clear the failure" "Rolled back $CUR → $TARGET; still failing: $FAILS"; exit 3 ;;
  smoke-only)
    DEPLOY_URL="$(current_prod)"
    if smoke; then ledger "$(verdict)" "$(vnotes "smoke-only · 5xx/15m=$FIVEXX")"; exit 0; fi
    ledger "FAIL (smoke-only)" "$FAILS"; exit 1 ;;
esac
