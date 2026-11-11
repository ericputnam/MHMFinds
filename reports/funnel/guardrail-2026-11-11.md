# Revenue guardrail — 2026-11-11 (last finalized day 2026-11-08)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (180 rows over 9 pages, oldest 2026-11-04T15:21Z ≤ window start 2026-11-05T05:00Z) · deploy in window: yes

rollback bound: in-window production deploys 77 (≤24 to auto-rollback) · target 13.2 h before window start (≤48 h) → withheld: in-window deploys 77 exceed rollback bound 24

- Revenue $304.70 (16.6%), RPM 19.93 (15.1%), sessions 1.0% vs same weekday, prior 4 weeks · 3-day revenue 14.9%

| | 2026-11-08 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $304.70 | $261.41 | 16.6% |
| session RPM | 19.93 | 17.32 | 15.1% |
| sessions | 15,282 | 15,125 | 1.0% |
| sessions, GA4 raw | 15,715 | 15,331 | 2.5% |
| **sessions ex Singapore (direct)** (E216, GA4) | 15,244 | 14,604 | 4.4% |
| **ex-segment RPM** (E271; MV revenue ÷ GA4 ex-segment sessions) | 19.99 | 17.90 | 11.7% → rate |
| 3-day revenue | $829.71 | $722.07 | 14.9% |
| 3-day RPM | 19.94 | 17.69 | 12.7% |

sessions ex Singapore (direct) (E216, GA4): raw 15,715 vs 15,331 (+2.5%) → ex-segment 15,244 vs 14,604 (+4.4%) · segment 471 = 3.00% of the day (controls 4.74%, 4 same weekdays)

ex-segment RPM (E216; Mediavine revenue ÷ GA4 sessions ex Singapore (direct)): $19.99 vs $17.90 (+11.7%) · mix alone predicts raw RPM +1.8% → rate (mix band ±1%)

Mediavine health: all ok

## Production changes since 2026-11-05 (72h before the judged day)

- vercel 2026-11-11T11:38 `622ebfc` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-mqwijn1y4-ericputnams-projects.vercel.app
- vercel 2026-11-11T03:31 `5e3106b` READY chore: compound learnings from 2026-11-10 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-qo08kavmp-ericputnams-projects.vercel.app
- vercel 2026-11-11T02:32 `cc002a5` READY fix: bugs found in the project audit (#502) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jdjjkpcle-ericputnams-projects.vercel.app
- vercel 2026-11-11T02:05 `9148361` READY chore: remove code that nothing uses [after judged day — judged tomorrow] — https://mhm-finds-dw5l-h67i1kura-ericputnams-projects.vercel.app
- vercel 2026-11-10T11:37 `b22033d` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jbqx48452-ericputnams-projects.vercel.app
- vercel 2026-11-10T03:31 `4b1218e` READY chore: compound learnings from 2026-11-09 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-okxihy1fm-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:25 `3238599` READY funnel(ledger): after-merge: Quinn: PR #499 funnel: daily run 2026-11-09 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-dkprie38f-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:21 `ebd02ff` READY funnel: daily run 2026-11-09 (#499) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-a9zfzwtpz-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:20 `525baae` READY funnel(ledger): after-merge: PR 489 video queue phase 2 (interactive) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fcey1bi1s-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:17 `546af77` READY funnel(ledger): after-merge: Pip: PR #497 E376 hub links to the 10 organic-losing guides [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1bds2arp7-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:16 `7b42714` READY feat(video-queue): phase 2 — post approved videos to YouTube and TikTok (#489) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7s8ji2h69-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:13 `8de94f8` READY funnel(pip): E376 hub links to the 10 organic-losing guides with no Next.js inbound link ( [after judged day — judged tomorrow] — https://mhm-finds-dw5l-kvxhsvvtw-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:12 `80720b4` READY funnel(ledger): after-merge: Pip: PR #495 E375 hub links to 13 seasonal holiday guides [after judged day — judged tomorrow] — https://mhm-finds-dw5l-cl81pbtk4-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:09 `1ee4265` READY funnel(pip): E375 hub links to 13 seasonal holiday guides (#495) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-dper8bj77-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:08 `eec0d2d` READY funnel(ledger): after-merge: Sage: PR #496 E378 in-season hub leads homepage hero strip [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1kmr2km1d-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:05 `b877f05` READY funnel(ledger): after-merge: Rio: PR #492 E381 verdict 11-09 — 7d −7.8% Halloween-weekend  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-n00uxswiq-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:05 `e655cd4` READY funnel(sage): E378 in-season hub leads the homepage hero strip (Tier 0) (#496) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ewyba44ji-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:04 `15a0753` READY funnel(ledger): after-merge: Sage: PR #494 E377 eyebrows-cc hub [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ieoqn6th7-ericputnams-projects.vercel.app
- vercel 2026-11-09T12:01 `a6232f1` READY funnel(sage): E377 eyebrows-cc hub (Tier 0) (#494) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-3w7vikm0e-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:57 `bb25367` READY funnel(ledger): after-merge: Rowan: PR #493 hats-cc on a title-only headwear theme (E382) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-2q99utr6w-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:56 `a2bf55a` READY funnel(rio): E381 verdict 11-09 — 7d −7.8% is Halloween-weekend volume (ex-seg RPM +0.3% W [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jvwhj6zpb-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:56 `3e03e72` READY funnel(ledger): after-merge: Ops: PR #491 self-host launcher fonts, no build-time gstatic  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-b8rab4uqs-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:52 `3599bdf` READY catalog: /games/sims-4/hats-cc/ on a title-only headwear theme (E382, Tier 0) (#493) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-mst8vc1i9-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:48 `79323e7` READY fix(build): self-host launcher fonts so next build makes no network fetch (E383) (#491) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-h5859bj07-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:48 `3683e86` ERROR funnel(ledger): Sage: E377 eyebrows off-type pins apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7xkjpeqjv-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:48 `b70684d` READY funnel(ledger): after-merge: Cass: PR #490 E380 account link in the collection-hub email b [after judged day — judged tomorrow] — https://mhm-finds-dw5l-f1nsxgsrc-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:47 `b0e2604` READY funnel(ledger): Rowan: E382 headwear theme apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-p33cx7d8i-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:47 `66ca8dd` READY funnel(ledger): Nova: E379 complete E370 apply (627 rows) + IndexNow creators [after judged day — judged tomorrow] — https://mhm-finds-dw5l-b50cdet1f-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:47 `c56ea9d` READY funnel(ledger): Nova: E370 apply (partial, 11-07) — missing row [after judged day — judged tomorrow] — https://mhm-finds-dw5l-h2jytwkjk-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:44 `bc90be0` READY feat(capture): E380 account link in the collection-hub email block (#490) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-q6rdgqury-ericputnams-projects.vercel.app
- vercel 2026-11-09T11:37 `7895670` ERROR funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-2cduhfmpn-ericputnams-projects.vercel.app
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
- vercel 2026-11-07T03:32 `02cf5fe` READY chore: compound learnings from 2026-11-06 — https://mhm-finds-dw5l-1earsciup-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:41 `5fd27f7` READY funnel(ledger): after-merge: Quinn: PR #477 funnel: daily run 2026-11-06 — https://mhm-finds-dw5l-jzown17i3-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:37 `e75a09e` READY funnel: daily run 2026-11-06 (#477) — https://mhm-finds-dw5l-cgw2v5n4c-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:29 `eb2ae36` READY funnel(ledger): after-merge: Sage: PR #476 E355 creator ProfilePage dateModified — https://mhm-finds-dw5l-6mdh6eqvh-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:25 `7d12e92` READY funnel(sage): E355 creator ProfilePage JSON-LD carries dateModified = sitemap lastmod (Tie — https://mhm-finds-dw5l-52rn01zvk-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:24 `089ec41` READY funnel(ledger): after-merge: Sage: PR #473 E354 hub CollectionPage dateModified — https://mhm-finds-dw5l-oj5eomqud-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:21 `abf463e` READY funnel(ledger): build-watch: Sage: PR #473 E354 hub CollectionPage dateModified — https://mhm-finds-dw5l-5l0ymivoy-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:20 `067ce9c` ERROR funnel(sage): E354 hub CollectionPage dateModified = sitemap lastmod (Tier 0) (#473) — https://mhm-finds-dw5l-7wl58pzcq-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:12 `d4cfae0` READY funnel(ledger): after-merge: Ops: PR #472 E364 green the suite on main (catalog-count, fee — https://mhm-finds-dw5l-pw9krz4g4-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:08 `c0ba58e` READY ops: green the suite on main — catalog-count, feeds, template-lastmod (E364, Tier 0) (#472 — https://mhm-finds-dw5l-fxliij80e-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:07 `ae701f7` READY funnel(ledger): after-merge: Pip: PR #475 funnel(pip): E352 share link on mod + collection — https://mhm-finds-dw5l-e7n0g06b2-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:04 `9895312` READY funnel(ledger): Nova: E356 apply 72 Mod.author rows — https://mhm-finds-dw5l-6scr818js-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:04 `8b9d5b4` READY funnel(pip): E352 share link on mod + collection pages (?via=share, GA4 share) (#475) — https://mhm-finds-dw5l-fgp2n6o6v-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:03 `c14804d` READY funnel(ledger): after-merge: Nova: PR #471 E356 fold 6 suffix-split creator spellings into — https://mhm-finds-dw5l-djdd3185m-ericputnams-projects.vercel.app
- vercel 2026-11-06T12:00 `98be44c` READY funnel(ledger): after-merge: Rowan: PR #474 E362 /games/sims-4/heels-cc/ title-only heels  — https://mhm-finds-dw5l-6i8614dbi-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:59 `0a5b98b` READY funnel(nova): fold 6 suffix-split creator spellings into one page (E356) (#471) — https://mhm-finds-dw5l-4ua8jzs5b-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:56 `6c0dde8` READY funnel(ledger): build-watch: Rowan: PR #474 E362 /games/sims-4/heels-cc/ title-only heels  — https://mhm-finds-dw5l-fii9ghonj-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:55 `22f99a9` ERROR catalog: /games/sims-4/heels-cc/ on a title-only heels theme + 6 hub off-type pins (E362,  — https://mhm-finds-dw5l-fjvhhwhq7-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:55 `3ac7376` READY funnel(ledger): after-merge: Rio: PR #470 E360 page-type keep rule on revenue per 1k site  — https://mhm-finds-dw5l-14z3lo5pv-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:52 `e9e2a37` READY funnel(ledger): after-merge: Cass: PR #469 E358 biweekly issue builder + issue-08 draft (T — https://mhm-finds-dw5l-o0wu4z9f5-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:51 `b43976d` READY funnel(rio): page-type keep rule grades revenue per 1k site sessions, not page RPM (E360)  — https://mhm-finds-dw5l-4zuxukfqd-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:46 `5b41c33` READY funnel(cass): E358 biweekly issue builder (number, 14-day window, copy) + issue-08 draft ( — https://mhm-finds-dw5l-3t5bm21wg-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:46 `341b39c` READY funnel(ledger): Rowan: E362 apply 6 hand-audited content-type pins — https://mhm-finds-dw5l-clk2nnar6-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:46 `8ebdeff` READY funnel(ledger): Rowan: E362 apply heels theme 121 rows — https://mhm-finds-dw5l-93t5kxmmm-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:43 `73e22f5` READY funnel(ledger): Nova: E327 apply superseded by operator hand-approval — https://mhm-finds-dw5l-iyemxhz6q-ericputnams-projects.vercel.app
- vercel 2026-11-06T11:38 `3593e7d` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-lo501mf2x-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:27 `4afbeb2` READY funnel(ledger): after-merge: Quinn: PR #468 funnel: daily run 2026-11-05 — https://mhm-finds-dw5l-9bq1o7bdd-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:23 `7338326` READY funnel(ledger): build-watch: Quinn: PR #468 funnel: daily run 2026-11-05 — https://mhm-finds-dw5l-hds9xbqs6-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:22 `f5769bf` ERROR funnel: daily run 2026-11-05 (#468) — https://mhm-finds-dw5l-q5d55r5c2-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:19 `0321b4a` READY funnel(ledger): Nova: E340 apply 470 Mod.author rows — https://mhm-finds-dw5l-rewon1zyv-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:15 `c713e3c` READY funnel(ledger): after-merge: Nova: PR #466 E340 CurseForge author backfill for 470 unattri — https://mhm-finds-dw5l-1hvsh44v8-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:12 `aa14fc2` READY funnel(ledger): after-merge: Sage: PR #465 E338/E339 male-clothes + shoes-cc retitles — https://mhm-finds-dw5l-d686xydwj-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:12 `5f30660` READY funnel(nova): CurseForge author backfill for 470 unattributed mods (E340) (#466) — https://mhm-finds-dw5l-pb5b1zce7-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:08 `352f2a1` READY funnel(sage): male-clothes "CC & Packs" + shoes-cc Jordans/sneakers retitle (E338, E339) ( — https://mhm-finds-dw5l-8jv4hrdw1-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:07 `f230007` READY funnel(ledger): after-merge: Pip: PR #467 E337 every indexable route ships its own share c — https://mhm-finds-dw5l-capj6vr0f-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:04 `33679e1` READY funnel(ledger): after-merge: Pip: PR #462 E336 commit the missing /og-image.jpg share card — https://mhm-finds-dw5l-edbq0n3k7-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:03 `02bd8dc` READY funnel(pip): every indexable route ships its own share card (E337) (#467) — https://mhm-finds-dw5l-m1oxprhzv-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:59 `523f29a` READY funnel(ledger): after-merge: Rowan: PR #464 E343 /games/sims-4/plumbob-overrides/ on a tit — https://mhm-finds-dw5l-681eadohq-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:59 `db4d385` READY funnel(pip): commit the missing /og-image.jpg share card + scanner (E336) (#462) — https://mhm-finds-dw5l-fapq2sfdf-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:55 `265157c` READY catalog: /games/sims-4/plumbob-overrides/ on a title-only plumbob theme (E343, Tier 0) (#4 — https://mhm-finds-dw5l-i1h0ds2mc-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:55 `fd1d44d` READY funnel(ledger): after-merge: Cass: PR #463 E341 newsletter_form_view denominator on every  — https://mhm-finds-dw5l-ankut2kh0-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:51 `d3df24a` READY funnel(cass): newsletter_form_view denominator on every NewsletterSignup (E341) (#463) — https://mhm-finds-dw5l-15v0oaou4-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:51 `089a3ea` READY funnel(ledger): after-merge: Ops: PR #461 E344 next-experiment-id reserves (host-wide log  — https://mhm-finds-dw5l-gqa06w1wn-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:47 `1ca92ad` READY funnel(ops): E344 next-experiment-id reserves — host-wide log + open PRs + --hold (Tier 0) — https://mhm-finds-dw5l-7kkiop9q9-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:45 `d273368` READY funnel(ledger): after-merge: Rio: PR #460 verdict 11-05 (E342) — https://mhm-finds-dw5l-iuwtchc2v-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:44 `1e97b16` READY funnel(ledger): Rowan: E343 plumbob theme apply — https://mhm-finds-dw5l-3kjqb3h24-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:43 `1763a71` ERROR funnel(rio): verdict 11-05 — judged day held on Mediavine 11-03 sessions lag; yellow still — https://mhm-finds-dw5l-mfqbxrr2u-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:37 `3ac8328` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-cx3yafi1f-ericputnams-projects.vercel.app
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
- commit 2026-11-07T06:37 `3eb116f0` funnel(ledger): check: morning-check
- commit 2026-11-06T22:32 `02cf5fe0` chore: compound learnings from 2026-11-06
- commit 2026-11-06T07:41 `5fd27f75` funnel(ledger): after-merge: Quinn: PR #477 funnel: daily run 2026-11-06
- commit 2026-11-06T07:37 `e75a09e9` funnel: daily run 2026-11-06 (#477)
- commit 2026-11-06T07:28 `eb2ae365` funnel(ledger): after-merge: Sage: PR #476 E355 creator ProfilePage dateModified
- commit 2026-11-06T07:25 `7d12e925` funnel(sage): E355 creator ProfilePage JSON-LD carries dateModified = sitemap lastmod (Tie
- commit 2026-11-06T07:24 `089ec416` funnel(ledger): after-merge: Sage: PR #473 E354 hub CollectionPage dateModified
- commit 2026-11-06T07:21 `abf463ed` funnel(ledger): build-watch: Sage: PR #473 E354 hub CollectionPage dateModified
- commit 2026-11-06T07:20 `067ce9cc` funnel(sage): E354 hub CollectionPage dateModified = sitemap lastmod (Tier 0) (#473)
- commit 2026-11-06T07:12 `d4cfae04` funnel(ledger): after-merge: Ops: PR #472 E364 green the suite on main (catalog-count, fee
- commit 2026-11-06T07:08 `c0ba58e5` ops: green the suite on main — catalog-count, feeds, template-lastmod (E364, Tier 0) (#472
- commit 2026-11-06T07:07 `ae701f76` funnel(ledger): after-merge: Pip: PR #475 funnel(pip): E352 share link on mod + collection
- commit 2026-11-06T07:04 `9895312e` funnel(ledger): Nova: E356 apply 72 Mod.author rows
- commit 2026-11-06T07:04 `8b9d5b43` funnel(pip): E352 share link on mod + collection pages (?via=share, GA4 share) (#475)
- commit 2026-11-06T07:03 `c14804d8` funnel(ledger): after-merge: Nova: PR #471 E356 fold 6 suffix-split creator spellings into
- commit 2026-11-06T07:00 `98be44c9` funnel(ledger): after-merge: Rowan: PR #474 E362 /games/sims-4/heels-cc/ title-only heels 
- commit 2026-11-06T06:59 `0a5b98b5` funnel(nova): fold 6 suffix-split creator spellings into one page (E356) (#471)
- commit 2026-11-06T06:56 `6c0dde8d` funnel(ledger): build-watch: Rowan: PR #474 E362 /games/sims-4/heels-cc/ title-only heels 
- commit 2026-11-06T06:55 `22f99a9c` catalog: /games/sims-4/heels-cc/ on a title-only heels theme + 6 hub off-type pins (E362, 
- commit 2026-11-06T06:55 `3ac7376c` funnel(ledger): after-merge: Rio: PR #470 E360 page-type keep rule on revenue per 1k site 
- commit 2026-11-06T06:52 `e9e2a377` funnel(ledger): after-merge: Cass: PR #469 E358 biweekly issue builder + issue-08 draft (T
- commit 2026-11-06T06:51 `b43976d9` funnel(rio): page-type keep rule grades revenue per 1k site sessions, not page RPM (E360) 
- commit 2026-11-06T06:46 `5b41c332` funnel(cass): E358 biweekly issue builder (number, 14-day window, copy) + issue-08 draft (
- commit 2026-11-06T06:46 `341b39c1` funnel(ledger): Rowan: E362 apply 6 hand-audited content-type pins
- commit 2026-11-06T06:46 `8ebdeffa` funnel(ledger): Rowan: E362 apply heels theme 121 rows
- commit 2026-11-06T06:43 `73e22f51` funnel(ledger): Nova: E327 apply superseded by operator hand-approval
- commit 2026-11-06T06:38 `3593e7dd` funnel(ledger): check: morning-check
- commit 2026-11-05T04:27 `4afbeb2a` funnel(ledger): after-merge: Quinn: PR #468 funnel: daily run 2026-11-05
- commit 2026-11-05T04:23 `73383263` funnel(ledger): build-watch: Quinn: PR #468 funnel: daily run 2026-11-05
- commit 2026-11-05T07:22 `f5769bfb` funnel: daily run 2026-11-05 (#468)
- commit 2026-11-05T04:19 `0321b4ac` funnel(ledger): Nova: E340 apply 470 Mod.author rows
- commit 2026-11-05T04:15 `c713e3cd` funnel(ledger): after-merge: Nova: PR #466 E340 CurseForge author backfill for 470 unattri
- commit 2026-11-05T04:12 `aa14fc2c` funnel(ledger): after-merge: Sage: PR #465 E338/E339 male-clothes + shoes-cc retitles
- commit 2026-11-05T07:12 `5f306609` funnel(nova): CurseForge author backfill for 470 unattributed mods (E340) (#466)
- commit 2026-11-05T07:07 `352f2a1d` funnel(sage): male-clothes "CC & Packs" + shoes-cc Jordans/sneakers retitle (E338, E339) (
- commit 2026-11-05T04:07 `f230007e` funnel(ledger): after-merge: Pip: PR #467 E337 every indexable route ships its own share c
- commit 2026-11-05T04:04 `33679e15` funnel(ledger): after-merge: Pip: PR #462 E336 commit the missing /og-image.jpg share card
- commit 2026-11-05T07:03 `02bd8dcb` funnel(pip): every indexable route ships its own share card (E337) (#467)
- commit 2026-11-05T03:59 `523f29ae` funnel(ledger): after-merge: Rowan: PR #464 E343 /games/sims-4/plumbob-overrides/ on a tit
- commit 2026-11-05T06:59 `db4d3855` funnel(pip): commit the missing /og-image.jpg share card + scanner (E336) (#462)
- commit 2026-11-05T06:55 `265157ca` catalog: /games/sims-4/plumbob-overrides/ on a title-only plumbob theme (E343, Tier 0) (#4
- commit 2026-11-05T03:55 `fd1d44d2` funnel(ledger): after-merge: Cass: PR #463 E341 newsletter_form_view denominator on every 
- commit 2026-11-05T06:51 `d3df24a9` funnel(cass): newsletter_form_view denominator on every NewsletterSignup (E341) (#463)
- commit 2026-11-05T03:51 `089a3eac` funnel(ledger): after-merge: Ops: PR #461 E344 next-experiment-id reserves (host-wide log 
- commit 2026-11-05T06:47 `1ca92ad0` funnel(ops): E344 next-experiment-id reserves — host-wide log + open PRs + --hold (Tier 0)
- commit 2026-11-05T03:45 `d2733683` funnel(ledger): after-merge: Rio: PR #460 verdict 11-05 (E342)
- commit 2026-11-05T03:44 `1e97b16c` funnel(ledger): Rowan: E343 plumbob theme apply
- commit 2026-11-05T06:43 `1763a71a` funnel(rio): verdict 11-05 — judged day held on Mediavine 11-03 sessions lag; yellow still

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
