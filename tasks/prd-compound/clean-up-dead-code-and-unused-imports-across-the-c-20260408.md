# PRD: Clean Up Dead Code and Unused Imports Across the Codebase

**Date**: 2026-04-08
**Branch**: `compound/clean-up-dead-code-and-unused-imports-across-the-c-20260408`
**Prior PRDs**: `...-20260317.md` and earlier (same recurring scope)

## 1. Overview

**What**: Remove unused dependencies, consolidate duplicate admin auth patterns, remove test endpoints not needed in production, and fix TypeScript errors in test files.

**Why**: Prior rounds of this cleanup (Feb–Mar 2026) removed the bulk of dead code — orphaned services, unused analytics hooks, commented-out blocks, and `scripts/archive/`. The codebase is now relatively clean. This round addresses the remaining items found in today's scan: one unused npm dependency, a test-only API endpoint shipping to production, duplicate `requireAdmin()` implementations, and TypeScript strictness errors in integration tests.

## 2. Requirements

### Acceptance Criteria

- [ ] `socks-proxy-agent` removed from `package.json` (unused dependency — 0 imports in codebase)
- [ ] `/app/api/monetization/config/test/route.ts` removed or gated behind `NODE_ENV === 'development'`
- [ ] Duplicate `requireAdmin()` pattern documented with a code comment pointing to each implementation, OR consolidated into one (see Risks)
- [ ] TypeScript errors in `__tests__/integration/api/` fixed (19 errors, all `TS18048 'response' is possibly undefined`)
- [ ] `npm run build` succeeds with no new warnings
- [ ] `npx tsc --noEmit` error count reduced (baseline: 19 errors)
- [ ] No functional or runtime behavior changes

## 3. Technical Approach

### Phase 1: Remove Unused Dependency (No Risk)

| Item | Action |
|------|--------|
| `socks-proxy-agent` in `package.json` | `npm remove socks-proxy-agent` |

### Phase 2: Remove Test Endpoint (Low Risk)

| File | Issue | Action |
|------|-------|--------|
| `app/api/monetization/config/test/route.ts` | Test endpoint deployed to production | Delete file and directory. If needed for local dev, gate behind `if (process.env.NODE_ENV === 'production') return 404` |

### Phase 3: Fix TypeScript Errors in Tests (Low Risk)

| Files | Issue | Action |
|-------|-------|--------|
| `__tests__/integration/api/admin-categories.test.ts` | 8x `TS18048` — response possibly undefined | Add non-null assertions or early-return guards after API calls |
| `__tests__/integration/api/admin-users.test.ts` | 5x `TS18048` | Same fix pattern |
| `__tests__/integration/api/reject-submission.test.ts` | 2x `TS18048` | Same fix pattern |

Pattern: Replace `response.status` with `response!.status` or add `if (!response) throw new Error('No response')` guard.

### Phase 4: Document Duplicate Admin Auth (Low Risk)

| Files | Issue | Action |
|-------|-------|--------|
| `lib/middleware/auth.ts` → `requireAdmin()` | Returns `{authorized, response, session, user}`, used by 6 routes | Add JSDoc comment noting the other implementation |
| `lib/auth/adminAuth.ts` → `requireAdmin()` | Returns `{user, session}` + audit logging, used by 3 routes | Add JSDoc comment noting the other implementation |

Consolidation is optional — both are actively used with different return shapes. Document the distinction so future developers pick the right one.

## 4. Files to Modify

| File | Change Type |
|------|-------------|
| `package.json` | Remove `socks-proxy-agent` |
| `package-lock.json` | Auto-updated by `npm remove` |
| `app/api/monetization/config/test/route.ts` | Delete |
| `__tests__/integration/api/admin-categories.test.ts` | Fix TS errors |
| `__tests__/integration/api/admin-users.test.ts` | Fix TS errors |
| `__tests__/integration/api/reject-submission.test.ts` | Fix TS errors |
| `lib/middleware/auth.ts` | Add JSDoc comment |
| `lib/auth/adminAuth.ts` | Add JSDoc comment |

## 5. Testing Plan

1. **Build verification**: `npm run build` must succeed with zero new errors/warnings
2. **Type check**: `npx tsc --noEmit` — error count should drop from 19 to 0
3. **Lint**: `npx next lint` — no new warnings
4. **Integration tests**: Run `npx jest __tests__/integration/api/` to confirm test files still pass after TS fixes
5. **Smoke test**: Start dev server (`npm run dev`), verify homepage loads, mod pages work, admin panel accessible
6. **Dependency audit**: `npm ls socks-proxy-agent` should return empty after removal

## 6. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `socks-proxy-agent` is used at runtime via dynamic require | Very Low | Grep confirmed 0 references. `privacyAggregator.ts` imports `HttpsProxyAgent` from `https-proxy-agent`, not `socks-proxy-agent` |
| Test endpoint removal breaks a developer workflow | Low | Endpoint is admin-only config checker. Developers can use Prisma Studio or direct API calls instead |
| Consolidating `requireAdmin()` breaks route handlers | Medium | **Mitigation: don't consolidate** — just document. Both implementations work, have different return types, and serve different use cases (audit logging vs simple auth) |
| TypeScript non-null assertions hide real bugs | Low | The test responses come from supertest calls that always return a value. `undefined` is not a realistic case — the TS error is overly cautious |
