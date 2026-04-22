# Phase 5 — Human-readable slug URLs for mod pages

**Date**: 2026-04-22 (captured, not yet scheduled)
**Source PRD**: `docs/PRD-traffic-recovery.md` (follow-up to Phase 1/2)
**Phase**: 5 of 5 — polish, post-recovery
**Depends on**: Phase 1 (SSR), Phase 2 (sitemap), Phase 3 (GSC submission), Phase 4 (in-content ads). Do NOT start until indexing is healthy and traffic has recovered — a URL migration right now adds redirect hops during the exact window Google is re-crawling.

## 1. Overview

**What**: Change mod detail URLs from `/mods/{cuid}` (e.g. `/mods/cmil0mqbf000ooxeeduf9af9f`) to `/mods/{slug}` (e.g. `/mods/2025-81-seolseoul-clothing`).

**Why**: Small-but-real SEO benefits:
- Keywords in the URL give a minor ranking bump
- Slugs look trustworthy in SERPs — higher CTR than opaque cuids
- More shareable (people read URLs in tweets, Discord messages, etc.)
- Industry standard (every mod site, every blog, every e-commerce product page uses slugs)

**Why NOT to rush it**:
- Google indexes opaque IDs just fine (Amazon ASINs, GitHub SHAs, Reddit post IDs all rank)
- A URL migration during a traffic recovery adds 301 redirects across every indexable URL on the site — the wrong time to introduce redirect chains
- The SEO juice from shipping SSR + sitemap (Phase 1/2) dwarfs the juice from keyword-in-URL. Do the big fixes first, then polish.

## 2. Acceptance Criteria

- [ ] `Mod` model has `slug String @unique` column
- [ ] Backfill script generates slugs for all existing mods (~13K):
  - Base: `slugify(title)` using `slugify` or `limax` package (lowercased, ASCII-safe, hyphen-separated)
  - Collision handling: if `slug` already exists, append `-2`, `-3`, etc. until unique
  - Empty/non-ASCII titles: fall back to `{first-6-of-cuid}` (e.g. `cmil0m`)
  - Idempotent: re-running the script does nothing for mods that already have a slug
- [ ] New mod creation (submission flow, scraper) auto-generates a slug before `prisma.mod.create`
- [ ] `/mods/[slug]` route resolves the mod by slug (Prisma `findUnique({ where: { slug } })`)
- [ ] `/mods/[id]` (old cuid URLs) returns **HTTP 301** redirect to `/mods/[slug]`:
  - Implement in `middleware.ts` or a catch-all `/mods/[identifier]/page.tsx` that branches on the identifier format (cuid = starts with `cm` and 25 chars, slug = everything else)
- [ ] Sitemap (`/sitemap-mods.xml`) emits slug URLs, not cuid URLs
- [ ] All internal links updated:
  - `ModCard` href (currently `/mods/${mod.id}`)
  - `RelatedMods` hrefs
  - `MoreFromCreator` hrefs
  - `AffiliateRecommendations` href (if any)
  - Breadcrumb links
  - Admin panel mod links
  - Go interstitial `/go/[modId]` — decide: keep cuid in `/go/`, or also migrate? (Probably keep cuid — the download interstitial is noindexed anyway)
- [ ] Canonical URL in `generateMetadata` uses the slug URL
- [ ] OG/Twitter URLs use the slug URL
- [ ] JSON-LD `@id` uses the slug URL
- [ ] Unit tests:
  - Slug resolver: slug → 200, cuid → 301 to slug, bad slug → 404
  - Slug generation: collisions append suffix, non-ASCII handled, idempotent on re-run
  - Sitemap: emits slug URLs
- [ ] Integration smoke: `curl /mods/{old-cuid}` → 301, `curl /mods/{slug}` → 200 with correct canonical
- [ ] GSC "Indexed pages" count does not collapse after deploy (monitor for 14 days)

## 3. Technical Approach

### Step 1: Schema + backfill (one commit, no URL changes yet)

```prisma
model Mod {
  ...
  slug String? @unique  // nullable during backfill, enforce NOT NULL after
}
```

Run backfill script:
```ts
// scripts/backfill-mod-slugs.ts
import slugify from 'slugify';
import { prisma } from '@/lib/prisma';

const mods = await prisma.mod.findMany({
  where: { slug: null },
  select: { id: true, title: true },
});

for (const mod of mods) {
  const base = slugify(mod.title, { lower: true, strict: true }) || mod.id.slice(0, 6);
  let slug = base;
  let suffix = 2;
  while (await prisma.mod.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }
  await prisma.mod.update({ where: { id: mod.id }, data: { slug } });
}
```

Verify: `SELECT COUNT(*) FROM "Mod" WHERE slug IS NULL` → 0. Then drop the `?` and make it NOT NULL in a follow-up migration.

### Step 2: Dual-resolve + redirect

In `app/mods/[identifier]/page.tsx` (renamed from `[id]`):
```tsx
const isCuid = /^cm[a-z0-9]{23}$/.test(params.identifier);
const mod = isCuid
  ? await prisma.mod.findUnique({ where: { id: params.identifier } })
  : await prisma.mod.findUnique({ where: { slug: params.identifier } });

if (!mod) notFound();

// If they came in via cuid, 301 to the slug URL
if (isCuid) {
  permanentRedirect(`/mods/${mod.slug}`);
}
```

### Step 3: Update all internal links + sitemap

Grep for `/mods/${mod.id}` and replace with `/mods/${mod.slug}`. This is mechanical but touches ~15 files. Single commit.

Update `app/sitemap-mods.xml/route.ts`:
```ts
select: { slug: true, updatedAt: true }
// <loc>${baseUrl}/mods/${m.slug}</loc>
```

### Step 4: Deploy + monitor

- Submit updated sitemap to GSC
- Watch GSC "Indexed pages" daily for 14 days — should stay flat or rise; if it collapses, rollback
- Verify a handful of old cuid URLs return 301 in production

## 4. Files to Modify

| File | Change Type |
|------|-------------|
| `prisma/schema.prisma` | Add `slug` field |
| `scripts/backfill-mod-slugs.ts` | **New** |
| `app/mods/[id]/` → `app/mods/[identifier]/` | Rename, update param name |
| `app/mods/[identifier]/page.tsx` | Branch on cuid vs slug, 301 for cuid |
| `app/sitemap-mods.xml/route.ts` | Emit slug URLs |
| `components/ModCard.tsx` | Use slug in href |
| `components/RelatedMods.tsx` | Use slug in href |
| `components/MoreFromCreator.tsx` | Use slug in href |
| `lib/services/mhmScraper.ts` | Generate slug on create |
| `app/api/mods/route.ts` (submission) | Generate slug on create |
| Any admin mod-link UI | Use slug |
| `__tests__/unit/mods-detail-metadata.test.ts` | Update to slug URLs |
| `__tests__/unit/sitemap-mods.test.ts` | Update to expect slug URLs |

## 5. Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Slug collisions in backfill | Medium | Suffix-bumping loop in backfill script. Unique constraint on DB prevents bad writes. |
| Old cuid URLs stop redirecting after some refactor | Medium | Keep the cuid-detection regex covered by a unit test that will fail if someone removes the redirect branch. |
| GSC "Indexed pages" collapses because Google treats 301 as de-indexing briefly | Medium-high | Do this AFTER Phase 1/2 indexing has stabilized (wait at least 30 days post-Phase-2 deploy). Monitor GSC daily. |
| Slugs from garbage titles ("title", "shref", "id" — pre-cleanup artifacts) | Medium | Run the author/title cleanup scripts BEFORE slug backfill. See `scripts/cleanup-author-data.ts`. |
| Slug URLs break inbound links from Patreon/Tumblr/Reddit/Discord | Low | 301 redirects preserve link equity. All old URLs keep working forever. |
| User bookmarks to `/mods/{cuid}` keep hitting redirect overhead | Very Low | A single 301 hop is invisible to users and fine for SEO. Could also rewrite in middleware to avoid the hop, but not worth the complexity. |
| Double-migration problem: new mods created during deploy window without slugs | Low | Schema makes slug NOT NULL after backfill completes. Any mod created before backfill finishes is caught by backfill. |

## 6. Out of Scope

- Migrating `/go/{cuid}` to `/go/{slug}`. The download interstitial is noindexed and slug-readability doesn't help SEO there. Keep cuid.
- Migrating creator profile URLs to slugs (`/creators/{handle}` is already human-readable).
- Migrating tag/category URLs (currently query-param based, different problem).
- Localized slugs (future: `es` → `2025-81-ropa-seolseoul`).

## 7. When to Schedule

- Phase 3 must be complete and indexing must be healthy (>50% of mod URLs indexed in GSC).
- Author/title cleanup scripts (`cleanup-author-data.ts`, `fix-null-content-types.ts`) should run first so slugs are generated from clean titles.
- Do NOT bundle with other URL changes — migrate slugs on a quiet deploy with no other moving parts.
