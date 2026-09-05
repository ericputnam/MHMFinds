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
#   3. Pinterest token   — live GET /v5/user_account → WARN if invalid (auto-refresh
#                          runs in the pinner itself; this flags before the next post)
#   4. Refresh token TTL — decode JWT payload, warn if expiry < REFRESH_WARN_DAYS
#   5. Catalog pins      — IDs 11421-11427 (E1 batch, inserted 2026-09-04):
#                          report posted count (if --catalog flag present)
#
# CREDENTIALS: reads ~/java_projects/MHMUtils/config.json (no fallback to .env;
# the scoreboard already handles .env fallback — this script is for the runner).

QUIET=0
CATALOG=0
for arg in "$@"; do
  [[ "$arg" == "--quiet"  ]] && QUIET=1
  [[ "$arg" == "--catalog" ]] && CATALOG=1
done

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

if [[ -z "$PINTEREST_TOKEN" ]]; then
  warn "creator_access_token missing from config.json — pinner will fail on next post"
  WARN=1
else
  TOKEN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $PINTEREST_TOKEN" \
    "https://api.pinterest.com/v5/user_account" \
    2>/dev/null)
  TOKEN_STATUS="${TOKEN_STATUS:-000}"

  if [[ "$TOKEN_STATUS" == "200" ]]; then
    ok "Pinterest access token valid (HTTP 200)"
  elif [[ "$TOKEN_STATUS" == "401" ]]; then
    fail "Pinterest access token INVALID (HTTP 401) — pinner auto-refresh should run next cycle, but manual check recommended"
    fail "Run: cd ~/java_projects/MHMUtils && python3 -c \"from pinterest_token_manager import ensure_valid_token; ensure_valid_token()\""
    FAIL=1
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
  say "--- 5. E1 catalog pins (IDs 11421-11427, inserted 2026-09-04)"

  CATALOG_RESP=$(curl -sf \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    "${SUPABASE_URL}/rest/v1/n8n_pinterest_posts?id=gte.11421&id=lte.11427&select=id,%22Is%20Posted%22,%22Post%20Date%22&order=id.asc" \
    2>/dev/null) || { warn "Could not query catalog pins"; WARN=1; }

  if [[ -n "${CATALOG_RESP:-}" ]]; then
    python3 -c "
import json, sys
rows = json.loads(sys.stdin.read())
posted = [r for r in rows if r.get('Is Posted')]
pending = [r for r in rows if not r.get('Is Posted')]
print(f'  E1 catalog pins: {len(posted)}/7 posted, {len(pending)} pending')
for r in rows:
    status = 'posted' if r.get('Is Posted') else 'pending'
    print(f'    ID {r[\"id\"]}: {status} (date={str(r.get(\"Post Date\",\"\"))[:10]})')
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
