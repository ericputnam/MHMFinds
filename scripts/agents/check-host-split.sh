#!/usr/bin/env bash
set -euo pipefail

# Q13 (Pip, 2026-09-21) — reports/funnel/drafts/host-split-301-2026-09-21.md
#
# Verifies the BigScoots-side host-split 301 (blog.musthavemods.com -> apex
# for direct/bot visitors). Safe to run BEFORE the rule exists on the origin —
# check (a) reports "not yet applied" (exit 0) rather than failing hard when
# the direct request still comes back 200, since that's the expected state
# prior to "approve 13 nginx" / "approve 13 functions", and can also mean a
# BigScoots cache HIT is serving a pre-redirect cached copy (see the draft
# doc's cache-race section) even after the rule is live — re-run after a
# cache purge for a trustworthy read.
#
# WHAT IT CHECKS
#   (a) a direct GET of a blog article on blog.* with a browser UA 301s to
#       the apex URL (does NOT follow the redirect)
#   (b) the same URL via the proxy path https://musthavemods.com/<post>/
#       returns 200 with the Mediavine sidebar markers present (reused from
#       check-blog-sidebar.sh — this is the "did we break the proxy" check)
#   (c) wp-json/ on blog.* still returns 200 (infra path must never redirect)
#       — WP's native XML sitemap is NOT live on blog.* (sitemap.xml 301s to
#       wp-sitemap.xml which 404s, confirmed 2026-09-21), so sitemap is not
#       checked here.
#
# USAGE
#   ./scripts/agents/check-host-split.sh
#   ./scripts/agents/check-host-split.sh --quiet   # only output on failure
#
# EXIT CODES
#   0 — all checks passed (including "not yet applied" for check (a), which
#       is expected before the operator approves Q13)
#   1 — check (b) or (c) failed: the proxy or an infra path is broken. This
#       is the "the redirect rule broke something" signal — treat as urgent.

QUIET=0
if [[ "${1:-}" == "--quiet" ]]; then
  QUIET=1
fi

log() {
  [ "$QUIET" -eq 0 ] && echo "$@" || true
}

# A real article that's been live a while — same one used in the draft doc's
# live curl evidence.
TEST_SLUG="sims-4-belly-piercing"
BLOG_URL="https://blog.musthavemods.com/${TEST_SLUG}/"
APEX_URL="https://musthavemods.com/${TEST_SLUG}/"
WPJSON_URL="https://blog.musthavemods.com/wp-json/"
UA="Mozilla/5.0 (compatible; mhm-host-split-check/1.0)"

FAIL=0

# --- (a) direct GET of blog.* — expect 301 to the apex, not followed ---
log "==> (a) direct GET of $BLOG_URL (expect 301 -> apex once Q13 is applied)"

HEADERS_A="$(mktemp -t host_split_a_XXXXXX.txt)"
trap 'rm -f "$HEADERS_A"' EXIT

CODE_A=$(curl -s -o /dev/null -D "$HEADERS_A" -A "$UA" -w "%{http_code}" "$BLOG_URL")

if [ "$CODE_A" = "301" ]; then
  LOCATION_A=$(grep -i '^location:' "$HEADERS_A" | tr -d '\r' | awk '{print $2}')
  if [[ "$LOCATION_A" == "$APEX_URL" || "$LOCATION_A" == "${APEX_URL%/}" ]]; then
    log "  [ OK ] 301 -> $LOCATION_A"
  else
    echo "  [FAIL] 301 but Location is '$LOCATION_A', expected $APEX_URL"
    FAIL=1
  fi
  # The redirect must never be cacheable at BigScoots' edge (see draft doc
  # §3) — flag loudly if it is, since a cached 301 served back to our own
  # proxy fetch is the infinite-loop failure mode this whole design exists
  # to prevent.
  if grep -qi '^x-bigscoots-cache: cache' "$HEADERS_A"; then
    echo "  [FAIL] the 301 response is being CACHED by BigScoots (x-bigscoots-cache: cache)."
    echo "         This risks the redirect being replayed to our own proxy fetch (infinite"
    echo "         loop / 502s on every proxied article). The rule MUST send"
    echo "         Cache-Control: private, no-store on the redirect response — see §3/§4"
    echo "         of the draft doc. Do not leave this unresolved."
    FAIL=1
  fi
elif [ "$CODE_A" = "200" ]; then
  log "  [not yet applied] blog.* still returns 200 direct. Expected before"
  log "  \"approve 13 nginx\" / \"approve 13 functions\" is applied — or the rule"
  log "  is live but this URL is being served from a pre-redirect BigScoots"
  log "  cache HIT (up to 1yr TTL on article pages). Re-run after a purge for"
  log "  a trustworthy read. Not treated as a failure."
else
  echo "  [FAIL] unexpected status $CODE_A on direct GET of $BLOG_URL"
  FAIL=1
fi

rm -f "$HEADERS_A"
trap - EXIT

# --- (b) proxied path via the apex — must still be 200 with sidebar markers ---
log ""
log "==> (b) proxied GET of $APEX_URL (must stay 200 with Mediavine sidebar)"

TMP_HTML="$(mktemp -t host_split_b_XXXXXX.html)"
trap 'rm -f "$TMP_HTML"' EXIT

CODE_B=$(curl -sL -A "$UA" -o "$TMP_HTML" -w "%{http_code}" "$APEX_URL")

if [ "$CODE_B" != "200" ]; then
  echo "  [FAIL] HTTP $CODE_B on $APEX_URL — the proxy is broken. If this"
  echo "         coincides with check (a) returning 301, the exemption header"
  echo "         (X-MHM-Proxy, see middleware.ts) is not being honoured by the"
  echo "         BigScoots rule and the proxy's own fetch is being redirected"
  echo "         — this is the infinite-loop failure mode. Roll back the rule"
  echo "         immediately (draft doc §7)."
  FAIL=1
else
  SIDEBAR_MARKERS=(
    'id="secondary"|Mediavine sidebar element'
    'mhm-mv-sidebar|Mediavine sidebar wrapper class'
    'scripts.mediavine.com|Mediavine script loader'
  )
  for entry in "${SIDEBAR_MARKERS[@]}"; do
    pattern="${entry%%|*}"
    name="${entry##*|}"
    if ! grep -q "$pattern" "$TMP_HTML"; then
      echo "  [FAIL] Missing: $name  (grep: $pattern)"
      FAIL=1
    else
      log "  [ OK ] $name"
    fi
  done
fi

rm -f "$TMP_HTML"
trap - EXIT

# --- (c) infra paths on blog.* must never redirect ---
log ""
log "==> (c) wp-json/ on blog.* must stay 200 (infra path, never redirected)"

CODE_C=$(curl -s -o /dev/null -A "$UA" -w "%{http_code}" "$WPJSON_URL")
if [ "$CODE_C" = "200" ]; then
  log "  [ OK ] wp-json/ -> 200"
else
  echo "  [FAIL] wp-json/ -> $CODE_C (expected 200). The exclusion list in the"
  echo "         host-split rule may be too broad — check the draft doc §4"
  echo "         scope section."
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo ""
  echo "  *** HOST-SPLIT CHECK FAILED ***"
  echo "  See reports/funnel/drafts/host-split-301-2026-09-21.md for the design"
  echo "  and rollback steps (§7)."
  exit 1
fi

log ""
log "==> All host-split checks passed (or correctly report 'not yet applied')."
exit 0
