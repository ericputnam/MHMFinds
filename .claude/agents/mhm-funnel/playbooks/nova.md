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

## 2026-10-02
- Tried: E158 (T0, PR #247 `6c737f2` + fix-forward #250 `7dbae73`, data apply `e130a7d`): checking the competitor "8 missing creators" claim led to the profile table, and all 20 CreatorProfile rows were seed accounts (placeholder email domain, 0 OAuth), 20/20 isVerified. `pageProfileFrom()` now ignores the verified flag on placeholder accounts. `creator-placeholder-unverify.ts` flipped all 20 (dry run first, frozen plan = rollback file on main). Batch-1b paper for the favorites-ranked 8, not covered by Q23.
- Before → after: claim card hidden on seed-backed live pages 8/8 → 0/8; seed profiles verified 20 → 0; mods with a false badge 71 → 0. The 8 pages drew 11 landing sessions/7d. Of the 8 favorites-ranked creators missing from E137, 5 have no page (1–3 SFW mods). E7 graded KILL: 147 engaged sessions 09-04→10-01 vs ≥200 (blog's makeup post: 2,031).
- Verdict: MORE DATA (read 2026-10-16; keep if 0/8 hidden, 0 seed verified, /creator/* 7d ≥95%).
- Next time: rank creators by slug, not raw author. Raw author missed SIMcredible (3 spellings, 138 mods) and double-counted Simenapule. Also, a dry run that writes the rollback file must refuse to overwrite it: my post-apply dry run emptied the 20-row plan in the worktree before #250.

## 2026-10-01
- Tried: E151 (T0, PR #237 `e50dba6`): claim promotion now sets `isVerified` with the handle. `/creator/[slug]/` gates both the badge and the E144 claim card on `profile.isVerified`; the claim form creates the row at the schema default (false) and E129's promote wrote only `handle`, so the first promoted claimant would have landed on their own page still reading "Claim this page". Pure `promotionData()` in `lib/creatorClaimReview.ts`; the test derives the flag name from its output and asserts it is the field the page reads (3 of 14 cases red on bea25bb).
- Before → after: DB 2026-10-01: 20 profiles, 20 verified, 0 pending, 0 promotions ever — the 09-30 inbox premise ("20 unverified") was wrong; the bug was latent, not live. Fields the promote write sets of the fields the page reads: 0/1 → 1/1.
- Verdict: MORE DATA (read 2026-10-11 with E122/E129; keep if every `creator-claim`/`promote` audit row's profile has isVerified=true, with /creator/* landing 7d ≥95% of 558).
- Next time: check the before-snapshot before trusting an inbox line's count — one 5-line DB read turned "20 unverified profiles" into "0, latent write gap". And `gh pr merge` exit 1 after a win is "already merged", not "not merged": read `gh pr view --json state` before retrying. Onboarded is still 0 and Q23 (T2, 2 days unanswered) is the only feed into this path.

## 2026-09-30
- Tried: E144 (T0, PR #228): diagnosed 0 claim starts on the population, not the CTA. GA4 09-23→09-29: /creator/* 558 landing sessions, /submit-mod/ 1 view total, 0 with `?creator=`; DB: 0 ModSubmission rows source='Creator Claim' ever, 4 submissions lifetime (last 2026-01-10), 0 pending profiles. The CTA was server-rendered above the grid but a slate-500 footnote — and the visitor is a fan (~1 landing/page/week), not the creator. Shipped `CreatorClaimCard` in the hero: visible "Claim this page" + fan-forward "Send them this page" (copies the claim URL with `&ref=share`, GA4 `creator_claim_share`), hidden on verified profiles; hub copy no longer routes claims through the bare form.
- Before → after: claim views 0/wk, share events 0 (no surface) → read 2026-10-14.
- Verdict: MORE DATA (read 2026-10-14; keep if ≥10 `creator_claim_share` events OR ≥3 `/submit-mod/?creator=` views in 14d, with /creator/* landing 7d ≥95% of 558).
- Next time: when a CTA reads 0 on 500+ sessions, ask who is in the sessions first — an ask aimed at 1-in-500 visitors needs the other 499 to carry it. Outreach (Q23) is still the only direct feed.

## 2026-09-29
- Tried: (a) E137 creator outreach package (T2, queued): top 20 hub creators by 28d download clicks, page + claim URL per row, template, and the isCreator decision in one file. (b) E137-b (T0, PR #217 `949b536`): 'creator' added to page-rpm OTHER_APP_PREFIXES; class test covers every NEXTJS_PREFIXES entry and every app/ route dir, red pre-fix on exactly /creator/ (2 cases).
- Before → after: /creator/* landing sessions 116 (09-15→09-21) → 558 (09-22→09-28, GA4 apex). The top 20 hold only 202/1,408 28d clicks, 5–26 each; 11/20 publish mainly on TSR, and 8 are TSR-only with no contact route of their own. Onboarded 0, claims 0.
- Verdict: MORE DATA (read 2026-10-13).
- Next time: `sourceUrl` on scraped mods is the MHM blog post, not the creator. Read `downloadUrl` for a creator's channel. And if the next batch skips TSR-only creators, rank from 21+ rather than re-sorting.
