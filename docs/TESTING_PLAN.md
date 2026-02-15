# MHMFinds Testing Plan

Last updated: February 15, 2026

## Purpose
Keep the smoke harness focused on routes and components that can break core user paths: discovery, submissions, moderation, auth, and subscription limits.

## Required Local Gate
Run this sequence before shipping:

```bash
npm run lint
npm run test:run
npm run build
npm run dev
```

## Current Smoke Harness Coverage
Active suites:

- `__tests__/integration/api/mods.test.ts`
- `__tests__/integration/api/signup.test.ts`
- `__tests__/integration/api/subscription.test.ts`
- `__tests__/integration/api/creator-submissions.test.ts`
- `__tests__/integration/api/creator-edit.test.ts`
- `__tests__/integration/api/approval.test.ts`
- `__tests__/integration/api/reject-submission.test.ts`
- `__tests__/integration/api/submit-mod.test.ts`
- `__tests__/integration/api/admin-users.test.ts`
- `__tests__/integration/api/admin-categories.test.ts`
- `__tests__/integration/api/auth-clear-session.test.ts`
- `__tests__/integration/api/affiliates-routes.test.ts`
- `__tests__/unit/cache.test.ts`
- `__tests__/unit/cache-tiers.test.ts`
- `__tests__/unit/middleware.test.ts`
- `__tests__/unit/creatorAuth.test.ts`
- `__tests__/unit/urlState.test.ts`
- `__tests__/unit/weWantModsScraper.test.ts`
- `__tests__/components/Navbar.test.tsx`
- `__tests__/components/CreatorDashboard.test.tsx`
- `__tests__/components/ModCard.test.tsx`
- `__tests__/components/ModDetailPage.test.tsx`

## Coverage Gaps To Close Next
High value gaps still missing from smoke tests:

- `/api/admin/users/export` CSV edge cases and date-range validation
- `/api/admin/categories/[id]` successful delete path and mod-linked delete path
- `/api/affiliates/match` persona/category matching logic
- `/api/affiliates/[id]` admin update/delete paths

## Standards For New Tests
- Mock external network dependencies (`Stripe`, `SendGrid`, analytics endpoints).
- Validate status codes and response payload shape.
- Add at least one auth-failure case for every new admin route.
- Add one error-path test for each route touching Prisma.

## Parallel Sub-Agent Backlog
Use these as independent tracks:

1. `agent-tests-auth`: Add smoke coverage for `/api/auth/clear-session` and session edge cases.
2. `agent-tests-admin-users`: Add smoke tests for `/api/admin/users` paging/filtering.
3. `agent-tests-categories`: Add admin category route tests (`GET/POST/PUT/DELETE`).
4. `agent-tests-affiliates`: Add affiliate API tests including click tracking and malformed payloads.
5. `agent-tests-mod-detail`: Add behavior tests for mod detail page download and favorite flows.
