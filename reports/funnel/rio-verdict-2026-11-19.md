# Rio — verdict 2026-11-19 (E437): November non-ad month-to-date is $165.50/mo on drift alone — the $155 floor is cleared, the $250 line died with Q37 on 11-05, and the $1,000 quarterly gate (12-31) is 5× out of reach without a lever outside the Tier 2 fence. December's B2 line is set here from the measured slope, not an assumption.

Circuit breaker 🟢 GREEN, action none (`guardrail-2026-11-19.md`, judged 11-17: revenue $218.07 +7.5%, RPM $18.85 +7.7%, sessions −0.5%, 3-day +7.1%, health all ok). Auto-rollback withheld: 56 in-window deploys vs the bound of 24 (build-relevant 15 — Q50 pending, Ops). Mediavine reporting token expires 2026-12-03; the scoreboard flag is up.

**Sources (all read 2026-11-19 ≈12:00Z, read-only).** Patreon Members API via `scripts/agents/patreon-relaunch-read.ts --since 2026-11-01` and `--since 2026-11-16`, plus a one-off (deleted, not committed) call to `summarizePatreonMembers` with anchors 11-01 / 11-16 / 10-01 for the $3-tier split and the join-month histogram — counts only, no id, email or token read or printed. `reports/funnel/2026-11-19.json` (`patreonApi`, `db.affiliateEarnings30d`). GA4 Data API property 437117335, `eventName` × `eventCount, totalUsers`, 11-01→11-18. Mediavine reporting MCP: `mv_metrics_summary` 10-21→11-17 vs 09-23→10-20, `mv_metrics_daily` 11-04→11-18, `mv_top_pages` 11-11→11-17. `targets.json` → B2. `rio-verdict-2026-11-15.md` §(c) for the pre-committed B2 rule.

## (a) One line for the digest

*Non-ad November MTD: $165.50/mo gross (61 paid; Members API, E392 basis) vs $144 / 56 paid on 11-01 — +$21.50 (+14.9%) in 18 days with no Rio lever applied: 14 joins (8 at $3), paid 56 → 61, so ~9 left (the API shows 3 so far; the 12-01 charge run reveals the rest). Floor $155 cleared; the $250 line lapsed with Q37 on 11-05 and is not a target. Affiliates $0 (Impact killed 11-11, Amazon unmeasured), sponsorship $0 (no outreach approved). On the measured slope ($1.19/day) December ends near $216 — the charter's $1,000 gate on 12-31 needs +278 $3-patrons or ~3 sponsors; nothing inside the Tier 0/1 fence closes that. December B2 line proposed: $200 drift / $165 floor (§d).*

## (b) RPM / page-mix (guardrail leg, one paragraph)

**28d anchored 11-17 (10-21→11-17 vs 09-23→10-20):** $6,321.43 vs $5,830.10 = **+8.43%** = sessions −5.17% (346,032 vs 364,906) × session RPM +14.34% ($18.27 vs $15.98). The RPM leg is pv/session +13.7% (1.523 → 1.732) × page RPM +0.6% ($10.49 → $10.55) — depth, not rate, same shape as 11-13/11-15/11-17. Monetizable-session share 57.0% → 63.5%, mon-session RPM +2.6%; imp/session +7.7%, CPM +6.2%. Revenue is 106.9% of the day line and 82.8% of the ramp; the whole gap to the ramp is sessions.

**7d WoW (11-11→11-17 vs 11-04→11-10, ratio of sums; these are the legs the scoreboard printed today — E424 reproduces by hand to the cent: $1,701.76 / 89,127 / $19.09):** revenue +2.9%, sessions +3.5%, session RPM **−0.6%** = paid imp/session −4.9% (18.34 → 17.44) × CPM +4.6% ($1.047 → $1.095). imp/session splits as mon-pv/session +4.8% × **imp/mon-pv −9.2%** (11.34 → 10.29); monetizable-pv share 92.1% (prev 90.2%, daily min 88.8%) → E416 falsifier `ok`. The imp/mon-pv step is daily 10.2 / 9.7 / 9.9 / 11.2 / 10.4 / 10.2 / 10.1 vs ~11.0–11.9 the week before, i.e. it started 11-11, not with the 11-15/11-17 merges. It is consistent with a larger share of low-density app pages in the monetizable mix (`/` 4.5 imp/mon-pv, collection hubs 4.2–5.4, vs posts 18–35 — Mediavine `pages` 11-11→11-17), and page RPM is flat at 28d, so it is not an ad-density or a Mediavine-side break. **Watch rule for 11-21 (pre-committed):** if 7d session RPM < 95% of $19.20 with CPM inside ±3% WoW (the E416 flat band), that is a density/mix regression and I bisect app-page deploys since 11-11 as a Tier 1 rollback candidate; CPM moving outside the band is a rate read, no action. No ad action today.

**Homepage RPM (E412 guard, Sage/Quinn, watch to 11-22):** `/` $90.40 on 10,248 pv → **$1.014 per 1k site sessions** (90.40 / 89.127) vs the $0.9356 gate — passes this week; the three weekly values are now $0.660 / $0.923 / $1.014, so the 11-17 note stands: judge it on two weeks or matched weekdays, not one.

## (c) Non-ad November MTD (E437)

| Line | 11-01 | 11-19 | Δ | Source |
|---|--:|--:|--:|---|
| Patreon paid (Members API) | 56 | **61** (14×$1, 43×$3, 3×$5, 1×$8) | +5 | scoreboard `patreonApi`, `targets.json` B2 Oct grade |
| Patreon gross /mo | $144.00 | **$165.50** | +$21.50 (+14.9%) | same |
| Joins since 11-01 (18 d) | | 14 (8 at $3) = 0.78/day → 23/mo | vs Aug 17/mo | Members API, anchor 11-01 |
| Cancels since 11-01 (API floor) | | 3 | implied departures 56 + 14 − 61 = 9 | last-charge-date rule; the 12-01 charge run shows the rest |
| Former patrons by last-charge month | Aug 18 · Sep 11 · Oct 16 · Nov 3 (floor) | | ≈15/mo churn | Members API |
| Paying base by join month | | Nov 14 · Oct 9 · Sep 8 · Aug 8 → 39 of 61 (64%) joined since 08-01 | young base | Members API |
| Affiliates (AffiliateEarning 30d) | $0 | **$0** | — | DB; Impact KILL → E13 (11-11); Amazon block earnings operator-only, unsupplied |
| Sponsorship | $0 | **$0** | — | no outreach approved; kit draft `drafts/sponsorship-media-kit-2026-09-23.md` is 8 weeks stale |
| **Non-ad total** | **$144.00** | **$165.50** | +$21.50 | |
| vs $155 floor | 92.9% | **106.8%** | | |
| vs $250 line (Q37-A) | 57.6% | 66.2% | lapsed 11-05 | `operator-queue.md` Q37 |
| vs $750 `targets.monthly` | 19.2% | 22.1% | | |

**Reach, GA4 11-01→11-18:** `patreon_click` 331 events / 275 users (15.3 users/day vs the E40 baseline 8.75 — Cass's E152/#309 CTA reach is still the mechanism, as E416 found); `patreon_click_after_wait` 98 / 80; `member_skip_countdown` 117 events / **4 users** (the perk still reaches a handful of payers — E416's "keep as feature, kill as conversion story" stands); `affiliate_click` 202 / 186 (nothing to earn on).

**B2 pre-committed window (11-16→11-30), 3 days in:** joins 3 ($3 tier 2), cancels floor 1, paid 61. The rule needs $3-tier joins ≥ 4 over 15 d and paid ≥ 60 on 11-30: 2 in 3 d is on pace for ~10. Unchanged; reads 11-30.

**The quarterly gate.** Charter: by 12-31 non-ad must reach $1,000/mo or the team is replaced. From $165.50 that is +$834.50 = **278 more $3-patrons** (on a base that adds a net ~8/month), or ~3 sponsors at $300, or a mix. The measured drift ($1.19/day, 11-01→11-19) lands at ≈$179 on 11-30 and ≈$216 on 12-31. Inside the fence I own: membership features (reach 4 users/month), premium mod editions (no first-party mod pipeline this month), affiliates (killed on evidence). Outside it: pricing/tiers (Q4 closed — not re-pitched), a Patreon post in the writer's voice (Q36 dropped 11-06), sponsorship outreach (Tier 2, never queued with a number). The board-level statement is: **the gate is not reachable on drift, by 5×, and the only levers that could close part of it are Tier 2.**

## (d) Decision — E437

1. **November B2 grade is decided by two numbers on 11-30, no judgment call:** gross ≥ $155 AND paid ≥ 60 (Members API) → **HIT at the floor, MISSED the $250 line** (the line was conditional on Q37-A, which lapsed; this is the 11-05 killIf applied, not a new verdict). Below either → MISSED. $3-tier joins 11-16→11-30 ≥ 4 keeps E416's drift line (unchanged).
2. **December B2 line proposal for Quinn's monthly rewrite (due ~11-30): $200/mo drift line, $165 floor** (today's gross; "do not fall"). Basis: the MTD slope ($1.19/day → $216 on 12-31) with a haircut for the 12-01 charge run (11–18 departures/month in Aug–Oct). Confirmed or cut on **12-03**: paid ≥ 58 after the charge run (the 11-15 base) → $200 stands; paid < 58 → December line = $165 floor only, and the churn read reopens (E416 rule).
3. **No non-ad lever is pitched today.** Q4 stays closed. Sponsorship is the only line with a $300 unit and it needs the operator to send one email; re-pitching it requires new evidence per the 7-day rule, and a kit with 8-week-old numbers is not that. NEXT (11-21, Tier 0 draft): refresh `sponsorship-media-kit` to the Q4 numbers (28d 346K sessions, RPM $18.27, GSC clicks +16.1%, returning-visitor share 51.7%) so a December re-pitch carries a current page and a price.
4. **E424 — KEEP (read 11-19).** The scoreboard printed the 7d legs for 11-11→11-17 and the hand read reproduces them to the cent (revenue $1,701.76, sessions 89,127, RPM $19.09, CPM $1.095, share 92.1%); the 11-09→11-15 window reproduces $1,728.04 / 88,602 / $19.50 as the 11-17 hand read; the 11-18 zero-session row sits outside the anchored window and the state printed `ok`, not `unknown`, correctly.
5. **E416 — on track (reads 11-30).** Share 92.1% ≥ 85%; CPM +4.6% is outside the flat band; falsifier `ok`.

## (e) What I did not do

No ad layout, no `functions.php`, no pricing, no Patreon post, no env var, no code. Paper trail only — no change to the site. One repair to the record: the E392 (11-11), E416 (11-15) and E424 (11-17) experiment rows never reached `experiments.md` on `main` (last landed row is from the 11-06 daily run, #477; the Clerk's Q43 apply is still off `main`). `.claude/` edits are not permitted from this worktree (Edit denied today), so the four rows and the playbook entry are in `reports/funnel/rio-pending-2026-11-19.md` for Quinn / the Clerk to apply verbatim. If the Clerk's batch lands first, the duplicates are mine to remove.

— Rio, Product & Revenue
