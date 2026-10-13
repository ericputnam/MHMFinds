VERDICT: GREEN — 10-11 is a normal Sunday measured against one anomalous control Sunday (09-27 carried a 2,657-session Direct spike); RPM +0.4%, yesterday's WATCH test failed on its first day; the 28d line reads 97.28% and both days leaving the window next are below-line days, so the ratio rises on 10-14 and 10-15 if 10-12/10-13 merely land on line
MERGES: CLEAR
ROLLBACK-WANTED: none

# Rio verdict — 28d line roll-out, E192 10-13 leg, E174 pre-read, B2 leg-2 pre-read, E134 clock anchored — read 2026-10-13 (E199)

**Sources.** Mediavine reporting API via `scripts/mcp-mediavine/client.ts` direct (the Mediavine MCP is not connected in this session either — "unpublished" below means the API has not published the row, not that the site is broken; scratch `/tmp/rio-1013-mv.mts`, aggregates only); GA4 property 437117335 via the Data API; `reports/funnel/history.json` for the line; `scripts/agents/affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-12` (written to `/tmp`); the 10-13 scoreboard and guardrail. Counts only; no patron identity, email or token was read into this file.

## 1. Circuit breaker (guardrail 2026-10-13, finalized 10-11 Sunday)

🟢 GREEN, action none. 10-11 revenue $262.16 vs $269.26 (−2.6%), session RPM 16.98 vs 16.91 (+0.4%), sessions 15,436 vs 15,916 (−3.0%); 3-day revenue $728.16 vs $734.29 (−0.8%), 3-day RPM +3.0%; health all ok. 27 in-window deploys exceed the 24 rollback bound — withheld, and nothing to withhold: every in-window deploy is a docs/ledger/report commit or a Tier 0 catalog/pin row, none touches an ad surface.

**Why −3.0% sessions is not a slide.** Yield is flat on every leg: CPM 0.98 vs 0.95, paid impressions / monetizable pv 14.08 vs 14.40 (−2.2%), viewability 55.7%, site fill 64.4%. GA4 10-11 vs the four prior Sundays (10-04 / 09-27 / 09-20 / 09-13): Organic Social 10,441 vs mean 10,481 (−0.4%); Organic Search 3,860 vs 3,988 (−3.2%); Direct 1,050 vs 1,282 — but the 09-27 control Sunday carried 2,657 Direct sessions against 755–872 on the other three (and $299.13 / 17,665 Mediavine sessions, the strongest day in the window). GA4 total 15,496 vs 15,916 (−2.6%); ex the 09-27 outlier the three-Sunday mean is 15,355 and 10-11 reads **+0.9%**. The guardrail's 4-week same-weekday mean is doing its job — one spike control makes a normal Sunday read as a miss. Pinterest is flat on the day; this is not Pip's problem either.

**Yesterday's pre-committed WATCH test** ("WATCH only if 10-11/12/13 each land >4% under their means"): 10-11 −3.0% → fails on the first day. GREEN stands without reaching 10-12.

## 2. The 28d line — ratios, and the days that roll out (Quinn's question)

| window (anchor) | revenue | line | ratio | sessions | line | ratio |
|---|--:|--:|--:|--:|--:|--:|
| 09-14 → 10-11 (today, anchor 10-11) | $5,796.84 | $5,959.11 | **97.28%** | 352,686 | 358,212 | **98.46%** |

ON LINE (≥97%), run 11 — by 0.28 pt on revenue, 1.46 pt on sessions. Prior-28d comparison: −2.0% revenue (scoreboard), the E163 reset still inside the window.

**What rolls out and what the entrants need.** The window is `anchor − 27 … anchor`; the scoreboard anchors two days back.

| scoreboard | anchor | leaves | leaving day vs line | enters (line) | new line | 10-12 (+10-13) must read to stay ≥97% |
|---|---|---|--:|---|--:|---|
| 10-14 | 10-12 | 09-14 Mon $182.03 / 11,684 sess | −9.3% rev, −10.7% sess | 10-12 Mon ($181.01 / 11,843) | $5,939.53 | 10-12 ≥ **$146.53** (81% of its line); sessions ≥ 5,259 (not a constraint) |
| 10-15 | 10-13 | 09-15 Tue $173.24 / 11,303 sess | −5.8% rev, −7.1% sess | 10-13 Tue ($187.30 / 11,331) | $5,943.01 | 10-12 + 10-13 ≥ **$323.15** (87.7% of their combined $368.31) |

Both exiting days are *below-line* days (the 09-14 week was the window's weak Monday/Tuesday), so the ratio **rises** on both dates if the entrants merely land on line: 10-12 on line → 97.58% on 10-14; 10-13 on line too → 97.76% on 10-15. Mediavine's partial 10-12 row at pull time is **$207.05** (+14.4% vs the 4-Monday mean $181.01; sessions not yet joined, so no RPM read) — if it finalizes near that, 10-14 reads ≈98.0%. The window's five weakest days remain the closed E163 reset (10-01 −25.7%, 10-02 −26.8%, 10-03 −21.2%, 10-04 −20.4%, 10-05 −23.8%, all RPM-driven); they leave at anchors 10-28 → 11-02 (scoreboards 10-30 → 11-04), after which the ratio steps up ≈ +1.5 pt by swap alone.

**Decision rule for tomorrow, printed before the reading:** GREEN if 10-12 finalizes ≥ $146.53; WATCH only if the 10-14 ratio prints < 97.0%, which needs 10-12 < $146.53 (a −19% Monday with the partial already at +14%).

## 3. E192 — 10-13 leg, graded

Keep-if "ratio ≥97%" on 10-13: **97.28% ≥ 97% → MET.** E192 closes KEEP; its 10-14 / 10-15 / 11-11 legs are carried by the E174, B2 and E134 rows respectively (no second row for the same read).

## 4. E174 — Sidebar Sticky residual, pre-read toward 10-14 (rule restated before the pull)

CLOSE (seasonal) if on all of 10-10/11/12: sidebar ÷ Content ≥ 0.54 AND sidebar fill ≥ Content fill − 3.0 pts AND `sticky_sidebar_ads` ≥ 9.0 on every published day. REOPEN as a Tier 2 package if sticky < 9.0 on two days OR fill gap ≤ −3.0 on two days OR ratio < 0.54 on any day. No third extension.

| day | site vs 4-wk | Sidebar Sticky vs mean | Content vs mean | Universal Player | sidebar ÷ content | sidebar fill − content fill | `sticky_sidebar_ads` | site ex-Content (point b) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| 10-10 Sat | $257.60 (−4.0%) | $64.89 vs $74.36 (−12.7%) | $93.78 vs $98.47 (−4.8%) | $52.31 (+10.7%) | **0.69** | 63.89 − 61.75 = **+2.15** | **10.40** (published today) | −3.5% |
| 10-11 Sun | $262.11 (−2.6%) | $65.19 vs $74.33 (−12.3%) | $99.17 vs $101.68 (−2.5%) | $51.17 (+12.0%) | **0.66** | 62.81 − 61.80 = **+1.01** | unpublished (history ends 10-10) | −2.7% |
| 10-12 Mon | partial $207.05 | ad-unit split not yet published (API returns $0 by unit while earnings show $207.05) | — | — | — | — | unpublished | — |

10-10 passes all three legs; 10-11 passes both published legs with the ratio inside the 2025 same-calendar band (0.54–0.70) and above its mean (0.62). Point (b) applied: ratioed against the site ex its best unit (Content), the sidebar is still the weakest unit (−12.3% vs −2.7%), while the Player's +12% dilutes the blended denominator — the rule's legs are ratio / fill / delivery, and all three hold.

**Pre-read: CLOSES seasonal on 10-14 with no third extension.** With 10-10 and 10-11 both passing, the *two-day fill-gap* REOPEN path is already dead. The only REOPEN paths left are (i) 10-12 ratio < 0.54 (any-day branch) or (ii) `sticky_sidebar_ads` < 9.0 on both 10-11 and 10-12 once published. Pre-committed for 10-14: if the 10-11/10-12 health rows are still unpublished, the delivery leg is graded on the published values (10-08 9.35, 10-09 10.11, 10-10 10.40, all ≥ 9.0) plus `check-blog-sidebar.sh` ok — an unpublished row is "could not run", never a fail.

## 5. B2 killIf leg 2 (reads 10-15) — pre-read

Scoreboard 10-13 (Members API): paid 59 (12×$1, 44×$3, 2×$5, 1×$8) ≈ $161.50/mo gross; paid joins 7d **3**, cancels 0; $3-tier joins 7d 2 (0.29/day); 14 $3-tier joins since the 09-25 rename. Leg 1 was MET on 10-08 (4 < 5). Leg 2 reads the 10-09→10-15 window: it needs **≥2 more paid joins in the next two days** at a post-cluster run rate of ~0.2–0.3/day. **Expect MET** → B2 flips as written: October is the creator-program month; Rio is affiliates-only 10-15 → 10-31 exactly as pre-committed in `rio-verdict-2026-10-12.md` §7. On 10-15 that is a read, not a debate.

## 6. E134 / E153 — the kill clock was drifting; anchored today (the code move in this PR)

`affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-12` this morning: on-site `gtracing` 10 (all repaired; all partners 17), Impact GTPLAYER-US clicks 6, actions 0, $0.00, share 60.0% — CONFIRMED again. But the tool printed **`kill_clock_starts=2026-10-13 kill_read=2026-11-12`** — yesterday's run printed 10-12 / 11-11. `assessPipe` anchored the clock on `localDateKey(now)`, i.e. the run date, so a daily re-run (the [rio→ops] step-0e wiring) would advance the read date one day per morning and never read. Fixed in `scripts/agents/affiliate-pipe-lib.ts`: `PIPE_RULE.confirmedOn = '2026-10-12'` (the first confirmed read), `readOn = '2026-11-11'`, a `confirmedOn` input the entrypoint passes, and the clock starts at `min(confirmedOn, today)`. Re-run: `kill_clock_starts=2026-10-12 kill_read=2026-11-11`. Tests 20/20; the two new cases that encode the drift are red against pre-fix `origin/main`. CLI surface (`--start/--end/--out/--json`, exit 0/2/1) is stable for Ops to wire. E134 reads 2026-11-11 (KILL to E13's stance if Impact actions are still 0). Impact same window: Envato 5 / 0, Canva 3 / 0.

## 7. E131 and the queue

- E131: `patreonApi.ok` 10-13 ✓ (4/4 since 10-07; Members API returned 59 paid). Refresh log line still absent → MORE DATA, unchanged.
- Q19 / Q21 / Q22 (spec-only, no decision asked) **drop 2026-10-14** under the 7-day rule — tomorrow's run logs one line each, no re-pitch. Q20 (GA4 outbound clicks toggle) drops 10-18; if it drops, the Amazon leg is "unmeasurable" on 11-11, never $0. Item D (Amazon tag hygiene, post 5848) re-pitches once, smaller, on 10-15.
- Q4 is closed won't-do: no tier or pricing proposal. Competitor move #3 (paid skip-the-countdown) stays PARKED.

## 8. The non-ad number, plainly

Patreon public $159.00/mo gross (59 paid), API $161.50; membership $0 (paid-and-connected 4 of 200 linked); first-party mods $0; affiliates $0.00 (45 on-site clicks/30d, 12/7d); sponsorship $0 (Q17 dropped 10-07). `patreon_click` users/day 8.71 vs the 8.75 E40 baseline — flat. **October non-ad lands $160–170** against `targets.json` `_rioOctoberRead` $200–225 and the $450 bet; nothing changed since yesterday and no Tier 0/1 move Rio is allowed closes that gap in October. Revenue per 1K sessions 28d ≈ $16.44 ad + $0.45 non-ad.

## Consequence

Guardrail green with the cause named (one anomalous control Sunday, not a slide); the 28d line is on line and both days leaving next are below-line days, so the ratio should rise on 10-14 and 10-15; E192's 10-13 leg MET; E174 on track to close seasonal tomorrow with the surviving REOPEN paths enumerated; B2 leg 2 expected MET on 10-15 → affiliates-only as pre-committed; E134's kill clock anchored so the daily wiring reads on 11-11 instead of never. **Tier 0/1 merges clear.** No ad-layout, `functions.php`, pricing or money action requested or taken.

— Rio, Product & Revenue
