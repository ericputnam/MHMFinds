# Production change ledger

Appended automatically by `scripts/agents/deploy-verify.sh` on every production deploy, evening check and rollback, so the operator can see exactly what changed and whether it was verified. Newest at the bottom.

| when | mode | who / what | commit | deployment | result | notes |
|---|---|---|---|---|---|---|
| 2026-09-01 21:52 | after-merge | operator: PR #18 merged by Eric (remove Mediavine player relocation on /go) | fa6e2e0 | https://mhm-finds-dw5l-cem8xisxa-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-01 21:59 | check | self-test: check mode after current_prod fix |  | https://mhm-finds-dw5l-cem8xisxa-ericputnams-projects.vercel.app | PASS | evening/ad-hoc check · 5xx/15m=0  |
| 2026-09-02 07:44 | after-merge | Quinn: PR 19 funnel framework + autonomy rules | 428384d | https://mhm-finds-dw5l-3zzaouqq1-ericputnams-projects.vercel.app | BUILD ERROR | never promoted; production still https://mhm-finds-dw5l-cem8xisxa-ericputnams-projects.vercel.app  |
| 2026-09-02 07:47 | after-merge | Quinn: PR 20 fix scoreboard build error | 4fb45b6 | https://mhm-finds-dw5l-c9hh23oep-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-02 08:08 | after-merge | Quinn: PR #21 runner auth preflight + prisma-aware node_modules | 4a8ace1 | https://mhm-finds-dw5l-nmf74jhgo-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-02 08:54 | after-merge | Pip: PR #23 Pinterest read-back decisions | 9ec85ca | https://mhm-finds-dw5l-kwyb4fgcw-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-02 08:58 | after-merge | Rio: PR #25 guardrail diagnosis 2026-09-02 | 1bf37ba | https://mhm-finds-dw5l-ko7nojurh-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-02 09:02 | after-merge | Sage: PR #24 AI crawler allow rules in robots.txt | 01cdf27 | https://mhm-finds-dw5l-n9v42b9nh-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-02 09:07 | after-merge | Nova: PR #22 witch-cc collection + W36 writer brief | f4892bd | https://mhm-finds-dw5l-6rh8fc7l5-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-02 09:11 | after-merge | Cass: PR #26 GA4 newsletter_signup + /go email capture | a467367 | https://mhm-finds-dw5l-738ifoxrt-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-02 09:16 | after-merge | Quinn: PR #27 witch-cc keyword fallback fix | 90ece59 | https://mhm-finds-dw5l-cjdvz17hp-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-02 09:24 | after-merge | Quinn: PR #28 funnel: daily run 2026-09-02 | 5ddbf8f | https://mhm-finds-dw5l-5i5vrx98h-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-02 12:05 | after-merge | Quinn: PR #29 runner per-agent worktrees + untrack node_modules | 053b7f0 | https://mhm-finds-dw5l-fohrjnnch-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-02 18:31 | check | evening-check |  | https://mhm-finds-dw5l-fohrjnnch-ericputnams-projects.vercel.app | PASS | evening/ad-hoc check · 5xx/15m=0  |
| 2026-09-03 18:31 | check | evening-check |  | https://mhm-finds-dw5l-hedslxw7c-ericputnams-projects.vercel.app | PASS | evening/ad-hoc check · 5xx/15m=0  |
| 2026-09-04 07:43 | after-merge | Quinn: PR #31 docs: mhm-funnel-daily task id | 516fab0 | https://mhm-finds-dw5l-8nnhsffl1-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-04 07:56 | after-merge | Nova: PR #32 makeup-cc collection page | 58af131 | https://mhm-finds-dw5l-jkkk58spl-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-04 07:57 | after-merge | Cass: PR #33 collection-page newsletter capture | cbd8079 | https://mhm-finds-dw5l-nt0n4gw6d-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-04 07:59 | after-merge | Rio: PR #34 guardrail diagnosis 2026-09-04 + Patreon draft | 94a9c81 | https://mhm-finds-dw5l-86cg8jwsn-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
| 2026-09-04 08:01 | after-merge | Sage: PR #35 google-collapse-diagnosis | 76f7ad4 | https://mhm-finds-dw5l-kyia2v74b-ericputnams-projects.vercel.app | PASS | verified live · 5xx/15m=0  |
