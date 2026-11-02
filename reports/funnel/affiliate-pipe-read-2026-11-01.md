# Affiliate pipe read — 2026-10-26 → 2026-11-01 (E153, for E134)

_Generated 2026-11-02T17:57:00.982Z by `scripts/agents/affiliate-pipe-read.ts`. Legs: on-site `AffiliateClick` rows by offer partner (production DB, read-only) and Impact `partner_performance_by_program` for the same dates (clicks and actions per campaign). Counts only; no click ids, IPs or user agents are read._

**Rule (pre-committed, E153):** the pipe is **confirmed fixed** when, from 2026-09-29 (first full day after PR #214 merged 2026-09-28T22:37:00Z), on-site `gtracing` clicks ≥ 10 AND Impact-recorded clicks on GTPLAYER-US (18111) ÷ on-site ≥ 50 % (pre-fix 2026-07-01→2026-09-28: 9/110 = 8.2 %). Confirmation starts E134's 30-day $0 KILL clock. Fewer clicks → not yet readable; a share under the floor → leaky (repair first); an unreachable Impact leg → unknown, never a verdict. E134 reads 2026-11-11.

## Verdict: **CONFIRMED**

- Impact recorded 9 of 10 on-site gtracing clicks (90.0 % ≥ 50 %; pre-fix 8.2 %) — pipe confirmed fixed; E134's 30-day $0 clock starts 2026-10-12
- KILL clock: starts 2026-10-12, reads 2026-11-11 — KILL the reopening if Impact actions are still 0 then.

## Legs

| Leg | Value |
|---|--:|
| Window | 2026-10-26 → 2026-11-01 (7 d) |
| On-site clicks, all partners | 20 |
| On-site clicks, `gtracing` | 10 |
| … of which to repaired (validated + active) offers | 10 |
| Impact clicks, GTPLAYER-US | 9 |
| Impact actions, GTPLAYER-US | 0 |
| Impact sale amount, GTPLAYER-US | $0.00 |
| Recorded ÷ on-site | 90.0% (floor 50%) |
| Clicks until readable | 0 (≈ 0 d) |

## Impact by campaign (same window)

| Campaign | Id | Clicks | Actions | Sale $ |
|---|--:|--:|--:|--:|
| GTPLAYER-US | 18111 | 9 | 0 | 0.00 |
| Envato | 4662 | 7 | 0 | 0.00 |
| Canva | 10068 | 2 | 0 | 0.00 |

## GA4 `affiliate_click` by surface (E306; informational, not a verdict input)

- GA4 `affiliate_click`, grid (`/` + `/games/*`, Impact-tracked partners): 12 click(s) over 2026-10-26 → 2026-11-01 = 1.71/day
- GA4 `affiliate_click`, blog Amazon pack block (#391, every other path): 58 click(s) on 43 post path(s) over 6 live day(s) = 9.67/day (bar ≥ 5/day on 2026-11-11; earnings are Amazon Associates, operator-only — no dollar printed here)

| Day | Block clicks |
|---|--:|
| 2026-10-27 | 14 |
| 2026-10-28 | 5 |
| 2026-10-29 | 14 |
| 2026-10-30 | 11 |
| 2026-10-31 | 10 |
| 2026-11-01 | 4 |
