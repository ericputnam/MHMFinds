# Operator Action Pack — RPM Optimization (rev. 2, 2026-06-24)

> **Supersedes rev. 1.** Rev. 1 said "site looks healthy, RPM optimized" and advised
> raising the Sidebar floor CPM. **Both were wrong.** After pulling ad-unit-level data,
> there are real RPM gaps — and raising floors would likely *hurt* (fill is already low).
> This is the corrected, data-grounded version.

## What the ad-unit data actually shows (last 30d, per `mv_ad_units`)

| Unit | Impressions | CPM | **Fill** | **Viewability** | Revenue |
|---|--:|--:|--:|--:|--:|
| Sidebar Sticky | 3.09M | $0.71 | **63.9%** | 62.4% | $2,216 |
| Content (in-content) | 2.97M | $0.91 | **62.5%** | **45.8%** | $2,725 |
| Adhesion | 1.18M | $1.18 | 84.9% | 87.2% | $1,390 |
| Universal Player (video) | 0.76M | **$1.85** | **59.5%** | 86.1% | $1,416 |
| **Blended** | 8.0M | $0.96 | **65.3%** | 57.4% | $7,749 |

Two numbers are the story: **fill rate ~65% blended** (the homepage is **50.7%**) and the
**Content unit's 45.8% viewability**. Green dashboard health-checks completely hid both.

## The real levers, ranked by $/confidence

### 1. In-content ("Content" unit) viewability: 45.8% — biggest unit, worst viewability
- 2.97M impressions (the most of any unit) at only 45.8% viewable. Every other unit is 62–87%.
- Low viewability → lower CPM (advertisers discount unseen ads) and lower fill.
- Lifting it to ~58% (Mediavine-typical) would raise CPM *and* fill on the highest-volume unit.
- **Owner:** mostly Mediavine OAE + WordPress article layout (paragraph spacing, ad cadence).
  The "OAE manages it / no action needed" reassurance is real but 45.8% is still under-target —
  worth raising with the rep specifically as a viewability question, not accepting as fixed.

### 2. Universal Player (video) fill: 59.5% on the highest-CPM unit ($1.85)
- Video is your most valuable inventory ($1.85 CPM vs $0.71–1.18) but fills the least.
- More video fill = direct high-value revenue. Expand eligible video placements + ask the rep
  why video fill is low.
- **Owner:** Mediavine config + enabling video on more page templates.

### 3. Fill rate generally is low (50–65%) — and floors may be too HIGH, not too low
- Homepage 50.7%, Content 62.5%, Sidebar 63.9%, Video 59.5%. Healthy Mediavine fill is 75–90%+.
- Low fill + low CPM usually means floors are too aggressive (ads don't clear the floor → unfilled)
  or demand is thin. **This is why rev. 1's "raise the floor" advice was backwards.**
- **Owner:** operator → Mediavine. See corrected email draft below.

### 4. Category / archive pages are thin (structural, lower priority than it looked)
- `/category/*` and `/blog/` get ~20k pageviews/mo but earn $0.76–2.71 RPM because they're
  listing pages with 3–15 paragraphs — almost no prose for in-content ads to inject into.
- Real lever, but it's a **content-depth play** (add 200–400-word intros → helps SEO *and* ad
  inventory), not an ad-config toggle. **Owner:** Tim/WordPress content.

### 5. Homepage grid (Next.js, this repo): 50.7% fill, $13.44 RPM — leave it alone for now
- It's a card grid; grids monetize below long-form articles by nature. Forcing ad-density changes
  here is the most likely way to *reduce* revenue. Only touch with an A/B test, not blind edits.

## Corrected Mediavine email draft (review, then YOU send — I did not send it)

> **To:** publishers@mediavine.com
> **Subject:** Site 14318 (Must Have Mods) — low fill rate + in-content viewability
>
> Hi team,
>
> Reviewing the last 30 days for site 14318, two things stand out and I'd love your read:
>
> 1. **Fill rate** is ~65% blended (homepage ~51%, Content ~62%, Video ~60%). That seems low —
>    are our floors set too aggressively, or is there a demand/setup issue we can adjust to lift fill?
> 2. **In-content ("Content") viewability is ~46%** while our other units are 62–87%. Is there a
>    placement/cadence change (or an OAE setting) that would improve in-content viewability?
> 3. **Universal Player** is our highest-CPM unit ($1.85) but lowest fill (~60%). Can we expand
>    eligible video placements / improve video fill?
>
> We're ~96% desktop, so these in-content and video units matter a lot. Thanks!
> Eric — Must Have Mods

## Still blocking the full P&L (need you)
Monthly costs: Vercel, Prisma Accelerate, OpenAI, any affiliate revenue. Revenue baseline is
locked ($8,437/mo); net-take-home can't finalize until costs are confirmed.

## Honest bottom line
RPM is **not optimized** — fill (~65%) and in-content viewability (46%) are the real gaps. But
the high-leverage fixes are **Mediavine-config + WordPress-content**, not this Next.js repo. The
in-repo ad surfaces (homepage grid, /mods, /go) are a smaller share of impressions and risky to
tune blindly. I won't ship speculative ad changes against a system where a wrong move lowers RPM.
