# PRD: Clean Up Dead Code and Unused Imports

## 1. Overview

### What We're Building
A targeted codebase cleanup to remove confirmed dead code, unused imports, unused component props, and unreferenced exports across the MHMFinds project.

### Why
- **Reduce confusion**: Dead code with outdated references (e.g., old persona names) misleads developers
- **Smaller bundles**: Unused components and hooks bloat the client-side JavaScript
- **Cleaner API surface**: Unused exports in modules create a false sense of available functionality
- **Prevent bugs**: Unused props in component interfaces create contracts nobody honors

### Scope
This PRD focuses on **high-confidence removals** verified by grep/import analysis. It does NOT cover speculative removals, script archival, or auth module consolidation (those are separate initiatives).

## 2. Requirements

### Acceptance Criteria

- [ ] Remove all identified dead class properties
- [ ] Remove all identified dead methods with outdated references
- [ ] Remove unused component files that have zero importers
- [ ] Clean up unused props from component interfaces
- [ ] Remove unused analytics hook exports (keep the hooks that ARE used)
- [ ] Remove unused auth middleware exports from `lib/middleware/auth.ts`
- [ ] `npm run build` passes with zero new errors
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] No functional regressions

## 3. Technical Approach

### Phase 1: Dead Class Members (Safe, isolated changes)

| File | Item | Evidence | Action |
|------|------|----------|--------|
| `lib/services/aiSearch.ts:30` | `private maxTokens = 150` | Never referenced in the class. Embedding API doesn't use maxTokens. | Remove line |
| `lib/services/personaSwarmService.ts:498-515` | `getPersonaInsights()` method | Exported but never imported anywhere. References outdated persona names (`mia`, `luna`, `emily`, `sofia`, `claire`) that don't exist in current PERSONAS array. | Remove method |

### Phase 2: Unused Components (Zero importers confirmed via grep)

| File | Evidence | Action |
|------|----------|--------|
| `components/Features.tsx` | Not imported in any `app/` or `components/` file. Appears to be a replaced landing page component. | Delete file |
| `components/Stats.tsx` | Not imported in any `app/` or `components/` file. Replaced by other dashboard components. | Delete file |
| `components/FilterBar.tsx` | Not imported anywhere in the codebase (`grep` for `@/components/FilterBar` returns zero results). | Delete file |

### Phase 3: Unused Props (FilterBar removal makes this moot, but documenting pattern)

If FilterBar were kept, these props would need cleanup:
- `onCategoryChange` - defined in interface, destructured but never called
- `resultCount` - defined in interface, never destructured or used
- `facets` - defined in interface, never destructured or used

Since we're deleting FilterBar entirely (Phase 2), this is resolved.

### Phase 4: Unused Analytics Hooks

The `lib/hooks/useAnalytics.ts` file exports 7 hooks. Usage analysis:

| Hook | Used In | Status |
|------|---------|--------|
| `usePageTracking` | `app/providers.tsx` | **KEEP** |
| `useSearchTracking` | `app/page.tsx` | **KEEP** |
| `useDownloadTracking` | `components/subscription/ProtectedDownloadButton.tsx` | **KEEP** |
| `useAdTracking` | Nowhere (only in `docs/ANALYTICS_GUIDE.md` examples) | **REMOVE** |
| `useModTracking` | Nowhere (only in docs) | **REMOVE** |
| `useFavoriteTracking` | Nowhere (only in docs) | **REMOVE** |

**Action**: Remove `useAdTracking`, `useModTracking`, and `useFavoriteTracking` from the file. Also remove the now-unused `AnalyticsEventType` values: `AD_VIEW`, `AD_CLICK`, `MOD_VIEW`, `FAVORITE_ADD`, `FAVORITE_REMOVE`, `COLLECTION_ADD`.

### Phase 5: Unused Auth Middleware Exports

The `lib/middleware/auth.ts` file exports 5 functions. Only `requireAdmin` is imported (by 2 route files). The project has more robust auth modules in `lib/auth/adminAuth.ts` and `lib/auth/creatorAuth.ts`.

| Export | Used In | Status |
|--------|---------|--------|
| `requireAdmin` | `app/api/admin/submissions/[id]/approve/route.ts`, `app/api/admin/submissions/[id]/reject/route.ts` | **KEEP** |
| `requireAuth` | Nowhere in `app/` | **REMOVE** |
| `requireCreator` | Nowhere (separate `lib/auth/creatorAuth.ts` is used instead) | **REMOVE** |
| `requirePremium` | Nowhere | **REMOVE** |
| `optionalAuth` | Nowhere | **REMOVE** |

**Action**: Remove the 4 unused exports. Keep `requireAdmin` and its imports. Remove the example usage comment block at the bottom (references removed functions).

## 4. Files to Modify

| File | Changes |
|------|---------|
| `lib/services/aiSearch.ts` | Remove `private maxTokens = 150` (line 30) |
| `lib/services/personaSwarmService.ts` | Remove `getPersonaInsights()` method (lines 495-515) |
| `components/Features.tsx` | **Delete entire file** |
| `components/Stats.tsx` | **Delete entire file** |
| `components/FilterBar.tsx` | **Delete entire file** |
| `lib/hooks/useAnalytics.ts` | Remove `useAdTracking`, `useModTracking`, `useFavoriteTracking` hooks and unused event types |
| `lib/middleware/auth.ts` | Remove `requireAuth`, `requireCreator`, `requirePremium`, `optionalAuth` exports and trailing example comment |

**Total**: 7 files modified/deleted

## 5. Testing Plan

### Pre-Change Baseline
```bash
npm run type-check   # Must pass before starting
npm run build        # Must pass before starting
npm run lint         # Note existing warnings
```

### After Each Phase
```bash
npm run type-check   # Catch broken references immediately
```

### After All Changes
```bash
npm run build        # Full production build
npm run lint         # No new warnings
npm run dev          # Dev server starts cleanly
```

### Manual Smoke Tests
1. **AI Search**: Visit search page, perform a search (exercises `aiSearch.ts`)
2. **Admin submissions**: Verify approve/reject flows still work (exercises `lib/middleware/auth.ts:requireAdmin`)
3. **Analytics**: Page navigation still tracks views (exercises remaining hooks)
4. **Download tracking**: Click a download link (exercises `useDownloadTracking`)

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dynamic imports we missed | Low | Medium | All removals verified with project-wide grep. No dynamic `import()` patterns found for these modules. |
| Test files referencing removed code | Low | Low | Run `npm run type-check` after each phase to catch immediately. Update test mocks if needed. |
| Docs referencing removed hooks | Medium | Low | `ANALYTICS_GUIDE.md` references removed hooks in examples. Update doc examples to only show kept hooks. |
| FilterBar used via barrel export | Low | Medium | Verified no `index.ts` barrel file in `components/` re-exports FilterBar. |

### Rollback Plan
All changes are on a feature branch. If issues arise:
1. `git checkout main` to return to working state
2. Cherry-pick individual phases if only some changes are problematic

## 7. Out of Scope

- **Auth module consolidation**: The overlap between `lib/middleware/auth.ts` and `lib/auth/adminAuth.ts` is a separate refactoring task. We only remove unused exports here.
- **Script directory cleanup**: 122 scripts in `scripts/` need review but that's a separate initiative.
- **Commented-out code removal**: Requires different analysis methodology.
- **Test page cleanup**: Multiple test pages in `app/` (test/, working-test/, etc.) are out of scope.
- **Updating ANALYTICS_GUIDE.md**: Could be done as a follow-up but not blocking.

## 8. Definition of Done

- [ ] All 5 phases of changes applied
- [ ] 3 component files deleted (Features, Stats, FilterBar)
- [ ] 3 unused analytics hooks removed
- [ ] 4 unused auth middleware functions removed
- [ ] 2 dead class members removed
- [ ] `npm run build` passes
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] Changes on feature branch, ready for review
