#!/usr/bin/env bash
set -euo pipefail

# Catch-up for the video poster (docs/VIDEO_QUEUE.md). WordPress posts approved videos from WP-cron, but
# WP-cron only fires when someone visits the blog, so launchd calls POST /post-due every 15 minutes too.
# The plugin's lock means the two never post the same video twice.
#
# Installed to ~/.mhm-video-queue/bin/ so it doesn't depend on which branch the main checkout is on.
# Reads MHM_WP_VIDEO_URL / _USER / _APP_PASSWORD from .env.local (or the environment). The password goes to
# curl on stdin, never on the command line, and is never printed.

ENV_FILE="${MHM_ENV_FILE:-/Users/eputnam/java_projects/MHMFinds/.env.local}"

read_env() {
  local name="$1" val="${!1:-}"
  if [[ -z "$val" && -f "$ENV_FILE" ]]; then
    val="$(grep -E "^${name}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
  fi
  # strip quotes, CR and stray trailing % / whitespace that copy-paste leaves behind
  val="${val%$'\r'}"
  val="$(printf '%s' "$val" | sed -E 's/^["'\'']//; s/["'\'']$//; s/[%[:space:]]+$//')"
  printf '%s' "$val"
}

URL="$(read_env MHM_WP_VIDEO_URL)"
USER_NAME="$(read_env MHM_WP_VIDEO_USER)"
PASS="$(read_env MHM_WP_VIDEO_APP_PASSWORD)"
stamp() { date '+%Y-%m-%d %H:%M:%S %Z'; }

if [[ -z "$URL" || -z "$USER_NAME" || -z "$PASS" ]]; then
  echo "$(stamp) could not run: MHM_WP_VIDEO_URL, MHM_WP_VIDEO_USER and MHM_WP_VIDEO_APP_PASSWORD must be set" >&2
  exit 2
fi
case "$URL" in
  https://*|http://localhost*|http://127.0.0.1*) ;;
  *) echo "$(stamp) could not run: MHM_WP_VIDEO_URL must be https" >&2; exit 2 ;;
esac

esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }
BODY="$(mktemp -t mhm-post-due)"
trap 'rm -f "$BODY"' EXIT

CODE="$(printf 'user = "%s:%s"\n' "$(esc "$USER_NAME")" "$(esc "$PASS")" | curl -sS -K - \
  -X POST -H 'Accept: application/json' --max-time 320 \
  -o "$BODY" -w '%{http_code}' "${URL%/}/wp-json/mhm-video-queue/v1/post-due" 2>&1)" || {
  echo "$(stamp) WordPress unreachable: $CODE" >&2
  exit 2
}

if [[ "$CODE" != "200" ]]; then
  echo "$(stamp) post-due → HTTP $CODE $(head -c 300 "$BODY")" >&2
  [[ "$CODE" == "401" || "$CODE" == "403" ]] && exit 2
  exit 1
fi
echo "$(stamp) $(head -c 500 "$BODY")"
