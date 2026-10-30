# Revenue guardrail — 2026-10-27 (last finalized day 2026-10-25)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (100 rows over 5 pages, oldest 2026-10-21T11:19Z ≤ window start 2026-10-22T07:00Z) · deploy in window: yes

rollback bound: in-window production deploys 43 (≤24 to auto-rollback) · target 4.5 h before window start (≤48 h) → withheld: in-window deploys 43 exceed rollback bound 24

- Revenue $281.32 (7.4%), RPM 18.54 (14.4%), sessions -5.9% vs same weekday, prior 4 weeks · 3-day revenue 5.7%

| | 2026-10-25 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $281.32 | $261.90 | 7.4% |
| session RPM | 18.54 | 16.21 | 14.4% |
| sessions | 15,171 | 16,122 | -5.9% |
| 3-day revenue | $764.76 | $723.54 | 5.7% |
| 3-day RPM | 18.52 | 16.65 | 11.2% |

sessions ex Singapore (direct) (E216, GA4): unavailable — GA4 could-not-run: 4 DEADLINE_EXCEEDED: Deadline exceeded after 514.646s,name resolution: 0.002s,metadata filters: 0.001s,LB pick: 0.035s,r

Mediavine health: all ok

## Production changes since 2026-10-22 (72h before the judged day)

- vercel 2026-10-27T12:44 `9e3ee33` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-l1vnmxanz-ericputnams-projects.vercel.app
- vercel 2026-10-27T05:54 `2a3547a` READY funnel(ledger): after-merge: Interactive: PR #391 blog Amazon pack block [after judged day — judged tomorrow] — https://mhm-finds-dw5l-p5ap04syp-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:45 `044d836` READY blog: Amazon Sims 4 pack picks at the end of every Sims post (first tracked blog affiliate [after judged day — judged tomorrow] — https://mhm-finds-dw5l-9eigiblu4-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:41 `e0438db` READY funnel(ledger): after-merge: Operator: PR #390 collection pill covers + gshade [after judged day — judged tomorrow] — https://mhm-finds-dw5l-6qokhlfd7-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:38 `a7854a6` READY homepage: cover thumbnails on every collection pill; gshade-presets gets covers (#390) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7wr3g8x2z-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:37 `fd9cea2` ERROR funnel(ledger): after-merge: Interactive: PR #387 #384 review follow-ups [after judged day — judged tomorrow] — https://mhm-finds-dw5l-2ixhv3ytk-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:33 `5275115` READY fix(email): #384 review follow-ups — unsubscribe copy, mailto spoof guard, INTERNALDATE, c [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jxla30cmn-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:20 `5c4d9d3` READY funnel(ledger): after-merge: Interactive: PR #386 ModDetailPage stale favorite test [after judged day — judged tomorrow] — https://mhm-finds-dw5l-g6ls1dmvk-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:20 `3258d39` READY funnel(ledger): after-merge: Operator: PR #389 one catalogue count [after judged day — judged tomorrow] — https://mhm-finds-dw5l-es14sm91e-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:16 `83b6a2d` READY homepage: one catalogue count everywhere (title 17,000+ vs hero 16,000+) (#389) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fdck77lep-ericputnams-projects.vercel.app
- vercel 2026-10-27T04:11 `fccaba8` READY test(mods): drive ModDetailPage favorite toggle through the real API flow (#386) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-nsejs2vf0-ericputnams-projects.vercel.app
- vercel 2026-10-27T03:54 `c01c5e9` READY funnel(ledger): after-merge: Operator: PR #388 homepage Launcher redesign [after judged day — judged tomorrow] — https://mhm-finds-dw5l-k8c9897a6-ericputnams-projects.vercel.app
- vercel 2026-10-27T03:50 `ef253d6` READY homepage: Launcher redesign (hero, logo, game switcher, collections shortcuts) (#388) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-3c5j8jpiv-ericputnams-projects.vercel.app
- vercel 2026-10-27T02:31 `01be278` READY chore: compound learnings from 2026-10-26 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-4bm0e8dyk-ericputnams-projects.vercel.app
- vercel 2026-10-27T01:12 `c2cdfd1` READY funnel(ledger): after-merge: Interactive: PR #382 admin waitlist → subscribers [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7odjq7srr-ericputnams-projects.vercel.app
- vercel 2026-10-27T01:12 `d137168` READY feat(email): durable unsubscribe list + process mailto/reply unsubscribes (#384) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-l62ac46t2-ericputnams-projects.vercel.app
- vercel 2026-10-27T01:08 `9dd2ee0` READY admin: rename Waitlist page to Newsletter Subscribers (#382) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-pss480mdk-ericputnams-projects.vercel.app
- vercel 2026-10-27T01:01 `8cdbb6f` READY chore(db): land applied migration 20260701215816_drop_orphaned_newsletter_tables on main ( [after judged day — judged tomorrow] — https://mhm-finds-dw5l-qp0cvwwwf-ericputnams-projects.vercel.app
- vercel 2026-10-26T15:12 `9d700f1` READY fix(admin): upload mod images directly; copy Patreon image addresses to Blob (#383) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ggxkdwisn-ericputnams-projects.vercel.app
- vercel 2026-10-26T02:31 `2e83de9` READY chore: compound learnings from 2026-10-25 — https://mhm-finds-dw5l-oxqysyk0n-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:51 `7b5232b` READY funnel(ledger): digest 2026-10-25 landed by runner (daily PR did not merge) — https://mhm-finds-dw5l-57436rfk9-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:40 `af1d5c4` READY funnel(rowan): E272 — GShade & ReShade presets collection page + title-only ui-preset face — https://mhm-finds-dw5l-3sc2kwudv-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:39 `4197f00` READY funnel(ledger): after-merge: Ops: PR #376 E273 third-party SecurityError + honest post-rol — https://mhm-finds-dw5l-femck85zd-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:35 `59191dd` READY funnel(ops): E273 — a cross-origin SecurityError from an ad frame is third-party, and a re — https://mhm-finds-dw5l-cpc56fjyd-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:35 `b67a176` READY funnel(ledger): after-merge: Pip: PR #379 funnel(pip): tumblr-curve tool + 10-25 reading — — https://mhm-finds-dw5l-k2nfnz8yi-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:31 `15f6404` READY funnel(pip): tumblr-curve tool + 2026-10-25 reading — fresh posts are 2.3% of Tumblr sessi — https://mhm-finds-dw5l-oys7awfb0-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:31 `b057442` READY funnel(ledger): after-merge: Pip: PR #377 funnel(pip): social draft pipeline + first Tier  — https://mhm-finds-dw5l-gx9ffyp8j-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:27 `64645f1` READY funnel(pip): social draft pipeline + first Tier 2 batch 2026-10-25 (E265) (#377) — https://mhm-finds-dw5l-bdgwrenma-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:26 `00ee825` READY funnel(ledger): after-merge: Nova: PR #374 funnel(nova): biweekly community vote — rules d — https://mhm-finds-dw5l-b9vt0tkbn-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:23 `c9a3042` READY funnel(nova): biweekly community vote — rules draft v1 for operator approval (Tier 0 paper — https://mhm-finds-dw5l-ao8rrify4-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:23 `c0d07fc` READY funnel(ledger): after-merge: Cass: PR #373 issue-07 run 2 ledger + 2 reject hashes — https://mhm-finds-dw5l-ndumna1wg-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:19 `7108b67` READY funnel(cass): issue-07 run 2 sent 60/62 to the E270-suppressed tail; list its 2 rejects (T — https://mhm-finds-dw5l-oykpjmeew-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:17 `2490074` READY funnel(ledger): after-merge: Cass: PR #371 E270 suppress scripted-shaped sign-ups from eve — https://mhm-finds-dw5l-g5mapwr2u-ericputnams-projects.vercel.app
- vercel 2026-10-25T21:13 `e83fc82` READY funnel(cass): E270 — suppress scripted-shaped sign-ups from every send by hash (Tier 0) (# — https://mhm-finds-dw5l-5dxlq2xwz-ericputnams-projects.vercel.app
- vercel 2026-10-25T20:55 `ed4b7f1` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-9rpl0fvdb-ericputnams-projects.vercel.app
- vercel 2026-10-25T20:50 `077c4b6` READY funnel(ledger): flush: MISSED 2026-10-24 preflight=HANG — https://mhm-finds-dw5l-6n0tfhltv-ericputnams-projects.vercel.app
- vercel 2026-10-25T20:50 `6886fea` READY funnel(ledger): flush: check: morning-check — https://mhm-finds-dw5l-5h7uzn37p-ericputnams-projects.vercel.app
- vercel 2026-10-24T12:31 `3ca856b` READY funnel(ledger): after-merge: manual — https://mhm-finds-dw5l-nfatbqz0h-ericputnams-projects.vercel.app
- vercel 2026-10-24T12:26 `2deeab3` READY funnel: operator growth plan 2026-10-24 — Dec target 600k, non-Pinterest headline (#370) — https://mhm-finds-dw5l-r7zlkzdzk-ericputnams-projects.vercel.app
- vercel 2026-10-24T10:53 `69420f1` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-k4zkh6h82-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:55 `2c7290e` READY funnel(ledger): after-merge: Quinn: PR #369 funnel: daily run 2026-10-23 (Tier 0 docs) — https://mhm-finds-dw5l-lw76zt7ow-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:50 `7701c84` READY funnel(quinn): daily run 2026-10-23 — green, ON LINE run 20, 7/7 moves; owned-audience hea — https://mhm-finds-dw5l-blj9z718e-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:34 `278639f` READY funnel(ledger): after-merge: Ops: PR #366 E264 preflight failure lands a MISSED row + degr — https://mhm-finds-dw5l-4rwq6ll1c-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:30 `b73e06a` READY funnel(ops): E264 preflight failure lands a MISSED row + degraded digest on main; refresh- — https://mhm-finds-dw5l-raqfsnal6-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:29 `f4165cb` READY funnel(ledger): after-merge: Sage: PR #367 E259 homepage title leads with "Must-Have Sims  — https://mhm-finds-dw5l-8eawwqeqg-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:26 `5912df1` READY funnel(sage): E259 homepage title leads with "Must-Have Sims 4 Mods"; 15,000+ → 17,000+ (T — https://mhm-finds-dw5l-g22khi1rx-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:25 `4114649` READY funnel(ledger): after-merge: Nova: PR #368 E260 scripted sign-ups split out of creator-fla — https://mhm-finds-dw5l-ksukkpevh-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:22 `92397d9` READY funnel(ledger): after-merge: Pip: PR #365 E258 runway top-up #17 artifacts + topup-grade d — https://mhm-finds-dw5l-930c7snpe-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:22 `67e3ebd` READY funnel(nova): E260 scripted sign-ups split out of the creator-flagged and signup-optin cou — https://mhm-finds-dw5l-8oqigvt4w-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:17 `5c48da0` READY funnel(pip): E258 runway top-up #17 artifacts (20 ranked rows 10-26..28) + topup-grade def — https://mhm-finds-dw5l-3ckvosjan-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:15 `f265861` READY funnel(ledger): after-merge: Rio: PR #364 E262 guardrail verdict 2026-10-23 (Tier 0, paper — https://mhm-finds-dw5l-577gnu7vg-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:14 `f5a3790` READY funnel(ledger): after-merge: Rowan: PR #363 E263 lots --ids — 18 non-lots out of residenti — https://mhm-finds-dw5l-jxccbfcmx-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:13 `4ea0dd2` READY funnel(rio): E262 guardrail verdict 2026-10-23 — green, flat on all three legs; E255 KEEP; — https://mhm-finds-dw5l-4a32xz1yr-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:13 `a632c57` READY funnel(ledger): MISSED 2026-10-22 preflight=AUTH (retro, E264) — https://mhm-finds-dw5l-n694a2xgc-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:11 `55994c0` READY funnel(rowan): E263 lots --ids — 18 non-lots out of residential (Tier 0 catalog data) (#36 — https://mhm-finds-dw5l-abb10g9ui-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:09 `e15b6d3` READY funnel(ledger): after-merge: Cass: PR #362 E247 issue-07 run 1 send record; tail held at t — https://mhm-finds-dw5l-k3qlc32z2-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:07 `0d49439` READY funnel(ledger): Rowan: E263 --ids apply — https://mhm-finds-dw5l-o6h4g1ih0-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:06 `801e7b5` READY funnel(ledger): Pip: E258 runway top-up #17 apply — https://mhm-finds-dw5l-n9j5vgwiw-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:05 `c22f7c4` READY funnel(cass): E247 issue-07 run 1 send record + tail held at the >30 gate (Tier 1 send, pa — https://mhm-finds-dw5l-4w8qtwiv2-ericputnams-projects.vercel.app
- vercel 2026-10-23T12:03 `c9bb094` READY funnel(ledger): Cass: E247 issue-07 run 1 SENT — https://mhm-finds-dw5l-o2pfwqqhe-ericputnams-projects.vercel.app
- vercel 2026-10-23T11:49 `f93a6d4` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-rhqbsxxpy-ericputnams-projects.vercel.app
- vercel 2026-10-22T10:37 `221e541` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-qis2npalg-ericputnams-projects.vercel.app
- commit 2026-10-26T22:54 `2a3547ae` funnel(ledger): after-merge: Interactive: PR #391 blog Amazon pack block
- commit 2026-10-27T00:45 `044d836d` blog: Amazon Sims 4 pack picks at the end of every Sims post (first tracked blog affiliate
- commit 2026-10-26T21:41 `e0438db4` funnel(ledger): after-merge: Operator: PR #390 collection pill covers + gshade
- commit 2026-10-27T00:38 `a7854a66` homepage: cover thumbnails on every collection pill; gshade-presets gets covers (#390)
- commit 2026-10-26T21:37 `fd9cea2d` funnel(ledger): after-merge: Interactive: PR #387 #384 review follow-ups
- commit 2026-10-27T00:33 `52751159` fix(email): #384 review follow-ups — unsubscribe copy, mailto spoof guard, INTERNALDATE, c
- commit 2026-10-26T21:20 `5c4d9d31` funnel(ledger): after-merge: Interactive: PR #386 ModDetailPage stale favorite test
- commit 2026-10-26T21:20 `3258d390` funnel(ledger): after-merge: Operator: PR #389 one catalogue count
- commit 2026-10-27T00:15 `83b6a2d1` homepage: one catalogue count everywhere (title 17,000+ vs hero 16,000+) (#389)
- commit 2026-10-27T00:11 `fccaba82` test(mods): drive ModDetailPage favorite toggle through the real API flow (#386)
- commit 2026-10-26T20:54 `c01c5e93` funnel(ledger): after-merge: Operator: PR #388 homepage Launcher redesign
- commit 2026-10-26T23:50 `ef253d67` homepage: Launcher redesign (hero, logo, game switcher, collections shortcuts) (#388)
- commit 2026-10-26T19:31 `01be2782` chore: compound learnings from 2026-10-26
- commit 2026-10-26T18:12 `c2cdfd18` funnel(ledger): after-merge: Interactive: PR #382 admin waitlist → subscribers
- commit 2026-10-26T21:12 `d1371685` feat(email): durable unsubscribe list + process mailto/reply unsubscribes (#384)
- commit 2026-10-26T21:08 `9dd2ee07` admin: rename Waitlist page to Newsletter Subscribers (#382)
- commit 2026-10-26T21:01 `8cdbb6f8` chore(db): land applied migration 20260701215816_drop_orphaned_newsletter_tables on main (
- commit 2026-10-26T11:12 `9d700f1b` fix(admin): upload mod images directly; copy Patreon image addresses to Blob (#383)
- commit 2026-10-25T22:31 `2e83de9a` chore: compound learnings from 2026-10-25
- commit 2026-10-25T17:51 `7b5232b7` funnel(ledger): digest 2026-10-25 landed by runner (daily PR did not merge)
- commit 2026-10-25T17:39 `af1d5c49` funnel(rowan): E272 — GShade & ReShade presets collection page + title-only ui-preset face
- commit 2026-10-25T17:39 `4197f004` funnel(ledger): after-merge: Ops: PR #376 E273 third-party SecurityError + honest post-rol
- commit 2026-10-25T17:35 `59191dd7` funnel(ops): E273 — a cross-origin SecurityError from an ad frame is third-party, and a re
- commit 2026-10-25T17:35 `b67a176b` funnel(ledger): after-merge: Pip: PR #379 funnel(pip): tumblr-curve tool + 10-25 reading —
- commit 2026-10-25T17:31 `15f6404e` funnel(pip): tumblr-curve tool + 2026-10-25 reading — fresh posts are 2.3% of Tumblr sessi
- commit 2026-10-25T17:30 `b0574425` funnel(ledger): after-merge: Pip: PR #377 funnel(pip): social draft pipeline + first Tier 
- commit 2026-10-25T17:27 `64645f16` funnel(pip): social draft pipeline + first Tier 2 batch 2026-10-25 (E265) (#377)
- commit 2026-10-25T17:26 `00ee8255` funnel(ledger): after-merge: Nova: PR #374 funnel(nova): biweekly community vote — rules d
- commit 2026-10-25T17:23 `c9a3042f` funnel(nova): biweekly community vote — rules draft v1 for operator approval (Tier 0 paper
- commit 2026-10-25T17:23 `c0d07fc0` funnel(ledger): after-merge: Cass: PR #373 issue-07 run 2 ledger + 2 reject hashes
- commit 2026-10-25T17:19 `7108b67a` funnel(cass): issue-07 run 2 sent 60/62 to the E270-suppressed tail; list its 2 rejects (T
- commit 2026-10-25T17:17 `2490074e` funnel(ledger): after-merge: Cass: PR #371 E270 suppress scripted-shaped sign-ups from eve
- commit 2026-10-25T17:13 `e83fc82b` funnel(cass): E270 — suppress scripted-shaped sign-ups from every send by hash (Tier 0) (#
- commit 2026-10-25T16:55 `ed4b7f1d` funnel(ledger): check: morning-check
- commit 2026-10-25T16:50 `077c4b66` funnel(ledger): flush: MISSED 2026-10-24 preflight=HANG
- commit 2026-10-25T16:50 `6886feaf` funnel(ledger): flush: check: morning-check
- commit 2026-10-24T08:31 `3ca856b3` funnel(ledger): after-merge: manual
- commit 2026-10-24T08:26 `2deeab37` funnel: operator growth plan 2026-10-24 — Dec target 600k, non-Pinterest headline (#370)
- commit 2026-10-24T06:52 `69420f1d` funnel(ledger): check: morning-check
- commit 2026-10-23T08:55 `2c7290e1` funnel(ledger): after-merge: Quinn: PR #369 funnel: daily run 2026-10-23 (Tier 0 docs)
- commit 2026-10-23T08:50 `7701c849` funnel(quinn): daily run 2026-10-23 — green, ON LINE run 20, 7/7 moves; owned-audience hea
- commit 2026-10-23T08:34 `278639fc` funnel(ledger): after-merge: Ops: PR #366 E264 preflight failure lands a MISSED row + degr
- commit 2026-10-23T08:30 `b73e06ab` funnel(ops): E264 preflight failure lands a MISSED row + degraded digest on main; refresh-
- commit 2026-10-23T08:29 `f4165cb1` funnel(ledger): after-merge: Sage: PR #367 E259 homepage title leads with "Must-Have Sims 
- commit 2026-10-23T08:26 `5912df13` funnel(sage): E259 homepage title leads with "Must-Have Sims 4 Mods"; 15,000+ → 17,000+ (T
- commit 2026-10-23T08:25 `41146490` funnel(ledger): after-merge: Nova: PR #368 E260 scripted sign-ups split out of creator-fla
- commit 2026-10-23T08:22 `92397d93` funnel(ledger): after-merge: Pip: PR #365 E258 runway top-up #17 artifacts + topup-grade d
- commit 2026-10-23T08:22 `67e3ebdc` funnel(nova): E260 scripted sign-ups split out of the creator-flagged and signup-optin cou
- commit 2026-10-23T08:17 `5c48da0c` funnel(pip): E258 runway top-up #17 artifacts (20 ranked rows 10-26..28) + topup-grade def
- commit 2026-10-23T08:15 `f2658614` funnel(ledger): after-merge: Rio: PR #364 E262 guardrail verdict 2026-10-23 (Tier 0, paper
- commit 2026-10-23T08:14 `f5a3790f` funnel(ledger): after-merge: Rowan: PR #363 E263 lots --ids — 18 non-lots out of residenti
- commit 2026-10-23T08:13 `4ea0dd27` funnel(rio): E262 guardrail verdict 2026-10-23 — green, flat on all three legs; E255 KEEP;
- commit 2026-10-23T08:13 `a632c572` funnel(ledger): MISSED 2026-10-22 preflight=AUTH (retro, E264)
- commit 2026-10-23T08:09 `55994c00` funnel(rowan): E263 lots --ids — 18 non-lots out of residential (Tier 0 catalog data) (#36
- commit 2026-10-23T08:09 `e15b6d33` funnel(ledger): after-merge: Cass: PR #362 E247 issue-07 run 1 send record; tail held at t
- commit 2026-10-23T08:07 `0d494391` funnel(ledger): Rowan: E263 --ids apply
- commit 2026-10-23T08:05 `801e7b5c` funnel(ledger): Pip: E258 runway top-up #17 apply
- commit 2026-10-23T08:05 `c22f7c41` funnel(cass): E247 issue-07 run 1 send record + tail held at the >30 gate (Tier 1 send, pa
- commit 2026-10-23T08:03 `c9bb094f` funnel(ledger): Cass: E247 issue-07 run 1 SENT
- commit 2026-10-23T07:49 `f93a6d46` funnel(ledger): check: morning-check
- functions.php 2026-10-27T00:45 `044d836d` blog: Amazon Sims 4 pack picks at the end of every Sims post (first tracked blog affiliate

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
