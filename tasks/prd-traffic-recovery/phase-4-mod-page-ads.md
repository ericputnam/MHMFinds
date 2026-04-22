# Phase 4 — In-content ads on mod landing pages

**Date**: 2026-04-22
**Source PRD**: `docs/PRD-traffic-recovery.md` (monetization follow-up to Phase 1/2)
**Phase**: 4 of 5
**Depends on**: Phase 1 (SSR mod pages — done, unshipped), Phase 2 (sitemap — done, unshipped). Safe to ship in parallel with Phase 3, or after.

## 1. Overview

**What**: Add Mediavine in-content display ad injection points (`.mv-ads`) on `/mods/[id]` landing pages so they monetize like blog posts do, not just sidebar + video.

**Why**: Phase 1 made `/mods/[id]` indexable. When Google starts sending traffic back (Phase 3 outcome), ~13K mod URLs become real landing pages. Today those pages have only:
- Sidebar sticky ad (`<aside id="secondary">`)
- Mediavine video player (`#mediavine-video-player`)

They're missing **in-content display ads** that inject between content blocks. Blog posts earn the majority of their RPM from these — adding them to mod pages is the single largest monetization lever on landing-page traffic that's about to grow.

**Reference**:
- `ModGrid` cells carry `.mv-ads` for grid-level injection (see CLAUDE.md "mv-ads needs multiple children for in-content injection")
- WordPress blog posts handle this via `functions.php` — we need to replicate the pattern in the React mod page
- Mediavine injects ads BETWEEN children of `.mv-ads` containers, so every insertion point needs ≥2 children

## 2. Acceptance Criteria

- [ ] `ModDetailClient.tsx` has in-content ad containers at these insertion points (each a `div.mv-ads` with ≥2 child blocks):
  - Between "About This Mod" description and "Tags" section
  - Between "Tags" and `ModContentSections` (Installation/Compatibility/FAQ)
  - Between `ModContentSections` and `MoreFromCreator`
  - Between `MoreFromCreator` and `RelatedMods`
  - (4 injection points total — matches typical blog post density)
- [ ] Each `.mv-ads` wrapper renders **on first paint**, before any loading/data fetch completes (per CLAUDE.md "Render ad anchors on first paint"). Since Phase 1 made the page a server component, this is already true — just need to make sure the new anchors are in the SSR'd HTML, not in any client-gated branch.
- [ ] No `position: sticky`, `position: fixed`, or `overflow: hidden` on any ad ancestor (per CLAUDE.md forbidden patterns).
- [ ] No extra `mediavine.newPageView()` calls — the global `usePageTracking` hook handles this (per CLAUDE.md "Double `mediavine.newPageView()` calls race and tear down all ads").
- [ ] Preserve existing Mediavine anchors:
  - `<aside id="secondary">` remains in the sidebar column
  - `#mediavine-video-player` stays where it is (above description)
- [ ] Regression test in `__tests__/unit/mod-detail-ads.test.ts`:
  - Source-level: file contains ≥4 `mv-ads` class references in `ModDetailClient.tsx`
  - Source-level: `<aside id="secondary">` still present
  - Source-level: `#mediavine-video-player` still present
  - Source-level: NO `position: sticky` / `position: fixed` / `overflow: hidden` on ad containers or their ancestors
- [ ] `npm run build` succeeds, no new warnings
- [ ] Dev server curl of `/mods/{id}` returns HTML containing ≥4 `class="mv-ads"` occurrences
- [ ] Visual browser check: load 3 mod pages, confirm ads render in-flow between content blocks (not in sidebar/header/footer)
- [ ] Mediavine sidebar sticky health score does NOT drop after deploy (monitor via existing `scripts/agents/check-blog-sidebar.sh` pattern — may need a mod-page variant)

## 3. Technical Approach

### Step 1: Failing test first

Create `__tests__/unit/mod-detail-ads.test.ts` that reads `app/mods/[id]/ModDetailClient.tsx` as source text and asserts:
- Contains ≥4 `mv-ads` class references
- Contains `id="secondary"`
- Contains `id="mediavine-video-player"`
- Does NOT contain `position: sticky` / `position: fixed` / `overflow-hidden` on any line that also mentions `mv-ads` or `secondary` or `mediavine-video-player`

This is the same regression-test pattern as `__tests__/unit/sidebar-sticky-health.test.ts` — source-code assertions, not runtime.

### Step 2: Add insertion points

In `app/mods/[id]/ModDetailClient.tsx`, wrap the insertion points like this (Mediavine injects BETWEEN children, so every `.mv-ads` needs ≥2 children):

```tsx
{/* Between description and tags */}
<div className="mv-ads my-6">
  <div /> {/* dummy first child — Mediavine injects an ad after this */}
  <div /> {/* dummy second child — anchors the injection point */}
</div>
```

The cleanest pattern: use an explicit `<InContentAd />` helper component that renders two empty divs with a wrapper:

```tsx
function InContentAd() {
  return (
    <div className="mv-ads my-6" aria-hidden="true">
      <div />
      <div />
    </div>
  );
}
```

Then drop `<InContentAd />` at the 4 insertion points.

### Step 3: Verify live

- `curl http://localhost:3001/mods/{id} | grep -c 'class="mv-ads"'` → ≥4
- Browser check 3 mod pages. Open DevTools → Network tab → filter on `mediavine`. Confirm multiple ad requests fire, ads render inline between content blocks.
- Confirm sidebar ad (`#secondary`) still renders.
- Confirm video player still renders.

### Step 4: Sidebar-health regression guard

Extend the existing `__tests__/unit/sidebar-sticky-health.test.ts` with a "Mod page ad anchors" section that covers the same forbidden patterns for the mod detail page. (Or keep it in the new `mod-detail-ads.test.ts` — either works.)

## 4. Files to Modify

| File | Change Type |
|------|-------------|
| `app/mods/[id]/ModDetailClient.tsx` | Add 4 `.mv-ads` insertion points, optionally an `InContentAd` helper |
| `__tests__/unit/mod-detail-ads.test.ts` | **New** — source-level regression guard |
| `__tests__/unit/sidebar-sticky-health.test.ts` | Optional: extend to cover mod detail page ad anchors |

No schema changes, no new scripts, no new routes.

## 5. Testing Plan

1. **Failing test**: `npx vitest run __tests__/unit/mod-detail-ads.test.ts` — MUST fail (no `.mv-ads` yet).
2. **Implement**: Add 4 injection points.
3. **Green**: Re-run — all pass.
4. **Existing tests**: `npx vitest run __tests__/unit/sidebar-sticky-health.test.ts __tests__/unit/mods-detail-metadata.test.ts` — still pass.
5. **Build**: `npm run build` — clean.
6. **Dev verify**: `curl http://localhost:3001/mods/{id} | grep -c 'class="mv-ads"'` → ≥4.
7. **Browser verify**: Load 3 mod pages on the dev server. Ads render between content blocks, not in sidebar/header. Sidebar sticky still works.
8. **Prod monitor**: After deploy, watch Mediavine sidebar sticky health score for 7 days. Watch mod-page RPM for 14 days. If sidebar health drops, rollback.

## 6. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Inserting `.mv-ads` breaks the existing Mediavine sidebar detection | Low | Keep `<aside id="secondary">` untouched. `.mv-ads` is a different mechanism and doesn't interfere. Regression test asserts both still present. |
| Ads crowd out content and hurt UX (bounce rate ↑, dwell time ↓) | Medium | Start with 4 insertion points (same density as blog posts). If bounce rate spikes in GA4, reduce to 3 or 2. |
| Mediavine injects an ad slot count that exceeds what the page can fill, leaving empty gaps | Low | Mediavine handles empty-slot collapse natively. `min-height` on the wrapper would cause gaps — do NOT set one. |
| `position: sticky` / `overflow: hidden` sneaks into a parent div during refactor and kills ad rendering | Medium | Regression test specifically checks for these patterns on ad-related lines. Same pattern as `sidebar-sticky-health.test.ts`. |
| Viewability drops because ads inject too close to the fold and users scroll past before they render | Low-medium | First `.mv-ads` is below the fold (after description). Mediavine lazy-loads ads anyway. |
| Double pageview signal if someone adds `newPageView()` while wiring this up | Low | Do NOT add any `newPageView()` call. Global `usePageTracking` already handles it. Explicit comment in the code. |
| Mod pages with very short content (no description, no tags, no content sections) stack 4 ads in 200px of content | Medium | Mediavine's "no adjacent ads" logic handles this — slots too close together don't fill. But worth watching in dev: pick a thin mod page and confirm it doesn't look spammy. |

## 7. Out of Scope

- Adding ads to `/creators/[handle]` pages (different page type, separate task).
- Adding ads to the search page — already has `.mv-ads` via `ModGrid`.
- Mediavine A/B test configuration (publishers@mediavine.com request — out of band).
- Migrating `/go/[modId]` ad placements — already covered by existing download interstitial work.
- Video-player placement tuning (current `data-video-type="floating"` is fine; inline anchoring is a known unreliable Mediavine quirk per CLAUDE.md).

## 8. Success Metrics (14-day window post-deploy)

- Mod-page RPM rises (current: sidebar + video only; target: +30-80% from adding 4 in-content slots)
- Sidebar sticky health score unchanged or rising
- GA4 bounce rate on `/mods/*` unchanged (±5%)
- GA4 avg session duration on `/mods/*` unchanged or rising
