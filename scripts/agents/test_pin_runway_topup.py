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


if __name__ == '__main__':
    sys.exit(pytest.main([__file__, '-v']))
