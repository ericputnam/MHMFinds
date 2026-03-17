# PRD: Clean Up Dead Code and Unused Imports Across the Codebase

**Date**: 2026-03-11
**Branch**: `compound/clean-up-dead-code-and-unused-imports-across-the-c-20260311`

## 1. Overview

**What**: Remove unused imports, dead code, and orphaned components identified via static analysis and manual auditing.

**Why**: Unused imports inflate bundle size (especially lucide-react icons that aren't tree-shaken), create false leads during debugging, and add cognitive noise. This is a follow-up to previous cleanup passes (Feb 2-7) — some issues persist and new ones have appeared from the RPM optimization work.

## 2. Requirements

### Acceptance Criteria

- [ ] All unused named imports are removed from affected files
- [ ] Orphaned components not imported anywhere are removed
- [ ] Commented-out dead code is removed
- [ ] No new TypeScript errors introduced (`npx tsc --noEmit` passes)
- [ ] `npm run build` succeeds
- [ ] No functional changes to runtime behavior

## 3. Technical Approach

### Phase 1: Remove Unused Imports (Low Risk)

| File | Unused Imports | Action |
|------|---------------|--------|
| `lib/services/privacyAggregator.ts:4-5` | `HttpsProxyAgent`, `SocksProxyAgent` | Remove import lines (only on import line, not used in file body) |
| `lib/services/visionFacetExtractor.ts:11` | `prisma` | Remove import line (only on import line, not used in file body) |
| `app/api/subscription/check-limit/route.ts:4` | `SubscriptionService` | Remove import line (imported but never called — route returns hardcoded response) |
| `components/ModCard.tsx:7` | `Eye` | Remove from lucide-react import (only on import line, never rendered) |
| `components/ModGrid.tsx:7` | `Search`, `Heart`, `TrendingUp`, `Sparkles`, `Filter` | Remove from lucide-react import (only `Loader2`, `AlertCircle`, `Package` are used) |
| `components/subscription/UsageIndicator.tsx:5` | `Download` | Remove from lucide-react import (only `Crown` is used) |
| `app/admin/mods/page.tsx:9,13,15,20` | `Edit`, `Download`, `ExternalLink`, `Check` | Remove from lucide-react import (imported but never rendered in JSX) |

### Phase 2: Remove Orphaned Files (Medium Risk)

| File | Evidence | Action |
|------|----------|--------|
| `components/subscription/UpgradeModal.tsx` | Only referenced in `MONETIZATION_PLAN.md` (planning doc) and previous PRDs — never imported in any `.ts`/`.tsx` source file | Delete |

### Phase 3: Clean Up Dead Code (Low Risk)

| File | Issue | Action |
|------|-------|--------|
| `lib/services/actionHandlers/index.ts:66-69` | Commented-out future handler registrations (`GENERATE_INTERNAL_LINKS`, `EXPAND_CONTENT`, `UPDATE_AD_PLACEMENT`) | Remove commented-out code |

### NOT in Scope (Important)

- **`lib/services/mhmScraperUtils.ts`**: Exports are only consumed by tests currently, but this is **intentional** — these are newly extracted pure functions being built test-first before integration into `mhmScraper.ts`. Per CLAUDE.md scraper docs, this is the designed pattern. **Do not remove.**
- **`app/mods/[id]/page.tsx` gradient violations**: The `bg-gradient-to-r` on Verified/Free badges violates the no-gradients rule but is a **styling fix**, not dead code. Track separately.
- **Integration test `TS18048` errors**: These are strict-null-check warnings in test files, not dead code.

## 4. Files to Modify

| File | Change Type |
|------|------------|
| `lib/services/privacyAggregator.ts` | Remove 2 unused imports |
| `lib/services/visionFacetExtractor.ts` | Remove 1 unused import |
| `lib/services/actionHandlers/index.ts` | Remove 4 lines of commented-out code |
| `app/api/subscription/check-limit/route.ts` | Remove 1 unused import |
| `app/admin/mods/page.tsx` | Remove 4 unused icons from import |
| `components/ModCard.tsx` | Remove 1 unused icon from import |
| `components/ModGrid.tsx` | Remove 5 unused icons from import |
| `components/subscription/UsageIndicator.tsx` | Remove 1 unused icon from import |
| `components/subscription/UpgradeModal.tsx` | **DELETE** — orphaned component |

**Total**: 8 files modified, 1 file deleted

## 5. Testing Plan

### Pre-Change
```bash
npx tsc --noEmit          # Capture baseline (currently 21 errors, all in tests/.next types)
npm run build             # Must succeed
```

### Post-Change
```bash
npx tsc --noEmit          # Error count must not increase
npm run build             # Must succeed
```

### Verify No Dangling References
```bash
grep -r "UpgradeModal" --include="*.ts" --include="*.tsx" app/ components/ lib/
# Should return zero results
```

## 6. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Removing an import used via side effects | Very Low | Medium | All identified imports are named exports (icons, classes) — no side effects |
| `UpgradeModal` dynamically imported somewhere | Low | High | Grep confirms zero `.ts`/`.tsx` imports; only in `.md` planning docs |
| Breaking admin page by removing wrong icon | Low | Medium | Verified each icon against JSX usage with line-level grep |
| `privacyAggregator` proxy agents used conditionally | Low | Medium | Full file grep shows imports appear only on import lines, never in function bodies |

### Rollback Plan
All changes are purely subtractive. Revert the commit if any issue arises.
