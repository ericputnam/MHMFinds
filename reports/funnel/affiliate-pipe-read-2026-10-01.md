# Affiliate pipe read — 2026-09-29 → 2026-09-30 (E153, for E134)

_Generated 2026-10-01T10:53:29.212Z by `scripts/agents/affiliate-pipe-read.ts`. Legs: on-site `AffiliateClick` rows by offer partner (production DB, read-only) and Impact `partner_performance_by_program` for the same dates (clicks and actions per campaign). Counts only; no click ids, IPs or user agents are read._

**Rule (pre-committed, E153):** the pipe is **confirmed fixed** when, from 2026-09-29 (first full day after PR #214 merged 2026-09-28T22:37:00Z), on-site `gtracing` clicks ≥ 10 AND Impact-recorded clicks on GTPLAYER-US (18111) ÷ on-site ≥ 50 % (pre-fix 2026-07-01→2026-09-28: 9/110 = 8.2 %). Confirmation starts E134's 30-day $0 KILL clock. Fewer clicks → not yet readable; a share under the floor → leaky (repair first); an unreachable Impact leg → unknown, never a verdict. E134 reads 2026-10-12.

## Verdict: **NOT-YET**

- 2 on-site gtracing click(s) in 2 day(s), rule needs ≥ 10 — 8 more ≈ 8 day(s) at 1/day; Impact so far 2 click(s), 0 action(s)

## Legs

| Leg | Value |
|---|--:|
| Window | 2026-09-29 → 2026-09-30 (2 d) |
| On-site clicks, all partners | 2 |
| On-site clicks, `gtracing` | 2 |
| … of which to repaired (validated + active) offers | 2 |
| Impact clicks, GTPLAYER-US | 2 |
| Impact actions, GTPLAYER-US | 0 |
| Impact sale amount, GTPLAYER-US | $0.00 |
| Recorded ÷ on-site | 100.0% (floor 50%) |
| Clicks until readable | 8 (≈ 8 d) |

## Impact by campaign (same window)

| Campaign | Id | Clicks | Actions | Sale $ |
|---|--:|--:|--:|--:|
| GTPLAYER-US | 18111 | 2 | 0 | 0.00 |
