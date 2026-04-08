# PRD: Clean Up Dead Code and Unused Imports Across the Codebase

**Date**: 2026-03-17
**Branch**: `compound/clean-up-dead-code-and-unused-imports-across-the-c-20260317`
**Prior PRDs**: `...-20260313.md` and earlier (same scope, incrementally refined)

## 1. Overview

**What**: Remove unused imports, dead exports, orphaned services, unused analytics hooks, commented-out code, and archive scripts across the codebase. Extract duplicated constants into a shared module.

**Why**: Dead code inflates bundle size (especially unused lucide-react icons that aren't tree-shaken), creates false leads during debugging, and adds cognitive noise. Unused service files and analytics hooks suggest features that were prototyped but never integrated — keeping them confuses future developers about what's active. The `scripts/archive/` directory contains 62 old scripts that serve no production purpose.

## 2. Requirements

### Acceptance Criteria

- [ ] All unused named imports removed from affected files
- [ ] Orphaned components not imported anywhere are deleted
- [ ] Unused service exports removed or files deleted
- [ ] Unused analytics hooks removed
- [ ] Commented-out dead code removed
- [ ] `scripts/archive/` directory removed (62 files)
- [ ] FACET_COLORS duplication addressed (extract to shared module)
- [ ] No new TypeScript errors (`npx tsc --noEmit` error count ≤ baseline)
- [ ] `npm run build` succeeds
- [ ] No functional/runtime behavior changes

## 3. Technical Approach

### Phase 1: Remove Unused Imports (Low Risk)

| File | Unused Imports | Action |
|------|---------------|--------|
| `lib/services/privacyAggregator.ts:4-5` | `HttpsProxyAgent`, `SocksProxyAgent` | Remove import lines |
| `lib/services/visionFacetExtractor.ts:11` | `prisma` | Remove import line |
| `app/api/subscription/check-limit/route.ts:4` | `SubscriptionService` | Remove import (route returns hardcoded response) |
| `components/ModCard.tsx:7` | `Eye` | Remove from lucide-react import |
| `components/ModGrid.tsx:7` | `Search`, `Heart`, `TrendingUp`, `Sparkles`, `Filter` | Remove from lucide-react import |
| `components/subscription/UsageIndicator.tsx:5` | `Download` | Remove from lucide-react import |
| `app/mods/[id]/page.tsx:19` | `MessageSquare`, `Users` | Remove from lucide-react import |
| `app/mods/[id]/page.tsx` | `TrendingUp`, `Calendar` | Remove from lucide-react import |

### Phase 2: Remove Dead Exports and Unused Services (Medium Risk)

| File | Issue | Action |
|------|-------|--------|
| `lib/api.ts` | `apiClient` export never imported anywhere — app uses direct fetch() | Remove `apiClient` instance export (keep ApiClient class only if used elsewhere, otherwise delete entire file) |
| `lib/services/personaSwarmService.ts` | Exported singleton never imported anywhere | Delete file |
| `lib/hooks/useAnalytics.ts` | `useAdTracking`, `useModTracking`, `useFavoriteTracking`, `trackEvent` — exported but never imported | Remove these 4 exports (keep `useSearchTracking`, `usePageTracking`, `useDownloadTracking` which ARE used) |

### Phase 3: Remove Orphaned Files (Medium Risk)

| File | Evidence | Action |
|------|----------|--------|
| `components/subscription/UpgradeModal.tsx` | Only referenced in `.md` files — zero `.ts`/`.tsx` imports | Delete |
| `lib/services/amazonScraperService.ts` | Only imported in `scripts/archive/` | Delete |
| `lib/services/amazonCreatorsApiService.ts` | Only imported in `scripts/archive/` | Delete |

### Phase 4: Clean Up Dead Code (Low Risk)

| File | Issue | Action |
|------|-------|--------|
| `lib/services/actionHandlers/index.ts:66-69` | Commented-out handler registrations | Remove commented-out code |

### Phase 5: Extract Duplicated Constants (Low Risk)

| Files | Issue | Action |
|-------|-------|--------|
| `components/ModCard.tsx`, `components/ModDetailsModal.tsx` | Identical `FACET_COLORS` object duplicated (~42 lines each) | Extract to `lib/facetColors.ts`, import in both files |

### Phase 6: Remove Archive Scripts (Low Risk)

| Directory | Count | Action |
|-----------|-------|--------|
| `scripts/archive/` | 62 files (21 root + 41 in `/ralph`) | Delete entire directory |

### NOT in Scope

- **`lib/services/mhmScraperUtils.ts`**: Exports consumed by tests — intentional test-first pattern. Do not remove.
- **`app/mods/[id]/page.tsx` gradient violations**: Styling fix, not dead code.
- **Integration test `TS18048` errors**: Strict-null-check warnings in test files.
- **TODO comments**: Incomplete features, not dead code.
- **`app/admin/mods/page.tsx` icons**: All used in JSX (incorrectly flagged in earlier PRDs).

## 4. Files to Modify

| File | Change Type |
|------|------------|
| `lib/services/privacyAggregator.ts` | Remove 2 unused imports |
| `lib/services/visionFacetExtractor.ts` | Remove 1 unused import |
| `lib/services/actionHandlers/index.ts` | Remove commented-out code |
| `lib/services/personaSwarmService.ts` | **DELETE** |
| `lib/services/amazonScraperService.ts` | **DELETE** |
| `lib/services/amazonCreatorsApiService.ts` | **DELETE** |
| `lib/api.ts` | Remove unused `apiClient` export (or delete file if nothing else used) |
| `lib/hooks/useAnalytics.ts` | Remove 4 unused exports |
| `lib/facetColors.ts` | **CREATE** — shared FACET_COLORS constant |
| `app/api/subscription/check-limit/route.ts` | Remove 1 unused import |
| `app/mods/[id]/page.tsx` | Remove 4 unused icons from import |
| `components/ModCard.tsx` | Remove 1 unused icon, replace FACET_COLORS with import |
| `components/ModGrid.tsx` | Remove 5 unused icons from import |
| `components/ModDetailsModal.tsx` | Replace FACET_COLORS with import |
| `components/subscription/UsageIndicator.tsx` | Remove 1 unused icon |
| `components/subscription/UpgradeModal.tsx` | **DELETE** |
| `scripts/archive/` | **DELETE** directory (62 files) |

**Total**: ~12 files modified, ~5 files deleted, 1 directory deleted, 1 file created

## 5. Testing Plan

### Pre-Change
```bash
npx tsc --noEmit          # Record baseline error count
npm run build             # Must succeed
npm run test              # Record baseline test results
```

### Post-Change
```bash
npx tsc --noEmit          # Error count must not increase
npm run build             # Must succeed
npm run test              # All tests pass
```

### Verify No Dangling References
```bash
# Deleted files should have zero source-file references
grep -r "UpgradeModal" --include="*.ts" --include="*.tsx" app/ components/ lib/
grep -r "personaSwarmService" --include="*.ts" --include="*.tsx" app/ components/ lib/
grep -r "amazonScraperService" --include="*.ts" --include="*.tsx" app/ components/ lib/
grep -r "amazonCreatorsApiService" --include="*.ts" --include="*.tsx" app/ components/ lib/
grep -r "apiClient" --include="*.ts" --include="*.tsx" app/ components/ lib/

# FACET_COLORS should only exist in lib/facetColors.ts + 2 import sites
grep -r "FACET_COLORS" --include="*.ts" --include="*.tsx" app/ components/ lib/
```

### Visual Verification
- Mod detail page renders correctly (no missing icons)
- ModCard and ModDetailsModal show correct facet colors
- ModGrid renders without errors
- Admin pages unaffected

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Removing import used via side effects | Very Low | Medium | All identified imports are named exports — no side effects |
| `UpgradeModal` dynamically imported | Low | High | Grep confirms zero `.ts`/`.tsx` imports |
| `personaSwarmService` used at runtime | Low | High | Full codebase grep shows zero imports outside its own file |
| `apiClient` used in client-side code | Low | Medium | Grep confirms zero imports — app uses direct fetch() |
| Amazon services needed for future work | Low | Low | Git history preserves the code; can restore if needed |
| Archive scripts contain useful reference code | Very Low | Low | Available in git history |
| FACET_COLORS extraction breaks styling | Very Low | Low | Constant is identical in both files; extract is mechanical |
| Dead code removal cascading (CLAUDE.md gotcha) | Medium | Medium | Always grep for imports before deleting any file |

### Rollback Plan
All changes are subtractive (plus one constant extraction). Revert the commit if any issue arises.
