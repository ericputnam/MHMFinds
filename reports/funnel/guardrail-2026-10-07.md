# Revenue guardrail — 2026-10-07 (last finalized day 2026-10-05)

🔴 **RED-RPM** → action: **investigate (in-window deploys 52 exceed rollback bound 24)**

vercel coverage: COMPLETE (80 rows over 4 pages, oldest 2026-10-01T11:19Z ≤ window start 2026-10-02T06:00Z) · deploy in window: yes

rollback bound: in-window production deploys 52 (≤24 to auto-rollback) · target 3.5 h before window start (≤48 h) → withheld: in-window deploys 52 exceed rollback bound 24

- RPM 13.77 vs expected 16.50 (-16.5%) on 2026-10-05; revenue $157.98 vs $207.31 (-23.8%); 3-day revenue -21.6%, 3-day RPM -18.2%
- rollback withheld — in-window deploys 52 exceed rollback bound 24. The newest READY production deploy before the window is https://mhm-finds-dw5l-mw2guo205-ericputnams-projects.vercel.app; rolling back to it would revert every production deploy since 2026-10-02 (52 deploys), which is not a single-bad-deploy hypothesis. Quinn: Rio reads the Mediavine side first; a manual rollback is Tier 1 (`./scripts/agents/deploy-verify.sh --rollback --to <url>`), or roll back one PR by reverting its commit.

| | 2026-10-05 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $157.98 | $207.31 | -23.8% |
| session RPM | 13.77 | 16.50 | -16.5% |
| sessions | 11,470 | 12,490 | -8.2% |
| 3-day revenue | $606.62 | $773.80 | -21.6% |
| 3-day RPM | 14.64 | 17.91 | -18.2% |

Mediavine health: all ok

## Production changes since 2026-10-02 (72h before the judged day)

- vercel 2026-10-07T12:56 `69cf4a1` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jr66tm1y3-ericputnams-projects.vercel.app
- vercel 2026-10-05T02:32 `0c04ce0` READY chore: compound learnings from 2026-10-04 — https://mhm-finds-dw5l-bf4azyloo-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:27 `f462823` READY funnel(ledger): after-merge: Quinn: PR #264 funnel: daily run 2026-10-04 — https://mhm-finds-dw5l-fvy14wmoj-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:22 `432e40f` READY funnel(quinn): daily run 2026-10-04 — RED same-incident, 6 merges verified, registry parke — https://mhm-finds-dw5l-54uwik7td-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:21 `146d506` READY funnel(ledger): after-merge: Ops: PR #255 E169 revenue-guardrail pages the Vercel list, gr — https://mhm-finds-dw5l-97l1kocvx-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:18 `6a4203f` READY fix(ops): revenue-guardrail pages the Vercel list, grades coverage, and bounds the automat — https://mhm-finds-dw5l-5uegpnnne-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:17 `89ee857` READY funnel(ledger): after-merge: Sage: PR #263 E171 build-cc category hub (registry-only, Tier — https://mhm-finds-dw5l-p88xe7ckq-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:14 `069c690` READY funnel(sage): E171 Sims 4 Build CC category hub — first of the 7-term gap (Tier 0) (#263) — https://mhm-finds-dw5l-a0v48tzc9-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:13 `a199988` READY funnel(ledger): after-merge: Rio: PR #262 E163-b read 2026-10-04 — SAME-INCIDENT, residual — https://mhm-finds-dw5l-jvbpzjkxm-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:09 `75c3111` READY funnel(rio): E163-b read 2026-10-04 — SAME-INCIDENT, residual CLOSED (docs only) (#262) — https://mhm-finds-dw5l-fadmz7sis-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:09 `3c5ce80` READY funnel(ledger): after-merge: Pip: PR #261 E170 runway top-up #10 (Tier 0, SD-10 floor) — https://mhm-finds-dw5l-ig2lf7oro-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:07 `63a267d` READY funnel(ledger): Quinn for Rowan: E168 Villa Amour NULL pin apply (1 row) — https://mhm-finds-dw5l-bn8rvk907-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:05 `2716f60` READY funnel(pip): E170 runway top-up #10 (Tier 0, SD-10 floor) (#261) — https://mhm-finds-dw5l-5w2pr48oh-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:05 `d15a875` READY funnel(ledger): after-merge: Rowan: PR #259 E168 lot apply — 80 rows (Tier 0) — https://mhm-finds-dw5l-ou236e2vr-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:03 `127ed9a` READY funnel(ledger): after-merge: Nova: PR #258 E172 creators-onboarded counts creator accounts — https://mhm-finds-dw5l-2yn7a4kwb-ericputnams-projects.vercel.app
- vercel 2026-10-04T11:01 `1cbc4bb` READY catalog(rowan): E168 lot apply — 80 rows (Tier 0) (#259) — https://mhm-finds-dw5l-akdqxl13p-ericputnams-projects.vercel.app
- vercel 2026-10-04T10:56 `c90cb3b` READY funnel(nova): E172 creators-onboarded counts creator accounts, not seed profiles; pending- — https://mhm-finds-dw5l-lf9fz6etr-ericputnams-projects.vercel.app
- vercel 2026-10-04T10:55 `e7f1e09` READY funnel(ledger): Pip: E170 runway top-up #10 (7 rows, SD-10 floor) — https://mhm-finds-dw5l-p30wowe14-ericputnams-projects.vercel.app
- vercel 2026-10-04T10:55 `3e4ff73` READY funnel(ledger): Rowan: E168 lot apply 80 rows — https://mhm-finds-dw5l-4hzqh5pcg-ericputnams-projects.vercel.app
- vercel 2026-10-04T10:46 `2491373` READY funnel(ledger): after-merge: Rowan: PR #257 confident title beats URL category at ingest;  — https://mhm-finds-dw5l-323pjtgl7-ericputnams-projects.vercel.app
- vercel 2026-10-04T10:38 `02f35d4` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-ohkh6f391-ericputnams-projects.vercel.app
- vercel 2026-10-04T02:31 `8d18752` READY chore: compound learnings from 2026-10-03 — https://mhm-finds-dw5l-ke62svan5-ericputnams-projects.vercel.app
- vercel 2026-10-03T11:26 `3d9eb80` READY catalog(rowan): confident title beats URL category at ingest; lot rule title-only (E168) ( — https://mhm-finds-dw5l-mykiovndm-ericputnams-projects.vercel.app
- vercel 2026-10-03T11:08 `700edab` READY funnel(ledger): after-merge: Pip: PR #256 E164 runway top-up #9 ledger + package + SEO re- — https://mhm-finds-dw5l-qj1uvkr1v-ericputnams-projects.vercel.app
- vercel 2026-10-03T11:05 `e3e2b1d` READY funnel(pip): E164 runway top-up #9 ledger + package + SEO re-read (Tier 0, SD-10 floor) (# — https://mhm-finds-dw5l-2bd7b9oqn-ericputnams-projects.vercel.app
- vercel 2026-10-03T11:04 `dfb63fa` READY funnel(ledger): after-merge: Nova: PR #252 promoting a claim on a seed-held handle renames — https://mhm-finds-dw5l-acy2nug0g-ericputnams-projects.vercel.app
- vercel 2026-10-03T11:00 `7312738` READY fix(nova): promoting a claim on a seed-held handle renames the seed to seed-<handle> (E166 — https://mhm-finds-dw5l-dt8o1lwe2-ericputnams-projects.vercel.app
- vercel 2026-10-03T11:00 `b7f91ec` READY funnel(ledger): after-merge: Rio: PR #254 E163 red-rpm 10-01 root cause (incident file) — https://mhm-finds-dw5l-kb7l0eovd-ericputnams-projects.vercel.app
- vercel 2026-10-03T10:56 `aada199` READY funnel(rio): E163 red-rpm 10-01 root cause — CLOSED Mediavine-side (incident file) (#254) — https://mhm-finds-dw5l-lh22o29hm-ericputnams-projects.vercel.app
- vercel 2026-10-03T10:55 `f09532a` READY funnel(ledger): Pip: E164 runway top-up #9 apply — https://mhm-finds-dw5l-a9prqepfa-ericputnams-projects.vercel.app
- vercel 2026-10-03T10:38 `de969ec` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-q4d127kj0-ericputnams-projects.vercel.app
- vercel 2026-10-03T02:31 `a5cc519` READY chore: compound learnings from 2026-10-02 — https://mhm-finds-dw5l-4c31wozni-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:24 `528c98a` READY funnel(ledger): after-merge: Quinn: PR #251 funnel: daily run 2026-10-02 (Tier 0 docs) — https://mhm-finds-dw5l-donqf7gxd-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:20 `5dd970a` READY funnel: daily run 2026-10-02 (Tier 0 docs) (#251) — https://mhm-finds-dw5l-dz0opc4g3-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:15 `512cc98` READY funnel(ledger): Rowan: E161 spot-check pins apply — https://mhm-finds-dw5l-pqmd8at07-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:15 `0884df7` READY funnel(ledger): Rowan: E161 refreshed ingest apply — https://mhm-finds-dw5l-e8nwcrpcx-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:15 `b33d268` READY funnel(ledger): after-merge: Rowan: PR #249 E161 catalog ingest re-scrapes refreshed posts — https://mhm-finds-dw5l-lw92qg7en-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:11 `1f222bc` READY E161: ingest re-scrapes known posts the writer refreshed (--refreshed) (#249) — https://mhm-finds-dw5l-5yhrlisd2-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:11 `e130a7d` READY funnel(ledger): Nova: E158 placeholder unverify apply — https://mhm-finds-dw5l-1x6hw24n5-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:10 `f21ff89` READY funnel(ledger): after-merge: Nova: PR #250 E158 fix-forward: dry run never overwrites the  — https://mhm-finds-dw5l-ad4m1a18p-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:07 `7dbae73` READY funnel(nova): E158 dry run never overwrites the rollback plan (#250) — https://mhm-finds-dw5l-fpyp329vl-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:07 `bdd6ba1` READY funnel(ledger): after-merge: Sage: PR #248 E157 unified Sims 4 Clothes CC hub — https://mhm-finds-dw5l-62dt887s2-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:03 `0207a8c` READY seo(collections): add unified Sims 4 Clothes CC hub (E157) (#248) — https://mhm-finds-dw5l-bhq4v8ky1-ericputnams-projects.vercel.app
- vercel 2026-10-02T11:02 `8965e0a` READY funnel(ledger): after-merge: Nova: PR #247 E158: seed creator profiles stop posing as clai — https://mhm-finds-dw5l-j0pk9vt6l-ericputnams-projects.vercel.app
- vercel 2026-10-02T10:59 `6c737f2` READY funnel(nova): E158 seed creator profiles stop posing as claimed + batch-1b paper (#247) — https://mhm-finds-dw5l-l02kiv3lr-ericputnams-projects.vercel.app
- vercel 2026-10-02T10:59 `8a8088a` READY funnel(ledger): after-merge: Pip: PR #245 E156 runway top-up #8 ledger + package + SEO re- — https://mhm-finds-dw5l-4c8h6r00t-ericputnams-projects.vercel.app
- vercel 2026-10-02T10:55 `80f97a1` READY funnel(pip): E156 runway top-up #8 ledger + package + SEO re-read (Tier 0, SD-10 floor) (# — https://mhm-finds-dw5l-4ikbof8k5-ericputnams-projects.vercel.app
- vercel 2026-10-02T10:53 `11e6f17` READY funnel(ledger): after-merge: Cass: PR #246 E159 SaveFindsOffer copy by session status + fa — https://mhm-finds-dw5l-c0ykgmxys-ericputnams-projects.vercel.app
- vercel 2026-10-02T10:51 `6c10ab4` READY funnel(ledger): after-merge: Ops: PR #244 E162 un-red play-page.test.ts + gated merge chai — https://mhm-finds-dw5l-m43dochy2-ericputnams-projects.vercel.app
- vercel 2026-10-02T10:50 `4ce2156` READY E159: SaveFindsOffer copy by session status + favorites link (Cass, T0) (#246) — https://mhm-finds-dw5l-k5b5832rx-ericputnams-projects.vercel.app
- vercel 2026-10-02T10:48 `2bafed6` READY funnel(ledger): Pip: E156 runway top-up #8 apply — https://mhm-finds-dw5l-dksj5l0rx-ericputnams-projects.vercel.app
- vercel 2026-10-02T10:46 `c3cce17` READY funnel(ops): E162 play-page test matches fields, not a whole literal; prompt uses the gate — https://mhm-finds-dw5l-8c76efph5-ericputnams-projects.vercel.app
- vercel 2026-10-02T10:37 `2adcfe3` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-kyykkmgbb-ericputnams-projects.vercel.app
- commit 2026-10-04T22:32 `0c04ce0` chore: compound learnings from 2026-10-04
- commit 2026-10-04T07:27 `f462823` funnel(ledger): after-merge: Quinn: PR #264 funnel: daily run 2026-10-04
- commit 2026-10-04T07:22 `432e40f` funnel(quinn): daily run 2026-10-04 — RED same-incident, 6 merges verified, registry parke
- commit 2026-10-04T07:21 `146d506` funnel(ledger): after-merge: Ops: PR #255 E169 revenue-guardrail pages the Vercel list, gr
- commit 2026-10-04T07:18 `6a4203f` fix(ops): revenue-guardrail pages the Vercel list, grades coverage, and bounds the automat
- commit 2026-10-04T07:17 `89ee857` funnel(ledger): after-merge: Sage: PR #263 E171 build-cc category hub (registry-only, Tier
- commit 2026-10-04T07:13 `069c690` funnel(sage): E171 Sims 4 Build CC category hub — first of the 7-term gap (Tier 0) (#263)
- commit 2026-10-04T07:13 `a199988` funnel(ledger): after-merge: Rio: PR #262 E163-b read 2026-10-04 — SAME-INCIDENT, residual
- commit 2026-10-04T07:09 `75c3111` funnel(rio): E163-b read 2026-10-04 — SAME-INCIDENT, residual CLOSED (docs only) (#262)
- commit 2026-10-04T07:09 `3c5ce80` funnel(ledger): after-merge: Pip: PR #261 E170 runway top-up #10 (Tier 0, SD-10 floor)
- commit 2026-10-04T07:07 `63a267d` funnel(ledger): Quinn for Rowan: E168 Villa Amour NULL pin apply (1 row)
- commit 2026-10-04T07:05 `2716f60` funnel(pip): E170 runway top-up #10 (Tier 0, SD-10 floor) (#261)
- commit 2026-10-04T07:05 `d15a875` funnel(ledger): after-merge: Rowan: PR #259 E168 lot apply — 80 rows (Tier 0)
- commit 2026-10-04T07:03 `127ed9a` funnel(ledger): after-merge: Nova: PR #258 E172 creators-onboarded counts creator accounts
- commit 2026-10-04T07:01 `1cbc4bb` catalog(rowan): E168 lot apply — 80 rows (Tier 0) (#259)
- commit 2026-10-04T06:56 `c90cb3b` funnel(nova): E172 creators-onboarded counts creator accounts, not seed profiles; pending-
- commit 2026-10-04T06:55 `e7f1e09` funnel(ledger): Pip: E170 runway top-up #10 (7 rows, SD-10 floor)
- commit 2026-10-04T06:55 `3e4ff73` funnel(ledger): Rowan: E168 lot apply 80 rows
- commit 2026-10-04T06:46 `2491373` funnel(ledger): after-merge: Rowan: PR #257 confident title beats URL category at ingest; 
- commit 2026-10-04T06:38 `02f35d4` funnel(ledger): check: morning-check
- commit 2026-10-03T22:31 `8d18752` chore: compound learnings from 2026-10-03
- commit 2026-10-03T07:26 `3d9eb80` catalog(rowan): confident title beats URL category at ingest; lot rule title-only (E168) (
- commit 2026-10-03T07:08 `700edab` funnel(ledger): after-merge: Pip: PR #256 E164 runway top-up #9 ledger + package + SEO re-
- commit 2026-10-03T07:05 `e3e2b1d` funnel(pip): E164 runway top-up #9 ledger + package + SEO re-read (Tier 0, SD-10 floor) (#
- commit 2026-10-03T07:04 `dfb63fa` funnel(ledger): after-merge: Nova: PR #252 promoting a claim on a seed-held handle renames
- commit 2026-10-03T07:00 `7312738` fix(nova): promoting a claim on a seed-held handle renames the seed to seed-<handle> (E166
- commit 2026-10-03T07:00 `b7f91ec` funnel(ledger): after-merge: Rio: PR #254 E163 red-rpm 10-01 root cause (incident file)
- commit 2026-10-03T06:56 `aada199` funnel(rio): E163 red-rpm 10-01 root cause — CLOSED Mediavine-side (incident file) (#254)
- commit 2026-10-03T06:55 `f09532a` funnel(ledger): Pip: E164 runway top-up #9 apply
- commit 2026-10-03T06:38 `de969ec` funnel(ledger): check: morning-check
- commit 2026-10-02T22:31 `a5cc519` chore: compound learnings from 2026-10-02

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
