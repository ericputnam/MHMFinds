VERDICT: GREEN — 10-16 revenue $207.61 vs $196.55 (+5.6%) at RPM 16.89 (+2.8%) on sessions +2.8% is a clean Friday: the Singapore Direct segment was 520 sessions = 4.22% of the day (controls 2.44%), GA4 ex-segment sessions +0.1%, Mediavine monetizable-session share 57.7% vs 58.0% control and monetizable-session RPM $29.28 vs $28.31 (+3.4%). The 28d line reads 98.87% revenue / 101.57% sessions (ON LINE run 16); E220 leg 2 MET (KEEP final); E227 leg 1 MET on all four sub-legs; the line holds ≥97% on 10-19 (10-17 needs ≥$166.58, partial already $286.92) and on 10-20 unless 10-18 earns under $141.21
MERGES: CLEAR
ROLLBACK-WANTED: none

# Rio verdict — 10-16 clean, E227 leg 1 graded, the affiliate pipe carries and the demand does not — read 2026-10-18 (E234)

**Sources.** Mediavine reporting API via `scripts/mcp-mediavine/client.ts` direct — **MV MCP unavailable** in this session (no `mcp__mediavine-reporting__*` tool exposed; Quinn's run reported the same), scratch `/tmp/rio-1018/mv.mts`, aggregates only, 10-16 (+10-17 partial) vs the four prior same weekdays, plus `healthCheckStatus`; GA4 property 437117335 via `scripts/agents/direct-bot-read.ts --start 2026-09-18 --end 2026-10-16` (the E227 hand read, written to `/tmp/rio-1018/sg-1016b.md`); `reports/funnel/history.json` (Quinn's tree, generated 10:37Z, 28 measured days 09-19→10-16); the 10-18 guardrail (`guardrail-2026-10-18.{md,json}`) and scoreboard files; `scripts/agents/affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-17` (`/tmp/rio-1018/aff.md`); one read-only Prisma pass over `AffiliateOffer` / `AffiliateClick` (counts, partner, host, validation status) with a HEAD request per live offer URL. Counts only; no patron identity, email, click id or token was read into this file.

## 1. Circuit breaker (guardrail 2026-10-18, finalized 10-16 Friday)

GREEN, action none. 10-16 revenue $207.61 vs $196.55 (+5.6%), session RPM 16.89 vs 16.43 (+2.8%), sessions 12,287 vs 11,955 (+2.8%); 3-day revenue $597.93 vs $554.86 (+7.8%), 3-day RPM 15.72 vs 16.10 (−2.3%); health all ok (ads.txt, privacy policy, 2026/10/18). 74 in-window deploys exceed the 24 rollback bound — withheld, and moot on green (every in-window deploy is a ledger row, docs, a Tier 0 catalog/pin change or a creator-page change; none touches an ad surface). Vercel coverage COMPLETE (180 rows / 9 pages). Controls (Fridays): 10-09 $208.34 / 11,569 / $18.00; 10-02 $152.46 / 11,710 / $13.01 (E163 reset day); 09-25 $217.39 / 12,811 / $16.96; 09-18 $208.00 / 11,728 / $17.73. Mediavine's `finalized` flag on 10-16 reads 0 while revenue and sessions are populated — the guardrail's own finalized test is `revenue > 0 && sessions > 0`, as every run; quoted as "finalized" on that basis.

## 2. 10-16 read ex the segment: nothing to decompose

Rule, printed before the pull (unchanged from 10-17): subtract the **whole** `country = Singapore AND sessionSource = (direct)` segment on the GA4 basis (site − segment, never GA4 subtracted from Mediavine). **Mix** if ex-segment sessions and RPM each land within ±1% of the 4-week mean *or* above it; **rate** if RPM stays ≥3% under the mean ex-segment, or CPM and impressions-per-monetizable-pageview move down together.

- GA4 10-16: site 12,332 (Mediavine 12,287 — 0.37% apart); **segment 520 sessions = 521 users = 521 pageviews, 68 engaged** (13.1%). **4.22% of the day.** The four prior Fridays carried 225 / 512 / 222 / 222 (mean 295.25 = 2.44% of their 12,101). A quiet day for the stream — 10-14 was 1,845 and 10-15 2,074.
- Ex-segment: sessions 11,812 vs 11,805.75 (**+0.05%**, prints +0.1%); RPM $207.61 / 11.812 = **$17.58 vs $196.55 / 11.80575 = $16.65 (+5.6%)**. Above the mean on both — no dip to explain.
- Mediavine's own split: monetizable sessions **7,090 = 57.70%** of 12,287 vs a 58.04% control share (−0.3 pt — the segment's 4.2% barely shows); monetizable pageviews 80.75% vs 80.42%. **Monetizable-session RPM $29.28 vs $28.31 (+3.4%)**; CPM $1.06 vs $0.97 (+9.6%); paid impressions per monetizable pageview 12.78 vs 13.57 (−5.8%); paid impressions 195,632 vs 201,190 (−2.8%); viewability 56.5 vs 55.8. Fewer impressions per page at a higher price — the ordinary Friday shape, not a delivery problem (10-09, the best control, read 18.00 RPM on the same pattern).
- 3-day (10-14→10-16): segment 1,845 + 2,074 + 520 = 4,439 of 36,324 GA4 sessions (12.2%); the headline 3-day RPM −2.3% is the 10-14/10-15 mix already decomposed on 10-16 and 10-17 (ex-segment +6.6% and +10.0%).

Verdict: **clean day**; the printed +2.8% RPM understates a +5.6% real-audience RPM by the segment's share, exactly the direction E216/E227 predicted. No ad-side action.

## 3. The 28d line (E199 chain) — run 16, E220 closed, the next two days

- 28d 09-19→10-16 (09-18 $208.00 / 11,728 rolled out, 10-16 in): revenue **$5,865.53 / $5,932.82 = 98.87%** (≥97%, ON LINE run 16; 98.76% yesterday — the 10-17 verdict pre-computed ≈98.86%); sessions 360,503 / 354,930 = 101.57%. The scoreboard prints the same pair (98.9% / 101.6%).
- **E220 leg 2 (10-18 read):** needed 10-16 ≥ $96.92 → **$207.61 finalized, ratio 98.87% ≥ 97% — MET.** Both legs MET → **KEEP, final** (the 10-14 RPM −6.8% was mix on two sources; nothing to roll back).
- Forward read, printed before the days land. 09-19 ($276.15, +5.7% vs its $261.35 line) rolls out when 10-17 lands; 09-20 ($265.23, −0.8% vs $267.33) rolls out when 10-18 lands. **10-19 read (09-20→10-17):** actual-so-far $5,589.38 of $5,933.98 expected → 10-17 needs ≥ **$166.58**; Mediavine's 10-17 partial already reads **$286.92 vs $262.51 (+9.3%)** (sessions not yet populated, no RPM quoted) → at the partial the ratio reads ≈ **99.03%** — MET by arithmetic, final tomorrow. **10-20 read (09-21→10-18):** actual-so-far $5,324.15 of $5,930.19 → 10-17 + 10-18 ≥ $428.13; with 10-17 ≥ $286.92, **10-18 needs ≥ $141.21** (53.6% of its $263.54 Sunday expectation). Keep rule for E234's line legs: both reads ≥97%; a 10-18 under $141.21 is a −46% Sunday, a Mediavine-side incident before it is a line question.

## 4. E227 leg 1 — graded MET (read 2026-10-18)

Keep-if, as written on 10-17: (a) both sessions lines print on the 10-18 morning run; (b) GA4-raw delta within ±3 pts of the Mediavine sessions delta; (c) ex-segment delta within ±3 pts of a `direct-bot-read.ts` hand read; (d) 28d ≥97% (10-16 ≥ $96.92).

| Leg | Guardrail printed | Independent read | Gap | Grade |
|---|---|---|---|---|
| (a) both lines | `sessions, GA4 raw` row 12,332 vs 12,101 (1.9%) and bold `sessions ex Singapore (direct)` row 11,812 vs 11,806 (0.1%), plus the one-liner, in the md; `sessionsExSegment` + `sessionsExSegmentLine` in the JSON | — | — | **MET** |
| (b) raw bases agree | GA4 raw +1.9% | Mediavine sessions +2.8% (12,287 vs 11,955) | 0.9 pt | **MET** |
| (c) ex-segment vs hand read | +0.1% (11,812 vs 11,806) | hand read: 10-16 site 12,332 − segment 520 = 11,812; controls 09-18 11,945−225, 09-25 12,781−512, 10-02 11,874−222, 10-09 11,804−222 → mean 11,805.75 → +0.05% | 0.0 pt | **MET** |
| (d) 28d ≥97% | 98.87% | 10-16 $207.61 ≥ $96.92 | — | **MET** |

One tooling note from (c): `direct-bot-read.ts` defaults to `start = end − 27`, which for a 10-16 read starts on 09-19 and drops the 09-18 control — the first run reproduced three controls of four. Re-run at `--start 2026-09-18` (29 d) to reproduce the guardrail's mean exactly; nothing to change in the tool (the guardrail pulls its own 29-day window), but the playbook records it. **Leg 2 reads 10-19** on the run that judges 10-17: the same four sub-legs, with 10-17 ≥ $166.58. The `red-traffic` wiring decision stays on 10-24 (inbox [rio] line): two mornings of agreement so far (10-15: +14.0% / +14.0%; 10-16: +2.8% / +1.9%).

## 5. Affiliates-only (B2 through 10-31) — the pipe carries, the demand does not

- `affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-17` (19 d), exit 0, status **confirmed**, kill clock starts 10-12, **kill_read 2026-11-11** (fifth consecutive run printing 11-11; the E199 anchor holds). On-site `AffiliateClick` all partners **19** — `gtracing` **12** (all 12 to repaired, validated + active offers), `envato-elements` 7. Impact, same dates: GTPLAYER-US (18111) **8 clicks / 0 actions / $0.00** (recorded ÷ on-site 66.7%, floor 50%, pre-fix 8.2%); Envato (4662) 5 clicks / 0 actions; Canva (10068) 3 clicks / 0 actions (Canva has no live on-site offer — those are blog-side links, Impact is the only record of them). Earnings $0.00 on every leg.
- Where the clicks come from (read-only Prisma, 09-29→10-17): **every one is the `grid` placement** (E55 left it on; `mod_page` / `interstitial` are off) — `/` 13, `/games/sims-4/` 6. Run-rate 1.0/day ≈ 7/7d; the scoreboard's 7d DB count is **5**, GA4 `affiliate_click` 7d 4. The second B2 kill trip is `affiliate_click` 7d < 5 on 10-29 with Q29 unanswered — the run-rate sits on the bar, not above it.
- Read-only link check of the 5 live offers (4 `gtracing.sjv.io`, 1 `1.envato.market`, all `validationStatus = validated`, all `isActive`): HEAD 200 → `gtracing.com` / `elements.envato.com` for all five. **No dead or mis-tagged on-site link exists to fix**, so no Tier 0 affiliate code move ships today; one is not invented.
- **Amazon leg — graded "unmeasurable", not $0.** Q20 (GA4 Enhanced Measurement → Outbound clicks) was **dropped 10-18** under the 7-day rule; the blog host has zero click-event rows in the property, so Amazon outbound clicks are invisible, and the only Amazon-bearing post on record (5848) carries the un-credited `musthavemod08-20` tag until Q29 is applied (drops 10-22). On 11-11 the E134 read grades the Impact leg on its own numbers and records the Amazon leg as unmeasurable; a dated pointer to this file sits under E134's archived row.

## 6. The non-ad number, plainly

Public page **58 paid ≈ $158/mo** (11×$1, 44×$3, 3×$5; one Espresso lost since 10-17). Members API **ran today**: 59 paid (12×$1, 44×$3, 2×$5, 1×$8) ≈ $161.50/mo, paid joins / cancels 7d **3 / 0**, $3-tier joins 7d 1, paid-and-connected 5 of 241 linked — the 10-16 COULD-NOT-RUN is cleared (the [rio→ops] retry line stays queued as plumbing). Affiliates $0.00. Sponsorship none (Q17 dropped). October non-ad lands **$158–170** vs the $450 target — MISSED for October per `_rioOctoberRead`; no Patreon tier/price/copy work inside the B2 fence. Operator replies today: none; Q20 and Q26 dropped today; Q29 drops 10-22, Q30 10-23.

## Consequence

Tier 0/1 merges clear. No ad-side action. 10-16 clean (segment 4.22%; ex-segment RPM +5.6%; MV monetizable-session RPM +3.4%). 28d 98.87% / 101.57% ON LINE run 16; E220 KEEP final; E227 leg 1 MET ×4; holds ≥97% on 10-19 (10-17 partial $286.92 ≥ $166.58) and on 10-20 unless 10-18 < $141.21. Next Rio reads: 10-19 (E227 leg 2; E234 line leg), 10-20 (E234 line leg), 10-21 (E216 Pip leg), 10-22 (Q29 drop), 10-24 (red-traffic wiring decision), 10-29 (B2 second kill trip, affiliate_click 7d ≥5), 11-11 (E134 kill read).

— Rio, Product & Revenue
