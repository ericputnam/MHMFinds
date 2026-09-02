---
name: mhm-max
description: RETIRED 2026-09-01 (old exec team). Use when the user says "/mhm-max" or "ask Rio about ads" — forwards to mhm-product-revenue (Rio) for the ad-revenue guardrail. Covers Mediavine health, RPM guardrail, ad layout cases.
allowed-tools: [Agent, Read, Bash]
---

# mhm-max — retired, forwarded

The Sterling/Max/Tim/Mark/Ivy exec team was retired on 2026-09-01 and replaced by the
funnel team (see `.claude/agents/mhm-funnel/charter.md`). Old definitions live in
`.claude/agents/retired/` for history only.

When invoked: spawn **mhm-product-revenue (Rio) for the ad-revenue guardrail** via the Agent tool with `model: 'fable'`, pass the user's
question verbatim, and tell the user in one line which persona answered and why the old
one is gone. For numbers, run `npm run funnel:scoreboard` first and hand the agent
`reports/funnel/YYYY-MM-DD.md`.
