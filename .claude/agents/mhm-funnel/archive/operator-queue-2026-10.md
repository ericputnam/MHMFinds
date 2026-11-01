# Operator queue archive — 2026-10

Verbatim records moved out of `operator-queue.md` to keep it under its 16,000-byte context budget (SD-12).

## Dropped items moved 2026-10-31 (Quinn, verbatim)

### Q33 · Gate scripted sign-ups at the route (Nova, Tier 2 — auth) — **DROPPED 2026-10-30** under the 7-day rule (filed 10-23, re-pitched once 10-28, no reply). Scripted sign-ups stay diagnostic-only (E260, `lib/funnel/signupQuality.ts`, hash-suppressed from sends by E270); not re-pitched unless the scripted-shaped share passes 25% of form sign-ups (7d: 4 of 52).

### Q31 · Sign the newsletter with DKIM + two seed mailboxes (Cass, E240) — **DROPPED 2026-10-28** under the 7-day rule (filed 10-19, no reply by 10-26; recorded 10-28 because the 10-26 run MISSED and the 10-27 run never landed). Mail stays unsigned (`spf=pass dkim=none dmarc=pass`); E240 grades on GA4 alone. A later **"dkim on"** / **"seed"** still executes as written. Full text in the archive.

### Q30 · Challenge the Singapore crawler at the edge (Pip, E216) — **DROPPED 2026-10-23** under the 7-day rule (filed 10-16, no reply). Segment is 5.8% of 28d sessions (E236), ex-segment the sessions line reads ≈96.6%; the scoreboard already prints `direct_ex_sg_bot`, Pip keeps the ex-segment line in every read. A later **"Q30: challenge SG"** (one Vercel Firewall rule, country = SG → Managed Challenge, rollback = delete the rule) or **"Q30: mv ticket"** still executes as written. Full text in the archive.

### Q29 · Item D — fix the Amazon tag in one post (Rio, E213) — **DROPPED 2026-10-22** under the 7-day rule (filed 10-15, no reply; recorded 10-23 because the 10-22 run never started). The Amazon leg of the 11-11 affiliate read now grades **"unmeasurable"**, not $0. A later **"Q29: apply 5848"** still executes as written (sha-verified same-length swap, `apply --prod --approved-snapshot`, rollback = same tool reversed). Full text in the archive.

## Status paragraphs moved 2026-10-31 (Quinn, verbatim)

**Guardrail 2026-10-23 (Rio):** 🟢 GREEN — finalized 10-21 $187.68 vs $186.84 (+0.4%); the identity `mon_pv × imp/mon_pv × CPM` is flat on every leg (+1.1% / −0.4% / −0.2%); the headline RPM +2.5% is mix in our favour — Singapore (direct) was 139 sessions = 1.25% of the day vs 6.29% on the controls, ex-segment RPM $17.03 vs $17.09 (−0.3%), Mediavine monetizable-session RPM +0.5%; 3-day −6.4% / −7.6% is the 10-19 Monday (70% of the gap) plus 10-20 (32%) and rolls off on 10-24; health ok; 28d line 98.08% revenue / 102.51% sessions (ON LINE run 20). E255 KEEP: 10-20 finalized $179.30 = 94% of its line (bar 90%), so the Monday was a one-day Mediavine-side dip and Tier 1 resumes today; no Mediavine ticket. 10-22 partial already $179.97 (100.6%); the line holds on 10-24 unless 10-22 earns under $138.15. **Affiliates-only through 10-31:** pipe read 09-29→10-22 gtracing 18 on-site / Impact 13 / 0 actions / $0 (72.2% recorded, kill read 11-11); Envato 9 / 0, Canva 3 / 0; `affiliate_click` 7d 9 clears the 10-29 bar (≥5); Q29 dropped 10-22 → the Amazon leg grades "unmeasurable". **Q32 filed (Tier 2):** the Mediavine reporting token expires ≈ 11-12 — a once-a-year paste, instructions in the item; without it the breaker cannot grade and Tier 1 stalls. Full read `reports/funnel/rio-verdict-2026-10-23.md`. **Tier 2 queue (Quinn 10-23):** Q28 dropped 10-21, Q29 10-22, Q30 10-23 under the 7-day rule; Q31 drops 10-26; Q32 and Q33 new. The 10-22 run MISSED (CLI OAuth expired at preflight) — nothing shipped that day; recorded here 10-23.

**Tier 2 queue (Quinn 10-28):** Q31 dropped 10-28 (its 10-26 drop date fell on two mornings the loop did not process the queue: 10-26 MISSED, 10-27 ran on a dead network and never landed); Q33 re-pitched once (drops 10-30); Q34 new — Pip's 10-25 social batch has waited 3 days without being shown to you because the 10-25 digest stopped at section 1 and the 10-27 digest never reached main. No operator replies found since 10-23.

**Tier 2 queue (Quinn 10-29, evening re-run — the morning run MISSED at preflight):** no operator replies found since 10-23; Q34 (social batch 10-25) and Q33 (sign-up gate, drops 10-30) and Q32 (Mediavine JWT, 13 days) stay open; Q31 stays dropped. The 10-27 and 10-28 digests that never reached `main` ride in today's daily PR. Watch: BELOW LINE by directive (PR #397) — 28d sessions 100.4% of the old-mix line but 96.6% ex-crawler and ≈94% on the stepped Dec-600k daily line; the day is re-weighted to AUDIENCE moves.
---

## Status paragraphs moved 2026-11-01 (verbatim)

**Tier 2 queue (Quinn 10-31):** no operator replies since 10-23. New: Q40 (third social batch, drops 11-07). Tier 1 shipping 11-01 unless stopped: E305 (#414 "stop 414") and the E304 apply ("stop E304 apply"). Status paragraphs from 10-23/10-28/10-29 are verbatim in `archive/operator-queue-2026-10.md` § "Status paragraphs moved 2026-10-31".

**Tier 2 queue (Quinn 10-30):** no operator replies since 10-23. Q33 DROPPED 10-30 (7-day rule). New: Q35 gallery-poses redirect (Rowan), Q36 Patreon members post (Cass), Q37 November non-ad bet A/B (Rio, decide by 11-05), Q38 badge outreach (Nova), Q39 catalog pins for 20 unpinned collections (Pip). Q34 (social batch, drops 11-04) and Q32 (Mediavine JWT, ≈11-12) stay open.

## Closed Tier 1 rows moved 2026-11-01 (verbatim)

| Tier 1 | Owner | What | Reply to block |
|---|---|---|---|
| T1 | Cass | **Newsletter issue 07 run 1 SENT 10-23 12:02Z: 100/100, 0 failed (ledger c9bb094, PR #362).** The remaining 137 subscribers are held because the list grew +35 since the 10-21 dry run (202 → 237), which trips the draft's pre-committed >30 stop-and-ask. All 35 are post-10-21 opt-ins (33 via sign-up opt-in, 33 distinct IPs, no bursts) — two days of normal growth because the send slipped a day (the 10-22 run MISSED at preflight). **Quinn 10-23 (after Nova's E260 read): the tail is the post-10-12 cohort, which is where the ~115 scripted sign-ups live (Q33) — run 1 was entirely pre-10-12 and is clean. Runs 2–3 ship Sat 10-24 only AFTER Cass hash-suppresses the scripted-shaped addresses via `sendExclusions` (Tier 0, her first move), then the ≤100/run path as before; "stop newsletter-07" still blocks.** Read 10-29 with E240. | "stop newsletter-07" |
