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

**Guardrail 2026-10-18 (Rio):** 🟢 GREEN — finalized 10-16 $207.61 vs $196.55 (+5.6%) at RPM 16.89 (+2.8%) / sessions +2.8%; a clean day: Singapore Direct segment 520 = 4.22% (controls 2.44%), GA4 ex-segment sessions +0.1%, Mediavine monetizable-session share 57.7% vs 58.0% control, monetizable-session RPM +3.4%; 3-day revenue +7.8%, health ok; 28d line 98.87% revenue / 101.57% sessions (ON LINE run 16) — E220 leg 2 and E227 leg 1 MET; merges clear. 10-17 partial already $286.92 (+9.3%), so the line holds on 10-19; it holds on 10-20 unless 10-18 earns under $141.21. **Affiliates-only through 10-31:** pipe read 09-29→10-17 gtracing 12 on-site / Impact 8 clicks / 0 actions / $0 (kill read 11-11); the Amazon leg grades "unmeasurable" (Q20 dropped 10-18); all 5 live offers resolve 200 — no dead link to fix; affiliate_click 7d 5 sits on the 10-29 bar (≥5). Q29 drops 10-22. Full read `reports/funnel/rio-verdict-2026-10-18.md`. **Tier 2 queue (Quinn 10-18):** Q20 and Q26 dropped 10-18 under the 7-day rule; Q28 drops 10-21, Q29 10-22, Q30 10-23.
---

## Tier 1 — shipping unless you say stop

| Tier 1 | Owner | What | Reply to block |
|---|---|---|---|
| T1 (done) | Sage | **#275** `/games/sims-4/cc/` hub **MERGED 2026-10-12** (9d8ab3e, veto window silent; Quinn ran the ship protocol, verify result on the ledger). E182 read 10-26; rollback = revert the squash. | — |
| T1 (done) | Sage | **#335 MERGED 2026-10-19 11:17Z** (d5f8527, verify PASS; E231 read 11-01) — `/games/sims-4/eyes-cc/` — eyes, eyebrows & lashes hub (E231): 269 SFW verified mods, all free, inserted before makeup-cc in the registry (takes the primary crumb for those 269 from makeup-cc), inbound from skin-details + makeup-cc. type-check, build and 10 test files (154/154) green. Merges **2026-10-19** by the ship protocol unless stopped; rollback = revert the squash. | "stop eyes-cc hub" |
| T1 (done) | Cass | **#328 invite-01 (E233) MERGED 2026-10-19 10:50Z (4374ceb, verify PASS) and SENT 10:55Z: 22 attempted / 22 sent / 0 failed; read 10-26.** Original item: One-time email to the **22** weekly-email subscribers who have no account (the other 159 of 181 already have one): "Create a free account" → normal sign-up, utm_campaign=invite-01. No token, no scarcity, the unsubscribe link is the weekly one. Oldest first, max 50 per run, a hash record so nobody is invited twice, prior rejects excluded. Quinn runs `--live` after the merge. Read 10-26, keep if ≥2 accounts and ≤1 unsubscribe. | "stop invite-01" |
| T1 | Cass | **Newsletter issue 07 (E247) ships Thursday 10-22 unless you say "stop newsletter-07".** Same path as issue 06: `--weekly --live` (100 oldest) then `--resume-after` ≥1 h later (100), then a third run ≥1 h later for the tail (≥2). Dry run 10-21 (E254): 213 → 11 excluded (10 weekly DSN hashes + 1 reject) → 202; tail 102; the 1 hard DSN since 10-19 was invite-01 and is already excluded; 31/31 links `utm_campaign=weekly-issue-07`; seed refused (no env). Still unsigned (Q31). Draft `reports/funnel/drafts/newsletter-07-2026-10-22.md`. Read 10-29 with E240. | "stop newsletter-07" |
| T1 (done) | Cass | Newsletter issue 05 **SENT 2026-10-11 11:34** (window closed 10-08; the 10-09 run never fired): 97 of 98 delivered, 1 hard reject, 0 excluded, 31/31 links tagged `utm_campaign=weekly-issue-05` (E184, read 10-18, keep cadence if ≥8 sessions AND ≤2 unsubscribes). Issue 06 goes Thursday 10-15 by the same path; say "stop newsletter-06" to block. | "stop newsletter-06" |

## Tier 2 — needs your decision

### Q31 · Sign the newsletter with DKIM + two seed mailboxes (Cass, E240, filed 2026-10-19, drops 10-26)
Our weekly mail is **not DKIM-signed**: the one DSN with a receiver verdict reads `spf=pass dkim=none dmarc=pass`, and no `_domainkey` record answers on 8 common selectors. DMARC is `p=none`. 82 of 96 issue-05 readers are Gmail and gave 0 sessions; unsigned bulk mail is a Promotions/Spam risk there. Two asks, both yours (Tier 2: hosting DNS + env var): (1) **"dkim on"** — enable DKIM for musthavemods.com in the BigScoots mail panel (it publishes the `_domainkey` TXT). (2) **"seed"** — put 1 Gmail + 1 Outlook address you own in `.env.local` as `NEWSLETTER_SEED_TO` (comma list, ≤3). Run `npx tsx scripts/agents/newsletter-send-test.ts --weekly --seed --dry` once: it refuses and prints only the sha256 of each address; reply with those hashes and Cass adds them to `SEED_ALLOWLIST_HASHES`. Then one seed copy goes to those mailboxes only, never a subscriber. Silence by 10-26 = no DKIM, no seed; E240 grades on GA4 alone.

### Q30 · Challenge the Singapore crawler at the edge (Pip, E216, filed 2026-10-16, drops 10-23)
GA4 country = Singapore AND source `(direct)` is an automated headless-Chrome walk, not demand: 28d 09-17→10-14 **14,740 sessions = 4.10% of the 359,162 headline**, 1 user = 1 session = 1 pageview (1.001 / 1.002), 99.0% on two fixed resolutions (1280x1200 9,686, 1366x1366 4,668), ~8,200 distinct landing pages, all 24 hours. It made this week's Direct read +79.9% (ex-segment **−7.4%**) and all-sessions +5.7% (ex-segment +0.5%). Mediavine counts it in the RPM denominator at ~$0 (10-12 MV 14,240 vs GA4 14,220 sessions), so printed RPM runs ~4% under the human RPM. Full read `reports/funnel/pip-singapore-direct-2026-10-16.md`; re-run `scripts/agents/direct-bot-read.ts` any day. GA4 cannot filter by geography; the remedies are yours (Tier 2: Vercel account config / a message in your voice). **Reply `Q30: challenge SG`** → you add one Vercel Firewall custom rule (Project → Firewall → country equals SG → Managed Challenge); human SG non-Direct demand is ≈13 sessions/day (≈$0.21/day at $16 RPM) and a challenge, not a block. Rollback: delete the rule (instant). **Optionally `Q30: mv ticket`** → Pip drafts a Mediavine support note on the Singapore IVT for you to send. Silence → drops 10-23; Pip keeps printing the ex-segment line in reports and asks Ops for a scoreboard column instead, nothing more.

### Q29 · Item D — fix the Amazon tag in one post, Kadence-safe (Rio, E213, filed 2026-10-15, drops 10-22)
Post 5848 ("The Absolute Best Gamer Gifts For Every Budget") carries **7 Amazon links tagged `musthavemod08-20` and 0 tagged `musthavemod04-20`** — the only store id Amazon credits — so every click there earns nothing. Read-only dry run today over SSH (`scripts/wp/kadence-safe-replace.ts dry-run`, artifact `reports/funnel/item-d-dryrun-5848-2026-10-15.txt`): same-length literal swap, 48,894 bytes before and after, Kadence block invariants PASS, before sha256 `d9534acc…fd95b`. Tier 2 because it writes post content on prod. **Reply `Q29: apply 5848`** and Rio writes the approved-snapshot JSON (post id → that before-sha), runs `apply --prod --approved-snapshot` (the tool refuses if the live sha has moved since the dry run), purges `bs_cache`, and confirms the 7 tags on the live page within the hour; rollback is the same tool with from/to swapped (sha-verified, auto-restore on mismatch). Silence → drops 10-22, no re-pitch; the Amazon leg of the 11-11 affiliate read then grades "unmeasurable", not $0. Ceiling honest: Amazon actions 0 on record, $0–10/mo.

### Q28 · Writer plugin should date pins ahead (Pip, E202 follow-on) — **DROPPED 2026-10-21** under the 7-day rule (filed 10-14, E230 read-back added 10-18, no reply by 10-21). The SD-10 floor keeps running at ≤7 top-up rows per posting date; 518 of 745 writer rows since 09-21 still sit at the `2025-01-01` placeholder until their posting day. A later **"Q28: date ahead N"** still executes as written (Pip packages the MHMUtils plugin diff for you to apply). Full text in the archive.

### Q-E21 · E21 "else revert" condition (Sage) — **CLOSED 2026-10-19 under the 7-day rule: silence = hold**, exactly as the item defined it (filed 10-07, no reply by 10-14). E21 stays live; Sage re-reads 2026-11-02 (28 days after Google's canonical switch to the apex article) with the same rule. A later **"revert E21"** still runs the PR #63 revert through the functions.php push process. Full text in the archive.

### Q26 · Review 7 pending creator submissions (Nova, E172) — **DROPPED 2026-10-18** under the 7-day rule (filed 10-04, re-pitched smaller 10-11, no reply by 10-18). E172 closes with Q26; Nova stops pitching new creator recruiting until a reply arrives. Atino00's 7 Build/Buy mods stay pending in `/admin/submissions/`; a later **"Q26: approve 7"** / **"Q26: reject 7"** still executes as written. Full 10-04 and 10-11 text in the archive.

### Q27 · SD-10 wording (Pip, E170) — **CLOSED 2026-10-11**, no reply in 7 days = the strict reading stands: ≤7 top-up rows per *posting date* across runs (tool #261 enforces it). Body in the archive.

### Q25 · End-of-post email capture on WordPress articles (Cass, E167) — **DROPPED 2026-10-17** under the 7-day rule (filed 10-03, re-pitched narrower 10-11, no reply by 10-17). E167 closes NOT-RUN; PR #253 closed, branch kept. A later **"approve E167 pilot"** (5 biggest WP articles, same RPM floor and rollback) or **"approve E167"** still executes as written — the operator runs the prod push and the BigScoots purge. Full 10-03 package and the 10-11 re-pitch in the archive.

### Q11-b · Writer pins — **CLOSED 2026-09-28; the E82 diagnosis was wrong** (body verbatim in `archive/operator-queue-2026-09.md` § "Closed items parked 2026-10-07"; nothing for you).

### Q17 · Sponsorship (Rio, E89) — **DROPPED 2026-10-07** under the 7-day rule (filed 09-23, re-pitched smaller 09-30, no reply by the 10-07 drop date). E89 closes NOT-RUN. The media kit and the two hub-slot drafts stay at `reports/funnel/drafts/sponsorship-media-kit-2026-09-23.md`; a later **"send hub"** or a price still executes as written. Full text in the archive.

### Q18 · Weekly newsletter cron line (Cass, E78) — **DROPPED 2026-10-07** under the 7-day rule (no reply by its own 10-07 date). Part A (#226) stays live and inert: no cron line, 401 without `CRON_SECRET`, no-op without `NEWSLETTER_WEEKLY_ENABLED`. A later **"approve 78-cron"** still adds the one `vercel.json` line. 78 subscribers, still 1 issue ever (09-14). Full text in the archive.

### Q23 · Creator outreach, batch 1 (Nova, E137) — **DROPPED 2026-10-14** under the 7-day rule (filed 09-29, re-pitched smaller 10-07, no reply by 10-14). E137 closes NOT-RUN; 0 of 20 sent. The template and both batch files stay at `reports/funnel/drafts/creator-outreach-*.md`; a later **"approve E137 A+B own-channel"** still executes as written. Full text in the archive.

### Q24 · Pinterest-SEO copy on the writer's queued pins (Pip, E135 follow-on) — **DROPPED 2026-10-14** under the 7-day rule (filed 09-29, re-pitched "seo 3" 10-07, no reply by 10-14). The audit and the ids file stay in `reports/funnel/`; a later **"seo 3"** or **"apply writer seo"** still executes as written. Full text in the archive.

### Q20 · GA4 outbound-click measurement for the blog (Rio, E134 item F) — **DROPPED 2026-10-18** under the 7-day rule (filed 09-29, re-pitched to one admin toggle 10-11, no reply by 10-18). The Amazon outbound leg of the 11-11 affiliate read grades "unmeasurable", not $0. A later **"ga4 outbound"** (Enhanced Measurement → Outbound clicks ON, property 437117335) still executes as written. Q19/Q21/Q22 bodies verbatim in the archive.

Closed/shipped items Q8 (poison-row hardening, deployed 09-21), Q4 (Patreon tier relaunch — **CLOSED 09-28 by operator: won't do; do not re-pitch tier or pricing changes**), Q5 (Patreon OAuth membership, shipped 09-07/08; E19 read 10-07), Q6 (pregnancy/y2k un-consolidation, shipped 09-12) and the Q10/Q14/Q15 closing notes were moved verbatim to `archive/operator-queue-2026-09.md` § "Closed items parked 2026-10-07" by Quinn. Nothing in them needs you.

## Operator-only actions (no decision needed, nobody else can do them)

- **[operator, host] 10-11 (Ops, incidents `reports/funnel/incidents/2026-10-05-063000.md`, `2026-10-08-063000.md`):** 5 of the 7 mornings before today did not run (10-05/06/08/09/10) — the host was asleep on battery each time; the 10-08 and 10-10 runners started in a dark wake, hung at preflight and left 0-byte files. **Run mornings: laptop on AC with the lid open (or an external display) by 06:30. Takes 10 s.** Fallback (~1 min): run `claude auth login` only if the scoreboard or `funnel-daily.log` shows `preflight=AUTH` — today's preflight succeeded in 4.5 s and the CLI renews its own token, so no re-auth is needed now. If the Claude app restores a stale scheduled session, close it (a stale session restored on a new day is a real start).
- Earlier operator-only items (all cleared 09-28; Q13 shipped 09-28 as #208) are verbatim in the archive.

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
