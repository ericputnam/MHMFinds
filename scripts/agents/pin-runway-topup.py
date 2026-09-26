#!/usr/bin/env python3
"""Bounded, standing-approved Pinterest pin-queue top-up (Pip, Distribution).

WHY THIS EXISTS (operator standing approval, 2026-09-22)
    revive-stranded-pins.py's Tier 2 rule (SD-10, 2026-09-19) is that a
    revival slice only runs on the operator's written, per-package approval —
    because three earlier revivals (E26/E46/E56) each pushed hundreds of rows
    newest-first and Pinterest sessions fell. On 2026-09-22 the operator
    granted Pip a *standing* exception, scoped narrowly enough that it does
    not reopen that risk: when runway drops below 2.0 days, this tool may
    top the queue up on its own, but only by a small, capped, sessions-ranked
    slice that stops the moment runway reaches 3.0 days. It is not a second
    copy of revive-stranded-pins.py's newest-first, hundreds-of-rows blast —
    it is a narrow, code-enforced exception to the "ask first" rule.

    Every bound below is enforced in code, per the compound-learnings rule
    "a `// Do NOT re-add` comment is not a gate — encode the removal (or, here,
    the boundary) as a test in the same PR." None of this is advisory.

BOUNDS (operator standing approval, 2026-09-22 — all enforced, not advisory)
    * runway >= 2.0 days -> no-op. Exit 0, nothing written, nothing planned.
    * runway (or the posted rate it depends on) not computable with
      confidence -> `unknown`. Exit 2, no write. A probe that can be wrong
      about the world must never return a verdict that triggers a write.
    * <= 7 rows/day, and never more than
      floor(trailing-14-day average daily *posted* rate) minus however many
      of the writer's own rows are already scheduled for that day.
    * selection is sessions-ranked: this tool never invents its own ranking.
      It reuses revive-stranded-pins.py's `--ids-from` machinery (imported,
      not duplicated) against the same package shape
      (`destinations[].ids` / `{"ids": [...]}` / a bare list) an analysis
      produced. Without `--ids-from` it has no sessions-ranked source and,
      per the operator's condition, refuses to --apply (pass
      `--allow-unranked-emergency` to override, which is logged in the
      ledger and printed in bold in the summary).
    * never touches the writer's own scheduled/fresh rows: the selection
      floor is identical to revive-stranded-pins.py's default/--ids-from
      modes — `"Is Posted"=false` AND `"Post Date" < today - LOOKBACK_DAYS`
      (rows the poster's own window cannot reach) — and `"Is Posted"=false`
      is re-checked in the *update* filter, not just the select, exactly as
      revive-stranded-pins.py does.
    * fills only enough days to bring the plan's runway to 3.0 days, then
      stops. It does not round a day up to fill unused per-day capacity once
      the target is reached.
    * dry run is the default; `--apply` is required to write.
    * hard cap of 21 rows per invocation, whatever the flags say.
    * writes an undo ledger in the exact shape revive-stranded-pins.py's
      `--rollback` already reads (`entries[].{id,old_date,new_date}`), so the
      rollback command is that script, not a second rollback path.
    * refuses a second `--apply` on the same UTC day (checks its own ledger
      directory before writing).

WHAT IT DOES NOT DO
    It does not compute the sessions ranking itself (no GA/GSC calls here —
    keep this script dependency-free and read-only-by-default). It does not
    verify destination/image URL liveness or board sections itself; it
    delegates to revive-stranded-pins.py's `drop_dead_sections` /
    `url_alive` (imported) so the same E36 poison-row protection applies.

USAGE
    python3 scripts/agents/pin-runway-topup.py                      # dry run
    python3 scripts/agents/pin-runway-topup.py --ids-from PKG.json  # dry run, ranked
    python3 scripts/agents/pin-runway-topup.py --ids-from PKG.json --apply
    python3 scripts/agents/pin-runway-topup.py --self-test           # offline
    python3 scripts/agents/pin-runway-topup.py --json                # machine output

ENV
    MHM_PINTEREST_CONFIG  path to the pinner config.json (default matches
                          revive-stranded-pins.py: ~/java_projects/MHMUtils/config.json)

Credentials are read from that file and are never printed or logged.
"""

import argparse
import glob
import importlib.util
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------
# Bounds. HARD_CAP wins over everything else, always.
# ---------------------------------------------------------------------------
TOPUP_LOW_RUNWAY_DAYS = 2.0      # trigger: below this, a top-up is permitted
TOPUP_TARGET_RUNWAY_DAYS = 3.0   # stop condition: fill only up to this
MAX_ROWS_PER_DAY = 7
HARD_CAP = 21
RATE_WINDOW_DAYS = 14            # trailing window for the posted-rate estimate
RUNWAY_HORIZON_DAYS = 14         # must match pinner-liveness-lib.ts's DEFAULT_RUNWAY_HORIZON_DAYS
LOOKBACK_DAYS = 14               # must match revive-stranded-pins.py's LOOKBACK_DAYS
MAX_FILL_HORIZON_DAYS = 60       # safety valve so a near-zero rate can't loop forever

TABLE = 'n8n_pinterest_posts'
DEFAULT_CONFIG = os.path.join(
    os.path.expanduser('~'), 'java_projects', 'MHMUtils', 'config.json')
DEFAULT_LEDGER_DIR = os.path.join('reports', 'funnel')
LEDGER_PREFIX = 'pin-runway-topup-'


# ---------------------------------------------------------------------------
# Reuse revive-stranded-pins.py rather than duplicating it (file has hyphens
# in its name, so a normal `import` can't reach it — same dynamic-load
# pattern that script itself uses for repair-pin-sections.py).
# ---------------------------------------------------------------------------

def _load_revive_module():
    path = os.path.join(SCRIPT_DIR, 'revive-stranded-pins.py')
    if not os.path.isfile(path):
        return None
    spec = importlib.util.spec_from_file_location('mhm_revive_stranded_pins', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_REVIVE = None


def revive():
    """Lazily loaded so --self-test and unit tests never need network/config."""
    global _REVIVE
    if _REVIVE is None:
        _REVIVE = _load_revive_module()
        if _REVIVE is None:
            print('ERROR: revive-stranded-pins.py not found next to this script — '
                  'cannot reuse its selection/allocation logic')
            sys.exit(2)
    return _REVIVE


# ---------------------------------------------------------------------------
# Supabase / Pinterest reads. Every one of these is read-only. Writes happen
# only in apply_plan() below, gated by --apply.
# ---------------------------------------------------------------------------

def count_exact(config, query):
    """Exact row count via PostgREST's Content-Range header (no body fetched).
    Returns None if the count cannot be determined confidently."""
    url = '{}/rest/v1/{}?{}'.format(
        config['SUPABASE_URL'].rstrip('/'), TABLE, query)
    headers = {
        'apikey': config['SUPABASE_KEY'],
        'Authorization': 'Bearer ' + config['SUPABASE_KEY'],
        'Prefer': 'count=exact',
        'Range': '0-0',
    }
    req = urllib.request.Request(url, headers=headers, method='GET')
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            response.read()
            content_range = response.headers.get('Content-Range', '')
    except Exception:
        return None
    if '/' not in content_range:
        return None
    total = content_range.rsplit('/', 1)[-1].strip()
    if not total.isdigit():
        return None
    return int(total)


def q(value):
    return urllib.parse.quote(str(value), safe='')


def count_inventory(config, today, horizon_days=RUNWAY_HORIZON_DAYS,
                     lookback_days=LOOKBACK_DAYS):
    """Unposted rows dated inside the poster's window or the look-ahead
    horizon — mirrors check-pinner.sh step 2 / pinner-liveness-lib.ts's
    assessRunway() inventory definition exactly, so this tool's "runway"
    means the same thing the scoreboard reports."""
    floor_str = str(today - timedelta(days=lookback_days))
    horizon_str = str(today + timedelta(days=horizon_days))
    query = ('%22Is%20Posted%22=eq.false'
             '&%22Post%20Date%22=gte.{floor}&%22Post%20Date%22=lte.{horizon}'
             ).format(floor=q(floor_str), horizon=q(horizon_str))
    return count_exact(config, query)


def count_writer_rows_for_date(config, day):
    """Writer-attributed rows (Wordpress Post ID set — see
    pinner-liveness-lib.ts's writer-liveness section for why that column is
    the identifying marker) already scheduled for `day`. These are never
    touched by this tool; they only shrink the day's remaining capacity."""
    day_str = str(day)
    query = ('%22Is%20Posted%22=eq.false&%22Post%20Date%22=eq.{day}'
             '&%22Wordpress%20Post%20ID%22=not.is.null').format(day=q(day_str))
    return count_exact(config, query)


def fetch_pinterest_pins_created_since(config, since, page_size=100,
                                        max_pages=5, timeout=30):
    """Pinterest's own created_at, newest-first, stopping once a page is
    entirely older than `since` — the same approach check-pinner.sh uses for
    its 7d rate, widened to RATE_WINDOW_DAYS so the top-up cap uses a longer,
    steadier baseline than the liveness check's stall detector does. Returns
    None (not 0) if the API cannot be reached, so a network hiccup can never
    read as "posted rate is zero rows/day".

    Returns (stamps, complete). `complete` is False when the fetch stopped
    before it saw a pin older than `since` — a later page timed out, the
    page cap was hit, or the account's newest pins simply saturate the
    sample. In that case len(stamps) is a *floor* on the window count, not
    the count (2026-09-26: one page of 100 landed, page 2 timed out, and
    100 ÷ 14 = 7.14/day read as "runway 8.8 d, no-op" while the queue
    proxy showed 36/day and 1.75 d). A zero-rows vacuity guard does not
    cover a truncated fetch; the caller must treat complete=False as
    unknown."""
    token = config.get('creator_access_token', '')
    if not token:
        return None, False
    items, bookmark, pages = [], None, 0
    complete = False
    while pages < max_pages:
        url = 'https://api.pinterest.com/v5/pins?page_size={}'.format(page_size)
        if bookmark:
            url += '&bookmark=' + urllib.parse.quote(bookmark, safe='')
        req = urllib.request.Request(
            url, headers={'Authorization': 'Bearer ' + token})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = json.loads(response.read())
        except Exception:
            if pages == 0:
                return None, False
            return _parse_and_filter(items, since), False
        page_items = body.get('items', []) or []
        items.extend(page_items)
        pages += 1
        bookmark = body.get('bookmark') or None
        stamps = [_parse_ts(i.get('created_at')) for i in page_items]
        stamps = [s for s in stamps if s]
        if stamps and min(stamps) < since:
            complete = True   # reached past the window's start: the count is exact
            break
        if not bookmark or not page_items:
            complete = True   # the account has no older pins at all
            break
    return _parse_and_filter(items, since), complete


def _parse_ts(raw):
    if not raw:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if s.endswith('Z'):
        s = s[:-1] + '+00:00'
    try:
        d = datetime.fromisoformat(s)
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _parse_and_filter(items, since):
    stamps = [_parse_ts(i.get('created_at')) for i in items]
    return [s for s in stamps if s and s >= since]


def compute_daily_posted_rate(config, now=None, window_days=RATE_WINDOW_DAYS):
    """Trailing-window average pins/day, from Pinterest's own created_at
    (never the queue's Post Date proxy — see pinner-liveness-lib.ts for why
    that proxy lags real posting by days). Returns None when unknown: API
    unreachable, or zero pins in the window (a rate of 0 cannot bound a cap
    of "1/day" sensibly, and a truly dead poster is step 1 of check-pinner.sh's
    job, not this tool's)."""
    now = now or datetime.now(timezone.utc)
    since = now - timedelta(days=window_days)
    stamps, complete = fetch_pinterest_pins_created_since(config, since)
    if stamps is None:
        return None
    if not stamps:
        return None
    if not complete:
        # Truncated sample: len(stamps)/window is a floor, and a floor on the
        # rate is a *ceiling* on runway — the one direction this tool must
        # never be wrong in. Unknown, never a number.
        return None
    return len(stamps) / float(window_days)


def count_posted_rows_dated_window(config, today, window_days=RATE_WINDOW_DAYS):
    """Queue-side proxy for the trailing posted rate: rows with
    `Is Posted=true` whose Post Date falls in [today - window, today]. The
    poster drains oldest-first inside a 14-day window, so a row is posted
    within days of its Post Date and a 14-day *count* of posted-dated rows
    tracks the 14-day posted count closely even though any single row's
    Post Date lags its real posting (pinner-liveness-lib.ts, E41). Used only
    when Pinterest's own created_at is unavailable or truncated, and always
    labelled as such in the output. None when the query cannot run."""
    floor_str = str(today - timedelta(days=window_days))
    query = ('%22Is%20Posted%22=eq.true'
             '&%22Post%20Date%22=gte.{floor}&%22Post%20Date%22=lte.{today}'
             ).format(floor=q(floor_str), today=q(str(today)))
    return count_exact(config, query)


def fetch_recently_posted_section_pairs(config, today, window_days=RATE_WINDOW_DAYS,
                                        page=1000, max_pages=5, timeout=30):
    """Set of (Board ID, Board Section ID) pairs that the poster has
    successfully posted to in the last `window_days` — i.e. sections Pinterest
    accepted recently, read from the queue table only (no Pinterest API).
    Returns None if the read is incomplete for any reason: a partial set
    would make good sections look dead and silently starve the top-up."""
    floor_str = str(today - timedelta(days=window_days))
    base = ('{}/rest/v1/{}?select=%22Board%20ID%22,%22Board%20Section%20ID%22'
            '&%22Is%20Posted%22=eq.true&%22Post%20Date%22=gte.{floor}'
            '&%22Board%20Section%20ID%22=not.is.null').format(
                config['SUPABASE_URL'].rstrip('/'), TABLE, floor=q(floor_str))
    headers = {'apikey': config['SUPABASE_KEY'],
               'Authorization': 'Bearer ' + config['SUPABASE_KEY']}
    pairs = set()
    for n in range(max_pages):
        req = urllib.request.Request(base + '&offset={}&limit={}'.format(n * page, page),
                                     headers=headers, method='GET')
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                rows = json.loads(response.read())
        except Exception:
            return None
        for row in rows:
            if row.get('Board ID') and row.get('Board Section ID'):
                pairs.add((str(row['Board ID']), str(row['Board Section ID'])))
        if len(rows) < page:
            return pairs
    return None   # page cap hit: incomplete, not a verdict


def drop_sections_not_recently_posted(rows, live_pairs):
    """Queue-side stand-in for revive-stranded-pins.py's drop_dead_sections
    (which needs the Pinterest sections API). Keeps rows with no section id
    (Pinterest accepts a pin with only a board) and rows whose
    (Board ID, Board Section ID) pair appears on a row posted in the last
    14 days. Drops everything else — a section nobody posted to in two
    weeks is either renamed/deleted (E36 poison row) or simply idle, and
    idle-but-alive is the cheap error here. Returns (kept, dropped)."""
    if live_pairs is None:
        raise ValueError('live_pairs is None (incomplete read) — refuse to filter')
    kept, dropped = [], []
    for row in rows:
        sid = row.get('Board Section ID')
        if not sid:
            kept.append(row)
        elif (str(row.get('Board ID')), str(sid)) in live_pairs:
            kept.append(row)
        else:
            dropped.append(row)
    return kept, dropped


RATE_SOURCES = ('auto', 'pinterest', 'queue')


def resolve_posted_rate(config, today, source='auto', now=None,
                        window_days=RATE_WINDOW_DAYS):
    """(rate_or_None, basis). basis is one of
    'pinterest-{window}d' (Pinterest created_at, complete sample),
    'queue-posted-{window}d' (Post Date proxy over posted rows), or
    'unknown'. `source='pinterest'` never consults the queue proxy;
    `source='queue'` never calls Pinterest (for a day the API is flaky —
    2026-09-26 — so the tool can still act on a real number)."""
    if source not in RATE_SOURCES:
        raise ValueError('rate source must be one of {}'.format(RATE_SOURCES))
    if source in ('auto', 'pinterest'):
        rate = compute_daily_posted_rate(config, now=now, window_days=window_days)
        if rate is not None:
            return rate, 'pinterest-{}d'.format(window_days)
        if source == 'pinterest':
            return None, 'unknown'
    posted = count_posted_rows_dated_window(config, today, window_days)
    if posted is None or posted <= 0:
        return None, 'unknown'
    return posted / float(window_days), 'queue-posted-{}d'.format(window_days)


# ---------------------------------------------------------------------------
# Pure decision logic — no network, no filesystem. This is what --self-test
# and the pytest suite exercise directly.
# ---------------------------------------------------------------------------

def decide_topup(inventory, rate, writer_rows_by_day, today,
                  low_runway=TOPUP_LOW_RUNWAY_DAYS,
                  target_runway=TOPUP_TARGET_RUNWAY_DAYS,
                  max_per_day=MAX_ROWS_PER_DAY,
                  hard_cap=HARD_CAP,
                  max_fill_horizon=MAX_FILL_HORIZON_DAYS):
    """Decide whether to top up, and if so, how many rows on which days.

    `writer_rows_by_day(day)` -> int, rows the writer already has scheduled
    for that date. Does NOT select actual rows — only the day-by-day count
    plan. Returns a dict; see the module docstring for the guarantees this
    encodes.
    """
    if inventory is None or rate is None or rate <= 0:
        return {
            'level': 'unknown',
            'runway_before': None,
            'rows_planned': 0,
            'day_plan': [],
            'bound_rule': 'runway_or_rate_not_computable',
            'message': ('runway or the posted rate cannot be computed with '
                        'confidence (inventory={!r}, rate={!r}) — refusing to '
                        'plan a write').format(inventory, rate),
        }

    runway_before = inventory / rate
    if runway_before >= low_runway:
        return {
            'level': 'noop',
            'runway_before': round(runway_before, 2),
            'rows_planned': 0,
            'day_plan': [],
            'bound_rule': 'runway_at_or_above_floor',
            'message': ('runway {:.2f}d >= {:.1f}d floor — no top-up needed'
                        ).format(runway_before, low_runway),
        }

    rows_needed = max(0, math.ceil(target_runway * rate - inventory))
    rows_needed = min(rows_needed, hard_cap)

    day_plan = []
    placed = 0
    offset = 0
    hit_hard_cap = False
    while placed < rows_needed and offset < max_fill_horizon:
        day = today + timedelta(days=offset)
        writer_that_day = max(0, int(writer_rows_by_day(day)))
        day_cap = max(0, min(max_per_day, int(math.floor(rate)) - writer_that_day))
        take = min(day_cap, rows_needed - placed, hard_cap - placed)
        if take > 0:
            day_plan.append({'date': str(day), 'rows': take,
                              'writer_rows_that_day': writer_that_day})
            placed += take
        if placed >= hard_cap:
            hit_hard_cap = True
            break
        offset += 1

    runway_after = (inventory + placed) / rate

    if placed == 0:
        bound_rule = 'posted_rate_minus_writer_rows_exhausted'
    elif hit_hard_cap or placed >= hard_cap:
        bound_rule = 'hard_cap_21'
    elif placed < rows_needed:
        bound_rule = 'posted_rate_minus_writer_rows_or_fill_horizon'
    elif any(d['rows'] >= max_per_day for d in day_plan) and \
            math.floor(rate) >= max_per_day:
        bound_rule = 'seven_per_day_cap'
    else:
        bound_rule = 'reached_target_runway'

    return {
        'level': 'plan',
        'runway_before': round(runway_before, 2),
        'runway_after': round(runway_after, 2),
        'rows_needed_for_target': rows_needed,
        'rows_planned': placed,
        'day_plan': day_plan,
        'bound_rule': bound_rule,
        'message': ('runway {:.2f}d < {:.1f}d floor — planning {} row(s) across '
                    '{} day(s) to reach ~{:.2f}d (bound: {})').format(
                        runway_before, low_runway, placed, len(day_plan),
                        runway_after, bound_rule),
    }


# ---------------------------------------------------------------------------
# Once-per-UTC-day apply guard
# ---------------------------------------------------------------------------

def already_applied_today(ledger_dir, today):
    pattern = os.path.join(ledger_dir, '{}{}.json'.format(LEDGER_PREFIX, today))
    return os.path.isfile(pattern)


# ---------------------------------------------------------------------------
# Row selection: reuse revive-stranded-pins.py entirely. Sessions-ranked only
# when --ids-from supplies the ranking; otherwise the caller must pass
# --allow-unranked-emergency to --apply (enforced in main()).
# ---------------------------------------------------------------------------

def select_candidates(config, today, ids_from, lookback_days=LOOKBACK_DAYS):
    """Returns (candidates, priority_or_None, missing_report_lines).
    `candidates` are rows that are unposted AND stranded (dated before the
    poster's window) — writer rows freshly scheduled inside the window are
    structurally excluded by this filter, the same one
    revive-stranded-pins.py's own default/--ids-from modes use."""
    r = revive()
    floor = today - timedelta(days=lookback_days)
    lines = []
    if ids_from:
        wanted = r.load_ids_file(ids_from)
        priority = {value: rank for rank, value in enumerate(wanted)}
        candidates = r.fetch_by_ids(config, wanted, str(floor))
        for row in candidates:
            row['id'] = int(row['id'])
        got = {row['id'] for row in candidates}
        missing = [v for v in wanted if v not in got]
        lines.append('Selection: {} ids from {} (sessions-ranked order kept); '
                      '{} still stranded and unposted, {} not selectable.'.format(
                          len(wanted), ids_from, len(candidates), len(missing)))
        if missing:
            for reason, values in sorted(r.classify_missing(
                    config, missing, str(floor)).items()):
                lines.append('  {:>4}  {}: {}{}'.format(
                    len(values), reason, ', '.join(str(v) for v in values[:12]),
                    ' …' if len(values) > 12 else ''))
        candidates.sort(key=lambda row: priority[row['id']])
        return candidates, priority, lines
    else:
        candidates = r.fetch_stranded(config, str(floor), min(HARD_CAP * 3, 200))
        lines.append('Selection: newest-first fallback ({} stranded rows fetched) '
                      '— NOT sessions-ranked. The operator standing approval '
                      'requires sessions-ranked selection; supply --ids-from '
                      'with a sessions-ranked package.'.format(len(candidates)))
        return candidates, None, lines


def filter_writer_rows(rows):
    """Belt-and-suspenders: even though the date filter should already
    exclude the writer's fresh rows, never select a row the writer itself
    attributed (Wordpress Post ID set)."""
    kept, dropped = [], 0
    for row in rows:
        if row.get('Wordpress Post ID') not in (None, ''):
            dropped += 1
            continue
        kept.append(row)
    return kept, dropped


def allocate_topup(rows_in_priority_order, day_plan, max_per_url=2, max_per_board=3):
    """Fill day_plan's per-day quotas from rows_in_priority_order (already
    sessions-ranked), respecting per-url/per-board-per-day caps so one
    destination or board never dominates a day."""
    remaining = list(rows_in_priority_order)
    plan = []
    for entry in day_plan:
        day, cap = entry['date'], entry['rows']
        per_url = defaultdict(int)
        per_board = defaultdict(int)
        placed = 0
        i = 0
        while i < len(remaining) and placed < cap:
            row = remaining[i]
            url, board = row.get('Post URL'), row.get('Board ID')
            if per_url[url] >= max_per_url or per_board[board] >= max_per_board:
                i += 1
                continue
            plan.append((row, day))
            per_url[url] += 1
            per_board[board] += 1
            remaining.pop(i)
            placed += 1
    return plan


# ---------------------------------------------------------------------------
# Apply
# ---------------------------------------------------------------------------

def apply_plan(config, plan, ledger_dir, today, experiment='SD-22-topup'):
    r = revive()
    entries = []
    updated = skipped = 0
    for row, day in plan:
        old_date = str(row.get('Post Date'))[:10]
        try:
            rows = r.supabase(
                config, 'PATCH',
                'id=eq.{}&%22Is%20Posted%22=eq.false'.format(q(row['id'])),
                body={'Post Date': str(day)},
                prefer='return=representation')
            if not rows:
                skipped += 1
                continue
            updated += 1
            entries.append({
                'id': row['id'],
                'old_date': old_date,
                'new_date': str(day),
                'post_url': row.get('Post URL'),
                'board_name': row.get('Board Name'),
            })
        except Exception as exc:
            print('  ERROR id={}: {}'.format(row['id'], exc))
            skipped += 1
        time.sleep(0.05)

    os.makedirs(ledger_dir, exist_ok=True)
    ledger_path = os.path.join(ledger_dir, '{}{}.json'.format(LEDGER_PREFIX, today))
    with open(ledger_path, 'w') as handle:
        json.dump({
            'generated': str(today),
            'script': 'scripts/agents/pin-runway-topup.py',
            'experiment': experiment,
            'updated': updated,
            'entries': entries,
        }, handle, indent=2)
    return updated, skipped, ledger_path


# ---------------------------------------------------------------------------
# Self-test (offline, no network, no credentials)
# ---------------------------------------------------------------------------

def self_test():
    today = date(2026, 9, 22)

    # 1. Runway at/above floor -> no-op, nothing planned.
    out = decide_topup(inventory=20, rate=5, writer_rows_by_day=lambda d: 0, today=today)
    assert out['level'] == 'noop', out
    assert out['rows_planned'] == 0, out

    # 2. Unknown data -> unknown, no write.
    for inv, rate in ((None, 5), (10, None), (10, 0), (10, -1)):
        out = decide_topup(inventory=inv, rate=rate, writer_rows_by_day=lambda d: 0, today=today)
        assert out['level'] == 'unknown', (inv, rate, out)

    # 3. Capped by 7/day when the rate is generous.
    out = decide_topup(inventory=0, rate=100, writer_rows_by_day=lambda d: 0, today=today)
    assert out['level'] == 'plan', out
    assert all(d['rows'] <= MAX_ROWS_PER_DAY for d in out['day_plan']), out
    assert out['day_plan'][0]['rows'] == MAX_ROWS_PER_DAY, out

    # 4. Capped by the posted rate when it's below 7/day.
    out = decide_topup(inventory=0, rate=3, writer_rows_by_day=lambda d: 0, today=today)
    assert out['day_plan'][0]['rows'] == 3, out

    # 5. Hard cap of 21 rows total, however generous the rate.
    out = decide_topup(inventory=0, rate=1000, writer_rows_by_day=lambda d: 0, today=today)
    assert out['rows_planned'] == HARD_CAP, out
    assert out['bound_rule'] == 'hard_cap_21', out

    # 6. Writer rows on a given day shrink that day's cap and are never the
    #    rows this tool touches (selection filtering is covered separately).
    def writer(d):
        return 10 if d == today else 0
    out = decide_topup(inventory=0, rate=10, writer_rows_by_day=writer, today=today)
    dates_used = [d['date'] for d in out['day_plan']]
    assert str(today) not in dates_used, out  # today's cap fully consumed by the writer
    assert dates_used[0] == str(today + timedelta(days=1)), out
    assert out['day_plan'][0]['writer_rows_that_day'] == 0, out

    # 7. Fills to (approximately) exactly the target runway when caps allow.
    out = decide_topup(inventory=10, rate=10, writer_rows_by_day=lambda d: 0, today=today)
    assert out['runway_before'] == 1.0, out
    assert out['rows_planned'] == 20, out
    assert out['runway_after'] == 3.0, out
    # rate (10/day) exceeds the 7/day cap, so the per-day cap is what actually
    # bound each day even though the total happens to land exactly on target.
    assert out['bound_rule'] == 'seven_per_day_cap', out

    # 7b. When the rate itself is <= 7/day, hitting the target is reported as
    #     'reached_target_runway' rather than the (inapplicable) 7/day cap.
    out2 = decide_topup(inventory=10, rate=6, writer_rows_by_day=lambda d: 0, today=today)
    assert out2['runway_after'] == 3.0, out2
    assert out2['bound_rule'] == 'reached_target_runway', out2

    # 8. Once-per-day guard.
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        assert not already_applied_today(tmp, today)
        open(os.path.join(tmp, '{}{}.json'.format(LEDGER_PREFIX, today)), 'w').close()
        assert already_applied_today(tmp, today)
        assert not already_applied_today(tmp, today - timedelta(days=1))

    # 9. Writer-row filter never selects a row the writer attributed.
    rows = [{'id': 1, 'Wordpress Post ID': '0'}, {'id': 2, 'Wordpress Post ID': None},
            {'id': 3, 'Wordpress Post ID': ''}, {'id': 4}]
    kept, dropped = filter_writer_rows(rows)
    assert [r['id'] for r in kept] == [2, 3, 4], kept
    assert dropped == 1, dropped

    # 10. allocate_topup respects per-day quotas and per-url/board caps, and
    #     keeps priority order.
    rows = []
    for i in range(10):
        rows.append({'id': i, 'Post URL': 'https://u{}/'.format(i % 2),
                     'Board ID': 'B{}'.format(i % 2)})
    day_plan = [{'date': '2026-09-23', 'rows': 3}, {'date': '2026-09-24', 'rows': 3}]
    plan = allocate_topup(rows, day_plan, max_per_url=1, max_per_board=3)
    per_day = defaultdict(list)
    for row, day in plan:
        per_day[day].append(row)
    assert len(per_day['2026-09-23']) <= 3 and len(per_day['2026-09-24']) <= 3, per_day
    for day, rs in per_day.items():
        urls = [r['Post URL'] for r in rs]
        assert len(urls) == len(set(urls)), (day, urls)

    # 11. A truncated Pinterest sample is unknown, never a (floor) rate.
    #     2026-09-26: 100 pins over one page ÷ 14 read as 7.14/day → "runway
    #     8.8 d, no-op" while the queue showed 36/day and 1.75 d.
    saved = globals()['fetch_pinterest_pins_created_since']
    now = datetime(2026, 9, 22, tzinfo=timezone.utc)
    try:
        globals()['fetch_pinterest_pins_created_since'] = (
            lambda config, since, **kw: ([now] * 100, False))
        assert compute_daily_posted_rate({'creator_access_token': 't'}, now=now) is None
        globals()['fetch_pinterest_pins_created_since'] = (
            lambda config, since, **kw: ([now] * 140, True))
        assert compute_daily_posted_rate({'creator_access_token': 't'}, now=now) == 10.0
        globals()['fetch_pinterest_pins_created_since'] = (
            lambda config, since, **kw: (None, False))
        assert compute_daily_posted_rate({'creator_access_token': 't'}, now=now) is None
    finally:
        globals()['fetch_pinterest_pins_created_since'] = saved

    # 12. resolve_posted_rate: 'pinterest' never consults the queue; 'queue'
    #     never calls Pinterest; 'auto' falls back and labels the basis.
    saved_rate = globals()['compute_daily_posted_rate']
    saved_cnt = globals()['count_posted_rows_dated_window']
    calls = []
    try:
        globals()['compute_daily_posted_rate'] = (
            lambda config, now=None, window_days=14: calls.append('p') or None)
        globals()['count_posted_rows_dated_window'] = (
            lambda config, today, window_days=14: calls.append('q') or 504)
        assert resolve_posted_rate({}, today, 'pinterest') == (None, 'unknown')
        assert calls == ['p'], calls
        del calls[:]
        rate, basis = resolve_posted_rate({}, today, 'queue')
        assert calls == ['q'] and basis == 'queue-posted-14d', (calls, basis)
        assert abs(rate - 36.0) < 1e-9, rate
        del calls[:]
        rate, basis = resolve_posted_rate({}, today, 'auto')
        assert calls == ['p', 'q'] and basis == 'queue-posted-14d', (calls, basis)
        globals()['count_posted_rows_dated_window'] = (
            lambda config, today, window_days=14: None)
        assert resolve_posted_rate({}, today, 'queue') == (None, 'unknown')
        globals()['count_posted_rows_dated_window'] = (
            lambda config, today, window_days=14: 0)
        assert resolve_posted_rate({}, today, 'queue') == (None, 'unknown')
    finally:
        globals()['compute_daily_posted_rate'] = saved_rate
        globals()['count_posted_rows_dated_window'] = saved_cnt
    try:
        resolve_posted_rate({}, today, 'bogus')
        raise AssertionError('bogus rate source accepted')
    except ValueError:
        pass

    # 13. Queue-side section check: no-section rows kept, live pairs kept,
    #     stale pairs dropped, incomplete read refuses to filter.
    live = {('B1', 'S1')}
    rows = [{'id': 1, 'Board ID': 'B1', 'Board Section ID': 'S1'},
            {'id': 2, 'Board ID': 'B1', 'Board Section ID': 'S9'},
            {'id': 3, 'Board ID': 'B2', 'Board Section ID': 'S1'},
            {'id': 4, 'Board ID': 'B2', 'Board Section ID': None},
            {'id': 5, 'Board ID': 'B2'}]
    kept, dropped = drop_sections_not_recently_posted(rows, live)
    assert [r['id'] for r in kept] == [1, 4, 5], kept
    assert [r['id'] for r in dropped] == [2, 3], dropped
    try:
        drop_sections_not_recently_posted(rows, None)
        raise AssertionError('incomplete section read must refuse to filter')
    except ValueError:
        pass

    print('self-test: 13/13 assertions passed (decision logic + guards + '
          'allocator + rate-source + queue-side sections, offline)')
    return 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_config():
    path = os.environ.get('MHM_PINTEREST_CONFIG', DEFAULT_CONFIG)
    if not os.path.isfile(path):
        print('ERROR: pinner config not found at {}'.format(path))
        sys.exit(2)
    with open(path) as handle:
        config = json.load(handle)
    if not config.get('SUPABASE_URL') or not config.get('SUPABASE_KEY'):
        print('ERROR: SUPABASE_URL / SUPABASE_KEY missing from the pinner config')
        sys.exit(2)
    return config


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--apply', action='store_true',
                        help='actually write (default is a dry run)')
    parser.add_argument('--ids-from', metavar='FILE',
                        help='sessions-ranked package (same shape '
                             'revive-stranded-pins.py --ids-from accepts)')
    parser.add_argument('--allow-unranked-emergency', action='store_true',
                        help='allow --apply without --ids-from (logged; the '
                             'operator standing approval requires '
                             'sessions-ranked selection)')
    parser.add_argument('--no-verify', action='store_true',
                        help='skip destination/image URL and board-section checks')
    parser.add_argument('--rate-source', choices=RATE_SOURCES, default='auto',
                        help="posted-rate basis: 'pinterest' (created_at, "
                             "complete sample only), 'queue' (posted rows by "
                             "Post Date — for days the Pinterest API is flaky), "
                             "'auto' (pinterest, then queue)")
    parser.add_argument('--sections-from-queue', action='store_true',
                        help='verify board sections against sections posted to '
                             'in the last 14d (queue table) instead of the '
                             'Pinterest sections API')
    parser.add_argument('--max-per-url', type=int, default=2)
    parser.add_argument('--max-per-board', type=int, default=3)
    parser.add_argument('--ledger-dir', default=DEFAULT_LEDGER_DIR)
    parser.add_argument('--json', action='store_true', help='machine-readable output')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    if args.apply and not args.ids_from and not args.allow_unranked_emergency:
        print('ERROR: --apply requires --ids-from (sessions-ranked selection) '
              'per the operator standing approval. Pass '
              '--allow-unranked-emergency to override (this is recorded).')
        return 2

    config = load_config()
    today = date.today()

    if args.apply and already_applied_today(args.ledger_dir, today):
        print('REFUSED: pin-runway-topup already applied today ({}); at most '
              'one --apply per UTC day. Ledger: {}'.format(
                  today, os.path.join(
                      args.ledger_dir, '{}{}.json'.format(LEDGER_PREFIX, today))))
        return 2

    inventory = count_inventory(config, today)
    rate, rate_basis = resolve_posted_rate(config, today, source=args.rate_source)

    def writer_rows_by_day(day):
        n = count_writer_rows_for_date(config, day)
        return n if n is not None else 0

    decision = decide_topup(inventory, rate, writer_rows_by_day, today)

    print('=== {}: pin-runway top-up ==='.format('APPLY' if args.apply else 'DRY RUN'))
    print('Inventory: {}  Trailing-{}d posted rate: {} (basis: {})'.format(
        inventory, RATE_WINDOW_DAYS,
        'unknown' if rate is None else '{:.2f}/day'.format(rate), rate_basis))
    print(decision['message'])

    result = {
        'level': decision['level'],
        'rate': rate,
        'rate_basis': rate_basis,
        'inventory_before': inventory,
        'runway_before': decision.get('runway_before'),
        'runway_after': decision.get('runway_after'),
        'rows_planned': decision.get('rows_planned', 0),
        'day_plan': decision.get('day_plan', []),
        'bound_rule': decision.get('bound_rule'),
        'destinations': [],
        'applied': False,
        'ledger': None,
    }

    if decision['level'] in ('unknown', 'noop'):
        if args.json:
            print(json.dumps(result, indent=2))
        return 2 if decision['level'] == 'unknown' else 0

    # --- selection ---------------------------------------------------------
    candidates, priority, sel_lines = select_candidates(config, today, args.ids_from)
    for line in sel_lines:
        print(line)
    if not args.ids_from:
        print('*** NOT SESSIONS-RANKED — proceeding only because '
              '--allow-unranked-emergency was passed. ***' if args.allow_unranked_emergency
              else '(dry run continues for visibility; --apply would be refused)')

    candidates, dropped_writer = filter_writer_rows(candidates)
    if dropped_writer:
        print('  dropped {} row(s) attributed to the writer (never touched by '
              'this tool)'.format(dropped_writer))

    r = revive()
    usable = [row for row in candidates if all(row.get(f) for f in r.REQUIRED_FIELDS)]
    print('  {} of {} candidates have all required fields'.format(
        len(usable), len(candidates)))

    skip_hosts = r.DEFAULT_SKIP_HOSTS
    before = len(usable)
    usable = [row for row in usable if not r.on_skipped_host(row.get('Post URL'), skip_hosts)]
    print('  dropped {} row(s) on an excluded host ({})'.format(
        before - len(usable), ', '.join(skip_hosts)))

    if not args.no_verify and usable:
        cache = {}
        dest_urls = sorted({row['Post URL'] for row in usable})
        dead_dest = {u for u in dest_urls if not r.url_alive(u, cache)}
        usable = [row for row in usable if row['Post URL'] not in dead_dest]
        image_dead = 0
        kept = []
        for row in usable:
            if r.url_alive(row['Image URL'], cache):
                kept.append(row)
            else:
                image_dead += 1
        usable = kept
        print('  URL liveness: {} dead destination(s), {} dead image(s)'.format(
            len(dead_dest), image_dead))
        if args.sections_from_queue:
            live_pairs = fetch_recently_posted_section_pairs(config, today)
            if live_pairs is None:
                print('ERROR: could not read recently-posted sections from the '
                      'queue (incomplete read) — refusing to filter or proceed.')
                return 2
            usable, dropped_sections = drop_sections_not_recently_posted(usable, live_pairs)
            print('  sections (queue-side, {} live board/section pairs posted in '
                  'last {}d): dropped {} row(s) whose section was not posted to'
                  .format(len(live_pairs), RATE_WINDOW_DAYS, len(dropped_sections)))
        else:
            usable, _dead_sections = r.drop_dead_sections(config, usable)
    elif args.no_verify:
        print('  URL/section verification SKIPPED (--no-verify)')

    if not usable:
        print('\nNo usable rows survived the filters — nothing to do.')
        result['rows_planned'] = 0
        if args.json:
            print(json.dumps(result, indent=2))
        return 0

    plan = allocate_topup(usable, decision['day_plan'],
                          max_per_url=args.max_per_url, max_per_board=args.max_per_board)
    plan = plan[:HARD_CAP]

    by_day = defaultdict(list)
    for row, day in plan:
        by_day[day].append(row)
    print('\n--- Plan: {} rows across {} day(s) (target: bring runway from '
          '{:.2f}d to ~{:.2f}d) ---'.format(
              len(plan), len(by_day), decision['runway_before'],
              decision.get('runway_after', decision['runway_before'])))
    for day in sorted(by_day):
        rows = by_day[day]
        print('  {}  {:>2} pins'.format(day, len(rows)))

    per_url = defaultdict(int)
    for row, _ in plan:
        per_url[row['Post URL']] += 1
    result['destinations'] = sorted(per_url.items(), key=lambda kv: -kv[1])
    result['rows_planned'] = len(plan)
    if by_day:
        actual_runway_after = (inventory + len(plan)) / rate
        result['runway_after'] = round(actual_runway_after, 2)

    print('\n--- Destinations ({} distinct) ---'.format(len(per_url)))
    for url, n in result['destinations']:
        print('  {:>3}  {}'.format(n, url))
    print('\nRule that bound the count: {}'.format(decision['bound_rule']))

    if not args.apply:
        print('\nDRY RUN — nothing written.')
        if args.json:
            print(json.dumps(result, indent=2))
        return 0

    if not plan:
        print('\nNothing to apply.')
        if args.json:
            print(json.dumps(result, indent=2))
        return 0

    updated, skipped, ledger_path = apply_plan(config, plan, args.ledger_dir, today)
    print('\n=== Applied: {} re-dated, {} skipped ==='.format(updated, skipped))
    print('Ledger: {}'.format(ledger_path))
    print('Rollback (one command):')
    print('  python3 scripts/agents/revive-stranded-pins.py --rollback {} --apply'
          .format(ledger_path))
    result['applied'] = True
    result['ledger'] = ledger_path
    if args.json:
        print(json.dumps(result, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
