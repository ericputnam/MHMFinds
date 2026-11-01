# Revenue guardrail — 2026-11-01 (last finalized day 2026-10-30)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (160 rows over 8 pages, oldest 2026-10-26T17:05Z ≤ window start 2026-10-27T04:00Z) · deploy in window: yes

rollback bound: in-window production deploys 75 (≤24 to auto-rollback) · target 0.1 h before window start (≤48 h) → withheld: in-window deploys 75 exceed rollback bound 24

- Revenue $211.61 (8.2%), RPM 19.11 (16.0%), sessions -6.7% vs same weekday, prior 4 weeks · 3-day revenue 11.4%

| | 2026-10-30 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $211.61 | $195.51 | 8.2% |
| session RPM | 19.11 | 16.47 | 16.0% |
| sessions | 11,071 | 11,864 | -6.7% |
| sessions, GA4 raw | 11,281 | 11,965 | -5.7% |
| **sessions ex Singapore (direct)** (E216, GA4) | 11,071 | 11,667 | -5.1% |
| **ex-segment RPM** (E271; MV revenue ÷ GA4 ex-segment sessions) | 19.11 | 16.76 | 14.1% → rate |
| 3-day revenue | $615.21 | $552.44 | 11.4% |
| 3-day RPM | 18.13 | 15.72 | 15.3% |

sessions ex Singapore (direct) (E216, GA4): raw 11,281 vs 11,965 (-5.7%) → ex-segment 11,071 vs 11,667 (-5.1%) · segment 210 = 1.86% of the day (controls 2.49%, 4 same weekdays)

ex-segment RPM (E216; Mediavine revenue ÷ GA4 sessions ex Singapore (direct)): $19.11 vs $16.76 (+14.1%) · mix alone predicts raw RPM +0.6% → rate (mix band ±1%)

Mediavine health: all ok

## Production changes since 2026-10-27 (72h before the judged day)

- vercel 2026-11-01T11:37 `d19b1db` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-8xdqb3ers-ericputnams-projects.vercel.app
- vercel 2026-11-01T02:48 `beeb3a9` ERROR chore: compound learnings from 2026-10-31 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-3trlnzdjp-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:37 `036d31a` READY funnel(ledger): after-merge: Quinn: PR #424 funnel: daily run 2026-10-31 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-azxezrvh6-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:33 `10b9e4a` READY funnel(ledger): build-watch: Quinn: PR #424 funnel: daily run 2026-10-31 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-csn7b7pug-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:32 `83d7d19` ERROR funnel: daily run 2026-10-31 (#424) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-l41mha4k4-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:29 `7f2f68e` READY funnel(ledger): after-merge: Sage: PR #423 E302 Creators in this collection — hubs link do [after judged day — judged tomorrow] — https://mhm-finds-dw5l-5ouwcdobx-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:25 `66238d1` READY funnel(ledger): build-watch: Sage: PR #423 E302 Creators in this collection — hubs link do [after judged day — judged tomorrow] — https://mhm-finds-dw5l-lu6zy6p2z-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:24 `214ac2b` ERROR funnel(sage): E302 "Creators in this collection" — hubs link down to the creator pages tha [after judged day — judged tomorrow] — https://mhm-finds-dw5l-pxjr3qt4x-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:22 `821dd41` READY funnel(ledger): after-merge: Rio: PR #420 E306 verdict 2026-10-31 (paper-only) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-p1rgf7se4-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:21 `dfc911b` READY funnel(ledger): after-merge: Sage: PR #422 E303 template lastmod git guard + IndexNow --cr [after judged day — judged tomorrow] — https://mhm-finds-dw5l-iyacfem47-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:20 `0f04e2d` READY funnel(rio): E306 verdict 2026-10-31 — October closes $144 (MISSED), 10-29 rate day, E271  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-f1trngijz-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:18 `dbf85cb` ERROR funnel(ledger): after-merge: Pip: PR #418 E300 runway top-up #20 artifacts + E301 social d [after judged day — judged tomorrow] — https://mhm-finds-dw5l-m9vsyhcam-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:16 `49a55ef` READY funnel(pip): E300 runway top-up #20 artifacts + E301 social draft batch 2026-10-31 (paper- [after judged day — judged tomorrow] — https://mhm-finds-dw5l-8i6huc4n8-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:12 `9ef6031` READY funnel(sage): E303 template lastmod git guard + IndexNow --creator-slugs for the 14 E293 p [after judged day — judged tomorrow] — https://mhm-finds-dw5l-q8y5csc13-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:11 `e0539d6` READY funnel(ledger): after-merge: Nova: PR #421 E304 ownership-gated approval path for creator  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fuw50f4xn-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:07 `5c69ff0` READY funnel(nova): E304 ownership-gated approval path for creator submissions (Tier 0 code; app [after judged day — judged tomorrow] — https://mhm-finds-dw5l-bynvg67pv-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:07 `0b08fe5` READY funnel(ledger): after-merge: Rowan: PR #419 E307 /games/sims-4/christmas-cc/ on a title-on [after judged day — judged tomorrow] — https://mhm-finds-dw5l-n3kxc4xcz-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:03 `49cdb66` READY funnel(rowan): E307 /games/sims-4/christmas-cc/ on a title-only christmas theme (Tier 0) ( [after judged day — judged tomorrow] — https://mhm-finds-dw5l-r9jbxktcq-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:02 `a2c729e` READY funnel(ledger): after-merge: Rio: PR #416 E306 affiliate-pipe-read GA4 leg — Impact and th [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ordc7jke5-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:59 `5b6f1b4` READY funnel(rio): E306 affiliate-pipe-read gains a GA4 leg — Impact and the blog Amazon block p [after judged day — judged tomorrow] — https://mhm-finds-dw5l-nscb7kmgh-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:59 `32d9cbf` READY funnel(ledger): after-merge: Pip: PR #417 test(feeds): fix red feeds.test.ts on main after [after judged day — judged tomorrow] — https://mhm-finds-dw5l-nq62q4a7z-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:56 `3c26480` READY funnel(ledger): Pip: E300 runway top-up #20 apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-a0qctj4jd-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:55 `dbaeed4` READY funnel(ledger): after-merge: Ops: PR #415 E308 deploy-verify grades a READY build containi [after judged day — judged tomorrow] — https://mhm-finds-dw5l-joaog0g9g-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:55 `202384c` READY test(feeds): assert collection feed <link rel=alternate> on the helper, not the page sourc [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ho33epi8s-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:52 `cda0c72` READY funnel(ledger): build-watch: Ops: PR #415 E308 deploy-verify grades a READY build containi [after judged day — judged tomorrow] — https://mhm-finds-dw5l-iiplvb8v4-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:51 `5ab4df4` ERROR funnel(ops): E308 deploy-verify grades a READY build containing the sha; smoke-render wall [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1al6bncm1-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:37 `52aeaf7` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-i5ovx404t-ericputnams-projects.vercel.app
- vercel 2026-10-31T02:32 `d6a86c5` READY chore: compound learnings from 2026-10-30 — https://mhm-finds-dw5l-536aeydjf-ericputnams-projects.vercel.app
- vercel 2026-10-30T12:10 `de01c84` ERROR funnel(ledger): after-merge: Quinn: PR #413 funnel: daily run 2026-10-30 — https://mhm-finds-dw5l-5g07m2zd7-ericputnams-projects.vercel.app
- vercel 2026-10-30T12:06 `cb62dbd` READY funnel: daily run 2026-10-30 (#413) — https://mhm-finds-dw5l-oz4znqae4-ericputnams-projects.vercel.app
- vercel 2026-10-30T12:04 `82d9940` READY funnel(ledger): after-merge: Cass: PR #405 E294 November Patreon all-members post draft, U — https://mhm-finds-dw5l-6b3flosqi-ericputnams-projects.vercel.app
- vercel 2026-10-30T12:02 `ca02390` READY funnel(cass): E294 November Patreon all-members post draft, UTM-tagged (Tier 0 draft, Tier — https://mhm-finds-dw5l-rbs23dv53-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:59 `7789488` READY funnel(ledger): after-merge: Rio: PR #407 E295 verdict 2026-10-30 — 28d −5.2% is W1 rate + — https://mhm-finds-dw5l-edlgj93cg-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:58 `9dafffc` READY funnel(rio): E295 verdict 2026-10-30 — 28d −5.2% is W1 rate (87%) + Singapore mix, closed  — https://mhm-finds-dw5l-o7pxnvdaa-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:54 `42db6c4` READY funnel(ledger): after-merge: Quinn: PR #398 funnel: daily run 2026-10-29 — https://mhm-finds-dw5l-kaezgrmbl-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:50 `5a4be2b` READY funnel: daily run 2026-10-29 (#398) — https://mhm-finds-dw5l-eg7webxsj-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:49 `884a0c6` READY funnel(ledger): after-merge: Pip: PR #410 E291 wedding-cc launch pin + IndexNow, E298 coll — https://mhm-finds-dw5l-oukiaprrc-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:46 `934df22` READY funnel(pip): E291 wedding-cc launch pin + IndexNow, E298 collection og:image/twitter:image — https://mhm-finds-dw5l-8chn9vtnt-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:45 `831455a` READY funnel(ledger): after-merge: Nova: PR #409 one creator, one page — fold spaced/run-togethe — https://mhm-finds-dw5l-p22vb3hkt-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:41 `854d67e` READY funnel(nova): one creator, one page — fold spaced/run-together spellings (E293, Tier 0) (# — https://mhm-finds-dw5l-awg83htak-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:41 `60c052b` READY funnel(ledger): after-merge: Sage: PR #412 E299 creators sitemap lastmod = later of templa — https://mhm-finds-dw5l-21wngk3fn-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:40 `00a8258` READY funnel(ledger): after-merge: Rowan: PR #394 20 non-poses out of /games/sims-4/poses/ + cou — https://mhm-finds-dw5l-oeabmyj4n-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:37 `039abe0` READY funnel(sage): E299 creators sitemap lastmod = later of template date and newest mod (Tier  — https://mhm-finds-dw5l-gxj129fjm-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:37 `e90c25c` READY funnel(ledger): after-merge: Rowan: PR #411 catalog: /games/sims-4/gallery-poses/ on a tit — https://mhm-finds-dw5l-e0m7atqqy-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:33 `908a2b1` READY catalog: /games/sims-4/gallery-poses/ on a title-only gallery-pose theme (E296, Tier 0) (# — https://mhm-finds-dw5l-m622n11ib-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:31 `45ca336` READY funnel(ledger): after-merge: Pip: PR #402 E282 runway top-up #19 + E283 social drafts 2026 — https://mhm-finds-dw5l-i7cmbmska-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:29 `a16bf19` READY funnel(ledger): after-merge: Sage: PR #408 E292 creator pages link to the collection hubs  — https://mhm-finds-dw5l-f1hpr2uyd-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:29 `dc56313` READY funnel(pip): E282 runway top-up #19 + E283 social draft batch 2026-10-29 (Tier 0) (#402) — https://mhm-finds-dw5l-7vsmg3bji-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:25 `1132e59` READY funnel(sage): E292 creator pages link to the collection hubs that list their mods (Tier 0) — https://mhm-finds-dw5l-lq16w7yeg-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:24 `000f51a` READY funnel(ledger): after-merge: Ops: PR #406 E297 global run-lock (no two funnel runners at o — https://mhm-finds-dw5l-pnfq4nn3i-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:22 `6c3a2d4` READY funnel(ledger): Pip: E291 wedding-cc catalog pin apply — https://mhm-finds-dw5l-ftwa1djbx-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:21 `d7a46e0` READY funnel(ops): E297 global run-lock — a funnel runner for any day waits (bounded) for anothe — https://mhm-finds-dw5l-ijvvw56in-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:21 `51c463e` READY funnel(ledger): after-merge: Sage: PR #401 E284 hand-written meta for six more mod pages a — https://mhm-finds-dw5l-h02viw2rp-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:17 `59ce8ef` READY funnel(sage): E284 hand-written meta for six more mod pages at 1.13% CTR (Tier 0) (#401) — https://mhm-finds-dw5l-1xkp6hdar-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:17 `1cad984` READY funnel(ledger): after-merge: Ops: PR #404 preflight retry after host sleep (E290) — https://mhm-finds-dw5l-gqsrtuxhw-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:14 `6bd2c42` READY funnel(ledger): MISSED 2026-10-26 retro — https://mhm-finds-dw5l-dgm3k04sb-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:13 `2cb4f09` READY funnel(ledger): after-merge: Rowan: PR #403 /games/sims-4/wedding-cc/ title-only wedding t — https://mhm-finds-dw5l-p24q3qvvg-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:13 `6ae5fb7` READY runner: retry the preflight once after a host sleep instead of grading HANG on wake (E290) — https://mhm-finds-dw5l-fzo4cqqsj-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:10 `22d2ed3` READY funnel(ledger): build-watch: Rowan: PR #403 /games/sims-4/wedding-cc/ title-only wedding t — https://mhm-finds-dw5l-pew6z1psn-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:09 `e7c15c1` ERROR funnel(rowan): /games/sims-4/wedding-cc/ on a title-only wedding theme (E289, T0) (#403) — https://mhm-finds-dw5l-3rq7y3aky-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:08 `9a95c71` READY funnel(ledger): after-merge: Rio: PR #375 E271 ex-segment RPM print + verdict 2026-10-29 — https://mhm-finds-dw5l-bfglx3qoh-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:07 `0e04508` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-91i9m8oyu-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:06 `fd83323` READY funnel(ledger): after-merge: Nova: PR #399 creator dashboard badge card (E286, Tier 0) — https://mhm-finds-dw5l-g4mub9tnx-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:05 `94e5328` READY funnel(ledger): after-merge: Cass: PR #400 E287 member opt-in view cap — https://mhm-finds-dw5l-6dqkl1gfp-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:04 `0b834d3` READY funnel(rio): E271 guardrail prints the ex-segment RPM with a mix/rate read; verdict 2026-1 — https://mhm-finds-dw5l-3eyldgd02-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:03 `a6f04c6` READY funnel(ledger): after-merge: Sage: PR #381 E268 hand-written meta for the seven gameplay-m — https://mhm-finds-dw5l-4x78lxn3m-ericputnams-projects.vercel.app
- vercel 2026-10-30T11:00 `21540f1` READY funnel(nova): creator dashboard "Get your badge" card (E286, Tier 0) (#399) — https://mhm-finds-dw5l-2rijcz5qs-ericputnams-projects.vercel.app
- vercel 2026-10-30T10:45 `a105d00` READY capture: /mods/[id] member opt-in stops after 3 unanswered views (E287, E198 KILL) (#400) — https://mhm-finds-dw5l-qluhcx0du-ericputnams-projects.vercel.app
- vercel 2026-10-30T10:29 `57f0dad` READY funnel(ledger): ledger-commit — https://mhm-finds-dw5l-1ur1ho08h-ericputnams-projects.vercel.app
- vercel 2026-10-30T10:24 `631ac76` READY funnel(ledger): Pip: E282 runway top-up #19 apply — https://mhm-finds-dw5l-a1wirrila-ericputnams-projects.vercel.app
- vercel 2026-10-30T10:24 `fb4b264` READY catalog: 20 non-poses out of /games/sims-4/poses/ by id; poses copy 570+ -> 850+ (E281) (# — https://mhm-finds-dw5l-pmn2iv9i6-ericputnams-projects.vercel.app
- vercel 2026-10-30T10:19 `f1eaf2e` READY funnel(sage): E268 hand-written meta for the seven gameplay-mod pages at 0.82% CTR (Tier 0 — https://mhm-finds-dw5l-cbs9mqla0-ericputnams-projects.vercel.app
- vercel 2026-10-30T10:01 `223c62b` READY funnel(ledger): after-merge: Cass: PR #392 E279 grid hearts → save-intent sign-up — https://mhm-finds-dw5l-lf0f98j0k-ericputnams-projects.vercel.app
- vercel 2026-10-30T08:17 `cd6504b` ERROR funnel(ledger): after-merge: Quinn: PR #397 operator watch 2026-10-29 + parked ops lines ( — https://mhm-finds-dw5l-1se2t95xg-ericputnams-projects.vercel.app
- vercel 2026-10-30T07:03 `56d7119` READY funnel: operator watch 2026-10-29 — BELOW LINE (#397) — https://mhm-finds-dw5l-guofzwolf-ericputnams-projects.vercel.app
- vercel 2026-10-30T04:37 `4bd9095` READY chore: compound learnings from 2026-10-29 — https://mhm-finds-dw5l-3m3vohtig-ericputnams-projects.vercel.app
- vercel 2026-10-30T01:43 `35e578f` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-92zjbsvm1-ericputnams-projects.vercel.app
- vercel 2026-10-30T01:40 `7f1560c` READY funnel(ledger): flush: MISSED 2026-10-29 preflight=HANG — https://mhm-finds-dw5l-qa2fuphq2-ericputnams-projects.vercel.app
- vercel 2026-10-29T19:24 `de5d102` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-87p0hij4i-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:59 `d873cc7` READY funnel(ledger): after-merge: Operator: PR #396 game + collection pages on the launcher — https://mhm-finds-dw5l-96xjgrwvn-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:55 `948204a` READY games: /games/<slug>/ and collection pages render the launcher; Sims 4 collections only on — https://mhm-finds-dw5l-nfdidxsiu-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:20 `89d6d7d` READY funnel(ledger): after-merge: Operator: PR #395 collection cover images optimized — https://mhm-finds-dw5l-9s0z9ydn5-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:15 `945bf3d` READY homepage: optimize collection cover images; pills reserve only the cover they show (#395) — https://mhm-finds-dw5l-pnr0ij1gg-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:02 `23683c9` READY funnel(ledger): Pip: E275 catalog pins gshade-presets + eyes-cc apply — https://mhm-finds-dw5l-332h9l3jq-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:02 `1c757b7` READY funnel(ledger): Pip: E274 runway top-up #18 apply — https://mhm-finds-dw5l-gcqqr7rhk-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:01 `7c40501` READY funnel(cass): E279 grid hearts become a save-intent sign-up (home, game, collection, creat — https://mhm-finds-dw5l-lmdozf1mv-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:00 `431e965` READY funnel(ledger): after-merge: Sage: PR #378 funnel(sage): E267 creator page title + meta na — https://mhm-finds-dw5l-3qcztu1ao-ericputnams-projects.vercel.app
- vercel 2026-10-28T13:56 `ab3b798` READY funnel(sage): E267 creator page title + meta name real content types and top mods (Tier 0) — https://mhm-finds-dw5l-3fm4iaewf-ericputnams-projects.vercel.app
- vercel 2026-10-28T13:56 `0f8258f` READY funnel(ledger): after-merge: Nova: PR #372 funnel(nova): "Featured on MustHaveMods" creato — https://mhm-finds-dw5l-fz9t4vzg2-ericputnams-projects.vercel.app
- vercel 2026-10-28T13:52 `1bd04e4` READY funnel(nova): "Featured on MustHaveMods" creator badge — embed page, assets, verified labe — https://mhm-finds-dw5l-gbishyl85-ericputnams-projects.vercel.app
- vercel 2026-10-28T13:34 `0656a00` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-ojnm14wwd-ericputnams-projects.vercel.app
- vercel 2026-10-27T12:44 `9e3ee33` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-l1vnmxanz-ericputnams-projects.vercel.app
- vercel 2026-10-27T05:54 `2a3547a` READY funnel(ledger): after-merge: Interactive: PR #391 blog Amazon pack block — https://mhm-finds-dw5l-p5ap04syp-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:45 `044d836` READY blog: Amazon Sims 4 pack picks at the end of every Sims post (first tracked blog affiliate — https://mhm-finds-dw5l-9eigiblu4-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:41 `e0438db` READY funnel(ledger): after-merge: Operator: PR #390 collection pill covers + gshade — https://mhm-finds-dw5l-6qokhlfd7-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:38 `a7854a6` READY homepage: cover thumbnails on every collection pill; gshade-presets gets covers (#390) — https://mhm-finds-dw5l-7wr3g8x2z-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:37 `fd9cea2` ERROR funnel(ledger): after-merge: Interactive: PR #387 #384 review follow-ups — https://mhm-finds-dw5l-2ixhv3ytk-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:33 `5275115` READY fix(email): #384 review follow-ups — unsubscribe copy, mailto spoof guard, INTERNALDATE, c — https://mhm-finds-dw5l-jxla30cmn-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:20 `5c4d9d3` READY funnel(ledger): after-merge: Interactive: PR #386 ModDetailPage stale favorite test — https://mhm-finds-dw5l-g6ls1dmvk-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:20 `3258d39` READY funnel(ledger): after-merge: Operator: PR #389 one catalogue count — https://mhm-finds-dw5l-es14sm91e-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:16 `83b6a2d` READY homepage: one catalogue count everywhere (title 17,000+ vs hero 16,000+) (#389) — https://mhm-finds-dw5l-fdck77lep-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:11 `fccaba8` READY test(mods): drive ModDetailPage favorite toggle through the real API flow (#386) — https://mhm-finds-dw5l-nsejs2vf0-ericputnams-projects.vercel.app
- commit 2026-10-31T22:48 `beeb3a9b` chore: compound learnings from 2026-10-31
- commit 2026-10-31T07:36 `036d31ae` funnel(ledger): after-merge: Quinn: PR #424 funnel: daily run 2026-10-31
- commit 2026-10-31T07:33 `10b9e4a7` funnel(ledger): build-watch: Quinn: PR #424 funnel: daily run 2026-10-31
- commit 2026-10-31T07:32 `83d7d19b` funnel: daily run 2026-10-31 (#424)
- commit 2026-10-31T07:29 `7f2f68e4` funnel(ledger): after-merge: Sage: PR #423 E302 Creators in this collection — hubs link do
- commit 2026-10-31T07:25 `66238d14` funnel(ledger): build-watch: Sage: PR #423 E302 Creators in this collection — hubs link do
- commit 2026-10-31T07:24 `214ac2be` funnel(sage): E302 "Creators in this collection" — hubs link down to the creator pages tha
- commit 2026-10-31T07:22 `821dd416` funnel(ledger): after-merge: Rio: PR #420 E306 verdict 2026-10-31 (paper-only)
- commit 2026-10-31T07:21 `dfc911b1` funnel(ledger): after-merge: Sage: PR #422 E303 template lastmod git guard + IndexNow --cr
- commit 2026-10-31T07:20 `0f04e2d2` funnel(rio): E306 verdict 2026-10-31 — October closes $144 (MISSED), 10-29 rate day, E271 
- commit 2026-10-31T07:18 `dbf85cb0` funnel(ledger): after-merge: Pip: PR #418 E300 runway top-up #20 artifacts + E301 social d
- commit 2026-10-31T07:16 `49a55efd` funnel(pip): E300 runway top-up #20 artifacts + E301 social draft batch 2026-10-31 (paper-
- commit 2026-10-31T07:12 `9ef60315` funnel(sage): E303 template lastmod git guard + IndexNow --creator-slugs for the 14 E293 p
- commit 2026-10-31T07:11 `e0539d6c` funnel(ledger): after-merge: Nova: PR #421 E304 ownership-gated approval path for creator 
- commit 2026-10-31T07:07 `5c69ff09` funnel(nova): E304 ownership-gated approval path for creator submissions (Tier 0 code; app
- commit 2026-10-31T07:07 `0b08fe57` funnel(ledger): after-merge: Rowan: PR #419 E307 /games/sims-4/christmas-cc/ on a title-on
- commit 2026-10-31T07:03 `49cdb667` funnel(rowan): E307 /games/sims-4/christmas-cc/ on a title-only christmas theme (Tier 0) (
- commit 2026-10-31T07:02 `a2c729ef` funnel(ledger): after-merge: Rio: PR #416 E306 affiliate-pipe-read GA4 leg — Impact and th
- commit 2026-10-31T06:59 `5b6f1b4c` funnel(rio): E306 affiliate-pipe-read gains a GA4 leg — Impact and the blog Amazon block p
- commit 2026-10-31T06:59 `32d9cbf8` funnel(ledger): after-merge: Pip: PR #417 test(feeds): fix red feeds.test.ts on main after
- commit 2026-10-31T06:56 `3c264807` funnel(ledger): Pip: E300 runway top-up #20 apply
- commit 2026-10-31T06:55 `dbaeed4d` funnel(ledger): after-merge: Ops: PR #415 E308 deploy-verify grades a READY build containi
- commit 2026-10-31T06:55 `202384cf` test(feeds): assert collection feed <link rel=alternate> on the helper, not the page sourc
- commit 2026-10-31T06:52 `cda0c720` funnel(ledger): build-watch: Ops: PR #415 E308 deploy-verify grades a READY build containi
- commit 2026-10-31T06:51 `5ab4df4e` funnel(ops): E308 deploy-verify grades a READY build containing the sha; smoke-render wall
- commit 2026-10-31T06:37 `52aeaf71` funnel(ledger): check: morning-check
- commit 2026-10-30T22:32 `d6a86c59` chore: compound learnings from 2026-10-30
- commit 2026-10-30T08:10 `de01c849` funnel(ledger): after-merge: Quinn: PR #413 funnel: daily run 2026-10-30
- commit 2026-10-30T08:06 `cb62dbd1` funnel: daily run 2026-10-30 (#413)
- commit 2026-10-30T08:03 `82d99407` funnel(ledger): after-merge: Cass: PR #405 E294 November Patreon all-members post draft, U
- commit 2026-10-30T08:02 `ca02390d` funnel(cass): E294 November Patreon all-members post draft, UTM-tagged (Tier 0 draft, Tier
- commit 2026-10-30T07:59 `7789488b` funnel(ledger): after-merge: Rio: PR #407 E295 verdict 2026-10-30 — 28d −5.2% is W1 rate +
- commit 2026-10-30T07:58 `9dafffcb` funnel(rio): E295 verdict 2026-10-30 — 28d −5.2% is W1 rate (87%) + Singapore mix, closed 
- commit 2026-10-30T07:54 `42db6c49` funnel(ledger): after-merge: Quinn: PR #398 funnel: daily run 2026-10-29
- commit 2026-10-30T07:50 `5a4be2b3` funnel: daily run 2026-10-29 (#398)
- commit 2026-10-30T07:49 `884a0c6b` funnel(ledger): after-merge: Pip: PR #410 E291 wedding-cc launch pin + IndexNow, E298 coll
- commit 2026-10-30T07:46 `934df22d` funnel(pip): E291 wedding-cc launch pin + IndexNow, E298 collection og:image/twitter:image
- commit 2026-10-30T07:45 `831455a2` funnel(ledger): after-merge: Nova: PR #409 one creator, one page — fold spaced/run-togethe
- commit 2026-10-30T07:41 `854d67e9` funnel(nova): one creator, one page — fold spaced/run-together spellings (E293, Tier 0) (#
- commit 2026-10-30T07:40 `60c052ba` funnel(ledger): after-merge: Sage: PR #412 E299 creators sitemap lastmod = later of templa
- commit 2026-10-30T07:40 `00a82585` funnel(ledger): after-merge: Rowan: PR #394 20 non-poses out of /games/sims-4/poses/ + cou
- commit 2026-10-30T07:37 `039abe0d` funnel(sage): E299 creators sitemap lastmod = later of template date and newest mod (Tier 
- commit 2026-10-30T07:37 `e90c25c4` funnel(ledger): after-merge: Rowan: PR #411 catalog: /games/sims-4/gallery-poses/ on a tit
- commit 2026-10-30T07:33 `908a2b19` catalog: /games/sims-4/gallery-poses/ on a title-only gallery-pose theme (E296, Tier 0) (#
- commit 2026-10-30T07:30 `45ca3362` funnel(ledger): after-merge: Pip: PR #402 E282 runway top-up #19 + E283 social drafts 2026
- commit 2026-10-30T07:29 `a16bf19a` funnel(ledger): after-merge: Sage: PR #408 E292 creator pages link to the collection hubs 
- commit 2026-10-30T07:29 `dc563138` funnel(pip): E282 runway top-up #19 + E283 social draft batch 2026-10-29 (Tier 0) (#402)
- commit 2026-10-30T07:25 `1132e596` funnel(sage): E292 creator pages link to the collection hubs that list their mods (Tier 0)
- commit 2026-10-30T07:24 `000f51ac` funnel(ledger): after-merge: Ops: PR #406 E297 global run-lock (no two funnel runners at o
- commit 2026-10-30T07:22 `6c3a2d41` funnel(ledger): Pip: E291 wedding-cc catalog pin apply
- commit 2026-10-30T07:21 `d7a46e04` funnel(ops): E297 global run-lock — a funnel runner for any day waits (bounded) for anothe
- commit 2026-10-30T07:21 `51c463e3` funnel(ledger): after-merge: Sage: PR #401 E284 hand-written meta for six more mod pages a
- commit 2026-10-30T07:17 `59ce8efe` funnel(sage): E284 hand-written meta for six more mod pages at 1.13% CTR (Tier 0) (#401)
- commit 2026-10-30T07:17 `1cad9844` funnel(ledger): after-merge: Ops: PR #404 preflight retry after host sleep (E290)
- commit 2026-10-30T07:14 `6bd2c42b` funnel(ledger): MISSED 2026-10-26 retro
- commit 2026-10-30T07:13 `2cb4f099` funnel(ledger): after-merge: Rowan: PR #403 /games/sims-4/wedding-cc/ title-only wedding t
- commit 2026-10-30T07:13 `6ae5fb7d` runner: retry the preflight once after a host sleep instead of grading HANG on wake (E290)
- commit 2026-10-30T07:09 `22d2ed32` funnel(ledger): build-watch: Rowan: PR #403 /games/sims-4/wedding-cc/ title-only wedding t
- commit 2026-10-30T07:08 `e7c15c1b` funnel(rowan): /games/sims-4/wedding-cc/ on a title-only wedding theme (E289, T0) (#403)
- commit 2026-10-30T07:08 `9a95c71e` funnel(ledger): after-merge: Rio: PR #375 E271 ex-segment RPM print + verdict 2026-10-29
- commit 2026-10-30T07:07 `0e045087` funnel(ledger): check: morning-check
- commit 2026-10-30T07:05 `fd83323c` funnel(ledger): after-merge: Nova: PR #399 creator dashboard badge card (E286, Tier 0)
- commit 2026-10-30T07:05 `94e5328d` funnel(ledger): after-merge: Cass: PR #400 E287 member opt-in view cap
- commit 2026-10-30T07:04 `0b834d3d` funnel(rio): E271 guardrail prints the ex-segment RPM with a mix/rate read; verdict 2026-1
- commit 2026-10-30T07:03 `a6f04c61` funnel(ledger): after-merge: Sage: PR #381 E268 hand-written meta for the seven gameplay-m
- commit 2026-10-30T07:00 `21540f18` funnel(nova): creator dashboard "Get your badge" card (E286, Tier 0) (#399)
- commit 2026-10-30T06:45 `a105d003` capture: /mods/[id] member opt-in stops after 3 unanswered views (E287, E198 KILL) (#400)
- commit 2026-10-30T06:29 `57f0dadc` funnel(ledger): ledger-commit
- commit 2026-10-30T06:24 `631ac76a` funnel(ledger): Pip: E282 runway top-up #19 apply
- commit 2026-10-30T06:24 `fb4b264d` catalog: 20 non-poses out of /games/sims-4/poses/ by id; poses copy 570+ -> 850+ (E281) (#
- commit 2026-10-30T06:19 `f1eaf2e5` funnel(sage): E268 hand-written meta for the seven gameplay-mod pages at 0.82% CTR (Tier 0
- commit 2026-10-30T06:01 `223c62b3` funnel(ledger): after-merge: Cass: PR #392 E279 grid hearts → save-intent sign-up
- commit 2026-10-30T04:17 `cd6504b4` funnel(ledger): after-merge: Quinn: PR #397 operator watch 2026-10-29 + parked ops lines (
- commit 2026-10-30T03:03 `56d71195` funnel: operator watch 2026-10-29 — BELOW LINE (#397)
- commit 2026-10-30T00:37 `4bd9095a` chore: compound learnings from 2026-10-29
- commit 2026-10-29T21:42 `35e578f1` funnel(ledger): check: morning-check
- commit 2026-10-29T21:40 `7f1560cd` funnel(ledger): flush: MISSED 2026-10-29 preflight=HANG
- commit 2026-10-29T15:24 `de5d1024` funnel(ledger): check: morning-check
- commit 2026-10-28T07:59 `d873cc76` funnel(ledger): after-merge: Operator: PR #396 game + collection pages on the launcher
- commit 2026-10-28T10:55 `948204af` games: /games/<slug>/ and collection pages render the launcher; Sims 4 collections only on
- commit 2026-10-28T07:20 `89d6d7d7` funnel(ledger): after-merge: Operator: PR #395 collection cover images optimized
- commit 2026-10-28T10:15 `945bf3d6` homepage: optimize collection cover images; pills reserve only the cover they show (#395)
- commit 2026-10-28T07:02 `23683c99` funnel(ledger): Pip: E275 catalog pins gshade-presets + eyes-cc apply
- commit 2026-10-28T07:02 `1c757b76` funnel(ledger): Pip: E274 runway top-up #18 apply
- commit 2026-10-28T10:00 `7c405015` funnel(cass): E279 grid hearts become a save-intent sign-up (home, game, collection, creat
- commit 2026-10-28T07:00 `431e965f` funnel(ledger): after-merge: Sage: PR #378 funnel(sage): E267 creator page title + meta na
- commit 2026-10-28T09:56 `ab3b7988` funnel(sage): E267 creator page title + meta name real content types and top mods (Tier 0)
- commit 2026-10-28T06:56 `0f8258fa` funnel(ledger): after-merge: Nova: PR #372 funnel(nova): "Featured on MustHaveMods" creato
- commit 2026-10-28T09:52 `1bd04e47` funnel(nova): "Featured on MustHaveMods" creator badge — embed page, assets, verified labe
- commit 2026-10-28T06:34 `0656a009` funnel(ledger): check: morning-check
- commit 2026-10-27T05:44 `9e3ee33c` funnel(ledger): check: morning-check

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
