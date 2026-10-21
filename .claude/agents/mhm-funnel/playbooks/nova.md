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

## 2026-10-21
- Tried: E253 (T0, #354) — read "11.5/post, halved" before touching ingest. 4 of the 8 "posts" were single Manual admin rows (03:45–03:52Z, TSR/Patreon/CurseForge mod pages as sourceUrl). The denominator now counts writer-host posts only (exact host allowlist) and prints "+ N other". E239 KEEP (17/17 posts since 09-30 lastmod ≤ stamp; 10-20/10-21 refreshed=1, created 20/24, errors 0). E204 KEEP (6/7 mornings print PASS/FAIL, 0 "—"; 10-15 has no scoreboard file).
- Before → after: 92 from 8, 11.5/post → 92 from 4 posts + 4 other, 22.0/post (prior 23.6), live lib read 10-21 10:45Z. Ingest dropped nothing.
- Verdict: MORE DATA (read 2026-10-28).
- Next time: before you read a ratio, list its denominator rows. Here 4 of 8 were not posts.

## 2026-10-20
- Tried: E246 (T0, paper): writer brief W43 `reports/funnel/writer-brief-W43-2026-10-20.md` — GSC demand (impr≥50, no top-10 post) × catalog coverage (facet ≥40 SFW mods, stale >60d); 5 topics (body presets, witch, streetwear, boho, winter outerwear). E197 graded KEEP (scoreboard prints "2 (1 with >=1 approved; 1 house account excluded)", pending 7 oldest 16d). E239 interim: refreshed=1 created=20 → 0 zero-create re-fetches.
- Before → after: topics adopted W36–W38 0/15 → W43 read 2026-10-27 (keep if ≥2/5 of the next 5 posts match).
- Verdict: PENDING (E246); 7 pending submissions all one creator, 17 d old — operator-only.
- Next time: spot-check a facet's top rows before briefing it — `script-mod`, `workout`/`fitness` and `romantic` all surfaced adult/gameplay bleed flagged SFW (handed to Rowan, not briefed). The shared registry is Quinn's to edit: put the row text in the report.

## 2026-10-19
- Tried: E239 (T0, #343) — `--refreshed` compared lastmod to max(createdAt) only; a 0-create re-scrape never moved it. Now max(createdAt, lastScraped), and the re-scrape stamps lastScraped on its own post's rows.
- Before → after: 2 posts re-fetched/run, 10 runs 10-10→10-19, 0 created (67 found). Dry run 10-19: 4 selected (Oct-2026 new, 23 to create; Sept-2026 edited; nursery; y2k), stamps 30/36/30. Same-post filter caught 1 cross-post downloadUrl match (37→36) — it would have hidden another post's edit.
- Verdict: MORE DATA (read 2026-10-21).
- Next time: a freshness watermark must move on every successful visit, not only on creates.

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
