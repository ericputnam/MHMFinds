# Revenue guardrail — 2026-11-04 (last finalized day 2026-11-02)

🟡 **YELLOW** → action: **watch**

vercel coverage: COMPLETE (200 rows over 10 pages, oldest 2026-10-29T19:24Z ≤ window start 2026-10-30T07:00Z) · deploy in window: yes

rollback bound: in-window production deploys 128 (≤24 to auto-rollback) · target 2.4 h before window start (≤48 h) → withheld: in-window deploys 128 exceed rollback bound 24

- Revenue $187.44 on 2026-11-02 is 3.4% vs same weekday avg; 3-day -11.4%

| | 2026-11-02 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $187.44 | $181.24 | 3.4% |
| session RPM | 15.74 | 14.25 | 10.4% |
| sessions | 11,907 | 12,728 | -6.5% |
| sessions, GA4 raw | 11,939 | 12,731 | -6.2% |
| **sessions ex Singapore (direct)** (E216, GA4) | 11,641 | 11,810 | -1.4% |
| **ex-segment RPM** (E271; MV revenue ÷ GA4 ex-segment sessions) | 16.10 | 15.35 | 4.9% → rate |
| 3-day revenue | $617.97 | $697.53 | -11.4% |
| 3-day RPM | 16.78 | 16.18 | 3.7% |

sessions ex Singapore (direct) (E216, GA4): raw 11,939 vs 12,731 (-6.2%) → ex-segment 11,641 vs 11,810 (-1.4%) · segment 298 = 2.50% of the day (controls 7.23%, 4 same weekdays)

ex-segment RPM (E216; Mediavine revenue ÷ GA4 sessions ex Singapore (direct)): $16.10 vs $15.35 (+4.9%) · mix alone predicts raw RPM +5.1% → rate (mix band ±1%)

Mediavine health: all ok

## Production changes since 2026-10-30 (72h before the judged day)

- vercel 2026-11-04T14:53 `6fc912e` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-9vc1xqhks-ericputnams-projects.vercel.app
- vercel 2026-11-04T03:31 `c5d9b34` READY chore: compound learnings from 2026-11-03 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-426hfky48-ericputnams-projects.vercel.app
- vercel 2026-11-03T11:38 `89ecfc5` READY funnel(ledger): degraded digest 2026-11-03 landed by runner (Quinn did not run — MISSED re [after judged day — judged tomorrow] — https://mhm-finds-dw5l-reppabfxw-ericputnams-projects.vercel.app
- vercel 2026-11-03T11:38 `c84ebf6` READY funnel(ledger): MISSED 2026-11-03 preflight=OTHER [after judged day — judged tomorrow] — https://mhm-finds-dw5l-30dk5c9o3-ericputnams-projects.vercel.app
- vercel 2026-11-03T11:37 `1579421` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-6jyk6tg79-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:40 `049e40d` READY funnel(ledger): after-merge: manual — https://mhm-finds-dw5l-12v4azxhd-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:36 `bfaf5c5` READY feat(pip): animated short-video renderer (kinetic hook, whip-in cards, SFX) (#448) — https://mhm-finds-dw5l-1422v999u-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:34 `6689d82` READY funnel(ledger): after-merge: manual — https://mhm-finds-dw5l-g196gu9r4-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:08 `cc5da96` READY funnel(ledger): after-merge: manual — https://mhm-finds-dw5l-gvq5t92ft-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:04 `1c7c5d2` READY funnel(ledger): build-watch: manual — https://mhm-finds-dw5l-6ceq8zj2l-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:03 `da73e41` ERROR feat(funnel): operator Pinterest + Tumblr freeze (#446) — https://mhm-finds-dw5l-6v4bdpv63-ericputnams-projects.vercel.app
- vercel 2026-11-03T00:50 `8bdbe74` ERROR funnel(queue): operator reply Q32: done — Mediavine token renewed (#445) — https://mhm-finds-dw5l-6jexxksie-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:28 `b9c029c` READY funnel(ledger): digest 2026-11-02 landed by runner (daily PR did not merge) — https://mhm-finds-dw5l-dw34gehjw-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:18 `c9144fd` READY funnel(ledger): after-merge: Ops: PR #444 E326 merge-gate releases on MERGED, not on TTL ( — https://mhm-finds-dw5l-pazti5j6y-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:14 `8cbcddd` READY E326 merge-gate releases on MERGED, not on TTL (Tier 0, Ops) (#444) — https://mhm-finds-dw5l-15y62tc6c-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:10 `a821e9d` READY funnel(rio): E324 RPM read 2026-11-02 — 10-31 is volume (87% sessions), 11-01 at 107.5% of — https://mhm-finds-dw5l-p1c9x17h6-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:06 `611e7d4` READY funnel(sage): E320 body-presets hub head-term retitle + 3 body-preset guides (Tier 0) (#44 — https://mhm-finds-dw5l-cdywiuxp0-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:06 `147ad12` READY funnel(ledger): after-merge: Cass: PR #442 E323 collection-hub email capture directly unde — https://mhm-finds-dw5l-3fm0ue79m-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:02 `5752e2b` READY funnel(ledger): build-watch: Cass: PR #442 E323 collection-hub email capture directly unde — https://mhm-finds-dw5l-it49qhphb-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:02 `1bec59d` ERROR funnel(cass): E323 collection-hub email capture directly under the grid (Tier 0) (#442) — https://mhm-finds-dw5l-mv46hsggd-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:01 `db54465` READY funnel(ledger): after-merge: Nova: PR #440 E322 approved submissions publish their mod (is — https://mhm-finds-dw5l-8f364pq50-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:00 `46ccd1a` READY funnel(ledger): Pip: E319 piercings-cc catalog pin apply — https://mhm-finds-dw5l-r7wpmmi5t-ericputnams-projects.vercel.app
- vercel 2026-11-02T17:58 `6715f58` READY funnel(ledger): Nova: E322 apply isVerified backfill (7 Atino00 mods) — https://mhm-finds-dw5l-68vnzcqt8-ericputnams-projects.vercel.app
- vercel 2026-11-02T17:58 `73e67ad` READY E322 approved submissions publish their mod (isVerified true) + scoped backfill (Tier 0) ( — https://mhm-finds-dw5l-43lt2hskb-ericputnams-projects.vercel.app
- vercel 2026-11-02T11:39 `9d31ba4` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-57jvmb71w-ericputnams-projects.vercel.app
- vercel 2026-11-02T04:08 `709c7e3` READY chore: compound learnings from 2026-11-01 — https://mhm-finds-dw5l-9n0rxgduf-ericputnams-projects.vercel.app
- vercel 2026-11-01T23:04 `df94a00` ERROR funnel: registry row E312 (2026-11-01 evening) (#438) — https://mhm-finds-dw5l-j3a8hdqjm-ericputnams-projects.vercel.app
- vercel 2026-11-01T23:03 `5d6d8b3` READY funnel(ledger): after-merge: Sage: PR #437 E312 BreadcrumbList JSON-LD on every collection — https://mhm-finds-dw5l-8cdn71zsz-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:59 `9591f9f` READY funnel(ledger): build-watch: Sage: PR #437 E312 BreadcrumbList JSON-LD on every collection — https://mhm-finds-dw5l-ed4re7qqg-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:58 `c676c75` ERROR E312 BreadcrumbList JSON-LD on every collection hub, mirroring the visible crumbs (Tier 0) — https://mhm-finds-dw5l-k4tyu0gor-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:56 `0c986ce` READY funnel(ledger): after-merge: Quinn: PR #436 funnel: registry rows E311 + E316 (2026-11-01) — https://mhm-finds-dw5l-6sqdqtgfr-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:54 `edbd25a` READY funnel: registry rows E311 + E316 (2026-11-01 evening) (#436) — https://mhm-finds-dw5l-ir3w90jzg-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:53 `c6548a8` READY funnel(ledger): after-merge: Sage: PR #435 E311 hair-cc hub: head-term retitle + 6 ranking — https://mhm-finds-dw5l-33hajyzzo-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:50 `d552b84` READY E311 hair-cc hub: head-term retitle + 6 ranking hair articles as guides (Tier 0) (#435) — https://mhm-finds-dw5l-mnil8xo7r-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:49 `5d038aa` ERROR funnel(ledger): after-merge: Rowan: PR #434 E316 /games/sims-4/piercings-cc/ — title-only  — https://mhm-finds-dw5l-1t2xaza44-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:46 `f7838fb` READY E316: /games/sims-4/piercings-cc/ — title-only piercing theme + traffic page (Tier 0) (#43 — https://mhm-finds-dw5l-2jjj5ay5s-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:45 `985dafd` READY funnel(ledger): after-merge: Quinn: PR #433 funnel: daily run 2026-11-01 — https://mhm-finds-dw5l-4ucz1tl6r-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:43 `de8fca9` READY funnel(ledger): Rowan: E316 piercing retag apply — https://mhm-finds-dw5l-50aqu6bkr-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:42 `623ca7b` READY funnel: daily run 2026-11-01 (#433) — https://mhm-finds-dw5l-lj0jnl5gg-ericputnams-projects.vercel.app
- vercel 2026-11-01T16:37 `42a3bfe` READY funnel(ledger): after-merge: Nova: PR #432 E304 apply: 7/7 Atino00 submissions approved; f — https://mhm-finds-dw5l-1opcb7o8z-ericputnams-projects.vercel.app
- vercel 2026-11-01T16:20 `a1dc3ff` READY funnel(ledger): Pip: PR #430 hand smoke PASS (correcting row) — https://mhm-finds-dw5l-3580z3o3p-ericputnams-projects.vercel.app
- vercel 2026-11-01T15:37 `79b8797` READY E304 apply: 7/7 Atino00 submissions approved; fix one-account-N-rows profile collision (Ti — https://mhm-finds-dw5l-7kh0x5dci-ericputnams-projects.vercel.app
- vercel 2026-11-01T15:36 `ba4ef78` READY funnel(ledger): after-merge: Ops: PR #431 E317 deploy-verify renders every collection page — https://mhm-finds-dw5l-lkb1wg7r5-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:48 `c0b60dd` READY funnel(ops): E317 — deploy-verify renders every collection page the merged sha adds (Tier  — https://mhm-finds-dw5l-rb4shj89p-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:48 `d95025e` READY funnel(ledger): after-merge: Nova: PR #427 test(approval): assert the shared builder's row — https://mhm-finds-dw5l-bx55j5keg-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:48 `1f78913` READY funnel(ledger): after-merge: Pip: PR #430 E309 christmas-cc + E310 female-clothes catalog  — https://mhm-finds-dw5l-gy37hp5uw-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:31 `097170c` ERROR funnel(ledger): after-merge: Cass: PR #429 E314 newsletter cadence copy says every two wee — https://mhm-finds-dw5l-4yq4s4485-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:14 `594d30a` READY test(approval): assert the approve route writes the shared builder's row (fixes main red s — https://mhm-finds-dw5l-d3j3ffel4-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:14 `1c36226` ERROR funnel(ledger): after-merge: Quinn: PR #426 funnel: operator watch 2026-11-01 — https://mhm-finds-dw5l-d8xsqtkg3-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:14 `352ffb6` READY funnel(ledger): after-merge: Rio: PR #428 E315 verdict 2026-11-01 (paper-only) — https://mhm-finds-dw5l-i9zqol0q2-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:08 `911723d` READY funnel(pip): E309 christmas-cc + E310 female-clothes catalog pins (Tier 0) (#430) — https://mhm-finds-dw5l-iojtc1ofa-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:02 `1bf0861` ERROR funnel(ledger): Pip: E310 female-clothes catalog pin apply — https://mhm-finds-dw5l-4ekkct4jy-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:02 `d184af8` READY funnel(ledger): Pip: E309 christmas-cc catalog pin apply — https://mhm-finds-dw5l-8ozej1pz8-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:01 `4dd4ccc` READY funnel(cass): E314 newsletter cadence copy says "every two weeks" + guard (Tier 0) (#429) — https://mhm-finds-dw5l-ecpy73the-ericputnams-projects.vercel.app
- vercel 2026-11-01T13:44 `5d65b0b` READY funnel(rio): E315 verdict 2026-11-01 — 10-30 rate day, E288 tracker WIRE 7/7, ramp is a vo — https://mhm-finds-dw5l-bcagr7akw-ericputnams-projects.vercel.app
- vercel 2026-11-01T13:25 `92023de` READY funnel: operator watch 2026-11-01 — BELOW LINE (#426) — https://mhm-finds-dw5l-o1t7k6usk-ericputnams-projects.vercel.app
- vercel 2026-11-01T12:37 `634edcb` READY funnel(ledger): after-merge: Quinn: PR #425 funnel: operator watch 2026-10-31 — https://mhm-finds-dw5l-mo0vcmyo6-ericputnams-projects.vercel.app
- vercel 2026-11-01T12:19 `ca53d53` READY funnel: operator watch 2026-10-31 (#425) — https://mhm-finds-dw5l-pl41pgb88-ericputnams-projects.vercel.app
- vercel 2026-11-01T11:37 `d19b1db` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-8xdqb3ers-ericputnams-projects.vercel.app
- vercel 2026-11-01T02:48 `beeb3a9` ERROR chore: compound learnings from 2026-10-31 — https://mhm-finds-dw5l-3trlnzdjp-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:37 `036d31a` READY funnel(ledger): after-merge: Quinn: PR #424 funnel: daily run 2026-10-31 — https://mhm-finds-dw5l-azxezrvh6-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:33 `10b9e4a` READY funnel(ledger): build-watch: Quinn: PR #424 funnel: daily run 2026-10-31 — https://mhm-finds-dw5l-csn7b7pug-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:32 `83d7d19` ERROR funnel: daily run 2026-10-31 (#424) — https://mhm-finds-dw5l-l41mha4k4-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:29 `7f2f68e` READY funnel(ledger): after-merge: Sage: PR #423 E302 Creators in this collection — hubs link do — https://mhm-finds-dw5l-5ouwcdobx-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:25 `66238d1` READY funnel(ledger): build-watch: Sage: PR #423 E302 Creators in this collection — hubs link do — https://mhm-finds-dw5l-lu6zy6p2z-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:24 `214ac2b` ERROR funnel(sage): E302 "Creators in this collection" — hubs link down to the creator pages tha — https://mhm-finds-dw5l-pxjr3qt4x-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:22 `821dd41` READY funnel(ledger): after-merge: Rio: PR #420 E306 verdict 2026-10-31 (paper-only) — https://mhm-finds-dw5l-p1rgf7se4-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:21 `dfc911b` READY funnel(ledger): after-merge: Sage: PR #422 E303 template lastmod git guard + IndexNow --cr — https://mhm-finds-dw5l-iyacfem47-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:20 `0f04e2d` READY funnel(rio): E306 verdict 2026-10-31 — October closes $144 (MISSED), 10-29 rate day, E271  — https://mhm-finds-dw5l-f1trngijz-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:18 `dbf85cb` ERROR funnel(ledger): after-merge: Pip: PR #418 E300 runway top-up #20 artifacts + E301 social d — https://mhm-finds-dw5l-m9vsyhcam-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:16 `49a55ef` READY funnel(pip): E300 runway top-up #20 artifacts + E301 social draft batch 2026-10-31 (paper- — https://mhm-finds-dw5l-8i6huc4n8-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:12 `9ef6031` READY funnel(sage): E303 template lastmod git guard + IndexNow --creator-slugs for the 14 E293 p — https://mhm-finds-dw5l-q8y5csc13-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:11 `e0539d6` READY funnel(ledger): after-merge: Nova: PR #421 E304 ownership-gated approval path for creator  — https://mhm-finds-dw5l-fuw50f4xn-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:07 `5c69ff0` READY funnel(nova): E304 ownership-gated approval path for creator submissions (Tier 0 code; app — https://mhm-finds-dw5l-bynvg67pv-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:07 `0b08fe5` READY funnel(ledger): after-merge: Rowan: PR #419 E307 /games/sims-4/christmas-cc/ on a title-on — https://mhm-finds-dw5l-n3kxc4xcz-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:03 `49cdb66` READY funnel(rowan): E307 /games/sims-4/christmas-cc/ on a title-only christmas theme (Tier 0) ( — https://mhm-finds-dw5l-r9jbxktcq-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:02 `a2c729e` READY funnel(ledger): after-merge: Rio: PR #416 E306 affiliate-pipe-read GA4 leg — Impact and th — https://mhm-finds-dw5l-ordc7jke5-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:59 `5b6f1b4` READY funnel(rio): E306 affiliate-pipe-read gains a GA4 leg — Impact and the blog Amazon block p — https://mhm-finds-dw5l-nscb7kmgh-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:59 `32d9cbf` READY funnel(ledger): after-merge: Pip: PR #417 test(feeds): fix red feeds.test.ts on main after — https://mhm-finds-dw5l-nq62q4a7z-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:56 `3c26480` READY funnel(ledger): Pip: E300 runway top-up #20 apply — https://mhm-finds-dw5l-a0qctj4jd-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:55 `dbaeed4` READY funnel(ledger): after-merge: Ops: PR #415 E308 deploy-verify grades a READY build containi — https://mhm-finds-dw5l-joaog0g9g-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:55 `202384c` READY test(feeds): assert collection feed <link rel=alternate> on the helper, not the page sourc — https://mhm-finds-dw5l-ho33epi8s-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:52 `cda0c72` READY funnel(ledger): build-watch: Ops: PR #415 E308 deploy-verify grades a READY build containi — https://mhm-finds-dw5l-iiplvb8v4-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:51 `5ab4df4` ERROR funnel(ops): E308 deploy-verify grades a READY build containing the sha; smoke-render wall — https://mhm-finds-dw5l-1al6bncm1-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:37 `52aeaf7` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-i5ovx404t-ericputnams-projects.vercel.app
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
- commit 2026-11-03T22:31 `c5d9b344` chore: compound learnings from 2026-11-03
- commit 2026-11-03T06:38 `89ecfc50` funnel(ledger): degraded digest 2026-11-03 landed by runner (Quinn did not run — MISSED re
- commit 2026-11-03T06:38 `c84ebf67` funnel(ledger): MISSED 2026-11-03 preflight=OTHER
- commit 2026-11-03T06:37 `1579421d` funnel(ledger): check: morning-check
- commit 2026-11-02T22:31 `27c854f4` chore: compound learnings from 2026-11-02
- commit 2026-11-02T20:40 `049e40d0` funnel(ledger): after-merge: manual
- commit 2026-11-02T20:36 `bfaf5c51` feat(pip): animated short-video renderer (kinetic hook, whip-in cards, SFX) (#448)
- commit 2026-11-02T20:34 `6689d821` funnel(ledger): after-merge: manual
- commit 2026-11-02T20:08 `ccf942ea` feat(pip): short-video frames tool + Tumblr/Reddit dropped from social drafts (#447)
- commit 2026-11-02T20:08 `cc5da961` funnel(ledger): after-merge: manual
- commit 2026-11-02T20:04 `1c7c5d2d` funnel(ledger): build-watch: manual
- commit 2026-11-02T20:03 `da73e414` feat(funnel): operator Pinterest + Tumblr freeze (#446)
- commit 2026-11-02T19:50 `8bdbe745` funnel(queue): operator reply Q32: done — Mediavine token renewed (#445)
- commit 2026-11-02T13:28 `b9c029c9` funnel(ledger): digest 2026-11-02 landed by runner (daily PR did not merge)
- commit 2026-11-02T13:18 `c9144fd0` funnel(ledger): after-merge: Ops: PR #444 E326 merge-gate releases on MERGED, not on TTL (
- commit 2026-11-02T13:14 `8cbcddd1` E326 merge-gate releases on MERGED, not on TTL (Tier 0, Ops) (#444)
- commit 2026-11-02T13:10 `a821e9d6` funnel(rio): E324 RPM read 2026-11-02 — 10-31 is volume (87% sessions), 11-01 at 107.5% of
- commit 2026-11-02T13:06 `611e7d4e` funnel(sage): E320 body-presets hub head-term retitle + 3 body-preset guides (Tier 0) (#44
- commit 2026-11-02T13:06 `147ad12b` funnel(ledger): after-merge: Cass: PR #442 E323 collection-hub email capture directly unde
- commit 2026-11-02T13:02 `5752e2b5` funnel(ledger): build-watch: Cass: PR #442 E323 collection-hub email capture directly unde
- commit 2026-11-02T13:02 `1bec59da` funnel(cass): E323 collection-hub email capture directly under the grid (Tier 0) (#442)
- commit 2026-11-02T13:01 `db544656` funnel(ledger): after-merge: Nova: PR #440 E322 approved submissions publish their mod (is
- commit 2026-11-02T13:00 `46ccd1a3` funnel(ledger): Pip: E319 piercings-cc catalog pin apply
- commit 2026-11-02T12:58 `6715f58f` funnel(ledger): Nova: E322 apply isVerified backfill (7 Atino00 mods)
- commit 2026-11-02T12:58 `73e67adc` E322 approved submissions publish their mod (isVerified true) + scoped backfill (Tier 0) (
- commit 2026-11-02T06:39 `9d31ba44` funnel(ledger): check: morning-check
- commit 2026-11-01T23:08 `709c7e3a` chore: compound learnings from 2026-11-01
- commit 2026-11-01T18:04 `df94a005` funnel: registry row E312 (2026-11-01 evening) (#438)
- commit 2026-11-01T18:03 `5d6d8b3b` funnel(ledger): after-merge: Sage: PR #437 E312 BreadcrumbList JSON-LD on every collection
- commit 2026-11-01T17:59 `9591f9f6` funnel(ledger): build-watch: Sage: PR #437 E312 BreadcrumbList JSON-LD on every collection
- commit 2026-11-01T17:58 `c676c758` E312 BreadcrumbList JSON-LD on every collection hub, mirroring the visible crumbs (Tier 0)
- commit 2026-11-01T17:56 `0c986ce1` funnel(ledger): after-merge: Quinn: PR #436 funnel: registry rows E311 + E316 (2026-11-01)
- commit 2026-11-01T17:54 `edbd25ad` funnel: registry rows E311 + E316 (2026-11-01 evening) (#436)
- commit 2026-11-01T17:53 `c6548a84` funnel(ledger): after-merge: Sage: PR #435 E311 hair-cc hub: head-term retitle + 6 ranking
- commit 2026-11-01T17:50 `d552b840` E311 hair-cc hub: head-term retitle + 6 ranking hair articles as guides (Tier 0) (#435)
- commit 2026-11-01T17:49 `5d038aab` funnel(ledger): after-merge: Rowan: PR #434 E316 /games/sims-4/piercings-cc/ — title-only 
- commit 2026-11-01T17:46 `f7838fb7` E316: /games/sims-4/piercings-cc/ — title-only piercing theme + traffic page (Tier 0) (#43
- commit 2026-11-01T17:45 `985dafda` funnel(ledger): after-merge: Quinn: PR #433 funnel: daily run 2026-11-01
- commit 2026-11-01T17:43 `de8fca9e` funnel(ledger): Rowan: E316 piercing retag apply
- commit 2026-11-01T17:42 `623ca7bc` funnel: daily run 2026-11-01 (#433)
- commit 2026-11-01T11:37 `42a3bfe8` funnel(ledger): after-merge: Nova: PR #432 E304 apply: 7/7 Atino00 submissions approved; f
- commit 2026-11-01T11:20 `a1dc3ff2` funnel(ledger): Pip: PR #430 hand smoke PASS (correcting row)
- commit 2026-11-01T10:37 `79b87971` E304 apply: 7/7 Atino00 submissions approved; fix one-account-N-rows profile collision (Ti
- commit 2026-11-01T10:36 `ba4ef785` funnel(ledger): after-merge: Ops: PR #431 E317 deploy-verify renders every collection page
- commit 2026-11-01T09:48 `c0b60ddf` funnel(ops): E317 — deploy-verify renders every collection page the merged sha adds (Tier 
- commit 2026-11-01T09:48 `d95025e1` funnel(ledger): after-merge: Nova: PR #427 test(approval): assert the shared builder's row
- commit 2026-11-01T09:48 `1f789135` funnel(ledger): after-merge: Pip: PR #430 E309 christmas-cc + E310 female-clothes catalog 
- commit 2026-11-01T09:31 `097170ce` funnel(ledger): after-merge: Cass: PR #429 E314 newsletter cadence copy says every two wee
- commit 2026-11-01T09:14 `594d30a2` test(approval): assert the approve route writes the shared builder's row (fixes main red s
- commit 2026-11-01T09:14 `1c362260` funnel(ledger): after-merge: Quinn: PR #426 funnel: operator watch 2026-11-01
- commit 2026-11-01T09:14 `352ffb60` funnel(ledger): after-merge: Rio: PR #428 E315 verdict 2026-11-01 (paper-only)
- commit 2026-11-01T09:08 `911723d0` funnel(pip): E309 christmas-cc + E310 female-clothes catalog pins (Tier 0) (#430)
- commit 2026-11-01T09:02 `1bf08614` funnel(ledger): Pip: E310 female-clothes catalog pin apply
- commit 2026-11-01T09:02 `d184af82` funnel(ledger): Pip: E309 christmas-cc catalog pin apply
- commit 2026-11-01T09:01 `4dd4ccce` funnel(cass): E314 newsletter cadence copy says "every two weeks" + guard (Tier 0) (#429)
- commit 2026-11-01T08:44 `5d65b0b4` funnel(rio): E315 verdict 2026-11-01 — 10-30 rate day, E288 tracker WIRE 7/7, ramp is a vo
- commit 2026-11-01T08:25 `92023de1` funnel: operator watch 2026-11-01 — BELOW LINE (#426)
- commit 2026-11-01T07:37 `634edcb9` funnel(ledger): after-merge: Quinn: PR #425 funnel: operator watch 2026-10-31
- commit 2026-11-01T07:19 `ca53d534` funnel: operator watch 2026-10-31 (#425)
- commit 2026-11-01T06:37 `d19b1db4` funnel(ledger): check: morning-check
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

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
