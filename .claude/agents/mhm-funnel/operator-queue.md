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

**Tier 2 queue (Quinn 10-30):** no operator replies since 10-23. Q33 DROPPED 10-30 (7-day rule). New: Q35 gallery-poses redirect (Rowan), Q36 Patreon members post (Cass), Q37 November non-ad bet A/B (Rio, decide by 11-05), Q38 badge outreach (Nova), Q39 catalog pins for 20 unpinned collections (Pip). Q34 (social batch, drops 11-04) and Q32 (Mediavine JWT, ≈11-12) stay open.

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

### Q39 · Queue one catalog pin for each of the 20 never-pinned collection pages (Pip, E291-b, Tier 2 — SD-10 bulk queue change; filed 2026-10-30, drops 11-06)
13 of 33 collection pages have ever been pinned and 8 of the top-10 by sessions have not (female-clothes 255/7d, male-clothes 227, skin-details 219, hair-cc 141, furniture-cc 127, goth-cc 98, loading-screens 87, …). `insert-catalog-pins.py`, 1 row per page, spread over 10 days at ≤2/day on top of the writer's rows, sessions-ranked. Reply: `approve E291-b catalog pins 20`. (Pins/day cadence is **not** re-pitched: runway is 1.8 d with 1,737 stranded rows, so inventory binds, not cadence.)

### Q38 · Badge outreach to the top-20 creators by sessions (Nova, E293-b, Tier 2 — outreach in your name; filed 2026-10-30, drops 11-06)
Nobody has used the badge since #372: GA4 10-23→10-29 shows 0 `creator_badge_copy`, 0 `creator_badge_cta`, 0 `creator-badge` sessions. Proposed: Nova drafts the note for your sign-off, then sends to the top-20 `/creator/*` by sessions at 20/week, offering the badge-page link only (no terms, no money). Reply: `APPROVE E293-b: Nova drafts the badge outreach note for operator sign-off, then sends to top-20 /creator/* by sessions, 20/week`.

### Q37 · November non-ad bet: A or B (Rio, E295, Tier 2 — pricing; filed 2026-10-30 from the 10-29 verdict §c, decide by 11-05)
A = $3 "skip the wait" perk (+$96/mo at a 0.5% free→$3 assumption on 6,352 free members). B = creator rev-share (no dollar base yet). Reply: `Q37: A` or `Q37: B`.

### Q36 · Post the November "what's new" Patreon members post (Cass, E294, Tier 2 — public post in your voice; filed 2026-10-30, drops 11-06)
Draft at `reports/funnel/drafts/patreon-free-post-2026-11.md` (PR #405). Paste, edit, post to all members (6,352 free + 57 paid; ~2 minutes). Every link carries `utm_campaign=patreon-post-2026-11`; read on D+7, keep if ≥100 tagged sessions. Reply: `E294: posted <date>`.

### Q35 · Retarget the `/sims-4-gallery-poses/` 301 to `/games/sims-4/gallery-poses/` (Rowan, E296, Tier 2 — `vercel.json` redirect; filed 2026-10-30, drops 11-06)
50 of the 88 rows on the new gallery-poses page were scraped from that legacy article; its 301 (`vercel.json` ~lines 194/199) still lands on the broad `/games/sims-4/poses/` page, where the "gallery poses" family sits at position 6–9 (12 clicks / 227 impressions in 28d). Moving it sends exact-intent equity to the exact-intent page; the poses entry comment and `REDIRECTED_LEGACY_PATHS` in `canonical-trailing-slash.test.ts` move with it. Reply: `approve E296-redirect: /sims-4-gallery-poses/ → /games/sims-4/gallery-poses/`.

### Q34 · Approve the first social draft batch (Pip, E265, Tier 2 — public posts in a human's voice; filed 2026-10-28 for the 10-25 batch, drops 11-04)
Seven drafts sit in `reports/funnel/social/drafts/2026-10-25/` (PR #377, landed 10-25): 2 short-video scripts (new Sims 4 mods 2026; career mods), 2 Reddit posts (realistic mods; skin overlays), 3 Tumblr posts, plus `creator-optout.txt`. Nothing has posted. Each draft names its channel and the mod page it links; none of the four channel accounts exists yet (your to-do above), so an approval posts nothing until at least one does — Pip posts only where an account exists and writes one ledger row per post. Reply **"approve social 2026-10-25"** (all 7), **"approve social 2026-10-25 except 03,04"** (by file number), or **"reject social 2026-10-25 because …"**. Silence by 11-04 = the batch is archived unposted and the pipeline drafts the next one (Tier 2 until 11-07 per `growth-plan.md`).

### Q33 · Gate scripted sign-ups at the route (Nova, Tier 2 — auth) — **DROPPED 2026-10-30** under the 7-day rule (filed 10-23, re-pitched once 10-28, no reply). Scripted sign-ups stay diagnostic-only (E260, `lib/funnel/signupQuality.ts`, hash-suppressed from sends by E270); not re-pitched unless the scripted-shaped share passes 25% of form sign-ups (7d: 4 of 52).

### Q32 · Renew the Mediavine reporting token (Rio, Tier 2 — env var, operator-only; filed 2026-10-23, hard date 2026-11-12)
The reporting token in `scripts/mcp-mediavine/.env.local` (variable `MEDIAVINE_JWT`; the runner copies this file from your main checkout into every agent worktree) expires **≈ 2026-11-12** (20 days at 10-23; the scoreboard flag counts down daily). It is a ~1-year token with no refresh endpoint, so renewal is a once-a-year paste: log in at reporting.mediavine.com, in the DevTools console run `copy(JSON.parse(localStorage.dashboard).jwt)`, then in the main checkout `{ echo "MEDIAVINE_JWT=$(pbpaste)"; echo "MEDIAVINE_SITE_ID=14318"; } > scripts/mcp-mediavine/.env.local` and `npx tsx scripts/mcp-mediavine/server.ts --selftest` (a metrics-summary JSON = good; `AUTH_EXPIRED` = stale). **Vercel: nothing to set** — no `app/` or `lib/` code reads it (repo grep 0); only the scripts do. **What breaks on expiry:** `revenue-guardrail.ts` throws on its Mediavine pull, writes no `guardrail-<date>.json`, and the runner carries `GUARD_STATUS=unknown` — the breaker can neither clear nor trip, so Tier 1 merges stall (could-not-run = WARN, never a rollback); the scoreboard's Ad-revenue section and 28d headline print "Mediavine unavailable"; `history.json` revenue rows go null (the 28d line becomes unmeasurable); `page-rpm-snapshot` and the daily Mediavine report stop. Reply **"Q32: done"** after the paste; Rio re-pitches once on 11-05 if silent; past 11-12 the team runs Tier 0 on GA4 only until renewed.

### Q31 · Sign the newsletter with DKIM + two seed mailboxes (Cass, E240) — **DROPPED 2026-10-28** under the 7-day rule (filed 10-19, no reply by 10-26; recorded 10-28 because the 10-26 run MISSED and the 10-27 run never landed). Mail stays unsigned (`spf=pass dkim=none dmarc=pass`); E240 grades on GA4 alone. A later **"dkim on"** / **"seed"** still executes as written. Full text in the archive.

### Q30 · Challenge the Singapore crawler at the edge (Pip, E216) — **DROPPED 2026-10-23** under the 7-day rule (filed 10-16, no reply). Segment is 5.8% of 28d sessions (E236), ex-segment the sessions line reads ≈96.6%; the scoreboard already prints `direct_ex_sg_bot`, Pip keeps the ex-segment line in every read. A later **"Q30: challenge SG"** (one Vercel Firewall rule, country = SG → Managed Challenge, rollback = delete the rule) or **"Q30: mv ticket"** still executes as written. Full text in the archive.

### Q29 · Item D — fix the Amazon tag in one post (Rio, E213) — **DROPPED 2026-10-22** under the 7-day rule (filed 10-15, no reply; recorded 10-23 because the 10-22 run never started). The Amazon leg of the 11-11 affiliate read now grades **"unmeasurable"**, not $0. A later **"Q29: apply 5848"** still executes as written (sha-verified same-length swap, `apply --prod --approved-snapshot`, rollback = same tool reversed). Full text in the archive.

Closed/shipped items Q8 (poison-row hardening, deployed 09-21), Q4 (Patreon tier relaunch — **CLOSED 09-28 by operator: won't do; do not re-pitch tier or pricing changes**), Q5 (Patreon OAuth membership, shipped 09-07/08; E19 read 10-07), Q6 (pregnancy/y2k un-consolidation, shipped 09-12) and the Q10/Q14/Q15 closing notes were moved verbatim to `archive/operator-queue-2026-09.md` § "Closed items parked 2026-10-07" by Quinn. Nothing in them needs you.

## Operator-only actions (no decision needed, nobody else can do them)

- **GA4 custom dimensions (Rio, E295, 10-30, ~2 min):** register `source_type` and `partner` as event-scoped custom dimensions (property 437117335 → Admin → Custom definitions) so the affiliate read can split the blog Amazon block from the grid by parameter instead of by path (the Data API 400s on `customEvent:source_type` today).
- **Amazon Associates earnings (Rio, E295, 10-30):** share the 10-27→11-11 earnings for tag `musthavemod04-20` (or grant read access) so the #391 block's leg grades in dollars on 11-11, not clicks (31 clicks in its first 3 days).
- **Claude CLI refresh token (Ops, E264, 10-23):** the Claude CLI refresh token now on disk expires **2026-11-20 06:02** — run `claude auth login` in a terminal before 11-15. Lifetime is not fixed (the 09-02 login lasted ~50 d, today's shows ~28 d; no documented figure). From 11-15 the digest prints a ⚠️ line until you do.

- **[operator, host] 10-11 (Ops, incidents `reports/funnel/incidents/2026-10-05-063000.md`, `2026-10-08-063000.md`):** 5 of the 7 mornings before today did not run (10-05/06/08/09/10) — the host was asleep on battery each time; the 10-08 and 10-10 runners started in a dark wake, hung at preflight and left 0-byte files. **Run mornings: laptop on AC with the lid open (or an external display) by 06:30. Takes 10 s.** Fallback (~1 min): run `claude auth login` only if the scoreboard or `funnel-daily.log` shows `preflight=AUTH` — today's preflight succeeded in 4.5 s and the CLI renews its own token, so no re-auth is needed now. If the Claude app restores a stale scheduled session, close it (a stale session restored on a new day is a real start).
- Earlier operator-only items (all cleared 09-28; Q13 shipped 09-28 as #208) are verbatim in the archive.

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
