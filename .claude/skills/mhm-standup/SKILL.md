---
name: mhm-standup
description: Run the MustHaveMods funnel team's daily loop interactively. Use when the user says "/mhm-standup", "daily standup", "morning pulse", "run the team", or "how's the site doing today". Runs the scoreboard script, then Quinn (GM) spawns Pip/Sage/Nova/Cass/Rio to each execute one move at the highest allowed autonomy tier, and returns the ≤25-line digest.
allowed-tools: [Agent, Read, Bash, Write, Edit, Glob, Grep]
---

# MHM Funnel Daily (interactive)

This is the interactive twin of the scheduled `mhm-daily-pulse` task
(`scripts/agents/run-funnel-daily.sh`). Same loop, same output, but run from the
operator's terminal so they can answer questions inline.

1. Run the scoreboard: `npm run funnel:scoreboard` (writes `reports/funnel/YYYY-MM-DD.md` + `.json`).
2. Spawn **mhm-gm** (Quinn) via the Agent tool with `model: 'fable'` and the contents of
   `scripts/agents/funnel-daily-prompt.md` as the prompt, with one difference: because the
   operator is present, Quinn may ask up to three yes/no questions about Tier 2 items
   in `.claude/agents/mhm-funnel/operator-queue.md` before spawning the team.
3. Print Quinn's digest verbatim. Do not summarize it further.

If the user only wants numbers ("how's the site doing"), stop after step 1 and print the
scoreboard's Headline and Flags sections.
