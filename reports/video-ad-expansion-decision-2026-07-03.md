# Video Ad Expansion — Decision Record (2026-07-03)

## Decision: DO NOT replicate the /go video relocation hack yet. Email Mediavine first.

Scoped by the ad-revenue agent (Max) with live Mediavine + GA4 data.

## Why we're holding off on code

- Universal Player earns $1,377.61/mo (30d) at 84.5% viewability — but that's driven by
  /go/[modId]'s **captive 10s countdown dwell time**, which other page types can't replicate.
  Impressions scale with viewable dwell time (2–4 per pageview via ~30s refresh), not with
  placement count.
- Honest incremental estimate for the next-best page type (collection pages):
  **$50–150/mo** at current traffic. Not worth risking the teal-star sidebar sticky
  health score (14.2 ads/session) on a DOM-mutation hack.
- /mods/[id] is the bigger long-term target (1,621 URLs aggregate) but is the WRONG first
  rollout: fragmented per-URL traffic (top page only 502 views/30d) and the largest blast
  radius if the MutationObserver misbehaves.
- Homepage is disqualified: hub-page scan-and-click behavior kills video viewability.

## Action plan (in order)

1. **[OPERATOR — do this now] Email publishers@mediavine.com** (draft below). Resolves
   whether supported inline placement config exists, removing the need for the hack.
2. If/when Mediavine confirms placement approach: roll out to `/games/[game]/[topic]`
   collection pages ONLY (~30–50 URLs, contained blast radius). Insertion point: between
   the header intro (ends ~line 133) and the main grid container (~line 137) in
   `app/games/[game]/[topic]/CollectionPageClient.tsx`. Above the fold, NOT inside
   `aside#secondary`, NOT as a third child of ModGrid's `.mv-ads`.
3. Measure 2 weeks: collection-page RPM + sidebar sticky health, keep/kill.
4. Only after a stable collection-page result: revisit /mods/[id].

## Email draft for publishers@mediavine.com

> Subject: Inline Universal Player placement configuration — musthavemods.com
>
> Hi Mediavine team,
>
> We run the Universal Player on musthavemods.com (site: must-have-mods-new-owner).
> It currently performs well on our download interstitial pages (84%+ viewability),
> where we anchor it inline. Two questions:
>
> 1. The documented inline anchor attributes (`.mv-video-player`,
>    `data-video-type="inline"`) don't reliably override the floating outstream
>    placement on our setup — the player keeps floating bottom-right. Can inline
>    placement be enabled/configured on your side so we don't have to reposition
>    the container client-side?
>
> 2. If we add inline video anchors on a second page type (our collection pages),
>    does each page type get its own Universal Player allotment per pageview, or do
>    they draw from a shared site-wide allocation? We want to understand whether
>    expanding placement adds impressions or just relocates them.
>
> Thanks!

## Health guardrails (verified intact today)

- ads.txt: ok · privacy policy: ok (mv_health_status)
- Sidebar sticky: teal star, 14.2 ads/session — protect at all costs
- All existing `.mv-ads` wrappers and `aside#secondary` elements untouched by today's changes
