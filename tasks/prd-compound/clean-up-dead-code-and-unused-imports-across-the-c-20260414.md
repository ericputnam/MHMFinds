# PRD: Clean Up Dead Code and Unused Imports Across the Codebase

**Date**: 2026-04-14
**Branch**: `compound/clean-up-dead-code-and-unused-imports-across-the-c-20260414`
**Prior PRDs**: `...-20260413.md`, `...-20260408.md` (neither was executed — all items remain)

## 1. Overview

**What**: Remove dead files, unused imports, orphaned package.json scripts, an unused npm dependency, and unnecessary `import React` statements across the codebase.

**Why**: A full audit found ~1,600 lines of dead code across 4 orphaned files, 8 package.json scripts pointing to nonexistent targets, an unused npm dependency, and ~15 files with unnecessary imports. This is accumulated tech debt from prior feature removals and refactors. Cleaning it up reduces bundle size, eliminates developer confusion, and prevents future build breaks from imports referencing deleted modules.

## 2. Requirements

### Acceptance Criteria

- [ ] `app/privacy/page.tsx` deleted (orphaned — Footer links to `/privacy-policy`, not `/privacy`)
- [ ] `components/TrendingMods.tsx` deleted (zero imports across entire codebase)
- [ ] `lib/services/visionFacetExtractor.ts` deleted (565 lines, zero imports, consumer script never committed)
- [ ] `lib/services/contentAggregator.ts` deleted (421 lines, zero imports — `privacyAggregator.ts` is the active aggregator)
- [ ] 8 dead script entries removed from `package.json` (see Phase 2 table)
- [ ] `https-proxy-agent` removed from `package.json` dependencies (zero imports in any `.ts`/`.tsx` file)
- [ ] Unused `FileText` import removed from `app/creators/submissions/page.tsx` and `app/admin/submissions/page.tsx`
- [ ] Unused `Sparkles` import removed from `app/admin/monetization/affiliates/page.tsx`
- [ ] Unused `setGridColumns` in `app/page.tsx` replaced with `const gridColumns = 4`
- [ ] Unnecessary `import React from 'react'` removed from 9 files (where `React.` is never referenced)
- [ ] `npm run build` succeeds with no new warnings
- [ ] No functional or runtime behavior changes

## 3. Technical Approach

### Phase 1: Delete Orphaned Files (Low Risk)

| File | Lines | Reason |
|------|-------|--------|
| `app/privacy/page.tsx` | ~80 | Superseded by `app/privacy-policy/page.tsx`; zero inbound links |
| `components/TrendingMods.tsx` | ~50 | Zero imports anywhere in codebase |
| `lib/services/visionFacetExtractor.ts` | 565 | Consumer script `scripts/migrate-with-vision.ts` doesn't exist; 0 imports |
| `lib/services/contentAggregator.ts` | 421 | `privacyAggregator.ts` replaced it; 0 imports from app code or scripts |

### Phase 2: Clean Up `package.json` Scripts (Low Risk)

Remove entries whose target files do not exist on disk:

| Script Key | Missing Target |
|------------|----------------|
| `facets:vision` | `scripts/migrate-with-vision.ts` |
| `facets:vision:test` | `scripts/migrate-with-vision.ts` |
| `facets:vision:text` | `scripts/migrate-with-vision.ts` |
| `facets:vision:clear` | `scripts/migrate-with-vision.ts` |
| `facets:audit` | `scripts/ralph/facet-audit.ts` |
| `screenshot` | `scripts/ralph/screenshot.ts` |
| `images:migrate` | `scripts/migrate-image-urls.ts` |
| `content:test` | `scripts/test-privacy-aggregator.ts` |

### Phase 3: Remove Unused npm Dependency (Low Risk)

| Dependency | Reason |
|------------|--------|
| `https-proxy-agent@^7.0.6` | Zero imports. `privacyAggregator.ts` uses `HttpsProxyAgent` from `undici`, not this package. |

Run: `npm remove https-proxy-agent`

### Phase 4: Fix Unused Imports and Dead State (No Risk)

| File | Issue | Fix |
|------|-------|-----|
| `app/creators/submissions/page.tsx` | Unused `FileText` import | Remove from lucide-react import |
| `app/admin/submissions/page.tsx` | Unused `FileText` import | Remove from lucide-react import |
| `app/admin/monetization/affiliates/page.tsx` | Unused `Sparkles` import | Remove from lucide-react import |
| `app/page.tsx` | `setGridColumns` never called | Replace `useState(4)` with `const gridColumns = 4` |

### Phase 5: Remove Unnecessary `import React` (No Risk)

Next.js 13+ with the new JSX transform does not require explicit `React` imports. Remove from files where `React.` is never referenced:

| File |
|------|
| `components/ModGrid.tsx` |
| `app/privacy-policy/page.tsx` |
| `app/terms/page.tsx` |
| `app/about/page.tsx` |
| `app/admin/mods/submit/page.tsx` |
| `app/admin/mods/new/page.tsx` |
| `app/creators/submit/page.tsx` |
| `app/creators/mods/page.tsx` |

**NOT removing** from files that use `React.FC`, `React.ReactNode`, `React.CSSProperties`, or `React.MouseEvent` (Footer.tsx, AffiliateCard.tsx, ModCard.tsx, layouts).

Note: `app/privacy/page.tsx` is omitted since it's being deleted in Phase 1.

## 4. Files to Modify

| File | Change Type |
|------|-------------|
| `app/privacy/page.tsx` | **Delete** |
| `components/TrendingMods.tsx` | **Delete** |
| `lib/services/visionFacetExtractor.ts` | **Delete** |
| `lib/services/contentAggregator.ts` | **Delete** |
| `package.json` | Remove 8 dead scripts + `https-proxy-agent` dep |
| `package-lock.json` | Auto-updated by `npm remove` |
| `app/creators/submissions/page.tsx` | Remove unused `FileText` import |
| `app/admin/submissions/page.tsx` | Remove unused `FileText` import |
| `app/admin/monetization/affiliates/page.tsx` | Remove unused `Sparkles` import |
| `app/page.tsx` | Replace `useState(4)` with const for `gridColumns` |
| `components/ModGrid.tsx` | Remove unused `import React` |
| `app/privacy-policy/page.tsx` | Remove unused `import React` |
| `app/terms/page.tsx` | Remove unused `import React` |
| `app/about/page.tsx` | Remove unused `import React` |
| `app/admin/mods/submit/page.tsx` | Remove unused `import React` |
| `app/admin/mods/new/page.tsx` | Remove unused `import React` |
| `app/creators/submit/page.tsx` | Remove unused `import React` |
| `app/creators/mods/page.tsx` | Remove unused `import React` |

**Total**: 4 files deleted, 14 files modified

## 5. Testing Plan

1. **Build verification**: `npm run build` must succeed with zero new errors/warnings
2. **Type check**: `npx tsc --noEmit` — error count must not increase (baseline: 19 errors in test files, unrelated to this PR)
3. **Lint**: `npx next lint` — no new warnings
4. **Route check**: Verify `/privacy-policy` still renders (the canonical privacy page)
5. **Smoke test**: Start dev server, confirm homepage loads, mod grid renders at 4 columns, admin panel accessible
6. **Dependency audit**: `npm ls https-proxy-agent` should show no results after removal
7. **Script audit**: Running any removed script (e.g., `npm run facets:vision`) should return "missing script" error

## 6. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `/privacy` route indexed by Google or linked from external legal docs | Low | Check Google Search Console for `/privacy` traffic. If indexed, add a redirect rule in `vercel.json` (`/privacy` -> `/privacy-policy`) before deleting. |
| `contentAggregator.ts` referenced by uncommitted scripts | Low | Full grep found zero references. `privacyAggregator.ts` is the active replacement. Can restore from git history if needed. |
| `visionFacetExtractor.ts` needed for future vision-based facet extraction | Low | All 4 `package.json` scripts that referenced its consumer are also being removed. Restorable from git history. |
| `https-proxy-agent` loaded dynamically via `require()` at runtime | Very Low | Full grep found zero references. `privacyAggregator.ts` uses `undici`'s `HttpsProxyAgent`. |
| Removing `import React` breaks a file that uses JSX | Very Low | Only removing from files verified to have zero `React.` references. Next.js JSX transform handles implicit React. |
| Removing `setGridColumns` breaks future grid density feature | Very Low | Grid density UI was removed in prior cleanup. `useState` can be trivially restored if re-added. |
