# PRD: Clean Up Dead Code and Unused Imports Across the Codebase

**Date**: 2026-03-12
**Branch**: `compound/clean-up-dead-code-and-unused-imports-across-the-c-20260312`
**Prior PRD**: `clean-up-dead-code-and-unused-imports-across-the-c-20260311.md` (same scope, refreshed)

## 1. Overview

**What**: Remove unused imports, dead code, commented-out code, and orphaned components across the codebase.

**Why**: Unused imports inflate bundle size (especially lucide-react icons that aren't tree-shaken), create false leads during debugging, and add cognitive noise. This continues cleanup work from Feb 2-7 — some issues persist and new ones appeared from the RPM optimization branch (merged as commit 9820738).

## 2. Requirements

### Acceptance Criteria

- [ ] All unused named imports removed from affected files
- [ ] Orphaned components not imported anywhere are deleted
- [ ] Commented-out dead code removed
- [ ] No new TypeScript errors (`npx tsc --noEmit` error count ≤ 19)
- [ ] `npm run build` succeeds
- [ ] No functional/runtime behavior changes
- [ ] FACET_COLORS duplication addressed (extract to shared module)

## 3. Technical Approach

### Phase 1: Remove Unused Imports (Low Risk)

| File | Unused Imports | Action |
|------|---------------|--------|
| `lib/services/privacyAggregator.ts:4-5` | `HttpsProxyAgent`, `SocksProxyAgent` | Remove import lines |
| `lib/services/visionFacetExtractor.ts:11` | `prisma` | Remove import line |
| `app/api/subscription/check-limit/route.ts:4` | `SubscriptionService` | Remove import (route returns hardcoded response) |
| `components/ModCard.tsx:7` | `Eye` | Remove from lucide-react import |
| `components/ModGrid.tsx:7` | `Search`, `Heart`, `TrendingUp`, `Sparkles`, `Filter` | Remove from lucide-react import (only `Loader2`, `AlertCircle`, `Package` used) |
| `components/subscription/UsageIndicator.tsx:5` | `Download` | Remove from lucide-react import (only `Crown` used) |
| `app/admin/mods/page.tsx:9,13,15,20` | `Edit`, `Download`, `ExternalLink`, `Check` | Remove from lucide-react import |

### Phase 2: Remove Orphaned Files (Medium Risk)

| File | Evidence | Action |
|------|----------|--------|
| `components/subscription/UpgradeModal.tsx` | Only referenced in planning docs (`.md` files) — zero `.ts`/`.tsx` imports | Delete |

### Phase 3: Clean Up Dead Code (Low Risk)

| File | Issue | Action |
|------|-------|--------|
| `lib/services/actionHandlers/index.ts:66-69` | Commented-out handler registrations (`GENERATE_INTERNAL_LINKS`, `EXPAND_CONTENT`, `UPDATE_AD_PLACEMENT`) | Remove commented-out code |

### Phase 4: Extract Duplicated Constants (Low Risk)

| Files | Issue | Action |
|-------|-------|--------|
| `components/ModCard.tsx:11-42`, `components/ModDetailsModal.tsx:10-54` | Identical `FACET_COLORS` object duplicated | Extract to `lib/facetColors.ts`, import in both files |

### NOT in Scope

- **`lib/services/mhmScraperUtils.ts`**: Exports consumed only by tests — intentional test-first pattern before integration into `mhmScraper.ts`. **Do not remove.**
- **`app/mods/[id]/page.tsx` gradient violations**: Styling fix, not dead code. Track separately per CLAUDE.md.
- **Integration test `TS18048` errors**: Strict-null-check warnings in test files, not dead code.
- **TODO comments** in `app/mods/[id]/page.tsx` (download tracking, favorites): Incomplete features, not dead code.

## 4. Files to Modify

| File | Change Type |
|------|------------|
| `lib/services/privacyAggregator.ts` | Remove 2 unused imports |
| `lib/services/visionFacetExtractor.ts` | Remove 1 unused import |
| `lib/services/actionHandlers/index.ts` | Remove 4 lines of commented-out code |
| `app/api/subscription/check-limit/route.ts` | Remove 1 unused import |
| `app/admin/mods/page.tsx` | Remove 4 unused icons from import |
| `components/ModCard.tsx` | Remove 1 unused icon, replace FACET_COLORS with import |
| `components/ModGrid.tsx` | Remove 5 unused icons from import |
| `components/subscription/UsageIndicator.tsx` | Remove 1 unused icon from import |
| `components/subscription/UpgradeModal.tsx` | **DELETE** — orphaned component |
| `components/ModDetailsModal.tsx` | Replace FACET_COLORS with import |
| `lib/facetColors.ts` | **CREATE** — shared FACET_COLORS constant |

**Total**: 9 files modified, 1 file deleted, 1 file created

## 5. Testing Plan

### Pre-Change
```bash
npx tsc --noEmit          # Baseline: 19 errors (all in test files)
npm run build             # Must succeed
```

### Post-Change
```bash
npx tsc --noEmit          # Error count must not increase above 19
npm run build             # Must succeed
npm run test              # Unit tests pass
```

### Verify No Dangling References
```bash
# UpgradeModal should have zero source-file references
grep -r "UpgradeModal" --include="*.ts" --include="*.tsx" app/ components/ lib/

# FACET_COLORS should only exist in lib/facetColors.ts (definition) + 2 imports
grep -r "FACET_COLORS" --include="*.ts" --include="*.tsx" app/ components/ lib/
```

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Removing import used via side effects | Very Low | Medium | All identified imports are named exports (icons, classes) — no side effects |
| `UpgradeModal` dynamically imported | Low | High | Grep confirms zero `.ts`/`.tsx` imports; only in `.md` docs |
| Breaking admin page by removing wrong icon | Low | Medium | Each icon verified against JSX usage with line-level grep |
| `privacyAggregator` proxy agents used conditionally | Low | Medium | Imports appear only on import lines, never in function bodies |
| FACET_COLORS extraction breaks styling | Very Low | Low | Constant is identical in both files; extract is mechanical |

### Rollback Plan
All changes are purely subtractive (plus one constant extraction). Revert the commit if any issue arises.
