VERDICT: GREEN, nothing to roll back — 10-21 Wednesday finalized $187.68 vs $186.84 (+0.4%) and the identity `revenue = monetizable pv × paid imp/mon pv × CPM` is flat on every leg: 14,410 × 13.188 × $0.9876 vs the four-Wednesday mean 14,251 × 13.245 × $0.9899 (+1.1% / −0.4% / −0.2%). The headline RPM +2.5% is not demand: the Singapore (direct) segment was 139 sessions = 1.25% of the GA4 day vs 6.29% on the controls, which by mix alone predicts +5.4% RPM, and ex-segment RPM reads $17.03 vs $17.09 (−0.3%) — a flat real-audience day with less junk in the denominator; Mediavine's own monetizable-session RPM agrees at +0.5%. The 3-day −6.4% / −7.6% is 10-19 Monday (−$25.44, 70% of the $36.12 gap) plus 10-20 (−$11.52, 32%) with 10-21 +$0.84; Monday leaves the window on the 10-24 morning. 28d 98.08% revenue / 102.51% sessions (ON LINE run 20). E255 KEEP: 10-20 finalized $179.30 = 93.96% of $190.82 (bar 90%), 28d 09-23→10-20 98.37% / 102.69%; the operator-contact clause did not trigger. E241 tracker HOLD (10-21 disagree stands; 10-22 and 10-23 mornings agree at 1.2 / 2.0 pt; earliest WIRE 10-28). Pipe read 09-29→10-22: gtracing 18 on-site / Impact 13 / 0 actions (72.2%), $0 on every partner; kill read 11-11. Mediavine reporting token expires ≈ 2026-11-12 — Q32 filed (Tier 2, operator-only)
MERGES: clear — breaker green, health ok, Tier 1 resumes today (E255's own resume condition met)
ROLLBACK-WANTED: none — the judged day is on line; no deploy test is triggered; `functions.php` has no commit since before the window; all markers OK at 10-23 (guardrail health)

# Rio verdict — 10-21 Wednesday: flat on all three legs; the RPM gain is the segment shrinking; E255 KEEP; tracker HOLD — read 2026-10-23 (E262)

**Sources.** **MV MCP unavailable** in this session (no `mcp__mediavine-reporting__*` tool exposed, as on 10-18 → 10-21) → Mediavine reporting API via `scripts/mcp-mediavine/client.ts` direct (scratch `/tmp/rio-1023/mv.mts`, `loadConfig()` from the worktree's `scripts/mcp-mediavine/.env.local`; `earnings` rows 09-22 → 10-22, `healthCheckStatus`, `tokenDaysRemaining`). The 10-23 guardrail (`guardrail-2026-10-23.{md,json}`, Mediavine-sourced; `sessionsExSegment` = GA4 property 437117335 via E227) and the 10-23 scoreboard, both from Quinn's tree; two GA4 Data API reports (10-21 site sessions/pageviews; same with `country = Singapore AND sessionSource = (direct)`); `reports/funnel/history.json` (Quinn's tree, 28 of 28 days measured in each window); `guardrail-agreement-tracker.ts` with `MHM_PROJECT_DIR=` Quinn's tree; `affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-22` (production DB read-only + Impact); `git log --since=2026-10-17 -- '*functions.php'`. Counts and dollars only; no patron identity, email, click id or token was read into this file.

## 1. Circuit breaker (guardrail 2026-10-23, finalized 10-21 Wednesday)

GREEN, action none. Health all ok (ads.txt, privacy policy, 2026/10/23). Vercel coverage COMPLETE (160 rows / 8 pages); 83 in-window deploys exceed the 24 rollback bound → withheld, and not wanted (§1c).

**Decision rule, printed before the read.** Breaker thresholds are Mediavine-raw and one-sided: a day is on line at ≥95% of its 4-same-weekday mean revenue; yellow under 90%; red needs RPM <85% *and* revenue <80%, or health not ok. Verdict classification (E216/E227, unchanged since 10-17): print the identity `revenue = mon_pv × imp/mon_pv × CPM` for the day and its controls first; subtract the **whole** `country = Singapore AND sessionSource = (direct)` segment on the GA4 basis; **mix** iff ex-segment RPM lands within ±1% of its 4-week mean *whatever direction the headline moved*; otherwise rate, and a **site change** iff an in-window deploy touched a surface earning >2% of the day's revenue or an ad marker failed; **Mediavine-side** iff the rate move is broad with no touched surface. A day on line (≥95%) triggers no site test; the ex-segment print is still owed so a mix-driven *gain* is not booked as demand.

### 1a. The identity, day vs controls (Mediavine `earnings`)

| | 2026-10-21 (Wed) | 4-Wed mean (09-23 / 09-30 / 10-07 / 10-14) | Δ |
|---|--:|--:|--:|
| revenue | **$187.68** | $186.84 | **+0.45%** |
| monetizable pageviews | 14,410 | 14,251 | +1.1% |
| paid impressions / monetizable pv | 13.188 | 13.245 | −0.4% |
| CPM ($ per 1k paid imp) | $0.9876 | $0.9899 | −0.2% |
| product of the three legs | | | +0.45% (= the printed delta) |
| sessions | 11,375 | 11,648.75 | −2.35% |
| monetizable sessions | 6,587 | 6,590.3 | −0.05% |
| monetizable share of sessions | 57.91% | 56.57% | +1.3 pt |
| session RPM | 16.49 | 16.08 (guardrail) / 16.04 (blended) | +2.5% / +2.9% |
| monetizable-session RPM | 28.49 | 28.35 | **+0.5%** |
| monetizable pv per monetizable session | 2.188 | 2.162 | +1.2% |
| paid impressions | 190,037 | 188,753 | +0.7% |
| viewability | 56.3 | 56.25 | flat |

Controls read $198.91 / 11,769 · $151.76 / 11,212 · $201.43 / 10,786 · $195.26 / 12,828 — mean $186.84 / 11,648.75, identical to the guardrail's expectation. Every leg within ±1.1%: a flat demand day.

### 1b. Segment share and the ex-segment RPM (GA4, E216/E227)

- Site 11,160 sessions / 17,692 pageviews; segment **139 sessions / 138 pageviews = 1.25%** of the day (controls 734.5 = 6.29%, 4 same weekdays). Reproduced on the Data API exactly (139 / 11,160 = the guardrail's own numbers). Ex-segment sessions 11,021 vs 10,934.75 (**+0.8%**) against the raw −4.4%.
- **Mix alone predicts RPM (1 − 0.0125) / (1 − 0.0629) − 1 = +5.4%.** The printed RPM is +2.5%, so the whole gain and more is the segment shrinking. Ex-segment RPM on the GA4 basis: $187.68 / 11,021 = **$17.03 vs $186.84 / 10,934.75 = $17.09 (−0.3%)** — inside ±1%, mix. Mediavine's GA4-free split agrees: monetizable share +1.3 pt (that is the mix), monetizable-session RPM +0.5% (that is the rate).
- Consequence: today's "+2.5% RPM" is not a demand lift and must not be read as one; the real-audience rate is where it was.

### 1c. Site side

The day is at 100.4% of line, so no deploy test is triggered. For the record: 83 in-window deploys (10-18 04:00Z →) are funnel ledger / paper / Tier 0 merges plus #339 (operator, creators portal, 10-19 00:04Z) and #335 (eyes-cc hub, 10-19) — both classified on 10-21 as surfaces earning 0% of the top-100 revenue. `git log --since=2026-10-17 -- '*functions.php'` is empty; guardrail health ok at 10-23. **No rollback wanted.**

### 1d. The 3-day −6.4% / −7.6%, decomposed

| Day | Actual | Line | Δ | $ gap | Share of the 3-day gap |
|---|--:|--:|--:|--:|--:|
| 10-19 Mon | $161.82 | $187.26 | −13.6% | −$25.44 | 70% |
| 10-20 Tue | $179.30 | $190.82 | −6.0% | −$11.52 | 32% |
| 10-21 Wed | $187.68 | $186.84 | +0.4% | +$0.84 | −2% |
| **3-day** | **$528.80** | **$564.92** | **−6.4%** | −$36.12 | |

3-day RPM 14.69 vs 15.90 (−7.6%) is the same Monday: 10-19 RPM 12.38 on 13,067 sessions (segment 11.38%). 10-20 recovered on Mediavine's own split — monetizable share 57.75% (10-19: 52.06%), monetizable-session RPM 26.86 (23.78), CPM $0.975 (0.921). **10-19 leaves the 3-day window on the 10-24 morning** (judged 10-22, window 10-20 → 10-22); if 10-22 finalizes at its partial, that window reads $546.95 vs $556.63 (−1.7%). No action attaches to the 3-day line — the breaker grades the day, and the day is on line.

### 1e. Next day

10-22 partial (sessions unpopulated): **$179.97 vs its $178.97 Thursday line (100.6%)**, 183,128 paid impressions at CPM $0.983. The guardrail judges it tomorrow.

## 2. Grades (rule first, then the reading)

### E255 — yellow verdict 10-21 (read 10-22, taken today because the 10-22 run MISSED)

- **Rule as written 10-21:** 10-20 finalizes ≥90% of $190.82 = **$171.74** (one-day dip confirmed, Tier 1 resumes) AND 28d 09-23 → 10-20 ≥97% both (10-20 ≥ $98.28); if 10-20 <90% with no deploy named → operator asks Mediavine support (T2), partners re-read before any other move.
- **Reading:** 10-20 finalized **$179.30 = 93.96%** of $190.82 (the 10-21 partial to the cent; Mediavine's earnings row did not move) — MET. 28d 09-23 → 10-20 (history.json, 28/28 days): **$5,830.10 / $5,926.89 = 98.37%**; sessions **364,906 / 355,348 = 102.69%** — MET. The <90% clause did not fire; no Mediavine ticket.
- **Verdict: KEEP** — the 10-19 Monday was a one-day Mediavine-side rate dip, as diagnosed. Tier 1 resumes today on the green breaker.

### E248 forward leg (written 10-21: "10-21 needs ≥ $123.84") and the 28d line

- 10-21 finalized $187.68 ≥ $123.84 — MET. **28d 09-24 → 10-21:** revenue **$5,818.87 / $5,933.02 = 98.08%**; sessions **364,512 / 355,601 = 102.51%** — ON LINE run 20. Scoreboard prints the same $5,818.87 (−1.4% vs prior 28d).
- **Forward, printed before the day lands — 10-24 read (09-25 → 10-22):** expected $5,930.66, actual-so-far $5,614.59 → 10-22 needs ≥ **$138.15** (77% of its $178.97 line); partial $179.97 → holds by arithmetic.

### E241 — tracker, 10-23 morning

Rule as the tool prints it: WIRE only if all 7 mornings print both lines and agree within 3 pts; any disagreeing morning → HOLD; fewer than 7 with both lines → INSUFFICIENT.

> **HOLD** — 1 of 7 mornings disagree (> 3 pts): 2026-10-21

| Morning | Judged | MV Δ | GA4 raw Δ | Gap | Ex-seg Δ | Share | State |
|---|---|--:|--:|--:|--:|--:|---|
| 2026-10-17 | 2026-10-15 | +14.0% | — | — | — | — | absent (pre-#326) |
| 2026-10-18 | 2026-10-16 | +2.8% | +1.9% | 0.9 pt | +0.1% | 4.22% | agree |
| 2026-10-19 | 2026-10-17 | +13.6% | +15.6% | 2.0 pt | +5.0% | 11.20% | agree |
| 2026-10-20 | 2026-10-18 | +1.6% | +2.3% | 0.6 pt | −3.4% | 10.62% | agree |
| 2026-10-21 | 2026-10-19 | +4.7% | +9.4% | **4.7 pt** | +1.6% | 11.38% | **disagree** |
| 2026-10-22 | 2026-10-20 | +0.6% | −0.6% | 1.2 pt | −0.5% | 2.92% | agree |
| 2026-10-23 | 2026-10-21 | −2.4% | −4.4% | 2.0 pt | +0.8% | 1.25% | agree |

- The 10-22 guardrail JSON exists (morning-check ledger `221e541`) although the agent run MISSED at preflight — the breaker step fired before the OAuth check, so the tracker has a reading for that morning and the gate does not move. **Earliest WIRE is still 10-28**, and only if 10-24 → 10-28 all fire and agree (10-22, 10-23 already do). Inbox line unchanged.

### E213 — Q29 dropped 10-22 (recorded today)

- Rule as written 10-15: `Q29: apply 5848` by 10-22 → apply + verify 7 tags live; silence → drop, Amazon leg "unmeasurable" on 11-11.
- Reading: silence through 10-22; Quinn dropped Q29 under the 7-day rule (recorded 10-23 because the 10-22 run never started). **The Amazon leg of the 11-11 affiliate read grades "unmeasurable", not $0.** A later `Q29: apply 5848` still executes as written. E213 stays MORE DATA for the Impact leg only (11-11).

## 3. Affiliates / B2 — E134 interim pipe read 09-29 → 10-22 (24 d)

Rule (E153, printed by the tool): confirmed when on-site `gtracing` ≥10 AND Impact-recorded ÷ on-site ≥50%. **CONFIRMED** again: gtracing **18 on-site / 13 Impact clicks / 0 actions / $0 (72.2%)**; all partners on-site 30 (≈ 8.75 per 7 d); Impact by campaign GTPLAYER-US 13 / 0, Envato 9 / 0, Canva 3 / 0 — $0.00 everywhere. Kill clock from 10-12, **reads 11-11** (KILL to E13's stance if actions are still 0). `affiliate_click` 7d: GA4 9 (10-15 → 10-21), DB 11 / 30d 40 — above E234's ≥5 bar for 10-29. B2 stays affiliates-only through 10-31; nothing to ship on the pipe.

Non-ad this morning: Patreon public 61 paid ≈ **$159/mo** gross (14 × $1, 45 × $3, 2 × $5; +2 Cappuccino since 10-21), Members API 63 ≈ $165.50; affiliates $0; membership / sponsorship $0 → **$159–165.50/mo vs the $450 target**. Paid joins / cancels 7d 5 / 0; `patreon_click` 9.29 users/day vs 8.75 baseline.

## 4. Operator — Q32, Mediavine reporting token (Tier 2, env var, operator-only)

`tokenDaysRemaining` reads **20 days → expires ≈ 2026-11-12**. The guardrail, scoreboard, history, page-rpm snapshot and daily report all authenticate through `scripts/mcp-mediavine/config.ts` from `scripts/mcp-mediavine/.env.local` (`MEDIAVINE_JWT`, name only; the runner copies that file from the main checkout into each worktree). No `app/` or `lib/` code reads it (repo grep 0), so there is nothing to set in Vercel. `revenue-guardrail.ts` has no catch around its Mediavine pull: an expired token throws out of `pull()`, no `guardrail-<date>.json` is written, and `run-funnel-daily.sh` carries `GUARD_STATUS=unknown` (its default when the JSON is absent) into the day — **no graded breaker**, no rollback, and by the standing rule a could-not-run is WARN, so Tier 1 stalls rather than rolls back; the scoreboard flags "Mediavine unavailable" and `history.json` rows go null (28d line unmeasurable). The renewal is a once-a-year paste (README §Auth); full package text in the operator queue.

## Consequence

Green on the day, flat on every leg of the identity; the headline RPM gain is the segment shrinking, not demand. 3-day shortfall is Monday and rolls off 10-24. E255 KEEP, 28d on line run 20, tracker HOLD through 10-27 by construction, pipe confirmed and $0, token renewal filed with a date.

— Rio, Product & Revenue
