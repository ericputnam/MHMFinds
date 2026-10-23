# Revenue guardrail — 2026-10-22 (last finalized day 2026-10-20)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (200 rows over 10 pages, oldest 2026-10-16T12:10Z ≤ window start 2026-10-17T04:00Z) · deploy in window: yes

rollback bound: in-window production deploys 80 (≤24 to auto-rollback) · target 1.5 h before window start (≤48 h) → withheld: in-window deploys 80 exceed rollback bound 24

- Revenue $179.30 (-6.0%), RPM 15.51 (-6.8%), sessions 0.6% vs same weekday, prior 4 weeks · 3-day revenue -6.5%

| | 2026-10-20 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $179.30 | $190.81 | -6.0% |
| session RPM | 15.51 | 16.64 | -6.8% |
| sessions | 11,559 | 11,489 | 0.6% |
| sessions, GA4 raw | 11,528 | 11,599 | -0.6% |
| **sessions ex Singapore (direct)** (E216, GA4) | 11,191 | 11,242 | -0.5% |
| 3-day revenue | $599.80 | $641.61 | -6.5% |
| 3-day RPM | 14.69 | 16.07 | -8.6% |

sessions ex Singapore (direct) (E216, GA4): raw 11,528 vs 11,599 (-0.6%) → ex-segment 11,191 vs 11,242 (-0.5%) · segment 337 = 2.92% of the day (controls 3.08%, 4 same weekdays)

Mediavine health: all ok

## Production changes since 2026-10-17 (72h before the judged day)

- vercel 2026-10-22T10:37 `221e541` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-qis2npalg-ericputnams-projects.vercel.app
- vercel 2026-10-22T02:31 `79c80dd` READY chore: compound learnings from 2026-10-21 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-kfs7yihga-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:34 `aa2082d` READY funnel(ledger): after-merge: Quinn: PR #361 funnel: daily run 2026-10-21 (Tier 0 docs) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-edqxfhuna-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:30 `01906c6` READY funnel(quinn): daily run 2026-10-21 — yellow (Tier 0 only), 7/7 moves, registry + digest ( [after judged day — judged tomorrow] — https://mhm-finds-dw5l-lvs3263yz-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:19 `5220e60` READY funnel(ledger): after-merge: Pip: PR #357 E251 topup-grade.ts — one grader for every SD-10 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-e5c0me7xl-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:19 `26afea9` READY funnel(ledger): after-merge: Nova: PR #354 funnel(nova): E253 new-mods row counts writer p [after judged day — judged tomorrow] — https://mhm-finds-dw5l-kfs4ceaj1-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:15 `3945b97` READY funnel(pip): E251 topup-grade.ts — one grader for every SD-10 top-up; E202 KILL (lift), E2 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-mdgn8xm1e-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:11 `ff0daf2` READY funnel(nova): E253 new-mods row counts writer posts only; manual adds print as "+ N other" [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1x08lib4a-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:10 `cd620ac` READY funnel(ledger): after-merge: Ops: PR #356 funnel(ops): E257 Patreon page timeout gets one  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-6g6jd4zs3-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:07 `18d50b5` READY funnel(ops): E257 Patreon page timeout gets one bounded re-attempt in every Members walk ( [after judged day — judged tomorrow] — https://mhm-finds-dw5l-pmtcld843-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:06 `30d3e03` READY funnel(ledger): after-merge: Sage: PR #359 E252 hub-eligibility — no family → INCONCLUSIVE [after judged day — judged tomorrow] — https://mhm-finds-dw5l-n8tcjsjkr-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:03 `418fd87` READY funnel(sage): E252 hub-eligibility — no family → INCONCLUSIVE, OFF_TYPE_RE.lots, nail-tech [after judged day — judged tomorrow] — https://mhm-finds-dw5l-crmjnz9h3-ericputnams-projects.vercel.app
- vercel 2026-10-21T11:00 `5cd50bf` READY funnel(ledger): after-merge: Rowan: PR #360 E256 apply rollback file (paper) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ccggylm8c-ericputnams-projects.vercel.app
- vercel 2026-10-21T10:58 `9e61905` READY funnel(rowan): E256 apply rollback file (73 rows, paper) (#360) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-c83a4kgl9-ericputnams-projects.vercel.app
- vercel 2026-10-21T10:56 `8312e1a` READY funnel(ledger): after-merge: Rio: PR #358 E255 yellow verdict 2026-10-21 (Tier 0, paper) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ifck8f4d6-ericputnams-projects.vercel.app
- vercel 2026-10-21T10:55 `2b7b414` READY funnel(ledger): Rowan: E256 --ids apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-h1kiluifz-ericputnams-projects.vercel.app
- vercel 2026-10-21T10:54 `1d6c553` READY funnel(rio): E255 yellow verdict 2026-10-21 — 10-19 Monday is Mediavine-side demand, not m [after judged day — judged tomorrow] — https://mhm-finds-dw5l-c7kzfis4n-ericputnams-projects.vercel.app
- vercel 2026-10-21T10:54 `d2ef637` READY funnel(ledger): after-merge: Rowan: PR #355 E256 face presets out of body-preset + 74 --id [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jcgawv9rs-ericputnams-projects.vercel.app
- vercel 2026-10-21T10:50 `b128a6f` READY funnel(ledger): after-merge: Cass: PR #353 E254 issue-07 pre-send check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-prsnpcfxs-ericputnams-projects.vercel.app
- vercel 2026-10-21T10:50 `a600e55` READY funnel(rowan): E256 face presets out of body-preset + 74 --ids pins (Tier 0) (#355) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-oyeyv32m0-ericputnams-projects.vercel.app
- vercel 2026-10-21T10:46 `f2f6053` READY funnel(cass): E254 issue-07 pre-send check — 202 recipients, 3-run plan, invite DSNs attri [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7n1uwerop-ericputnams-projects.vercel.app
- vercel 2026-10-21T10:37 `b2b334d` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-6x5aipm5p-ericputnams-projects.vercel.app
- vercel 2026-10-21T02:31 `ec467c6` READY chore: compound learnings from 2026-10-20 — https://mhm-finds-dw5l-8ztf4y576-ericputnams-projects.vercel.app
- vercel 2026-10-21T02:04 `2914ad9` READY funnel(ledger): after-merge: Quinn: PR #352 funnel: daily run 2026-10-20 — https://mhm-finds-dw5l-9hg9le62z-ericputnams-projects.vercel.app
- vercel 2026-10-21T02:02 `2914ad9` READY funnel(ledger): after-merge: Quinn: PR #352 funnel: daily run 2026-10-20 — https://mhm-finds-dw5l-yyuzwznjr-ericputnams-projects.vercel.app
- vercel 2026-10-20T11:09 `2914ad9` READY funnel(ledger): after-merge: Quinn: PR #352 funnel: daily run 2026-10-20 — https://mhm-finds-dw5l-hdwtvkni5-ericputnams-projects.vercel.app
- vercel 2026-10-20T11:05 `a3a6efe` READY funnel(quinn): daily run 2026-10-20 (Tier 0, paper) (#352) — https://mhm-finds-dw5l-iie8lbwm9-ericputnams-projects.vercel.app
- vercel 2026-10-20T11:02 `e08bf91` READY funnel(ledger): after-merge: Pip: PR #350 E244 runway top-up #16 artifacts (Tier 0, SD-10  — https://mhm-finds-dw5l-1bhfxxk85-ericputnams-projects.vercel.app
- vercel 2026-10-20T10:58 `fc7d2cb` READY funnel(pip): E244 runway top-up #16 artifacts (18 ranked rows 10-23..26, E209 next leg) (T — https://mhm-finds-dw5l-mo9toppd4-ericputnams-projects.vercel.app
- vercel 2026-10-20T10:57 `eac68a3` READY funnel(ledger): after-merge: Ops: PR #351 E250 deploy-verify grades a paper-only merge on  — https://mhm-finds-dw5l-bmhedjjsb-ericputnams-projects.vercel.app
- vercel 2026-10-20T10:54 `0ca1b52` READY funnel(ops): E250 deploy-verify grades a paper-only merge on production as served, never T — https://mhm-finds-dw5l-neq3qeoj9-ericputnams-projects.vercel.app
- vercel 2026-10-20T10:54 `91b4d7f` READY funnel(ledger): after-merge: Rowan: PR #349 funnel(rowan): E249 7 --ids pins on /sims-4-cc — https://mhm-finds-dw5l-23cfcfyu5-ericputnams-projects.vercel.app
- vercel 2026-10-20T10:50 `258034c` READY funnel(rowan): E249 7 --ids pins on /sims-4-cc-furniture/ (Tier 0) (#349) — https://mhm-finds-dw5l-6rz7yjvlw-ericputnams-projects.vercel.app
- vercel 2026-10-20T10:50 `8e74b63` READY funnel(ledger): Rowan: E249 --ids apply — https://mhm-finds-dw5l-5bi35uu6l-ericputnams-projects.vercel.app
- vercel 2026-10-20T10:49 `7fd30bc` READY funnel(ledger): Pip: E244 runway top-up #16 apply — https://mhm-finds-dw5l-pr7zj3oha-ericputnams-projects.vercel.app
- vercel 2026-10-20T10:37 `6792c75` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-8er7pcute-ericputnams-projects.vercel.app
- vercel 2026-10-20T02:32 `4a7fd40` READY chore: compound learnings from 2026-10-19 — https://mhm-finds-dw5l-epy5luv8r-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:35 `4acba54` READY funnel(ledger): after-merge: Quinn: PR #348 funnel: daily run 2026-10-19 (Tier 0 docs) — https://mhm-finds-dw5l-gfhvg1zev-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:30 `415d6f6` READY funnel(quinn): daily run 2026-10-19 (Tier 0, paper) (#348) — https://mhm-finds-dw5l-l13bv0epw-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:28 `0db5a64` READY funnel(ledger): after-merge: Ops: PR #342 E243 budget test fails on registry conflict mark — https://mhm-finds-dw5l-i45dl78yn-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:25 `737d725` READY funnel(ops): E243 budget test fails on conflict markers under mhm-funnel/** + E194 graded  — https://mhm-finds-dw5l-81qeciz6s-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:24 `07b95c9` READY funnel(ledger): Rowan: E242 isNSFW apply — https://mhm-finds-dw5l-1vpxyfjia-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:23 `a64593d` READY funnel(ledger): after-merge: Rowan: PR #344 funnel(rowan): E242 isNSFW pins on 8 adult tit — https://mhm-finds-dw5l-63guq9u3h-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:20 `89b9d45` READY funnel(rowan): E242 isNSFW pins on 8 adult titles in the gameplay/script top 25 (Tier 0) ( — https://mhm-finds-dw5l-pa8q838ka-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:19 `6d8da03` READY funnel(ledger): after-merge: Quinn: PR #335 Sage eyes-cc hub (E231, T1) — https://mhm-finds-dw5l-4g6kopvha-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:16 `d5f8527` READY funnel(sage): E231 /games/sims-4/eyes-cc/ hub — eyes, eyebrows, lashes (Tier 1) (#335) — https://mhm-finds-dw5l-79q2uef25-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:15 `2b63d7c` READY funnel(ledger): after-merge: Sage: PR #341 E238 hub-eligibility read as a script + gamepla — https://mhm-finds-dw5l-p459rvxxu-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:14 `6d84879` READY funnel(ledger): after-merge: Quinn: PR #340 park 10 experiment rows + close Q-E21 (paper) — https://mhm-finds-dw5l-ltd0lwf4w-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:13 `2522f93` READY funnel(ledger): after-merge: Rio: PR #345 E241 guardrail agreement tracker + E227 KEEP fin — https://mhm-finds-dw5l-8fctk6jgt-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:11 `03ab232` READY funnel(sage): E238 hub-eligibility read as a script + gameplay BEFORE (Tier 0) (#341) — https://mhm-finds-dw5l-o6qd6skai-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:09 `36e3985` READY funnel(rio): E241 guardrail agreement tracker + E227 KEEP final + E234 10-19 leg (Tier 0)  — https://mhm-finds-dw5l-os7sw9cc6-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:06 `8963aeb` READY funnel(ledger): after-merge: Pip: PR #347 E237 pin-queue day trace + E188 grade — https://mhm-finds-dw5l-hxihqj2xd-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:03 `37283f0` READY funnel(pip): E237 pin-queue day trace + E188 grade (Tier 0, read-only) (#347) — https://mhm-finds-dw5l-ipaohuuju-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:02 `45e6cb7` READY funnel(ledger): after-merge: Cass: PR #346 E240 weekly-issue cohort diagnosis — https://mhm-finds-dw5l-o2ukte0ix-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:59 `4d8e6c6` READY funnel(cass): E240 weekly-issue cohort diagnosis: DSN decode + cohort diff + inert seed pa — https://mhm-finds-dw5l-7u49sgoid-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:58 `4cac6cd` READY funnel(ledger): Quinn: E233 invite-01 live send 22/22 — https://mhm-finds-dw5l-9834lnd0h-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:57 `1ed301c` READY funnel(ledger): after-merge: Nova: PR #343 E239 catalog-ingest stops re-fetching refreshed — https://mhm-finds-dw5l-oz445dskm-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:54 `be42536` READY funnel(nova): E239 catalog-ingest stops re-fetching refreshed posts that added nothing (#3 — https://mhm-finds-dw5l-gysg1aqz2-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:54 `4a43793` READY funnel(ledger): after-merge: Quinn: PR #328 Cass invite-01 sender (E233, T1) — https://mhm-finds-dw5l-4qx26oaq2-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:50 `4374ceb` READY funnel(cass): E233 subscriber→account invite sender, invite-01 (Tier 1 send) (#328) — https://mhm-finds-dw5l-b4hb5hqy1-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:37 `f7df0e3` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-muh2p52b9-ericputnams-projects.vercel.app
- vercel 2026-10-19T02:31 `15f2a9a` READY chore: compound learnings from 2026-10-18 — https://mhm-finds-dw5l-hj4pifdmc-ericputnams-projects.vercel.app
- vercel 2026-10-19T00:08 `3bd4247` READY funnel(ledger): after-merge: operator session: PR #339 — https://mhm-finds-dw5l-gynu1u1vd-ericputnams-projects.vercel.app
- vercel 2026-10-19T00:04 `9a307ef` READY feat(creators): claimed creators get a page from 1 mod; admins can test the creator portal — https://mhm-finds-dw5l-3fhbsct8g-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:36 `c2fe4ae` READY funnel(ledger): after-merge: Quinn: PR #338 funnel: daily run 2026-10-18 — https://mhm-finds-dw5l-fizl5z33q-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:32 `baa174f` READY funnel(quinn): daily run 2026-10-18 (Tier 0, paper) (#338) — https://mhm-finds-dw5l-18v00vi27-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:27 `3e326a5` READY funnel(ledger): after-merge: Nova: PR #337 funnel(nova): E232 fix-forward — remove conflic — https://mhm-finds-dw5l-a7pkx00fv-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:23 `5ca8987` READY funnel(nova): E232 fix-forward — remove conflict markers #330 left in 3 registry files (Ti — https://mhm-finds-dw5l-hm1u520gr-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:23 `7d6589c` READY funnel(ledger): after-merge: Nova: PR #330 funnel(nova): E232 new-mods −38% diagnosed as w — https://mhm-finds-dw5l-pblfmdkuf-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:19 `4fc47b7` READY funnel(nova): E232 new-mods -38% diagnosed as writer cadence; scoreboard row prints posts  — https://mhm-finds-dw5l-1bfim280x-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:18 `b19fbcc` READY funnel(ledger): after-merge: Cass: PR #331 funnel(cass): E184/E118/E205 grades + E233 queu — https://mhm-finds-dw5l-c9rljwbb1-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:14 `508be90` READY funnel(cass): E184/E118/E205 grades + E233 queued (Tier 0, paper) (#331) — https://mhm-finds-dw5l-e5lu4xif0-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:13 `082d0a0` READY funnel(ledger): after-merge: Sage: PR #336 funnel(sage): E171 grade + E231 queued (Tier 0, — https://mhm-finds-dw5l-7i65bnkb2-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:09 `2cda14e` READY funnel(sage): E171 grade + E231 queued (Tier 0, paper) (#336) — https://mhm-finds-dw5l-4m47qdbds-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:07 `9755e12` READY funnel(ledger): after-merge: Ops: PR #333 funnel(ops): E236 scoreboard direct_ex_sg_bot ro — https://mhm-finds-dw5l-393itap5c-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:04 `0f59670` READY funnel(ops): E236 scoreboard direct_ex_sg_bot row + 28d headline ex segment (Tier 0) (#333 — https://mhm-finds-dw5l-eyodbace7-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:03 `b876c7e` READY funnel(ledger): after-merge: Pip: PR #334 funnel(pip): E230 writer-pinner 🔴 diagnosis + E — https://mhm-finds-dw5l-qm9xnhpxh-ericputnams-projects.vercel.app
- vercel 2026-10-18T11:00 `ce6830f` READY funnel(pip): E230 writer-pinner 🔴 diagnosis + E181 grade (Tier 0) (#334) — https://mhm-finds-dw5l-g0b08hd1q-ericputnams-projects.vercel.app
- vercel 2026-10-18T10:59 `22cb23a` READY funnel(ledger): after-merge: Rowan: PR #332 funnel(rowan): E235 URL map /clutter/ + /body- — https://mhm-finds-dw5l-2t9q8kqee-ericputnams-projects.vercel.app
- vercel 2026-10-18T10:56 `7f288a0` READY funnel(rowan): E235 URL map /clutter/ + /body-preset/ + 32 --ids pins (Tier 0) (#332) — https://mhm-finds-dw5l-icd7zhfh3-ericputnams-projects.vercel.app
- vercel 2026-10-18T10:55 `f2e1486` READY funnel(ledger): after-merge: Rio: PR #329 funnel(rio): E234 guardrail verdict 2026-10-18 + — https://mhm-finds-dw5l-40gglmotn-ericputnams-projects.vercel.app
- vercel 2026-10-18T10:52 `0378a2f` READY funnel(ledger): Rowan: E235 --ids apply — https://mhm-finds-dw5l-n4n7p88we-ericputnams-projects.vercel.app
- vercel 2026-10-18T10:52 `b3902bd` READY funnel(rio): E234 guardrail verdict 2026-10-18 + E227 leg 1 MET + E134 interim pipe read ( — https://mhm-finds-dw5l-mq3g1xuen-ericputnams-projects.vercel.app
- vercel 2026-10-18T10:37 `1e59251` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-16v01jjp2-ericputnams-projects.vercel.app
- vercel 2026-10-18T02:30 `98c30c7` READY chore: compound learnings from 2026-10-17 — https://mhm-finds-dw5l-9lil9hoxr-ericputnams-projects.vercel.app
- vercel 2026-10-17T11:21 `0f80a02` READY funnel(ledger): after-merge: Quinn: PR #327 funnel: daily run 2026-10-17 (Tier 0 docs) — https://mhm-finds-dw5l-c3qxkx95w-ericputnams-projects.vercel.app
- vercel 2026-10-17T11:18 `d8deeb8` READY funnel(quinn): daily run 2026-10-17 (Tier 0, paper) (#327) — https://mhm-finds-dw5l-mkwkd058p-ericputnams-projects.vercel.app
- vercel 2026-10-17T11:15 `52174f0` READY funnel(ledger): after-merge: Rowan: PR #325 funnel(rowan): E228 URL map jewelry/farmhouse- — https://mhm-finds-dw5l-2bob2rqvw-ericputnams-projects.vercel.app
- vercel 2026-10-17T11:12 `aed39ae` READY funnel(rowan): E228 URL map jewelry/farmhouse-cc + 21 --ids pins on the next two disagreem — https://mhm-finds-dw5l-25f1kwkft-ericputnams-projects.vercel.app
- vercel 2026-10-17T11:11 `f86c0ea` READY funnel(ledger): after-merge: Pip: PR #324 E223 top-up allocator caps per destination (host — https://mhm-finds-dw5l-2zvvjmye3-ericputnams-projects.vercel.app
- vercel 2026-10-17T11:07 `d258059` READY funnel(pip): E223 top-up allocator caps per destination (host-folded), default 1/dest/day  — https://mhm-finds-dw5l-43cy9t1az-ericputnams-projects.vercel.app
- vercel 2026-10-17T11:06 `daf93e1` READY funnel(ledger): after-merge: Rio: PR #326 E227 guardrail prints sessions ex the Singapore  — https://mhm-finds-dw5l-ltuojwir1-ericputnams-projects.vercel.app
- vercel 2026-10-17T11:03 `56f328f` READY funnel(rio): E227 guardrail prints sessions ex the Singapore Direct segment (E216 rule, im — https://mhm-finds-dw5l-n0kvnxfrm-ericputnams-projects.vercel.app
- vercel 2026-10-17T11:03 `f9dfe7a` READY funnel(ledger): after-merge: Ops: PR #321 funnel(ops): E229 rotate CLAUDE.md under its 60  — https://mhm-finds-dw5l-1l3n89amp-ericputnams-projects.vercel.app
- vercel 2026-10-17T10:59 `e62e08d` READY funnel(ops): E229 rotate CLAUDE.md under its 60 KB budget, 60,372 -> 55,878 B (Tier 0) (#3 — https://mhm-finds-dw5l-3ydua90z9-ericputnams-projects.vercel.app
- vercel 2026-10-17T10:59 `e7fa67a` READY funnel(ledger): after-merge: Sage: PR #323 E224 scoreboard flags a WoW read that overlaps  — https://mhm-finds-dw5l-5syga777c-ericputnams-projects.vercel.app
- vercel 2026-10-17T10:55 `094efff` READY funnel(sage): E224 scoreboard flags a WoW read that overlaps a known external window (Tier — https://mhm-finds-dw5l-jdrjxk0jo-ericputnams-projects.vercel.app
- vercel 2026-10-17T10:54 `48bf0c8` READY funnel(ledger): after-merge: Nova: PR #322 funnel(nova): E225 /creator/* guard prints a so — https://mhm-finds-dw5l-qhwqheqzk-ericputnams-projects.vercel.app
- vercel 2026-10-17T10:51 `5605877` READY funnel(nova): E225 /creator/* guard prints a source-matched control (diagnostic, Tier 0) ( — https://mhm-finds-dw5l-40r6yp78y-ericputnams-projects.vercel.app
- vercel 2026-10-17T10:50 `4b7e9c5` READY funnel(ledger): after-merge: Cass: PR #320 funnel(cass): E226 exclude the weekly issue-06  — https://mhm-finds-dw5l-ligsgngk9-ericputnams-projects.vercel.app
- vercel 2026-10-17T10:47 `d8c9aa2` READY funnel(cass): E226 exclude the weekly issue-06 reject before issue 07 (Tier 0) (#320) — https://mhm-finds-dw5l-5hnqk5s0r-ericputnams-projects.vercel.app
- vercel 2026-10-17T10:36 `f745699` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-j12iugahc-ericputnams-projects.vercel.app
- commit 2026-10-21T22:31 `79c80dd` chore: compound learnings from 2026-10-21
- commit 2026-10-21T07:34 `aa2082d` funnel(ledger): after-merge: Quinn: PR #361 funnel: daily run 2026-10-21 (Tier 0 docs)
- commit 2026-10-21T07:30 `01906c6` funnel(quinn): daily run 2026-10-21 — yellow (Tier 0 only), 7/7 moves, registry + digest (
- commit 2026-10-21T07:19 `5220e60` funnel(ledger): after-merge: Pip: PR #357 E251 topup-grade.ts — one grader for every SD-10
- commit 2026-10-21T07:19 `26afea9` funnel(ledger): after-merge: Nova: PR #354 funnel(nova): E253 new-mods row counts writer p
- commit 2026-10-21T07:15 `3945b97` funnel(pip): E251 topup-grade.ts — one grader for every SD-10 top-up; E202 KILL (lift), E2
- commit 2026-10-21T07:11 `ff0daf2` funnel(nova): E253 new-mods row counts writer posts only; manual adds print as "+ N other"
- commit 2026-10-21T07:10 `cd620ac` funnel(ledger): after-merge: Ops: PR #356 funnel(ops): E257 Patreon page timeout gets one 
- commit 2026-10-21T07:07 `18d50b5` funnel(ops): E257 Patreon page timeout gets one bounded re-attempt in every Members walk (
- commit 2026-10-21T07:06 `30d3e03` funnel(ledger): after-merge: Sage: PR #359 E252 hub-eligibility — no family → INCONCLUSIVE
- commit 2026-10-21T07:02 `418fd87` funnel(sage): E252 hub-eligibility — no family → INCONCLUSIVE, OFF_TYPE_RE.lots, nail-tech
- commit 2026-10-21T07:00 `5cd50bf` funnel(ledger): after-merge: Rowan: PR #360 E256 apply rollback file (paper)
- commit 2026-10-21T06:58 `9e61905` funnel(rowan): E256 apply rollback file (73 rows, paper) (#360)
- commit 2026-10-21T06:56 `8312e1a` funnel(ledger): after-merge: Rio: PR #358 E255 yellow verdict 2026-10-21 (Tier 0, paper)
- commit 2026-10-21T06:55 `2b7b414` funnel(ledger): Rowan: E256 --ids apply
- commit 2026-10-21T06:54 `1d6c553` funnel(rio): E255 yellow verdict 2026-10-21 — 10-19 Monday is Mediavine-side demand, not m
- commit 2026-10-21T06:54 `d2ef637` funnel(ledger): after-merge: Rowan: PR #355 E256 face presets out of body-preset + 74 --id
- commit 2026-10-21T06:50 `b128a6f` funnel(ledger): after-merge: Cass: PR #353 E254 issue-07 pre-send check
- commit 2026-10-21T06:50 `a600e55` funnel(rowan): E256 face presets out of body-preset + 74 --ids pins (Tier 0) (#355)
- commit 2026-10-21T06:46 `f2f6053` funnel(cass): E254 issue-07 pre-send check — 202 recipients, 3-run plan, invite DSNs attri
- commit 2026-10-21T06:37 `b2b334d` funnel(ledger): check: morning-check
- commit 2026-10-20T22:31 `ec467c6` chore: compound learnings from 2026-10-20
- commit 2026-10-20T07:09 `2914ad9` funnel(ledger): after-merge: Quinn: PR #352 funnel: daily run 2026-10-20
- commit 2026-10-20T07:05 `a3a6efe` funnel(quinn): daily run 2026-10-20 (Tier 0, paper) (#352)
- commit 2026-10-20T07:02 `e08bf91` funnel(ledger): after-merge: Pip: PR #350 E244 runway top-up #16 artifacts (Tier 0, SD-10 
- commit 2026-10-20T06:58 `fc7d2cb` funnel(pip): E244 runway top-up #16 artifacts (18 ranked rows 10-23..26, E209 next leg) (T
- commit 2026-10-20T06:57 `eac68a3` funnel(ledger): after-merge: Ops: PR #351 E250 deploy-verify grades a paper-only merge on 
- commit 2026-10-20T06:54 `0ca1b52` funnel(ops): E250 deploy-verify grades a paper-only merge on production as served, never T
- commit 2026-10-20T06:54 `91b4d7f` funnel(ledger): after-merge: Rowan: PR #349 funnel(rowan): E249 7 --ids pins on /sims-4-cc
- commit 2026-10-20T06:50 `258034c` funnel(rowan): E249 7 --ids pins on /sims-4-cc-furniture/ (Tier 0) (#349)
- commit 2026-10-20T06:50 `8e74b63` funnel(ledger): Rowan: E249 --ids apply
- commit 2026-10-20T06:49 `7fd30bc` funnel(ledger): Pip: E244 runway top-up #16 apply
- commit 2026-10-20T06:37 `6792c75` funnel(ledger): check: morning-check
- commit 2026-10-19T22:32 `4a7fd40` chore: compound learnings from 2026-10-19
- commit 2026-10-19T07:35 `4acba54` funnel(ledger): after-merge: Quinn: PR #348 funnel: daily run 2026-10-19 (Tier 0 docs)
- commit 2026-10-19T07:30 `415d6f6` funnel(quinn): daily run 2026-10-19 (Tier 0, paper) (#348)
- commit 2026-10-19T07:28 `0db5a64` funnel(ledger): after-merge: Ops: PR #342 E243 budget test fails on registry conflict mark
- commit 2026-10-19T07:25 `737d725` funnel(ops): E243 budget test fails on conflict markers under mhm-funnel/** + E194 graded 
- commit 2026-10-19T07:24 `07b95c9` funnel(ledger): Rowan: E242 isNSFW apply
- commit 2026-10-19T07:23 `a64593d` funnel(ledger): after-merge: Rowan: PR #344 funnel(rowan): E242 isNSFW pins on 8 adult tit
- commit 2026-10-19T07:20 `89b9d45` funnel(rowan): E242 isNSFW pins on 8 adult titles in the gameplay/script top 25 (Tier 0) (
- commit 2026-10-19T07:19 `6d8da03` funnel(ledger): after-merge: Quinn: PR #335 Sage eyes-cc hub (E231, T1)
- commit 2026-10-19T07:16 `d5f8527` funnel(sage): E231 /games/sims-4/eyes-cc/ hub — eyes, eyebrows, lashes (Tier 1) (#335)
- commit 2026-10-19T07:15 `2b63d7c` funnel(ledger): after-merge: Sage: PR #341 E238 hub-eligibility read as a script + gamepla
- commit 2026-10-19T07:13 `6d84879` funnel(ledger): after-merge: Quinn: PR #340 park 10 experiment rows + close Q-E21 (paper)
- commit 2026-10-19T07:12 `2522f93` funnel(ledger): after-merge: Rio: PR #345 E241 guardrail agreement tracker + E227 KEEP fin
- commit 2026-10-19T07:11 `03ab232` funnel(sage): E238 hub-eligibility read as a script + gameplay BEFORE (Tier 0) (#341)
- commit 2026-10-19T07:07 `36e3985` funnel(rio): E241 guardrail agreement tracker + E227 KEEP final + E234 10-19 leg (Tier 0) 
- commit 2026-10-19T07:06 `8963aeb` funnel(ledger): after-merge: Pip: PR #347 E237 pin-queue day trace + E188 grade
- commit 2026-10-19T07:03 `37283f0` funnel(pip): E237 pin-queue day trace + E188 grade (Tier 0, read-only) (#347)
- commit 2026-10-19T07:02 `45e6cb7` funnel(ledger): after-merge: Cass: PR #346 E240 weekly-issue cohort diagnosis
- commit 2026-10-19T06:59 `4d8e6c6` funnel(cass): E240 weekly-issue cohort diagnosis: DSN decode + cohort diff + inert seed pa
- commit 2026-10-19T06:58 `4cac6cd` funnel(ledger): Quinn: E233 invite-01 live send 22/22
- commit 2026-10-19T06:57 `1ed301c` funnel(ledger): after-merge: Nova: PR #343 E239 catalog-ingest stops re-fetching refreshed
- commit 2026-10-19T06:54 `be42536` funnel(nova): E239 catalog-ingest stops re-fetching refreshed posts that added nothing (#3
- commit 2026-10-19T06:54 `4a43793` funnel(ledger): after-merge: Quinn: PR #328 Cass invite-01 sender (E233, T1)
- commit 2026-10-19T06:50 `4374ceb` funnel(cass): E233 subscriber→account invite sender, invite-01 (Tier 1 send) (#328)
- commit 2026-10-19T06:44 `7a40ab5` funnel(quinn): park 10 graded/parked experiment rows + close Q-E21 (Tier 0, paper) (#340)
- commit 2026-10-19T06:37 `f7df0e3` funnel(ledger): check: morning-check
- commit 2026-10-18T22:30 `15f2a9a` chore: compound learnings from 2026-10-18
- commit 2026-10-18T20:08 `3bd4247` funnel(ledger): after-merge: operator session: PR #339
- commit 2026-10-18T20:04 `9a307ef` feat(creators): claimed creators get a page from 1 mod; admins can test the creator portal
- commit 2026-10-18T07:36 `c2fe4ae` funnel(ledger): after-merge: Quinn: PR #338 funnel: daily run 2026-10-18
- commit 2026-10-18T07:32 `baa174f` funnel(quinn): daily run 2026-10-18 (Tier 0, paper) (#338)
- commit 2026-10-18T07:27 `3e326a5` funnel(ledger): after-merge: Nova: PR #337 funnel(nova): E232 fix-forward — remove conflic
- commit 2026-10-18T07:23 `5ca8987` funnel(nova): E232 fix-forward — remove conflict markers #330 left in 3 registry files (Ti
- commit 2026-10-18T07:23 `7d6589c` funnel(ledger): after-merge: Nova: PR #330 funnel(nova): E232 new-mods −38% diagnosed as w
- commit 2026-10-18T07:19 `4fc47b7` funnel(nova): E232 new-mods -38% diagnosed as writer cadence; scoreboard row prints posts 
- commit 2026-10-18T07:17 `b19fbcc` funnel(ledger): after-merge: Cass: PR #331 funnel(cass): E184/E118/E205 grades + E233 queu
- commit 2026-10-18T07:14 `508be90` funnel(cass): E184/E118/E205 grades + E233 queued (Tier 0, paper) (#331)
- commit 2026-10-18T07:13 `082d0a0` funnel(ledger): after-merge: Sage: PR #336 funnel(sage): E171 grade + E231 queued (Tier 0,
- commit 2026-10-18T07:09 `2cda14e` funnel(sage): E171 grade + E231 queued (Tier 0, paper) (#336)
- commit 2026-10-18T07:07 `9755e12` funnel(ledger): after-merge: Ops: PR #333 funnel(ops): E236 scoreboard direct_ex_sg_bot ro
- commit 2026-10-18T07:04 `0f59670` funnel(ops): E236 scoreboard direct_ex_sg_bot row + 28d headline ex segment (Tier 0) (#333
- commit 2026-10-18T07:03 `b876c7e` funnel(ledger): after-merge: Pip: PR #334 funnel(pip): E230 writer-pinner 🔴 diagnosis + E
- commit 2026-10-18T07:00 `ce6830f` funnel(pip): E230 writer-pinner 🔴 diagnosis + E181 grade (Tier 0) (#334)
- commit 2026-10-18T06:59 `22cb23a` funnel(ledger): after-merge: Rowan: PR #332 funnel(rowan): E235 URL map /clutter/ + /body-
- commit 2026-10-18T06:56 `7f288a0` funnel(rowan): E235 URL map /clutter/ + /body-preset/ + 32 --ids pins (Tier 0) (#332)
- commit 2026-10-18T06:55 `f2e1486` funnel(ledger): after-merge: Rio: PR #329 funnel(rio): E234 guardrail verdict 2026-10-18 +
- commit 2026-10-18T06:52 `0378a2f` funnel(ledger): Rowan: E235 --ids apply
- commit 2026-10-18T06:52 `b3902bd` funnel(rio): E234 guardrail verdict 2026-10-18 + E227 leg 1 MET + E134 interim pipe read (
- commit 2026-10-18T06:36 `1e59251` funnel(ledger): check: morning-check
- commit 2026-10-17T22:30 `98c30c7` chore: compound learnings from 2026-10-17
- commit 2026-10-17T07:21 `0f80a02` funnel(ledger): after-merge: Quinn: PR #327 funnel: daily run 2026-10-17 (Tier 0 docs)
- commit 2026-10-17T07:18 `d8deeb8` funnel(quinn): daily run 2026-10-17 (Tier 0, paper) (#327)
- commit 2026-10-17T07:15 `52174f0` funnel(ledger): after-merge: Rowan: PR #325 funnel(rowan): E228 URL map jewelry/farmhouse-
- commit 2026-10-17T07:12 `aed39ae` funnel(rowan): E228 URL map jewelry/farmhouse-cc + 21 --ids pins on the next two disagreem
- commit 2026-10-17T07:11 `f86c0ea` funnel(ledger): after-merge: Pip: PR #324 E223 top-up allocator caps per destination (host
- commit 2026-10-17T07:07 `d258059` funnel(pip): E223 top-up allocator caps per destination (host-folded), default 1/dest/day 
- commit 2026-10-17T07:06 `daf93e1` funnel(ledger): after-merge: Rio: PR #326 E227 guardrail prints sessions ex the Singapore 
- commit 2026-10-17T07:03 `56f328f` funnel(rio): E227 guardrail prints sessions ex the Singapore Direct segment (E216 rule, im
- commit 2026-10-17T07:03 `f9dfe7a` funnel(ledger): after-merge: Ops: PR #321 funnel(ops): E229 rotate CLAUDE.md under its 60 
- commit 2026-10-17T06:59 `e62e08d` funnel(ops): E229 rotate CLAUDE.md under its 60 KB budget, 60,372 -> 55,878 B (Tier 0) (#3
- commit 2026-10-17T06:59 `e7fa67a` funnel(ledger): after-merge: Sage: PR #323 E224 scoreboard flags a WoW read that overlaps 
- commit 2026-10-17T06:55 `094efff` funnel(sage): E224 scoreboard flags a WoW read that overlaps a known external window (Tier
- commit 2026-10-17T06:54 `48bf0c8` funnel(ledger): after-merge: Nova: PR #322 funnel(nova): E225 /creator/* guard prints a so
- commit 2026-10-17T06:51 `5605877` funnel(nova): E225 /creator/* guard prints a source-matched control (diagnostic, Tier 0) (
- commit 2026-10-17T06:50 `4b7e9c5` funnel(ledger): after-merge: Cass: PR #320 funnel(cass): E226 exclude the weekly issue-06 
- commit 2026-10-17T06:47 `d8c9aa2` funnel(cass): E226 exclude the weekly issue-06 reject before issue 07 (Tier 0) (#320)

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
