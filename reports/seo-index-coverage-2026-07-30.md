# SEO Index-Coverage Remediation — 2026-07-30

Response to the GSC "Why pages aren't indexed" report for musthavemods.com
(13,735 page-with-redirect, 4,411 crawled-not-indexed, 688 alternate-canonical,
158 robots-blocked, 34 noindex, 26 404s, 7 403s, 7 no-canonical, 1 4xx, 1 5xx).

## Diagnosis per bucket

| Bucket | Root cause | Action |
|---|---|---|
| Page with redirect (13,735, trending up) | Historical: sitemaps/canonicals emitted non-slash URLs while `trailingSlash: true` 308s every one. Fixed on main ~Jul 3 (live sitemaps verified correct). Google still holds the old URLs; the bucket drains as it recrawls. | No further code fix needed; monitor trend. Remaining contributor removed: `/creators/` was in the sitemap but 307s crawlers to `/sign-in`. |
| Crawled – currently not indexed (4,411) | Mod grids had **no crawlable links** (`router.push` on card click, no `<a href>`), so 15k mod pages were sitemap-only orphans with no internal PageRank. Plus legacy-vs-collection duplicate intent (already documented in reports/legacy-vs-collection-strategy-2026-07-03.md). | Real `<Link>` on every ModCard title. Trailing slashes on all remaining mod links. |
| Alternate page with proper canonical (688) | Mostly working as intended (blog-subdomain + filter-param consolidation). But `/about/`, `/terms/`, `/privacy-policy/`, `/submit-mod/`, `/top-creators/`, `/sign-in/`, `/account/*` all inherited `canonical: "/"` from the root layout — each self-declared as a homepage duplicate (verified live). | Per-route layouts with self-canonicals; noindex for `/sign-in/` + `/account/*`. |
| Blocked by robots.txt (158) | `blog.musthavemods.com/robots.txt` returns **nginx 404**, so the apex robots route served its bare fallback — every intended Disallow rule was silently missing (verified live). | robots route now serves its own base rules unconditionally and merges WP rules only when the fetch succeeds. **Manual follow-up: fix the 404 on BigScoots.** |
| Excluded by noindex (34) | Intended (`/go/` interstitial, WP archives). But middleware stripped noindex from *all* proxied WP pages, including category/tag/author archives that are intentionally noindex — contradictory signals. | Strip is now conditional: archives keep their noindex (meta tag + x-robots-tag header); singular posts/pages keep the caching-leak safety net. |
| Not found 404 (26) | `/mods/` listed in the live sitemap but no such route exists (404s). | Removed from sitemap + 301 `/mods` and `/mods/` → `/` in vercel.json. |
| 403 (7) / other 4xx (1) / 5xx (1) | Bot-blocked WP paths and transient errors; nothing in code. | Click "Validate fix" in GSC; expect these to clear. |

## Changes (branch `fix/seo-index-coverage`, off main)

- `app/sitemap-nextjs.xml/route.ts` — drop `/mods/` + `/creators/`; game pages
  from `getAllGameSlugs()` (adds the previously missing `/games/animal-crossing/`);
  add `/top-creators/`, `/about/`, `/submit-mod/`, `/privacy-policy/`, `/terms/`.
- `app/robots.txt/route.ts` — base rules (param disallows + `/api/` + `/admin/`)
  served unconditionally; WP rules merged when available; HTML-error-page guard.
- `vercel.json` — 301 `/mods` and `/mods/` → `/`.
- `middleware.ts` — noindex strip (meta + x-robots-tag) now preserves
  category/tag/author archive noindex.
- `components/ModCard.tsx` — mod title is a real `<Link>` (crawl discovery);
  card URLs get trailing slashes.
- `components/RelatedMods.tsx`, `components/MoreFromCreator.tsx`,
  `app/go/[modId]/GoClient.tsx` — trailing slashes on mod links.
- New layouts with canonicals: `app/{about,terms,submit-mod,top-creators}/layout.tsx`;
  noindex layouts: `app/{sign-in,account}/layout.tsx`; canonical added to
  `app/privacy-policy/page.tsx`.
- `__tests__/unit/seo-phase1.test.ts` — assertions updated to the new sitemap
  contract (no `/mods`//`/creators`, animal-crossing present).

## Not done (deliberate)

- **SSR mod grids on `/games/[game]` and `/`** — mod data is still client-fetched
  there, so those specific pages ship no mod content in first HTML. The SEO entry
  points by design are the SSR collection pages (`/games/sims-4/<topic>/`), which
  are fine. Server-rendering initial grids is a worthwhile follow-up but touches
  the filter/search state machine; out of scope for this pass.
- WordPress-side robots.txt 404 (BigScoots/nginx) — needs a server fix, not repo code.

## Post-deploy checklist

1. Deploy, then verify: `curl https://musthavemods.com/robots.txt` shows the base
   Disallow rules; `/sitemap-nextjs.xml` has no `/mods/` or `/creators/`;
   `/about/` canonical is `/about/`; `/category/<x>/` keeps its noindex.
2. GSC → resubmit `sitemap.xml`; click Validate on 404 / 403 / 5xx buckets.
3. Expect "Page with redirect" to plateau then decline over 4–8 weeks; the two
   canonical buckets to shrink; crawled-not-indexed to improve as internal links
   from grids get recrawled.
4. Fix `blog.musthavemods.com/robots.txt` 404 with BigScoots.
