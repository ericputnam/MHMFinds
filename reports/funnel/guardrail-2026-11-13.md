# Revenue guardrail — 2026-11-13 (last finalized day 2026-11-10)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (200 rows over 10 pages, oldest 2026-11-06T12:04Z ≤ window start 2026-11-07T05:00Z) · deploy in window: yes

rollback bound: in-window production deploys 59 (≤24 to auto-rollback) · target 1.5 h before window start (≤48 h) → withheld: in-window deploys 59 exceed rollback bound 24

- Revenue $229.90 (19.6%), RPM 20.72 (27.5%), sessions -6.3% vs same weekday, prior 4 weeks · 3-day revenue 16.8%

| | 2026-11-10 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $229.90 | $192.20 | 19.6% |
| session RPM | 20.72 | 16.25 | 27.5% |
| sessions | 11,095 | 11,838 | -6.3% |
| sessions, GA4 raw | 11,287 | 11,917 | -5.3% |
| **sessions ex Singapore (direct)** (E216, GA4) | 11,085 | 11,432 | -3.0% |
| **ex-segment RPM** (E271; MV revenue ÷ GA4 ex-segment sessions) | 20.74 | 16.81 | 23.4% → rate |
| 3-day revenue | $749.97 | $642.21 | 16.8% |
| 3-day RPM | 19.75 | 16.17 | 22.2% |

sessions ex Singapore (direct) (E216, GA4): raw 11,287 vs 11,917 (-5.3%) → ex-segment 11,085 vs 11,432 (-3.0%) · segment 202 = 1.79% of the day (controls 4.07%, 4 same weekdays)

ex-segment RPM (E216; Mediavine revenue ÷ GA4 sessions ex Singapore (direct)): $20.74 vs $16.81 (+23.4%) · mix alone predicts raw RPM +2.4% → rate (mix band ±1%)

Mediavine health: all ok

## Production changes since 2026-11-07 (72h before the judged day)

- vercel 2026-11-13T11:37 `e38f735` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fnqkiosu4-ericputnams-projects.vercel.app
- vercel 2026-11-13T03:33 `a338d74` READY chore: compound learnings from 2026-11-12 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-hopp6hq2u-ericputnams-projects.vercel.app
- vercel 2026-11-12T12:14 `824ad60` READY Fix Search Console 404, 403 and 401 indexing reasons (#498) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-hi54n2o8y-ericputnams-projects.vercel.app
- vercel 2026-11-12T11:37 `bdc1e8e` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ooe6f3y7r-ericputnams-projects.vercel.app
- vercel 2026-11-12T03:32 `6f386e3` READY chore: compound learnings from 2026-11-11 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-cj1p3b6op-ericputnams-projects.vercel.app
- vercel 2026-11-12T02:36 `321315a` READY funnel(ledger): after-merge: operator / PR #535 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-4a7n5c1xx-ericputnams-projects.vercel.app
- vercel 2026-11-12T02:32 `48f589a` READY feat(uploads): host Minecraft mod files; submission form asks "upload the file" or "link t [after judged day — judged tomorrow] — https://mhm-finds-dw5l-aj83lxptv-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:55 `9c9befc` READY chore(css): remove 33 class rules from globals.css that nothing references (#532) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-awoy1yufd-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:51 `fa3cf86` READY fix(env:push): upload values without a shell; report a variable that was removed and not r [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ld0rajleh-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:47 `44208ab` READY fix(lib): GA4 empty channel, stuck commission-sync run, silent production fallback in scri [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7ph8wvkd1-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:43 `e9a883e` READY chore(api): remove two unused routes that are unsafe to keep (#531) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-11o0dx4iq-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:38 `fee2d1b` READY fix(push-scripts): marker check no longer fails under pipefail; fail safe on a bad pull or [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1x4suu3kv-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:28 `7b25dbe` READY funnel(ledger): after-merge: operator / PR #534 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-n0tg4gk0a-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:24 `ec3fb08` READY feat(admin): admins can host a mod file when creating or editing a mod (#534) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-8o8ecqzlo-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:06 `5e92f27` READY funnel(ledger): after-merge: operator / PR #533 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-5hlr52o56-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:02 `f140b96` READY feat(creators): creator-hosted mod file uploads on a private Cloudflare R2 bucket (#533) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-i5kprztyr-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:45 `9a792ab` READY fix(vercel): commission-sync cron path gets its trailing slash; manual agent run and reind [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ln4n3o1x5-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:41 `f354f2f` READY fix(tooling): auto-compound works in its own worktree and only on a fresh priorities repor [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fqbczeafo-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:36 `71cbdf6` READY fix(auth): first OAuth sign-in creates a complete account; consistent password rule (#522) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-dmp7k547k-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:32 `6e34bf1` READY fix(api): second audit batch — download counter, admin users, waitlist race, email escapin [after judged day — judged tomorrow] — https://mhm-finds-dw5l-codkutyfk-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:28 `038c37e` READY fix(admin): reindex-search reports failures instead of always answering success (#526) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-pdt9mieb9-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:24 `9c6334d` READY fix(top-creators): URL-encode the creator handle in the 'view mods' link (#527) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-9ye07no25-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:19 `adf73d1` READY docs(CLAUDE.md): remove instructions that point at things that do not exist (#525) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-niyarr4ba-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:02 `82f641b` READY perf(admin): trailing slash on admin /api calls (no more 308 per request) (#520) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-r1nvhkqv9-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:58 `f8b6f8c` READY perf(client): trailing slash on public /api calls (no more 308 per request) (#519) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jd0q2unlx-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:54 `7f021ab` READY docs(env): one env template; README matches the stack that exists (#518) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ie18z4pz3-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:49 `829acc3` READY perf(api/mods): fetch only the columns the facet counts use; count in one pass (#517) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-qfmtbwisi-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:45 `5a38d06` READY fix(push-scripts): match CRITICAL_MARKERS in code, not comments (#516) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-4yngbk4oz-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:41 `396fb36` READY fix(auth): refresh roles in the session token; stop auto-verifying signup emails (#515) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-dxpotj992-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:37 `f343dc5` READY chore(deps): sync the lockfile and declare packages the scripts import (#514) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-2r6vb90m2-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:22 `127f275` READY funnel(ledger): after-merge: Quinn: PR #512 funnel: daily run 2026-11-11 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-606wqygu4-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:18 `fa1fd43` READY funnel: daily run 2026-11-11 (#512) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ngthgar04-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:14 `ce937f9` READY funnel(ledger): after-merge: Nova: PR #510 E390 record applied ids in the CurseForge autho [after judged day — judged tomorrow] — https://mhm-finds-dw5l-kepx41eq1-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:13 `f08cd32` READY chore(funnel): E390 record applied ids in the frozen CurseForge author plan (#510) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-q2z0twvno-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:10 `9e2b413` READY funnel(ledger): after-merge: Rio: PR #504 affiliates 11-11 read (E392) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-pkstgyn72-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:09 `8bc6bd9` READY funnel(ledger): after-merge: Sage: PR #509 E388 dresses-cc + E389 bottoms-cc hubs [after judged day — judged tomorrow] — https://mhm-finds-dw5l-bbsfc3yeh-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:09 `22ba431` READY docs(funnel): Rio E392 — E134 affiliates read: Impact KILL to E13, Amazon block clicks KEE [after judged day — judged tomorrow] — https://mhm-finds-dw5l-cy5x7t66v-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:05 `f8a4ef7` READY funnel(sage): E388 dresses-cc + E389 bottoms-cc hubs, 122 off-type pins (#509) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-626r415eu-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:04 `08d67a3` READY funnel(ledger): after-merge: Pip: PR #507 E386 video-queue refuses a short whose link does [after judged day — judged tomorrow] — https://mhm-finds-dw5l-lzaghr64o-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:00 `18a4cb3` READY funnel(pip): E386 video-queue refuses a short whose link does not land (Tier 0) (#507) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-hxso2bkjl-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:00 `93db5fc` READY funnel(ledger): after-merge: Rowan: PR #508 victorian-cc on a title-only victorian theme ( [after judged day — judged tomorrow] — https://mhm-finds-dw5l-m09gm40jf-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:56 `d9f1a35` READY catalog: /games/sims-4/victorian-cc/ on a title-only victorian theme (E393, Tier 0) (#508) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-po05waxz0-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:56 `d5811b2` READY funnel(ledger): Nova: E390 apply 37 CurseForge authors [after judged day — judged tomorrow] — https://mhm-finds-dw5l-r9zls12zr-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:55 `36c4746` READY funnel(ledger): after-merge: Nova: PR #506 E390 resolve CurseForge authors at ingest + fre [after judged day — judged tomorrow] — https://mhm-finds-dw5l-o5dsz9v7b-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:52 `e79698d` READY feat(ingest): E390 resolve CurseForge authors at ingest + freeze 37-row backfill plan (#50 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-przl7ohd4-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:52 `c6ac921` READY funnel(ledger): after-merge: Ops: PR #505 E394 liveness grades off days on the guard [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jtzcsayqk-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:48 `0b4aab9` READY fix(liveness): grade off days on the guard, not as MISSED mornings (E394) (#505) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-n55aydemh-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:48 `9e92920` READY funnel(ledger): after-merge: Cass: PR #503 E391 newsletter-08 run 1 send record [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jf496dorm-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:48 `ed0a713` READY funnel(ledger): Sage: E389 bottoms off-type pins apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-k3z4jkf7n-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:48 `5a2a53b` READY funnel(ledger): Sage: E388 dresses off-type pins apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-rbjds768o-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:44 `3f25561` READY funnel(cass): E391 newsletter-08 run 1 send record (100 sent, 117 deferred) (#503) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-83tjpaabu-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:44 `be9a03d` READY funnel(ledger): Rowan: E393 victorian theme apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-dssmw1ola-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:43 `d6d7617` READY funnel(ledger): Cass: E391 newsletter-08 run 1 SENT [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1555obmxw-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:38 `622ebfc` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-mqwijn1y4-ericputnams-projects.vercel.app
- vercel 2026-11-11T03:31 `5e3106b` READY chore: compound learnings from 2026-11-10 — https://mhm-finds-dw5l-qo08kavmp-ericputnams-projects.vercel.app
- vercel 2026-11-11T02:32 `cc002a5` READY fix: bugs found in the project audit (#502) — https://mhm-finds-dw5l-jdjjkpcle-ericputnams-projects.vercel.app
- vercel 2026-11-11T02:05 `9148361` READY chore: remove code that nothing uses — https://mhm-finds-dw5l-h67i1kura-ericputnams-projects.vercel.app
- vercel 2026-11-10T11:37 `b22033d` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-jbqx48452-ericputnams-projects.vercel.app
- vercel 2026-11-10T03:31 `4b1218e` READY chore: compound learnings from 2026-11-09 — https://mhm-finds-dw5l-okxihy1fm-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:25 `3238599` READY funnel(ledger): after-merge: Quinn: PR #499 funnel: daily run 2026-11-09 — https://mhm-finds-dw5l-dkprie38f-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:21 `ebd02ff` READY funnel: daily run 2026-11-09 (#499) — https://mhm-finds-dw5l-a9zfzwtpz-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:20 `525baae` READY funnel(ledger): after-merge: PR 489 video queue phase 2 (interactive) — https://mhm-finds-dw5l-fcey1bi1s-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:17 `546af77` READY funnel(ledger): after-merge: Pip: PR #497 E376 hub links to the 10 organic-losing guides — https://mhm-finds-dw5l-1bds2arp7-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:16 `7b42714` READY feat(video-queue): phase 2 — post approved videos to YouTube and TikTok (#489) — https://mhm-finds-dw5l-7s8ji2h69-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:13 `8de94f8` READY funnel(pip): E376 hub links to the 10 organic-losing guides with no Next.js inbound link ( — https://mhm-finds-dw5l-kvxhsvvtw-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:12 `80720b4` READY funnel(ledger): after-merge: Pip: PR #495 E375 hub links to 13 seasonal holiday guides — https://mhm-finds-dw5l-cl81pbtk4-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:09 `1ee4265` READY funnel(pip): E375 hub links to 13 seasonal holiday guides (#495) — https://mhm-finds-dw5l-dper8bj77-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:08 `eec0d2d` READY funnel(ledger): after-merge: Sage: PR #496 E378 in-season hub leads homepage hero strip — https://mhm-finds-dw5l-1kmr2km1d-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:05 `b877f05` READY funnel(ledger): after-merge: Rio: PR #492 E381 verdict 11-09 — 7d −7.8% Halloween-weekend  — https://mhm-finds-dw5l-n00uxswiq-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:05 `e655cd4` READY funnel(sage): E378 in-season hub leads the homepage hero strip (Tier 0) (#496) — https://mhm-finds-dw5l-ewyba44ji-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:04 `15a0753` READY funnel(ledger): after-merge: Sage: PR #494 E377 eyebrows-cc hub — https://mhm-finds-dw5l-ieoqn6th7-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:01 `a6232f1` READY funnel(sage): E377 eyebrows-cc hub (Tier 0) (#494) — https://mhm-finds-dw5l-3w7vikm0e-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:57 `bb25367` READY funnel(ledger): after-merge: Rowan: PR #493 hats-cc on a title-only headwear theme (E382) — https://mhm-finds-dw5l-2q99utr6w-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:56 `a2bf55a` READY funnel(rio): E381 verdict 11-09 — 7d −7.8% is Halloween-weekend volume (ex-seg RPM +0.3% W — https://mhm-finds-dw5l-jvwhj6zpb-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:56 `3e03e72` READY funnel(ledger): after-merge: Ops: PR #491 self-host launcher fonts, no build-time gstatic  — https://mhm-finds-dw5l-b8rab4uqs-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:52 `3599bdf` READY catalog: /games/sims-4/hats-cc/ on a title-only headwear theme (E382, Tier 0) (#493) — https://mhm-finds-dw5l-mst8vc1i9-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:48 `79323e7` READY fix(build): self-host launcher fonts so next build makes no network fetch (E383) (#491) — https://mhm-finds-dw5l-h5859bj07-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:48 `3683e86` ERROR funnel(ledger): Sage: E377 eyebrows off-type pins apply — https://mhm-finds-dw5l-7xkjpeqjv-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:48 `b70684d` READY funnel(ledger): after-merge: Cass: PR #490 E380 account link in the collection-hub email b — https://mhm-finds-dw5l-f1nsxgsrc-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:47 `b0e2604` READY funnel(ledger): Rowan: E382 headwear theme apply — https://mhm-finds-dw5l-p33cx7d8i-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:47 `66ca8dd` READY funnel(ledger): Nova: E379 complete E370 apply (627 rows) + IndexNow creators — https://mhm-finds-dw5l-b50cdet1f-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:47 `c56ea9d` READY funnel(ledger): Nova: E370 apply (partial, 11-07) — missing row — https://mhm-finds-dw5l-h2jytwkjk-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:44 `bc90be0` READY feat(capture): E380 account link in the collection-hub email block (#490) — https://mhm-finds-dw5l-q6rdgqury-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:37 `7895670` ERROR funnel(ledger): check: morning-check — https://mhm-finds-dw5l-2cduhfmpn-ericputnams-projects.vercel.app
- vercel 2026-11-09T03:31 `c59a644` READY chore: compound learnings from 2026-11-08 — https://mhm-finds-dw5l-qak5rsivj-ericputnams-projects.vercel.app
- vercel 2026-11-09T00:17 `6d06235` READY fix(video-queue): launchd launcher, revisions early exit, push health check (#488) — https://mhm-finds-dw5l-9j1ble53z-ericputnams-projects.vercel.app
- vercel 2026-11-09T00:15 `6d06235` ERROR fix(video-queue): launchd launcher, revisions early exit, push health check (#488) — https://mhm-finds-dw5l-q4v9u319m-ericputnams-projects.vercel.app
- vercel 2026-11-08T23:13 `b88a666` READY funnel(ledger): after-merge: manual — https://mhm-finds-dw5l-c6qro7lrd-ericputnams-projects.vercel.app
- vercel 2026-11-08T23:09 `1bf6bbc` READY feat(video-queue): phase 1, WordPress review queue + weekly/nightly video jobs (#487) — https://mhm-finds-dw5l-p0zdci7xy-ericputnams-projects.vercel.app
- vercel 2026-11-08T22:45 `797b528` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-7btxqlrdz-ericputnams-projects.vercel.app
- vercel 2026-11-08T03:31 `d3e5a6d` READY chore: compound learnings from 2026-11-07 — https://mhm-finds-dw5l-aeg26o7s2-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:36 `71f234d` READY funnel(ledger): after-merge: Nova: PR #486 E370 Patreon author backfill — https://mhm-finds-dw5l-lvsw4817h-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:32 `c83d8f7` READY funnel(nova): E370 Patreon author backfill — 3,050 unattributed mods onto creator pages (T — https://mhm-finds-dw5l-5xgpdfkuh-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:28 `ba28bb2` READY fix(seo): ProfilePage dateModified as an ISO 8601 DateTime (#485) — https://mhm-finds-dw5l-b63ebt0r6-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:12 `78e0f24` READY funnel(ledger): after-merge: Sage: PR #483 E368 cas-backgrounds + E369 facial-hair-cc hubs — https://mhm-finds-dw5l-6hxil5h0c-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:08 `c3332fa` READY funnel(sage): E368 cas-backgrounds + E369 facial-hair-cc hubs (Tier 0) (#483) — https://mhm-finds-dw5l-ojywd7be0-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:06 `0a49b8b` READY funnel(ledger): after-merge: Rio: PR #479 verdict 11-07 — 11-04 one-day CPM dip, E342 KEEP — https://mhm-finds-dw5l-kvh0k8etz-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:04 `276fed4` READY funnel(rio): verdict 11-07 — 11-04 one-day CPM dip (−4.9%), 11-05 rate +2.1%, 7d −7.5% is  — https://mhm-finds-dw5l-gifimqtcp-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:03 `2ed6085` READY funnel(ledger): after-merge: Pip: PR #484 E367 hub blog-twin anchor names the twin — https://mhm-finds-dw5l-gfyfpvl3f-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:00 `d42b8a4` READY funnel(pip): E367 hub -> blog twin link names the twin instead of "Full article on the blo — https://mhm-finds-dw5l-oenj4s3yk-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:00 `db077a2` READY funnel(ledger): after-merge: Rowan: PR #482 E373 hello-kitty-cc collection page — https://mhm-finds-dw5l-c9ax589mk-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:56 `58b58bc` READY catalog: /games/sims-4/hello-kitty-cc/ on a title-only sanrio theme + 7 content-type pins  — https://mhm-finds-dw5l-9xx6blp01-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:55 `bca4ef0` READY funnel(ledger): after-merge: Pip: PR #481 E366 hub links to the 8 Bing-losing guides — https://mhm-finds-dw5l-hh56lnqd3-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:52 `6a517db` READY funnel(pip): E366 hub links to the 8 Bing-losing guides with no Next.js inbound link (Tier — https://mhm-finds-dw5l-1egolc438-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:51 `d153e79` READY funnel(ledger): after-merge: Ops: PR #480 E374 preflight model fallback on QUOTA — https://mhm-finds-dw5l-fh8p6cidd-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:49 `d5d2923` READY funnel(ledger): Rowan: E373 pin correction — https://mhm-finds-dw5l-3r7vrvwsw-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:48 `b4c8e7b` READY funnel(ledger): after-merge: Cass: PR #478 E371 list the 2 unlisted scripted-shaped subscr — https://mhm-finds-dw5l-k3vt7jzp2-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:48 `7fa9786` READY funnel(ops): E374 preflight falls back to another model on QUOTA (429) instead of MISSING  — https://mhm-finds-dw5l-7jbzqnui1-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:46 `10d4444` READY funnel(ledger): Sage: E368/E369 hub off-type pins apply — https://mhm-finds-dw5l-r6hxlkr55-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:45 `28203c3` READY funnel(ledger): Rowan: E373 content-type pins apply — https://mhm-finds-dw5l-fiec30b10-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:45 `78e3753` READY funnel(ledger): Rowan: E373 sanrio theme apply — https://mhm-finds-dw5l-ehpgg2dmg-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:44 `e76f989` READY funnel(cass): E371 list the 2 unlisted scripted-shaped subscribers before newsletter-08 (T — https://mhm-finds-dw5l-1nrlcbjhf-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:37 `3eb116f` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-eg1229wiu-ericputnams-projects.vercel.app
- commit 2026-11-13T06:37 `e38f7351` funnel(ledger): check: morning-check
- commit 2026-11-12T22:33 `a338d745` chore: compound learnings from 2026-11-12
- commit 2026-11-12T12:14 `824ad609` Fix Search Console 404, 403 and 401 indexing reasons (#498)
- commit 2026-11-12T06:37 `bdc1e8ea` funnel(ledger): check: morning-check
- commit 2026-11-11T22:32 `6f386e31` chore: compound learnings from 2026-11-11
- commit 2026-11-11T21:36 `321315a4` funnel(ledger): after-merge: operator / PR #535
- commit 2026-11-11T21:32 `48f589a5` feat(uploads): host Minecraft mod files; submission form asks "upload the file" or "link t
- commit 2026-11-11T19:55 `9c9befc6` chore(css): remove 33 class rules from globals.css that nothing references (#532)
- commit 2026-11-11T19:51 `fa3cf862` fix(env:push): upload values without a shell; report a variable that was removed and not r
- commit 2026-11-11T19:47 `44208abc` fix(lib): GA4 empty channel, stuck commission-sync run, silent production fallback in scri
- commit 2026-11-11T19:43 `e9a883e8` chore(api): remove two unused routes that are unsafe to keep (#531)
- commit 2026-11-11T19:38 `fee2d1b7` fix(push-scripts): marker check no longer fails under pipefail; fail safe on a bad pull or
- commit 2026-11-11T19:28 `7b25dbed` funnel(ledger): after-merge: operator / PR #534
- commit 2026-11-11T19:24 `ec3fb083` feat(admin): admins can host a mod file when creating or editing a mod (#534)
- commit 2026-11-11T19:06 `5e92f275` funnel(ledger): after-merge: operator / PR #533
- commit 2026-11-11T19:02 `f140b96e` feat(creators): creator-hosted mod file uploads on a private Cloudflare R2 bucket (#533)
- commit 2026-11-11T15:45 `9a792abf` fix(vercel): commission-sync cron path gets its trailing slash; manual agent run and reind
- commit 2026-11-11T15:41 `f354f2fb` fix(tooling): auto-compound works in its own worktree and only on a fresh priorities repor
- commit 2026-11-11T15:36 `71cbdf6c` fix(auth): first OAuth sign-in creates a complete account; consistent password rule (#522)
- commit 2026-11-11T15:32 `6e34bf13` fix(api): second audit batch — download counter, admin users, waitlist race, email escapin
- commit 2026-11-11T15:28 `038c37eb` fix(admin): reindex-search reports failures instead of always answering success (#526)
- commit 2026-11-11T15:24 `9c6334dc` fix(top-creators): URL-encode the creator handle in the 'view mods' link (#527)
- commit 2026-11-11T15:19 `adf73d1d` docs(CLAUDE.md): remove instructions that point at things that do not exist (#525)
- commit 2026-11-11T15:02 `82f641ba` perf(admin): trailing slash on admin /api calls (no more 308 per request) (#520)
- commit 2026-11-11T14:58 `f8b6f8c2` perf(client): trailing slash on public /api calls (no more 308 per request) (#519)
- commit 2026-11-11T14:54 `7f021abb` docs(env): one env template; README matches the stack that exists (#518)
- commit 2026-11-11T14:49 `829acc33` perf(api/mods): fetch only the columns the facet counts use; count in one pass (#517)
- commit 2026-11-11T14:45 `5a38d06f` fix(push-scripts): match CRITICAL_MARKERS in code, not comments (#516)
- commit 2026-11-11T14:41 `396fb361` fix(auth): refresh roles in the session token; stop auto-verifying signup emails (#515)
- commit 2026-11-11T14:37 `f343dc53` chore(deps): sync the lockfile and declare packages the scripts import (#514)
- commit 2026-11-11T07:22 `127f2751` funnel(ledger): after-merge: Quinn: PR #512 funnel: daily run 2026-11-11
- commit 2026-11-11T07:18 `fa1fd43d` funnel: daily run 2026-11-11 (#512)
- commit 2026-11-11T07:14 `ce937f93` funnel(ledger): after-merge: Nova: PR #510 E390 record applied ids in the CurseForge autho
- commit 2026-11-11T07:13 `f08cd320` chore(funnel): E390 record applied ids in the frozen CurseForge author plan (#510)
- commit 2026-11-11T07:10 `9e2b413b` funnel(ledger): after-merge: Rio: PR #504 affiliates 11-11 read (E392)
- commit 2026-11-11T07:09 `8bc6bd9e` funnel(ledger): after-merge: Sage: PR #509 E388 dresses-cc + E389 bottoms-cc hubs
- commit 2026-11-11T07:09 `22ba4312` docs(funnel): Rio E392 — E134 affiliates read: Impact KILL to E13, Amazon block clicks KEE
- commit 2026-11-11T07:04 `f8a4ef78` funnel(sage): E388 dresses-cc + E389 bottoms-cc hubs, 122 off-type pins (#509)
- commit 2026-11-11T07:04 `08d67a35` funnel(ledger): after-merge: Pip: PR #507 E386 video-queue refuses a short whose link does
- commit 2026-11-11T07:00 `18a4cb31` funnel(pip): E386 video-queue refuses a short whose link does not land (Tier 0) (#507)
- commit 2026-11-11T07:00 `93db5fc0` funnel(ledger): after-merge: Rowan: PR #508 victorian-cc on a title-only victorian theme (
- commit 2026-11-11T06:56 `d9f1a35e` catalog: /games/sims-4/victorian-cc/ on a title-only victorian theme (E393, Tier 0) (#508)
- commit 2026-11-11T06:56 `d5811b2d` funnel(ledger): Nova: E390 apply 37 CurseForge authors
- commit 2026-11-11T06:55 `36c4746b` funnel(ledger): after-merge: Nova: PR #506 E390 resolve CurseForge authors at ingest + fre
- commit 2026-11-11T06:52 `e79698d0` feat(ingest): E390 resolve CurseForge authors at ingest + freeze 37-row backfill plan (#50
- commit 2026-11-11T06:52 `c6ac9214` funnel(ledger): after-merge: Ops: PR #505 E394 liveness grades off days on the guard
- commit 2026-11-11T06:48 `0b4aab97` fix(liveness): grade off days on the guard, not as MISSED mornings (E394) (#505)
- commit 2026-11-11T06:48 `9e92920e` funnel(ledger): after-merge: Cass: PR #503 E391 newsletter-08 run 1 send record
- commit 2026-11-11T06:48 `ed0a7134` funnel(ledger): Sage: E389 bottoms off-type pins apply
- commit 2026-11-11T06:47 `5a2a53b1` funnel(ledger): Sage: E388 dresses off-type pins apply
- commit 2026-11-11T06:44 `3f25561e` funnel(cass): E391 newsletter-08 run 1 send record (100 sent, 117 deferred) (#503)
- commit 2026-11-11T06:44 `be9a03d1` funnel(ledger): Rowan: E393 victorian theme apply
- commit 2026-11-11T06:43 `d6d76178` funnel(ledger): Cass: E391 newsletter-08 run 1 SENT
- commit 2026-11-11T06:38 `622ebfc4` funnel(ledger): check: morning-check
- commit 2026-11-10T22:31 `5e3106b1` chore: compound learnings from 2026-11-10
- commit 2026-11-10T21:32 `cc002a5a` fix: bugs found in the project audit (#502)
- commit 2026-11-11T02:02 `91483615` chore: remove code that nothing uses
- commit 2026-11-11T01:52 `97ee5083` fix: project audit — verified bugs, secret hygiene, dead code
- commit 2026-11-11T01:44 `072a9d91` fix(runner): try GNU stat before BSD stat in the day-lock and run-lock age checks
- commit 2026-11-10T06:37 `b22033d4` funnel(ledger): check: morning-check
- commit 2026-11-09T22:31 `4b1218ef` chore: compound learnings from 2026-11-09
- commit 2026-11-09T07:25 `32385990` funnel(ledger): after-merge: Quinn: PR #499 funnel: daily run 2026-11-09
- commit 2026-11-09T07:20 `ebd02fff` funnel: daily run 2026-11-09 (#499)
- commit 2026-11-09T07:20 `525baae0` funnel(ledger): after-merge: PR 489 video queue phase 2 (interactive)
- commit 2026-11-09T07:17 `546af776` funnel(ledger): after-merge: Pip: PR #497 E376 hub links to the 10 organic-losing guides
- commit 2026-11-09T07:16 `7b427144` feat(video-queue): phase 2 — post approved videos to YouTube and TikTok (#489)
- commit 2026-11-09T07:13 `8de94f81` funnel(pip): E376 hub links to the 10 organic-losing guides with no Next.js inbound link (
- commit 2026-11-09T07:12 `80720b41` funnel(ledger): after-merge: Pip: PR #495 E375 hub links to 13 seasonal holiday guides
- commit 2026-11-09T07:09 `1ee42653` funnel(pip): E375 hub links to 13 seasonal holiday guides (#495)
- commit 2026-11-09T07:08 `eec0d2d8` funnel(ledger): after-merge: Sage: PR #496 E378 in-season hub leads homepage hero strip
- commit 2026-11-09T07:05 `b877f053` funnel(ledger): after-merge: Rio: PR #492 E381 verdict 11-09 — 7d −7.8% Halloween-weekend 
- commit 2026-11-09T07:05 `e655cd4b` funnel(sage): E378 in-season hub leads the homepage hero strip (Tier 0) (#496)
- commit 2026-11-09T07:04 `15a0753b` funnel(ledger): after-merge: Sage: PR #494 E377 eyebrows-cc hub
- commit 2026-11-09T07:00 `a6232f1e` funnel(sage): E377 eyebrows-cc hub (Tier 0) (#494)
- commit 2026-11-09T06:57 `bb253672` funnel(ledger): after-merge: Rowan: PR #493 hats-cc on a title-only headwear theme (E382)
- commit 2026-11-09T06:56 `a2bf55a8` funnel(rio): E381 verdict 11-09 — 7d −7.8% is Halloween-weekend volume (ex-seg RPM +0.3% W
- commit 2026-11-09T06:56 `3e03e726` funnel(ledger): after-merge: Ops: PR #491 self-host launcher fonts, no build-time gstatic 
- commit 2026-11-09T06:52 `3599bdfa` catalog: /games/sims-4/hats-cc/ on a title-only headwear theme (E382, Tier 0) (#493)
- commit 2026-11-09T06:48 `79323e7c` fix(build): self-host launcher fonts so next build makes no network fetch (E383) (#491)
- commit 2026-11-09T06:48 `3683e86d` funnel(ledger): Sage: E377 eyebrows off-type pins apply
- commit 2026-11-09T06:47 `b70684d9` funnel(ledger): after-merge: Cass: PR #490 E380 account link in the collection-hub email b
- commit 2026-11-09T06:47 `b0e2604f` funnel(ledger): Rowan: E382 headwear theme apply
- commit 2026-11-09T06:47 `66ca8ddc` funnel(ledger): Nova: E379 complete E370 apply (627 rows) + IndexNow creators
- commit 2026-11-09T06:47 `c56ea9d4` funnel(ledger): Nova: E370 apply (partial, 11-07) — missing row
- commit 2026-11-09T06:44 `bc90be07` feat(capture): E380 account link in the collection-hub email block (#490)
- commit 2026-11-09T06:37 `78956704` funnel(ledger): check: morning-check
- commit 2026-11-08T22:31 `c59a6448` chore: compound learnings from 2026-11-08
- commit 2026-11-08T19:15 `6d06235f` fix(video-queue): launchd launcher, revisions early exit, push health check (#488)
- commit 2026-11-08T18:13 `b88a6668` funnel(ledger): after-merge: manual
- commit 2026-11-08T18:09 `1bf6bbc5` feat(video-queue): phase 1, WordPress review queue + weekly/nightly video jobs (#487)
- commit 2026-11-08T17:45 `797b5284` funnel(ledger): check: morning-check
- commit 2026-11-07T22:31 `d3e5a6d4` chore: compound learnings from 2026-11-07
- commit 2026-11-07T07:35 `71f234d4` funnel(ledger): after-merge: Nova: PR #486 E370 Patreon author backfill
- commit 2026-11-07T07:32 `c83d8f74` funnel(nova): E370 Patreon author backfill — 3,050 unattributed mods onto creator pages (T
- commit 2026-11-07T12:28 `ba28bb29` fix(seo): ProfilePage dateModified as an ISO 8601 DateTime (#485)
- commit 2026-11-07T07:12 `78e0f245` funnel(ledger): after-merge: Sage: PR #483 E368 cas-backgrounds + E369 facial-hair-cc hubs
- commit 2026-11-07T07:08 `c3332fa0` funnel(sage): E368 cas-backgrounds + E369 facial-hair-cc hubs (Tier 0) (#483)
- commit 2026-11-07T07:06 `0a49b8b1` funnel(ledger): after-merge: Rio: PR #479 verdict 11-07 — 11-04 one-day CPM dip, E342 KEEP
- commit 2026-11-07T07:04 `276fed49` funnel(rio): verdict 11-07 — 11-04 one-day CPM dip (−4.9%), 11-05 rate +2.1%, 7d −7.5% is 
- commit 2026-11-07T07:03 `2ed60851` funnel(ledger): after-merge: Pip: PR #484 E367 hub blog-twin anchor names the twin
- commit 2026-11-07T07:00 `d42b8a40` funnel(pip): E367 hub -> blog twin link names the twin instead of "Full article on the blo
- commit 2026-11-07T07:00 `db077a22` funnel(ledger): after-merge: Rowan: PR #482 E373 hello-kitty-cc collection page
- commit 2026-11-07T06:56 `58b58bce` catalog: /games/sims-4/hello-kitty-cc/ on a title-only sanrio theme + 7 content-type pins 
- commit 2026-11-07T06:55 `bca4ef0a` funnel(ledger): after-merge: Pip: PR #481 E366 hub links to the 8 Bing-losing guides
- commit 2026-11-07T06:52 `6a517db3` funnel(pip): E366 hub links to the 8 Bing-losing guides with no Next.js inbound link (Tier
- commit 2026-11-07T06:51 `d153e794` funnel(ledger): after-merge: Ops: PR #480 E374 preflight model fallback on QUOTA
- commit 2026-11-07T06:48 `d5d29239` funnel(ledger): Rowan: E373 pin correction
- commit 2026-11-07T06:48 `b4c8e7b6` funnel(ledger): after-merge: Cass: PR #478 E371 list the 2 unlisted scripted-shaped subscr
- commit 2026-11-07T06:48 `7fa97869` funnel(ops): E374 preflight falls back to another model on QUOTA (429) instead of MISSING 
- commit 2026-11-07T06:46 `10d4444d` funnel(ledger): Sage: E368/E369 hub off-type pins apply
- commit 2026-11-07T06:45 `28203c34` funnel(ledger): Rowan: E373 content-type pins apply
- commit 2026-11-07T06:45 `78e37534` funnel(ledger): Rowan: E373 sanrio theme apply
- commit 2026-11-07T06:44 `e76f989a` funnel(cass): E371 list the 2 unlisted scripted-shaped subscribers before newsletter-08 (T

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
