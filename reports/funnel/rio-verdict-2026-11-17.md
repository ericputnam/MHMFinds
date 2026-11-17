# Rio — verdict 2026-11-17 (E424): 28d +6.4% is sessions −4.4% × RPM +11.3%, and the RPM leg is pages/session +11.8% on a flat page RPM; the gap to the ramp is 100% sessions; the E416 ad-side falsifier does not fire (monetizable-pv share 92.0%) and from today the scoreboard prints it

Circuit breaker 🟢 GREEN, action none (`guardrail-2026-11-17.md`, judged 11-15: revenue $293.92 +8.0%, RPM $19.76 +9.5%, sessions −1.4%, 3-day +13.0%, health all ok). **Auto-rollback withheld: 63 in-window production deploys vs the bound of 24** (steady state since 10-30 per the 11-15 compound note) — a red day is a manual Tier 1 rollback and the Mediavine side is read first.

**Sources.** Mediavine reporting MCP (`mv_metrics_summary` 10-19→11-15 and 09-21→10-18; `mv_metrics_daily` 11-02→11-16; `mv_top_pages` 11-09→11-15 and 11-02→11-08), read 2026-11-17 ≈12:30Z. GA4 Data API, property 437117335: `screenPageViews` by `pagePath` for `/`, `/go/`, `/mods/`, `/games/` for the same two weeks. Patreon figures are the scoreboard's (Members API, counts only). No id, email or token read or printed. Every figure below is a ratio of sums over the window named, and the 7d legs are reproduced by the new `scoreboard-rpm-legs-lib.ts` against the same 14 daily rows (test fixture).

## (a) One line for the digest

*28d $6,243.56 is +6.4% vs the prior 28d = sessions −4.4% × session RPM +11.3%, and the RPM leg is pages/session +11.8% (1.53 → 1.71) × page RPM −0.5% — depth, not rate, on a shrinking base. The gap to the ramp (82.4% of revenue on 73.2% of sessions) is 100% sessions; RPM runs ~12.6% above what the ramp assumes. 7d WoW RPM +5.5% = CPM +5.9% × imp/session −0.4% (mon-pv/session +7.8%, imp/mon-pv −7.7%); monetizable-pv share 92.0% (prev 88.0%, daily min 88.8%) — the E416 falsifier (<85% with CPM flat) does not fire. No ad action.*

## (b) RPM / page-mix

**28d vs the ramp (anchor 11-15, Quinn's figures).** Revenue $6,393 = 82.4% of $7,757; sessions 73.2% of the ramp's. ln-decomposition of the −17.6% revenue gap: sessions −31.2 pts, RPM +11.8 pts (implied RPM ≈112.6% of the ramp's). The number to move is sessions. RPM is above the plan line and has been on every verdict since 10-21.

**28d vs prior 28d (10-19→11-15 vs 09-21→10-18).**

| | prior 28d | 28d | Δ |
|---|--:|--:|--:|
| revenue | $5,869.74 | $6,243.56 | **+6.37%** |
| sessions (MV) | 363,478 | 347,450 | −4.41% |
| session RPM | $16.15 | $17.97 | +11.27% |
| pageviews | 555,027 | 593,082 | +6.86% |
| pv / session | 1.527 | 1.707 | **+11.8%** |
| page RPM | $10.58 | $10.53 | −0.5% |
| monetizable-session share | 57.22% | 62.73% | +9.6% |
| monetizable-session RPM | $28.22 | $28.65 | +1.5% |

The RPM leg is almost entirely pages per session; the rate per page is flat. Read with the 7d table below: more of each session is now counted as monetizable, and each session carries more pages. Either is consistent with the 11-03/11-06 share steps (E416) persisting. Neither is a CPM story at 28d.

**7d WoW (11-09→11-15 vs 11-02→11-08), ratio of sums from `mv_metrics_daily` — this is the line the scoreboard prints from today.**

| leg | prev 7d | 7d | Δ |
|---|--:|--:|--:|
| revenue | $1,607.47 | $1,728.04 | +7.5% |
| sessions (MV) | 86,919 | 88,602 | +1.9% |
| session RPM | $18.49 | $19.50 | **+5.46%** |
| paid imp / session | 17.83 | 17.76 | −0.44% |
| CPM | $1.037 | $1.098 | **+5.93%** |
| monetizable pv / pv | 87.97% | 91.99% | +4.6% |
| monetizable pv / session | 1.565 | 1.688 | +7.8% |
| paid imp / monetizable pv | 11.40 | 10.52 | −7.7% |
| pv / session | 1.779 | 1.834 | +3.1% |

Daily monetizable-pv share 11-09→11-15: 90.1 / 92.6 / 91.8 / **88.8** / 92.8 / 92.9 / 94.0. The 11-15 step from 83% → 91% has held for 12 days. This week's RPM lift is CPM (Q4 rate), not share: the share leg and the imp/mon-pv leg cancel (+7.8% × −7.7%), so impressions per session are flat and the whole +5.5% is the price per impression. That is the Mediavine-side read the 11-15 verdict said would be "watch, don't act". Still watch, still no action.

**E416 ad-side falsifier.** Pre-committed 11-15 §(d)3: "7d monetizable-pv share < 85% on any scoreboard after 11-18 with CPM flat → Mediavine-side." Today's read: share 92.0% ≥ 85% → **ok**. "CPM flat" is now defined in code as |Δ CPM| ≤ 3% WoW (`E416_FALSIFIER.cpmFlatBand`; the four verdicts since 10-21 saw 7d CPM move −3.8%, +1.8%, +4.1%, +5.9%, so a move outside ±3% is a rate read, not the share step). The status is three-state: `unknown` when either window carries a zero-session day (Mediavine's lag state — the 11-16 row today reads $200.92 revenue on 0 sessions / 0 pageviews, exactly the E342 shape) or is shorter than 7 days. `unknown` never prints 🟢.

**Page mix (GA4 pageviews, 11-09→11-15 vs 11-02→11-08).** App pages: `/` 9,970 (8,367), `/mods/female-clothes` 1,771 (1,367), `/mods/male-clothes` 1,283 (1,082), `/games/sims-4/` 999 (736), `/mods/skin-details` 951 (854). All up, all low-RPM ($3–8 vs $15–32 on posts) — the mix leans toward lower-RPM pages and RPM still rose, so the mix is not what is moving RPM. GA4 daily pageviews match Mediavine's exactly on every complete day in the window.

**Homepage RPM (E412 guard, `quinn-pending-2026-11-15.md` §6 "watch until 11-22").** Mediavine `pages` 11-09→11-15: `/` $81.81 on 9,970 pv (page RPM $8.2) → **$0.923 per 1k site sessions** (81.81 / 88.602). The prior week: `/` $57.33 on 86,919 sessions → **$0.660 per 1k**. The E412 gate is $0.9356 (95% of the $0.9645 baseline). The two pre-ship weeks swung $0.660 → $0.923, i.e. the gate sits inside the metric's own weekly noise (a ±17% band around the mean of the two). A one-week read against that gate will flip on noise in either direction. Note for Sage/Quinn, not a change I make: judge E412's home-RPM leg on a 2-week pre/post or against the same weekdays matched, one-sided ≥95%, and do not call it on a single week. Watch continues to 11-22.

## (c) Non-ad revenue (B2)

Patreon Members API: 62 paid ≈ $162.50/mo (+$12 vs 11-15). $3-tier joins 7d 6, cancels 0; $3 Cappuccino 50 → 52 (operator-did). B2: floor $155, line $250, target $750 — above the floor, 65% of the line. Affiliates 7d 25 clicks, $0 (E134 stance unchanged; repair branch still the open item, no new placement). Q4 closed: no tier or pricing pitch. No non-ad move today; the ad-side measurement gap was the larger hole.

## (d) Grades

- **E342 (Rio, read 11-06) — CLOSED / KEEP.** Keep-if was "3-day ≥90% + health ok judging 11-03 → yellow closed". `guardrail-2026-11-06.md`: GREEN judging 11-03, 3-day +2.4%, health ok, Mediavine lag back from 3d to 2d. Met. Today's 11-16 row (revenue posted, sessions 0) is the same lag shape and is why the falsifier is three-state.
- **E416 (Rio, read 11-30) — PENDING, on track.** Share 92.0% ≥ 85%; CPM +5.9% (not flat). Falsifier `ok`. Reads 11-30 as planned; from today each scoreboard carries the state.
- **E424 (Rio, this move) — MEASURE.** Keep if the line prints on the 11-19 scoreboard with the same 7d legs the hand read produced here (session RPM $19.50 / +5.5%, CPM $1.098 / +5.9%, share 92.0%) for the 11-09→11-15 window when anchored at 11-15, and `unknown` (never `ok`) on any run whose window contains a zero-session day. Rollback: revert the PR (one import, one field, one line, one lib, one test).

## (e) What I did not do

No ad layout, no `functions.php`, no pricing, no Patreon post, no env var. The move is scoreboard plumbing: a pure lib, one scoreboard bullet, one test with the real 14-row fixture, this file. Nothing user-visible changed; the RPM guardrail is unaffected by construction.

— Rio, Product & Revenue
