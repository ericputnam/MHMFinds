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
#   1. Pinner staleness  — Pinterest's own `created_at` on the account's newest
#                          pins (GET /v5/pins, newest first). No pin created in
#                          the last RED_AFTER_HOURS (36) → FAIL. The queue table
#                          has NO posted-at column: its "Post Date" is the date
#                          the writer *scheduled* the row for, and the poster
#                          drains oldest-first, so max(Post Date) over posted
#                          rows lags real posting by days. On 2026-09-13 that
#                          proxy said "last post 09-11, 2 days ago → FAIL" while
#                          Pinterest showed 47 pins created in 24 h, the newest
#                          6 minutes before the check (E41). The proxy is still
#                          printed, labelled, and used only when the API cannot
#                          be reached — and then it is a WARN, never a FAIL.
#   2. Inventory runway  — rows the poster can reach today or on any day inside
#                          the next RUNWAY_HORIZON_DAYS (14), divided by the
#                          pins/day Pinterest reports it actually creating
#                          (step 1's 7d mean). MHMUtils/supabase_pin_poster_server.py
#                          (fetch_unposted_entries) selects only rows whose
#                          "Post Date" is inside [today - BACKLOG_LOOKBACK_DAYS, today]
#                          (lookback = 14); rows dated before that are stranded
#                          forever (2026-09-08: all 1,879 unposted rows, reported
#                          "[OK]"). Rows dated after today enter the window on
#                          their date. The queue is drip-dated by design (E26
#                          10/day, E46 14/day), so "schedulable today" is only
#                          the residue of today's allotment after the poster has
#                          drained most of it — 6 on 2026-09-15 with 39 pins
#                          created in 24 h — and the old "< 20 schedulable" WARN
#                          fired on every healthy metered morning (E20 → E51).
#                          WARN only when runway < LOW_RUNWAY_DAYS (3) or the
#                          inventory is actually 0. Never FAIL: liveness (step 1)
#                          is the only FAIL path for the pipeline.
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
#   6. Board sections    — every schedulable row's "Board Section ID" is checked
#                          against the live board (repair-pin-sections.py
#                          --check). One dead section = the poster retries that
#                          row every 20 min and posts nothing (2026-09-10 →
#                          09-12: 138 retries of entry 8007, 0 pins) → FAIL
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

# Must match DEFAULT_RED_AFTER_HOURS in scripts/agents/pinner-liveness-lib.ts.
# The poster runs every 20 min against a queue metered at ~10-30 pins/day, so
# 36 h without a single pin created is a stall, not a lull.
RED_AFTER_HOURS="${PINNER_RED_AFTER_HOURS:-36}"
PINS_PAGE_SIZE="${PINNER_PINS_PAGE_SIZE:-100}"
# Must match PINNER_PINS_MAX_PAGES in funnel-scoreboard.ts. One page of 100
# saturates inside 7 d at the current ~23 pins/day (2026-09-15: 96 "in 7d" from
# a page of 100 vs 162 across three pages), which understates the rate and
# overstates the runway — the wrong direction for a monitor.
PINS_MAX_PAGES="${PINNER_PINS_MAX_PAGES:-3}"
REFRESH_WARN_DAYS="${PINNER_REFRESH_WARN_DAYS:-30}"
# Must match BACKLOG_LOOKBACK_DAYS in MHMUtils/supabase_pin_poster_server.py.
# If that constant changes there, change it here — otherwise this check reports
# a buffer the poster cannot see.
LOOKBACK_DAYS="${PINNER_LOOKBACK_DAYS:-14}"
# Must match DEFAULT_RUNWAY_HORIZON_DAYS / DEFAULT_LOW_RUNWAY_DAYS in
# scripts/agents/pinner-liveness-lib.ts (and the scoreboard's mirror). Inventory
# = unposted rows dated [today - LOOKBACK_DAYS, today + RUNWAY_HORIZON_DAYS];
# runway = inventory ÷ observed pins/day; WARN below LOW_RUNWAY_DAYS.
RUNWAY_HORIZON_DAYS="${PINNER_RUNWAY_HORIZON_DAYS:-14}"
LOW_RUNWAY_DAYS="${PINNER_LOW_RUNWAY_DAYS:-3}"
# Catalog pins inserted by scripts/agents/insert-catalog-pins.py are matched by
# URL rather than by an ID range: an ID range has to be widened by hand after
# every batch, and a range nobody updated silently stops reporting the newest
# pins (the same maintenance trap as the backlog window above).
CATALOG_URL_MATCH="${PINNER_CATALOG_URL_MATCH:-*/games/sims-4/*}"

say "==> Pinner liveness check ($(date -u +%Y-%m-%dT%H:%M)Z)"

# ---- 1. Last pin actually created (Pinterest API) --------------------------
say ""
say "--- 1. Pinner staleness (FAIL if Pinterest shows no pin created in ${RED_AFTER_HOURS}h)"

TOKEN_HELPER="$SCRIPT_DIR/pinterest-token-status.py"

# Queue proxy: max(Post Date) over posted rows. Scheduled date, not a posting
# timestamp — printed for context, used only if the API cannot be reached.
LAST_POST_RESP=$(curl -sf \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "${SUPABASE_URL}/rest/v1/n8n_pinterest_posts?select=id,%22Post%20Date%22&%22Is%20Posted%22=eq.true&order=%22Post%20Date%22.desc&limit=1" \
  2>/dev/null) || true
LAST_DATE=$(python3 -c "
import json, sys
try:
    rows = json.loads(sys.stdin.read())
    print(str(rows[0].get('Post Date',''))[:10] if rows else '')
except Exception:
    print('')
" <<< "${LAST_POST_RESP:-[]}" 2>/dev/null)

# Ask the token manager for a token valid *now* (refreshes config.json in
# place when the stored one has aged out). Output discarded on purpose; the
# token is read back from config.json by python and never echoed.
if command -v python3 >/dev/null 2>&1 && [[ -f "$TOKEN_HELPER" ]]; then
  MHM_UTILS_DIR="$MHM_UTILS" MHM_PINTEREST_CONFIG="$CONFIG_JSON" \
    python3 "$TOKEN_HELPER" >/dev/null 2>&1 || true
fi

set +e
LIVENESS_OUT=$(python3 - "$CONFIG_JSON" "$RED_AFTER_HOURS" "$PINS_PAGE_SIZE" "$PINS_MAX_PAGES" "$LAST_DATE" <<'PY'
import json, sys, datetime, urllib.request, urllib.error, urllib.parse
cfg_path, red_after, page_size, max_pages, proxy = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
# Exit codes: 0 ok, 1 red (stalled), 2 unverified (API unreachable → caller WARNs)
try:
    token = json.load(open(cfg_path)).get('creator_access_token', '')
except Exception:
    token = ''
if not token:
    print("UNVERIFIED\tcreator_access_token missing from config.json"); sys.exit(2)
now = datetime.datetime.now(datetime.timezone.utc)
def parse(s):
    if not s: return None
    s = str(s).strip()
    if s.endswith('Z'): s = s[:-1] + '+00:00'
    try:
        d = datetime.datetime.fromisoformat(s)
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc)
# Page newest-first like funnel-scoreboard.ts pullPinner(): up to max_pages,
# stopping early once a page's oldest pin is older than 7 d. The first page
# must succeed; a later page failing degrades to the pins already seen.
seven_days_ago = now - datetime.timedelta(days=7)
items, bookmark, pages = [], None, 0
while pages < max_pages:
    url = f"https://api.pinterest.com/v5/pins?page_size={page_size}"
    if bookmark:
        url += "&bookmark=" + urllib.parse.quote(bookmark, safe='')
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if pages == 0:
            print(f"UNVERIFIED\tPinterest /v5/pins HTTP {e.code}"); sys.exit(2)
        break
    except Exception as e:
        if pages == 0:
            print(f"UNVERIFIED\tPinterest /v5/pins unreachable: {type(e).__name__}"); sys.exit(2)
        break
    page_items = body.get('items', []) or []
    items.extend(page_items)
    pages += 1
    bookmark = body.get('bookmark') or None
    page_stamps = [d for d in (parse(i.get('created_at')) for i in page_items) if d]
    if not bookmark or not page_items or (page_stamps and min(page_stamps) < seven_days_ago):
        break
stamps = [d for d in (parse(i.get('created_at')) for i in items) if d]
if not stamps:
    print("UNVERIFIED\tPinterest returned no pins with created_at"); sys.exit(2)
last = max(stamps)
hours = max(0.0, (now - last).total_seconds() / 3600)
c24 = sum(1 for d in stamps if 0 <= (now - d).total_seconds() <= 86400)
c7 = sum(1 for d in stamps if 0 <= (now - d).total_seconds() <= 7 * 86400)
sampled = len(items)
floor_mark = '+' if sampled >= page_size * max_pages else ''
stamp = last.strftime('%Y-%m-%d %H:%MZ')
# Fields: STATE<TAB>message<TAB>pins24h<TAB>pins7d — step 2 reads the counts for the runway rate.
if hours > red_after:
    print(f"RED\tlast pin created {stamp} ({hours:.1f} h ago, Pinterest API; threshold {red_after:.0f} h) — the Pinterest pipeline is stalled. Queue proxy: newest posted row dated {proxy or 'n/a'}\t{c24}\t{c7}")
    sys.exit(1)
print(f"OK\tlast pin created {stamp} ({hours:.1f} h ago, Pinterest API) · {c24} pins in 24h, {c7}{floor_mark} in 7d ({sampled} sampled over {pages} page(s)) · queue proxy max(Post Date)={proxy or 'n/a'} (scheduled date, not staleness)\t{c24}\t{c7}")
sys.exit(0)
PY
)
LIVENESS_RC=$?
set -e
LIVENESS_MSG=$(printf '%s' "$LIVENESS_OUT" | head -1 | cut -f2)
PINS_24H=$(printf '%s' "$LIVENESS_OUT" | head -1 | cut -f3 -s)
PINS_7D=$(printf '%s' "$LIVENESS_OUT" | head -1 | cut -f4 -s)

case "$LIVENESS_RC" in
  0)
    ok "$LIVENESS_MSG"
    ;;
  1)
    fail "Pinner stale: $LIVENESS_MSG"
    fail "Look for a poison row first (step 6), then the poster log: ssh ... 'tail -120 ~/domains/blog.musthavemods.com/supabase_pin_poster.log'"
    FAIL=1
    ;;
  *)
    warn "Pinner liveness unverified — ${LIVENESS_MSG:-python3 unavailable}; queue proxy: newest posted row dated ${LAST_DATE:-n/a} (scheduled date — a stale proxy is NOT evidence of a stall)"
    WARN=1
    ;;
esac

# ---- 2. Inventory runway --------------------------------------------------
say ""
say "--- 2. Queue inventory runway (rows dated [today-${LOOKBACK_DAYS}d, today+${RUNWAY_HORIZON_DAYS}d] ÷ observed pins/day; WARN below ${LOW_RUNWAY_DAYS}d)"

TODAY_STR=$(date -u +%Y-%m-%d)
FLOOR_STR=$(python3 -c "
import datetime
print(datetime.date.today() - datetime.timedelta(days=$LOOKBACK_DAYS))
" 2>/dev/null)
HORIZON_STR=$(python3 -c "
import datetime
print(datetime.date.today() + datetime.timedelta(days=$RUNWAY_HORIZON_DAYS))
" 2>/dev/null)

# Counts a PostgREST query via the exact-count Content-Range header.
# Echoes the count, or an empty string if the query failed.
backlog_count() {
  local qs="$1" resp
  resp=$(curl -sf \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Prefer: count=exact" \
    "${SUPABASE_URL}/rest/v1/n8n_pinterest_posts?${qs}" \
    -I 2>/dev/null) || { echo ""; return 0; }
  echo "$resp" | grep -i '^content-range:' | sed 's|.*/||' | tr -d '[:space:]'
}

UNPOSTED_TOTAL=$(backlog_count 'select=id&%22Is%20Posted%22=eq.false')
SCHEDULABLE=$(backlog_count "select=id&%22Is%20Posted%22=eq.false&%22Post%20Date%22=gte.${FLOOR_STR}&%22Post%20Date%22=lte.${TODAY_STR}")
INVENTORY=$(backlog_count "select=id&%22Is%20Posted%22=eq.false&%22Post%20Date%22=gte.${FLOOR_STR}&%22Post%20Date%22=lte.${HORIZON_STR}")
STRANDED=$(backlog_count "select=id&%22Is%20Posted%22=eq.false&%22Post%20Date%22=lt.${FLOOR_STR}")

if [[ -z "$SCHEDULABLE" || -z "$UNPOSTED_TOTAL" || -z "$INVENTORY" ]]; then
  warn "Could not query backlog counts"
  WARN=1
else
  # Mirror of assessRunway() in pinner-liveness-lib.ts: rate = pins7d/7, else
  # pins24h, else unknown. empty/low → WARN; unknown → informational only
  # (step 1 already reported the API outage or the stall); ok → OK.
  RUNWAY_OUT=$(python3 - "$INVENTORY" "$SCHEDULABLE" "${PINS_7D:-}" "${PINS_24H:-}" "$RUNWAY_HORIZON_DAYS" "$LOW_RUNWAY_DAYS" <<'PY'
import sys
inv, sched, p7, p24, horizon, low = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4], int(sys.argv[5]), float(sys.argv[6])
def n(s):
    try: return int(s)
    except (TypeError, ValueError): return None
p7, p24 = n(p7), n(p24)
rate = (p7 / 7) if (p7 is not None and p7 > 0) else (float(p24) if (p24 is not None and p24 > 0) else None)
rate_str = 'rate unknown' if rate is None else f'{rate:.1f}/day observed'
if inv == 0:
    print(f"EMPTY\tqueue empty — 0 unposted rows dated within the poster's window or the next {horizon} days ({rate_str}); cadence now depends entirely on new rows landing")
elif rate is None:
    print(f"UNKNOWN\tinventory {inv} rows dated through +{horizon}d ({sched} still schedulable today); runway not computable — {rate_str}")
else:
    runway = inv / rate
    rs = f"> {horizon} days" if runway > horizon else f"≈ {runway:.1f} days"
    base = f"inventory runway {rs} ({inv} rows dated through +{horizon}d ÷ {rate_str}; {sched} still schedulable today)"
    if runway < low:
        print(f"LOW\t{base} — below the {low:.0f}-day floor; revive stranded rows or wait for the writer plugin")
    else:
        print(f"OK\t{base}")
PY
)
  RUNWAY_STATE=$(printf '%s' "$RUNWAY_OUT" | head -1 | cut -f1)
  RUNWAY_MSG=$(printf '%s' "$RUNWAY_OUT" | head -1 | cut -f2-)
  case "$RUNWAY_STATE" in
    OK)      ok "$RUNWAY_MSG" ;;
    UNKNOWN) say "         $RUNWAY_MSG" ;;
    EMPTY|LOW)
      warn "$RUNWAY_MSG"
      WARN=1
      ;;
    *)
      warn "Runway not evaluated (python3 unavailable?) — inventory ${INVENTORY} rows, ${SCHEDULABLE} schedulable today"
      WARN=1
      ;;
  esac

  if [[ -n "${STRANDED:-}" && "$STRANDED" -gt 0 ]]; then
    say "         $STRANDED unposted rows are dated before ${FLOOR_STR} and are unreachable by the poster"
    say "         Re-dating a capped slice forward is a Tier 1 cadence change, not a bug fix:"
    say "         scripts/agents/revive-stranded-pins.py (dry run by default, --apply to write)"
  fi
  say "         $UNPOSTED_TOTAL unposted rows in the table in total"
fi

# ---- 3. Pinterest token validity ------------------------------------------
say ""
say "--- 3. Pinterest access token"

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

# ---- 6. Board sections on schedulable rows --------------------------------
# The poster posts ONE row per run, oldest first, and neither marks nor skips
# a row Pinterest rejects. A schedulable row whose "Board Section ID" no
# longer exists (404 code 2031) is therefore retried every 20 minutes forever
# while everything behind it waits: 2026-09-10 06:40 → 09-12, 138 retries of
# entry 8007, 0 pins, valid token, 56 rows in the window. Steps 1–4 all
# passed on 09-11. This step asks Pinterest whether every schedulable row's
# section is live, exactly the check the poster does not do (E36).
say ""
say "--- 6. Board sections on schedulable rows (a dead section blocks the whole queue)"

SECTION_HELPER="$SCRIPT_DIR/repair-pin-sections.py"
if command -v python3 >/dev/null 2>&1 && [[ -f "$SECTION_HELPER" ]]; then
  set +e
  SECTION_OUT=$(MHM_UTILS_DIR="$MHM_UTILS" MHM_PINTEREST_CONFIG="$CONFIG_JSON" \
    python3 "$SECTION_HELPER" --check 2>&1)
  SECTION_RC=$?
  set -e
  case "$SECTION_RC" in
    0)
      ok "$(printf '%s' "$SECTION_OUT" | head -1)"
      ;;
    1)
      while IFS= read -r line; do fail "$line"; done <<< "$SECTION_OUT"
      FAIL=1
      ;;
    *)
      warn "Board sections not evaluated: $(printf '%s' "$SECTION_OUT" | head -1)"
      WARN=1
      ;;
  esac
else
  warn "repair-pin-sections.py not available alongside this script — board sections not checked"
  WARN=1
fi

# ---- 5. Catalog pin drain (E1 batch, optional) ----------------------------
if [[ "$CATALOG" -eq 1 ]]; then
  say ""
  say "--- 5. Catalog pins (every queued ${CATALOG_URL_MATCH} row: E1 2026-09-04, makeup-cc/witch-cc 2026-09-07, decor-cc 2026-09-08)"

  CATALOG_MATCH_ENC=$(python3 -c "
import urllib.parse, sys
print(urllib.parse.quote('like.' + '''$CATALOG_URL_MATCH''', safe=''))
" 2>/dev/null)

  CATALOG_RESP=$(curl -sf \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    "${SUPABASE_URL}/rest/v1/n8n_pinterest_posts?%22Post%20URL%22=${CATALOG_MATCH_ENC}&select=id,%22Post%20URL%22,%22Is%20Posted%22,%22Post%20Date%22&order=id.asc" \
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
