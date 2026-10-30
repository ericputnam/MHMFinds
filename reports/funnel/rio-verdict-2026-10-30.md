# Rio — verdict 2026-10-30 (E295): the 28d −5.2% is one week old, and the week with the most deploys has the best RPM

Circuit breaker 🟢 GREEN, action none (`guardrail-2026-10-30.md`): judged day 2026-10-28 $204.68 vs $184.03 (+11.2%), RPM $17.79 (+11.3%), sessions 11,504 (−0.4%), ex-Singapore 11,462 vs 10,862 (+5.5%), 3-day revenue +7.5%, health ok; rollback withheld (49 in-window deploys > bound 24). Sources: Mediavine daily series via `scripts/mcp-mediavine/client.ts` → `earnings('2026-09-03','2026-10-28')` direct (the Mediavine MCP was not reachable in this session, as in Quinn's); GA4 Data API, property 437117335, segment filter `country = Singapore AND sessionSource = (direct)` (E216); `affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-29`. Today's guardrail JSON carries no `sessionsExSegmentRpm` key — the breaker ran before E271 (#375, `0b834d3d`) merged at 07:04Z, so E271's first print is the 10-31 morning.

## (a) Mediavine 28d −5.2% — decomposed

Windows anchored at the last finalized day: **current 10-01→10-28 $5,807.98**, **prior 09-03→09-30 $6,125.49**, gap **−$317.51 (−5.18%)** — reproduces the scoreboard line exactly. Both windows start on a Wednesday; day *i* pairs with day *i*.

| | prior 28d | current 28d | Δ |
|---|--:|--:|--:|
| revenue | $6,125.49 | $5,807.98 | −5.18% |
| sessions (MV) | 357,997 | 359,999 | **+0.56%** |
| session RPM | $17.11 | $16.13 | **−5.71%** |
| monetizable pv | 449,330 | 440,463 | −1.97% |
| paid imp / mon pv | 14.599 | 13.235 | −9.34% |
| CPM | $0.9338 | $0.9963 | +6.69% |
| monetizable-session share | 59.4% | 56.8% | −2.6 pt |
| Singapore (direct) sessions, GA4 | 9,406 (2.63%) | 18,892 (5.25%) | ×2.01 |
| sessions ex-segment | 348,591 | 341,107 | −2.15% |
| RPM ex-segment | $17.57 | $17.03 | **−3.10%** |

**Sessions × RPM.** Sessions +0.56%; the whole gap is RPM. Counterfactuals: current sessions at the prior RPM = $6,159.75 (+0.6%); prior sessions at the current RPM = $5,775.68 (−5.7%). Mix: the segment doubled (2.63% → 5.25%), which alone predicts (1−.0525)/(1−.0263)−1 = **−2.7% RPM**; the remaining **−3.1%** is rate (ex-segment RPM $17.57 → $17.03). Identity: mon_pv −1.97% × imp/mon_pv −9.34% × CPM +6.69% = −5.2%.

**By week** (current vs prior, same weekdays):

| week pair | prior $ | current $ | Δ$ | Δ% | sessions Δ | RPM Δ | segment (prior → current) | ex-seg RPM Δ |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| W1 10-01→10-07 vs 09-03→09-09 | 1,571.53 | 1,295.48 | **−276.05** | −17.6% | −5.4% | **−12.9%** | 1,670 → 2,061 | **−12.4%** |
| W2 10-08→10-14 vs 09-10→09-16 | 1,492.09 | 1,497.25 | +5.16 | +0.3% | +5.4% | −4.8% | 1,626 → 6,569 | +0.7% |
| W3 10-15→10-21 vs 09-17→09-23 | 1,512.79 | 1,477.06 | −35.73 | −2.4% | +7.7% | −9.3% | 1,898 → 8,239 | −2.8% |
| W4 10-22→10-28 vs 09-24→09-30 | 1,549.08 | 1,538.19 | −10.89 | −0.7% | −4.9% | **+4.4%** | 4,212 → 2,023 | **+2.0%** |

- **W1 = 86.9% of the gap** (−$276.05 of −$317.51); the five worst day pairs of the 28 are 10-01→10-05 (−$105.19, −$67.00, −$48.47, −$46.01, −$27.26 = −$293.93 = 92.6% of the gap). The segment was 2.4% that week, so W1 is **rate** (ex-segment RPM −12.4%) — the quarter-boundary CPM trough diagnosed Mediavine-side in the 10-01 / 10-02 verdicts (all partners down, no rollback candidate).
- **W2 and W3 are mix.** Raw RPM −4.8% / −9.3% on a segment of 7.2% / 8.8% of sessions (the 10-12→10-19 Singapore spike); ex-segment RPM +0.7% / −2.8%, ex-segment sessions −0.3% / +0.4%. The sixth-worst pair is 10-19 (−$26.50, E255: Mediavine-side, finalized at 94% of its line).
- **W4 (latest) is the best week of the four on rate**: RPM +4.4% raw, +2.0% ex-segment, on **49 in-window production deploys** (#388 Launcher, #390/#395/#396 homepage + game pages, #391 blog Amazon block incl. the one `functions.php` push, E279 hearts, badge, E267/E268 meta). Revenue −0.7% is sessions −4.9%, of which the segment shrinking is 2,189 of the −4,513 (ex-segment sessions −2.6% — Pip's leg).
- W2–W4 together: −$41.46 (−0.9%) on sessions +2.6%.

**7d read.** 10-22→10-28 $1,538.19 vs 10-15→10-21 $1,477.06 = **+4.1%** on sessions −5.8%, RPM +10.5%; the segment fell 8,239 → 2,023, so mix predicts +7.1% of that and ex-segment RPM reads $17.22 → $17.77 (**+3.2%**). The dip is closed on rate, not just on headline.

**Is a deploy implicated?** None. W1 (10-01→10-07) predates every deploy in the guardrail window; the week carrying the deploys has the highest RPM and ex-segment RPM of the four; Mediavine health ok on all 28 days; the single `functions.php` push (#391, 10-27 00:45Z) has a PASS ledger row and 10-27/10-28 finalized at +1.7% / +11.2% vs their lines. No rollback, no ad-surface change, no Mediavine ticket.

**Roll-off.** The five worst pairs (10-01→10-05) leave the 28d window when the anchor reaches 11-02 (printed the 11-04 morning, 2-day finalization lag); W1 is fully out at anchor 11-04 (11-06 morning). If W2–W4's −0.9% pace holds, the 28d headline reads ≈ −1% by 11-06 with no action from us. The sessions line is Pip's: MV 28d +0.56% raw, −2.15% ex-segment.

**Verdict: dip = RPM driven (W1 rate, 87% of the gap; W2–W3 Singapore mix); closed: yes (7d +4.1%, ex-segment RPM +3.2%, W4 ex-segment RPM +2.0%); deploy implicated: none.**

## (b) Affiliates — the Amazon leg is measurable in clicks from 10-27

Pipe (`affiliate-pipe-read-2026-10-29.md`, 09-29→10-29): on-site gtracing **25** (all on repaired `sjv.io` links), Impact clicks **20**, actions **0**, $0.00, share 80.0% (floor 50%), status **confirmed**, kill clock from 10-12, **kill read 2026-11-11**. Envato 15 / 0, Canva 4 / 0. On-site all partners 46 / 31 d; `affiliate_click` 7d 18 (DB) ≥ 5.

New: the operator's #391 blog block (`mhm_affiliate_pack_block`, live 10-27 00:45Z) fires GA4 `affiliate_click` with `partner:'amazon'`, `source_type:'blog_pack_block'` and `?tag=musthavemod04-20` (the one supported store id — item D's tag hygiene holds on this surface). GA4 by `pagePath` (the Next.js grid fires only on `/` and `/games/*`, so every blog path is the block):

| day | block clicks (blog paths) | grid clicks (`/`, `/games/sims-4/`) |
|---|--:|--:|
| 10-26 | 0 (not live) | 3 |
| 10-27 | 13 (12 users) | 0 |
| 10-28 | 5 | 3 |
| 10-29 | 13 (12 users) | 1 |

**31 Amazon clicks in 3 days (≈10/day) vs the grid's ≈1/day** — the first blog-side affiliate clicks ever recorded (Q20/Q29 had graded this leg "unmeasurable"). Spread: 29 distinct posts, max 2 per post, 10 of the 21 posts published this month in the list. Earnings are still unknown: Amazon Associates reports are operator-only (PENDING), and `customEvent:source_type` / `customEvent:partner` are **not registered GA4 dimensions** (Data API 400), so the pipe read can only split by path until they are. Not a new placement by the team (E55 stands): it is the operator's ship, read here because it changes the 11-11 kill read — Impact's $0 and Amazon's clicks are now two separate legs.

Ad guardrail on the block: the block sits after the content at filter priority 22 (a sibling of the ad anchors, not inside `.mv-ads`); W4 ex-segment RPM +2.0% and 10-27/10-28 both above their lines (section a).

## (c) Non-ad line (scoreboard 10-30)

Patreon 57 paid (14×$1, 41×$3, 2×$5) ≈ $147/mo gross; $3-tier joins 7d 2 (0.29/day), cancels 1; paid-and-connected 5 of 328 (Q4 gate ≥1/3: not met); `patreon_click` 8.43 users/day vs 8.75 baseline (E40 revert clause needs <4.375: not fired). B2 October MISSED on the $450 line (affiliates $0, sponsorship $0, membership $0). The Q34 draft (10-29 verdict §c: A = $3 "skip the wait" perk, B = creator rev-share; recommendation A; decide by 11-05) stands as written.

## Grades (rows I own)

- **E271** (PR #375, first read): NOT READ today — the 10-30 guardrail ran before the merge; reads 10-31 (first morning that prints `sessionsExSegmentRpm`); keep rule unchanged.
- **E241**: HOLD stands (10-21 disagree inside the window); earliest WIRE 11-01 iff 10-30, 10-31, 11-01 all land with both lines — 10-30 did (`guardrail-2026-10-30.json` carries `sessionsExSegment`: MV −0.4% vs GA4 raw +2.5% = 2.9 pt, agree).
- **E262**: closed 10-29 (2 of 3 legs MET); no action.
- **E295** (this verdict): paper only.

— Rio, Product & Revenue
