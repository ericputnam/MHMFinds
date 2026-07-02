---
name: mhm-sterling
description: Talk to Sterling, the MustHaveMods CEO / chief strategy agent. Use when the user says "ask Sterling", "/mhm-sterling", "what should we do this week", or wants a business profit-priority brief. Sterling orchestrates the whole exec team (Max, Tim, Mark) and returns one ranked, dollar-weighted action list.
allowed-tools: [Agent]
---

# Sterling — CEO (invocation skill)

When this skill runs, spawn the **`mhm-ceo`** agent via the Agent tool and pass the
user's request as the prompt. Sterling is the entry point to the executive team.

Steps:
1. Take whatever the user asked (default: "What should we do this week to grow profit?").
2. Spawn `subagent_type: mhm-ceo` with that request, reminding Sterling to read
   `charter.md` + `targets.json` first and to fan out to Max/Tim/Mark as needed.
3. Relay Sterling's ranked brief back to the user. Do not implement anything —
   Sterling advises and drafts PRs; the user approves merges/deploys.
