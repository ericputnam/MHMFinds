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

**Guardrail 10-07 (Rio):** RED on 10-05 graded SAME-INCIDENT (E163 demand reset); 10-06 revenue already +6.0% vs its Tuesday mean — expect the breaker to clear on its own. No rollback, no functions.php action. Q5/E19 read 10-07: linked 149, paid 59, connected 2 — the Patreon OAuth feature stays live, no further investment; nothing for you.

---

## Tier 1 — shipping unless you say stop

| Tier 1 | Owner | What | Reply to block |
|---|---|---|---|
| T1 | Cass | Send weekly newsletter issue 05 ("This week on MustHaveMods — 6 new finds", draft `reports/funnel/drafts/newsletter-issue-2026-10-07-preview.html`) to opted-in waitlist subscribers (78 rows on 10-07, minus unsubscribes/sendExclusions via `sendWeeklyNewsletter()`), **Thursday 2026-10-09 15:00 UTC**. No cron line exists (Q18 dropped) and `newsletter-send-test.ts` has no `--weekly` path, so Cass adds a `--weekly --dry/--live` mode (Tier 0, 10-08), posts the dry-run recipient count, then sends. Metric: sessions with `utm_campaign=weekly-issue-05` + waitlist unsubscribes; keep the weekly cadence if ≥8 sessions (10% of list) and ≤2 unsubscribes per issue. | "stop newsletter-05" |

## Tier 2 — needs your decision

### Q-E21 · E21 hit its "else revert" condition — Sage recommends NOT reverting (Sage, Tier 2, filed 2026-10-07, re-read 11-02)
- Pregnancy pair 55 clicks/28d vs ≥95 (blog copy 47 @ pos 10.5, apex 1, facet 7), while Google's chosen canonical is now the apex article (crawled 10-05, i.e. only after the 09-28 blog.*→apex 301). Site-wide Google clicks +24%/28d, facets ≥ baseline. Sage recommends keeping and re-reading 2026-11-02 (28 days after the canonical switch) with the same rule. Reply **"revert E21"** to run the PR #63 revert through the functions.php push process instead; no reply = hold and re-read.

### Q26 · Review 7 pending creator submissions (Nova, E172, filed 2026-10-04, re-pitch/drop 10-11)
- A real creator signed up 10-03 and submitted 7 mods through the creator dashboard (10:51–11:09Z); nobody has reviewed them. Approving = hosting a creator's mods (Tier 2, creator agreement). Reply **"E172 APPROVE"** and Nova reviews/approves them in `/admin/submissions/`; onboarded-with-approved goes 2 → 3 and the catalog gains 7 hosted mods. Silence: the queue turns 7 days old on 10-10.
- **10-07 (Nova):** with no reply by 10-10 the 7 submissions stay pending, unreviewed and unhosted — Nova will not approve or reject them because hosting is Tier 2. The scoreboard shows "oldest 7d" and Quinn re-pitches 10-11. That creator gets no answer at all, which is the worst onboarding outcome we have.
- Reply: _(pending)_

### Q27 · SD-10 wording: "≤7 rows/day" (Pip, E170, filed 2026-10-04) — no action needed unless you disagree
- The tool only capped 7 rows per posting date *within one run*, so daily top-ups stacked: every posting date 09-27→10-03 carried 21 top-up rows. From 10-04 the tool (#261) enforces 7 per posting date across runs, and Pip also held today's apply to 7 rows. At that pace the floor cannot lift runway (0.5 d vs ~40 posts/day); the lever is still writer inflow (Q11). Reply **"SD-10 7 per run"** only if you meant the looser reading.
- Reply: _(pending)_

### Q25 · End-of-post email capture on WordPress articles (Cass, E167, PR #253, filed 2026-10-03, re-pitch/drop 10-10)
- What: a `mhm_post_end_capture` block in `functions.php` (both copies) + the marker in both push scripts' `CRITICAL_MARKERS` + `check-blog-sidebar.sh`. WP article pages are 83.5% of landing sessions (74,074 of 88,736, GA4 09-25→10-01) and carry **no** capture surface today. Owned adds 7d 114 vs the 160/wk B1 line.
- Keep if: ≥0.59 waitlist rows per 1K WP-article sessions over 14 days AND blog page RPM ≥95% of the 4 prior same weekdays (one-sided). Rollback: revert + `push-blog-functions-prod.sh --yes` + cache purge + `check-blog-sidebar.sh`.
- Reply **"approve E167"**. Then the apply order in the PR body (operator runs the prod push and the BigScoots purge — the team never pushes `functions.php`). Nothing merges before that.
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

### Q19 · Amazon link rel=sponsored + disclosure — spec only (Rio, E134 item E, 2026-09-29) — 8 days old on 10-07 under the 7-day rule: Rio filed no smaller re-pitch on 10-07 (spec-only, no decision requested) → drops 10-14 unless you reply
- Real gap found while building tonight's tag-hygiene tool: anchor `rel` attributes on the Amazon links are inconsistent. Fixture-confirmed examples from real posts: `rel="noreferrer noopener"` (no nofollow, no sponsored) and `rel="noreferrer noopener nofollow"` (nofollow, no sponsored); the dynamic `kadence/singlebtn` block instead sets `"noFollow":true,"sponsored":true` as JSON attributes (whether Kadence's template actually renders these into the anchor's `rel` is unchecked). Google's guidance since 2019 is `rel="sponsored"` for paid/affiliate links. Whether an FTC-style affiliate disclosure exists on these posts is also unchecked. Proposed Tier 2 package: audit real rendered `rel` output across all Amazon anchors (reuse `kadence-safe-replace.ts read` mode), add `sponsored` where missing, plus a one-line disclosure block. This is a spec, not a build — attribute additions change byte length, so it needs a different invariant than tonight's same-length swap.

### Q20 · GA4 outbound-click measurement for the WordPress blog (Rio, E134 item F, 2026-09-29) — 8 days old on 10-07 under the 7-day rule: no re-pitch 10-07 → drops 10-14 unless you reply
- Checked GA4 (property 437117335) tonight: every 28d event name containing "click" is attributed to `hostName: musthavemods.com` only (`affiliate_click` 41, `patreon_click` 186, etc.) — zero rows for the blog host, and no generic GA4 Enhanced-Measurement `click`/`outbound` event appears anywhere in the property. The WordPress blog (confirmed running Google Site Kit) has no confirmed outbound-click visibility into the Amazon links this session touched. Proposed: turn on GA4 Enhanced Measurement's "Outbound clicks" toggle for the property (an admin setting, not code — this agent's GA4 access is `can_edit: false`) and confirm it fires on blog pages. Spec only.

### Q21 · Amazon OneLink / buying-guide package (Rio, E134 item G, 2026-09-29) — 8 days old on 10-07 under the 7-day rule: no re-pitch 10-07 → drops 10-14 unless you reply
- Proposal, not scoped: OneLink auto-redirects international visitors to their local Amazon marketplace under the same tag, which the current flat `musthavemod04-20` links do not do; international session share is unknown to this session. Pairing OneLink with dedicated "buying guide" content is a bigger, separate investment needing GA4/Mediavine geo data, Amazon OneLink eligibility research, and a content plan with Nova. Flagging as a future Tier 2 candidate once E134 items A–D have had time to show whether the repaired links convert at all.

### Q22 · Alternative affiliate programs shortlist: GMG / Envato / Humble (Rio, E134 item H, 2026-09-29) — 8 days old on 10-07 under the 7-day rule: no re-pitch 10-07 → drops 10-14 unless you reply
- Amazon's own performance argues for diversifying: 133 Impact clicks / 0 actions Jul–Sep even before tonight's fix. Shortlist for future network applications (Tier 2 — "network re-applications"): Green Man Gaming (game keys), Envato (creative assets, closer to this site's mod/CC content), Humble Bundle (game bundles). No applications made, no research beyond naming candidates — a shortlist for the operator to weigh, not a package.

Closed/shipped items Q8 (poison-row hardening, deployed 09-21), Q4 (Patreon tier relaunch — **CLOSED 09-28 by operator: won't do; do not re-pitch tier or pricing changes**), Q5 (Patreon OAuth membership, shipped 09-07/08; E19 read 10-07), Q6 (pregnancy/y2k un-consolidation, shipped 09-12) and the Q10/Q14/Q15 closing notes were moved verbatim to `archive/operator-queue-2026-09.md` § "Closed items parked 2026-10-07" by Quinn. Nothing in them needs you.

## Operator-only actions (no decision needed, nobody else can do them)

- **[operator, host] 10-07 (Ops, incident `reports/funnel/incidents/2026-10-05-063000.md`):** the funnel task did not fire 10-05 or 10-06 because the laptop was asleep on battery with the lid closed, and the Claude app (running since 09-22) still schedules "06:30" in Eastern time, which is now 04:30 MDT. (1) Quit and reopen the Claude app once so it picks up Denver time. (2) On run mornings keep the laptop on AC with the lid open or an external display attached. (3) If the Claude app restores a stale scheduled session, close it instead of sending it a message — the runner now refuses a second same-day start (#271), but a stale session restored on a new day is a real start.
- **All cleared 2026-09-28.** The operator reported done: `NEXT_PUBLIC_SITE_URL` in Vercel Production, the Q6 BigScoots cache purge (verified by Claude), the GA4 custom dimension `source`, and the GSC indexing requests plus sitemap resubmit. Q13 (blog.* → apex 301) **SHIPPED 09-28** through the kadence-child `functions.php` rather than nginx, because the nginx config is root-owned (PR #208, CRITICAL_MARKERS `mhm_host_split_301` and `mhm_host_split_js`). PR #143's nginx package is superseded. Read 2026-10-05 as E81 (whole-site Pinterest pv/session vs 1.51, not per-host; see `reports/funnel/pinterest-read-2026-09-19.md` §2 correction).

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
