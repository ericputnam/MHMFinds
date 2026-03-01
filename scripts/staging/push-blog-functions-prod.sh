#!/usr/bin/env bash
set -euo pipefail

# Push functions.php to BigScoots PRODUCTION server
# Usage: ./scripts/staging/push-blog-functions-prod.sh
#
# CAUTION: This pushes to blog.musthavemods.com (PRODUCTION).
# Always test on staging first.

SSH_KEY="$HOME/.ssh/bigscoots_staging"
REMOTE_USER="nginx"
REMOTE_HOST="74.121.204.122"
REMOTE_PORT="2222"
REMOTE_FILE="/home/nginx/domains/blog.musthavemods.com/public/wp-content/themes/kadence-child/functions.php"
LOCAL_FILE="$(dirname "$0")/../../staging/wordpress/kadence-child/functions.php"

if [ ! -f "$LOCAL_FILE" ]; then
  echo "ERROR: Local file not found: $LOCAL_FILE"
  exit 1
fi

echo ""
echo "  *** PRODUCTION DEPLOYMENT ***"
echo "  Target: blog.musthavemods.com"
echo "  File:   functions.php (Kadence child theme)"
echo ""
read -p "  Continue? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo "==> Creating backup on production server..."
BACKUP_NAME="${REMOTE_FILE}.bak.$(date +%s)"
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "cp '$REMOTE_FILE' '$BACKUP_NAME'"
echo "    Backup: $BACKUP_NAME"

echo "==> Uploading functions.php to production..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" "$LOCAL_FILE" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_FILE}"

echo "==> Running PHP lint check..."
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "php -l '$REMOTE_FILE'"

echo "==> Flushing WordPress cache..."
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "cd /home/nginx/domains/blog.musthavemods.com/public && wp cache flush"

echo ""
echo "==> PRODUCTION updated successfully!"
echo "    Verify at: https://blog.musthavemods.com"
echo ""
echo "    To rollback: scp -i $SSH_KEY -P $REMOTE_PORT ${REMOTE_USER}@${REMOTE_HOST}:$BACKUP_NAME ${REMOTE_USER}@${REMOTE_HOST}:$REMOTE_FILE"
