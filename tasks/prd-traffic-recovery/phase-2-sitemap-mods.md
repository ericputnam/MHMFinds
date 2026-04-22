# Phase 2 — `sitemap-mods.xml`

**Date**: 2026-04-22
**Source PRD**: `docs/PRD-traffic-recovery.md`
**Phase**: 2 of 3
**Depends on**: Phase 1 (server-rendered `/mods/[id]`) — done, unshipped.

## 1. Overview

**What**: Create a new sitemap at `/sitemap-mods.xml` that lists every indexable mod detail page, and register it in the sitemap index (`/sitemap.xml`).

**Why**: Phase 1 unlocked SSR on `/mods/[id]`. But those URLs are still invisible to Google because no sitemap points at them. Phase 2 gives Googlebot an explicit crawl list of every mod URL, which is the final blocker before the indexing should start.

**Reference**: `app/sitemap-nextjs.xml/route.ts` (stable `lastmod`, XML format) and `app/sitemap-blog-posts.xml/route.ts` (paginated source data, 100/page).

## 2. Acceptance Criteria

- [ ] `app/sitemap-mods.xml/route.ts` exists and:
  - Queries `prisma.mod.findMany({ where: { isNSFW: false, isVerified: true }, select: { id: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } })`
  - Emits standard sitemap XML (`<?xml ...?> <urlset xmlns=".../0.9"> <url>...</url> </urlset>`)
  - Each `<url>` has `<loc>https://musthavemods.com/mods/{id}</loc>`, `<lastmod>YYYY-MM-DD</lastmod>`, `<changefreq>weekly</changefreq>`, `<priority>0.8</priority>`
  - Response `Content-Type: application/xml`
  - Response `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- [ ] `app/sitemap.xml/route.ts` includes a `<sitemap><loc>https://musthavemods.com/sitemap-mods.xml</loc></sitemap>` entry
- [ ] Unit test file `__tests__/unit/sitemap-mods.test.ts` covers:
  - Route returns HTTP 200
  - Body starts with `<?xml` and contains `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`
  - Body contains `>0` `<url>` entries when mock returns mods
  - Body contains `/mods/{id}` for each returned mod
  - NSFW mods in the mock do NOT appear in the output (filter is at the query level; verify call args)
  - Unverified mods do NOT appear (same — verify call args include `isVerified: true`)
  - Cache headers are correct
  - Empty result returns a valid empty `<urlset>` (no crash)
- [ ] Extend existing `__tests__/unit/seo-phase1.test.ts` "Sitemap hygiene" block: assert `sitemap.xml` output contains `sitemap-mods.xml`
- [ ] `npm run build` succeeds (no new errors/warnings)
- [ ] `curl http://localhost:3001/sitemap-mods.xml` returns HTTP 200 with real mod URLs
- [ ] `curl http://localhost:3001/sitemap.xml` contains `<loc>https://musthavemods.com/sitemap-mods.xml</loc>`

## 3. Technical Approach

### Step 1: Failing tests first

Create `__tests__/unit/sitemap-mods.test.ts`. Import the (not-yet-existing) route and mock Prisma via the existing `__tests__/setup/mocks/prisma.ts`. Tests MUST fail on first run because the route file doesn't exist yet.

### Step 2: Route implementation

Mirror `app/sitemap-nextjs.xml/route.ts` structure but with a Prisma query. Shape:

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const baseUrl = 'https://musthavemods.com';

  const mods = await prisma.mod.findMany({
    where: { isNSFW: false, isVerified: true },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  const urlEntries = mods.map((m) => {
    const lastmod = m.updatedAt instanceof Date
      ? m.updatedAt.toISOString().split('T')[0]
      : String(m.updatedAt).split('T')[0];
    return `  <url>
    <loc>${baseUrl}/mods/${m.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
```

### Step 3: Wire into sitemap index

Add one line to `app/sitemap.xml/route.ts`:

```xml
<sitemap>
  <loc>${baseUrl}/sitemap-mods.xml</loc>
</sitemap>
```

### Step 4: Update hygiene test

In `__tests__/unit/seo-phase1.test.ts` at the "Sitemap hygiene" block, add a single assertion: `expect(content).toContain('sitemap-mods.xml')`.

## 4. Files to Modify

| File | Change Type |
|------|-------------|
| `app/sitemap-mods.xml/route.ts` | **New** |
| `app/sitemap.xml/route.ts` | Add 1 `<sitemap>` entry |
| `__tests__/unit/sitemap-mods.test.ts` | **New** |
| `__tests__/unit/seo-phase1.test.ts` | Add 1 assertion in Sitemap hygiene block |

## 5. Testing Plan

1. **Failing-test first**: `npx vitest run __tests__/unit/sitemap-mods.test.ts` — MUST fail (route doesn't exist).
2. Implement the route.
3. **Green**: Re-run the test file — all pass.
4. **Hygiene regression**: `npx vitest run __tests__/unit/seo-phase1.test.ts` — pass including new assertion.
5. **Build**: `npm run build` — clean.
6. **Dev server**:
   - `curl -i http://localhost:3001/sitemap-mods.xml | head -40` — HTTP 200, `Content-Type: application/xml`, `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`, body contains `<urlset>` and `<loc>https://musthavemods.com/mods/...</loc>` entries.
   - `curl http://localhost:3001/sitemap.xml` — contains `sitemap-mods.xml` line.
   - XML validity: pipe through `xmllint --noout` (if available) — no parse errors.

## 6. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Mod count approaches 50K URL / 50MB sitemap spec limit | Low now, rising | PRD says "Start with single file; shard later." Add a log-warning if `mods.length > 40000`. Sharding plan (out of scope for Phase 2): split into `sitemap-mods-1.xml`, `sitemap-mods-2.xml` and list both in the index. |
| Large Prisma scan blows the serverless function cold-start budget | Medium | 15K mods × `{id, updatedAt}` select is ~1MB. Single-page query is fine. ISR `s-maxage=3600` amortizes across requests. Can add `cacheStrategy: { ttl: 3600 }` later if Accelerate is confirmed. |
| Drafts or soft-deleted mods leak into the sitemap | Low | Filter is `isNSFW: false, isVerified: true`. If a "draft" flag is added later, this filter must be extended. |
| XML special characters in mod IDs (cuid is alphanumeric — no risk) | Very Low | Prisma `cuid()` output is URL-safe. No escaping needed for `<loc>`. |
| Sitemap served with wrong `Content-Type` (GSC rejects `text/html`) | Low | Explicit `Content-Type: application/xml` header. Verified in test. |
| NSFW mod sneaks through because `isNSFW` is null in DB | Low | Prisma's `false` match excludes null. If schema shows `isNSFW Boolean @default(false)`, nulls shouldn't occur. Spot-check query on dev DB. |
| `updatedAt` is a `Date` in some envs, `string` in others (Accelerate serialization quirk) | Low | Route handles both: `instanceof Date ? toISOString : String(val).split('T')[0]`. |

## 7. Out of Scope (Deferred to Phase 3)

- Submitting `sitemap-mods.xml` to Google Search Console.
- Requesting indexing for 5 top-traffic mod URLs.
- Recording baseline GSC "indexed pages" count.
- Sharding into `sitemap-mods-1.xml`, `sitemap-mods-2.xml` (only if mod count approaches 45K).
