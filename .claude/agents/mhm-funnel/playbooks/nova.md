<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Nova — Content & Creators — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers content: which briefs the writer used and how they performed, collection pages that worked, creator outreach response rates.

Entry format:

```
## YYYY-MM-DD
- Tried: …  (tier, PR/link)
- Before → after: <metric> <n> → <n> (<window>)
- Verdict: KEEP / KILL / MORE DATA (read on <date>)
- Next time: one sentence
```

## Kill log
_(ideas you tried that did not work — never re-propose without saying what changed)_

---

## 2026-10-18
- Tried: E232 (T0) — "New mods 7d 80 (130), −38%" diagnosed before touching the scraper: ingest OK 7/7 mornings 10-12→10-18, errors 0, 392/392 rows in 28d from the one path (writer posts). The row now prints its denominator (`lib/funnel/catalogInflow.ts`, 8 tests). E172 CLOSED with Q26 (leg 1 MET at 2/1/1 house, leg 2 0/7 reviewed).
- Before → after: 80 from 4 posts, 20.0/post vs 130 from 5, 26.0/post. First-time posts created 63/67 (94%, prior week 130/135); the gap is one re-dated 2025 post (48 found, 17 created, 31 already in) and a 10-item post. Writer last posted 10-15 → the row reads 70 on 10-20, 21 on 10-22 without a new post.
- Verdict: MORE DATA (read 2026-10-25: denominator printed ≥6/7 mornings).
- Next time: a count with no denominator cannot tell "supply broke" from "the human posted less". Read the ingest log's OK lines and the per-post created/found before proposing to run or fix the scraper.

## 2026-10-17
- Tried: E166 graded. E225 (T0, #322 5605877): the /creator/* row now prints a source-matched control next to the site-relative guard. Diagnostic only.
- Before → after: guard 91.3% FAIL → source-matched 99.0% (10-09→15). By source, creator vs expected: google 57/51.5, bing 52/69.7, chatgpt 5/10.8 (sitewide chatgpt 337→154), other 23/6.4. Nothing broken on our side (sitemap 549, 200 + canonical, mod→creator links present). E166: 1 claim promoted (dor-e 10-16), 0 409s, seed-rename untested in production.
- Verdict: E166 KEEP/close. E225 MORE DATA (read 2026-10-24).
- Next time: a site control has to match the slice's source mix. A slice that is 18% ChatGPT, graded against a site that is 1.4% ChatGPT, fails whenever ChatGPT moves.

## 2026-10-16
- Tried: E158 graded. E218 (T0) — IndexNow `--creators-changed` in the daily runner, plus one catch-up push of the 72 creator pages with a new mod since the last full push (09-26).
- Before → after: E158 legs: 0/8 seed pages hide the claim card (curl 8/8 "Claim this page", 0 badges); 0/20 seed verified; 0 mods on verified no-OAuth profiles. /creator/* organic+AI 165 → 137 (10-09→15; site 89.9%, ratio 92.3%, FAIL). The 8 treated pages were 6 → 1, so they are not the cause. By source: Google 52 → 57, Bing 77 → 52 (−32% vs site −10%), chatgpt 29 → 5. No creator push since 09-26; 549 pages, 66 with a new mod since.
- Verdict: E158 KEEP on its own legs; the guard fail is Bing+ChatGPT, untreated. E218 read 2026-10-23.
- Next time: split a guard fail by source before blaming a page change. A one-off IndexNow push decays, so it should have been a daily changed-only push from E95.

## 2026-10-13
- Tried: E197 (T0) — `HOUSE_ACCOUNT_USER_IDS` in `lib/funnel/creatorOnboarding.ts`. It excludes the operator's non-admin test account (username = operator's name, the 01-06 "SimwithShan" approval) from onboarded, and its pending rows still queue. The scoreboard prints "N house account excluded". 4 tests, 3 red pre-fix. E137 graded NOT-RUN (0 sent, Q23 14 d unanswered, drops 10-14, no 3rd pitch).
- Before → after: onboarded 3 (2 approved) → 2 (1 approved), from a live read through the lib (DB 10-13). The only approved external creator is doree (01-10). Pending 7, oldest 9 d, all Atino00.
- Verdict: MORE DATA (read 2026-10-20: the scoreboard prints 2/1/1 house).
- Next time: `isAdmin` is not "is the team". Before counting a population, check every account in it by username and author string. With n=3, one test account was 33% of the charter number for 9 days.

## 2026-10-12
- Tried: E190 (T0, PR pending at write) — backfill of the E183 pending profile + `Mod.creatorId` for pre-#274 approvals. Planner reuses `planApprovalProfile` and adds a backfill-only rule (author must name the account). 12 tests, 2 mutations red. Plan: 4 read, 1 write (doree), 3 skip (no-mod, anonymous, author-not-account).
- Before → after: approvals linked 0/4 → 1/4 (3 can never qualify); pending profiles 0 → 1. 20 of 22 empty `?creator=` claim views = one 09-30 06–09 ET burst (direct, all new users, 4 browsers, 3 countries) right after public PR #228 printed `…?creator=<slug>`: extractors stop at `<`. Real claim views 2. The 01-06 approval came from a non-admin account named after the operator.
- Verdict: MORE DATA (read 2026-10-25 with E183).
- Next time: never put a URL template with `<slug>` in a public PR body. Scrapers fetch it and pollute the read.

## 2026-10-07
- Tried: E178 — read-only creator-flag audit (`creator-flag-audit.ts` + lib, 9 tests, 2 mutations red). PR #270 `efdf3d0`, Tier 0, merged after Rio's CLEAR (first gate attempt timed out at 600 s, retry passed); verify PASS 07:29.
- Before → after: 343 isCreator accounts = 20 seed + 1 admin + 322 form ticks; 3 submitted, 0 profiles, 1 weak catalog match, 221 player-active, 79 dormant; download-click 57.1% vs 55.9% unflagged control, favorites 41.9% vs 53.3% → read 10-14. Reads: E137-b KEEP/close, E139 KEEP (4/7 rows, durability → Ops), E141 KEEP (5/5), E17 KILL (61 engaged vs 200), E22 KEEP (lighting 18/25 fixtures; CAS-lighting cleanup → Rowan).
- Verdict: MORE DATA (read 2026-10-14). "Flagged but never submitted" is not a supply pool — a checkbox 13–24% of sign-ups tick each month with player behaviour. The one real gap is routing: creator sign-ups return to the referring page, no welcome email, portal only in the navbar (held: touches app/sign-in).
- Next time: run the control before calling a population a leak — one unflagged-cohort comparison (57.1% vs 55.9%) retired a 10-04 inbox line that had been pitched as the "next supply leak"; and re-read the ledger before writing HELD-RED in a playbook (E166 had shipped four days earlier).

## 2026-10-04
- Tried: E172 submissions triage (T0, PR pending, NOT merged — RED-RPM breaker). Read-only DB: 11 submissions = 4 approved (Nov 29–Jan 10: 2 anonymous, 2 creator accounts) + 7 pending, all from ONE creator account created 10-03 via `/api/creator/submissions`, posted 10:51–11:09, unreviewed. All 20 CreatorProfile rows are seeds; 0 submitters hold one. The scoreboard counted `CreatorProfile ∩ submitter`, and the dashboard path and the approve route never create a profile, so only E122 claimants could ever count. Fix: `lib/funnel/creatorOnboarding.ts` (non-admin isCreator-or-profile account with ≥1 submission) + "Submissions pending review" row. Guard red pre-fix on 4/7.
- Before → after: onboarded 0 → 3 (2 with ≥1 approved); pending 7, oldest 1d (DB 2026-10-04). E17 pre-read: decor-cc 54 engaged / 70 sessions 28d (09-06→10-03, GA4 apex) vs ≥200 bar.
- Verdict: MORE DATA (read 2026-10-11: keep if the scoreboard prints 3/7 and pending is reviewed in ≤7d).
- Next time: before trusting a zero, follow one row through every path that writes it. Approving a dashboard submission still links no `creatorId` (no profile), so hosting is by `author` string only. That is the next supply gap.

## 2026-10-03
- Tried: E166 (T0; shipped as PR #252 `7312738` 10-03 — this line said HELD-RED until 10-07, stale): a real creator claiming any of the 8 seed-held pages got a 409 at promote ("handle already belongs to another profile", for a profile nobody owns). `planPromotion` now returns `displaceSeed` when the holder is a placeholder account with 0 OAuth logins, and the route renames the seed to `seed-<handle>` in the same `prisma.$transaction` as the promote. The rename re-asserts the seed predicate (`seedHolderWhere()`, built from PLACEHOLDER_ACCOUNT_DOMAINS), so if it no longer holds, the promote hits P2002 and both writes roll back. The predicate fails closed on an unchecked `seed-<handle>`. isCreator was not touched.
- Before → after: seed-held handles that 409 at promote 8/20 → 0 (code; no DB write today). Tests 13 new, 8 red on de969ec; 4 mutations each red. /creator/* landings 7d (09-26→10-02) were 587 vs a baseline of 558 (105%).
- Verdict: MORE DATA (read 2026-10-17; keep if 0 seed-handle 409s AND ≥1 promotion when a claim arrives).
- Next time: the claim path has no blockers left that code can fix. Every remaining 0 sits upstream at Q23 (0 sent, drop date 10-06).

_Older entries (2026-10-01→10-02) are in `archive/playbooks/nova-2026-10.md`; up to 2026-09-30 in `archive/playbooks/nova-2026-09.md`; nothing deleted._
