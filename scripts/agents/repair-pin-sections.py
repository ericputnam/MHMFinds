#!/usr/bin/env python3
"""Repair dead Pinterest board sections on schedulable pin-queue rows (Pip, E36, Tier 0).

WHY THIS EXISTS
    The poster (MHMUtils/supabase_pin_poster_server.py) runs every 20 minutes,
    selects ONE unposted row inside its 14-day "Post Date" window, oldest first,
    and POSTs it to Pinterest with the row's "Board Section ID". A row whose
    section no longer exists gets `404 {"code":2031,"message":"Sorry! We
    couldn't find this board section."}`; the poster logs the error, does not
    mark or skip the row, and picks the same row again 20 minutes later.

    On 2026-09-10 06:40 CDT the last pin posted. From 07:00 CDT entry 8007 (an
    E26-revived row carrying a February section id that the writer has since
    deleted) failed 138 times in a row while 55 other schedulable rows waited
    behind it. Two days of zero pins from a queue with inventory and a valid
    token. Nothing in the repo could see it: check-pinner.sh only reads the
    queue, and the poster's log lives on the BigScoots host.

WHAT IT DOES
    Mirrors the poster's selection query exactly (unposted, "Post Date" inside
    [today - LOOKBACK_DAYS, today]), fetches the live sections of every board
    those rows reference (one API call per board), and for each row decides:

        ok       section id exists on the board                -> untouched
        none     row has no section id                          -> untouched
        renamed  id is dead but a section with the same name    -> re-pointed
                 exists on the board
        null     id is dead and no section of that name exists  -> section id
                 cleared, so the pin lands on the board root (the same code
                 path the poster already takes for rows with no section)

    --apply writes the renamed/null rows and a JSON ledger so the change can
    be put back with one command. --check is for monitors: it prints a
    one-line summary and exits 1 if any schedulable row would block the poster.

SAFETY RAILS
    * dry run is the default; nothing is written without --apply
    * `Is Posted = false` is in the PATCH filter, so a row the poster posts
      mid-run is never rewritten
    * only "Board Section ID" is ever written; dates, boards, copy untouched
    * a board whose sections cannot be fetched leaves its rows untouched
      (reported as `unknown`, never treated as dead)
    * no token is ever printed; every line goes through redact()

EXIT CODES
    0  ran (dry run, apply, or --check with nothing dead)
    1  --check found dead sections on schedulable rows, or --apply hit errors
    2  could not run (no config, no token, Pinterest/Supabase unreachable)

USAGE
    python3 scripts/agents/repair-pin-sections.py                # dry run
    python3 scripts/agents/repair-pin-sections.py --apply
    python3 scripts/agents/repair-pin-sections.py --check        # monitor
    python3 scripts/agents/repair-pin-sections.py --self-test    # offline
    python3 scripts/agents/repair-pin-sections.py \
        --rollback reports/funnel/pin-section-repair-YYYY-MM-DD.json --apply

ENV
    MHM_PINTEREST_CONFIG  pinner config.json (SUPABASE_URL / SUPABASE_KEY /
                          creator_access_token); default
                          $MHM_UTILS_DIR/config.json
    MHM_UTILS_DIR         pinner checkout (default ~/java_projects/MHMUtils)
"""

import argparse
import importlib.util
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict, defaultdict
from datetime import date, timedelta

TABLE = 'n8n_pinterest_posts'
PINTEREST_API = 'https://api.pinterest.com/v5'
# Must match BACKLOG_LOOKBACK_DAYS in MHMUtils/supabase_pin_poster_server.py.
LOOKBACK_DAYS = 14
MAX_ROWS = 1000

SECTION_COL = 'Board Section ID'
SECTION_NAME_COL = 'Board Section'
SELECT_COLS = ('select=id,%22Post%20Date%22,%22Post%20URL%22,%22Board%20ID%22,'
               '%22Board%20Name%22,%22Board%20Section%22,%22Board%20Section%20ID%22')

_REDACT = [
    re.compile(r'pin[a-z]?[._][A-Za-z0-9._\-]{16,}'),
    re.compile(r'\b[A-Za-z0-9_\-]{40,}\b'),
]


def redact(text):
    out = str(text)
    for pattern in _REDACT:
        out = pattern.sub('[REDACTED]', out)
    return out


def say(*parts):
    print(redact(' '.join(str(p) for p in parts)))


class CouldNotRun(Exception):
    """Preconditions not met — exit 2, never a pipeline failure."""


# --------------------------------------------------------------------------
# Pure decision (covered by --self-test)
# --------------------------------------------------------------------------

def norm(name):
    return ' '.join(str(name or '').split()).strip().lower()


def decide(section_id, section_name, live_sections):
    """Return (verdict, new_section_id).

    live_sections: {section_id: section_name} for the row's board, or None
    when the board's sections could not be fetched.
    """
    if not section_id:
        return 'none', None
    if live_sections is None:
        return 'unknown', section_id
    sid = str(section_id)
    if sid in live_sections:
        return 'ok', sid
    wanted = norm(section_name)
    if wanted:
        for live_id, live_name in live_sections.items():
            if norm(live_name) == wanted:
                return 'renamed', str(live_id)
    return 'null', None


def plan_rows(rows, sections_by_board):
    """Apply decide() to every row; returns a list of dicts with the verdict."""
    out = []
    for row in rows:
        board = str(row.get('Board ID') or '')
        verdict, new_id = decide(
            row.get(SECTION_COL), row.get(SECTION_NAME_COL),
            sections_by_board.get(board))
        out.append({
            'id': row.get('id'),
            'post_date': str(row.get('Post Date') or '')[:10],
            'board_id': board,
            'board_name': row.get('Board Name'),
            'section_name': row.get(SECTION_NAME_COL),
            'old_section_id': row.get(SECTION_COL),
            'new_section_id': new_id,
            'verdict': verdict,
        })
    return out


# --------------------------------------------------------------------------
# Credentials / token
# --------------------------------------------------------------------------

def utils_dir():
    return os.environ.get(
        'MHM_UTILS_DIR',
        os.path.join(os.path.expanduser('~'), 'java_projects', 'MHMUtils'))


def config_path():
    return os.environ.get('MHM_PINTEREST_CONFIG',
                          os.path.join(utils_dir(), 'config.json'))


def load_config():
    path = config_path()
    if not os.path.isfile(path):
        raise CouldNotRun('pinner config not found at {}'.format(path))
    with open(path) as handle:
        config = json.load(handle)
    if not config.get('SUPABASE_URL') or not config.get('SUPABASE_KEY'):
        raise CouldNotRun('SUPABASE_URL / SUPABASE_KEY missing from the pinner config')
    return config


def load_token_status_module():
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, 'pinterest-token-status.py')
    if not os.path.isfile(path):
        return None
    spec = importlib.util.spec_from_file_location('mhm_pinterest_token_status', path)
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
    except Exception:
        return None
    return module


def obtain_token(config):
    """A token valid *now*, via the same manager check-pinner.sh uses.

    Falls back to the stored token if the helper is missing. Never printed.
    """
    helper = load_token_status_module()
    if helper is not None:
        try:
            manager, _backend = helper.load_manager(config_path())
            stored = manager.config.get('creator_access_token', '')
            if stored and manager.test_token(stored):
                return stored
            manager.refresh_token()
            return manager.config.get('creator_access_token', '')
        except Exception as exc:
            raise CouldNotRun('could not obtain a Pinterest token: ' + redact(exc))
    token = config.get('creator_access_token', '')
    if not token:
        raise CouldNotRun('no creator_access_token in the pinner config')
    return token


# --------------------------------------------------------------------------
# Supabase
# --------------------------------------------------------------------------

def supabase(config, method, query='', body=None, prefer=None, timeout=45, retries=3):
    """One PostgREST call. Reads retry on transient 5xx (Supabase 504s were
    seen 2026-09-11/12 by the banner poster and by this script's first run);
    writes never retry, so a PATCH is attempted exactly once."""
    import time
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
    attempts = retries if method == 'GET' else 1
    for attempt in range(1, attempts + 1):
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                raw = response.read().decode()
            return json.loads(raw) if raw else []
        except urllib.error.HTTPError as exc:
            if exc.code >= 500 and attempt < attempts:
                time.sleep(3 * attempt)
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt < attempts:
                time.sleep(3 * attempt)
                continue
            raise


def q(value):
    return urllib.parse.quote(str(value), safe='')


def fetch_window_rows(config, floor_str, ceil_str):
    """Exactly the poster's selection: unposted rows dated inside the window."""
    query = ('{cols}&%22Is%20Posted%22=eq.false'
             '&%22Post%20Date%22=gte.{floor}&%22Post%20Date%22=lte.{ceil}'
             '&order=%22Post%20Date%22.asc,id.asc&limit={limit}').format(
                 cols=SELECT_COLS, floor=q(floor_str), ceil=q(ceil_str),
                 limit=MAX_ROWS)
    try:
        return supabase(config, 'GET', query)
    except Exception as exc:
        raise CouldNotRun('Supabase query failed: ' + redact(exc))


# --------------------------------------------------------------------------
# Pinterest
# --------------------------------------------------------------------------

def fetch_board_sections(token, board_id, timeout=20):
    """{section_id: name} for a board, or None if it could not be fetched."""
    sections = {}
    bookmark = None
    for _ in range(10):
        url = '{}/boards/{}/sections?page_size=100'.format(PINTEREST_API, q(board_id))
        if bookmark:
            url += '&bookmark=' + q(bookmark)
        req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                payload = json.loads(response.read().decode())
        except urllib.error.HTTPError as exc:
            if exc.code == 401:
                raise CouldNotRun('Pinterest rejected the token (HTTP 401)')
            return None  # 404 board gone, 429, 5xx: unknown, never "dead"
        except Exception:
            return None
        for item in payload.get('items', []):
            sections[str(item.get('id'))] = item.get('name', '')
        bookmark = payload.get('bookmark')
        if not bookmark:
            break
    return sections


def sections_for_rows(token, rows):
    boards = sorted({str(r.get('Board ID') or '') for r in rows if r.get('Board ID')})
    by_board = {}
    for board in boards:
        by_board[board] = fetch_board_sections(token, board)
    return by_board


# --------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------

def summarize(plan):
    counts = defaultdict(int)
    for entry in plan:
        counts[entry['verdict']] += 1
    dead = [e for e in plan if e['verdict'] in ('renamed', 'null')]
    return counts, dead


def print_plan(plan, floor, today, apply_changes):
    counts, dead = summarize(plan)
    say('Poster window is [{} .. {}]: {} schedulable row(s) across {} board(s).'.format(
        floor, today, len(plan), len({e['board_id'] for e in plan})))
    say('  ok={} none={} renamed={} null={} unknown={}'.format(
        counts['ok'], counts['none'], counts['renamed'], counts['null'],
        counts['unknown']))
    if counts['unknown']:
        say('  {} row(s) on boards whose sections could not be fetched are left '
            'untouched'.format(counts['unknown']))
    if not dead:
        say('\nNo dead sections — the poster is not blocked by this.')
        return dead
    say('\n--- {} row(s) would block the poster ({}) ---'.format(
        len(dead), 'WRITING' if apply_changes else 'dry run'))
    grouped = OrderedDict()
    for entry in dead:
        key = (entry['board_id'], entry['board_name'], entry['section_name'],
               entry['old_section_id'], entry['verdict'], entry['new_section_id'])
        grouped.setdefault(key, []).append(entry['id'])
    for (board, bname, sname, old, verdict, new), ids in grouped.items():
        action = ('re-point to section {}'.format(new) if verdict == 'renamed'
                  else 'clear section (pin lands on the board root)')
        say('  board {} ({!r}) section {!r} id {}: DEAD -> {}  rows={}'.format(
            board, bname, sname, old, action, ids))
    return dead


# --------------------------------------------------------------------------
# Write / rollback
# --------------------------------------------------------------------------

def write_repairs(config, dead, ledger_path):
    written, skipped, errors = [], 0, 0
    for entry in dead:
        try:
            rows = supabase(
                config, 'PATCH',
                'id=eq.{}&%22Is%20Posted%22=eq.false'.format(q(entry['id'])),
                body={SECTION_COL: entry['new_section_id']},
                prefer='return=representation')
            if rows:
                written.append(entry)
            else:
                skipped += 1  # posted in the meantime — leave it alone
        except Exception as exc:
            errors += 1
            say('  ERROR id={}: {}'.format(entry['id'], exc))
    ledger = {
        'date': str(date.today()),
        'script': 'scripts/agents/repair-pin-sections.py',
        'column': SECTION_COL,
        'entries': written,
    }
    os.makedirs(os.path.dirname(ledger_path) or '.', exist_ok=True)
    with open(ledger_path, 'w') as handle:
        json.dump(ledger, handle, indent=2)
        handle.write('\n')
    say('\n=== wrote {} row(s), skipped {} (posted meanwhile), errors {} ==='.format(
        len(written), skipped, errors))
    say('Ledger: {}'.format(ledger_path))
    say('Rollback: python3 scripts/agents/repair-pin-sections.py --rollback {} --apply'
        .format(ledger_path))
    return 1 if errors else 0


def do_rollback(config, ledger_path, apply_changes):
    if not os.path.isfile(ledger_path):
        say('ERROR: ledger not found at {}'.format(ledger_path))
        return 2
    with open(ledger_path) as handle:
        ledger = json.load(handle)
    entries = ledger.get('entries', [])
    say('=== {}ROLLBACK: {} row(s) from {} ==='.format(
        '' if apply_changes else 'DRY RUN ', len(entries), ledger_path))
    restored = skipped = 0
    for entry in entries:
        if not apply_changes:
            say('  WOULD RESTORE id={} section {} -> {}'.format(
                entry['id'], entry['new_section_id'], entry['old_section_id']))
            restored += 1
            continue
        try:
            rows = supabase(
                config, 'PATCH',
                'id=eq.{}&%22Is%20Posted%22=eq.false'.format(q(entry['id'])),
                body={SECTION_COL: entry['old_section_id']},
                prefer='return=representation')
            if rows:
                restored += 1
            else:
                skipped += 1
        except Exception as exc:
            say('  ERROR id={}: {}'.format(entry['id'], exc))
            skipped += 1
    say('=== rollback done: restored={}, skipped(already posted or failed)={} ==='
        .format(restored, skipped))
    return 0


# --------------------------------------------------------------------------
# Self-test (offline, no network, no credentials)
# --------------------------------------------------------------------------

def self_test():
    live = {'111': 'Sims 4 Afro Hair', '222': 'Sims 4 Black Hair CC'}
    checks = [
        ('no section id is left alone', decide(None, 'Anything', live), ('none', None)),
        ('empty-string id counts as none', decide('', 'Anything', live), ('none', None)),
        ('live id is ok', decide('111', 'Sims 4 Afro Hair', live), ('ok', '111')),
        ('live id is ok even if the stored name drifted',
         decide('111', 'Old Name', live), ('ok', '111')),
        ('dead id with a same-name section is re-pointed',
         decide('999', '  sims 4 black hair cc ', live), ('renamed', '222')),
        ('dead id with no such name is nulled',
         decide('999', 'Black Sims 4 CC', live), ('null', None)),
        ('dead id with no name is nulled', decide('999', None, live), ('null', None)),
        ('unfetchable board is unknown, never dead',
         decide('999', 'Black Sims 4 CC', None), ('unknown', '999')),
        ('integer ids compare as strings', decide(111, 'x', live), ('ok', '111')),
    ]
    failed = 0
    for label, got, want in checks:
        status = 'ok ' if got == want else 'FAIL'
        if got != want:
            failed += 1
        print('  [{}] {} -> {}'.format(status, label, got))
    rows = [
        {'id': 1, 'Board ID': 'b1', SECTION_COL: '999', SECTION_NAME_COL: 'X'},
        {'id': 2, 'Board ID': 'b2', SECTION_COL: '5', SECTION_NAME_COL: 'Y'},
        {'id': 3, 'Board ID': 'b1', SECTION_COL: None, SECTION_NAME_COL: 'Z'},
    ]
    plan = plan_rows(rows, {'b1': {'1': 'A'}, 'b2': None})
    counts, dead = summarize(plan)
    ok = (counts['null'], counts['unknown'], counts['none'], [e['id'] for e in dead]) == (1, 1, 1, [1])
    failed += 0 if ok else 1
    print('  [{}] plan_rows: one null, one unknown, one none; only the null row is dead -> {}'
          .format('ok ' if ok else 'FAIL', dict(counts)))
    print('self-test: {} check(s) failed'.format(failed))
    return 1 if failed else 0


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--apply', action='store_true',
                        help='actually write (default is a dry run)')
    parser.add_argument('--check', action='store_true',
                        help='monitor mode: one-line summary, exit 1 if any '
                             'schedulable row has a dead section')
    parser.add_argument('--rollback', metavar='LEDGER',
                        help='restore section ids from a ledger written by --apply')
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--ledger-dir', default=os.path.join('reports', 'funnel'))
    args = parser.parse_args()

    if args.self_test:
        return self_test()

    try:
        config = load_config()
        if args.rollback:
            return do_rollback(config, args.rollback, args.apply)

        today = date.today()
        floor = today - timedelta(days=LOOKBACK_DAYS)
        rows = fetch_window_rows(config, str(floor), str(today))
        if not rows:
            say('SECTIONS: 0 schedulable rows — nothing to validate')
            return 0
        token = obtain_token(config)
        by_board = sections_for_rows(token, rows)
        plan = plan_rows(rows, by_board)
    except CouldNotRun as exc:
        say('COULD-NOT-RUN: {}'.format(exc))
        return 2

    if args.check:
        counts, dead = summarize(plan)
        if dead:
            say('SECTIONS: {} of {} schedulable row(s) point at a dead board section '
                '— the poster retries the first one forever and posts nothing'.format(
                    len(dead), len(plan)))
            seen = set()
            for entry in dead:
                key = (entry['board_id'], entry['old_section_id'])
                if key in seen:
                    continue
                seen.add(key)
                say('  board {} ({!r}) section {!r} id {} -> {}'.format(
                    entry['board_id'], entry['board_name'], entry['section_name'],
                    entry['old_section_id'],
                    'renamed' if entry['verdict'] == 'renamed' else 'no such section'))
            say('  Fix: python3 scripts/agents/repair-pin-sections.py  (dry run), '
                'then --apply')
            return 1
        unknown = ' ({} unknown: board sections unreachable)'.format(
            counts['unknown']) if counts['unknown'] else ''
        say('SECTIONS: all {} schedulable row(s) have a live board section{}'.format(
            len(plan), unknown))
        return 0

    say('=== {}: repair dead board sections on schedulable pins ==='.format(
        'APPLY' if args.apply else 'DRY RUN'))
    dead = print_plan(plan, floor, today, args.apply)
    if not dead or not args.apply:
        if dead:
            say('\nDry run — nothing written. Re-run with --apply to repair.')
        return 0
    ledger_path = os.path.join(
        args.ledger_dir, 'pin-section-repair-{}.json'.format(date.today()))
    return write_repairs(config, dead, ledger_path)


if __name__ == '__main__':
    sys.exit(main())
