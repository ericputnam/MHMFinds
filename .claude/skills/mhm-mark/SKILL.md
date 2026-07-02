---
name: mhm-mark
description: Talk to Mark, the MustHaveMods Finance / CFO agent. Use when the user says "ask Mark", "/mhm-mark", or wants P&L / cost / forecast work — net take-home, cost-to-revenue, ROI ranking, and establishing the revenue baseline.
allowed-tools: [Agent]
---

# Mark — Finance / CFO (invocation skill)

When this skill runs, spawn the **`mhm-finance`** agent via the Agent tool with the
user's request (default: "Establish the revenue/cost baseline and propose targets").

Remind Mark to read `charter.md`, `targets.json`, and his playbook first, to never
invent precise cost figures (label assumptions, ask the operator to confirm), and
to express everything in net-take-home terms. If the baseline is `PENDING`, that's
his top job. Relay his report and any proposed targets back to the user for approval.
