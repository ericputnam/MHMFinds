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

This section is automatically updated by the nightly compound automation system. Each night, Claude Code reviews the day's work and extracts patterns, gotchas, and learnings discovered during development.

### Patterns That Work Well

- **Dedicated API routes for proxy edge cases**: When middleware rewrites can't handle query params reliably (e.g., `/blog/?s=term`), creating a dedicated API route (`/api/blog/search`) as a proxy is more reliable than trying to fix middleware param forwarding across Vercel edge + Next.js layers.
- **Skip the left spacer div — filter sidebar provides visual balance**: An earlier pattern used a 300px left spacer div to visually center content against the right ad sidebar. This was removed (Apr 2026) because it wastes 300px of grid space on every page. The filter sidebar already provides left-side visual weight, and users benefit more from wider mod grids than from perfect centering. The regression test suite (`__tests__/unit/sidebar-sticky-health.test.ts`) now asserts no left spacer divs exist.
- **Incremental search icon styling**: Kadence search uses `<input type="submit">` with a sibling SVG, not a `<button>`. Style the native SVG directly rather than injecting new elements to avoid duplicates.
- **Render ad anchors on first paint, before loading state resolves**: Mediavine Script Wrapper scans the DOM once on initial hydration. If ad anchors (`.mv-ads`, `<aside id="secondary">`, video slots) are hidden behind a loading guard (`if (loading) return <Loader/>`), Mediavine finds nothing and fills zero slots for the entire pageview. Fix: render the full layout shell with skeleton placeholders on first paint, and swap in real data when it arrives. The global `usePageTracking` hook handles `newPageView()` — don't add a second call.
- **Empty aside pattern for Mediavine sidebar**: Don't put `min-h-[250px]` placeholder divs inside `<aside id="secondary">`. The WordPress blog sidebar uses an empty aside and Mediavine auto-fills it with stacked ad containers. Placeholder divs confuse the auto-fill and hurt the sidebar sticky health score. Confirmed Apr 2026 — health score jumped from 12.9 to 50+ after removing placeholders.
- **Sidebar visible at lg (1024px), not xl (1280px)**: Mediavine evaluates sidebar sticky health based on how often the sidebar is visible to visitors. Using `xl:block` (1280px threshold) hid the sidebar from tablet/small-laptop traffic, cutting the addressable audience. Switching to `lg:block` (1024px) significantly improved the health score. Regression tests enforce this.
- **Download interstitial CTA above the fold**: On /go/[modId], the download button and countdown should be inside the mod preview card (above the fold), not at the bottom of the page below ads and related mods. Users shouldn't have to scroll to find what they came for. This also improves ad viewability since the dwell time on the visible portion of the page increases.
- **Related mod links open in new tab on interstitial pages**: On /go/[modId], related mod links should use `target="_blank"` so clicking them doesn't interrupt the active download countdown. The user loses their countdown progress if related links navigate in the same tab.
- **mv-ads needs multiple children for in-content injection**: Mediavine injects display ads BETWEEN children of `.mv-ads` containers. A single-child `.mv-ads` div stays empty. Always ensure at least two child elements (e.g., content block + CTA) to create an injection point.
- **One git worktree per autonomous agent**: When multiple AI agents commit in a single shared worktree, they race on git state — staging, committing, and branching collide. On 2026-09-02 three of five PRs carried other agents' commits and had to be rebuilt. Fix: create a detached checkout per agent (`git worktree add --detach`), link `node_modules` from the runner's install, copy `.env.local` (never symlink — webpack follows symlinks and tries to parse `.env.local` as a module, breaking `next build`). Each agent does all git/build/test/PR work inside its own directory.
- **Capture surfaces as siblings of `.mv-ads`, never inside**: Email signup forms, CTAs, and other capture elements must be placed as siblings of `.mv-ads` containers, not nested inside them. Nesting confuses Mediavine's child-counting for injection slots and can displace ad units. The `/go` interstitial email form (Cass, PR #26) follows this pattern.
- **Collection keyword fallback pattern for sparse facets**: When a new collection page targets a facet value (e.g., `themesAny: ['witch']`) that matches near-zero verified mods, use the established `__keyword__` pattern: an OR query over the real facets plus title/description keyword searches. The page fills immediately and automatically picks up properly-tagged mods as backfill runs. Pattern established with `__pregnancy_keyword__` and extended to `__witch_keyword__` (PR #27, 2026-09-02).
- **Explicit robots.txt allow rules for AI crawlers**: AI answer-engine crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) that default to "ask first" may skip a site without explicit `Allow: /` rules. Add per-user-agent blocks that allow `/` while disallowing `/api/` and `/admin/` to get cited by LLM-powered search without exposing internal endpoints (PR #24, 2026-09-02).
- **Composite `contentTypeIn` for broad collection pages**: When a collection spans multiple related content types (e.g., makeup covers makeup, eyebrows, eyeliner, blush, lipstick, eyes), use the `contentTypeIn` filter array in `lib/collections.ts` rather than creating a new umbrella facet. The collection page renders a unified grid; the individual types still work as standalone filters. Pattern established with makeup-cc (PR #32, 2026-09-04, 922 mods across 6 types).
- **Newsletter capture placement on collection pages**: Place the capture block after the Related Collections section, inside the main `lg:col-span-3` content column. Use a `border-t` separator and contextual copy referencing the collection title. The `source` parameter (`source="collection-page"`) enables per-surface attribution in the scoreboard via GA4 `newsletter_signup` events (PR #33, 2026-09-04).
- **Yellow-day discipline works**: When the revenue guardrail triggers yellow, restricting to Tier 0 (docs, reports, scripts, capture surfaces on existing pages) prevents compounding a demand-side dip with risky surface changes. On 2026-09-04, all 5 agents shipped useful Tier 0 work without touching earning pages — proving the tier system gates risk without blocking progress.
- **Un-runnable smoke check = INCONCLUSIVE, never a rollback**: If `smoke-render.ts` can't execute (e.g., Playwright missing in a fresh worktree), the result is INCONCLUSIVE — logged, ledger row says so, exit 0, no rollback. Only a smoke that actually rendered pages and found failures can trigger a rollback. Two false-alarm rollbacks in 24h (PRs #44 and #45) were caused by treating "could not run" as "site is down." Fix (PR #46): `deploy-verify.sh` now searches for `node_modules/playwright` across the runner worktree, Quinn's primary worktree, and the operator tree before giving up.
- **Pin locale and timezone in SSR number/date formatting**: `toLocaleString()` without a locale arg and `toLocaleDateString()` without `timeZone` produce different output on the Node.js server vs the browser, causing React #425 hydration errors. Fix: always pass `'en-US'` to number formatting and `{ timeZone: 'UTC' }` to date formatting. Where the difference is intentional (locale-sensitive display), add `suppressHydrationWarning` on the container element. This eliminated ~8 hydration errors per /mods/[id] pageview (PR #41, 2026-09-05).
- **Newsletter capture on the highest-traffic uncaptured page type**: Mod detail pages are the densest page type (15.9K pages) with the highest aggregate traffic — and had zero capture surfaces until E10 (PR #38). When deciding where to add the next capture block, audit page types by traffic × page count and pick the biggest one without a capture surface. The `source="mod-detail"` parameter enables per-surface attribution via GA4 `newsletter_signup` events.
- **Standalone liveness checks for external integrations**: The pinner liveness check (PR #42, `scripts/agents/check-pinner.sh`) queries Supabase for staleness/backlog and validates the Pinterest token independently of the full pipeline. First live run caught a stale access token (401) before any post failed. Pattern: for any integration with a third-party token (Pinterest, Patreon, etc.), build a standalone health check that can run in 5 seconds, outside the main automation.

- **Feature-flag every Tier 2 surface with a `NEXT_PUBLIC_*` kill switch**: Patreon membership (PR #52) ships behind `NEXT_PUBLIC_MEMBERSHIP_ENABLED`, so the rollback is "set it to 0 and redeploy" rather than `vercel rollback`. This matters because `vercel rollback` silently pauses auto-promotion (see Gotchas), so a flag flip is strictly cheaper than a rollback. Any Tier 2 package presented to the operator should name its flag in the Rollback line.
- **A third-party perk check must fail closed on the perk, open on sign-in**: `fetchPatreonMembership()` in `lib/membership.ts` catches every network/parse error and returns `null`, and the `jwt` callback in `lib/authOptions.ts` only writes `isPremium` when the result is non-null. A Patreon outage therefore leaves the user's existing entitlement untouched and never blocks login. Use this shape for any external entitlement check bolted onto auth.
- **Keep server-only network code out of modules that client components import**: `lib/membership.ts` is imported by `app/go/[modId]/GoClient.tsx` and `components/Navbar.tsx` (both `'use client'`), so the single `fetch()` lives in one function while the flag/parsing helpers stay pure. `__tests__/unit/membership.test.ts` enforces it with a source-level regex (`expect(readSource('lib/membership.ts')).not.toMatch(/@\/lib\/prisma/)`) rather than relying on reviewer memory.
- **Bound the ad-revenue risk of a dwell-time change with arithmetic before shipping it**: the /go countdown skip for patrons was approved because `/go/` is ~725 pageviews/28d x ~$15.60 RPM = at most ~$11/mo for the *entire* page, and members are a fraction of that. The perk changes `countdown`/`canProceed` only — it never removes or reorders the `.mv-ads` wrapper or the empty `aside#secondary`, which is asserted by source string in the test. Quantify the ceiling; don't claim "no impact".
- **Source-level tests for any static registry with internal cross-references**: `__tests__/unit/canonical-trailing-slash.test.ts` now iterates `SIMS4_COLLECTIONS` directly and asserts (a) every `related` slug resolves to a real collection and (b) every slug is unique. No DB, no fetch, runs in milliseconds. This is the same "test structure, not runtime behavior" pattern as `sidebar-sticky-health.test.ts`, and it is the right default whenever a registry cross-links itself by string key.
- **Ask the token manager for a token; never trust the stored string**: `scripts/agents/pinterest-token-status.py` (PR #50) obtains a token valid *right now* — test `GET /v5/boards`, and on failure POST `/v5/oauth/token` with the refresh token + Basic client auth, then atomically rewrite `config.json` via `os.replace`. `check-pinner.sh` calls it instead of reading the stored value, which turned a hard 401 FAIL into `ok`/`REFRESHED`. Apply to any third-party integration whose access token expires (~30 days for Pinterest v5).
- **Health-check scripts need three exit codes, not two**: `pinterest-token-status.py` uses `0` = OK, `2` = WARN (no config, no network, `--no-refresh` and stale — never a pipeline failure), `1` = FAIL (refresh token itself dead, needs a human). Two-valued health checks force every ambiguous condition into "broken", which is exactly what produces false-alarm rollbacks.
- **Ship an embedded stdlib fallback when importing code from another repo**: `pinterest-token-status.py` prefers importing `PinterestTokenManager` from MHMUtils but falls back to an embedded stdlib-only port with identical atomic-write semantics, because the runner's `python3` has no `requests` installed — the import path alone would have been dead on every run. Also: all output passes through a `redact()` filter, so the script never prints a raw token.

- **Server shell + client child is the fix for a `useSearchParams()` page with no SEO**: `app/page.tsx` (PR #48) is now a server component with `export const dynamic = 'force-dynamic'` that renders `<HomeCollections>` (real `<h1>`, collection links, ItemList JSON-LD) and passes it as a `collectionsSlot` prop into `app/HomePageClient.tsx`, which keeps the `'use client'` search UI verbatim. Two wins in one shape: the registry text in `lib/collections.ts` never enters the client bundle, and the first-byte HTML has content. Copy this split for any client-heavy route that needs to be crawlable — it does not require rewriting the interactive part.
- **Bake the safety invariant into the library, not the caller**: `lib/services/bulkMailer.ts` `sendBulk()` throws if the HTML body does not literally contain its own unsubscribe URL, and throws if `dryRun === false` while `transport === 'none'`. `DEFAULT_HOURLY_LIMIT = 100` is a code-only ceiling — `resolveHourlyLimit()` clamps any caller or `SMTP_HOURLY_LIMIT` value down to it, so a config typo cannot blast past the rate BigScoots has confirmed. "Forgot the unsubscribe link" and "sent for real with no SMTP configured" are now call-time exceptions instead of silent bad sends.
- **A keyed HMAC beats a token column when you want zero migrations**: `lib/services/unsubscribe.ts` derives each recipient's unsubscribe token as `HMAC-SHA256(secret, normalizedEmail)`, compares with `timingSafeEqual`, and returns `false` on malformed input rather than throwing. No schema change, no migration, and `app/api/unsubscribe/route.ts` validates the token *before* touching Prisma. `signingKey()` falls back to `NEXTAUTH_SECRET` so the feature shipped with no new required env var — the tradeoff is real, see the rotation gotcha below.
- **One-click unsubscribe: GET must never mutate**: `app/api/unsubscribe/route.ts` answers GET with a confirm page (read-only `findUnique`) and only deletes on POST, via `deleteMany` so a retried Gmail one-click POST is idempotent rather than a 500. Corporate link-scanners and mail prefetchers follow GET links; a mutating GET unsubscribes users who never clicked. Also note `List-Unsubscribe-Post: One-Click` is opt-in (`oneClickUnsubscribe` defaults to `false`) — do not emit an RFC 8058 promise the route cannot honor.
- **A health check must mirror the consumer's selection query, not a status flag**: `check-pinner.sh` and `funnel-scoreboard.ts` counted every `Is Posted = false` row as "backlog" and reported `[OK] Backlog: 1879 unposted pins`, while the actual poster only selects rows dated within `BACKLOG_LOOKBACK_DAYS` (14) — so the true schedulable count was **0** and the `unpostedBacklog === 0` alert could never fire (E20, PR #60). Same fix shape applied to catalog-pin coverage: match by URL pattern (`*/games/sims-4/*`) instead of a hardcoded ID range that had to be widened by hand after every insert. If a monitor's alert threshold is unreachable given the real failure mode, it is decoration, not a monitor.
- **Print the decision rule before you take the reading, not after**: the Patreon tier relaunch (PR #65) was walked back from the approved full rename to step 1 only, because reading the Members API directly showed 47 active vs 225 former patrons and a 1.8-month median tenure — retention, not the tier ladder, is the problem. `scripts/agents/patreon-relaunch-read.ts` now prints the numeric gate for the 2026-09-22 call (proceed only if joins hold the 17/mo pace **and** ≥1/3 of paid patrons have connected Patreon on-site; revert the copy if cancels exceed 16/mo). Committing the threshold in advance is what stops the decision from being relitigated in prose.
- **Lazy refresh + atomic local persist for any expiring OAuth token**: `scripts/_patreon-auth.ts` `patreonGet()` tries the current access token and only refreshes on a 401, then retries once — so a cron-invoked script self-heals past the ~30-day expiry with no separate pre-refresh job. `persistToEnvFile()` rewrites `.env.local` line-by-line (append if absent) and re-applies `chmod 600`; failed-refresh bodies are truncated to 200 chars before logging. `need()` treats a still-placeholder `your-...` value as unset, which catches "copied `env.example` verbatim". Because a refresh invalidates the previous refresh token, this token pair must exist in exactly one place — never also in Vercel env vars, or the two copies race.

- **Put the compliance invariant in the library, and make even the dry run refuse a placeholder**: PR #70 moved the CAN-SPAM physical-address requirement out of the caller and into `sendBulk()` in `lib/services/bulkMailer.ts`. `resolvePostalAddress()` reads `EMAIL_POSTAL_ADDRESS`, `containsPostalAddress()` matches it both raw and HTML-escaped, and `POSTAL_PLACEHOLDER_RE` throws on a rendered body still containing a `[... postal address ...]` stub **even when `dryRun` is true** — because the dry-run preview is the artifact a human signs off on. `BulkSendResult.postalAddress` surfaces the resolved value on every result so a gap is visible in previews that don't throw. Same shape as the existing unsubscribe-URL guard: a caller cannot forget what the library refuses to render.
- **`llms.txt` + `/llms-full.txt` is a summary-then-detail pair, and only the long one may be dynamic**: `app/llms.txt/route.ts` stays `force-static` (it reads the static registry only) and now links to `/llms-full.txt` plus a "For AI Assistants" canonical-URL block; `app/llms-full.txt/route.ts` is `export const dynamic = 'force-dynamic'` because it queries the DB — 18 collections x `TOP_PER_COLLECTION = 10` mods by `downloadCount desc`, a `TOP_SITEWIDE = 40` list, and the latest 20 blog posts — with freshness coming from `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` instead of from static generation. Every URL it emits is hand-built with a trailing slash and blog links are apex-rewritten with `REDIRECTED_POST_PATHS` filtered out, because a list handed to an answer engine must never cite a URL that 301s.
- **A crawler surface should degrade to partial content, never to a 500**: in `app/llms-full.txt/route.ts` each `fetchCollectionTop()` call inside `Promise.all` carries its own `.catch()` that sets `dbOk = false` and returns `[]`, and `fetchSitewideTop()` / `fetchRecentGuides()` do the same; an empty list renders `(Top mods temporarily unavailable — the collection page lists them.)`. `__tests__/unit/llms-txt.test.ts` proves it by rejecting the Prisma mock *and* throwing from `fetch`, then asserting `res.status === 200` with every collection URL still present. Same philosophy as INCONCLUSIVE-vs-FAIL in `smoke-render.ts` — partial truth beats an error page.
- **Any state a scheduled job needs must live in the DB or in git, never in an untracked file in one checkout**: `scrape:mhm` kept its freshness in an untracked `data/mhm-scraped-urls.csv` in the operator's tree, so no worktree and no cron could run it without re-crawling all 667 posts. PR #73 added `--new-only`, which derives freshness from the database (`prisma.mod.groupBy({ by: ['sourceUrl'] })` filtered to `startsWith(baseUrl)`), plus `--since` (sitemap `<lastmod>`) and `--dry-run`. The selection logic lives in a new pure module, `lib/services/mhmScraperUtils.ts` — `selectPostsToScrape()` does no network and no DB, so it is unit-testable without mocking Prisma, and `normalizePostUrl()` folds `http`/`www`/case/query/hash/trailing-slash variants so DB URLs and sitemap URLs actually compare equal. Entries with no `<lastmod>` are never filtered out by date (fail-open).
- **Give every agent worktree its own `npm ci`; the shared symlink was a two-time SPOF**: `scripts/agents/run-funnel-daily.sh` no longer links agent worktrees at the GM's `node_modules`. Each now runs `npm ci --prefer-offline --no-audit --no-fund` + `npx prisma generate` (~30–60 s from the npm cache, 643 entries each), logged to `$AWT/logs/npm-ci.log` under gitignored `logs/` so the install log can never ride into a PR, and a failed install is logged rather than fatal. The symlink emptied mid-run on 09-07 (4 agents reinstalled by hand) and again on 09-08 when the GM's own `npm install` for a lockfile change killed another agent's build. Mid-run reinstalls: 4 → 2 → **0**.
- **Serializing merges finally produced 1:1 ledger attribution**: 09-09's four agent merges landed at 06:51 / 06:55 / 06:59 / 07:01 — ≥4 minutes apart — and yielded 4 distinct Vercel deployments and 4 ledger rows mapping one-to-one, versus 4 merges inside 49 seconds on 09-05 that Vercel coalesced into shared deployment URLs. The previously-documented ≥60 s gap rule is now confirmed in practice; ~4 minutes is the comfortable spacing.
- **Allocate shared registry IDs in the dispatch prompt, not by read-then-claim**: experiment IDs E26–E30 were assigned centrally by the GM on 09-09 and produced 0 collisions, versus two agents both claiming E15 on 09-07 when each read the registry and picked the next free number. Same for work selection — handing each agent one ready-made #1 priority meant all five picked it with no follow-up message. Whenever parallel agents write into a shared numbered registry, the orchestrator owns the numbering.

- **Run a scheduled job's entrypoint from `origin/main`, never from the checkout that happens to contain it**: the `mhm-funnel-daily` launcher invoked `./scripts/agents/run-funnel-daily.sh` out of the operator tree, which sits on `feature/premium-intent-test` where every `scripts/agents/funnel-*.{md,sh,ts}` is an **untracked stale copy** — 239 lines vs 294 on main. PR #74's four runner fixes merged 09-09 and **0 of 4 executed** on 09-10. The durable shape is now a tracked launcher (`scripts/agents/scheduled-task-mhm-funnel-daily.md`) whose step 1 is `git show origin/main:scripts/agents/run-funnel-daily.sh > /tmp/mhm-run-funnel-daily.sh && bash /tmp/...` — safe because the runner hardcodes `PROJECT_DIR` and takes everything else from the clean worktree it creates. `run-funnel-daily.sh` was changed the same way for its own inputs: `PROMPT_FILE="${MHM_PROMPT_FILE:-}"` now resolves to `$WT/scripts/agents/funnel-daily-prompt.md` (the origin/main worktree) and only falls back to the operator-tree copy with a logged `WARN`.
- **Stack independent safety rails on a write script rather than trusting any one of them**: `scripts/agents/revive-stranded-pins.py` (PR #69) has six — dry-run default (`--apply` required to write), `HARD_CAP = 200` rows that wins over any flag combination (`min(per_day * days, HARD_CAP)`), `Is Posted=eq.false` embedded in the **PATCH filter itself** (`id=eq.{id}&"Is Posted"=eq.false`) so a row the live poster grabs mid-run can never be rewritten, duplicate-image rejection both within the batch and against `posted_image_urls()`, a HEAD liveness check on destination and image URLs with a GET+Range fallback for hosts that 403/405/501 on HEAD, and a JSON ledger per `--apply` run (`reports/funnel/pin-revival-YYYY-MM-DD.json`) that makes rollback one command (`--rollback <ledger> --apply`, which re-checks `Is Posted=false` before restoring).
- **A fan-out allocator needs a concentration cap — input diversity is never a given**: the stranded pin slice held only ~15 distinct destination URLs across 200 candidate rows, so a naive "sort newest-first, take 140" would have fired 10 pins at one article in a morning, which is exactly the pattern Pinterest scores as spam. `allocate()` round-robins across destination URLs (largest group first) under `MAX_PER_URL_PER_DAY = 2` and `MAX_PER_BOARD_PER_DAY = 3`; the live run landed 1 pin per destination per day across 14 destinations and 10 boards. `--self-test` proves the invariants offline with 6 assertions (per-URL cap holds with one giant group, per-board cap holds when URLs differ, dates contiguous from `start` and never in the past, no row double-scheduled, empty input is not an error) — no network, no credentials.
- **Split a probe into a pure `-lib.ts` and a side-effecting entrypoint, and give redaction exactly one chokepoint**: `scripts/agents/operator-did-probe-lib.ts` (363 lines) is pure — `parseVercelEnvNames`, `diffEnvNames`, `tiersFromCampaign`, `diffSnapshots`, `exitCodeFor`, `summaryLine`, `redact` — and `operator-did-probe.ts` (268 lines) holds every `spawnSync`, `patreonGet()` and file write. `__tests__/unit/operator-did-probe.test.ts` (23 tests) imports only the lib, so the whole diff/redaction/exit-code contract is testable with zero Vercel login and zero Patreon token. Every output path goes through `redact()` — `say = (s) => console.log(redact(s))`, `writeFileSync(jsonPath, redact(JSON.stringify(...)))`, and `renderMd()`'s markdown — so the probe reports env-var **names**, tier **titles** and counts, never a value.
- **Solve the "agent worktree isn't Vercel-linked" problem with `--cwd`, not by copying state around**: `probeVercel()` runs `vercel env ls production --cwd $MHM_OPERATOR_TREE` (default `/Users/eputnam/java_projects/MHMFinds`), and `run-funnel-daily.sh` step 0d passes `MHM_OPERATOR_TREE="$PROJECT_DIR"` explicitly rather than relying on the default. It keeps the house 0/2/1 exit discipline — `exitCodeFor()` returns `1` on any `'fail'` section, else `2` on any `'could-not-run'` (not logged in, no token, `--no-vercel`/`--no-patreon`/`--no-blog`), else `0` — and `main().catch()` still appends a `FAIL probe crashed:` summary line, so a crash produces a row instead of silence. Since-yesterday state is dated JSON under git-tracked `reports/funnel/operator-did-<date>.json`, found by `loadBaseline()` globbing for the latest earlier date.
- **Share the hand-audit override list between every script that re-detects, or the second script re-creates the first one's junk**: PR #79 moved the 7 hand-audited ids from `scripts/retag-junk-build-facets.ts` into `scripts/lib/hand-audited-content-types.ts` so the new `scripts/retag-null-content-types.ts` honours them too. Without it the new script's first dry run proposed re-tagging `cmsmczfbc0115oxeu8gxj9o8h` ("Green Lantern - Injustice") as `lighting` — the exact row PR #61 had hand-cleared two days earlier — because the audit lived as a private const inside one script. This **partially, not fully**, closes the documented rule-priority gotcha: the per-id patches are now shared, but the detector's priority ordering is untouched, so Crown Victoria/`hats` and Lollipop Mirror Boots/`furniture` still need new hand-audit entries as they appear. `scripts/retag-null-content-types.ts` keeps the established safety shape and adds one: dry-run default, `MAX_ROWS = 5000`, title-only detection (it deliberately avoids `fix-null-content-types.ts`'s description+tags path, which falls through to `inferFromContextClues()` — the same inference class that put a Ford Crown Victoria in `lighting`), and **`contentType: null` re-asserted inside the write** (`updateMany({ where: { id: { in: ids }, contentType: null } })`) so a row tagged concurrently cannot be clobbered.
- **Never let an email carrying a live secret ride the shared notifier's logging path**: `sendPasswordEmail()` passes `notifier.send(email, subject, html, { skipLog: true })` (`lib/services/authEmail.ts:203`) because `EmailNotifier.send()` otherwise persists the full HTML body — reset token and all — into `notification_logs.body`. Storing only `sha256(rawToken)` in `VerificationToken.token` (`authEmail.ts:28`) buys nothing if a second table keeps the raw value in cleartext for the token's whole 1-hour life. Any future emailed secret (magic link, invite code) must thread `skipLog: true` explicitly — the failure mode is a readable DB row, with no error anywhere.
- **Put the "is this integration even configured" check inside the library, before the secret is minted**: `authEmail.ts:162` returns `false` on `!notifier.isConfigured()` *before* building the message, so with no SMTP/SendGrid the reset token never comes into existence in printable form. Pre-fix, the notifier's dev-preview path would `console.log` a body preview containing the live reset URL; it was safe only because the token happened to sit past the truncation point — luck, not design. `__tests__/unit/password-reset.test.ts:195` asserts nothing containing the raw token or the address ever reaches `console.warn`/`console.log`.
- **A DB-backed sitemap aggregate must fail toward silence, never toward a 500**: `newestModCreatedAt()` (`lib/sitemapLastmod.ts:49-69`) wraps its `prisma.mod.aggregate` in `try { } catch { return null; }`, and `collectionLastmod()` feeds that through `laterOf(COLLECTION_TEMPLATE_LASTMOD, null)` — so "DB unreachable" and "collection is empty" degrade to the identical template date. The test `'degrades to the template date with a 200 when the DB rejects'` (`__tests__/unit/sitemap-nextjs-lastmod.test.ts:117`) asserts a 200 with every collection URL still present. Same philosophy as `/llms-full.txt` and INCONCLUSIVE-vs-FAIL in `smoke-render.ts`: a crawler that gets an error may not come back for a while.
- **Use `createdAt`, not `updatedAt`, for any freshness signal handed to a crawler**: a daily maintenance job touches ~500 `Mod` rows, so `max(updatedAt)` reads as "today" for 17 of 18 collections (probed 2026-09-12) — every collection would look freshly changed to Google regardless of actual change. `createdAt` varies honestly (2026-01-25 oldest, 2026-09-10 for hair-cc). The rationale is a comment at `lib/sitemapLastmod.ts:41-44`; note that only a `_max: { createdAt: true }` substring check guards it, so a future convenience swap to `updatedAt` would regress this silently.
- **A three-way verdict beats a boolean when a probe can be wrong about the world**: `repair-pin-sections.py`'s `decide()` returns `ok` / `none` / `renamed` / `null` / `unknown`, and `fetch_board_sections()` returns `unknown`, **never `dead`**, on a 404/429/5xx (`scripts/agents/repair-pin-sections.py:296` — "404 board gone, 429, 5xx: unknown, never 'dead'"). A transient Pinterest hiccup therefore can never be misclassified into a write that wipes a live section id. `--self-test` proves it offline with 10 assertions including `'unfetchable board is unknown, never dead'` (line 444). This is the same "enumerate the ways your check can be wrong before wiring it to a destructive action" rule that produced the smoke-check INCONCLUSIVE class.
- **When a script cannot validate a precondition, fail the whole run, not the row**: `revive-stranded-pins.py` now dynamically imports `repair-pin-sections.py` and reuses its `decide()`/`sections_for_rows()`/`obtain_token()` rather than duplicating them — and `sys.exit(2)` s if the section check cannot run at all, on the stated reasoning that re-dating rows the poster may choke on is worse than doing nothing. `--no-verify` is the explicit opt-out, mirroring the existing URL-check skip. Reuse-by-import also means the two scripts can never drift on what "dead" means.
- **Replicate the GET-must-not-mutate shape for every consent endpoint, and make the test assert it**: `app/api/subscribe/confirm/route.ts` answers `GET` with a read-only `findUnique` plus a `<form method="POST">` (lines 109-124) and only `upsert`s in `POST` (126-160) — a second, independent implementation of the rule established for `/api/unsubscribe/`, not a copy. `__tests__/unit/subscribe-confirm.test.ts:122` asserts `expect(upsert).not.toHaveBeenCalled()` after a GET. Link scanners and mail prefetchers follow GET links; without this, they consent on the reader's behalf.
- **Idempotency for an emailed one-click action needs `update: {}` *and* a P2002 fail-open**: the confirm route's `upsert` has an empty `update` so a second click never overwrites `source` (which may have come from another capture surface), and a concurrent double-POST that races the unique index is caught on `error.code === 'P2002'` and treated as success (`route.ts:140-150`). A non-P2002 DB error still 500s and the page deliberately does **not** say "You're subscribed" — fail-open on collisions, fail-closed on the confirmation message.

- **Seed daily-rotating content from the date string and nothing else — no `Math.random()` anywhere in the path**: `/play` (E38, PR #84) derives `daySeed = hashString(\`main-character:${date}\`)` (`app/api/game/daily/route.ts:54`) and `slotSeed = daySeed + slotIndex * 7919` (`:64`), then spends three derived seeds (`slotSeed`, `+1`, `+2`) on themed picks, fill picks and the interleave. `lib/game/mainCharacter.ts` supplies `hashString` (FNV-1a, `:220`), `seededRandom` (mulberry32, `:230`) and `seededShuffle` (Fisher–Yates, `:242`). Two payoffs that a random rack would forfeit: the response is safely CDN-cacheable, and every player's share text ("Episode N, 74/100") is comparable because everyone saw the same rack. `__tests__/unit/play-page.test.ts:169-188` asserts `Math.random` appears nowhere.
- **Pin the "today" boundary to one timezone, compute it server-side, and pass the string down**: `gameDateString()` (`lib/game/mainCharacter.ts:196-203`) uses `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })` — `en-CA` specifically because it emits `YYYY-MM-DD` with no reformatting — and `daysBetweenUTC()` (`:205-217`) parses that string by `slice` into `Date.UTC` rather than `new Date(str)`. The client never derives "today": it reads `data.date` off the API response (`PlayClient.tsx:139`). This is the general form of the repo's React #425 rule — `'en-US'` on `toLocaleString` and `timeZone: 'UTC'` on dates fix *formatting* drift, but only a server-computed date string handed to the client fixes *which day it is* drift.
- **Ad anchors must survive the error state, not just the loading state**: `/play` renders the `.mv-ads` block (`PlayClient.tsx:426-471`, exactly two `<section>` children so Mediavine has an injection point) and the empty `<aside id="secondary">` (`:480-487`, `hidden lg:block overflow-visible`) even when the API 500s and the page shows only an error panel (`:182-186`). The established rule was "render anchors on first paint, never behind `if (loading) return`"; the stronger form is that a feature outage should cost the feature, not the pageview's ad revenue. Guarded at `play-page.test.ts:103-164`.
- **A source-level guard test must strip comments before it asserts**: `play-page.test.ts:55` strips `//` comments before URL matching and `:77` strips `{/* … */}` JSX comments before locating ad anchors — because the source comments in this repo *deliberately* contain the bad patterns they warn about (`<aside id="secondary">`, "sticky", "placeholder divs", the slashless canonical form). Without the strip, the test passes or fails on its own documentation. Every new guard test in this repo needs the same preprocessing.
- **Ask the third party for its own timestamp before a monitor may go red**: E41 (PR #92). The scoreboard's 🔴 read `max("Post Date")` over posted `n8n_pinterest_posts` rows — but `Post Date` is the date the *writer scheduled* the row for, the table has no posted-at column, and the poster drains oldest-first inside a 14-day window, so the proxy lags real posting by days. On 09-13 it reported "last posted 2026-09-11 (2d ago)" while Pinterest's own `GET /v5/pins` newest `created_at` was 6 minutes old and 47 pins had posted in 24h. The fix's load-bearing invariant is not the new threshold but the new *level*: `LivenessLevel = 'ok' | 'red' | 'unverified'` (`scripts/agents/pinner-liveness-lib.ts:37`) — when the Pinterest API is unreachable, `assessLiveness()` returns `unverified` (`:95-133`), and **the proxy can never produce `red` on its own**. `DEFAULT_RED_AFTER_HOURS = 36` (`:80`); `livenessExitCode()` (`:136-140`) keeps the house 0/2/1 discipline.
- **Normalize a third party's zone-less timestamps at one helper, and drop future-dated rows**: Pinterest returns `2026-09-13T10:40:04` with no zone; bare `Date.parse` reads it as *local*, which on a CDT runner shifts every pin 5 hours into the future and can manufacture freshness out of nothing. `parsePinterestTimestamp()` (`pinner-liveness-lib.ts:54-61`) appends `Z` unless a zone is present, and `summarizePins()` skips any row with `age < 0` (`:73`) so clock skew can't fake a live pipeline.
- **Audit a facet before you rank clusters by size** — the 09-08 "spot-check the top rows, not `expectedCount`" rule now applies to *choosing* the page, not only to writing the filter. `accessories` (863) + `jewelry` (550) + `hats` (201) + `glasses` (110) + `watches` (24) = 1,748 rows was the obvious pick by count, but the top `hats` rows are a Coach bag, two hairstyles and a kitchen set, and the top `accessories` rows are "100 Base Game Traits" and "SimDa Dating App". `shoes` (633) spot-checked 15/15 real footwear on the top-downloads page *and* 15/15 mid-grid, so it is what shipped (`shoes-cc`, E43, PR #95, `lib/collections.ts:253-289`). Next clean clusters with no page: `nails` (149) and `residential`+`lot`+`builds`+`commercial` (943).
- **When `filterSpecificity()` ties, registry array order is the entire tie-break — place the entry deliberately**: `filterSpecificity()` (`lib/collections.ts:717-723`) returns `0` for both `contentType` and `contentTypeIn`, so `shoes-cc`, `male-clothes` and `female-clothes` (both of whose `contentTypeIn` lists already include `shoes`) all score 0 and `getCollectionsForMod()` (`:733-745`) breaks the tie by index. Inserting shoes-cc at `:253`, *above* the two clothes entries, is what moved 633 mod detail pages from a "Female Clothes CC" breadcrumb to "Shoes CC". Pinned by `canonical-trailing-slash.test.ts:302-331`. Note the mirror-drift hazard did **not** apply here: `contentType` is already handled generically by both `buildWhereClause()` (`:581-583`) and `modMatchesFilter()` (`:691-693`), so the hand-maintained in-memory mirror only needs editing when a *new* `CollectionFacetQuery` key is introduced.
- **Silence from a scheduled job must become a row, not a sentence in a digest**: `run-funnel-daily.sh` step 0e (`:174-191`, PR #97) appends an explicit `MISSED` ledger row when yesterday has no evening `check` row (16:00–23:59) and no `evening-*` worktree. Eight consecutive digests had *annotated* the dead `mhm-guardrail-evening` task in prose without turning it into a ledger row — which is exactly how a dead monitor stays dead. Note the three-way ladder distinguishes "never fired" from "fired and died before writing" (the worktree-exists branch).

- **A pure builder module plus a per-route try/catch is now the house shape for every crawler surface**: `lib/feeds.ts` contains no Prisma and no `fetch` (stated at `:4-6`), and each of the three routes (`app/feeds/mods.json/route.ts:24-36`, `app/feeds/mods.xml/route.ts:23-35`, `app/feeds/[game]/[slug]/route.ts:35-45`) wraps its own `prisma.mod.findMany` and falls through to `[]`, returning a structurally valid **empty** feed with a 200 rather than a 500. The comment at `lib/feeds.ts:19` gives the reason outright — "a poller that gets an error may back off for days" — and `FEED_ITEM_LIMIT = 50` / `FEED_CACHE_CONTROL` (`:19`, `:197`) are shared constants the routes import rather than restate. Third surface on the same pattern after `/llms-full.txt` and `/sitemap-nextjs.xml`.
- **`/feeds/` is plural because `/feed/` belongs to WordPress, and the dotted-segment trailing-slash exemption is now encoded rather than remembered**: `/feed/` is the live WP RSS route the middleware proxies, so the Next.js routes had to take `/feeds/` — and `'feeds'` went into `NEXTJS_PREFIXES` in the same PR, without which all three would have proxied to WordPress and 404'd exactly like `/play` did. `isCanonicalUrl()` (`scripts/agents/indexnow-lib.ts:81-97`) re-derives the rule instead of special-casing: a URL is canonical if it ends in `/` **or** its last path segment contains a `.`, which is precisely how `trailingSlash: true` treats dotted routes. `/feeds/mods.json` and `/feeds/mods.xml` are dotted (no slash); `/feeds/{game}/{slug}/` is directory-style (slash).
- **The `NEXTJS_PREFIXES` class test shipped, and it scans the filesystem rather than listing routes**: `routableTopLevelSegments()` (`__tests__/unit/middleware-route-prefixes.test.ts:69-77`) `readdirSync`s `app/`, keeps a directory only if its name has no dot, does not start with `(` or `_`, and `containsRouteFile()` finds a `page.*`/`route.*` beneath it — then asserts every survivor appears in the array parsed out of `middleware.ts` source (`:28-42`, `:104-110`). The dot filter is load-bearing in a non-obvious way: `llms.txt`, `llms-full.txt`, `robots.txt` and the five `sitemap-*.xml` entries are real *directories*, so a naive "exclude files" rule would have dropped the wrong things. All 16 routable segments present at HEAD — this closes the 09-13 note that PR #84 fixed the instance and left the class.
- **A public ownership-proof file needs a behavioral test that it is not proxied away, not a comment**: `public/ee78fbc844f5b753a61535eed78c41d0.txt` is 32 bytes with no trailing newline, byte-identical to `INDEXNOW_KEY` (`scripts/agents/indexnow-lib.ts:23`). `__tests__/unit/indexnow.test.ts:63-70` asserts neither script reads `process.env.*INDEXNOW` — the key is public by design, so an env var would be false security — and `:75-95` proves with a mocked `fetch` that the dotted first segment bypasses the WordPress catch-all while the same key without a dot would be proxied. Live mode additionally refuses to POST unless `GET /<key>.txt` returns 200 with the exact key body (`indexnow-submit.ts:130-139`, `reason=key-file-not-live`, exit 2), so the submitter self-detects its own ownership proof going missing.
- **Exclude a host by parsing the URL, never by substring**: `destination_host()` / `on_skipped_host()` (`scripts/agents/revive-stranded-pins.py:99-113`) use `urlparse(...).hostname` against `DEFAULT_SKIP_HOSTS = ('blog.musthavemods.com',)` with `--include-all-hosts` as the opt-out, and the self-test grew 6 → 7 assertions specifically to prove `?ref=blog.musthavemods.com` on an apex URL does **not** match (`:377-386`). Result: **0 of 196** E46 rows point at the blog proxy, versus 28 of 140 (20%) in E26. This is a downstream filter, not a root-cause fix — `MHMUtils/posts_2_supabase_server.py` still emits blog-host rows, and 203 of the 1,468 still-stranded rows (12%) stay unreachable until that separate repo is patched.
- **Validate the whole horizon a writer schedules into, on the day it writes — not just today's window**: `repair-pin-sections.py --days-ahead N` (`:483-489`, `:497-499`, `:557`) widens the check ceiling to `today + N days`. Run at `--days-ahead 14` after the E46 revival it found **5** E26 rows (7983, 8024, 7994, 8003, 7968) on the dead "Black Sims 4 CC" section dated 09-14..09-22 — the default same-day `--check` had already passed 4 of them and would have surfaced each only as its date arrived, one wedged queue at a time. E36's repair on 09-12 validated 51 rows and structurally could not see them.
- **Redact at the point of capture, so every consumer inherits it**: `section()` in `funnel-scoreboard.ts:97-107` now runs each caught error through `redactError()` (`operator-did-probe-lib.ts:92-100`) *before* storing it in `SectionResult.error`, so all ~10 `errOf()` call sites are covered with no per-site edit. `redactError()` adds a `URL_RE` pass (`scheme://…` up to whitespace) on top of the general `redact()` precisely because a `postgres://user:pass@host` credential or a short lowercase `api_key=` value falls under `TOKEN_RE`'s 32-char floor and is not a `KEY=value` pair — there is a test asserting `redact(msg)` still leaks the value while `redactError(msg)` does not. Closes the 09-13 finding that raw Prisma exception text, which embeds `DIRECT_DATABASE_URL`, was being interpolated into committed reports.

- **For a queue that is fed on purpose, the flag belongs on runway (inventory ÷ observed rate), not on a point-in-time count**: the E20 "< 20 schedulable" 🟡 fired on every healthy morning (09-10: 10, 09-14: 7, 09-15: 6) while Pinterest's own `created_at` showed 39 pins in 24h — because E26 (10/day) + E46 (14/day) drip-date exactly 24 rows to today, the poster drains them in ~8h, and a morning read sees the *residue* of today's allotment, never a buffer. `assessRunway()` (`scripts/agents/pinner-liveness-lib.ts:190`) divides unposted rows dated `[today-14d, today+DEFAULT_RUNWAY_HORIZON_DAYS]` by pins/day from Pinterest (7d mean, 24h fallback) and returns `ok`/`low`/`empty`/`unknown`; `runwayExitCode()` (`:242`) makes `low`/`empty` a WARN and **never** a FAIL, and `unknown` raises nothing because liveness already owns the API-outage and stall cases. Reads "≈12 days (278 rows ÷ 23.1/day)" on 09-15 and will honestly go low around 09-25. Whenever a number is metered by design, ask what the *buffer* is before writing a threshold on the meter.
- **A class guard needs a vacuity test and a negative control, or it can pass by doing nothing**: `canonical-trailing-slash.test.ts:357` walks every `.tsx` under `app/` and `components/`, strips comments first (house rule), matches `href="…"` / `href={\`…\`}` / `href={'…'}`, and requires the path before `?`/`#` to end in `/` — with exactly two exemptions (a bare `/` root-with-query, and a dotted last segment, mirroring `isCanonicalUrl()` in `indexnow-lib.ts`). Critically it ships a second test (`:408`, "the scanner works") asserting the walk finds **>50** hrefs, so a later regex or walk change cannot silently make the suite vacuous, and the PR verified a negative control by reverting one Navbar href and checking the failure names the exact `file:line`. 61 live 308s → 0; the repo-wide grep now returns only the 2 exempt root-with-query cases.
- **Write the deliverable's skeleton before starting the work that can exhaust the budget**: 09-14 shipped six merges and produced no digest because the run hit `--max-turns` waiting on a verify. Step 2b of `funnel-daily-prompt.md` now writes the five-section digest *before the first merge*, with section 3 as a literal `<!-- LEDGER -->` placeholder the runner fills from the day's changelog rows, and forbids starting a merge with ~40 turns left or waiting on a deploy-verify with an unwritten digest. `funnel-digest-fallback.py` then accepts Quinn's file only if sections 1–3 exist with ≥12 lines, otherwise synthesizes a `SYNTHESIZED` digest from scoreboard + guardrail + ledger + incidents + queue, quoting the agent's last line. The old copy-stdout path survives only as the no-script fallback.
- **When a smoke target's *content* is the point, add a check kind — not another row**: the IndexNow ownership proof is 32 bytes, well under `expectations()`'s 50-char "empty response" floor in `scripts/agents/smoke-render.ts:80`, so adding it as a plain `kind: 'text'` row would have failed **every** deploy-verify run — and a smoke failure triggers an automatic `vercel rollback`. The optional `Target.expectText` (`:34`) checks the body *contains* the expected string, is built from the imported `INDEXNOW_KEY` constant rather than a copy of its value (`:105`), captures at most 200 chars of body text, and reports only the served length on failure, never the body. Before adding any target to an automated check wired to a destructive action, ask what the existing pass rule does to it.
- **Choose a smoke target by code path, not by URL count**: `/feeds/sims-4/hair-cc/` was added to stand in for all ~20 per-collection feeds because they share `buildWhereClause()` — the two sitewide feeds already on the list would stay green through a regression that broke every collection feed. One target per distinct code path beats N targets per surface.
- **Any script that sends something irreversible must write its own counts-only ledger, tracked in git**: `notification_logs` has **0 rows all-time** (by design — `bulkMailer` passes `skipLog` so a live reset token never lands in a DB column), and `newsletter-send-test.ts` wrote nothing, so the only evidence that newsletter issue #1 went out on 09-14 was a bounce DSN sitting in the sending mailbox. Every run — dry or live, any source — now appends one JSON line to `reports/funnel/newsletter-sends.jsonl` (tracked) and gitignored `logs/newsletter-send.log` (`newsletter-send-test.ts:42`, `:123`), carrying counts, transport, mode and source and **never** an address. The reconstructed 09-14 row is explicitly marked `"reconstructed": true` with its evidence string, so a later reader cannot mistake an archaeological finding for a live measurement.
- **Rank collection candidates by audited quality × demand, and be willing to contradict your own prior note**: the loading-screens page (`lib/collections.ts:510`, `contentTypeIn: ['loading-screen','cas-background']`, 269 rows) shipped over two larger clusters after a spot audit — the builds cluster (957 rows) failed at ~53% (`lot`'s top 15 held five CAS clothing packs; `residential`'s held a UI mod, a career mod and an Amazon listing), which directly contradicted the 09-13 playbook note calling builds "clean"; `nails` passed at 27/30 but carried 174 GSC impressions / 1 click. Loading screens scored 29/30 on both facets *and* 1,609 impressions / 26 clicks. Also check that **placement is free** before appending: neither content type appears in another entry's `contentType`/`contentTypeIn`, so `filterSpecificity()` has nothing to tie-break and the registry-order hazard does not apply.

- **A kill switch for a client-rendered surface: pure module, literal `NEXT_PUBLIC_*` read, defaults in code, flag before the hooks and the early return after them**: `lib/affiliatePlacements.ts` (E55, PR #107) turns a revenue experiment off without deleting the component, the API route or the click tracking. Four things make it safe. (1) `isAffiliatePlacementEnabled()`'s no-arg path reads the literal `process.env.NEXT_PUBLIC_AFFILIATE_PLACEMENTS` — the injectable second argument exists only for tests — because the membership flag shipped dark for 22h in E24 when it was read through a computed key. (2) `DEFAULT_PLACEMENTS` lives in code, so rollback is a one-line flip *or* an env override, not a `vercel rollback`. (3) In `AffiliateRecommendations` the flag is evaluated **above** the `useState`/`useEffect` calls while the `return null` sits **below** them, so a disabled placement never fetches and hook order stays stable. (4) `useAffiliateOffers` seeds `useState(enabled)` for `loading`, so a disabled placement never renders a spinner it will never resolve. The mount sites (`ModDetailClient.tsx:458`, `GoClient.tsx:418`) gate the JSX too, so no empty wrapper div is left beside `.mv-ads`.
- **Kill the placements you measured; keep the one whose removal changes ad *geometry* until you have a before-snapshot**: the same PR switched `mod_page` and `interstitial` off (both are **siblings** of `.mv-ads`, so gating them changes nothing Mediavine counts) and deliberately left `grid` on, because those cards are **children** of the ModGrid `.mv-ads` container on the largest earning page — removing them shortens the grid and moves the in-content injection gaps. Sibling vs child of `.mv-ads` is the line between "free to turn off" and "needs a page-RPM snapshot first".
- **A central registry needs a completeness scanner, or files silently opt out of every rule at once**: `sidebar-sticky-health.test.ts` collapsed three hand-copied page arrays into one `PAGES_WITH_SIDEBAR` that sections 1/3/5 all iterate, then added a scan that walks `app/` + `components/` for any `.tsx` declaring `id="secondary"` and fails if it is not registered — with a vacuity guard (`found.length >= registry.length`) so the walk cannot pass by finding nothing. It paid for itself on the first run: `CollectionPageClient.tsx` — the component behind **all 20 collection pages** — had never been registered either, so no min-h / sticky / breakpoint rule had ever looked at it. Pages under the central rules 4 → 6, suite 894 → 957.
- **Fold a new smoke target into the existing strict kind, not a weaker variant of it**: `/play/` entered `smoke-render.ts` as a new `game` kind that is added to the `adPage` set (`:74`), so it gets the full loader + `aside#secondary` + `.mv-ads` + text-length assertions; the separate kind name exists only so a failure line says what broke. Two details that decide whether the target is worth anything: the path is `/play/` **with** the trailing slash (the bare form 308s and the check would grade the redirect), and the expectations were verified against production *before* the target was committed (200, secondary=1, mv-ads=1, 2,846 chars, 0 errors) so the first deploy-verify could not fail on the check rather than the site.
- **Bucket by page *type* when the vendor caps its per-path report**: `page-rpm-lib.ts` (E60) rolls Mediavine `/reports/pages` into home / collection / mod / go / play / blog rather than reading paths, because the endpoint is capped at the top 150 paths per query and `/mods/[id]` + `/go/[modId]` are a 16K-path long tail. It pulls each day under **two sort orders** (revenue and pageviews) and de-dupes on `day+path` to widen coverage without double counting, prints **revenue coverage per bucket** so nobody reads a partial bucket as a mean (a low-coverage bucket is biased toward its best earners, i.e. an upper bound), and derives an **unseen remainder** (site totals − every path seen) as the only obtainable Before for the pages that never enter the report at all. Same pure-lib + side-effecting-entrypoint split as the operator-did probe, with 0/2/1 exits and `redactError()` on every output line.
- **`keepFloor()` codifies the one-sided guardrail rule in a function instead of a convention**: `keepFloor(rpm, tolerancePct = 3)` returns `rpm × 0.97` and the report prints it beside every page type. E24's symmetric ±5% band flagged a **+13.8%** RPM outcome as a breach on 09-15; a must-not-fall metric gets a floor, and now the floor is computed by shared code rather than re-typed into each experiment's Keep-if line.
- **When two sources disagree, the answer comes from a third reading, not a re-read of the first**: the day's two headline numbers were both wrong in opposite directions — GA4 said google/organic +32.2% while GSC clicks/day read −3.6% (ratio 1.81 → 2.34), and a 3.0% hard-bounce rate looked like a failed send gate when it was three dead `5.1.1` addresses out of 100. Each was settled by a second independent source (GSC by page/query/date and device; the sending mailbox's DSNs), which is the same move as dispatching the *contradiction* rather than the flag.
- **A gate that lands exactly on its own threshold is a decision, not a rounding question**: re-permission day 1 read 3 hard bounces / 100 = 3.0% against a pre-committed `< 3%` gate. Rather than reinterpreting it in prose (the 09-13 mail-tester mistake) or shipping day 2 as Tier 1 anyway, it became an operator queue item with a recommendation and a silence-default — one word from the operator, and the never-stall rule stays intact.

### Gotchas and Pitfalls

- **Uncommitted files imported by committed code break Vercel builds**: If a committed file (e.g., `app/sitemap-nextjs.xml/route.ts`) imports from a file that was never committed (e.g., `lib/collections.ts`), the build passes locally (the file exists on disk) but fails on Vercel (only committed files are deployed). Always verify that every import target is tracked by git before pushing. Run `git status` and check for untracked files that match import paths.
- **WordPress search `?s=` query params get lost in middleware proxy**: `request.nextUrl.searchParams` can be empty on Vercel edge even when the URL has params. Always check both `request.nextUrl.searchParams` and `new URL(request.url).searchParams` as fallback. Ultimately, a dedicated `/api/blog/search` route was more reliable than middleware param forwarding.
- **vercel.json rewrites strip query params**: Named capture groups in vercel.json regex rewrites (e.g., `?s=(?<query>.*)`) don't reliably forward to the destination. Don't rely on vercel.json for query param forwarding — use middleware or API routes instead.
- **Mediavine in-content ads require `mv-ads` class**: ModGrid cells that should receive Mediavine in-content ad injection must have class `mv-ads`. Removing or renaming this class silently breaks ad injection with no errors. Always preserve ad-related CSS classes when refactoring grid components.
- **Mediavine sidebar needs normal document flow**: The ad sidebar must NOT be `position: absolute` or use CSS Grid tricks that take it out of flow. Mediavine Script Wrapper handles its own stickiness. Keep sidebar as a normal flex child with `overflow: visible`.
- **Kadence search form `action` URL rewriting**: When proxying WordPress through middleware, search forms have `action="https://blog.musthavemods.com/"`. Must rewrite these with `BLOG_ACTION_REGEX` to point to `/blog/` so searches route through the proxy instead of hitting the subdomain directly.
- **Dead code removal can cascade**: Removing a service file (e.g., newsletter service) can break API routes that import from it. Always search for imports before deleting files: `grep -r "from.*deleted-file" --include="*.ts"`.
- **Affiliate card grid items need standard grid treatment**: AffiliateRecommendations cards inserted into ModGrid should be regular grid cells, not spanning multiple columns or using special positioning — otherwise they break the grid flow and push mod cards out of alignment.
- **Double `mediavine.newPageView()` calls race and tear down all ads**: The global `usePageTracking` hook (app/providers.tsx) already calls `newPageView()` on every route mount. Adding a second call in a page component (e.g., in a useEffect after loading completes) fires ~0ms later, races Mediavine's init, resets its pageview state mid-setup, and tears down every ad slot — including ones that were working. Never call `newPageView()` from individual page components.
- **Mediavine Universal Player inline anchoring is unreliable**: `class="mv-video-player"` + `data-video-type="inline"` attributes are documented but don't reliably anchor the Universal Player inline. Mediavine defaults to outstream-floating (bottom-right corner). Workaround: use a MutationObserver to detect `.mv-outstream-container`, then DOM-move it into your slot and reset its inline styles. Long-term fix: email publishers@mediavine.com to configure inline placement.
- **sendBeacon silently drops JSON payloads**: `navigator.sendBeacon(url, JSON.stringify(data))` sends with `Content-Type: text/plain`, causing server-side JSON parsing to fail silently (no error, data just disappears). Fix: wrap in a `Blob` with explicit type: `new Blob([JSON.stringify(data)], { type: 'application/json' })`.
- **Loading guards hide ad anchors from Mediavine**: A client component that returns `<Loader/>` while fetching data hides all ad anchors from Mediavine's initial DOM scan. By the time the real layout mounts, Mediavine has already finished scanning and won't rescan. Render the layout shell (with skeletons) immediately; never gate the entire page behind a loading state.
- **`.gitignore` `node_modules/` only ignores directories, not symlinks**: Git treats a trailing `/` in `.gitignore` as "directories only." A `node_modules` *symlink* (no trailing `/`) bypasses this rule and gets tracked. PR #20 accidentally committed a `node_modules` symlink pointing at the operator's tree; every checkout recreated the link, and `npm ci` through it emptied the real `node_modules`. Fix: add a bare `node_modules` line (no trailing `/`) to `.gitignore` so both directories and symlinks are ignored.
- **Shared worktree cross-contamination**: When multiple agents share a single git worktree, files staged or committed by one agent leak into another agent's PR. Three of five PRs on 2026-09-02 had to be rebuilt by Quinn after unrelated commits rode along. Always give each agent its own worktree.
- **Symlinked `.env.local` breaks `next build`**: Webpack follows symlinks and tries to parse the `.env.local` target as a JavaScript module, causing build failures. Always *copy* `.env.local` into worktrees (with `chmod 600`), never symlink. The `cleanup()` trap deletes the worktree including the copy, so secrets don't persist.
- **Expired OAuth tokens silently kill headless CLI runs**: When the Claude CLI runs headlessly (e.g., from `launchd`/cron), a desktop session's OAuth token may have expired months ago without any visible prompt to refresh. The API returns 401 silently, and the agent never starts. Fix: strip host-session environment variables from nested `claude -p` invocations so the CLI self-refreshes, and run an authentication preflight (a trivial `claude -p "Reply: ok"` call) before the real run. If the preflight fails, write a DEGRADED digest telling the operator to run `claude auth login`.
- **`[...str.matchAll()]` spread requires `downlevelIteration` under ES5 targets**: Vercel's `next build` type-checks every `.ts` file (including `scripts/`), and the default `tsconfig.json` doesn't enable `downlevelIteration`. `[...str.matchAll(re)]` compiles fine but errors at build time. Use `Array.from(str.matchAll(re))` instead. This broke PR #19's first build (caught by `deploy-verify.sh` before production was promoted).
- **Scheduled tasks pinned to a specific model stop launching when the model is deprecated or renamed**: The `mhm-daily-pulse` routine was pinned to a specific model and silently failed to launch on 2026-09-03/04 — no session, no runner log, no error. The fix was to create a new task (`mhm-funnel-daily`) with `model: Auto` so the runtime picks the best available model. Always use `Auto` for scheduled tasks unless you have a specific reason to pin (PR #31, 2026-09-04).
- **GSC sitemap "0 indexed" is a UI artifact for sitemap index files**: GSC shows "0 indexed" next to a sitemap index file (a file that references sub-sitemaps) because it counts submitted URLs at the index level but does not aggregate indexed counts from sub-sitemaps. This looks alarming but is not an indexing problem. Always verify with `index_inspect` spot checks on individual URLs before assuming pages are not indexed (Sage diagnosis, 2026-09-04).
- **Google core updates can collapse rankings overnight**: The site's -94% Google click decline was not gradual — it happened on July 8, 2025 (the day Google's July 2025 Core Update rolled out). Positions went from 9-19 to 26-40+ in 48 hours across all non-brand queries. A second core update in January 2026 erased a partial recovery. The root cause is ranking quality signals (homepage CSR, canonical conflicts), not technical SEO (indexing, crawl, robots.txt).
- **Blog-subdomain canonical conflicts dilute ranking authority**: Blog posts at `blog.musthavemods.com/[slug]/` with canonicals pointing to `/games/sims-4/[facet]/` split PageRank between two URLs. Google sometimes ignores the declared canonical and picks its own — neither URL accumulates full authority. Especially dangerous when a 308 redirect moves a historically strong URL to a new facet page that Google hasn't accepted as canonical (e.g., `/sims-4-pregnancy-mods/` → `/games/sims-4/pregnancy-mods/`).
- **Homepage client-side rendering is invisible to Google crawlers**: A Next.js homepage that returns ~20KB of shell HTML with no `<h1>` and no body content (all loaded via client-side JS) gets scored as empty by Google. This is the single highest-leverage SEO fix when the homepage is the #1 click source (20,652 clicks over 16 months) but ranks at position 36 for brand queries. Fix: server-render at minimum the H1, top collections, and JSON-LD schema.
- **28d guardrail breaches can be mechanical, not causal**: When a high-RPM period (e.g., June at $18-21 RPM) rotates out of the 28d trailing window and a low-RPM period (e.g., August at $15.09) fills it, the 28d metric drops mechanically. This is not a signal to roll back or investigate deploys — it's arithmetic. Track the same-weekday comparison and the RPM escalation counter ($14.00 threshold, 5 consecutive weekdays) as the actionable signals instead.
- **Pinterest traffic follows a post-summer taper pattern**: Pinterest sessions to content sites peak in July-August (longer screen time, more inspiration browsing) and moderate in early September as routines resume. A -6 to -11% decline in early September is seasonal, not algorithmic. Don't confuse it with a deployment regression. Monitor for sustained taper vs one-week dip; if 7d Pinterest sessions remain below 55K by the second week, then investigate content/cadence.
- **Vercel rollback silently pauses auto-promotion**: After running `vercel rollback`, Vercel stops auto-promoting new builds to production. Subsequent merges build to READY status but serve nothing — production keeps serving the rollback target. On 2026-09-05, four verified merges (PRs #38–#41) sat READY for ~66 minutes until Quinn manually ran `vercel promote`. The `deploy-verify.sh` PASS result only confirms the deployment it checked is healthy, not that *your change* is live. Fix queued: post-rollback promotion check in the runner.
- **`toLocaleString()` without locale arg causes hydration mismatch**: Node.js server locale and browser locale can differ, producing different number formatting (e.g., comma placement). Similarly, `toLocaleDateString()` without `timeZone` renders dates in the server's UTC but the browser's local timezone, causing different date strings near midnight. These are silent — no build error, just React #425 warnings in the console that may affect Google's page quality scoring (PR #41, 2026-09-05).
- **Smoke checks in worktrees without node_modules cause false-alarm rollbacks**: When `deploy-verify.sh` runs `smoke-render.ts` inside a fresh worktree with no `node_modules`, Playwright is missing, the script can't render any page, and "could not run" was previously treated as a site failure — triggering an unnecessary production rollback. This happened twice in 24h (PRs #44 and #45, incidents 2026-09-04-184540 and 2026-09-05-102609). Fix (PR #46): search for Playwright across multiple worktrees, and treat "cannot run" as INCONCLUSIVE (no rollback).
- **Transient third-party script errors cause non-reproducible page errors**: A circular-JSON error from a third-party script appeared on 1 of 7 homepage loads and never reproduced. Before the retry logic (PR #46), this single transient error would have been counted as a smoke failure. Fix: if the only failures are `uncaught page error` entries (not structural issues like HTTP errors or missing ad anchors), render the page a second time. Pass only if the error doesn't reproduce.
- **Docs-only merges still trigger Vercel deployments**: Every merge to `main` triggers a Vercel build, even if only markdown/report files changed. On 2026-09-05, 10 of 18 merges across the week were docs-only, each consuming a deploy slot and triggering a full build+verify cycle. Queued fix: Vercel Ignored Build Step that checks `git diff` for app-code changes and skips the build for docs-only commits.
- **Agent stream stalling is a runtime hazard, not a bug in your code**: On 2026-09-05, Pip's agent stream stalled twice during PR #42 (pinner liveness check). Quinn rescued and finished the work. When orchestrating multi-agent runs, the GM agent should monitor for stalls (no output for N minutes) and either retry or pick up the work. Don't assume all agents will complete.
- **Network-level smoke timeouts are a distinct failure class from "un-runnable"**: The 09-04 evening incident got `ERR_TIMED_OUT` across all pages (BigScoots/Vercel edge transient), which is different from the 09-05 "could not run" (missing Playwright). PR #46 fixed the un-runnable class but not the network-timeout class. A smoke check that runs but gets network errors on every page should retry after a delay before triggering rollback — production may be fine while the checker's network path is temporarily broken. Morning re-check at 06:49 on 09-05 confirmed production was healthy the whole time.
- **Serialize automated merges — rapid parallel merges cause sha-attribution drift**: On 2026-09-05, four PRs (#38–#41) merged within 49 seconds. Vercel coalesces builds when merges arrive faster than build start time, so multiple shas map to the same deployment URL. The deploy ledger loses per-PR attribution ("did PR #38 or #41 break something?"). Fix: enforce a gap (≥60s) between automated `gh pr merge` calls so each merge gets its own Vercel build and ledger row.

- **NextAuth OAuth account linking has been broken since launch — all 1,533 accounts are `credentials`**: the `signIn` callback in `lib/authOptions.ts` pre-creates the user by email *before* the Prisma adapter links the OAuth account, and neither `GoogleProvider` nor `DiscordProvider` sets `allowDangerousEmailAccountLinking`, so every first-time social sign-in hits `OAuthAccountNotLinked` and fails silently. A `groupBy` on `Account.provider` shows zero OAuth rows, ever. The Patreon provider added in PR #52 works only because it sets `allowDangerousEmailAccountLinking: true` — that is a band-aid for the new provider, not a fix for the old two. Check this before touching social login (Tier 2, queued for the operator).
- **Membership is a snapshot baked into the JWT, not a live check**: `fetchPatreonMembership()` runs only in the `jwt` callback on a Patreon *sign-in* event, and the result is written into a 30-day session token. A patron who cancels keeps the countdown skip and Member badge until the JWT expires or they re-authenticate. This is a documented known gap, not an oversight — but do not add entitlements that cost real money on the same mechanism without a re-verify job.
- **`PATREON_CAMPAIGN_ID` is a load-bearing optional env var**: `parsePatreonIdentity()` in `lib/membership.ts` only counts a membership when `campaignId` matches; if the var is unset, *any* active patron of *any* creator on Patreon qualifies as a site member (there is an explicit test covering this branch). An optional env var gating a security-relevant business rule belongs in the ops runbook, not just a code comment.
- **A Tier 2 package can assume env vars that do not exist**: PR #52's package listed `PATREON_CLIENT_ID` / `PATREON_CLIENT_SECRET` as already present in Vercel Production. They were not. Separately, OAuth sign-in *starts* fine with an unregistered callback — the provider only rejects at its own authorize step with a redirect-URI mismatch. Before marking an OAuth package READY: verify each env var is actually set in the target environment, and that the exact callback URL is registered in the provider's portal.
- **Registry `related` slugs fail silently, not loudly**: `app/games/[game]/[topic]/page.tsx` resolves `related` with `.map(find).filter(Boolean)`, so a stale slug is dropped from the rendered strip with no build error, no 404, and no console warning. Four collections (`clutter`, `holidays-cc`, `furniture-cc`, `decor-cc`) were cross-linking to slugs that did not exist — `/games/sims-4/clutter/` had been rendering 1 related card instead of 3. Fixed in PR #51 along with a test that asserts every reference resolves.
- **A red test on `origin/main` can sit unnoticed for days**: `canonical-trailing-slash.test.ts` was failing on main for 3 days because `makeup-cc` (PR #32) shipped without its `blogUrl` field — the field is typed as optional, so nothing complained at merge time. Found only when the next collection PR ran the suite. The ship protocol runs `sidebar-sticky-health.test.ts` explicitly; it does not run the full unit suite, which is how this escaped.
- **A third-party script error can reproduce on *both* retries and hard-fail a healthy site**: Mediavine's prebid bundle intermittently throws `Converting circular structure to JSON` from `track()` on the homepage. On 2026-09-07 it happened to fire on both loads, exhausting PR #46's single retry, and triggered a `vercel rollback` over a merge that changed **two markdown files** — the rolled-back build was byte-identical in code. Fix (PR #56): `smoke-render.ts` parses the top stack frame of each uncaught error and compares its host to `OUR_HOST`; off-origin errors go to `thirdPartyErrors` (reported as `(3rd-party N ⚠)`), while an error on our own host or with no parseable frame still hard-fails. Structural checks (HTTP 200, Mediavine loader, `aside#secondary`, `.mv-ads`, text length, error boundary) are untouched and still decide pass/fail.
- **"Auth failed" and "CLI too old" look identical at the API layer**: the funnel runner's degraded digest told the operator to run `claude auth login` for two straight days when the real cause was an outdated CLI (2.1.108 vs Fable's floor of 2.1.251) — auth was fine and the suggested fix could not have helped. Fix (PR #54): `claude_preflight()` writes raw JSON to `logs/funnel-preflight-$TODAY.json` and `preflight_diagnosis()` greps it for `claude_code_version_too_old` (→ `CLI_TOO_OLD`, fix: upgrade the cask) vs `authentication|not logged in|401|invalid.*token|oauth` (→ `AUTH`) vs everything else. Note the plain `claude-code` Homebrew cask tops out at 2.1.236, below the required floor — the upgrade path needs the `@latest` cask specifically.
- **One shared `node_modules` symlink across agent worktrees is a single point of failure**: on 2026-09-07 the GM worktree's install was emptied at 08:12 while 4 of 5 agents were symlinked into it; each independently discovered the empty tree and reinstalled 828 packages before it could build. Give every agent worktree its own `npm ci`. (Related but distinct from the already-documented rule that `.env.local` must be *copied*, never symlinked.)
- **A scheduled run that never launches leaves no trace at all**: the funnel runner fired on only 4 of 7 days (09-03 and 09-06 never started) and the evening check left no ledger row after 09-04 — and nothing in the logs distinguishes "did not fire" from "ran and had nothing to say". Any scheduled automation should write its own explicit "did not fire" / "nothing to report" row, otherwise silence is unfalsifiable.
- **Vercel preview deployments are SSO-locked, so you cannot smoke-test a PR preview**: verify a build's served HTML locally with `next start` against the production build instead of curling the preview URL, which returns the Vercel SSO wall rather than your page.
- **`git branch --contains` before you call anything "shipped"** — and check `origin/main`, not `main`: in a long-lived worktree the local `main` ref goes stale (it was 8 commits behind during this review), so an ancestry check against `main` reports false negatives. A commit message reading `feat(...)` also does not mean the commit reached the default branch; squash merges create a *different* sha, so the pre-squash commit is never an ancestor of main even when the change shipped.

- **`trailingSlash: true` applies to `/api/*` routes too, and a 308 silently breaks one-click unsubscribe**: `next.config.js:10` sets it globally, so PR #66's `UNSUBSCRIBE_PATH = '/api/unsubscribe'` was answered with a 308 to `/api/unsubscribe/`. A human clicking in a browser never noticed — browsers follow 308 preserving method and body — but RFC 8058 one-click POSTs from Gmail/Yahoo do not reliably follow redirects, so the `List-Unsubscribe-Post` header was promising something the URL could not deliver. Fixed in PR #67 by putting the trailing slash in the single source of truth (`lib/services/unsubscribe.ts:26`) plus the hardcoded form action. **Every hand-authored `/api/...` string that leaves the app (email link, header value, form action, webhook callback) needs the trailing slash**; there is still one un-fixed instance at `scripts/agents/newsletter-send-test.ts:174` (`/api/subscribe/confirm?`), harmless only because that route does not exist yet.
- **Next.js only inlines `NEXT_PUBLIC_*` when the literal `process.env.NEXT_PUBLIC_X` expression is physically in the source**: `lib/membership.ts` read the flag as `env[MEMBERSHIP_FLAG]` with `process.env` as the *default parameter value*. The webpack `DefinePlugin` pass is a static AST/textual replacement — it cannot evaluate a computed property key, so the browser bundle kept a dynamic lookup against `process.env`, which is `{}` client-side, and the flag evaluated `undefined` for 22 hours (E24, PR #62). The server was fine the whole time (real `process.env`), so **every server-side check passed** while the `/go` CTA, countdown skip and Member badge never rendered. Fix: the no-arg path now reads the literal expression, and the injectable `env` argument exists only for tests. Never wrap a `NEXT_PUBLIC_*` read in a constant used as a computed key, or in a helper defaulting to `process.env`, if that path can run on the client.
- **A `useSearchParams()` page without `export const dynamic = 'force-dynamic'` bakes its Suspense fallback into the static HTML**: the old `app/page.tsx` was a `'use client'` page with `useSearchParams()` inside a `Suspense` boundary and no dynamic directive, so the build-time prerender committed only the spinner fallback. Real content appeared solely after hydration — meaning crawlers and LLM fetchers got a ~20KB empty shell with no `<h1>` for as long as that build was cached. Invisible in `next dev` (always per-request) and invisible to a human clicking production (hydration masks it). Assert it at the source level; do not eyeball the rendered page.
- **ESM import hoisting defeats `dotenv.config()` for any module-level singleton**: `scripts/agents/newsletter-send-test.ts` calls `dotenv.config({ path: '.env.local', override: true })` textually above its other imports, but all `import` statements are hoisted and run first — so `emailNotifier.ts`'s module-level `new EmailNotifier()` had already captured `process.env.EMAIL_FROM` as `undefined` and the test send went out from `noreply@musthavemods.com`. Fixed in PR #66 by moving from-address resolution out of the constructor into `resolveFrom()`, called fresh inside `send()`. The general rule is **defer every env read to call time in any module that constructs a singleton at import time** — the sibling fields (`sendgridApiKey`, `transport()`) were already immune precisely because they read `process.env` on each call.
- **`deploy-verify.sh --check` still verifies whatever is live, so a paused auto-promotion can persist indefinitely**: PR #58 added `ensure_promoted()` (compare `vercel inspect musthavemods.com` against the just-built URL, run `vercel promote`, poll 60s) but wired it **only into `after-merge` mode**. `--check` mode still does `DEPLOY_URL="$(current_prod)"`. On 09-08 production served the pre-rollback build for **21.6 hours** while three PASS ledger rows claimed "verified live". If a rollback happens and no PR merges afterwards, the morning and evening checks will keep reporting PASS on the stale build forever. Closing this means giving `check` the same gate — comparing the live alias to the newest READY production deploy.
- **Plural spellings in a keyword rule double-count, because the regex already matches plurals**: `keywordToRegex()` appends `(?:s|es)?\b` to every keyword, so a rule listing both `light` and `lights` scored **2** matches from one occurrence of the word — and the description pass promotes any rule with ≥2 matches to `medium` confidence. One incidental "...and lights." relabelled whole build sets as `lighting` (PR #61). Fixed by stem-collapsing matches in `matchedKeywordsIn()` before counting. This over-weighting was silently live for **every** rule in the file that listed a singular and its plural, not just `lighting`.
- **Bare adjectives are unsafe detector keywords**: `'light'` matched "Light To Medium Skintones", "Light Up Gaming PC" and "Into the Light". PR #61 removed it entirely, keeping only nouns that can only denote a fixture (`lamp`, `chandelier`, `sconce`, `lantern`, `ceiling light`), and added `negativeKeywords` for `gshade`/`reshade`/`preset`/`skintone`/`overlay`; `curtains` gained `['curtain bang', 'bangs', 'hair']` to stop curtain-bang hairstyles. Prefer narrow nouns plus explicit negatives over trying to make a broad positive keyword smarter.
- **Rule-priority collisions in the detector are still unfixed**: the 7 hand-audited entries in `scripts/retag-junk-build-facets.ts` `OVERRIDES` are patched per-id, not in the detector — "Crown Victoria" still hits `hats` via "Crown", "Lollipop Mirror Boots" still hits `furniture` via "Mirror" outranking `shoes`, and "Lighting Bolt" still matches the narrowed `lighting` nouns. Expect new mods with similar title collisions to be mis-tagged; the priority-conflict class is live.
- **A secret with a convenient fallback silently stops verifying across environments**: `signingKey()` in `lib/services/unsubscribe.ts` falls back to `NEXTAUTH_SECRET` when `UNSUBSCRIBE_SECRET` is unset. The 09-08 test send was signed on the laptop with the *local* `NEXTAUTH_SECRET` and verified in production against Vercel's *different* one, so every unsubscribe link in the test emails returned "Link not recognized" — no error, no log, just a dead link in a compliance-critical footer. Any HMAC whose key falls back to a per-environment secret must have its own dedicated value set in **both** environments before the first cross-environment link is generated.
- **An RFC 2369 `mailto:` unsubscribe must name a mailbox that actually exists**: `UNSUBSCRIBE_MAILBOX` defaulted to `unsubscribe@musthavemods.com`, which is not one of the four BigScoots mailboxes (`admin`, `olivia`, `partnerships`, `simsnews`) — every reader who used the mail fallback would have bounced, which is worse for sender reputation than omitting the header. PR #68 defaults it to the sending mailbox (`simsnews@`). Verify the mailbox exists at the provider before naming it in a header; the same applies to `Reply-To` and `From`.

- **When a pipeline "stalls," first check whether it was ever scheduled**: the catalog gained **0 mods between 2026-08-09 and 2026-09-09** and this was carried as a breakage for a week. `scraping_jobs` had 0 rows ever, no launchd/cron/runner step called any scraper, and every non-blog source (Patreon/Tumblr/TSR/CurseForge) last inserted 2026-01-29 — the entire insert history was manual bursts. Nothing was broken; ingest had never been scheduled. `run-funnel-daily.sh` now has a step 0c that calls `scripts/agents/catalog-ingest-daily.sh` every morning (PR #73/#74; 15,888 → 16,374 mods, +486 from 22 posts, 0 errors).
- **Three of this week's problems were absences, not failures — and a person querying a source directly found every one**: ingest was never scheduled (31 days at 0), the evening `deploy-verify.sh --check` has written no ledger row since 09-04, and the operator's two 10-minute fixes on 09-08 (5/5 `SMTP_*` vars in Vercel at ~21:50, the $3 tier perk line at 21:35) surfaced in no feed the team reads — they were found via `vercel env ls` and the Patreon tiers API. A monitor that only reports on things that ran cannot report on a thing that never ran. Any scheduled automation needs its own explicit "did not fire" row, and any state a human can change out-of-band needs its own probe.
- **Seeding a committed file from another checkout must be append-only**: `run-funnel-daily.sh` used to blind-`cp` `reports/funnel/changelog.md` and every incident file from the operator tree into the run's worktree. The copy on `origin/main` can be *newer* than the operator's (resolved incidents, rows already folded into a daily PR), so that `cp` overwrote the resolved 2026-09-07 incident file on 09-08 and again on 09-09. It now appends only ledger lines not already present (`grep -F -x -v -f` filtered to `^| 20[0-9]{2}-`) and copies an incident file only when it is absent.
- **A threshold chosen after you read the printout is not a pre-committed decision rule**: `scripts/agents/patreon-churn-read.ts` branches its recommendation on `leTwoShare >= 0.5` and the data landed at 59% / 34% — Rio's own playbook flags this as a gate set to match the number it was about to judge, which is exactly what the house "print the decision rule before you take the reading" convention exists to prevent. The finding itself is solid (of 223 dated cancels, 88 paid exactly once and 132 paid at most twice; 84 of 250 mature pledges never paid a second month; 0 of 11 Patreon-linked site accounts are currently paying, driving the day-0 welcome note in `reports/funnel/drafts/patreon-welcome-note-2026-09-09.md`). Write the numeric gate down *before* the query runs, not in the same commit as its output.
- **Patreon cohort math is a 30-day approximation, and tiers need a second API call**: `fetchMembers()` pages `/campaigns/{id}/members` at `page[count]=500` following `links.next` cursors through `patreonGet()` (which self-refreshes the token on 401), but tier data is not returned there — it needs `GET /campaigns/{id}?include=tiers`. `cyclesPaid = floor(daysBetween(start,last)/30)+1` and the monthly cancel attribution `cancels[ym(last+30d)]` both assume clean monthly billing, so treat the cohort buckets as directional rather than exact.
- **`vercel env ls` needs a Vercel-linked checkout, so an agent in a worktree reports stale env state**: on 09-09 an agent repeated "0 of 5 `SMTP_*` vars set" when the operator had set all five the night before — the agent's worktree is not linked to the Vercel project, so it carried the prior day's figure into the digest and asked for work already done. Run `vercel env ls production --cwd <operator tree>` (names only) before repeating any "N of M vars" claim.
- **`deploy-verify.sh --check` still verifies whatever is live, so a paused promotion can outlast a green morning check**: PR #58 wired `ensure_promoted()` into `--after-merge` only. If a rollback pauses auto-promotion and no PR merges afterwards, the next morning's PASS confirms the *stale* build is healthy — not that the newest build shipped. Combined with the evening check writing no row since 09-04, "PASS" currently proves less than it reads like it does.

- **A same-day fix does not retroactively update that day's own snapshot**: `reports/funnel/scoreboard.out` and `reports/funnel/2026-09-09.md` both still read "Catalog: 15,888 mods" even though the 09-09 run is the run that backfilled it to 16,374 — the scoreboard step runs before the agent PRs merge. Don't read a metric out of the same run's snapshot to judge a change that run shipped; it lands in the next day's file.
- **`catalog-ingest-daily.sh` has no lock file, and that is deliberate**: concurrency safety comes from DB-derived idempotency (`--new-only` skips any post that already has a `Mod.sourceUrl` row), not from `flock`. Preflight guards cover the rest — it exits `2` before touching the scraper if `.env.local` is missing, `node_modules/.bin/tsx` is not executable, or both the macOS `date -v` and GNU `date -d` forms fail. A double-run therefore wastes a few fetches rather than duplicating rows; don't add a lock and assume it is what makes the job safe.

- **A launcher that executes an untracked copy of the runner turns every runner PR into a no-op, and nothing in the loop can see it**: PR #74's four fixes (per-agent `npm ci`, append-only ledger seeding, `MHM_PROJECT_DIR`, the ingest hook) all merged, all verified PASS, and **none ran** the next morning — the GM re-linked 5/5 agent `node_modules` by hand again and ingest was skipped entirely. The same stale-copy problem explains why the evening `deploy-verify.sh --check` has written no ledger row since 09-04 (six days) and `logs/deploy-verify.log` has no `evening` entry: it is not firing, not silent. It was found by a person diffing line counts (239 vs 294), not by any automated check. Verify a runner change actually executed by grepping `logs/funnel-daily.log` for the new log line (`prompt=`, the step-0d `operator-did` row) before believing the ledger.
- **macOS bash 3.2 treats an empty array expansion as an unbound variable under `set -u`**: `"${EXTRA[@]}"` in `scripts/agents/catalog-ingest-daily.sh` died with `EXTRA[@]: unbound variable` before reaching the scraper on the first real scheduled-style run. Use `${EXTRA[@]+"${EXTRA[@]}"}`. The sharper lesson is *why it was never caught*: the dry run always appends `--dry-run` to `EXTRA`, so the array was non-empty on the only path anyone had exercised — the live path with no extra args had literally never run. When a wrapper builds an optional-args array, test the zero-args case explicitly.
- **A consumer's date window silently caps throughput no matter how big the queue is**: `MHMUtils/supabase_pin_poster_server.py`'s `fetch_unposted_entries` only selects `n8n_pinterest_posts` rows whose `Post Date` is inside `[today - 14d, today]` (`BACKLOG_LOOKBACK_DAYS`). The newest unposted row was dated 2026-05-12, so all 1,879 "backlog" rows were permanently invisible and the ~19 pins/day came solely from freshly-dated new blog posts — against a cron capacity of ~72/day (1 per 20 min). The queue, not Pinterest and not the cron, was the binding constraint. Second instance of "mirror the consumer's selection query" (first was `check-pinner.sh`'s backlog count, E20/PR #60); the constant is now mirrored as `LOOKBACK_DAYS` in `revive-stranded-pins.py`.
- **A monitor threshold calibrated for "broken" misfires on a deliberately metered state**: after the E26 apply, `check-pinner.sh` still reports `[WARN]` at exactly 10 schedulable pins — the threshold assumed "queue ran dry," not an intentional 10/day drip. PR #69 only added a pointer to the new script from the stranded-count warning; the threshold itself is a known-unfixed follow-up. When you introduce a deliberate steady state, re-check every alert that reads the same number.
- **20% of revived pin rows point at `blog.musthavemods.com` instead of the apex domain**: 28 of the 140 rows re-dated on 09-10 carry the proxied blog host, so their traffic attributes to the duplicate rather than the canonical page the rest of the funnel optimizes. Root cause is upstream of this repo — the row generator in `MHMUtils/posts_2_supabase_server.py` (~lines 261 and 393) — and every future batch re-strands roughly 1-in-5 pins on the wrong host until it is fixed.
- **A keyword detector cannot reach proper-noun titles, so "one rule will fix ~70 of the 81" was wrong — it fixed 13**: the 09-09 compound note predicted a `gameplay-mod` rule would tag ~70 of the 81 NULL rows from the gameplay-mod listicles. Actual net gameplay-mod gain was **+13** (467 → 480). Most of those 81 rows are proper-noun CC titles ("Neverland Fairy", "3 Lunea – Part 2") containing none of the new literal nouns; the only remaining signal is the **source post slug** (14 plumbob replacements, 16 phone replacements), which is a post-level inference pass, not a detector rule. Note also that the headline `455 → 390` is not the same population: the 455 baseline included older pre-existing NULL rows, and the 65 written rows span 8 content types (22 decor, 18 full-body, 13 gameplay-mod, 5 furniture, 3 hair, 2 lot, 1 plants, 1 tops) — mostly unrelated cleanup. Don't attribute a coverage delta to the rule you just shipped without the per-type breakdown. Separately, the whole-catalog title-only old-vs-new diff (114 rows gain a gameplay-mod answer, 12 lose one, 9 move lot→gameplay-mod) is a **larger, unapplied** population than what was written, because the script only ever touches previously-NULL rows.
- **Patreon API v2 has no welcome-note field, and returns tier titles with trailing whitespace**: `campaign.thanks_msg` and `tier.description` are only proxies — the probe reports the welcome note as "not observable via API" rather than claiming it is absent. Separately, the API returned `"Tip Jar - Curious Simmer "` with a trailing space; without a `trim()` before title-matching, a baseline diff misreads one edited tier as "tier removed + new tier added."
- **A 32+-char token-redaction regex eats dated filenames unless hyphens and dots are excluded**: `redact()`'s `TOKEN_RE` in `operator-did-probe-lib.ts` matches long alnum runs containing both a digit and a letter, and deliberately excludes `-`/`.` so `patreon-welcome-note-2026-09-09.md` survives the scrub. There is an explicit test for it. Also note `diffSnapshots()` has to special-case a `reconstructed: true` baseline (the 09-09 file predates the probe) by comparing edits against `${prev.date}T00:00:00.000+00:00` — otherwise every pre-existing tier edit reads as "changed today."

- **A missed daily run silently drops veto-expiry merges — the 24h veto has no executor of its own**: PRs #76 (E34, `/api/subscribe/confirm/`) and #77 (E32, mod-page breadcrumb) each carried "merges 2026-09-11 unless you say stop" in the PR body *and* in `operator-queue.md`. The merge was to be performed by the 09-11 daily run, which never fired — so both vetoes expired and neither PR merged. Nothing anywhere recorded that a merge was *due*: the PRs sit OPEN and green, indistinguishable from "still waiting on the operator." A time-based approval whose only executor is a job that can silently not run is a promise the system cannot keep. Cross-check `gh pr list --state open` against the veto dates in `operator-queue.md` before assuming queued work is still blocked.
- **Verify an automation ran by grepping for a log string unique to the new version — the file on disk proves nothing**: the 09-10 run logged `Running Quinn (claude-fable-5-1)…` with **no `prompt=` suffix**, and `logs/funnel-daily.log` has zero hits for `Catalog ingest`, `Operator-did probe` and `npm ci ok in` — all three emitted unconditionally by the runner on `origin/main`. That is the proof it executed the pre-PR#74 copy. Meanwhile the operator tree's `scripts/agents/run-funnel-daily.sh` was hand-synced at 2026-09-10 21:49 and is now byte-identical to `origin/main` (316 lines) — but **still untracked by git**, so it drifts again the moment main moves; `operator-did-probe.ts` and `scheduled-task-mhm-funnel-daily.md` are absent from that tree entirely. The stale-copy hazard is currently *masked by a manual copy, not fixed*, and the tracked-launcher fix shipped in PR #80 remains **unverified** because the next run never fired. The check is one command: `grep -c 'prompt=' logs/funnel-daily.log`.
- **Third missed scheduled run (09-03, 09-06, 09-11), and `logs/catalog-ingest.log` has never been created at all**: step 0c has therefore never run on schedule — the +486-mod backfill on 09-09 was its single manual invocation, so "daily ingest" is still a claim, not a behavior. Separately the evening `deploy-verify.sh --check` has written no ledger row since 09-04 (7 days), while each morning check writes a row *annotating* the absence ("no evening-check row since 09-04", "evening check left no row on 09-09"). Annotating a dead monitor daily is how it stays dead — the annotation should have been the work item.

- **BigScoots' page cache is not the object cache the push script flushes, so a clean `functions.php` push can serve stale HTML indefinitely**: after `push-blog-functions-prod.sh --yes` ran on 09-12 for the PR #63 canonical change, the two un-consolidated articles **still served the old facet canonical** — `x-bigscoots-cache: cache` with `s-maxage=31536000`. The push script runs `wp cache flush` (object cache) but nothing purges the edge/page cache; that needs `wp bs_cache purge_cache`, which the automation is not permitted to run. Treat any `functions.php` content/canonical/markup change as **not live** until an explicit purge is confirmed, no matter how clean the push output and `php -l` were. No code fix yet — logged as an open Tier 0 idea to add a purge step to both push scripts and a staleness warning to `check-blog-sidebar.sh`.
- **One dead Pinterest board section wedged the entire queue for two days, because the poster is batch-size-1, oldest-first, and neither marks nor skips a failed row**: `MHMUtils/supabase_pin_poster_server.py` failed **138 consecutive 20-minute runs** on queue row 8007 with Pinterest `404 code 2031 "couldn't find this board section"`, re-selecting the same row every time and blocking all **56** schedulable pins (`Posted: 0, Failed: 1, Remaining: 56`). Root cause: row 8007 was one of the 140 E26 revivals, and `revive-stranded-pins.py` validated destination and image URLs but never board sections — the section had been deleted by the writer since February. Only 2 of 56 rows were actually dead (`reports/funnel/pin-section-repair-2026-09-12.json`); head-of-line blocking did the rest. **When a consumer processes one row at a time in a fixed order and does not quarantine failures, a single poison row is a full outage, not a 1/56 defect.**
- **`check-pinner.sh` steps 1–4 were all `[OK]` every morning while zero pins posted**: staleness, token TTL, backlog and catalog-drain checks had no visibility into board-section validity, so the queue looked healthy from every angle the monitor could see. Step 6 (`repair-pin-sections.py --check`) now surfaces it as `[FAIL]` the same morning with the fix command in the message. Note this does **not** fix the separate, still-open WARN-at-10 backlog threshold miscalibration (E20) — a monitor gaining a new check does not retire its old bad one.
- **`trailingSlash: true` bites every new `/api/...` route, and the fix belongs at the call site with a source-level test**: bare `POST /api/auth/forgot-password` was 308-redirected. Browsers replay a POST body across a 308 so it "worked" in manual testing while wasting a round trip on every call — and RFC 8058 one-click POSTs do not reliably follow redirects at all. Fixed by hardcoding the slash in `app/forgot-password/page.tsx` and `app/set-password/page.tsx` (both the `GET .../reset-password/?token=` and the `POST`), guarded by `password-reset.test.ts:372` which `readFileSync`s the page source and asserts the slashed string is present and the bare one absent. The previously-flagged instance at `scripts/agents/newsletter-send-test.ts:174` is now **fixed** — it calls `buildConfirmUrl()`, and `CONFIRM_PATH = '/api/subscribe/confirm/'` (`lib/services/subscribeConfirm.ts:45`) is the single source of truth.
- **An account-recovery flow must enumerate every synthetic or privileged account convention, not just "does a `User` row exist"**: `app/api/auth/forgot-password/route.ts:70` short-circuits any `@admin.local` address to the same generic 200 as an unknown address — **before** the DB lookup (asserted by `password-reset.test.ts:255`, which checks `prisma.user.findUnique` is never called). That address is the env-var-driven admin row that authenticates against `ADMIN_PASSWORD` rather than a `credentials` `Account`; a reset there would either mint a token for an undeliverable mailbox or, if consumed, create a real second admin password path. Also note `setUserPassword()` (`lib/auth/credentials.ts:37-63`) has to handle converted-subscriber users who have a `User` row and **zero** `Account` rows — do not assume the two are 1:1.
- **When the repo already has a canonical "build a public link for an email" helper, import it — a hand-rolled subset drifts silently**: `authEmail.ts` originally read only `process.env.NEXTAUTH_URL` before falling back to production, diverging from the established `NEXT_PUBLIC_SITE_URL` → `NEXTAUTH_URL` → `https://musthavemods.com` chain used for unsubscribe links. Fixed by re-using `baseUrl` from `lib/services/unsubscribe.ts` (`authEmail.ts:18,37`). The drift was benign only because `NEXTAUTH_URL` happened to be set correctly in Vercel Production.
- **`getCollectionsForMod()` is a hand-maintained in-memory mirror of `buildWhereClause()`, with a comment as its only enforcement**: `modMatchesFilter()` (`lib/collections.ts:696-703`) reimplements the Prisma where-clause in pure JS — including both keyword-fallback magic values (`__pregnancy_keyword__`, `__witch_keyword__`) and the "later filter overwrites earlier" precedence (`contentTypeIn` over `contentType`, `themesAny` over `themesAll`). **Two functions must be updated by hand for every new facet type**; there is no shared codegen. Zero matches degrades cleanly (`buildModBreadcrumb()` omits the collection crumb, `lib/seo/modBreadcrumb.ts:54-61`) and multiple matches are ranked by `filterSpecificity()` with `slice(1, 4)` capping the "Also in:" chips at 3.
- **Un-consolidating a legacy canonical pair is a 3-layer revert, and a half-applied one silently recreates the bug**: PR #63 needed all of — remove 4 redirect blocks from `vercel.json`, move both slugs from `mhm_consolidated_post_map()` (canonical→facet, excluded from its own sitemap) into `mhm_collection_crosslink_map()` (self-canonical + crosslink box) in `functions.php`, re-include the posts in the blog sitemap route, and add reciprocal `blogUrl`/`metaTitle` on the facets. Dropping the redirect but forgetting the `functions.php` move would restore the exact canonical conflict being fixed; only the source-level test at `__tests__/unit/canonical-trailing-slash.test.ts:137-147` (which greps `vercel.json` *and* `functions.php`) would catch it. The un-consolidation was warranted by GSC: the blog article sat at position 10.95 with 93 clicks while the facet it was canonicalized to sat at 33.0 with 2.
- **The evening `deploy-verify.sh --check` has now written no ledger row for 8 days (since 09-04) and is a *different* scheduled task from the morning one that was just fixed**: Q7's launcher fix repaired `mhm-funnel-daily`; the evening task (`mhm-guardrail-evening`) was untouched and remains dead. The 09-12 digest annotates the absence again. This is the third consecutive compound review to record the same annotation — per the 09-11 note, annotating a dead monitor is how it stays dead.

- **`middleware.ts`'s `NEXTJS_PREFIXES` is the real router for every top-level route, and two live routes are missing from it right now**: `getWordPressUrl()`'s catch-all (`middleware.ts:51-59`) proxies *any* unlisted, dot-free first path segment to `blog.musthavemods.com`, and the matcher (`:322-324`) sends nearly everything through it. A missing entry is invisible to `next build` and `npm run type-check` — the visitor just gets a WordPress 404. `'play'` was added in PR #84 after a local production build showed the 404. **`forgot-password` and `set-password` are still absent** (verified at HEAD 2026-09-13 against `ls app/*/`), so the password-reset flow shipped 09-12 in PR #85 — including the `/set-password/?token=…` link inside every reset email — is proxied to WordPress in production. Any new top-level `app/` directory needs a `NEXTJS_PREFIXES` entry in the same PR.
- **The trailing-slash class is still open after PR #95 fixed one instance**: `collectionHref()` (`lib/collections.ts:644-646`) now backs the related-collections strip (`CollectionPageClient.tsx:175`), which had 308'd on all 18 collection pages since the strip shipped. But four more slashless template hrefs are live: `CollectionPageClient.tsx:92` (in the very file that was fixed), `components/Navbar.tsx:110` and `:271` (both `` href={`/games/${slug}`} ``), and `app/play/PlayClient.tsx:276` (`` href={`/go/${item.id}`} ``). The new test's `not.toContain` matches only the exact `rel.`-prefixed template, so none of them trip it. The durable guard is repo-wide: no `` href={`/ `` template literal that doesn't end in `` /`} ``. In-browser `fetch()` calls have the same gap (`PlayClient.tsx:68` → `/api/game/daily`, `HomePageClient.tsx:195`, `GoClient.tsx:75`) — harmless for a browser GET, fatal for an RFC 8058 one-click POST.
- **Step 0e's idempotency branch is dead code, and the failure mode is that the miss reports as healthy**: the `MISSED` row it writes is itself formatted `| $YDAY 18:30 | check | …` (`run-funnel-daily.sh:188`), and `18` matches branch 1's own regex `^\| $YDAY (1[6-9]|2[0-3]):[0-9]{2} \| check \|` (`:183`). A second run on the same day therefore takes branch 1 and logs `Evening check: ledger row present for $YDAY`. No duplicate row is written, so the idempotency *goal* holds by accident — but the MISSED row is indistinguishable from a real evening check to the same query the next consumer would use. Fix by excluding `MISSED` in the branch-1 regex or by giving the row a non-`check` type.
- **`funnel-scoreboard.ts` interpolates raw exception messages into committed reports, and it is the one path `redact()` never touches**: `section()` (`:87-96`) keeps `msg.slice(0, 200)` and `errOf()` splices it into the rendered markdown at nine call sites (`_unavailable: ${errOf(patreonApi)}_` `:715`, `🟡 Pinner liveness unknown: ${errOf(pinner)}` `:647`, …). `pullPatreonApi` builds its own client with `new PrismaClient({ datasourceUrl: dbUrl })` from `DIRECT_DATABASE_URL` (`:406-409`), and Prisma connection errors routinely embed the datasource URL. `redact()` exists only in `operator-did-probe-lib.ts:83` and is not imported here. Everything else on this path is protected by convention — `spawnSync(python3, …, { stdio: 'ignore' })` at `:572-576` with an explicit "we do not want any path where a helper change could surface a token" comment — so the error string is the outlier, in a repo whose first rule is never commit a secret.
- **`export const dynamic = 'force-dynamic'` does not defeat the global `/api/:path*` cache header**: `next.config.js` applies `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` to every API route, so `/api/game/daily` (`route.ts:13`, force-dynamic) can serve yesterday's episode from the shared cache for up to 60s (300s stale) past midnight ET. `force-dynamic` controls *build-time prerendering*, not the CDN.
- **`paidAndConnected` joins Patreon members to site users on email equality, not on the authoritative key**: `summarizePatreonMembers()` (`patreon-members-lib.ts:94-98`) intersects Patreon member emails with `User.email`, while `Account.providerAccountId` — the exact join key, already in the table being queried — is not selected (`funnel-scoreboard.ts:411` takes only `user.email`). The merge-day reading of **0 of 31 linked** is the signature of a systematically different email (Patreon billing address vs. OAuth profile), not of zero connections. Two decision rules currently rest on that number: the Q4 09-22 gate ("≥1/3 of paid patrons connected", whose ceiling is 31/51 = 60% even under a perfect join) and E40's "revert if paid-and-connected still 0", which is presently always true. Confirm the join before either read fires.
- **The E40 revert clause divides by a different denominator than its own baseline**: `funnel-scoreboard.ts:712-713` prints `patreon_click users/day` computed as `captureUsers7d.patreon_click / 7` (`:192`) against a stated baseline of `8.75`, which is 35 users ÷ **4** days (09-08→09-11). The "< 50% of 8.75" threshold is therefore measured on a 7-day mean against a 4-day mean. Rio's own note records a second version of this: the GA4 capture window is anchored at `daysAgo(2)`, so the scoreboard's users/day lags a live MCP read by two days. When a pre-committed gate is a ratio, write down the window on both sides of it.
- **Three pinner constants are duplicated across a TS/shell boundary with comment-only enforcement**: `36` (`pinner-liveness-lib.ts:80` ↔ `check-pinner.sh:118`), `14` (`funnel-scoreboard.ts:455` ↔ `check-pinner.sh:123` ↔ `BACKLOG_LOOKBACK_DAYS` in the separate `MHMUtils` repo) and `20` (a bare literal at `funnel-scoreboard.ts:644` ↔ `PINNER_LOW_BACKLOG` at `check-pinner.sh:125`). The source-level test only asserts `check-pinner.sh` *mentions* `PINNER_RED_AFTER_HOURS` (`pinner-liveness.test.ts:109`), not that it equals 36 — value drift passes CI. `check-pinner.sh` also fetches one page of pins while the scoreboard pages 3×, so the same "pins in 24h" signal caps at 100 in one consumer and 300 in the other.
- **Four tests are red on `origin/main` again, from PR #63's un-consolidation**: `__tests__/unit/seo-phase1.test.ts:332-336` still asserts `/sims-4-pregnancy-mods/ → /games/sims-4/pregnancy-mods/` and the y2k pair, and `llms-txt.test.ts:104` still asserts the pregnancy blog URL is excluded — but both redirects were deliberately removed from `vercel.json` on 09-12 and the posts are back in the blog sitemap. Verified statically at HEAD. This is the third instance of the same pattern (09-07 `makeup-cc`, 09-12, now): the ship protocol runs `sidebar-sticky-health.test.ts` explicitly and not the full unit suite, so a suite nobody's PR touches can stay red for days. PR #94 reportedly repairs them.
- **A comment can claim a mitigation the code never implements**: `lib/game/mainCharacter.ts:254-256` reads "Offset the rotation with a date hash so consecutive days don't walk the scene list in a guessable straight line forever" — and the next line is a bare `SCENES[(episode - 1) % SCENES.length]`. `hashString` is imported by the route but never applied to scene selection, so with 12 scenes the rotation repeats exactly every 12 days and tomorrow's scene and cast are fully derivable. Read the line under the comment.
- **`/play` is outside every runtime check the team actually relies on**: it is not in `smoke-render.ts`'s target list (`:79-85`) and `app/play/PlayClient.tsx` was not added to the central `pagesWithSidebar` registry in `sidebar-sticky-health.test.ts:31-35` (its rules were re-implemented in a per-page test instead). So the post-deploy checks that genuinely observe HTTP 200, `aside#secondary`, `.mv-ads` and uncaught page errors never visit the new page. Precedent for the right move exists: `llms-txt.test.ts` asserts `smoke-render.ts` literally contains its route entry.
- **`PATREON_MEMBER_TIER_PRICE_LABEL` and `PATREON_MEMBER_MIN_CENTS` can silently disagree**: the /go CTA advertises the hardcoded `'$3/mo'` (`lib/membership.ts:58`) alongside `PATREON_MEMBER_TIER_CHECKOUT_URL` (`:56-57`, `rid=24880520`), while the actual entitlement floor is the operator-set env var read at `:130-133` and applied in `qualifiesForMembership()` (`:136-139`). Set `PATREON_MEMBER_MIN_CENTS=500` and /go keeps selling a $3 tier that buys nothing. The doc comment at `:53-54` says to update both *constants* on a re-price; it does not mention the env floor. Separately, `rid=24880520` is an opaque remote id — if the tier is deleted the checkout dead-ends and the test (`membership.test.ts:177-180`) can only detect drift, never staleness.
- **`NEXT_PUBLIC_SITE_URL` is still missing from Vercel Production** (operator-did probe, 2026-09-13: required present 12/13). Scripts and emails without an explicit site build localhost links; it is also needed in `.env.local`.

- **IndexNow shipped complete and is wired to nothing — `grep -c indexnow scripts/agents/run-funnel-daily.sh` returns 0**: `indexnow-submit.ts` has a dry-run default, `HARD_CAP = 500`, 0/2/1 exits, a live-key precondition and 28 tests, and no scheduled caller anywhere. Its own playbook entry names the gap ("wire `--apply --days 2` into `run-funnel-daily.sh` as a step after catalog ingest… and add `/<key>.txt` to `smoke-render.ts`"). Another rung of the documented "decision documented ≠ capability built ≠ merged ≠ live" ladder, alongside the SMTP env vars and the evening `deploy-verify.sh --check`. No live submission has happened, so the 09-28 Bing read is currently scheduled to measure a push that never ran.
- **Only the two sitewide feeds went into `smoke-render.ts`; the per-collection route and the key file did not**: `:86-87` adds `/feeds/mods.json` and `/feeds/mods.xml`, and `feeds.test.ts:234-238` asserts exactly those two strings are present in the smoke source. `/feeds/{game}/{slug}/` is live for all ~20 `SIMS4_COLLECTIONS` entries and is linked from every collection page's `<link rel="alternate">` (`app/games/[game]/[topic]/page.tsx:69-75`), and `/ee78fbc844f5b753a61535eed78c41d0.txt` is the IndexNow ownership proof — neither is fetched post-deploy. A `buildWhereClause()` regression that broke one collection's feed, or a `public/` cleanup that dropped the key, ships undetected.
- **A pre-committed numeric gate was missed and then reclassified in prose — 8.5/10 against a ≥9/10 rule**: `reports/funnel/drafts/newsletter-issue-01-2026-09-08.md` gated any real send on mail-tester ≥9/10; the 09-13 run scored **8.5**, and `playbooks/cass.md:24` records "gate met in spirit, not in digits… **QUEUED-T1 to send 2026-09-14**". The underlying reasoning is plausible — the −1.0 is DKIM (BigScoots DNS; `grep -rn DKIM lib/ scripts/agents/newsletter*.ts env.example` returns nothing, so it is unfixable in this repo) and the −0.5 is Patreon 403ing the link checker, the same false positive as 09-08. But this is the mirror image of the house rule about printing the decision rule first: the rule *was* printed in advance and then moved afterwards. A missed pre-committed gate on a first-ever bulk send to real subscribers wants an explicit operator yes, not a unilateral reinterpretation in a playbook note.
- **The postal-address blocker is closed, but `env.example`'s own default would defeat the guard that closed it**: the committed preview (`reports/funnel/drafts/newsletter-issue-01-rendered-2026-09-13.html:103`, produced by `newsletter-preview.ts --out` against the live `.env.local`) carries a real address, so `EMAIL_POSTAL_ADDRESS` is genuinely configured and the 09-08/09-09 blocker is resolved. However `env.example:91` ships `"MustHaveMods, 123 Example St, City, ST 00000"`, which `POSTAL_PLACEHOLDER_RE` (`lib/services/bulkMailer.ts:51-52`) does **not** match — it only looks for bracketed markers. Copy `env.example` verbatim and `sendBulk()` will render and send a legally non-compliant fake address with no error anywhere. Same class as the still-placeholder `your-…` values that `need()` in `_patreon-auth.ts` already catches for Patreon.
- **The unsubscribe URL must go into an email body unescaped, because the guard that checks for it uses a raw `includes()`**: `sendBulk()` verifies `message.html.includes(unsubscribeUrl)` (`bulkMailer.ts:249`) and real links carry `&t=…`, so running the URL through `escapeHtml` turns it into `&amp;t=` and the guard throws on the first render — which is exactly what happened while building `renderIssue()`. The rationale is now a comment at `lib/services/newsletterIssue.ts:180-183` with the safety argument spelled out (the URL is built by `lib/services/unsubscribe.ts` from encoded params, never from user input). Note `containsPostalAddress()` (`bulkMailer.ts:65-69`) took the opposite route and checks raw **and** escaped forms — two guards in one file with opposite escaping contracts.
- **The `providerAccountId` join fix is merged but has never produced a number, and the old number never reached a committed report either**: `patreon-members-lib.ts:143-160` computes `paidAndConnectedById` from `Account.providerAccountId ↔ relationships.user.data.id` (`?include=user`, wired at `funnel-scoreboard.ts:441-456`), keeping `paidAndConnectedByEmail` as a visible-delta fallback. But `reports/funnel/scoreboard.out` and `reports/funnel/2026-09-13.md` contain no "Patreon (Members API)" section at all — `pullPatreonApi()` failed outright that morning — and no 09-14 scoreboard exists. "0 of 31 connected" survives only in `playbooks/rio.md:23`. The 09-19 E40 read and the 09-22 Q4 gate both consume this figure; do not assume the fix has moved it until a real run prints it.
- **Six merges landed on 09-14 and the run wrote zero ledger rows and no digest — the loop broke its own "a merge without a ledger row did not happen" rule**: `reports/funnel/changelog.md`'s last row is `2026-09-13 07:04`, and there is no `reports/funnel/2026-09-14.md` or `.json` (only the two pin JSON ledgers). The team's own open PR #103 states the cause verbatim — the 09-14 digest "was one line of Quinn's stdout… after six merges consumed every turn." This is a **new class**: not a scheduled task that failed to fire (09-03, 09-06, 09-11) but budget exhaustion inside a run that did fire, which step 0e's `MISSED` detector cannot see precisely because the run executed. Five experiment IDs (E46, E47, E49, E50) are unregistered in `experiments.md` for the same reason — the rows ride in the daily PR that never opened.
- **An open PR can fall outside the queue entirely and age indefinitely**: PR #17 ("video-first ad slot on `/mods/[id]`") has been open since **2026-08-21**, is still `MERGEABLE`, says "Operator merges — do not auto-deploy" in its own body, and appears nowhere in `.claude/agents/mhm-funnel/operator-queue.md` (zero grep hits for `#17`). It predates the 09-01 autonomy system, so the queue's own rule — Tier 2 items older than 7 days get one re-pitch, then are dropped and logged — has never been applied to it. Cross-check `gh pr list --state open` against the queue, not only the queue against itself.
- **The slashless-href class is still open and the repo-wide grep now returns 7**: `grep -rn 'href={\`/' --include="*.tsx" app components | grep -v '/\`}'` at HEAD finds the four previously catalogued (`components/Navbar.tsx:110` and `:271`, `app/games/[game]/[topic]/CollectionPageClient.tsx:92`, `app/play/PlayClient.tsx:276`) plus three that were not: `app/admin/mods/page.tsx:768`, `app/top-creators/page.tsx:244`, `app/mods/[id]/ModDetailClient.tsx:231`. The last two are root-with-query (`/?creator=`, `/?search=`) and are fine; the other five 308. The in-browser `fetch('/api/…')` surface remains untouched at ~60 call sites — harmless for a browser GET/POST, fatal only for RFC 8058 one-click. That one grep, negated, is the durable guard nobody has written yet.

- **A monitor's sampling bias has a direction, and one page of 100 biased this one toward silence**: `check-pinner.sh` step 1 fetched a single `/v5/pins?page_size=100` page, which saturates inside 7 days at ~23 pins/day — it read **96** pins in 7d (→ 13.7/day → "> 14 days runway") where three pages read **162** (→ 23.1/day → 11.0 days). Understating the posting rate *overstates* the runway, i.e. the error ran toward not flagging. Fixed by paging up to `PINNER_PINS_MAX_PAGES=3` with the same early-stop rule as the scoreboard's `pullPinner()`, and the first page must succeed while a later page failing degrades to the pins already seen. When you sample a third party to compute a ratio, work out which way a short sample moves the verdict.
- **A symmetric ±5% keep-if on a must-not-fall metric flags a good outcome as a breach**: E24's rollback clause was "session RPM within ±5% of $15.67"; the 09-15 read came in at $17.83 (+13.8%) — outside the band *upward*, demand-side, and obviously not a reason to roll back membership. Rio's own grade records the fix: **RPM keep-ifs are one-sided from now on (≥95% of baseline)**. Write a guardrail threshold as a floor, not a window, unless overshoot is genuinely a failure.
- **Four existing tests were pinning the slashless-href bug in place**: `play-page.test.ts`, `Navbar.test.tsx` (×2) and `password-reset.test.ts` each asserted the *slashless* form of a URL, so the class fix had to edit them before it could pass. Each now asserts the canonical form **and** `not` the slashless one, so they cannot re-pin the regression. A test that asserts current behavior verbatim becomes a lock on the bug the moment the behavior is wrong — when a class guard fails against existing tests, check whether the tests or the code are the defect.
- **Resolved since 09-14 — do not re-file these**: (a) IndexNow is wired — `grep -c indexnow scripts/agents/run-funnel-daily.sh` returns **4** (step 0c2, right after catalog ingest), and the first live submission ran 09-15: key file verified 200/32 bytes, `--apply --days 2` → `status=OK urls=40 mods=19 collections=21 http=202`. (b) The slashless-href class is closed: 61 → 0, and the repo-wide grep's only 2 remaining hits are the exempt root-with-query cases (`app/top-creators/page.tsx:244`, `app/mods/[id]/ModDetailClient.tsx:231`). (c) The 09-14 ledger gap is backfilled — 12 of 12 merges across 09-14/09-15 now have rows, and E46–E55 are registered.
- **The evening `mhm-guardrail-evening` task is still dead — now on the record three nights running (09-12, 09-13, 09-14)**: step 0e's `MISSED` row is working as designed (silence is a row, not a prose annotation), but the task itself has fired no `check` row since 09-04 — eleven days. The mechanism that detects the failure shipped; the thing it detects has not been fixed, and it needs the operator to confirm the task is enabled at 18:30 with model Auto. Also still open from 09-13: step 0e's `MISSED` row is itself formatted `| $YDAY 18:30 | check |`, so it matches branch 1's own regex — the row is indistinguishable from a real evening check to the next consumer's query.
- **Affiliates are dead as a revenue line and the cut-or-kill date was actually executed**: E13's 09-15 read found **$0.00 EPC on 67 clicks/30d and 0 `AffiliateEarning` rows against 1,211 clicks since 2026-01-26**. The kill shipped as a placement switch (PR #107, Tier 1): mod-detail and `/go/` blocks off (16 of 67 clicks/30d), homepage grid cards kept only until a page-RPM snapshot exists. The pattern worth keeping is the discipline, not the verdict — a zero-revenue experiment on high-value page real estate got a date on 09-05 and was closed on that date rather than drifting.

- **Mediavine's per-path attribution keeps settling for hours after that day's site totals are final**: two pulls of the same window (2026-09-08→09-14) an hour apart returned **identical site totals** but moved homepage pageviews 4,364 → 4,658 (+6.7%) and homepage RPM **$10.58 → $10.12** — larger than the 3% keep tolerance the report itself prints. So a page-RPM read must **re-pull the baseline window in the same session** and compare two fresh files; comparing a fresh read against the numbers stored in `page-rpm-baseline-2026-09-16.md` will manufacture a regression. `renderMd()` ends with this instruction so the next reader cannot miss it.
- **`/mods/[id]/` and `/go/[modId]/` have no per-path ad numbers and never will**: no single mod or interstitial path earns enough in a day to enter Mediavine's top 150 under either sort order. Their Before is (a) the unseen-remainder RPM (**$9.66**, of which they are only ~9.5% of pageviews — the rest is the blog long tail) and (b) an upper bound of GA4 pageviews × site page RPM (/mods/ ≤ $70.76/7d, /go/ ≤ $3.80/7d for the window). Any change on those pages is read against the remainder floor **and** the site page-RPM floor, one-sided, never against a per-path figure.
- **GA4 `page_view` under-fires ~5.7× on client-navigated routes, so every per-page capture-rate denominator is wrong**: `/go/` fired `page_view` in only **405** sessions (588 pageviews) over 09-02→09-14 while **2,309** sessions fired `go_scroll_depth`. The same signup count reads 1.30/1K on the scroll denominator, 7.4/1K on `page_view` and 0.83/1K on any-event — i.e. the gate you pass depends entirely on which denominator you picked. Use an event that fires on every visit (not `page_view`) for any rate measured on a route reached by client-side navigation, and say which one in the Keep-if line.
- **A GA4-only traffic gain is not a traffic gain until GSC agrees**: the scoreboard's `google_organic 7d 2,404 (+32.2%)` does not appear in Search Console at all — clicks/day went 144.9 → 139.7 (−3.6%) across the same span, and the GA4:GSC ratio jumped 1.81 → 2.34. Discover was ruled out (the growth is desktop and diffuse across 1,302 landing-page rows). The two wins that *are* real are visible in GSC and are ~+45 clicks/week, not +580 sessions/week. Treat a source-level jump with no counterpart in the other source as an artifact until a second read confirms it, and do not attribute it to whatever shipped that week.
- **`isAffiliatePlacementEnabled()` distinguishes "not passed" from "passed `undefined`" via `arguments.length`** (`lib/affiliatePlacements.ts:98`) — it must stay a `function` declaration. Converting it to an arrow function, or adding a default parameter value, silently breaks the test-injection path *and* the literal `process.env` read that keeps the flag alive in the client bundle.
- **A hard-bounced address will be re-sent to, because there is nowhere to record the bounce**: the re-permission day-1 batch produced 3 `5.1.1`/`511` hard bounces out of 100 and there is **no `bouncedAt` column** on the account or waitlist tables (adding one is Tier 2). Until a code-only exclusion list exists, every later offset re-attempts the same dead addresses and later batches are judged on them. Related: the sending mailbox is the **only** observable for bounces and complaints — `notification_logs` is 0 rows all-time by design (`skipLog: true`), so the ≥20h gate read is a manual IMAP count until it becomes a script.
- **The evening `mhm-guardrail-evening` task is now dead for four consecutive nights (09-12 → 09-15) and twelve days without a `check` row**: step 0e's `MISSED` ledger row is firing correctly every morning, so the detection half works — the task itself still needs the operator to confirm it is enabled at 18:30 with model Auto. Detection shipping is not the same as the monitor working; do not let a correctly-firing MISSED row read as coverage.
- **The Pinterest queue has no writer, so pin revivals are a bridge with about five slices left**: the BigScoots crontab runs the token refresh, the banner poster and the */20 poster — **nothing runs `posts_2_supabase_server.py`**, and no server log has ever contained `Supabase sync: inserted`. The WP plugin has only `wp_ajax_mhm_*` admin buttons (no publish hook, no WP-cron), so the 268 rows on 09-04 were a human clicking "schedule" and 5 posts have published since with 0 rows. After E56's 196-row revival the reachable non-blog stranded pool is ~1,000 rows ≈ five more slices, then the queue is empty for good. Reviving inventory is not a substitute for scheduling the writer.
- **Direct catalog-URL pins do not move sessions (E1 KILL)**: the 7 collection pages pinned on 09-04 read 3/0/0/0/0/0/0 Pinterest sessions for 09-09→09-15 against a ≥20 rule — 0 of 7 pass, and later catalog pins score the same. What actually feeds `/games/sims-4/*` is **blog-post pins with internal links**: Pinterest sessions to those pages fell 1,897 → 723/7d as the 09-04 blog batch drained (pregnancy-mods 816 → 383). Pin the article, not the facet.

### Performance Insights

- **Default grid columns reduced from 5 to 4**: 5-column grid made cards too narrow on most screens. 4 columns provides better card readability while still showing plenty of content.
- **`max-w-[1800px]` with `xl:px-6`**: Slightly reduced horizontal padding at xl breakpoint prevents content from looking smushed when the ad sidebar is present.
- **Download countdown 10s > 5s for ad revenue**: Extending the /go/[modId] countdown from 5s to 10s doubles dwell time, giving ad slots time to request, render, and record viewable impressions. Improves RPM without meaningfully hurting UX on a page users are already committed to waiting on.
- **Preconnect hints for Mediavine**: Adding `<link rel="preconnect">` for exchange/keywords/video.mediavine.com and `<link rel="preload">` for the wrapper script shaves ~200-400ms off first-ad render time. Added via `wp_head` priority 1 in functions.php.
- **Mediavine sidebar sticky health score is fragile**: Score dropped to 12.9 from missing sidebars, wrong breakpoints, and placeholder divs. Three separate root causes had to be fixed simultaneously (add `<aside id="secondary">` to all page types, switch xl→lg breakpoint, remove min-h placeholder divs) to reach 50+. No single fix alone moved the needle — the score requires ALL pages to have a properly configured sidebar.

- **Incremental ingest costs nothing on a quiet day, so keep the flags even when they no-op**: `scripts/agents/catalog-ingest-daily.sh` defaults to `INGEST_SINCE_DAYS=21` and `INGEST_LIMIT=25`, and a re-run right after the 09-09 backfill selected 0 of 668 posts and exited on `Nothing to do: every matching post already has mods`. The full crawl it replaces fetched all 667 posts on every invocation. Cheap-when-idle is what makes a job safe to schedule daily.

- **Reviving stranded queue inventory beat adding new inventory**: re-dating 140 already-generated pin rows took schedulable pins from 0 → 10 and stranded 1,879 → 1,713, with expected posting cadence ~19 → ~29 pins/day, at the cost of one script run and zero new content. Before adding production capacity, check whether existing inventory is unreachable because of a consumer-side filter.
- **Bumping a sitemap route's `s-maxage` is what makes a per-request DB aggregate affordable**: `app/sitemap-nextjs.xml/route.ts` is `force-dynamic` and now runs 18 `prisma.mod.aggregate` calls (one per collection) on every cache miss, so its `Cache-Control` was raised from `s-maxage=300, stale-while-revalidate=600` to `public, s-maxage=3600, stale-while-revalidate=86400` (line 99). Freshness for a daily-changing sitemap comes from the CDN TTL, not from recomputing per request — the same trade already made for `/llms-full.txt`.

- **`unoptimized` on `next/image` is the right call for a grid of remote thumbnails**: `/play` renders 24 remote mod thumbnails per pageview (4 slots × 6 items) plus the picked-look strip; without `unoptimized` (`PlayClient.tsx:288`, `:363`) every one hits Vercel image optimization on a page designed to be loaded daily. The catalog images are already sized by their hosts and the domains are in `next.config.js` `images.domains`.
- **`export const dynamic = 'force-dynamic'` on a page whose body is 100% client-fetched costs an SSR per hit and buys nothing**: `app/play/page.tsx:4` carries it with the rationale "the episode changes daily", but the episode is fetched by `PlayClient` from `/api/game/daily` — the server render has no per-request data. A static shell would serve the same HTML. The directive matters on `app/page.tsx` (which server-renders `HomeCollections`) and on DB-backed routes; it is dead weight on a pure client shell, and `play-page.test.ts:34-36` now pins it in place.

- **Size a throughput change against the consumer's ceiling, and write the rule down before the dry run**: E46 chose 14 pins/day × 14 days = 196 rows because 14/day is under a third of the poster's ~72/day cron ceiling and below the 43/day already observed, and 14 days runs 4 days past the 09-23 inventory cliff — all stated before the dry run, not after the printout. `HARD_CAP = 200` (`scripts/agents/revive-stranded-pins.py:87`) still bounds it regardless of flags. Effect: schedulable 7 → 21, future-dated 90 → 286, stranded 1,664 → 1,468, with no new content produced — the second time reviving existing inventory beat adding any.
- **A third crawler surface takes the same CDN trade, and `/feeds/` is deliberately not under `/api/`**: the three feed routes are `force-dynamic` with `FEED_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400'` (`lib/feeds.ts:197`) and `take: FEED_ITEM_LIMIT` (50), matching `/llms-full.txt` and `/sitemap-nextjs.xml`. Because they live at `/feeds/` rather than `/api/feeds/`, the global `Cache-Control: public, s-maxage=60` that `next.config.js` applies to `/api/:path*` never applies — the route's own header is the only one in play, which is exactly the collision that bites `/api/game/daily`.

- **Size a daily submission window against the script's own hard cap, not against the default**: the IndexNow runner step passes `--days 2`, not the 7-day default, because a 7-day window already exceeds `HARD_CAP = 500` whenever a catalog backfill lands inside it — and a daily job only needs yesterday plus today. Placing the step immediately after catalog ingest (step 0c2, before the operator-did probe) means the mods created minutes earlier are the ones pushed. First run: 40 URLs, 19 mods + 21 collections, HTTP 202.
- **Reordering the kill, not deleting the surface, keeps the page-RPM question answerable**: the affiliate kill turned off the two placements with measured clicks and $0 return (mod detail, `/go/`) while leaving the homepage grid cards in place until a page-RPM snapshot exists. Removing everything at once would have destroyed the only baseline that could tell you whether the remaining placement was worth anything.

- **A placement kill switch should skip the fetch, not just the render**: `AffiliateRecommendations` returns before `/api/affiliates/match` is called and `useAffiliateOffers` returns an empty list without touching `/api/affiliates`, so switching `mod_page`/`interstitial` off removes one client request per mod-detail and per interstitial pageview as well as the block itself.
- **Where the ad money actually is, measured (E60, 09-08→09-14)**: site page RPM **$11.10** on 137,215 pageviews / $1,523.74. Blog articles **$12.97** (136 paths, 60,252 pv, 14.07 impressions/pv) are the earning surface; the homepage is **$10.12** (4,658 pv, 68.0% viewability) and only **3.1%** of ad revenue; collection pages read $7.70 at 59.2% coverage (upper bound, not a mean); the unseen remainder is $9.66. Read a bucket's RPM only where coverage is high — the report is sorted by revenue, so a thin bucket is biased toward its best earners.

### Code Quality Notes

- **Debug commits in production**: The blog search routing fix required 10+ iterative commits including debug headers and test endpoints. Consider using a feature branch for exploratory debugging to keep main history cleaner.
- **Middleware growing in complexity**: `middleware.ts` now handles admin auth, creator auth, WordPress proxying, HTML rewriting, search form action rewriting, and query param forwarding. Consider extracting WordPress proxy logic into a separate utility if it grows further.
- **Security improvement**: Admin API middleware auth (`/api/admin/*`) added as first line of defense, checking `getToken()` for both authentication and `isAdmin` flag before requests reach route handlers. This complements existing route-level auth checks.
- **Iterative Mediavine ad placement requires patience**: The /go/[modId] ad integration went through 8 commits (video inline → display fallback → DOM move → loading guard fix → double-newPageView fix → sidebar collapse → centering). Each fix revealed the next issue. When integrating third-party ad scripts, expect multi-step debugging — the script's behavior is opaque and documentation is incomplete.
- **Track analytics events where they actually fire**: The download tracking TODO was in the code but never wired up — admin dashboard showed 0 downloads. Always verify analytics events fire by checking the tracking API endpoint, not just the client-side code.
- **Regression tests for ad infrastructure**: The sidebar sticky health score test suite (`__tests__/unit/sidebar-sticky-health.test.ts`) uses 23 source-code-level assertions to catch re-introduction of known bad patterns (missing sidebar, wrong breakpoint, placeholder divs, left spacer divs, sticky/fixed CSS on sidebar). Run these after any layout change to pages with ad sidebars. This pattern — testing source code structure, not runtime behavior — is effective for preventing regressions in third-party integration patterns where the failure mode is silent (ads just don't show up, no error).
- **Collection pages registry (`lib/collections.ts`)**: When adding new page types that will be in the sitemap, commit all dependent files together. The collection pages system uses a typed registry pattern with `CollectionFacetQuery` for structured Prisma where-clause generation. The `__pregnancy_keyword__` magic value is a temporary Phase 1 workaround — replace with a proper `contentType: 'pregnancy'` facet after backfill.
- **`type-check` is never optional, even for scripts-only changes**: Vercel's `next build` runs `tsc` across everything in `tsconfig.json`, including `scripts/**/*.ts`. A type error in a standalone script that never runs in the app still breaks the production build. PR #19 shipped `[...matchAll()]` in `funnel-scoreboard.ts` and the build failed — caught by `deploy-verify.sh` before production was promoted, but it blocked the entire day's merges until PR #20 fixed it. Always run `npm run type-check` before opening any PR.
- **Revenue guardrail yellow days gate Tier 1 merges**: When the Mediavine revenue guardrail triggers yellow (revenue < 90% of same-weekday 4-week avg), the funnel team restricts itself to Tier 0 (scripts, docs, reports) and defers Tier 1 changes (app surface changes) until the next green day. This prevents compounding a demand-side dip with risky deploys. On 2026-09-02, an Aug-31 Sunday yellow was correctly diagnosed as seasonal CPM compression — no site change needed.
- **GA4 `newsletter_signup` event for capture attribution**: Fire a GA4 custom event (`newsletter_signup` with `source` parameter) on successful email subscribe so signups are visible in the funnel scoreboard and attributable to the surface that produced them (e.g., `source="go-interstitial"` vs `source="footer"`). Use the window `gtag()` function directly (PR #26, 2026-09-02).
- **Pinterest "(not set)" landing pages are real traffic, not bots**: ~61% of `(not set)`-landing sessions from Pinterest are real Pinterest app traffic where the referrer is stripped before the GA4 tag fires. Don't treat these as bot noise or discard them from analysis. True unverified bot traffic is a much smaller segment (Bing organic `(not set)` was only 802/7d vs Pinterest's 4,058/7d on 2026-08-25 to 2026-08-31).
- **First autonomous run: expect the runner itself to need multiple fixes**: The 2026-09-02 first full funnel run required 4 fix PRs (#20, #21, #29) for issues invisible in manual testing: `matchAll` spread (ES5 target), expired OAuth token, shared worktree races, `.env.local` symlink, and `node_modules` symlink tracking. Plan for at least one day of runner hardening after launch; the `deploy-verify.sh` safety net caught every issue before production was affected.
- **SEO diagnosis requires GSC monthly data, not weekly**: Weekly GSC snapshots miss the shape of a ranking collapse. The -94% Google click decline only became diagnosable when Sage pulled 16 months of monthly data and overlaid it against known core update dates. Daily data pinpointed the exact collapse day (July 8, 2025). Without the monthly trend, the team assumed it was an indexing problem (it wasn't) and would have chased the wrong fix.
- **Collection page expectedCount is a snapshot, not a constraint**: The `expectedCount` field in `lib/collections.ts` (e.g., `922` for makeup-cc) is documentation for the PR reviewer, not a runtime assertion. It communicates "we checked and this filter returns approximately N mods today." If the number drifts as mods are added/removed, no code breaks. Don't treat it as a test you need to update.
- **Autonomous daily runs on Day 2 are smoother**: After Day 1 runner hardening (PRs #20, #21, #29 on 2026-09-02), the Day 3 run (2026-09-04) shipped 5 PRs (#31–#35) with zero fix PRs needed. All 5 deploys verified PASS. The runner infrastructure investment pays off quickly — once the worktree isolation, auth preflight, and build checks are in place, the daily loop is reliable.
- **Decompose revenue drops into sessions vs RPM before reacting**: A -10.1% revenue shortfall can be 89% sessions-driven (Pinterest taper) and only 1.2% RPM-driven. The correct response differs: sessions-driven means traffic acquisition is the lever, not ad layout; RPM-driven might mean a deploy broke something. Rio's three-yellow diagnosis (PR #39, 2026-09-05) showed improving deltas (-19.7% → -13.5% → -10.1%) — no site change needed, just seasonal traffic normalization.
- **Affiliate placements need a cut-or-kill date, not indefinite holding**: 53 clicks in 30 days with $0 EPC = no signal. Rio set a 09-15 read date: if EPC is still $0, cut placements to avoid earning-page clutter. Don't let zero-revenue experiments run indefinitely on high-value page real estate.
- **Email campaigns via existing SMTP, not SaaS**: BigScoots hosting includes SMTP mailbox access. Using nodemailer over SMTP avoids per-contact SaaS fees (SendGrid, Mailchimp). Requirements: throttled batches under the provider's rate limit, List-Unsubscribe headers (CAN-SPAM), re-permission before any bulk send to dormant accounts (PR #47, 2026-09-05).
- **Runner infrastructure stabilizes by Day 4**: Day 1 (2026-09-02): 4 fix PRs. Day 2 (2026-09-04): 0 fix PRs. Day 3 (2026-09-05): 1 fix PR (#46, false-alarm rollback). The pattern: initial deployment surfaces novel failure modes, each fix permanently hardens the system. By Day 4, expect the runner to be reliable enough that fix PRs are exceptional, not routine.
- **Operator wants board-member optics, not decision gates**: On 2026-09-05 the operator asked "why so many Vercel deployments?" — he wants to understand the business value of each change, not approve/deny each one. Every digest "Changed today" row now ends with "why: <funnel stage, expected metric impact>" or "paper trail only — no change to the site" (PR #44). Frame autonomous work for a busy executive reading a digest, not a technical peer reviewing code.
- **Subscriber source attribution reveals capture funnel surface effectiveness**: The `source` param on GA4 `newsletter_signup` events shows which surfaces convert: footer (16 subs), collection-page (1), go-interstitial (1), mod-detail (0 — E10 just launched). Use this to decide where to invest next capture surface effort. Surfaces with high traffic but zero conversions after 2 weeks should be redesigned or removed. The scoreboard's "Subscribers by source" row makes this visible daily.
- **Distinguish failure categories before automating rollback**: Two false-alarm rollbacks in 24h (09-04 evening, 09-05 PR #45) had different root causes — network timeout vs missing dependency — but both triggered the same "site is down" response. Each fix (PR #46) only addressed one class. When building automated safety nets, enumerate distinct failure modes (can't run, network error, HTTP error, content error, ad-slot missing) and assign each a separate response policy. "Something went wrong" is not a rollback trigger; "pages return 5xx" is.

- **Every automated safety net must enumerate its failure classes and give each one a policy**: PR #56 is the *fourth* fix in this class — (1) un-runnable smoke check, missing Playwright → INCONCLUSIVE (PR #46); (2) network-level `ERR_TIMED_OUT` across all pages → retry after a delay, still unfixed as its own class; (3) preflight conflating `CLI_TOO_OLD` with `AUTH` (PR #54); (4) uncaught errors from third-party origins → warning, not failure (PR #56). Each fix addressed exactly one mode and left the rest. The cost is concrete, not theoretical: the auth-vs-version conflation blocked the daily run for two days, and the third-party-error bug rolled back production over a docs-only merge. When you add a new automated check, write down the distinct ways it can be wrong *before* wiring it to a destructive action.
- **"Decision documented" ≠ "capability built" ≠ "capability merged" ≠ "capability live"**: the four-state ladder, with the 2026-09-08 resolution of the two examples that motivated it. The newsletter SMTP work (PR #49) and the homepage SSR shell (PR #48) both **merged to main on 2026-09-08** — the homepage now serves a real `<h1>` and collection links in first-byte HTML. The SMTP path is merged, deployed, and still **inert**: 0 of 5 `SMTP_*` vars exist in Vercel Production, so `transport()` falls through to `'none'` and `sendBulk()` only console.logs. Do not attribute GSC movement to the homepage before its first post-09-08 recrawl, and do not attribute any subscriber activity to the newsletter until the env vars are set.
- **Junk-tagged facets are a real data-quality hazard for collection pages**: the `lighting` (140 mods) and `curtains` (7) facets are mis-detected — the top `lighting` rows are a GShade preset, a skin overlay, and a Ford Crown Victoria — which is why `decor-cc` (PR #51) uses `contentTypeIn: ['decor','plants','rugs','wall-art']` and deliberately excludes them. Spot-check the top rows of any facet before it backs a landing page; `expectedCount` alone tells you nothing about whether the mods are *right*.
- **Batch paper-trail merges into one PR**: 10 of 18 merges over 09-02→09-05 changed only `reports/`, `.claude/`, `docs/` or `*.md`, and each one rebuilt and republished the site. The proper fix (a `vercel.json` `ignoreCommand`) is Tier 2 because `vercel.json` is operator-owned config, so the interim discipline is to fold docs-only changes into the daily-run PR — 1 deploy instead of N.

- **Ship the source-level guard test in the same PR as the feature it protects**: the `NEXT_PUBLIC_MEMBERSHIP_ENABLED` bug produced zero errors anywhere in the stack and was caught only by diffing a compiled client chunk and doing a logged-out headless render. `__tests__/unit/membership.test.ts` now asserts by regex that `lib/membership.ts` contains `: process.env.NEXT_PUBLIC_MEMBERSHIP_ENABLED` and does **not** contain `process.env[MEMBERSHIP_FLAG]`, and that `GoClient.tsx`/`Navbar.tsx` call `isMembershipEnabled()` with no arguments. `sidebar-sticky-health.test.ts` got the same treatment for the two-file homepage split (PR #48): `app/page.tsx` has no `'use client'`, exports `dynamic`, and renders `<HomePageClient`; `HomePageClient.tsx` is `'use client'`, contains `id="secondary"`, and has no `if (loading) return` gate. For any failure mode whose symptom is silence, the guard belongs in the feature PR, not a follow-up.
- **A verification must look at what a logged-out visitor is served, not at what the pipeline reports about itself**: on 2026-09-08 two changes were "verified" and simultaneously not live — production served the pre-rollback build for 21.6h behind three PASS ledger rows, and the Patreon perk passed every server-side check (`/api/auth/providers` correctly listed `patreon`) while the client flag was `undefined`. Both cleared every automated check that existed. Any check that only asks the deploy pipeline about the deploy pipeline can be green through a total outage of the thing it is supposed to be watching.
- **A cleanup script must not reuse the failure mode it is cleaning up**: `scripts/retag-junk-build-facets.ts` re-detects from the **title only**, never the description, because description-only inference is precisely what created the mis-tags. Dry-run is the default (`--apply` required), `MAX_ROWS = 5000` caps the blast radius, rows whose decided type equals the current one are skipped, writes are batched per destination facet via `updateMany` for one auditable line each, and a `low`/no-match result writes `NULL` on the stated principle that dropping a mod out of every facet beats polluting one.
- **`env.example` has drifted from what the newsletter code actually reads**: `UNSUBSCRIBE_SECRET`, `UNSUBSCRIBE_MAILBOX`, `SMTP_HOURLY_LIMIT`, `SMTP_MAX_CONNECTIONS`, `SMTP_MAX_MESSAGES`, `EMAIL_FROM` and `NEXT_PUBLIC_SITE_URL` are all read in `lib/services/` but appear nowhere in `env.example` (only the four core `SMTP_*` vars do). Two consequences worth knowing: `UNSUBSCRIBE_SECRET` silently falls back to `NEXTAUTH_SECRET`, so **rotating `NEXTAUTH_SECRET` invalidates every outstanding unsubscribe link** unless it is set explicitly; and `SMTP_HOURLY_LIMIT` is clamped to 100 no matter what you set. Add a var to `env.example` in the same PR that introduces the read.
- **CAN-SPAM compliance is a placeholder, not an enforced invariant**: `scripts/agents/newsletter-send-test.ts` hardcodes `ADDRESS_LINE = 'MustHaveMods · [postal address required by CAN-SPAM — operator to supply]'`, and `bulkMailer.ts`'s "refuses to render" guard checks only for the unsubscribe URL, not for the placeholder. A real send using that script as-is ships a non-compliant email. The unsubscribe URL check proves the pattern works — extend it to the postal address before the first bulk send.
- **Gate a first bulk send on a mail-tester score, and expect the deductions to be infrastructure, not copy**: the newsletter went 5.0/10 → 7.5/10 after fixes, against a **≥9/10 gate before any real send** (`reports/funnel/newsletter-smtp-readiness-2026-09-08.md`). The +2.5 SpamAssassin hit was `FONT_INVIS_MSGID` from a **white-on-white preheader** — the standard email-design trick for hiding preview text is itself a spam signal. What remains is all outside the repo: no DKIM, DMARC at `p=none`, and a shared BigScoots IP on a minor blocklist. Budget for DNS/provider work, not another copy revision.

- **Health-check wrappers keep the three-exit-code discipline, and always write one falsifiable summary line**: `scripts/agents/catalog-ingest-daily.sh` documents `0 = ran (possibly nothing to do)`, `1 = scraper failed`, `2 = could not run`, and emits `COULD-NOT-RUN reason=date-arith|no-env-local|no-node-modules` for the three preconditions it can detect (including a macOS `date -v` → GNU `date -d` fallback). Every path appends exactly one line to `logs/catalog-ingest.log`, and the runner tails that line into its own log — so "did not run" can never be silent. This is the same 0/2/1 shape as `pinterest-token-status.py`.
- **A read-only analytics script should fetch PII only to join, then never print it**: `scripts/agents/patreon-churn-read.ts` includes `email` in `MEMBER_FIELDS` solely to build `activeEmails` and count `Account.provider='patreon'` rows matching a currently-active patron; the report prints only integers (`connected`, `paidAndConnected`, `premium`). The header comment states the invariant outright ("prints aggregates only — never an email, name, or id") and a `--no-db` flag lets it run with no database access at all. Copy this shape for any script that reads a third-party member list.
- **The source-level guard test now covers the shipped script, not just the library**: `__tests__/unit/bulk-mailer.test.ts` (24 → 34 tests) added a `describe('the shipped send script')` block that `readFileSync`s `scripts/agents/newsletter-send-test.ts` and asserts it calls `resolvePostalAddress()` and no longer contains `const ADDRESS_LINE = 'MustHaveMods · ['`. `__tests__/unit/llms-txt.test.ts` does the same twice — asserting `app/llms-full.txt/route.ts` matches `/export const dynamic = 'force-dynamic'/` and *not* `/force-static/`, and that `scripts/agents/smoke-render.ts` literally contains `{ path: '/llms-full.txt', kind: 'text' }` so the new route cannot silently fall off the post-deploy smoke list. Guard the caller and the monitoring wiring, not only the function.
- **An `env.example` comment should name the failure mode, not the purpose**: PR #70 closed 8 of the documented drift — `EMAIL_FROM`, `EMAIL_POSTAL_ADDRESS`, `SMTP_HOURLY_LIMIT`, `SMTP_MAX_CONNECTIONS`, `SMTP_MAX_MESSAGES`, `UNSUBSCRIBE_SECRET`, `UNSUBSCRIBE_MAILBOX`, `NEXT_PUBLIC_SITE_URL` — each annotated with its consuming file and what breaks: `SMTP_HOURLY_LIMIT` is "clamped in code to `DEFAULT_HOURLY_LIMIT` (100); setting this above 100 has no effect," and `UNSUBSCRIBE_SECRET` is "falls back to `NEXTAUTH_SECRET`… set the SAME value in `.env.local` AND Vercel Production." Still deferred: `/api/subscribe/confirm` does not exist yet (the re-permission link is a labelled `PREVIEW-NOT-LIVE` placeholder), and no real bulk send has happened — the ≥9/10 mail-tester gate is still open on DKIM/DMARC.
- **The content-type detector has no rules for careers, aspirations or traits**: 81 of the 486 mods backfilled on 09-09 landed with `contentType = NULL`, all from the four gameplay-"mods" posts (social-media, phone, funeral, moving). A single `gameplay-mod` rule matching career/aspiration/trait title patterns would tag ~70 of the 81. Until it exists, expect gameplay-mod posts to contribute rows that are searchable but appear in no collection facet.

- **An env-var-configurable output path must be threaded at every call site — redirecting stdout is not the same as controlling a script's own file writes**: `run-funnel-daily.sh` redirected `funnel-scoreboard.ts` stdout into `$WT/reports/funnel/scoreboard.out` correctly, but the script's *internal* dated writes (`$TODAY.md`, `$TODAY.json`) defaulted to the operator tree, so the `cp` step immediately after found nothing and the scoreboard was regenerated by hand on 09-04, 09-08 and 09-09 before anyone traced it. Fixed by invoking it as `MHM_PROJECT_DIR="$WT" npx tsx scripts/agents/funnel-scoreboard.ts`.


- **The compound-keyword double-count is a *separate* bug from the plural double-count, and stem-collapsing does not catch it**: `'social interaction'` and `'interaction'` have **different stems**, so the 09-08 fix left them both counting. `matchedKeywordsIn()` in `lib/services/contentTypeDetector.ts` now also drops any matched keyword whose stem is contained inside another matched keyword's stem in the same rule; PR #79 additionally removed the four redundant compound spellings outright (`gameplay mod`/`gameplay`, `social interaction`/`interaction`, `trait mod`/`trait`, `career mod`/`career`). One incidental phrase like "a new social interaction" was scoring 2, crossing the ≥2-description-matches → `medium` confidence promotion on its own. Test: `'does not let a compound keyword and the word it contains count twice'` asserts `matchedKeywords.length < 2`.
- **Bare adjectives keep getting caught on the second pass, not the first**: `realistic` was removed from the `gameplay-mod` rule because it matched 32 titles spanning beards, skins, shorts and houses, outranking `lot` (12 matches) and stealing "Suburban Realistic Houses". The duplicate `pregnancy` keyword was also dropped — the priority-103 rule always wins, so it could never fire. The fix added only nouns a gameplay mod is actually named after (`career`, `aspiration`, `trait`, `overhaul`, `side hustle`, `life mod`, `map replacement`, `social bunny`) plus `negativeKeywords: ['career outfit', 'career dress', 'career wear', 'career set', 'trait pose']` to exclude CC merely *themed* after a gameplay concept. Result: facet coverage 97.22% → 97.62%, NULL rows 455 → 390 (65 re-tagged), detector tests 21 → 30. The E33 read on 09-24 requires a 20-row spot-check of the re-tags, not just the coverage number.
- **Keep shared registry files out of agent PRs and fold their rows into the daily PR**: on 09-10 two Tier 1 PRs (#76, #77) carried `experiments.md` / `operator-queue.md` edits that would have collided with the daily run PR; both agents restored those files to `origin/main` on request and the GM folded 4 rows (E32–E35) into the daily PR, losing none. This cost two follow-up messages — the durable fix is a line in the dispatch prompt, the same move as centrally allocating experiment IDs.
- **Two consent-bearing tokens derived from one key must be domain-separated, and asserted both ways**: PR #76 (Cass, E34 — **queued Tier 1 as of 09-10, not merged**; the design is recorded in `.claude/agents/mhm-funnel/experiments.md`) adds `signPurposeToken(purpose, email)` in `lib/services/unsubscribe.ts`, signing the message `<purpose>:<email>` with the same key, so a confirm token can never be replayed as an unsubscribe token or the reverse — tested in both directions — while the existing unsubscribe derivation is left byte-identical so links already in inboxes still verify.
- **A compound review with nothing to compound is itself the finding**: the 24h window ending 2026-09-11 held exactly one commit — the previous compound review. No feature commits, no `reports/funnel/2026-09-11.*`, no `logs/funnel-daily.log` entry, and two PRs whose auto-merge date came and went. When the daily log is empty, the review's output belongs in Gotchas (what failed to run) rather than in a summary of what shipped; "quiet day" and "the automation did not execute" look identical from `git log` alone and have to be told apart by checking the runner log and the open-PR list.
- **Offline route-handler tests with mocked Prisma and a mocked notifier, but *real* crypto, are the right shape for auth-adjacent work**: all 28 tests in `__tests__/unit/password-reset.test.ts` exercise the actual route handlers and actual `createHash`/`randomBytes` against `vi.mock('@/lib/prisma')` and `vi.mock('@/lib/services/emailNotifier')` — zero network, zero DB. They verify three lifecycle properties a naive "does the token exist" test misses: single-use via `deleteMany` returning `count: 0` on replay, prior tokens retired before a new one is created (asserted via `invocationCallOrder`), and weak passwords rejected *before* the token is looked up so a client-side typo does not burn a single-use link.
- **Write the guard against the constant, not against a copy of its value**: `__tests__/unit/bulk-mailer.test.ts` was changed from string-matching the confirm URL to asserting `/buildConfirmUrl\(/` in the caller plus reading `CONFIRM_PATH` directly out of `lib/services/subscribeConfirm.ts`. A guard that duplicates the literal it is guarding will pass happily while the two drift — which is precisely how the missing trailing slash survived its first review.
- **Ship the fix for the *class* alongside the fix for the instance**: PR #87 repaired the 2 dead rows, added `check-pinner.sh` step 6 so the same failure is caught the morning it happens, *and* taught `revive-stranded-pins.py` to drop dead-section rows so the revival script can never re-create the problem. The remaining piece — teaching the poster to retry on the board root and to skip rather than wedge — is a `.patch` staged against the separate operator-owned `MHMUtils` repo (`reports/funnel/drafts/q8-pin-poster-hardening-2026-09-12.{md,patch}`, `git apply --check` clean against `f534a02`), because MHMUtils deploys by `scp` and is Tier 2. **Packaging a verified patch for a repo you may not merge into is a deliverable, not a punt** — but it is also not a fix until someone applies it, so do not count it in the "before" of the next read.
- **A missed run must re-run the whole ship gate, not auto-merge stale approvals**: PRs #76 and #77 carried 24h vetoes that expired unexecuted when the 09-11 run never fired. The 09-12 run did not simply merge them — it re-validated each against that day's `main` (type-check, build, full test suite) first, then merged. A time-based approval whose executor skipped a day says nothing about whether the branch still applies cleanly.
- **`~/.claude/scheduled-tasks/` is a protected path, so update a scheduled task through the scheduled-tasks MCP, not `cp`**: Q7(a) could not be installed by copying the tracked launcher into place even from an interactive session; it went in via an `update_scheduled_task` MCP call at 07:15 on 09-12. Worth remembering for any future "change what a scheduled task executes" problem — and it is the mechanism that finally got the tracked launcher running (the 09-12 log reportedly shows `prompt=<worktree>/scripts/agents/funnel-daily-prompt.md`, `npm ci ok in …` x5, `Catalog ingest (incremental)` with 25 mods created — the **first scheduled ingest ever** — and `Operator-did probe`). Flagged as claimed-not-verified here: `logs/` is gitignored and absent from review worktrees, so this compound review could not read the log itself.
- **An operator directive belongs in the agent contract verbatim, not paraphrased into a policy**: `.claude/agents/mhm-funnel/autonomy.md` now quotes the 09-12 "never-stall" instruction directly — *"I don't like the idea of you skipping days because you are waiting on me... For blockers or big decisions, yep you can bring those up."* — and encodes it as: waiting is never a move, only Tier 2 items pause, and a paused item is re-pitched once at day 7 then dropped. It targets exactly the failure mode above, where idle days let approved PRs sit open, indistinguishable from blocked ones.
- **The newsletter v2 "no gradients" revision is an operator aesthetic call, but it deleted the one line that encoded a real email gotcha**: v1 shipped `background:linear-gradient(135deg,#8B5CF6 0%,#EC4899 100%);background-color:#a855f7;` — the `background-color` exists because Outlook desktop's Word rendering engine ignores CSS gradients entirely and needs a solid fallback declared alongside. Both are gone now (the operator's words: "I HATE gradients or AI looking things"), but keep the fallback rule in mind for any future email CSS. Separately, the bulk send is **still hard-blocked**: `EMAIL_POSTAL_ADDRESS` in `env.example:91` is still a placeholder and `POSTAL_PLACEHOLDER_RE` throws on it even in dry run, and the ≥9/10 mail-tester gate on DKIM/DMARC remains open.

- **Fix the class in the same PR as the instance — the /play routing fix is a counter-example**: PR #84 found that a missing `NEXTJS_PREFIXES` entry silently proxies a new route to WordPress, then wrote a test that hardcodes `'play'` (`play-page.test.ts:89-95`). Two sibling routes shipped two days earlier (`forgot-password`, `set-password`) were *already broken by the same mechanism* and the new test cannot see them. The class test is one line of intent: assert every dot-free top-level directory under `app/` (minus `api` and `components`) appears in `NEXTJS_PREFIXES`. Compare PR #87, which repaired the dead pin sections, added the morning check *and* taught the revival script never to recreate them.
- **`expectedCount` drift is user-facing, not just a stale comment**: `expectedCount: 633` (`lib/collections.ts:281`) is asserted nowhere (`grep expectedCount __tests__` → no hits, by design), but the same number is baked into the collection's human-visible intro copy (`:276`) and the metaTitle says "600+". A re-tagging run that moves hundreds of rows — exactly what `retag-null-content-types.ts` does — turns the page copy into a claim the grid contradicts. Treat the count in prose as a separate liability from the constant.
- **Send an agent the contradiction, not the flag**: the day's only 🔴 came with a second signal pointing the other way (the queue had drained 56 → 21, so pins *were* posting). Quinn dispatched the contradiction as a hypothesis — "last posted = max(scheduled Post Date), queue fell 56→21" — rather than "the pinner is down", and Pip confirmed it a false positive and shipped a 13-test fix before 11:00. A monitor disagreeing with a second measurement is a claim to test, not an outage to respond to.
- **Serialize merges of agent PRs that touch the same file, and re-validate the second on the new main**: Pip and Rio both edited `funnel-scoreboard.ts` on 09-13; Nova's `/play` PR had a real conflict with the E37 sitemap `lastmod` change that `gh` reported as CONFLICTING. Two of the day's five merges needed hand resolution. This is the same-file corollary to the existing ≥60s (comfortably ~4 min) merge-spacing rule, which exists for a different reason (Vercel coalescing builds and losing per-PR ledger attribution).
- **A monitor's absent-flag case deserves a flag of its own**: `section('patreonApi', pullPatreonApi)` (`funnel-scoreboard.ts:609`) degrades to `_unavailable: …_` in the body of the report, but unlike Pinner and Mediavine it pushes **no 🟡 into the Flags section** — the part of the digest the operator reads first. A Patreon outage is therefore invisible at the top of the page while two decision gates silently read stale or missing numbers.


- **The four tests red on `main` since 09-12 are fixed, and the full suite is green at 894/894**: `fb238e2` moved `/sims-4-pregnancy-mods/` and `/sims-4-y2k-cc/` out of `seo-phase1.test.ts`'s redirect assertions into `keepLivePages`, and flipped `llms-txt.test.ts:104-113` to assert the pregnancy guide **is** cited — both matching PR #63's deliberate un-consolidation. Verified at HEAD: `npx vitest run` → 50 files / 894 tests passing, `npm run type-check` exit 0. Note *how* it was fixed: the repair rode along inside an unrelated feature PR rather than being caught by the ship protocol, which still runs only `sidebar-sticky-health.test.ts`. Fourth instance of a suite sitting red for days for that reason.
- **"Symmetric" in the E40 fix means the same statistic, not the same window — check which one a fix actually unified**: both sides of the `patreon_click` comparison now use `meanDailyUsers()` (`patreon-members-lib.ts:225-231`), `sum(daily distinct users) / days`, replacing a 7-day GA4 `totalUsers` (deduped across the whole window) divided by 7, which reads systematically low. The *windows* stay deliberately different — `patreonClick7d` spans `daysAgo(8)`→`daysAgo(2)` (`funnel-scoreboard.ts:155-156`) while `E40_CLICK_BASELINE` is frozen at the 4-day 09-08→09-11 anchor of 8.75 (`patreon-members-lib.ts:79-91`). The 09-13 note called this a 7d-mean-over-4d-mean mismatch; what was actually broken was the numerator's arithmetic, and that is what got fixed.
- **A degraded-integration flag now fires in the Flags section, with a distinct partial case**: `funnel-scoreboard.ts:707-710` pushes `🟡 Patreon Members API unavailable` into Flags — the part of the digest the operator reads first — when `!patreonApi.ok`, plus a second `🟡` when `paid > 0 && paidWithUserId === 0`, i.e. `include=user` silently stopped returning ids and the join fell all the way back to email. Closes the 09-13 note that `section('patreonApi', …)` degraded invisibly in the report body. Caveat: the second check fires only on *total* id loss; partial degradation where some rows carry ids shows up only as the body table's `paidWithUserId` count.
- **`readEnvFile()` is now written three times**: `scripts/agents/indexnow-submit.ts:54-68` reimplements the dotenv-line parser that already exists in `funnel-scoreboard.ts:80`, differing only in which var it extracts (`DATABASE_URL` vs `DIRECT_DATABASE_URL`). A fix to one — `export FOO=bar` lines, `\r\n` endings, multiline values — will not reach the other. Same shape as the triplicated `LOOKBACK_DAYS = 14` (`revive-stranded-pins.py:83-84`, `check-pinner.sh`, and `BACKLOG_LOOKBACK_DAYS` in the separate MHMUtils repo), which neither of today's PRs touched. Extract to a shared helper the next time either is edited.
- **A field rename bridged at the call site compiles clean and produces wrong URLs**: `getAllCollectionRoutes()` (`lib/collections.ts:531-537`) returns `{ gameSlug, topicSlug }` while `collectionUrls()` (`indexnow-lib.ts:68-70`) calls `collectionHref({ gameSlug: r.gameSlug, slug: r.topicSlug })`, hand-renaming `topicSlug` → `slug`. Correct today only because `topicSlug: c.slug` is a straight passthrough; both fields are `string`, so a future rename of either would type-check and silently submit wrong URLs to IndexNow.
- **`newsletter-preview.ts --out` writes live env-derived output straight into a git-tracked file**: `:45-47` renders with `resolvePostalAddress()` reading the real `.env.local`, and `--out <path>` (`:59-62`) writes it verbatim with no redaction step — which is how the business address ended up committed in `reports/funnel/drafts/newsletter-issue-01-rendered-2026-09-13.html`. Harmless here because CAN-SPAM requires that address to be public, but the script draws no line between "safe to commit" and "not": any future `RenderContext` field sourced from a secret leaks by the same path with no code change required.
- **`ISSUE_01`'s trailing slashes are hand-edited literals with no guard**: the mail-tester link checker exposed four `/mods/<id>` links answering 308 and they were fixed in place (`lib/services/newsletterIssue.ts:336,343,350,357,364,376`), but `__tests__/unit/newsletter-issue.test.ts` has zero assertions on URL shape. The repo's own rule is to guard the constant, not a copy of its value; here the fix is a literal that regenerating `IssueData` from the DB — the stated plan for issue #2 — would silently undo.

- **A constant duplicated across a TS/shell boundary finally got a value-level source guard**: `pinner-liveness.test.ts` (13 → 25 tests) now asserts the two consumers *agree on the numbers* — runway horizon, low-runway floor and page count — and that the E20 literals are gone, rather than merely asserting `check-pinner.sh` mentions the variable name. That weaker form is what let the previously-catalogued triplicated constants (`36`, `14`, `20`) drift past CI. When you mirror a constant into a second language, the test must compare values, not names.
- **A monitor rewrite should carry the reasoning in the file, dated, with the numbers that disproved the old rule**: the 40-line header comment above `assessRunway()` (`pinner-liveness-lib.ts:147-159`) records the exact mornings the old threshold misfired (6 / 7 / 10 schedulable against 39 pins in 24h), why (E26 10/day + E46 14/day drip-dating), and when the new rule will honestly go low (~09-25, when the E46 slice ends 09-27). The next person to see a 🟡 has the falsification test in front of them instead of re-deriving it.
- **Three of five agent moves in one day were "the number we were reading was wrong," not "something broke"**: the pinner 🟡 was a threshold error, "0 paid-and-connected patrons" turned out to be true rather than an email-join artifact, and the newsletter had shipped with no record of it. The house rule that produced all three — dispatch the *contradiction* ("flag says X, second measurement says Y") as a hypothesis rather than the flag as an outage — is now also in `playbooks/quinn.md` with the instruction to budget the agent for a class fix, not a re-read.

- **Switch it off, don't delete it, when the experiment might be re-run**: E55 kept `AffiliateRecommendations`, `AffiliateCard`, `/api/affiliates/*` and the click tracking intact and changed only four mount conditions plus one new pure module. The whole rollback is one line in `DEFAULT_PLACEMENTS` (or one env var), the click data keeps accumulating for the homepage-grid decision that is still open, and nothing had to be rebuilt from git history when the read comes due on 09-29.
- **A per-page test is a second copy of the rules, not coverage**: `/play` shipped with the sidebar assertions re-implemented inside `play-page.test.ts` instead of a row in `PAGES_WITH_SIDEBAR` — which reads as thorough and is precisely how the page stayed outside the suite for four days. When a rule already has a central registry, the move is to add a row; the durable fix is a scanner that makes an unregistered file fail. Same shape as the `NEXTJS_PREFIXES` completeness scan.
- **Strip comments before locating markup — two of the three sidebar sections were measuring a JSX comment**: on `CollectionPageClient.tsx` the capture-surface comment names `<aside id="secondary">` 26 lines above the real element, so `indexOf('id="secondary"')` on raw source found the documentation. `stripComments()` now runs first in sections 2b/3/5, which is also what makes `app/page.tsx` correctly drop out of the scan (its header JSDoc names the aside; the element lives in `HomePageClient`). Third guard test in this repo to need the same preprocessing.
- **Fold docs-only agent PRs into the daily PR**: two paper-trail PRs (#112, #113) were merged into the daily run instead of shipping alone — each standalone docs-only merge still costs a ~4-minute merge-spacing window and a full deploy-verify cycle on a build that cannot change the site. Five merges on 09-16, all PASS, no rollback.

---

*Last compound review: 2026-09-16*

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
| 1 | *"Always check if you broke something — Vercel logs during deployment, or viewing WordPress. You can restore from WordPress backups or roll back Vercel."* | `scripts/agents/deploy-verify.sh --after-merge --sha <commit>` runs after **every** merge: waits for the Vercel build, renders `/`, `/mods`, `/mods/[id]`, `/go/[id]`, blog, sitemap and llms.txt in headless Chromium (`smoke-render.ts`), checks Mediavine loader + `aside#secondary` + `.mv-ads`, runs `check-blog-sidebar.sh`, counts 5xx in Vercel logs. Failure → automatic `vercel rollback` to the previous READY deploy and/or `push-blog-functions-prod.sh --yes` to restore `functions.php` from git, then re-check. `--check` runs again every evening. |
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
