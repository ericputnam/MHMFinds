"""pytest suite for pin-runway-topup.py (Pip, Distribution).

No network calls: every test exercises the pure decision logic
(`decide_topup`), the guards (`already_applied_today`, `filter_writer_rows`),
and the allocator (`allocate_topup`) directly, or monkeypatches the thin I/O
functions (`count_inventory`, `compute_daily_posted_rate`,
`count_writer_rows_for_date`) so `main()` can be exercised without Supabase
or Pinterest credentials.

Run: PYTHONPATH=. pytest scripts/agents/test_pin_runway_topup.py -v
(the module under test has a hyphen in its filename, so it is loaded via
importlib — see `_load_module()` below, mirroring the pattern the script
itself uses to reuse revive-stranded-pins.py).
"""

import importlib.util
import json
import os
import sys
from datetime import date, timedelta

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))


def _load_module(name, filename):
    path = os.path.join(HERE, filename)
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope='module')
def topup():
    return _load_module('mhm_pin_runway_topup', 'pin-runway-topup.py')


TODAY = date(2026, 9, 22)


# --------------------------------------------------------------------------
# decide_topup — the core bounded decision
# --------------------------------------------------------------------------

def test_noop_above_floor(topup):
    out = topup.decide_topup(inventory=20, rate=5, writer_rows_by_day=lambda d: 0,
                              today=TODAY)
    assert out['level'] == 'noop'
    assert out['rows_planned'] == 0
    assert out['day_plan'] == []


def test_noop_exactly_at_floor(topup):
    # runway == low_runway (2.0) is "at or above" -> no-op, not a plan.
    out = topup.decide_topup(inventory=10, rate=5, writer_rows_by_day=lambda d: 0,
                              today=TODAY)
    assert out['runway_before'] == 2.0
    assert out['level'] == 'noop'


@pytest.mark.parametrize('inventory,rate', [
    (None, 5), (10, None), (10, 0), (10, -3), (None, None),
])
def test_unknown_on_bad_data(topup, inventory, rate):
    out = topup.decide_topup(inventory=inventory, rate=rate,
                              writer_rows_by_day=lambda d: 0, today=TODAY)
    assert out['level'] == 'unknown'
    assert out['rows_planned'] == 0
    assert out['day_plan'] == []


def test_capped_by_seven_per_day(topup):
    out = topup.decide_topup(inventory=0, rate=100, writer_rows_by_day=lambda d: 0,
                              today=TODAY)
    assert out['level'] == 'plan'
    assert all(d['rows'] <= 7 for d in out['day_plan'])
    assert out['day_plan'][0]['rows'] == 7


def test_capped_by_posted_rate_below_seven(topup):
    out = topup.decide_topup(inventory=0, rate=3, writer_rows_by_day=lambda d: 0,
                              today=TODAY)
    assert out['day_plan'][0]['rows'] == 3
    assert all(d['rows'] <= 3 for d in out['day_plan'])


def test_hard_cap_21(topup):
    out = topup.decide_topup(inventory=0, rate=1000, writer_rows_by_day=lambda d: 0,
                              today=TODAY)
    assert out['rows_planned'] == 21
    assert out['bound_rule'] == 'hard_cap_21'
    assert sum(d['rows'] for d in out['day_plan']) == 21


def test_hard_cap_holds_even_with_many_days_available(topup):
    # A low rate would otherwise need many days to reach rows_needed; the
    # hard cap must still bind at 21, never creeping past it via more days.
    out = topup.decide_topup(inventory=0, rate=2, writer_rows_by_day=lambda d: 0,
                              today=TODAY)
    assert out['rows_planned'] <= 21


def test_writer_rows_shrink_and_exclude_that_day(topup):
    def writer(d):
        return 10 if d == TODAY else 0
    out = topup.decide_topup(inventory=0, rate=10, writer_rows_by_day=writer,
                              today=TODAY)
    dates = [d['date'] for d in out['day_plan']]
    assert str(TODAY) not in dates, 'today fully consumed by writer rows must be skipped'
    assert dates[0] == str(TODAY + timedelta(days=1))
    assert out['day_plan'][0]['writer_rows_that_day'] == 0


def test_writer_rows_partial_reduction(topup):
    def writer(d):
        return 4 if d == TODAY else 0
    out = topup.decide_topup(inventory=0, rate=10, writer_rows_by_day=writer,
                              today=TODAY)
    today_entry = next((d for d in out['day_plan'] if d['date'] == str(TODAY)), None)
    assert today_entry is not None
    # rate(10) - writer(4) = 6, still under the 7/day cap.
    assert today_entry['rows'] == 6


def test_fills_to_exactly_target_runway(topup):
    out = topup.decide_topup(inventory=10, rate=10, writer_rows_by_day=lambda d: 0,
                              today=TODAY)
    assert out['runway_before'] == 1.0
    assert out['rows_planned'] == 20
    assert out['runway_after'] == 3.0


def test_fills_to_target_runway_rate_under_seven(topup):
    out = topup.decide_topup(inventory=10, rate=6, writer_rows_by_day=lambda d: 0,
                              today=TODAY)
    assert out['runway_after'] == 3.0
    assert out['bound_rule'] == 'reached_target_runway'


# --------------------------------------------------------------------------
# Once-per-UTC-day apply guard
# --------------------------------------------------------------------------

def test_once_per_day_refusal(topup, tmp_path):
    ledger_dir = str(tmp_path)
    assert topup.already_applied_today(ledger_dir, TODAY) is False
    ledger_file = os.path.join(
        ledger_dir, '{}{}.json'.format(topup.LEDGER_PREFIX, TODAY))
    with open(ledger_file, 'w') as handle:
        json.dump({'entries': []}, handle)
    assert topup.already_applied_today(ledger_dir, TODAY) is True
    # A different UTC day is unaffected.
    assert topup.already_applied_today(ledger_dir, TODAY - timedelta(days=1)) is False
    assert topup.already_applied_today(ledger_dir, TODAY + timedelta(days=1)) is False


def test_once_per_day_refusal_empty_dir(topup, tmp_path):
    assert topup.already_applied_today(str(tmp_path), TODAY) is False


# --------------------------------------------------------------------------
# Writer rows are never the rows this tool selects/touches
# --------------------------------------------------------------------------

def test_filter_writer_rows_excludes_attributed_rows(topup):
    rows = [
        {'id': 1, 'Wordpress Post ID': '0'},   # writer row (string "0" per lib comment)
        {'id': 2, 'Wordpress Post ID': None},  # not a writer row
        {'id': 3, 'Wordpress Post ID': ''},    # not a writer row
        {'id': 4},                             # key absent entirely
        {'id': 5, 'Wordpress Post ID': '842'},
    ]
    kept, dropped = topup.filter_writer_rows(rows)
    kept_ids = [r['id'] for r in kept]
    assert kept_ids == [2, 3, 4]
    assert dropped == 2


def test_filter_writer_rows_empty_input(topup):
    kept, dropped = topup.filter_writer_rows([])
    assert kept == [] and dropped == 0


# --------------------------------------------------------------------------
# allocate_topup — per-day quotas, per-url/board caps, priority order kept
# --------------------------------------------------------------------------

def test_allocate_topup_respects_day_quota_and_caps(topup):
    rows = [{'id': i, 'Post URL': 'https://u{}/'.format(i % 3),
             'Board ID': 'B{}'.format(i % 2)} for i in range(12)]
    day_plan = [{'date': '2026-09-23', 'rows': 3}, {'date': '2026-09-24', 'rows': 3}]
    plan = topup.allocate_topup(rows, day_plan, max_per_url=1, max_per_board=5)
    assert len(plan) <= 6
    by_day = {}
    for row, day in plan:
        by_day.setdefault(day, []).append(row)
    for day, rs in by_day.items():
        assert len(rs) <= 3
        urls = [r['Post URL'] for r in rs]
        assert len(urls) == len(set(urls)), 'max_per_url=1 violated on {}'.format(day)


def test_allocate_topup_keeps_priority_order_within_a_day(topup):
    rows = [{'id': i, 'Post URL': 'https://u{}/'.format(i), 'Board ID': 'B{}'.format(i)}
            for i in range(5)]
    day_plan = [{'date': '2026-09-23', 'rows': 2}]
    plan = topup.allocate_topup(rows, day_plan, max_per_url=1, max_per_board=1)
    placed_ids = [row['id'] for row, _ in plan]
    assert placed_ids == [0, 1]


def test_allocate_topup_empty_day_plan(topup):
    rows = [{'id': 1, 'Post URL': 'https://u/', 'Board ID': 'B'}]
    assert topup.allocate_topup(rows, [], max_per_url=1, max_per_board=1) == []


# --------------------------------------------------------------------------
# main() wiring: no-op and unknown paths, exercised end-to-end with the I/O
# functions monkeypatched (no network).
# --------------------------------------------------------------------------

def _fake_config():
    return {'SUPABASE_URL': 'https://example.invalid', 'SUPABASE_KEY': 'x',
            'creator_access_token': 'y'}


def test_main_exits_0_on_noop(topup, monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(topup, 'load_config', lambda: _fake_config())
    monkeypatch.setattr(topup, 'count_inventory', lambda config, today: 30)
    monkeypatch.setattr(topup, 'compute_daily_posted_rate',
                        lambda config, now=None, window_days=14: 5.0)
    monkeypatch.setattr(sys, 'argv', ['pin-runway-topup.py',
                                      '--ledger-dir', str(tmp_path)])
    rc = topup.main()
    assert rc == 0
    out = capsys.readouterr().out
    assert 'no top-up needed' in out or 'runway' in out
    assert 'basis: pinterest-14d' in out


def test_main_exits_2_on_unknown(topup, monkeypatch, tmp_path):
    monkeypatch.setattr(topup, 'load_config', lambda: _fake_config())
    monkeypatch.setattr(topup, 'count_inventory', lambda config, today: None)
    monkeypatch.setattr(topup, 'compute_daily_posted_rate',
                        lambda config, now=None, window_days=14: None)
    # The queue-side fallback must be unknown too, or 'auto' would rescue it.
    monkeypatch.setattr(topup, 'count_posted_rows_dated_window',
                        lambda config, today, window_days=14: None)
    monkeypatch.setattr(sys, 'argv', ['pin-runway-topup.py',
                                      '--ledger-dir', str(tmp_path)])
    rc = topup.main()
    assert rc == 2


# --------------------------------------------------------------------------
# Posted-rate basis: a truncated Pinterest sample is unknown, never a floor
# (2026-09-26: 100 pins on one page ÷ 14 = 7.14/day → "runway 8.8 d, no-op"
# while the queue-side proxy read 36/day → 1.75 d and a top-up was due).
# --------------------------------------------------------------------------

def _fixed_now(topup):
    from datetime import datetime, timezone
    return datetime(2026, 9, 22, tzinfo=timezone.utc)


def test_truncated_pinterest_sample_is_unknown(topup, monkeypatch):
    now = _fixed_now(topup)
    monkeypatch.setattr(topup, 'fetch_pinterest_pins_created_since',
                        lambda config, since, **kw: ([now] * 100, False))
    assert topup.compute_daily_posted_rate({'creator_access_token': 't'}, now=now) is None


def test_complete_pinterest_sample_is_a_rate(topup, monkeypatch):
    now = _fixed_now(topup)
    monkeypatch.setattr(topup, 'fetch_pinterest_pins_created_since',
                        lambda config, since, **kw: ([now] * 140, True))
    assert topup.compute_daily_posted_rate({'creator_access_token': 't'}, now=now) == 10.0


def test_fetch_marks_incomplete_when_page_cap_hit(topup, monkeypatch):
    """Every page is entirely inside the window and the bookmark never runs
    out: the fetch must report complete=False, not pretend the count is exact."""
    import io
    now = _fixed_now(topup)
    body = json.dumps({'items': [{'created_at': '2026-09-21T10:00:00'}] * 100,
                       'bookmark': 'more'}).encode()

    class _Resp(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    monkeypatch.setattr(topup.urllib.request, 'urlopen',
                        lambda req, timeout=30: _Resp(body))
    since = now - timedelta(days=14)
    stamps, complete = topup.fetch_pinterest_pins_created_since(
        {'creator_access_token': 't'}, since, max_pages=2)
    assert len(stamps) == 200
    assert complete is False


def test_fetch_marks_complete_when_it_passes_the_window(topup, monkeypatch):
    import io
    now = _fixed_now(topup)
    body = json.dumps({'items': [{'created_at': '2026-09-21T10:00:00'},
                                 {'created_at': '2026-08-01T10:00:00'}],
                       'bookmark': 'more'}).encode()

    class _Resp(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    monkeypatch.setattr(topup.urllib.request, 'urlopen',
                        lambda req, timeout=30: _Resp(body))
    since = now - timedelta(days=14)
    stamps, complete = topup.fetch_pinterest_pins_created_since(
        {'creator_access_token': 't'}, since)
    assert len(stamps) == 1
    assert complete is True


@pytest.mark.parametrize('source,expected_calls,expected_basis', [
    ('pinterest', ['p'], 'unknown'),
    ('queue', ['q'], 'queue-posted-14d'),
    ('auto', ['p', 'q'], 'queue-posted-14d'),
])
def test_resolve_posted_rate_sources(topup, monkeypatch, source, expected_calls,
                                     expected_basis):
    calls = []
    monkeypatch.setattr(topup, 'compute_daily_posted_rate',
                        lambda config, now=None, window_days=14: calls.append('p') or None)
    monkeypatch.setattr(topup, 'count_posted_rows_dated_window',
                        lambda config, today, window_days=14: calls.append('q') or 504)
    rate, basis = topup.resolve_posted_rate({}, TODAY, source)
    assert calls == expected_calls
    assert basis == expected_basis
    if basis != 'unknown':
        assert rate == pytest.approx(36.0)


def test_resolve_posted_rate_prefers_pinterest_when_complete(topup, monkeypatch):
    monkeypatch.setattr(topup, 'compute_daily_posted_rate',
                        lambda config, now=None, window_days=14: 12.5)
    monkeypatch.setattr(topup, 'count_posted_rows_dated_window',
                        lambda config, today, window_days=14: 504)
    assert topup.resolve_posted_rate({}, TODAY, 'auto') == (12.5, 'pinterest-14d')


@pytest.mark.parametrize('count', [None, 0])
def test_resolve_posted_rate_queue_unknown_on_bad_count(topup, monkeypatch, count):
    monkeypatch.setattr(topup, 'count_posted_rows_dated_window',
                        lambda config, today, window_days=14: count)
    assert topup.resolve_posted_rate({}, TODAY, 'queue') == (None, 'unknown')


def test_resolve_posted_rate_rejects_bogus_source(topup):
    with pytest.raises(ValueError):
        topup.resolve_posted_rate({}, TODAY, 'bogus')


# --------------------------------------------------------------------------
# Queue-side board-section check (stand-in for the Pinterest sections API)
# --------------------------------------------------------------------------

def test_drop_sections_not_recently_posted(topup):
    live = {('B1', 'S1')}
    rows = [{'id': 1, 'Board ID': 'B1', 'Board Section ID': 'S1'},
            {'id': 2, 'Board ID': 'B1', 'Board Section ID': 'S9'},
            {'id': 3, 'Board ID': 'B2', 'Board Section ID': 'S1'},
            {'id': 4, 'Board ID': 'B2', 'Board Section ID': None},
            {'id': 5, 'Board ID': 'B2'}]
    kept, dropped = topup.drop_sections_not_recently_posted(rows, live)
    assert [r['id'] for r in kept] == [1, 4, 5]
    assert [r['id'] for r in dropped] == [2, 3]


def test_drop_sections_refuses_incomplete_read(topup):
    with pytest.raises(ValueError):
        topup.drop_sections_not_recently_posted([{'id': 1}], None)


def test_main_refuses_apply_without_ids_from(topup, monkeypatch, tmp_path):
    monkeypatch.setattr(sys, 'argv', ['pin-runway-topup.py', '--apply',
                                      '--ledger-dir', str(tmp_path)])
    rc = topup.main()
    assert rc == 2


def test_main_refuses_second_apply_same_day(topup, monkeypatch, tmp_path):
    monkeypatch.setattr(topup, 'load_config', lambda: _fake_config())
    today = date.today()
    ledger_file = os.path.join(
        str(tmp_path), '{}{}.json'.format(topup.LEDGER_PREFIX, today))
    with open(ledger_file, 'w') as handle:
        json.dump({'entries': []}, handle)
    monkeypatch.setattr(sys, 'argv', [
        'pin-runway-topup.py', '--apply', '--allow-unranked-emergency',
        '--ledger-dir', str(tmp_path)])
    rc = topup.main()
    assert rc == 2


# --------------------------------------------------------------------------
# E127 (2026-09-28): pin-SEO copy pass inside the top-up — runs on the plan's
# rows BEFORE the re-date, is fail-open, and never writes on a dry run.
# --------------------------------------------------------------------------

def _plan_row(i):
    return {'id': i, 'Post Title': 'T{}'.format(i),
            'Post URL': 'https://musthavemods.com/sims-4-wedges-cc/',
            'Image URL': 'https://i.example/{}.jpg'.format(i),
            'Board ID': 'B{}'.format(i), 'Board Name': 'Board {}'.format(i),
            'Post Date': '2026-08-01'}


class _FakeRevive:
    REQUIRED_FIELDS = ('Post Title', 'Post URL', 'Image URL', 'Board ID')
    DEFAULT_SKIP_HOSTS = ('blog.musthavemods.com',)

    def __init__(self, log):
        self.log = log

    @staticmethod
    def on_skipped_host(url, skip_hosts):
        return False

    def supabase(self, config, method, query='', body=None, prefer=None, timeout=45):
        self.log.append(('redate', query, body))
        return [{'id': 1}]


class _FakeSeo:
    def __init__(self, log, fail=False):
        self.log = log
        self.fail = fail

    def fetch_by_ids(self, config, ids):
        self.log.append(('seo-fetch', tuple(ids)))
        if self.fail:
            raise RuntimeError('wp rest down')
        return [{'id': i} for i in ids]

    @staticmethod
    def load_boards_csv(path=None):
        return {}

    @staticmethod
    def score_rows(rows, boards, source='template', **kw):
        return ([{'id': r['id'], 'needs_fix': True, 'proposal_ok': True,
                  'proposal_source': source} for r in rows], 1, 1)

    @staticmethod
    def summarize_scored(scored):
        return {'total': len(scored), 'passing': 0, 'need_fix': len(scored),
                'fixable': len(scored), 'page_unavailable': 0, 'mean_score': 55}

    @staticmethod
    def rollback_ledger_path(ledger_dir, today_str, suffix=''):
        return os.path.join(ledger_dir, 'pin-seo-rollback-{}-{}.json'.format(today_str, suffix))

    def apply_proposals(self, config, scored, ledger_path, today_str, source='template',
                        verbose=True):
        self.log.append(('seo-apply', ledger_path))
        with open(ledger_path, 'w') as handle:
            json.dump({'entries': []}, handle)
        return {'updated': len(scored), 'skipped': 0, 'unfixable': 0,
                'ledger': ledger_path, 'entries': []}


def _wire_low_runway_main(topup, monkeypatch, tmp_path, log, seo_fail=False,
                          seo_module='fake'):
    """Runway 1.0 d (inventory 20, rate 20/day) -> 21-row plan capped by hard cap."""
    monkeypatch.setattr(topup, 'load_config', lambda: _fake_config())
    monkeypatch.setattr(topup, 'count_inventory', lambda config, today: 20)
    monkeypatch.setattr(topup, 'compute_daily_posted_rate',
                        lambda config, now=None, window_days=14: 20.0)
    monkeypatch.setattr(topup, 'count_writer_rows_for_date', lambda config, day: 0)
    # E170: no earlier top-up rows on any date in these fixtures.
    monkeypatch.setattr(topup, 'count_prior_topup_rows_for_date',
                        lambda config, day: 0, raising=False)
    rows = [_plan_row(i) for i in range(1, 31)]
    monkeypatch.setattr(topup, 'select_candidates',
                        lambda config, today, ids_from: (rows, {}, ['stubbed selection']))
    # E135 guard reads: every stub row is old, non-placeholder inventory and
    # no destination is plugin-managed. `raising=False` keeps the pre-E135
    # tests loadable against a tree without the guard (the E135 tests below
    # fail on their own assertions there).
    monkeypatch.setattr(topup, 'fetch_attribution',
                        lambda config, ids: {int(i): {'Post Date': '2026-08-01',
                                                      'created_at': '2025-06-01T00:00:00+00:00',
                                                      'Post URL': _plan_row(int(i))['Post URL']}
                                             for i in ids}, raising=False)
    monkeypatch.setattr(topup, 'fetch_plugin_managed_keys', lambda config, since=None: set(),
                        raising=False)
    monkeypatch.setattr(topup, '_REVIVE', _FakeRevive(log))
    if seo_module == 'fake':
        monkeypatch.setattr(topup, '_SEO', _FakeSeo(log, fail=seo_fail))
    elif seo_module == 'missing':
        monkeypatch.setattr(topup, '_SEO', None)
        monkeypatch.setattr(topup, '_load_seo_module', lambda: None)
    monkeypatch.setattr(topup.time, 'sleep', lambda s: None)


def test_seo_pass_runs_before_redate_and_lands_in_ledger(topup, monkeypatch, tmp_path):
    log = []
    _wire_low_runway_main(topup, monkeypatch, tmp_path, log)
    monkeypatch.setattr(sys, 'argv', [
        'pin-runway-topup.py', '--apply', '--ids-from', 'pkg.json', '--no-verify',
        '--max-per-url', '30', '--max-per-board', '30', '--ledger-dir', str(tmp_path)])
    assert topup.main() == 0
    kinds = [entry[0] for entry in log]
    assert kinds[0] == 'seo-fetch' and kinds[1] == 'seo-apply', kinds[:3]
    assert kinds.index('seo-apply') < kinds.index('redate'), 'copy must be written before the date moves'
    assert kinds.count('redate') == topup.HARD_CAP
    seo_ledger = os.path.join(str(tmp_path), 'pin-seo-rollback-{}-topup.json'.format(date.today()))
    assert os.path.isfile(seo_ledger)
    with open(os.path.join(str(tmp_path), '{}{}.json'.format(topup.LEDGER_PREFIX, date.today()))) as h:
        ledger = json.load(h)
    assert ledger['seo_pass']['status'] == 'applied'
    assert ledger['seo_pass']['updated'] == topup.HARD_CAP
    assert ledger['seo_pass']['ledger'] == seo_ledger
    assert len(ledger['entries']) == topup.HARD_CAP  # revive --rollback shape intact
    # every re-date PATCH re-checks Is Posted=false, exactly as before E127
    assert all('%22Is%20Posted%22=eq.false' in e[1] for e in log if e[0] == 'redate')


def test_seo_pass_dry_run_scores_but_never_writes(topup, monkeypatch, tmp_path, capsys):
    log = []
    _wire_low_runway_main(topup, monkeypatch, tmp_path, log)
    monkeypatch.setattr(sys, 'argv', [
        'pin-runway-topup.py', '--ids-from', 'pkg.json', '--no-verify',
        '--max-per-url', '30', '--max-per-board', '30', '--ledger-dir', str(tmp_path)])
    assert topup.main() == 0
    kinds = [entry[0] for entry in log]
    assert kinds == ['seo-fetch'], kinds
    assert os.listdir(str(tmp_path)) == []
    out = capsys.readouterr().out
    assert 'Pin-SEO pass (source=page)' in out and 'DRY RUN' in out


def test_seo_source_none_never_loads_the_module(topup, monkeypatch, tmp_path):
    log = []
    _wire_low_runway_main(topup, monkeypatch, tmp_path, log, seo_module='none')
    monkeypatch.setattr(topup, '_SEO', None)
    monkeypatch.setattr(topup, '_load_seo_module',
                        lambda: (_ for _ in ()).throw(AssertionError('must not load')))
    monkeypatch.setattr(sys, 'argv', [
        'pin-runway-topup.py', '--apply', '--ids-from', 'pkg.json', '--no-verify',
        '--seo-source', 'none', '--max-per-url', '30', '--max-per-board', '30',
        '--ledger-dir', str(tmp_path)])
    assert topup.main() == 0
    assert [e[0] for e in log].count('redate') == topup.HARD_CAP
    with open(os.path.join(str(tmp_path), '{}{}.json'.format(topup.LEDGER_PREFIX, date.today()))) as h:
        ledger = json.load(h)
    assert ledger['seo_pass']['status'] == 'skipped'


def test_seo_pass_failure_never_blocks_the_floor_topup(topup, monkeypatch, tmp_path, capsys):
    log = []
    _wire_low_runway_main(topup, monkeypatch, tmp_path, log, seo_fail=True)
    monkeypatch.setattr(sys, 'argv', [
        'pin-runway-topup.py', '--apply', '--ids-from', 'pkg.json', '--no-verify',
        '--max-per-url', '30', '--max-per-board', '30', '--ledger-dir', str(tmp_path)])
    assert topup.main() == 0
    kinds = [entry[0] for entry in log]
    assert 'seo-apply' not in kinds
    assert kinds.count('redate') == topup.HARD_CAP, 'a failed copy pass must not block the re-date'
    assert 'WARN: pin-SEO pass failed' in capsys.readouterr().out
    with open(os.path.join(str(tmp_path), '{}{}.json'.format(topup.LEDGER_PREFIX, date.today()))) as h:
        ledger = json.load(h)
    assert ledger['seo_pass']['status'] == 'error'
    assert 'wp rest down' in ledger['seo_pass']['reason']


def test_seo_pass_missing_module_is_skipped_not_fatal(topup, monkeypatch, tmp_path):
    log = []
    _wire_low_runway_main(topup, monkeypatch, tmp_path, log, seo_module='missing')
    monkeypatch.setattr(sys, 'argv', [
        'pin-runway-topup.py', '--apply', '--ids-from', 'pkg.json', '--no-verify',
        '--max-per-url', '30', '--max-per-board', '30', '--ledger-dir', str(tmp_path)])
    assert topup.main() == 0
    assert [e[0] for e in log].count('redate') == topup.HARD_CAP


# --------------------------------------------------------------------------
# E127: pin-seo-audit.py `--ids` selection (the piece the top-up imports)
# --------------------------------------------------------------------------

@pytest.fixture(scope='module')
def seo():
    return _load_module('mhm_pin_seo_audit', 'pin-seo-audit.py')


def test_seo_fetch_by_ids_has_no_date_predicate_and_keeps_order(seo, monkeypatch):
    queries = []

    def fake_supabase(config, method, query='', body=None, prefer=None, timeout=45):
        queries.append((method, query))
        return [{'id': 7, 'Post URL': 'u'}, {'id': '3', 'Post URL': 'u'}]
    monkeypatch.setattr(seo, 'supabase', fake_supabase)
    rows = seo.fetch_by_ids({}, [3, 7, 99])
    assert [r['id'] for r in rows] == [3, 7]
    assert len(queries) == 1 and queries[0][0] == 'GET'
    q = queries[0][1]
    assert 'id=in.(3,7,99)' in q
    assert '%22Is%20Posted%22=eq.false' in q
    assert '%22Post%20Date%22=lt.' not in q and '%22Post%20Date%22=gte.' not in q, \
        'ids mode must not re-impose the stranded-window predicate'
    assert 'AI%20Text%20Slug' in q, 'the rollback ledger needs the real old description'


def test_seo_fetch_by_ids_chunks(seo, monkeypatch):
    queries = []
    monkeypatch.setattr(seo, 'supabase',
                        lambda config, method, query='', **kw: queries.append(query) or [])
    seo.fetch_by_ids({}, list(range(1, 251)), chunk=100)
    assert len(queries) == 3


def test_seo_parse_ids_file_accepts_topup_ledger_shape(seo):
    assert seo.parse_ids_file({'entries': [{'id': 5}, {'id': 6}]}) == [5, 6]
    with pytest.raises(ValueError):
        seo.parse_ids_file({'entries': []})


def test_seo_apply_proposals_writes_no_ledger_when_nothing_to_fix(seo, tmp_path):
    res = seo.apply_proposals({}, [{'needs_fix': False, 'proposal_ok': True, 'id': 1}],
                              os.path.join(str(tmp_path), 'x.json'), '2026-09-28',
                              verbose=False)
    assert res['updated'] == 0 and res['ledger'] is None
    assert os.listdir(str(tmp_path)) == []


def test_seo_apply_proposals_patch_filters_is_posted_false(seo, monkeypatch, tmp_path):
    patches = []

    def fake_supabase(config, method, query='', body=None, prefer=None, timeout=45):
        patches.append((method, query, body))
        return [{'id': 1}]
    monkeypatch.setattr(seo, 'supabase', fake_supabase)
    monkeypatch.setattr(seo.time, 'sleep', lambda s: None)
    scored = [{'id': 1, 'destination': 'd', 'needs_fix': True, 'proposal_ok': True,
               'current_title': 'old', 'proposed_title': 'new',
               'current_description': 'od', 'proposed_description': 'nd',
               'proposal_source': 'page', 'keyword': 'k'}]
    path = os.path.join(str(tmp_path), 'pin-seo-rollback-2026-09-28-topup.json')
    res = seo.apply_proposals({}, scored, path, '2026-09-28', source='page', verbose=False)
    assert res['updated'] == 1 and res['ledger'] == path
    assert patches == [('PATCH', 'id=eq.1&%22Is%20Posted%22=eq.false',
                        {'Post Title': 'new', 'AI Text Slug': 'nd'})]
    with open(path) as h:
        ledger = json.load(h)
    assert ledger['entries'][0]['old_description'] == 'od'


if __name__ == '__main__':
    sys.exit(pytest.main([__file__, '-v']))


# --------------------------------------------------------------------------
# E135 (2026-09-29): the writer plugin's scheduled rows are never selectable.
# Top-up #4 promoted ids 11848/11849 (created 2026-09-28 for an Upcoming
# article) because `filter_writer_rows` never sees `Wordpress Post ID` and,
# per the 09-29 read, 1610/1610 stranded rows carry it anyway. Against
# pre-E135 origin/main every test in this section fails (AttributeError on
# the missing functions / plugin rows present in the plan).
# --------------------------------------------------------------------------

_FALL_DECOR = 'https://musthavemods.com/sims-4-fall-decor-cc/'


def _attr(post_date, created, url=_FALL_DECOR):
    return {'Post Date': post_date, 'created_at': created, 'Post URL': url}


def test_destination_key_folds_blog_host_and_strips_query(topup):
    apex = topup.destination_key('https://musthavemods.com/sims-4-fall-decor-cc/?utm=x#f')
    blog = topup.destination_key('https://BLOG.musthavemods.com/sims-4-fall-decor-cc')
    assert apex == blog == 'musthavemods.com/sims-4-fall-decor-cc/'
    assert topup.destination_key('') is None and topup.destination_key(None) is None


def test_plugin_scheduled_predicate(topup):
    managed = {topup.destination_key(_FALL_DECOR)}
    # the real 09-28 violation: placeholder + created after the Q11 deploy
    assert topup.is_plugin_scheduled_row(_attr('2025-01-01', '2026-09-28T10:30:00+00:00'), set())
    # placeholder, old, but the plugin manages that article now
    assert topup.is_plugin_scheduled_row(_attr('2025-01-01', '2025-06-11T00:00:00+00:00'), managed)
    # placeholder, old, unmanaged destination = the pre-Q11 stranded pool
    assert not topup.is_plugin_scheduled_row(
        _attr('2025-01-01', '2025-06-11T00:00:00+00:00', 'https://musthavemods.com/sims-4-wedges-cc/'),
        managed)
    # a real Post Date is never the placeholder, whatever created_at says
    assert not topup.is_plugin_scheduled_row(_attr('2026-01-25', '2026-09-28T10:30:00+00:00'), managed)
    # the cutoff is a parameter: one day before the deploy is not the plugin's
    assert not topup.is_plugin_scheduled_row(_attr('2025-01-01', '2026-09-20T23:59:00+00:00'), set())
    assert topup.is_plugin_scheduled_row(_attr('2025-01-01', '2026-09-21T00:00:00+00:00'), set())


def test_filter_plugin_scheduled_rows_drops_plugin_and_unknown(topup):
    rows = [{'id': 11848}, {'id': 11849}, {'id': 2127}, {'id': 999}]
    attribution = {
        11848: _attr('2025-01-01', '2026-09-28T10:30:00+00:00'),
        11849: _attr('2025-01-01', '2026-09-28T10:30:01+00:00'),
        2127: _attr('2025-01-01', '2025-06-11T00:00:00+00:00',
                    'https://musthavemods.com/sims-4-wedges-cc/'),
        # 999 has no attribution row: unknown is never selectable
    }
    kept, dropped = topup.filter_plugin_scheduled_rows(rows, attribution, set())
    assert [r['id'] for r in kept] == [2127]
    assert [r['id'] for r in dropped] == [11848, 11849, 999]


def test_main_never_plans_a_plugin_scheduled_row(topup, monkeypatch, tmp_path):
    log = []
    _wire_low_runway_main(topup, monkeypatch, tmp_path, log)
    # rows 1-3 become the writer's plugin-scheduled pins; 4 is old but its
    # destination is plugin-managed; everything else is real inventory.
    managed_url = 'https://musthavemods.com/sims-4-fall-decor-cc/'

    def attribution(config, ids):
        out = {}
        for i in ids:
            i = int(i)
            if i <= 3:
                out[i] = _attr('2025-01-01', '2026-09-28T10:30:00+00:00')
            elif i == 4:
                out[i] = _attr('2025-01-01', '2025-06-11T00:00:00+00:00', managed_url)
            else:
                out[i] = _attr('2025-01-01', '2025-06-11T00:00:00+00:00',
                               'https://musthavemods.com/sims-4-wedges-cc/')
        return out

    monkeypatch.setattr(topup, 'fetch_attribution', attribution)
    monkeypatch.setattr(topup, 'fetch_plugin_managed_keys',
                        lambda config, since=None: {topup.destination_key(managed_url)})
    monkeypatch.setattr(sys, 'argv', [
        'pin-runway-topup.py', '--apply', '--ids-from', 'pkg.json', '--no-verify',
        '--seo-source', 'none', '--max-per-url', '30', '--max-per-board', '30',
        '--ledger-dir', str(tmp_path)])
    assert topup.main() == 0
    redated = [e[1] for e in log if e[0] == 'redate']
    assert len(redated) == topup.HARD_CAP
    for forbidden in (1, 2, 3, 4):
        assert not any('id=eq.{}&'.format(forbidden) in query for query in redated), \
            'plugin-scheduled row {} was re-dated'.format(forbidden)
    with open(os.path.join(str(tmp_path), '{}{}.json'.format(topup.LEDGER_PREFIX, date.today()))) as h:
        ledger = json.load(h)
    assert {e['id'] for e in ledger['entries']}.isdisjoint({1, 2, 3, 4})


def test_main_refuses_when_attribution_cannot_be_read(topup, monkeypatch, tmp_path):
    log = []
    _wire_low_runway_main(topup, monkeypatch, tmp_path, log)
    monkeypatch.setattr(topup, 'fetch_attribution', lambda config, ids: None)
    monkeypatch.setattr(sys, 'argv', [
        'pin-runway-topup.py', '--apply', '--ids-from', 'pkg.json', '--no-verify',
        '--seo-source', 'none', '--max-per-url', '30', '--max-per-board', '30',
        '--ledger-dir', str(tmp_path)])
    assert topup.main() == 2
    assert not any(e[0] == 'redate' for e in log)
    assert os.listdir(str(tmp_path)) == []


def test_main_refuses_when_managed_set_cannot_be_read(topup, monkeypatch, tmp_path):
    log = []
    _wire_low_runway_main(topup, monkeypatch, tmp_path, log)
    monkeypatch.setattr(topup, 'fetch_plugin_managed_keys', lambda config, since=None: None)
    monkeypatch.setattr(sys, 'argv', [
        'pin-runway-topup.py', '--ids-from', 'pkg.json', '--no-verify',
        '--seo-source', 'none', '--ledger-dir', str(tmp_path)])
    assert topup.main() == 2
    assert not any(e[0] == 'redate' for e in log)


# --------------------------------------------------------------------------
# E170 (2026-10-04): the 7/day cap counts rows EARLIER top-ups put on a date.
# Pre-fix, three consecutive daily runs put 21 top-up rows on 10-02 and on
# 10-03 (7 each) — the per-invocation cap never saw the previous runs.
# --------------------------------------------------------------------------

def test_prior_topup_rows_count_against_seven_per_day(topup):
    prior = {TODAY: 14, TODAY + timedelta(days=1): 7}
    out = topup.decide_topup(inventory=0, rate=40, writer_rows_by_day=lambda d: 0,
                              today=TODAY,
                              prior_topup_rows_by_day=lambda d: prior.get(d, 0))
    dates = [d['date'] for d in out['day_plan']]
    assert str(TODAY) not in dates
    assert str(TODAY + timedelta(days=1)) not in dates
    assert dates[0] == str(TODAY + timedelta(days=2))
    for d in out['day_plan']:
        assert d['rows'] + d['prior_topup_rows_that_day'] <= 7


def test_prior_topup_partial_day(topup):
    out = topup.decide_topup(inventory=0, rate=40, writer_rows_by_day=lambda d: 0,
                              today=TODAY,
                              prior_topup_rows_by_day=lambda d: 3 if d == TODAY else 0)
    assert out['day_plan'][0] == {'date': str(TODAY), 'rows': 4,
                                  'writer_rows_that_day': 0,
                                  'prior_topup_rows_that_day': 3}


def test_unreadable_prior_count_is_fail_closed(topup):
    out = topup.decide_topup(inventory=0, rate=40, writer_rows_by_day=lambda d: 0,
                              today=TODAY, prior_topup_rows_by_day=lambda d: None)
    assert out['rows_planned'] == 0
    assert out['day_plan'] == []


def test_max_rows_lowers_but_never_raises_hard_cap(topup):
    out = topup.decide_topup(inventory=0, rate=40, writer_rows_by_day=lambda d: 0,
                              today=TODAY, hard_cap=7)
    assert out['rows_planned'] == 7
    assert out['bound_rule'] == 'hard_cap_7'
    out = topup.decide_topup(inventory=0, rate=1000, writer_rows_by_day=lambda d: 0,
                              today=TODAY, hard_cap=500)
    assert out['rows_planned'] == 21


def test_ledger_rows_by_date_counts_and_fails_closed(topup, tmp_path):
    led = tmp_path / (topup.LEDGER_PREFIX + '2026-10-03.json')
    led.write_text(json.dumps({'entries': [
        {'id': 1, 'old_date': '2025-01-01', 'new_date': '2026-10-03'},
        {'id': 2, 'old_date': '2025-01-01', 'new_date': '2026-10-04'},
        {'id': 3, 'old_date': '2025-01-01', 'new_date': '2026-10-04'}]}))
    (tmp_path / (topup.LEDGER_PREFIX + '2026-09-28-writer-revert.json')).write_text(
        json.dumps({'entries': [{'id': 9, 'old_date': '2026-10-04',
                                 'new_date': '2026-10-04'}]}))
    counts = topup.ledger_rows_by_date(str(tmp_path))
    assert counts == {'2026-10-03': 1, '2026-10-04': 2}
    (tmp_path / (topup.LEDGER_PREFIX + '2026-10-04.json')).write_text('{not json')
    assert topup.ledger_rows_by_date(str(tmp_path)) is None


def test_combine_prior_counts(topup):
    assert topup.combine_prior_counts({'2026-10-04': 14}, 21, '2026-10-04') == 21
    assert topup.combine_prior_counts({'2026-10-04': 14}, 0, '2026-10-04') == 14
    assert topup.combine_prior_counts(None, 0, '2026-10-04') is None
    assert topup.combine_prior_counts({}, None, '2026-10-04') is None


def test_real_ledgers_on_main_show_the_stacking(topup):
    """Vacuity-guarded read of the committed ledgers: the bug this fix closes
    is visible in the repo's own history (>=2 dates with >7 top-up rows)."""
    ledger_dir = os.path.join(HERE, '..', '..', 'reports', 'funnel')
    counts = topup.ledger_rows_by_date(ledger_dir)
    assert counts is not None and len(counts) >= 5, counts
    assert sum(1 for n in counts.values() if n > 7) >= 2, counts
