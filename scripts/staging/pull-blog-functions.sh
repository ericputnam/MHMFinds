#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="74.121.204.122"
REMOTE_USER="nginx"
REMOTE_PORT="2222"
REMOTE_FILE="/home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public/wp-content/themes/kadence-child/functions.php"
LOCAL_FILE="staging/wordpress/kadence-child/functions.php"
SSH_KEY="${HOME}/.ssh/bigscoots_staging"

mkdir -p "$(dirname "$LOCAL_FILE")"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "cat '$REMOTE_FILE'" > "$LOCAL_FILE"

echo "Pulled $REMOTE_FILE -> $LOCAL_FILE"
