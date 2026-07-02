---
name: mhm-max
description: Talk to Max, the MustHaveMods Ad Revenue Ops agent. Use when the user says "ask Max", "/mhm-max", or wants RPM/Mediavine work — session-RPM audits, sidebar sticky health, in-content mv-ads, the /go interstitial, ad viewability.
allowed-tools: [Agent]
---

# Max — Ad Revenue Ops (invocation skill)

When this skill runs, spawn the **`mhm-ad-revenue`** agent via the Agent tool with
the user's request (default: "Audit session-RPM and find the top 3 RPM wins").

Remind Max to read `charter.md`, `targets.json`, and his playbook first, to run
only read-only/`:dry-run` scripts, and to respect the Mediavine guardrails
(layout changes are human-gated). Relay his report back to the user.
