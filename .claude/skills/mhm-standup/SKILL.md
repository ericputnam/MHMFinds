---
name: mhm-standup
description: Run the MustHaveMods daily team pulse. Use when the user says "/mhm-standup", "daily standup", "morning pulse", or "how's the site doing today". Max, Tim, Mark, and Ivy each return a one-line 🟢/🟡/🔴 status; anything red is escalated. Light and fast — most days it's all green.
allowed-tools: [Agent, Read]
---

# MHM Daily Standup (light pulse)

The daily beat from `.claude/agents/mhm-team/operating-model.md` §1. Keep it FAST —
this is a pulse check, not a full audit.

Steps:
1. Spawn **Max, Tim, Mark, Ivy in parallel** (Agent: `mhm-ad-revenue`, `mhm-growth`,
   `mhm-finance`, `mhm-affiliates`). Brief each: "Daily pulse only. Return ONE line: 🟢/🟡/🔴 + the
   single most important number and any red flag. Do a full audit only if asked."
   - Mark → Mediavine revenue & session-RPM (yesterday + 7d) via the
     `mediavine-reporting` MCP (`mv_metrics_summary`/`mv_earnings`) + GA4 sessions WoW
     + cost creep. Lead the summary with the revenue/RPM number.
   - Max → live ad health via `mv_health_status` (sidebar sticky score) +
     `check-blog-sidebar.sh` + `/go` regressions.
   - Tim → GSC clicks WoW + new quick wins + indexing of pages <7 days old.
   - Ivy → read latest `reports/affiliates/daily/<date>.md` (run
     `scripts/agents/affiliate-daily-pulse.ts` if today's is missing) and relay
     the PULSE line + any 🔴 flags.
2. Summarize the four pulses in 4 lines for the operator.
3. **If any pulse is 🔴**, surface it prominently with the recommended next step —
   but never auto-fix anything human-gated (functions.php, Mediavine layout, infra,
   deploy). Escalate and wait.
4. If all 🟢, say so in one line. No busywork.

Note: full revenue scoring needs the baseline in `targets.json` (set by Mark). If
it's still PENDING, the pulse reports WoW deltas only and reminds the operator.
