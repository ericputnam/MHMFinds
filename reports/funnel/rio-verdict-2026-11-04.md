# Rio — verdict 2026-11-04 (E332): the yellow is Halloween Saturday volume; 11-02 is a rate day; no deploy implicated; #388 made sessions deeper, not cheaper

Circuit breaker 🟡 YELLOW, action watch (`guardrail-2026-11-04.md`). Judged day **2026-11-02 $187.44 vs $181.24 (+3.4%)**, RPM $15.74 vs $14.25 (+10.4%), sessions 11,907 vs 12,728 (−6.5%; ex-Singapore-direct −1.4%). **3-day $617.97 vs $697.53 (−11.4%)** is what tripped yellow; 3-day RPM $16.78 vs $16.18 (+3.7%). Health ok. 128 in-window deploys, so rollback was withheld (bound 24).

**Sources.** Mediavine daily series from `scripts/mcp-mediavine/client.ts` → `earnings('2026-10-03','2026-11-03')`, read directly. The Mediavine MCP did not connect this session. I used the renewed Q32 token; `tokenDaysRemaining()` = 28. Also used: the guardrail JSON (`sessionsExSegmentRpm`); GA4 Data API, property 437117335 (hostName and pagePath pageviews/sessions, 10-19→10-24 vs 10-28→11-02); and `git log` on `origin/main`. No token is printed in this file.

## (a) One line for the digest

*Yellow is volume, not a rate break. 10-31 (Halloween Saturday) is $71.78 of the 3-day −$79.56 gap (90%), on sessions −24.7% with RPM −4.0%. 11-02 itself is +3.4% at RPM +10.4% (ex-segment +4.9%, so rate). None of the 72 h deploys touches an ad surface. The partial 11-03 ($211.53, +12.0% vs Tuesdays) puts tomorrow's 3-day at about +2.4%. Expect yellow to clear on its own; no rollback and no Mediavine ticket.*

## (b) The 3-day window, day by day (same weekday, 4-week average; Mediavine)

| Day | revenue | expected | Δ $ | Δ % | sessions Δ | RPM Δ | share of gap |
|---|--:|--:|--:|--:|--:|--:|--:|
| 10-31 Sat (Halloween) | $187.07 | $258.85 | −$71.78 | −27.7% | −24.7% (11,236 vs 14,928) | −4.0% ($16.64 vs $17.34) | 90.2% |
| 11-01 Sun | $243.46 | $257.45 | −$13.99 | −5.4% | −11.7% (13,692 vs 15,499) | +7.0% | 17.6% |
| 11-02 Mon | $187.44 | $181.24 | +$6.21 | +3.4% | −6.5% | +10.4% | −7.8% |
| **3-day** | **$617.97** | **$697.53** | **−$79.56** | **−11.4%** | −14.6% | **+3.7%** | 100% |

On 10-31, volume accounts for 87% of the log gap: ln(sessions ratio) −0.284 out of ln(revenue ratio) −0.325. That matches E324's read on 11-02. The window carries a holiday Saturday at the front. Both days after it have positive RPM. By the standing rule ("segment by calendar and by treatment before calling a decline"), this is a calendar volume dip, not a rate break.

**Forward read (partial).** 11-03 Tuesday shows $211.53 with CPM $1.078, against a Tuesday average of $188.80 (10-27 $190.69, 10-20 $179.30, 10-13 $187.29, 10-06 $197.91). Its sessions are not finalized (Mediavine prints 0). Tomorrow's window is 11-01→11-03: $642.43 vs $627.48 expected = **+2.4%**, if 11-03 finalizes near its partial.

## (c) 11-02 rate decomposition: deeper sessions, slightly better price

Same-Monday ratio of sums (10-05, 10-12, 10-19, 10-26): RPM $14.63 → $15.74 (**+7.6%**). The guardrail's +10.4% uses a mean of daily RPMs.

| leg | 4 Mondays | 11-02 | Δ |
|---|--:|--:|--:|
| monetizable pv / session | 1.200 | 1.367 | **+14.0%** |
| paid imp / monetizable pv | 12.49 | 11.59 | −7.3% |
| → paid imp / session | 14.99 | 15.84 | **+5.7%** |
| CPM (rev / paid imp) | $0.976 | $0.994 | +1.8% |

Identity: 1.057 × 1.018 = 1.076, which reproduces +7.6%. Of the raw RPM lift, the Singapore mix explains +5.1% (guardrail, E271). The ex-segment rate is +4.9%. Within the rate, pages per session do most of the work and price does a little.

## (d) Which deploys? None are negative in the 72 h window. #388 (outside it) moved page depth, and that move is positive.

**In the 72 h window (10-30 → 11-02).** The window contains Pip's video tools (#447/#448, scripts only), the Pinterest/Tumblr freeze (#446), queue and ledger rows, Sage's hub retitles and breadcrumbs (#435/#437/#441), Cass's capture under the grid (#442), Nova's isVerified publish (#440), and Rowan's piercings page (#434). None of them edits `.mv-ads`, `aside#secondary`, `functions.php` or `useAnalytics`. The sidebar-sticky-health suite gated each merge. RPM rose through the window, which is the opposite of what an ad-surface break produces. **Implicated: none.**

**Pageview step (10-27/28, before the window).** Mediavine monetizable pv per session went from about 1.21 (10-19→10-24) to 1.39 (10-28→11-02), +15.4%. It started with the Launcher redesign (#388, merged 10-26 23:50 ET; homepage grid cards now link to `/mods/<id>/`, diff line `const href = \`/mods/${mod.id}/\``) and #396 (10-28, launcher on `/games/*`). GA4 shows the extra pages are app pages:

| GA4, 6 days each | 10-19→10-24 | 10-28→11-02 | Δ |
|---|--:|--:|--:|
| apex pv / session | 1.558 | 1.692 | +8.6% |
| `/` pageviews | 3,151 | 5,752 | +82.5% |
| `/games/*` + `/mods/*` + `/go/*` pageviews | 9,774 | 23,935 | +14,161 (+2,360/day) |
| … sessions touching them | 7,495 | 8,211 | +9.6% |
| Mediavine pageviews / day | 18,473 | 20,548 | +2,075/day |

The app-page gain (+2,360/day) covers all of the Mediavine pageview gain (+2,075/day). Top mod pages show pv ≈ sessions after the change, against pv ≪ sessions before it (e.g. `/mods/cmil0mqbf…/`: 13 pv / 77 sessions → 336 / 313). Comparing the two 6-day windows: revenue +3.4% on sessions −2.3%. Session RPM went $16.22 → $17.18 (+5.9%): paid imp/session +3.7% and CPM +2.1%. Imp per monetizable pv fell −10.1%, because the new pages carry fewer ads each. The net is positive. Caveat: the two 6-day windows have different weekday mixes (the post window has a Sunday and no Tuesday; the pre window has a Tuesday and no Sunday). The same-weekday 11-02 read in (c) agrees in sign and size.

**Mix vs rate, summarized.** Raw RPM +10.4% = Singapore mix +5.1% + ex-segment rate +4.9%. The rate leg is mostly page depth from #388/#396 (+5.7% imp/session) plus a little CPM (+1.8%). Neither is a Mediavine-side demand move.

## (e) The funnel page is BELOW LINE: still a volume problem

28d revenue $6,083.98 (MV $5,940.34 + non-ad $143.64) vs ramp $7,382.80 = **82.4%**; sessions 78.0%. The per-day `days[]` line is 104.7% on revenue and 99.0% on sessions. The ramp's implied RPM is about $16.5 (E315 §c). The last 6 finalized days already run $17.18, so the revenue gap is 4.4 points smaller than the sessions gap, and that difference is all rate. Rate is ahead of the line. **Sessions are what is missing**, and that lever belongs to Pip and Sage. The 10-03→10-06 roll-off (−21.4% vs prior) leaves the 28d window at anchor 11-03, so the 28d headline should improve on 11-05 without any action from us.

## (f) Decision (written into `experiments.md` E332)

- **No rollback, no Mediavine ticket, no ad-surface change.** Yellow is accepted as calendar volume.
- **Pre-committed read 11-05 (guardrail judging 11-03).** If the 3-day is ≥ 90% of expected and health is ok, yellow is closed as volume and E332's leg (a) is KEEP. If the 3-day is < 90% **and** ex-segment RPM is < −5% on the judged day, it is rate: Rio bisects the in-window deploys that touch app pages (manual rollback is Tier 1) and checks `check-blog-sidebar.sh` first.
- **Leg (b), #388 page depth, read 11-11.** 7-day paid imp/session (MV) for 11-04→11-10 must be ≥ the 10-19→10-25 baseline of 16.47 (1,459,846 imp / 88,651 sessions), and session RPM ≥ 95% of that window's $16.62 (one-sided). If either fails, the thinner pages are diluting rate, and Rio files a Tier 2 ad-density package for the app pages (SD-5, ≥$300/mo case). No change before then.
- **Q32 closed.** The token is live with 28 days left and expires 2026-12-03 00:47Z. A renewal reminder for about 11-26 is in the operator-only checklist.

— Rio, Product & Revenue
