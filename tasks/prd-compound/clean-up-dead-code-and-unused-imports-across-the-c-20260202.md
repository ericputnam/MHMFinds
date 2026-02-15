# PRD: Clean Up Dead Code and Unused Imports

**Date:** 2026-02-02
**Status:** Draft
**Branch:** `compound/clean-up-dead-code-and-unused-imports-across-the-c-20260202`

---

## 1. Overview

### What We're Building
A codebase cleanup initiative to remove dead code, unused imports, and duplicate code patterns across the MHMFinds application.

### Why
- Reduce bundle size and improve build times
- Improve code maintainability and readability
- Eliminate confusion from TODO comments that won't be implemented
- Consolidate duplicate code into shared utilities
- Prepare codebase for future development

---

## 2. Requirements

### Acceptance Criteria

1. **Unused Imports Removed**
   - [ ] Remove `Eye`, `MessageSquare`, `Users` from `app/mods/[id]/page.tsx`
   - [ ] Verify all other files have no unused imports

2. **Duplicate Code Consolidated**
   - [ ] Extract `FACET_COLORS` constant to `lib/constants/facetColors.ts`
   - [ ] Extract `formatFacetLabel()` function to a shared utility
   - [ ] Update `ModCard.tsx` and `ModDetailsModal.tsx` to use shared utilities

3. **Dead Code Addressed**
   - [ ] Either implement or remove TODO comments for download tracking in `app/mods/[id]/page.tsx`
   - [ ] Either implement or remove TODO comments for favorite functionality

4. **Unused API Methods Verified**
   - [ ] Audit `lib/api.ts` for unused methods (`getFeaturedMods`, `getModsByCategory`)
   - [ ] Remove any confirmed unused methods

5. **Build Verification**
   - [ ] `npm run build` succeeds without errors
   - [ ] `npm run lint` passes
   - [ ] `npm run type-check` passes

---

## 3. Technical Approach

### Phase 1: Create Shared Utilities

Create `lib/constants/facetColors.ts`:
```typescript
export const FACET_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  // ... consolidated color mapping
};

export function formatFacetLabel(facet: string): string {
  return facet.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
```

### Phase 2: Update Components

1. **ModCard.tsx**: Remove local `FACET_COLORS` and `formatFacetLabel`, import from shared utility
2. **ModDetailsModal.tsx**: Remove local `FACET_COLORS` and `formatFacetLabel`, import from shared utility
3. **app/mods/[id]/page.tsx**: Remove unused lucide-react imports

### Phase 3: Address TODOs

For the TODO comments, two options:
- **Option A (Recommended)**: Remove the TODO comments since tracking/favorites are future features
- **Option B**: Implement basic tracking via API calls (scope creep risk)

### Phase 4: API Cleanup

1. Search codebase for usages of `getFeaturedMods` and `getModsByCategory`
2. Remove any methods that have zero usage
3. Keep methods that might be used by external callers or future features (document decision)

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `lib/constants/facetColors.ts` | **CREATE** - New shared constants file |
| `components/ModCard.tsx` | Remove local FACET_COLORS and formatFacetLabel, add import |
| `components/ModDetailsModal.tsx` | Remove local FACET_COLORS and formatFacetLabel, add import |
| `app/mods/[id]/page.tsx` | Remove unused imports (Eye, MessageSquare, Users), address TODOs |
| `lib/api.ts` | Potentially remove unused methods after audit |

---

## 5. Testing Plan

### Pre-Change
```bash
npm run build    # Capture current state
npm run lint     # Note any existing warnings
```

### Post-Change Verification
```bash
npm run type-check   # Ensure no type errors
npm run lint         # Ensure no lint errors
npm run build        # Full production build
npm run dev          # Manual smoke test
```

### Manual Testing
1. Navigate to mod detail page (`/mods/[id]`) - verify no visual regressions
2. Check mod cards render correctly with facet badges
3. Open ModDetailsModal - verify styling intact
4. Verify download and favorite buttons still work (even if not tracking)

### Webpack Cache
After changes, run `npm run clean` if any build errors occur related to cached modules.

---

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Removing import that's actually used | Low | High | Run `npm run build` + `npm run type-check` after each change |
| Breaking facet styling | Medium | Medium | Test visually after consolidating FACET_COLORS |
| API method removal breaks feature | Low | High | Search entire codebase before removing any API method |
| Webpack cache corruption | Medium | Low | Run `npm run clean` if build errors occur |

### Rollback Plan
All changes are isolated to specific files. If issues arise:
1. Revert the specific file(s) causing issues
2. Or revert entire branch if needed: `git checkout main`

---

## 7. Out of Scope

- Implementing the download tracking feature (just removing TODO)
- Implementing the favorite tracking feature (just removing TODO)
- Refactoring other code patterns (focus only on dead code/unused imports)
- Adding new lint rules or automated dead code detection

---

## 8. Definition of Done

- [ ] All unused imports removed
- [ ] FACET_COLORS consolidated to shared constant
- [ ] formatFacetLabel consolidated to shared utility
- [ ] TODO comments either implemented or removed
- [ ] Unused API methods removed (if confirmed unused)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] No visual regressions in UI
