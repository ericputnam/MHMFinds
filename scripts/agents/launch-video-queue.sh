#!/usr/bin/env bash
set -euo pipefail

# launchd entry for the video queue jobs. Installed to ~/.mhm-video-queue/bin/ (docs/VIDEO_QUEUE.md)
# so it works whatever branch the main checkout is on: it runs origin/main's copy of
# run-video-queue.sh, which then builds its own clean worktree of origin/main.
#   launch-video-queue.sh --weekly | --revisions

PROJECT_DIR="/Users/eputnam/java_projects/MHMFinds"
RUNNER_PATH="scripts/agents/run-video-queue.sh"

git -C "$PROJECT_DIR" fetch --quiet origin main
RUNNER="$(mktemp -t mhm-video-queue-runner)"
trap 'rm -f "$RUNNER"' EXIT
git -C "$PROJECT_DIR" show "origin/main:$RUNNER_PATH" > "$RUNNER"
bash "$RUNNER" "$@"
