#!/usr/bin/env bash
set -euo pipefail

# Pip — Pinterest pinner liveness check (T0, 2026-09-05)
#
# Checks the Supabase queue + Pinterest API token independently of the full
# scoreboard run.  Designed to run standalone, from deploy-verify.sh, or
# from the evening guardrail check.
#
# EXIT CODES:
#   0  all healthy (or --quiet and healthy)
#   1  FAIL — pinner stale or token invalid (needs immediate attention)
#   2  WARN — backlog low / catalog pins pending (watch, not critical)
#
# USAGE:
#   ./scripts/agents/check-pinner.sh
#   ./scripts/agents/check-pinner.sh --quiet        # silent on full health
#   ./scripts/agents/check-pinner.sh --catalog      # also report catalog pin status
#
# WHAT IT CHECKS:
#   1. Pinner staleness  — last "Is Posted"=true row older than STALE_DAYS → FAIL
#   2. Backlog drain     — unposted backlog = 0 → WARN
#   3. Pinterest token   — asks the token manager (pinterest-token-status.py, which
#                          prefers MHMUtils/pinterest_token_manager.ensure_valid_token
#                          and falls back to an embedded stdlib port) for a *valid*
#                          token instead of trusting the stored string. A stale
#                          stored token that the refresh token can renew is no longer
#                          a FAIL — only a dead refresh token is (operator-queue Q2,
#                          2026-09-05: "Pip owns the token-manager port")
#   4. Refresh token TTL — decode JWT payload, warn if expiry < REFRESH_WARN_DAYS
#   5. Catalog pins      — IDs 11421-11429 (E1 batch 2026-09-04 + makeup-cc /
#                          witch-cc 2026-09-07): report posted count (--catalog)
#
# CREDENTIALS: reads ~/java_projects/MHMUtils/config.json (no fallback to .env;
# the scoreboard already handles .env fallback — this script is for the runner).

QUIET=0
CATALOG=0
NO_REFRESH=0
for arg in "$@"; do
  [[ "$arg" == "--quiet"      ]] && QUIET=1
  [[ "$arg" == "--catalog"    ]] && CATALOG=1
  [[ "$arg" == "--no-refresh" ]] && NO_REFRESH=1
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---- colour helpers (suppressed when not a tty) ---------------------------
if [[ -t 1 ]]; then
  RED='\033[0;31m'; YEL='\033[0;33m'; GRN='\033[0;32m'; NC='\033[0m'
else
  RED=''; YEL=''; NC=''; GRN=''
fi

say()  { [[ "$QUIET" -eq 0 ]] && echo -e "$*" || true; }
ok()   { say "  ${GRN}[OK]${NC}   $*"; }
warn() { say "  ${YEL}[WARN]${NC} $*"; }
fail() { echo -e "  ${RED}[FAIL]${NC} $*"; }  # always printed

FAIL=0
WARN=0

# ---- locate creds ---------------------------------------------------------
MHM_UTILS="${MHM_UTILS_DIR:-$HOME/java_projects/MHMUtils}"
CONFIG_JSON="$MHM_UTILS/config.json"

if [[ ! -f "$CONFIG_JSON" ]]; then
  fail "MHMUtils config.json not found at $CONFIG_JSON — cannot check pinner"
  exit 1
fi

SUPABASE_URL=$(python3 -c "import json,sys; c=json.load(open('$CONFIG_JSON')); print(c.get('SUPABASE_URL','').rstrip('/'))" 2>/dev/null)
SUPABASE_KEY=$(python3 -c "import json,sys; c=json.load(open('$CONFIG_JSON')); print(c.get('SUPABASE_KEY',''))" 2>/dev/null)
PINTEREST_TOKEN=$(python3 -c "import json,sys; c=json.load(open('$CONFIG_JSON')); print(c.get('creator_access_token',''))" 2>/dev/null)
REFRESH_TOKEN=$(python3 -c "import json,sys; c=json.load(open('$CONFIG_JSON')); print(c.get('creator_refresh_token',''))" 2>/dev/null)

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_KEY" ]]; then
  fail "Supabase creds missing from config.json"
  exit 1
fi

STALE_DAYS="${PINNER_STALE_DAYS:-1}"
REFRESH_WARN_DAYS="${PINNER_REFRESH_WARN_DAYS:-30}"
# Catalog-pin batches inserted by scripts/agents/insert-catalog-pins.py.
CATALOG_ID_MIN="${PINNER_CATALOG_ID_MIN:-11421}"
CATALOG_ID_MAX="${PINNER_CATALOG_ID_MAX:-11429}"

say "==> Pinner liveness check ($(date -u +%Y-%m-%dT%H:%M)Z)"

# ---- 1. Last posted date --------------------------------------------------
say ""
say "--- 1. Pinner staleness (stale if last post > ${STALE_DAYS}d ago)"

LAST_POST_RESP=$(curl -sf \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "${SUPABASE_URL}/rest/v1/n8n_pinterest_posts?select=id,%22Post%20Date%22&%22Is%20Posted%22=eq.true&order=%22Post%20Date%22.desc&limit=1" \
  2>/dev/null) || { fail "Supabase query failed — check network / key"; FAIL=1; }

if [[ -n "${LAST_POST_RESP:-}" ]]; then
  LAST_DATE=$(python3 -c "
import json, sys, datetime
rows = json.loads(sys.stdin.read())
if rows:
    d = str(rows[0].get('Post Date',''))[:10]
    print(d)
else:
    print('')
" <<< "$LAST_POST_RESP" 2>/dev/null)

  if [[ -z "$LAST_DATE" ]]; then
    fail "No posted rows in Supabase — pinner has never posted or table is empty"
    FAIL=1
  else
    STALE_INFO=$(python3 -c "
import datetime, sys
last = datetime.date.fromisoformat('$LAST_DATE')
today = datetime.date.today()
days = (today - last).days
print(days)
" 2>/dev/null)
    if [[ "$STALE_INFO" -gt "$STALE_DAYS" ]]; then
      fail "Pinner stale: last post $LAST_DATE ($STALE_INFO days ago, threshold ${STALE_DAYS}d) — Pinterest pipeline may be stopped"
      FAIL=1
    else
      ok "Last pin posted: $LAST_DATE ($STALE_INFO days ago)"
    fi
  fi
fi

# ---- 2. Backlog count -----------------------------------------------------
say ""
say "--- 2. Queue backlog"

BACKLOG_RESP=$(curl -sf \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Prefer: count=exact" \
  "${SUPABASE_URL}/rest/v1/n8n_pinterest_posts?select=id&%22Is%20Posted%22=eq.false" \
  -I 2>/dev/null) || { warn "Could not query backlog count"; WARN=1; }

if [[ -n "${BACKLOG_RESP:-}" ]]; then
  BACKLOG_COUNT=$(echo "$BACKLOG_RESP" | grep -i '^content-range:' | sed 's|.*\/||' | tr -d '[:space:]' || echo "0")
  if [[ "$BACKLOG_COUNT" -eq 0 ]]; then
    warn "Queue empty — backlog = 0 unposted pins. New posts must be added to maintain cadence."
    WARN=1
  elif [[ "$BACKLOG_COUNT" -lt 50 ]]; then
    warn "Backlog low: $BACKLOG_COUNT unposted pins (fill queue if below 200 for sustained cadence)"
    WARN=1
  else
    ok "Backlog: $BACKLOG_COUNT unposted pins"
  fi
fi

# ---- 3. Pinterest token validity ------------------------------------------
say ""
say "--- 3. Pinterest access token"

TOKEN_HELPER="$SCRIPT_DIR/pinterest-token-status.py"

if command -v python3 >/dev/null 2>&1 && [[ -f "$TOKEN_HELPER" ]]; then
  # Ask the token manager for a token that is valid *now*. It refreshes from
  # creator_refresh_token when the stored access token has aged out (v5 access
  # tokens live ~30 days) and writes the new one back to config.json, which is
  # the same token the pinner will use on its next run. No token is printed.
  HELPER_ARGS=()
  [[ "$NO_REFRESH" -eq 1 ]] && HELPER_ARGS+=("--no-refresh")

  set +e
  TOKEN_OUT=$(MHM_UTILS_DIR="$MHM_UTILS" MHM_PINTEREST_CONFIG="$CONFIG_JSON" \
    python3 "$TOKEN_HELPER" ${HELPER_ARGS[@]+"${HELPER_ARGS[@]}"} 2>&1)
  TOKEN_RC=$?
  set -e

  TOKEN_STATE=$(printf '%s' "$TOKEN_OUT" | head -1 | cut -f1)
  TOKEN_BACKEND=$(printf '%s' "$TOKEN_OUT" | head -1 | cut -f2)
  TOKEN_MSG=$(printf '%s' "$TOKEN_OUT" | head -1 | cut -f3-)

  case "$TOKEN_RC" in
    0)
      if [[ "$TOKEN_STATE" == "REFRESHED" ]]; then
        ok "Pinterest token renewed by the token manager ($TOKEN_BACKEND) — pipeline healthy"
      else
        ok "Pinterest token valid (via $TOKEN_BACKEND token manager)"
      fi
      ;;
    2)
      warn "Pinterest token not evaluated [$TOKEN_STATE]: $TOKEN_MSG"
      WARN=1
      ;;
    *)
      fail "Pinterest token UNRECOVERABLE [$TOKEN_STATE]: $TOKEN_MSG"
      fail "Operator action: cd ~/java_projects/MHMUtils && python3 pinterest_token_helper.py (one-time re-authorization)"
      FAIL=1
      ;;
  esac
elif [[ -z "$PINTEREST_TOKEN" ]]; then
  # Degraded path: no python3 or no helper alongside this script.
  warn "creator_access_token missing from config.json and the token manager is unavailable"
  WARN=1
else
  TOKEN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $PINTEREST_TOKEN" \
    "https://api.pinterest.com/v5/user_account" \
    2>/dev/null)
  TOKEN_STATUS="${TOKEN_STATUS:-000}"

  if [[ "$TOKEN_STATUS" == "200" ]]; then
    ok "Pinterest access token valid (HTTP 200; token manager unavailable, stored token checked directly)"
  elif [[ "$TOKEN_STATUS" == "401" ]]; then
    # Recoverable on its own: the pinner refreshes before it posts. WARN, not FAIL.
    warn "Stored Pinterest access token is stale (HTTP 401) and the token manager is unavailable here"
    warn "Run where python3 exists: scripts/agents/pinterest-token-status.py"
    WARN=1
  elif [[ "$TOKEN_STATUS" == "000" ]]; then
    warn "Pinterest API unreachable (curl error) — check network"
    WARN=1
  else
    warn "Pinterest API returned HTTP $TOKEN_STATUS — token may have restricted scopes"
    WARN=1
  fi
fi

# ---- 4. Refresh token TTL -------------------------------------------------
say ""
say "--- 4. Refresh token TTL"

# Re-read: a refresh in step 3 can rotate creator_refresh_token, so the value
# read at startup may already be superseded.
REFRESH_TOKEN=$(python3 -c "import json; c=json.load(open('$CONFIG_JSON')); print(c.get('creator_refresh_token',''))" 2>/dev/null || echo "$REFRESH_TOKEN")

if [[ -z "$REFRESH_TOKEN" ]]; then
  warn "creator_refresh_token missing from config.json — cannot auto-refresh expired access token"
  WARN=1
else
  DAYS_LEFT=$(python3 -c "
import base64, json, datetime, sys
token = '$REFRESH_TOKEN'
# Strip 'pinr.' prefix, split into header.payload.sig
raw = token[5:] if token.startswith('pinr.') else token
parts = raw.split('.')
if len(parts) < 2:
    print(-1)
    sys.exit(0)
try:
    padded = parts[1] + '=' * (4 - len(parts[1]) % 4)
    payload = json.loads(base64.b64decode(padded))
    iat = payload.get('iat', 0)
    exp_rel = payload.get('exp', 0)
    if iat and exp_rel:
        exp_abs = iat + exp_rel
        days = (datetime.datetime.fromtimestamp(exp_abs) - datetime.datetime.now()).days
        print(days)
    else:
        print(-1)
except Exception:
    print(-1)
" 2>/dev/null)

  if [[ "$DAYS_LEFT" -lt 0 ]]; then
    fail "Refresh token EXPIRED or could not decode — manual Pinterest OAuth re-authorization required"
    fail "See ~/java_projects/MHMUtils/CLAUDE.md -> Pinterest API Authentication"
    FAIL=1
  elif [[ "$DAYS_LEFT" -le "$REFRESH_WARN_DAYS" ]]; then
    warn "Refresh token expires in $DAYS_LEFT days — re-authorize before expiry to avoid silent pipeline failure"
    WARN=1
  else
    ok "Refresh token TTL: $DAYS_LEFT days remaining"
  fi
fi

# ---- 5. Catalog pin drain (E1 batch, optional) ----------------------------
if [[ "$CATALOG" -eq 1 ]]; then
  say ""
  say "--- 5. Catalog pins (IDs ${CATALOG_ID_MIN}-${CATALOG_ID_MAX}: E1 2026-09-04, makeup-cc/witch-cc 2026-09-07)"

  CATALOG_RESP=$(curl -sf \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    "${SUPABASE_URL}/rest/v1/n8n_pinterest_posts?id=gte.${CATALOG_ID_MIN}&id=lte.${CATALOG_ID_MAX}&select=id,%22Post%20URL%22,%22Is%20Posted%22,%22Post%20Date%22&order=id.asc" \
    2>/dev/null) || { warn "Could not query catalog pins"; WARN=1; }

  if [[ -n "${CATALOG_RESP:-}" ]]; then
    python3 -c "
import json, sys
rows = json.loads(sys.stdin.read())
posted = [r for r in rows if r.get('Is Posted')]
pending = [r for r in rows if not r.get('Is Posted')]
print(f'  Catalog pins: {len(posted)}/{len(rows)} posted, {len(pending)} pending')
for r in rows:
    status = 'posted' if r.get('Is Posted') else 'pending'
    page = str(r.get('Post URL','')).rstrip('/').split('/')[-1]
    print(f'    ID {r[\"id\"]} {page}: {status} (date={str(r.get(\"Post Date\",\"\"))[:10]})')
" <<< "$CATALOG_RESP" 2>/dev/null
  fi
fi

# ---- summary --------------------------------------------------------------
say ""
if [[ "$FAIL" -eq 1 ]]; then
  fail "==> PINNER CHECK FAILED — Pinterest pipeline needs attention"
  exit 1
elif [[ "$WARN" -eq 1 ]]; then
  warn "==> PINNER CHECK: warnings present — review above"
  exit 2
else
  ok "==> Pinner healthy"
  exit 0
fi
