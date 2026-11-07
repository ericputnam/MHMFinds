# Rio — verdict 2026-11-07 (E372): 11-04 is a one-day CPM dip (−4.9%), not a trend; 11-05 rate is back up (+2.1%); the 7-day −7.5% is 100% Halloween-weekend volume; no deploy implicated; E342 KEEP, no Mediavine note

Circuit breaker 🟢 GREEN, action none (`guardrail-2026-11-07.md`). Judged day **2026-11-04 Wednesday**: revenue $183.06 vs $197.26 (−7.2%), session RPM $16.47 vs $17.04 (−3.4%), sessions −4.4%; ex-Singapore RPM $16.97 vs $17.93 (−5.4%, read "rate", mix alone predicted +3.7%). 3-day +2.6%. In-window deploys 81 > bound 24, so a rollback would have been withheld in any case.

**Sources.** Mediavine daily series from `scripts/mcp-mediavine/client.ts` → `earnings('2026-10-01','2026-11-07')` and `devices()` for 11-04 and 10-28, read 2026-11-07 ≈12:00Z with the Q32 token (the Mediavine MCP is not connected in this session). GA4 Data API, property 437117335: `date × sessions, screenPageViews` 10-07→11-06, the same split by `country = Singapore AND sessionSource = (direct)` (E216), and `pagePath` matching the app routes (`/`, `/games`, `/mods`, `/go`, `/creator`, …). Guardrail JSON `sessionsExSegmentRpm`. `scripts/agents/affiliate-pipe-read.ts --start 2026-10-08 --end 2026-11-06` (interim, not the 11-11 grade). Controls are the same weekday of the prior 4 weeks, ratio of sums unless stated. No token is printed in this file.

## (a) One line for the digest

*11-04 was a one-day CPM dip: paid impressions per session were flat (−0.5% ex-segment) and Mediavine paid 4.9% less per impression, which reproduces the −5.4% ex-segment RPM. 11-05 (revenue posted, sessions pending) is back to +2.1% on rate; its −6.9% revenue is −8.8% sessions. The week's −7.5% is entirely the Halloween weekend. No deploy touched ad load. E342 closes KEEP; Mediavine posted 11-03 sessions, so no support note.*

## (b) Was 11-04 rate, and is it a trend?

Identity: revenue per session = paid impressions per session × revenue per paid impression (CPM).

| leg | 4 Wednesdays (10-07/14/21/28) | 11-04 | Δ |
|---|--:|--:|--:|
| revenue (MV) | $197.26 | $183.06 | −7.2% |
| paid impressions (MV) | 190,974 | 186,363 | −2.4% |
| CPM (rev ÷ paid imp) | $1.0329 | $0.9823 | **−4.9%** |
| imp per MV session | 16.43 | 16.77 | +2.1% |
| imp per GA4 ex-segment session (43,999 ÷ 4 vs 10,789) | 17.36 | 17.27 | −0.5% |
| rev per GA4 ex-segment session ×1000 | $17.93 | $16.97 | −5.4% = 0.995 × 0.951 |
| monetizable pv per MV session | 1.254 | 1.524 | +21.6% (Launcher depth, E332 b) |
| viewability (MV) | 55.8 | 55.4 | −0.4 pt |
| desktop / mobile session RPM vs 10-28 (MV `devices`) | $18.04 / $13.61 | $16.78 / $12.27 | −7.0% / −9.8% |

The whole ex-segment gap is the CPM leg. Ad load per session did not move, viewability did not move, and both device classes fell together, which is the signature of the auction, not of a template.

**Trend test.** CPM by day, 10-27→11-05: 0.968, 1.054, 1.029, 1.061, 0.990, 1.015, 0.994, 1.078, 0.982, 1.031 (mean $1.020, range ±5.3%). 11-04 is the second-lowest of ten and sits 3.7% under the 10-day mean, inside the band the series already shows day to day; 11-03 was the highest. One day either side of the mean is not a trend.

**Forward read, 11-05 Thursday** (MV revenue and impressions posted; MV sessions not yet, so the denominator is GA4 ex-segment). Controls 10-09/16/23/30.

| leg | 4 Thursdays | 11-05 | Δ |
|---|--:|--:|--:|
| revenue | $210.30 | $195.73 | −6.9% |
| paid impressions | 199,420 | 189,824 | −4.8% |
| CPM | $1.0545 | $1.0311 | −2.2% |
| GA4 sessions raw / ex-segment | 11,817 / 11,522 | 10,675 / 10,503 | −9.7% / **−8.8%** |
| imp per ex-segment session | 17.31 | 18.07 | +4.4% |
| rev per ex-segment session ×1000 | $18.25 | $18.64 | **+2.1%** = 1.044 × 0.978 |

11-05's revenue miss is sessions. Rate is up. 11-06 Friday GA4 ex-segment sessions 11,300 vs 13,366 (−15.5%; revenue not posted). The volume gap is what BELOW LINE already says.

**7-day (anchored 11-04).** $1,423.09 vs $1,538.19 (−7.5%) on sessions 81,960 vs 88,567 (−7.5%), RPM $17.36 vs $17.37. The weekend pair 10-31+11-01 earned $430.53 on 24,928 sessions vs 10-24+10-25 $551.13 on 29,403: −$120.60, which is 105% of the 7-day gap (−$115.10). The five weekdays were +0.6%. Nothing in the week is rate.

## (c) Any 72-hour deploy implicated? No

Front-end merges in the window (11-01 04:00Z → 11-04): E316 piercings page, E311 hair-cc retitle, E312 breadcrumb JSON-LD (11-01 evening); E322, E323 collection-hub capture under the grid, E320 body-presets (11-02 ≈18:00Z); E327 opt-in copy, E329 lastmod, E330 cottagecore retitle (11-04 ≈15:00Z, i.e. mid-day on the judged day). Each passed `sidebar-sticky-health` and `deploy-verify`. The tests that would show a template cutting ad load — impressions per session (+2.1% / −0.5%), viewability (−0.4 pt), a device split (both down) — all read flat. CPM is set by the auction. No bisect, no rollback, no ticket.

One thing to carry to the 11-11 reads (E332 b, E360): impressions per monetizable pageview stepped from ≈12.0 (10-28→11-02) to ≈11.0 (11-03→11-05), while impressions per session held. GA4 app-route pageview share rose 24.6% → 28.5% over the same split (30,311 of 123,286 → 23,155 of 81,211). More thin pages per session, not fewer ads per page; grade on revenue per 1k sessions as E360 now does.

## (d) E342 grade and the lag

Keep rule: 3-day ≥90% and health ok judging 11-03 → yellow closed (projected 102.4%). The 11-06 guardrail judged 11-03: GREEN, 3-day +2.4% (102.4% — the projection to the tenth), health ok → **KEEP, closed as volume**. On 11-07 Mediavine shows 11-03 sessions 11,580 (GA4 11,562) and 11-05 revenue with sessions pending, which is the standard 2-day posting pattern. The support-note branch (sessions still 0 on 11-07) did not fire. E332 (a) grades the same way on the same reading: closed as volume. E332 (b), E360, E306 read 11-11 as scheduled.

## (e) Non-ad (B2) — November line

- Patreon public page: 55 paid = 16×$1 + 36×$3 + 3×$5 = **$139/mo** (API $143.50). Floor $155. Joins / cancels 7d 5 / 0; $3-tier joins 7d 1. The gap to the floor is 6 $3 patrons on the public basis.
- Q36 dropped 11-06 → E294 members post NOT-RUN; Q37 lapsed 11-05. November's non-ad line now rests on Patreon drift plus affiliates. No new pricing or post is pitched (Q4 closed, Q37 "re-pitch only with new evidence" — none today).
- Affiliates, interim 10-08→11-06 (grade 11-11): Impact 24 clicks / 0 actions, $0 (repaired GTRacing links 28 of 28 on-site clicks, 85.7% recorded by Impact — the pipe is fixed, the demand is not there); GA4 grid 36 clicks; blog Amazon block 109 clicks over 11 days = 9.91/day, above the 5/day bar → the Amazon leg stays open pending the operator's earnings. If Impact is still 0 actions on 11-11, E134 KILLs back to E13 as written.

## (f) Decision

No rollback, no Mediavine ticket, no ad-surface change, no rule change. E342 KEEP. The 11-04 "rate" read is a single-day CPM dip inside the series' own band; a trend needs two consecutive judged days with ex-segment RPM under −5% and CPM under the 10-day mean, and 11-05 already broke that. Next verdict reads 11-11 with E332 (b), E360 and E306.

— Rio, Product & Revenue
