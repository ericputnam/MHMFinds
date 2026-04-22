# Phase 1 — Server-Render `/mods/[id]`

**Date**: 2026-04-22
**Source PRD**: `docs/PRD-traffic-recovery.md`
**Phase**: 1 of 3

## 1. Overview

**What**: Convert `/mods/[id]` from a pure client component into a server-rendered page with metadata, JSON-LD, and ISR caching. Add `noindex` to `/go/[modId]` so the download gate stops competing with mod detail pages in search rankings.

**Why**: Googlebot currently sees an empty client shell at `/mods/[id]` — no title, description, or content in the initial HTML. Thousands of mod pages are uncrawlable, blocking indexing and keeping Vercel traffic flat at ~500 visitors/day since the mid-Feb cliff. Mirroring the SSR pattern from `app/games/[game]/[topic]/page.tsx` (which is already indexed) should surface these pages to Google.

**Reference**: `app/games/[game]/[topic]/page.tsx` — existing SSR page with metadata, JSON-LD, and the `serializeMods` helper at lines 119–171.

## 2. Acceptance Criteria

- [ ] Current `app/mods/[id]/page.tsx` renamed to `app/mods/[id]/ModDetailClient.tsx`
  - Keeps `'use client'` directive
  - Default export renamed to `ModDetailClient`
  - Accepts `initialMod: Mod` as a prop
  - `useEffect` fetch removed — uses the prop instead
- [ ] New server `app/mods/[id]/page.tsx` created with:
  - `generateMetadata({ params })` that returns `title`, `description`, `alternates.canonical`, `openGraph`, and `twitter` tags
  - `export const revalidate = 3600` (ISR, no `generateStaticParams`)
  - Async default export that runs `prisma.mod.findUnique(...)` with `creator` + `_count` includes
  - `notFound()` called on missing mod
  - Decimal/Date serialization via a helper mirroring `serializeMods` in `app/games/[game]/[topic]/page.tsx`
  - `<script type="application/ld+json">` rendering `SoftwareApplication` or `CreativeWork` schema (name, description, image, author, aggregateRating, downloadUrl)
  - Renders `<ModDetailClient initialMod={mod} />`
  - `cacheStrategy: { ttl: 3600 }` on the Prisma query (Accelerate)
- [ ] `/go/[modId]` set to `noindex`:
  - `page.tsx` converted to a tiny server wrapper
  - Exports `metadata: { robots: { index: false, follow: true } }`
  - Existing client component rendered as child
- [ ] Unit test `app/mods/[id]/__tests__/metadata.test.ts`:
  - `generateMetadata` returns canonical + OG tags for a seeded mod
  - Returns 404 for unknown id
- [ ] `npm run build` succeeds with no new errors or warnings
- [ ] `curl https://musthavemods.com/mods/<id>` returns server-rendered HTML containing mod title, description, and JSON-LD (not just an empty shell)
- [ ] Mediavine ad anchors still present in initial DOM after refactor (see CLAUDE.md "mv-ads" gotcha)
- [ ] Favorites, review, and download-tracking hooks still work (client-side, should be unchanged)

## 3. Technical Approach

### Step 1: Extract client component

Rename `app/mods/[id]/page.tsx` → `app/mods/[id]/ModDetailClient.tsx`.

- Keep `'use client'` at the top.
- Change `export default function ModDetailPage()` to `export default function ModDetailClient({ initialMod }: { initialMod: Mod })`.
- Delete the `useEffect` that fetches the mod — read from `initialMod` instead.
- Initialize local state (e.g., `useState<Mod>(initialMod)`) so that favorites/review mutations can still update the UI optimistically.

### Step 2: Create server page

New `app/mods/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import ModDetailClient from './ModDetailClient';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const mod = await prisma.mod.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, description: true, thumbnail: true },
    cacheStrategy: { ttl: 3600 },
  });
  if (!mod) return {};
  const url = `https://musthavemods.com/mods/${mod.id}`;
  return {
    title: mod.title,
    description: mod.description?.slice(0, 160),
    alternates: { canonical: url },
    openGraph: { title: mod.title, description: mod.description, url, images: mod.thumbnail ? [mod.thumbnail] : [] },
    twitter: { card: 'summary_large_image', title: mod.title, description: mod.description },
  };
}

export default async function ModDetailPage({ params }: { params: { id: string } }) {
  const mod = await prisma.mod.findUnique({
    where: { id: params.id },
    include: { creator: true, _count: { select: { favorites: true, reviews: true } } },
    cacheStrategy: { ttl: 3600 },
  });
  if (!mod) notFound();
  const serialized = serializeMod(mod);
  const jsonLd = buildJsonLd(serialized);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ModDetailClient initialMod={serialized} />
    </>
  );
}
```

### Step 3: Serialization helper

Mirror `serializeMods` from `app/games/[game]/[topic]/page.tsx` lines 119–171. Convert `Decimal` → `number` and `Date` → ISO string so the data is safe to cross the server→client boundary.

### Step 4: JSON-LD schema

Use `SoftwareApplication` (Sims mods behave closer to software than creative works). Minimum fields: `@context`, `@type`, `name`, `description`, `image`, `author`, `aggregateRating` (if reviews exist), `downloadUrl`.

### Step 5: noindex `/go/[modId]`

Convert `app/go/[modId]/page.tsx` into a server component shell that exports `metadata: { robots: { index: false, follow: true } }` and renders the existing client component as a child.

## 4. Files to Modify

| File | Change Type |
|------|-------------|
| `app/mods/[id]/page.tsx` | **Rewrite** — now a server component |
| `app/mods/[id]/ModDetailClient.tsx` | **New** — extracted from old `page.tsx` |
| `app/mods/[id]/__tests__/metadata.test.ts` | **New** — unit tests for `generateMetadata` |
| `app/go/[modId]/page.tsx` | **Rewrite** — server wrapper with noindex metadata |
| `app/go/[modId]/GoClient.tsx` (or similar) | **New** — extracted client body, if needed |

## 5. Testing Plan

1. **Unit tests**: `npm run test -- metadata.test.ts` — `generateMetadata` returns canonical + OG for a seeded mod, `notFound` path returns empty metadata.
2. **Build**: `npm run build` succeeds. Watch for Prisma `Decimal`/`Date` serialization type errors.
3. **Local smoke test**: `npm run dev`, visit `/mods/<real-id>`, confirm:
   - View Source shows mod title, description, JSON-LD in initial HTML
   - Favorites button still toggles
   - Review form still submits
   - Download tracking still fires
4. **Mediavine check**: Confirm `.mv-ads` anchors and `<aside id="secondary">` are in the initial server-rendered DOM (CLAUDE.md requirement).
5. **noindex check**: `curl -I https://localhost:3000/go/<id>` confirms `X-Robots-Tag: noindex` or equivalent in rendered `<meta>` tag.
6. **Production curl** (after deploy):
   - `curl https://musthavemods.com/mods/cmil0mqbf000ooxeeduf9af9f` → HTML contains title, description, JSON-LD
   - `curl https://musthavemods.com/go/cmil0mqbf000ooxeeduf9af9f` → HTML contains `<meta name="robots" content="noindex,follow">`

## 6. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Prisma `Decimal`/`Date` serialization crashes the server→client boundary | Medium | Reuse `serializeMods` pattern from `app/games/[game]/[topic]/page.tsx:119–171`. Catch at build time via `npm run build`. |
| Mediavine ad anchors disappear from initial DOM after refactor | Medium | `ModDetailClient` keeps the same JSX tree as the old `page.tsx`. Verify `.mv-ads` and `<aside id="secondary">` in view-source before declaring done. See CLAUDE.md "Render ad anchors on first paint". |
| Client-side hooks (favorites, review, download tracking) break when data is passed as props instead of fetched | Low | Initialize `useState<Mod>(initialMod)` so optimistic updates still work. Don't remove the hooks — just remove the initial fetch. |
| Prisma Accelerate cache staleness after mod edits | Low | `ttl: 3600` + `revalidate: 3600` means up to 1 hour stale. Acceptable for now; can trigger revalidation from admin mod-edit route later. |
| `/go/[modId]` noindex accidentally strips follow behavior | Low | Explicitly set `{ index: false, follow: true }` — not just `noindex`. Confirmed by curl in testing plan. |
| Cold-start Prisma connection pool exhaustion from new server route | Low | Uses existing `lib/prisma.ts` singleton (CLAUDE.md requirement). No new client instances. |
| Prerender error breaks existing `/mods/[id]` routes in production | Medium | Deploy carefully; watch Vercel logs. Have rollback command ready: `vercel rollback <previous-url> --yes`. |

## 7. Out of Scope (Deferred to Later Phases)

- `sitemap-mods.xml` route — Phase 2
- Adding the sitemap entry to `app/sitemap.xml/route.ts` — Phase 2
- Submitting the sitemap to Google Search Console — Phase 3
- Measuring GSC indexed-page counts at +14d / +30d — Phase 3
