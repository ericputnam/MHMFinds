# Revenue guardrail — 2026-10-11 (last finalized day 2026-10-09)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (40 rows over 2 pages, oldest 2026-10-04T11:17Z ≤ window start 2026-10-06T04:00Z) · deploy in window: yes

rollback bound: in-window production deploys 21 (≤24 to auto-rollback) · target 25.5 h before window start (≤48 h) → eligible

- Revenue $208.34 (5.9%), RPM 18.00 (10.5%), sessions -4.0% vs same weekday, prior 4 weeks · 3-day revenue 6.7%

| | 2026-10-09 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $208.34 | $196.67 | 5.9% |
| session RPM | 18.00 | 16.29 | 10.5% |
| sessions | 11,569 | 12,055 | -4.0% |
| 3-day revenue | $589.26 | $552.47 | 6.7% |
| 3-day RPM | 17.43 | 15.95 | 9.3% |

Mediavine health: all ok

## Production changes since 2026-10-06 (72h before the judged day)

- vercel 2026-10-11T15:01 `212e48d` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-rnmqclmsr-ericputnams-projects.vercel.app
- vercel 2026-10-11T14:59 `246e0a5` READY chore: compound learnings from 2026-10-11 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-hg8pf5oor-ericputnams-projects.vercel.app
- vercel 2026-10-10T12:14 `bf37b41` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ik7l4vjur-ericputnams-projects.vercel.app
- vercel 2026-10-10T12:04 `6b33fd3` READY funnel(ledger): flush: check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-g96ncsudp-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:51 `34b7761` READY funnel(ledger): after-merge: Quinn: PR #272 funnel: daily run 2026-10-07 (Tier 0 docs) — https://mhm-finds-dw5l-8stknx35k-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:47 `e6c83a1` READY funnel(quinn): daily run 2026-10-07 — RED same-incident (CLEAR), 7 merges verified, 22 rea — https://mhm-finds-dw5l-c2asdu1xr-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:41 `43eb717` READY funnel(ledger): after-merge: Rio: PR #269 E174 red-rpm re-grades 10-03/04/05 — SAME-INCIDE — https://mhm-finds-dw5l-knup6sbnr-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:37 `f1beac1` READY funnel(rio): E174 red-rpm re-grades 10-03/04/05 — SAME-INCIDENT, E163-b confirmed, sidebar — https://mhm-finds-dw5l-o08poav4z-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:37 `2ea8db7` READY funnel(ledger): after-merge: Rowan: PR #267 E180 pin 34 hand-audited rows on the bags and  — https://mhm-finds-dw5l-9ymdbdvw8-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:33 `e004314` READY funnel(rowan): E180 pin 34 hand-audited rows on the bags and realistic-mods posts (Tier 0) — https://mhm-finds-dw5l-dyrvewm8q-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:33 `57fcc9e` READY funnel(ledger): after-merge: Nova: PR #270 E178 creator-flag audit (Tier 0) — https://mhm-finds-dw5l-hsfo6l2gu-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:29 `efdf3d0` READY funnel(nova): E178 creator-flag audit — the 343 isCreator accounts are self-described play — https://mhm-finds-dw5l-pihiflp5e-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:29 `829c68e` READY funnel(ledger): after-merge: Ops: PR #271 E176 runner per-day lock — a second start on the — https://mhm-finds-dw5l-nbt0aumyr-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:25 `983a046` READY fix(ops): runner takes a per-day lock — a second start on the same day exits 0 (E176) (#27 — https://mhm-finds-dw5l-offnu10jz-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:25 `b6b6d3c` READY funnel(ledger): after-merge: Cass: PR #266 emailed /set-password link gets trailing slash  — https://mhm-finds-dw5l-nzb7unutl-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:21 `b4d9c0a` READY funnel(ledger): after-merge: Pip: PR #268 E170 runway top-up #11 report files — https://mhm-finds-dw5l-6z8zukbsh-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:21 `afad9e1` READY feat(capture): emailed /set-password link carries the trailing slash and mode=reset|invite — https://mhm-finds-dw5l-8iw3rvo9u-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:17 `811705a` READY funnel(pip): E170 runway top-up #11 report files (Tier 0, SD-10 floor) (#268) — https://mhm-finds-dw5l-9x9r1bp4i-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:16 `b5946a8` READY funnel(ledger): after-merge: Sage: PR #265 ops(E177): IndexNow summary line prints newest_ — https://mhm-finds-dw5l-pjv7y9kz2-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:15 `dfcac9c` READY funnel(ledger): Ops: MISSED mhm-funnel-daily 2026-10-06 — https://mhm-finds-dw5l-65w7r27ve-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:15 `256c627` READY funnel(ledger): Ops: MISSED mhm-funnel-daily 2026-10-05 — https://mhm-finds-dw5l-ksurr2q2s-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:13 `864d50f` READY funnel(ledger): Pip: E170 runway top-up #11 apply — https://mhm-finds-dw5l-jnwwdekgw-ericputnams-projects.vercel.app
- vercel 2026-10-07T13:13 `f0edb05` READY ops(E177): IndexNow summary line prints newest_mod_age_h and mods_check (#265) — https://mhm-finds-dw5l-69597cta8-ericputnams-projects.vercel.app
- vercel 2026-10-07T12:59 `d62016d` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-dcty1dgca-ericputnams-projects.vercel.app
- vercel 2026-10-07T12:56 `69cf4a1` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-jr66tm1y3-ericputnams-projects.vercel.app
- commit 2026-10-11T10:58 `246e0a5` chore: compound learnings from 2026-10-11
- commit 2026-10-10T08:14 `bf37b41` funnel(ledger): check: morning-check
- commit 2026-10-10T08:04 `6b33fd3` funnel(ledger): flush: check: morning-check
- commit 2026-10-07T07:51 `34b7761` funnel(ledger): after-merge: Quinn: PR #272 funnel: daily run 2026-10-07 (Tier 0 docs)
- commit 2026-10-07T09:47 `e6c83a1` funnel(quinn): daily run 2026-10-07 — RED same-incident (CLEAR), 7 merges verified, 22 rea
- commit 2026-10-07T07:41 `43eb717` funnel(ledger): after-merge: Rio: PR #269 E174 red-rpm re-grades 10-03/04/05 — SAME-INCIDE
- commit 2026-10-07T09:37 `f1beac1` funnel(rio): E174 red-rpm re-grades 10-03/04/05 — SAME-INCIDENT, E163-b confirmed, sidebar
- commit 2026-10-07T07:37 `2ea8db7` funnel(ledger): after-merge: Rowan: PR #267 E180 pin 34 hand-audited rows on the bags and 
- commit 2026-10-07T09:33 `e004314` funnel(rowan): E180 pin 34 hand-audited rows on the bags and realistic-mods posts (Tier 0)
- commit 2026-10-07T07:33 `57fcc9e` funnel(ledger): after-merge: Nova: PR #270 E178 creator-flag audit (Tier 0)
- commit 2026-10-07T09:29 `efdf3d0` funnel(nova): E178 creator-flag audit — the 343 isCreator accounts are self-described play
- commit 2026-10-07T07:28 `829c68e` funnel(ledger): after-merge: Ops: PR #271 E176 runner per-day lock — a second start on the
- commit 2026-10-07T09:25 `983a046` fix(ops): runner takes a per-day lock — a second start on the same day exits 0 (E176) (#27
- commit 2026-10-07T07:25 `b6b6d3c` funnel(ledger): after-merge: Cass: PR #266 emailed /set-password link gets trailing slash 
- commit 2026-10-07T07:21 `b4d9c0a` funnel(ledger): after-merge: Pip: PR #268 E170 runway top-up #11 report files
- commit 2026-10-07T09:21 `afad9e1` feat(capture): emailed /set-password link carries the trailing slash and mode=reset|invite
- commit 2026-10-07T09:17 `811705a` funnel(pip): E170 runway top-up #11 report files (Tier 0, SD-10 floor) (#268)
- commit 2026-10-07T07:16 `b5946a8` funnel(ledger): after-merge: Sage: PR #265 ops(E177): IndexNow summary line prints newest_
- commit 2026-10-07T07:15 `dfcac9c` funnel(ledger): Ops: MISSED mhm-funnel-daily 2026-10-06
- commit 2026-10-07T07:15 `256c627` funnel(ledger): Ops: MISSED mhm-funnel-daily 2026-10-05
- commit 2026-10-07T07:13 `864d50f` funnel(ledger): Pip: E170 runway top-up #11 apply
- commit 2026-10-07T09:13 `f0edb05` ops(E177): IndexNow summary line prints newest_mod_age_h and mods_check (#265)
- commit 2026-10-07T06:59 `d62016d` funnel(ledger): check: morning-check
- commit 2026-10-07T06:56 `69cf4a1` funnel(ledger): check: morning-check

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
