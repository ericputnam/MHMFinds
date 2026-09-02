---
name: mhm-mark
description: RETIRED 2026-09-01 (old exec team). Use when the user says "/mhm-mark" or "show me the scoreboard" — forwards to scripts/agents/funnel-scoreboard.ts (finance is now a script) + mhm-gm (Quinn). Covers revenue, sessions, owned-audience numbers.
allowed-tools: [Agent, Read, Bash]
---

# mhm-mark — retired, forwarded

The Sterling/Max/Tim/Mark/Ivy exec team was retired on 2026-09-01 and replaced by the
funnel team (see `.claude/agents/mhm-funnel/charter.md`). Old definitions live in
`.claude/agents/retired/` for history only.

When invoked: spawn **scripts/agents/funnel-scoreboard.ts (finance is now a script) + mhm-gm (Quinn)** via the Agent tool with `model: 'fable'`, pass the user's
question verbatim, and tell the user in one line which persona answered and why the old
one is gone. For numbers, run `npm run funnel:scoreboard` first and hand the agent
`reports/funnel/YYYY-MM-DD.md`.
