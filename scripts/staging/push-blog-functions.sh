#!/usr/bin/env bash
set -euo pipefail

# Push functions.php to BigScoots STAGING server
# Usage: ./scripts/staging/push-blog-functions.sh

SSH_KEY="$HOME/.ssh/bigscoots_staging"
REMOTE_USER="nginx"
REMOTE_HOST="74.121.204.122"
REMOTE_PORT="2222"
REMOTE_FILE="/home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public/wp-content/themes/kadence-child/functions.php"
LOCAL_FILE="$(dirname "$0")/../../staging/wordpress/kadence-child/functions.php"

if [ ! -f "$LOCAL_FILE" ]; then
  echo "ERROR: Local file not found: $LOCAL_FILE"
  exit 1
fi

echo "==> Creating backup on staging server..."
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "cp '$REMOTE_FILE' '${REMOTE_FILE}.bak.$(date +%s)'"

echo "==> Uploading functions.php to staging..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" "$LOCAL_FILE" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_FILE}"

echo "==> Running PHP lint check..."
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "php -l '$REMOTE_FILE'"

echo "==> Flushing WordPress cache..."
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "cd /home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public && wp cache flush"

echo "==> Done! Staging updated successfully."
