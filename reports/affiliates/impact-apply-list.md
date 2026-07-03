# Impact Apply List — Operator To-Do (2026-07-04)

Impact.com is now wired end-to-end (`scripts/impact-sync-catalog.ts` +
`scripts/agents/affiliate-daily-pulse.ts`), and the approved-program catalog
sync is live. The items below are things **only the operator can do** — new
program applications, contract renewals, and non-Impact signups. Ivy cannot
apply to programs, sign contracts, or create accounts; this list is drafted
by Ivy for the operator to action manually.

## (a) Re-apply to Canva on Impact

- **Contract ID 10068 — status: Expired.**
- Strong fit for MustHaveMods: Canva Pro is a natural companion tool for
  creators making Sims CC previews, thumbnails, and social promo — audience
  overlap is high.
- Commission structure historically **$10–$36 per conversion** depending on
  plan tier — well above typical CPA affiliate rates, worth prioritizing.
- Action: log into the Impact UI, search "Canva," and submit a new
  application against the current live program (contract IDs can change on
  renewal — don't assume 10068 is still the right one to re-request).

## (b) Apply to Green Man Gaming on Impact

- Not yet applied. Sells Sims 4 DLC/expansion-pack keys — directly on-theme
  for MustHaveMods' Sims audience and complementary to the existing game-key
  affiliate experiment (SD-2 gated, see `charter.md`).
- Action: search "Green Man Gaming" in the Impact marketplace, review their
  program terms (commission %, cookie window, allowed placements), and apply.
  Once approved, `impact-sync-catalog.ts --dry-run` will pick it up
  automatically on the next sync run — no code changes needed, just the
  contract being active.

## (c) Suggested Impact marketplace searches — Sims-audience brand fit

Look for programs matching these criteria: **recurring or high-AOV
purchases**, and **US + international payout support** (MustHaveMods has
meaningful non-US traffic; US-only programs cap addressable revenue).

Suggested search terms to run in the Impact marketplace:
- `home decor` / `room decor` — thematic overlap with build/buy CC content;
  look for recurring-purchase brands (subscription decor boxes) over one-off.
- `fashion subscription` / `clothing subscription box` — overlaps with CAS/CC
  audience interests; prioritize higher AOV (>$40) over fast-fashion low-AOV.
- `gaming lifestyle` / `gaming peripherals` — same lane as the existing
  Logitech G / GTRacing partnerships; look for adjacent brands (desks, RGB
  lighting, streaming gear) with similar catalog-sync potential.
- `PC accessories` / `desk setup` — creator-adjacent audience (people who make
  CC also tend to have gaming/streaming setups).
- `art print` / `poster` — same lane as Redbubble; look for a second vendor
  to avoid single-partner concentration risk in that category.

Selection criteria once results come back:
- Prefer programs with a **product catalog or deep-link API** (matches the
  sync script's existing pattern) over manual-link-only programs.
- Prefer **30+ day cookie windows** — Sims CC discovery-to-purchase cycles are
  not same-session.
- Check for **US + international payout** support before applying — flag
  US-only programs as lower priority.
- Avoid categories that conflict with existing no-stacking rules (see
  `application-pack.md` — e.g. don't pair a new game-key program with Kinguin
  on the same page/conversion path).

## (d) Still-pending non-Impact signups

These are outside Impact and were queued before the Impact integration
landed. Full detail, checklists, and rationale live in
`reports/affiliates/application-pack.md` — this is just the status pointer:

- **Awin → Kinguin** — game keys, 5%/2.5% new/returning commission, 30-day
  cookie. Awin has a $5 refundable verification fee. No-stacking rule applies
  (don't pair with a separate coupon/referral program on the same conversion).
- **Awin → Etsy** — mid-migration from Awin to Rakuten as of the last check;
  confirm which network has the live program before applying. Must frame the
  application as editorial curation (finds + guides), never as a link
  aggregator — this is an approval risk, not just a style note (see
  `mhm-affiliates.md` gotchas).
- **Displate — direct** (displate.com/influencers, no network middleman).
  Best thematic fit for room-decor CC content; low competition since no other
  Sims community site runs a Displate program currently.
- **CDKeys / Loaded — direct** (affiliates.cdkeys.com). Do not confuse with
  "CJS CD Keys" on the Awin network — this is specifically the direct
  CDKeys/Loaded program.

Full checklists, rationale, and rates for all four are in
`reports/affiliates/application-pack.md`.

---
*Drafted by Ivy (Affiliate Revenue Ops) for operator action. Ivy does not
apply to programs or sign contracts — this is a to-do list, not a completed
action log.*
