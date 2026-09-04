# Revenue guardrail — 2026-09-04 (last finalized day 2026-09-02)

🟡 **YELLOW** → action: **watch**

- Revenue $160.20 on 2026-09-02 is -13.5% vs same weekday avg; 3-day -16.4%

| | 2026-09-02 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $160.20 | $185.26 | -13.5% |
| session RPM | 14.21 | 14.76 | -3.7% |
| sessions | 11,269 | 12,612 | -10.6% |
| 3-day revenue | $469.07 | $561.00 | -16.4% |
| 3-day RPM | 13.26 | 14.61 | -9.2% |

Mediavine health: all ok

## Production changes since 2026-08-30 (72h before the judged day)

- vercel 2026-09-03T02:32 `6c06d1a` READY chore: compound learnings from 2026-09-02 (#30) — https://mhm-finds-dw5l-hedslxw7c-ericputnams-projects.vercel.app
- vercel 2026-09-02T16:05 `053b7f0` READY fix(funnel): one worktree per agent, copy .env.local, untrack node_modules symlink (#29) — https://mhm-finds-dw5l-fohrjnnch-ericputnams-projects.vercel.app
- vercel 2026-09-02T13:24 `5ddbf8f` READY funnel: daily run 2026-09-02 — reports, digest, experiments, playbook (#28) — https://mhm-finds-dw5l-5i5vrx98h-ericputnams-projects.vercel.app
- vercel 2026-09-02T13:16 `90ece59` READY fix(content): witch-cc keyword fallback — theme tag matched 0 verified mods (#27) — https://mhm-finds-dw5l-cjdvz17hp-ericputnams-projects.vercel.app
- vercel 2026-09-02T13:11 `a467367` READY feat(capture): GA4 newsletter_signup event + email form on /go interstitial (#26) — https://mhm-finds-dw5l-738ifoxrt-ericputnams-projects.vercel.app
- vercel 2026-09-02T13:07 `f4892bd` READY feat(content): add witch-cc collection page + W36 writer brief (#22) — https://mhm-finds-dw5l-6rh8fc7l5-ericputnams-projects.vercel.app
- vercel 2026-09-02T13:02 `01cdf27` READY feat(sage): add AI crawler allow rules to robots.txt (#24) — https://mhm-finds-dw5l-n9v42b9nh-ericputnams-projects.vercel.app
- vercel 2026-09-02T12:58 `1bf37ba` READY docs(funnel): Rio guardrail diagnosis 2026-09-02 — demand-side verdict (#25) — https://mhm-finds-dw5l-ko7nojurh-ericputnams-projects.vercel.app
- vercel 2026-09-02T12:54 `9ec85ca` READY feat(pip): Pinterest read-back — baselined catalog pinning gap + corrected (not set) landi — https://mhm-finds-dw5l-kwyb4fgcw-ericputnams-projects.vercel.app
- vercel 2026-09-04T11:43 `516fab0` READY docs(funnel): daily loop is launched by the mhm-funnel-daily scheduled task (#31) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-8nnhsffl1-ericputnams-projects.vercel.app
- commit 2026-09-04T07:43 `516fab0` docs(funnel): daily loop is launched by the mhm-funnel-daily scheduled task (#31)
- commit 2026-09-02T22:32 `6c06d1a` chore: compound learnings from 2026-09-02 (#30)
- commit 2026-09-02T12:05 `053b7f0` fix(funnel): one worktree per agent, copy .env.local, untrack node_modules symlink (#29)
- commit 2026-09-02T09:24 `5ddbf8f` funnel: daily run 2026-09-02 — reports, digest, experiments, playbook (#28)
- commit 2026-09-02T09:16 `90ece59` fix(content): witch-cc keyword fallback — theme tag matched 0 verified mods (#27)
- commit 2026-09-02T09:11 `a467367` feat(capture): GA4 newsletter_signup event + email form on /go interstitial (#26)
- commit 2026-09-02T09:07 `f4892bd` feat(content): add witch-cc collection page + W36 writer brief (#22)
- commit 2026-09-02T09:02 `01cdf27` feat(sage): add AI crawler allow rules to robots.txt (#24)
- commit 2026-09-02T08:58 `1bf37ba` docs(funnel): Rio guardrail diagnosis 2026-09-02 — demand-side verdict (#25)
- commit 2026-09-02T08:54 `9ec85ca` feat(pip): Pinterest read-back — baselined catalog pinning gap + corrected (not set) landi
- commit 2026-09-02T08:08 `4a8ace1` fix(funnel): runner auth preflight + degraded digest, prisma-aware node_modules (#21)
- commit 2026-09-02T07:47 `4fb45b6` fix(agents): funnel-scoreboard matchAll spread breaks Vercel build (ES5 target) (#20)
- commit 2026-09-02T07:44 `428384d` feat(agents): funnel team framework + enforced commit/merge autonomy (#19)
- commit 2026-09-01T21:45 `fa6e2e0` fix(ads): remove Mediavine player relocation + 8s hide timer on /go interstitial (#18)

## Rules

- red-rpm + a Vercel deploy in the window → the runner rolls production back to the last READY deployment before the window, re-runs the smoke test, then Quinn investigates. Rolling back a harmless deploy is cheap; a day of broken ads is not.
- red-rpm with no deploy in the window → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
