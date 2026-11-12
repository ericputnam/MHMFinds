#!/bin/bash
# run-video-queue.sh — launchd entry for the WordPress video queue (docs/VIDEO_QUEUE.md).
#
#   run-video-queue.sh --weekly      Sunday 10:00 ET: up to 3 new shorts → review queue
#   run-video-queue.sh --revisions   daily 21:00 ET: re-make "changes requested" shorts
#
# Runs headless Claude in a throwaway worktree of origin/main. Drafts and renders persist in
# $STATE_DIR (MHM_PROJECT_DIR), never in a git checkout. Nothing here posts publicly; a human
# approves every video in WordPress.
#
# Env overrides: VIDEO_QUEUE_MODEL, VIDEO_QUEUE_MAX_TURNS, VIDEO_QUEUE_STATE_DIR.
set -uo pipefail

MODE="${1:-}"
case "$MODE" in
  --weekly) NAME="weekly"; MAX_TURNS_DEFAULT=250 ;;
  --revisions) NAME="revisions"; MAX_TURNS_DEFAULT=150 ;;
  *) echo "usage: $0 --weekly | --revisions" >&2; exit 2 ;;
esac

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
LOG_FILE="$PROJECT_DIR/logs/video-queue-$NAME.log"
WORKTREE_ROOT="$HOME/.mhm-worktrees"
STATE_DIR="${VIDEO_QUEUE_STATE_DIR:-$HOME/.mhm-video-queue/state}"
SOCIAL_STATE="$STATE_DIR/reports/funnel/social"
TODAY="$(TZ=America/New_York date '+%Y-%m-%d')"
WT="$WORKTREE_ROOT/video-queue-$NAME-$TODAY-$$"
LOCK="$HOME/.mhm-video-queue/run.lock"
MODEL="${VIDEO_QUEUE_MODEL:-claude-sonnet-5-5}"
MAX_TURNS="${VIDEO_QUEUE_MAX_TURNS:-$MAX_TURNS_DEFAULT}"

mkdir -p "$(dirname "$LOCK")" "$PROJECT_DIR/logs" "$WORKTREE_ROOT" "$SOCIAL_STATE/drafts" "$SOCIAL_STATE/assets"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$NAME] $*" | tee -a "$LOG_FILE"; }
notify_fail() {
  log "FAILED: $1"
  osascript -e "display notification \"$1\" with title \"MHM video queue ($NAME) failed\"" >/dev/null 2>&1 || true
}

# One run at a time (weekly and revisions share state and slots).
if ! mkdir "$LOCK" 2>/dev/null; then
  holder="$(cat "$LOCK/pid" 2>/dev/null)"
  if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
    log "another video-queue run (pid $holder) is active; exiting 0"
    exit 0
  fi
  log "stale lock (pid ${holder:-?}); breaking it"
  rm -rf "$LOCK"
  mkdir "$LOCK" 2>/dev/null || { log "lost the lock race; exiting 0"; exit 0; }
fi
echo "$$" >"$LOCK/pid"

cleanup() {
  if [ -d "$WT" ]; then
    git -C "$PROJECT_DIR" worktree remove --force "$WT" >/dev/null 2>&1 || rm -rf "$WT"
    git -C "$PROJECT_DIR" worktree prune >/dev/null 2>&1 || true
  fi
  [ "$(cat "$LOCK/pid" 2>/dev/null)" = "$$" ] && rm -rf "$LOCK"
  return 0
}
trap cleanup EXIT

log "start (model $MODEL, max turns $MAX_TURNS, state $STATE_DIR)"

# ---------------------------------------------------------------- network
for _ in $(seq 1 30); do
  curl -s -m 5 -o /dev/null https://www.google.com/generate_204 && break
  sleep 3
done
curl -s -m 5 -o /dev/null https://www.google.com/generate_204 || { notify_fail "no network"; exit 1; }

# ---------------------------------------------------------------- worktree
git -C "$PROJECT_DIR" fetch --quiet origin main || { notify_fail "git fetch failed"; exit 1; }
git -C "$PROJECT_DIR" worktree add --detach "$WT" origin/main >/dev/null 2>&1 || { notify_fail "worktree add failed"; exit 1; }
cd "$WT" || { notify_fail "cd worktree failed"; exit 1; }
log "worktree $WT at $(git rev-parse --short HEAD)"

if [ ! -f scripts/agents/video-queue.ts ]; then
  notify_fail "video-queue.ts is not on origin/main yet"
  exit 1
fi

# .env.local is copied, never printed.
if [ -f "$PROJECT_DIR/.env.local" ]; then
  cp "$PROJECT_DIR/.env.local" "$WT/.env.local" && chmod 600 "$WT/.env.local"
else
  notify_fail "no .env.local in $PROJECT_DIR"
  exit 1
fi

# Opt-outs and confirmed handles come from the operator tree (the files people edit), every run.
for f in creator-optout.txt creator-handles.json; do
  if [ -f "$PROJECT_DIR/reports/funnel/social/$f" ]; then
    cp "$PROJECT_DIR/reports/funnel/social/$f" "$SOCIAL_STATE/$f"
  elif [ -f "$WT/reports/funnel/social/$f" ]; then
    cp "$WT/reports/funnel/social/$f" "$SOCIAL_STATE/$f"
  fi
done
[ -f "$SOCIAL_STATE/creator-optout.txt" ] || { notify_fail "creator-optout.txt missing; refusing to run without it"; exit 1; }

log "npm ci"
npm ci --no-audit --no-fund >>"$LOG_FILE" 2>&1 || { notify_fail "npm ci failed"; exit 1; }
npx prisma generate >>"$LOG_FILE" 2>&1 || { notify_fail "prisma generate failed"; exit 1; }

export MHM_PROJECT_DIR="$STATE_DIR"

# Cheap WordPress check before spending model turns: exit 2 = config/auth/unreachable.
npx tsx scripts/agents/video-queue.ts slots >>"$LOG_FILE" 2>&1
rc=$?
if [ "$rc" -ne 0 ]; then
  notify_fail "video-queue.ts slots exited $rc (WordPress config or reachability)"
  exit 1
fi

# Revisions run nightly; most nights nothing is marked "changes requested", so don't start Claude.
if [ "$NAME" = "revisions" ]; then
  PENDING="$(npx tsx scripts/agents/video-queue.ts revisions 2>>"$LOG_FILE" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).videos.length)}catch{console.log("?")}})')"
  if [ "$PENDING" = "0" ]; then
    log "no videos marked changes requested; nothing to do"
    exit 0
  fi
  log "videos marked changes requested: $PENDING"
fi

# ---------------------------------------------------------------- claude
CLAUDE_CLEAN=(env -u ANTHROPIC_BASE_URL -u CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH -u CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH
  -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN
  -u CLAUDE_CODE_HOST_SESSION_ID -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_PID)

if ! perl -e 'alarm 240; exec @ARGV' "${CLAUDE_CLEAN[@]}" claude -p "Reply with exactly: ok" --model "$MODEL" --max-turns 1 \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' --output-format json </dev/null >>"$LOG_FILE" 2>&1; then
  notify_fail "claude preflight failed (auth or CLI)"
  exit 1
fi

ALLOWED="Bash(npx tsx scripts/agents/video-queue.ts:*),Bash(npx tsx scripts/agents/short-video-frames.ts:*),Bash(npx tsx scripts/agents/social-draft.ts:*)"
# Leading "//" = absolute path in permission rules (a single "/" is project-relative). Edit rules
# cover every file-writing tool, Write included.
ALLOWED="$ALLOWED,Read,Edit(/$SOCIAL_STATE/drafts/**)"

PROMPT="$(cat scripts/agents/video-queue-prompt.md)

---
Mode: $MODE
DATE: $TODAY
MHM_PROJECT_DIR: $STATE_DIR
Drafts dir: $SOCIAL_STATE/drafts/$TODAY/"

log "claude run ($MODE)"
perl -e 'alarm 5400; exec @ARGV' "${CLAUDE_CLEAN[@]}" claude -p "$PROMPT" --model "$MODEL" --max-turns "$MAX_TURNS" \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --permission-mode acceptEdits --allowedTools "$ALLOWED" </dev/null >>"$LOG_FILE" 2>&1
rc=$?
if [ "$rc" -ne 0 ]; then
  notify_fail "claude exited $rc; see logs/video-queue-$NAME.log"
  exit 1
fi

# Renders older than 6 weeks are dead weight (the WP copy is the reviewed one).
find "$SOCIAL_STATE/assets" -mindepth 1 -maxdepth 1 -type d -mtime +42 -exec rm -rf {} + 2>/dev/null || true

log "done"
exit 0
