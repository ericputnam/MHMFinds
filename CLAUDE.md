# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Rules

1. **No Gradients** - Never use `linear-gradient()`, `radial-gradient()`, or `conic-gradient()`. Use solid colors and box-shadows instead. Gradients are an "AI tell".
2. **No Auto-Commits** - Never create git commits unless the user explicitly requests it.
3. **No Secrets in Git** - Never commit API keys, tokens, `.env` files, or credentials. Use `.env.example` with placeholders.
4. **Verify with Browser-Use** - After any frontend/UI change, use browser-use to visually verify before reporting completion. If unavailable, tell the user to check manually.
5. **No Gradients in WordPress Either** - The Kadence child theme `custom.css` must also follow the no-gradients rule.

## Project Overview

ModVault (MHMFinds) - Multi-game mod discovery platform. Next.js 14 + TypeScript + Prisma + PostgreSQL + OpenAI embeddings. Aggregates mods from CurseForge, Patreon, Tumblr. Supports Sims 4, Stardew Valley, Minecraft.

## Quick Reference

```bash
# Development
npm run dev                # Start dev server (localhost:3000)
npm run build              # Production build
npm run clean              # Fix webpack cache corruption
npm run dev:clean          # Clean + dev server

# Database
npm run db:generate        # Generate Prisma client
npm run db:migrate         # Create/apply migration
npm run db:studio          # Prisma Studio GUI
npm run db:deploy          # Apply migrations in production

# Content
npm run content:privacy    # Privacy-enhanced aggregation
npm run content:stealth    # Max privacy mode

# Security
npm run security:check-admin-auth  # Verify admin route auth
```

## Key Gotchas (read docs for details)

- **Prisma `lib/prisma.ts`**: Never modify without reading `docs/PRISMA_GUIDE.md`. Must cache globally in ALL environments including production.
- **`DATABASE_URL` vs `DIRECT_DATABASE_URL`**: First is Accelerate (`prisma+postgres://`), second is direct postgres. If swapped, caching silently breaks.
- **`force-dynamic`**: Required on any API route using `getServerSession()`, `cookies()`, or `headers()`.
- **`useSearchParams()`**: Client components using this must be wrapped in `<Suspense>` by parent.
- **Admin API routes**: Must have BOTH middleware protection AND route-level `requireAdmin()`. Defense-in-depth.
- **WordPress routes**: Use `<a href>` not `<Link>` for `/blog`, `/sims-4/`, `/stardew-valley/`, `/minecraft/`.
- **Scripts**: Must import `scripts/lib/setup-env.ts` FIRST before any other imports.
- **Prisma Decimal**: Always coerce to `Number()` before `.toFixed()` or arithmetic.
- **Cache invalidation**: Call `CacheService.invalidateMod(id)` after every admin mutation.
- **Webpack cache corruption**: Fix with `npm run clean`. Common after dependency/import changes.
- **Scraper multi-game detection**: Game detection hierarchy is URL slug > categories > title, defaulting to Sims 4. Pure detection functions live in `lib/services/mhmScraperUtils.ts` with tests in `__tests__/unit/mhmScraperUtils.test.ts`. When adding a new game, update both files plus `scripts/seed-facet-definitions.ts`. In `mhmScraper.ts`, `normalizeCategory(category, game)` and `extractTagsFromTitle(title, game)` are game-aware — add game-specific branches when expanding.
- **`ensureAuthor()` never-null guarantee**: Always use `ensureAuthor()` from `mhmScraperUtils.ts` for author fields — it guarantees a non-empty string via a priority chain with domain-based fallback. Never save a mod with `author: undefined`.
- **Parenthesized author filter**: `extractAuthorFromTitle` Pattern 3 skips descriptors like "(JEI)", "(Window Light)", "(Forge & Fabric)", "(Large)", "(Skins + Sims)" — checks for numbers, sizes, all-caps abbreviations, `+` signs, mod loaders, and common descriptor words.
- **`ScrapedMod.gameVersion`**: The scraper sets `gameVersion` per mod via `detectGame()`. The save method uses `mod.gameVersion || 'Sims 4'` as fallback. Always pass `detectedGame` to `normalizeCategory()` and `extractTagsFromTitle()`.
- **NexusMods returns 403**: `scrapeAuthorFromModPage` always fails for NexusMods URLs. Falls back to domain hint "Nexus Mods Creator" via `ensureAuthor()`. Affects Stardew Valley mods primarily.
- **Facet sortOrder ranges**: Sims 4 = 1-60, Minecraft = 70-79, Stardew Valley = 80-89 (in `seed-facet-definitions.ts`). Keep ranges separated when adding new games.
- **vercel.json `:path*` vs `:path+`**: Use `:path+` (one-or-more) for catch-alls, NOT `:path*` (zero-or-more). `:path*` shadows explicit rules for the base path (e.g., `/blog/` matches `/blog/:path*`).
- **vercel.json slug exclusion list**: The catch-all `/:slug((?!api|admin|...).*)/` pattern must explicitly exclude every Next.js route prefix. Add new prefixes when creating new top-level routes.
- **Trailing slash + catch-all**: With `trailingSlash: true`, `/path` redirects to `/path/` which can match catch-all patterns. Define explicit rules for both `/path` and `/path/` BEFORE catch-alls.
- **Sitemap lastmod dates**: Use stable date strings (`'2026-02-24'`), NOT `Date.now()` or `new Date().toISOString()`. Dynamic timestamps make lastmod meaningless to Google.
- **ads.txt proxy**: Ad networks (Mediavine) verify domain ownership via `/ads.txt`. Since WordPress manages this file, add a Vercel rewrite to proxy it from the blog origin. Must appear before catch-all patterns in `vercel.json`.
- **Mediavine preconnect hints**: Both Next.js (`app/layout.tsx`) and WordPress (`functions.php`) need `<link rel="preconnect">` and `<link rel="dns-prefetch">` for `scripts.mediavine.com` and `cdn.mediavine.com`. WordPress uses `wp_head` priority 1.
- **Related Mods pattern**: `RelatedMods.tsx` fetches from `/api/mods/[id]/related` (same category + gameVersion, excludes self, 6 results). Returns `null` on empty — parent doesn't need conditional rendering.
- **Navbar dropdown debounce**: Desktop hover menus use 150ms `setTimeout` on `onMouseLeave` to prevent flicker when cursor moves between trigger and dropdown. Must clear timeout in `useEffect` cleanup to avoid React warnings on unmount.
- **Mobile menu was non-functional**: The hamburger menu button had no `onClick` handler until commit 5e55fdf. When adding mobile UI, always test the actual tap interaction — visual presence doesn't mean functional.

## Important Directories

| Directory | Purpose |
|-----------|---------|
| `/newapp` | Design reference ONLY. Do NOT run or migrate. Visual inspiration only. Uses `motion` library - do NOT add to main project. |
| `/staging/wordpress/` | Git-tracked WordPress theme snapshots (kadence-child = staging, kadence-child-prod = production) |
| `/scripts/compound/` | Automated nightly compound system |
| `/scripts/staging/` | WordPress pull/push deployment scripts |
| `/tasks/prd-gsc-seo-cleanup/` | SEO cleanup PRDs |

## Deployment

- **Vercel project**: `mhm-finds-dw5l` | Primary domain: `musthavemods.com` (non-www)
- **Build command**: `npx prisma generate && next build` (do NOT add `prisma migrate deploy`)
- **Rollback**: `vercel rollback <deployment-url> --yes`
- **WordPress staging**: `./scripts/staging/push-blog-functions.sh`
- **WordPress production**: `./scripts/staging/push-blog-functions-prod.sh` (requires confirmation)

## RPM / Monetization Optimization Rules

1. **Blog and Mod Finder are separate optimization targets.** The blog (WordPress) is reading-focused long-form content generating ~80% of Mediavine revenue. The mod finder (Next.js) is a browse/grid UI focused on discovery and pages/session. Never apply one surface's optimization patterns to the other without verifying it makes sense for that surface's UX.
2. **Data before code.** Before any RPM-related change, check Mediavine dashboard (via `browser-use --browser real`) and/or Google Analytics (property `437117335`) to identify the specific metric you're targeting. Cite the baseline number and expected impact. Don't guess — measure.
3. **Know your surface.** Blog changes go through `staging/wordpress/kadence-child/functions.php` → push scripts → SSH. Mod finder changes go through Next.js files → Vercel deploy. Never confuse the two deployment paths.
4. **Viewability is the #1 RPM lever.** Site-wide viewability is 56.3% (target 70%+). Prioritize changes that improve ad viewability over traffic volume. Every 1% viewability increase ≈ 1-2% RPM increase.
5. **Mediavine dashboard access**: `browser-use --browser real` can open `https://publishers.mediavine.com/sites/SW50ZXJuYWxTaXRlOjE0MzE4/analytics` with the user's Chrome session. Use this to verify RPM, viewability, CPM, and revenue impact after changes.
6. **RPM audit log**: `scripts/agents/rpm-audit-log.json` tracks all optimizations with before/after Mediavine metrics. Update it for every RPM-related change.
7. **RPM agent prompt**: `scripts/agents/mediavine-rpm-expert.md` contains the full Mediavine playbook and autonomous loop instructions.
8. **Don't blindly apply blog patterns to mod finder.** 18px font was right for blog (long-form reading) but wrong for mod finder (compact grid). This was reverted in commit 8965e1b. Always ask: "does this pattern make sense for THIS surface's UX?"

### Blog vs Mod Finder Optimization Cheat Sheet

| | Blog (WordPress) | Mod Finder (Next.js) |
|---|---|---|
| **User behavior** | Reading, scrolling long content | Browsing grids, clicking cards |
| **Revenue share** | ~80% of Mediavine revenue | ~20% |
| **Font/typography** | Already 18px / 1.8 line-height (good) | Keep default — grid UI needs compact text |
| **RPM levers** | Scroll depth, viewability, content density, internal linking between posts | Pages/session, related mods, session duration |
| **Ad units** | Content ($2,276), Adhesion ($1,038), Sidebar Sticky ($936) | Shares same Mediavine script |
| **Deploy path** | `functions.php` → `push-blog-functions.sh` | Next.js files → Vercel |
| **Key files** | `staging/wordpress/kadence-child/functions.php` | `app/page.tsx`, `app/mods/[id]/page.tsx`, `components/` |

## Agent Workflow

```
/commitit → /reviewit → /shipit
```

Agents work on feature branches, never main. Use `/reviewit` before `/shipit`.

## Documentation Index

Detailed knowledge has been extracted into dedicated docs. Read these before making changes in their domain:

| Document | Contents |
|----------|----------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Project structure, directory layout, key patterns, auth, multi-game architecture |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | All commands, env vars, webpack cache, testing, compound system setup |
| [`docs/PRISMA_GUIDE.md`](docs/PRISMA_GUIDE.md) | Connection pooling, Accelerate, Decimal handling, raw SQL, script setup |
| [`docs/WORDPRESS_GUIDE.md`](docs/WORDPRESS_GUIDE.md) | Proxy architecture, staging/prod workflows, Kadence gotchas, multi-game WP setup |
| [`docs/COMPOUND_LEARNINGS.md`](docs/COMPOUND_LEARNINGS.md) | All accumulated patterns & gotchas: build, Next.js, API, UI, scraping, security |
| [`docs/SEO_GUIDE.md`](docs/SEO_GUIDE.md) | Meta titles, GSC workflow, canonical consolidation, robots.txt, domain migration |
| [`docs/PRD-INDEX.md`](docs/PRD-INDEX.md) | Index of all product requirement documents |
