# Revenue guardrail — 2026-11-15 (last finalized day 2026-11-12)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (200 rows over 10 pages, oldest 2026-11-07T12:06Z ≤ window start 2026-11-09T05:00Z) · deploy in window: yes

rollback bound: in-window production deploys 83 (≤24 to auto-rollback) · target 1.5 h before window start (≤48 h) → withheld: in-window deploys 83 exceed rollback bound 24

- Revenue $202.19 (5.1%), RPM 17.18 (3.0%), sessions 1.6% vs same weekday, prior 4 weeks · 3-day revenue 15.7%

| | 2026-11-12 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $202.19 | $192.42 | 5.1% |
| session RPM | 17.18 | 16.68 | 3.0% |
| sessions | 11,767 | 11,585 | 1.6% |
| 3-day revenue | $667.72 | $577.29 | 15.7% |
| 3-day RPM | 18.84 | 16.47 | 14.4% |

sessions ex Singapore (direct) (E216, GA4): unavailable — GA4 returned no row for 2026-11-12 or fewer than 2 same-weekday controls

ex-segment RPM (E216; Mediavine revenue ÷ GA4 sessions ex Singapore (direct)): unavailable — GA4 returned no row for 2026-11-12 or fewer than 2 same-weekday controls

Mediavine health: all ok

## Production changes since 2026-11-09 (72h before the judged day)

- vercel 2026-11-15T11:37 `a816caf` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-e1hn5mvjj-ericputnams-projects.vercel.app
- vercel 2026-11-15T03:31 `33c26e7` READY chore: compound learnings from 2026-11-14 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-hmyw2i8sa-ericputnams-projects.vercel.app
- vercel 2026-11-14T11:37 `702afa4` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-cqtr3thrt-ericputnams-projects.vercel.app
- vercel 2026-11-14T03:32 `89e70f2` READY chore: compound learnings from 2026-11-13 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7fogrs5f9-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:27 `7ebfd93` READY funnel(ledger): after-merge: Quinn: PR #545 funnel: daily run 2026-11-13 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7yzdevj4s-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:24 `c6892ab` READY funnel: daily run 2026-11-13 (#545) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-q0z2xk7ay-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:21 `0c0dd34` READY funnel(ledger): after-merge: Sage: PR #544 E400 houses-lots hub [after judged day — judged tomorrow] — https://mhm-finds-dw5l-62mdydh4m-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:17 `ed3fa41` READY funnel(sage): E400 houses-lots hub — 983 lot rows hand-read, 277 off-type pinned (#544) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-lotxp35lq-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:14 `045f411` READY funnel(ledger): Nova: E401 apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ad58i0vx8-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:14 `497bc7f` READY funnel(ledger): after-merge: Nova: PR #543 E401 record applied ids in the Simsfinds author [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jxt3lthng-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:13 `de55b8b` READY funnel(nova): E401 record applied ids in the Simsfinds author plan (#543) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-bgrzsm7lt-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:13 `675d7b0` READY funnel(ledger): Sage: E400 lots apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-v89xi73in-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:12 `e5750c5` READY funnel(ledger): after-merge: Rio: PR #539 E403 non-ad headline reads the Patreon Members A [after judged day — judged tomorrow] — https://mhm-finds-dw5l-o77zjsnoc-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:09 `07d034a` READY funnel(ledger): Sage: E400 apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-bp1uis10l-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:08 `ab6b947` READY funnel(rio): E403 non-ad headline reads the Patreon Members API; E332(b) PASS (#539) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-4rk651x30-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:08 `35f6dc2` READY funnel(ledger): after-merge: Nova: PR #542 E401 Simsfinds creators from page JSON-LD [after judged day — judged tomorrow] — https://mhm-finds-dw5l-bgal2l6to-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:04 `9e88ae2` READY funnel(ledger): after-merge: Sage: PR #541 E399 tops-cc hub [after judged day — judged tomorrow] — https://mhm-finds-dw5l-i1nem1rx3-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:04 `4387b6f` READY funnel(nova): E401 Simsfinds creators from the page's own JSON-LD (7 new + 13 grown creato [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7xp3tjj3z-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:00 `e3fe870` READY funnel(sage): E399 tops-cc hub — 855 hand-read tops, 228 off-type pinned (#541) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-l6komi3p8-ericputnams-projects.vercel.app
- vercel 2026-11-13T12:00 `3b0552d` READY funnel(ledger): after-merge: Ops: PR #537 E405 template lastmod bump [after judged day — judged tomorrow] — https://mhm-finds-dw5l-hejei1uav-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:56 `e9b5d76` READY ops: E405 bump APP/COLLECTION template lastmod to 2026-11-11 — template-lastmod guard gree [after judged day — judged tomorrow] — https://mhm-finds-dw5l-9zfgr93iw-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:55 `e1bd840` READY funnel(ledger): after-merge: Rowan: PR #540 nursery-cc on a title-only nursery theme (E404 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-57z35gvot-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:52 `43057c8` READY catalog: /games/sims-4/nursery-cc/ on a title-only nursery theme (E404, Tier 0) (#540) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-25e2632io-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:51 `ac93c5c` READY funnel(ledger): after-merge: Cass: PR #538 E391 newsletter-08 run 2 send record [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jbzbutu02-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:47 `ccf162e` READY funnel(cass): E391 newsletter-08 run 2 send record (100 sent, 30 deferred) (#538) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-45vgde3lh-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:47 `e9d33f3` READY funnel(ledger): Sage: E399 tops pins apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-qx63zdqwq-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:47 `a696d49` READY funnel(ledger): after-merge: Pip: PR #511 E386 /christmas-cc redirects to its hub [after judged day — judged tomorrow] — https://mhm-finds-dw5l-4p9y44led-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:46 `5aab715` READY funnel(ledger): Rowan: E404 nursery theme apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-bz0n0ixw9-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:44 `f14703c` READY funnel(ledger): Cass: E391 run-2 row arithmetic correction [after judged day — judged tomorrow] — https://mhm-finds-dw5l-13ocu6g0b-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:44 `85e568b` READY funnel(ledger): Cass: E391 newsletter-08 run 2 SENT [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fcgtkimtu-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:43 `49df1c1` READY funnel(pip): E386 /christmas-cc redirects to its hub so approved short 43631 lands (Tier 1 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7uvjcs5se-ericputnams-projects.vercel.app
- vercel 2026-11-13T11:37 `e38f735` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fnqkiosu4-ericputnams-projects.vercel.app
- vercel 2026-11-13T03:33 `a338d74` READY chore: compound learnings from 2026-11-12 — https://mhm-finds-dw5l-hopp6hq2u-ericputnams-projects.vercel.app
- vercel 2026-11-12T12:14 `824ad60` READY Fix Search Console 404, 403 and 401 indexing reasons (#498) — https://mhm-finds-dw5l-hi54n2o8y-ericputnams-projects.vercel.app
- vercel 2026-11-12T11:37 `bdc1e8e` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-ooe6f3y7r-ericputnams-projects.vercel.app
- vercel 2026-11-12T03:32 `6f386e3` READY chore: compound learnings from 2026-11-11 — https://mhm-finds-dw5l-cj1p3b6op-ericputnams-projects.vercel.app
- vercel 2026-11-12T02:36 `321315a` READY funnel(ledger): after-merge: operator / PR #535 — https://mhm-finds-dw5l-4a7n5c1xx-ericputnams-projects.vercel.app
- vercel 2026-11-12T02:32 `48f589a` READY feat(uploads): host Minecraft mod files; submission form asks "upload the file" or "link t — https://mhm-finds-dw5l-aj83lxptv-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:55 `9c9befc` READY chore(css): remove 33 class rules from globals.css that nothing references (#532) — https://mhm-finds-dw5l-awoy1yufd-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:51 `fa3cf86` READY fix(env:push): upload values without a shell; report a variable that was removed and not r — https://mhm-finds-dw5l-ld0rajleh-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:47 `44208ab` READY fix(lib): GA4 empty channel, stuck commission-sync run, silent production fallback in scri — https://mhm-finds-dw5l-7ph8wvkd1-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:43 `e9a883e` READY chore(api): remove two unused routes that are unsafe to keep (#531) — https://mhm-finds-dw5l-11o0dx4iq-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:38 `fee2d1b` READY fix(push-scripts): marker check no longer fails under pipefail; fail safe on a bad pull or — https://mhm-finds-dw5l-1x4suu3kv-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:28 `7b25dbe` READY funnel(ledger): after-merge: operator / PR #534 — https://mhm-finds-dw5l-n0tg4gk0a-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:24 `ec3fb08` READY feat(admin): admins can host a mod file when creating or editing a mod (#534) — https://mhm-finds-dw5l-8o8ecqzlo-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:06 `5e92f27` READY funnel(ledger): after-merge: operator / PR #533 — https://mhm-finds-dw5l-5hlr52o56-ericputnams-projects.vercel.app
- vercel 2026-11-12T00:02 `f140b96` READY feat(creators): creator-hosted mod file uploads on a private Cloudflare R2 bucket (#533) — https://mhm-finds-dw5l-i5kprztyr-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:45 `9a792ab` READY fix(vercel): commission-sync cron path gets its trailing slash; manual agent run and reind — https://mhm-finds-dw5l-ln4n3o1x5-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:41 `f354f2f` READY fix(tooling): auto-compound works in its own worktree and only on a fresh priorities repor — https://mhm-finds-dw5l-fqbczeafo-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:36 `71cbdf6` READY fix(auth): first OAuth sign-in creates a complete account; consistent password rule (#522) — https://mhm-finds-dw5l-dmp7k547k-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:32 `6e34bf1` READY fix(api): second audit batch — download counter, admin users, waitlist race, email escapin — https://mhm-finds-dw5l-codkutyfk-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:28 `038c37e` READY fix(admin): reindex-search reports failures instead of always answering success (#526) — https://mhm-finds-dw5l-pdt9mieb9-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:24 `9c6334d` READY fix(top-creators): URL-encode the creator handle in the 'view mods' link (#527) — https://mhm-finds-dw5l-9ye07no25-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:19 `adf73d1` READY docs(CLAUDE.md): remove instructions that point at things that do not exist (#525) — https://mhm-finds-dw5l-niyarr4ba-ericputnams-projects.vercel.app
- vercel 2026-11-11T20:02 `82f641b` READY perf(admin): trailing slash on admin /api calls (no more 308 per request) (#520) — https://mhm-finds-dw5l-r1nvhkqv9-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:58 `f8b6f8c` READY perf(client): trailing slash on public /api calls (no more 308 per request) (#519) — https://mhm-finds-dw5l-jd0q2unlx-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:54 `7f021ab` READY docs(env): one env template; README matches the stack that exists (#518) — https://mhm-finds-dw5l-ie18z4pz3-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:49 `829acc3` READY perf(api/mods): fetch only the columns the facet counts use; count in one pass (#517) — https://mhm-finds-dw5l-qfmtbwisi-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:45 `5a38d06` READY fix(push-scripts): match CRITICAL_MARKERS in code, not comments (#516) — https://mhm-finds-dw5l-4yngbk4oz-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:41 `396fb36` READY fix(auth): refresh roles in the session token; stop auto-verifying signup emails (#515) — https://mhm-finds-dw5l-dxpotj992-ericputnams-projects.vercel.app
- vercel 2026-11-11T19:37 `f343dc5` READY chore(deps): sync the lockfile and declare packages the scripts import (#514) — https://mhm-finds-dw5l-2r6vb90m2-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:22 `127f275` READY funnel(ledger): after-merge: Quinn: PR #512 funnel: daily run 2026-11-11 — https://mhm-finds-dw5l-606wqygu4-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:18 `fa1fd43` READY funnel: daily run 2026-11-11 (#512) — https://mhm-finds-dw5l-ngthgar04-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:14 `ce937f9` READY funnel(ledger): after-merge: Nova: PR #510 E390 record applied ids in the CurseForge autho — https://mhm-finds-dw5l-kepx41eq1-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:13 `f08cd32` READY chore(funnel): E390 record applied ids in the frozen CurseForge author plan (#510) — https://mhm-finds-dw5l-q2z0twvno-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:10 `9e2b413` READY funnel(ledger): after-merge: Rio: PR #504 affiliates 11-11 read (E392) — https://mhm-finds-dw5l-pkstgyn72-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:09 `8bc6bd9` READY funnel(ledger): after-merge: Sage: PR #509 E388 dresses-cc + E389 bottoms-cc hubs — https://mhm-finds-dw5l-bbsfc3yeh-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:09 `22ba431` READY docs(funnel): Rio E392 — E134 affiliates read: Impact KILL to E13, Amazon block clicks KEE — https://mhm-finds-dw5l-cy5x7t66v-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:05 `f8a4ef7` READY funnel(sage): E388 dresses-cc + E389 bottoms-cc hubs, 122 off-type pins (#509) — https://mhm-finds-dw5l-626r415eu-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:04 `08d67a3` READY funnel(ledger): after-merge: Pip: PR #507 E386 video-queue refuses a short whose link does — https://mhm-finds-dw5l-lzaghr64o-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:00 `18a4cb3` READY funnel(pip): E386 video-queue refuses a short whose link does not land (Tier 0) (#507) — https://mhm-finds-dw5l-hxso2bkjl-ericputnams-projects.vercel.app
- vercel 2026-11-11T12:00 `93db5fc` READY funnel(ledger): after-merge: Rowan: PR #508 victorian-cc on a title-only victorian theme ( — https://mhm-finds-dw5l-m09gm40jf-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:56 `d9f1a35` READY catalog: /games/sims-4/victorian-cc/ on a title-only victorian theme (E393, Tier 0) (#508) — https://mhm-finds-dw5l-po05waxz0-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:56 `d5811b2` READY funnel(ledger): Nova: E390 apply 37 CurseForge authors — https://mhm-finds-dw5l-r9zls12zr-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:55 `36c4746` READY funnel(ledger): after-merge: Nova: PR #506 E390 resolve CurseForge authors at ingest + fre — https://mhm-finds-dw5l-o5dsz9v7b-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:52 `e79698d` READY feat(ingest): E390 resolve CurseForge authors at ingest + freeze 37-row backfill plan (#50 — https://mhm-finds-dw5l-przl7ohd4-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:52 `c6ac921` READY funnel(ledger): after-merge: Ops: PR #505 E394 liveness grades off days on the guard — https://mhm-finds-dw5l-jtzcsayqk-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:48 `0b4aab9` READY fix(liveness): grade off days on the guard, not as MISSED mornings (E394) (#505) — https://mhm-finds-dw5l-n55aydemh-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:48 `9e92920` READY funnel(ledger): after-merge: Cass: PR #503 E391 newsletter-08 run 1 send record — https://mhm-finds-dw5l-jf496dorm-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:48 `ed0a713` READY funnel(ledger): Sage: E389 bottoms off-type pins apply — https://mhm-finds-dw5l-k3z4jkf7n-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:48 `5a2a53b` READY funnel(ledger): Sage: E388 dresses off-type pins apply — https://mhm-finds-dw5l-rbjds768o-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:44 `3f25561` READY funnel(cass): E391 newsletter-08 run 1 send record (100 sent, 117 deferred) (#503) — https://mhm-finds-dw5l-83tjpaabu-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:44 `be9a03d` READY funnel(ledger): Rowan: E393 victorian theme apply — https://mhm-finds-dw5l-dssmw1ola-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:43 `d6d7617` READY funnel(ledger): Cass: E391 newsletter-08 run 1 SENT — https://mhm-finds-dw5l-1555obmxw-ericputnams-projects.vercel.app
- vercel 2026-11-11T11:38 `622ebfc` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-mqwijn1y4-ericputnams-projects.vercel.app
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
- commit 2026-11-14T22:31 `33c26e7c` chore: compound learnings from 2026-11-14
- commit 2026-11-14T06:37 `702afa4b` funnel(ledger): check: morning-check
- commit 2026-11-13T22:32 `89e70f22` chore: compound learnings from 2026-11-13
- commit 2026-11-13T07:27 `7ebfd93d` funnel(ledger): after-merge: Quinn: PR #545 funnel: daily run 2026-11-13
- commit 2026-11-13T07:24 `c6892ab1` funnel: daily run 2026-11-13 (#545)
- commit 2026-11-13T07:21 `0c0dd34c` funnel(ledger): after-merge: Sage: PR #544 E400 houses-lots hub
- commit 2026-11-13T07:17 `ed3fa411` funnel(sage): E400 houses-lots hub — 983 lot rows hand-read, 277 off-type pinned (#544)
- commit 2026-11-13T07:14 `045f4114` funnel(ledger): Nova: E401 apply
- commit 2026-11-13T07:14 `497bc7f6` funnel(ledger): after-merge: Nova: PR #543 E401 record applied ids in the Simsfinds author
- commit 2026-11-13T07:13 `de55b8b7` funnel(nova): E401 record applied ids in the Simsfinds author plan (#543)
- commit 2026-11-13T07:13 `675d7b00` funnel(ledger): Sage: E400 lots apply
- commit 2026-11-13T07:12 `e5750c50` funnel(ledger): after-merge: Rio: PR #539 E403 non-ad headline reads the Patreon Members A
- commit 2026-11-13T07:09 `07d034ad` funnel(ledger): Sage: E400 apply
- commit 2026-11-13T07:08 `ab6b947b` funnel(rio): E403 non-ad headline reads the Patreon Members API; E332(b) PASS (#539)
- commit 2026-11-13T07:07 `35f6dc23` funnel(ledger): after-merge: Nova: PR #542 E401 Simsfinds creators from page JSON-LD
- commit 2026-11-13T07:04 `9e88ae2a` funnel(ledger): after-merge: Sage: PR #541 E399 tops-cc hub
- commit 2026-11-13T07:04 `4387b6ff` funnel(nova): E401 Simsfinds creators from the page's own JSON-LD (7 new + 13 grown creato
- commit 2026-11-13T07:00 `e3fe8700` funnel(sage): E399 tops-cc hub — 855 hand-read tops, 228 off-type pinned (#541)
- commit 2026-11-13T07:00 `3b0552de` funnel(ledger): after-merge: Ops: PR #537 E405 template lastmod bump
- commit 2026-11-13T06:56 `e9b5d762` ops: E405 bump APP/COLLECTION template lastmod to 2026-11-11 — template-lastmod guard gree
- commit 2026-11-13T06:55 `e1bd840f` funnel(ledger): after-merge: Rowan: PR #540 nursery-cc on a title-only nursery theme (E404
- commit 2026-11-13T06:51 `43057c87` catalog: /games/sims-4/nursery-cc/ on a title-only nursery theme (E404, Tier 0) (#540)
- commit 2026-11-13T06:51 `ac93c5c9` funnel(ledger): after-merge: Cass: PR #538 E391 newsletter-08 run 2 send record
- commit 2026-11-13T06:47 `ccf162e8` funnel(cass): E391 newsletter-08 run 2 send record (100 sent, 30 deferred) (#538)
- commit 2026-11-13T06:47 `e9d33f3d` funnel(ledger): Sage: E399 tops pins apply
- commit 2026-11-13T06:47 `a696d499` funnel(ledger): after-merge: Pip: PR #511 E386 /christmas-cc redirects to its hub
- commit 2026-11-13T06:46 `5aab715a` funnel(ledger): Rowan: E404 nursery theme apply
- commit 2026-11-13T06:44 `f14703c5` funnel(ledger): Cass: E391 run-2 row arithmetic correction
- commit 2026-11-13T06:44 `85e568bd` funnel(ledger): Cass: E391 newsletter-08 run 2 SENT
- commit 2026-11-13T06:43 `49df1c18` funnel(pip): E386 /christmas-cc redirects to its hub so approved short 43631 lands (Tier 1
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

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
