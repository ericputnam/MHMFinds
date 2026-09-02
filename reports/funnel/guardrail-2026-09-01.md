# Revenue guardrail — 2026-09-01 (last finalized day 2026-08-30)

🟢 **GREEN** → action: **none**

- Revenue $233.55 (4.1%), RPM 15.67 (1.7%), sessions 2.5% vs same weekday, prior 4 weeks · 3-day revenue 1.7%

| | 2026-08-30 | expected (same weekday, 4-wk avg) | Δ |
|---|---|---|---|
| revenue | $233.55 | $224.34 | 4.1% |
| session RPM | 15.67 | 15.41 | 1.7% |
| sessions | 14,899 | 14,530 | 2.5% |
| 3-day revenue | $665.05 | $654.01 | 1.7% |
| 3-day RPM | 16.16 | 15.49 | 4.3% |

Mediavine health: all ok

## Production changes since 2026-08-27 (72h before the judged day)

- vercel 2026-09-02T01:45 `fa6e2e0` READY fix(ads): remove Mediavine player relocation + 8s hide timer on /go interstitial (#18) [after judged day — judged tomorrow] — https://mhm-finds-dw5l-cem8xisxa-ericputnams-projects.vercel.app
- commit 2026-09-01T21:45 `fa6e2e0` fix(ads): remove Mediavine player relocation + 8s hide timer on /go interstitial (#18)

## Rules

- red-rpm + a Vercel deploy in the window → the runner rolls production back to the last READY deployment before the window, re-runs the smoke test, then Quinn investigates. Rolling back a harmless deploy is cheap; a day of broken ads is not.
- red-rpm with no deploy in the window → run `check-blog-sidebar.sh`; if it fails, re-push functions.php from git (`push-blog-functions-prod.sh --yes`); otherwise Rio opens a Mediavine ticket and the digest leads with it.
- red-traffic → Pip/Sage incident (Pinterest/Google), no rollback.
- yellow → no Tier 1 merges today; Tier 0 continues.
