# Revenue guardrail — 2026-11-21 (last finalized day 2026-11-19)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (80 rows over 4 pages, oldest 2026-11-15T12:14Z ≤ window start 2026-11-16T05:00Z) · deploy in window: yes

rollback bound: in-window production deploys 49 (≤24 to auto-rollback) · target 1.5 h before window start (≤48 h) → withheld: in-window deploys 49 exceed rollback bound 24

rollback bound split (E427, informational — the bound reads all 49): build-relevant 14 ≤ 24 · paper-only 35

- Revenue $234.93 (21.0%), RPM 20.35 (18.3%), sessions 2.1% vs same weekday, prior 4 weeks · 3-day revenue 12.8%

| | 2026-11-19 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $234.93 | $194.20 | 21.0% |
| session RPM | 20.35 | 17.20 | 18.3% |
| sessions | 11,539 | 11,299 | 2.1% |
| sessions, GA4 raw | 11,644 | 11,327 | 2.8% |
| **sessions ex Singapore (direct)** (E216, GA4) | 11,324 | 10,894 | 4.0% |
| **ex-segment RPM** (E271; MV revenue ÷ GA4 ex-segment sessions) | 20.75 | 17.83 | 16.4% → rate |
| 3-day revenue | $676.32 | $599.82 | 12.8% |
| 3-day RPM | 19.79 | 17.34 | 14.1% |

sessions ex Singapore (direct) (E216, GA4): raw 11,644 vs 11,327 (+2.8%) → ex-segment 11,324 vs 10,894 (+4.0%) · segment 320 = 2.75% of the day (controls 3.83%, 4 same weekdays)

ex-segment RPM (E216; Mediavine revenue ÷ GA4 sessions ex Singapore (direct)): $20.75 vs $17.83 (+16.4%) · mix alone predicts raw RPM +1.1% → rate (mix band ±1%)

Mediavine health: all ok

## Production changes since 2026-11-16 (72h before the judged day)

- vercel 2026-11-21T11:36 `4e11d34` BUILDING funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-mryr7lk15-ericputnams-projects.vercel.app
- vercel 2026-11-20T11:39 `0a212a6` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-q2t5vxcpa-ericputnams-projects.vercel.app
- vercel 2026-11-20T03:48 `e27db54` READY chore: compound learnings from 2026-11-19 — https://mhm-finds-dw5l-2sps5f4ks-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:59 `01f4b89` READY funnel(ledger): after-merge: Quinn: PR #575 daily run 2026-11-19 — https://mhm-finds-dw5l-ey9xsvcxq-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:55 `cd9a51a` READY funnel: daily run 2026-11-19 (Quinn) (#575) — https://mhm-finds-dw5l-pcw7mq4zm-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:49 `0676022` READY funnel(ledger): after-merge: Sage: PR #574 seo(E433): proxy-level hub crosslink box on 95  — https://mhm-finds-dw5l-35otrnw1h-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:46 `85a23b5` READY funnel(ledger): after-merge: Rowan: PR #571 career-mods hub (E438) — https://mhm-finds-dw5l-nca4dymmf-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:46 `824b335` READY seo(E433): proxy-level hub crosslink box on 95 registry guides (#574) — https://mhm-finds-dw5l-a54r82e80-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:43 `24bd336` READY funnel(ledger): after-merge: Quinn: PR #569 operator watch 2026-11-19 — https://mhm-finds-dw5l-2ivv1zank-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:42 `b9ca09c` READY Rowan: /games/sims-4/career-mods/ on a title-only career content type (E438) (#571) — https://mhm-finds-dw5l-54b9l6pho-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:37 `00a3c89` READY funnel: operator watch 2026-11-19 (#569) — https://mhm-finds-dw5l-jfoei58ne-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:37 `ebfb3ba` READY funnel(ledger): after-merge: Pip: PR #573 E431/E432 image sitemap entries for mod pages an — https://mhm-finds-dw5l-dy42wzvb8-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:33 `bcd05aa` READY funnel(pip): E431/E432 image sitemap entries for mod pages and collection hubs (Tier 0) (# — https://mhm-finds-dw5l-hkewsfg0l-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:32 `6383d5a` READY funnel(ledger): after-merge: Ops: PR #572 E439 smoke-render page/run budgets + awake-secon — https://mhm-finds-dw5l-hhc9ulbde-ericputnams-projects.vercel.app
- vercel 2026-11-19T14:14 `59791f7` READY funnel(ledger): after-merge: Nova: PR #570 E435 creator official links — https://mhm-finds-dw5l-cluw1wso8-ericputnams-projects.vercel.app
- vercel 2026-11-19T13:41 `af6aff3` READY funnel(ops): E439 smoke-render page/run budgets, awake-seconds smoke cap, vercel </dev/nul — https://mhm-finds-dw5l-8je4zro5h-ericputnams-projects.vercel.app
- vercel 2026-11-19T12:50 `27a2cb5` READY funnel(nova): E435 official off-site links on creator pages (#570) — https://mhm-finds-dw5l-2eifzla3s-ericputnams-projects.vercel.app
- vercel 2026-11-19T12:29 `c878053` READY funnel(ledger): Rowan: E438 isNSFW flags (2 careers) — https://mhm-finds-dw5l-6jz0toogw-ericputnams-projects.vercel.app
- vercel 2026-11-19T12:29 `3cb62ca` READY funnel(ledger): Rowan: E438 career title-only retag apply — https://mhm-finds-dw5l-30885l6hq-ericputnams-projects.vercel.app
- vercel 2026-11-19T11:53 `5d40733` READY funnel(ledger): after-merge: Rio: PR #568 E437 November non-ad MTD read — https://mhm-finds-dw5l-7cjg8hamc-ericputnams-projects.vercel.app
- vercel 2026-11-19T11:51 `14161a4` READY funnel(rio): E437 November non-ad MTD read — $165.50 on drift, Dec B2 line $200/$165; E424 — https://mhm-finds-dw5l-k4j56uj8w-ericputnams-projects.vercel.app
- vercel 2026-11-19T11:49 `ef4a644` READY funnel(ledger): after-merge: Cass: PR #567 E436 newsletter picks spread by source post + i — https://mhm-finds-dw5l-kh82q9gfx-ericputnams-projects.vercel.app
- vercel 2026-11-19T11:45 `bc369c9` READY funnel(cass): E436 newsletter picks spread by source post + issue-09 draft (#567) — https://mhm-finds-dw5l-cicao2ti9-ericputnams-projects.vercel.app
- vercel 2026-11-19T11:37 `5c68e57` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-jzf5yd1ax-ericputnams-projects.vercel.app
- vercel 2026-11-19T04:01 `63c3e06` READY chore: compound learnings from 2026-11-18 — https://mhm-finds-dw5l-gqqyf5ja2-ericputnams-projects.vercel.app
- vercel 2026-11-18T11:39 `573ee3a` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-3bbpw43nq-ericputnams-projects.vercel.app
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
- commit 2026-11-20T06:39 `0a212a6e` funnel(ledger): check: morning-check
- commit 2026-11-19T22:48 `e27db54f` chore: compound learnings from 2026-11-19
- commit 2026-11-19T09:59 `01f4b892` funnel(ledger): after-merge: Quinn: PR #575 daily run 2026-11-19
- commit 2026-11-19T09:55 `cd9a51a2` funnel: daily run 2026-11-19 (Quinn) (#575)
- commit 2026-11-19T09:49 `06760224` funnel(ledger): after-merge: Sage: PR #574 seo(E433): proxy-level hub crosslink box on 95 
- commit 2026-11-19T09:46 `85a23b58` funnel(ledger): after-merge: Rowan: PR #571 career-mods hub (E438)
- commit 2026-11-19T09:46 `824b3357` seo(E433): proxy-level hub crosslink box on 95 registry guides (#574)
- commit 2026-11-19T09:43 `24bd3366` funnel(ledger): after-merge: Quinn: PR #569 operator watch 2026-11-19
- commit 2026-11-19T09:42 `b9ca09c3` Rowan: /games/sims-4/career-mods/ on a title-only career content type (E438) (#571)
- commit 2026-11-19T09:37 `00a3c898` funnel: operator watch 2026-11-19 (#569)
- commit 2026-11-19T09:37 `ebfb3bad` funnel(ledger): after-merge: Pip: PR #573 E431/E432 image sitemap entries for mod pages an
- commit 2026-11-19T09:33 `bcd05aac` funnel(pip): E431/E432 image sitemap entries for mod pages and collection hubs (Tier 0) (#
- commit 2026-11-19T09:32 `6383d5a5` funnel(ledger): after-merge: Ops: PR #572 E439 smoke-render page/run budgets + awake-secon
- commit 2026-11-19T09:14 `59791f72` funnel(ledger): after-merge: Nova: PR #570 E435 creator official links
- commit 2026-11-19T08:41 `af6aff3f` funnel(ops): E439 smoke-render page/run budgets, awake-seconds smoke cap, vercel </dev/nul
- commit 2026-11-19T07:50 `27a2cb53` funnel(nova): E435 official off-site links on creator pages (#570)
- commit 2026-11-19T07:29 `c8780538` funnel(ledger): Rowan: E438 isNSFW flags (2 careers)
- commit 2026-11-19T07:29 `3cb62caa` funnel(ledger): Rowan: E438 career title-only retag apply
- commit 2026-11-19T06:53 `5d40733a` funnel(ledger): after-merge: Rio: PR #568 E437 November non-ad MTD read
- commit 2026-11-19T06:51 `14161a4c` funnel(rio): E437 November non-ad MTD read — $165.50 on drift, Dec B2 line $200/$165; E424
- commit 2026-11-19T06:49 `ef4a6442` funnel(ledger): after-merge: Cass: PR #567 E436 newsletter picks spread by source post + i
- commit 2026-11-19T06:45 `bc369c95` funnel(cass): E436 newsletter picks spread by source post + issue-09 draft (#567)
- commit 2026-11-19T06:37 `5c68e571` funnel(ledger): check: morning-check
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

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
