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

**Guardrail 2026-10-23 (Rio):** 🟢 GREEN — finalized 10-21 $187.68 vs $186.84 (+0.4%); the identity `mon_pv × imp/mon_pv × CPM` is flat on every leg (+1.1% / −0.4% / −0.2%); the headline RPM +2.5% is mix in our favour — Singapore (direct) was 139 sessions = 1.25% of the day vs 6.29% on the controls, ex-segment RPM $17.03 vs $17.09 (−0.3%), Mediavine monetizable-session RPM +0.5%; 3-day −6.4% / −7.6% is the 10-19 Monday (70% of the gap) plus 10-20 (32%) and rolls off on 10-24; health ok; 28d line 98.08% revenue / 102.51% sessions (ON LINE run 20). E255 KEEP: 10-20 finalized $179.30 = 94% of its line (bar 90%), so the Monday was a one-day Mediavine-side dip and Tier 1 resumes today; no Mediavine ticket. 10-22 partial already $179.97 (100.6%); the line holds on 10-24 unless 10-22 earns under $138.15. **Affiliates-only through 10-31:** pipe read 09-29→10-22 gtracing 18 on-site / Impact 13 / 0 actions / $0 (72.2% recorded, kill read 11-11); Envato 9 / 0, Canva 3 / 0; `affiliate_click` 7d 9 clears the 10-29 bar (≥5); Q29 dropped 10-22 → the Amazon leg grades "unmeasurable". **Q32 filed (Tier 2):** the Mediavine reporting token expires ≈ 11-12 — a once-a-year paste, instructions in the item; without it the breaker cannot grade and Tier 1 stalls. Full read `reports/funnel/rio-verdict-2026-10-23.md`. **Tier 2 queue (Quinn 10-23):** Q28 dropped 10-21, Q29 10-22, Q30 10-23 under the 7-day rule; Q31 drops 10-26; Q32 and Q33 new. The 10-22 run MISSED (CLI OAuth expired at preflight) — nothing shipped that day; recorded here 10-23.

**Tier 2 queue (Quinn 10-28):** Q31 dropped 10-28 (its 10-26 drop date fell on two mornings the loop did not process the queue: 10-26 MISSED, 10-27 ran on a dead network and never landed); Q33 re-pitched once (drops 10-30); Q34 new — Pip's 10-25 social batch has waited 3 days without being shown to you because the 10-25 digest stopped at section 1 and the 10-27 digest never reached main. No operator replies found since 10-23.

**Tier 2 queue (Quinn 10-29, evening re-run — the morning run MISSED at preflight):** no operator replies found since 10-23; Q34 (social batch 10-25) and Q33 (sign-up gate, drops 10-30) and Q32 (Mediavine JWT, 13 days) stay open; Q31 stays dropped. The 10-27 and 10-28 digests that never reached `main` ride in today's daily PR. Watch: BELOW LINE by directive (PR #397) — 28d sessions 100.4% of the old-mix line but 96.6% ex-crawler and ≈94% on the stepped Dec-600k daily line; the day is re-weighted to AUDIENCE moves.
---

## Operator to-do — growth plan 2026-10-24 (`growth-plan.md`)
Decided in chat 10-24: Dec target 600k sessions; posts on new social channels need your approval until 11-07 and must not read as AI-written.
- [ ] Create TikTok, YouTube, Instagram, Tumblr accounts; grant posting access (operator: "today", 10-24)
- [ ] Approve each social draft batch — reply "approve social <date>" (Tier 2 until 11-07)
- [ ] Set the paid-ads test budget (proposal: $100–200, one pack launch)
- [ ] Set the biweekly contest prize budget
- [ ] Approve the contest rules when Nova drafts them

## Tier 1 — shipping unless you say stop

| Tier 1 | Owner | What | Reply to block |
|---|---|---|---|
| T1 | Cass | **Newsletter issue 07 run 1 SENT 10-23 12:02Z: 100/100, 0 failed (ledger c9bb094, PR #362).** The remaining 137 subscribers are held because the list grew +35 since the 10-21 dry run (202 → 237), which trips the draft's pre-committed >30 stop-and-ask. All 35 are post-10-21 opt-ins (33 via sign-up opt-in, 33 distinct IPs, no bursts) — two days of normal growth because the send slipped a day (the 10-22 run MISSED at preflight). **Quinn 10-23 (after Nova's E260 read): the tail is the post-10-12 cohort, which is where the ~115 scripted sign-ups live (Q33) — run 1 was entirely pre-10-12 and is clean. Runs 2–3 ship Sat 10-24 only AFTER Cass hash-suppresses the scripted-shaped addresses via `sendExclusions` (Tier 0, her first move), then the ≤100/run path as before; "stop newsletter-07" still blocks.** Read 10-29 with E240. | "stop newsletter-07" |

Closed Tier 1 rows (#275 cc hub, #335 eyes-cc hub, #328 invite-01, issue 05/06) and the Q28 / Q-E21 closed stubs are verbatim in `archive/operator-queue-2026-09.md` § "Parked 2026-10-23 (Quinn)".

## Tier 2 — needs your decision

### Q34 · Approve the first social draft batch (Pip, E265, Tier 2 — public posts in a human's voice; filed 2026-10-28 for the 10-25 batch, drops 11-04)
Seven drafts sit in `reports/funnel/social/drafts/2026-10-25/` (PR #377, landed 10-25): 2 short-video scripts (new Sims 4 mods 2026; career mods), 2 Reddit posts (realistic mods; skin overlays), 3 Tumblr posts, plus `creator-optout.txt`. Nothing has posted. Each draft names its channel and the mod page it links; none of the four channel accounts exists yet (your to-do above), so an approval posts nothing until at least one does — Pip posts only where an account exists and writes one ledger row per post. Reply **"approve social 2026-10-25"** (all 7), **"approve social 2026-10-25 except 03,04"** (by file number), or **"reject social 2026-10-25 because …"**. Silence by 11-04 = the batch is archived unposted and the pipeline drafts the next one (Tier 2 until 11-07 per `growth-plan.md`).

### Q33 · Gate scripted sign-ups at the route (Nova, Tier 2 — auth; filed 2026-10-23, decide by 10-27)
Since the week of 10-12 a script has been creating accounts through the sign-up form: ~115 accounts, random-case letters-only usernames (`aAaaAAAaaAAaaAAa`-shaped), 104 distinct IPs on 115 rows, one Mac-Chrome UA family, every checkbox ticked (creator + newsletter), 0 submissions, 6% ever favorited or downloaded (humans 76%). In the last 7 days they are **61 of 113 form sign-ups and 68 of 87 `signup-optin` subscriber rows** — so the "owned-audience adds 7d 258" headline is ≈70% script and the 200/wk target is not actually met. GA4 `sign_up` (page JS) = 43 = the human count, so the script posts straight to the API. Recommendation (auth → Tier 2, yours): on `/api/auth/signup` and `/api/waitlist` require same-origin (`Sec-Fetch-Site`/Origin) plus a hidden honeypot field, and reject letters-only usernames with ≥6 case flips at the route (same rule as `lib/funnel/signupQuality.ts`, PR #368 — scoreboard prints the split from 10-24). No deletes. Cass hash-suppresses the existing addresses from every send (Tier 0, her lane, before the issue-07 tail goes out). **Reply "Q33: gate"** and Nova ships the route change as a Tier 1 PR with the rule and tests; silence → re-pitch once 10-27, drop 10-30, headline keeps printing the net-of-script number. **Re-pitched 2026-10-28 (Quinn, the one re-pitch): 7d read 10-28 = 26 of 74 form sign-ups scripted-shaped (35%), signup-optin 53 → 27 net; every send already hash-suppresses them (#371), so the remaining cost is a headline nobody can trust. Smaller ask: reply "Q33: honeypot" for the honeypot + same-origin check alone (no username rule). Silence → dropped 10-30.**

### Q32 · Renew the Mediavine reporting token (Rio, Tier 2 — env var, operator-only; filed 2026-10-23, hard date 2026-11-12)
The reporting token in `scripts/mcp-mediavine/.env.local` (variable `MEDIAVINE_JWT`; the runner copies this file from your main checkout into every agent worktree) expires **≈ 2026-11-12** (20 days at 10-23; the scoreboard flag counts down daily). It is a ~1-year token with no refresh endpoint, so renewal is a once-a-year paste: log in at reporting.mediavine.com, in the DevTools console run `copy(JSON.parse(localStorage.dashboard).jwt)`, then in the main checkout `{ echo "MEDIAVINE_JWT=$(pbpaste)"; echo "MEDIAVINE_SITE_ID=14318"; } > scripts/mcp-mediavine/.env.local` and `npx tsx scripts/mcp-mediavine/server.ts --selftest` (a metrics-summary JSON = good; `AUTH_EXPIRED` = stale). **Vercel: nothing to set** — no `app/` or `lib/` code reads it (repo grep 0); only the scripts do. **What breaks on expiry:** `revenue-guardrail.ts` throws on its Mediavine pull, writes no `guardrail-<date>.json`, and the runner carries `GUARD_STATUS=unknown` — the breaker can neither clear nor trip, so Tier 1 merges stall (could-not-run = WARN, never a rollback); the scoreboard's Ad-revenue section and 28d headline print "Mediavine unavailable"; `history.json` revenue rows go null (the 28d line becomes unmeasurable); `page-rpm-snapshot` and the daily Mediavine report stop. Reply **"Q32: done"** after the paste; Rio re-pitches once on 11-05 if silent; past 11-12 the team runs Tier 0 on GA4 only until renewed.

### Q31 · Sign the newsletter with DKIM + two seed mailboxes (Cass, E240) — **DROPPED 2026-10-28** under the 7-day rule (filed 10-19, no reply by 10-26; recorded 10-28 because the 10-26 run MISSED and the 10-27 run never landed). Mail stays unsigned (`spf=pass dkim=none dmarc=pass`); E240 grades on GA4 alone. A later **"dkim on"** / **"seed"** still executes as written. Full text in the archive.

### Q30 · Challenge the Singapore crawler at the edge (Pip, E216) — **DROPPED 2026-10-23** under the 7-day rule (filed 10-16, no reply). Segment is 5.8% of 28d sessions (E236), ex-segment the sessions line reads ≈96.6%; the scoreboard already prints `direct_ex_sg_bot`, Pip keeps the ex-segment line in every read. A later **"Q30: challenge SG"** (one Vercel Firewall rule, country = SG → Managed Challenge, rollback = delete the rule) or **"Q30: mv ticket"** still executes as written. Full text in the archive.

### Q29 · Item D — fix the Amazon tag in one post (Rio, E213) — **DROPPED 2026-10-22** under the 7-day rule (filed 10-15, no reply; recorded 10-23 because the 10-22 run never started). The Amazon leg of the 11-11 affiliate read now grades **"unmeasurable"**, not $0. A later **"Q29: apply 5848"** still executes as written (sha-verified same-length swap, `apply --prod --approved-snapshot`, rollback = same tool reversed). Full text in the archive.

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

- **Claude CLI refresh token (Ops, E264, 10-23):** the Claude CLI refresh token now on disk expires **2026-11-20 06:02** — run `claude auth login` in a terminal before 11-15. Lifetime is not fixed (the 09-02 login lasted ~50 d, today's shows ~28 d; no documented figure). From 11-15 the digest prints a ⚠️ line until you do.

- **[operator, host] 10-11 (Ops, incidents `reports/funnel/incidents/2026-10-05-063000.md`, `2026-10-08-063000.md`):** 5 of the 7 mornings before today did not run (10-05/06/08/09/10) — the host was asleep on battery each time; the 10-08 and 10-10 runners started in a dark wake, hung at preflight and left 0-byte files. **Run mornings: laptop on AC with the lid open (or an external display) by 06:30. Takes 10 s.** Fallback (~1 min): run `claude auth login` only if the scoreboard or `funnel-daily.log` shows `preflight=AUTH` — today's preflight succeeded in 4.5 s and the CLI renews its own token, so no re-auth is needed now. If the Claude app restores a stale scheduled session, close it (a stale session restored on a new day is a real start).
- Earlier operator-only items (all cleared 09-28; Q13 shipped 09-28 as #208) are verbatim in the archive.

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
