# Sterling's Playbook — CEO / Strategy

I read this at the start of every run and append to it at the end. This is my
memory across sessions. Newest learnings at the top.

## Operating notes
- Always read `charter.md` and `targets.json` first; respect the bounded-autonomy gates.
- Fan out to Max, Tim, and Mark in parallel; rank their findings by `$ impact ÷ effort`.
- Current priority: **Ad RPM** — apply a priority multiplier to Max's items.

## Standing decisions
_(none yet)_

## Learnings log
<!-- format: YYYY-MM-DD — situation → action → result → verdict (keep/drop/watch) -->

### 2026-07-01 — Existential "new monetization" ask, fanned out to Max/Tim/Mark

**Situation:** Owner asked for a NEW monetization channel beyond existing Mediavine
ads/affiliate — framed as existential, revenue must grow. Team OS files actually
live at `.claude/agents/mhm-team/` (not `mhm-team/` at repo root as the skill doc
implies) — check there first next time to save a lookup round-trip.

**Action:** Fanned out to all three specialists in parallel with a brief explicitly
excluding "optimize the existing ad stack" (that's tracked separately) and asking
for genuinely new surfaces/formats. Also did my own doc/schema audit in parallel
(AffiliateOffer/AffiliateClick models, MONETIZATION_PLAN.md, AffiliateRecommendations
component) rather than waiting idle for agents to return.

**Result — the single biggest finding wasn't a new idea, it was an existing blind
spot:** the affiliate program (Impact.com + Oyrosy links, admin dashboard, click
tracking) is fully built and LIVE in production, but the schema has zero
revenue/commission fields — only impressions/clicks counters. We are flying
completely blind on whether it's earning $0 or $2,000/mo. Mark, Tim, and my own
schema read all independently converged on this same gap. That convergence across
independent lenses (finance/growth/ad-ops + direct code audit) is a strong signal
it's real and worth leading with over flashier "build X new thing" pitches.

**Other high-value finds:** Max corrected my brief — Universal Player video is
NOT dormant/unactivated (my assumption going in), it's live and earning $1,370/mo,
just narrowly anchored to `/go/[modId]` only. Tim found zero email capture exists
anywhere (63.7% of traffic is Pinterest, a real concentration risk). Both premium-
membership case-builders (Tim from engagement data, Mark from CFO/conversion-
benchmark lens) independently concluded the same thing: don't build the full
`MONETIZATION_PLAN.md` system, test a single-flag MVP first if greenlit at all.

**Verdict / keep:** Fanning out with an explicit "not more of what's already
tracked" constraint produced sharper, non-overlapping findings than a generic
"find revenue ideas" brief would have — each agent's report corrected or refined
part of my own framing rather than just adding items to a list. Keep this pattern:
state the exclusion explicitly, let agents push back on my baseline assumptions.

**Watch:** Infra costs (Vercel/Prisma/OpenAI) have now been PENDING for 9+ days
since baseline establishment (2026-06-22) with zero movement. This is now blocking
every net-take-home / ROI calculation, not just this one. If it's still PENDING
next review, escalate directly rather than re-asking Mark to re-check repo docs
that we already know contain no cost figures.
