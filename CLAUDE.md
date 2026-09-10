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

### Performance Insights

- **Default grid columns reduced from 5 to 4**: 5-column grid made cards too narrow on most screens. 4 columns provides better card readability while still showing plenty of content.
- **`max-w-[1800px]` with `xl:px-6`**: Slightly reduced horizontal padding at xl breakpoint prevents content from looking smushed when the ad sidebar is present.
- **Download countdown 10s > 5s for ad revenue**: Extending the /go/[modId] countdown from 5s to 10s doubles dwell time, giving ad slots time to request, render, and record viewable impressions. Improves RPM without meaningfully hurting UX on a page users are already committed to waiting on.
- **Preconnect hints for Mediavine**: Adding `<link rel="preconnect">` for exchange/keywords/video.mediavine.com and `<link rel="preload">` for the wrapper script shaves ~200-400ms off first-ad render time. Added via `wp_head` priority 1 in functions.php.
- **Mediavine sidebar sticky health score is fragile**: Score dropped to 12.9 from missing sidebars, wrong breakpoints, and placeholder divs. Three separate root causes had to be fixed simultaneously (add `<aside id="secondary">` to all page types, switch xl→lg breakpoint, remove min-h placeholder divs) to reach 50+. No single fix alone moved the needle — the score requires ALL pages to have a properly configured sidebar.

- **Incremental ingest costs nothing on a quiet day, so keep the flags even when they no-op**: `scripts/agents/catalog-ingest-daily.sh` defaults to `INGEST_SINCE_DAYS=21` and `INGEST_LIMIT=25`, and a re-run right after the 09-09 backfill selected 0 of 668 posts and exited on `Nothing to do: every matching post already has mods`. The full crawl it replaces fetched all 667 posts on every invocation. Cheap-when-idle is what makes a job safe to schedule daily.

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

---

*Last compound review: 2026-09-09*

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
