# Initiative 2: Fix Sidebar Sticky Health Score (12.9 → 50+)

**Created**: 2026-04-13
**Completed**: 2026-04-13
**Status**: Complete — deployed to production
**Parent PRD**: `tasks/prd-revenue-pivot/PRD-revenue-pivot.md`
**Priority**: Immediate — each day at 12.9 leaves money on the table
**Estimated Revenue Impact**: Sidebar Sticky earns $389/30 days = ~$13/day currently. At health score 50+ it should 3-4x → ~$40-50/day = +$800-1,100/month.

### Implementation Summary
- All Phase 1 fixes shipped and deployed 2026-04-13
- 23 regression tests added (`__tests__/unit/sidebar-sticky-health.test.ts`)
- Additional fix: removed 300px left spacer divs for wider mod grid
- Commits: `e216bea`, `1a89be5`, `54e23b0` on main

---

## 1. Problem Statement

Mediavine's "Sticky Sidebar Ads" health score is **12.9** (target: 50+). This means Mediavine is only successfully placing sticky sidebar ads on ~13% of eligible pageviews. The sidebar was restored on Apr 8 after the Mar 17 wipe incident, and RPM has recovered from $9.53 to $16.53, but the sidebar health score indicates significant unrealized revenue.

### Current Revenue Context (Apr 13 dashboard read)

| Ad Unit | Revenue (30d) | Share |
|---------|--------------|-------|
| Content | $2,431 | 47.8% |
| Adhesion | $1,256 | 24.7% |
| Universal Player | $1,009 | 19.8% |
| **Sidebar Sticky** | **$389** | **7.6%** |
| Sidebar | $4 | 0.1% |

At a healthy score (50+), sidebar sticky should be 12-18% of revenue, not 7.6%.

---

## 2. Root Causes (Code Audit Findings)

### Problem 1: GamePageClient is MISSING the sidebar entirely
**File**: `app/games/[game]/GamePageClient.tsx`
**Issue**: No `<aside id="secondary">` exists on any `/games/[game]/` browse page. These pages get significant traffic but earn zero sidebar sticky impressions.
**Fix**: Add the standard sidebar aside markup in a flex/grid layout.

### Problem 2: Homepage sidebar hidden until 1280px (`xl:block`)
**File**: `app/page.tsx` (line ~431)
**Issue**: Homepage uses `hidden xl:block` (1280px) while all other pages use `hidden lg:block` (1024px). Common laptop viewports (1024-1279px) see no sidebar on the highest-traffic page.
**Fix**: Change `xl:block` to `lg:block` on the homepage aside.

### Problem 3: Placeholder divs may be undersized
**Files**: `app/mods/[id]/page.tsx` (line ~465), `app/games/[game]/[topic]/CollectionPageClient.tsx` (line ~195)
**Issue**: Two `min-h-[250px]` divs = 500px total. The WordPress blog sidebar is empty and Mediavine fills it with its own stacked containers. The 500px placeholders may be confusing Mediavine's auto-fill algorithm.
**Fix**: Test with empty aside (matching WordPress pattern) vs current 500px placeholders.

### Problem 4: Blog sidebar only fires on single posts
**File**: `staging/wordpress/kadence-child-prod/functions.php` (lines ~4596-4608)
**Issue**: `is_single()` guard means archive, category, tag, search, and blog homepage all explicitly hide `#secondary` with `display:none !important`. Intentional per code comments, but means zero sidebar impressions on blog listing pages.
**Fix**: Evaluate extending sidebar to archive/category pages (these have similar content depth to single posts). Lower priority — blog listing pages may not have enough scroll depth.

### Problem 5: Mediavine health check viewport
**Issue**: If Mediavine's health crawler measures at tablet viewports (<1024px), all Next.js sidebars are `display:none` via `hidden lg:block`. This would structurally suppress the score. However, since 94% of traffic is desktop per Mediavine's device report, this is likely a minor contributor.
**Fix**: No code fix — this is inherent to responsive design. The other fixes matter more.

---

## 3. Implementation Plan

### Phase 1: Quick wins (ship same day)

**Fix 1a — Add sidebar to GamePageClient.tsx**
```tsx
// Add to the layout, after the main content column
<aside
  id="secondary"
  className="widget-area primary-sidebar hidden lg:block overflow-visible"
  role="complementary"
  aria-label="Sidebar ads"
>
  {/* Empty — Mediavine auto-fills */}
</aside>
```
Wrap the existing content + aside in a grid or flex layout matching the `/mods/[id]` pattern.

**Fix 1b — Change homepage sidebar breakpoint**
In `app/page.tsx`, change:
```
hidden xl:block → hidden lg:block
```
This exposes the sidebar to 1024-1279px viewports on the homepage.

**Fix 1c — Test empty aside vs placeholder divs**
On one page (e.g., collection pages), try removing the inner `<div className="min-h-[250px]">` placeholders and leaving the `<aside>` empty, matching the WordPress pattern. If Mediavine fills it better, apply across all pages.

### Phase 2: Measure (3-5 days after deploy)

- Check Mediavine health score daily
- Compare sidebar sticky revenue per day before/after
- Verify no layout shift issues from the changes

### Phase 3: Blog listing pages (optional, pending data)

- If health score still low after Phase 1, evaluate extending `mhm_inject_mediavine_sidebar()` to blog archive/category pages by relaxing the `is_single()` guard

---

## 4. Files to Modify

| File | Change |
|------|--------|
| `app/games/[game]/GamePageClient.tsx` | Add `<aside id="secondary">` in grid/flex layout |
| `app/page.tsx` | Change `hidden xl:block` → `hidden lg:block` on aside |
| `app/games/[game]/[topic]/CollectionPageClient.tsx` | Test: remove inner placeholder divs, leave aside empty |
| `app/mods/[id]/page.tsx` | Test: same placeholder removal if collection page test succeeds |

---

## 5. Testing Plan

### Pre-deploy
1. `npm run build` — clean build, no errors
2. Visual check: dev server at 1024px viewport width — sidebar visible on homepage, game browse, collection, and mod detail pages
3. Visual check: dev server at 768px — sidebar hidden on all pages (mobile)
4. Verify `<aside id="secondary" class="widget-area primary-sidebar">` present in HTML source on all four page types

### Post-deploy
1. **Day 1**: Run `check-blog-sidebar.sh` to verify blog sidebar still intact
2. **Day 1**: Manually load each page type in Chrome DevTools, verify Mediavine fills the sidebar (look for `div[data-type="ad"]` inside `#secondary`)
3. **Day 3**: Check Mediavine health score — target: movement from 12.9 toward 25+
4. **Day 5-7**: Check sidebar sticky revenue — target: $30+/day (up from ~$13/day)
5. **Day 7**: Full dashboard read — compare RPM and sidebar share vs pre-deploy baseline

### Rollback criteria
- If sidebar sticky health score drops below 12.9 (regression)
- If total RPM drops more than 10% for 2+ consecutive days
- If layout breaks on any page type (CLS issues, content overlap)

---

## 6. Success Metrics

| Metric | Current | Target (7 days) | Target (30 days) |
|--------|---------|-----------------|-------------------|
| Sidebar Sticky Health Score | 12.9 | 25+ | 50+ |
| Sidebar Sticky Revenue/day | ~$13 | ~$30 | ~$50 |
| Sidebar Sticky % of total | 7.6% | 12% | 15%+ |
| Session RPM | $16.53 (Apr 11) | Maintain $15+ | $17+ |

---

## 7. References

- Mediavine dashboard: `https://reporting.mediavine.com/sites/14318/`
- CLAUDE.md sidebar forbidden patterns (never use `position: sticky`, `overflow: hidden`, `display: none` on sidebar ancestors)
- Incident: `incident_blog_sidebar_wipe_mar17.md` — context on the original sidebar wipe
- WordPress sidebar code: `staging/wordpress/kadence-child-prod/functions.php` lines 4596-4672
