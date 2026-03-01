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
- **vercel.json `:path*` vs `:path+`**: Use `:path+` (one-or-more) for catch-alls, NOT `:path*` (zero-or-more). `:path*` shadows explicit rules for the base path (e.g., `/blog/` matches `/blog/:path*`).
- **vercel.json slug exclusion list**: The catch-all `/:slug((?!api|admin|...).*)/` pattern must explicitly exclude every Next.js route prefix. Add new prefixes when creating new top-level routes.
- **Trailing slash + catch-all**: With `trailingSlash: true`, `/path` redirects to `/path/` which can match catch-all patterns. Define explicit rules for both `/path` and `/path/` BEFORE catch-alls.
- **Sitemap lastmod dates**: Use stable date strings (`'2026-02-24'`), NOT `Date.now()` or `new Date().toISOString()`. Dynamic timestamps make lastmod meaningless to Google.
- **ads.txt proxy**: Ad networks (Mediavine) verify domain ownership via `/ads.txt`. Since WordPress manages this file, add a Vercel rewrite to proxy it from the blog origin. Must appear before catch-all patterns in `vercel.json`.

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
