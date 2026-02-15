# PRD: Clean Up Dead Code and Unused Imports Across the Codebase

**Date**: 2026-02-07
**Branch**: `compound/clean-up-dead-code-and-unused-imports-across-the-c-20260207`

## 1. Overview

**What**: Remove unused imports, dead code, and orphaned files identified via static analysis (TypeScript compiler, ESLint, and manual grep-based import auditing).

**Why**: Unused imports and dead code increase cognitive load, slow IDE autocompletion, inflate bundle size, and create false leads during debugging. This cleanup round targets issues that survived previous cleanup passes.

## 2. Requirements

### Acceptance Criteria

- [ ] All unused named imports are removed from affected files
- [ ] Orphaned components not imported anywhere are removed or flagged
- [ ] No new TypeScript errors introduced (`npx tsc --noEmit` passes)
- [ ] No new ESLint errors introduced (`npm run lint` passes)
- [ ] `npm run build` succeeds
- [ ] No functional changes to runtime behavior

## 3. Technical Approach

### Phase 1: Remove Unused Imports (Low Risk)

Remove named imports that are imported but never referenced in the file body.

| File | Unused Imports | Action |
|------|---------------|--------|
| `lib/services/actionExecutor.ts:10-11` | `ActionStatus`, `ActionType`, `ActionHandler` | Remove from import statements |
| `lib/services/privacyAggregator.ts:4-5` | `HttpsProxyAgent`, `SocksProxyAgent` | Remove import lines |
| `lib/services/visionFacetExtractor.ts:11` | `prisma` | Remove import line |
| `app/api/subscription/check-limit/route.ts:4` | `SubscriptionService` | Remove import line |
| `app/admin/mods/page.tsx:4-5,8` | `UsersIcon`, `Eye`, `Edit`, `Download` | Remove from lucide-react imports |
| `components/ModCard.tsx:6` | `Eye` | Remove from lucide-react import |
| `components/ModGrid.tsx:7` | `Search`, `Heart`, `TrendingUp`, `Sparkles`, `Filter` | Remove from lucide-react import |
| `components/UsageIndicator.tsx:5` | `Download` | Remove from lucide-react import |

### Phase 2: Remove Orphaned Files (Medium Risk)

Files that are not imported by any other file in `app/`, `lib/`, or `components/`. Verify each before deleting.

| File | Status | Action |
|------|--------|--------|
| `components/FilterBar.tsx` | Not imported anywhere | Delete |
| `components/subscription/UpgradeModal.tsx` | Not imported anywhere | Delete |

**Note**: The following service files are orphaned from the main app but are imported by scripts in `scripts/`. They should be **kept**:
- `lib/services/amazonCreatorsApiService.ts` — standalone service, may be used in future
- `lib/services/amazonScraperService.ts` — fallback scraper
- `lib/services/contentAggregator.ts` — used by aggregation scripts
- `lib/services/personaSwarmService.ts` — used by curation scripts

### Phase 3: Clean Up Dead Code Patterns (Low Risk)

| File | Issue | Action |
|------|-------|--------|
| `lib/services/actionHandlers/index.ts:66-69` | Commented-out future handler registrations | Remove commented-out code |

## 4. Files to Modify

| File | Changes |
|------|---------|
| `lib/services/actionExecutor.ts` | Remove unused `ActionStatus`, `ActionType`, `ActionHandler` imports |
| `lib/services/privacyAggregator.ts` | Remove unused `HttpsProxyAgent`, `SocksProxyAgent` imports |
| `lib/services/visionFacetExtractor.ts` | Remove unused `prisma` import |
| `lib/services/actionHandlers/index.ts` | Remove commented-out handler registrations |
| `app/api/subscription/check-limit/route.ts` | Remove unused `SubscriptionService` import |
| `app/admin/mods/page.tsx` | Remove unused lucide-react icons from import |
| `components/ModCard.tsx` | Remove unused `Eye` from import |
| `components/ModGrid.tsx` | Remove unused icons from lucide-react import |
| `components/UsageIndicator.tsx` | Remove unused `Download` from import |
| `components/FilterBar.tsx` | **DELETE** — orphaned component |
| `components/subscription/UpgradeModal.tsx` | **DELETE** — orphaned component |

**Total**: 9 files modified, 2 files deleted

## 5. Testing Plan

### Pre-Change Verification
```bash
npx tsc --noEmit          # Must pass (currently clean)
npm run lint              # Capture baseline warnings
npm run build             # Must succeed
```

### Post-Change Verification
```bash
npx tsc --noEmit          # Must still pass
npm run lint              # Warning count should decrease or stay same
npm run build             # Must succeed
```

### Manual Checks
- Verify no runtime errors on key pages: homepage, mod detail, admin panel
- Grep for any remaining references to deleted files:
  ```bash
  grep -r "FilterBar\|UpgradeModal" --include="*.ts" --include="*.tsx" app/ components/ lib/
  ```

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Removing an import that's actually used via side effects | Low | Medium | TypeScript compiler will catch missing references |
| Deleting a component that's dynamically imported | Low | High | Grep for string references before deleting; check `dynamic()` calls |
| Breaking tree-shaking by changing import structure | Very Low | Low | Build verification catches bundle issues |
| Removing proxy agent imports that are conditionally used | Medium | Medium | Read full `privacyAggregator.ts` to verify agents aren't used in conditional paths |

### Rollback Plan
All changes are purely subtractive (removing code). If any issue arises, revert the commit.

## 7. Out of Scope

- Fixing ESLint warnings (`react-hooks/exhaustive-deps`, `no-img-element`) — these are functional code, not dead code
- Refactoring or restructuring files
- Adding new imports or functionality
- Cleaning up `scripts/` directory (different scope)

## 8. Definition of Done

1. All listed unused imports are removed
2. Orphaned components are deleted
3. `npx tsc --noEmit` passes with zero errors
4. `npm run build` succeeds
5. No functional behavior changes
