# Ideas inbox — archived lines, 2026-10 (verbatim; nothing deleted)

## Done 2026-10-13 (Nova, E197: house accounts excluded in lib/funnel/creatorOnboarding.ts)

- [ ] [ops] onboarded counts the 01-06 approval from a non-admin account named after the operator (author "SimwithShan"); real external onboarded = 2 (1 approved). Decide: exclude operator alt accounts in creatorOnboarding.ts (T0). — Nova 10-12


## Done 2026-10-13 (Rowan, E200: accessories title-only + `--accessories-untitled`, 640 rows)

- [x] [rowan] accessories (891 rows) has a junk top 24: Elf Bar Vape, MC Command Center, Kiddie Pool, Mortem Realistic Deaths, More Traits in CAS, Breakfast Foods. Repair title-only; measure how many titles support the type before any page uses it. — Rowan 10-12

## Closed, archived by Quinn 2026-10-16 (verbatim)
- [x] [sage] Today's two IndexNow lines (12:54Z mods=0, 12:57Z mods=78) suggest the IndexNow step can run before ingest's rows land; read tomorrow's mods_check before changing step order. — Sage, 10-07 — closed 10-14 (E177 KEEP): the two lines were two runner starts 3 min apart (E176 duplicate run); ages 0–0.1 h on 3/5 mornings since show ingest lands first. No step-order change.
- [x] [rio] B2 leg 2 MET 10-15: joins 7d 4 (10-08) / 3 (10-15) <5, Q17 dropped → affiliates-only 10-15→10-31 (E213, rio-verdict-2026-10-15.md §5). October non-ad $160–170. Quinn: targets.json B2 is yours to rewrite. — Rio 10-15
- [x] [rio] Item D re-pitched 10-15 as Q29 (one-post dry run, 7× `08-20`, 0× `04-20`, invariants PASS; E213); drops 10-22 if silent. — Rio 10-15
- [x] [ops] /creator/* landings 7d 323 (10-04→10-10) = 57.9% of 558; organic+AI 137 vs 193 prior wk — re-baseline before the E144 (10-14) and E166 (10-17) reads. — Nova 10-12
- [x] [ops] re-baseline the `/creator/*` ≥95% guards on organic sessions (89/154/97 by week); the 558 baseline was 74% Direct. — Nova 10-11 → done E204 10-14 (site-relative organic+AI, scoreboard row)
- [x] [rowan] eyes/makeup top-24 junk — done E207 10-14 (73 pins, 71 written; eyes 7→0, makeup 3→0, makeup-cc 4→0).
- [x] [rowan] makeup-cc eyebrows/blush/lipstick off-type — done E214 10-15 (110 written, 9 keeps; top-24 off-type 25 → 0).

## Parked 2026-10-16 by Quinn (open, verbatim — owner pulls the line back when it becomes the move; ModDetailPage red test also tracked in CLAUDE.md "Still open")
- [ ] [cass] `__tests__/components/ModDetailPage.test.tsx` "toggles favorite state…" is red on main (pre-existed #244/#247): after the click no button named /favorited/i appears; suspect #219 (E138 `useModFavoriteState`). Fix the mock or the optimistic update. — Ops 10-02
- [ ] [sage] IndexNow --since-last-run dedupe (the optional half of the 09-29 line), only if mods_check shows repeat pushes matter. — Sage, 10-07
- [ ] [pip] The hard cap of 21 rows/run limits a top-up to ~0.63 d against 33.5 posts/day. The floor can't reach 2 d without Q11 (plugin scheduling rows ahead) or a Tier 2 cap raise. — Pip, 10-07
- [ ] [ops] `pin-seo-audit.py --ids` report filename collides within a day (runway-basis half shipped as E208, Ops 10-14). — Pip 10-11
- [x] [cass][rio] E152 trending KILL for the 10-15 read (0.66/1K vs 2.62); if KILL, the /go slot returns to a Patreon/connect ask, not another email box (E4 already KILLED there). — Cass 10-12
- [x] [rio→pip] Singapore Direct spike inflates headline #3: 10-12 1,600 sessions Direct/Chrome/apex, 1 user=1 session=1 pv; also 09-27 (2,203), 10-08 (1,074), 10-13 (831); 28d excess 6,278 = 1.77% of sessions, Mediavine counts them at ~$0. Classify (GA4 segment or MV geo ticket) by 10-21 (E206). — Rio 10-14
- [x] [rowan] makeup-cc registry + copy (T1): after E214 the grid is ~828, so "900+"/"over 900" in metaTitle, metaDescription and intro is false; `contentTypeIn` omits `lashes` (41 rows; +lashes ≈ 869). Say "800+", recompute `expectedCount`. — Rowan 10-15
- [x] [rio→pip] Singapore Direct/Chrome stream 10-14: 1,845 sessions (41 engaged), 28d excess 8,469 = 2.37% (1.77→1.93→2.37 in 3 days); MV counts them as sessions but not monetizable (50.95% vs 58.72%). Feeds the E206 classification leg 10-21. — Rio 10-16

### Closed 2026-10-16, second batch (E152 KILL → E219; Singapore Direct classified by E216; makeup-cc lashes shipped as E221)
- [x] [cass][rio] E152 trending KILL for the 10-15 read (0.66/1K vs 2.62); if KILL, the /go slot returns to a Patreon/connect ask, not another email box (E4 already KILLED there). — Cass 10-12
- [x] [rio→pip] Singapore Direct spike inflates headline #3: 10-12 1,600 sessions Direct/Chrome/apex, 1 user=1 session=1 pv; also 09-27 (2,203), 10-08 (1,074), 10-13 (831); 28d excess 6,278 = 1.77% of sessions, Mediavine counts them at ~$0. Classify (GA4 segment or MV geo ticket) by 10-21 (E206). — Rio 10-14
- [x] [rowan] makeup-cc registry + copy (T1): after E214 the grid is ~828, so "900+"/"over 900" in metaTitle, metaDescription and intro is false; `contentTypeIn` omits `lashes` (41 rows; +lashes ≈ 869). Say "800+", recompute `expectedCount`. — Rowan 10-15
- [x] [rio→pip] Singapore Direct/Chrome stream 10-14: 1,845 sessions (41 engaged), 28d excess 8,469 = 2.37% (1.77→1.93→2.37 in 3 days); MV counts them as sessions but not monetizable (50.95% vs 58.72%). Feeds the E206 classification leg 10-21. — Rio 10-16
- [ ] [ops] Smoke JSONs are deleted with their worktree (E133 could only read 6 surviving files). Copy each to the operator's logs/ so the slug-rotation read is durable. — Ops 10-12
- [ ] [ops] Run-liveness Team health should read the hang=1 / asleep line and the .stderr file so a MISSED day names its cause. — Ops 10-12
- [ ] [ops] `context-budget.ts` fails `Cannot find module 'glob'` on 10-07/08/10/11 (WARN only); runner cleanup logs `git worktree remove failed …funnel-2026-09-22-21276(-pip)` every run (prune once + test); runner log timestamps switch MDT/EDT — stamp an explicit zone. — Ops 10-11

## Closed / parked 2026-10-17 (verbatim)
- [ ] [rio→pip] Sessions vs 4-wk mean 10-06→10-11: −6.4/−4.4/+1.6/−4.0/−4.1/−3.0%; 10-11's −3.0 is the 09-27 Direct spike (2,657) in the control — ex it the Sunday reads +0.9%. — Rio 10-13
- [x] [cass] Issue-06 reject hash → `EXCLUDED_RECIPIENT_HASHES` → E226 #320 (10-17).
- [x] [pip→rio] guardrail sessions line subtracts the whole SG segment → E227 #326 (10-17).
- [x] [quinn] /creator/* guard basis — **decided 10-17:** source-matched (E225) becomes the verdict basis from 10-25 if E225 prints on ≥5/7 mornings; until then the row shows both and E144's 10-28 grade cites both. A site control must match the slice's source mix. — Quinn 10-17
- [ ] [ops] `_patreon-auth.ts` token refreshes leave no durable row — log one line (no token) so E131's refresh leg is observable. — Rio 10-11
- [ ] [rio] same-incident test point (b) should ratio each unit against the site ex the best unit (or Content), not the blended drop. — Rio 10-07

## Done 2026-10-18 (moved verbatim by Pip — superseded by the Q28 10-18 addendum and E230)

- [ ] [pip] Q11 inflow gap, quantified 10-14: writer plugin inserts ~21 rows/day (147/7d) but 136/147 sit at the 2025-01-01 placeholder until posting day, so 0 real-dated rows exist on 10-15..10-21 and all 42 rows in the 14-day horizon are Pip top-ups. Runway can only cross 2 d if the plugin dates rows ahead (writer/MHMUtils change, T2) — a cap raise would not fix it. — Pip 10-14
