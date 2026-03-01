#!/usr/bin/env bash
set -euo pipefail

# Pull functions.php from BigScoots PRODUCTION server
# Usage: ./scripts/staging/pull-blog-functions-prod.sh

SSH_KEY="$HOME/.ssh/bigscoots_staging"
REMOTE_USER="nginx"
REMOTE_HOST="74.121.204.122"
REMOTE_PORT="2222"
REMOTE_FILE="/home/nginx/domains/blog.musthavemods.com/public/wp-content/themes/kadence-child/functions.php"
LOCAL_FILE="$(dirname "$0")/../../staging/wordpress/kadence-child-prod/functions.php"

mkdir -p "$(dirname "$LOCAL_FILE")"

echo "==> Pulling functions.php from PRODUCTION..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_FILE}" "$LOCAL_FILE"

echo "==> Done! Saved to: $LOCAL_FILE"
echo "    $(wc -l < "$LOCAL_FILE") lines"
