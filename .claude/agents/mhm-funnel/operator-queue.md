<!-- context budget: 16000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Operator Queue

The only file the operator has to touch. Agents append packages; the operator
replies inline. Quinn processes replies every morning and removes closed items.

**How to reply:** edit the `Reply:` line, or just tell Claude "approve 2",
"reject 4 because …", "stop 3". Silence on a Tier 1 item = it ships when the
window closes. Tier 2 items older than 7 days get one smaller re-pitch, then
are dropped and logged.

**Operator directive 2026-09-12:** waiting on a reply is never a reason to skip
work — ship every Tier 0/1 move regardless of open Tier 2 items; bring only
board-level decisions and true blockers here (see `autonomy.md`, "Operator
directive 2026-09-12"). Replies given in chat are recorded and executed the same
day.

**Guardrail 2026-10-13 (Rio):** 🟢 GREEN — finalized 10-11 $262.16 vs $269.26 (−2.6%) at RPM +0.4% and sessions −3.0%, where the −3.0% is one anomalous control Sunday (09-27 carried 2,657 Direct sessions; ex it, 10-11 reads +0.9%), 3-day revenue −0.8% / RPM +3.0%, health ok; 28d line 97.28% revenue / 98.46% sessions (ON LINE run 11) — 09-14 (−9.3% vs line) rolls out on 10-14 and 09-15 (−5.8%) on 10-15, so 10-12 needs only ≥$146.53 (partial already $207.05) and the ratio rises both days; merges clear, no Tier 2 package; E192 10-13 leg MET; E174 on track to CLOSE seasonal 10-14 (10-11 ratio 0.66 / fill +1.01); B2 leg 2 expected MET 10-15 → affiliates-only as pre-committed; E134 kill clock anchored to 10-12 → reads 11-11 (it was drifting +1 day/run). Q19/Q21/Q22 drop 10-14, Q20 10-18. Full read `reports/funnel/rio-verdict-2026-10-13.md`.
---

## Tier 1 — shipping unless you say stop

| Tier 1 | Owner | What | Reply to block |
|---|---|---|---|
| T1 (done) | Sage | **#275** `/games/sims-4/cc/` hub **MERGED 2026-10-12** (9d8ab3e, veto window silent; Quinn ran the ship protocol, verify result on the ledger). E182 read 10-26; rollback = revert the squash. | — |
| T1 (done) | Cass | Newsletter issue 05 **SENT 2026-10-11 11:34** (window closed 10-08; the 10-09 run never fired): 97 of 98 delivered, 1 hard reject, 0 excluded, 31/31 links tagged `utm_campaign=weekly-issue-05` (E184, read 10-18, keep cadence if ≥8 sessions AND ≤2 unsubscribes). Issue 06 goes Thursday 10-15 by the same path; say "stop newsletter-06" to block. | "stop newsletter-06" |

## Tier 2 — needs your decision

### Q-E21 · E21 hit its "else revert" condition — Sage recommends NOT reverting (Sage, Tier 2, filed 2026-10-07, re-read 11-02)
- Pregnancy pair 55 clicks/28d vs ≥95 (blog copy 47 @ pos 10.5, apex 1, facet 7), while Google's chosen canonical is now the apex article (crawled 10-05, i.e. only after the 09-28 blog.*→apex 301). Site-wide Google clicks +24%/28d, facets ≥ baseline. Sage recommends keeping and re-reading 2026-11-02 (28 days after the canonical switch) with the same rule. Reply **"revert E21"** to run the PR #63 revert through the functions.php push process instead; no reply = hold and re-read.

### Q26 · Review 7 pending creator submissions (Nova, E172, filed 2026-10-04, re-pitched 10-11, drops 10-18)
- **10-11 re-pitch (Nova, smaller ask):** ONE creator, 7 mods, waiting 8 days. Atino00 submitted 7 Build/Buy mods (CurseForge) on 10-03; nobody has reviewed them. Reply **"Q26: approve 7"**, **"Q26: reject 7"**, or **"Q26: approve <titles>"**. On approve: you approve in `/admin/submissions/` (7 clicks); E183 (#274, live) creates the `pending-atino00-*` profile and links all 7; Nova reports. No message to the creator, no terms. Silence: the only creator to submit since January stays unanswered; on 10-18 Q26 drops and Nova stops pitching new creator recruiting. (Original 10-04/10-07 text in the archive.)
- Reply: _(pending)_

### Q27 · SD-10 wording (Pip, E170) — **CLOSED 2026-10-11**, no reply in 7 days = the strict reading stands: ≤7 top-up rows per *posting date* across runs (tool #261 enforces it). Body in the archive.

### Q25 · End-of-post email capture on WordPress articles (Cass, E167, PR #253, filed 2026-10-03, re-pitched 10-11, drops 10-17)
- **10-11 re-pitch (Cass, narrower):** the `mhm_post_end_capture` block on only the **5 biggest WP articles** by landings (`/sims-4-cc-furniture/`, `/sims-4-wedges-cc/`, `/sims-4-coquette-cc/`, `/sims-4-male-sim-download/`, `/sims-4-cc-tattoo/` = 4,736 sessions/wk, GA4 10-03→10-09), 7-day read, same RPM floor (blog RPM ≥95% of the 4 prior same weekdays, one-sided) and rollback as PR #253 (revert + `push-blog-functions-prod.sh --yes` + purge + `check-blog-sidebar.sh`). Reply **"approve E167 pilot"** (or **"approve E167"** for all articles); you run the prod push and the BigScoots purge — the team never pushes `functions.php`. Cost of silence: WP articles are ~73K of 87.7K weekly sessions with zero capture surface; at the 0.59/1K keep bar that is ≈43 owned adds/week not captured (a third of this week's 125); the pilot alone ≈3/wk. No reply by **2026-10-17** drops Q25 and E167 closes NOT-RUN. (Full 10-03 package in the archive.)
- Reply: _(pending)_

### Q11-b · Writer pins — **CLOSED 2026-09-28; the E82 diagnosis was wrong** (body verbatim in `archive/operator-queue-2026-09.md` § "Closed items parked 2026-10-07"; nothing for you).

### Q17 · Sponsorship (Rio, E89) — **DROPPED 2026-10-07** under the 7-day rule (filed 09-23, re-pitched smaller 09-30, no reply by the 10-07 drop date). E89 closes NOT-RUN. The media kit and the two hub-slot drafts stay at `reports/funnel/drafts/sponsorship-media-kit-2026-09-23.md`; a later **"send hub"** or a price still executes as written. Full text in the archive.

### Q18 · Weekly newsletter cron line (Cass, E78) — **DROPPED 2026-10-07** under the 7-day rule (no reply by its own 10-07 date). Part A (#226) stays live and inert: no cron line, 401 without `CRON_SECRET`, no-op without `NEWSLETTER_WEEKLY_ENABLED`. A later **"approve 78-cron"** still adds the one `vercel.json` line. 78 subscribers, still 1 issue ever (09-14). Full text in the archive.

### Q23 · Creator outreach, batch 1 (Nova, E137, 2026-09-29) — 8 days old on 10-07: one smaller re-pitch (Nova, today), then drop 10-14
- Package: `reports/funnel/drafts/creator-outreach-template-2026-09-28.md` — (A) template text, (B) the first 20 creators ranked by 28d download clicks on our site (slug, `/creator/<slug>/`, claim URL, 28d + lifetime clicks, catalog contact channel — nothing scraped; 8 of 20 are TSR-only with no contact route of their own), (C) decision: set `User.isCreator` when a claim is promoted (Nova recommends YES; one `$transaction` in `app/api/admin/creator-claims/[id]/route.ts`; new mods still land `isVerified: false`). Offers no money, terms or placement; includes an opt-out we must honor within 7 days. Reply **"approve E137"** (all) or e.g. **"approve E137 A+B, C no"**. After approval sending is Tier 1, ≤20/week; nothing is sent before then. Baseline 0 onboarded / 0 claims; read 2026-10-13.
- **10-02 addendum (Nova, E158):** batch 1b for the 8 favorites-ranked creators the competitor file called missing — `reports/funnel/drafts/creator-outreach-batch-1b-2026-10-02.md`. Only Madlen is sendable today; SIMcredible after the TSR-messaging check, adeepindigo after the promote-409 fix; 5 of the 8 have no `/creator/` page (1–3 SFW mods). Needs its own word: "approve E137 + 1b". Also: all 20 seed profiles were falsely verified — fixed 10-02 (#247), claim cards now show.
- **10-07 re-pitch (Nova, smaller ask; drops 10-14 if no reply):** approve E137 A+B for the creators with their own contact channel only (the 12 of 20 not TSR-only, plus Madlen from 1b). C (isCreator on promote) is deferred. Nova sends ≤20 a week from the approved template: no money, no terms, opt-out honored within 7 days. Reply **"approve E137 A+B own-channel"**. Baseline: 0 claims, 3 onboarded. (The "E158 promote-409 fix" named in the addendum shipped as E166, #252, on 10-03.)

### Q24 · Apply Pinterest-SEO copy to the writer's Upcoming rows (Pip, E135 follow-on, 2026-09-29, Tier 2 — copy on writer rows) — 8 days old on 10-07: one smaller re-pitch (Pip, today), then drop 10-14
- Read-only baseline 09-29: 353 unposted writer rows created since the Q11 deploy (13 Upcoming articles, 352 at the 2025-01-01 placeholder), 2 passing, mean 54/100 (09-28: 1/92, mean 59). Report `reports/funnel/pin-seo-audit-2026-09-29-ids.md`. Volume and timing untouched; only Post Title / AI Text Slug change; posted rows are skipped. Apply (from a clean `main` worktree): `python3 scripts/agents/pin-seo-audit.py --source page --ids reports/funnel/pin-seo-writer-upcoming-ids-2026-09-29.json --report-dir reports/funnel --apply`. Rollback: `pin-seo-audit.py --rollback <the pin-seo-rollback-*.json it writes> --apply`. Read 7 days after; keep if mean ≥85 and Pinterest sessions to the 13 articles' first posted week ≥ the prior 3 plugin batches' first-week mean. Reply **"apply writer seo"**, **"no"**, or name the articles.
- **10-07 re-pitch (Pip, smaller ask; drops 10-14 if no reply):** rewrite title and description only on the writer's queued pins for **3 articles**, the 3 newest (including `sims-4-arm-warmers`). Posting volume and dates unchanged; pins already posted are skipped. Rollback is one command (the `pin-seo-rollback` ledger the run writes). Reply **"seo 3"** and Pip builds the 3-article ids file, dry-runs it, and applies. Keep if their mean copy score is ≥85 and Pinterest sessions in each article's first posted week are ≥ the prior 3 batches' mean.

### Q20 · GA4 outbound-click measurement for the blog (Rio, E134 item F, filed 2026-09-29, re-pitched 10-11, drops 10-18) — replaces Q19/Q21/Q22
- **10-11 re-pitch (Rio, smaller ask):** one admin toggle, no code. In GA4 property 437117335 turn Enhanced Measurement → "Outbound clicks" ON. Today every click event in the property is on `musthavemods.com` only; the blog host has zero rows, so the Amazon links' outbound clicks are invisible (E134/E153 read 10-12 runs on the Impact side alone). Reply **"ga4 outbound"** once flipped and Rio confirms it fires on an article within 48 h. Q19 (rel=sponsored spec), Q21 (OneLink) and Q22 (network shortlist) were spec-only with no decision asked: they **drop 2026-10-14** unless you reply; bodies verbatim in the archive.

Closed/shipped items Q8 (poison-row hardening, deployed 09-21), Q4 (Patreon tier relaunch — **CLOSED 09-28 by operator: won't do; do not re-pitch tier or pricing changes**), Q5 (Patreon OAuth membership, shipped 09-07/08; E19 read 10-07), Q6 (pregnancy/y2k un-consolidation, shipped 09-12) and the Q10/Q14/Q15 closing notes were moved verbatim to `archive/operator-queue-2026-09.md` § "Closed items parked 2026-10-07" by Quinn. Nothing in them needs you.

## Operator-only actions (no decision needed, nobody else can do them)

- **[operator, host] 10-11 (Ops, incidents `reports/funnel/incidents/2026-10-05-063000.md`, `2026-10-08-063000.md`):** 5 of the 7 mornings before today did not run (10-05/06/08/09/10) — the host was asleep on battery each time; the 10-08 and 10-10 runners started in a dark wake, hung at preflight and left 0-byte files. **Run mornings: laptop on AC with the lid open (or an external display) by 06:30. Takes 10 s.** Fallback (~1 min): run `claude auth login` only if the scoreboard or `funnel-daily.log` shows `preflight=AUTH` — today's preflight succeeded in 4.5 s and the CLI renews its own token, so no re-auth is needed now. If the Claude app restores a stale scheduled session, close it (a stale session restored on a new day is a real start).
- Earlier operator-only items (all cleared 09-28; Q13 shipped 09-28 as #208) are verbatim in the archive.

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
