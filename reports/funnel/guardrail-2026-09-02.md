# Revenue guardrail — 2026-09-02 (last finalized day 2026-08-31)

🟡 **YELLOW** → action: **watch**

- Revenue $150.08 on 2026-08-31 is -19.7% vs same weekday avg; 3-day -2.8%

| | 2026-08-31 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $150.08 | $186.95 | -19.7% |
| session RPM | 11.96 | 14.29 | -16.3% |
| sessions | 12,547 | 13,088 | -4.1% |
| 3-day revenue | $623.98 | $642.23 | -2.8% |
| 3-day RPM | 15.07 | 15.09 | -0.1% |

Mediavine health: all ok

## Production changes since 2026-08-28 (72h before the judged day)

- vercel 2026-09-02T12:08 `4a8ace1` READY fix(funnel): runner auth preflight + degraded digest, prisma-aware node_modules (#21) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-nmf74jhgo-ericputnams-projects.vercel.app
- vercel 2026-09-02T11:47 `4fb45b6` READY fix(agents): funnel-scoreboard matchAll spread breaks Vercel build (ES5 target) (#20) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-c9hh23oep-ericputnams-projects.vercel.app
- vercel 2026-09-02T11:44 `428384d` ERROR feat(agents): funnel team framework + enforced commit/merge autonomy (#19) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-3zzaouqq1-ericputnams-projects.vercel.app
- vercel 2026-09-02T01:45 `fa6e2e0` READY fix(ads): remove Mediavine player relocation + 8s hide timer on /go interstitial (#18) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-cem8xisxa-ericputnams-projects.vercel.app
- commit 2026-09-02T08:08 `4a8ace1` fix(funnel): runner auth preflight + degraded digest, prisma-aware node_modules (#21)
- commit 2026-09-02T07:47 `4fb45b6` fix(agents): funnel-scoreboard matchAll spread breaks Vercel build (ES5 target) (#20)
- commit 2026-09-02T07:44 `428384d` feat(agents): funnel team framework + enforced commit/merge autonomy (#19)
- commit 2026-09-01T21:45 `fa6e2e0` fix(ads): remove Mediavine player relocation + 8s hide timer on /go interstitial (#18)

## Rules

- red-rpm + a Vercel deploy in the window → the runner rolls production back to the last READY deployment before the window, re-runs the smoke test, then Quinn investigates. Rolling back a harmless deploy is cheap; a day of broken ads is not.
- red-rpm with no deploy in the window → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
