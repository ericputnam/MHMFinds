#!/usr/bin/env bash
# Sets up the local test WordPress for the video queue (http://localhost:8089).
# Generates throwaway test passwords and writes them to .local-test.env next to this script
# (gitignored). Nothing here is a real credential.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DC=(docker compose -f "$HERE/docker-compose.yml")
# Random DB passwords for the throwaway database, in .env next to the compose file (gitignored).
if [ ! -f "$HERE/.env" ]; then
  umask 077
  printf 'VQ_DB_PASS=%s\nVQ_DB_ROOT_PASS=%s\n' "$(openssl rand -hex 12)" "$(openssl rand -hex 12)" > "$HERE/.env"
fi
ENV_OUT="$HERE/.local-test.env"
"${DC[@]}" up -d
"${DC[@]}" exec -T wp chown www-data:www-data /var/www/mhm-video-queue
cli() { "${DC[@]}" run --rm -T cli wp "$@"; }
for i in $(seq 1 30); do cli db check >/dev/null 2>&1 && break; sleep 2; done
rand() { openssl rand -hex 12; }
if ! cli core is-installed >/dev/null 2>&1; then
  ADMIN_PASS="$(rand)"
  cli core install --url=http://localhost:8089 --title="MHM blog (local test)" --admin_user=admin-test \
    --admin_password="$ADMIN_PASS" --admin_email=admin-test@example.test --skip-email
  cli rewrite structure '/%postname%/' >/dev/null
  echo "LOCAL_WP_ADMIN_USER=admin-test" > "$ENV_OUT"
  echo "LOCAL_WP_ADMIN_PASS=$ADMIN_PASS" >> "$ENV_OUT"
fi
cli plugin activate mhm-video-queue
if ! cli user get writer-test >/dev/null 2>&1; then
  W_PASS="$(rand)"
  cli user create writer-test writer-test@example.test --role=mhm_video_reviewer --display_name="Writer (test)" --user_pass="$W_PASS"
  echo "LOCAL_WP_WRITER_USER=writer-test" >> "$ENV_OUT"
  echo "LOCAL_WP_WRITER_PASS=$W_PASS" >> "$ENV_OUT"
fi
if ! cli user get video-bot-test >/dev/null 2>&1; then
  cli user create video-bot-test video-bot-test@example.test --role=mhm_video_bot --user_pass="$(rand)"
  APP="$(cli user application-password create video-bot-test mac-jobs --porcelain)"
  {
    echo "MHM_WP_VIDEO_URL=http://localhost:8089"
    echo "MHM_WP_VIDEO_USER=video-bot-test"
    echo "MHM_WP_VIDEO_APP_PASSWORD=$APP"
  } >> "$ENV_OUT"
fi
chmod 600 "$ENV_OUT"
echo "Local test WP ready at http://localhost:8089 (test logins in $ENV_OUT)"
