#!/usr/bin/env python3
"""Per-date pin-queue trace: who dated each day's rows, and did they post? (Pip)

WHY (E237, 2026-10-19)
    The 10-18 digest flagged "34 queue rows dated 10-17 were posted vs the
    <=7/date norm". The trace: 7 were Pip's E188 top-up rows and 27 were the
    writer plugin's re-date of a republished 2025 post (WP 33529,
    /sims-4-halloween-loading-screens/, rows created 2025-10-21). Pinterest's
    own API shows 7 pins created on 10-17 — the 27 rows flipped `Is Posted`
    with no pin ("ghost flips"). So the per-date norm was never exceeded on
    Pinterest, and a queue-side "posted" count can over-state the drain.

    This is a READ. It never writes. It prints, per Post Date:
      total | queue-posted | topup (Pip ledgers) | plugin (created_at >=
      PLUGIN_SCHEDULE_SINCE) | legacy (pre-plugin rows the plugin re-dated)
      | Pinterest pins created that UTC day | flags
    Flags: GHOST  queue-posted exceeds pins created by >= GHOST_TOLERANCE
           OVER7  non-top-up rows on the date exceed MAX_ROWS_PER_DAY
    (OVER7 is information, not a violation: the writer's own batches are
    not bound by the top-up cap — SD-10 says that queue is not ours.)

USAGE
    python3 scripts/agents/pin-queue-day-trace.py              # last 14 d
    python3 scripts/agents/pin-queue-day-trace.py --days 30
    python3 scripts/agents/pin-queue-day-trace.py --json
    python3 scripts/agents/pin-queue-day-trace.py --self-test  # offline

Credentials come from the pinner config (MHM_PINTEREST_CONFIG) via
pin-runway-topup.py's loader and are never printed.
"""

import argparse
import collections
import glob
import importlib.util
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GHOST_TOLERANCE = 3   # pins' created_at is UTC, Post Date is a calendar day
MAX_ROWS_PER_DAY = 7  # pin-runway-topup.py's bound, restated for the flag


def _load_topup():
    path = os.path.join(SCRIPT_DIR, 'pin-runway-topup.py')
    spec = importlib.util.spec_from_file_location('pin_runway_topup', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def topup_ids_from_ledgers(ledger_dir):
    ids = set()
    for path in glob.glob(os.path.join(ledger_dir, 'pin-runway-topup-*.json')):
        try:
            with open(path) as handle:
                for entry in json.load(handle).get('entries', []):
                    ids.add(int(entry['id']))
        except (OSError, ValueError, KeyError, TypeError):
            continue
    return ids


def classify_days(rows, topup_ids, pins_by_day, since='2026-09-21',
                  today=None, ghost_tolerance=GHOST_TOLERANCE,
                  max_rows=MAX_ROWS_PER_DAY):
    """Pure. rows: queue rows with id, created_at, Post Date, Post URL,
    Is Posted. pins_by_day: {'YYYY-MM-DD': n} from Pinterest's created_at.
    Returns a list of per-date dicts, sorted by date."""
    by_day = collections.defaultdict(list)
    for row in rows:
        by_day[str(row.get('Post Date') or '')[:10]].append(row)
    out = []
    for day in sorted(by_day):
        xs = by_day[day]
        topup = sum(1 for x in xs if _int(x.get('id')) in topup_ids)
        plugin = sum(1 for x in xs if _int(x.get('id')) not in topup_ids
                     and str(x.get('created_at') or '')[:10] >= since)
        legacy = len(xs) - topup - plugin
        posted = sum(1 for x in xs if str(x.get('Is Posted')).lower() == 'true')
        urls = collections.Counter(str(x.get('Post URL') or '') for x in xs)
        top_url, top_n = urls.most_common(1)[0] if urls else ('', 0)
        pins = pins_by_day.get(day)
        flags = []
        in_past = today is None or day <= str(today)
        if in_past and pins is not None and posted - pins >= ghost_tolerance:
            flags.append('GHOST')
        if len(xs) - topup > max_rows:
            flags.append('OVER7')
        out.append({
            'date': day, 'total': len(xs), 'posted': posted, 'topup': topup,
            'plugin': plugin, 'legacy': legacy, 'pins': pins,
            'ghost': max(0, posted - pins) if (in_past and pins is not None) else None,
            'top_url': top_url, 'top_n': top_n, 'flags': flags,
        })
    return out


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def self_test():
    rows = [
        # 10-17: 7 top-up + 27 legacy rows of one post, all flipped posted
        *[{'id': 100 + i, 'created_at': '2025-06-11', 'Post Date': '2026-10-17',
           'Post URL': 'https://musthavemods.com/a%d/' % i, 'Is Posted': 'True'}
          for i in range(7)],
        *[{'id': 200 + i, 'created_at': '2025-10-21', 'Post Date': '2026-10-17',
           'Post URL': 'https://musthavemods.com/h/', 'Is Posted': 'True'}
          for i in range(27)],
        # 10-13: 7 top-up + 11 plugin rows, 19 pins -> no ghost, OVER7
        *[{'id': 300 + i, 'created_at': '2025-06-11', 'Post Date': '2026-10-13',
           'Post URL': 'https://musthavemods.com/b%d/' % i, 'Is Posted': 'True'}
          for i in range(7)],
        *[{'id': 400 + i, 'created_at': '2026-10-13', 'Post Date': '2026-10-13',
           'Post URL': 'https://musthavemods.com/m/', 'Is Posted': 'True'}
          for i in range(11)],
        # 10-20: 7 top-up rows not yet posted, future -> no ghost
        *[{'id': 500 + i, 'created_at': '2025-06-11', 'Post Date': '2026-10-20',
           'Post URL': 'https://musthavemods.com/c%d/' % i, 'Is Posted': 'False'}
          for i in range(7)],
    ]
    topup = set(range(100, 107)) | set(range(300, 307)) | set(range(500, 507))
    pins = {'2026-10-17': 7, '2026-10-13': 19}
    out = {d['date']: d for d in classify_days(rows, topup, pins, today=date(2026, 10, 19))}
    d17 = out['2026-10-17']
    assert (d17['total'], d17['posted'], d17['topup'], d17['plugin'], d17['legacy']) == (34, 34, 7, 0, 27), d17
    assert d17['ghost'] == 27 and d17['flags'] == ['GHOST', 'OVER7'], d17
    assert d17['top_n'] == 27 and d17['top_url'].endswith('/h/'), d17
    d13 = out['2026-10-13']
    assert (d13['topup'], d13['plugin'], d13['legacy'], d13['ghost']) == (7, 11, 0, 0), d13
    assert d13['flags'] == ['OVER7'], d13
    d20 = out['2026-10-20']
    assert d20['ghost'] is None and d20['flags'] == [], d20
    # tolerance: posted exceeds pins by 2 -> not a ghost
    out2 = classify_days(rows[:7], topup, {'2026-10-17': 5}, today=date(2026, 10, 19))
    assert out2[0]['flags'] == [] and out2[0]['ghost'] == 2, out2
    # a row with a non-numeric id is never counted as a top-up
    out3 = classify_days([{'id': 'x', 'created_at': '2025-01-01', 'Post Date': '2026-10-01',
                           'Post URL': '', 'Is Posted': 'False'}], topup, {}, today=date(2026, 10, 19))
    assert out3[0]['legacy'] == 1 and out3[0]['topup'] == 0, out3
    print('self-test OK (7 assertions)')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--days', type=int, default=14, help='trailing days (default 14)')
    parser.add_argument('--ahead', type=int, default=14, help='look-ahead days (default 14)')
    parser.add_argument('--ledger-dir', default=os.path.join('reports', 'funnel'))
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        return self_test()

    topup = _load_topup()
    config = topup.load_config()
    today = date.today()
    floor = today - timedelta(days=args.days)
    horizon = today + timedelta(days=args.ahead)
    query = ('select=id,created_at,%22Post%20Date%22,%22Post%20URL%22,%22Is%20Posted%22'
             '&%22Post%20Date%22=gte.{f}&%22Post%20Date%22=lte.{h}&limit=5000'
             ).format(f=topup.q(str(floor)), h=topup.q(str(horizon)))
    rows = topup.revive().supabase(config, 'GET', query)
    if rows is None or len(rows) >= 5000:
        print('ERROR: queue read unavailable or truncated — no verdict')
        return 2
    since = datetime.combine(floor, datetime.min.time(), tzinfo=timezone.utc)
    stamps, complete = topup.fetch_pinterest_pins_created_since(config, since)
    pins_by_day = {}
    if stamps is not None and complete:
        pins_by_day = dict(collections.Counter(str(s.date()) for s in stamps))
    pins_note = ('pinterest-api complete' if pins_by_day else
                 'pinterest-api unavailable/truncated — GHOST flag disabled')
    days = classify_days(rows, topup_ids_from_ledgers(args.ledger_dir), pins_by_day,
                         since=topup.PLUGIN_SCHEDULE_SINCE, today=today)
    if args.json:
        print(json.dumps({'today': str(today), 'pins_basis': pins_note, 'days': days}, indent=1))
        return 0
    print('=== pin-queue day trace {}..{} ({}) ==='.format(floor, horizon, pins_note))
    print('date       total posted topup plugin legacy pins ghost  top-url (n)  flags')
    for d in days:
        print('{date} {total:5d} {posted:6d} {topup:5d} {plugin:6d} {legacy:6d} {pins:>4} {ghost:>5}  {u} ({top_n})  {flags}'.format(
            pins='-' if d['pins'] is None else d['pins'],
            ghost='-' if d['ghost'] is None else d['ghost'],
            u=d['top_url'].split('musthavemods.com/')[-1][:40],
            flags=' '.join(d['flags']), **{k: d[k] for k in ('date', 'total', 'posted', 'topup', 'plugin', 'legacy', 'top_n')}))
    past = [d for d in days if d['date'] <= str(today)]
    print('totals {}..{}: pins {} | topup rows {} | plugin rows {} | legacy rows {} | ghost {}'.format(
        floor, today, sum(d['pins'] or 0 for d in past), sum(d['topup'] for d in past),
        sum(d['plugin'] for d in past), sum(d['legacy'] for d in past), sum(d['ghost'] or 0 for d in past)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
