#!/usr/bin/env bash
set -euo pipefail

# Check that critical revenue features are present on blog.musthavemods.com.
# Exits 0 if everything is healthy, non-zero (with loud output) if anything
# is missing.
#
# Run this:
#   - After every push-blog-functions-prod.sh
#   - As a daily cron / nightly compound check
#   - Whenever RPM drops unexpectedly
#
# Usage:
#   ./scripts/agents/check-blog-sidebar.sh
#   ./scripts/agents/check-blog-sidebar.sh --quiet  # only output on failure

QUIET=0
if [[ "${1:-}" == "--quiet" ]]; then
  QUIET=1
fi

# Test pages — pick a real article URL that's been around for a while
TEST_URLS=(
  "https://musthavemods.com/sims-4-cc-finds-2/"
  "https://musthavemods.com/sims-4-trait-mods/"
)

# Critical markers we expect to find in the page HTML.
# Format: "<grep-pattern>|<human-name>"
CRITICAL_MARKERS=(
  'id="secondary"|Mediavine sidebar element'
  'mhm-mv-sidebar|Mediavine sidebar wrapper class'
  'scripts.mediavine.com|Mediavine script loader'
)

FAIL=0

for url in "${TEST_URLS[@]}"; do
  [ "$QUIET" -eq 0 ] && echo "==> Checking: $url"

  TMP_HTML="$(mktemp -t blog_check_XXXXXX.html)"
  trap 'rm -f "$TMP_HTML"' EXIT

  HTTP_CODE=$(curl -sL -A "Mozilla/5.0 (compatible; mhm-sidebar-check/1.0)" \
    -o "$TMP_HTML" -w "%{http_code}" "$url")

  if [ "$HTTP_CODE" != "200" ]; then
    echo "  [FAIL] HTTP $HTTP_CODE on $url"
    FAIL=1
    rm -f "$TMP_HTML"
    continue
  fi

  for entry in "${CRITICAL_MARKERS[@]}"; do
    pattern="${entry%%|*}"
    name="${entry##*|}"
    if ! grep -q "$pattern" "$TMP_HTML"; then
      echo "  [FAIL] Missing: $name  (grep: $pattern)"
      FAIL=1
    elif [ "$QUIET" -eq 0 ]; then
      echo "  [ OK ] $name"
    fi
  done

  rm -f "$TMP_HTML"
done

if [ "$FAIL" -ne 0 ]; then
  echo ""
  echo "  *** BLOG SIDEBAR HEALTH CHECK FAILED ***"
  echo ""
  echo "  Critical revenue features are MISSING from production."
  echo "  This is the same regression that wiped sidebar ads on Mar 17 2026"
  echo "  and cost ~24% RPM (~\$2,000/month) for ~3 weeks."
  echo ""
  echo "  Diagnosis:"
  echo "    1. Pull current prod:    ./scripts/staging/pull-blog-functions-prod.sh"
  echo "    2. Search for marker:    grep -n mhm_inject_mediavine_sidebar staging/wordpress/kadence-child-prod/functions.php"
  echo "    3. If missing, restore from git:  git checkout staging/wordpress/kadence-child-prod/functions.php"
  echo "    4. Push to prod:         ./scripts/staging/push-blog-functions-prod.sh"
  echo "    5. Re-run this check"
  echo ""
  exit 1
fi

[ "$QUIET" -eq 0 ] && echo "" && echo "==> All blog sidebar markers present. Healthy."
exit 0
