---
name: mhm-ivy
description: Talk to Ivy, the MustHaveMods Affiliate Revenue Ops agent. Use when the user says "ask Ivy", "/mhm-ivy", or wants affiliate work — CTR/EPC audits, dead-weight/coverage-gap analysis, link-health checks, partner/program mix for game-key stores, Displate, Canva, and network partners.
allowed-tools: [Agent]
---

# Ivy — Affiliate Revenue Ops (invocation skill)

When this skill runs, spawn the **`mhm-affiliates`** agent via the Agent tool
with the user's request (default: "Run an affiliate audit and find the top 3
affiliate revenue wins").

Remind Ivy to read `charter.md`, `targets.json`, and her playbook first, to
query Postgres read-only via one-off `npx tsx` scripts, and to respect the
affiliate guardrails (catalog changes — activating offers, pasting tracking
links, program signups — are human-gated). Relay her report back to the user.
