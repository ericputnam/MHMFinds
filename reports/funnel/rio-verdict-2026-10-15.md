VERDICT: GREEN — 10-13 revenue $187.29 vs $187.30 (−0.0%) at RPM −5.2% is mix, not rate: 585 excess Singapore Direct one-pageview sessions; ex them sessions read +0.15% and RPM $16.50 (−0.3%). The 28d line reads 98.20% (ON LINE run 13), E199 and E206 10-15 legs both MET
MERGES: CLEAR
ROLLBACK-WANTED: none

# Rio verdict — E199 10-15 leg, E206 10-15 leg, 10-13 RPM decomposition, B2 leg 2 — read 2026-10-15 (E213)

**Sources.** Mediavine reporting API via `scripts/mcp-mediavine/client.ts` direct (the Mediavine MCP is not connected in this session — Quinn's run reported the same; scratch `/tmp/rio-1015/mv.mts`, aggregates only, 10-13/10-14 vs the four prior same weekdays); GA4 property 437117335 via the Data API (country × sessionDefaultChannelGroup × browser, 10-11→10-13 and the 28 days 09-16→10-13); `reports/funnel/history.json` (Quinn's tree, 28 measured days 09-16→10-13); `scripts/agents/affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-14` (exit 0); the 10-15 scoreboard (Patreon Members API section), guardrail and operator-did files; `rio-verdict-2026-10-11.md` and the E185 row for the 10-08 join number. Counts only; no patron identity, email or token was read into this file.

## 1. Circuit breaker (guardrail 2026-10-15, finalized 10-13 Tuesday)

GREEN, action none. 10-13 revenue $187.29 vs $187.30 (−0.0%), session RPM 15.69 vs 16.55 (−5.2%), sessions 11,933 vs 11,331 (+5.3%); 3-day revenue $656.50 vs $637.57 (+3.0%), 3-day RPM −3.2%; health ok (ads.txt, privacy policy); `check-blog-sidebar.sh` markers ok in the morning check. 72 in-window deploys exceed the 24 rollback bound — withheld, and moot on green (every in-window deploy is a ledger row, docs, or a Tier 0 catalog/pin change; none touches an ad surface). rollbackCandidate on file: `mhm-finds-dw5l-8stknx35k`. Vercel coverage COMPLETE (160 rows / 8 pages). Controls (Tuesdays): 10-06 $197.91 / 10,805 / $18.31; 09-29 $185.62 / 11,762 / $15.78; 09-22 $192.44 / 11,455 / $16.79; 09-15 $173.24 / 11,303 / $15.32. 10-14 partial: $195.26 vs $182.17 (+7.2%).

## 2. 10-13 RPM −5.2% decomposed: sessions × RPM — it is mix

Rule, printed before the pull: the drop is **mix** if removing the Singapore Direct excess (sessions above the 250/day Singapore baseline, all Direct/Chrome, 1 user = 1 session = 1 pageview) brings sessions and RPM each within ±1% of the 4-week mean; it is **rate** if RPM stays ≥3% under the mean ex-excess, or CPM / impressions-per-monetizable-pageview moved together.

- GA4 10-13 Direct/Singapore: 829 sessions = 829 users = 829 pageviews (486 engaged). Excess over 250 ≈ **585**.
- Ex-excess: sessions 11,348 (+0.15% vs 11,331); RPM $187.29 / 11.348 = **$16.50 (−0.3% vs $16.55)**. Mix.
- Mediavine rate side, 10-13 vs mean: CPM $1.01 vs $0.96 (+5.5%), paid impressions per monetizable pageview 12.8 vs 14.04 (−8.8%, the spike's one-pageview sessions carry no in-content slots), viewability 55.0 vs 55.9, pageviews 17,737 vs 17,410. CPM up and imp/mon-pv down is the signature of a denominator with extra empty pageviews, not of a demand or layout change.
- 3-day (10-11→10-13): Singapore excess 367 + 1,360 + 585 = 2,312; ex-excess sessions 39,297 (+0.5%) at RPM $16.71 (+2.4% vs $16.31). The headline −3.2% RPM is the same mix.

Verdict: **mix, not rate**. Nothing the team shipped in the window moved the yield; no ad-side action.

## 3. The 28d line — E199 10-15 leg, graded on the tool's rows

Pre-committed 10-14: MET if the printed ratio ≥ 97.0%; WATCH only if 10-13 finalized < $116.10. 10-13 finalized $187.29.

- 28d 09-16→10-13 (09-15 $173.24 / 11,303 rolled out, 10-13 in): revenue **$5,835.91 / $5,943.01 = 98.20%** (≥97% **MET**, ON LINE run 13; 98.02% yesterday); sessions 355,872 / 356,138 = 99.93%.
- Prior 28d (08-19→09-15): $5,900.40 / 359,032 sessions → RPM $16.43 vs $16.40 now; revenue −1.1% at sessions −0.9%. Flat yield, slightly fewer sessions — unchanged from 10-14's read.
- Tool leg: `affiliate-pipe-read.ts` printed `kill_clock_starts=2026-10-12 kill_read=2026-11-11` for the third consecutive run (on-site GTRacing 12, Impact clicks 8, actions 0, share 66.7%, status confirmed, exit 0). E199 10-15 leg **MET** → next read 11-11 (E134 kill read).

## 4. E206 10-15 leg — Singapore excess share of 28d sessions

Singapore sessions by day 09-16→10-13: 249, 227, 243, 292, 307, 190, 161, 579, 489, 537, 298, 2,203, 212, 283, 328, 446, 235, 360, 363, 316, 209, 242, 1,074, 244, 426, 617, 1,610, 835. Excess over 250/day = **6,863 = 1.93%** of 355,872 (was 6,278 = 1.77% on the 09-15→10-12 window). Sessions line ex-excess 98.00% (still ON LINE). Revenue per 1K real sessions $16.72 vs the $16.40 headline. E206 10-15 leg **MET** (ratio ≥97% at 98.20%). The Pip classification leg (GA4 segment or Mediavine geo ticket) reads 10-21; it is the only open leg.

## 5. B2 killIf leg 2 — MET; affiliates-only from today

killIf (`targets.json` B2): "paid joins 7d < 5 on both 10-08 and 10-15 AND Q17 unanswered past its 10-07 drop".

- 10-08: paid joins 7d = **4** (Patreon Members API, E185 row / `rio-verdict-2026-10-11.md`).
- 10-15: paid joins 7d = **3** (Patreon Members API, scoreboard 2026-10-15, window 10-08→10-15; cancels 0).
- Q17: DROPPED 2026-10-07 under the 7-day rule; no reply since (operator-did 10-15: no replies).

All three conditions hold → **B2 killIf MET**. Per the pre-commitment in `rio-verdict-2026-10-12.md` §7, B2 pivots to **affiliates-only 10-15→10-31**: no Patreon tier, price, copy or post work from Rio in October (Q4 closed 09-28 "won't do" stands); the creator-program month is Nova's. Non-ad stays measured and reported, not worked. `targets.json` is Quinn's to rewrite; this file, the E213 row and the digest line are the record.

## 6. E134 / E153 — clock holding

Third run printing 11-11. 7d affiliate clicks 12 (DB) / `affiliate_click` 7 (GA4), 30d 41, $0.00. Q20 (GA4 outbound toggle) drops 10-18 unanswered → the Amazon leg of 11-11 is "unmeasurable", never "$0".

## 7. The one revenue action inside the Tier 2 fence today — E213, Item D re-pitch (Q29)

Item D (Amazon tag hygiene) re-pitched once, smaller, as pre-committed 10-12/10-14: a **one-post Kadence-safe dry-run diff, no server edit**. `scripts/wp/kadence-safe-replace.ts dry-run` against prod post 5848 ("The Absolute Best Gamer Gifts For Every Budget", publish, last modified 2025-01-23), read-only over SSH: **7 occurrences** of `musthavemod08-20`, **0** of `musthavemod04-20` (the only supported store id — the post earns under a tag Amazon does not credit), before sha256 `d9534acc…fd95b`, after `6cb3d18d…d74`, 48,894 bytes both sides, invariants PASS. Artifact: `reports/funnel/item-d-dryrun-5848-2026-10-15.txt`. Package Q29 in `operator-queue.md`: reply `Q29: apply 5848` → Rio writes the approved-snapshot JSON (post id → the before-sha above), runs `apply --prod --approved-snapshot` (refuses if the live sha moved), purges `bs_cache`, confirms the 7 tags on the live page; silence → drops 10-22. Revenue ceiling honest: Amazon actions 0 on record, $0–10/mo — the point is a correct pipe before the 11-11 read, not a forecast.

## 8. The non-ad number, plainly

Public page 60 paid ≈ $162.00/mo (12×$1, 45×$3, 3×$5); Members API 60 ≈ $164.50 (12×$1, 45×$3, 2×$5, 1×$8). Paid-and-connected 4 of 220. $3 joins 7d 2 (0.29/day). `patreon_click` 10.29 users/day vs 8.75 baseline. Affiliates $0. Sponsorship none (Q17 dropped). October non-ad lands **$160–170** vs the $450 target and `_rioOctoberRead` $200–225 — the bet is behind by construction, not by execution, and B2's own killIf now says so.

## Consequence

Tier 0/1 merges clear. No ad-side action. E199 10-15 leg MET (98.20%), E206 10-15 leg MET (excess 1.93%, Pip leg 10-21), B2 killIf MET → affiliates-only 10-15→10-31. E213 = Q29 Item D package, paper-only PR. Next Rio reads: 10-18 (Q20 drop), 10-21 (E206 Pip leg), 10-22 (Q29 drop), 11-11 (E134 kill read).

— Rio, Product & Revenue
