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

### 2026-07-04 — Impact.com wired end-to-end; placeholder offers superseded
- **Situation:** Impact.com API creds (`IMPACT_ACCOUNT_SID` + token) went live
  in `.env.local` and are confirmed working. Root-caused the near-zero
  affiliate revenue to date: the 23 seeded `AffiliateOffer` rows were
  placeholders (`isActive: false`) waiting on real tracking links that never
  got pasted in — impressions × CTR × EPC was ~0 because impressions were
  effectively 0 (inactive offers don't render).
- **Action:** `scripts/impact-sync-catalog.ts` now pulls approved Impact
  campaigns, auto-builds/refreshes `AffiliateOffer` rows from real product
  catalogs and minted deep links, and activates them with real tracking URLs.
  `scripts/agents/affiliate-daily-pulse.ts` + launchd (daily 8:15) now writes
  `reports/affiliates/daily/<date>.md` with contract health, offers-by-partner,
  clicks vs 7d avg, earnings by status, and a PULSE line.
- **Approved + Active Impact programs (as of 2026-07-04):** Redbubble (11754,
  fan-art merch catalog), CapCut (22474, minted deep links), Logitech G (11355,
  Aurora line catalog), Logitech (8585), GTRacing (18111, catalog), Novilla
  (23934), oyrosy (32511).
- **EXPIRED contracts (don't treat as live):** Canva (10068), Shopify, XreArt.
- **NOT applied:** Green Man Gaming — operator to-do, see
  `reports/affiliates/impact-apply-list.md`.
- **Known API limitation:** Impact's Catalog Item Search endpoint 403s for
  this account — sync uses client-side keyword filtering over
  `/Catalogs/{id}/Items` instead. TrackingLinks minting works normally.
- **Next measure point:** first full week of real Impact-sourced offers live
  (week of 2026-07-06) — compare clicks/CTR/EPC against the old placeholder
  baseline (effectively zero) and against the weekly digest cadence
  (Wednesdays) to establish the first real baseline in `targets.json`.
- **Verdict:** provisional 🟢 — infrastructure unblocked, but revenue impact
  unproven until offers have run live for at least a week and
  `AffiliateEarning` rows accumulate through the commission-sync cron.
