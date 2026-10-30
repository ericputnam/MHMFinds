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
# Quinn's prompt comes from the clean origin/main worktree ($WT, created below), not from the operator's
# checkout: the operator tree is on a feature branch where scripts/agents/funnel-*.{md,sh,ts} are UNTRACKED
# stale copies (09-10: prompt 20 lines behind, runner 55 lines behind — PR #74's fixes never ran).
# MHM_PROMPT_FILE overrides; the operator-tree copy is only the fallback if main has no prompt.
PROMPT_FILE="${MHM_PROMPT_FILE:-}"
MODEL="${FUNNEL_MODEL:-claude-fable-5-1}"   # operator 2026-09-05: Fable is the advisor; specialists get cheaper models per operating-model.md §7
MAX_TURNS="${FUNNEL_MAX_TURNS:-400}"

mkdir -p "$PROJECT_DIR/logs" "$WORKTREE_ROOT" "$PROJECT_DIR/reports/funnel"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# >>> day-lock
# E176 (2026-10-07): one runner per calendar day. On 10-07 the Claude app resumed the 10-05 scheduled session after a
# 2-day sleep (runner pid 78149, 06:52:52) and, once that session's query ended while its runner kept going, also
# spawned the 10-07 catch-up session (runner pid 80394, 06:55:00): two scoreboards, two guardrails, a duplicate Quinn
# that had to be SIGTERMed, and a second runner polling the ledger. The app's per_task_limit counts live *queries*,
# not live runners, so the guard has to live here. `mkdir` is atomic (macOS bash 3.2 has no flock). The holder writes
# its pid inside; a second start on the same TODAY logs DUPLICATE RUN and exits 0 BEFORE it touches a worktree, sets a
# cleanup trap or writes a digest. The holder's EXIT trap releases the lock (so a deliberate later re-run still works);
# a holder that died without its trap (kill -9, power loss) leaves a stale lock, broken with a log line when its pid is
# dead (or, if no pid was ever written, once the lock is older than DAY_LOCK_EMPTY_GRACE_S). A live-but-unsignalable
# pid (EPERM) counts as alive: "could not tell" never breaks a lock. FUNNEL_ALLOW_SECOND_RUN=1 skips the lock (manual
# use only). Self-contained: __tests__/unit/runner-day-lock.test.ts extracts this block and runs it under /bin/bash 3.2.
DAY_LOCK="${FUNNEL_DAY_LOCK_DIR:-$PROJECT_DIR/logs}/funnel-run-$TODAY.lock"
day_lock_holder_alive() {  # $1 pid -> rc 0 alive (or cannot tell), 1 dead
  kill -0 "$1" 2>/dev/null && return 0
  [ "$(ps -p "$1" -o pid= 2>/dev/null | tr -d ' ')" = "$1" ]
}
day_lock_acquire() {  # rc 0 this run owns TODAY · 3 another live run owns it (caller exits 0)
  local holder m age tries=0
  while [ "$tries" -lt 2 ]; do
    tries=$((tries + 1))
    if mkdir "$DAY_LOCK" 2>/dev/null; then
      echo "$$" >"$DAY_LOCK/pid"
      log "day-lock: pid $$ owns $TODAY ($DAY_LOCK)"
      return 0
    fi
    holder="$(cat "$DAY_LOCK/pid" 2>/dev/null)"
    case "$holder" in
      '' | *[!0-9]*)
        m="$(stat -f %m "$DAY_LOCK" 2>/dev/null || stat -c %Y "$DAY_LOCK" 2>/dev/null)"
        age=$(( $(date +%s) - ${m:-$(date +%s)} ))
        if [ "$age" -lt "${DAY_LOCK_EMPTY_GRACE_S:-60}" ]; then
          log "DUPLICATE RUN — pid ? owns $TODAY (lock ${age}s old, holder pid not written yet), exiting 0"
          return 3
        fi
        log "day-lock: stale lock for $TODAY — no holder pid after ${age}s, breaking it"
        ;;
      *)
        if day_lock_holder_alive "$holder"; then
          log "DUPLICATE RUN — pid $holder owns $TODAY, exiting 0"
          return 3
        fi
        log "day-lock: stale lock for $TODAY — holder pid $holder is dead, breaking it"
        ;;
    esac
    rm -rf "$DAY_LOCK"
  done
  log "DUPLICATE RUN — another start re-took the $TODAY lock while this one broke a stale one, exiting 0"
  return 3
}
day_lock_release() {  # only the holder releases; never someone else's lock
  [ "$(cat "$DAY_LOCK/pid" 2>/dev/null)" = "$$" ] && rm -rf "$DAY_LOCK" && log "day-lock: pid $$ released $TODAY"
  return 0
}
if [ "${FUNNEL_ALLOW_SECOND_RUN:-0}" = "1" ]; then
  log "day-lock: FUNNEL_ALLOW_SECOND_RUN=1 — not taking the $TODAY lock (manual run)"
else
  day_lock_acquire || exit 0
  trap day_lock_release EXIT   # replaced below by `trap 'cleanup; day_lock_release' EXIT` once worktrees exist
fi
# <<< day-lock

# >>> worktree-reap — never delete a worktree while a process still runs inside it.
# 09-22 (incident 2026-09-22-0655): cleanup() removed every agent worktree while an orphaned deploy-verify was still
# running in one; the orphan rolled production back, wrote its incident file into the deleted directory and its
# ledger rows into three deleted trees. A process that has its cwd inside a worktree is the tree's positive evidence of
# use (deploy-verify, vercel, node and every agent's Bash shell all run with `cd <its worktree>`). Three answers, never
# collapsed: idle -> remove; busy -> wait, then TERM past the ceiling, and LEAVE the tree if anything survives;
# could-not-enumerate (lsof missing / empty) -> leave the tree (the 2-day prune retries, through this same check).
# Self-contained on purpose: __tests__/unit/funnel-runner-cleanup-reap.test.ts extracts this block + cleanup() and
# runs them against real processes.
worktree_cwd_pids() {  # $1 dir -> PIDs whose cwd is inside it (one per line). rc 0 = enumerated, 2 = could not enumerate
  local real out
  real="$(cd "$1" 2>/dev/null && pwd -P)" || return 2
  out="$("${REAP_LSOF:-lsof}" -n -w -d cwd -F pn 2>/dev/null)"
  # Vacuity guard: lsof always sees at least this shell's cwd, so no `p` line at all means lsof did not run.
  printf '%s\n' "$out" | grep -q '^p[0-9]' || return 2
  printf '%s\n' "$out" | REAP_DIR="$real" awk -v self="$$" -v sub_="${BASHPID:-$$}" '
    BEGIN { d = ENVIRON["REAP_DIR"] }
    /^p/ { pid = substr($0, 2) }
    /^n/ { p = substr($0, 2); if ((p == d || index(p, d "/") == 1) && pid != self && pid != sub_) print pid }' | sort -u
  return 0
}
reap_worktrees() {  # $1 wait_s, $2 term_grace_s (-1 = never signal), $3.. dirs. rc 0 all removed, 1 some left in place
  local wait_s="$1" grace="$2" poll="${REAP_POLL_S:-5}" waited=0 d pids all rc unknown termed=0 removed=0 left=0
  shift 2
  while :; do
    all=""; unknown=0
    for d in "$@"; do
      [ -d "$d" ] || continue
      pids="$(worktree_cwd_pids "$d")"; rc=$?
      [ "$rc" -eq 0 ] || unknown=1
      all="$all $pids"
    done
    all="$(echo $all)"
    { [ -z "$all" ] || [ "$unknown" -eq 1 ] || [ "$waited" -ge "$wait_s" ]; } && break
    [ "$waited" -eq 0 ] && log "cleanup: waiting up to ${wait_s}s for live pid(s) in the worktrees: $all"
    sleep "$poll"; waited=$((waited + poll))
  done
  if [ -n "$all" ] && [ "$grace" -ge 0 ]; then
    log "cleanup: ceiling ${wait_s}s reached — SIGTERM to pid(s) still inside the worktrees: $all"
    # shellcheck disable=SC2086
    kill -TERM $all 2>/dev/null; termed=$(echo $all | wc -w | tr -d ' ')
    local g=0
    while [ "$g" -lt "$grace" ]; do
      all=""; for d in "$@"; do [ -d "$d" ] && all="$all $(worktree_cwd_pids "$d")"; done
      [ -z "$(echo $all)" ] && break
      sleep 1; g=$((g + 1))
    done
  fi
  for d in "$@"; do
    [ -d "$d" ] || continue
    pids="$(worktree_cwd_pids "$d")"; rc=$?
    if [ "$rc" -ne 0 ]; then log "cleanup: left in place $d — could not enumerate its processes (unknown, not idle)"; left=$((left + 1)); continue; fi
    if [ -n "$pids" ]; then log "cleanup: left in place $d — live pid(s) $(echo $pids) survived SIGTERM"; left=$((left + 1)); continue; fi
    if git worktree remove --force "$d" >/dev/null 2>&1; then removed=$((removed + 1)); else log "cleanup: git worktree remove failed for $d"; fi
  done
  log "cleanup: reaped $removed worktree(s), left $left in place (waited ${waited}s, SIGTERM to $termed pid(s))"
  [ "$left" -eq 0 ]
}
# <<< worktree-reap

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
# Prune stale worktrees from crashed runs (older than 2 days) — only idle ones: wait 0 s, never signal, so a tree a
# process still runs in (or whose processes cannot be enumerated) is left for a later morning.
STALE_WTS=()
while IFS= read -r d; do [ -n "$d" ] && STALE_WTS+=("$d"); done < <(find "$WORKTREE_ROOT" -maxdepth 1 -type d -name 'funnel-*' -mtime +2 2>/dev/null)
[ "${#STALE_WTS[@]}" -gt 0 ] && reap_worktrees 0 -1 "${STALE_WTS[@]}"
git worktree prune
if ! git worktree add --detach "$WT" origin/main >>"$LOG_FILE" 2>&1; then
  log "git worktree add failed — aborting (operator tree untouched)"; exit 1
fi
cleanup() {
  cd "$PROJECT_DIR" || exit 0
  local d dirs=()
  for d in "$WT" "$WT"-*; do [ -d "$d" ] && dirs+=("$d"); done
  # Wait for (then TERM) anything still running inside the trees before removing them — see worktree-reap above.
  # 30 min covers a full deploy-verify (6–15 min incl. a rollback); the finite cap keeps a hung child from wedging the task.
  [ "${#dirs[@]}" -gt 0 ] && reap_worktrees "${FUNNEL_CLEANUP_WAIT_S:-1800}" "${FUNNEL_CLEANUP_TERM_GRACE_S:-30}" "${dirs[@]}"
  git worktree prune >/dev/null 2>&1 || true
}
trap 'cleanup; day_lock_release' EXIT   # day-lock (E176): release only after the trees are reaped

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

# --- 0. context budget check (SD-12) ----------------------------------------------------
# WARN-only (exit 2 never blocks this run) — it exists so a doc growing unboundedly (the
# CLAUDE.md 45KB->206KB "Prompt is too long" incident, 2026-09-17) is caught the next morning
# instead of the next time it breaks something. Runs against $WT (today's origin/main), the
# same tree Quinn's prompt tells her to check for herself.
if [ -f "$WT/scripts/agents/context-budget.ts" ]; then
  (cd "$WT" && npx tsx scripts/agents/context-budget.ts >>"$LOG_FILE" 2>&1)
  log "context-budget.ts exit $? (WARN-only, never blocks the run)"
else
  log "context-budget.ts not present yet on origin/main — skipping SD-12 check"
fi

# --- 0a. flush any ledger rows that a previous run could not land on main -----------------------
# scripts/agents/ledger-commit.sh (SD: ledger durability fix) lands every deploy-verify ledger row
# directly on origin/main; if a push ever fails 3x it queues the row in
# reports/funnel/ledger-pending.jsonl in THIS (operator) tree — the one place guaranteed to survive
# past this run, unlike the ephemeral per-agent worktrees below. Flush it before anything else runs
# so a row from yesterday doesn't sit lost.
if [ -x "$WT/scripts/agents/ledger-commit.sh" ]; then
  "$WT/scripts/agents/ledger-commit.sh" --flush-pending >>"$LOG_FILE" 2>&1
  log "ledger-commit --flush-pending exit $?"
elif [ -x "$PROJECT_DIR/scripts/agents/ledger-commit.sh" ]; then
  "$PROJECT_DIR/scripts/agents/ledger-commit.sh" --flush-pending >>"$LOG_FILE" 2>&1
  log "ledger-commit --flush-pending (operator-tree copy, origin/main has no ledger-commit.sh yet) exit $?"
else
  log "ledger-commit.sh not present anywhere yet — nothing to flush"
fi

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
for a in pip sage nova cass rio rowan ops; do
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
  for f in mhm-gm mhm-distribution mhm-search-ai mhm-content-creators mhm-capture mhm-product-revenue mhm-catalog-product mhm-platform-ops; do
    cp "$PROJECT_DIR/.claude/agents/$f.md" "$WT/.claude/agents/$f.md" 2>/dev/null || log "bootstrap: $f.md not present in operator tree yet — skipped"
  done
  cp "$PROJECT_DIR"/scripts/agents/funnel-*.{ts,md,sh} "$WT/scripts/agents/" 2>/dev/null
  for f in scripts/agents/revenue-guardrail.ts scripts/agents/deploy-verify.sh scripts/agents/smoke-render.ts scripts/staging/push-blog-functions-prod.sh; do
    cp "$PROJECT_DIR/$f" "$WT/$f" 2>/dev/null
  done
fi
# Ledger rows now land durably on origin/main themselves (scripts/agents/ledger-commit.sh, called from
# deploy-verify.sh's ledger()) — a row committed there during THIS run is already on the $WT checkout
# the moment `git fetch`+worktree-add happened, so in the common case this seed step is a no-op. It
# stays as a safety net for two cases ledger-commit.sh cannot fully cover: (a) rows still sitting in
# ledger-pending.jsonl from before this run's flush landed them, and (b) the operator's own tree having
# rows the run doesn't otherwise see (e.g. hand-written notes). APPEND-ONLY. The committed copy on
# origin/main can be newer than the operator's (resolved incidents, rows folded into a daily PR); a
# blind `cp` overwrote the resolved 2026-09-07 incident file on 09-08 and again on 09-09.
# E126 (2026-09-27): byte-level `grep -x -v` re-appended rows main had RELABELLED or CORRECTED (the
# operator tree keeps the stale originals forever), so Quinn's tree gained 2 duplicate rows that morning.
# Identity-aware merge: a row main already accounts for (same when+mode+commit, or any row for the same
# mode+commit) is skipped and counted — "ledger: flush skipped N duplicate row(s)" in the log.
if [ -f "$PROJECT_DIR/reports/funnel/changelog.md" ]; then
  if [ -x "$WT/scripts/agents/ledger-commit.sh" ] && grep -q -- '--merge-local' "$WT/scripts/agents/ledger-commit.sh"; then
    "$WT/scripts/agents/ledger-commit.sh" --merge-local "$PROJECT_DIR/reports/funnel/changelog.md" --into "$WT/reports/funnel/changelog.md" 2>&1 | grep -E '^ledger: (merge-local|flush skipped|seeded)' | while IFS= read -r l; do log "$l"; done
  elif [ -f "$WT/reports/funnel/changelog.md" ]; then
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

# --- 0c2. IndexNow submit (Sage, E47/E52) ---------------------------------------
# Runs right after ingest so the mods created minutes ago are the ones pushed. --days 2 is deliberate: the
# 7-day default already exceeds HARD_CAP=500 whenever a backfill lands inside the window, and a daily run only
# needs yesterday + today. The script is its own safety net — dry-run is the default (so --apply is explicit
# here), it refuses to POST unless GET /<key>.txt returns 200 with the key body, every URL passes
# isCanonicalUrl(), and HARD_CAP caps the batch no matter what flags say. Non-fatal by design, honouring the
# house 0/2/1 convention: 2 = could-not-run (no DATABASE_URL, DB error, key file down), 1 = IndexNow rejected
# it. Either way the loop continues and the script's own summary line is tailed here, so silence is falsifiable.
# --guides (E121, 2026-09-27): also push WordPress guides published/edited in the same 2 days — guides are
# 16,250 of 16,434 Bing sessions/7d and had never been pushed. A failed WP read logs guides_fetch=partial only.
# --creators-changed (Nova, E218, 2026-10-16): also push the /creator/[slug]/ pages whose newest mod landed in the
# same 2 days (~8 URLs/day). Never --creators (all 549 pages): that lifts the cap and re-pushes unchanged URLs.
log "IndexNow submit…"
if [ -f "$WT/scripts/agents/indexnow-submit.ts" ]; then
  (cd "$WT" && MHM_PROJECT_DIR="$WT" npx tsx scripts/agents/indexnow-submit.ts --apply --days 2 --guides --creators-changed >>"$LOG_FILE" 2>&1)
  INDEXNOW_RC=$?
  case "$INDEXNOW_RC" in
    0) : ;;
    2) log "IndexNow could-not-run (exit 2, non-fatal) — see the summary line below" ;;
    *) log "IndexNow submit FAILED (exit $INDEXNOW_RC, non-fatal) — see the summary line below" ;;
  esac
  [ -f "$WT/logs/indexnow.log" ] && tail -n 1 "$WT/logs/indexnow.log" >>"$LOG_FILE"
else
  log "indexnow-submit.ts not present — skipped"
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

# --- 0e. morning production check (operator 2026-09-22: "I don't think we need an evening check") ----
# The 18:30 `mhm-guardrail-evening` task is disabled; it MISSED ~17 of 21 nights anyway. Its job — re-render
# live production and catch slow failures nobody merged (a WordPress edit, a Vercel env change, an expired
# cert) — now runs here, once, before the scoreboard, so anything broken overnight is rolled back / restored
# before the team ships on top of it and the digest's "Changed today" carries the ledger row.
# deploy-verify.sh --check exits 0 ok · 2 rolled back / could not run · 3 rolled back and STILL FAILING.
# It never aborts the run: Quinn reads the ledger row and the digest leads with any incident.
MORNING_CHECK_RC=""
if [ -x "$WT/scripts/agents/deploy-verify.sh" ]; then
  (cd "$WT" && mkdir -p reports/funnel/incidents logs && ./scripts/agents/deploy-verify.sh --check --label "morning-check") >>"$LOG_FILE" 2>&1
  MORNING_CHECK_RC=$?
  case "$MORNING_CHECK_RC" in
    0) log "Morning production check: PASS" ;;
    3) log "Morning production check: ROLLED BACK AND STILL FAILING (exit 3) — see reports/funnel/incidents/" ;;
    *) log "Morning production check: exit $MORNING_CHECK_RC (2 = rolled back or could not run) — see $WT/logs/deploy-verify.log" ;;
  esac
else
  log "deploy-verify.sh not executable in the worktree — morning production check skipped"
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
# --- 1a. funnel history (feeds /admin/funnel/) -------------------------------
# Non-fatal: the dashboard just shows stale data until the next successful run.
if MHM_PROJECT_DIR="$WT" npx tsx scripts/agents/funnel-history.ts >>"$LOG_FILE" 2>&1; then
  log "history: ok"
else
  log "history: FAILED (non-fatal)"
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
# >>> preflight-watch
# E194 (2026-10-12): on 10-08 and 10-10 the preflight hung at 0 bytes for 2.5 days while the host slept and returned
# only when the operator woke it (both at 10-11 10:55:46). `perl alarm 240` kills a hung CLI on an awake host (rc 142
# in 3 s, tested 10-11) but did not fire across sleep, and the CLI's stderr went untagged into funnel-daily.log, so both
# days were diagnosed OTHER with no excerpt. Now: (a) stderr goes to its own file, logs/funnel-preflight-DATE.stderr,
# and its redacted tail is the excerpt when stdout is empty; (b) a wall-clock watcher OUTSIDE the preflight (this
# runner's poll loop, `date +%s`, which keeps counting across sleep) kills the process tree once
# FUNNEL_PREFLIGHT_WALL_S (300, above the 240 s alarm so the alarm stays first on an awake host) has passed and
# diagnoses HANG; (c) every poll gap longer than FUNNEL_PREFLIGHT_GAP_S is counted as "asleep/suspended", so the
# cause is a number in the log, not an inference. A stopped process does not act on TERM, so it gets TERM, then CONT,
# then KILL. Self-contained: __tests__/unit/runner-preflight-watch.test.ts extracts this block and runs it.
# E290 (2026-10-29): the watcher's wall clock keeps counting while the host sleeps, so a lid closed mid-preflight
# is graded HANG the moment the host wakes — 10-24: killed at 977 s wall of which 974 s asleep (3 s awake); 10-29:
# 1013 s wall, 998 s asleep (15 s awake). A healthy preflight answers in 4–6 s awake, so both were MISSED mornings
# with a working CLI. Now a HANG whose attempt the host slept through (asleep/suspended > 0) is retried ONCE on
# the awake host, after a bounded wait for the network (10-24: three "fetch failed" right after the wake — Wi-Fi
# lags the wake). An awake hang (asleep/suspended = 0, the E194 shape) is never retried; a second slept-through
# attempt is HANG with both attempts in the excerpt. FUNNEL_PREFLIGHT_RETRY=0 disables the retry.
PREFLIGHT_OUT="$PROJECT_DIR/logs/funnel-preflight-$TODAY.json"
PREFLIGHT_ERR="$PROJECT_DIR/logs/funnel-preflight-$TODAY.stderr"
PREFLIGHT_WALL_S="${FUNNEL_PREFLIGHT_WALL_S:-300}"
PREFLIGHT_POLL_S="${FUNNEL_PREFLIGHT_POLL_S:-2}"
PREFLIGHT_GAP_S="${FUNNEL_PREFLIGHT_GAP_S:-30}"
PREFLIGHT_RETRY="${FUNNEL_PREFLIGHT_RETRY:-1}"              # retries allowed after a slept-through attempt
PREFLIGHT_NET_WAIT_S="${FUNNEL_PREFLIGHT_NET_WAIT_S:-90}"   # bounded wait for the network before a retry
PREFLIGHT_NET_URL="${FUNNEL_PREFLIGHT_NET_URL:-https://www.google.com/generate_204}"
PREFLIGHT_HANG=0; PREFLIGHT_WALL=0; PREFLIGHT_SLEPT=0; PREFLIGHT_ATTEMPT=0; PREFLIGHT_PRIOR=""
pf_wait_net() {  # never fails: like the runner's own network wait, it logs and carries on
  local waited=0
  while [ "$waited" -lt "$PREFLIGHT_NET_WAIT_S" ]; do
    if curl -sf -o /dev/null --max-time 3 "$PREFLIGHT_NET_URL"; then log "preflight: network answers after ${waited}s"; return 0; fi
    sleep 3; waited=$((waited + 3))
  done
  log "preflight: network still not answering after ${waited}s — retrying anyway"
  return 0
}
pf_signal_tree() {  # $1 pid $2 signal — children first, so nothing is reparented and missed
  local c
  for c in $(pgrep -P "$1" 2>/dev/null); do pf_signal_tree "$c" "$2"; done
  kill "-$2" "$1" 2>/dev/null
  return 0
}
pf_redact() { tr '\n\r\t' '   ' | sed -E 's/[A-Za-z0-9_-]{25,}/<redacted>/g; s/[`|]/ /g; s/  +/ /g'; }
claude_preflight() {  # rc 0 the CLI answered (on attempt 1 or the one retry) · 1 failed — read preflight_diagnosis
  PREFLIGHT_ATTEMPT=1; PREFLIGHT_PRIOR=""
  while :; do
    claude_preflight_once && return 0
    if [ "$PREFLIGHT_HANG" = 1 ] && [ "$PREFLIGHT_SLEPT" -gt 0 ] && [ "$PREFLIGHT_ATTEMPT" -le "$PREFLIGHT_RETRY" ]; then
      PREFLIGHT_PRIOR="${PREFLIGHT_PRIOR:+$PREFLIGHT_PRIOR; }attempt $PREFLIGHT_ATTEMPT killed after ${PREFLIGHT_WALL}s wall, asleep/suspended ${PREFLIGHT_SLEPT}s"
      log "preflight: host slept through attempt $PREFLIGHT_ATTEMPT (asleep/suspended ${PREFLIGHT_SLEPT}s of ${PREFLIGHT_WALL}s wall) — retrying once the network answers (E290)"
      pf_wait_net
      PREFLIGHT_ATTEMPT=$((PREFLIGHT_ATTEMPT + 1))
      continue
    fi
    return 1
  done
}
claude_preflight_once() {
  local start now last gap pid rc
  : >"$PREFLIGHT_OUT"; : >"$PREFLIGHT_ERR"
  PREFLIGHT_HANG=0; PREFLIGHT_SLEPT=0
  start="$(date +%s)"; last="$start"
  log "preflight: start (attempt $PREFLIGHT_ATTEMPT, wall deadline ${PREFLIGHT_WALL_S}s, stderr → logs/funnel-preflight-$TODAY.stderr)"
  perl -e 'alarm 240; exec @ARGV' "${CLAUDE_CLEAN[@]}" claude -p "Reply with exactly: ok" --model "$MODEL" --max-turns 1 \
    --strict-mcp-config --mcp-config '{"mcpServers":{}}' --output-format json </dev/null >"$PREFLIGHT_OUT" 2>"$PREFLIGHT_ERR" &
  pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    sleep "$PREFLIGHT_POLL_S"
    now="$(date +%s)"; gap=$((now - last)); last="$now"
    [ "$gap" -gt "$PREFLIGHT_GAP_S" ] && PREFLIGHT_SLEPT=$((PREFLIGHT_SLEPT + gap))
    if [ $((now - start)) -ge "$PREFLIGHT_WALL_S" ] && kill -0 "$pid" 2>/dev/null; then
      PREFLIGHT_HANG=1
      pf_signal_tree "$pid" TERM; pf_signal_tree "$pid" CONT
      sleep 3
      pf_signal_tree "$pid" KILL
      break
    fi
  done
  wait "$pid" 2>/dev/null; rc=$?
  PREFLIGHT_WALL=$(( $(date +%s) - start ))
  log "preflight: rc=$rc wall=${PREFLIGHT_WALL}s asleep/suspended=${PREFLIGHT_SLEPT}s hang=$PREFLIGHT_HANG stdout=$(wc -c <"$PREFLIGHT_OUT" | tr -d ' ')B stderr=$(wc -c <"$PREFLIGHT_ERR" | tr -d ' ')B attempt=$PREFLIGHT_ATTEMPT"
  [ "$PREFLIGHT_HANG" = 0 ] && grep -q '"is_error":false' "$PREFLIGHT_OUT"
}
# Why the preflight failed — the fix differs, so the digest must not blame auth for everything
# (2026-09-06/07: the CLI was 2.1.108, Fable needs >= 2.1.251; the digest said "run claude auth login" and
# two days were lost). Echoes one of: CLI_TOO_OLD | AUTH | HANG | OTHER, plus a short sanitized excerpt.
# AUTH reads stdout broadly but stderr only on strict patterns (stderr can mention OAuth without failing on it).
preflight_diagnosis() {
  local out err; out="$(tr -d '\n\r' <"$PREFLIGHT_OUT" 2>/dev/null | head -c 4000)"
  err="$(tail -c 2000 "$PREFLIGHT_ERR" 2>/dev/null | pf_redact)"
  local excerpt; excerpt="$(printf '%s' "$out" | grep -oE '"(error|message)":"[^"]{0,200}' | head -2 | pf_redact)"
  [ -z "$excerpt" ] && [ -n "${err// /}" ] && excerpt="stderr: $(printf '%s' "$err" | tail -c 200)"
  [ "$PREFLIGHT_SLEPT" -gt 0 ] && excerpt="asleep/suspended ${PREFLIGHT_SLEPT}s of ${PREFLIGHT_WALL}s wall; ${excerpt:-no output}"
  [ -n "$PREFLIGHT_PRIOR" ] && excerpt="$PREFLIGHT_PRIOR; attempt $PREFLIGHT_ATTEMPT: ${excerpt:-no output}"
  if printf '%s %s' "$out" "$err" | grep -q 'claude_code_version_too_old'; then echo "CLI_TOO_OLD|$excerpt"
  elif printf '%s' "$out" | grep -qiE 'authentication|not logged in|401|invalid.*token|oauth' \
    || printf '%s' "$err" | grep -qiE 'not logged in|401|authentication_error|invalid.*token'; then echo "AUTH|$excerpt"
  elif [ "$PREFLIGHT_HANG" = 1 ]; then echo "HANG|killed after ${PREFLIGHT_WALL}s wall; $excerpt"
  else echo "OTHER|$excerpt"; fi
}
# <<< preflight-watch
# >>> preflight-missed
# E264 (2026-10-23): on 10-22 the preflight failed in 2 s ("Failed to authenticate: OAuth session expired and could
# not be refreshed"), this runner wrote a DEGRADED digest + scoreboard + guardrail into the operator checkout and
# exited 4 — nothing reached main, no ledger row existed, `token-expiry=unknown` (the keychain read gave nothing
# usable after the failed refresh), and the next scoreboard read "MISSED 2026-10-22: preflight failed · no digest on
# main" — found by Quinn a day later. The keychain item (created 09-02 by `claude auth login`) carried a
# refreshTokenExpiresAt the whole time; nobody read it. This block: (a) lands a MISSED ledger row on main via
# ledger-commit.sh from the run that KNOWS it failed (the next morning's scoreboard stays the independent "did not
# fire" detector for a run that never starts at all); (b) lands the degraded digest and the day's deterministic
# artifacts via digest-land.sh --allow-degraded, so the evidence is durable and the liveness grader reads the day
# as MISSED with "digest on main is DEGRADED" instead of "no digest on main"; (c) reads expiresAt /
# refreshTokenExpiresAt from the keychain (dates and a day count, never the token) on EVERY run, and when the
# refresh token is within FUNNEL_AUTH_WARN_DAYS (5) or unreadable, puts one ⚠️ line in the digest the operator
# reads, so "re-login needed" arrives before the morning dies. Never fatal: every failure is a log line.
# Self-contained: __tests__/unit/runner-preflight-missed.test.ts extracts this block and runs it.
AUTH_WARN_DAYS="${FUNNEL_AUTH_WARN_DAYS:-5}"
auth_expiry() {  # prints ONE line: access=<YYYY-MM-DD HH:MM|unknown> refresh=<YYYY-MM-DD HH:MM|unknown> refresh_days=<n|unknown>
  # Under pipefail a `security` exit (item missing, keychain locked) makes the pipeline non-zero even after python has
  # printed its own "unknown" line — so judge the OUTPUT, not the exit status, or the fallback prints a second line.
  local out
  out="$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null | python3 -c 'import json,sys,datetime,time
try:
    o=(json.load(sys.stdin).get("claudeAiOauth") or {})
    def f(k):
        v=o.get(k); return datetime.datetime.fromtimestamp(v/1000).strftime("%Y-%m-%d %H:%M") if isinstance(v,(int,float)) else "unknown"
    r=o.get("refreshTokenExpiresAt")
    days="unknown" if not isinstance(r,(int,float)) else str(int((r/1000-time.time())//86400))
    print("access=%s refresh=%s refresh_days=%s" % (f("expiresAt"), f("refreshTokenExpiresAt"), days))
except Exception:
    print("access=unknown refresh=unknown refresh_days=unknown")' 2>/dev/null | head -n 1)"
  [ -n "$out" ] && printf '%s\n' "$out" || echo "access=unknown refresh=unknown refresh_days=unknown"
}
auth_warn_line() {  # $1 = auth_expiry output → one ⚠️ line when the refresh token is within AUTH_WARN_DAYS or unknown; else nothing
  local days refresh
  days="$(printf '%s' "$1" | head -n 1 | sed -nE 's/.*refresh_days=([^ ]+).*/\1/p')"
  refresh="$(printf '%s' "$1" | head -n 1 | sed -nE 's/.*refresh=([0-9: -]+) refresh_days.*/\1/p')"
  case "$days" in
    ''|unknown) echo "⚠️ Claude CLI auth: refresh-token expiry unknown (keychain unreadable or no refreshTokenExpiresAt) — run \`claude auth status\`; if not loggedIn, run \`claude auth login\` (E264)";;
    *) if [ "$days" -le "$AUTH_WARN_DAYS" ] 2>/dev/null; then
         echo "⚠️ Claude CLI auth: refresh token expires $refresh (${days} d left) — run \`claude auth login\` in a terminal before then, or the morning run dies at the preflight as on 10-22 (E264)"
       fi;;
  esac
}
preflight_missed_land() {  # $1 day $2 HH:MM $3 kind $4 cli-version $5 auth-line $6 excerpt → rc 0 row + artifacts landed · 2 something did not (logged; never fatal)
  local day="$1" hhmm="$2" kind="$3" cli="$4" auth="$5" excerpt="$6" rc=0 lc dl row
  lc="$WT/scripts/agents/ledger-commit.sh"; [ -x "$lc" ] || lc="$PROJECT_DIR/scripts/agents/ledger-commit.sh"
  dl="$WT/scripts/agents/digest-land.sh"; [ -x "$dl" ] || dl="$PROJECT_DIR/scripts/agents/digest-land.sh"
  row="| $day $hhmm | check | mhm-funnel-daily: MISSED $day — Quinn did not run (preflight=$kind, cli=$cli) |  |  | MISSED | ${excerpt:-no excerpt} · $auth · degraded digest + scoreboard + guardrail landed on main by the runner (E264) |"
  row="$(printf '%s' "$row" | tr -d '\n\r')"
  if [ -x "$lc" ]; then
    "$lc" --row "$row" --label "MISSED $day preflight=$kind" 2>&1 | while IFS= read -r l; do log "preflight-missed: $l"; done
    [ "${PIPESTATUS[0]}" = 0 ] || rc=2
  else log "preflight-missed: ledger-commit.sh not found — MISSED row NOT landed: $row"; rc=2; fi
  if [ -x "$dl" ] && [ -s "$PROJECT_DIR/reports/funnel/digest-$day.md" ]; then
    "$dl" --date "$day" --file "$PROJECT_DIR/reports/funnel/digest-$day.md" --allow-degraded \
      --extra "$PROJECT_DIR/reports/funnel/$day.md" --extra "$PROJECT_DIR/reports/funnel/$day.json" \
      --extra "$PROJECT_DIR/reports/funnel/guardrail-$day.md" --extra "$PROJECT_DIR/reports/funnel/guardrail-$day.json" \
      2>&1 | while IFS= read -r l; do log "preflight-missed: $l"; done
    [ "${PIPESTATUS[0]}" = 0 ] || rc=2
  else log "preflight-missed: digest-land.sh or reports/funnel/digest-$day.md missing — degraded digest + artifacts NOT landed"; rc=2; fi
  return $rc
}
# <<< preflight-missed
token_expiry() {
  security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null | python3 -c 'import json,sys,datetime
try:
    e=(json.load(sys.stdin).get("claudeAiOauth") or {}).get("expiresAt")
    print(datetime.datetime.fromtimestamp(e/1000).strftime("%Y-%m-%d %H:%M") if e else "unknown")
except Exception:
    print("unknown")' 2>/dev/null || echo unknown
}
DIGEST="$WT/reports/funnel/digest-$TODAY.md"
# E264: read the keychain's expiry dates (never the token) before the preflight, every run — the early warning.
AUTH_LINE="$(auth_expiry)"; log "auth: $AUTH_LINE (warn at refresh_days ≤ $AUTH_WARN_DAYS)"
AUTH_WARN="$(auth_warn_line "$AUTH_LINE")"; [ -n "$AUTH_WARN" ] && log "$AUTH_WARN"
if ! claude_preflight; then
  EXP="$(token_expiry)"
  DIAG="$(preflight_diagnosis)"; DIAG_KIND="${DIAG%%|*}"; DIAG_EXCERPT="${DIAG#*|}"
  CLI_VER="$(claude --version 2>/dev/null | head -1 || echo unknown)"
  case "$DIAG_KIND" in
    CLI_TOO_OLD) CAUSE="The installed Claude CLI ($CLI_VER) is too old for model \`$MODEL\` (the API answered \`claude_code_version_too_old\`). Auth is fine. **Run \`brew upgrade claude-code@latest\`** (the plain \`claude-code\` cask stops at 2.1.236; Fable needs ≥ 2.1.251)";;
    AUTH)        CAUSE="The Claude CLI could not authenticate headlessly (keychain OAuth: access-token expiry $EXP; before the preflight: $AUTH_LINE; the API rejected the token and it could not be refreshed). **Open a terminal and run \`claude auth login\`**";;
    HANG)        CAUSE="The Claude CLI preflight never answered and was killed by the wall-clock watcher ($DIAG_EXCERPT). A large asleep/suspended figure means the host slept mid-run (check \`pmset -g log\`), not auth — a slept-through attempt is retried once on the awake host (E290), so a HANG row now means the retry failed too or the host was awake. **Keep the laptop on AC with the lid open on run mornings**; stderr is in logs/funnel-preflight-$TODAY.stderr";;
    *)           CAUSE="The Claude CLI preflight failed for a reason that is neither auth nor version — see logs/funnel-preflight-$TODAY.json (excerpt: ${DIAG_EXCERPT:-none}). Try \`claude -p 'ok' --model $MODEL\` in a terminal";;
  esac
  log "🔴 Quinn cannot run: preflight=$DIAG_KIND cli=$CLI_VER token-expiry=$EXP auth=$AUTH_LINE ${DIAG_EXCERPT:+excerpt=$DIAG_EXCERPT}"
  GUARD_SUMMARY="status=$GUARD_STATUS action=$GUARD_ACTION$( [ -n "$GUARD_ROLLBACK_TO" ] && echo " rollbackTo=$GUARD_ROLLBACK_TO" )"
  MISSED_HHMM="$(date '+%H:%M')"
  AUTH_WARN_BLOCK=""; [ -n "$AUTH_WARN" ] && AUTH_WARN_BLOCK="$AUTH_WARN"$'\n'
  cat >"$PROJECT_DIR/reports/funnel/digest-$TODAY.md" <<EOF
# Funnel digest — $TODAY (DEGRADED: Quinn did not run)

🔴 **Quinn could not start.** $CAUSE, then run \`npm run funnel:daily\` or wait for tomorrow's pulse. No agent can fix this. Reminder: the 06:30 routine only fires while the Claude desktop app is open on this Mac.
$AUTH_WARN_BLOCK
What still ran today (deterministic scripts, no LLM):
- Scoreboard: reports/funnel/$TODAY.md
- Circuit breaker: $GUARD_MD — $GUARD_SUMMARY
- Ledger: reports/funnel/changelog.md (the morning production check ran before Quinn — see its ledger row; this morning's MISSED row is landed by the runner, E264)

Changed today: nothing merged by the team (Quinn did not run).
EOF
  log "Wrote degraded digest: reports/funnel/digest-$TODAY.md"
  # E264: the run that knows it failed writes the record — MISSED row on main + degraded digest/scoreboard/guardrail.
  preflight_missed_land "$TODAY" "$MISSED_HHMM" "$DIAG_KIND" "$CLI_VER" "$AUTH_LINE" "$DIAG_EXCERPT"
  log "preflight-missed: exit $? (0 row + artifacts on main · 2 see lines above; a queued row flushes next run)"
  exit 4
fi
if [ -z "$PROMPT_FILE" ]; then
  if [ -f "$WT/scripts/agents/funnel-daily-prompt.md" ]; then PROMPT_FILE="$WT/scripts/agents/funnel-daily-prompt.md"
  else PROMPT_FILE="$PROJECT_DIR/scripts/agents/funnel-daily-prompt.md"; log "WARN: origin/main has no funnel-daily-prompt.md — using the operator-tree copy"; fi
fi
# `claude -p` terminates background tasks 600 s after the main turn ends ("Background tasks still running after
# 600s; terminating. Set CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 to wait indefinitely."). Quinn's turn ends once
# the seven specialists are dispatched via the Agent tool, so every agent needing > 10 min (build + type-check +
# PR + merge-gate + a 6–10 min deploy-verify) was killed mid-flight on 09-18, 09-19 and 09-22 — on 09-22 an
# orphaned deploy-verify then rolled production back from a worktree cleanup() had already deleted (incident
# 2026-09-22-0655.md, E91). 2 h is the default (Quinn's longest full run was 51 min); a finite cap is deliberate
# so a hung subagent can never wedge the scheduled task forever. Guarded by __tests__/unit/funnel-runner-bg-ceiling.test.ts.
export CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS="${FUNNEL_BG_WAIT_CEILING_MS:-7200000}"
log "Running Quinn ($MODEL)… prompt=$PROMPT_FILE bg-wait-ceiling=${CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS}ms"
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
# E222: Quinn's stdout is the only record of why a session ended; it lived in $WT and was reaped with it (10-15).
cp "$WT/reports/funnel/quinn-$TODAY.out" "$PROJECT_DIR/logs/funnel-quinn-$TODAY.out" 2>/dev/null || true
# The digest is the deliverable. Quinn writes it (skeleton before the first merge, full at the end); the fallback
# script accepts it only if it has the five-section shape, fills the <!-- LEDGER --> placeholder from today's
# ledger rows, and otherwise SYNTHESIZES a digest from scoreboard + guardrail + ledger + queue. 2026-09-14: Quinn hit
# --max-turns after PR #101 and the "digest" the operator got was one line of stdout — never again.
FALLBACK="$WT/scripts/agents/funnel-digest-fallback.py"; [ -f "$FALLBACK" ] || FALLBACK="$PROJECT_DIR/scripts/agents/funnel-digest-fallback.py"
if [ -f "$FALLBACK" ]; then
  python3 "$FALLBACK" --today "$TODAY" --wt "$WT" --project-dir "$PROJECT_DIR" \
    --quinn-out "$WT/reports/funnel/quinn-$TODAY.out" --guard-status "$GUARD_STATUS" --guard-action "$GUARD_ACTION" \
    --out "$PROJECT_DIR/reports/funnel/digest-$TODAY.md" 2>>"$LOG_FILE" | while IFS= read -r line; do log "$line"; done
  DIGEST_RC=${PIPESTATUS[0]}
  [ "$DIGEST_RC" = 3 ] && log "Quinn did not write a usable digest — synthesized one from the day's files."
elif [ -f "$DIGEST" ]; then
  cp "$DIGEST" "$PROJECT_DIR/reports/funnel/"
else
  cp "$WT/reports/funnel/quinn-$TODAY.out" "$PROJECT_DIR/reports/funnel/digest-$TODAY.md"
  log "Quinn did not write the digest file — saved stdout as the digest (no fallback script found)."
fi
# E264: the auth early warning rides the digest the operator reads (a date and a day count, never the token).
if [ -n "${AUTH_WARN:-}" ] && [ -f "$PROJECT_DIR/reports/funnel/digest-$TODAY.md" ] && ! grep -qF 'Claude CLI auth:' "$PROJECT_DIR/reports/funnel/digest-$TODAY.md"; then
  printf '\n%s\n' "$AUTH_WARN" >>"$PROJECT_DIR/reports/funnel/digest-$TODAY.md" && log "digest: appended the auth early warning (E264)"
fi
# Operator-facing files Quinn edited on its branch are on origin/main after its merge; also sync the queue so the operator's tree is current.
for f in .claude/agents/mhm-funnel/operator-queue.md .claude/agents/mhm-funnel/experiments.md .claude/agents/mhm-funnel/ideas-inbox.md; do
  [ -f "$WT/$f" ] && ! cmp -s "$WT/$f" "$PROJECT_DIR/$f" && cp "$WT/$f" "$PROJECT_DIR/$f" && log "synced $f"
done
# >>> daily-pr-ledger
# E148 (2026-09-30): the daily PR's own after-merge ledger row belongs to the step that sees the merge. Quinn's session
# often ends before its own after-merge verify runs, so #173, #190, #198, #206 and #224 got their rows retroactively
# (three in four days). After Quinn exits, find today's `funnel: daily run YYYY-MM-DD (#N)` squash commit on
# origin/main; if the ledger on origin/main has no after-merge row for it (by 7-char commit, or by a "PR #N … daily
# run" label — deploy-verify grades HEAD when main moved on), run deploy-verify --after-merge from $2, a tree that
# still has node_modules (cleanup() only reaps the worktrees on EXIT, after this). Polls ≤ DPL_MAX_WAIT_S (default
# 600 s), logging each poll; a fetch failure is UNKNOWN (never a write), and a step that finds nothing writes an
# explicit DID NOT FIRE line — silence from a scheduled step is never the outcome. It never starts a second verify
# while a deploy-verify --after-merge is still running. Self-contained: __tests__/unit/runner-daily-pr-ledger.test.ts
# extracts this block and runs it under /bin/bash 3.2 against throwaway git repos.
daily_pr_ledger() {  # $1 day (YYYY-MM-DD) · $2 tree to verify from. rc 0 row present/written · 2 did not fire / unknown
  local day="$1" tree="$2" poll_s="${DPL_POLL_S:-60}" max_s="${DPL_MAX_WAIT_S:-600}" waited=0 polls=0
  local title="funnel: daily run $1" state n sha sha7="" label rc row
  while :; do
    state=""; n=""; sha=""
    if ! git -C "$tree" fetch -q origin main >/dev/null 2>&1; then
      state="UNKNOWN (git fetch origin main failed — could not look)"
    else
      # E148-b (10-07): also accept a scoped prefix — #264 "funnel(quinn): daily run 2026-10-04 — …" read as DID NOT FIRE.
      read -r sha n <<<"$(git -C "$tree" log origin/main -n 300 --format='%H %s' 2>/dev/null | awk -v d="daily run $day" '
        { s = substr($0, 42) }
        match(s, /^funnel(\([a-z0-9_-]*\))?: /) { s = substr(s, RLENGTH + 1); c = substr(s, length(d) + 1, 1)
          if (substr(s, 1, length(d)) == d && (c == " " || c == "") && match($0, /\(#[0-9]+\)$/)) {
            print substr($0, 1, 40), substr($0, RSTART + 2, RLENGTH - 3); exit } }')"
      if [ -z "$sha" ] || [ -z "$n" ]; then
        state="not merged to origin/main yet"
      else
        sha7="${sha:0:7}"
        if git -C "$tree" show origin/main:reports/funnel/changelog.md 2>/dev/null | awk -F'|' -v s="$sha7" -v pr="PR #$n " '
            function trim(x) { gsub(/^[ \t]+|[ \t]+$/, "", x); return x }
            $3 ~ /after-merge/ && (trim($5) == s || (index($4 " ", pr) > 0 && $4 ~ /daily run/)) { f = 1 }
            END { exit !f }'; then
          log "daily-pr-ledger: PR #$n ($sha7) already has an after-merge row on origin/main — nothing to write"
          return 0
        fi
        if "${DPL_PGREP:-pgrep}" -f 'deploy-verify\.sh --after-merge' >/dev/null 2>&1; then
          state="merged as $sha7 (PR #$n), no row yet, a deploy-verify --after-merge is still running (not starting a second)"
        else
          break
        fi
      fi
    fi
    if [ "$waited" -ge "$max_s" ]; then
      log "daily-pr-ledger: DID NOT FIRE — '$title' $state after ${waited}s / $polls poll(s); no after-merge row written (next run: write it retroactively)"
      return 2
    fi
    polls=$((polls + 1))
    log "daily-pr-ledger: poll $polls — '$title' $state (waited ${waited}s of ${max_s}s)"
    ${DPL_SLEEP:-sleep} "$poll_s"; waited=$((waited + poll_s))
  done
  label="Quinn: PR #$n funnel: daily run $day (Tier 0 docs)"
  if [ ! -x "$tree/scripts/agents/deploy-verify.sh" ]; then
    log "daily-pr-ledger: DID NOT FIRE — PR #$n merged as $sha7 but $tree/scripts/agents/deploy-verify.sh is not executable; no row written"
    return 2
  fi
  log "daily-pr-ledger: PR #$n merged as $sha7 with no after-merge row on origin/main — running deploy-verify --after-merge from $tree"
  (cd "$tree" && ./scripts/agents/deploy-verify.sh --after-merge --sha "$sha" --label "$label") >>"$LOG_FILE" 2>&1
  rc=$?
  log "daily-pr-ledger: deploy-verify exit $rc (0 pass/superseded/inconclusive · 2 rolled back, build error or timeout · 3 still failing)"
  row="$( { git -C "$tree" fetch -q origin main >/dev/null 2>&1 && git -C "$tree" show origin/main:reports/funnel/changelog.md 2>/dev/null
            cat "$tree/reports/funnel/changelog.md" 2>/dev/null; } | grep -F -- "| $label |" | tail -n 1)"
  if [ -n "$row" ]; then log "daily-pr-ledger: ROW $row"; return 0; fi
  log "daily-pr-ledger: DID NOT FIRE — deploy-verify exit $rc wrote no row labelled '$label' (see logs/deploy-verify.log)"
  return 2
}
# <<< daily-pr-ledger
if [ "${FUNNEL_DAILY_PR_LEDGER:-1}" = "1" ]; then
  daily_pr_ledger "$TODAY" "$WT"; DPL_RC=$?; log "daily-pr-ledger: exit $DPL_RC"
  # E222 (10-16): on 10-15 the digest was accepted, the daily PR never merged, and the digest sat in the operator
  # checkout only — the next scoreboard read the day as MISSED. An accepted digest lands on main here (idempotent;
  # HELD if a funnel/quinn/daily-DATE branch exists; DEGRADED digests refused). Never fatal.
  if [ "$DPL_RC" = 2 ] && [ -s "$PROJECT_DIR/reports/funnel/digest-$TODAY.md" ] && [ -x "$WT/scripts/agents/digest-land.sh" ]; then
    "$WT/scripts/agents/digest-land.sh" --date "$TODAY" --file "$PROJECT_DIR/reports/funnel/digest-$TODAY.md" 2>&1 | while IFS= read -r l; do log "$l"; done
  fi
else
  log "daily-pr-ledger: disabled (FUNNEL_DAILY_PR_LEDGER=0) — the daily PR's row is Quinn's to write by hand"
fi
# Ledger + incidents: deploy-verify.sh's ledger() already pushed each row DURABLY to origin/main via
# ledger-commit.sh as it happened — this is now a same-run convenience mirror only (so the operator's
# tree shows today's rows without a manual `git pull`), not the mechanism that makes them durable.
# Still append-only-merge, in case a row only made it into $WT (e.g. queued to ledger-pending.jsonl and
# not yet flushed) and not yet into the operator's tree.
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
# Dashboard data file (/admin/funnel/) — always overwrite with this run's freshly-computed copy.
[ -f "$WT/reports/funnel/history.json" ] && cp "$WT/reports/funnel/history.json" "$PROJECT_DIR/reports/funnel/history.json" && log "synced reports/funnel/history.json"
log "Done. Digest: reports/funnel/digest-$TODAY.md"
