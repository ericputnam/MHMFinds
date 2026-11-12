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
  "mhm_collection_crosslinks|Legacy->collection cross-links (SEO)"
  "mhm_catalog_mod_links|Catalog mod cross-links (SEO internal linking)"
  "mhm_affiliate_pack_block|Amazon Sims 4 pack picks (blog affiliate block)"
  "mhm_consolidated_post_map|Legacy canonical map (un-consolidated pairs, PR #63)"
  "mhm_host_split_301|Host-split 301 (blog.* -> apex, Pinterest consolidation Q13)"
  "mhm_host_split_js|Host-split JS fallback (cached blog.* HTML -> apex)"
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
# Match markers in CODE only. A plain grep also matched comments, so a feature whose
# function had been deleted still "passed" as long as some comment named it (the
# staging file carried mhm_catalog_mod_links in a comment only until 2026-11-11).
code_only() { grep -vE '^[[:space:]]*(\*|/\*|//|#)' "$1"; }
echo "==> Verifying critical feature markers in local file..."
MISSING=()
for entry in "${CRITICAL_MARKERS[@]}"; do
  pattern="${entry%%|*}"
  name="${entry##*|}"
  # grep -c, not grep -q: -q exits at the first match, the upstream grep then dies of
  # SIGPIPE, and under `set -o pipefail` the pipeline reads as FAILED — every marker that
  # IS present was reported missing and the push refused (exit 2). -c reads to the end.
  if ! code_only "$LOCAL_FILE" | grep -c "$pattern" >/dev/null; then
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
# A failed pull used to be swallowed (`|| true`). The wipe check below then compared the
# local file against an EMPTY file, found nothing to protect, and passed — the exact
# "could not run" graded as "ok" that CLAUDE.md warns about. Could-not-pull now stops the push.
PULL_OK=1
scp -i "$SSH_KEY" -P "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_FILE}" "$TMP_STAGING" >/dev/null 2>&1 || PULL_OK=0
if [ "$PULL_OK" -ne 1 ] || [ ! -s "$TMP_STAGING" ]; then
  echo "  *** Could not pull the current staging functions.php (scp failed or file empty)."
  echo "      Without it the wipe check cannot run."
  if [ $FORCE -ne 1 ]; then
    echo "  Refusing to push. Fix the connection, or re-run with --force to push blind."
    exit 4
  fi
  echo "  --force passed. Pushing WITHOUT a wipe check."
fi

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

BACKUP_NAME="${REMOTE_FILE}.bak.$(date +%s)"
echo "==> Creating backup on staging server..."
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "cp '$REMOTE_FILE' '$BACKUP_NAME'"
echo "    Backup: $BACKUP_NAME"

echo "==> Uploading functions.php to staging..."
scp -i "$SSH_KEY" -P "$REMOTE_PORT" "$LOCAL_FILE" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_FILE}"

echo "==> Running PHP lint check..."
# If the uploaded file does not lint on the server, the site is serving a broken
# functions.php right now. Put the backup back before exiting (set -e used to exit here
# and leave the broken file live).
if ! ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "php -l '$REMOTE_FILE'"; then
  echo "  *** Remote PHP lint FAILED. Restoring the backup..."
  if ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
    "cp '$BACKUP_NAME' '$REMOTE_FILE'"; then
    echo "  Restored $BACKUP_NAME. Staging is back on the previous file."
  else
    echo "  *** RESTORE FAILED. Staging is serving a broken functions.php. Restore by hand:"
    echo "      cp '$BACKUP_NAME' '$REMOTE_FILE'"
  fi
  exit 5
fi

echo "==> Flushing WordPress cache..."
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" \
  "cd /home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public && wp cache flush" || \
  echo "    (cache flush failed but file was uploaded)"

echo "==> Done! Staging updated successfully."
