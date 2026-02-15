# PRD: Clean Up Dead Code and Unused Imports

## 1. Overview

### What We're Building
A codebase cleanup initiative to remove dead code, unused imports, and unused type definitions from the MHMFinds project.

### Why
- **Reduce bundle size**: Unused code increases JavaScript bundle size
- **Improve maintainability**: Dead code creates confusion and makes refactoring harder
- **Faster builds**: Less code to parse and compile
- **Better developer experience**: Cleaner imports and exports

## 2. Requirements

### Acceptance Criteria

- [ ] Remove unused private class properties
- [ ] Remove unused public methods that have no callers
- [ ] Remove unused type definitions and schema fields (after verification)
- [ ] Verify build passes after changes (`npm run build`)
- [ ] Verify type checking passes (`npm run type-check`)
- [ ] Verify linter passes (`npm run lint`)
- [ ] No functional regressions (existing features still work)

## 3. Technical Approach

### Phase 1: High-Confidence Removals

Remove items that are clearly unused with no external dependencies:

| File | Line | Item | Action |
|------|------|------|--------|
| `lib/services/aiSearch.ts` | 30 | `private maxTokens = 150;` | Remove - never referenced |
| `lib/services/personaSwarmService.ts` | 498-515 | `getPersonaInsights()` method | Remove - exported but never imported elsewhere, uses outdated persona names |

### Phase 2: Verification Required

Items that need additional verification before removal:

| File | Line | Item | Verification Needed |
|------|------|------|---------------------|
| `lib/validation/schemas.ts` | 24, 48 | `categoryId` field | Check if DB still uses this or migrated to `category` string |

### Phase 3: Future Consideration (Out of Scope)

These items were identified but are **not recommended for removal** in this cleanup:
- **Turnstile service** (`lib/services/turnstile.ts`) - Used in 2 places, keep for CAPTCHA functionality
- **Analytics hooks** (`lib/hooks/useAnalytics.ts`) - May have partial usage, needs deeper analysis
- **Facet fields in Mod interface** - May be for future features

## 4. Files to Modify

| File | Changes |
|------|---------|
| `lib/services/aiSearch.ts` | Remove unused `maxTokens` property (line 30) |
| `lib/services/personaSwarmService.ts` | Remove unused `getPersonaInsights()` method (lines 498-515) |

## 5. Testing Plan

### Pre-Change Verification
```bash
# Ensure clean starting state
npm run build
npm run type-check
npm run lint
```

### Post-Change Verification
```bash
# After each file modification
npm run type-check

# After all changes complete
npm run build
npm run lint
```

### Manual Verification
1. Start dev server: `npm run dev`
2. Test AI search functionality (uses aiSearch.ts)
3. Test any features using persona service (if applicable)

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Removing code that's actually used via dynamic imports | Search for string-based references before removal |
| Breaking dependent services | Run full type-check and build after each change |
| Hidden dependencies through reflection | Not applicable - TypeScript doesn't use reflection |

### Rollback Plan
If issues arise:
1. Revert the specific commit
2. Re-run `npm run build` to verify restoration

## 7. Out of Scope

- Refactoring working code that isn't dead
- Removing commented-out code (requires different analysis)
- Consolidating duplicate code patterns
- Removing test pages in `/app` directory
- Schema field changes (require migration planning)

## 8. Definition of Done

- [ ] All high-confidence dead code removed
- [ ] `npm run build` passes
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] No new ESLint warnings introduced
- [ ] Changes committed to feature branch
