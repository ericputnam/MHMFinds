# WordPress Guide

All WordPress-related knowledge for the MustHaveMods project.

---

## Proxy Architecture

The WordPress blog lives at `blog.musthavemods.com` and is proxied through `musthavemods.com` so users see a single unified domain.

### How Routing Works

- **Static assets** (`/wp-content/*`, `/wp-includes/*`) are served via `vercel.json` edge rewrites. These go directly to `blog.musthavemods.com` without passing through Next.js middleware.
- **HTML routes** (blog posts, categories, tags, feeds, sitemaps) go through Next.js middleware. This allows canonical URL rewriting, noindex stripping, and other SEO transformations.
- **Middleware detection**: The middleware uses a `NEXTJS_PREFIXES` set (containing `api`, `admin`, `creators`, `mods`, `account`, `sign-in`, `submit-mod`, `about`, `privacy`, `terms`, `games`, `go`, `_next`, `sitemap`, `manifest`) to distinguish Next.js routes from WordPress routes. Any first path segment not in this set (and not a file extension) is treated as a WordPress route.

### HTML Rewriting Strategy

The middleware rewrites `blog.musthavemods.com` references differently depending on context:

- **`<head>`**: Rewrites ALL `blog.musthavemods.com` references (canonical URLs, `og:url`, oEmbed discovery links). Also strips `noindex` meta tags.
- **`<body>`**: Only rewrites `href=` links (navigation). Does NOT rewrite `src=` links (images, scripts, and CSS stay on the blog CDN).
- **XML** (sitemaps, RSS): Rewrites all domain references throughout the document.
- **URL-encoded references**: `https%3A%2F%2Fblog.musthavemods.com` also gets rewritten (oEmbed discovery links use encoded URLs).

### Key Middleware Headers

- Send `X-Forwarded-Host: musthavemods.com` to WordPress so it knows the request came via the proxy.
- Drop `content-length`, `content-encoding`, and `transfer-encoding` headers from the WordPress response (the body is rewritten, so these values are invalid).
- Drop `x-robots-tag` header to prevent noindex leaking through response headers.

### Critical Rule

On Vercel, never put HTML-serving rewrites in `vercel.json` if you need middleware to process the response. Vercel processes `vercel.json` rewrites at the edge layer BEFORE Next.js middleware runs. If a `vercel.json` rewrite matches, the request goes directly to the destination and never reaches middleware. Only keep static asset rewrites in `vercel.json`.

---

## Navigation: `<a>` vs `<Link>`

Use standard `<a href>` tags (not Next.js `<Link>`) for any route that is proxied to WordPress via Vercel rewrites:

```tsx
// WordPress-proxied routes - use <a>
<a href="/blog">Blog</a>
<a href="/sims-4/">Sims 4</a>
<a href="/stardew-valley/">Stardew Valley</a>
<a href="/minecraft/">Minecraft</a>

// Next.js routes - use <Link>
<Link href="/mods/123">Mod Detail</Link>
<Link href="/games/sims-4">Game Page</Link>
```

Using `<Link>` for WordPress routes causes client-side navigation failures because the Next.js router cannot handle content served by WordPress.

---

## Staging Environment

| Detail | Value |
|--------|-------|
| URL | `blogmusthavemodscom.bigscoots-staging.com` |
| SSH | `ssh -i ~/.ssh/bigscoots_staging nginx@74.121.204.122 -p 2222` |
| Theme | Kadence with `kadence-child` child theme |
| DB table prefix | `ooc_` (NOT `wp_`) |
| Theme file path | `/home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public/wp-content/themes/kadence-child/functions.php` |

---

## Staging Deployment Workflow

Git-tracked snapshots of the theme file live in the repo. Always use the scripts rather than editing directly on the server via SSH.

### Pull from staging

```bash
./scripts/staging/pull-blog-functions.sh
```

This downloads the current `functions.php` from the staging server to `staging/wordpress/kadence-child/functions.php`.

### Edit locally

Edit the local snapshot with full IDE support, git diff, and code review capability.

### Push to staging

```bash
./scripts/staging/push-blog-functions.sh
```

The push script automatically:
1. Creates a timestamped backup on the server (`functions.php.bak.<epoch>`)
2. Uploads the local file
3. Runs `php -l` syntax check (catches fatal errors before they take down the site)
4. Flushes the WP object cache and transients

---

## Production Deployment Workflow

| Detail | Value |
|--------|-------|
| Production URL | `blog.musthavemods.com` |
| Theme file path | `/home/nginx/domains/blog.musthavemods.com/public/wp-content/themes/kadence-child/functions.php` |
| Local snapshot | `staging/wordpress/kadence-child-prod/functions.php` |

### Pull from production

```bash
./scripts/staging/pull-blog-functions-prod.sh
```

Downloads to `staging/wordpress/kadence-child-prod/functions.php`.

### Push to production

```bash
./scripts/staging/push-blog-functions-prod.sh
```

The production push script includes the same safety features as staging (backup, `php -l`, cache flush) plus:
- An interactive confirmation prompt (`Continue? y/N`) before uploading
- Prints the exact `scp` command needed to restore from the backup after a successful push

### Promoting staging to production

```bash
# 1. Pull latest from both environments
./scripts/staging/pull-blog-functions.sh
./scripts/staging/pull-blog-functions-prod.sh

# 2. Compare differences
diff staging/wordpress/kadence-child/functions.php staging/wordpress/kadence-child-prod/functions.php

# 3. When ready, copy staging to prod location and push
cp staging/wordpress/kadence-child/functions.php staging/wordpress/kadence-child-prod/functions.php
./scripts/staging/push-blog-functions-prod.sh

# 4. Verify at https://blog.musthavemods.com
```

As of Feb 2026, staging is approximately 4,300 lines and production is approximately 200 lines, indicating a large amount of unreleased work. Always review the diff before promoting.

---

## Kadence Theme Gotchas

### CSS Injection

All custom CSS is injected via the `mhm_dark_theme_inline_css()` function in `functions.php` using the `wp_head` hook at priority 9999. This ensures styles override Kadence's defaults.

### Specificity

Always use `!important` with high-specificity selectors. Kadence uses aggressive inline styles that override normal CSS.

### Common Selectors

| Target | Selector |
|--------|----------|
| Palette colors | `.has-theme-palette8-background-color` |
| Row layouts | `.kb-row-layout-wrap`, `.kt-row-column-wrap` |
| Post grids | `.kadence-posts-list.grid-cols`, `.grid-lg-col-2` |

### Cache Clearing

```bash
# Via SSH (staging)
cd /home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public && wp cache flush

# BigScoots full cache purge (in PHP)
BigScoots_Cache::get_instance()->get_cache_controller()->get_purge_service()->purge_all();
```

---

## Gutenberg Shortcode Issue

When WordPress pages use Gutenberg's shortcode block, it wraps the shortcode in HTML comments:

```
<!-- wp:shortcode -->[mhm_game_hub game="sims-4"]<!-- /wp:shortcode -->
```

If the theme or shortcode handler does not properly process these through `the_content` filter, the block comments render as visible text on the page.

### Fix

Strip the Gutenberg wrappers via WP-CLI, keeping only the raw shortcode:

```bash
ssh -i ~/.ssh/bigscoots_staging nginx@74.121.204.122 -p 2222 \
  "cd /home/nginx/domains/blogmusthavemodscom.bigscoots-staging.com/public && \
   wp post update 36977 --post_content='[mhm_game_hub game=\"sims-4\"]'"
```

### Prevention

After creating or editing shortcode-only pages in the WordPress admin, always check the frontend for stray `<!-- wp:shortcode -->` text. For shortcode-only pages, prefer WP-CLI over the Gutenberg editor.

---

## Content Cannibalization

WordPress auto-appends `-2` to slugs when a new post/page has the same slug as an existing one. Both pages self-canonicalize, causing Google to split ranking signals between them.

### Fix

Set Rank Math canonical on the secondary page pointing to the primary:

```bash
# Find the post ID
wp post list --post_type=post --fields=ID,post_name | grep "sims-4-body-presets$"

# Set canonical to the preferred URL
wp post meta update <ID> rank_math_canonical_url "https://musthavemods.com/<primary-slug>/"
```

### How to Choose the Primary URL

Pick the one with better position and more clicks in Google Search Console data. The `-2` version often performs better because it is the newer, more complete content.

### Known Duplicate Groups (as of Feb 2026)

| Secondary URL | Canonical Target |
|---------------|-----------------|
| `/sims-4-body-presets/` | `/sims-4-body-presets-2/` |
| `/sims-4-cc-clothes-packs/` | `/sims-4-cc-clothes-packs-2025/` |
| `/sims-4-goth-cc/` | `/sims-4-goth-cc-2/` |
| `/sims-4-cc/` | `/sims-4-cc-2/` |
| `/sims-4-eyelashes-cc/` | `/sims-4-eyelashes-cc-2/` |
| `/15-must-have-sims-4-woohoo-mods-for-2025/` | `/best-woohoo-mods-sims-4-ultimate-guide/` |

### Prevention

When creating new WordPress posts, always check if a similar slug already exists. If WordPress appends `-2`, investigate whether the old post should be updated instead of creating a duplicate.

---

## Rank Math Auto-Redirects

When creating pages with the same slug as categories, Rank Math may auto-create 301 redirects in the `ooc_rank_math_redirections` table. This silently prevents the new page from loading.

Always check and delete conflicting redirects after creating pages:

```bash
wp db query "SELECT * FROM ooc_rank_math_redirections WHERE sources LIKE '%your-slug%'"
wp db query "DELETE FROM ooc_rank_math_redirections WHERE id = <ID>"
```

---

## Multi-Game Setup

### Parent Categories

| Game | Category ID |
|------|-------------|
| Sims 4 | 433 |
| Stardew Valley | 434 |
| Minecraft | 435 |

### Game Colors

| Game | Color |
|------|-------|
| Sims 4 | `#ec4899` (pink) |
| Stardew Valley | `#22c55e` (green) |
| Minecraft | `#8b5cf6` (purple) |

### Game Pill Shortcode

Use `[mhm_game_pills]` to render linked pills for each game. The shortcode detects the current page context and highlights the active game.

### Important Pages

| Page | Slug | Page ID |
|------|------|---------|
| Homepage | `/homepage/` | 25 |
| Sims 4 | `/sims-4/` | 36977 |
| Stardew Valley | `/stardew-valley/` | 36979 |
| Minecraft | `/minecraft/` | 36981 |

---

## Design System

The WordPress theme must match the Next.js app visually. All styling uses solid colors. Gradients are prohibited.

### Colors

| Role | Value |
|------|-------|
| Background | `#0B0F19` (dark navy) |
| Card background | `#151B2B` |
| Primary accent | `#ec4899` (pink) |
| Secondary accent | `#06b6d4` (cyan) |
| Text primary | `#f1f5f9` |
| Text muted | `#94a3b8` |

### Buttons

- Solid pink (`#ec4899`) background
- Pill-shaped (`border-radius: 9999px`)
- No gradients

---

## Server-Side Gotchas

### Python Version

The BigScoots server runs Python 3.6. Do not use `capture_output` in `subprocess` calls. Use `stdout=subprocess.PIPE, stderr=subprocess.PIPE` instead.

### Dollar Sign Escaping

When using Python to write PHP via SSH, `$` gets escaped to `\$`. Always run a cleanup pass after generating PHP content remotely.

### PHP Lint

Always run `php -l` on PHP files after uploading to a server. A syntax error in `functions.php` will cause a white screen of death across the entire WordPress site.

```bash
ssh -i "$SSH_KEY" -p "$REMOTE_PORT" "${REMOTE_USER}@${REMOTE_HOST}" "php -l '$REMOTE_FILE'"
```

The push scripts (`push-blog-functions.sh` and `push-blog-functions-prod.sh`) run this automatically.

### custom.css Gradients

The Kadence child theme `custom.css` had 6+ gradients that needed replacement with solid colors. When editing `custom.css`, check for and remove any gradient declarations.
