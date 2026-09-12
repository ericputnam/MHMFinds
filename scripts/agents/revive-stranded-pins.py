#!/usr/bin/env python3
"""Revive stranded pins in the pinner queue (Pip, Distribution — E26, Tier 1).

WHY THIS EXISTS
    The poster (MHMUtils/supabase_pin_poster_server.py, `fetch_unposted_entries`)
    only selects rows whose "Post Date" falls inside
    [today - BACKLOG_LOOKBACK_DAYS, today] (lookback = 14 days). The newest
    unposted row in n8n_pinterest_posts is dated 2026-05-12, so on 2026-09-08 all
    1,879 "backlog" rows were invisible to the poster forever and the ~19 pins a
    day we post came *only* from new blog posts landing with a fresh date
    (E20, PR #60). The cron runs every 20 minutes at batch size 1, i.e. ~72
    pins/day of capacity, so the queue — not Pinterest, not the cron — is the
    binding constraint on cadence.

    Every stranded row already carries a board, a title, pin copy, a destination
    URL and an image that has never been posted. Re-dating a bounded slice of
    them forward puts real inventory back in front of the poster.

WHAT IT DOES
    Selects the newest stranded rows (unposted, "Post Date" older than the
    poster's window), drops anything unusable, and re-dates a capped batch
    forward across the next `--days` days at `--per-day` rows per day. Writes a
    ledger of (id, old date, new date) so the whole batch can be put back with
    one command.

SAFETY RAILS (all of these are enforced, not advisory)
    * dry run is the default; nothing is written without an explicit --apply
    * hard cap of HARD_CAP rows per run, whatever the flags say
    * `Is Posted = false` is in the *update filter*, not just the select, so a
      row that the poster picks up mid-run is never rewritten
    * no image is re-dated if that image URL already exists on a posted row, and
      duplicate images inside the batch are collapsed
    * <= MAX_PER_URL_PER_DAY rows per destination URL per day and
      <= MAX_PER_BOARD_PER_DAY per board per day — the stranded slice is only
      ~15 distinct destinations, so a naive newest-first fill would post 10 pins
      to one article in one morning, which is exactly what Pinterest treats as
      spam
    * destination URLs and image URLs are HEAD-checked; dead ones are dropped
      (--no-verify to skip)
    * every row's "Board Section ID" is checked against the live board via
      the Pinterest API (repair-pin-sections.py); rows whose section is gone
      are dropped, and if sections cannot be validated at all the run stops
      (exit 2) instead of writing — a revived row with a deleted section
      blocked the poster for two days on 2026-09-10 → 09-12 (E36)
    * idempotent: re-running selects only rows still dated before the window, so
      rows this script already moved are not picked up again

USAGE
    python3 scripts/agents/revive-stranded-pins.py                 # dry run
    python3 scripts/agents/revive-stranded-pins.py --apply
    python3 scripts/agents/revive-stranded-pins.py --self-test     # offline
    python3 scripts/agents/revive-stranded-pins.py \
        --rollback reports/funnel/pin-revival-YYYY-MM-DD.json --apply

ENV
    MHM_PINTEREST_CONFIG  path to the pinner config.json holding SUPABASE_URL /
                          SUPABASE_KEY (default ~/java_projects/MHMUtils/config.json)

Credentials are read from that file and are never printed or logged.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, timedelta

DEFAULT_CONFIG = os.path.join(
    os.path.expanduser('~'), 'java_projects', 'MHMUtils', 'config.json')
TABLE = 'n8n_pinterest_posts'

# Must match BACKLOG_LOOKBACK_DAYS in MHMUtils/supabase_pin_poster_server.py.
LOOKBACK_DAYS = 14

# Blast radius. HARD_CAP wins over any flag combination.
HARD_CAP = 200
DEFAULT_PER_DAY = 10
DEFAULT_DAYS = 14

# Pinterest-norm guards: one destination article should not get a burst of pins
# on a single day, and one board should not carry a whole day's cadence.
MAX_PER_URL_PER_DAY = 2
MAX_PER_BOARD_PER_DAY = 3

REQUIRED_FIELDS = ('Post Title', 'Post URL', 'Image URL', 'Board ID')
USER_AGENT = 'Mozilla/5.0 (compatible; MHMFinds-pin-audit/1.0)'


# --------------------------------------------------------------------------
# Supabase
# --------------------------------------------------------------------------

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


def supabase(config, method, query='', body=None, prefer=None, timeout=45):
    url = '{}/rest/v1/{}'.format(config['SUPABASE_URL'].rstrip('/'), TABLE)
    if query:
        url += '?' + query
    headers = {
        'apikey': config['SUPABASE_KEY'],
        'Authorization': 'Bearer ' + config['SUPABASE_KEY'],
        'Content-Type': 'application/json',
    }
    if prefer:
        headers['Prefer'] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        raw = response.read().decode()
    return json.loads(raw) if raw else []


def q(value):
    """Percent-encode a value for a PostgREST filter."""
    return urllib.parse.quote(str(value), safe='')


SELECT_COLS = ('select=id,%22Post%20Date%22,%22Post%20Title%22,%22Post%20URL%22,'
               '%22Image%20URL%22,%22Board%20ID%22,%22Board%20Name%22,'
               '%22Board%20Section%22,%22Board%20Section%20ID%22')


def fetch_stranded(config, floor_str, limit):
    query = ('{cols}&%22Is%20Posted%22=eq.false'
             '&%22Post%20Date%22=lt.{floor}'
             '&order=%22Post%20Date%22.desc&limit={limit}').format(
                 cols=SELECT_COLS, floor=q(floor_str), limit=int(limit))
    return supabase(config, 'GET', query)


def posted_image_urls(config, image_urls, chunk=40):
    """Return the subset of image_urls that already exist on a posted row."""
    found = set()
    urls = list(image_urls)
    for i in range(0, len(urls), chunk):
        batch = urls[i:i + chunk]
        # PostgREST in.() list: each element quoted, commas separate.
        joined = ','.join('"{}"'.format(u.replace('"', '\\"')) for u in batch)
        query = ('select=%22Image%20URL%22&%22Is%20Posted%22=eq.true'
                 '&%22Image%20URL%22=in.{}').format(q('(' + joined + ')'))
        try:
            for row in supabase(config, 'GET', query):
                found.add(row.get('Image URL'))
        except urllib.error.HTTPError as exc:
            print('  WARN: duplicate-image check failed (HTTP {}) for a batch of '
                  '{} — those rows are held back'.format(exc.code, len(batch)))
            found.update(batch)
    return found


# --------------------------------------------------------------------------
# URL liveness
# --------------------------------------------------------------------------

def url_alive(url, cache, timeout=15):
    if url in cache:
        return cache[url]
    alive = False
    try:
        req = urllib.request.Request(
            url, headers={'User-Agent': USER_AGENT}, method='HEAD')
        with urllib.request.urlopen(req, timeout=timeout) as response:
            alive = response.status < 400
    except urllib.error.HTTPError as exc:
        # Some hosts refuse HEAD but serve GET fine.
        if exc.code in (403, 405, 501):
            try:
                req = urllib.request.Request(
                    url, headers={'User-Agent': USER_AGENT, 'Range': 'bytes=0-0'})
                with urllib.request.urlopen(req, timeout=timeout) as response:
                    alive = response.status < 400
            except Exception:
                alive = False
        else:
            alive = False
    except Exception:
        alive = False
    cache[url] = alive
    return alive


# --------------------------------------------------------------------------
# Board sections (E36) — a revived row whose section the writer has since
# deleted blocks the poster: it retries that one row every 20 minutes and
# posts nothing (2026-09-10 → 09-12, entry 8007, 138 retries, 0 pins). The
# validation lives in repair-pin-sections.py; this only reuses it.
# --------------------------------------------------------------------------

def _load_sections_module():
    import importlib.util
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        'repair-pin-sections.py')
    if not os.path.isfile(path):
        return None
    spec = importlib.util.spec_from_file_location('mhm_repair_pin_sections', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def drop_dead_sections(config, rows):
    """Return (kept_rows, dropped_count). Fails closed: if sections cannot be
    validated at all, the run stops with exit 2 rather than re-dating rows the
    poster may choke on."""
    sections = _load_sections_module()
    if sections is None:
        print('ERROR: repair-pin-sections.py not found next to this script — '
              'cannot validate board sections (use --no-verify to skip)')
        sys.exit(2)
    try:
        token = sections.obtain_token(config)
        by_board = sections.sections_for_rows(token, rows)
    except sections.CouldNotRun as exc:
        print('ERROR: board sections could not be validated: {} '
              '(use --no-verify to skip)'.format(exc))
        sys.exit(2)
    kept, dropped = [], defaultdict(int)
    for row in rows:
        verdict, _new = sections.decide(
            row.get('Board Section ID'), row.get('Board Section'),
            by_board.get(str(row.get('Board ID') or '')))
        if verdict in ('ok', 'none'):
            kept.append(row)
        else:
            dropped[verdict] += 1
    if dropped:
        print('  dropped {} row(s) whose board section is dead or unverifiable '
              '({}); repair them first: scripts/agents/repair-pin-sections.py'.format(
                  sum(dropped.values()),
                  ', '.join('{}={}'.format(k, v) for k, v in sorted(dropped.items()))))
    return kept, sum(dropped.values())


# --------------------------------------------------------------------------
# Allocation (pure — covered by --self-test)
# --------------------------------------------------------------------------

def allocate(rows, start, days, per_day,
             max_per_url=MAX_PER_URL_PER_DAY, max_per_board=MAX_PER_BOARD_PER_DAY):
    """Spread rows over `days` days, at most `per_day` each.

    Round-robins across destination URLs (largest group first) so a single
    article never dominates a day, and caps per URL and per board within a day.
    Returns a list of (row, date) pairs; rows that do not fit are left out.
    """
    groups = defaultdict(list)
    for row in rows:
        groups[row.get('Post URL')].append(row)
    # Newest first inside a group; biggest groups get first pick each round.
    for url in groups:
        groups[url].sort(key=lambda r: str(r.get('Post Date') or ''), reverse=True)

    plan = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        per_url = defaultdict(int)
        per_board = defaultdict(int)
        placed = 0
        progress = True
        while placed < per_day and progress:
            progress = False
            for url in sorted(groups, key=lambda u: -len(groups[u])):
                if placed >= per_day:
                    break
                if not groups[url] or per_url[url] >= max_per_url:
                    continue
                candidate = None
                for idx, row in enumerate(groups[url]):
                    board = row.get('Board ID')
                    if per_board[board] < max_per_board:
                        candidate = groups[url].pop(idx)
                        break
                if candidate is None:
                    continue
                per_url[url] += 1
                per_board[candidate.get('Board ID')] += 1
                plan.append((candidate, day))
                placed += 1
                progress = True
    return plan


# --------------------------------------------------------------------------
# Self-test (offline, no network, no credentials)
# --------------------------------------------------------------------------

def self_test():
    start = date(2026, 9, 9)

    def make(n, url, board):
        return [{'id': '{}-{}'.format(url, i), 'Post URL': url,
                 'Board ID': board, 'Post Date': '2026-03-0{}'.format(i % 9 + 1)}
                for i in range(n)]

    # 1. One giant group cannot exceed the per-URL/day cap.
    rows = make(60, 'https://a/', 'B1')
    plan = allocate(rows, start, days=14, per_day=10)
    by_day = defaultdict(int)
    for _, day in plan:
        by_day[day] += 1
    assert max(by_day.values()) <= MAX_PER_URL_PER_DAY, by_day
    assert len(plan) == MAX_PER_URL_PER_DAY * 14, len(plan)

    # 2. With enough distinct URLs, per_day is honoured exactly.
    rows = []
    for k in range(15):
        rows += make(20, 'https://u{}/'.format(k), 'B{}'.format(k))
    plan = allocate(rows, start, days=14, per_day=10)
    by_day = defaultdict(int)
    for _, day in plan:
        by_day[day] += 1
    assert len(plan) == 140, len(plan)
    assert set(by_day.values()) == {10}, by_day

    # 3. Per-board cap holds even when URLs differ.
    rows = []
    for k in range(10):
        rows += make(20, 'https://v{}/'.format(k), 'SAME')
    plan = allocate(rows, start, days=14, per_day=10)
    per_day_board = defaultdict(int)
    for row, day in plan:
        per_day_board[(day, row['Board ID'])] += 1
    assert max(per_day_board.values()) <= MAX_PER_BOARD_PER_DAY, per_day_board

    # 4. Dates are contiguous from `start` and never in the past.
    days_used = sorted({d for _, d in plan})
    assert days_used[0] == start, days_used[0]
    assert all(d >= start for d in days_used)

    # 5. No row is scheduled twice.
    ids = [row['id'] for row, _ in plan]
    assert len(ids) == len(set(ids))

    # 6. An empty input is not an error.
    assert allocate([], start, days=14, per_day=10) == []

    print('self-test: 6/6 assertions passed (allocator, offline)')
    return 0


# --------------------------------------------------------------------------
# Rollback
# --------------------------------------------------------------------------

def do_rollback(config, ledger_path, apply_changes):
    if not os.path.isfile(ledger_path):
        print('ERROR: ledger not found at {}'.format(ledger_path))
        return 2
    with open(ledger_path) as handle:
        ledger = json.load(handle)
    entries = ledger.get('entries', [])
    print('=== {}ROLLBACK: {} rows from {} ==='.format(
        '' if apply_changes else 'DRY RUN ', len(entries), ledger_path))
    restored = skipped = 0
    for entry in entries:
        if not apply_changes:
            print('  WOULD RESTORE id={} {} -> {}'.format(
                entry['id'], entry['new_date'], entry['old_date']))
            restored += 1
            continue
        try:
            rows = supabase(
                config, 'PATCH',
                'id=eq.{}&%22Is%20Posted%22=eq.false'.format(q(entry['id'])),
                body={'Post Date': entry['old_date']},
                prefer='return=representation')
            if rows:
                restored += 1
            else:
                skipped += 1  # already posted — leave it alone
        except Exception as exc:
            print('  ERROR id={}: {}'.format(entry['id'], exc))
            skipped += 1
    print('=== rollback done: restored={}, skipped(already posted or failed)={} ==='
          .format(restored, skipped))
    return 0


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--apply', action='store_true',
                        help='actually write (default is a dry run)')
    parser.add_argument('--per-day', type=int, default=DEFAULT_PER_DAY)
    parser.add_argument('--days', type=int, default=DEFAULT_DAYS)
    parser.add_argument('--no-verify', action='store_true',
                        help='skip the destination/image URL liveness checks')
    parser.add_argument('--rollback', metavar='LEDGER',
                        help='restore Post Dates from a ledger written by --apply')
    parser.add_argument('--self-test', action='store_true',
                        help='run the offline allocator assertions and exit')
    parser.add_argument('--ledger-dir', default=os.path.join('reports', 'funnel'))
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    config = load_config()

    if args.rollback:
        return do_rollback(config, args.rollback, args.apply)

    per_day = max(1, args.per_day)
    days = max(1, args.days)
    target = min(per_day * days, HARD_CAP)
    if per_day * days > HARD_CAP:
        print('NOTE: {}x{} = {} exceeds the hard cap; capping at {}'.format(
            per_day, days, per_day * days, HARD_CAP))

    today = date.today()
    floor = today - timedelta(days=LOOKBACK_DAYS)

    print('=== {}: revive stranded pins ==='.format(
        'APPLY' if args.apply else 'DRY RUN'))
    print('Poster window is [{} .. {}]; anything unposted and dated before {} is '
          'unreachable.'.format(floor, today, floor))
    print('Target: {} rows over {} days at {}/day (hard cap {}).'.format(
        target, days, per_day, HARD_CAP))

    # Over-fetch so the filters below still leave enough to fill the plan.
    candidates = fetch_stranded(config, str(floor), min(HARD_CAP * 3, 600))
    print('\nFetched {} newest stranded rows.'.format(len(candidates)))
    if not candidates:
        print('Nothing stranded — nothing to do.')
        return 0

    # --- filter: required fields ------------------------------------------
    usable, missing_fields = [], 0
    for row in candidates:
        if all(row.get(f) for f in REQUIRED_FIELDS):
            usable.append(row)
        else:
            missing_fields += 1
    print('  dropped {} row(s) missing one of {}'.format(
        missing_fields, ', '.join(REQUIRED_FIELDS)))

    # --- filter: duplicate images ------------------------------------------
    seen, deduped, internal_dupes = set(), [], 0
    for row in usable:
        img = row['Image URL']
        if img in seen:
            internal_dupes += 1
            continue
        seen.add(img)
        deduped.append(row)
    already_posted = posted_image_urls(config, seen)
    before = len(deduped)
    deduped = [r for r in deduped if r['Image URL'] not in already_posted]
    print('  dropped {} duplicate image(s) inside the batch, {} whose image is '
          'already on a posted row'.format(internal_dupes, before - len(deduped)))

    # --- filter: URL liveness ----------------------------------------------
    if args.no_verify:
        print('  URL liveness check SKIPPED (--no-verify)')
        live = deduped
    else:
        cache = {}
        dest_urls = sorted({r['Post URL'] for r in deduped})
        dead_dest = {u for u in dest_urls if not url_alive(u, cache)}
        if dead_dest:
            for u in sorted(dead_dest):
                print('  DEAD destination, whole group dropped: {}'.format(u))
        live = [r for r in deduped if r['Post URL'] not in dead_dest]
        print('  destination URLs checked: {} live, {} dead'.format(
            len(dest_urls) - len(dead_dest), len(dead_dest)))

        # Only verify as many images as we could plausibly need.
        budget = min(len(live), int(target * 1.4) + 10)
        checked, dead_img = 0, 0
        kept = []
        for row in live:
            if checked >= budget:
                break
            checked += 1
            if url_alive(row['Image URL'], cache):
                kept.append(row)
            else:
                dead_img += 1
        live = kept
        print('  image URLs checked: {} live, {} dead'.format(
            len(kept), dead_img))

    # --- filter: board sections (E36) ---------------------------------------
    if args.no_verify:
        print('  board-section check SKIPPED (--no-verify)')
    else:
        live, _dead_sections = drop_dead_sections(config, live)
        print('  board sections checked: {} rows keep a live (or no) section'.format(
            len(live)))

    if not live:
        print('\nNo usable rows survived the filters — nothing to do.')
        return 0

    plan = allocate(live[:HARD_CAP * 2], today, days, per_day)
    plan = plan[:target]
    if not plan:
        print('\nAllocator produced nothing — nothing to do.')
        return 0

    # --- report -------------------------------------------------------------
    by_day = defaultdict(list)
    for row, day in plan:
        by_day[day].append(row)
    print('\n--- Plan: {} rows across {} days ---'.format(
        len(plan), len(by_day)))
    for day in sorted(by_day):
        rows = by_day[day]
        urls = defaultdict(int)
        for row in rows:
            urls[str(row['Post URL']).rstrip('/').split('/')[-1]] += 1
        print('  {}  {:>2} pins  {}'.format(
            day, len(rows),
            ', '.join('{}x{}'.format(n, s) for s, n in sorted(urls.items()))))

    per_url_total = defaultdict(int)
    oldest = newest = None
    for row, _ in plan:
        per_url_total[row['Post URL']] += 1
        d = str(row.get('Post Date'))[:10]
        oldest = d if oldest is None or d < oldest else oldest
        newest = d if newest is None or d > newest else newest
    print('\n--- Destinations ({} distinct), original dates {} .. {} ---'.format(
        len(per_url_total), oldest, newest))
    for url, n in sorted(per_url_total.items(), key=lambda kv: -kv[1]):
        print('  {:>3}  {}'.format(n, url))

    daily = len(plan) / float(len(by_day))
    print('\nCadence effect: +{:.1f} pins/day for {} days on top of whatever new '
          'blog posts contribute. The cron posts 1 pin / 20 min (~72/day '
          'capacity), so this stays well inside both the cron and Pinterest '
          'norms.'.format(daily, len(by_day)))

    if not args.apply:
        print('\nDRY RUN — nothing written. Re-run with --apply to schedule.')
        return 0

    # --- apply --------------------------------------------------------------
    ledger_entries = []
    updated = skipped = 0
    for row, day in plan:
        old_date = str(row.get('Post Date'))[:10]
        try:
            rows = supabase(
                config, 'PATCH',
                'id=eq.{}&%22Is%20Posted%22=eq.false'.format(q(row['id'])),
                body={'Post Date': str(day)},
                prefer='return=representation')
            if not rows:
                skipped += 1  # posted between select and update — never rewrite
                continue
            updated += 1
            ledger_entries.append({
                'id': row['id'],
                'old_date': old_date,
                'new_date': str(day),
                'post_url': row['Post URL'],
                'board_name': row.get('Board Name'),
            })
        except Exception as exc:
            print('  ERROR id={}: {}'.format(row['id'], exc))
            skipped += 1
        time.sleep(0.05)

    ledger_path = os.path.join(
        args.ledger_dir, 'pin-revival-{}.json'.format(today))
    os.makedirs(args.ledger_dir, exist_ok=True)
    with open(ledger_path, 'w') as handle:
        json.dump({
            'generated': str(today),
            'script': 'scripts/agents/revive-stranded-pins.py',
            'experiment': 'E26',
            'per_day': per_day,
            'days': days,
            'updated': updated,
            'entries': ledger_entries,
        }, handle, indent=2)

    print('\n=== Applied: {} re-dated, {} skipped ==='.format(updated, skipped))
    print('Ledger: {}'.format(ledger_path))
    print('Rollback (one command):')
    print('  python3 scripts/agents/revive-stranded-pins.py --rollback {} --apply'
          .format(ledger_path))
    return 0


if __name__ == '__main__':
    sys.exit(main())
