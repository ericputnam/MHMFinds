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

**Tier 2 queue (Quinn 10-31):** no operator replies since 10-23. New: Q40 (third social batch, drops 11-07). Tier 1 shipping 11-01 unless stopped: E305 (#414 "stop 414") and the E304 apply ("stop E304 apply"). Status paragraphs from 10-23/10-28/10-29 are verbatim in `archive/operator-queue-2026-10.md` § "Status paragraphs moved 2026-10-31".

**Tier 2 queue (Quinn 10-30):** no operator replies since 10-23. Q33 DROPPED 10-30 (7-day rule). New: Q35 gallery-poses redirect (Rowan), Q36 Patreon members post (Cass), Q37 November non-ad bet A/B (Rio, decide by 11-05), Q38 badge outreach (Nova), Q39 catalog pins for 20 unpinned collections (Pip). Q34 (social batch, drops 11-04) and Q32 (Mediavine JWT, ≈11-12) stay open.

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
| T1 | Nova | **E304 apply — approve the 7 pending Atino00 creator submissions through the ownership gate, applies 2026-11-01 unless "stop E304 apply".** CurseForge API confirms author Atino00 on all 7 projects (262–13,215 downloads each); account atino00 is the submitter; no terms, no money; identity still needs `/admin/creator-claims` promotion, so the profile stays unverified. Creates 7 `/mods/[id]` pages + `/creator/atino00/` (PR #421 5c69ff0 PASS shipped the code only). Reversible: `npx tsx scripts/agents/approve-submissions.ts --rollback`. Command (from a `main` checkout): `npx tsx scripts/agents/approve-submissions.ts --ids=cmus9uhjzfcbk3nf48hbrbede,cmus9yh4wfccn3nf4b2dc64sj,cmusa21whfcdz3nf4zrdbumlm,cmusa4yypfcf73nf478xwohl2,cmusa73z8fcg73nf4ra0ffp9w,cmusac86cfcic3nf4t1bo835g,cmusahftdfckg3nf4dmbqbh8k --apply`, then a `ledger-commit.sh` row + `reports/funnel/triage/` report the same day. Read 11-14. | "stop E304 apply" |
| T1 | Cass | **E305 — /go post-Patreon-connect email opt-in copy A/B (PR #414), merges 2026-11-01 unless "stop 414".** Half of new accounts (52 of 102, 10-24→10-30) come from Patreon sign-in and only 1 of them is subscribed; the one email ask they get converts 3 of 77 viewers. Copy-only, outside ad anchors, both arms now say "every two weeks". Read 11-15. | "stop 414" |
| T1 | Cass | **Newsletter issue 07 run 1 SENT 10-23 12:02Z: 100/100, 0 failed (ledger c9bb094, PR #362).** The remaining 137 subscribers are held because the list grew +35 since the 10-21 dry run (202 → 237), which trips the draft's pre-committed >30 stop-and-ask. All 35 are post-10-21 opt-ins (33 via sign-up opt-in, 33 distinct IPs, no bursts) — two days of normal growth because the send slipped a day (the 10-22 run MISSED at preflight). **Quinn 10-23 (after Nova's E260 read): the tail is the post-10-12 cohort, which is where the ~115 scripted sign-ups live (Q33) — run 1 was entirely pre-10-12 and is clean. Runs 2–3 ship Sat 10-24 only AFTER Cass hash-suppresses the scripted-shaped addresses via `sendExclusions` (Tier 0, her first move), then the ≤100/run path as before; "stop newsletter-07" still blocks.** Read 10-29 with E240. | "stop newsletter-07" |

Closed Tier 1 rows (#275 cc hub, #335 eyes-cc hub, #328 invite-01, issue 05/06) and the Q28 / Q-E21 closed stubs are verbatim in `archive/operator-queue-2026-09.md` § "Parked 2026-10-23 (Quinn)".

## Tier 2 — needs your decision

### Q40 · Approve the third social draft batch (Pip, E301, Tier 2 — public posts in a human's voice; filed 2026-10-31, drops 11-07)
Six drafts in `reports/funnel/social/drafts/2026-10-31/` (PR #418): 2 Reddit posts (GShade presets; the /games/sims-4/female-clothes/ page), 2 short-video scripts (must-have mods; gameplay mods, both adeepindigo), 2 Tumblr posts (ReShade presets; Black Sims 4 CC). Lint 6/6 pass, every draft names the mod and creator. No channel account exists yet (your to-do), so an approval posts nothing until one does; Pip posts only where an account exists, one ledger row per post. Reply **"approve social 2026-10-31"**, **"approve social 2026-10-31 except 06,15"** (by file number), or **"reject social 2026-10-31 because …"**. Silence by 11-07 = archived unposted. Q34 (10-25 batch) drops 11-04 and E283 (10-29 batch) is also unposted — one reply covering all three batches is fine: "approve social all".

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

### Q32 · Renew the Mediavine reporting token (Rio, Tier 2 — env var, operator-only; filed 2026-10-23, hard date 2026-11-12)
The reporting token in `scripts/mcp-mediavine/.env.local` (variable `MEDIAVINE_JWT`; the runner copies this file from your main checkout into every agent worktree) expires **≈ 2026-11-12** (20 days at 10-23; the scoreboard flag counts down daily). It is a ~1-year token with no refresh endpoint, so renewal is a once-a-year paste: log in at reporting.mediavine.com, in the DevTools console run `copy(JSON.parse(localStorage.dashboard).jwt)`, then in the main checkout `{ echo "MEDIAVINE_JWT=$(pbpaste)"; echo "MEDIAVINE_SITE_ID=14318"; } > scripts/mcp-mediavine/.env.local` and `npx tsx scripts/mcp-mediavine/server.ts --selftest` (a metrics-summary JSON = good; `AUTH_EXPIRED` = stale). **Vercel: nothing to set** — no `app/` or `lib/` code reads it (repo grep 0); only the scripts do. **What breaks on expiry:** `revenue-guardrail.ts` throws on its Mediavine pull, writes no `guardrail-<date>.json`, and the runner carries `GUARD_STATUS=unknown` — the breaker can neither clear nor trip, so Tier 1 merges stall (could-not-run = WARN, never a rollback); the scoreboard's Ad-revenue section and 28d headline print "Mediavine unavailable"; `history.json` revenue rows go null (the 28d line becomes unmeasurable); `page-rpm-snapshot` and the daily Mediavine report stop. Reply **"Q32: done"** after the paste; Rio re-pitches once on 11-05 if silent; past 11-12 the team runs Tier 0 on GA4 only until renewed.

Dropped under the 7-day rule and moved verbatim to `archive/operator-queue-2026-10.md` § "Dropped items moved 2026-10-31": Q33 (gate scripted sign-ups at the route, dropped 10-30), Q31 (DKIM + seed mailboxes, dropped 10-28), Q30 (Singapore crawler edge challenge, dropped 10-23), Q29 (Amazon tag in one post, dropped 10-22). Each can be re-pitched with new evidence only.

Closed/shipped items Q8 (poison-row hardening, deployed 09-21), Q4 (Patreon tier relaunch — **CLOSED 09-28 by operator: won't do; do not re-pitch tier or pricing changes**), Q5 (Patreon OAuth membership, shipped 09-07/08; E19 read 10-07), Q6 (pregnancy/y2k un-consolidation, shipped 09-12) and the Q10/Q14/Q15 closing notes were moved verbatim to `archive/operator-queue-2026-09.md` § "Closed items parked 2026-10-07" by Quinn. Nothing in them needs you.

## Operator-only actions (no decision needed, nobody else can do them)

- **GA4 custom dimensions (Rio, E295/E306, re-asked 10-31, ~2 min):** register `source_type` and `partner` as event-scoped custom dimensions (property 437117335 → Admin → Custom definitions) so the affiliate read can split the blog Amazon block from the grid by parameter instead of by path (the Data API 400s on `customEvent:source_type` today).
- **Amazon Associates earnings (Rio, E295/E306, re-asked 10-31):** share the 10-27→11-11 earnings for tag `musthavemod04-20` (or grant read access) before the 11-11 read so the #391 block's leg grades in dollars, not clicks (44 clicks in its first 4 live days, 11/day).
- **Claude CLI refresh token (Ops, E264, 10-23):** the Claude CLI refresh token now on disk expires **2026-11-20 06:02** — run `claude auth login` in a terminal before 11-15. Lifetime is not fixed (the 09-02 login lasted ~50 d, today's shows ~28 d; no documented figure). From 11-15 the digest prints a ⚠️ line until you do.

- **[operator, host] 10-11 (Ops, incidents `reports/funnel/incidents/2026-10-05-063000.md`, `2026-10-08-063000.md`):** 5 of the 7 mornings before today did not run (10-05/06/08/09/10) — the host was asleep on battery each time; the 10-08 and 10-10 runners started in a dark wake, hung at preflight and left 0-byte files. **Run mornings: laptop on AC with the lid open (or an external display) by 06:30. Takes 10 s.** Fallback (~1 min): run `claude auth login` only if the scoreboard or `funnel-daily.log` shows `preflight=AUTH` — today's preflight succeeded in 4.5 s and the CLI renews its own token, so no re-auth is needed now. If the Claude app restores a stale scheduled session, close it (a stale session restored on a new day is a real start).
- Earlier operator-only items (all cleared 09-28; Q13 shipped 09-28 as #208) are verbatim in the archive.

Resolved/closed items (Q9 closed 09-22, E74 shipped 09-21, evening-check item closed 09-22, Q12 applied, Q1 shipped, Q3 closed, and the last-30-days closed log) plus the full dated status history of every open item live verbatim in `archive/operator-queue-2026-09.md`. The file as it stood before the 2026-09-23 rewrite is appended there in full.
