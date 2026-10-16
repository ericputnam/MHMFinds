VERDICT: GREEN — 10-14 revenue $195.26 vs $182.17 (+7.2%) at RPM −6.8% on sessions +14.9% is the same Singapore Direct mix as 10-12/10-13, three times larger: 1,845 Direct/Chrome one-pageview sessions (41 engaged). Ex the 1,606 excess, sessions read +0.5% and RPM $17.40 (+6.6%); Mediavine's own monetizable-session RPM read $29.87 vs $27.80 (+7.5%). The 28d line reads 98.49% (ON LINE run 14) and holds ≥97% through 10-17 and 10-18 unless 10-16 earns under $96.90
MERGES: CLEAR
ROLLBACK-WANTED: none

# Rio verdict — 10-14 RPM decomposition, 28d line forward read, Members API could-not-run, E134 interim — read 2026-10-16 (E220)

**Sources.** Mediavine reporting API via `scripts/mcp-mediavine/client.ts` direct — **MV MCP unavailable** in this session (no Mediavine tool was exposed; Quinn's run reported the same), scratch `/tmp/rio-1016/mv.mts` + `mv2.mts`, aggregates only, 10-12/10-13/10-14 (+10-15 partial) vs the four prior same weekdays, `sessions` / `monetizable_sessions` / `monetizable_session_rpm` / `cpm` / `paid_impressions_per_monetizable_pageview` keys; GA4 property 437117335 via the Data API (country × sessionDefaultChannelGroup × browser for 10-14; Singapore sessions by day 09-17→10-14; channel totals 10-14 vs 10-07 / 09-30 / 09-23); `reports/funnel/history.json` (Quinn's tree, 28 measured days 09-17→10-14); `scripts/agents/affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-15` (exit 0, artifact `reports/funnel/affiliate-pipe-read-2026-10-15.md`); the 10-16 scoreboard (`.md` + `.json`), guardrail and operator-did files; `scripts/agents/funnel-scoreboard.ts` lines 665–700 and `scripts/_patreon-auth.ts` `patreonGet` (read-only, for the retry question). Counts only; no patron identity, email or token was read into this file.

## 1. Circuit breaker (guardrail 2026-10-16, finalized 10-14 Wednesday)

GREEN, action none. 10-14 revenue $195.26 vs $182.17 (+7.2%), session RPM 15.22 vs 16.33 (−6.8%), sessions 12,828 vs 11,162 (+14.9%); 3-day revenue $589.60 vs $550.48 (+7.1%), 3-day RPM −5.8%; health all ok (ads.txt, privacy policy); morning check markers ok. 90 in-window deploys exceed the 24 rollback bound — withheld, and moot on green (every in-window deploy is a ledger row, docs, a Tier 0 catalog/pin change or a creator-page copy change; none touches an ad surface). Vercel coverage COMPLETE (200 rows / 10 pages). Controls (Wednesdays): 10-07 $201.43 / 10,786 / $18.67; 09-30 $151.76 / 11,212 / $13.53 (E163 reset day); 09-23 $198.91 / 11,769 / $16.90; 09-16 $176.57 / 10,882 / $16.22. 10-15 partial: $195.08 vs $176.14 (+10.8%), MV sessions not yet populated.

## 2. 10-14 RPM −6.8% decomposed: the same mix, three times the size

Rule, printed before the pull (same as 10-15): **mix** if removing the Singapore Direct excess (sessions above the 250/day Singapore baseline; all Direct/Chrome, 1 user = 1 session = 1 pageview) brings sessions and RPM each within ±1% of the 4-week mean *or* above it; **rate** if RPM stays ≥3% under the mean ex-excess, or CPM and impressions-per-monetizable-pageview move down together.

- GA4 10-14 Singapore: 1,856 sessions total; **Direct/Chrome 1,845 sessions = 1,846 users = 1,846 pageviews, 41 engaged** (2.2%). Excess over 250 ≈ **1,606**. Largest day of the stream after 09-27 (2,203); 10-12 was 1,610, 10-13 835.
- GA4 10-14 by channel vs the 3 prior Wednesdays: Direct **2,318** vs 898 / 702 / 615 (mean 738, +1,580 ≈ the Singapore excess); Organic Social 7,584 vs mean 7,585 (−0.0%); Organic Search 2,780 vs mean 2,900 (−4.1%); AI Assistant 15 vs 42 (E71's referrer-side step, Sage). GA4 total 12,820 vs Mediavine 12,828 — the two count the same sessions.
- Ex-excess: sessions 11,222 vs 11,162 (**+0.5%**); RPM $195.26 / 11.222 = **$17.40 (+6.6% vs $16.33)**. Mix — and the real Wednesday out-earned its mean.
- Mediavine's own split confirms it without GA4: 10-14 sessions 12,828 but **monetizable sessions 6,536 = 50.95%** of sessions vs a 58.72% control share (10-13 59.78%, 10-12 56.75%); monetizable pageviews 73.55% of pageviews vs 81.23%. If the 1,606 excess sessions are all non-monetizable, the expected monetizable count is 0.5872 × 11,222 = 6,590 — actual 6,536 (−0.8%). **Monetizable-session RPM $29.87 vs $27.80 (+7.5%)**; CPM $1.03 vs $0.94 (+9.3%); paid impressions per monetizable pageview 13.64 vs 13.59 (+0.4%); viewability 55.3 vs 56.5; paid impressions 188,137 vs 192,121 (−2.1%). Demand is up, delivery per monetizable page is flat, and the only thing that fell is the share of sessions that ever reached an ad slot.
- 3-day (10-12→10-14): excess 1,360 + 585 + 1,606 = 3,551; ex-excess sessions 35,450 (+3.2% vs 34,336) at RPM **$16.63 (+3.7% vs $16.03)**. The headline −5.8% RPM is the same mix.

Verdict: **mix, not rate**, on two independent sources. Nothing the team shipped in the window moved the yield; no ad-side action. The stream is now the dominant term in any day's headline RPM: a 1,600-session day knocks 1.0 pt off session RPM at $0 cost and $0 revenue. Until Pip's E206 classification leg (10-21) lands, every Rio day-read is stated **ex-excess** first and headline second.

## 3. The 28d line (E199 chain) — run 14, and the next two days

- 28d 09-17→10-14 (09-16 $176.57 / 10,882 rolled out, 10-14 in): revenue **$5,854.60 / $5,944.43 = 98.49%** (≥97%, ON LINE run 14; 98.20% yesterday); sessions 357,818 / 355,599 = 100.62%.
- Prior 28d (08-20→09-16): $5,900.23 / 357,810 sessions → RPM $16.49 vs $16.36 now; revenue −0.77% at sessions +0.00%. Flat sessions, yield −0.8% — of which the Singapore excess (8,469 sessions at ~$0) is the whole gap: rev per 1K *real* sessions $16.76 vs $16.49 (+1.6%).
- Forward read, printed before the days land. 09-17 ($183.74, +1.5% vs line) rolls out when 10-15 lands; 09-18 ($208.00, +2.3%) rolls out when 10-16 lands — both mildly above-line days, so each roll-out costs the ratio a little. **10-15 needs ≥ $90.53** (51% of its $176.14 expectation) for the 10-17 read to hold ≥97%; the 10-15 partial is already $195.08 → ratio ≈ **98.76%**. **10-16 then needs ≥ $96.90** (49% of its $196.55 expectation) for the 10-18 read to hold. Keep rule for E220: both reads ≥97%; a 10-16 under $96.90 is a WATCH day (and would be a −50% Friday, which is a Mediavine-side incident before it is a line question).

## 4. E206 — Singapore excess share, updated

Singapore sessions by day 09-17→10-14: 227, 243, 292, 307, 190, 161, 579, 489, 537, 298, 2,203, 212, 283, 328, 446, 235, 360, 363, 316, 209, 242, 1,074, 244, 426, 617, 1,610, 835, **1,856**. Excess over 250/day = **8,469 = 2.37%** of 357,818 (was 6,863 = 1.93% on 09-16→10-13; 6,278 = 1.77% on 09-15→10-12 — it has grown every day this week). Sessions line ex-excess 98.24% (still ON LINE). Headline #3 is carrying ~2.4 pts of sessions that earn nothing and engage 2% of the time; the 10-21 Pip leg (GA4 segment or Mediavine geo ticket) is the only open leg and is now worth more than it was on 10-14.

## 5. Patreon Members API — could-not-run, not a failure

The 10-16 scoreboard's Members section is `unavailable: The operation was aborted due to timeout` (`patreonApi.ok=false` in the `.json`). That string is `AbortSignal.timeout`'s message: one page of the ~12-page walk exceeded `PATREON_PAGE_TIMEOUT_MS = 30_000` in `pullPatreonApi` (`funnel-scoreboard.ts` 682–693). **There is no retry on a timed-out page**: the walk is a single pass (`while (url && pages < 50)`), and `patreonGet` in `scripts/_patreon-auth.ts` retries only on 401 (refresh once, re-send). The public-page scrape ran (60 paid, 6,068 free, $162.00/mo) so the headline non-ad number is intact; what is missing today is paid joins 7d / cancels / paid-and-connected (E40, Q4 gate, B2 leg-2 trail). Graded **COULD-NOT-RUN** — unknown, never a verdict (the 10-15 read was 3 joins 7d on a complete walk). Per SD-11 Rio does not build the retry; the [rio→ops] inbox line below asks Ops for one bounded re-attempt of a timed-out page inside the existing 180 s walk budget. E131 (refresh observability) is the adjacent open item.

## 6. E134 / E153 — interim read, clock holding

`affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-15` (hand-run; Ops still owes the step-0e wiring): on-site GTRacing **12** (all to repaired offers; 19 all partners), Impact clicks **8**, actions **0**, sale $0.00, share 66.7% (floor 50%; pre-fix 8.2%), status confirmed, `kill_clock_starts=2026-10-12 kill_read=2026-11-11` — fourth consecutive run printing 11-11. Other Impact campaigns in the window: Envato 5 clicks / 0 actions, Canva 3 / 0. 7d affiliate clicks 9 (DB) / `affiliate_click` 6 (GA4), 30d 40, earnings $0.00. Q20 (GA4 outbound toggle) drops 10-18 unanswered → the Amazon leg on 11-11 reads "unmeasurable", never "$0". Q29 (post 5848 tag fix) drops 10-22 unanswered; no reply today.

## 7. The non-ad number, plainly

Public page **60 paid ≈ $162.00/mo** (12×$1, 45×$3, 3×$5; operator-did probe: Cappuccino 44→45 and free 6,047→6,072 since 10-14). Members API: could-not-run (§5), so joins 7d is unknown today, not zero. Affiliates $0. Sponsorship none (Q17 dropped). B2 is affiliates-only through 10-31 (killIf MET 10-15); October non-ad lands **$160–170** vs the $450 target. No Tier 0 non-ad move with a real baseline exists inside the mandate today: the affiliate pipe is confirmed and on its clock, both remaining pipe items (Q20, Q29) are Tier 2 and queued, and E55 bars a new placement. The move is this verdict.

## Consequence

Tier 0/1 merges clear. No ad-side action. 10-14 RPM −6.8% = Singapore Direct mix (ex-excess RPM +6.6%; MV monetizable-session RPM +7.5%). 28d 98.49% ON LINE run 14; holds ≥97% on 10-17 and 10-18 unless 10-16 < $96.90. Members API COULD-NOT-RUN → [rio→ops] retry line. E134 interim: 12 / 8 / 0, clock 11-11. Next Rio reads: 10-17 and 10-18 (E220 line legs), 10-18 (Q20 drop), 10-21 (E206 Pip leg), 10-22 (Q29 drop), 11-11 (E134 kill read).

— Rio, Product & Revenue
