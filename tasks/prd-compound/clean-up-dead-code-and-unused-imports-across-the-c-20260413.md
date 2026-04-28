# PRD: Clean Up Dead Code and Unused Imports Across the Codebase

**Date**: 2026-04-13
**Branch**: `compound/clean-up-dead-code-and-unused-imports-across-the-c-20260413`
**Prior PRDs**: `...-20260408.md` (removed `socks-proxy-agent`, test endpoint, fixed TS test errors)

## 1. Overview

**What**: Remove orphaned pages, unused components, dead service files, broken `package.json` script entries, unused imports, and an unused npm dependency.

**Why**: Prior cleanup rounds (Feb–Apr 2026) removed the bulk of dead code, but today's scan found a new batch: an orphaned `/privacy` route superseded by `/privacy-policy`, a component with zero importers, a service file whose consumer script was never committed, 8 `package.json` scripts pointing to nonexistent files, unused Lucide icon imports, a never-called state setter, and an npm dependency with zero imports. Removing these reduces bundle size, eliminates developer confusion, and prevents future Vercel build breaks from files that reference deleted modules.

## 2. Requirements

### Acceptance Criteria

- [ ] `/app/privacy/page.tsx` deleted (orphaned — Footer links to `/privacy-policy`, not `/privacy`)
- [ ] `/components/TrendingMods.tsx` deleted (zero imports across entire codebase)
- [ ] `/lib/services/visionFacetExtractor.ts` deleted (consumer script `scripts/migrate-with-vision.ts` does not exist)
- [ ] 8 dead script entries removed from `package.json` (`facets:vision`, `facets:vision:test`, `facets:vision:text`, `facets:vision:clear`, `facets:audit`, `screenshot`, `images:migrate`, `content:test`)
- [ ] `https-proxy-agent` removed from `package.json` (zero imports in any `.ts`/`.tsx` file)
- [ ] Unused `FileText` import removed from `app/creators/submissions/page.tsx` and `app/admin/submissions/page.tsx`
- [ ] Unused `Sparkles` import removed from `app/admin/monetization/affiliates/page.tsx`
- [ ] Unused `setGridColumns` state setter removed or wired up in `app/page.tsx`
- [ ] `npm run build` succeeds with no new warnings
- [ ] No functional or runtime behavior changes

## 3. Technical Approach

### Phase 1: Delete Orphaned Files (Low Risk)

| File | Reason | Action |
|------|--------|--------|
| `app/privacy/page.tsx` | Superseded by `app/privacy-policy/page.tsx`; no links point to `/privacy` | Delete |
| `components/TrendingMods.tsx` | Zero imports anywhere in codebase | Delete |
| `lib/services/visionFacetExtractor.ts` | Consumer script never committed; 0 imports | Delete |

### Phase 2: Clean Up `package.json` Scripts (Low Risk)

Remove script entries whose target files do not exist on disk:

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

| Dependency | Reason | Action |
|------------|--------|--------|
| `https-proxy-agent` | Zero imports in any app/lib/scripts `.ts` file; only appears in `node_modules` internal types | `npm remove https-proxy-agent` |

### Phase 4: Fix Unused Imports (No Risk)

| File | Unused Import | Action |
|------|---------------|--------|
| `app/creators/submissions/page.tsx` | `FileText` from lucide-react | Remove from import |
| `app/admin/submissions/page.tsx` | `FileText` from lucide-react | Remove from import |
| `app/admin/monetization/affiliates/page.tsx` | `Sparkles` from lucide-react | Remove from import |
| `app/page.tsx` | `setGridColumns` (state setter never called; `gridColumns` is always `4`) | Replace `useState(4)` with a `const gridColumns = 4` constant |

## 4. Files to Modify

| File | Change Type |
|------|-------------|
| `app/privacy/page.tsx` | **Delete** |
| `components/TrendingMods.tsx` | **Delete** |
| `lib/services/visionFacetExtractor.ts` | **Delete** |
| `package.json` | Remove 8 dead scripts + `https-proxy-agent` dep |
| `package-lock.json` | Auto-updated by `npm remove` |
| `app/creators/submissions/page.tsx` | Remove unused `FileText` import |
| `app/admin/submissions/page.tsx` | Remove unused `FileText` import |
| `app/admin/monetization/affiliates/page.tsx` | Remove unused `Sparkles` import |
| `app/page.tsx` | Replace `useState(4)` with const for `gridColumns` |

## 5. Testing Plan

1. **Build verification**: `npm run build` must succeed with zero new errors/warnings
2. **Type check**: `npx tsc --noEmit` — error count should not increase (baseline: 19 errors in test files, unchanged by this PR)
3. **Lint**: `npx next lint` — no new warnings
4. **Route check**: Verify `/privacy-policy` still renders correctly (the canonical privacy page)
5. **Smoke test**: Start dev server, verify homepage loads, mod grid renders, admin panel accessible
6. **Dependency audit**: `npm ls https-proxy-agent` should return empty after removal
7. **Script audit**: Running any removed script key (e.g., `npm run facets:vision`) should return "missing script" error, not "file not found" error

## 6. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `/privacy` route is linked from an external source (Google index, email, legal doc) | Low | Check Google Search Console for traffic to `/privacy`. If indexed, add a redirect in `middleware.ts` or `vercel.json` before deleting. |
| `TrendingMods.tsx` is dynamically imported via string interpolation | Very Low | Grep confirmed zero references. Component has no default export magic. |
| `visionFacetExtractor.ts` is imported by a script not yet committed | Low | The 4 `package.json` entries that reference the missing consumer script are also being removed. If someone needs vision extraction later, they can restore from git history. |
| `https-proxy-agent` is required at runtime via `require()` | Very Low | Full grep found zero references. `privacyAggregator.ts` uses `HttpsProxyAgent` from the `undici` built-in, not this package. |
| Removing `setGridColumns` breaks future grid density feature | Very Low | The grid density UI was already removed in a prior cleanup. If re-added later, `useState` can be restored trivially. |
