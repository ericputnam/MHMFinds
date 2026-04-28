# Initiative 3: Increase Pages Per Session (1.45 → 2.0+)

**Created**: 2026-04-13
**Status**: Ready for implementation
**Parent PRD**: `tasks/prd-revenue-pivot/PRD-revenue-pivot.md`
**Priority**: High — at $8-11 page RPM, going from 1.45 to 2.0 pages/session = ~38% more ad impressions per visit
**Estimated Revenue Impact**: Current ~$170/day. At 2.0 pages/session: ~$235/day. Delta: +$65/day = +$1,950/month.

---

## 1. Problem Statement

Pages per session is **1.45** across the site. This means the average user views fewer than 1.5 pages before leaving. Every additional pageview generates another round of ad impressions (content ads, adhesion, sidebar sticky, video). At current page RPM ($7.92-$11.07), increasing pages/session from 1.45 to 2.0 would add ~$1,950/month in revenue with zero additional traffic.

### Why It's So Low

A comprehensive code audit found that **the site's primary navigation pattern actively prevents pageviews**:

1. On the homepage, game browse pages, and collection pages, clicking a mod card opens a **modal** (`ModDetailsModal`) instead of navigating to `/mods/[id]`. Modals don't count as pageviews.
2. The modal itself has **zero internal links** — no related mods, no "more from creator", no link to the full detail page.
3. The `/mods/[id]` detail page (which DOES have related-mod sections) is essentially unreachable from the main browsing flow.
4. A `TrendingMods` component exists but is **never rendered** anywhere.
5. Tags on mod detail pages look clickable but have **no click handlers**.
6. The `/go/[modId]` download interstitial (10-second captive wait) shows **no related mods**.
7. Blog middleware **injects no CTAs** linking into the mod finder.

---

## 2. Root Causes (Code Audit Detail)

### Critical: Modal pattern kills pageviews

**`components/ModCard.tsx` (lines 34-39):**
```tsx
const handleCardClick = () => {
  if (onClick) {
    onClick(mod);   // ← caller opens modal — NO pageview
  } else {
    router.push(`/mods/${mod.id}`);  // ← only fallback, never reached
  }
};
```

Every consumer passes `onClick`:
- `app/page.tsx` line 199: `setSelectedMod(mod)` → modal
- `CollectionPageClient.tsx` line 45: `setSelectedMod(mod)` → modal
- `GamePageClient.tsx` line 132: `setSelectedMod(mod)` → modal

The `router.push` fallback is **dead code** in practice.

### High: ModDetailsModal is a dead end

**`components/ModDetailsModal.tsx`** contains:
- Mod image, title, description
- "Download Mod" button (goes to `/go/[modId]` or external)
- "View Blog Post" / external link
- **No related mods**
- **No "more from creator"**
- **No "View full details" link to `/mods/[id]`**
- **No internal navigation of any kind**

Users open the modal, maybe click download, and close it. Session over.

### Medium: Dead/broken navigation elements

| Element | File | Issue |
|---------|------|-------|
| `TrendingMods` component | `components/TrendingMods.tsx` | Exists, renders 12 mods as links, **never imported anywhere** |
| Tags on `/mods/[id]` | `app/mods/[id]/page.tsx` lines 266-276 | Rendered as `<span>` with `cursor-pointer` but **no onClick/href** |
| Breadcrumb category | `app/mods/[id]/page.tsx` lines 142-147 | Uses `router.push('/?category=...')` — goes back to homepage filter, not a category page |

### Medium: Missed engagement opportunities

| Opportunity | File | Current State |
|-------------|------|---------------|
| `/go/[modId]` countdown (10s captive wait) | `app/go/[modId]/page.tsx` | No related mods shown — user stares at countdown |
| Blog → mod finder deep links | `middleware.ts` | Blog HTML passes through with no CTA injection |
| Collection page blog links | `CollectionPageClient.tsx` line 124-136 | Opens in new tab (`target="_blank"`) — doesn't count as pageview |

---

## 3. Implementation Plan

### Phase 1: High-impact quick wins (ship same day)

**Fix 1a — Add "View Full Details" link to ModDetailsModal**
In `components/ModDetailsModal.tsx`, add a prominent link/button:
```tsx
<Link href={`/mods/${mod.id}`} className="...">
  View Full Details →
</Link>
```
This bridges the modal → detail page → related mods flow. Lowest effort, highest impact.

**Fix 1b — Add related mods to ModDetailsModal**
Fetch and display 3-4 related mod cards at the bottom of the modal. Each card links to `/mods/[id]` (full page navigation, not another modal).

**Fix 1c — Wire up tags as links on `/mods/[id]`**
Change tags from dead `<span>` to `<Link href="/?search=${tag}">` or `<Link href="/?category=${tag}">`. Each tag click = new pageview.

### Phase 2: Download interstitial engagement (1-2 days)

**Fix 2a — Add "While you wait" related mods to `/go/[modId]`**
During the 10-second countdown, show 3-4 related mod cards. Users are captive and browsing-inclined. Each click = new pageview + resets the engagement funnel.

### Phase 3: Strategic navigation changes (requires product decision)

**Fix 3a — Consider removing modal pattern entirely**
The nuclear option: remove `onClick` props from `ModGrid` on homepage/collection/game pages so `ModCard` falls through to `router.push('/mods/${mod.id}')`. Every mod card click becomes a pageview.

**Trade-off**: Modals feel faster (no page load). Full page navigation feels slower but generates pageviews and ad impressions. The detail page has related mods, "more from creator", sidebar ads — all of which drive further engagement.

**Recommendation**: Don't remove modals entirely. Instead, make the modal a "preview" that strongly funnels to the detail page (Fix 1a), and add related mods inside the modal (Fix 1b). If data shows the modal is still killing engagement after 7 days, then consider removing it.

**Fix 3b — Render TrendingMods component**
Add the existing `TrendingMods` component to the homepage (above or below the main grid) and to the `/go/[modId]` page. It's already built and renders 12 linked mod cards.

**Fix 3c — Blog CTA injection**
Add a banner/CTA to proxied WordPress blog HTML via middleware that deep-links to relevant collection pages. E.g., on a blog post about "hair CC", inject a link to `/games/sims-4/hair-cc`. This requires mapping blog post URLs to collection slugs.

---

## 4. Files to Modify

| File | Change | Phase |
|------|--------|-------|
| `components/ModDetailsModal.tsx` | Add "View Full Details" link + related mods section | 1 |
| `app/mods/[id]/page.tsx` | Wire up tags as `<Link>` elements | 1 |
| `app/go/[modId]/page.tsx` | Add "While you wait" related mods section | 2 |
| `app/page.tsx` | Optionally render `TrendingMods` component | 3 |
| `components/TrendingMods.tsx` | Review/update if needed before rendering | 3 |
| `middleware.ts` | Blog CTA injection (optional, Phase 3) | 3 |

---

## 5. Testing Plan

### Pre-deploy
1. `npm run build` — clean build
2. Click-through test on dev server:
   - Homepage → click mod card → modal opens → click "View Full Details" → lands on `/mods/[id]` → related mods visible → click related mod → new `/mods/[id]` page
   - Collection page → same flow
   - `/mods/[id]` → click tag → filtered homepage
   - `/go/[modId]` → related mods visible during countdown
3. Verify Mediavine ad anchors still render on `/mods/[id]` detail page (the page users are now being funneled to)

### Post-deploy
1. **Day 1**: Check GA4 real-time — verify `/mods/[id]` pageviews are increasing
2. **Day 3**: Pull GA4 report: `screenPageViewsPerSession` — target: movement from 1.45 toward 1.7+
3. **Day 7**: Full comparison:
   - Pages/session before vs after
   - `/mods/[id]` pageview count before vs after
   - Revenue per session before vs after
   - Bounce rate change
4. **Day 14**: Final read — did pages/session reach 2.0?

### Rollback criteria
- If pages/session drops below 1.3 (regression — users confused by new navigation)
- If bounce rate increases more than 15% (users frustrated by being pushed to detail pages)
- If Mediavine RPM drops (unlikely, but monitor)

---

## 6. Success Metrics

| Metric | Current | Target (7 days) | Target (30 days) |
|--------|---------|-----------------|-------------------|
| Pages/Session | 1.45 | 1.7+ | 2.0+ |
| `/mods/[id]` pageviews/day | ~low (most clicks are modals) | 2x baseline | 3x baseline |
| Revenue/day | ~$170 | ~$200 | ~$235 |
| Avg Session Duration | ~310s | 350s+ | 400s+ |
| Bounce Rate | Unknown | -5% | -10% |

---

## 7. Key Architectural Decision: Modal vs. Page Navigation

This is the central product question for this initiative. The current modal pattern was likely chosen for UX speed (no page load), but it has a massive revenue cost:

**Modal (current)**:
- Faster perceived UX
- Zero additional pageviews
- Zero additional ad impressions
- Dead-end navigation (no related mods, no "more from creator")

**Detail page navigation**:
- Slightly slower (page load)
- +1 pageview per click
- Full ad impression set (content + sidebar + adhesion)
- Related mods + "more from creator" drive further pageviews
- SEO value (if Google ever recovers)

**Recommended hybrid approach**: Keep the modal as a "quick preview" but make it strongly funnel to the detail page. Add a prominent "View Full Details" CTA and a mini related-mods section. This preserves the quick-browse UX while creating natural paths to additional pageviews.

---

## 8. References

- GA4 property: 437117335
- Mediavine dashboard: `https://reporting.mediavine.com/sites/14318/`
- Related mods API: `app/api/mods/[id]/related/route.ts`
- Creator mods API: `app/api/mods/[id]/creator/route.ts`
- ModDetailsModal: `components/ModDetailsModal.tsx`
- ModCard click behavior: `components/ModCard.tsx` lines 34-39
- TrendingMods (unused): `components/TrendingMods.tsx`
