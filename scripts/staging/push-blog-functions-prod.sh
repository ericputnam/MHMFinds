#!/usr/bin/env bash
set -euo pipefail

# Push functions.php to BigScoots PRODUCTION server
# Usage:
#   ./scripts/staging/push-blog-functions-prod.sh           # safe mode (default)
#   ./scripts/staging/push-blog-functions-prod.sh --force   # bypass safety checks
#
# CAUTION: This pushes to blog.musthavemods.com (PRODUCTION).
# Always test on staging first.
#
# SAFETY:
#   1. Pulls current prod into a temp file
#   2. Diffs against the local file
#   3. Refuses to push if diff includes deletions of CRITICAL_MARKERS
#      (sidebar code, search rewrite, blog pagination logic, etc.)
#   4. Always shows diff stats and requires interactive confirmation

SSH_KEY="$HOME/.ssh/bigscoots_staging"
REMOTE_USER="nginx"
REMOTE_HOST="74.121.204.122"
REMOTE_PORT="2222"
REMOTE_FILE="/home/nginx/domains/blog.musthavemods.com/public/wp-content/themes/kadence-child/functions.php"
LOCAL_FILE="$(dirname "$0")/../../staging/wordpress/kadence-child-prod/functions.php"

# Markers that MUST exist in the local file before any prod push.
# If the local file is missing any of these, it would WIPE that feature
# from prod. Add new markers here whenever you ship a critical feature.
#
# Format: "<grep-pattern>|<human-name>"
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

# 1. PHP lint check on local file BEFORE doing anything destructive
echo "==> Linting local file..."
if ! php -l "$LOCAL_FILE" >/dev/null 2>&1; then
  php -l "$LOCAL_FILE"
  echo "ERROR: Local file has PHP syntax errors. Aborting."
  exit 1
fi
echo "    OK"

# 2. CRITICAL_MARKERS check — refuse to push if any are missing locally
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
  echo "  Pushing this file would WIPE these features from production."
  echo "  This is the same kind of regression that wiped the Mediavine"
  echo "  sidebar on Mar 17 2026 and cost ~24% RPM for weeks."
  echo ""
  if [ $FORCE -ne 1 ]; then
    echo "  Refusing to push. Run with --force to override (DO NOT DO THIS"
    echo "  unless you have explicit user approval to remove the feature)."
    exit 2
  fi
  echo "  --force passed. Continuing despite missing markers."
fi
echo "    OK"

# 3. Pull current prod into a temp file and diff
TMP_PROD="$(mktemp -t functions_prod_XXXXXX.php)"
trap 'rm -f "$TMP_PROD"' EXIT

echo "==> Pulling current PRODUCTION file for diff..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_FILE}" "$TMP_PROD" >/dev/null

# 4. Check that current prod still has the markers — if it doesn't, that means
#    someone edited prod directly via SSH. Warn loudly.
echo "==> Comparing prod's current markers vs local..."
PROD_MISSING=()
LOCAL_MISSING=()
for entry in "${CRITICAL_MARKERS[@]}"; do
  pattern="${entry%%|*}"
  name="${entry##*|}"
  prod_has=$(grep -c "$pattern" "$TMP_PROD" || true)
  local_has=$(grep -c "$pattern" "$LOCAL_FILE" || true)
  if [ "$prod_has" -gt 0 ] && [ "$local_has" -eq 0 ]; then
    LOCAL_MISSING+=("    [WIPE] $name  (in prod, NOT in local)")
  fi
  if [ "$prod_has" -eq 0 ] && [ "$local_has" -gt 0 ]; then
    PROD_MISSING+=("    [ADD]  $name  (in local, NOT in prod)")
  fi
done

if [ ${#LOCAL_MISSING[@]} -gt 0 ]; then
  echo ""
  echo "  *** WARNING: PROD HAS FEATURES YOUR LOCAL FILE DOES NOT ***"
  printf '%s\n' "${LOCAL_MISSING[@]}"
  echo ""
  echo "  Someone (probably Claude or you) edited prod directly via SSH."
  echo "  Pushing now would WIPE those features. Pull first:"
  echo "    ./scripts/staging/pull-blog-functions-prod.sh"
  echo "  then re-run this push."
  if [ $FORCE -ne 1 ]; then
    exit 3
  fi
  echo "  --force passed. Continuing anyway."
fi

if [ ${#PROD_MISSING[@]} -gt 0 ]; then
  echo "  Features being added by this push:"
  printf '%s\n' "${PROD_MISSING[@]}"
fi

# 5. Show diff stats (diff exits 1 when files differ; tolerate that under pipefail)
set +e
DIFF_LINES=$(diff "$TMP_PROD" "$LOCAL_FILE" | wc -l | tr -d ' ')
ADDED=$(diff "$TMP_PROD" "$LOCAL_FILE" | grep -c '^>')
REMOVED=$(diff "$TMP_PROD" "$LOCAL_FILE" | grep -c '^<')
set -e

echo ""
echo "  *** PRODUCTION DEPLOYMENT ***"
echo "  Target: blog.musthavemods.com"
echo "  File:   functions.php (Kadence child theme)"
echo "  Diff:   $ADDED line(s) added, $REMOVED line(s) removed"
echo ""

if [ "$DIFF_LINES" -eq 0 ]; then
  echo "  Local file matches prod exactly. Nothing to push."
  exit 0
fi

read -p "  Show full diff? (y/N) " show_diff
if [[ "$show_diff" == "y" || "$show_diff" == "Y" ]]; then
  diff -u "$TMP_PROD" "$LOCAL_FILE" | less -R
fi

read -p "  Continue with push? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

# 6. Backup, upload, lint, cache flush
BACKUP_NAME="${REMOTE_FILE}.bak.$(date +%s)"
echo "==> Creating backup on production server..."
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "cp '$REMOTE_FILE' '$BACKUP_NAME'"
echo "    Backup: $BACKUP_NAME"

echo "==> Uploading functions.php to production..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" "$LOCAL_FILE" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_FILE}"

echo "==> Running PHP lint check on prod..."
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "php -l '$REMOTE_FILE'"

echo "==> Flushing WordPress cache..."
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "cd /home/nginx/domains/blog.musthavemods.com/public && wp cache flush" || \
  echo "    (cache flush failed but file was uploaded)"

echo ""
echo "==> PRODUCTION updated successfully!"
echo "    Verify at: https://musthavemods.com/sims-4-cc-finds-2/"
echo "    Run sidebar check: ./scripts/agents/check-blog-sidebar.sh"
echo ""
echo "    To rollback:"
echo "      ssh -i $SSH_KEY -p $REMOTE_PORT ${REMOTE_USER}@${REMOTE_HOST} \\"
echo "        \"cp '$BACKUP_NAME' '$REMOTE_FILE'\""
