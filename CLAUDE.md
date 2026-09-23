# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔐 CRITICAL SECURITY RULE: Never Commit Secrets

**NEVER commit any of the following to git:**

### Prohibited Items:
- ❌ API keys, tokens, or secrets of any kind
- ❌ Database connection strings with credentials
- ❌ Passwords, auth tokens, or session secrets
- ❌ Private keys, certificates, or encryption keys
- ❌ OAuth client secrets
- ❌ Webhook secrets
- ❌ Any `.env*` files except `.env.example`

### Required Actions:
1. **Use placeholders in documentation**: Replace actual credentials with `[YOUR_KEY_HERE]` or `your-key-here`
2. **Check `.gitignore`**: Ensure all sensitive files are ignored:
   ```
   .env
   .env.local
   .env*.local
   .env.production
   *.key
   *.pem
   secrets/
   ```
3. **Use `.env.example`**: Only commit example files with placeholders, never actual values
4. **Before committing**: Always review changes for exposed credentials
5. **If exposed**: Immediately rotate credentials and remove from git history

### Safe Patterns:
✅ `.env.example` with placeholders
✅ Documentation with `[PLACEHOLDER]` values
✅ Instructions to "copy from .env.local"
✅ Links to credential providers (e.g., "Get from Stripe Dashboard")

**If you accidentally commit secrets, STOP immediately and rotate the credentials before continuing.**

---

## 🔐 CRITICAL SECURITY RULE: Admin API Route Authentication

**EVERY admin API route MUST have authentication. No exceptions.**

### Defense-in-Depth Architecture

Admin routes are protected by TWO layers:

1. **Middleware (First Line of Defense)** - `middleware.ts` blocks ALL requests to `/api/admin/*` that lack admin authentication at the request level
2. **Route-Level Auth (Second Line of Defense)** - Each route handler MUST also check auth for defense-in-depth

### Required Pattern for Admin API Routes

Every file in `app/api/admin/` MUST:

```typescript
// 1. Import auth utilities
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// 2. Export dynamic to prevent static rendering issues
export const dynamic = 'force-dynamic';

// 3. Check auth at the START of each handler
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ... rest of handler
  } catch (error) {
    // ... error handling
  }
}
```

### Security Scanner

Run the security scanner to verify all admin routes have auth:

```bash
npm run security:check-admin-auth
```

This should be run:
- Before committing changes to admin routes
- In CI/CD pipelines
- Periodically as a security audit

### Why Both Middleware AND Route-Level Auth?

- **Middleware** catches requests before they reach route handlers (network-level protection)
- **Route-level** provides defense-in-depth if middleware is misconfigured or bypassed
- **Never rely on just one layer** - security requires redundancy

### NEVER Create Admin Routes Without Auth

❌ **WRONG** - Missing auth check:
```typescript
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  await prisma.mod.delete({ where: { id } });  // DANGEROUS!
  return NextResponse.json({ success: true });
}
```

✅ **CORRECT** - Auth check first:
```typescript
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();
  await prisma.mod.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

---

## 🚨 CRITICAL: Prisma Connection Pooling in Serverless (Vercel)

**NEVER modify `lib/prisma.ts` without understanding this section.**

### The Problem
On Vercel (serverless), each function invocation can create a new PrismaClient instance. If the client isn't cached globally, you will **exhaust the database connection pool** and cause a site-wide outage.

### Symptoms of Connection Pool Exhaustion
- Intermittent 500 errors (some requests work, others fail)
- Error: `Can't reach database server at db.prisma.io:5432`
- Simple queries succeed while complex queries fail
- Site works briefly then crashes

### The CORRECT Prisma Client Pattern
```typescript
// lib/prisma.ts - THIS PATTERN IS CRITICAL
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// ⚠️ MUST cache in ALL environments including production!
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

### What NOT To Do
```typescript
// ❌ WRONG - This only caches in development, NOT production!
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Before Refactoring Auth or Database Code
1. **Check import paths** - Adding new files that import `prisma` increases cold start frequency
2. **Test locally first** - Run `npm run build` to catch issues
3. **Deploy cautiously** - Watch Vercel logs for connection errors after deploy
4. **Have rollback ready** - Know how to promote a previous deployment in Vercel

### If Connection Pool Exhausts
1. **Immediately rollback** in Vercel (Deployments → Previous working deploy → Promote to Production)
2. Wait 2-3 minutes for connections to timeout
3. Fix the issue in code
4. Redeploy carefully

---

## ✅ Prisma Accelerate - Query Caching Enabled

**This project uses Prisma Accelerate for query-level caching.** The `@prisma/extension-accelerate` package is installed and configured in `lib/prisma.ts`.

### Environment Variable Setup (CRITICAL)

The environment variables MUST be configured correctly for Accelerate to work:

```bash
# .env.local (and Vercel Production)

# DATABASE_URL = Prisma Accelerate URL (enables caching)
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."

# DIRECT_DATABASE_URL = Direct postgres connection (for migrations)
DIRECT_DATABASE_URL="postgres://...@db.prisma.io:5432/postgres?sslmode=require"
```

### ⚠️ Common Mistake: Swapped URLs
If URLs are swapped (DATABASE_URL has `postgres://` instead of `prisma+postgres://`), caching will be silently disabled. Check the dev server logs for:
```
[Prisma] Accelerate extension enabled (Accelerate URL detected)
```
If you don't see this message, the URLs are likely swapped.

### How It Works
The `lib/prisma.ts` file:
1. Detects if `DATABASE_URL` starts with `prisma://` or `prisma+postgres://`
2. If yes, enables the Accelerate extension with `withAccelerate()`
3. Adds slow query logging (>2s dev, >5s prod)
4. Caches the client globally to prevent connection pool exhaustion

### Using Cache Strategy in Queries
When Accelerate is enabled, you can use `cacheStrategy` in queries:
```typescript
const mods = await prisma.mod.findMany({
  cacheStrategy: { ttl: 60 }, // Cache for 60 seconds
});
```

### Recovery from Prisma Connection Issues
1. **Rollback immediately**: `vercel rollback <working-deployment-url> --yes`
2. Check Prisma Dashboard for errors
3. Verify env vars are not swapped (DATABASE_URL should be `prisma+postgres://`)
4. Wait for connections to clear before redeploying

---

## ⚠️ CRITICAL: Production Deployment Safety

### Before Pushing to Production
1. **Test locally first** - `npm run build` must succeed
2. **Don't add new packages without understanding them** - Research first
3. **Infrastructure changes need explicit approval** - Databases, auth, caching
4. **Have a rollback plan** - Know the last working deployment

### Rollback Commands
```bash
# List recent deployments
vercel ls

# Rollback to a specific deployment
vercel rollback <deployment-url> --yes

# Example:
vercel rollback mhm-finds-dw5l-abc123-ericputnams-projects.vercel.app --yes
```

### When Things Break in Production
1. **STOP** - Don't push more fixes blindly
2. **Rollback first** - Get the site working
3. **Investigate** - Check Vercel logs, Prisma dashboard
4. **Fix locally** - Test thoroughly
5. **Deploy carefully** - Watch logs after deploy

---

## 🧹 CRITICAL: Vercel Build Cleanliness

**All Vercel builds MUST be clean and optimized.** Warnings and errors should be fixed, suppressed, or documented as benign.

### The Standard
- ✅ Zero build errors
- ✅ Zero actionable warnings (all warnings either fixed or documented as benign)
- ✅ No "Error fetching..." messages during static generation
- ✅ No deprecated package warnings that can be fixed

### Common Warnings and Fixes

#### Static Generation Errors ("Error fetching..." during build)
API routes that use `request.url`, `cookies()`, or `headers()` will fail during static generation.

**Fix**: Add `export const dynamic = 'force-dynamic'` to the route file:
```typescript
// app/api/example/route.ts
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // ... uses request.url, cookies(), or headers()
}
```

#### Deprecated npm Package Warnings
Use npm overrides in `package.json` to force newer versions of transitive dependencies:
```json
{
  "overrides": {
    "glob": "^10.0.0",
    "rimraf": "^5.0.0"
  }
}
```

#### React useEffect Missing Dependencies
Fix all `react-hooks/exhaustive-deps` warnings by either:
1. Adding the missing dependency to the array
2. Using `// eslint-disable-next-line react-hooks/exhaustive-deps` with a comment explaining why

#### Next.js `<img>` vs `<Image>` Warnings
Replace HTML `<img>` tags with Next.js `<Image>` component:
```typescript
import Image from 'next/image';
// <img src="..." /> → <Image src="..." width={} height={} alt="" />
```

### Known Benign Warnings (Cannot Be Suppressed)

These warnings are expected and cannot be fixed without major upgrades. Document them here so they're not repeatedly investigated:

| Warning | Reason | Status |
|---------|--------|--------|
| `WARNING: Unable to find source file for page /_not-found` | Vercel quirk with App Router | Benign - does not affect functionality |
| `npm warn deprecated eslint@8.x.x` | ESLint 9 requires Next.js 15 and flat config migration | Cannot fix without major upgrade |
| `npm warn deprecated @humanwhocodes/*` | Part of ESLint 8 ecosystem | Cannot fix without ESLint 9 |
| `npm warn deprecated node-domexception` | Transitive dependency of undici/node-fetch | Cannot fix - upstream issue |

### After Every Deployment
1. Review Vercel build logs for new warnings
2. If fixable → create a task and fix it
3. If benign and new → add to the table above
4. Goal: Anyone reviewing build logs should see only documented benign warnings

### When to Create Cleanup Tasks
- New warning appears that's not in the benign list
- Warning count increases after a dependency update
- Build times increase significantly (investigate caching issues)

---

## 🚫 CRITICAL GIT RULE: Never Auto-Commit

**NEVER create git commits unless explicitly requested by the user.**

### Prohibited Actions:
- ❌ Automatically committing changes after completing a task
- ❌ Creating commits "to save progress" without being asked
- ❌ Committing changes as part of a larger workflow unless specifically instructed
- ❌ Suggesting or offering to commit changes (just wait for user request)

### When You CAN Commit:
✅ User explicitly says: "commit my changes", "create a commit", "make a git commit", etc.
✅ User asks you to "commit and push"
✅ User requests a commit as part of a specific workflow they describe

### Rationale:
Users want full control over what gets committed and when. Even if you complete a feature successfully, the user may:
- Want to review changes first
- Need to make additional modifications
- Prefer to commit manually with their own message
- Be working on a larger change set that includes your work

**IMPORTANT: Only commit when the user explicitly asks you to commit. No exceptions.**

---

## 🚨 CRITICAL: WordPress functions.php Push Script Safety

**The `scripts/staging/push-blog-functions*.sh` scripts do an `scp` overwrite. Anything edited on the server but not in the local git-tracked file gets WIPED silently.** This caused the Mar 17 → Apr 8 2026 Mediavine sidebar regression — ~24% RPM loss (~$2,000/month) for ~3 weeks.

### The Regression Pattern (DO NOT REPEAT)
1. Mar 11 2026: Mediavine sidebar code added directly on prod server via SSH (never committed to git)
2. Mar 17 2026: A series of unrelated search-button styling commits ran `push-blog-functions-prod.sh`. Each push overwrote prod with the local file, which lacked the sidebar code, silently wiping it.
3. Apr 5 2026: Mediavine sidebar health score crashed to 0.1, RPM dropped from $13.16 → $9.97
4. Apr 8 2026: Restored. Push scripts hardened with marker checks. Monitor added.

### Mandatory Rules

**NEVER edit `functions.php` directly on the server via SSH.** The push script's `scp` will eventually wipe it. If you absolutely must SSH-edit, immediately pull with `pull-blog-functions-prod.sh` and commit the changes to git **before** running anything else.

**ALWAYS use the push scripts** (`push-blog-functions.sh` for staging, `push-blog-functions-prod.sh` for prod). They:
- Lint PHP locally before pushing
- Verify `CRITICAL_MARKERS` exist in the local file (refuses to push if any are missing)
- Pull current server state, diff against local, and warn if the server has features the local file doesn't (catches "you forgot to pull recent SSH edits")
- Show added/removed line counts before confirming

**ALWAYS add new critical features to `CRITICAL_MARKERS`** in BOTH push scripts. If you ship a revenue feature (sidebar, ad container, schema, etc.) or a routing feature (search proxy, blog pagination, redirect rule), add a grep pattern to the `CRITICAL_MARKERS` array. The format is `"<grep-pattern>|<human-name>"`.

Current critical markers (Apr 8 2026):
- `mhm_inject_mediavine_sidebar` — Mediavine sidebar (~$2K/month)
- `mhm_mediavine_sidebar_css` — Mediavine sidebar CSS
- `mhm_search_form_rewrite_js` — Blog search form rewrite (PRD: blog search)
- `is_from_apex_rewrite` — Apex domain rewrite helper

### After Every Push to Prod

Run `./scripts/agents/check-blog-sidebar.sh` immediately. It curls a real article and fails loudly if any critical marker is missing from the live HTML. Also run this:
- Daily as part of compound automation
- Whenever RPM drops unexpectedly
- Before declaring "the fix is in"

### Known Forbidden Patterns in WordPress functions.php

| Pattern | Why It's Forbidden |
|---|---|
| `add_filter('kadence_post_layout', ...)` | Triggers Kadence's full sidebar pipeline and crashes PHP-FPM silently |
| `position: sticky` / `position: fixed` on Mediavine ad containers | Mediavine Script Wrapper handles stickiness itself; CSS sticky breaks ad auto-refresh |
| `overflow: hidden` on `.entry-content` or any sidebar ancestor | Breaks Mediavine sticky sidebar |
| `body.single #secondary { display: none }` | Hides the Mediavine sidebar. Removed Apr 8 2026 — DO NOT re-add. |
| Direct SSH edits to functions.php | Will be wiped by the next push script run |

### Same Risk Applies to Other "Critical" Server-Side Code

This isn't just about the sidebar. The same pattern can wipe:
- Blog pagination middleware (`/blog/page/2` routing) — currently in `middleware.ts` (committed, safe)
- Search form action rewrites (`mhm_search_form_rewrite_js`) — in functions.php, **protected by CRITICAL_MARKERS**
- WordPress proxy logic — in `middleware.ts` (committed, safe)
- noindex stripping — in `middleware.ts` (committed, safe)
- Vercel rewrites — in `vercel.json` (committed, safe)

If you add a new server-side feature anywhere that has a "push from local overwrites server" deployment pattern, **you must add a marker check to the push script and a curl-based check to `check-blog-sidebar.sh`**. No exceptions.

---

## IMPORTANT: newapp_musthavemods Folder

**The `/newapp_musthavemods` folder is a DESIGN REFERENCE ONLY.**

- This folder contains a Vite/React proof-of-concept app showing the desired look and feel for UI components
- **DO NOT** migrate the main Next.js app to use this Vite app
- **DO NOT** try to run or start the newapp_musthavemods dev server
- **INSTEAD**: Look at the component designs (ModDetailsModal, ModCard, etc.) in newapp_musthavemods as inspiration and apply the same visual design to the main Next.js app components
- Keep all existing backend functionality (PostgreSQL, Prisma, Next.js API routes)
- Only adopt the UI/UX patterns, styling, and layout from newapp_musthavemods

**Main development should ALWAYS happen in the root Next.js project, not in newapp_musthavemods.**

## Project Overview

ModVault (MHMFinds) is a Sims mod discovery platform built with Next.js 14, TypeScript, Prisma, and PostgreSQL. The platform aggregates content from multiple sources (CurseForge, Patreon, Tumblr, etc.) and uses AI-powered search with OpenAI embeddings for semantic mod discovery.

## Development Commands

### Core Development
```bash
npm run dev                 # Start Next.js development server (localhost:3000)
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run Next.js linter
npm run type-check         # TypeScript type checking without emitting files
npm run clean              # Clear .next and node_modules/.cache (fixes webpack errors)
npm run dev:clean          # Clean + start dev server (use when cache is corrupted)
```

### Webpack Cache Corruption (IMPORTANT)

The Next.js webpack cache can become corrupted, causing errors like:
- `Cannot find module './657.js'`
- `ENOENT: no such file or directory, lstat '.next/server/vendor-chunks/...'`
- `Can't resolve './vendor-chunks/lucide-react'`

**To fix**: Run `npm run clean` or `npm run dev:clean`

**Prevention**: When making significant changes to dependencies, imports, or running cleanup scripts, proactively run `npm run clean` before restarting the dev server.

**AI Agents**: After completing batch operations or running scripts that modify the codebase, ALWAYS verify the app still works by checking if the dev server starts without errors. If cache corruption occurs, fix it immediately with `npm run clean`.

### Database Operations
```bash
npm run db:generate        # Generate Prisma client from schema
npm run db:push            # Push schema changes to database (no migration)
npm run db:migrate         # Create and apply migration
npm run db:studio          # Open Prisma Studio GUI
npm run db:seed            # Initialize database with seed data
npm run db:reset           # Reset database (WARNING: deletes all data)
npm run db:deploy          # Apply migrations in production
```

### ⚠️ Vercel Build and Migrations
The Vercel build command is: `npx prisma generate && next build`

**DO NOT add `prisma migrate deploy` to the build command** unless absolutely necessary. If the database is temporarily unreachable during build, the entire deployment fails. Instead:
- Apply migrations manually before deploying: `npm run db:deploy`
- Or use a CI/CD step separate from the build

### Content Aggregation
```bash
npm run content:aggregate      # Run standard content aggregation
npm run content:privacy        # Run privacy-enhanced aggregation (default settings)
npm run content:stealth        # Run stealth mode aggregation (max privacy)
npm run content:conservative   # Run conservative aggregation (slowest, safest)
npm run content:test           # Test privacy aggregator without database writes
```

### Data Quality & Cleanup
```bash
# Author data cleanup - fixes garbage author names extracted from URLs
npx tsx scripts/cleanup-author-data.ts              # Dry run - preview changes
npx tsx scripts/cleanup-author-data.ts --fix        # Apply fixes
npx tsx scripts/cleanup-author-data.ts --fix --limit=100  # Fix first 100 only
```

**Author Cleanup Details**: The original scraper extracted garbage values like "Title", "ShRef", "Id" from URL path segments. The cleanup script visits actual mod download URLs and extracts real author names. See `docs/PRD-author-data-cleanup.md` for full documentation.

### MustHaveMods Scraper
```bash
# Scrape MustHaveMods.com posts (skips recently scraped URLs)
npm run scrape:mhm

# Force rescrape all posts (ignores freshness tracking)
npm run scrape:mhm -- --force

# Resume from specific post number or URL
npm run scrape:mhm -- --start-index 131
npm run scrape:mhm -- --start-url "https://musthavemods.com/sims-4-cc-finds/"

# Limit number of posts to scrape
npm run scrape:mhm -- --limit 50

# Backfill scraped URLs CSV from existing database entries
npx tsx scripts/backfill-mhm-scraped-urls.ts
npx tsx scripts/backfill-mhm-scraped-urls.ts --dry-run

# Fix mods with null contentType using intelligent detection
npx tsx scripts/fix-null-content-types.ts              # Dry run
npx tsx scripts/fix-null-content-types.ts --apply      # Apply fixes
npx tsx scripts/fix-null-content-types.ts --apply --verbose
```

**MHM Scraper Features:**
- **Content Type Detection**: Automatically detects mod types (hair, furniture, makeup, etc.) using `contentTypeDetector` library
- **Room Theme Detection**: Identifies room themes (bathroom, kitchen, etc.) for furniture/decor mods
- **URL Freshness Tracking**: Skips URLs scraped within the last 3 months (stored in `data/mhm-scraped-urls.csv`)
- **Protected Sites Handling**: Quietly skips Patreon/CurseForge links that return 403 errors

**When to Use:**
- Run `npm run scrape:mhm` for regular scraping (respects freshness)
- Run with `--force` after updating the content detector to re-analyze existing pages
- Run `backfill-mhm-scraped-urls.ts` after manual database imports to prevent re-scraping
- Run `fix-null-content-types.ts` to retroactively fix mods missing contentType facets

## Architecture

### Directory Structure

**`/app`** - Next.js 14 App Router structure
- `/api` - API routes (REST endpoints)
  - `/api/auth/[...nextauth]` - NextAuth.js authentication handler
  - `/api/mods` - Mod CRUD endpoints
- `/mods/[id]` - Dynamic mod detail pages
- Multiple test pages for development (test/, working-test/, simple-main/, etc.)

**`/lib`** - Core business logic and utilities
- `/services` - Service layer containing business logic
  - `contentAggregator.ts` - Standard web scraping service for CurseForge, Patreon
  - `privacyAggregator.ts` - Privacy-enhanced scraping with proxy support, user agent rotation, and anti-detection features
  - `mhmScraper.ts` - MustHaveMods.com scraper with content detection and URL freshness tracking
  - `contentTypeDetector.ts` - Intelligent content type detection (hair, furniture, makeup, etc.) with confidence levels
  - `aiSearch.ts` - OpenAI-powered semantic search, recommendations, and mod similarity
- `/config` - Configuration files
  - `privacy.ts` - Privacy settings for content aggregation (default/stealth/conservative modes)
- `prisma.ts` - Prisma client singleton instance
- `api.ts` - API client utilities

**`/components`** - React components (landing page components: Hero, Features, ModCard, SearchBar, etc.)

**`/prisma`** - Database schema and migrations
- `schema.prisma` - Prisma schema defining all models

**`/scripts`** - Standalone utility scripts for database initialization and content aggregation

### Key Architecture Patterns

**Authentication**: NextAuth.js with JWT strategy, Google and Discord OAuth providers. User sessions stored in PostgreSQL via Prisma adapter.

**Database**: PostgreSQL accessed through Prisma ORM. All models use `cuid()` IDs. Key models:
- `User` - User accounts with creator/premium/admin flags
- `Mod` - Central mod entity with rich metadata, creator relations, and search index
- `CreatorProfile` - Creator profiles linked to users
- `SearchIndex` - Stores OpenAI embeddings (Float[]) and full-text vectors for AI search
- `ContentSource` and `ScrapingJob` - Track content aggregation sources and jobs

**Content Aggregation**: Two aggregator implementations:
1. `contentAggregator.ts` - Basic scraping with cheerio/axios
2. `privacyAggregator.ts` - Advanced scraping with proxy rotation, user agent spoofing, request timing randomization, and session management

**AI Search**: OpenAI embeddings (text-embedding-3-small) stored in SearchIndex.embedding field. AISearchService provides:
- Semantic search with cosine similarity
- User-personalized recommendations based on favorites/downloads
- Similar mod discovery
- Popularity boosting in ranking algorithm

**Path Aliases**: TypeScript configured with `@/*` pointing to project root (see tsconfig.json)

## Recent UI/UX Enhancements

### Modern Search Experience (Latest Update)
The main search page (`app/page.tsx`) has been completely redesigned with enterprise-grade UX:

**Enhanced Search Bar:**
- Autocomplete dropdown with recent searches (localStorage persistence)
- Trending search suggestions with categorization
- Keyboard shortcuts (⌘K to focus search)
- Escape key to close suggestions
- Smart suggestions based on user input

**Smart Filter Sidebar:**
- Visual filter counts showing number of mods per category
- Custom-styled checkboxes with smooth transitions
- Individual "Clear" buttons for each filter section
- Gradient backgrounds for active filters
- Sticky positioning for persistent access during scroll
- Collapsible on mobile devices

**Quick Filter Tags:**
- One-click filters: Trending (most downloads), Newest, Top Rated, Free Mods
- Visual active states with gradients and animations
- "Clear All" button when filters are active
- Pulse animations on active tags

**Flexible View Options:**
- Grid view with 3, 4, or 5 column density options
- List view mode (UI ready, display logic pending)
- View mode toggle buttons with visual feedback
- Responsive grid that adapts to screen size

**Active Filter Pills:**
- Visual chips showing currently applied filters
- Individual remove buttons on each pill
- Color-coded by filter type (category, version, price)
- Displayed in results header for quick reference

**UI Polish:**
- Sticky header that stays visible during scroll
- Smooth fade-in animations for cards
- Gradient text effects on headings
- Hover states with scale transforms
- Loading skeletons for better perceived performance
- Enhanced typography and spacing

**Custom Animations (globals.css):**
- `animate-fade-in` - Cards fade in on load
- `animate-gradient` - Animated gradient text
- `animate-pulse` - Subtle pulse on indicators
- Hover scale effects on interactive elements

### Implementation Files Modified
- `app/page.tsx` - Complete redesign of search page
- `app/globals.css` - Added custom animations and utility classes
- `components/ModCard.tsx` - Already well-designed, no changes needed
- `components/ModGrid.tsx` - Already supports dynamic grid columns

## Important Implementation Notes

### Content Scraping Privacy Levels
When scraping content, choose the appropriate privacy level:
- **Default** (`content:privacy`): 3-8s delays, user agent rotation
- **Stealth** (`content:stealth`): 5-15s delays, proxy rotation enabled, geographic rotation
- **Conservative** (`content:conservative`): 10-30s delays, strictest rate limiting

The privacy aggregator includes anti-detection features like randomized headers, rotating user agents, and session management to avoid blocking.

### Database Schema Considerations
- Mod prices use `Decimal(10,2)` - handle with Prisma's Decimal type
- SearchIndex.embedding is `Float[]` - store OpenAI embeddings here
- All cascade deletes are configured (User deletion cascades to all related entities)
- Unique constraints on favorites, reviews, and collection items prevent duplicates

### AI Search Implementation
The AISearchService generates embeddings on-demand (no pre-computed cache). For performance:
- Embeddings are generated for each search query
- Results are filtered before embedding calculation (limit * 2)
- Cosine similarity is calculated in-memory
- Popularity boost formula: `log10((downloads + 1) * (favorites + 1) * (rating || 1)) * 0.1`

### NextAuth Configuration
NextAuth uses JWT strategy (not database sessions). Custom callbacks populate JWT with user metadata (isCreator, isPremium, isAdmin). On user creation, a default "Favorites" collection is automatically created via event handler.

### Image Domains
Approved image domains in next.config.js: The Sims Resource, SimsDom, Sims4Studio, Patreon CDN, CurseForge, Tumblr, Unsplash, Placeholder. Add new domains to `images.domains` array before using them.

## Environment Variables

Required for development (see env.example):
- `DATABASE_URL` - Prisma Accelerate URL (`prisma+postgres://accelerate.prisma-data.net/...`) - enables query caching
- `DIRECT_DATABASE_URL` - Direct PostgreSQL connection (`postgres://...@db.prisma.io/...`) - used for migrations
- `NEXTAUTH_SECRET` - NextAuth.js secret for JWT signing
- `NEXTAUTH_URL` - Application URL (http://localhost:3000 in dev)
- `OPENAI_API_KEY` - Required for AI search features
- `CURSEFORGE_API_KEY` - Required for CurseForge content aggregation
- `GOOGLE_CLIENT_ID/SECRET` - For Google OAuth
- `DISCORD_CLIENT_ID/SECRET` - For Discord OAuth

**⚠️ DATABASE_URL vs DIRECT_DATABASE_URL**: These are often confused. `DATABASE_URL` should be the Accelerate URL (starts with `prisma+postgres://`) for caching. `DIRECT_DATABASE_URL` should be the direct postgres connection for migrations.

Optional but mentioned in env.example:
- Redis, Elasticsearch, AWS S3, SendGrid (not currently implemented)
- `PRIVACY_LEVEL` - Set to "stealth" or "conservative" for content aggregation

## Testing and Development

Multiple test pages exist in `/app` for rapid UI prototyping. These should be consolidated or removed before production deployment.

When adding new mods via aggregation, call `aiSearchService.updateSearchIndex(modId)` to generate embeddings for AI search functionality.

Database can be reset with `npm run db:reset` - this will delete all data and re-run migrations and seeds.

---

## 🧠 Compound Learnings

Updated by the nightly compound automation (`scripts/daily-compound-review.sh`).

> **📁 The full historical log lives in [`docs/COMPOUND_LEARNINGS.md`](docs/COMPOUND_LEARNINGS.md).**
> On 2026-09-17 this section was 172 KB of a 206 KB `CLAUDE.md` and was breaking the funnel
> agents before they could start (see "2026-09-17 — the compound loop ate itself" in the archive).
> All 292 historical entries were moved there **verbatim** — nothing was deleted, and dated
> entries continue to rotate out of this file as they age. Read the archive when you touch
> the subsystem it covers (Mediavine/ads, Pinterest queue, newsletter/SMTP, Patreon, the
> content-type detector, collection pages, the funnel runner). What stayed here are the rules
> that apply to *every* change.

### ⚠️ Keep this file small

`CLAUDE.md` is prepended to **every** Claude Code session in this repo, including all six funnel
agents. It is not free storage — it is a per-invocation tax. It grew 45 KB → 206 KB between
2026-09-02 and 2026-09-16 (~+13 KB/day, all of it from this section) and on 2026-09-17 the daily
run died with `Prompt is too long`.

**Budget: keep `CLAUDE.md` under ~60 KB.** When adding a compound entry:
1. Put durable, cross-cutting *rules* here. Put incident narratives, dated readings, and
   subsystem-specific gotchas in `docs/COMPOUND_LEARNINGS.md`.
2. Prefer editing an existing bullet over appending a near-duplicate.
3. If this section passes ~30 KB, rotate the older half into the archive in the same commit.
4. `wc -c CLAUDE.md` before you commit. This is a release gate, not a style note.

### Standing rules (the ones violated most often)

- **Fix the class in the same PR as the instance.** A test that hardcodes the one case you just
  fixed leaves its siblings broken — `/play` got a `NEXTJS_PREFIXES` test naming only `'play'`
  while `forgot-password` and `set-password` were already broken the same way. Prefer a scanner
  that walks the filesystem/registry over a list you maintain by hand, and give it a **vacuity
  guard** (assert it found >N items) so it cannot pass by finding nothing.
- **A `// Do NOT re-add` comment is not a gate — encode the removal as a test in the same PR.**
  A comment only protects the file it is written in, and it cannot reach a PR that was opened
  *before* the removal merged. PR #18 removed the Mediavine player relocation and the 8-second
  ad-hiding timer from `GoClient.tsx` and left exactly such a comment; PR #17 — opened 12 days
  earlier — had already ported the identical pattern to `/mods/[id]`, stayed green in the suite,
  and was approved for merge on 09-18 with no signal. Prose loses races; a scanner does not.
- **Strip comments before a source-level guard test asserts anything.** Comments in this repo
  deliberately quote the bad patterns they warn about, so a naive `indexOf` matches the
  documentation instead of the code.
- **Guard the constant, not a copy of its value.** Import the real constant into the test.
  A test that restates the literal passes happily while the two drift.
- **Enumerate the ways a check can be wrong *before* wiring it to a destructive action.**
  "Could not run" ≠ "is broken". Health checks use three exit codes — `0` ok, `2` WARN /
  could-not-run, `1` FAIL — and a probe that can be wrong about the world returns
  `unknown`, never a verdict that triggers a write. Two false-alarm production rollbacks came
  from collapsing these.
- **Silence from a scheduled job must become a row, not a sentence in a digest.** Any automation
  needs an explicit "did not fire" record; otherwise "ran and had nothing to say" and "never
  started" are indistinguishable. Annotating a dead monitor in prose is how it stays dead.
- **A monitor must mirror its consumer's selection query**, or its threshold is decoration. And
  when a number is metered by design, threshold the *buffer* (runway), not the point-in-time count.
- **Print the decision rule before you take the reading.** A threshold chosen after seeing the
  printout is not a pre-committed gate. Guardrails on a must-not-fall metric are **one-sided**
  (≥95% of baseline), never a symmetric ±band — a +13.8% RPM result once flagged as a breach.
- **Segment a channel by serving host before concluding the channel is declining.** This site
  serves the same content on the apex and on `blog.*`, so a channel total sums two hosts and can
  hide that all of the movement sits on one: Pinterest read −10.2% WoW in aggregate while `blog.*`
  (31.7% of pin sessions) was *up* 1.8% and the entire decline was on the apex. When comparing two
  duplicate-content hosts, restrict to **paths that exist on both** and compare per-path, or page
  mix confounds the host effect.
- **Rank a scarce repeatable action by the outcome you want to move, never by input recency.**
  An allocator that takes "the N newest rows" is blind to earning power and can be anti-correlated
  with value by construction: the three destinations getting the most revival pins (32% of the
  slice) earned 2.8% of its sessions, while the two best (55% of sessions) got 14% of the pins.
  Prove recency and value correlate before letting recency stand in for value.
- **A session with zero `page_view` events is not traffic**, whatever the engagement-rate field
  says — audit for zero-pageview slices before quoting a channel's "real traffic" share.
- **Verify what a logged-out visitor is served, not what the pipeline says about itself.** A check
  that only asks the deploy pipeline about the deploy pipeline stays green through a full outage.
  Confirm a runner change actually executed by grepping its log for a string unique to the new
  version; the file on disk proves nothing.
- **`trailingSlash: true` is global — it applies to `/api/*` too.** Every hand-authored URL that
  leaves the app (email link, header, form action, webhook) needs the trailing slash. Browsers
  follow the 308; RFC 8058 one-click POSTs do not.
- **Any new top-level `app/` directory needs a `NEXTJS_PREFIXES` entry in the same PR**, or
  middleware proxies it to WordPress and the visitor gets a 404. Invisible to `next build`.
  Paths whose first segment contains a dot are exempt by construction (`middleware.ts:65` skips
  them and the matcher excludes `favicon.ico`), so icon/manifest/static files need no entry.
- **`output: 'standalone'` only ships files it has traced, and it cannot see an `fs` read.** Any
  route that reads a repo-committed file via `fs.readFileSync(process.cwd() + …)` instead of
  `import` needs a matching `experimental.outputFileTracingIncludes` entry in `next.config.js`
  (see `/api/admin/funnel/history` → `./reports/funnel/history.json`). Without it the route works
  in `npm run dev`, passes `next build`, and then 404s **only in production**. Read such files at
  request time, not import time, so a not-yet-generated file is a clean runtime 404 rather than a
  build failure.
- **App Router auto-links `app/favicon.ico`, `app/icon.png` and `app/apple-icon.png` from file
  presence alone, but `public/site.webmanifest` is never auto-linked** — it needs an explicit
  `metadata.manifest` in `app/layout.tsx`. Missing icons emit zero build-time signal; Google
  resolves one favicon per hostname from the site root, so the blog subdomain's icon never counts.
- **Next.js only inlines `NEXT_PUBLIC_*` when the literal `process.env.NEXT_PUBLIC_X` expression is
  physically in the source.** A computed key or a helper defaulting to `process.env` evaluates
  `undefined` in the browser while every server-side check passes.
- **Defer every env read to call time** in any module that constructs a singleton at import time —
  ESM import hoisting runs before `dotenv.config()`.
- **Put the safety invariant in the library, not the caller**, and make even the dry run refuse a
  placeholder — the dry-run preview is the artifact a human signs off on.
- **A crawler/feed surface degrades to partial content, never a 500.** Per-query `.catch()` →
  empty list → 200. A poller that gets an error may back off for days.
- **GET must never mutate** on any consent endpoint (unsubscribe, confirm). Link scanners and mail
  prefetchers follow GET links. Make the POST idempotent.
- **Never let an email carrying a live secret ride the shared notifier's logging path** — pass
  `skipLog: true`. Hashing the token in one table buys nothing if another stores the raw body.
- **Redact at the point of capture** so every consumer inherits it, and never print a token,
  connection string, or address a script read from the environment.
- **Ad anchors (`.mv-ads`, empty `<aside id="secondary">`) must render on first paint** — before
  the loading state resolves *and* in the error state. Mediavine scans the DOM once. Never call
  `mediavine.newPageView()` from a page component. `.mv-ads` needs ≥2 children to get an
  in-content injection. Elements *inside* `.mv-ads` change ad geometry; siblings are free.
- **Mediavine's DOM is Mediavine's — never move, hide or re-init it.** Three specific bans, all
  scanned by section 6 of `__tests__/unit/sidebar-sticky-health.test.ts`: no source may name a
  Mediavine-created element by selector (`mv-outstream-container`, `mv-video-player`) — the only
  reason to is to relocate it, and moving their node breaks their viewability measurement; no
  `.mv-ads` element may carry a `ref=` or a `hidden` token in its `className` (that is how a timed
  "hide the empty ad box" check hid a container mid-auction, counting ads about to fill as
  unviewable); and `mediavine.newPageView()` has exactly one caller, `lib/hooks/useAnalytics.ts`
  (a second call races their init and tears down every slot).
- **Spot-check the top rows of any facet before it backs a landing page.** `expectedCount` tells
  you nothing about whether the mods are *right*, and it is also baked into user-visible copy.
- **A blog post's description is shared by every mod scraped from it, so it contaminates whole
  facets at once.** `jewelry` is the third facet cleaned of the same description-inference pollution
  after `lighting` (#61) and `gameplay-mod` (#79): 553 rows, only 77.0% carrying a jewelry word, a
  dining room and eight hairstyles in the grid. Re-tag from **titles only**, and prefer `NULL` to a
  guess — NULL drops a mod from every facet, a wrong tag pollutes one.
- **Measure a candidate keyword against the whole catalog before adding it, and record the
  *rejections* with their counts in the rule's own comment** so nobody re-proposes them. `nose`
  matches 95 titles of which 48 are nose *presets*; `chain` 31/7, `gem` 10/3, `grill` is a BBQ.
  Never list a singular and its plural — `keywordToRegex` already appends `(?:s|es)?`, so the pair
  double-counts one word's evidence and can push a mod over a confidence threshold on its own.
- **Write a negative result into the comment on the constant it concerns, and keep the constant.**
  When an experiment is reverted, delete the *behaviour*, not the hard-won lookups behind it:
  `PATREON_MEMBER_TIER_CHECKOUT_URL` stayed exported with no site consumer, its comment rewritten
  to record that leading `/go` with a checkout link produced 0 paid-and-connected and cut
  `patreon_click` from 8.75 to 3.57 users/day. The next agent then finds the tier id *and* the
  reason not to re-propose it in the same place, instead of re-deriving one and repeating the other.
- **One git worktree per agent**; copy `.env.local`, never symlink it; give each its own `npm ci`.
- **Serialize automated merges** (≥240 s apart) or Vercel coalesces builds and the ledger loses
  per-PR attribution. Enforced by exit code, not prose: `./scripts/agents/merge-gate.sh && gh pr
  merge N --squash` (exit 1 while the newest non-ledger commit on `origin/main` is <240 s old).
  Re-validate the second PR on the new `main` when both touch one file.
- **`npm run type-check` is never optional** — Vercel type-checks every `.ts` under `scripts/`.
- **A merge without a ledger row did not happen** — and the row must be written by the step that
  merges, not by a later step of the same run. On 09-19 seven PRs landed on `main` and **one**
  (#123) has a row; #116, #117, #118, #119, #121 and #122 have none.
- **Appending to a file in a working tree is not a record — only a commit on `main` is.**
  Until PR #153, `ledger()` in `deploy-verify.sh` `printf`ed its row into three trees and never
  committed — three copies of a non-durable write, i.e. three chances to lose the same row. It now
  calls `scripts/agents/ledger-commit.sh`, which lands the row on `main` from a throwaway worktree
  (idempotent, 3 push retries, falls back to `ledger-pending.jsonl` in the operator's tree, flushed
  by the next run). Use it for any row a script "knows is true". **Still open:** `history.json`
  reaches `main` only because `funnel-daily-prompt.md` step 8 asks the agent to `git add` it.
- **Durable means "on `main`", not "committed".** A commit stranded on an unmerged agent branch is
  the same loss class as an uncommitted worktree edit — only cheaper to recover. **Cherry-picking
  stranded work onto another unmerged branch is not recovery** — it doubles the bookkeeping and
  changes nothing: `ce7c111` (the operator's blanket "approve all #2 items") was copied to
  `65e1756` on the next day's branch and *both* are still off `main`, so the approval does not
  exist as far as the repo is concerned. Land it or it is not real.
- **A "did not fire" detector must not live inside the job it reports on.** The evening-guardrail
  MISSED row was written by step 0e of the *morning* run, so it went silent for exactly the
  evenings the morning run was broken. (The evening task MISSED ~17 of 21 nights and was retired
  09-22; `deploy-verify.sh --check` now runs in morning step 0e instead. A job that never runs is
  worse than no job — it reads as coverage.)
- **Never widen an already approved item to carry an adjacent fix** — queue the fix as a new item.
  The operator approved the narrower description, not the one you discovered mid-flight.
- **A dry run only proves the thing it prints.** Confirm the preview actually exercises the field
  the change alters; a green dry-run that never touches the modified field is a false signal, and
  needs a separate verification query that reads the changed field.
- **Canonicalize a host with an exact allowlist on the parsed host**, never a substring or prefix
  test, or `musthavemods.com.evil.example` gets rewritten too. Normalize only the *outbound public*
  URL field — an API's own endpoint host must keep pointing at whatever actually serves it.
- **Run a new guard test against the pre-fix tree before you trust it.** A test written after the
  fix and never seen red proves only that it compiles. PR #120 stated in its body *which* cases
  fail against pre-fix `origin/main` (3 of 7); without that line a guard is decoration.
- **A minimum-count invariant must also encode the second-order case.** "Every page has ≥1 inbound
  link" passes on the exact bug it was written for, because the one link can come from a page that
  is itself an orphan. Require at least one inbound source that clears the threshold *itself*
  (`__tests__/unit/collection-link-graph.test.ts`). Derive such thresholds from the registry where
  you can — `MIN_INBOUND`/`MAX_INBOUND` are hand-tuned to today's 21 collections and will drift.
- **Diagnose on the population, not on the count.** "0 of 54 paid patrons connected" read as
  confirmation of the standing diagnosis; classifying all 47 Patreon-linked accounts showed 43
  (91.5%) were never in the campaign at all — so `/go` Connect is a *follow* funnel and no tier
  rename could ever have moved that number. Before acting on a zero, classify the rows producing it.
- **Compare exact fractions at a gate boundary; round only for print.** 18/54 is exactly 1/3 and
  must pass, while `0.333 < 0.3333…` fails. Rounding before comparing flips a gate at its own
  boundary (`patreon-members-lib.ts` keeps `shareExact` separate from the displayed share).
- **Heterogeneous failures are not a class bug.** Six wrong rows failing for six *different* reasons
  do not justify the class-wide tool: the `--facets=nails` retag dry run proposed 21 changes, **15
  of them wrong** (rule priority beat the literal word — "Sponge Bob Summer Set" → hair). Reach for
  a facet-wide retag only when one rule is uniformly wrong for one class; otherwise hand-fix the
  individuals and give the tool an `--ids=` mode so the narrow fix is expressible at all. Pin
  correct-but-ambiguous rows in `scripts/lib/hand-audited-content-types.ts` as explicit no-ops with
  a `why`, so a later automated pass cannot re-break them.
- **Segment a WoW read by calendar *and* by treatment before calling a channel declined.** One US
  holiday Monday was 58% of a −3,542-session week-over-week drop (−7.0% naive → −2.7% ex-Monday),
  and the pages that received the intervention read +0.5% while everything else read −3.2% — so the
  rollback premise was unproven. Same-weekday-match or drop holidays, and split treated from
  untreated, before attributing a drop to a change.
- **Freeze the anchor of a multi-day batched send, and slice from the frozen list.** A `now`-relative
  eligibility window re-sorts between runs, so `--offset 100` on day 2 is not the row you think:
  every new consent drops a row off the front and silently skips an account that was never
  attempted. Remove exclusions and post-anchor consents from the *slice*, never from the list. An
  exclusion list that is non-empty but matches nobody is a hard failure, not a quiet pass.
- **Store the hash, never the address — and assert that in a test on the source file.**
  `lib/services/sendExclusions.ts` keeps only `sha256(lower(trim(email)))`, and
  `__tests__/unit/send-exclusions.test.ts` asserts the file contains no email-shaped string, so a
  future paste fails CI rather than review. Keep the exclusion check in the library
  (`partitionExcluded`) so every send path inherits it.
- **A runbook or health-check message must name the tier and the approval gate at the point of
  suggestion.** "revive stranded rows" reads to an autonomous agent as clearance; "operator-approved
  revival slice (Tier 2, SD-10) — never `--apply` it" does not. A policy living in a separate doc
  never reaches the agent reading the message.
- **A zero-rows vacuity guard does not cover a truncated fetch.** A paginated read capped at N pages
  can return a plausible, wrong population with no error at all. Guard completeness (`links.next`
  exhausted, page cap not hit), not just non-emptiness — and keep a self-diagnosing signal for a
  silent join failure (`paid > 0` with `paidWithUserId === 0` means `include=user` did not take).
- **Enforce read-only-ness of an external read at the call, and expect it to be copied.** The
  mailbox DSN counter is safe only because of two lines — `select(..., readonly=True)` and
  `BODY.PEEK[]` — living in one script with no shared wrapper. The second such script will forget
  one of them; wrap it before writing the second consumer.

### 2026-09-22 — the ledger became durable, and every gate had to learn about the new committer

- **A rule chained in prose after the action cannot gate it.** On 09-21 two merges landed 5 s
  apart; the Vercel alias went to the *parent* build and `deploy-verify --after-merge` graded PASS
  against a build production was not serving. "≥4 min apart" existed only as text after
  `gh pr merge`. Fix (#147): `merge-gate.sh` is an exit code you put *in front of* the merge.
- **The caller's sha is a lower bound, never the thing you certify.** After waiting for its build,
  `deploy-verify` now re-fetches `origin/main`; if HEAD moved, it waits for HEAD's build, verifies
  *that*, and writes `main moved past caller X; graded HEAD Y` into the row. Production serves
  HEAD, so HEAD is what gets graded.
- **Adding an automated committer to `main` means teaching every watcher of `main` about it.**
  `ledger-commit.sh` pushes `funnel(ledger): …` commits straight to `main` after each merge.
  Without exemptions they would hold `merge-gate` closed for 240 s after every verify and retarget
  `deploy-verify` onto a docs commit. Both now skip commits whose subject is `funnel(ledger):`
  **and** whose files are all under `reports/funnel/` (subject alone is spoofable). **But the
  exemption rests on a false premise:** `deploy-verify.sh:158` says a docs-only commit "never
  produces" a Vercel build, and `vercel.json`'s `ignoreCommand` skips *previews only* — ledger
  commit `505cab3` (22:13:21) produced production build `oyuurgkzl` (22:13:23). So after every
  verified merge, production is re-aliased to a build nobody smoke-tested. Same code, so low risk
  today, but check the build trigger before you call a commit "docs-only".
- **"Nothing to commit" is not "nothing happened" when the worker commits for itself.**
  `auto-compound.sh` checked `git diff --quiet` — but `loop.sh` tells Claude to commit each task,
  so the tree is clean either way. Count `git rev-list --count $BASE_SHA..HEAD` instead. An empty
  run now exits **2**, pushes nothing, deletes the local branch, and writes a row to
  `reports/compound/status.jsonl`. `cleanup-empty-compound-branches.sh` (dry-run default) exists
  but has not been run with `--apply`: `origin` still holds 20 `compound/*` branches on 09-22.
- **`"${VAR:-}/sub"` is never empty — guard the variable, not the joined path.** `deploy-verify`'s
  `[ -n "$dir" ] || continue` over `"${FUNNEL_PRIMARY_WT:-}/reports/funnel"` could never fire, so a
  standalone run wrote to `/reports/funnel` at the filesystem root (#154).
- **A fallback written inside an ephemeral worktree dies with the worktree.** The runner deletes
  per-agent worktrees at the end of each run, so `ledger-pending.jsonl` and
  `reports/compound/status.jsonl` are written to the operator's own checkout, not `$ROOT`.
- **Monitor a queue's inflow, not only its depth.** The Pinterest pin *writer*
  (`posts_2_supabase_server.py`, no cron) sat idle 09-04 → 09-21 while runway looked fine because
  three manual revival slices kept refilling it with borrowed inventory. `assessWriterLiveness()`
  (#142) watches the newest row carrying the writer's own insert marker (`"Wordpress Post ID"` not
  null — this repo's tooling leaves it null), so our own top-ups cannot mask a dead writer. WARN
  only; the fix (a BigScoots cron) is Tier 2.
- **Budgets are now checked, not just written down.** `scripts/agents/context-budget.ts` (SD-12)
  checks per-file byte caps on every doc the funnel agents read — `CLAUDE.md` is capped at 60 000 —
  and the runner runs it each morning (WARN only). Closed experiments, queue items and old playbook
  notes moved verbatim to `.claude/agents/mhm-funnel/archive/`.
- **Admin UI: a `flex-1` child needs `min-w-0`** or wide content (charts, tables) forces the page
  to scroll sideways — `app/admin/layout.tsx` `<main>` got it in #150.
---

*Last compound review: 2026-09-22*

---

## 🤖 Funnel-team autonomy: the operator's three rules (2026-09-01)

The operator granted the automated funnel team (Quinn/Pip/Sage/Nova/Cass/Rio, run by
`scripts/agents/run-funnel-daily.sh` from a clean worktree of `origin/main`) permission to
**commit, open PRs, and merge to `main` without asking**, under three rules that are enforced
by scripts, not by good intentions. This is a **scoped exception** to the "Never Auto-Commit"
rule above: it applies to funnel runs and to sessions the operator has explicitly put in
autonomous mode. Ordinary interactive sessions still never commit unless asked.

| # | Rule (operator's words) | Enforcement |
|---|---|---|
| 1 | *"Always check if you broke something — Vercel logs during deployment, or viewing WordPress. You can restore from WordPress backups or roll back Vercel."* | `scripts/agents/deploy-verify.sh --after-merge --sha <commit>` runs after **every** merge: waits for the Vercel build, renders `/`, `/mods`, `/mods/[id]`, `/go/[id]`, blog, sitemap and llms.txt in headless Chromium (`smoke-render.ts`), checks Mediavine loader + `aside#secondary` + `.mv-ads`, runs `check-blog-sidebar.sh`, counts 5xx in Vercel logs. Failure → automatic `vercel rollback` to the previous READY deploy and/or `push-blog-functions-prod.sh --yes` to restore `functions.php` from git, then re-check. `--check` runs again every morning (runner step 0e) — the evening task was retired 2026-09-22. |
| 2 | *"If your change significantly hurts RPM and revenue we go under as a business. You can't allow that, and if it happens you need to fix it quickly."* | `scripts/agents/revenue-guardrail.ts` runs first every morning: last finalized Mediavine day and 3-day window vs the same weekdays of the previous 4 weeks. **Red** (RPM < 85 % *and* revenue < 80 %, or Mediavine health not ok) + a production deploy inside the window → automatic rollback to the last deploy before the window, incident file, digest leads with it, no Tier 1 merges until closed. **Yellow** (revenue < 90 %) → no Tier 1 merges that day, Tier 0 only. Tier 2 items (ad layout, `functions.php`, schema, auth, `lib/prisma.ts`, money) are never merged by the team. |
| 3 | *"Run the daily pulse with full autonomy of what you need to do to achieve your goal. Make sure it's clear to me what you did."* | The scheduled task pre-approves the runner; the runner pre-approves the tools the agents need. Every production change is a row in **`reports/funnel/changelog.md`** (who, commit, deployment, verify result), every rollback is a file in `reports/funnel/incidents/`, and the digest has a "Changed today" section listing each PR / deploy / verify result. |

Ship protocol for any automated merge: feature branch from `origin/main` → `npm run build`,
`npm run type-check`, `npx vitest run __tests__/unit/sidebar-sticky-health.test.ts`, `npm run
security:check-admin-auth` if `app/api/admin` changed → PR with Tier / Stage / Metric /
Before / Read-on / Keep-if / Rollback → `gh pr merge --squash` → `deploy-verify.sh
--after-merge --sha <merge sha>` → ledger row. A merge without a ledger row did not happen.
`type-check` is never optional: Vercel's `next build` type-checks every `.ts` under `scripts/` as
well (tsconfig includes `**/*.ts`), so a standalone script with a type error breaks the production
build (PR #19, 2026-09-02 — caught by `deploy-verify.sh`, production untouched).
