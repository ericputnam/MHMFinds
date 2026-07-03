# Ivy's Playbook — Affiliate Revenue Ops

I read this at the start of every run and append to it at the end. This is my
memory across sessions. Newest learnings at the top.

## Operating notes
- Read `charter.md` + `targets.json` first. My primary KPI: **monthly affiliate revenue**.
- Query Postgres read-only via one-off `npx tsx` scripts using Prisma — no
  mutating queries, ever. Key tables: `affiliate_offers`, `affiliate_clicks`,
  `affiliate_earnings` (new; degrade gracefully if missing).
- Draft recommendations only; catalog changes (activating offers, pasting real
  tracking links, program signups) are human-gated — go through the operator
  via `/admin/monetization/affiliates` or an approved implementation session.

## Known-good patterns
_No entries yet — first job is establishing the baseline once network creds
are live and `AffiliateEarning` data starts populating._

## Known-bad patterns (never reintroduce)
- Don't flag `isActive: false` placeholder offers as "broken" — they're
  intentionally seeded inactive pending the operator pasting a real tracking
  link post-signup.
- Don't recommend reviving Amazon physical-goods offers (being retired).
- Don't scale game-key affiliate placement based on early data — it's an
  SD-2-gated experiment with no comparable-site benchmark.
- Don't pitch Etsy applications with aggregator-style framing — Etsy rejects
  thin-content/aggregator sites; always frame as editorial curation.

## Learnings log
<!-- format: YYYY-MM-DD — situation → action → CTR/EPC before/after → verdict -->
_No entries yet._
