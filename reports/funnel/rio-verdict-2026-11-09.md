# Rio — verdict 2026-11-09 (E381): the 7-day −7.8% is volume, and almost all of it is the Halloween weekend; rate is up +0.3% WoW and +3.7% weekday-matched; the 7-day turns positive when 10-31 rolls off; no ad action; B2 has no move inside the fence until the 11-11 read

Circuit breaker 🟢 GREEN, action none (`guardrail-2026-11-09.md`, judged 11-06: revenue +7.4%, ex-segment RPM +10.2%, 3-day +1.5%, health all ok). Auto-rollback withheld (75 in-window deploys vs bound 24).

**Sources.** Mediavine `earnings('2026-10-03','2026-11-08')` from `scripts/mcp-mediavine/client.ts` with the Q32 token, read 2026-11-09 ≈12:30Z. The Mediavine MCP is not connected in this session. GA4 Data API, property 437117335: `date × sessions, screenPageViews` 10-03→11-08, and the same by `country = Singapore AND sessionSource = (direct)` (E216 segment). `scripts/agents/affiliate-pipe-read.ts --start 2026-10-12 --end 2026-11-08` (interim; the grade is 11-11). Patreon figures are from the 11-09 scoreboard. Controls: the same weekday of the prior 4 weeks (ratio of sums), plus plain WoW. Ex-segment RPM = MV revenue ÷ GA4 sessions excluding the segment. No token is printed in this file.

## (a) One line for the digest

*The 7-day −7.8% ($1,434.25 vs $1,555.12, −$120.87) is volume. Ex-segment sessions fell 8.05% and ex-segment RPM rose 0.30%. The 10-31/11-01 weekend accounts for −$120.60, which is 99.8% of the gap. Mon–Fri revenue was flat (−$0.27) with RPM +3.7%. 10-31 rolls off the 7-day on the 11-07 anchor, and 11-07 is posted at +19.4% vs 4 Saturdays, so the headline turns to about +5.0%. No deploy, ad-surface or rate signal. No action.*

## (b) Volume or rate — the 7-day, two ways

**WoW (10-31→11-06 vs 10-24→10-30), the scoreboard's own basis:**

| leg | prior 7d | 7d | Δ |
|---|--:|--:|--:|
| MV revenue | $1,555.12 | $1,434.25 | −7.77% |
| MV sessions | 87,753 | 81,790 | −6.8% |
| GA4 sessions ex-segment | 87,034 | 80,030 | **−8.05%** |
| segment (SG direct) | 1,910 | 1,907 | flat |
| ex-segment RPM | $17.87 | $17.92 | **+0.30%** |

−7.77% ≈ 0.9195 × 1.0030 − 1. All of it is sessions. The segment did not move, so mix is not a factor this week.

| split | revenue Δ | ex-seg sessions | ex-seg RPM |
|---|--:|--:|--:|
| Sat+Sun (10-31, 11-01 vs 10-24, 10-25) | −$120.60 (−21.9%) | −16.7% | −6.2% |
| Mon–Fri (11-02→11-06 vs 10-26→10-30) | −$0.27 (−0.0%) | −3.6% | +3.7% |

**Weekday-matched (each day vs its 4 prior same weekdays), the E332/E372 method:**

| day | revenue Δ | ex-seg sessions | ex-seg RPM | CPM | paid imp / ex-seg session |
|---|--:|--:|--:|--:|--:|
| 10-31 Sat (Halloween) | −27.7% | −22.3% | −7.0% | −3.3% | −3.8% |
| 11-01 Sun | −5.4% | −9.8% | +4.8% | +2.7% | +2.0% |
| 11-02 Mon | +3.4% | −1.4% | +4.9% | +4.6% | +0.3% |
| 11-03 Tue | +12.0% | +0.1% | +11.9% | +7.7% | +3.9% |
| 11-04 Wed | −7.2% | −1.9% | −5.4% | −4.9% | −0.5% |
| 11-05 Thu | +3.9% | −4.2% | +8.5% | +1.6% | +6.7% |
| 11-06 Fri | +7.4% | −2.5% | +10.2% | +0.8% | +9.3% |
| **7 days** | **−3.2%** ($1,434.25 vs $1,482.25) | **−6.7%** | **+3.7%** | | |
| 11-07 Sat (forward; MV sessions pending, GA4 denominator) | +19.4% ($299.05 vs $250.36) | +4.6% | +14.2% | −0.8% | +15.1% |

Rate is positive on 6 of 7 days. The one negative weekday (11-04) was graded on 11-07 as a one-day CPM dip inside the series' ±5% band (E372). Sessions are below the control on 6 of 7 days. That is the BELOW LINE the scoreboard already reports (sessions 99.0% of the day line). The cause is traffic, not monetization.

**One thing to watch, not act on.** Paid impressions per ex-segment session rose +6.7%, +9.3% and +15.1% on 11-05, 11-06 and 11-07, with CPM flat. That is the #388 Launcher depth effect (E332 b) compounding. It is the opposite of an ad-load cut. It does mean more of each session's revenue now depends on app pages, so a regression there would show up as a rate break, not a volume one.

**Roll-off projection (anchor 11-07, GA4 denominator until MV posts sessions):** revenue $1,546.23 vs $1,472.38 (+5.0%), ex-segment sessions 82,999 vs 83,884 (−1.1%), ex-segment RPM $18.63 vs $17.55 (+6.1%).

## (c) E332 (b) pre-read (grade stays 11-11)

Keep rule: MV 7d paid imp/session ≥ 16.47 and RPM ≥ 95% of $16.62. On the 11-06 anchor: 1,402,345 paid impressions ÷ 81,790 MV sessions = **17.15** (+4.1%), RPM **$17.54** = 105.5% of $16.62. Both legs pass with 2 reading days left. The T2 ad-density branch is not on track to fire.

## (d) B2: non-ad, November

- Patreon (public page, 11-09 scoreboard): 55 paid, **$139/mo** gross. Joins/cancels 7d 2 / 0. $3-tier joins 7d 1 (0.14/day). Paid-and-connected 4 of 55. `member_skip_countdown` 5 events in 7d. Floor $155 is −$16, which is 6 $3 patrons on the public basis.
- Affiliates, interim 10-12→11-08: Impact 23 clicks / **0 actions**. Repaired GTRacing links: 27 of 27 on-site clicks, 85.2% recorded by Impact, status confirmed. The kill clock started 10-12 and the kill read is 11-11. The blog Amazon block has 122 GA4 clicks = **9.38/day**, above the 5/day bar. Amazon earnings are operator-only (still not provided).
- **Levers inside the fence: none.** Q4 is closed (no tier or pricing changes, never re-pitch). Q37 lapsed 11-05 ("re-pitch only with new evidence"; there is none). Q36 dropped, so the E294 post is NOT-RUN. Affiliates are repair-only, and the repair is confirmed done. Sponsorship outreach is Tier 2 and has never been approved. Every remaining non-ad lever is Tier 2 and has already been declined or lapsed.

## (e) Decision

1. **7-day −7.8% closed as volume.** No rollback, no Mediavine ticket, no ad-surface change, no T2 ad-density package. The rate leg is +0.3% WoW and +3.7% weekday-matched.
2. **Pre-committed falsifier.** If the 7d on the 11-07 anchor (11-10 or 11-11 scoreboard, after MV posts 11-07 sessions) is below −2.0% WoW *and* ex-segment RPM is below −3% WoW, reopen as rate and bisect the app-page merges of 11-05→11-07 (T1). Otherwise this stays closed.
3. **B2: no Rio run spends a move on non-ad analysis before 11-11.** On 11-11 the E134/E306 rule runs mechanically, in that run:
   - If Impact actions = 0, affiliates KILL back to E13 (no new placements, Impact leg closed).
   - If the operator has not supplied Amazon earnings, the Amazon leg reads NOT MEASURABLE. It does not count as a pass, and the block stays (it lives in operator-owned `functions.php`).
   - After that, November's B2 line is the Patreon drift alone, against the $155 floor.

   The next non-ad move needs a Tier 2 answer that does not exist. Rio will not file another package for it in November unless there is new evidence (a sponsor inquiry, Amazon earnings above $0, or the operator reopening Q4/Q37).

— Rio, Product & Revenue
