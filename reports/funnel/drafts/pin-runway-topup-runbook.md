# Pin-runway top-up — runbook

**Script:** `scripts/agents/pin-runway-topup.py`
**Tests:** `scripts/agents/test_pin_runway_topup.py` (pytest, 26 tests, no network)
**Owner:** Pip (Distribution)
**Standing approval:** operator, 2026-09-22 (see `.claude/agents/mhm-funnel/operator-queue.md` Q11/Q12 context and CLAUDE.md's SD-10 note)

## What this is

A narrow, code-enforced exception to the "ask first" rule that governs
`revive-stranded-pins.py` (SD-10, 2026-09-19). When the Pinterest pin-queue
runway drops below **2.0 days**, this tool may top the queue up **without
asking**, but only within bounds that are checked in code, not left to
judgement:

| Bound | Enforcement |
|---|---|
| Trigger: runway < 2.0d | `decide_topup()` returns `noop` otherwise |
| Stop: fills only to ~3.0d runway | `decide_topup()`'s day-by-day loop stops once the target is reached |
| ≤ 7 rows/day | `min(7, floor(rate) - writer_rows_that_day)` per day |
| ≤ trailing-14d posted rate, minus the writer's own rows that day | same formula |
| Sessions-ranked selection | reuses `revive-stranded-pins.py`'s `--ids-from` (imported, not duplicated); `--apply` without `--ids-from` is refused unless `--allow-unranked-emergency` is passed |
| Never touches writer rows | selection floor is `Is Posted=false AND Post Date < today-14d` (identical to `revive-stranded-pins.py`'s stranded-row filter) + a belt-and-suspenders `filter_writer_rows()` that drops any row with `Wordpress Post ID` set |
| Unknown data → no write | `decide_topup()` returns `unknown` (exit 2) whenever inventory or the posted rate can't be computed confidently — never a verdict that triggers a write |
| Dry run by default | `--apply` required |
| Hard cap 21 rows/invocation | `HARD_CAP = 21`, enforced in `decide_topup()` and again when slicing the final plan |
| Undo ledger | reuses `revive-stranded-pins.py`'s ledger shape (`entries[].{id,old_date,new_date}`) so rollback is `revive-stranded-pins.py --rollback <ledger> --apply` — not a second rollback path |
| Once per UTC day | `already_applied_today()` checks the ledger directory for `pin-runway-topup-<today>.json` before writing |

## Usage

```bash
# Dry run (default) — safe to run any time, read-only
python3 scripts/agents/pin-runway-topup.py

# Dry run against a sessions-ranked package (same shape revive-stranded-pins.py
# --ids-from accepts: destinations[].ids / {"ids":[...]} / a bare list)
python3 scripts/agents/pin-runway-topup.py --ids-from reports/funnel/some-package.json

# Apply (writes only if runway < 2.0d; requires --ids-from)
python3 scripts/agents/pin-runway-topup.py --ids-from reports/funnel/some-package.json --apply

# Machine-readable output (runway before/after, rows planned, day plan,
# destinations, the rule that bound the count)
python3 scripts/agents/pin-runway-topup.py --json

# Offline self-test (no network, no config file)
python3 scripts/agents/pin-runway-topup.py --self-test
```

## Rollback

The ledger this tool writes (`reports/funnel/pin-runway-topup-<date>.json`) is
in the exact shape `revive-stranded-pins.py --rollback` already reads. Do not
build a second rollback path — use:

```bash
python3 scripts/agents/revive-stranded-pins.py --rollback reports/funnel/pin-runway-topup-<date>.json --apply
```

The script prints this exact command after every `--apply`.

## What "sessions-ranked" means here, and its current gap

This tool does not compute a sessions ranking itself — it has no GA/GSC
client and is deliberately read-only-by-default. It expects a package file
(the same shape `revive-stranded-pins.py --ids-from` consumes) produced by a
separate sessions analysis, e.g. the kind Q12's `pin-revival-package-*.json`
already is. **Today there is no automated job that regenerates that package
on a schedule** — without one, `--apply` always needs
`--allow-unranked-emergency` or a hand-supplied package, which somewhat
undercuts the "without asking" part of the standing approval for a fully
unattended run. See "Recommended follow-up" below.

## Exit codes

Matches the repo's 0/2/1 convention (`revive-stranded-pins.py`,
`check-pinner.sh`, `pinner-liveness-lib.ts`):

- `0` — no-op (runway healthy) or a successful dry run / apply
- `2` — unknown (data not computable), refused (`--apply` without ranked
  selection, or a second `--apply` the same UTC day), or nothing usable
  survived the filters
- (no `1`/FAIL path — this tool never declares the pipeline broken; that is
  `check-pinner.sh`'s job)

## Verified

- `python3 scripts/agents/pin-runway-topup.py --self-test` → 10/10 assertions
  pass (decision logic + guards + allocator, offline).
- `PYTHONPATH=. <MHMUtils venv>/bin/python3 -m pytest
  scripts/agents/test_pin_runway_topup.py -v` → 26/26 pass, no network.
- One real dry run against production data (`~/java_projects/MHMUtils/config.json`,
  the same config `revive-stranded-pins.py` and `check-pinner.sh` use):
  runway read as **3.01 days** (94 unposted rows in the poster's window/horizon
  ÷ 31.21/day trailing-14d rate) — above the 2.0d trigger, so the tool
  correctly reported `noop` and wrote nothing.

## Recommended follow-up (not built here — described, not implemented, per scope)

1. **A scheduled sessions-ranking refresh.** Without a job that regularly
   regenerates a `--ids-from` package from GA session data (the way E66-A's
   `pin-revival-package-2026-09-20.json` was hand-built), this tool's
   "without asking" clause only fires cleanly when such a package already
   exists and is fresh. Consider a small companion script (or a step in
   `run-funnel-daily.sh`) that refreshes a standing package weekly from GA4
   sessions-by-destination, so `pin-runway-topup.py --apply` never needs
   `--allow-unranked-emergency` in normal operation.
2. **Wire a runway<2.0d check into `run-funnel-daily.sh` or `check-pinner.sh`**
   so this tool is actually invoked when the trigger fires, rather than
   relying on someone remembering to run it. I did not touch either file
   (both are being edited concurrently by other work); the change is: after
   `check-pinner.sh`'s existing runway read, if runway < 2.0d, call
   `python3 scripts/agents/pin-runway-topup.py --ids-from <latest package> --apply`
   and surface its `--json` output in the digest.
3. **`count_writer_rows_for_date()` issues one Supabase request per day in
   the fill window.** At the 7-row/day, 21-row hard cap this is at most 3-4
   requests per run, so it wasn't worth batching, but if `MAX_ROWS_PER_DAY`
   or `HARD_CAP` ever grow substantially, batch it into a single grouped
   query instead.
