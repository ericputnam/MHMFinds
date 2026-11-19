# Revenue guardrail — 2026-11-19 (last finalized day 2026-11-17)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (100 rows over 5 pages, oldest 2026-11-13T12:04Z ≤ window start 2026-11-14T05:00Z) · deploy in window: yes

rollback bound: in-window production deploys 56 (≤24 to auto-rollback) · target 1.5 h before window start (≤48 h) → withheld: in-window deploys 56 exceed rollback bound 24

rollback bound split (E427, informational — the bound reads all 56): build-relevant 15 ≤ 24 · paper-only 41

- Revenue $218.07 (7.5%), RPM 18.85 (7.7%), sessions -0.5% vs same weekday, prior 4 weeks · 3-day revenue 7.1%

| | 2026-11-17 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $218.07 | $202.86 | 7.5% |
| session RPM | 18.85 | 17.51 | 7.7% |
| sessions | 11,567 | 11,628 | -0.5% |
| sessions, GA4 raw | 11,471 | 11,721 | -2.1% |
| **sessions ex Singapore (direct)** (E216, GA4) | 10,800 | 11,393 | -5.2% |
| **ex-segment RPM** (E271; MV revenue ÷ GA4 ex-segment sessions) | 20.19 | 17.81 | 13.4% → rate |
| 3-day revenue | $712.91 | $665.58 | 7.1% |
| 3-day RPM | 18.72 | 17.16 | 9.1% |

sessions ex Singapore (direct) (E216, GA4): raw 11,471 vs 11,721 (-2.1%) → ex-segment 10,800 vs 11,393 (-5.2%) · segment 671 = 5.85% of the day (controls 2.80%, 4 same weekdays)

ex-segment RPM (E216; Mediavine revenue ÷ GA4 sessions ex Singapore (direct)): $20.19 vs $17.81 (+13.4%) · mix alone predicts raw RPM -3.1% → rate (mix band ±1%)

Mediavine health: all ok

## Production changes since 2026-11-14 (72h before the judged day)

- vercel 2026-11-19T11:37 `5c68e57` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jzf5yd1ax-ericputnams-projects.vercel.app
- vercel 2026-11-19T04:01 `63c3e06` READY chore: compound learnings from 2026-11-18 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-gqqyf5ja2-ericputnams-projects.vercel.app
- vercel 2026-11-18T11:39 `573ee3a` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-3bbpw43nq-ericputnams-projects.vercel.app
- vercel 2026-11-18T03:33 `0db2180` READY chore: compound learnings from 2026-11-17 — https://mhm-finds-dw5l-meqky4pbd-ericputnams-projects.vercel.app
- vercel 2026-11-17T16:54 `cc52ed9` READY funnel(ledger): digest 2026-11-17 landed by runner (daily PR did not merge) — https://mhm-finds-dw5l-49ujryj1l-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:48 `18ae01a` READY funnel(ledger): Sage: E430 IndexNow creators push — https://mhm-finds-dw5l-rfcf6tibw-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:47 `f8c6856` READY funnel(ledger): after-merge: Sage: PR #565 E430 sitemap template lastmods — https://mhm-finds-dw5l-hn4nc9jid-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:39 `7cfcf67` READY fix(seo): E430 bump sitemap template lastmods to the dates their sources last changed (#56 — https://mhm-finds-dw5l-7e2it1vdn-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:38 `f16d18b` READY funnel(ledger): after-merge: Sage: PR #564 E429 guide title overrides — https://mhm-finds-dw5l-b2jbcidxl-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:38 `987a795` READY funnel(ledger): after-merge: Rowan: PR #563 living-room-cc + title-only living-room theme  — https://mhm-finds-dw5l-76daqzh33-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:37 `e459cb3` READY funnel(ledger): after-merge: Pip: PR #562 E428 scoreboard reads Yandex/Brave/DDG/OceanHero — https://mhm-finds-dw5l-lzd0eqwj7-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:35 `47a9aa5` READY funnel(ledger): after-merge: Rio: PR #561 E424 scoreboard RPM legs + E416 falsifier — https://mhm-finds-dw5l-jpdio0ji6-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:24 `c4551bf` READY feat(seo): E429 randomized <title> overrides for 9 striking-distance guides at the proxy ( — https://mhm-finds-dw5l-b27baw4tx-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:19 `38e7f29` READY funnel(ledger): Rowan: E425 IndexNow push — https://mhm-finds-dw5l-77fqoafyy-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:18 `4facbfa` READY funnel(pip): E428 scoreboard reads Yandex/Brave/DDG/OceanHero referrals as other_search (# — https://mhm-finds-dw5l-53ouqng34-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:02 `ed3b8d6` READY feat(collections): living-room-cc page + title-only living-room theme (E425) (#563) — https://mhm-finds-dw5l-pzm8fou1m-ericputnams-projects.vercel.app
- vercel 2026-11-17T13:01 `fcbf86c` READY funnel(ledger): after-merge: Cass: PR #560 E426 GA4 surface param source -> content_type — https://mhm-finds-dw5l-95fh2e9rk-ericputnams-projects.vercel.app
- vercel 2026-11-17T12:50 `c8c5c5b` READY funnel(ledger): Rowan: E425 isNSFW pin apply — https://mhm-finds-dw5l-b5vz9su3q-ericputnams-projects.vercel.app
- vercel 2026-11-17T12:49 `17afe57` READY funnel(ledger): Rowan: E425 living-room retag apply — https://mhm-finds-dw5l-1dbm9lz7n-ericputnams-projects.vercel.app
- vercel 2026-11-17T12:49 `184589d` READY funnel(rio): E424 scoreboard prints the session-RPM legs and the E416 ad-side falsifier st — https://mhm-finds-dw5l-fujvz7bln-ericputnams-projects.vercel.app
- vercel 2026-11-17T12:42 `2b647e7` READY funnel(cass): E426 GA4 surface param source -> content_type (stops capture events restarti — https://mhm-finds-dw5l-c5kjhk27b-ericputnams-projects.vercel.app
- vercel 2026-11-17T12:39 `da63117` READY funnel(ledger): after-merge: Ops: PR #559 E427 guardrail build-relevant vs paper split — https://mhm-finds-dw5l-biiudj53s-ericputnams-projects.vercel.app
- vercel 2026-11-17T12:14 `437448e` READY funnel(ops): E427 guardrail prints the build-relevant vs paper split of in-window deploys  — https://mhm-finds-dw5l-azfbmnibw-ericputnams-projects.vercel.app
- vercel 2026-11-17T11:48 `81451b4` READY funnel(ledger): after-merge: Nova: PR #558 E423 refresh brief for /new-sims-4-mods-2026/ ( — https://mhm-finds-dw5l-l7vlsaeha-ericputnams-projects.vercel.app
- vercel 2026-11-17T11:45 `46a04f2` READY funnel(nova): E423 refresh brief for /new-sims-4-mods-2026/ (Q46, paper trail only) (#558) — https://mhm-finds-dw5l-r3xwy6wlk-ericputnams-projects.vercel.app
- vercel 2026-11-17T11:38 `6d3925f` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-4g4kr6q2h-ericputnams-projects.vercel.app
- vercel 2026-11-17T03:30 `7dafe3b` READY chore: compound learnings from 2026-11-16 — https://mhm-finds-dw5l-g3wcokzjt-ericputnams-projects.vercel.app
- vercel 2026-11-16T11:37 `78951f9` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-8tjic1h3q-ericputnams-projects.vercel.app
- vercel 2026-11-16T03:31 `f4fe83b` READY chore: compound learnings from 2026-11-15 — https://mhm-finds-dw5l-7t3zwljpv-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:29 `b8c40e6` READY funnel(ledger): after-merge: Quinn: PR #556 funnel: daily run 2026-11-15 — https://mhm-finds-dw5l-l1nqsxwcl-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:26 `b19b52a` READY funnel: daily run 2026-11-15 (#556) — https://mhm-finds-dw5l-hc1vkhwbp-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:22 `4cc7d6c` READY funnel(ledger): after-merge: Rowan: PR #552 E418/E419 gameplay-mods hub — https://mhm-finds-dw5l-ovmfpt8kg-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:19 `ed0d5a6` READY funnel(rowan): E418/E419 gameplay-mods hub — fix the gate, then ship the page (#552) — https://mhm-finds-dw5l-bkj7bdcp3-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:18 `156707d` READY funnel(ledger): after-merge: Sage: PR #555 E412 homepage guides RCT — https://mhm-finds-dw5l-eh4i8zi3c-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:14 `b50df4d` READY funnel(sage): E412 homepage 'Popular Sims 4 guides' block, 20-vs-20 randomized link test ( — https://mhm-finds-dw5l-p4dxkafw9-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:12 `f393217` READY funnel(ledger): after-merge: Rio: PR #551 E416 verdict 2026-11-15 — perk read + RPM/page-m — https://mhm-finds-dw5l-kq2cyhia3-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:10 `a17f9c6` READY funnel(rio): E416 verdict 2026-11-15 — perk reaches 3/58 payers, B2 drift-line read 11-30; — https://mhm-finds-dw5l-jeyinowzk-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:09 `c4693d3` READY funnel(ledger): after-merge: Pip: PR #554 E409 scoreboard channel rule → lib; Bing-syndica — https://mhm-finds-dw5l-ls1lgdgol-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:06 `4858df2` READY funnel(pip): E409 scoreboard channel rule → pure lib; Bing-syndicated referrals read as se — https://mhm-finds-dw5l-1ky7xufmd-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:04 `efdea6a` READY funnel(ledger): after-merge: Nova: PR #553 E413 record applied ids in the frozen split-fol — https://mhm-finds-dw5l-psxg90y1r-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:02 `be90986` READY chore(funnel): E413 record applied ids in the frozen split-fold plan (#553) — https://mhm-finds-dw5l-ltnphr05c-ericputnams-projects.vercel.app
- vercel 2026-11-15T12:01 `ff9ee85` READY funnel(ledger): after-merge: Ops: PR #548 E420 deploy-verify never dirties a per-agent wor — https://mhm-finds-dw5l-yz3wa98iz-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:58 `edcff84` READY funnel(ops): E420 deploy-verify never dirties a per-agent worktree (#548) — https://mhm-finds-dw5l-9e2dtxmwc-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:57 `e92df57` READY funnel(ledger): Sage: E411 IndexNow live push — https://mhm-finds-dw5l-g7nzmcu8o-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:57 `091723c` READY funnel(ledger): after-merge: Sage: PR #550 E411 IndexNow mod backfill holdout — https://mhm-finds-dw5l-ixoqg93wx-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:54 `5b5b690` READY funnel(ledger): Nova: E413 apply — https://mhm-finds-dw5l-9x4xs72ms-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:53 `c6a9203` READY funnel(sage): E411 IndexNow backfill of never-submitted mod pages, 50/50 holdout (#550) — https://mhm-finds-dw5l-659afngej-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:53 `1ceb35e` READY funnel(ledger): after-merge: Nova: PR #549 E413 fold 19 evidence-backed suffix-split creat — https://mhm-finds-dw5l-m06tv3kfo-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:50 `6cf21ba` READY funnel(ledger): Rowan: E419 isNSFW apply — https://mhm-finds-dw5l-iprt5w2et-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:49 `7fd0a81` READY funnel(nova): E413 fold 19 evidence-backed suffix-split creator spellings (58 rows, frozen — https://mhm-finds-dw5l-ohtay3sna-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:49 `9344751` READY funnel(ledger): after-merge: Cass: PR #547 E391 newsletter-08 run 3 send record — https://mhm-finds-dw5l-3q878aywr-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:45 `ac81e21` READY funnel(cass): E391 newsletter-08 run 3 send record (42 sent, issue complete) (#547) — https://mhm-finds-dw5l-lp3ljc1cw-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:45 `f750e1f` READY funnel(ledger): Rowan: E418 isNSFW apply — https://mhm-finds-dw5l-6wxbr8o25-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:43 `05deb22` READY funnel(ledger): after-merge: Quinn: PR #546 funnel: operator watch 2026-11-13 — https://mhm-finds-dw5l-mies5s7ag-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:43 `2c24fc0` READY funnel(ledger): Cass: E391 newsletter-08 run 3 SENT 42/42 — https://mhm-finds-dw5l-2ftx7fw5e-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:41 `577e027` READY funnel: operator watch 2026-11-13 — BELOW LINE (#546) — https://mhm-finds-dw5l-dj1av1ldm-ericputnams-projects.vercel.app
- vercel 2026-11-15T11:37 `a816caf` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-e1hn5mvjj-ericputnams-projects.vercel.app
- vercel 2026-11-15T03:31 `33c26e7` READY chore: compound learnings from 2026-11-14 — https://mhm-finds-dw5l-hmyw2i8sa-ericputnams-projects.vercel.app
- vercel 2026-11-14T11:37 `702afa4` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-cqtr3thrt-ericputnams-projects.vercel.app
- commit 2026-11-18T23:01 `63c3e067` chore: compound learnings from 2026-11-18
- commit 2026-11-18T06:39 `573ee3a7` funnel(ledger): check: morning-check
- commit 2026-11-17T22:33 `0db21803` chore: compound learnings from 2026-11-17
- commit 2026-11-17T11:54 `cc52ed98` funnel(ledger): digest 2026-11-17 landed by runner (daily PR did not merge)
- commit 2026-11-17T08:48 `18ae01ae` funnel(ledger): Sage: E430 IndexNow creators push
- commit 2026-11-17T08:47 `f8c6856a` funnel(ledger): after-merge: Sage: PR #565 E430 sitemap template lastmods
- commit 2026-11-17T08:39 `7cfcf67b` fix(seo): E430 bump sitemap template lastmods to the dates their sources last changed (#56
- commit 2026-11-17T08:38 `f16d18b4` funnel(ledger): after-merge: Sage: PR #564 E429 guide title overrides
- commit 2026-11-17T08:38 `987a7951` funnel(ledger): after-merge: Rowan: PR #563 living-room-cc + title-only living-room theme 
- commit 2026-11-17T08:37 `e459cb3a` funnel(ledger): after-merge: Pip: PR #562 E428 scoreboard reads Yandex/Brave/DDG/OceanHero
- commit 2026-11-17T08:35 `47a9aa5e` funnel(ledger): after-merge: Rio: PR #561 E424 scoreboard RPM legs + E416 falsifier
- commit 2026-11-17T08:24 `c4551bf7` feat(seo): E429 randomized <title> overrides for 9 striking-distance guides at the proxy (
- commit 2026-11-17T08:19 `38e7f296` funnel(ledger): Rowan: E425 IndexNow push
- commit 2026-11-17T08:18 `4facbfa0` funnel(pip): E428 scoreboard reads Yandex/Brave/DDG/OceanHero referrals as other_search (#
- commit 2026-11-17T08:02 `ed3b8d63` feat(collections): living-room-cc page + title-only living-room theme (E425) (#563)
- commit 2026-11-17T08:01 `fcbf86cd` funnel(ledger): after-merge: Cass: PR #560 E426 GA4 surface param source -> content_type
- commit 2026-11-17T07:49 `c8c5c5b4` funnel(ledger): Rowan: E425 isNSFW pin apply
- commit 2026-11-17T07:49 `17afe57d` funnel(ledger): Rowan: E425 living-room retag apply
- commit 2026-11-17T07:49 `184589d6` funnel(rio): E424 scoreboard prints the session-RPM legs and the E416 ad-side falsifier st
- commit 2026-11-17T07:42 `2b647e7f` funnel(cass): E426 GA4 surface param source -> content_type (stops capture events restarti
- commit 2026-11-17T07:39 `da631176` funnel(ledger): after-merge: Ops: PR #559 E427 guardrail build-relevant vs paper split
- commit 2026-11-17T07:14 `437448e7` funnel(ops): E427 guardrail prints the build-relevant vs paper split of in-window deploys 
- commit 2026-11-17T06:48 `81451b42` funnel(ledger): after-merge: Nova: PR #558 E423 refresh brief for /new-sims-4-mods-2026/ (
- commit 2026-11-17T06:45 `46a04f23` funnel(nova): E423 refresh brief for /new-sims-4-mods-2026/ (Q46, paper trail only) (#558)
- commit 2026-11-17T06:38 `6d3925f5` funnel(ledger): check: morning-check
- commit 2026-11-16T22:30 `7dafe3b2` chore: compound learnings from 2026-11-16
- commit 2026-11-16T06:37 `78951f9b` funnel(ledger): check: morning-check
- commit 2026-11-15T22:31 `f4fe83b8` chore: compound learnings from 2026-11-15
- commit 2026-11-15T07:29 `b8c40e6e` funnel(ledger): after-merge: Quinn: PR #556 funnel: daily run 2026-11-15
- commit 2026-11-15T07:25 `b19b52aa` funnel: daily run 2026-11-15 (#556)
- commit 2026-11-15T07:22 `4cc7d6cc` funnel(ledger): after-merge: Rowan: PR #552 E418/E419 gameplay-mods hub
- commit 2026-11-15T07:19 `ed0d5a65` funnel(rowan): E418/E419 gameplay-mods hub — fix the gate, then ship the page (#552)
- commit 2026-11-15T07:18 `156707d0` funnel(ledger): after-merge: Sage: PR #555 E412 homepage guides RCT
- commit 2026-11-15T07:14 `b50df4da` funnel(sage): E412 homepage 'Popular Sims 4 guides' block, 20-vs-20 randomized link test (
- commit 2026-11-15T07:12 `f393217a` funnel(ledger): after-merge: Rio: PR #551 E416 verdict 2026-11-15 — perk read + RPM/page-m
- commit 2026-11-15T07:10 `a17f9c66` funnel(rio): E416 verdict 2026-11-15 — perk reaches 3/58 payers, B2 drift-line read 11-30;
- commit 2026-11-15T07:09 `c4693d32` funnel(ledger): after-merge: Pip: PR #554 E409 scoreboard channel rule → lib; Bing-syndica
- commit 2026-11-15T07:06 `4858df2e` funnel(pip): E409 scoreboard channel rule → pure lib; Bing-syndicated referrals read as se
- commit 2026-11-15T07:03 `efdea6ae` funnel(ledger): after-merge: Nova: PR #553 E413 record applied ids in the frozen split-fol
- commit 2026-11-15T07:02 `be909860` chore(funnel): E413 record applied ids in the frozen split-fold plan (#553)
- commit 2026-11-15T07:01 `ff9ee85b` funnel(ledger): after-merge: Ops: PR #548 E420 deploy-verify never dirties a per-agent wor
- commit 2026-11-15T06:58 `edcff84a` funnel(ops): E420 deploy-verify never dirties a per-agent worktree (#548)
- commit 2026-11-15T06:57 `e92df57d` funnel(ledger): Sage: E411 IndexNow live push
- commit 2026-11-15T06:57 `091723c1` funnel(ledger): after-merge: Sage: PR #550 E411 IndexNow mod backfill holdout
- commit 2026-11-15T06:54 `5b5b690a` funnel(ledger): Nova: E413 apply
- commit 2026-11-15T06:53 `c6a92033` funnel(sage): E411 IndexNow backfill of never-submitted mod pages, 50/50 holdout (#550)
- commit 2026-11-15T06:53 `1ceb35ec` funnel(ledger): after-merge: Nova: PR #549 E413 fold 19 evidence-backed suffix-split creat
- commit 2026-11-15T06:50 `6cf21ba5` funnel(ledger): Rowan: E419 isNSFW apply
- commit 2026-11-15T06:49 `7fd0a815` funnel(nova): E413 fold 19 evidence-backed suffix-split creator spellings (58 rows, frozen
- commit 2026-11-15T06:49 `9344751b` funnel(ledger): after-merge: Cass: PR #547 E391 newsletter-08 run 3 send record
- commit 2026-11-15T06:45 `ac81e21d` funnel(cass): E391 newsletter-08 run 3 send record (42 sent, issue complete) (#547)
- commit 2026-11-15T06:45 `f750e1f1` funnel(ledger): Rowan: E418 isNSFW apply
- commit 2026-11-15T06:43 `05deb225` funnel(ledger): after-merge: Quinn: PR #546 funnel: operator watch 2026-11-13
- commit 2026-11-15T06:42 `2c24fc09` funnel(ledger): Cass: E391 newsletter-08 run 3 SENT 42/42
- commit 2026-11-15T06:41 `577e0271` funnel: operator watch 2026-11-13 — BELOW LINE (#546)
- commit 2026-11-15T06:37 `a816cafe` funnel(ledger): check: morning-check
- commit 2026-11-14T22:31 `33c26e7c` chore: compound learnings from 2026-11-14

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
