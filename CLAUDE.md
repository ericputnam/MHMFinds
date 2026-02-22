# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔍 CRITICAL: Always Verify Changes with Browser-Use

**After making any frontend/UI changes, you MUST use browser-use to verify them before reporting completion.**

### Required Steps:
1. Ensure the dev server is running (`npm run dev`)
2. Use browser-use to navigate to the affected page(s)
3. Visually confirm the changes are rendering correctly
4. Check for any rendering artifacts, broken layouts, or unexpected text
5. Only report the task as complete after visual verification passes

### Why:
- CSS changes may not take effect due to caching, specificity conflicts, or build issues
- Component changes may look correct in code but render incorrectly
- WordPress proxied content may inject unexpected elements
- The user should never be the first person to discover a visual regression

**If you cannot run browser-use, explicitly tell the user you were unable to verify visually and recommend they check manually.**

---

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

## 🎨 Design Rule: No Gradients

**NEVER use CSS gradients in this project.**

Gradients are considered an "AI tell" and should be avoided entirely. Use solid colors instead.

### Prohibited:
- ❌ `linear-gradient()`
- ❌ `radial-gradient()`
- ❌ `conic-gradient()`
- ❌ Gradient backgrounds, borders, or text effects

### Use Instead:
- ✅ Solid background colors (e.g., `background: #ec4899`)
- ✅ Solid border colors (e.g., `border: 1px solid rgba(236,72,153,0.3)`)
- ✅ Box shadows for depth (e.g., `box-shadow: 0 4px 6px rgba(0,0,0,0.1)`)

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

**`/components`** - React components (landing page components: Hero, ModCard, SearchBar, Navbar, Footer, etc.)

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
- Highlighted backgrounds for active filters
- Sticky positioning for persistent access during scroll
- Collapsible on mobile devices

**Quick Filter Tags:**
- One-click filters: Trending (most downloads), Newest, Top Rated, Free Mods
- Visual active states with solid color highlights and animations
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
- Accent color text effects on headings
- Hover states with scale transforms
- Loading skeletons for better perceived performance
- Enhanced typography and spacing

**Custom Animations (globals.css):**
- `animate-fade-in` - Cards fade in on load
- `animate-gradient` - Animated text effect (name is legacy; uses solid colors per no-gradients rule)
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

### Automated Compound System

**Pattern**: A nightly automation system that reviews codebase changes and autonomously implements improvements.

**Architecture** (`scripts/compound/`):
```
┌─────────────────────────────────────────────────────────────────┐
│  Daily Schedule (launchd)                                       │
├─────────────────────────────────────────────────────────────────┤
│  10:00 PM  →  daily-compound-review.sh                          │
│              - Reviews git log from past 24 hours               │
│              - Updates CLAUDE.md with learnings                 │
│              - Commits and pushes to main                       │
│                                                                 │
│  11:00 PM  →  auto-compound.sh                                  │
│              - Reads priority report from reports/              │
│              - Creates feature branch                           │
│              - Generates PRD in tasks/prd-compound/             │
│              - Runs loop.sh to execute tasks                    │
│              - Creates draft PR                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key files**:
- `scripts/compound/auto-compound.sh` - Main pipeline orchestrator
- `scripts/compound/loop.sh` - Task execution loop (max 25 iterations)
- `scripts/compound/analyze-report.sh` - Extracts top priority from reports
- `scripts/compound/launchd/*.plist` - macOS scheduler configurations

**Setup** (for new machines):
```bash
# Load launchd jobs
launchctl load ~/Library/LaunchAgents/com.mhmfinds.daily-compound-review.plist
launchctl load ~/Library/LaunchAgents/com.mhmfinds.auto-compound.plist

# Test manually
./scripts/compound/test-manual.sh
```

**Task JSON format** (`scripts/compound/prd.json`):
```json
{
  "tasks": [
    { "id": 1, "title": "Task name", "description": "What to do", "status": "pending" }
  ]
}
```
Status values: `pending` → `completed` or `blocked`

**Rules**:
1. Compound system always works on feature branches, never main
2. Draft PRs require human review before merge
3. If a task fails, it's marked `blocked` and loop continues to next task
4. Max 25 iterations per run to prevent runaway execution

### Amazon Creators API Integration

**New environment variables** (add to `.env.local`):
```bash
AMAZON_CREATORS_CREDENTIAL_ID=your-credential-id
AMAZON_CREATORS_CREDENTIAL_SECRET=your-credential-secret
AMAZON_CREATORS_APPLICATION_ID=your-app-id
AMAZON_PARTNER_TAG=musthavemod04-20
```

**Important**: API access requires **3 qualifying sales within 180 days**. Until then, `AssociateNotEligible` errors will occur. The `amazonCreatorsApiService.ts` handles this gracefully.

**Authorization header format** (Creators API specific):
```typescript
'Authorization': `Bearer ${token}, Version ${CREDENTIAL_VERSION}`
```
Note the comma-separated Bearer token AND Version - this is unique to the Creators API.

### Cognito OAuth2 Token Endpoint

**Important**: The Amazon Creators API uses AWS Cognito for authentication. The token endpoint URL varies by region:
- NA (North America): `https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token`
- EU: Different endpoint (check docs)
- FE (Far East): Different endpoint (check docs)

**Content-Type**: Must be `application/x-www-form-urlencoded`, not `application/json`

### Prisma Script Environment Setup

**Problem**: Standalone scripts (in `scripts/`) cannot use Prisma Accelerate URLs (`prisma+postgres://`). They need direct database connections.

**Solution** (`scripts/lib/setup-env.ts`): Import at the very top of any script, before other imports:
```typescript
// MUST be the first import in any script that uses Prisma
import '../lib/setup-env';
// or: import './lib/setup-env';
```

This module automatically detects Accelerate URLs and swaps `DATABASE_URL` with `DIRECT_DATABASE_URL`. It also loads `.env.local` for you.

**Rule**: Every new script that touches the database must import `setup-env.ts` first, or it will fail with cryptic Accelerate connection errors.

### Admin API Route Security (Defense-in-Depth)

**Problem**: Admin API routes (`app/api/admin/*`) were discovered to be missing authentication checks, allowing unauthenticated access to destructive operations. Hardened in Feb 2026 — all routes now use `requireAdmin`.

**Solution**: Two-layer defense:
1. **Middleware** (`middleware.ts`): Blocks ALL `/api/admin/*` requests without admin auth at the request level
2. **Route-level auth**: Each handler calls `requireAdmin(request)` independently

**Required pattern for ALL admin API routes**:
```typescript
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return auth.response;
  }
  // ... handler logic
}
```

**Security scanner**: Run `npm run security:check-admin-auth` to verify all admin routes have auth. Run before committing changes to admin routes.

**Rule**: NEVER create an admin API route without both middleware protection AND route-level `requireAdmin` checks. Never rely on just one layer.

### Prisma Decimal Type Handling in React Components

**Problem**: Prisma `Decimal(10,2)` fields (like `price`) may arrive as strings, not numbers, depending on serialization path. Calling `.toFixed()` on a string throws an error.

**Pattern**:
```typescript
// ❌ WRONG - May fail if price is a Decimal string
const display = product.price.toFixed(2);

// ✅ CORRECT - Coerce to Number first
const price = typeof product.price === 'number' ? product.price : Number(product.price);
const display = price.toFixed(2);
```

**Rule**: Always coerce Prisma Decimal values to `Number()` before arithmetic or formatting operations, especially in client components that receive data from API routes.

### Cache Invalidation After Admin Mutations

**Problem**: Admin CRUD operations (create, update, delete mods) had a ~30 second delay before taking effect because cached data was being served.

**Pattern**: Call `CacheService.invalidateMod(id)` after every mutation:
```typescript
await prisma.mod.delete({ where: { id } });
await CacheService.invalidateMod(id); // Clear cached data immediately
```

For bulk operations, invalidate all affected IDs:
```typescript
await Promise.all(modIds.map((id: string) => CacheService.invalidateMod(id)));
```

**Rule**: Every admin mutation (create/update/delete) must be followed by cache invalidation.

### Next.js `force-dynamic` for Auth-Dependent Routes

**Problem**: API routes using `getServerSession()`, `cookies()`, `headers()`, or `request.url` fail during Next.js static generation at build time.

**Fix**: Add `export const dynamic = 'force-dynamic'` to the route file:
```typescript
export const dynamic = 'force-dynamic';
```

**Rule**: Any API route that reads auth state or request-specific data must export `dynamic = 'force-dynamic'`.

### Script Archival Pattern

**Pattern**: Move completed/obsolete scripts to `scripts/archive/` instead of deleting them. This preserves reference material while keeping the active scripts directory clean.

```
scripts/
├── archive/           # Completed one-time scripts and references
│   ├── README.md      # Index of archived scripts
│   └── ralph/         # Agent-generated scripts from ralph pipeline
├── compound/          # Automated compound system
├── lib/               # Shared script utilities (setup-env.ts)
└── *.ts               # Active, currently-used scripts
```

**Rule**: Archive old scripts rather than deleting. Add a README.md to `scripts/archive/` explaining what each script was for.

### Multi-Game Navigation: `<a>` vs `<Link>` for WordPress Routes

**Problem**: Blog/WordPress pages are served from a separate WordPress instance (via Vercel rewrites), not from the Next.js app. Using Next.js `<Link>` for these routes causes client-side navigation failures.

**Pattern** (from `Navbar.tsx` and `Footer.tsx`):
```tsx
// ❌ WRONG - Next.js client-side navigation won't work for WordPress routes
<Link href="/blog">Blog</Link>
<Link href="/sims-4/">Sims 4</Link>

// ✅ CORRECT - Standard anchor tags trigger full page load through Vercel rewrite
<a href="/blog">Blog</a>
<a href="/sims-4/">Sims 4</a>
```

**Rule**: Use `<a href>` (not `<Link>`) for any route that's proxied to WordPress via Vercel rewrites (`/blog`, `/sims-4/`, `/stardew-valley/`, `/minecraft/`). Use `<Link>` only for routes handled by the Next.js app.

### Multi-Game Footer Disclaimer

**Pattern**: When expanding to support multiple games, update legal disclaimers to mention all relevant publishers:
- **Sims 4**: Electronic Arts
- **Stardew Valley**: ConcernedApe
- **Minecraft**: Mojang Studios

Use generic phrasing like "copyright their respective publishers" rather than listing every publisher individually (more maintainable as games are added).

### Gutenberg `<!-- wp:shortcode -->` Rendering as Visible Text (Feb 9, 2026)

**Problem**: On the WordPress staging site, the game landing pages (`/sims-4/`, `/stardew-valley/`, `/minecraft/`) displayed raw Gutenberg block comments (`<!-- wp:shortcode -->`) as visible text at the top of the page.

**Root cause**: When WordPress pages use Gutenberg's shortcode block, it wraps the shortcode in HTML comments like:
```
<!-- wp:shortcode -->[mhm_game_hub game="sims-4"]<!-- /wp:shortcode -->
```
If the theme or shortcode handler doesn't properly process these through `the_content` filter, or if the output escaping converts `<!--` into visible text, the block comments show up to users.

**Fix**: Strip the Gutenberg wrappers via WP-CLI, keeping only the raw shortcode:
```bash
ssh -i ~/.ssh/bigscoots_staging nginx@74.121.204.122 -p 2222 \
  "cd /home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public && \
   wp post update 36977 --post_content='[mhm_game_hub game=\"sims-4\"]' && \
   wp post update 36979 --post_content='[mhm_game_hub game=\"stardew-valley\"]' && \
   wp post update 36981 --post_content='[mhm_game_hub game=\"minecraft\"]'"
```

**Affected pages** (staging only, production was clean):
- Page 36977: Sims 4 (`/sims-4/`)
- Page 36979: Stardew Valley (`/stardew-valley/`)
- Page 36981: Minecraft (`/minecraft/`)

**Rule**: When creating WordPress pages that contain only a shortcode, use `wp post update` with raw shortcode text (no Gutenberg block wrappers). If editing via the WordPress admin Gutenberg editor, the wrappers will be re-added automatically — so prefer WP-CLI for shortcode-only pages.

**Prevention**: After creating or editing shortcode-only pages in the WordPress admin, always check the frontend for stray `<!-- wp:shortcode -->` text. If present, fix via WP-CLI as shown above.

### Compound System: PRD Iteration Without Execution

**Observation** (Feb 6-8, 2026): The automated compound system generates increasingly refined PRDs for the same task (dead code cleanup) on successive nights, but the corresponding feature branches don't diverge from main. This suggests the execution loop (`loop.sh`) may be failing silently or the branch isn't being pushed.

**Debugging checklist**:
1. Check `~/Library/LaunchAgents/com.mhmfinds.auto-compound.plist` is loaded: `launchctl list | grep mhmfinds`
2. Check compound logs for errors: look at stdout/stderr from plist configuration
3. Verify `loop.sh` can execute Claude Code in non-interactive mode
4. Check if PRD generation succeeds but task execution fails (look for `prd.json` with all tasks still `pending`)

### Game Pages: Full Browse Experience vs Redirect (Feb 9, 2026)

**Problem**: Game pages (`/games/[game]`) originally just redirected to `/?gameVersion=GameName`. This was poor UX (users see a loading screen then a redirect) and poor SEO (no unique content on game URLs).

**Solution**: Converted `GamePageClient.tsx` from a redirect component into a full-featured browse page with:
- `FacetedSidebar` for content filtering
- `ModGrid` with pagination, sorting, per-page controls
- `Hero` component reused with `defaultGame` prop
- URL state synced via `useSearchParams` + `router.replace`

**Key pattern**: Reuse existing page components (Hero, ModGrid, FacetedSidebar) rather than building new ones. Pass game context via props like `defaultGame` to customize behavior.

### Suspense Boundary Required for `useSearchParams()`

**Problem**: Next.js 14 requires components that call `useSearchParams()` to be wrapped in a `<Suspense>` boundary, otherwise the entire page fails to render with a build error.

**Pattern** (from `app/games/[game]/page.tsx`):
```tsx
// ✅ Server component wraps client component in Suspense
import { Suspense } from 'react';

export default async function GamePage({ params }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <GamePageClient gameName={gameName} gameSlug={game} />
    </Suspense>
  );
}
```

**Rule**: Any client component using `useSearchParams()` must be wrapped in `<Suspense>` by its parent server component. This is a Next.js 14 App Router requirement.

### Removing Single-Game Bias from Homepage

**Problem**: The homepage defaulted to `gameVersion='Sims 4'`, making the site feel single-game despite supporting multiple games.

**Changes made**:
1. `app/page.tsx`: Changed default `gameVersion` from `'Sims 4'` to `''` (show all games)
2. `components/Hero.tsx`: Added `defaultGame` prop, generic heading ("Find Your Next Favorite Mod" instead of "Find Sims 4 CC")
3. `components/Hero.tsx`: Added `trendingGeneral` searches shown when no game is selected
4. URL param handling: Now only adds `gameVersion` to URL when a game IS selected (not when it matches the old default)

**Rule**: When expanding to multi-game, audit all hardcoded game references. Default state should be "all games" unless on a game-specific page.

### Navbar Hover Dropdown with Timeout Debounce

**Problem**: Simple `onMouseEnter`/`onMouseLeave` on dropdowns causes flickering when users move between the trigger and the dropdown content (brief gap between elements).

**Pattern** (from `Navbar.tsx`):
```tsx
const gamesMenuTimeout = useRef<NodeJS.Timeout | null>(null);

const handleGamesMouseEnter = () => {
  if (gamesMenuTimeout.current) clearTimeout(gamesMenuTimeout.current);
  setShowGamesMenu(true);
};

const handleGamesMouseLeave = () => {
  gamesMenuTimeout.current = setTimeout(() => setShowGamesMenu(false), 150);
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (gamesMenuTimeout.current) clearTimeout(gamesMenuTimeout.current);
  };
}, []);
```

**Key**: The 150ms delay on close prevents flickering. The `clearTimeout` on enter cancels any pending close, so moving from trigger to dropdown keeps it open.

### Shared Game Config: Centralize Color/Metadata

**Pattern**: Created `lib/gameColors.ts` as a single source of truth for game-specific visual config:
```typescript
export const GAME_COLORS: Record<string, string> = {
  'Sims 4': '#ec4899',
  'Stardew Valley': '#22c55e',
  'Minecraft': '#8b5cf6',
};

export const GAME_TAGLINES: Record<string, string> = {
  'Sims 4': 'CC, mods & custom content',
  // ...
};
```

**Rule**: When adding a new game, update `lib/gameColors.ts` (colors/taglines), `lib/gameRoutes.ts` (slug mapping/metadata), and `components/Hero.tsx` (trending searches).

### Gradient Replacement: Search Bar Glow Effect

**Problem**: The Hero search bar used `bg-gradient-to-r from-sims-pink to-sims-blue` for its glow effect, violating the no-gradients rule.

**Fix**: Replaced with a solid color glow:
```css
/* ❌ Old - gradient glow */
bg-gradient-to-r from-sims-pink to-sims-blue

/* ✅ New - solid pink glow */
bg-sims-pink/30
```

**Rule**: Even glow/blur effects should use solid colors. `bg-sims-pink/30` with `blur-xl` produces a nice glow without gradients.

### URL State Sync Without Scroll Jump

**Problem**: When updating filter/sort/page state on browse pages, `router.replace` scrolls to the top of the page by default, creating a jarring UX when users are mid-scroll.

**Pattern** (from `GamePageClient.tsx`):
```tsx
// Update URL without scrolling to top
router.replace(newUrl, { scroll: false });
```

**Key**: Always pass `{ scroll: false }` to `router.replace` when syncing filter state to the URL. This keeps the user's scroll position intact while updating the URL for shareable links and browser back/forward.

**Rule**: Use `router.replace` (not `router.push`) for filter/sort/pagination URL updates — it replaces the history entry instead of creating a new one, preventing a confusing back-button experience.

### Optimistic UI for Favorite Toggling

**Pattern** (from `GamePageClient.tsx`): Toggle the UI state immediately on click, then rollback if the API call fails.

```tsx
const handleFavorite = async (modId: string) => {
  const isFavorited = favorites.includes(modId);
  // Optimistic update
  setFavorites(prev => isFavorited ? prev.filter(id => id !== modId) : [...prev, modId]);

  const response = await fetch(`/api/mods/${modId}/favorite`, {
    method: isFavorited ? 'DELETE' : 'POST',
  });

  if (!response.ok) {
    // Rollback on failure
    setFavorites(prev => isFavorited ? [...prev, modId] : prev.filter(id => id !== modId));
    if (response.status === 401) alert('Please sign in to favorite mods');
  }
};
```

**Rule**: For interactive toggles (favorites, likes, bookmarks), always use optimistic UI with rollback. The API latency would otherwise make the UI feel sluggish.

### Pre-Configuring Future Games in Config Files

**Observation**: `lib/gameColors.ts` already includes `'Animal Crossing'` with color (#06b6d4) and tagline, even though the game isn't live yet. This is intentional — having config entries ready means adding a new game only requires creating the game page and adding content.

**Checklist for adding a new game**:
1. `lib/gameColors.ts` - Add color and tagline (may already be pre-configured)
2. `lib/gameRoutes.ts` - Add slug mapping and SEO metadata
3. `components/Hero.tsx` - Add game-specific trending searches to `trendingByGame`
4. WordPress - Create game landing page and category
5. Verify Navbar dropdown auto-populates from `GAME_COLORS`

### Dead Code Cleanup: Dependency-Aware Removal (Feb 15, 2026)

**Problem**: Legacy components (`Features.tsx`, `Stats.tsx`, `FilterBar.tsx`, `hooks/useMods.ts`) were unused but kept around, pulling in heavy dependencies like `framer-motion`.

**Pattern**: When removing dead code, also check for orphaned dependencies:
1. Delete the unused files
2. Run `grep -r "from 'package-name'" --include='*.ts' --include='*.tsx'` to check if any remaining code uses the dependency
3. Remove orphaned packages from `package.json`
4. Run `npm install` to update the lockfile
5. Verify with `npm run build`

**Packages removed in this cleanup**: `framer-motion`, `@headlessui/react`, `@heroicons/react`, `@stripe/stripe-js`, `jsonwebtoken`, `msw` (and their `@types/*` counterparts). These were only used by deleted components.

**Rule**: Dead code that imports heavy libraries is especially wasteful — it bloats the bundle even though nothing renders. Always check dependency usage after deleting files.

### Migrating `<img>` to `next/image` for External URLs

**Problem**: Next.js `@next/next/no-img-element` lint warnings throughout admin pages, cards, and modals.

**Pattern**: Use `next/image` with `unoptimized` for external/user-provided URLs that aren't on approved `next.config.js` domains:
```tsx
// ❌ Lint warning
<img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full" />

// ✅ Fixed - with explicit dimensions
<Image
  src={user.avatar}
  alt={user.name}
  width={48}
  height={48}
  unoptimized
  className="w-12 h-12 rounded-full object-cover"
/>

// ✅ Fixed - fill mode for aspect-ratio containers
<Image
  src={mod.thumbnail}
  alt={mod.title}
  fill
  unoptimized
  sizes="(max-width: 768px) 100vw, 33vw"
  className="w-full h-full object-cover"
/>
```

**Key**: `unoptimized` bypasses Next.js Image Optimization (which would fail for unapproved domains). Use `fill` for responsive containers, explicit `width`/`height` for fixed-size elements.

### React `useCallback` for `useEffect` Dependencies

**Problem**: `react-hooks/exhaustive-deps` warnings across admin pages where `fetchData` functions were defined inside components but not listed as `useEffect` dependencies.

**Pattern**: Wrap fetch functions in `useCallback` and list them in the dependency array:
```tsx
// ❌ Lint warning: missing dependency 'fetchUsers'
const fetchUsers = async () => { ... };
useEffect(() => { fetchUsers(); }, [searchQuery]);

// ✅ Fixed
const fetchUsers = useCallback(async () => { ... }, [searchQuery]);
useEffect(() => { fetchUsers(); }, [fetchUsers]);
```

**Rule**: Any function called inside `useEffect` that references state/props must be wrapped in `useCallback` with appropriate dependencies. This applies broadly across admin pages.

### Fire-and-Forget Email Notifications

**Problem**: Email notifications (submission alerts, rejection notices) should not block API responses or cause failures if the email service is down.

**Pattern** (from `submit-mod/route.ts` and `reject/route.ts`):
```typescript
// Fire-and-forget: don't await, don't let failures propagate
void Promise.resolve(emailNotifier.send(to, subject, html)).catch((err) => {
  console.error('Failed to send email:', err);
});
```

**Key points**:
1. Use `void` to explicitly discard the promise (satisfies `no-floating-promises` lint rule)
2. Wrap in `Promise.resolve()` for safety if `send()` might throw synchronously
3. Always `.catch()` to prevent unhandled rejections
4. Log failures but don't fail the API response

**Environment variables**: `SUBMISSIONS_ALERT_EMAIL` or `ADMIN_EMAIL` for admin notifications. If neither is set, email is silently skipped.


### Zod Validation on API Input (Feb 15, 2026)

**Problem**: The `reject submission` route accepted arbitrary JSON body without validation.

**Fix**: Added Zod schema validation with structured error responses:
```typescript
import { SubmissionRejectSchema, formatZodError } from '@/lib/validation/schemas';

try {
  const body = await request.json();
  const parsed = SubmissionRejectSchema.parse(body);
  reason = parsed.reason;
} catch (error) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(error) },
      { status: 400 }
    );
  }
  throw error;
}
```

**Rule**: All API routes that accept user input should validate with Zod schemas from `lib/validation/schemas.ts`. Return structured `{ error, details }` responses on validation failure.

### Smoke Test Pattern for API Routes (Feb 15, 2026)

**Pattern**: Lightweight integration tests that verify API route handlers work correctly with mocked Prisma:

```typescript
// 1. Mock dependencies BEFORE importing the route
vi.mock('@/lib/services/turnstile', () => ({
  verifyTurnstileToken: vi.fn(),
}));

// 2. Import mocks and route handler
import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma';
import { POST } from '@/app/api/submit-mod/route';

// 3. Reset between tests
beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

// 4. Create NextRequest, call handler, assert response
const request = new NextRequest('http://localhost:3000/api/submit-mod', {
  method: 'POST',
  headers: { 'x-forwarded-for': '10.0.0.1' },
  body: JSON.stringify(payload),
});
const response = await POST(request);
expect(response.status).toBe(201);
```

**Key**: Mock external services (Turnstile, email) BEFORE importing the route handler. The Prisma mock at `__tests__/setup/mocks/prisma.ts` provides a centralized mock client.

**Coverage added** (Feb 15): submit-mod, reject-submission, admin-users, admin-categories, auth-clear-session, affiliates-routes, ModDetailPage component.

### Stale npm Scripts

**Problem**: `package.json` contained scripts pointing to non-existent files (e.g., `categories:migrate` referenced a deleted script).

**Rule**: After deleting scripts from `scripts/`, always check `package.json` for stale npm script entries that reference them. Remove any that point to deleted files.

### WordPress Proxy Middleware: Edge vs Middleware Execution Order (Feb 19, 2026)

**Problem**: WordPress blog content was proxied via `vercel.json` rewrites (edge layer), which bypasses Next.js middleware entirely. This meant canonical URL rewriting, noindex stripping, and SEO fixes in middleware never ran on WordPress pages.

**Root cause**: Vercel processes rewrites in this order:
1. `vercel.json` rewrites (edge layer) — runs FIRST
2. Next.js middleware — runs SECOND, only for requests NOT already handled by edge rewrites

If a `vercel.json` rewrite matches, the request goes directly to the destination URL and **never reaches middleware**.

**Fix** (commit 40e2171): Removed all HTML-serving rewrites from `vercel.json`. Only static asset rewrites (`/wp-content/*`, `/wp-includes/*`) remain at edge level. All HTML routes (blog posts, categories, tags, feeds, sitemaps) are now handled by middleware's `getWordPressUrl()` function.

```
// vercel.json — ONLY keep static asset rewrites
{ "source": "/wp-content/:path*", "destination": "https://blog.musthavemods.com/wp-content/:path*" },
{ "source": "/wp-includes/:path*", "destination": "https://blog.musthavemods.com/wp-includes/:path*" }

// Everything else → middleware handles WordPress detection + proxy + rewriting
```

**Rule**: On Vercel, never put HTML-serving rewrites in `vercel.json` if you need middleware to process the response (SEO tags, auth, analytics). Edge rewrites are only safe for static assets that don't need transformation.

### WordPress Proxy Middleware Architecture (Feb 19, 2026)

**Pattern** (from `middleware.ts` on `feature/gsc-seo-cleanup` branch):

The middleware detects WordPress vs Next.js routes using a `NEXTJS_PREFIXES` set and proxies WordPress requests with canonical URL rewriting:

```typescript
const NEXTJS_PREFIXES = new Set([
  'api', 'admin', 'creators', 'mods', 'account', 'sign-in',
  'submit-mod', 'about', 'privacy', 'terms', 'games', 'go',
  '_next', 'sitemap', 'manifest',
]);

function getWordPressUrl(pathname: string): string | null {
  if (pathname === '/' || pathname === '') return null; // Root = Next.js
  // Explicit patterns: /blog/*, /category/*, /tag/*, /author/*, /feed/*
  // Date permalinks: /2026/02/some-post/
  // Catch-all: first segment not in NEXTJS_PREFIXES and not a file
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  if (firstSegment && !NEXTJS_PREFIXES.has(firstSegment) && !firstSegment.includes('.')) {
    return `${WP_ORIGIN}${pathname}`;
  }
  return null;
}
```

**HTML rewriting strategy** — different rules for `<head>` vs `<body>`:
- **`<head>`**: Rewrite ALL `blog.musthavemods.com` references (canonical, og:url, oEmbed). Also strip noindex meta tags.
- **`<body>`**: Only rewrite `href=` links (navigation), NOT `src=` links (images, scripts, CSS stay on blog CDN).
- **XML** (sitemaps, RSS): Rewrite all domain references throughout.

**Key details**:
1. Send `X-Forwarded-Host: musthavemods.com` header to WordPress so it knows the request came via the proxy
2. Drop `content-length`, `content-encoding`, `transfer-encoding` headers from WordPress response (body is rewritten, so these are invalid)
3. Drop `x-robots-tag` header to prevent noindex leaking through response headers
4. URL-encoded references (`https%3A%2F%2Fblog.musthavemods.com`) also need rewriting (oEmbed discovery links use encoded URLs)

**Branch status**: This proxy implementation lives on `feature/gsc-seo-cleanup`, not yet merged to main. Current main branch middleware only handles auth for `/admin` and `/creators`.

### SEO Meta Title Optimization Patterns (Feb 19, 2026)

**Problem**: Homepage and game pages had suboptimal meta titles/descriptions. Homepage title was too long ("Premium Sims 4 Mods & Custom Content Discovery" — 58 chars) and game pages used vague "Best" prefix.

**Changes** (commit b0b69fb):
- **Homepage**: Changed from aspirational branding to search-intent targeting: `"MustHaveMods - Find Sims 4 CC, Mods & Custom Content"`
- **Game pages**: Removed "Best" prefix, added content quantity signals: `"Sims 4 Mods & CC - Browse 10,000+ Custom Content | MustHaveMods"`
- **Descriptions**: Action-oriented with specific filter mentions: `"Filter by hair, clothes, furniture, gameplay mods, and more. Free CC from top creators."`
- **Keywords**: Expanded from Sims-4-only to multi-game: added `stardew valley mods`, `minecraft mods`
- **Classification**: Changed from `"Sims 4 Mods Platform"` to `"Game Mods Platform"`

**Rules for SEO meta titles**:
1. Primary keyword near the front (e.g., "Sims 4 Mods" not "MustHaveMods - Premium...")
2. Under 60 characters to avoid truncation in SERPs
3. Include quantity signals when available ("10,000+", "15,000+")
4. Match user search intent — "Find", "Browse", "Search" > "Discover", "Premium"
5. Descriptions should mention specific filterable content types and include a CTA

### GSC-Driven SEO Optimization Workflow (Feb 19, 2026)

**Pattern**: Use Google Search Console data to systematically identify and fix SEO issues. Created `tasks/prd-gsc-seo-cleanup/README.md` with six prioritized PRDs.

**Workflow**:
1. Pull GSC performance data (queries, pages, impressions, clicks, CTR, position)
2. Identify quick wins: high impressions + low CTR = title/description problem
3. Identify structural issues: duplicate URLs competing for same queries, fragment URLs indexed
4. Prioritize by estimated click gain (impressions × expected CTR improvement)
5. Group into PRDs by effort type (code changes, WordPress changes, manual GSC actions)

**Key metrics for prioritization**:
- **0-CTR pages with high impressions**: Title/description optimization (biggest quick win)
- **Duplicate URLs for same queries**: Canonical consolidation (prevents signal dilution)
- **blog.musthavemods.com still indexed**: Domain migration incomplete (needs reindexing requests)
- **Fragment URLs indexed** (e.g., `/page/#section`): Noindex or canonical fix

**Sitemap improvements** (commit b0b69fb):
- Added `<changefreq>` and `<priority>` to Next.js sitemap entries
- Added game pages (`/games/sims-4`, `/games/stardew-valley`, `/games/minecraft`) to sitemap
- robots.txt now rewrites `blog.musthavemods.com` references to canonical domain

### robots.txt Canonical Domain Rewriting (Feb 19, 2026)

**Problem**: WordPress generates `robots.txt` with `blog.musthavemods.com` sitemap references, which tells search engines to crawl the old subdomain.

**Fix** (from `app/robots.txt/route.ts`):
```typescript
let robotsContent = await response.text();
// Rewrite blog domain to canonical
robotsContent = robotsContent.replace(/https?:\/\/blog\.musthavemods\.com/g, 'https://musthavemods.com');
// Ensure main sitemap is referenced
if (!robotsContent.includes('musthavemods.com/sitemap.xml')) {
  robotsContent += '\nSitemap: https://musthavemods.com/sitemap.xml\n';
}
```

**Rule**: When proxying WordPress through a different domain, always rewrite `robots.txt` and `sitemap.xml` to use the canonical domain. Search engines use these files to discover and crawl URLs.

### Staging WordPress Theme: Git-Tracked Workflow (Feb 21, 2026)

**Problem**: WordPress theme changes on the BigScoots staging server were untracked — no version history, no code review, no rollback capability. Changes could be lost or accidentally overwritten.

**Solution**: Added a pull/push workflow that keeps a local snapshot of `functions.php` in the repo:

```
staging/wordpress/kadence-child/functions.php  ← Git-tracked snapshot
scripts/staging/pull-blog-functions.sh         ← Pull from server
scripts/staging/push-blog-functions.sh         ← Push to server (with backup + lint + cache flush)
```

**Push script safety features**:
1. Creates timestamped backup on server before overwriting (`functions.php.bak.<epoch>`)
2. Runs `php -l` syntax check after upload — catches fatal errors before they take down the site
3. Flushes WP object cache + transients automatically

**Workflow**:
```bash
# Pull current state from staging server
./scripts/staging/pull-blog-functions.sh

# Edit locally (with full IDE support, git diff, etc.)
vim staging/wordpress/kadence-child/functions.php

# Push back (auto-backup, lint, cache flush)
./scripts/staging/push-blog-functions.sh
```

**Rule**: Always use the staging scripts for WordPress theme changes — never edit directly on the server via SSH. The Git-tracked snapshot enables code review via PRs and provides rollback history.

### tsconfig.json: Excluding Non-Next.js Directories (Feb 21, 2026)

**Problem**: Cloned or downloaded WordPress/Vite project directories in the repo root cause TypeScript compilation errors because their `tsconfig.json` and source files conflict with the main Next.js project's TypeScript configuration.

**Fix**: Add non-Next.js directories to `tsconfig.json` `exclude` array:
```json
{
  "exclude": [
    "node_modules",
    "newapp_musthavemods",
    "musthavemods---sims-4-cc-&-mods-blog"
  ]
}
```

**Rule**: When adding reference projects, design mockups, or WordPress exports to the repo, always add them to `tsconfig.json` `exclude` to prevent TypeScript conflicts.

### WordPress Content Cannibalization via `-2` Suffixes (Feb 20, 2026)

**Problem**: WordPress auto-appends `-2` to slugs when a new post/page has the same slug as an existing one. Both pages self-canonicalize, causing Google to split ranking signals between them.

**Identified pattern**: 6 duplicate groups found via GSC data where `/sims-4-<topic>/` and `/sims-4-<topic>-2/` (or `-2025` variants) compete for the same search queries.

**Fix**: Set Rank Math canonical on the secondary page pointing to the primary:
```bash
# Find the post ID
wp post list --post_type=post --fields=ID,post_name | grep "sims-4-body-presets$"

# Set canonical to the preferred URL
wp post meta update <ID> rank_math_canonical_url "https://musthavemods.com/<primary-slug>/"
```

**How to choose the primary URL**: Pick the one with better position and more clicks in GSC data — the `-2` version often performs better because it's the newer, more complete content.

**Rule**: When creating new WordPress posts, always check if a similar slug already exists. If WordPress appends `-2`, investigate whether the old post should be updated instead of creating a duplicate. For existing duplicates, use `rank_math_canonical_url` meta to consolidate.

### WordPress `/homepage/` Signal Dilution (Feb 20, 2026)

**Problem**: The WordPress front page at `/homepage/` (page-id-25) was indexed separately from the Next.js homepage at `/`, creating two competing homepage entries in Google search results.

**Root cause**: Before Next.js took over the root `/` URL, WordPress used `/homepage/` as its front page. After the migration, both URLs remain accessible — `/` serves the Next.js app, `/homepage/` serves the old WordPress page through the middleware proxy.

**Recommended fix**: Add a 301 redirect in `middleware.ts`:
```typescript
if (pathname === '/homepage' || pathname === '/homepage/') {
  return NextResponse.redirect(new URL('/', request.url), 301);
}
```

**Rule**: When migrating from WordPress to Next.js, audit for legacy WordPress pages that duplicate Next.js routes. Common candidates: `/homepage/`, `/home/`, `/front-page/`. These should 301 redirect to the Next.js equivalent.

### PHP Lint Validation After Remote Deployments (Feb 21, 2026)

**Pattern**: Always run `php -l` on PHP files after uploading to a server. A syntax error in `functions.php` can take down the entire WordPress site (white screen of death).

```bash
# After uploading functions.php
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "php -l '$REMOTE_FILE'"
```

**Rule**: Never push PHP changes to a WordPress server without running `php -l` immediately after. Include this step in any deployment script. The push script at `scripts/staging/push-blog-functions.sh` does this automatically.
