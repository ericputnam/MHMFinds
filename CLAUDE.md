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

## 🧠 Compound Learnings (Jan 2026)

This section captures patterns, gotchas, and best practices discovered during recent development.

### Build-Time Initialization Errors

**Problem**: Static class properties that access environment variables fail at build time because env vars aren't available during `next build`.

**Example - Stripe Service** (fixed in 92da480):
```typescript
// ❌ WRONG - Fails at build time
export class StripeService {
  private static stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// ✅ CORRECT - Lazy initialization
export class StripeService {
  private static _stripe: Stripe | null = null;

  private static get stripe(): Stripe {
    if (!this._stripe) {
      this._stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    }
    return this._stripe;
  }
}
```

**Rule**: Always use lazy initialization for third-party SDK clients that require API keys.

### Regex Compatibility Issues

**Problem**: ES2018+ regex features (like the `s` flag for dotAll) cause build failures when targeting older Node versions.

**Example** (fixed in 526b1e9):
```typescript
// ❌ May fail in some environments
const pattern = /some.pattern/s;

// ✅ Use [\s\S] instead of . with s flag
const pattern = /some[\s\S]pattern/;
```

**Rule**: Avoid ES2018+ regex flags. Use character class alternatives for cross-platform compatibility.

### PostgreSQL Enum Casting in Raw SQL

**Problem**: When using Prisma raw SQL (`$queryRaw`), PostgreSQL enum values require explicit `::text` casting for string comparisons.

**Example** (fixed in cef3fdb):
```typescript
// ❌ WRONG - Fails with type mismatch
AND ma."actionType" = ${actionType}

// ✅ CORRECT - Cast enum to text
AND ma."actionType"::text = ${actionType}
```

**Rule**: When comparing enum columns in raw SQL, always cast to `::text`.

### ESLint React Entity Escaping

**Problem**: The `react/no-unescaped-entities` rule causes build failures for apostrophes in JSX text (e.g., "don't", "it's").

**Solution** (fixed in 7be238c): Disable the rule in `.eslintrc.json`:
```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "react/no-unescaped-entities": "off"
  }
}
```

**Alternative**: Use `&apos;` for apostrophes, but this reduces readability.

### Web Scraping Rate Limits

**Problem**: Amazon and other sites block aggressive scraping. Initial 1-3 second delays caused blocking.

**Solution** (from 526b1e9):
- Increased base delays to 3-6 seconds
- Add user agent rotation
- Implement retry logic with exponential backoff
- Clean and truncate scraped titles (Amazon keyword spam)

**Rule**: Start with conservative delays (3-6s minimum) and increase if blocked.

### Agent Workflow Pattern

A new development workflow was established for autonomous agents (cef3fdb):

```
/commitit → /reviewit → /shipit
    │           │           │
    ▼           ▼           ▼
 Feature    PR Summary   Production
 Branch     + Checks     Deployment
```

**Key files**:
- `.claude/agents/<name>/plan.md` - Implementation plan (review before running)
- `.claude/agents/<name>/prompt.md` - Agent system prompt
- `.claude/skills/reviewit/skill.md` - PR review skill

**Rule**: Agents work on feature branches, never directly on main. Use /reviewit before /shipit.

### FacetDefinition Best Practices

When creating new facets for content categorization:

1. **Deactivate don't delete**: Set `isActive=false` on old facets rather than deleting
2. **Use atomic operations**: Wrap bulk updates in transactions
3. **Test with dry run**: Scripts should have `--fix` flag, default to preview mode
4. **Log progress**: Write progress files for long-running operations

**Example facet split** (from cef3fdb):
- Original: `lot` facet (636 mods)
- Split into: `residential` (592), `commercial` (31), `entertainment` (6), `community` (7)
- Old `lot` facet deactivated but preserved for reference

---

## 🧠 Compound Learnings (Feb 2026)

### OAuth2 Token Caching Pattern

**Problem**: Third-party APIs using OAuth2 (like Amazon Creators API) require token management with proper expiration handling.

**Pattern** (from `amazonCreatorsApiService.ts`):
```typescript
// Module-level cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check cache with buffer time (60s before expiry)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  // Fetch new token...
  const data = await fetchToken();

  // Cache with 30-second safety buffer
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in || 3600) - 30) * 1000,
  };

  return data.access_token;
}
```

**Key points**:
1. Use module-level variable (not class property) for token cache
2. Check expiry with buffer time (60s recommended)
3. Set expiry with safety buffer when caching (30s from actual expiry)
4. For Cognito/OAuth2, use `application/x-www-form-urlencoded` not JSON

### API Response Case Handling

**Problem**: External APIs may return responses in different casing (camelCase vs PascalCase) depending on version or endpoint.

**Pattern** (from Amazon Creators API):
```typescript
// Handle both camelCase and PascalCase responses
const searchResult = data.searchResult || data.SearchResult;
const items = searchResult?.items || searchResult?.Items;
const itemInfo = item.itemInfo || item.ItemInfo;
```

**Rule**: When integrating with external APIs, always handle both casing conventions using fallback patterns.

### Amazon Associates API Access Requirements

**Important**: The Amazon Creators API (replacement for PA-API 5.0) requires **3 qualifying sales within 180 days** before API access is granted.

**Error signature**:
```
reason: 'AssociateNotEligible'
```

**Mitigation**: Implement fallback scraping when API access is pending. The `amazonScraperService.ts` provides a web scraping fallback.

### PRD-Based Cleanup Tasks

**Pattern**: For code cleanup initiatives, create a PRD in `tasks/prd-compound/` with:

1. **Clear acceptance criteria** - Checkboxes for each change
2. **Phase breakdown** - Group related changes
3. **Files to modify table** - Explicit list with change descriptions
4. **Testing plan** - Pre/post verification commands
5. **Risks and rollback** - Document potential issues

**Example structure** (from `clean-up-dead-code-...md`):
```markdown
# PRD: [Task Name]

## 1. Overview
- What we're building
- Why (motivation)

## 2. Requirements
- [ ] Acceptance criteria with checkboxes

## 3. Technical Approach
- Phase 1, 2, 3...

## 4. Files to Modify
| File | Changes |
|------|---------|

## 5. Testing Plan
## 6. Risks
## 7. Out of Scope
## 8. Definition of Done
```

### AI-Powered Product Curation Pattern

**Pattern** (from `personaSwarmService.ts`): Use multiple AI personas with distinct characteristics to validate product recommendations:

```typescript
interface Persona {
  id: string;
  name: string;
  age: number;
  location: string;
  aesthetic: string;
  priceRange: { min: number; max: number };
  evaluationCriteria: string;
}

// Require 3/8 (37.5%) approval for validation
const APPROVAL_THRESHOLD = 3;
```

**Key insights**:
1. Base personas on real analytics data (demographics, top content types)
2. Give each persona distinct price sensitivity and aesthetic preferences
3. Include diverse geographic representation (affects purchasing power)
4. Use threshold-based consensus (not unanimous approval)
