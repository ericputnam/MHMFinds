# Affiliate Program Application Pack

Operator-facing signup guide. Work top to bottom in one sitting — each program
takes 5-15 minutes to apply, then most are pending-approval for a few days.
Nothing here requires code changes; this is account-creation + application only.

---

## Reusable site pitch (copy/paste into every application)

> MustHaveMods.com is a Sims 4 custom-content discovery platform — an editorial
> curation site that surfaces and organizes the best community-made Sims 4 mods,
> CC, and finds, alongside original guides. We are NOT a raw link aggregator:
> content is curated, categorized, and presented with original editorial framing
> (themed collections, "best of" guides, room/style-based finds).
>
> **Traffic:** ~380K sessions/month (GA4: 1.14M sessions / 1.72M pageviews per
> quarter, Apr–Jun 2026).
> **Device:** 94% desktop (79% Windows).
> **Audience:** Sims 4 players, strong overlap with fashion and interior-design
> interest (clothing CC, furniture CC, room-decor content).
> **Geo:** US 37%, then UK, Brazil, France, Poland, Germany, Canada.
> **Channels:** 69% organic social (Pinterest-led), 26% organic search.
> **Monetization/quality signal:** approved Mediavine publisher (Mediavine has
> its own content-quality bar for admission — cite this as a trust signal).

Use this paragraph (trimmed as needed) in every "tell us about your site" field.
For Etsy specifically, lean harder into "editorial curation, room decor & gift
guides" framing — see step 2b below.

---

## Priority order & checklist

### 1. Impact.com (network — apply once, then join individual programs inside)

- [ ] Create one Impact.com publisher account (impact.com) using the site pitch above.
- [ ] Once approved, apply inside the network to:
  - [ ] **Green Man Gaming** — ≤5% commission, 30-day cookie, Sims 4 DLC/expansion
        packs. Good fit for "must-have Sims 4 packs" content.
  - [ ] **Canva** — ~$10–36 per conversion (one-time, not recurring), 30-day
        cookie, $10 minimum payout. Fits any "design your Sims room" / creator-tool
        adjacent content.
- [ ] No signup fee for the network account itself.

### 2. Awin (network — $5 refundable verification fee)

- [ ] Create an Awin publisher account. **Awin charges a $5 signup verification
      fee — this is normal Awin process, not a scam; it's refunded on your first
      payout.**
- [ ] Apply inside to:
  - [ ] **Kinguin** — 5% new customer / 2.5% returning customer, 30-day cookie,
        $100 minimum payout. **No stacking with other referral/coupon programs**
        on the same conversion — don't pair Kinguin links with a separate coupon
        affiliate on the same page.
  - [ ] **(2b) Etsy** — currently mid-migration from Awin to Rakuten; check which
        network has the live program at time of application. Etsy explicitly
        **rejects thin-content / aggregator-styled applications.** Apply using
        the editorial framing: describe MustHaveMods as producing "room decor
        & gift guides" content (e.g., Sims-inspired room decor roundups, gift
        guides for gamers) rather than "a mod download site." Do not submit the
        generic aggregator pitch for this one — customize it.

### 3. Displate — direct (best thematic fit)

- [ ] Apply directly at displate.com/influencers (no network middleman).
- [ ] Commission is directory-consensus ~25%/sale — **confirm the actual rate
      on the signup/dashboard**, don't assume 25% is locked in.
- [ ] 30-day cookie.
- [ ] Why this is top-tier fit: metal posters and room decor align tightly with
      our Pinterest-driven, furniture-CC-interested audience, and no competitor
      Sims community site currently runs a Displate program — low competition,
      high thematic relevance.

### 4. CDKeys / Loaded — direct

- [ ] Apply at affiliates.cdkeys.com (the "Loaded" affiliate platform).
- [ ] ~5% commission, 30-day cookie, ~$10 minimum payout.
- [ ] **Important — do not confuse with "CJS CD Keys" on the Awin network.**
      Those are different programs/entities despite the similar name. This
      checklist item is specifically the direct CDKeys/Loaded program.

### 5. Optional — NordVPN (multi-network; available via several affiliate networks)

- [ ] Apply through whichever network currently lists it (check Impact/Awin/CJ
      at signup time — NordVPN runs on multiple networks simultaneously).
- [ ] Commission: 100% of a 1-month plan, 40% of longer plans, plus 30%
      recurring on renewals.
- [ ] **Copy caution:** any promotional copy must NOT imply that our own mod
      download links are unsafe or need a VPN to use safely. Frame NordVPN as
      general online-privacy/streaming value, not as a disclaimer about this
      site's content.

---

## Known dead ends — skip these, don't spend time applying

- **EA** — no program pays for free-mod traffic. "Support-A-Creator" is scoped
  to individual creators (not applicable to a curation site), and the EA Maker
  Program requires marketplace exclusivity we won't accept.
- **Patreon / Ko-fi referral programs** — not viable for this traffic type.
- **SteelSeries** — affiliate program currently closed to new applicants.
- **Best Buy** — 1-day cookie window plus recent commission cuts make this not
  worth the integration effort.

---

## After approval — activation steps

1. **Paste real tracking links.** Go to `/admin/monetization/affiliates` and
   edit the pre-seeded placeholder offers (they're seeded `isActive: false` on
   purpose). Replace the placeholder `affiliateUrl` with your real tracking
   link from each network's dashboard, then flip the offer to active.
2. **Add API credentials** to `.env.local` (dev) and Vercel (production) to
   activate the commission-sync cron:
   - `IMPACT_ACCOUNT_SID`
   - `IMPACT_AUTH_TOKEN`
   - `RAKUTEN_CLIENT_ID`
   - `RAKUTEN_CLIENT_SECRET`
   - `RAKUTEN_SID`
   - `CJ_PERSONAL_ACCESS_TOKEN`
   - `CJ_PUBLISHER_ID`
   - `CRON_SECRET`

   **Never commit these values to git** — `.env.local` only, and add the
   production values directly in the Vercel dashboard. See the repo's
   `CLAUDE.md` secrets policy if unsure.
3. **Update international payout details** per network (bank/PayPal/wire info,
   tax forms) — each network has its own payout setup separate from the
   tracking-link step above.

---

## Compliance notes

- FTC affiliate disclosure is already live on `/terms` (currently being
  updated — verify wording covers all new programs once links go live).
- Keep **"Sponsored"** labels on all affiliate placements — do not remove for
  aesthetic reasons.
- **Kinguin no-stacking rule** — don't run a second referral/coupon program
  alongside Kinguin links on the same page/conversion path.
