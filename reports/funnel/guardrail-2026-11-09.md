# Revenue guardrail — 2026-11-09 (last finalized day 2026-11-06)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (180 rows over 9 pages, oldest 2026-11-02T18:10Z ≤ window start 2026-11-03T05:00Z) · deploy in window: yes

rollback bound: in-window production deploys 75 (≤24 to auto-rollback) · target 3.3 h before window start (≤48 h) → withheld: in-window deploys 75 exceed rollback bound 24

- Revenue $225.96 (7.4%), RPM 19.55 (8.7%), sessions -1.3% vs same weekday, prior 4 weeks · 3-day revenue 1.5%

| | 2026-11-06 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $225.96 | $210.30 | 7.4% |
| session RPM | 19.55 | 17.99 | 8.7% |
| sessions | 11,556 | 11,704 | -1.3% |
| sessions, GA4 raw | 11,502 | 11,817 | -2.7% |
| **sessions ex Singapore (direct)** (E216, GA4) | 11,235 | 11,522 | -2.5% |
| **ex-segment RPM** (E271; MV revenue ÷ GA4 ex-segment sessions) | 20.11 | 18.25 | 10.2% → rate |
| 3-day revenue | $604.75 | $595.92 | 1.5% |
| 3-day RPM | 18.12 | 17.02 | 6.5% |

sessions ex Singapore (direct) (E216, GA4): raw 11,502 vs 11,817 (-2.7%) → ex-segment 11,235 vs 11,522 (-2.5%) · segment 267 = 2.32% of the day (controls 2.50%, 4 same weekdays)

ex-segment RPM (E216; Mediavine revenue ÷ GA4 sessions ex Singapore (direct)): $20.11 vs $18.25 (+10.2%) · mix alone predicts raw RPM +0.2% → rate (mix band ±1%)

Mediavine health: all ok

## Production changes since 2026-11-03 (72h before the judged day)

- vercel 2026-11-09T11:37 `7895670` ERROR funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-2cduhfmpn-ericputnams-projects.vercel.app
- vercel 2026-11-09T03:31 `c59a644` READY chore: compound learnings from 2026-11-08 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-qak5rsivj-ericputnams-projects.vercel.app
- vercel 2026-11-09T00:17 `6d06235` READY fix(video-queue): launchd launcher, revisions early exit, push health check (#488) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-9j1ble53z-ericputnams-projects.vercel.app
- vercel 2026-11-09T00:15 `6d06235` ERROR fix(video-queue): launchd launcher, revisions early exit, push health check (#488) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-q4v9u319m-ericputnams-projects.vercel.app
- vercel 2026-11-08T23:13 `b88a666` READY funnel(ledger): after-merge: manual [after judged day — judged tomorrow] — https://mhm-finds-dw5l-c6qro7lrd-ericputnams-projects.vercel.app
- vercel 2026-11-08T23:09 `1bf6bbc` READY feat(video-queue): phase 1, WordPress review queue + weekly/nightly video jobs (#487) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-p0zdci7xy-ericputnams-projects.vercel.app
- vercel 2026-11-08T22:45 `797b528` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7btxqlrdz-ericputnams-projects.vercel.app
- vercel 2026-11-08T03:31 `d3e5a6d` READY chore: compound learnings from 2026-11-07 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-aeg26o7s2-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:36 `71f234d` READY funnel(ledger): after-merge: Nova: PR #486 E370 Patreon author backfill [after judged day — judged tomorrow] — https://mhm-finds-dw5l-lvsw4817h-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:32 `c83d8f7` READY funnel(nova): E370 Patreon author backfill — 3,050 unattributed mods onto creator pages (T [after judged day — judged tomorrow] — https://mhm-finds-dw5l-5xgpdfkuh-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:28 `ba28bb2` READY fix(seo): ProfilePage dateModified as an ISO 8601 DateTime (#485) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-b63ebt0r6-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:12 `78e0f24` READY funnel(ledger): after-merge: Sage: PR #483 E368 cas-backgrounds + E369 facial-hair-cc hubs [after judged day — judged tomorrow] — https://mhm-finds-dw5l-6hxil5h0c-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:08 `c3332fa` READY funnel(sage): E368 cas-backgrounds + E369 facial-hair-cc hubs (Tier 0) (#483) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ojywd7be0-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:06 `0a49b8b` READY funnel(ledger): after-merge: Rio: PR #479 verdict 11-07 — 11-04 one-day CPM dip, E342 KEEP [after judged day — judged tomorrow] — https://mhm-finds-dw5l-kvh0k8etz-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:04 `276fed4` READY funnel(rio): verdict 11-07 — 11-04 one-day CPM dip (−4.9%), 11-05 rate +2.1%, 7d −7.5% is  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-gifimqtcp-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:03 `2ed6085` READY funnel(ledger): after-merge: Pip: PR #484 E367 hub blog-twin anchor names the twin [after judged day — judged tomorrow] — https://mhm-finds-dw5l-gfyfpvl3f-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:00 `d42b8a4` READY funnel(pip): E367 hub -> blog twin link names the twin instead of "Full article on the blo [after judged day — judged tomorrow] — https://mhm-finds-dw5l-oenj4s3yk-ericputnams-projects.vercel.app
- vercel 2026-11-07T12:00 `db077a2` READY funnel(ledger): after-merge: Rowan: PR #482 E373 hello-kitty-cc collection page [after judged day — judged tomorrow] — https://mhm-finds-dw5l-c9ax589mk-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:56 `58b58bc` READY catalog: /games/sims-4/hello-kitty-cc/ on a title-only sanrio theme + 7 content-type pins  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-9xx6blp01-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:55 `bca4ef0` READY funnel(ledger): after-merge: Pip: PR #481 E366 hub links to the 8 Bing-losing guides [after judged day — judged tomorrow] — https://mhm-finds-dw5l-hh56lnqd3-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:52 `6a517db` READY funnel(pip): E366 hub links to the 8 Bing-losing guides with no Next.js inbound link (Tier [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1egolc438-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:51 `d153e79` READY funnel(ledger): after-merge: Ops: PR #480 E374 preflight model fallback on QUOTA [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fh8p6cidd-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:49 `d5d2923` READY funnel(ledger): Rowan: E373 pin correction [after judged day — judged tomorrow] — https://mhm-finds-dw5l-3r7vrvwsw-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:48 `b4c8e7b` READY funnel(ledger): after-merge: Cass: PR #478 E371 list the 2 unlisted scripted-shaped subscr [after judged day — judged tomorrow] — https://mhm-finds-dw5l-k3vt7jzp2-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:48 `7fa9786` READY funnel(ops): E374 preflight falls back to another model on QUOTA (429) instead of MISSING  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7jbzqnui1-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:46 `10d4444` READY funnel(ledger): Sage: E368/E369 hub off-type pins apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-r6hxlkr55-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:45 `28203c3` READY funnel(ledger): Rowan: E373 content-type pins apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fiec30b10-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:45 `78e3753` READY funnel(ledger): Rowan: E373 sanrio theme apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ehpgg2dmg-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:44 `e76f989` READY funnel(cass): E371 list the 2 unlisted scripted-shaped subscribers before newsletter-08 (T [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1nrlcbjhf-ericputnams-projects.vercel.app
- vercel 2026-11-07T11:37 `3eb116f` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-eg1229wiu-ericputnams-projects.vercel.app
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
- vercel 2026-11-04T15:46 `81c8833` READY funnel(ledger): after-merge: Quinn: PR #459 funnel: daily run 2026-11-04 — https://mhm-finds-dw5l-atutuyhn4-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:42 `00332c0` READY funnel: daily run 2026-11-04 (#459) — https://mhm-finds-dw5l-jefjpeama-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:40 `954763e` READY funnel(ledger): after-merge: Pip: PR #458 E335 IndexNow pushes every sitemap-nextjs conten — https://mhm-finds-dw5l-qm5xam25l-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:36 `b503a8e` READY funnel(pip): IndexNow pushes every sitemap-nextjs content page (E335) (#458) — https://mhm-finds-dw5l-1t8eay4w7-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:34 `ce20a38` READY funnel(ledger): after-merge: Pip: PR #454 E333 social-draft drops /sign-in/ + skips pendin — https://mhm-finds-dw5l-g56vpu82e-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:30 `cdd9f2e` READY funnel(pip): social-draft drops /sign-in/ + skips pending destinations (E333) (#454) — https://mhm-finds-dw5l-a2zimr8i5-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:28 `4331965` READY funnel(ledger): after-merge: Rio: PR #455 E332 yellow verdict 2026-11-04 (paper) + Q32 clo — https://mhm-finds-dw5l-6pq2tmk4r-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:26 `8181dcd` READY funnel(ledger): after-merge: Ops: PR #453 E331 preflight QUOTA kind + never-empty excerpt — https://mhm-finds-dw5l-4vgfju0pr-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:26 `c88e2e5` READY funnel(rio): E332 yellow verdict 2026-11-04 — Halloween Saturday volume (90% of 3-day gap) — https://mhm-finds-dw5l-2s961ed56-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:22 `29bd5a5` READY funnel(ledger): build-watch: Ops: PR #453 E331 preflight QUOTA kind + never-empty excerpt — https://mhm-finds-dw5l-aiikfosqg-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:22 `58e1826` ERROR funnel(ops): preflight QUOTA kind + never-empty excerpt (E331) (#453) — https://mhm-finds-dw5l-ro12ziffu-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:21 `f5bf99f` READY funnel(ledger): after-merge: Sage: PR #457 E330 cottagecore-cc CC & Mods retitle — https://mhm-finds-dw5l-j7dcm8bw9-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:17 `7dcae0f` READY funnel(ledger): after-merge: Rowan: PR #456 E328 Atino00 content-type pins (Tier 0) — https://mhm-finds-dw5l-6dgwclg73-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:17 `a530bee` READY funnel(sage): E330 cottagecore-cc head-term retitle "CC & Mods" + browse-intent test green — https://mhm-finds-dw5l-rbpa0ijb6-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:13 `b23f2b7` READY funnel(ledger): after-merge: Sage: PR #452 E329 COLLECTION_TEMPLATE_LASTMOD → 2026-11-02 — https://mhm-finds-dw5l-84izwt3dq-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:13 `108f5d4` READY funnel(rowan): E328 hand-audited content-type pins for the 7 Atino00 submission mods (Tier — https://mhm-finds-dw5l-j33fs6875-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:09 `82b9023` READY funnel(ledger): after-merge: Cass: PR #451 E327 sign-up opt-in checkbox copy A/B — https://mhm-finds-dw5l-optgf3uh2-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:09 `65517c9` READY funnel(sage): E329 COLLECTION_TEMPLATE_LASTMOD → 2026-11-02 (#442 changed the hub template — https://mhm-finds-dw5l-1hgx8zc8k-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:05 `4d4f14d` READY funnel(ledger): after-merge: Nova: PR #450 E327 per-batch approval plan + frozen plan for  — https://mhm-finds-dw5l-msahb3sii-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:05 `d638131` READY funnel(cass): E327 sign-up opt-in checkbox copy A/B (Tier 0) (#451) — https://mhm-finds-dw5l-e0azmjsla-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:02 `6088736` READY funnel(ledger): Rowan: E328 apply (Atino00 content-type pins) — https://mhm-finds-dw5l-4wmx604q2-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:00 `d8cc4ac` READY funnel(nova): E327 per-batch approval plan (--plan=) + frozen plan for 3 Atino00 submissio — https://mhm-finds-dw5l-5uhqj57ja-ericputnams-projects.vercel.app
- vercel 2026-11-04T14:53 `6fc912e` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-9vc1xqhks-ericputnams-projects.vercel.app
- vercel 2026-11-04T03:31 `c5d9b34` READY chore: compound learnings from 2026-11-03 — https://mhm-finds-dw5l-426hfky48-ericputnams-projects.vercel.app
- vercel 2026-11-03T11:38 `89ecfc5` READY funnel(ledger): degraded digest 2026-11-03 landed by runner (Quinn did not run — MISSED re — https://mhm-finds-dw5l-reppabfxw-ericputnams-projects.vercel.app
- vercel 2026-11-03T11:38 `c84ebf6` READY funnel(ledger): MISSED 2026-11-03 preflight=OTHER — https://mhm-finds-dw5l-30dk5c9o3-ericputnams-projects.vercel.app
- vercel 2026-11-03T11:37 `1579421` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-6jyk6tg79-ericputnams-projects.vercel.app
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
- commit 2026-11-05T03:37 `3ac83287` funnel(ledger): check: morning-check
- commit 2026-11-04T07:46 `81c88335` funnel(ledger): after-merge: Quinn: PR #459 funnel: daily run 2026-11-04
- commit 2026-11-04T10:42 `00332c03` funnel: daily run 2026-11-04 (#459)
- commit 2026-11-04T07:40 `954763e8` funnel(ledger): after-merge: Pip: PR #458 E335 IndexNow pushes every sitemap-nextjs conten
- commit 2026-11-04T10:36 `b503a8ec` funnel(pip): IndexNow pushes every sitemap-nextjs content page (E335) (#458)
- commit 2026-11-04T07:34 `ce20a38c` funnel(ledger): after-merge: Pip: PR #454 E333 social-draft drops /sign-in/ + skips pendin
- commit 2026-11-04T10:30 `cdd9f2e7` funnel(pip): social-draft drops /sign-in/ + skips pending destinations (E333) (#454)
- commit 2026-11-04T07:28 `4331965d` funnel(ledger): after-merge: Rio: PR #455 E332 yellow verdict 2026-11-04 (paper) + Q32 clo
- commit 2026-11-04T07:26 `8181dcd4` funnel(ledger): after-merge: Ops: PR #453 E331 preflight QUOTA kind + never-empty excerpt
- commit 2026-11-04T10:26 `c88e2e57` funnel(rio): E332 yellow verdict 2026-11-04 — Halloween Saturday volume (90% of 3-day gap)
- commit 2026-11-04T07:22 `29bd5a51` funnel(ledger): build-watch: Ops: PR #453 E331 preflight QUOTA kind + never-empty excerpt
- commit 2026-11-04T10:22 `58e18265` funnel(ops): preflight QUOTA kind + never-empty excerpt (E331) (#453)
- commit 2026-11-04T07:21 `f5bf99f3` funnel(ledger): after-merge: Sage: PR #457 E330 cottagecore-cc CC & Mods retitle
- commit 2026-11-04T07:17 `7dcae0fc` funnel(ledger): after-merge: Rowan: PR #456 E328 Atino00 content-type pins (Tier 0)
- commit 2026-11-04T10:17 `a530bee4` funnel(sage): E330 cottagecore-cc head-term retitle "CC & Mods" + browse-intent test green
- commit 2026-11-04T07:13 `b23f2b7f` funnel(ledger): after-merge: Sage: PR #452 E329 COLLECTION_TEMPLATE_LASTMOD → 2026-11-02
- commit 2026-11-04T10:13 `108f5d4d` funnel(rowan): E328 hand-audited content-type pins for the 7 Atino00 submission mods (Tier
- commit 2026-11-04T07:09 `82b90230` funnel(ledger): after-merge: Cass: PR #451 E327 sign-up opt-in checkbox copy A/B
- commit 2026-11-04T10:09 `65517c9a` funnel(sage): E329 COLLECTION_TEMPLATE_LASTMOD → 2026-11-02 (#442 changed the hub template
- commit 2026-11-04T07:05 `4d4f14d1` funnel(ledger): after-merge: Nova: PR #450 E327 per-batch approval plan + frozen plan for 
- commit 2026-11-04T10:05 `d6381314` funnel(cass): E327 sign-up opt-in checkbox copy A/B (Tier 0) (#451)
- commit 2026-11-04T07:02 `60887367` funnel(ledger): Rowan: E328 apply (Atino00 content-type pins)
- commit 2026-11-04T10:00 `d8cc4acb` funnel(nova): E327 per-batch approval plan (--plan=) + frozen plan for 3 Atino00 submissio
- commit 2026-11-04T06:53 `6fc912eb` funnel(ledger): check: morning-check
- commit 2026-11-03T22:31 `c5d9b344` chore: compound learnings from 2026-11-03
- commit 2026-11-03T06:38 `89ecfc50` funnel(ledger): degraded digest 2026-11-03 landed by runner (Quinn did not run — MISSED re
- commit 2026-11-03T06:38 `c84ebf67` funnel(ledger): MISSED 2026-11-03 preflight=OTHER

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
