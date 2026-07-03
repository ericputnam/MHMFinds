---
name: mhm-review
description: Run the MustHaveMods weekly executive review. Use when the user says "/mhm-review", "weekly review", "team standup", or "how are we tracking vs targets". Each agent self-grades against its KPIs, updates its playbook, and Sterling produces the rolled-up scorecard plus next week's ranked actions.
allowed-tools: [Agent, Read, Edit, Write]
---

# MHM Weekly Executive Review (invocation skill)

Runs the operating-rhythm ritual defined in `.claude/agents/mhm-team/charter.md`.

This is the **operator-present** weekly ritual — Sterling rolls up the week and you
approve next week's ideas. (Revenue is pulled automatically via the Mediavine MCP, so
no browser is required.)

Steps:
1. Read `.claude/agents/mhm-team/targets.json` and `ideas-backlog.md`.
2. Spawn **Mark** (`mhm-finance`) FIRST to pull the week's revenue via the
   `mediavine-reporting` MCP (`mv_metrics_summary` + `mv_earnings`, `last_7_days`),
   cross-check traffic via GA4, and write actuals into `scorecard.md`. If the baseline
   is `PENDING`, Mark establishes it now from this data + your confirmed infra costs,
   then proposes targets. (If a tool returns `AUTH_EXPIRED`, Mark asks you to refresh
   the Mediavine JWT — he won't guess.)
3. Spawn **Max, Tim, and Ivy in parallel** (`mhm-ad-revenue`, `mhm-growth`,
   `mhm-affiliates`) to pull their KPI actuals, grade 🟢/🟡/🔴 vs `targets.json`,
   and append a dated playbook entry.
4. Spawn **Sterling** (`mhm-ceo`) with the four self-grades to:
   - produce a rolled-up team grade,
   - write a new dated block at the top of `mhm-team/scorecard.md` (use its template),
   - return the top 3 ranked actions for next week.
5. Relay Sterling's scorecard + ranked actions to the user, and present the
   `ideas-backlog.md` batch for 👍/👎 approval. Nothing is merged or deployed —
   drafted changes stay as PRs awaiting the user's approval.
