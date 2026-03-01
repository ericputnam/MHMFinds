# PRD 8: /homepage/ Redirect to /

**Created**: 2026-02-20
**Data source**: GSC URL Inspection API + search analytics (Feb 13-20, 2026)
**Priority**: Medium — quick fix that prevents homepage signal dilution

---

## Problem

The WordPress blog has a page at `/homepage/` (page-id-25) that is indexed by Google as a separate URL from the Next.js homepage at `/`. This creates two competing "homepage" entries in search results:

| URL | Type | Clicks (7d) | Impressions (7d) | Position | Indexed? |
|-----|------|-------------|-------------------|----------|----------|
| `musthavemods.com/` | Next.js homepage | 159 | 2,012 | 42.3 | Yes |
| `musthavemods.com/homepage/` | WordPress page | 2 | 8 | 6.5 | Yes (crawled Feb 17) |

**GSC Inspection of `/homepage/`**:
- Verdict: PASS (Submitted and indexed)
- Google canonical: `https://musthavemods.com/homepage/` (self-canonical)
- User canonical: `https://musthavemods.com/homepage/` (self-canonical)
- Referring URL: `musthavemods.com/page-sitemap.xml`

The `/homepage/` page self-canonicalizes and is referenced in the WordPress page sitemap. It should either redirect to `/` or have its canonical set to `/`.

---

## Root Cause

The WordPress blog uses `/homepage/` as its front page (page-id-25, the page with the hero glow effect). This was the WordPress "homepage" before the Next.js app took over the root `/` URL. Now both exist:

- `/` → Served by Next.js (the actual homepage users see)
- `/homepage/` → Served by WordPress through the middleware proxy

Since the middleware rewrites canonicals to `musthavemods.com` but doesn't know that `/homepage/` is a duplicate of `/`, it passes through the self-canonical.

---

## Implementation Options

### Option A: Middleware 301 Redirect (Recommended)

Add a redirect rule in `middleware.ts` that sends `/homepage/` to `/` before it reaches WordPress:

```typescript
// In the middleware function, before WordPress proxy logic:
if (pathname === '/homepage' || pathname === '/homepage/') {
  return NextResponse.redirect(new URL('/', request.url), 301);
}
```

**Pros**: Clean 301 redirect, works immediately, no WordPress changes needed.
**Cons**: Requires code change + deployment.

### Option B: Rank Math Canonical Override (WordPress-only)

Set Rank Math canonical on the WordPress `/homepage/` page to point to `https://musthavemods.com/`:

```bash
ssh -i ~/.ssh/bigscoots_staging nginx@74.121.204.122 -p 2222
cd /home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public
wp post meta update 25 rank_math_canonical_url "https://musthavemods.com/"
```

**Pros**: No code deployment needed. Quick to implement.
**Cons**: Canonical is a hint, not a directive — Google may ignore it. The page stays accessible.

### Option C: Both (Belt and Suspenders)

Do both — set the Rank Math canonical AND add the middleware redirect. The redirect catches all traffic immediately, and the canonical serves as a backup signal.

---

## Recommended: Option A (Middleware Redirect)

A 301 redirect is the strongest signal to Google. It's a one-line change in the middleware that:
1. Immediately redirects any user/crawler hitting `/homepage/`
2. Sends a clear "this URL has permanently moved" signal
3. Consolidates all link equity to `/`

### Implementation

In `middleware.ts`, add before the WordPress proxy logic:

```typescript
// Redirect /homepage/ to / (WordPress front page → Next.js homepage)
if (pathname === '/homepage' || pathname === '/homepage/') {
  return NextResponse.redirect(new URL('/', request.url), 301);
}
```

### Verification

```bash
# Should return 301 with Location: https://musthavemods.com/
curl -sI "https://musthavemods.com/homepage/"

# Should return 200 (the actual homepage)
curl -sI "https://musthavemods.com/"
```

---

## Acceptance Criteria

- [ ] `https://musthavemods.com/homepage/` returns 301 redirect to `https://musthavemods.com/`
- [ ] `https://musthavemods.com/homepage` (no trailing slash) also redirects
- [ ] The Next.js homepage at `/` continues to work normally
- [ ] Request reindexing of `/homepage/` in GSC after deploying

---

## Risks

- **Low risk**: The `/homepage/` URL gets minimal traffic (2 clicks/week). A redirect won't disrupt any meaningful user flows.
- **WordPress admin**: The WordPress admin dashboard links to `/homepage/` for editing. This won't be affected since admin links go directly to `wp-admin/post.php?post=25`.

## Out of Scope

- Removing `/homepage/` from the WordPress page sitemap (it will naturally drop after the 301 redirect signals Google)
- Updating internal WordPress links that reference `/homepage/` (the redirect handles them)
