#!/usr/bin/env bash
# scripts/agents/cleanup-empty-compound-branches.sh
#
# Why: scripts/compound/auto-compound.sh used to push a `compound/*` branch to origin
# every night regardless of whether it contained any real work — an all-completed
# prd.json (or a PRD/tasks-conversion step that silently failed to write pending tasks)
# produced 0 commits ahead of origin/main, but the OLD code only checked `git diff
# --quiet` on the working tree, which passes trivially once everything is committed. 21
# of the ~20 `compound/*` branches on origin were found to be 0 commits ahead of main.
# auto-compound.sh is now fixed at the source (it checks commits-ahead before pushing and
# never pushes an empty branch again — see its BASE_SHA / AHEAD logic), so this script is
# a one-time-and-occasional janitor for whatever empty branches already exist on origin
# from before that fix, or from any other source that still pushes one.
#
# Usage: cleanup-empty-compound-branches.sh [--pattern 'compound/*'] [--apply] [--remote origin] [--base main]
#   (default) dry run — lists every remote branch matching --pattern that is 0 commits
#             ahead of --remote/--base, and does not touch anything.
#   --apply   actually deletes each listed branch from the remote (git push --delete).
#             NEVER pass this without having reviewed the dry-run list first.
# Exit: 0 ran (whether or not anything was found/deleted) · 2 could not fetch/read
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PATTERN="compound/*"
REMOTE="origin"
BASE="main"
APPLY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --pattern) PATTERN="$2"; shift ;;
    --remote) REMOTE="$2"; shift ;;
    --base) BASE="$2"; shift ;;
    --apply) APPLY=1 ;;
    *) echo "cleanup-empty-compound-branches: unknown argument: $1"; exit 64 ;;
  esac
  shift
done

cd "$ROOT" || exit 2
if ! git fetch -q "$REMOTE" "$BASE" >/dev/null 2>&1; then
  echo "cleanup-empty-compound-branches: could not fetch $REMOTE/$BASE"; exit 2
fi
if ! git fetch -q "$REMOTE" >/dev/null 2>&1; then
  echo "cleanup-empty-compound-branches: could not fetch $REMOTE (branch list)"; exit 2
fi

BASE_SHA="$(git rev-parse "$REMOTE/$BASE" 2>/dev/null)"
[ -n "$BASE_SHA" ] || { echo "cleanup-empty-compound-branches: could not resolve $REMOTE/$BASE"; exit 2; }

# List remote branches matching the glob pattern (default compound/*), stripping the
# remotes/<remote>/ prefix. Portable to bash 3.2 (macOS's /bin/bash has no `mapfile`) —
# use a plain while-read loop and a scratch file instead of arrays populated by process
# substitution.
BRANCH_LIST="$(mktemp "${TMPDIR:-/tmp}/cleanup-empty-compound-branches.XXXXXX")"
trap 'rm -f "$BRANCH_LIST" "${EMPTY_LIST:-}"' EXIT
git for-each-ref --format='%(refname:strip=3)' "refs/remotes/$REMOTE/" 2>/dev/null >"$BRANCH_LIST"

TOTAL=0
NONEMPTY=0
EMPTY_COUNT=0
EMPTY_LIST="$(mktemp "${TMPDIR:-/tmp}/cleanup-empty-compound-branches-empty.XXXXXX")"
: >"$EMPTY_LIST"
while IFS= read -r b; do
  [ -n "$b" ] || continue
  case "$b" in
    $PATTERN) ;;
    *) continue ;;
  esac
  [ "$b" = "$BASE" ] && continue
  TOTAL=$((TOTAL + 1))
  sha="$(git rev-parse "$REMOTE/$b" 2>/dev/null)" || continue
  ahead="$(git rev-list --count "$BASE_SHA".."$sha" 2>/dev/null || echo "")"
  if [ -z "$ahead" ]; then
    echo "cleanup-empty-compound-branches: could not compute ahead-count for $b — skipping"
    continue
  fi
  if [ "$ahead" -eq 0 ]; then
    echo "$b" >>"$EMPTY_LIST"
    EMPTY_COUNT=$((EMPTY_COUNT + 1))
  else
    NONEMPTY=$((NONEMPTY + 1))
  fi
done <"$BRANCH_LIST"

if [ "$TOTAL" -eq 0 ]; then
  echo "cleanup-empty-compound-branches: no $REMOTE branches match pattern '$PATTERN'"
  exit 0
fi

echo "cleanup-empty-compound-branches: $TOTAL branch(es) matched '$PATTERN', $NONEMPTY have real commits, $EMPTY_COUNT are 0 commits ahead of $REMOTE/$BASE:"
while IFS= read -r b; do
  [ -n "$b" ] && echo "  EMPTY  $b"
done <"$EMPTY_LIST"

if [ "$EMPTY_COUNT" -eq 0 ]; then
  echo "cleanup-empty-compound-branches: nothing to clean up."
  exit 0
fi

if [ "$APPLY" -ne 1 ]; then
  echo ""
  echo "cleanup-empty-compound-branches: DRY RUN — no branches deleted. Re-run with --apply to delete the $EMPTY_COUNT branch(es) above from $REMOTE."
  exit 0
fi

echo ""
echo "cleanup-empty-compound-branches: --apply set — deleting $EMPTY_COUNT branch(es) from $REMOTE..."
FAILED=0
while IFS= read -r b; do
  [ -n "$b" ] || continue
  if git push "$REMOTE" --delete "$b" 2>&1; then
    echo "  deleted $b"
  else
    echo "  FAILED to delete $b"
    FAILED=$((FAILED + 1))
  fi
done <"$EMPTY_LIST"
[ "$FAILED" -eq 0 ] || exit 2
exit 0
