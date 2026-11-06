# Revenue guardrail — 2026-11-06 (last finalized day 2026-11-03)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (200 rows over 10 pages, oldest 2026-10-30T12:06Z ≤ window start 2026-10-31T04:00Z) · deploy in window: yes

rollback bound: in-window production deploys 84 (≤24 to auto-rollback) · target 1.5 h before window start (≤48 h) → withheld: in-window deploys 84 exceed rollback bound 24

- Revenue $211.53 (12.0%), RPM 18.26 (12.3%), sessions -0.5% vs same weekday, prior 4 weeks · 3-day revenue 2.4%

| | 2026-11-03 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $211.53 | $188.80 | 12.0% |
| session RPM | 18.26 | 16.26 | 12.3% |
| sessions | 11,580 | 11,644 | -0.5% |
| sessions, GA4 raw | 11,562 | 11,764 | -1.7% |
| **sessions ex Singapore (direct)** (E216, GA4) | 11,305 | 11,295 | 0.1% |
| **ex-segment RPM** (E271; MV revenue ÷ GA4 ex-segment sessions) | 18.71 | 16.72 | 11.9% → rate |
| 3-day revenue | $642.43 | $627.48 | 2.4% |
| 3-day RPM | 17.28 | 15.74 | 9.8% |

sessions ex Singapore (direct) (E216, GA4): raw 11,562 vs 11,764 (-1.7%) → ex-segment 11,305 vs 11,295 (+0.1%) · segment 257 = 2.22% of the day (controls 3.98%, 4 same weekdays)

ex-segment RPM (E216; Mediavine revenue ÷ GA4 sessions ex Singapore (direct)): $18.71 vs $16.72 (+11.9%) · mix alone predicts raw RPM +1.8% → rate (mix band ±1%)

Mediavine health: all ok

## Production changes since 2026-10-31 (72h before the judged day)

- vercel 2026-11-06T11:38 `3593e7d` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-lo501mf2x-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:27 `4afbeb2` READY funnel(ledger): after-merge: Quinn: PR #468 funnel: daily run 2026-11-05 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-9bq1o7bdd-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:23 `7338326` READY funnel(ledger): build-watch: Quinn: PR #468 funnel: daily run 2026-11-05 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-hds9xbqs6-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:22 `f5769bf` ERROR funnel: daily run 2026-11-05 (#468) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-q5d55r5c2-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:19 `0321b4a` READY funnel(ledger): Nova: E340 apply 470 Mod.author rows [after judged day — judged tomorrow] — https://mhm-finds-dw5l-rewon1zyv-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:15 `c713e3c` READY funnel(ledger): after-merge: Nova: PR #466 E340 CurseForge author backfill for 470 unattri [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1hvsh44v8-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:12 `aa14fc2` READY funnel(ledger): after-merge: Sage: PR #465 E338/E339 male-clothes + shoes-cc retitles [after judged day — judged tomorrow] — https://mhm-finds-dw5l-d686xydwj-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:12 `5f30660` READY funnel(nova): CurseForge author backfill for 470 unattributed mods (E340) (#466) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-pb5b1zce7-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:08 `352f2a1` READY funnel(sage): male-clothes "CC & Packs" + shoes-cc Jordans/sneakers retitle (E338, E339) ( [after judged day — judged tomorrow] — https://mhm-finds-dw5l-8jv4hrdw1-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:07 `f230007` READY funnel(ledger): after-merge: Pip: PR #467 E337 every indexable route ships its own share c [after judged day — judged tomorrow] — https://mhm-finds-dw5l-capj6vr0f-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:04 `33679e1` READY funnel(ledger): after-merge: Pip: PR #462 E336 commit the missing /og-image.jpg share card [after judged day — judged tomorrow] — https://mhm-finds-dw5l-edbq0n3k7-ericputnams-projects.vercel.app
- vercel 2026-11-05T12:03 `02bd8dc` READY funnel(pip): every indexable route ships its own share card (E337) (#467) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-m1oxprhzv-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:59 `523f29a` READY funnel(ledger): after-merge: Rowan: PR #464 E343 /games/sims-4/plumbob-overrides/ on a tit [after judged day — judged tomorrow] — https://mhm-finds-dw5l-681eadohq-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:59 `db4d385` READY funnel(pip): commit the missing /og-image.jpg share card + scanner (E336) (#462) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fapq2sfdf-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:55 `265157c` READY catalog: /games/sims-4/plumbob-overrides/ on a title-only plumbob theme (E343, Tier 0) (#4 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-i1h0ds2mc-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:55 `fd1d44d` READY funnel(ledger): after-merge: Cass: PR #463 E341 newsletter_form_view denominator on every  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ankut2kh0-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:51 `d3df24a` READY funnel(cass): newsletter_form_view denominator on every NewsletterSignup (E341) (#463) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-15v0oaou4-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:51 `089a3ea` READY funnel(ledger): after-merge: Ops: PR #461 E344 next-experiment-id reserves (host-wide log  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-gqa06w1wn-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:47 `1ca92ad` READY funnel(ops): E344 next-experiment-id reserves — host-wide log + open PRs + --hold (Tier 0) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-7kkiop9q9-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:45 `d273368` READY funnel(ledger): after-merge: Rio: PR #460 verdict 11-05 (E342) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-iuwtchc2v-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:44 `1e97b16` READY funnel(ledger): Rowan: E343 plumbob theme apply [after judged day — judged tomorrow] — https://mhm-finds-dw5l-3kjqb3h24-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:43 `1763a71` ERROR funnel(rio): verdict 11-05 — judged day held on Mediavine 11-03 sessions lag; yellow still [after judged day — judged tomorrow] — https://mhm-finds-dw5l-mfqbxrr2u-ericputnams-projects.vercel.app
- vercel 2026-11-05T11:37 `3ac8328` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-cx3yafi1f-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:46 `81c8833` READY funnel(ledger): after-merge: Quinn: PR #459 funnel: daily run 2026-11-04 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-atutuyhn4-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:42 `00332c0` READY funnel: daily run 2026-11-04 (#459) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-jefjpeama-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:40 `954763e` READY funnel(ledger): after-merge: Pip: PR #458 E335 IndexNow pushes every sitemap-nextjs conten [after judged day — judged tomorrow] — https://mhm-finds-dw5l-qm5xam25l-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:36 `b503a8e` READY funnel(pip): IndexNow pushes every sitemap-nextjs content page (E335) (#458) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1t8eay4w7-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:34 `ce20a38` READY funnel(ledger): after-merge: Pip: PR #454 E333 social-draft drops /sign-in/ + skips pendin [after judged day — judged tomorrow] — https://mhm-finds-dw5l-g56vpu82e-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:30 `cdd9f2e` READY funnel(pip): social-draft drops /sign-in/ + skips pending destinations (E333) (#454) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-a2zimr8i5-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:28 `4331965` READY funnel(ledger): after-merge: Rio: PR #455 E332 yellow verdict 2026-11-04 (paper) + Q32 clo [after judged day — judged tomorrow] — https://mhm-finds-dw5l-6pq2tmk4r-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:26 `8181dcd` READY funnel(ledger): after-merge: Ops: PR #453 E331 preflight QUOTA kind + never-empty excerpt [after judged day — judged tomorrow] — https://mhm-finds-dw5l-4vgfju0pr-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:26 `c88e2e5` READY funnel(rio): E332 yellow verdict 2026-11-04 — Halloween Saturday volume (90% of 3-day gap) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-2s961ed56-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:22 `29bd5a5` READY funnel(ledger): build-watch: Ops: PR #453 E331 preflight QUOTA kind + never-empty excerpt [after judged day — judged tomorrow] — https://mhm-finds-dw5l-aiikfosqg-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:22 `58e1826` ERROR funnel(ops): preflight QUOTA kind + never-empty excerpt (E331) (#453) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ro12ziffu-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:21 `f5bf99f` READY funnel(ledger): after-merge: Sage: PR #457 E330 cottagecore-cc CC & Mods retitle [after judged day — judged tomorrow] — https://mhm-finds-dw5l-j7dcm8bw9-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:17 `7dcae0f` READY funnel(ledger): after-merge: Rowan: PR #456 E328 Atino00 content-type pins (Tier 0) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-6dgwclg73-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:17 `a530bee` READY funnel(sage): E330 cottagecore-cc head-term retitle "CC & Mods" + browse-intent test green [after judged day — judged tomorrow] — https://mhm-finds-dw5l-rbpa0ijb6-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:13 `b23f2b7` READY funnel(ledger): after-merge: Sage: PR #452 E329 COLLECTION_TEMPLATE_LASTMOD → 2026-11-02 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-84izwt3dq-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:13 `108f5d4` READY funnel(rowan): E328 hand-audited content-type pins for the 7 Atino00 submission mods (Tier [after judged day — judged tomorrow] — https://mhm-finds-dw5l-j33fs6875-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:09 `82b9023` READY funnel(ledger): after-merge: Cass: PR #451 E327 sign-up opt-in checkbox copy A/B [after judged day — judged tomorrow] — https://mhm-finds-dw5l-optgf3uh2-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:09 `65517c9` READY funnel(sage): E329 COLLECTION_TEMPLATE_LASTMOD → 2026-11-02 (#442 changed the hub template [after judged day — judged tomorrow] — https://mhm-finds-dw5l-1hgx8zc8k-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:05 `4d4f14d` READY funnel(ledger): after-merge: Nova: PR #450 E327 per-batch approval plan + frozen plan for  [after judged day — judged tomorrow] — https://mhm-finds-dw5l-msahb3sii-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:05 `d638131` READY funnel(cass): E327 sign-up opt-in checkbox copy A/B (Tier 0) (#451) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-e0azmjsla-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:02 `6088736` READY funnel(ledger): Rowan: E328 apply (Atino00 content-type pins) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-4wmx604q2-ericputnams-projects.vercel.app
- vercel 2026-11-04T15:00 `d8cc4ac` READY funnel(nova): E327 per-batch approval plan (--plan=) + frozen plan for 3 Atino00 submissio [after judged day — judged tomorrow] — https://mhm-finds-dw5l-5uhqj57ja-ericputnams-projects.vercel.app
- vercel 2026-11-04T14:53 `6fc912e` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-9vc1xqhks-ericputnams-projects.vercel.app
- vercel 2026-11-04T03:31 `c5d9b34` READY chore: compound learnings from 2026-11-03 — https://mhm-finds-dw5l-426hfky48-ericputnams-projects.vercel.app
- vercel 2026-11-03T11:38 `89ecfc5` READY funnel(ledger): degraded digest 2026-11-03 landed by runner (Quinn did not run — MISSED re — https://mhm-finds-dw5l-reppabfxw-ericputnams-projects.vercel.app
- vercel 2026-11-03T11:38 `c84ebf6` READY funnel(ledger): MISSED 2026-11-03 preflight=OTHER — https://mhm-finds-dw5l-30dk5c9o3-ericputnams-projects.vercel.app
- vercel 2026-11-03T11:37 `1579421` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-6jyk6tg79-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:40 `049e40d` READY funnel(ledger): after-merge: manual — https://mhm-finds-dw5l-12v4azxhd-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:36 `bfaf5c5` READY feat(pip): animated short-video renderer (kinetic hook, whip-in cards, SFX) (#448) — https://mhm-finds-dw5l-1422v999u-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:34 `6689d82` READY funnel(ledger): after-merge: manual — https://mhm-finds-dw5l-g196gu9r4-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:08 `cc5da96` READY funnel(ledger): after-merge: manual — https://mhm-finds-dw5l-gvq5t92ft-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:04 `1c7c5d2` READY funnel(ledger): build-watch: manual — https://mhm-finds-dw5l-6ceq8zj2l-ericputnams-projects.vercel.app
- vercel 2026-11-03T01:03 `da73e41` ERROR feat(funnel): operator Pinterest + Tumblr freeze (#446) — https://mhm-finds-dw5l-6v4bdpv63-ericputnams-projects.vercel.app
- vercel 2026-11-03T00:50 `8bdbe74` ERROR funnel(queue): operator reply Q32: done — Mediavine token renewed (#445) — https://mhm-finds-dw5l-6jexxksie-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:28 `b9c029c` READY funnel(ledger): digest 2026-11-02 landed by runner (daily PR did not merge) — https://mhm-finds-dw5l-dw34gehjw-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:18 `c9144fd` READY funnel(ledger): after-merge: Ops: PR #444 E326 merge-gate releases on MERGED, not on TTL ( — https://mhm-finds-dw5l-pazti5j6y-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:14 `8cbcddd` READY E326 merge-gate releases on MERGED, not on TTL (Tier 0, Ops) (#444) — https://mhm-finds-dw5l-15y62tc6c-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:10 `a821e9d` READY funnel(rio): E324 RPM read 2026-11-02 — 10-31 is volume (87% sessions), 11-01 at 107.5% of — https://mhm-finds-dw5l-p1c9x17h6-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:06 `611e7d4` READY funnel(sage): E320 body-presets hub head-term retitle + 3 body-preset guides (Tier 0) (#44 — https://mhm-finds-dw5l-cdywiuxp0-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:06 `147ad12` READY funnel(ledger): after-merge: Cass: PR #442 E323 collection-hub email capture directly unde — https://mhm-finds-dw5l-3fm0ue79m-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:02 `5752e2b` READY funnel(ledger): build-watch: Cass: PR #442 E323 collection-hub email capture directly unde — https://mhm-finds-dw5l-it49qhphb-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:02 `1bec59d` ERROR funnel(cass): E323 collection-hub email capture directly under the grid (Tier 0) (#442) — https://mhm-finds-dw5l-mv46hsggd-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:01 `db54465` READY funnel(ledger): after-merge: Nova: PR #440 E322 approved submissions publish their mod (is — https://mhm-finds-dw5l-8f364pq50-ericputnams-projects.vercel.app
- vercel 2026-11-02T18:00 `46ccd1a` READY funnel(ledger): Pip: E319 piercings-cc catalog pin apply — https://mhm-finds-dw5l-r7wpmmi5t-ericputnams-projects.vercel.app
- vercel 2026-11-02T17:58 `6715f58` READY funnel(ledger): Nova: E322 apply isVerified backfill (7 Atino00 mods) — https://mhm-finds-dw5l-68vnzcqt8-ericputnams-projects.vercel.app
- vercel 2026-11-02T17:58 `73e67ad` READY E322 approved submissions publish their mod (isVerified true) + scoped backfill (Tier 0) ( — https://mhm-finds-dw5l-43lt2hskb-ericputnams-projects.vercel.app
- vercel 2026-11-02T11:39 `9d31ba4` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-57jvmb71w-ericputnams-projects.vercel.app
- vercel 2026-11-02T04:08 `709c7e3` READY chore: compound learnings from 2026-11-01 — https://mhm-finds-dw5l-9n0rxgduf-ericputnams-projects.vercel.app
- vercel 2026-11-01T23:04 `df94a00` ERROR funnel: registry row E312 (2026-11-01 evening) (#438) — https://mhm-finds-dw5l-j3a8hdqjm-ericputnams-projects.vercel.app
- vercel 2026-11-01T23:03 `5d6d8b3` READY funnel(ledger): after-merge: Sage: PR #437 E312 BreadcrumbList JSON-LD on every collection — https://mhm-finds-dw5l-8cdn71zsz-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:59 `9591f9f` READY funnel(ledger): build-watch: Sage: PR #437 E312 BreadcrumbList JSON-LD on every collection — https://mhm-finds-dw5l-ed4re7qqg-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:58 `c676c75` ERROR E312 BreadcrumbList JSON-LD on every collection hub, mirroring the visible crumbs (Tier 0) — https://mhm-finds-dw5l-k4tyu0gor-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:56 `0c986ce` READY funnel(ledger): after-merge: Quinn: PR #436 funnel: registry rows E311 + E316 (2026-11-01) — https://mhm-finds-dw5l-6sqdqtgfr-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:54 `edbd25a` READY funnel: registry rows E311 + E316 (2026-11-01 evening) (#436) — https://mhm-finds-dw5l-ir3w90jzg-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:53 `c6548a8` READY funnel(ledger): after-merge: Sage: PR #435 E311 hair-cc hub: head-term retitle + 6 ranking — https://mhm-finds-dw5l-33hajyzzo-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:50 `d552b84` READY E311 hair-cc hub: head-term retitle + 6 ranking hair articles as guides (Tier 0) (#435) — https://mhm-finds-dw5l-mnil8xo7r-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:49 `5d038aa` ERROR funnel(ledger): after-merge: Rowan: PR #434 E316 /games/sims-4/piercings-cc/ — title-only  — https://mhm-finds-dw5l-1t2xaza44-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:46 `f7838fb` READY E316: /games/sims-4/piercings-cc/ — title-only piercing theme + traffic page (Tier 0) (#43 — https://mhm-finds-dw5l-2jjj5ay5s-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:45 `985dafd` READY funnel(ledger): after-merge: Quinn: PR #433 funnel: daily run 2026-11-01 — https://mhm-finds-dw5l-4ucz1tl6r-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:43 `de8fca9` READY funnel(ledger): Rowan: E316 piercing retag apply — https://mhm-finds-dw5l-50aqu6bkr-ericputnams-projects.vercel.app
- vercel 2026-11-01T22:42 `623ca7b` READY funnel: daily run 2026-11-01 (#433) — https://mhm-finds-dw5l-lj0jnl5gg-ericputnams-projects.vercel.app
- vercel 2026-11-01T16:37 `42a3bfe` READY funnel(ledger): after-merge: Nova: PR #432 E304 apply: 7/7 Atino00 submissions approved; f — https://mhm-finds-dw5l-1opcb7o8z-ericputnams-projects.vercel.app
- vercel 2026-11-01T16:20 `a1dc3ff` READY funnel(ledger): Pip: PR #430 hand smoke PASS (correcting row) — https://mhm-finds-dw5l-3580z3o3p-ericputnams-projects.vercel.app
- vercel 2026-11-01T15:37 `79b8797` READY E304 apply: 7/7 Atino00 submissions approved; fix one-account-N-rows profile collision (Ti — https://mhm-finds-dw5l-7kh0x5dci-ericputnams-projects.vercel.app
- vercel 2026-11-01T15:36 `ba4ef78` READY funnel(ledger): after-merge: Ops: PR #431 E317 deploy-verify renders every collection page — https://mhm-finds-dw5l-lkb1wg7r5-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:48 `c0b60dd` READY funnel(ops): E317 — deploy-verify renders every collection page the merged sha adds (Tier  — https://mhm-finds-dw5l-rb4shj89p-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:48 `d95025e` READY funnel(ledger): after-merge: Nova: PR #427 test(approval): assert the shared builder's row — https://mhm-finds-dw5l-bx55j5keg-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:48 `1f78913` READY funnel(ledger): after-merge: Pip: PR #430 E309 christmas-cc + E310 female-clothes catalog  — https://mhm-finds-dw5l-gy37hp5uw-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:31 `097170c` ERROR funnel(ledger): after-merge: Cass: PR #429 E314 newsletter cadence copy says every two wee — https://mhm-finds-dw5l-4yq4s4485-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:14 `594d30a` READY test(approval): assert the approve route writes the shared builder's row (fixes main red s — https://mhm-finds-dw5l-d3j3ffel4-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:14 `1c36226` ERROR funnel(ledger): after-merge: Quinn: PR #426 funnel: operator watch 2026-11-01 — https://mhm-finds-dw5l-d8xsqtkg3-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:14 `352ffb6` READY funnel(ledger): after-merge: Rio: PR #428 E315 verdict 2026-11-01 (paper-only) — https://mhm-finds-dw5l-i9zqol0q2-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:08 `911723d` READY funnel(pip): E309 christmas-cc + E310 female-clothes catalog pins (Tier 0) (#430) — https://mhm-finds-dw5l-iojtc1ofa-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:02 `1bf0861` ERROR funnel(ledger): Pip: E310 female-clothes catalog pin apply — https://mhm-finds-dw5l-4ekkct4jy-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:02 `d184af8` READY funnel(ledger): Pip: E309 christmas-cc catalog pin apply — https://mhm-finds-dw5l-8ozej1pz8-ericputnams-projects.vercel.app
- vercel 2026-11-01T14:01 `4dd4ccc` READY funnel(cass): E314 newsletter cadence copy says "every two weeks" + guard (Tier 0) (#429) — https://mhm-finds-dw5l-ecpy73the-ericputnams-projects.vercel.app
- vercel 2026-11-01T13:44 `5d65b0b` READY funnel(rio): E315 verdict 2026-11-01 — 10-30 rate day, E288 tracker WIRE 7/7, ramp is a vo — https://mhm-finds-dw5l-bcagr7akw-ericputnams-projects.vercel.app
- vercel 2026-11-01T13:25 `92023de` READY funnel: operator watch 2026-11-01 — BELOW LINE (#426) — https://mhm-finds-dw5l-o1t7k6usk-ericputnams-projects.vercel.app
- vercel 2026-11-01T12:37 `634edcb` READY funnel(ledger): after-merge: Quinn: PR #425 funnel: operator watch 2026-10-31 — https://mhm-finds-dw5l-mo0vcmyo6-ericputnams-projects.vercel.app
- vercel 2026-11-01T12:19 `ca53d53` READY funnel: operator watch 2026-10-31 (#425) — https://mhm-finds-dw5l-pl41pgb88-ericputnams-projects.vercel.app
- vercel 2026-11-01T11:37 `d19b1db` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-8xdqb3ers-ericputnams-projects.vercel.app
- vercel 2026-11-01T02:48 `beeb3a9` ERROR chore: compound learnings from 2026-10-31 — https://mhm-finds-dw5l-3trlnzdjp-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:37 `036d31a` READY funnel(ledger): after-merge: Quinn: PR #424 funnel: daily run 2026-10-31 — https://mhm-finds-dw5l-azxezrvh6-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:33 `10b9e4a` READY funnel(ledger): build-watch: Quinn: PR #424 funnel: daily run 2026-10-31 — https://mhm-finds-dw5l-csn7b7pug-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:32 `83d7d19` ERROR funnel: daily run 2026-10-31 (#424) — https://mhm-finds-dw5l-l41mha4k4-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:29 `7f2f68e` READY funnel(ledger): after-merge: Sage: PR #423 E302 Creators in this collection — hubs link do — https://mhm-finds-dw5l-5ouwcdobx-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:25 `66238d1` READY funnel(ledger): build-watch: Sage: PR #423 E302 Creators in this collection — hubs link do — https://mhm-finds-dw5l-lu6zy6p2z-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:24 `214ac2b` ERROR funnel(sage): E302 "Creators in this collection" — hubs link down to the creator pages tha — https://mhm-finds-dw5l-pxjr3qt4x-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:22 `821dd41` READY funnel(ledger): after-merge: Rio: PR #420 E306 verdict 2026-10-31 (paper-only) — https://mhm-finds-dw5l-p1rgf7se4-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:21 `dfc911b` READY funnel(ledger): after-merge: Sage: PR #422 E303 template lastmod git guard + IndexNow --cr — https://mhm-finds-dw5l-iyacfem47-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:20 `0f04e2d` READY funnel(rio): E306 verdict 2026-10-31 — October closes $144 (MISSED), 10-29 rate day, E271  — https://mhm-finds-dw5l-f1trngijz-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:18 `dbf85cb` ERROR funnel(ledger): after-merge: Pip: PR #418 E300 runway top-up #20 artifacts + E301 social d — https://mhm-finds-dw5l-m9vsyhcam-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:16 `49a55ef` READY funnel(pip): E300 runway top-up #20 artifacts + E301 social draft batch 2026-10-31 (paper- — https://mhm-finds-dw5l-8i6huc4n8-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:12 `9ef6031` READY funnel(sage): E303 template lastmod git guard + IndexNow --creator-slugs for the 14 E293 p — https://mhm-finds-dw5l-q8y5csc13-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:11 `e0539d6` READY funnel(ledger): after-merge: Nova: PR #421 E304 ownership-gated approval path for creator  — https://mhm-finds-dw5l-fuw50f4xn-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:07 `5c69ff0` READY funnel(nova): E304 ownership-gated approval path for creator submissions (Tier 0 code; app — https://mhm-finds-dw5l-bynvg67pv-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:07 `0b08fe5` READY funnel(ledger): after-merge: Rowan: PR #419 E307 /games/sims-4/christmas-cc/ on a title-on — https://mhm-finds-dw5l-n3kxc4xcz-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:03 `49cdb66` READY funnel(rowan): E307 /games/sims-4/christmas-cc/ on a title-only christmas theme (Tier 0) ( — https://mhm-finds-dw5l-r9jbxktcq-ericputnams-projects.vercel.app
- vercel 2026-10-31T11:02 `a2c729e` READY funnel(ledger): after-merge: Rio: PR #416 E306 affiliate-pipe-read GA4 leg — Impact and th — https://mhm-finds-dw5l-ordc7jke5-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:59 `5b6f1b4` READY funnel(rio): E306 affiliate-pipe-read gains a GA4 leg — Impact and the blog Amazon block p — https://mhm-finds-dw5l-nscb7kmgh-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:59 `32d9cbf` READY funnel(ledger): after-merge: Pip: PR #417 test(feeds): fix red feeds.test.ts on main after — https://mhm-finds-dw5l-nq62q4a7z-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:56 `3c26480` READY funnel(ledger): Pip: E300 runway top-up #20 apply — https://mhm-finds-dw5l-a0qctj4jd-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:55 `dbaeed4` READY funnel(ledger): after-merge: Ops: PR #415 E308 deploy-verify grades a READY build containi — https://mhm-finds-dw5l-joaog0g9g-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:55 `202384c` READY test(feeds): assert collection feed <link rel=alternate> on the helper, not the page sourc — https://mhm-finds-dw5l-ho33epi8s-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:52 `cda0c72` READY funnel(ledger): build-watch: Ops: PR #415 E308 deploy-verify grades a READY build containi — https://mhm-finds-dw5l-iiplvb8v4-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:51 `5ab4df4` ERROR funnel(ops): E308 deploy-verify grades a READY build containing the sha; smoke-render wall — https://mhm-finds-dw5l-1al6bncm1-ericputnams-projects.vercel.app
- vercel 2026-10-31T10:37 `52aeaf7` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-i5ovx404t-ericputnams-projects.vercel.app
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
- commit 2026-11-03T06:37 `1579421d` funnel(ledger): check: morning-check
- commit 2026-11-02T22:31 `27c854f4` chore: compound learnings from 2026-11-02
- commit 2026-11-02T20:40 `049e40d0` funnel(ledger): after-merge: manual
- commit 2026-11-02T20:36 `bfaf5c51` feat(pip): animated short-video renderer (kinetic hook, whip-in cards, SFX) (#448)
- commit 2026-11-02T20:34 `6689d821` funnel(ledger): after-merge: manual
- commit 2026-11-02T20:08 `ccf942ea` feat(pip): short-video frames tool + Tumblr/Reddit dropped from social drafts (#447)
- commit 2026-11-02T20:08 `cc5da961` funnel(ledger): after-merge: manual
- commit 2026-11-02T20:04 `1c7c5d2d` funnel(ledger): build-watch: manual
- commit 2026-11-02T20:03 `da73e414` feat(funnel): operator Pinterest + Tumblr freeze (#446)
- commit 2026-11-02T19:50 `8bdbe745` funnel(queue): operator reply Q32: done — Mediavine token renewed (#445)
- commit 2026-11-02T13:28 `b9c029c9` funnel(ledger): digest 2026-11-02 landed by runner (daily PR did not merge)
- commit 2026-11-02T13:18 `c9144fd0` funnel(ledger): after-merge: Ops: PR #444 E326 merge-gate releases on MERGED, not on TTL (
- commit 2026-11-02T13:14 `8cbcddd1` E326 merge-gate releases on MERGED, not on TTL (Tier 0, Ops) (#444)
- commit 2026-11-02T13:10 `a821e9d6` funnel(rio): E324 RPM read 2026-11-02 — 10-31 is volume (87% sessions), 11-01 at 107.5% of
- commit 2026-11-02T13:06 `611e7d4e` funnel(sage): E320 body-presets hub head-term retitle + 3 body-preset guides (Tier 0) (#44
- commit 2026-11-02T13:06 `147ad12b` funnel(ledger): after-merge: Cass: PR #442 E323 collection-hub email capture directly unde
- commit 2026-11-02T13:02 `5752e2b5` funnel(ledger): build-watch: Cass: PR #442 E323 collection-hub email capture directly unde
- commit 2026-11-02T13:02 `1bec59da` funnel(cass): E323 collection-hub email capture directly under the grid (Tier 0) (#442)
- commit 2026-11-02T13:01 `db544656` funnel(ledger): after-merge: Nova: PR #440 E322 approved submissions publish their mod (is
- commit 2026-11-02T13:00 `46ccd1a3` funnel(ledger): Pip: E319 piercings-cc catalog pin apply
- commit 2026-11-02T12:58 `6715f58f` funnel(ledger): Nova: E322 apply isVerified backfill (7 Atino00 mods)
- commit 2026-11-02T12:58 `73e67adc` E322 approved submissions publish their mod (isVerified true) + scoped backfill (Tier 0) (
- commit 2026-11-02T06:39 `9d31ba44` funnel(ledger): check: morning-check
- commit 2026-11-01T23:08 `709c7e3a` chore: compound learnings from 2026-11-01
- commit 2026-11-01T18:04 `df94a005` funnel: registry row E312 (2026-11-01 evening) (#438)
- commit 2026-11-01T18:03 `5d6d8b3b` funnel(ledger): after-merge: Sage: PR #437 E312 BreadcrumbList JSON-LD on every collection
- commit 2026-11-01T17:59 `9591f9f6` funnel(ledger): build-watch: Sage: PR #437 E312 BreadcrumbList JSON-LD on every collection
- commit 2026-11-01T17:58 `c676c758` E312 BreadcrumbList JSON-LD on every collection hub, mirroring the visible crumbs (Tier 0)
- commit 2026-11-01T17:56 `0c986ce1` funnel(ledger): after-merge: Quinn: PR #436 funnel: registry rows E311 + E316 (2026-11-01)
- commit 2026-11-01T17:54 `edbd25ad` funnel: registry rows E311 + E316 (2026-11-01 evening) (#436)
- commit 2026-11-01T17:53 `c6548a84` funnel(ledger): after-merge: Sage: PR #435 E311 hair-cc hub: head-term retitle + 6 ranking
- commit 2026-11-01T17:50 `d552b840` E311 hair-cc hub: head-term retitle + 6 ranking hair articles as guides (Tier 0) (#435)
- commit 2026-11-01T17:49 `5d038aab` funnel(ledger): after-merge: Rowan: PR #434 E316 /games/sims-4/piercings-cc/ — title-only 
- commit 2026-11-01T17:46 `f7838fb7` E316: /games/sims-4/piercings-cc/ — title-only piercing theme + traffic page (Tier 0) (#43
- commit 2026-11-01T17:45 `985dafda` funnel(ledger): after-merge: Quinn: PR #433 funnel: daily run 2026-11-01
- commit 2026-11-01T17:43 `de8fca9e` funnel(ledger): Rowan: E316 piercing retag apply
- commit 2026-11-01T17:42 `623ca7bc` funnel: daily run 2026-11-01 (#433)
- commit 2026-11-01T11:37 `42a3bfe8` funnel(ledger): after-merge: Nova: PR #432 E304 apply: 7/7 Atino00 submissions approved; f
- commit 2026-11-01T11:20 `a1dc3ff2` funnel(ledger): Pip: PR #430 hand smoke PASS (correcting row)
- commit 2026-11-01T10:37 `79b87971` E304 apply: 7/7 Atino00 submissions approved; fix one-account-N-rows profile collision (Ti
- commit 2026-11-01T10:36 `ba4ef785` funnel(ledger): after-merge: Ops: PR #431 E317 deploy-verify renders every collection page
- commit 2026-11-01T09:48 `c0b60ddf` funnel(ops): E317 — deploy-verify renders every collection page the merged sha adds (Tier 
- commit 2026-11-01T09:48 `d95025e1` funnel(ledger): after-merge: Nova: PR #427 test(approval): assert the shared builder's row
- commit 2026-11-01T09:48 `1f789135` funnel(ledger): after-merge: Pip: PR #430 E309 christmas-cc + E310 female-clothes catalog 
- commit 2026-11-01T09:31 `097170ce` funnel(ledger): after-merge: Cass: PR #429 E314 newsletter cadence copy says every two wee
- commit 2026-11-01T09:14 `594d30a2` test(approval): assert the approve route writes the shared builder's row (fixes main red s
- commit 2026-11-01T09:14 `1c362260` funnel(ledger): after-merge: Quinn: PR #426 funnel: operator watch 2026-11-01
- commit 2026-11-01T09:14 `352ffb60` funnel(ledger): after-merge: Rio: PR #428 E315 verdict 2026-11-01 (paper-only)
- commit 2026-11-01T09:08 `911723d0` funnel(pip): E309 christmas-cc + E310 female-clothes catalog pins (Tier 0) (#430)
- commit 2026-11-01T09:02 `1bf08614` funnel(ledger): Pip: E310 female-clothes catalog pin apply
- commit 2026-11-01T09:02 `d184af82` funnel(ledger): Pip: E309 christmas-cc catalog pin apply
- commit 2026-11-01T09:01 `4dd4ccce` funnel(cass): E314 newsletter cadence copy says "every two weeks" + guard (Tier 0) (#429)
- commit 2026-11-01T08:44 `5d65b0b4` funnel(rio): E315 verdict 2026-11-01 — 10-30 rate day, E288 tracker WIRE 7/7, ramp is a vo
- commit 2026-11-01T08:25 `92023de1` funnel: operator watch 2026-11-01 — BELOW LINE (#426)
- commit 2026-11-01T07:37 `634edcb9` funnel(ledger): after-merge: Quinn: PR #425 funnel: operator watch 2026-10-31
- commit 2026-11-01T07:19 `ca53d534` funnel: operator watch 2026-10-31 (#425)
- commit 2026-11-01T06:37 `d19b1db4` funnel(ledger): check: morning-check
- commit 2026-10-31T22:48 `beeb3a9b` chore: compound learnings from 2026-10-31

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
