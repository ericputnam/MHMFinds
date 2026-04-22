# PRD — Traffic Recovery: SSR Mod Detail Pages + Mods Sitemap

**Goal:** Unblock Google indexing of mod detail pages. Vercel traffic has been flat ~500 visitors/day since the mid-Feb cliff. `/mods/[id]` is currently a pure client component with no metadata and is not in any sitemap — Googlebot sees an empty shell. Fixing this should surface thousands of mod pages that have never been indexed.

**Reference pattern:** `app/games/[game]/[topic]/page.tsx` (already SSR with metadata + JSON-LD). Mirror it.

---

## Todos

### Phase 1 — Server-render `/mods/[id]`
- [ ] Rename current `app/mods/[id]/page.tsx` → `app/mods/[id]/ModDetailClient.tsx`. Keep `'use client'`. Change default export to `ModDetailClient`, accept `initialMod: Mod` as a prop, drop the `useEffect` fetch (use the prop).
- [ ] Create new server `app/mods/[id]/page.tsx`:
  - `generateMetadata({ params })` → pull mod, set `title`, `description`, `alternates.canonical = https://musthavemods.com/mods/${id}`, `openGraph` (title/description/url/image=thumbnail), `twitter` (summary_large_image).
  - `generateStaticParams()` → skip. Too many mods; use dynamic + ISR via `export const revalidate = 3600`.
  - Default export: async component that does `prisma.mod.findUnique({ where: { id }, include: { creator: true, _count: ... } })`, `notFound()` on miss, serializes via helper mirroring `serializeMods` in collection page, renders `<script type="application/ld+json">` with `SoftwareApplication` or `CreativeWork` schema (name, description, image, author, aggregateRating, downloadUrl), then `<ModDetailClient initialMod={mod} />`.
- [ ] Add `noindex` to `/go/[modId]` — it's a download gate, should not compete with `/mods/[id]` for rankings. Convert that page's `page.tsx` to a tiny server wrapper exporting `metadata: { robots: { index: false, follow: true } }` + existing client component as child.
- [ ] Unit test `app/mods/[id]/__tests__/metadata.test.ts` — verify `generateMetadata` returns canonical + OG tags for a seeded mod, 404 for unknown id.

### Phase 2 — `sitemap-mods.xml`
- [ ] Create `app/sitemap-mods.xml/route.ts`. Query `prisma.mod.findMany({ where: { isNSFW: false, isVerified: true }, select: { id: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } })`. Emit standard sitemap XML. Cache header: `s-maxage=3600, stale-while-revalidate=86400`.
- [ ] If mod count approaches 45K, shard into `sitemap-mods-1.xml`, `sitemap-mods-2.xml` (sitemap spec limit is 50K URLs / 50MB). Start with single file; add sharding later if needed.
- [ ] Add `<sitemap><loc>https://musthavemods.com/sitemap-mods.xml</loc></sitemap>` entry to `app/sitemap.xml/route.ts`.
- [ ] Extend `__tests__/unit/seo-phase1.test.ts` (or new file): fetch route returns 200, valid XML, >0 urls, no NSFW slugs leaking.

### Phase 3 — Ship & measure
- [ ] `npm run build` locally — catch any type errors from Prisma `Decimal`/`Date` serialization.
- [ ] Deploy. Watch Vercel logs for Prisma connection errors (see CLAUDE.md "Prisma Connection Pooling").
- [ ] Curl `https://musthavemods.com/mods/cmil0mqbf000ooxeeduf9af9f` and confirm server-rendered HTML contains mod title + description + JSON-LD (not just `<div id="__next">` shell).
- [ ] Curl `https://musthavemods.com/sitemap-mods.xml` — confirm XML with mod URLs.
- [ ] In Google Search Console: submit `sitemap-mods.xml`, request indexing on 5 top-traffic mod URLs (the `cmil0mqbf...` + `cmil0n4ae...` ones from Vercel analytics).
- [ ] Baseline: record today's GSC "indexed pages" count for the Next.js property. Re-check at +14d and +30d.

## Success metric
Vercel daily visitors return to ≥1,000/day (~2x current) within 30 days of Phase 2 ship. `/mods/*` should become the #2 traffic segment behind `/`.

## Watch-outs
- Prisma `Decimal` and `Date` don't cross server→client boundary. Reuse the `serializeMods` pattern from `app/games/[game]/[topic]/page.tsx` lines 119–171.
- Mediavine ad anchors must be in initial DOM (CLAUDE.md gotcha). The `ModDetailClient` should already have them, but verify after refactor.
- Don't break existing favorites/review/download-tracking hooks — they're client-side and should work unchanged once data is passed as props.
- Prisma Accelerate cache on the mod query: add `cacheStrategy: { ttl: 3600 }` to reduce DB hits.
