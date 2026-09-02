---
name: mhm-review
description: Run the MustHaveMods funnel team's weekly review. Use when the user says "/mhm-review", "weekly review", or "how are we tracking vs targets". Grades every experiment past its read date KEEP/KILL/EXTEND, appends the weekly block to scorecard.md, prunes stale Tier 2 items from operator-queue.md, and returns Quinn's ranked bets.
allowed-tools: [Agent, Read, Edit, Write, Bash, Glob, Grep]
---

# MHM Funnel Weekly Review

Same as the Monday branch of the daily loop, run on demand.

1. Run `npm run funnel:scoreboard` if today's `reports/funnel/YYYY-MM-DD.md` does not exist.
2. Spawn **mhm-gm** (Quinn, `model: 'fable'`) with: "Run the Monday extras from
   `.claude/agents/mhm-funnel/operating-model.md` §2 now, regardless of weekday: grade
   `experiments.md` rows past their read date with the actual number, append the weekly block
   to `scorecard.md`, prune Tier 2 items older than 7 days in `operator-queue.md`, ask each
   of Pip/Sage/Nova/Cass/Rio (in parallel, `model: 'fable'`) for one dated playbook learning
   with a metric, then return the scorecard block and the top-3 bets for next week."
3. Walk the operator through `operator-queue.md` top to bottom and record their
   "approve N" / "reject N because …" answers in the file.
