# Revenue guardrail — 2026-11-27 (last finalized day 2026-11-25)

🟢 **GREEN** → action: **none**

vercel coverage: COMPLETE (40 rows over 2 pages, oldest 2026-11-19T14:46Z ≤ window start 2026-11-22T05:00Z) · deploy in window: yes

rollback bound: in-window production deploys 5 (≤24 to auto-rollback) · target 17.4 h before window start (≤48 h) → eligible

rollback bound split (E427, informational — the bound reads all 5): build-relevant 2 ≤ 24 · paper-only 3

- Revenue $276.48 (30.6%), RPM 20.69 (13.1%), sessions 15.5% vs same weekday, prior 4 weeks · 3-day revenue 35.7%

| | 2026-11-25 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $276.48 | $211.67 | 30.6% |
| session RPM | 20.69 | 18.29 | 13.1% |
| sessions | 13,358 | 11,567 | 15.5% |
| sessions, GA4 raw | 13,392 | 11,742 | 14.1% |
| **sessions ex Singapore (direct)** (E216, GA4) | 13,019 | 11,388 | 14.3% |
| **ex-segment RPM** (E271; MV revenue ÷ GA4 ex-segment sessions) | 21.24 | 18.59 | 14.3% → rate |
| 3-day revenue | $847.79 | $624.67 | 35.7% |
| 3-day RPM | 20.81 | 17.85 | 16.6% |

sessions ex Singapore (direct) (E216, GA4): raw 13,392 vs 11,742 (+14.1%) → ex-segment 13,019 vs 11,388 (+14.3%) · segment 373 = 2.79% of the day (controls 3.01%, 4 same weekdays)

ex-segment RPM (E216; Mediavine revenue ÷ GA4 sessions ex Singapore (direct)): $21.24 vs $18.59 (+14.3%) · mix alone predicts raw RPM +0.2% → rate (mix band ±1%)

Mediavine health: all ok

## Production changes since 2026-11-22 (72h before the judged day)

- vercel 2026-11-27T13:15 `1d11ac8` READY funnel(ledger): check: morning-check [after judged day — judged tomorrow] — https://mhm-finds-dw5l-qw9e8fnlq-ericputnams-projects.vercel.app
- vercel 2026-11-26T16:34 `3856eec` READY fix(seo): the careers guide's crosslink box points at the Career Mods hub (#585) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-6e3hrakjx-ericputnams-projects.vercel.app
- vercel 2026-11-26T16:28 `fca4e27` READY test(funnel): direct-bot-read mirror test follows the Direct selector to scoreboard-channe [after judged day — judged tomorrow] — https://mhm-finds-dw5l-o2qehux37-ericputnams-projects.vercel.app
- vercel 2026-11-26T16:24 `26ccc70` READY fix(seo): E433 crosslink map catches up with the career-mods hub (#583) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-apn67fcz0-ericputnams-projects.vercel.app
- vercel 2026-11-26T16:20 `4acd956` READY test(submissions): approval fixtures carry an image, as #579 now requires (#582) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-cy4qocydz-ericputnams-projects.vercel.app
- vercel 2026-11-26T16:06 `c291b99` READY funnel(ledger): after-merge: operator session / PR #581 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-h0br3ghul-ericputnams-projects.vercel.app
- vercel 2026-11-26T16:02 `f10a8d6` READY feat(submissions): require a preview image on /submit-mod (#581) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fh92ks077-ericputnams-projects.vercel.app
- vercel 2026-11-26T15:57 `e861ca8` READY fix(vercel): mod-upload-cleanup cron path gets its trailing slash; guard every cron path ( [after judged day — judged tomorrow] — https://mhm-finds-dw5l-qkvgim9wv-ericputnams-projects.vercel.app
- vercel 2026-11-26T15:52 `e44cb10` READY funnel(ledger): after-merge: operator session / PR #579 [after judged day — judged tomorrow] — https://mhm-finds-dw5l-ix3cbt392-ericputnams-projects.vercel.app
- vercel 2026-11-26T15:49 `d8ab9ed` READY feat(submissions): require a thumbnail to approve; show the whole hero image (#579) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-fya8fl9fx-ericputnams-projects.vercel.app
- vercel 2026-11-23T00:41 `5f29301` READY funnel(ledger): after-merge: operator session / PR #578 — https://mhm-finds-dw5l-2bfp2r79t-ericputnams-projects.vercel.app
- vercel 2026-11-23T00:37 `b8505ae` READY feat(submissions): send the approval email from the scripted approval path (#578) — https://mhm-finds-dw5l-16xjaxk41-ericputnams-projects.vercel.app
- vercel 2026-11-23T00:31 `4453f99` READY funnel(ledger): after-merge: operator session / PR #577 — https://mhm-finds-dw5l-4fhmg9ljj-ericputnams-projects.vercel.app
- vercel 2026-11-23T00:26 `67a8d3f` READY feat(submissions): email the creator from olivia@ when a submission is approved (#577) — https://mhm-finds-dw5l-gag2zyqal-ericputnams-projects.vercel.app
- vercel 2026-11-22T11:39 `c527b5c` READY funnel(ledger): check: morning-check — https://mhm-finds-dw5l-cza41967w-ericputnams-projects.vercel.app
- commit 2026-11-27T08:15 `1d11ac8a` funnel(ledger): check: morning-check
- commit 2026-11-26T11:34 `3856eec8` fix(seo): the careers guide's crosslink box points at the Career Mods hub (#585)
- commit 2026-11-26T11:28 `fca4e27f` test(funnel): direct-bot-read mirror test follows the Direct selector to scoreboard-channe
- commit 2026-11-26T11:24 `26ccc704` fix(seo): E433 crosslink map catches up with the career-mods hub (#583)
- commit 2026-11-26T11:20 `4acd9562` test(submissions): approval fixtures carry an image, as #579 now requires (#582)
- commit 2026-11-26T11:06 `c291b990` funnel(ledger): after-merge: operator session / PR #581
- commit 2026-11-26T11:02 `f10a8d6d` feat(submissions): require a preview image on /submit-mod (#581)
- commit 2026-11-26T10:57 `e861ca81` fix(vercel): mod-upload-cleanup cron path gets its trailing slash; guard every cron path (
- commit 2026-11-26T10:52 `e44cb101` funnel(ledger): after-merge: operator session / PR #579
- commit 2026-11-26T10:49 `d8ab9ede` feat(submissions): require a thumbnail to approve; show the whole hero image (#579)
- commit 2026-11-22T19:40 `5f293015` funnel(ledger): after-merge: operator session / PR #578
- commit 2026-11-22T19:37 `b8505aea` feat(submissions): send the approval email from the scripted approval path (#578)
- commit 2026-11-22T19:31 `4453f99d` funnel(ledger): after-merge: operator session / PR #577
- commit 2026-11-22T19:26 `67a8d3ff` feat(submissions): email the creator from olivia@ when a submission is approved (#577)

## Rules

- red-rpm + a Vercel deploy in the window + at most 24 in-window production deploys + a READY target no more than 48 h before the window start → the runner rolls production back to that target, re-runs the smoke test, then Quinn investigates. Rolling back one harmless deploy is cheap; a day of broken ads is not.
- red-rpm with a deploy in the window but OUTSIDE the bound (E169-b: more than a day's worth of deploys, or a target more than 48 h back) → no automatic rollback; the headline names the bound and the "rollback withheld" reason gives the candidate target. Rio reads the Mediavine side first (10-01 and 10-02 were both Mediavine-side at the quarter boundary); a manual rollback is Tier 1.
- red-rpm with the window's deploys UNKNOWN (vercel coverage TRUNCATED) → no rollback; Quinn pages `vercel ls --next <ms>` by hand before anything else — never read it as "no deploy".
- red-rpm with no deploy in the window (coverage COMPLETE) → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
