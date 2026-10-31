# Rio — verdict 2026-10-31 (E306): October closes at $144/mo (MISSED); 10-29 was a rate day in our favour; E271 KEEP on its first print

Circuit breaker 🟢 GREEN, action none (`guardrail-2026-10-31.md`): judged day **2026-10-29 $198.92 vs $172.89 (+15.1%)**, RPM $17.50 vs $14.73 (+18.8%), sessions 11,362 vs 11,715 (−3.0%); 3-day $594.29 vs $544.46 (+9.2%); health ok; rollback withheld (34 in-window deploys > bound 24). Sources: Mediavine daily series via `scripts/mcp-mediavine/client.ts` → `earnings('2026-09-04','2026-10-29')` direct (the Mediavine MCP was not attempted — expected CONNECTION_CLOSED per dispatch); GA4 Data API property 437117335 (segment `country = Singapore AND sessionSource = (direct)`, E216; `affiliate_click` by date × pagePath); scoreboard `2026-10-31.json`; Patreon public page + Members API via the scoreboard; `affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-30` on the E306 build. No Mediavine token, Patreon token or Impact token is printed anywhere in this file.

## (a) Guardrail verdict for the digest — 10-29: rate, nothing implicated

**One line:** *10-29 revenue +15.1% is a rate day (ex-segment RPM $17.71 vs $16.04 = +10.4%, on top of a +7.0% mix tailwind from the Singapore segment shrinking 8.22% → 1.77% of sessions); 34 in-window deploys, none implicated — it is a positive day with no rollback candidate.*

Detail (E271's first production print, `guardrail-2026-10-31.json → sessionsExSegmentRpm`): GA4 raw sessions 11,436 vs 11,742 (−2.6%); ex-segment 11,234 vs 10,778 (**+4.2%**); segment 202 vs 963 of controls. Mix alone predicts raw RPM (1−0.0177)/(1−0.0822)−1 = **+7.0%**; observed raw RPM +18.8%; ex-segment RPM +10.4% → **rate** (band ±1%, `EX_SEGMENT_RPM_MIX_BAND`). Status green was decided before the line printed (test-enforced).

**MV 28d decomposition, anchor 10-29** (scoreboard −3.7%; reproduces exactly):

| | prior 09-04→10-01 | current 10-02→10-29 | Δ |
|---|--:|--:|--:|
| revenue | $6,098.23 | $5,869.84 | **−3.75%** |
| sessions (MV) | 357,915 | 360,222 | +0.64% |
| session RPM | $17.04 | $16.30 | **−4.36%** |
| monetizable pv | 448,393 | 442,486 | −1.32% |
| paid imp / mon pv | 14.527 | 13.247 | −8.81% |
| CPM | $0.9362 | $1.0014 | +6.96% |

By week (current vs prior, same weekdays): **W1 10-02→10-08 −$254.58 (−16.0%; sessions −5.0%, RPM −11.5%) = 111% of the −$228.39 gap** — the quarter-boundary CPM trough (10-01/10-02 verdicts); W2 10-09→10-15 +$22.27 (+1.5%; sessions +7.6%, RPM −5.7%, Singapore mix); W3 10-16→10-22 −$71.36 (−4.7%; sessions +4.5%, RPM −8.8%, mix); **W4 10-23→10-29 +$75.28 (+5.1%; sessions −4.0%, RPM +9.5%)** — the week carrying the deploys is the best of the four. 7d $1,557.14 vs $1,461.97 (**+6.5%**, RPM $17.58 vs $15.81). Last five finalized days: 10-25 $281.32 (RPM $18.54), 10-26 $198.09 ($16.32), 10-27 $190.69 ($15.53), 10-28 $204.68 ($17.79), 10-29 $198.92 ($17.51). W1 leaves the window at anchor 11-05 (printed the 11-07 morning); W2–W4 together are **+$26.19 (+0.6%)**, so the 28d headline reads ≈ +0.5% by 11-07 with no action from us — consistent with yesterday's "≈ −1% by 11-06", one week later and one sign better because W4 finished stronger than its 10-30 partial.

**Is a deploy implicated?** No. Everything in the window (10-26→10-29: #388 Launcher, #390/#395/#396 homepage + game pages, #391 blog Amazon block incl. the single `functions.php` push 10-27 00:45Z with a PASS ledger row, E279 hearts, badge, E267/E268 meta, E292/E293/E299 creator pages) sits inside W4, the best week on RPM raw and ex-segment. Health ok all 28 days. No rollback, no ad-surface change, no Mediavine ticket.

## (b) E271 graded — KEEP

Keep rule: numeric line on a GA4 morning, `unavailable — <why>` with no digits otherwise; status byte-identical to the MV-only rule. Read 10-31:

- **Leg 1 (numeric on a GA4 morning): MET 1/1.** 10-31 JSON carries `sessionsExSegmentRpm` = {actual 17.707, expected 16.042, exSegmentRpmDelta +0.1038, mixPredictedRpmDelta +0.0703, read `rate`}; the md prints `ex-segment RPM $17.71 vs $16.04 (+10.4%) · mix alone predicts raw RPM +7.0% → rate`. 10-30 JSON had `sessionsExSegment` only (breaker ran at 07:0x before #375 merged 07:04Z) — not a miss, a pre-merge morning.
- **Leg 2 (unavailable with no digits): no production occurrence yet** (every morning since merge had GA4). Covered by `revenue-guardrail-ex-segment-rpm.test.ts` (`^ex-segment RPM .*: unavailable — GA4 could-not-run: no credentials$`, `not.toMatch(/\d/)`).
- **Leg 3 (status identical): MET** — status green 10-30 and 10-31, identical to the MV-only rule; the test asserts no status assignment reads the ex-segment RPM.

Share of guardrail mornings since merge classified by the print: **1 of 1 (rate)**. Verdict **KEEP** — it did on 10-31 what the 10-23 and 10-29 verdicts did by hand, with the same numbers, and the digest can now carry mix-vs-rate without a Rio pull. Next read of the same metric: the E288 tracker (11-01) decides WIRE/HOLD for the red-traffic rule; this print stays informational until then.

## (c) October B2 close-out and the November non-ad bet

**B2 close.** Non-ad revenue **$144.00/mo gross** (public page, 56 paid: 14×$1, 40×$3, 2×$5; Members API $148.50 with 13×$1, 41×$3, 1×$5, 1×$8) vs the **$450 line → MISSED**; vs my **$160–170 band → MISSED** (−1 $3 patron overnight, 57 → 56; joins 7d 2 / cancels 1; $3-tier joins 0.29/day vs the 17/mo Q4 gate pace of 0.57). Other lines: membership $0 (no product), first-party premium editions $0 (none shipped), sponsorship $0 (no outreach sent — operator), affiliates **$0** (Impact 20 clicks / 0 actions 09-29→10-30 on the repaired pipe; Amazon Associates earnings for the #391 block unknown — operator-only). Revenue per 1K sessions, 28d: ad $16.30 + non-ad ≈ $0.40 = **$16.70**. `patreon_click` 9.29 users/day vs the 8.75 E40 baseline (+6%) — the free-funnel is flat, the paid conversion is the gap. B2 `killIf` was MET 10-15; the line was never in reach after the two free→paid trips (E40, E288 second trip did not fire) produced 0 and 2 joins.

**Affiliates (E134, repair-only).** The E306 build's real run: on-site gtracing 25 (all repaired `sjv.io` links), Impact 20 clicks / 0 actions / $0.00, share 80% (floor 50%), status **confirmed**, kill clock from 10-12, **kill read 2026-11-11**. The new GA4 leg prints the two surfaces separately: **grid 31 clicks over 32 days (0.97/day)** vs the **blog Amazon block 44 clicks on 36 post paths over 4 live days (11/day; 10-27 14, 10-28 5, 10-29 14, 10-30 11)** — the block's bar for 11-11 is ≥ 5/day. The 11-11 read therefore grades Impact ($0 → KILL to E13's stance if still $0) and Amazon (clicks only; dollars need the operator's Associates report, queued) as two lines. Not a new placement by the team (E55 stands).

**November bet — what ships without Tier 2 (team, Tier 0/1):**
1. **Affiliate pipe to the 11-11 read** (E134/E306): nothing new to place; keep the link validator honest, print both legs. Expected $: Impact **$0 → KILL** is the base case; Amazon block unknown until the operator shares earnings (PENDING).
2. **E294 November Patreon members post** (Cass draft, Q36): the post itself is Tier 2 (operator posts). If posted, the measurable is $3-tier joins 7d after vs the 0.29/day baseline; at the 0.5% free→$3 assumption on 6,369 free that is +32 patrons ≈ **+$96/mo** — the same assumption as Q37-A, so this is the free test of A's premise.
3. **Paid-ads test** (`growth-plan.md`): design is Tier 0, spend is a budget = operator. ≈$16.50 ad revenue per 1K sessions means paid traffic loses money on ads alone; graded on cost per email subscriber + 14-day return, $100–200 on one EA pack launch. PENDING budget — I will not pick a number for the operator.
4. **Ad guardrail**: daily; the only team-owned $ in November is "don't lose any" — W4 shows 34 deploys with RPM +9.5%, so the bar is being met.

**Tier 2 paths, valued with assumptions stated (Q37, decide by 11-05):**
- **A — $3 "skip the wait" perk** (`/go` countdown skipped for connected $3+ patrons; pricing/tier = Tier 2; Q4 closed won't-do on *renames and the $10 tier*, not on perks). Base: 6,369 free members, 40 current $3. At **0.5%** free→$3 = +32 × $3 = **+$96/mo**; at 1% = +$192/mo; at 0.25% = +$48/mo. Assumption, not measurement: the only comparable is E40 (a `/go`-led checkout link cut `patreon_click` 8.75 → 3.57 users/day and produced 0 paid-and-connected), so the perk must be announced *on Patreon* (E294 post), not fronted on `/go`. Cost: 0 — `member_skip_countdown` already fires (13 in 7d) for signed-in members; the change is which tier unlocks it. Ad-loss per member ≈ one interstitial impression per skip ≈ $0.01 — RPM guardrail unaffected.
- **B — creator rev-share** (Tier 2: payout + contract). Base: 0 hosted paid mods, 0 agreements, 2 creators onboarded with ≥1 submission, 7 submissions pending (oldest 27 d). No dollar base exists; at a 70/30 split a single $5 mod would need 100 sales/mo to add $150. **PENDING** — cannot be valued honestly before one creator has one paid file.
- **Recommendation: A**, because it has a base (6,369 free), a prior (E40 says where *not* to announce it), zero build cost, and E294 is already the free-side test of its premise. B stays queued until Nova's badge outreach (Q38) produces one creator with something to sell.

**November non-ad line proposal (for Quinn's rewrite):** **$250/mo** = Patreon $148 (API, hold) + A at 0.5% **+$96** (if Q37-A by 11-05 and E294 posted by 11-08) + affiliates $0 (kill read 11-11) + sponsorship $0 (no deck sent); **$155/mo** if Q37 is not answered (hold + the E294 post's organic joins only). Assumption on the record: 0.5% free→$3 in 30 days of a Patreon-side announcement; read 11-30; kill the perk if $3 joins 7d after the post are < 4 (1.5× the 0.29/day baseline over 7 d).

## (d) Experiments / queue text for Quinn (verbatim; `.claude/` edits may be denied)

E271 Result cell: `10-31: first production print — ex-seg RPM $17.71 vs $16.04 (+10.4%), mix predicts +7.0% → rate; status green unchanged; 1 of 1 mornings classified; unavailable branch test-only so far` · Verdict cell: `KEEP`.

E306 row: `| E306 | 2026-10-31 | Rio | 0 | MONETIZE | Verdict 10-31 (this file, paper) + affiliate-pipe-read.ts GA4 leg (#416 5b6f1b4c): Impact and the #391 blog Amazon block print as two lines by pagePath class (grid = / + /games/*); informational, status rules never read it (test) | 11-11 E134 read prints both legs; blog block clicks/day vs ≥5 bar; Nov non-ad $/mo | 10-31: Impact 20 clicks / 0 actions $0 (confirmed); GA4 grid 31 (0.97/day) · block 44 over 4 live days (11/day); non-ad $144/mo vs $450 line (MISSED) | 2026-11-11 | both lines print with status byte-identical to the two-leg run; Impact $0 → KILL to E13; block ≥5/day keeps the Amazon leg open pending operator earnings | — | PENDING |`

Operator queue: Q37 unchanged (A recommended, +$96/mo at 0.5%, decide by 11-05); add under operator-only — *share Amazon Associates earnings for tag `musthavemod04-20`, 10-27→11-11, before the 11-11 read; register GA4 custom dimensions `source_type` and `partner` (Data API 400 today) so the pipe read can split by parameter instead of path.*

— Rio, Product & Revenue
