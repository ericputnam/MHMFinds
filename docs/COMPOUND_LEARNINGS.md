# Compound Learnings: Jan-Feb 2026

Accumulated development patterns, gotchas, and best practices discovered during active development of MHMFinds (ModVault). Organized by category for quick reference.

---

## Build & Compilation

### Build-Time Initialization Errors

Static class properties that access environment variables fail at build time because env vars are not available during `next build`.

```typescript
// WRONG - Fails at build time
export class StripeService {
  private static stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// CORRECT - Lazy initialization via getter
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

### Regex Compatibility

ES2018+ regex features (like the `s` flag for dotAll) cause build failures when targeting older Node versions.

```typescript
// May fail in some environments
const pattern = /some.pattern/s;

// Use character class alternative instead
const pattern = /some[\s\S]pattern/;
```

**Rule**: Avoid ES2018+ regex flags. Use `[\s\S]` instead of `.` with the `s` flag.

### ESLint: Unescaped Entities

The `react/no-unescaped-entities` rule causes build failures for apostrophes in JSX text (e.g., "don't", "it's"). This rule is disabled in `.eslintrc.json`:

```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "react/no-unescaped-entities": "off"
  }
}
```

Alternative: Use `&apos;` for apostrophes, but this reduces readability.

### tsconfig.json: Excluding Non-Next.js Directories

Cloned or downloaded projects in the repo root (Vite apps, WordPress exports, staging snapshots) cause TypeScript compilation errors. Add them to `tsconfig.json` `exclude`:

```json
{
  "exclude": [
    "node_modules",
    "newapp",
    "newapp_musthavemods",
    "staging",
    "musthavemods---sims-4-cc-&-mods-blog"
  ]
}
```

**Rule**: When adding reference projects, design mockups, or staging snapshots to the repo, always add them to `tsconfig.json` `exclude`.

### Stale npm Scripts

After deleting scripts from `scripts/`, always check `package.json` for stale npm script entries that reference them. Remove any that point to deleted files.

---

## Next.js Patterns

### `force-dynamic` for Auth-Dependent Routes

API routes using `getServerSession()`, `cookies()`, `headers()`, or `request.url` fail during Next.js static generation at build time.

```typescript
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  // ...
}
```

**Rule**: Any API route that reads auth state or request-specific data must export `dynamic = 'force-dynamic'`.

### `useSearchParams()` Requires Suspense Boundary

Next.js 14 requires components that call `useSearchParams()` to be wrapped in a `<Suspense>` boundary. Without it, the entire page fails to render with a build error.

```tsx
// Server component wraps client component in Suspense
import { Suspense } from 'react';

export default async function GamePage({ params }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <GamePageClient gameName={gameName} gameSlug={game} />
    </Suspense>
  );
}
```

**Rule**: Any client component using `useSearchParams()` must be wrapped in `<Suspense>` by its parent server component.

### Migrating `<img>` to `next/image`

Use `next/image` with `unoptimized` for external/user-provided URLs that are not on approved `next.config.js` domains:

```tsx
// Fixed-size elements: explicit width/height
<Image
  src={user.avatar}
  alt={user.name}
  width={48}
  height={48}
  unoptimized
  className="w-12 h-12 rounded-full object-cover"
/>

// Responsive containers: fill mode
<Image
  src={mod.thumbnail}
  alt={mod.title}
  fill
  unoptimized
  sizes="(max-width: 768px) 100vw, 33vw"
  className="w-full h-full object-cover"
/>
```

`unoptimized` bypasses Next.js Image Optimization (which would fail for unapproved domains). Use `fill` for responsive containers, explicit `width`/`height` for fixed-size elements.

### `useCallback` for `useEffect` Dependencies

Wrap fetch functions in `useCallback` and list them in the dependency array to satisfy `react-hooks/exhaustive-deps`:

```tsx
// WRONG - Lint warning: missing dependency 'fetchUsers'
const fetchUsers = async () => { /* uses searchQuery */ };
useEffect(() => { fetchUsers(); }, [searchQuery]);

// CORRECT
const fetchUsers = useCallback(async () => { /* uses searchQuery */ }, [searchQuery]);
useEffect(() => { fetchUsers(); }, [fetchUsers]);
```

**Rule**: Any function called inside `useEffect` that references state/props must be wrapped in `useCallback` with appropriate dependencies.

### URL State Sync Without Scroll Jump

When updating filter/sort/page state on browse pages, use `router.replace` with `{ scroll: false }` to keep the user's scroll position intact:

```tsx
router.replace(newUrl, { scroll: false });
```

**Rule**: Use `router.replace` (not `router.push`) for filter/sort/pagination URL updates. `replace` avoids polluting the browser history with every filter change. Always pass `{ scroll: false }`.

---

## API Patterns

### Zod Validation on API Input

All API routes that accept user input should validate with Zod schemas from `lib/validation/schemas.ts`:

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

Return structured `{ error, details }` responses on validation failure.

### Fire-and-Forget Email Notifications

Email notifications should not block API responses or cause failures if the email service is down:

```typescript
// Fire-and-forget: don't await, don't let failures propagate
void Promise.resolve(emailNotifier.send(to, subject, html)).catch((err) => {
  console.error('Failed to send email:', err);
});
```

Key points:
- `void` explicitly discards the promise (satisfies `no-floating-promises` lint rule)
- `Promise.resolve()` wraps for safety if `send()` might throw synchronously
- `.catch()` prevents unhandled rejections
- Log failures but never fail the API response

Environment variables: `SUBMISSIONS_ALERT_EMAIL` or `ADMIN_EMAIL` for admin notifications. If neither is set, email is silently skipped.

### OAuth2 Token Caching

Module-level cache pattern for APIs using OAuth2 (e.g., Amazon Creators API):

```typescript
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Check cache with 60s buffer before expiry
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const data = await fetchToken();

  // Cache with 30s safety buffer from actual expiry
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in || 3600) - 30) * 1000,
  };

  return data.access_token;
}
```

Key points:
1. Use module-level variable (not class property) for token cache
2. Check expiry with 60s buffer time
3. Set expiry with 30s safety buffer when caching
4. For Cognito/OAuth2, use `application/x-www-form-urlencoded` not JSON

### API Response Case Handling

External APIs may return responses in different casing (camelCase vs PascalCase) depending on version or endpoint:

```typescript
// Handle both conventions with fallback
const searchResult = data.searchResult || data.SearchResult;
const items = searchResult?.items || searchResult?.Items;
const itemInfo = item.itemInfo || item.ItemInfo;
```

**Rule**: When integrating with external APIs, always handle both casing conventions using fallback patterns.

### Amazon Creators API

- Requires **3 qualifying sales within 180 days** before API access is granted
- Error signature when ineligible: `reason: 'AssociateNotEligible'`
- Authorization header format (unique to this API): `Bearer ${token}, Version ${version}`
- Cognito token endpoint (NA): `https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token`
- Content-Type for token requests: `application/x-www-form-urlencoded`
- Implement fallback scraping (`amazonScraperService.ts`) when API access is pending

---

## UI Patterns

### Optimistic UI for Favorite Toggling

Toggle the UI state immediately on click, then rollback if the API call fails:

```tsx
const handleFavorite = async (modId: string) => {
  const isFavorited = favorites.includes(modId);

  // Optimistic update
  setFavorites(prev =>
    isFavorited ? prev.filter(id => id !== modId) : [...prev, modId]
  );

  const response = await fetch(`/api/mods/${modId}/favorite`, {
    method: isFavorited ? 'DELETE' : 'POST',
  });

  if (!response.ok) {
    // Rollback on failure
    setFavorites(prev =>
      isFavorited ? [...prev, modId] : prev.filter(id => id !== modId)
    );
    if (response.status === 401) alert('Please sign in to favorite mods');
  }
};
```

**Rule**: For interactive toggles (favorites, likes, bookmarks), always use optimistic UI with rollback. API latency would otherwise make the UI feel sluggish.

### Navbar Hover Dropdown with Timeout Debounce

Simple `onMouseEnter`/`onMouseLeave` on dropdowns causes flickering when users move between the trigger and the dropdown content (brief gap between elements):

```tsx
const gamesMenuTimeout = useRef<NodeJS.Timeout | null>(null);

const handleGamesMouseEnter = () => {
  if (gamesMenuTimeout.current) clearTimeout(gamesMenuTimeout.current);
  setShowGamesMenu(true);
};

const handleGamesMouseLeave = () => {
  gamesMenuTimeout.current = setTimeout(() => setShowGamesMenu(false), 150);
};

useEffect(() => {
  return () => {
    if (gamesMenuTimeout.current) clearTimeout(gamesMenuTimeout.current);
  };
}, []);
```

The 150ms delay on close prevents flickering. `clearTimeout` on enter cancels any pending close, so moving from trigger to dropdown keeps it open.

### No Gradients Rule

Gradients are considered an "AI tell" and are prohibited throughout the project. Even glow/blur effects should use solid colors:

```css
/* WRONG - gradient glow */
bg-gradient-to-r from-sims-pink to-sims-blue

/* CORRECT - solid pink glow */
bg-sims-pink/30
```

`bg-sims-pink/30` with `blur-xl` produces a nice glow without gradients. Use solid background colors, solid border colors, and box shadows for depth.

---

## Multi-Game Architecture

### Overview

- Homepage is game-agnostic (no default `gameVersion` filter). Shows all games.
- Game-specific pages at `/games/[game]` provide full browse experience (search, facets, sort, pagination).
- Game config centralized in `lib/gameColors.ts` (colors, taglines) and `lib/gameRoutes.ts` (slugs, metadata).
- Navbar dropdown auto-populates from `GAME_COLORS` config.

### Adding a New Game

Checklist:
1. `lib/gameColors.ts` - Add color and tagline (may already be pre-configured)
2. `lib/gameRoutes.ts` - Add slug mapping and SEO metadata
3. `components/Hero.tsx` - Add game-specific trending searches to `trendingByGame`
4. WordPress - Create game landing page and category
5. Verify Navbar dropdown auto-populates

Animal Crossing is pre-configured in `gameColors.ts` (color: `#06b6d4`) but not live yet.

### Navigation: `<a>` vs `<Link>` for WordPress Routes

WordPress pages are served via Vercel rewrites, not from the Next.js app. Using `<Link>` for these routes causes client-side navigation failures:

```tsx
// WRONG - Next.js client-side navigation won't work
<Link href="/blog">Blog</Link>

// CORRECT - Standard anchor triggers full page load through Vercel rewrite
<a href="/blog">Blog</a>
```

**Rule**: Use `<a href>` (not `<Link>`) for any route proxied to WordPress (`/blog`, `/sims-4/`, `/stardew-valley/`, `/minecraft/`). Use `<Link>` only for routes handled by the Next.js app.

### Legal Disclaimers

Use "copyright their respective publishers" rather than listing every publisher individually. More maintainable as games are added. Current publishers: Electronic Arts (Sims 4), ConcernedApe (Stardew Valley), Mojang Studios (Minecraft).

---

## Web Scraping

### Rate Limits and Privacy Levels

Three privacy levels for content aggregation:

| Level | Delay | Features |
|-------|-------|----------|
| Default (`content:privacy`) | 3-8s | User agent rotation |
| Stealth (`content:stealth`) | 5-15s | Proxy rotation, geographic rotation |
| Conservative (`content:conservative`) | 10-30s | Strictest rate limiting |

**Rule**: Start with conservative delays (3-6s minimum) and increase if blocked.

### Amazon-Specific

- Initial 1-3s delays caused blocking. Increased base delays to 3-6s.
- Add user agent rotation and retry logic with exponential backoff.
- Clean and truncate scraped titles (Amazon uses keyword spam in product titles).

---

## Database & Prisma

### PostgreSQL Enum Casting in Raw SQL

When using Prisma raw SQL (`$queryRaw`), PostgreSQL enum values require explicit `::text` casting for string comparisons:

```typescript
// WRONG - Fails with type mismatch
AND ma."actionType" = ${actionType}

// CORRECT - Cast enum to text
AND ma."actionType"::text = ${actionType}
```

### Prisma Decimal Type in React Components

Prisma `Decimal(10,2)` fields (like `price`) may arrive as strings, not numbers, depending on serialization path:

```typescript
// WRONG - May fail if price is a Decimal string
const display = product.price.toFixed(2);

// CORRECT - Coerce to Number first
const price = typeof product.price === 'number' ? product.price : Number(product.price);
const display = price.toFixed(2);
```

**Rule**: Always coerce Prisma Decimal values to `Number()` before arithmetic or formatting operations.

### Prisma Scripts Environment Setup

Standalone scripts (in `scripts/`) cannot use Prisma Accelerate URLs (`prisma+postgres://`). They need direct database connections. Import `setup-env.ts` at the very top of any script, before other imports:

```typescript
// MUST be the first import in any script that uses Prisma
import '../lib/setup-env';
```

This module detects Accelerate URLs and swaps `DATABASE_URL` with `DIRECT_DATABASE_URL`. It also loads `.env.local`.

**Rule**: Every new script that touches the database must import `setup-env.ts` first, or it will fail with cryptic Accelerate connection errors.

### Cache Invalidation After Mutations

Call `CacheService.invalidateMod(id)` after every admin mutation:

```typescript
await prisma.mod.delete({ where: { id } });
await CacheService.invalidateMod(id);
```

For bulk operations, invalidate all affected IDs:

```typescript
await Promise.all(modIds.map((id: string) => CacheService.invalidateMod(id)));
```

**Rule**: Every admin mutation (create/update/delete) must be followed by cache invalidation.

### FacetDefinition Best Practices

1. **Deactivate, don't delete**: Set `isActive=false` on old facets rather than deleting
2. **Atomic operations**: Wrap bulk updates in transactions
3. **Dry run first**: Scripts should have `--fix` flag, default to preview mode
4. **Log progress**: Write progress files for long-running operations

Example facet split:
- Original: `lot` facet (636 mods)
- Split into: `residential` (592), `commercial` (31), `entertainment` (6), `community` (7)
- Old `lot` facet deactivated but preserved for reference

---

## Security

### Admin API Route Defense-in-Depth

All admin routes require two layers of protection:

1. **Middleware** (`middleware.ts`): Blocks ALL `/api/admin/*` requests without admin auth
2. **Route-level auth**: Each handler calls `requireAdmin(request)` independently

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

**Scanner**: Run `npm run security:check-admin-auth` to verify all admin routes have auth. Run before committing changes to admin routes.

**Rule**: Never create an admin API route without both middleware protection AND route-level `requireAdmin` checks.

---

## Testing

### Smoke Tests for API Routes

Lightweight integration tests that verify API route handlers work correctly with mocked Prisma:

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

Key: Mock external services (Turnstile, email) BEFORE importing the route handler. Centralized Prisma mock at `__tests__/setup/mocks/prisma.ts`.

### PRD-Based Task Planning

For code cleanup initiatives or feature work, create a PRD in `tasks/prd-compound/` with:

1. Clear acceptance criteria (checkboxes)
2. Phase breakdown (group related changes)
3. Files to modify table (explicit list with change descriptions)
4. Testing plan (pre/post verification commands)
5. Risks and rollback (document potential issues)

```markdown
# PRD: [Task Name]

## 1. Overview
## 2. Requirements (acceptance criteria with checkboxes)
## 3. Technical Approach (phases)
## 4. Files to Modify (table)
## 5. Testing Plan
## 6. Risks
## 7. Out of Scope
## 8. Definition of Done
```

---

## Scripts & Tooling

### Dead Code Cleanup: Dependency-Aware Removal

When removing dead code, check for orphaned dependencies:

1. Delete the unused files
2. Run `grep -r "from 'package-name'" --include='*.ts' --include='*.tsx'` to check if any remaining code uses the dependency
3. Remove orphaned packages from `package.json`
4. Run `npm install` to update the lockfile
5. Verify with `npm run build`

Packages removed in the Feb 2026 cleanup: `framer-motion`, `@headlessui/react`, `@heroicons/react`, `@stripe/stripe-js`, `jsonwebtoken`, `msw` (and their `@types/*` counterparts).

**Rule**: Dead code that imports heavy libraries bloats the bundle even though nothing renders. Always check dependency usage after deleting files.

### Script Archival

Move completed/obsolete scripts to `scripts/archive/` instead of deleting them:

```
scripts/
  archive/           # Completed one-time scripts and references
    README.md        # Index of archived scripts
    ralph/           # Agent-generated scripts
  compound/          # Automated compound system
  lib/               # Shared script utilities (setup-env.ts)
  *.ts               # Active, currently-used scripts
```

**Rule**: Archive old scripts rather than deleting. Add a README.md to `scripts/archive/` explaining what each script was for.

### PHP Lint After Remote Deployments

Always run `php -l` on PHP files after uploading to a server. A syntax error in `functions.php` can take down the entire WordPress site:

```bash
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "php -l '$REMOTE_FILE'"
```

**Rule**: Never push PHP changes to a WordPress server without running `php -l` immediately after. The push scripts at `scripts/staging/push-blog-functions.sh` and `push-blog-functions-prod.sh` do this automatically.

### Design Reference App Changes

When the design reference app (`newapp/`) changes, update three things:
1. CLAUDE.md section about the reference folder
2. `tsconfig.json` exclude array (add the new directory name)
3. `.gitignore` if the new app has its own `node_modules` or build output

Current reference: `newapp/` uses Vite + React 19 + Tailwind CSS v4 + `motion` (framer-motion successor). Do NOT add `motion` to the main project.

---

## Vercel Routing & vercel.json

### `:path*` vs `:path+` Semantics

`:path*` matches zero-or-more path segments. `:path+` matches one-or-more. This distinction is critical for route ordering:

```json
// WRONG - /blog/ matches BOTH rules (`:path*` includes zero segments)
{ "source": "/blog", "destination": "https://blog.example.com/homepage/" },
{ "source": "/blog/:path*", "destination": "https://blog.example.com/:path*" }

// CORRECT - /blog/ only matches the explicit rule; catch-all needs ≥1 segment
{ "source": "/blog", "destination": "https://blog.example.com/homepage/" },
{ "source": "/blog/", "destination": "https://blog.example.com/homepage/" },
{ "source": "/blog/:path+", "destination": "https://blog.example.com/:path+" }
```

**Rule**: Always use `:path+` for catch-all rewrites when you have explicit rules for the base path.

### Trailing Slash + Catch-All Interaction

With `trailingSlash: true` in `next.config.js`, Next.js auto-redirects `/path` → `/path/`. This redirect then matches catch-all patterns:

```
Request: /blog → 308 redirect to /blog/ → matches /blog/:path* (zero segments!) → wrong destination
```

**Fix**: Define explicit rules for BOTH `/path` and `/path/` before any catch-all. Use `:path+` instead of `:path*`.

### Negative Lookahead Exclusion Lists

The catch-all slug pattern `/:slug((?!api|admin|creators|...).*)/` serves as a **whitelist of excluded routes**. Every Next.js route prefix that shouldn't proxy to WordPress must be listed:

```json
{ "source": "/:slug((?!api|admin|creators|mods|games|blog|_next|favicon).*)/" }
```

**Rule**: When adding a new top-level Next.js route (e.g., `/pricing`), add it to the negative lookahead in ALL slug patterns in vercel.json, or the route will be proxied to WordPress.

### Route Precedence Summary

```
1. Redirects (processed first, highest priority)
2. Rewrites (processed in defined order)
   - Specific paths beat catch-alls
   - :path+ (≥1 segment) beats :path* (≥0 segments)
   - First match wins; later rules don't override
3. Vercel edge rewrites bypass Next.js middleware entirely
```

---

## WordPress Proxy & SEO

### Vercel Rewrite Execution Order

Vercel processes rewrites in this order:
1. `vercel.json` rewrites (edge layer) -- runs FIRST
2. Next.js middleware -- runs SECOND, only for requests NOT already handled by edge rewrites

If a `vercel.json` rewrite matches, the request goes directly to the destination and **never reaches middleware**.

**Rule**: Never put HTML-serving rewrites in `vercel.json` if you need middleware to process the response (SEO tags, auth, analytics). Edge rewrites are only safe for static assets (`wp-content`, `wp-includes`).

### Middleware WordPress Proxy Architecture

The middleware detects WordPress vs Next.js routes using a `NEXTJS_PREFIXES` set:

- **`<head>`**: Rewrite ALL `blog.musthavemods.com` references (canonical, og:url, oEmbed). Strip noindex meta tags.
- **`<body>`**: Only rewrite `href=` links (navigation). Leave `src=` links on blog CDN.
- **XML** (sitemaps, RSS): Rewrite all domain references throughout.
- Drop `content-length`, `content-encoding`, `transfer-encoding`, `x-robots-tag` headers from WordPress response.
- URL-encoded references (`https%3A%2F%2Fblog.musthavemods.com`) also need rewriting.

### SEO Meta Title Rules

1. Primary keyword near the front (e.g., "Sims 4 Mods" not "MustHaveMods - Premium...")
2. Under 60 characters to avoid truncation in SERPs
3. Include quantity signals when available ("10,000+", "15,000+")
4. Match user search intent: "Find", "Browse", "Search" over "Discover", "Premium"
5. Descriptions should mention specific filterable content types and include a CTA

### Content Cannibalization via WordPress `-2` Suffixes

WordPress auto-appends `-2` to slugs when duplicates exist. Both pages self-canonicalize, splitting ranking signals.

Fix with Rank Math canonical:
```bash
wp post meta update <ID> rank_math_canonical_url "https://musthavemods.com/<primary-slug>/"
```

Choose the primary URL based on better position and more clicks in GSC data.

### Blog Route Architecture

`/blog` serves a styled WordPress landing page, not the raw archive:

| Route | Destination | Purpose |
|-------|-------------|---------|
| `/blog` | `blog.musthavemods.com/homepage/` | Styled landing page |
| `/blog/` | `blog.musthavemods.com/homepage/` | Same (trailing slash) |
| `/blog/all` | `blog.musthavemods.com/` | Raw WordPress archive |
| `/blog/all/` | `blog.musthavemods.com/` | Same (trailing slash) |
| `/blog/:path+` | `blog.musthavemods.com/:path+` | Individual posts/pages |

**Rule**: When replacing a URL's destination (archive → landing page), always provide an alternative route for the original content. Users and bots may link to the archive.

### Sitemap Hygiene

**Empty sitemaps**: Keep previously-submitted sitemaps alive as empty `<urlset />` rather than returning 404. GSC reports errors on 404 sitemaps and it takes weeks to clear.

**Stable lastmod dates**: Use date strings (`'2026-02-24'`), never `new Date().toISOString()` or `Date.now()`. Dynamic timestamps change on every request, making lastmod meaningless — Google ignores it.

**Priority hierarchy**:
- Homepage: `1.0`, `daily`
- Mod/game browse pages: `0.9`, `daily`
- Creator pages: `0.7`, `weekly`
- Blog posts: `0.6`, `weekly`

**Cross-sitemap deduplication**: A URL should appear in exactly one sitemap. Don't list `/blog` in both `sitemap-nextjs.xml` and `sitemap-blog-pages.xml`.

**Category sitemaps**: If all WordPress categories serve `noindex`, remove the category sitemap from the sitemap index (but keep the route alive as empty XML).

### robots.txt Parameter URL Blocking

Block low-value parameter URLs that waste crawl budget:

```
Disallow: /*?creator=
Disallow: /*?cat=
Disallow: /*?p=
Disallow: /*?page_id=
```

Append these to the WordPress robots.txt in `app/robots.txt/route.ts` with deduplication checks (`if (!result.includes(rule))`).

### Content Cannibalization: 301 Redirects

Previously used Rank Math canonical meta tags to consolidate `-2` suffix duplicates. Now uses **301 redirects in vercel.json** for stronger signal:

```json
{ "source": "/sims-4-cc-clothes-packs-2025/", "destination": "/sims-4-cc-clothes-packs/", "statusCode": 301 }
```

Both vercel.json redirects (edge-level, fastest) and PHP fallback redirects (in WordPress functions.php, for direct blog subdomain access) are in place. The PHP redirect checks `X-Forwarded-Host` to detect Vercel-proxied requests vs direct access.

### `/homepage/` Signal Dilution

The WordPress front page at `/homepage/` was indexed separately from the Next.js homepage at `/`. Fix: 301 redirect in `middleware.ts`:

```typescript
if (pathname === '/homepage' || pathname === '/homepage/') {
  return NextResponse.redirect(new URL('/', request.url), 301);
}
```

**Rule**: When migrating from WordPress to Next.js, audit for legacy pages that duplicate Next.js routes. Common candidates: `/homepage/`, `/home/`, `/front-page/`.

---

## Compound Automation System

### Architecture

```
scripts/compound/
  auto-compound.sh    # Main pipeline orchestrator
  loop.sh             # Task execution loop (max 25 iterations)
  analyze-report.sh   # Extracts top priority from reports
  daily-compound-review.sh  # Nightly learning review
  launchd/*.plist     # macOS scheduler configurations
```

Schedule:
- 10:00 PM: `daily-compound-review.sh` -- reviews git log, updates CLAUDE.md, commits
- 11:00 PM: `auto-compound.sh` -- reads priority report, creates branch, generates PRD, executes tasks, creates draft PR

### Task JSON Format

```json
{
  "tasks": [
    { "id": 1, "title": "Task name", "description": "What to do", "status": "pending" }
  ]
}
```

Status values: `pending` -> `completed` or `blocked`.

### Rules

1. Always works on feature branches, never main
2. Draft PRs require human review before merge
3. Failed tasks marked `blocked`, loop continues to next
4. Max 25 iterations per run to prevent runaway execution

### Agent Workflow

```
/commitit -> /reviewit -> /shipit
    |            |            |
    v            v            v
 Feature     PR Summary    Production
 Branch      + Checks      Deployment
```

Key files:
- `.claude/agents/<name>/plan.md` -- Implementation plan (review before running)
- `.claude/agents/<name>/prompt.md` -- Agent system prompt
- `.claude/skills/reviewit/skill.md` -- PR review skill

---

## WordPress Staging & Production

### Staging Workflow

```bash
# Pull from staging server
./scripts/staging/pull-blog-functions.sh

# Edit locally with full IDE support
vim staging/wordpress/kadence-child/functions.php

# Push back (auto-backup, lint, cache flush)
./scripts/staging/push-blog-functions.sh
```

### Production Workflow

```bash
# Pull from production
./scripts/staging/pull-blog-functions-prod.sh

# Compare environments
diff staging/wordpress/kadence-child/functions.php staging/wordpress/kadence-child-prod/functions.php

# Push to production (requires interactive confirmation)
./scripts/staging/push-blog-functions-prod.sh
```

Production push displays the exact `scp` rollback command after success.

### Environment Snapshots

```
staging/wordpress/
  kadence-child/           # Staging server snapshot (~4300 lines)
  kadence-child-prod/      # Production server snapshot (~200 lines)
```

**Rule**: Always pull both snapshots before making changes. The size difference indicates unreleased work. Never push staging to production without reviewing the diff.

### Gutenberg Shortcode Rendering Bug

When WordPress pages use Gutenberg's shortcode block, raw block comments (`<!-- wp:shortcode -->`) may render as visible text. Fix via WP-CLI:

```bash
wp post update 36977 --post_content='[mhm_game_hub game="sims-4"]'
```

**Rule**: For shortcode-only pages, use `wp post update` with raw shortcode text. The Gutenberg editor will re-add wrappers if you edit in the admin UI.
