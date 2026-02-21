#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="74.121.204.122"
REMOTE_USER="nginx"
REMOTE_PORT="2222"
REMOTE_FILE="/home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public/wp-content/themes/kadence-child/functions.php"
LOCAL_FILE="staging/wordpress/kadence-child/functions.php"
SSH_KEY="${HOME}/.ssh/bigscoots_staging"

if [[ ! -f "$LOCAL_FILE" ]]; then
  echo "Local file not found: $LOCAL_FILE" >&2
  exit 1
fi

ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "cp '$REMOTE_FILE' '${REMOTE_FILE}.bak.$(date +%s)'"
cat "$LOCAL_FILE" | ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "cat > '$REMOTE_FILE'"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "php -l '$REMOTE_FILE'"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "cd /home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public && wp cache flush --allow-root >/dev/null && wp transient delete --all --allow-root >/dev/null"

echo "Pushed $LOCAL_FILE -> $REMOTE_FILE and flushed WP caches"
