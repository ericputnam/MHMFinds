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

**Guardrail 2026-10-15 (Rio):** 🟢 GREEN — finalized 10-13 $187.29 vs $187.30 (−0.0%) at sessions +5.3% / RPM −5.2%; the RPM dip is mix, not rate: 585 excess Singapore Direct one-pageview sessions — ex them sessions +0.15% and RPM $16.50 (−0.3%); 3-day +3.0%, health ok; 28d line 98.20% revenue / 99.93% sessions (ON LINE run 13) — E199 and E206 10-15 legs MET; merges clear. **B2 killIf MET** (paid joins 7d 4 on 10-08, 3 on 10-15; Q17 dropped) → Rio is affiliates-only through 10-31, no Patreon tier/price/copy work. One Tier 2 package below (Q29). Q20 drops 10-18, Q29 10-22. Full read `reports/funnel/rio-verdict-2026-10-15.md`.
---

## Tier 1 — shipping unless you say stop

| Tier 1 | Owner | What | Reply to block |
|---|---|---|---|
| T1 (done) | Sage | **#275** `/games/sims-4/cc/` hub **MERGED 2026-10-12** (9d8ab3e, veto window silent; Quinn ran the ship protocol, verify result on the ledger). E182 read 10-26; rollback = revert the squash. | — |
| T1 (done) | Cass | Newsletter issue 05 **SENT 2026-10-11 11:34** (window closed 10-08; the 10-09 run never fired): 97 of 98 delivered, 1 hard reject, 0 excluded, 31/31 links tagged `utm_campaign=weekly-issue-05` (E184, read 10-18, keep cadence if ≥8 sessions AND ≤2 unsubscribes). Issue 06 goes Thursday 10-15 by the same path; say "stop newsletter-06" to block. | "stop newsletter-06" |

## Tier 2 — needs your decision

### Q29 · Item D — fix the Amazon tag in one post, Kadence-safe (Rio, E213, filed 2026-10-15, drops 10-22)
Post 5848 ("The Absolute Best Gamer Gifts For Every Budget") carries **7 Amazon links tagged `musthavemod08-20` and 0 tagged `musthavemod04-20`** — the only store id Amazon credits — so every click there earns nothing. Read-only dry run today over SSH (`scripts/wp/kadence-safe-replace.ts dry-run`, artifact `reports/funnel/item-d-dryrun-5848-2026-10-15.txt`): same-length literal swap, 48,894 bytes before and after, Kadence block invariants PASS, before sha256 `d9534acc…fd95b`. Tier 2 because it writes post content on prod. **Reply `Q29: apply 5848`** and Rio writes the approved-snapshot JSON (post id → that before-sha), runs `apply --prod --approved-snapshot` (the tool refuses if the live sha has moved since the dry run), purges `bs_cache`, and confirms the 7 tags on the live page within the hour; rollback is the same tool with from/to swapped (sha-verified, auto-restore on mismatch). Silence → drops 10-22, no re-pitch; the Amazon leg of the 11-11 affiliate read then grades "unmeasurable", not $0. Ceiling honest: Amazon actions 0 on record, $0–10/mo.

### Q28 · Writer plugin should date pins ahead (Pip, E202 follow-on, filed 2026-10-14, drops 10-21)
The writer plugin inserts ~21 rows/day (147/7d) but 136 of 147 sit at the `2025-01-01` placeholder until their posting day, so the poster's 14-day horizon holds **0 writer rows** and all 42 rows in it are Pip's hand top-ups (E202 read-back 10-14). Runway cannot cross 2 d without the plugin dating rows ahead; a top-up cap raise would not change that. The change is in MHMUtils (WordPress), outside this repo — Tier 2 (pin timing/volume). **Reply `Q28: date ahead 7`** (or another N) and Pip packages the plugin diff for you to apply; nothing → drops 10-21 and the SD-10 floor keeps running at ≤7 rows/date.

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

### Q23 · Creator outreach, batch 1 (Nova, E137) — **DROPPED 2026-10-14** under the 7-day rule (filed 09-29, re-pitched smaller 10-07, no reply by 10-14). E137 closes NOT-RUN; 0 of 20 sent. The template and both batch files stay at `reports/funnel/drafts/creator-outreach-*.md`; a later **"approve E137 A+B own-channel"** still executes as written. Full text in the archive.

### Q24 · Pinterest-SEO copy on the writer's queued pins (Pip, E135 follow-on) — **DROPPED 2026-10-14** under the 7-day rule (filed 09-29, re-pitched "seo 3" 10-07, no reply by 10-14). The audit and the ids file stay in `reports/funnel/`; a later **"seo 3"** or **"apply writer seo"** still executes as written. Full text in the archive.

### Q20 · GA4 outbound-click measurement for the blog (Rio, E134 item F, filed 2026-09-29, re-pitched 10-11, drops 10-18) — replaces Q19/Q21/Q22
- **10-11 re-pitch (Rio, smaller ask):** one admin toggle, no code. In GA4 property 437117335 turn Enhanced Measurement → "Outbound clicks" ON. Today every click event in the property is on `musthavemods.com` only; the blog host has zero rows, so the Amazon links' outbound clicks are invisible (E134/E153 read 10-12 runs on the Impact side alone). Reply **"ga4 outbound"** once flipped and Rio confirms it fires on an article within 48 h. Q19 (rel=sponsored spec), Q21 (OneLink) and Q22 (network shortlist) were spec-only with no decision asked and **dropped 2026-10-14** (no reply); bodies verbatim in the archive.

Closed/shipped items Q8 (poison-row hardening, deployed 09-21), Q4 (Patreon tier relaunch — **CLOSED 09-28 by operator: won't do; do not re-pitch tier or pricing changes**), Q5 (Patreon OAuth membership, shipped 09-07/08; E19 read 10-07), Q6 (pregnancy/y2k un-consolidation, shipped 09-12) and the Q10/Q14/Q15 closing notes were moved verbatim to `archive/operator-queue-2026-09.md` § "Closed items parked 2026-10-07" by Quinn. Nothing in them needs you.

## Operator-only actions (no decision needed, nobody else can do them)

- **[operator, host] 10-11 (Ops, incidents `reports/funnel/incidents/2026-10-05-063000.md`, `2026-10-08-063000.md`):** 5 of the 7 mornings before today did not run (10-05/06/08/09/10) — the host was asleep on battery each time; the 10-08 and 10-10 runners started in a dark wake, hung at preflight and left 0-byte files. **Run mornings: laptop on AC with the lid open (or an external display) by 06:30. Takes 10 s.** Fallback (~1 min): run `claude auth login` only if the scoreboard or `funnel-daily.log` shows `preflight=AUTH` — today's preflight succeeded in 4.5 s and the CLI renews its own token, so no re-auth is needed now. If the Claude app restores a stale scheduled session, close it (a stale session restored on a new day is a real start).
- Earlier operator-only items (all cleared 09-28; Q13 shipped 09-28 as #208) are verbatim in the archive.

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
