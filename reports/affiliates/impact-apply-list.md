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

## (b) Ranked gaming-first application list — Impact marketplace

Strategy is **Impact-first**: grow Impact revenue, Amazon deprioritized
indefinitely. The catalog config shipped 2026-07-03/04 is gaming-tilted
(Redbubble keywords now include `'sims'`, `'plumbob'`, `'cozy gam'`,
`'gamer girl'`, etc., plus curated Sims-merch deep-link cards), so new
applications should lean further into the same lane. These are Impact
marketplace applications — **the operator clicks "Apply" in the Impact UI**;
Ivy cannot apply via API. Ranked by Sims-audience fit:

1. **Green Man Gaming** — the **#1 gap**. Sells Sims 4 DLC/expansion-pack
   keys — directly on-theme for MustHaveMods' Sims audience and
   complementary to the existing game-key affiliate experiment (SD-2 gated,
   see `charter.md`). Not yet applied.
   - Action: search "Green Man Gaming" in the Impact marketplace, review
     program terms (commission %, cookie window, allowed placements), apply.
     Once approved, `impact-sync-catalog.ts --dry-run` picks it up
     automatically on the next sync — no code changes needed, just the
     contract being active.

2. **Humble Bundle** — game bundles + storefront. Confirmed on Impact per
   prior research. Strong overlap with a PC-gaming audience that already
   buys Sims content; bundle model gives high perceived value, which
   typically lifts CTR on curated-deal placements.
   - Action: search "Humble Bundle" in the Impact marketplace, confirm
     program terms and cookie window, apply.

3. **Fanatical** — game key storefront, same lane as Green Man
   Gaming/Kinguin. **Verify network before applying** — Fanatical's
   affiliate program has historically run on CJ or Awin rather than Impact;
   don't assume it's on Impact without checking the marketplace search
   results first. If it's not on Impact, move this to the non-Impact
   pending list (section (d)) under the appropriate network.

4. **Razer** — gaming peripherals/hardware, confirmed on Impact. The
   pink/Quartz product line fits the demo (overlaps with the existing
   Logitech G Aurora / GTRacing gaming-lifestyle placements). Good candidate
   for a catalog-sync-style integration if Razer exposes a product catalog
   or deep-link API.

5. **Secretlab** (or a comparable premium gaming-chair brand) — only apply
   if terms are meaningfully better than the existing GTRacing program
   (commission %, cookie window, AOV). Don't apply just to add a logo;
   check whether it would cannibalize GTRacing's placements or genuinely
   diversify (e.g. higher AOV, better payout terms, exclusive SKUs).

### Search-term guidance for finding more Sims-adjacent lifestyle brands

Look for programs matching these criteria: **recurring or high-AOV
purchases**, and **US + international payout support** (MustHaveMods has
meaningful non-US traffic; US-only programs cap addressable revenue).

Suggested search terms to run in the Impact marketplace — search `'games'`
and `'gaming'` first (broadest gaming-lane coverage now that the catalog is
gaming-tilted), then:
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

Selection criteria once results come back — **filter US + intl payout
support** before evaluating anything else:
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
