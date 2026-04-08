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
- **Left spacer div to balance ad sidebar**: When a right-side ad sidebar breaks visual centering of the main content, add a matching-width hidden `<div>` on the left (same width as sidebar, `aria-hidden="true"`, hidden below breakpoint). This keeps filters+grid visually centered without flexbox hacks.
- **Incremental search icon styling**: Kadence search uses `<input type="submit">` with a sibling SVG, not a `<button>`. Style the native SVG directly rather than injecting new elements to avoid duplicates.

### Gotchas and Pitfalls

- **WordPress search `?s=` query params get lost in middleware proxy**: `request.nextUrl.searchParams` can be empty on Vercel edge even when the URL has params. Always check both `request.nextUrl.searchParams` and `new URL(request.url).searchParams` as fallback. Ultimately, a dedicated `/api/blog/search` route was more reliable than middleware param forwarding.
- **vercel.json rewrites strip query params**: Named capture groups in vercel.json regex rewrites (e.g., `?s=(?<query>.*)`) don't reliably forward to the destination. Don't rely on vercel.json for query param forwarding — use middleware or API routes instead.
- **Mediavine in-content ads require `mv-ads` class**: ModGrid cells that should receive Mediavine in-content ad injection must have class `mv-ads`. Removing or renaming this class silently breaks ad injection with no errors. Always preserve ad-related CSS classes when refactoring grid components.
- **Mediavine sidebar needs normal document flow**: The ad sidebar must NOT be `position: absolute` or use CSS Grid tricks that take it out of flow. Mediavine Script Wrapper handles its own stickiness. Keep sidebar as a normal flex child with `overflow: visible`.
- **Kadence search form `action` URL rewriting**: When proxying WordPress through middleware, search forms have `action="https://blog.musthavemods.com/"`. Must rewrite these with `BLOG_ACTION_REGEX` to point to `/blog/` so searches route through the proxy instead of hitting the subdomain directly.
- **Dead code removal can cascade**: Removing a service file (e.g., newsletter service) can break API routes that import from it. Always search for imports before deleting files: `grep -r "from.*deleted-file" --include="*.ts"`.
- **Affiliate card grid items need standard grid treatment**: AffiliateRecommendations cards inserted into ModGrid should be regular grid cells, not spanning multiple columns or using special positioning — otherwise they break the grid flow and push mod cards out of alignment.

### Performance Insights

- **Default grid columns reduced from 5 to 4**: 5-column grid made cards too narrow on most screens. 4 columns provides better card readability while still showing plenty of content.
- **`max-w-[1800px]` with `xl:px-6`**: Slightly reduced horizontal padding at xl breakpoint prevents content from looking smushed when the ad sidebar is present.

### Code Quality Notes

- **Debug commits in production**: The blog search routing fix required 10+ iterative commits including debug headers and test endpoints. Consider using a feature branch for exploratory debugging to keep main history cleaner.
- **Middleware growing in complexity**: `middleware.ts` now handles admin auth, creator auth, WordPress proxying, HTML rewriting, search form action rewriting, and query param forwarding. Consider extracting WordPress proxy logic into a separate utility if it grows further.
- **Security improvement**: Admin API middleware auth (`/api/admin/*`) added as first line of defense, checking `getToken()` for both authentication and `isAdmin` flag before requests reach route handlers. This complements existing route-level auth checks.

---

*Last compound review: 2026-03-17*
