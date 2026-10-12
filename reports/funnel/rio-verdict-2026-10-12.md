VERDICT: GREEN — 10-10 is traffic (−4.1% sessions), not yield (RPM +0.1%); the 97.94% line ratio is the closed E163 reset still inside the 28d window plus a Saturday swap, not a new slide
MERGES: CLEAR
ROLLBACK-WANTED: none

# Rio verdict — Monday grades (E134 / E153 / E74 / E174 pre-read / E131) and the B2 leg-2 plan — read 2026-10-12 (E192)

**Sources.** Mediavine reporting API via `scripts/mcp-mediavine/client.ts` direct (the Mediavine MCP is not connected in this session — "MCP unavailable" below means the MCP, not the API; scratch `/tmp/rio-1012-mv.mts`, aggregates only); GA4 property 437117335 via the Data API; Patreon Members API via `patreon-members-lib` (6,110 members, 13 pages, `links.next` exhausted) + `patreon-q4-gate-preread.ts --anchor rename --no-write`; `scripts/agents/affiliate-pipe-read.ts` (E153 tool, written to `/tmp`); the 10-12 scoreboard, guardrail and operator-did files. Counts only; no patron identity, email or token was read into this file.

## 1. Circuit breaker (guardrail 2026-10-12, finalized 10-10 Saturday)

🟢 GREEN, action none. 10-10 revenue $257.66 vs $268.36 (−4.0%), session RPM 18.26 vs 18.25 (+0.1%), sessions 14,109 vs 14,709 (−4.1%); 3-day revenue +0.4%, 3-day RPM +3.0%; health all ok; `check-blog-sidebar.sh` ok (operator-did probe).

**Why 10-10 is traffic, not yield.** Yield is flat on every leg: CPM 1.03 (4-Sat band 0.89–1.03), paid impressions / monetizable pv 13.59 (10-03: 13.23), viewability 55.6%, site fill 64.7%. GA4 same-day channel view (10-10 vs the mean of the four prior Saturdays 09-12/19/26/10-03): Organic Social 9,520 vs 9,969 (−4.5%), Organic Search 3,382 vs 3,789 (−10.7%), Direct 817 vs 786 (+4.0%), AI Assistant 20 vs 57 (−65%, tiny). GA4 total 13,851 vs 14,702 (−5.8%). Pinterest and Bing each account for roughly half of the missing ~600 Mediavine sessions; nothing shipped in the window touches either (23 in-window deploys, all docs/ledger/report files after the judged day, or Tier 0 catalog/pin rows before it). Pip's channel, not Rio's.

**Is 97.94% of the line a trend or a weekday artefact?** Neither a new trend nor a weekday-mix artefact — it is the quarter-boundary demand reset (E163, CLOSED Mediavine-side 10-03/10-04 with 2025 controls) still sitting inside the window, plus one Saturday swap:

- The 28d window is weekday-balanced (4 of each weekday in both windows), so weekday mix cannot explain the 28d read. Current 28d (09-13→10-10) $5,819.75 / 352,592 sessions vs prior 28d (08-16→09-12) $5,852.89 / 360,700 = revenue −0.57%, sessions −2.25%.
- The move from 98.60% (yesterday) to 97.94% is the window rolling: 09-12 (Sat, $281.07, derived from yesterday's 28d) rolled out and 10-10 (Sat, $257.66) rolled in, −$23.41 on the sum while the line rises ~$12–16/day. Same weekday either side, so this is a weak Saturday, not a mix shift.
- **The 28d window's weakest days are all the reset:** by Δ vs the same-weekday 4-wk mean — 10-02 Fri −26.8% ($152.46 vs $208.17; sessions −3.8%, RPM −23.9%), 10-01 Thu −25.7% (sessions −1.4%, RPM −24.6%), 10-05 Mon −23.8% (sessions −8.2%, RPM −16.6%), 10-03 Sat −21.2% (sessions +0.2%, RPM −21.3%), 10-04 Sun −20.4% (sessions −4.9%, RPM −16.5%); by $ shortfall the same five (−$47 to −$59 each, ≈ −$270 across 09-30→10-05). Every one of them is an RPM day with sessions near flat — the opposite shape of 10-10. Outside those six days the window runs *above* its means (09-22→09-29 +0.7…+12.7%; 10-06→10-09 +1.1…+13.0%).
- The weekest *weekday* is Monday: cur 4 Mondays $724.03 vs prev $802.37 (−9.8%: 09-14 −9.3%, 09-21 −6.0%, 09-28 −0.1%, 10-05 −23.8%); Sundays are the strongest (+6.7%).
- **What to expect:** 09-13 (Sun, $285.07, +12.9%) leaves the window tomorrow and 10-11 (Sun, partial $262.16 at pull time) enters, so the ratio should slip toward ~97.5% on 10-13 by swap alone; the reset days leave 10-28→11-02. WATCH (<97%) fires only if 10-11/12/13 each land >4% under their 4-wk means — i.e. only if the sessions slide continues (10-06→10-10 sessions vs mean: −6.4 / −4.4 / +1.6 / −4.0 / −4.1%). That is the number to watch, and it is sessions.

## 2. E174 — Sidebar Sticky residual, pre-read toward 10-14 (rule pre-committed 10-11, restated before the pull)

CLOSE (seasonal) if on all of 10-10/11/12: sidebar ÷ Content ≥ 0.54 AND sidebar fill ≥ Content fill − 3.0 pts AND `sticky_sidebar_ads` ≥ 9.0 on every published day. REOPEN as a Tier 2 package if sticky < 9.0 on two days OR fill gap ≤ −3.0 on two days OR ratio < 0.54 on any day. No third extension.

| day | site vs 4-wk | Sidebar Sticky vs mean | Content vs mean | Universal Player | sidebar ÷ content | sidebar fill − content fill | `sticky_sidebar_ads` |
|---|--:|--:|--:|--:|--:|--:|--:|
| 10-10 Sat | $257.60 (−4.0%) | $64.89 vs $74.36 (−12.7%) | $93.78 vs $98.47 (−4.8%) | $52.31 (+10.7%) | **0.69** | 63.89% vs 61.75% = **+2.15** | not yet published (history ends 10-09 = 10.11) |
| 10-11 Sun | not finalized | — | — | — | — | — | — |
| 10-12 Mon | not finalized | — | — | — | — | — | — |

10-10 passes both published legs (0.69 ≥ 0.54; +2.15 ≥ −3.0), the best ratio since 09-30 and above the 2025 same-calendar band's mean (0.62). sticky history 10-06→10-09: 10.29 / 10.09 / 9.35 / 10.11 — the 10-08 low did not repeat. **Pre-read: on track to CLOSE (seasonal) on 10-14**, pending 10-11/10-12 finalization and the three sticky values. No Tier 2 package today.

## 3. E153 — affiliate pipe read tool (#241), read today

`affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-11`: both legs returned. On-site `gtracing` clicks **10** (floor 10; all 10 to repaired validated+active offers; all partners 17), Impact GTPLAYER-US (18111) clicks **6**, actions 0, sale $0.00, recorded ÷ on-site **60.0%** (floor 50%; pre-fix 07-01→09-28 was 9/110 = 8.2%). Verdict **CONFIRMED** — the pipe is fixed; E134's 30-day $0 clock starts 2026-10-12 and reads 2026-11-11. Impact same window: Envato 5 clicks / 0, Canva 3 / 0. **E153: KEEP** (the tool delivered a verdict with both legs at ≥10 clicks, exactly its keep rule). Next: wire it into morning step 0e so the clock reads itself (Ops plumbing request, inbox).

## 4. E134 — affiliates reopen decision 0.1, read today

Keep-if was "≥1 Impact action on a repaired link" by 10-12. Actual: **0 actions on 6 Impact-recorded clicks** (10 on-site). But the pre-committed E153 rule says the $0 window only starts when the pipe is confirmed — and that happened today, not 09-29. Grading E134 KILL on a clock that started this morning would be the 09-22 mistake again (E13 killed affiliates on a pipe that was recording 8% of clicks). **E134: EXTEND → 2026-11-11, KILL back to E13's stance if Impact actions are still 0 then.** Scope stays repair-only; no placement test (E55 stands). Ceiling, stated so nobody mistakes this for a revenue line: gtracing runs 0.77 clicks/day (≈23 per 30d); at a 2% action rate and ~$15/action that is ≈$7/mo. Affiliates close a measurement hole; they do not move the $450 bet.

## 5. E74 — `/go` post-connect state ("follow free first", #131, merged 09-21), read 10-06 taken today

Rule (PR #131 body, verbatim legs): keep if in-campaign share (free+paid) of accounts linked 09-22→10-05 ≥ 1/3 (exact) **OR** paid-and-connected ≥ 1; session RPM 09-22→10-05 ≥ 95% of the same-weekday prior-4-week mean (guardrail only — /go is ≤ $11/mo of ad revenue); kill/revert if in-campaign share < 15% AND `patreon_follow_click` < 5.

| leg | value | result |
|---|--:|---|
| in-campaign share, linked 09-22→10-05 | 10 of 79 = 12.7% (2 active, 8 free, 69 not in campaign); baseline ≤09-21: 4/58 = 6.9% | < 1/3 exact — not met |
| paid-and-connected (Patreon-id join) | **3** of 58 paid (2 of the 3 created inside the window; was 0 of 54 on 09-21) | ≥ 1 — **met** |
| RPM guardrail 09-22→10-05 | 15.71 vs 16.85 expected = **93.2%** (one-sided floor 95%); ex the E163 reset days 09-30→10-05: 103.0% | literal miss, attributed to E163 (Mediavine-side, closed) |
| kill leg | share 12.7% < 15% AND follow_click 13 events / 10 users (≥ 5) | not triggered |
| funnel events 09-22→10-05 (GA4) | post_connect_view 97 / 61 users → follow_click 13 / 10 (16.4% of viewers) → reconnect_click 3 | — |

**E74: KEEP on the OR leg** (paid-and-connected 0 → 3), with the RPM leg's literal miss named and owned by E163, not /go. The lever is weak: the follow share doubled (6.9% → 12.7%) and is nowhere near 1/3; 121 of 134 accounts linked since 09-22 are Patreon users who never followed the campaign. Keep the feature, stop reading it as a revenue lever — fold it into the scoreboard's standing paid-and-connected line; no further E74 read. (Q4 is closed won't-do: no tier or pricing re-pitch follows from this.)

## 6. E131 — Patreon refresh persists

`patreonApi.ok` on every morning that produced a scoreboard since the window: 10-07 ✓, 10-11 ✓, 10-12 ✓ (3/3; Members API returned 58 paid today). Refresh leg: **no `[patreon-auth] tokens refreshed … saved to` line exists** in any `logs/` or `reports/funnel/*.out` in the run tree (0 files). **MORE DATA**, unchanged, until the log line lands (inbox [ops] item stands).

## 7. B2 killIf leg 2 (reads 10-15) and what "affiliates-only" means

Members API today: paid 58 (11×$1, 44×$3, 2×$5, 1×$8) ≈ $160.50/mo gross; paid joins 7d **2** (10-10: 1, 10-11: 1), cancels 7d 2; joins since the 09-25 rename 14 in 17.2 d (24.8/mo pace, ten of them in the 09-30→10-03 billing cluster; 2 in the last 9 days). Leg 1 was MET on 10-08 (4 < 5). **Leg-2 preview: with today's rows the 10-15 trailing-7d reads 2; it needs ≥3 more paid joins by 10-15 to clear 5, against a post-cluster run rate of ~0.2/day. Expect leg 2 to be MET.** Q17 is dropped. B2 then flips as written: October is the creator-program month; Rio moves to affiliates only.

**Affiliates-only, concretely, 10-15 → 10-31** (pre-committed now so 10-15 is a read, not a debate):

1. **E134 clock runs itself.** One Tier 0 PR: `affiliate-pipe-read.ts` in morning step 0e (Ops wires the runner line — SD-11; Rio owns the tool) so the 11-11 read is a row, not a memory. No placement tests, no new partners, no network re-applications (Tier 2 and E55 both stand).
2. **Item D, Amazon tag hygiene.** The 09-29 Kadence-safe package for post 5848 (7 direct `musthavemod08-20` occurrences; the 10 `amzn.to` links already resolve to `04-20`) is a Tier 2 prod write awaiting the operator's `--approved-snapshot`. Re-pitch once, smaller, on 10-15 (one post, one dry-run diff attached); drop 10-22 if silent. Tier 0 alongside: `kadence-safe-replace.ts --dry-run` over the remaining WP posts to inventory any other stray tag — read-only.
3. **Q20 (GA4 outbound clicks)** is the only thing that makes the Amazon leg readable at all; it drops 10-18. If it drops, the Amazon leg is declared unmeasurable in the 11-11 read rather than counted as $0.
4. **Guardrail duties are unchanged** (E174 close/reopen 10-14; daily verdict; RPM watch on any touched page). They are not "Patreon moves".
5. **What Rio stops:** Patreon reads beyond the scoreboard's automatic lines (E108/E125 close KEEP on their 10-11 numbers), sponsorship re-pitches, membership feature work. No tier or pricing proposal in any form (Q4).
6. **The honest October number:** affiliates-only caps Rio's non-ad contribution at ≈$0–10/mo; non-ad October lands where Patreon drifts, $155–165/mo, against the $450 bet. `_rioOctoberRead` ($200–225) already assumed Q17 shipping; with Q17 dropped the realistic read is **$160–170** and the $450 target is not reachable in October by any Tier 0/1 move Rio is allowed.

## Consequence

Guardrail green with the cause named (sessions, Pip's channel); E174 on track to close as seasonal on 10-14; affiliate pipe confirmed fixed with its $0 clock started; E74 kept as a feature and retired as a lever; B2 leg 2 expected to fire on 10-15 with the affiliates-only month spelled out above. **Tier 0/1 merges clear.** No ad-layout, `functions.php`, pricing or money action requested or taken.

— Rio, Product & Revenue
