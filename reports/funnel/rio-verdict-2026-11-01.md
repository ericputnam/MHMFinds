# Rio — verdict 2026-11-01 (E315): 10-30 is a rate day; E288 tracker WIRE 7/7; rate alone cannot reach the November ramp; November non-ad line $250 / $155

Circuit breaker 🟢 GREEN, action none (`guardrail-2026-11-01.md`): judged day **2026-10-30 $211.61 vs $195.51 (+8.2%)**, RPM $19.11 vs $16.47 (+16.0%), sessions 11,071 vs 11,864 (−6.7%); 3-day $615.21 vs $552.44 (+11.4%); health ok; rollback withheld (75 in-window deploys > bound 24). Sources: Mediavine daily series via `scripts/mcp-mediavine/client.ts` → `earnings('2026-09-05','2026-10-30')` direct (the Mediavine MCP was not connected this session, per dispatch; rows carry `2026/09/05`-style dates — normalized before slicing); `guardrail-agreement-tracker.ts --mornings 7 --tol 3` over the landed `guardrail-*.json` files incl. today's; `history.json → expectation` (the straight ramp); scoreboard `2026-11-01.md`; Patreon public page + Members API via the scoreboard. No Mediavine token, Patreon token or Impact token is printed anywhere in this file. Token days remaining per `tokenDaysRemaining()`: **11** (Q32).

## (a) Guardrail verdict for the digest — 10-30: rate, nothing implicated

**One line:** *10-30 revenue +8.2% is a rate day (ex-segment RPM $19.11 vs $16.76 = +14.1%; the Singapore segment moved only 2.49% → 1.86% of sessions, so mix predicts just +0.6%); sessions −6.7% on Mediavine / −5.1% ex-segment are the volume side and Pip's; 75 in-window deploys, none implicated — the deploy-heaviest week of the 28 (W4) is also its best on RPM (+14.1%), CPM (+9.0%) and revenue (+9.8%).*

Detail (E271 print, second production morning, `guardrail-2026-11-01.json → sessionsExSegmentRpm`: actual 19.114, expected 16.758, exSegmentRpmDelta +0.1406, mixPredictedRpmDelta +0.0065, read `rate`). The last seven finalized days: 10-24 $269.81 (RPM $18.96), 10-25 $281.32 ($18.54), 10-26 $198.09 ($16.32), 10-27 $190.69 ($15.53), 10-28 $204.68 ($17.79), 10-29 $198.92 ($17.51), 10-30 $211.61 ($19.11, CPM $1.0612 — the highest CPM of the week after 10-24). Health ok all 28 days; the one `functions.php` push in the window (#391, 10-27 00:45Z) has a PASS ledger row and the blog markers are present. No rollback, no ad-surface change, no Mediavine ticket.

## (b) E288 tracker leg (due 11-01) — WIRE

Keep rule as written in `experiments.md` E288: *tracker 7/7 landed → WIRE PR, else HOLD*. The pre-committed E241 rule the tracker encodes: over the last 7 guardrail mornings, every morning prints both sessions lines **and** |Mediavine Δ − GA4 raw Δ| ≤ 3 pts; any disagreeing morning → HOLD; fewer than 7 with both lines → INSUFFICIENT.

Read 11-01 (`guardrail-agreement-tracker.ts --mornings 7 --tol 3`, exit 0; window by file presence = 10-22, 10-23, 10-28, 10-29, 10-30, 10-31, 11-01 — 10-24→10-27 have no JSON on `main` and are missed runs, not readings):

| Morning | Judged | MV Δ | GA4 raw Δ | Gap | Ex-seg Δ | Seg share | State |
|---|---|--:|--:|--:|--:|--:|---|
| 10-22 | 10-20 | +0.6% | −0.6% | 1.2 pt | −0.5% | 2.92% | agree |
| 10-23 | 10-21 | −2.4% | −4.4% | 2.0 pt | +0.8% | 1.25% | agree |
| 10-28 | 10-26 | −5.3% | −5.8% | 0.5 pt | −0.7% | 2.07% | agree |
| 10-29 | 10-27 | +6.6% | +7.4% | 0.8 pt | +6.7% | 4.13% | agree |
| 10-30 | 10-28 | −0.4% | +2.5% | 2.9 pt | +5.5% | 2.65% | agree |
| 10-31 | 10-29 | −3.0% | −2.6% | 0.4 pt | +4.2% | 1.77% | agree |
| 11-01 | 10-30 | −6.7% | −5.7% | 1.0 pt | −5.1% | 1.86% | agree |

**7 of 7 agree within ±3 pts (max gap 2.9 pt on 10-30) → WIRE.** The 10-21 disagreement (4.7 pt) that held E241 on 10-28 and 10-29 has rolled out of the window; this is the first time since E241 was filed (10-19) that seven consecutive landed mornings carry both lines and agree.

What WIRE means and does not mean: the red-traffic leg (*sessions < 80% with RPM intact*) is the only status rule the ex-segment ratio joins; it is Pip's incident rule, never a rollback trigger, so wiring changes which sessions number trips a Pip incident and nothing about rollbacks. Today's dispatch is paper plus one-line print fixes only, so **the wiring PR is queued as E315's code leg for the next run** (Tier 1 — a status rule in `revenue-guardrail.ts`; 24 h veto): red-traffic reads `sessionsExSegment.exSegment.actual / expected` when the GA4 line is present and falls back to the Mediavine sessions line (byte-identical to today) when it prints `unavailable`; a test asserts red-rpm and yellow never read it. E241/E262/E288's diagnostic prints stay as they are.

## (c) The RPM read: 28d anchored 10-30 — rate is up, volume is flat, and the ramp needs volume

**MV 28d decomposition** (prior 09-05→10-02 vs current 10-03→10-30; reproduces the scoreboard's −2.0% exactly):

| | prior 09-05→10-02 | current 10-03→10-30 | Δ |
|---|--:|--:|--:|
| revenue | $6,052.22 | $5,928.99 | **−2.04%** |
| sessions (MV) | 357,447 | 359,583 | +0.60% |
| session RPM | $16.93 | $16.49 | **−2.62%** |
| monetizable pv | 447,261 | 444,040 | −0.72% |
| paid imp / mon pv | 14.457 | 13.231 | **−8.48%** |
| CPM | $0.9360 | $1.0092 | **+7.82%** |

Identity check: (1 − 0.0072) × (1 − 0.0848) × (1 + 0.0782) − 1 = −2.04%. Fewer paid impressions per page (−8.5%) at a better price (+7.8%) net to −1.3% on mon-pv RPM; the remaining −0.7% is pageviews. **Rate, not deploys**: the impressions-per-page drop is the same quarter-boundary pattern the 10-01/10-02 verdicts named, and it is concentrated in W1–W2.

By week (current vs the same weekdays four weeks earlier):

| Week | revenue | sessions | RPM | imp/mon pv | CPM |
|---|--:|--:|--:|--:|--:|
| W1 10-03→10-09 | $1,602.85 → $1,393.79 (**−13.0%**) | −5.0% | −8.5% | −13.5% | +8.1% |
| W2 10-10→10-16 | $1,489.72 → $1,512.09 (+1.5%) | +8.8% | −6.7% | −14.4% | +11.6% |
| W3 10-17→10-23 | $1,542.72 → $1,467.99 (−4.8%) | +2.8% | −7.5% | −3.6% | +2.1% |
| W4 10-24→10-30 | $1,416.93 → $1,555.12 (**+9.8%**) | −3.8% | **+14.1%** | −1.1% | **+9.0%** |

W1 alone is −$209.06 = **170% of the −$123.23 28d gap**; W2–W4 together are +$85.83. 7d $1,555.12 vs $1,467.99 (+5.9%, RPM $17.72 vs $15.95). Roll-off: 10-03→10-06 ($804.53 vs $1,023.15, −21.4%) leaves the window at anchor 11-03 (printed 11-05 morning) — the 28d headline turns positive then with no action from us. October calendar month (30 reported days) $6,218.51 at RPM $16.26 vs the August baseline $6,066.16 at $15.09.

**Can November reach the ramp on rate alone? No.** The expectation line in `history.json` is a straight ramp from $5,569.43 / 363,007 sessions per 28 d (08-31) to $9,081.03 / 541,935 (12-31). On 10-30 the line reads **$7,296.45 / 451,004** → current 28d is **81.3% on revenue and 79.7% on sessions** (the watch block's 82.7% / 80.1% anchors a day earlier). On 11-30 the line reads **$8,188.74 / 496,470**, implied RPM $16.49 — exactly today's RPM. The arithmetic:

- revenue = sessions × RPM / 1000. At **flat volume (359,583)** the line needs RPM **$22.77 = +38.1%** over $16.49 — above the June peak ($21.92, which was itself a demand-side high the site has not seen since, SD-5), and even at that peak flat volume yields $7,882 = 96% of the line.
- At **today's RPM** the line needs **496,588 sessions = +38.1%** volume — which is the ramp's own sessions line, by construction.
- W4's +14.1% RPM, the best week of the 28, applied to all of November at flat volume gives $6,765 = 83% of the line.

**One sentence for the digest:** *November's ad line is a volume problem — the ramp's implied RPM is $16.49, which we already earn, so rate cannot close an 18.7-point revenue gap that is 20.3 points of sessions; every rate point we gain is kept, but the line is reached by sessions or not at all.*

## (d) November non-ad line for the bets rewrite — $250 with Q37-A, $155 without; $750 needs ~200 new $3 patrons or two sponsors

Base 11-01: Patreon public **$144.00/mo gross** (56 paid: 14×$1, 40×$3, 2×$5); Members API **$153.50** (57: 13×$1, 41×$3, 2×$5, 1×$8); $3 joins 7d 2 (0.29/day); paid joins/cancels 7d 4/1; `patreon_click` 9.86 users/day vs 8.75 E40 baseline; membership $0, premium editions $0, sponsorship $0, affiliates $0 (Impact 20 clicks / 0 actions on the repaired pipe; Amazon block clicks only, dollars operator-only). Revenue per 1K sessions, 28d: ad $16.49 + non-ad ≈ $0.40 = **$16.89**.

**Confirmed, not revised:** **$250/mo if Q37-A is answered by 11-05 and E294 is posted by 11-08** (Patreon hold $148 + perk at 0.5% of 6,393 free → +32 × $3 = +$96 + affiliates $0 + sponsorship $0); **$155/mo if Q37 is unanswered** (hold + the E294 post's organic $3 joins at the 0.29/day pace ≈ +8 × $3 = +$24, rounded down for the 1/week cancel pace). Read 11-30.

**What a $750 month needs, in units** (targets.json `monthly.nonAdRevenue["2026-11"]`), gap **$602** over the $148 hold:
- **Patreon alone:** +201 $3 patrons (5× the current 40) — at 0.29 joins/day that is 23 months; at the 0.5% perk assumption it is 6 announcement cycles. Or +120 $5 patrons (60× the current 2).
- **Sponsorship alone:** two "presented by" sponsors at $300/mo (the deck's floor; $1,000 ceiling). Zero outreach has been sent; the operator sends the emails (Tier 2).
- **Mixed, the only plausible shape:** one sponsor $300 + Q37-A at 1% (+$192) + Patreon hold $148 = **$640**, still $110 short. **$750 is not reachable in November from the levers the team can pull; the honest line is $250/$155 and the gap is sponsorship, which is operator-sent.**

Kill rules, one per lever (read 11-30 unless stated):
- **Patreon / Q37-A perk:** kill the perk pitch if $3 joins in the 7 days after the E294 post are **< 4** (1.5× the 0.29/day baseline over 7 d); the pricing itself stays Tier 2.
- **E294 post (organic leg):** Cass's rule stands (< 30 tagged sessions → kill); my leg: if the post produces **0 paid joins in 7 d**, the "announce on Patreon" premise joins E40's "announce on /go" as a negative result on the constant.
- **Affiliates (E134/E306):** Impact **$0 on 11-11 → KILL** to E13's stance; blog Amazon block **< 5 clicks/day** over 10-27→11-10 → drop the Amazon line from the forecast (dollars stay PENDING on the operator's Associates report).
- **Sponsorship:** no deck sent by **11-15** → $0 for November, and the line is re-pitched for December only with a named prospect.
- **Membership / premium editions:** $0, not a November bet (no product, Q4 closed); no kill rule because nothing is running.

## (e) Q32 re-pitch (≤3 lines, 11 days left)

**Q32 — Mediavine reporting token expires ≈ 2026-11-12 (11 days).** On expiry `revenue-guardrail.ts` throws on its Mediavine pull → no `guardrail-<date>.json`, `GUARD_STATUS=unknown` → the breaker can neither clear nor trip and Tier 1 merges stall; the scoreboard's 28d headline and `history.json` revenue rows go null (the ramp becomes unmeasurable the week W1 rolls off).
Renewal is a once-a-year paste, Vercel untouched: log in at reporting.mediavine.com → DevTools console `copy(JSON.parse(localStorage.dashboard).jwt)` → in the main checkout `{ echo "MEDIAVINE_JWT=$(pbpaste)"; echo "MEDIAVINE_SITE_ID=14318"; } > scripts/mcp-mediavine/.env.local` → `npx tsx scripts/mcp-mediavine/server.ts --selftest` (metrics JSON = good; `AUTH_EXPIRED` = stale).
Reply **"Q32: done"**; past 11-12 the team runs Tier 0 on GA4 only until renewed.

## (f) Experiments / queue text for Quinn (verbatim; `.claude/` edits are Quinn's)

E288 Result cell: `11-01: tracker 7/7 agree (max gap 2.9 pt, 10-22→11-01 by file presence; 10-21's 4.7 pt rolled out) → WIRE; 28d −2.04% = sessions +0.60% × RPM −2.62% (imp/mon-pv −8.48%, CPM +7.82%), W1 −$209 = 170% of the gap, roll-off 11-03; Q34 superseded by Q37` · Verdict cell: `WIRE (11-01) — wiring PR is E315 code leg, Tier 1, next run`.

E315 row: `| E315 | 2026-11-01 | Rio | 0 | MONETIZE | Verdict 11-01 (rio-verdict-2026-11-01.md, paper): 10-30 rate day (ex-seg RPM +14.1%, mix +0.6%, 75 deploys none implicated); E288 tracker WIRE 7/7; 28d −2.04% decomposed (W1 170% of gap); November ramp needs RPM $22.77 (+38%) at flat volume → volume problem; Nov non-ad line $250 (Q37-A by 11-05 + E294 by 11-08) / $155; $750 = +201 $3 patrons or 2 sponsors. Code leg (next run, Tier 1): red-traffic reads sessionsExSegment when present, MV fallback byte-identical, test that red-rpm/yellow never read it | red-traffic status on the first morning after wiring vs the MV-only rule; Nov non-ad $/mo | 28d $5,928.99 / 359,583 = 81.3% / 79.7% of the 10-30 line; non-ad $144 public / $153.50 API | 2026-11-05 (roll-off + Q37) / 2026-11-30 (non-ad) | 28d headline ≥ 0% on 11-05 with no ad change; wiring PR merged with status byte-identical on a GA4-absent morning; non-ad ≥ $250 with Q37-A else ≥ $155 | — | PENDING |`

Operator queue: **Q37** unchanged (A recommended, +$96/mo at 0.5%, decide by 11-05) — add one line: *$750 for November is +201 $3 patrons or two $300 sponsors; the team's reachable line is $250 (A) / $155 (silence).* **Q32** re-pitched 11-01 with the three lines in (e); hard date 2026-11-12.

— Rio, Product & Revenue
