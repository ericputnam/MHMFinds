#!/usr/bin/env bash
set -euo pipefail

# Push functions.php to BigScoots STAGING server
# Usage:
#   ./scripts/staging/push-blog-functions.sh           # safe mode (default)
#   ./scripts/staging/push-blog-functions.sh --force   # bypass safety checks
#
# SAFETY:
#   1. Lints local file before pushing
#   2. Verifies CRITICAL_MARKERS exist locally (catches "you forgot to
#      pull recent changes from staging" mistakes)
#   3. Pulls current staging and shows diff stats

SSH_KEY="$HOME/.ssh/bigscoots_staging"
REMOTE_USER="nginx"
REMOTE_HOST="74.121.204.122"
REMOTE_PORT="2222"
REMOTE_FILE="/home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public/wp-content/themes/kadence-child/functions.php"
LOCAL_FILE="$(dirname "$0")/../../staging/wordpress/kadence-child/functions.php"

# Markers that MUST exist in the local file. See push-blog-functions-prod.sh
# for the explanation. Keep these two arrays in sync.
CRITICAL_MARKERS=(
  "mhm_inject_mediavine_sidebar|Mediavine Sidebar (revenue ~\$2K/mo)"
  "mhm_mediavine_sidebar_css|Mediavine Sidebar CSS"
  "mhm_search_form_rewrite_js|Blog Search Form Rewrite"
  "is_from_apex_rewrite|Apex Domain Rewrite Helper"
)

FORCE=0
if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

if [ ! -f "$LOCAL_FILE" ]; then
  echo "ERROR: Local file not found: $LOCAL_FILE"
  exit 1
fi

# 1. Lint
echo "==> Linting local file..."
if ! php -l "$LOCAL_FILE" >/dev/null 2>&1; then
  php -l "$LOCAL_FILE"
  echo "ERROR: Local file has PHP syntax errors. Aborting."
  exit 1
fi
echo "    OK"

# 2. Critical marker check
echo "==> Verifying critical feature markers in local file..."
MISSING=()
for entry in "${CRITICAL_MARKERS[@]}"; do
  pattern="${entry%%|*}"
  name="${entry##*|}"
  if ! grep -q "$pattern" "$LOCAL_FILE"; then
    MISSING+=("    [MISSING] $name  (pattern: $pattern)")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "  *** CRITICAL FEATURE MARKERS MISSING FROM LOCAL FILE ***"
  printf '%s\n' "${MISSING[@]}"
  echo ""
  echo "  Pushing this file would WIPE these features from staging."
  if [ $FORCE -ne 1 ]; then
    echo "  Refusing to push. Run with --force to override."
    exit 2
  fi
  echo "  --force passed. Continuing despite missing markers."
fi
echo "    OK"

# 3. Pull current staging for diff
TMP_STAGING="$(mktemp -t functions_staging_XXXXXX.php)"
trap 'rm -f "$TMP_STAGING"' EXIT

echo "==> Pulling current STAGING file for diff..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_FILE}" "$TMP_STAGING" >/dev/null 2>&1 || true

ADDED=$(diff "$TMP_STAGING" "$LOCAL_FILE" 2>/dev/null | grep -c '^>' || true)
REMOVED=$(diff "$TMP_STAGING" "$LOCAL_FILE" 2>/dev/null | grep -c '^<' || true)
echo "    Diff: $ADDED line(s) added, $REMOVED line(s) removed"

# 4. Check that staging doesn't have features local is about to wipe
LOCAL_MISSING=()
for entry in "${CRITICAL_MARKERS[@]}"; do
  pattern="${entry%%|*}"
  name="${entry##*|}"
  staging_has=$(grep -c "$pattern" "$TMP_STAGING" 2>/dev/null || true)
  local_has=$(grep -c "$pattern" "$LOCAL_FILE" || true)
  if [ "$staging_has" -gt 0 ] && [ "$local_has" -eq 0 ]; then
    LOCAL_MISSING+=("    [WIPE] $name")
  fi
done

if [ ${#LOCAL_MISSING[@]} -gt 0 ]; then
  echo ""
  echo "  *** WARNING: STAGING HAS FEATURES YOUR LOCAL FILE DOES NOT ***"
  printf '%s\n' "${LOCAL_MISSING[@]}"
  echo "  Pull staging first, then re-run."
  if [ $FORCE -ne 1 ]; then
    exit 3
  fi
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
  "cd /home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public && wp cache flush" || \
  echo "    (cache flush failed but file was uploaded)"

echo "==> Done! Staging updated successfully."
