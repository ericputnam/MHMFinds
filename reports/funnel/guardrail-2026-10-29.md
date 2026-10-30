# Revenue guardrail — 2026-10-29 (last finalized day 2026-10-27)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (100 rows over 5 pages, oldest 2026-10-23T12:15Z ≤ window start 2026-10-24T04:00Z) · deploy in window: yes

rollback bound: in-window production deploys 40 (≤24 to auto-rollback) · target 15.1 h before window start (≤48 h) → withheld: in-window deploys 40 exceed rollback bound 24

- Revenue $190.69 (1.7%), RPM 15.53 (-4.9%), sessions 6.6% vs same weekday, prior 4 weeks · 3-day revenue 6.4%

| | 2026-10-27 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $190.69 | $187.53 | 1.7% |
| session RPM | 15.53 | 16.32 | -4.9% |
| sessions | 12,278 | 11,515 | 6.6% |
| sessions, GA4 raw | 12,506 | 11,643 | 7.4% |
| **sessions ex Singapore (direct)** (E216, GA4) | 11,990 | 11,237 | 6.7% |
| 3-day revenue | $670.10 | $630.07 | 6.4% |
| 3-day RPM | 16.93 | 15.57 | 8.7% |

sessions ex Singapore (direct) (E216, GA4): raw 12,506 vs 11,643 (+7.4%) → ex-segment 11,990 vs 11,237 (+6.7%) · segment 516 = 4.13% of the day (controls 3.49%, 4 same weekdays)

Mediavine health: all ok

## Production changes since 2026-10-24 (72h before the judged day)

- vercel 2026-10-30T01:43 `35e578f` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-92zjbsvm1-ericputnams-projects.vercel.app
- vercel 2026-10-30T01:40 `7f1560c` READY funnel(ledger): flush: MISSED 2026-10-29 preflight=HANG [after judged day — judged tomorrow] — https://mhm-finds-dw5l-qa2fuphq2-ericputnams-projects.vercel.app
- vercel 2026-10-29T19:24 `de5d102` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-87p0hij4i-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:59 `d873cc7` READY funnel(ledger): after-merge: Operator: PR #396 game + collection pages on the launcher [after judged day — judged tomorrow] — https://mhm-finds-dw5l-96xjgrwvn-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:55 `948204a` READY games: /games/<slug>/ and collection pages render the launcher; Sims 4 collections only on [after judged day — judged tomorrow] — https://mhm-finds-dw5l-nfdidxsiu-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:20 `89d6d7d` READY funnel(ledger): after-merge: Operator: PR #395 collection cover images optimized [after judged day — judged tomorrow] — https://mhm-finds-dw5l-9s0z9ydn5-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:15 `945bf3d` READY homepage: optimize collection cover images; pills reserve only the cover they show (#395) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-pnr0ij1gg-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:02 `23683c9` READY funnel(ledger): Pip: E275 catalog pins gshade-presets + eyes-cc apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-332h9l3jq-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:02 `1c757b7` READY funnel(ledger): Pip: E274 runway top-up #18 apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-gcqqr7rhk-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:01 `7c40501` READY funnel(cass): E279 grid hearts become a save-intent sign-up (home, game, collection, creat [after judged day — judged tomorrow] — https://mhm-finds-dw5l-lmdozf1mv-ericputnams-projects.vercel.app
- vercel 2026-10-28T14:00 `431e965` READY funnel(ledger): after-merge: Sage: PR #378 funnel(sage): E267 creator page title + meta na [after judged day — judged tomorrow] — https://mhm-finds-dw5l-3qcztu1ao-ericputnams-projects.vercel.app
- vercel 2026-10-28T13:56 `ab3b798` READY funnel(sage): E267 creator page title + meta name real content types and top mods (Tier 0) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-3fm4iaewf-ericputnams-projects.vercel.app
- vercel 2026-10-28T13:56 `0f8258f` READY funnel(ledger): after-merge: Nova: PR #372 funnel(nova): "Featured on MustHaveMods" creato [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fz9t4vzg2-ericputnams-projects.vercel.app
- vercel 2026-10-28T13:52 `1bd04e4` READY funnel(nova): "Featured on MustHaveMods" creator badge — embed page, assets, verified labe [after judged day — judged tomorrow] — https://mhm-finds-dw5l-gbishyl85-ericputnams-projects.vercel.app
- vercel 2026-10-28T13:34 `0656a00` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ojnm14wwd-ericputnams-projects.vercel.app
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
- vercel 2026-10-27T03:54 `c01c5e9` READY funnel(ledger): after-merge: Operator: PR #388 homepage Launcher redesign — https://mhm-finds-dw5l-k8c9897a6-ericputnams-projects.vercel.app
- vercel 2026-10-27T03:50 `ef253d6` READY homepage: Launcher redesign (hero, logo, game switcher, collections shortcuts) (#388) — https://mhm-finds-dw5l-3c5j8jpiv-ericputnams-projects.vercel.app
- vercel 2026-10-27T02:31 `01be278` READY chore: compound learnings from 2026-10-26 — https://mhm-finds-dw5l-4bm0e8dyk-ericputnams-projects.vercel.app
- vercel 2026-10-27T01:12 `c2cdfd1` READY funnel(ledger): after-merge: Interactive: PR #382 admin waitlist → subscribers — https://mhm-finds-dw5l-7odjq7srr-ericputnams-projects.vercel.app
- vercel 2026-10-27T01:12 `d137168` READY feat(email): durable unsubscribe list + process mailto/reply unsubscribes (#384) — https://mhm-finds-dw5l-l62ac46t2-ericputnams-projects.vercel.app
- vercel 2026-10-27T01:08 `9dd2ee0` READY admin: rename Waitlist page to Newsletter Subscribers (#382) — https://mhm-finds-dw5l-pss480mdk-ericputnams-projects.vercel.app
- vercel 2026-10-27T01:01 `8cdbb6f` READY chore(db): land applied migration 20260701215816_drop_orphaned_newsletter_tables on main ( — https://mhm-finds-dw5l-qp0cvwwwf-ericputnams-projects.vercel.app
- vercel 2026-10-26T15:12 `9d700f1` READY fix(admin): upload mod images directly; copy Patreon image addresses to Blob (#383) — https://mhm-finds-dw5l-ggxkdwisn-ericputnams-projects.vercel.app
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
- functions.php 2026-10-27T00:45 `044d836d` blog: Amazon Sims 4 pack picks at the end of every Sims post (first tracked blog affiliate

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
