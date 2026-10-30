VERDICT: GREEN, nothing to roll back — 10-23 Friday finalized $213.63 vs $196.45 (+8.7%) and the identity `revenue = monetizable pv × paid imp/mon pv × CPM` reads 14,644 (−2.1%) × 13.958 (+5.9%) × $1.0452 (+4.8%) = +8.75%, the printed delta. The headline RPM +10.8% is **rate, not mix**: the Singapore (direct) segment was 228 sessions = 1.92% of the GA4 day vs 3.03% on the controls, which by mix alone predicts only +1.1%, and ex-segment RPM reads **$18.38 vs $16.61 (+10.7%)**; Mediavine's own monetizable-session RPM agrees at +9.3%, with both rate legs up (fill +5.9%, CPM +4.8%) — Mediavine-side demand, no touched surface earning >2% of the day. 3-day +3.4% ($581.28 vs $562.26). 28d 09-26→10-23 **$5,790.80 = 97.7% of the OLD line ($5,925.50)**; against the operator's **NEW line** (history.json ramp $5,569.43 → $9,081.03, at 10-23 = $7,094.96 = ad $6,642.74 + non-ad $452.22) the 28d read is **$5,936.33 = 83.7%** (ad 87.2%, non-ad 32.2%), a gap of **$1,158.63 per 28 d = $41.38/day**, 73.5% of it ads. Closing the ad gap alone needs **+1,908 sessions/day at the current $15.95 RPM (+14.7%)** or **RPM $18.30 at the current 12,966 sessions/day (+14.7%)**; the whole gap needs +2,594 sessions/day (+20.0%) or RPM $19.14. E262's 10-22 leg **MET**: $179.97 ≥ $138.15 (100.6% of its $178.97 Thursday line). E271 shipped: the guardrail now prints the ex-segment RPM and a mix/rate read every morning.
MERGES: clear on the breaker — green, health ok; team posture BELOW LINE by directive (Tier 0 / AUDIENCE-framed only), which this move honours
ROLLBACK-WANTED: none — the day is at 108.7% of line; no deploy test is triggered; `functions.php` has no commit since before the window; all markers OK at 10-25 (guardrail health)

# Rio verdict — 10-23 Friday: rate day (+10.7% ex-segment), not mix; 83.7% of the NEW 28d line; E262 10-22 leg MET; E271 ex-segment RPM print ships — read 2026-10-25 (E271)

**Sources.** **MV MCP unavailable** in this session (no `mcp__mediavine-reporting__*` tool exposed, as on 10-18 → 10-23) → Mediavine reporting API via `scripts/mcp-mediavine/client.ts` direct (scratch `/tmp/rio-1025/mv.mts`, `loadConfig()` from this worktree's `scripts/mcp-mediavine/.env.local`; `earnings` rows 09-24 → 10-24, `healthCheckStatus`, `tokenDaysRemaining`). The 10-25 guardrail (`guardrail-2026-10-25.{md,json}`, Mediavine-sourced; `sessionsExSegment` = GA4 property 437117335 via E227) and the 10-25 scoreboard, both from Quinn's tree; `reports/funnel/history.json` (Quinn's tree, 28 of 28 days measured 09-26 → 10-23; `expectation` block = the 10-24 directive's ramp) with `lib/funnel/dashboardMath.ts`'s `interpolateExpectation` reproduced by hand; production DB read-only (`AffiliateClick` × `AffiliateOffer`, counts by `pageUrl` path / `sourceType` / partner, 09-25 → 10-24; scratch `/tmp/rio-1025/aff.mts`); `git log origin/main --since=2026-10-19 -- staging/wordpress/kadence-child-prod/functions.php`. Counts and dollars only; no patron identity, email, click id, IP or token was read into this file.

## 1. Circuit breaker (guardrail 2026-10-25, finalized 10-23 Friday)

GREEN, action none. Health all ok (ads.txt, privacy policy, 2026/10/25). Vercel coverage COMPLETE (100 rows / 5 pages); 57 in-window deploys exceed the 24 rollback bound → withheld, and not wanted (§1c).

**Decision rule, printed before the read.** Breaker thresholds are Mediavine-raw and one-sided: a day is on line at ≥95% of its 4-same-weekday mean revenue; yellow under 90%; red needs RPM <85% *and* revenue <80%, or health not ok. Verdict classification (E216/E227, unchanged since 10-17): print the identity `revenue = mon_pv × imp/mon_pv × CPM` for the day and its controls first; subtract the **whole** `country = Singapore AND sessionSource = (direct)` segment on the GA4 basis; **mix** iff ex-segment RPM lands within ±1% of its 4-week mean *whatever direction the headline moved*; otherwise rate, and a **site change** iff an in-window deploy touched a surface earning >2% of the day's revenue or an ad marker failed; **Mediavine-side** iff the rate move is broad with no touched surface. A day on line (≥95%) triggers no site test; the ex-segment print is still owed so a mix-driven *gain* is not booked as demand. From tomorrow the guardrail prints this read itself (E271, §4).

### 1a. The identity, day vs controls (Mediavine `earnings`)

| | 2026-10-23 (Fri) | 4-Fri mean (09-25 / 10-02 / 10-09 / 10-16) | Δ |
|---|--:|--:|--:|
| revenue | **$213.63** | $196.45 | **+8.75%** |
| monetizable pageviews | 14,644 | 14,951 | −2.1% |
| paid impressions / monetizable pv | 13.958 | 13.177 | **+5.9%** |
| CPM ($ per 1k paid imp) | $1.0452 | $0.9971 | **+4.8%** |
| product of the three legs | | | +8.75% (= the printed delta) |
| sessions | 11,888 | 12,094.3 | −1.7% |
| monetizable sessions | 6,967 | 7,003.5 | −0.5% |
| monetizable share of sessions | 58.61% | 57.91% | +0.7 pt |
| session RPM | 17.97 | 16.215 (guardrail, mean of RPMs) / 16.24 (blended) | +10.8% / +10.6% |
| monetizable-session RPM | 30.66 | 28.05 | **+9.3%** |
| monetizable pv per monetizable session | 2.102 | 2.135 | −1.5% |
| paid impressions | 204,401 | 197,012 | +3.8% |
| viewability | 56.3 | 56.2 | flat |

Controls read $217.39 / 12,811 · $152.46 / 11,710 · $208.34 / 11,569 · $207.61 / 12,287 — mean $196.45 / 12,094.25, identical to the guardrail's expectation. The audience leg (mon_pv) is slightly *down*; the whole gain is the two rate legs, fill and price, both up — the mirror image of 10-19's dip (fill −2.9%, CPM −3.8%).

### 1b. Segment share and the ex-segment RPM (GA4, E216/E227)

- Site 11,849 sessions; segment **228 = 1.92%** of the day (controls 369 = 3.03%, 4 same Fridays). Ex-segment sessions 11,621 vs 11,828.75 (**−1.8%**) against the raw −2.9%; the Mediavine basis reads −1.7% — the two bases agree within 1.2 pt (E241 tracker: agree).
- **Mix alone predicts RPM (1 − 0.0192) / (1 − 0.0303) − 1 = +1.1%.** The printed RPM is +10.8%, so mix explains a tenth of it. Ex-segment RPM on the GA4 basis: $213.63 / 11,621 = **$18.38 vs $196.45 / 11,828.75 = $16.61 (+10.7%)** — outside ±1%, **rate**. Mediavine's GA4-free split agrees: monetizable share +0.7 pt (small mix), monetizable-session RPM +9.3% (the rate).
- Consequence: 10-23 is a genuine demand day on the real audience, not a denominator artefact. Noted as such, not booked as a trend: one Thursday, and 10-19 Monday was the same magnitude the other way.

### 1c. Site side

The day is at 108.7% of line, so no deploy test is triggered. For the record: the 57 in-window deploys (10-20 04:00Z →) are funnel ledger / paper / Tier 0 merges plus Sage's E259 homepage `<title>` change (#367, 10-23 12:26Z — the home page earned 3.1% of the top-100 revenue on the 10-21 read and a title does not move ad geometry), Nova's E260 (a counting lib), Rowan's E263 (catalog data) and Cass's E247 send. `git log origin/main --since=2026-10-19 -- …/functions.php` is empty; guardrail health ok at 10-25. **No rollback wanted.**

### 1d. The 3-day +3.4%

| Day | Actual | Line | Δ |
|---|--:|--:|--:|
| 10-21 Wed | $187.68 | $186.84 | +0.4% |
| 10-22 Thu | $179.97 | $178.97 | +0.6% |
| 10-23 Fri | $213.63 | $196.45 | +8.7% |
| **3-day** | **$581.28** | **$562.26** | **+3.4%** |

10-19 Monday rolled off on the 10-24 morning as forecast on 10-23; the window is now three on-line days. 3-day RPM 16.79 vs 15.78 (+6.4%) is 10-23's rate.

### 1e. Next day

10-24 Saturday partial (sessions unpopulated): **$269.81 vs its $265.20 Saturday line (101.7%)**, 251,301 paid impressions at CPM $1.074, monetizable-session RPM 32.45. The guardrail judges it on the 10-26 morning (the 10-25 morning already carries it as partial).

## 2. The NEW revenue line (operator directive 10-24) — where we stand, in dollars and in units

**Rule for the read, printed first.** The line is `history.json → expectation` (basis string: straight ramp from the 2026-08 baseline, Mediavine $6,066.16/mo + non-ad $100/mo at 401,901 sessions/mo, to the 2026-12 targets, 600,000 sessions/mo at RPM $15.09 + non-ad $1,000/mo, each prorated to 28 days), interpolated linearly by `dashboardMath.interpolateExpectation` from $5,569.43 (08-31) to $9,081.03 (12-31). Actual is the trailing-28d Mediavine sum plus the non-ad monthly × 28/30.4 (`DAYS_PER_MONTH`), the same arithmetic the dashboard draws. I split the line into its ad and non-ad components by the same proration so each owner sees their own gap.

| 28 d ending 10-23 | Line | Actual | % | Gap / 28 d | Gap / day |
|---|--:|--:|--:|--:|--:|
| ad (Mediavine) | $6,642.74 | $5,790.80 | **87.2%** | $851.94 | $30.43 |
| non-ad (Patreon + affiliates + membership + sponsorship) | $452.22 | $145.53 (= $158/mo × 28/30.4) | **32.2%** | $306.70 | $10.95 |
| **total** | **$7,094.96** | **$5,936.33** | **83.7%** | **$1,158.63** | **$41.38** |
| sessions (Mediavine, 28 d) | 440,738 | 363,023 | 82.4% | 77,715 | 2,776 |

- **Units that close the ad gap** ($851.94 / 28 d): at the current 28d RPM $15.95, **+53,413 sessions / 28 d = +1,908 sessions/day (+14.7%)** on the current 12,966/day; or, at current sessions, **RPM $18.30 (+14.7%)**. The RPM route is SD-5-closed (not a growth lever; today's +10.7% rate day is Mediavine's, not ours), so the ad gap is a sessions gap — Pip/Sage's line, and the directive's own sessions line says the same thing (82.4%).
- **Units that close the non-ad gap** ($306.70 / 28 d): the ramp asks **$491/mo at 10-23** vs **$158/mo** actual (Patreon public 62 paid: 16 × $1, 44 × $3, 2 × $5; Members API 62 ≈ $162.50; affiliates $0; membership / sponsorship $0). Gap **$333/mo ≈ 111 more $3 patrons**, or 1 sponsor at the $300–1,000/mo media-kit rate — the sponsorship deck (lever 4, T0 draft → T2 outreach) is the only non-ad line sized to this gap; B2 stays affiliates-only through 10-31 by directive, so it is next week's package, not today's.
- **Whole gap by one lever alone:** +2,594 sessions/day (+20.0%) or RPM $19.14 (+20.0%) — neither is a real option; the gap is ~¾ sessions and ~¼ non-ad.
- **Reconciliation with this morning's numbers.** `history.json` rows 10-24 / 10-25 carry `expectedRevenue` $265.20 / $261.90 — those are **same-weekday 4-week means** (`funnel-history.ts:446`, Saturday / Sunday), not the ramp; the "≈81%" quoted from them is 10-23 Friday against a Friday mean. The ramp's own daily rate at 10-23 is $253.39 (ad-only $237.24), against which 10-23's $213.63 reads 90.0% and the 28 d reads 83.7% as above. Both are below the line; the 28 d basis is the directive's unit and the one `history.json` grades. The line moves +$29/28 d per day: $7,123.74 (10-24), $7,325.23 (10-31), $7,670.63 (11-12).

## 3. Grades (rule first, then the reading)

### E262 — 10-22 leg (written 10-23: "10-22 needs ≥ $138.15, 77% of its $178.97 line")

- **Reading:** 10-22 finalized **$179.97** (the 10-23 partial to the cent) ≥ $138.15 — **MET**, 100.6% of its own Thursday line. 28 d 09-25 → 10-22 (history.json): the forward arithmetic gave expected $5,930.66 with actual-so-far $5,614.59 + $179.97 = **$5,794.56 = 97.7%** on the old line — ON LINE run 21 by the old rule; the old line is retired by the 10-24 directive, so this is the last read against it.
- **E262 verdict: KEEP** (paper verdict; nothing to roll back). Its 28d leg is superseded by §2 (new line, 83.7%).

### E241 — tracker

Rule as the tool prints it: WIRE only if all 7 mornings print both lines and agree within 3 pts; any disagreeing morning → HOLD; fewer than 7 with both lines → INSUFFICIENT. **10-24's guardrail JSON does not exist** (the 10-24 run MISSED at preflight, 0 bytes — unlike 10-22, the breaker step never fired), so every 7-morning window containing 10-24 is INSUFFICIENT by construction. 10-25 morning: MV −1.7% vs GA4 raw −2.9% = 1.2 pt, agree. **Earliest WIRE moves from 10-28 to 10-31** (window 10-25 → 10-31, all seven must fire and agree). The 10-28 re-read stands as scheduled and will print INSUFFICIENT naming 10-24; no wiring before 10-31.

### E134 / B2 — affiliates, interim per-page read 09-25 → 10-24 (30 d, production DB)

Rule (E153): the pipe is confirmed at on-site gtracing ≥10 AND Impact-recorded ÷ on-site ≥50% — confirmed on 10-23 (18 / 13 / 0, 72.2%); the Impact leg was **not re-pulled today** (pipe reader not run; kill read 11-11 unchanged). What was read today is *where* the clicks come from:

| 30 d (09-25 → 10-24) | clicks | share |
|---|--:|--:|
| `/` (home) × grid | 33 | 82.5% |
| `/games/sims-4` × grid | 7 | 17.5% |
| any other page, any other `sourceType` (interstitial, sidebar) | **0** | 0% |
| by partner: gtracing / Envato Elements | 24 / 16 | 60% / 40% |
| 7 d (10-18 → 10-24) | 13 (home only: gtracing 7, Envato 6) | scoreboard 10 on its own window |

- **Reading:** 100% of affiliate clicks are the `grid` placement on two pages; mod pages, `/go` and the blog carry none because the grid is not on them. The E55 CTR-vs-revenue split stands (clicks exist, revenue is $0 on 40 clicks / ~13 Impact-recorded / 0 actions over 30 d); **no T0 placement fix is proposed** — the only fix outside ad anchors would be a *new* placement, which E134's scope forbids. The B2 "affiliates-only to 10-31" clause has nothing left to ship on the pipe; it runs out its clock to the 11-11 kill read. Earnings table: $0.00 (scoreboard).
- Non-ad total this morning: **$158–162.50/mo vs $450 (B2) and $491 (ramp at 10-23)**. Paid joins / cancels 7 d 6 / 0; `patreon_click` 8.14 users/day vs 8.75 baseline.

## 4. E271 — the ex-segment RPM print ships (Tier 0, ops tooling, PR in the report)

What: `revenue-guardrail-lib.ts` gains `exSegmentRpm()` / `exSegmentRpmLine()` and one exported band constant (`EX_SEGMENT_RPM_MIX_BAND = 0.01`); `revenue-guardrail.ts` computes it from `actualDay.revenue` / `expectedDay.revenue` (Mediavine) over `exSegment` sessions (GA4), writes `sessionsExSegmentRpm` + `…Line` into the JSON, adds a table row and a line to the md and the QUIET print. Informational — the status rules do not read it (a test asserts that). Could-not-run prints `unavailable — <why>` with no digits. The boundary compares `|actual − expected| ≤ band × expected` so a delta exactly on the band reads inside it (the float `101/100 − 1` is `0.010000000000000009`). Tests: 11, pinning 10-23 (rate, +10.7% vs mix +1.1%) and 10-21 (mix, −0.3% vs mix +5.4%); red against pre-fix `origin/main` by module load (`exSegmentRpm is not a function`). Tomorrow's guardrail md will carry the §1b read without a hand step.

## 5. Operator — Q32 (not re-pitched; next 11-05)

`tokenDaysRemaining` reads **17 days → expires ≈ 2026-11-11** (10-23 read 20 d → 11-12; the one-day drift is the read hour). Package unchanged in the queue.

## Consequence

Green and a true rate day: fill +5.9% × CPM +4.8% on a slightly smaller real audience, ex-segment RPM +10.7% — Mediavine's demand, not ours to keep. Against the directive's line the business is at 83.7%, three-quarters of the gap is sessions (+1,908/day at today's RPM), one-quarter is non-ad ($333/mo, the size of one sponsor). E262 KEEP, E241 WIRE no earlier than 10-31, affiliates have nothing to ship before their 11-11 kill read, E271 makes this verdict's §1b a daily machine print.

— Rio, Product & Revenue
