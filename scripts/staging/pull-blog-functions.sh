#!/usr/bin/env bash
set -euo pipefail

# Pull functions.php from BigScoots STAGING server
# Usage: ./scripts/staging/pull-blog-functions.sh

SSH_KEY="$HOME/.ssh/bigscoots_staging"
REMOTE_USER="nginx"
REMOTE_HOST="74.121.204.122"
REMOTE_PORT="2222"
REMOTE_FILE="/home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public/wp-content/themes/kadence-child/functions.php"
LOCAL_FILE="$(dirname "$0")/../../staging/wordpress/kadence-child/functions.php"

echo "==> Pulling functions.php from staging..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_FILE}" "$LOCAL_FILE"

echo "==> Done! Saved to: $LOCAL_FILE"
echo "    $(wc -l < "$LOCAL_FILE") lines"
