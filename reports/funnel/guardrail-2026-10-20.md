# Revenue guardrail — 2026-10-20 (last finalized day 2026-10-18)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (200 rows over 10 pages, oldest 2026-10-14T11:10Z ≤ window start 2026-10-15T04:00Z) · deploy in window: yes

rollback bound: in-window production deploys 75 (≤24 to auto-rollback) · target 1.5 h before window start (≤48 h) → withheld: in-window deploys 75 exceed rollback bound 24

- Revenue $258.68 (-1.8%), RPM 15.96 (-3.3%), sessions 1.6% vs same weekday, prior 4 weeks · 3-day revenue 4.2%

| | 2026-10-18 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $258.68 | $263.54 | -1.8% |
| session RPM | 15.96 | 16.51 | -3.3% |
| sessions | 16,199 | 15,939 | 1.6% |
| sessions, GA4 raw | 16,467 | 16,100 | 2.3% |
| **sessions ex Singapore (direct)** (E216, GA4) | 14,719 | 15,245 | -3.4% |
| 3-day revenue | $753.20 | $722.59 | 4.2% |
| 3-day RPM | 16.71 | 16.98 | -1.6% |

sessions ex Singapore (direct) (E216, GA4): raw 16,467 vs 16,100 (+2.3%) → ex-segment 14,719 vs 15,245 (-3.4%) · segment 1,748 = 10.62% of the day (controls 5.31%, 4 same weekdays)

Mediavine health: all ok

## Production changes since 2026-10-15 (72h before the judged day)

- vercel 2026-10-20T10:37 `6792c75` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-8er7pcute-ericputnams-projects.vercel.app
- vercel 2026-10-20T02:32 `4a7fd40` READY chore: compound learnings from 2026-10-19 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-epy5luv8r-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:35 `4acba54` READY funnel(ledger): after-merge: Quinn: PR #348 funnel: daily run 2026-10-19 (Tier 0 docs) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-gfhvg1zev-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:30 `415d6f6` READY funnel(quinn): daily run 2026-10-19 (Tier 0, paper) (#348) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-l13bv0epw-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:28 `0db5a64` READY funnel(ledger): after-merge: Ops: PR #342 E243 budget test fails on registry conflict mark [after judged day — judged tomorrow] — https://mhm-finds-dw5l-i45dl78yn-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:25 `737d725` READY funnel(ops): E243 budget test fails on conflict markers under mhm-funnel/** + E194 graded  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-81qeciz6s-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:24 `07b95c9` READY funnel(ledger): Rowan: E242 isNSFW apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1vpxyfjia-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:23 `a64593d` READY funnel(ledger): after-merge: Rowan: PR #344 funnel(rowan): E242 isNSFW pins on 8 adult tit [after judged day — judged tomorrow] — https://mhm-finds-dw5l-63guq9u3h-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:20 `89b9d45` READY funnel(rowan): E242 isNSFW pins on 8 adult titles in the gameplay/script top 25 (Tier 0) ( [after judged day — judged tomorrow] — https://mhm-finds-dw5l-pa8q838ka-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:19 `6d8da03` READY funnel(ledger): after-merge: Quinn: PR #335 Sage eyes-cc hub (E231, T1) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-4g6kopvha-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:16 `d5f8527` READY funnel(sage): E231 /games/sims-4/eyes-cc/ hub — eyes, eyebrows, lashes (Tier 1) (#335) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-79q2uef25-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:15 `2b63d7c` READY funnel(ledger): after-merge: Sage: PR #341 E238 hub-eligibility read as a script + gamepla [after judged day — judged tomorrow] — https://mhm-finds-dw5l-p459rvxxu-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:14 `6d84879` READY funnel(ledger): after-merge: Quinn: PR #340 park 10 experiment rows + close Q-E21 (paper) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ltd0lwf4w-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:13 `2522f93` READY funnel(ledger): after-merge: Rio: PR #345 E241 guardrail agreement tracker + E227 KEEP fin [after judged day — judged tomorrow] — https://mhm-finds-dw5l-8fctk6jgt-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:11 `03ab232` READY funnel(sage): E238 hub-eligibility read as a script + gameplay BEFORE (Tier 0) (#341) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-o6qd6skai-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:09 `36e3985` READY funnel(rio): E241 guardrail agreement tracker + E227 KEEP final + E234 10-19 leg (Tier 0)  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-os7sw9cc6-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:06 `8963aeb` READY funnel(ledger): after-merge: Pip: PR #347 E237 pin-queue day trace + E188 grade [after judged day — judged tomorrow] — https://mhm-finds-dw5l-hxihqj2xd-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:03 `37283f0` READY funnel(pip): E237 pin-queue day trace + E188 grade (Tier 0, read-only) (#347) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ipaohuuju-ericputnams-projects.vercel.app
- vercel 2026-10-19T11:02 `45e6cb7` READY funnel(ledger): after-merge: Cass: PR #346 E240 weekly-issue cohort diagnosis [after judged day — judged tomorrow] — https://mhm-finds-dw5l-o2ukte0ix-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:59 `4d8e6c6` READY funnel(cass): E240 weekly-issue cohort diagnosis: DSN decode + cohort diff + inert seed pa [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7u49sgoid-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:58 `4cac6cd` READY funnel(ledger): Quinn: E233 invite-01 live send 22/22 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-9834lnd0h-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:57 `1ed301c` READY funnel(ledger): after-merge: Nova: PR #343 E239 catalog-ingest stops re-fetching refreshed [after judged day — judged tomorrow] — https://mhm-finds-dw5l-oz445dskm-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:54 `be42536` READY funnel(nova): E239 catalog-ingest stops re-fetching refreshed posts that added nothing (#3 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-gysg1aqz2-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:54 `4a43793` READY funnel(ledger): after-merge: Quinn: PR #328 Cass invite-01 sender (E233, T1) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-4qx26oaq2-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:50 `4374ceb` READY funnel(cass): E233 subscriber→account invite sender, invite-01 (Tier 1 send) (#328) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-b4hb5hqy1-ericputnams-projects.vercel.app
- vercel 2026-10-19T10:37 `f7df0e3` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-muh2p52b9-ericputnams-projects.vercel.app
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
- vercel 2026-10-17T02:31 `2ea53aa` READY chore: compound learnings from 2026-10-16 — https://mhm-finds-dw5l-kk83hx4l1-ericputnams-projects.vercel.app
- vercel 2026-10-16T13:06 `562c2d2` READY funnel(ledger): after-merge: Quinn: PR #319 funnel: daily run 2026-10-16 (Tier 0 docs) — https://mhm-finds-dw5l-o9dmgdmfp-ericputnams-projects.vercel.app
- vercel 2026-10-16T13:02 `79278df` READY funnel(quinn): daily run 2026-10-16 (Tier 0, paper) (#319) — https://mhm-finds-dw5l-dwe80gk4y-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:57 `3629eff` READY funnel(ledger): after-merge: Ops: PR #318 funnel(ops): E222 liveness RAN-UNLANDED + runner — https://mhm-finds-dw5l-2ced8izv0-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:54 `38885f4` READY funnel(ops): E222 liveness grades a ran-but-unlanded day RAN-UNLANDED, runner lands an acc — https://mhm-finds-dw5l-h3kavrxig-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:53 `1807cf2` READY funnel(ledger): after-merge: Pip: PR #317 E216 Singapore Direct classified as automated —  — https://mhm-finds-dw5l-50xqgcxuk-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:50 `21cc7c9` READY funnel(pip): E216 Singapore Direct classified as automated — reusable read + 28d artifact  — https://mhm-finds-dw5l-dcmklyrhs-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:50 `4612381` READY funnel(ledger): after-merge: Rowan: PR #316 E221 makeup-cc shows lashes (23 clean rows), 9 — https://mhm-finds-dw5l-f23c683pc-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:49 `1961531` READY funnel(ledger): after-merge: Rio: PR #314 E220 guardrail verdict 2026-10-16 — 10-14 RPM −6 — https://mhm-finds-dw5l-5f5wj97ae-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:47 `af6fc3d` READY funnel(ledger): after-merge: Sage: PR #315 E217 skin-details top-30 hand-fix, 3 rows + 1 K — https://mhm-finds-dw5l-ibwqky383-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:46 `bf6c6ce` READY funnel(ledger): after-merge: Nova: PR #313 E218 IndexNow pushes changed /creator/ pages da — https://mhm-finds-dw5l-kkpvvqrzq-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:46 `5e4ffd3` READY funnel(rowan): E221 makeup-cc shows lashes (23 clean rows), 900+ → 800+, copy-count guard  — https://mhm-finds-dw5l-6w8pmbpx6-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:45 `7d58e2e` READY funnel(ledger): after-merge: Cass: PR #309 E152 KILL → /go free-tier Patreon follow ask — https://mhm-finds-dw5l-yyik25pck-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:16 `405f32c` READY funnel(rio): E220 guardrail verdict 2026-10-16 — 10-14 RPM −6.8% is Singapore mix on MV mo — https://mhm-finds-dw5l-5yifcx5zl-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:10 `56c4a01` READY funnel(sage): E217 skin-details top-30 hand-fix, 3 rows + 1 KEEP pin (Tier 0) (#315) — https://mhm-finds-dw5l-2mrug10q0-ericputnams-projects.vercel.app
- vercel 2026-10-16T12:02 `9cf1f3f` READY funnel(nova): E218 IndexNow pushes changed /creator/ pages daily (--creators-changed) + E1 — https://mhm-finds-dw5l-pk4nron6b-ericputnams-projects.vercel.app
- vercel 2026-10-16T11:45 `da82339` READY funnel(cass): E152 KILL → /go slot becomes a free-tier Patreon follow ask; issue 06 run 1  — https://mhm-finds-dw5l-1m8juge78-ericputnams-projects.vercel.app
- vercel 2026-10-16T10:48 `55861e8` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-jhobuoxmt-ericputnams-projects.vercel.app
- vercel 2026-10-15T11:18 `ac51cc6` READY funnel(ledger): after-merge: Rio: PR #312 E213 guardrail verdict 10-15 + B2 leg 2 MET + It — https://mhm-finds-dw5l-2z14qx3u1-ericputnams-projects.vercel.app
- vercel 2026-10-15T11:14 `14d2450` READY funnel(rio): E213 guardrail verdict 2026-10-15 + B2 leg 2 MET + Item D re-pitch as Q29 (Ti — https://mhm-finds-dw5l-ocbi7a1nj-ericputnams-projects.vercel.app
- vercel 2026-10-15T11:13 `d860f62` READY funnel(ledger): after-merge: Nova: PR #306 funnel(nova): E211 creator sign-ups land on a ' — https://mhm-finds-dw5l-g12h2whct-ericputnams-projects.vercel.app
- vercel 2026-10-15T11:10 `9751073` READY funnel(nova): E211 creator sign-ups land on a 'submit your first mod' welcome (Tier 0) (#3 — https://mhm-finds-dw5l-gxeu9h209-ericputnams-projects.vercel.app
- vercel 2026-10-15T11:09 `b2c419e` READY funnel(ledger): after-merge: Rowan: PR #311 E214 makeup-cc subtype pins, 119 rows (Tier 0) — https://mhm-finds-dw5l-5gctdhcsl-ericputnams-projects.vercel.app
- vercel 2026-10-15T11:06 `15d4193` READY funnel(rowan): E214 makeup-cc subtype pins, 119 rows (Tier 0) (#311) — https://mhm-finds-dw5l-ka2z8zhoe-ericputnams-projects.vercel.app
- vercel 2026-10-15T11:05 `22173d0` READY funnel(ledger): after-merge: Pip: PR #307 funnel(pip): E209 runway top-up #15 (18 ranked r — https://mhm-finds-dw5l-mh18jchc8-ericputnams-projects.vercel.app
- vercel 2026-10-15T11:02 `df29f28` READY funnel(pip): E209 runway top-up #15 (18 ranked rows 10-21/22/23, E202 next leg) (Tier 0, S — https://mhm-finds-dw5l-qflu7ctps-ericputnams-projects.vercel.app
- vercel 2026-10-15T11:01 `ad69433` READY funnel(ledger): after-merge: Quinn: PR #310 funnel(quinn): park 17 far-read experiment row — https://mhm-finds-dw5l-57e4sgd9h-ericputnams-projects.vercel.app
- vercel 2026-10-15T10:57 `112ddaa` READY funnel(quinn): park 17 far-read experiment rows before dispatch (Tier 0, paper) (#310) — https://mhm-finds-dw5l-48ojlq47a-ericputnams-projects.vercel.app
- vercel 2026-10-15T10:57 `72a7ccd` READY funnel(ledger): after-merge: Ops: PR #308 funnel(ops): E215 report writers refuse to defau — https://mhm-finds-dw5l-ozr0nz2gl-ericputnams-projects.vercel.app
- vercel 2026-10-15T10:53 `b4bfa1c` READY funnel(ops): E215 report writers refuse to default into another checkout + stale 10-08/10- — https://mhm-finds-dw5l-5intca3zq-ericputnams-projects.vercel.app
- vercel 2026-10-15T10:53 `36bd3fe` READY funnel(ledger): after-merge: Sage: PR #305 funnel(sage): E210 skin-details retitle for ski — https://mhm-finds-dw5l-c2re284y2-ericputnams-projects.vercel.app
- vercel 2026-10-15T10:49 `e115269` READY funnel(ledger): Pip: E209 runway top-up #15 apply — https://mhm-finds-dw5l-puziurp7q-ericputnams-projects.vercel.app
- vercel 2026-10-15T10:49 `05957aa` READY funnel(sage): E210 skin-details hub retitle for skin + skin overlay queries (Tier 0) (#305 — https://mhm-finds-dw5l-hz6b55gzy-ericputnams-projects.vercel.app
- vercel 2026-10-15T10:37 `3da6de1` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-gp2e1xj3q-ericputnams-projects.vercel.app
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
- commit 2026-10-17T06:36 `f745699` funnel(ledger): check: morning-check
- commit 2026-10-16T22:31 `2ea53aa` chore: compound learnings from 2026-10-16
- commit 2026-10-16T09:05 `562c2d2` funnel(ledger): after-merge: Quinn: PR #319 funnel: daily run 2026-10-16 (Tier 0 docs)
- commit 2026-10-16T09:02 `79278df` funnel(quinn): daily run 2026-10-16 (Tier 0, paper) (#319)
- commit 2026-10-16T08:57 `3629eff` funnel(ledger): after-merge: Ops: PR #318 funnel(ops): E222 liveness RAN-UNLANDED + runner
- commit 2026-10-16T08:54 `38885f4` funnel(ops): E222 liveness grades a ran-but-unlanded day RAN-UNLANDED, runner lands an acc
- commit 2026-10-16T08:53 `1807cf2` funnel(ledger): after-merge: Pip: PR #317 E216 Singapore Direct classified as automated — 
- commit 2026-10-16T08:50 `21cc7c9` funnel(pip): E216 Singapore Direct classified as automated — reusable read + 28d artifact 
- commit 2026-10-16T08:49 `4612381` funnel(ledger): after-merge: Rowan: PR #316 E221 makeup-cc shows lashes (23 clean rows), 9
- commit 2026-10-16T08:49 `1961531` funnel(ledger): after-merge: Rio: PR #314 E220 guardrail verdict 2026-10-16 — 10-14 RPM −6
- commit 2026-10-16T08:47 `af6fc3d` funnel(ledger): after-merge: Sage: PR #315 E217 skin-details top-30 hand-fix, 3 rows + 1 K
- commit 2026-10-16T08:46 `bf6c6ce` funnel(ledger): after-merge: Nova: PR #313 E218 IndexNow pushes changed /creator/ pages da
- commit 2026-10-16T08:45 `5e4ffd3` funnel(rowan): E221 makeup-cc shows lashes (23 clean rows), 900+ → 800+, copy-count guard 
- commit 2026-10-16T08:45 `7d58e2e` funnel(ledger): after-merge: Cass: PR #309 E152 KILL → /go free-tier Patreon follow ask
- commit 2026-10-16T08:16 `405f32c` funnel(rio): E220 guardrail verdict 2026-10-16 — 10-14 RPM −6.8% is Singapore mix on MV mo
- commit 2026-10-16T08:10 `56c4a01` funnel(sage): E217 skin-details top-30 hand-fix, 3 rows + 1 KEEP pin (Tier 0) (#315)
- commit 2026-10-16T08:02 `9cf1f3f` funnel(nova): E218 IndexNow pushes changed /creator/ pages daily (--creators-changed) + E1
- commit 2026-10-16T07:45 `da82339` funnel(cass): E152 KILL → /go slot becomes a free-tier Patreon follow ask; issue 06 run 1 
- commit 2026-10-16T06:48 `55861e8` funnel(ledger): check: morning-check
- commit 2026-10-15T07:18 `ac51cc6` funnel(ledger): after-merge: Rio: PR #312 E213 guardrail verdict 10-15 + B2 leg 2 MET + It
- commit 2026-10-15T07:14 `14d2450` funnel(rio): E213 guardrail verdict 2026-10-15 + B2 leg 2 MET + Item D re-pitch as Q29 (Ti
- commit 2026-10-15T07:13 `d860f62` funnel(ledger): after-merge: Nova: PR #306 funnel(nova): E211 creator sign-ups land on a '
- commit 2026-10-15T07:10 `9751073` funnel(nova): E211 creator sign-ups land on a 'submit your first mod' welcome (Tier 0) (#3
- commit 2026-10-15T07:09 `b2c419e` funnel(ledger): after-merge: Rowan: PR #311 E214 makeup-cc subtype pins, 119 rows (Tier 0)
- commit 2026-10-15T07:06 `15d4193` funnel(rowan): E214 makeup-cc subtype pins, 119 rows (Tier 0) (#311)
- commit 2026-10-15T07:05 `22173d0` funnel(ledger): after-merge: Pip: PR #307 funnel(pip): E209 runway top-up #15 (18 ranked r
- commit 2026-10-15T07:01 `df29f28` funnel(pip): E209 runway top-up #15 (18 ranked rows 10-21/22/23, E202 next leg) (Tier 0, S
- commit 2026-10-15T07:01 `ad69433` funnel(ledger): after-merge: Quinn: PR #310 funnel(quinn): park 17 far-read experiment row
- commit 2026-10-15T06:57 `112ddaa` funnel(quinn): park 17 far-read experiment rows before dispatch (Tier 0, paper) (#310)
- commit 2026-10-15T06:57 `72a7ccd` funnel(ledger): after-merge: Ops: PR #308 funnel(ops): E215 report writers refuse to defau
- commit 2026-10-15T06:53 `b4bfa1c` funnel(ops): E215 report writers refuse to default into another checkout + stale 10-08/10-
- commit 2026-10-15T06:53 `36bd3fe` funnel(ledger): after-merge: Sage: PR #305 funnel(sage): E210 skin-details retitle for ski
- commit 2026-10-15T06:49 `e115269` funnel(ledger): Pip: E209 runway top-up #15 apply
- commit 2026-10-15T06:49 `05957aa` funnel(sage): E210 skin-details hub retitle for skin + skin overlay queries (Tier 0) (#305

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
