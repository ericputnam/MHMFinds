VERDICT: Mediavine-side demand — 10-19 Monday revenue $161.82 vs $187.26 (−13.6%) at session RPM 12.38 (−17.5%) on Mediavine sessions +4.7%. Singapore mix explains less than half: the segment was 1,533 sessions = 11.38% of the day vs 4.61% on the four control Mondays, which predicts −7.1% RPM on its own, yet ex-segment RPM reads $13.55 vs $15.94 (−15.0%) and Mediavine's own monetizable-session RPM $23.78 vs $25.87 (−8.1%) with CPM −3.8% and paid impressions per monetizable pageview −2.9% falling together — rate, not mix. The rate dip is broad (10 of 10 top partners down vs 10-12, both desktop ad units down, desktop revenue −23% vs 10-12) and no in-window deploy touches a surface earning >2% of the day's revenue (blog posts 96.9% + home 3.1%; /go/*, /creator*, /games/* absent from the top 100; functions.php untouched; all sidebar markers OK at 10-21). Tuesday 10-20's partial already reads $179.30 at CPM $0.975, above the Monday controls' $0.957 — a one-day demand dip. 28d 98.75% revenue / 102.56% sessions (ON LINE run 19); E248 10-21 leg MET; E241 tracker: 10-21 gap 4.7 pt → HOLD, 10-24 WIRE no longer reachable (earliest 10-28)
MERGES: Tier 0 only today (yellow stands — the breaker is Mediavine-raw; Tier 1 resumes when 10-20 finalizes ≥90% of its $190.82 line, partial $179.30 = 94%)
ROLLBACK-WANTED: none — no site change named; the rollback candidate (`mhm-finds-dw5l-2z14qx3u1`) would revert nothing that touches an ad surface

# Rio verdict — 10-19 Monday: a broad one-day rate dip on top of Singapore mix; E248 10-21 MET; tracker HOLD — read 2026-10-21 (E255)

**Sources.** **MV MCP unavailable** in this session (no `mcp__mediavine-reporting__*` tool exposed, as on 10-18 and 10-20) → Mediavine reporting API via `scripts/mcp-mediavine/client.ts` direct (scratch `/tmp/rio-1021/{mv,mv2,pages}.mts`, `loadConfig()` from the worktree's `scripts/mcp-mediavine/.env.local`): daily `earnings` rows 09-21→10-20, `devices`, `advertisers`, `adUnits` for 10-19 and 10-12, `pages` (top 100, the endpoint's cap) for 10-19 / 10-12 / 10-05, `healthCheckStatus`. The 10-21 guardrail (`guardrail-2026-10-21.{md,json}`, Mediavine-sourced; `sessionsExSegment` block = GA4 property 437117335 via E227); scoreboard `2026-10-21.md`; `reports/funnel/history.json` (Quinn's tree, 28 of 28 days measured 09-22→10-19); `guardrail-agreement-tracker.ts` with `MHM_PROJECT_DIR=` Quinn's tree (includes today's untracked JSON); two GA4 Data API reports (host × device ex-segment 10-19 vs 10-12; eyes-cc / creator / makeup / go paths 10-19 vs 10-12); `git show --stat` on the three in-window deploys that touch rendered surfaces; `check-blog-sidebar.sh` re-run at 10-21. Counts and dollars only; no patron identity, email, click id or token was read into this file.

## 1. Circuit breaker (guardrail 2026-10-21, finalized 10-19 Monday) — the diagnosis

YELLOW, no Tier 1 merges today. Health all ok (ads.txt, privacy policy, 2026/10/21). Vercel coverage COMPLETE (180 rows / 9 pages); 84 in-window deploys exceed the 24 rollback bound → withheld (and not wanted, §1c). 3-day revenue $707.41 vs $713.31 (−0.8%), 3-day RPM 15.42 vs 16.55 (−6.8%) — the week is on line; the day is not.

**Decision rule, printed before the read.** Breaker thresholds are Mediavine-raw and one-sided: a day is on line at ≥95% of its 4-same-weekday mean revenue; yellow fires under 90% (Tier 0 only); red needs RPM <85% *and* revenue <80%, or health not ok. Verdict classification (E216/E227, unchanged since 10-17): subtract the **whole** `country = Singapore AND sessionSource = (direct)` segment on the GA4 basis (site − segment). **Singapore mix** iff ex-segment RPM lands at ≥99% of its 4-week mean. Otherwise the drop is rate, and it is a **site change** iff a deploy inside the window (2026-10-16T04:00Z →) touched a surface earning >2% of the day's Mediavine revenue, or an ad marker failed; **Mediavine-side demand** iff the rate drop is broad — ≥3 of the top-5 partners down, both desktop ad units down — with no touched surface; **inconclusive** otherwise, naming the read that settles it.

### 1a. Raw, ex-segment and Mediavine's split, side by side

| 2026-10-19 (Mon) | raw (Mediavine) | raw (GA4) | ex-segment (GA4) | Mediavine monetizable split |
|---|---|---|---|---|
| sessions | 13,067 vs 12,482 (**+4.7%**) | 13,472 vs 12,317 (+9.4%) | 11,939 vs 11,749.5 (**+1.6%**) | monetizable sessions 6,803 = **52.06%** of 13,067 vs **57.99%** control (−5.9 pt) |
| revenue | $161.82 vs $187.26 (**−13.6%** = 86.4%, yellow) | — | same $ | — |
| session RPM | 12.38 vs 15.005 (**−17.5%**) | — | **$13.55 vs $15.94 (−15.0%)** | monetizable-session RPM **$23.78 vs $25.87 (−8.1%)** |
| segment | — | 1,533 = **11.38%** of the day | controls 567.5 = **4.61%** (10-12 / 10-05 / 09-28 / 09-21) | CPM **$0.921 vs $0.957 (−3.8%)**; paid imp / monetizable pv **12.35 vs 12.72 (−2.9%)**; monetizable pv 14,229 vs 15,381 (−7.5%); paid impressions 175,772 vs 195,690 (−10.2%); viewability 55.3 vs 55.6 |

- The four Monday controls read $188.32 / 11,743; $195.70 / 12,475; $157.98 / 11,470; $207.05 / 14,240 — mean $187.26 / 12,482, identical to the guardrail's expectation.
- **Mix alone predicts (1 − 0.1138) / (1 − 0.0461) − 1 = −7.1% RPM.** The printed RPM is −17.5%, so the segment covers well under half of it; ex-segment RPM at 85.0% of its mean fails the ≥99% mix test by 14 points. Mediavine's GA4-free split agrees: the monetizable share fell 5.9 pt (that is the mix) *and* the monetizable-session RPM fell 8.1% with CPM and impressions-per-page down together (that is rate). Decomposed: monetizable pv −7.5% × imp/mon-pv −2.9% × CPM −3.8% = −13.6%, the printed revenue delta to the tenth.
- Real-audience pages per session also slipped: Mediavine monetizable pv per monetizable session 2.092 vs 2.125 (−1.6%); GA4 apex desktop ex-segment 1.489 vs 1.591 pv/session against 10-12 alone.

### 1b. Breadth (Mediavine side; 10-12, the strongest control at $207.05, is the only per-partner comparison the endpoints give per range — deltas against it overstate the 4-control gap)

- **Partners, 10-19 vs 10-12:** Google AdX $20.78 vs $25.46 (−18%), The Trade Desk $18.79 vs $24.68 (−24%), Magnite $16.03 vs $17.13 (−6%), Index Exchange $14.72 vs $16.30 (−10%), Exchange Bidding $11.22 vs $17.51 (−36%), OpenX $10.51 vs $15.41 (−32%), TripleLift $10.05 vs $10.81 (−7%), Ozone $7.00 vs $8.49 (−18%), GumGum $5.64 vs $10.37 (−46%), Pubmatic $5.54 vs $8.03 (−31%) — **10 of 10 down**; partner CPMs split (AdX 0.67 vs 0.71, TTD 0.90 vs 1.04, EB 0.69 vs 0.79, OpenX 0.96 vs 1.07 down; Magnite, Index, TripleLift up), impressions down everywhere. Not one buyer, not one deal.
- **Ad units (desktop):** Adhesion $24.52 vs $34.57 (fill 78.3% vs 82.6%, CPM 0.95 vs 1.03); Content $56.52 vs $72.34 (fill 57.1% vs 58.8%, CPM 0.85 vs 0.87) — both units, fill and CPM both a step down.
- **Devices:** desktop $152.79 = 94.4% of the day vs $199.11 on 10-12 (−23%); mobile $8.64 vs $7.27 (+19%); tablet $0.38 vs $0.65. The `devices` and `pages` rows for 10-19 carry revenue but only 4,462 of 14,229 monetizable pv two days later (sessions 0) — Mediavine's dimension reports lag the earnings line; per-device RPM is not quoted for that reason.
- **Next day:** 10-20 partial (not finalized, sessions unpopulated) $179.30 on 183,931 paid impressions at **CPM $0.975** — more impressions than Monday and a CPM above the Monday controls' mean. The rate came back within a day.

### 1c. Site side — can any in-window deploy reach a page earning >2%?

- Mediavine `pages` (top 100 by revenue): 10-19 blog posts $74.18 = **96.9%** + home $2.37 = 3.1%; 10-12 posts 94.8% / home 3.8% / WP archives 0.8% / `/games/*` 0.6%; 10-05 posts 94.7% / home 3.2% / `/games/*` 1.1% / archives 1.0%. `/go/*`, `/creator*`, `/mods*` absent from the top 100 on all three days.
- In-window deploys touching rendered surfaces: **#309** (10-16 07:45, `GoClient.tsx` — `/go/*`, Tier 0, interstitial copy; no `.mv-ads` change), **#335** (10-19 07:16, `lib/collections.ts` only — registry entry for `/games/sims-4/eyes-cc/` + one `related` swap; GA4 10-19: the hub itself is below 2 sessions, the WP post `/sims-4-eyes-cc/` 128 vs 137), **#339** (10-18 20:04, `/creator/[slug]` + `/creators/*` portal + a one-line `middleware.ts` change inside the `/creators` branch letting `isAdmin` tokens in — logged-out visitors and every other path unchanged; `/creator/` 13 vs 11 GA4 sessions), **#349** (10-20 06:50, after the judged day; catalog pins). None can alter ad geometry on blog posts or the home page; `functions.php` had no push in the window and `check-blog-sidebar.sh` re-run at 10-21 reads every marker OK on both probed articles. **No site change named; no rollback wanted.**

### 1d. Verdict and what settles it

**Mediavine-side demand.** A broad one-day Monday rate dip (every partner, both units, desktop) on top of the standing Singapore mix. The breaker stays yellow on its own Mediavine-raw rule; Tier 1 resumes when 10-20 finalizes ≥90% of $190.82 (partial $179.30 = 94%, CPM already recovered). **If 10-20 finalizes under 90% as well, with no deploy to name, that is two weekdays of rate — the operator asks Mediavine support whether 10-19/10-20 demand was site-specific (Tier 2 contact), and I re-read partners on 10-22 before anything else.**

## 2. E248 — 10-21 leg graded (the 28d line, run 19)

- Keep-if as written 10-20: 28d ≥97% both; 10-19 ≥ **$58.27**. **10-19 finalized $161.82 ≥ $58.27 — MET** (278% of the bar; 86.4% of its own Monday line).
- **28d 09-22→10-19** (history.json, 28/28 days): revenue **$5,843.24 / $5,917.21 = 98.75%**; sessions **364,802 / 355,694 = 102.56%** — **MET, ON LINE run 19** (98.98% → 98.75%: a −13.6% Monday replacing a −6.0% one moved the 28d by 0.23 pt). Scoreboard prints the same $5,843.24 (−1.1% vs prior 28d).
- Forward, printed before the days land. **10-22 read (09-23→10-20):** expected $5,926.89, actual-so-far $5,650.80 → 10-20 needs ≥ **$98.28**; partial $179.30 → holds by arithmetic. **10-23 read (09-24→10-21):** expected $5,933.02, actual-so-far $5,451.89 → 10-20 + 10-21 ≥ $303.14 → with 10-20 ≥ $179.30, **10-21 needs ≥ $123.84** (66% of its $186.84 Wednesday line).

## 3. E241 — tracker, 10-21 morning

Rule as the tool prints it: WIRE only if all 7 mornings print both lines and agree within 3 pts; any disagreeing morning → HOLD; fewer than 7 with both lines → INSUFFICIENT.

> **HOLD** — 1 of 7 mornings disagree (> 3 pts): 2026-10-21

| Morning | Judged | MV Δ | GA4 raw Δ | Gap | Ex-seg Δ | Share | State |
|---|---|--:|--:|--:|--:|--:|---|
| 10-14 / 10-16 / 10-17 | 10-12 / 10-14 / 10-15 | +20.2% / +14.9% / +14.0% | — | — | — | — | absent (pre-#326 JSON) |
| 2026-10-18 | 2026-10-16 | +2.8% | +1.9% | 0.9 pt | +0.1% | 4.22% | agree |
| 2026-10-19 | 2026-10-17 | +13.6% | +15.6% | 2.0 pt | +5.0% | 11.20% | agree |
| 2026-10-20 | 2026-10-18 | +1.6% | +2.3% | 0.6 pt | −3.4% | 10.62% | agree |
| **2026-10-21** | **2026-10-19** | **+4.7%** | **+9.4%** | **4.7 pt** | +1.6% | 11.38% | **disagree** |

- Today's gap: Mediavine counted 13,067 sessions to GA4's 13,472 (−3.0%) where the controls run +1.3% the other way — on a day the segment is 11.4% of GA4 sessions, Mediavine sees fewer of them than GA4 does. The two sources diverge most exactly when the subtraction matters most, which is the case against wiring a GA4 ratio into a Mediavine leg.
- **Consequence for the gate:** 10-21 stays inside every 7-morning window through 10-27, so **10-24 prints HOLD by construction**. Per E241's keep-if, HOLD = stays diagnostic, no wiring, morning named (10-21). Earliest WIRE is **10-28**, and only if 10-22→10-28 all fire and agree. Inbox line updated.

## 4. Affiliates / B2 (no move; mandate reminder)

B2 is affiliates-only through 10-31. `affiliate_click` 7d: GA4 6 (10-13→10-19), DB 10 / 30d 43, $0 earned (scoreboard); bar ≥5 on 10-29 (E234's remaining leg). Q29 (Amazon tag, post 5848) drops 10-22 — not re-pitched. Patreon: 59 paid ≈ $153 public / $157.50 API; paid joins/cancels 7d 3/1. Nothing to do here today.

## Operator

- Nothing to decide today. Conditional: if the 10-22 guardrail reads 10-20 under 90% of $190.82 too, with no deploy named, ask Mediavine support (Tier 2 contact) whether 10-19/10-20 demand was site-specific — I will have the partner table for both days ready.

## Consequence

Yellow stands on the Mediavine-raw rule; cause is demand-side, not a deploy; no rollback. Tier 0 paper today for everyone. 28d on line run 19. The E241 wiring gate is HOLD through 10-27 by construction.

— Rio, Product & Revenue
