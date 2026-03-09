# Mediavine RPM Autoresearch Agent

Autonomous agent that continuously optimizes musthavemods.com for Mediavine RPM.
Inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch) — iterative experiments with a clear validation metric, auto-committing improvements, auto-reverting failures.

## Ground Rules

- You work on a feature branch `rpm-optimization`. Create it if it doesn't exist.
- You auto-commit each change with a descriptive message.
- You NEVER force-push or touch `main`. Changes accumulate on the feature branch.
- You run `npm run build` after every change. If the build breaks, `git revert HEAD --no-edit` immediately and log the failure.
- You NEVER use CSS gradients (project rule).
- You pull GA metrics as your validation signal (the equivalent of autoresearch's `val_bpb`).

## Validation Metrics

### Primary: Mediavine Dashboard (browser-use --browser real)
You have access to the Mediavine dashboard via browser-use with the user's real Chrome session.
Dashboard URL: https://publishers.mediavine.com/sites/SW50ZXJuYWxTaXRlOjE0MzE4/analytics

To read Mediavine data:
```bash
browser-use --browser real open "https://publishers.mediavine.com/sites/SW50ZXJuYWxTaXRlOjE0MzE4/analytics?metric=%5B%22revenue%22%5D&startDate=MM%2FDD%2FYYYY&endDate=MM%2FDD%2FYYYY&presetId=3"
browser-use screenshot /tmp/mediavine-check.png
# Read the screenshot to extract: Revenue, RPM, CPM, Viewability, Impressions
browser-use scroll down
browser-use screenshot /tmp/mediavine-check-2.png
# Read for: Ad Units breakdown, Traffic Source Report, Device split
browser-use close
```

Key Mediavine metrics to track:
- **RPM** (revenue per 1000 pageviews) — THE metric. Currently $13.29, target $17+
- **Viewability** — currently 56.3%, target 70%+. This is the #1 RPM lever.
- **CPM** (cost per 1000 impressions) — currently $0.97, very low due to viewability
- **Revenue by ad unit** — Content ($2,276), Adhesion ($1,038), Sidebar Sticky ($936), Universal Player ($768)

### Secondary: Google Analytics (property 437117335)
- pages/session (currently 1.46)
- avg session duration (306.9s)
- engagement rate (65.1%)
- 7-day pageviews

### Baseline (Mar 9, 2026)
- RPM: $13.29
- Viewability: 56.3%
- CPM: $0.97
- Revenue: $5,017/month
- Desktop: 94%, Mobile: 5%
- pages/session: 1.46

## Mediavine RPM Playbook (Official Guidance)

These are the levers that directly improve Mediavine RPM:

### Ad Delivery Speed
- Preconnect hints for Mediavine CDN domains (scripts.mediavine.com, cdn.mediavine.com)
- Remove `unoptimized` flag from Next.js Image components (enables optimization pipeline)
- Lazy load below-fold images
- Minimize JS conflicts with Mediavine Script Wrapper

### Content Structure (Mediavine Script Wrapper reads these)
- Proper H2/H3 heading tags — Script Wrapper uses these as ad insertion points
- Minimum 700-1,000 words per page for optimal ad density
- Text between images maintains viewability rates
- Font size 18-20px improves readability = longer sessions
- Line height 1.6-1.8

### Engagement Architecture (pages/session multiplier)
- "Related Content" sections drive 30-50% of revenue for top publishers
- Category/browse pages generate 4-5x more pages/session than article pages
- Internal linking within content (not just bottom) keeps users browsing
- Creator profile pages create discovery loops

### Structured Data (search traffic multiplier)
- JSON-LD Article schema on content pages
- BreadcrumbList for better SERP appearance
- FAQ schema for rich snippets

### First-Party Data
- Grow.me enables personalized ads as 3rd-party cookies phase out
- Free from Mediavine — recommended content, search, social sharing

## Site Architecture

### Tech Stack
- Next.js 14 + TypeScript + Prisma + PostgreSQL
- WordPress blog proxied via middleware from blog.musthavemods.com
- Mediavine script: `//scripts.mediavine.com/tags/must-have-mods-new-owner.js` (in ConditionalScripts.tsx)
- GA: G-XV4WLV1DY1 (property 437117335)

### Key Files
| Purpose | Path |
|---------|------|
| Global CSS | `app/globals.css` |
| Tailwind config | `tailwind.config.js` |
| Mod detail page | `app/mods/[id]/page.tsx` |
| Homepage layout | `app/page.tsx` |
| Game page | `app/games/[game]/GamePageClient.tsx` |
| Sidebar | `components/FacetedSidebar.tsx` |
| Mod card | `components/ModCard.tsx` |
| Mod grid | `components/ModGrid.tsx` |
| JSON-LD schema | `app/layout.tsx` (lines 99-205) |
| Ad/analytics scripts | `app/components/ConditionalScripts.tsx` |
| Image config | `next.config.js` |
| WordPress proxy | `middleware.ts` |
| Affiliate cards | `components/AffiliateRecommendations.tsx` |

### Current Known Issues (Optimization Queue — reprioritized by real data)

**CRITICAL FINDING: Viewability is 56.3% (target 70%+). This is the #1 RPM suppressor.**
Low viewability = advertisers bid less = CPM stays at $0.97 = RPM capped.
Every 1% viewability increase ≈ 1-2% RPM increase.

**Desktop is 94% of revenue** — optimize desktop-first.

1. ✅ No Mediavine CDN preconnect (DONE - Mar 9)
2. Images use `unoptimized={true}` — slow image loading hurts viewability
3. Base font is 16px (Mediavine recommends 18-20px for engagement/scroll depth)
4. No "Related Mods" section (pages/session lever → more impressions)
5. Mod detail pages are content-thin (more scroll depth = more ad slots = more viewable impressions)
6. No per-page JSON-LD Article schema (search traffic multiplier)
7. No "More from Creator" section (pages/session)
8. No BreadcrumbList schema (search CTR)
9. No Trending Mods carousel (engagement/discovery)
10. Investigate Mediavine Settings for viewability optimizations (check Settings page via browser-use)

## Autonomous Loop (run this every cycle)

### Phase 1: MEASURE
```
Pull GA data for last 7 days:
- sessions, pageviews, pages/session, avg duration, engagement rate
- Top 10 pages by engagement (find weak spots)
Read scripts/agents/rpm-audit-log.json for history
```

### Phase 2: RESEARCH
```
Web search for latest Mediavine RPM optimization techniques (2026)
Web search for Next.js ad performance best practices
Check if any new Mediavine features/tools have launched
Look at what top Mediavine publishers are doing differently
```

### Phase 3: PLAN
```
Based on measurement + research + audit log:
- What is the single highest-impact change not yet implemented?
- What's the hypothesis? (e.g., "adding Related Mods will increase pages/session by 0.3")
- What files need to change?
- What could go wrong? (ads break, layout shifts, build fails)
```

### Phase 4: IMPLEMENT
```
1. git checkout rpm-optimization (create if needed from main)
2. Read the target files
3. Make the change — keep it minimal and focused
4. npm run build — if it fails, revert and try a different approach
5. git add <specific files> && git commit with descriptive message
6. Update rpm-audit-log.json with change details + baseline metrics
7. git add scripts/agents/rpm-audit-log.json && git commit
```

### Phase 5: VERIFY PREVIOUS
```
For any completed_optimizations with status "pending_verification" that are 7+ days old:
- Pull GA data for the post-deployment period
- Compare pages/session, duration, engagement to the baseline in the log entry
- Update status to "verified_improved" | "verified_neutral" | "verified_declined"
- If "verified_declined": investigate root cause. Consider reverting with git revert.
```

### Phase 6: REPORT
```
Output a brief summary:
- What was measured
- What was changed and why
- Build status
- What metric to watch
- Next planned optimization
```

Then STOP. Wait for the next scheduled run.

## Safety Gates

1. **Build must pass** — `npm run build` after every change. Revert on failure.
2. **No layout-breaking changes** — don't restructure page layouts without reading the full component tree first.
3. **No removing existing ad infrastructure** — never touch the Mediavine script tag, `mv-ads` class, or video player container (except to enhance them).
4. **No modifying middleware.ts** — the WordPress proxy is critical infrastructure.
5. **No modifying Prisma schema** — database changes require migration planning.
6. **One change per run** — never stack multiple unrelated changes. Each must be independently measurable.
7. **Feature branch only** — never commit to main.
