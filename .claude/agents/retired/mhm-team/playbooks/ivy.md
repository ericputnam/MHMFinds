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

### 2026-08-16 — Diagnosed 80 inactive offers + 7-day cron false-red; kill-threshold contested
- **Situation:** dry-run diagnosis requested — Redbubble/CapCut/Logitech G/Logitech
  showed 0 live offers vs. gtracing's 3, despite all having Active Impact
  contracts. Full writeup: `reports/affiliates/impact-dryrun-2026-08-16.md`.
- **Root cause (Redbubble/CapCut/Logitech G, 16 of 17 offers):** the
  2026-07-21 `affiliate-optimize.ts` run retired them under the ≥4,000
  impressions / CTR ≤0.05% rule — a bar calibrated to the **old Amazon
  catalog's CTR baseline**, not this site's actual measured CTR (~0.0086%,
  confirmed: 28/304,919 clicks/impressions on the 3 surviving gtracing
  offers = 0.0092%). Several killed offers (CapCut 0.015%, Logitech G Aurora
  0.028%, multiple Redbubble SKUs 0.017–0.047%) were performing *above* the
  site-wide average when killed — the bar itself, not the offers, is the
  problem. `impact-sync-catalog.ts`'s `upsertOffer()` correctly refuses to
  resurrect `validationStatus: 'retired'` rows (working as designed), and
  `collectCatalogOffers()` doesn't exclude retired items from its scored
  candidate list, so catalogs with limited on-theme inventory (Redbubble's
  10 designs, Logitech G's 1 matching SKU, CapCut's 1 hardcoded deep link)
  never get a "next-best" replacement — the pool stays permanently empty.
  GTRracing avoided this only because its catalog has more SKU/colorway
  variety to cycle in fresh candidates.
- **Root cause (bare Logitech, contract 8585):** different problem — never
  retired, **never configured**. `CATALOG_TARGETS`/`DEEPLINK_TARGETS` in
  `impact-sync-catalog.ts` has no entry for `logitech` (8585), only
  `logitech-g` (11355). New-coverage gap, not a kill-rule casualty.
- **Contested verdict → proposed SD-2 experiment:** recalibrate the
  low-CTR kill bar from an absolute 0.05% to something anchored to the
  site's own trailing CTR (e.g. 0.5x trailing-28d average, recomputed each
  run) rather than the stale Amazon-era hardcode. Awaiting operator
  approval — not applied.
- **Honest $/mo math on reactivation:** lifetime catalog totals are 1,144
  clicks / 2,716,582 impressions / **$0 revenue / 0 conversions**, and
  `AffiliateEarning` has zero rows ever (not pending — empty). At 0.0086%
  CTR and $0 proven EPC, reactivating the 17 retired SKUs as-is nets an
  estimated low single digits $/mo — not worth prioritizing over the
  threshold fix. Recommended the operator NOT do a blanket reactivation
  under the unchanged threshold (would just re-burn another 4–6 week watch
  cycle before getting re-killed the same way).
- **Cron false-red diagnosis:** `affiliate-daily-pulse` showed 🔴 "Can't
  reach database server at db.prisma.io:5432" for 7 straight days
  (2026-08-10 → 08-16) despite manual queries connecting fine and the
  script's `.env.local`/`DIRECT_DATABASE_URL` handling being correct. Root
  cause: a **wake-time network race**, not a config bug — confirmed via
  `logs/mediavine-daily-report.log` (separate script, separate launchd job)
  showing the identical `fetch failed` symptom on the same overlapping
  days, and via `affiliate-daily-pulse.log` timestamps drifting 8:16–8:29am
  against an 8:15am schedule (the launchd wake-from-sleep signature — job
  fires network calls before Wi-Fi/DNS finish reconnecting post-wake).
  Recommended fix (not applied — infra, needs operator approval): a
  network-readiness `curl` retry loop at the top of the wrapper shell
  scripts, or a retry/backoff wrapper around the Prisma connection + fetch
  calls in the scripts themselves. **Treat Aug 10–16 daily pulses as "no
  signal," not "sync is broken."**
- **Verdict:** provisional — diagnosis complete, both fixes (threshold
  recalibration, cron network-readiness guard) are proposals awaiting
  operator sign-off, nothing shipped.

### 2026-07-04 — Optimizer live; Impact-first strategy locked; gaming-tilted catalog shipped
- **Situation:** `scripts/affiliate-optimize.ts` — the automated
  conversion-driven kill/refill loop — went live via launchd, running every
  **Tuesday 07:45**, ahead of the Wednesday `/mhm-review`.
- **Exact thresholds:**
  - Offers **younger than 14 days** are watched, never killed.
  - Offers with **≥25 clicks and $0 attributed commission** → retired.
  - Offers with **≥4,000 impressions and CTR ≤0.05%** (the old Amazon
    catalog's CTR baseline) → retired.
  - Retired offers get `validationStatus='retired'`;
    `impact-sync-catalog.ts` refuses to resurrect them.
  - After kills, the pool auto-refills from Impact catalogs.
  - Every verdict is appended with its numbers to
    `reports/affiliates/optimize-log.md` — the audit trail.
- **Strategy (operator decision):** **Impact-first** — grow Impact revenue.
  Amazon is deprioritized indefinitely (no API access; CSV import exists at
  `/admin` as a fallback only, not an active channel).
- **Catalog config shipped gaming-tilted today:** Redbubble keywords now
  include `'sims'`, `'plumbob'`, `'cozy gam'`, `'gamer girl'`, etc.
  (`maxOffers: 10`), plus curated collection deep-link cards (Sims 4
  posters, Sims 4 merch, Logitech Aurora collection).
- **My job Tuesday/Wednesday:** review `optimize-log.md` verdicts,
  sanity-check them (seasonal dip ≠ dead offer), propose threshold tuning as
  SD-2 experiments if the bars look wrong, and hunt replacement
  **candidates** (new keyword sets / categories / programs) — not hand-pick
  individual replacement products.
- **Measure point:** the first optimizer run that includes offers past the
  14-day watch window — **~2026-07-17** (14 days after the gaming-tilted
  catalog + optimizer went live 2026-07-03/04).
- **Success metric:** (1) first attributed Impact commission on the new
  gaming-tilted catalog, and (2) CTR of the new catalog vs. the 0.05%
  Amazon baseline the kill rule is calibrated against.
- **Verdict:** provisional 🟢 — infrastructure and strategy are locked; no
  outcome data yet. Revisit at the 2026-07-17 measure point.

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
