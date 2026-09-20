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
- **Serialize automated merges** (~4 min apart) or Vercel coalesces builds and the ledger loses
  per-PR attribution. Re-validate the second PR on the new `main` when both touch one file.
- **`npm run type-check` is never optional** — Vercel type-checks every `.ts` under `scripts/`.
- **A merge without a ledger row did not happen** — and the row must be written by the step that
  merges, not by a later step of the same run. On 09-19 seven PRs landed on `main` and **one**
  (#123) has a row; #116, #117, #118, #119, #121 and #122 have none.
- **Appending to a file in a working tree is not a record — only a commit on `main` is.**
  `ledger()` in `deploy-verify.sh` writes its row into *three* trees (`$ROOT`,
  `$FUNNEL_PRIMARY_WT`, `$OPERATOR_DIR`) and never runs `git add`/`commit`/`push`, so all three
  copies are uncommitted edits that reach `main` only if some later agent's PR happens to carry
  them. Three copies of a non-durable write is not redundancy — it is three chances to lose the
  same row. Same shape as `history.json`, whose only path to `main` is a natural-language
  instruction in `funnel-daily-prompt.md` telling the agent to remember to `git add` it.
- **Durable means "on `main`", not "committed".** A commit stranded on an unmerged agent branch is
  the same loss class as an uncommitted worktree edit — only cheaper to recover. **Cherry-picking
  stranded work onto another unmerged branch is not recovery** — it doubles the bookkeeping and
  changes nothing: `ce7c111` (the operator's blanket "approve all #2 items") was copied to
  `65e1756` on the next day's branch and *both* are still off `main`, so the approval does not
  exist as far as the repo is concerned. Land it or it is not real.
- **A "did not fire" detector must not live inside the job it reports on.** The evening-guardrail
  MISSED row is written by step 0e of the *morning* run, so it went silent for exactly the three
  evenings the morning run was broken.
- **Never widen an already approved item to carry an adjacent fix** — queue the fix as a new item.
  The operator approved the narrower description, not the one you discovered mid-flight.
- **A dry run only proves the thing it prints.** Confirm the preview actually exercises the field
  the change alters; a green dry-run that never touches the modified field is a false signal, and
  needs a separate verification query that reads the changed field.
- **Canonicalize a host with an exact allowlist on the parsed host**, never a substring or prefix
  test, or `musthavemods.com.evil.example` gets rewritten too. Normalize only the *outbound public*
  URL field — an API's own endpoint host must keep pointing at whatever actually serves it.

### 2026-09-18 — the run that merged and left no record

- **The 09-17 fix was applied halfway: the operator's reply got a commit, and the commit never got
  to `main`.** Yesterday's finding was that human input captured only as a working-tree edit is
  indistinguishable from work never done. Today Quinn did commit it — `ce7c111`, "capture operator
  reply 2026-09-17 (approve all #2 items)" — onto `funnel/quinn/daily-2026-09-18`, where it still
  sits with **no PR and no merge**. `git merge-base --is-ancestor ce7c111 main` → false. The
  operator's standing approval for every queued #2 item exists only on a side branch. Committing is
  not the durability property; **landing on `main` is**.
- **The run merged two PRs and then died before the paper trail, so production changed with no
  record that it changed.** #116 (`d3ca7a4`, 07:10) and #118 (`c850229`, 07:13) are on `main`;
  `reports/funnel/changelog.md` still ends at **2026-09-16 07:03**. #118 is not docs — it ships
  `lib/collections.ts` and `lib/services/contentTypeDetector.ts` and a live route
  `/games/sims-4/jewelry-cc/` — so there is also no evidence rule 1 (verify after every merge) was
  satisfied for it. The merge is permanent and atomic; the ledger row is a later step of a
  multi-step agent turn that can end at any point. **Couple the row to the merge, or the two
  reliably disagree in the one direction that matters.**
- **Rio's work is a third artifact in the same state, and nothing flags it.** PR #117 (Mediavine
  DOM guard, `b5e7cb0`) is still **OPEN** — branch pushed, PR filed, never merged, no digest, no
  queue entry. Between this, `ce7c111`, and the nine orphan `compound/*` branches already
  catalogued, the repo now has a standing population of finished agent work that reached `origin`
  and stopped. An automated run needs a closing check that its own branches are either merged or
  explicitly deferred with a reason.
- **The MISSED detector went quiet on precisely the days it was needed.** The evening-guardrail
  "DID NOT FIRE" rows run 09-12, 09-13, 09-14, 09-15 — and then stop. Nothing for the 09-16, 09-17
  or 09-18 evenings, because step 0e writes that row from inside the *morning* funnel run, which
  died on 09-17 and ended early on 09-18. A monitor-of-a-monitor hosted in the same process as the
  thing that breaks reports health by omission. The evening task itself has now written no `check`
  row since **2026-09-04 (14 days)**.
- **Two automations still edit `CLAUDE.md` and push to `main` independently**, and a second
  compound session was observed live in this window alongside this one. Only `auto-compound.sh`'s
  no-op has kept them from colliding; the collision is a scheduling accident away.
- **Packaging beats describing when automation cannot execute the change.** Q11 is the shape to
  copy for anything outside the Vercel pipeline (here a separate `MHMUtils` repo on an SSH-only
  BigScoots box): a patch checked with `git apply --check` against a **pinned upstream SHA**
  (`f534a02`), a runbook printing the *expected output at every step* with explicit "stop here if
  not" gates, a verification query that reads the field the change actually alters and prints no
  secrets, and a rollback section stating blast radius in one sentence. Approval-to-applied becomes
  one SSH session instead of a conversation.
- **Cron ordering is coupling that is invisible from either script.** The pin writer is scheduled
  05:30 CDT *because* the 06:00 orchestrator re-dates the rows it inserts; run it after 06:00 and
  every new post loses a day. Document that ordering next to the crontab, not in the code.

### 2026-09-19 — a good day for shipping, a third bad day for the paper trail

- **The agents shipped well and recorded almost none of it.** Seven PRs landed (#116–#123):
  a Mediavine DOM scanner, the E40 revert, the Pinterest read-back, the `/admin/funnel`
  dashboard, the favicon. Every one of the code changes is defensible on its own. The ledger has
  **one** row for the lot. The gap is now three days old and no longer explicable as "the run
  died" — the 09-19 run clearly worked.
- **The mechanism is finally pinned down, and it is not agent forgetfulness.** `ledger()` in
  `deploy-verify.sh:157-166` `printf`s the row into up to three working trees and stops. Nothing
  in `run-funnel-daily.sh` commits. So the ledger is structurally a working-tree edit, i.e. the
  exact artifact class this log has now lost three times (`operator-did-*` on 09-17, `ce7c111` on
  09-18, the ledger rows on 09-19). Writing it to more places made it look safer without making
  it durable. **The fix is one `git commit` in the function that already knows the row is true**,
  not another reminder in a prompt.
- **`/admin/funnel` reintroduces the same dependency at a new spot.** `history.json` is generated
  by `funnel-history.ts` inside the ephemeral worktree, `cp`d to the operator's local checkout,
  and reaches `main` only because `funnel-daily-prompt.md` *asks the agent* to include it in the
  day's commit. When that instruction is missed, the dashboard silently serves yesterday's data
  with no alert — a stale-data failure with no error anywhere. Note what the route did get right:
  `fs` read at request time (missing file → clean 404, not a build failure) and a real vacuity
  guard in the generator (`dayMap.size === 0` → `process.exit`, never an empty history).
- **The monitor-of-the-monitor is now also dark.** The evening `mhm-guardrail-evening` check has
  written no real `check` row since **2026-09-04 (15 days)**, and the MISSED rows that were
  supposed to make that silence visible stop at **09-15** — because step 0e writes them from
  inside the morning run. Two layers of detection, both hosted in the thing they watch, both
  silent, and the silence reads identically to health. This needs the operator to confirm the
  task is enabled at 18:30.
- **16 empty `compound/*` branches on `origin`, one per night.** The nightly loop finds an
  all-`completed` PRD from May, logs "All tasks complete!", exits 0 in zero seconds, and pushes a
  branch with no commits. An empty queue is still being reported as success.
- **The one unambiguous win: a pre-committed kill rule fired on its own date and was obeyed.**
  E40's revert condition was written down at merge time on 09-13; on the 09-19 read all three
  legs tripped and Rio reverted rather than re-arguing the threshold. That is the process working
  exactly as designed, and it is worth noticing on a day otherwise spent cataloguing leaks.

---

*Last compound review: 2026-09-19*

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
