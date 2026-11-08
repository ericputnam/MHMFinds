#!/usr/bin/env bash
set -euo pipefail

# Push the MHM Video Queue plugin to the BigScoots WordPress server.
# Usage:
#   ./scripts/staging/push-video-queue-plugin.sh            # prod (blog.musthavemods.com), interactive
#   ./scripts/staging/push-video-queue-plugin.sh --yes      # non-interactive (lint + diff still run)
#   ./scripts/staging/push-video-queue-plugin.sh --dry-run  # lint + diff only
#
# This copies staging/wordpress/plugins/mhm-video-queue/ to wp-content/plugins/mhm-video-queue/.
# It NEVER touches the theme or functions.php. The plugin keeps its data in WP posts/meta and its
# video files outside the web root, so replacing the plugin folder loses nothing.
#
# The first push only uploads the folder. Activate the plugin once in WP admin (Plugins), then
# create the Video Reviewer and Video Bot users (docs/VIDEO_QUEUE.md).

SSH_KEY="$HOME/.ssh/bigscoots_staging"
REMOTE_USER="nginx"
REMOTE_HOST="74.121.204.122"
REMOTE_PORT="2222"
WP_ROOT="/home/nginx/domains/blog.musthavemods.com/public"
REMOTE_DIR="$WP_ROOT/wp-content/plugins/mhm-video-queue"
LOCAL_DIR="$(cd "$(dirname "$0")/../../staging/wordpress/plugins/mhm-video-queue" && pwd)"

YES=0
DRY=0
for _arg in "$@"; do
  case "$_arg" in
    --yes) YES=1 ;;
    --dry-run) DRY=1 ;;
    *) echo "unknown option: $_arg"; exit 1 ;;
  esac
done

SSH=(ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}")

echo "==> Linting plugin PHP locally..."
while IFS= read -r f; do
  if ! php -l "$f" >/dev/null 2>&1; then
    php -l "$f"
    echo "ERROR: PHP syntax error in $f. Aborting."
    exit 1
  fi
done < <(find "$LOCAL_DIR" -name '*.php')
echo "    OK"

# Guard: this script must never carry theme files.
if find "$LOCAL_DIR" -name 'functions.php' | grep -q .; then
  echo "ERROR: a functions.php is inside the plugin folder. Refusing to push."
  exit 1
fi

TMP="$(mktemp -d -t mhm_vq_XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

echo "==> Pulling the current server copy for diff..."
if "${SSH[@]}" "test -d '$REMOTE_DIR'"; then
  scp -q -r -i "$SSH_KEY" -P "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}" "$TMP/remote"
  FIRST=0
else
  mkdir -p "$TMP/remote"
  FIRST=1
  echo "    (not on the server yet: first install)"
fi

set +e
diff -ru "$TMP/remote" "$LOCAL_DIR" > "$TMP/diff.txt"
set -e
ADDED=$(grep -c '^+[^+]' "$TMP/diff.txt" || true)
REMOVED=$(grep -c '^-[^-]' "$TMP/diff.txt" || true)

echo ""
echo "  *** PRODUCTION PLUGIN DEPLOYMENT ***"
echo "  Target: blog.musthavemods.com  $REMOTE_DIR"
echo "  Diff:   $ADDED line(s) added, $REMOVED line(s) removed"
echo ""

if [ ! -s "$TMP/diff.txt" ]; then
  echo "  Server copy matches local. Nothing to push."
  exit 0
fi

if [ "$DRY" -eq 1 ]; then
  head -120 "$TMP/diff.txt"
  echo "  --dry-run: stopping before upload."
  exit 0
fi

if [ "$YES" -ne 1 ]; then
  read -p "  Show full diff? (y/N) " show
  if [[ "$show" == "y" || "$show" == "Y" ]]; then less -R "$TMP/diff.txt"; fi
  read -p "  Continue with push? (y/N) " ok
  if [[ "$ok" != "y" && "$ok" != "Y" ]]; then echo "Aborted."; exit 0; fi
fi

if [ "$FIRST" -eq 0 ]; then
  BACKUP="$WP_ROOT/../mhm-video-queue-plugin.bak.$(date +%s)"
  echo "==> Backing up server copy to $BACKUP (outside the web root)..."
  "${SSH[@]}" "cp -a '$REMOTE_DIR' '$BACKUP'"
fi

echo "==> Uploading plugin..."
"${SSH[@]}" "mkdir -p '$REMOTE_DIR.new'"
scp -q -r -i "$SSH_KEY" -P "$REMOTE_PORT" "$LOCAL_DIR/." "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}.new/"

echo "==> Linting on the server, then swapping in..."
"${SSH[@]}" "set -e; for f in \$(find '$REMOTE_DIR.new' -name '*.php'); do php -l \"\$f\" >/dev/null; done; rm -rf '$REMOTE_DIR.old'; if [ -d '$REMOTE_DIR' ]; then mv '$REMOTE_DIR' '$REMOTE_DIR.old'; fi; mv '$REMOTE_DIR.new' '$REMOTE_DIR'; rm -rf '$REMOTE_DIR.old'"

echo "==> Checking the blog still answers..."
CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://blog.musthavemods.com/wp-login.php" || true)
echo "    wp-login.php -> HTTP $CODE"
if [ "$CODE" != "200" ]; then
  echo "    WARNING: unexpected status. Roll back with:"
  echo "      ssh ... \"rm -rf '$REMOTE_DIR' && cp -a '${BACKUP:-<no backup on first install>}' '$REMOTE_DIR'\""
  exit 4
fi

if [ "$FIRST" -eq 1 ]; then
  echo ""
  echo "  First install done. Next: WP admin → Plugins → activate \"MHM Video Queue\"."
fi
echo "Done. Run ./scripts/agents/check-blog-sidebar.sh to confirm the blog is unaffected."
