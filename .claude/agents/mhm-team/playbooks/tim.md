# Tim's Playbook — Growth / SEO

I read this at the start of every run and append to it at the end. This is my
memory across sessions. Newest learnings at the top.

## Operating notes
- Read `charter.md` + `targets.json` first. My primary KPI: **monthly organic sessions**.
- GSC property: `sc-domain:musthavemods.com` (confirmed — NOT mhmfinds.com). Data lags ~2–3 days.
- Translate every opportunity to $ using current session-RPM (ask Max/Mark; state assumption).
- Check `lib/collections.ts` before proposing a "new" collection page.
- Draft title/meta/content changes on a feature branch + PR; never deploy myself.

## Standing decisions

- GSC property is sc-domain:musthavemods.com, not sc-domain:mhmfinds.com.
- Google gap is a RANKING problem, not indexing. Indexing is healthy on all key pages.
- Pinterest is broad but channel-concentrated (67% of all sessions) — Google SEO is the diversification play.
- WordPress-proxied pages (slug-based, e.g. /sims-4-female-clothes-cc/) require the push-script + CRITICAL_MARKERS + check-blog-sidebar.sh flow. NEVER edit functions.php directly. Title/meta for WP pages is edited in the WordPress admin (Yoast/RankMath), not in Next.js code.
- Next.js pages: homepage title/meta in app/layout.tsx (static export metadata); collection pages in lib/collections.ts (metaTitle/metaDescription fields); mod detail pages in app/mods/[id]/page.tsx (generateMetadata, dynamic from DB mod.title + mod.description).
- No-AI-slop rule: agreed with reservations. AI tools are fine for research, gap-finding, title/meta variants, schema, internal linking analysis. AI-generated longform articles are a ranking liability. Human writer for longform; AI for the structural/analytical work.
- Measurement protocol established 2026-06-24: snapshot GSC (query+page: clicks, impressions, CTR, position) before merge, check at T+14 and T+28 days (accounting for 3-day GSC lag = check on day 17 and 31 post-deploy). Keep if CTR or position improves and clicks are up; kill/revert if both flat or worse at T+28.

## Learnings log
<!-- format: YYYY-MM-DD — query/page → action → impressions/clicks/position before/after → verdict -->

### 2026-06-24 — Google gap deep-dive + Pinterest concentration audit

**GSC property confirmed:** `sc-domain:musthavemods.com` (NOT mhmfinds.com — the main site is on musthavemods.com).

**Google traffic diagnosis (28d May 27 – Jun 23):**
- GSC totals: 1,940 clicks · 92,969 impressions · avg position 26.8 · CTR 2.1%
- GSC weekly clicks: ~485/wk (web search only)
- GA4 "google" source 28d: 5,231 sessions = ~1,308/wk. Delta vs GSC (~843/wk) = Google Discover + Google Images traffic that GA4 counts but GSC web-search tab excludes.
- Verdict: **RANKING problem, not indexing**. All 6 top revenue pages are fully indexed, crawled within the past 2 weeks, canonicals clean. The issue is average position 26.8 across the property — we're on page 3 for almost everything.
- Key data point: "sims 4 mods" (569 impressions, 7 clicks, position 38) and "mods sims 4" (143 impressions, 4 clicks, position 41) — we're not even on page 2 for the broadest terms. "sims 4 male body presets" is our top organic page (94 clicks, position 10.2) and is our ranking ceiling right now.
- Homepage has 11,719 impressions at position 32 — massive impressions but zero ability to convert because we rank page 3 on branded variants like "must have mods" (position 5) and "sims 4 must have mods" (position 9). Homepage is the clearest ranking-not-indexing failure.
- Single highest-leverage fix: **title/meta overhaul on the homepage and top-5 collection pages** to capture "sims 4 mods 2026" cluster. "Sims 4 mods" (569 impressions at position 38) is an immediate target — we appear but rank terribly.

**Quick wins (position 4–10, impressions ≥50, CTR <2%):**
- "attachment styles sims 4": position 7, 1,971 impressions, 0 CTR → individual mod page needs title optimization. ~99 potential clicks/month.
- "sims 4 love triangle mod": position 7.2, 54 impressions, 1.85% CTR → mod page needs better title/schema. ~2 incremental clicks.
- Only 4 quick wins detected — confirms the ranking problem is systemic, not a handful of CTR misses.

**Pinterest concentration (28d):**
- Total Pinterest sessions: ~244,747 (source=Pinterest) + ~4,900 (country subdomains) = ~249,647
- Pinterest is BROAD: top 5 identified landing pages = 25,072 sessions = ~10% of total. Even top 20 pages don't dominate. 11,223 distinct landing page combos in the dataset.
- Top pages by Pinterest sessions: /sims-4-cc-finds-2 (5,523), /sims-4-male-urban-clothes (5,376), /sims-4-cc-furniture (4,973), /sims-4-female-clothes-cc (4,712), /sims-4-wedges-cc (4,488)
- Risk is NOT concentration in a few pins; risk is total dependence on ONE channel (Pinterest = 67% of all sessions). If Pinterest algo shifts, 2/3 of revenue is at risk.

**Key standing decisions added:** (promoted to Standing Decisions section above)

### 2026-06-24 — Render trace + operator rules alignment

**Render trace (confirmed via live curl + code read):**
- Homepage `/`: Next.js. `html lang="en" class="scroll-smooth"` + `/_next/static/` chunks. Title/meta in `app/layout.tsx` (static export metadata object).
- `/sims-4-female-clothes-cc/`, `/sims-4-male-urban-clothes/`, `/sims-4-cc-furniture/`: **WordPress**, proxied by middleware catch-all (not in NEXTJS_PREFIXES, no date pattern, no /blog/ prefix → routes to `blog.musthavemods.com`). Confirmed by `wp-content` URLs in live HTML. Title/meta lives in WordPress admin (Yoast/RankMath SEO fields on the post). Edit path: WP admin → post → SEO plugin fields. NEVER touch functions.php for this — no CRITICAL_MARKERS risk.
- `/new-sims-4-mods-2026/`: **WordPress**, same proxy path as above. Confirmed by `wp-content` in live HTML.
- `/mods/cmmvasdcy00droxzgi9g77mz6/`: **Next.js**. `scroll-smooth` class, `/_next/static/` chunks. Title = mod.title from DB ("Attachment Styles"). generateMetadata in `app/mods/[id]/page.tsx` pulls `mod.title` and `mod.description` from Prisma. Fix path: update mod record in DB via admin panel, OR add a keyword-enriched `shortDescription` field to the DB record for this mod.

**"attachment styles sims 4" quick win (28d May 25 – Jun 21):**
- 2,350 impressions · 0 clicks · position 7.02 · CTR 0%
- Current title rendered: "Attachment Styles" — no "Sims 4", no search keyword in title
- Estimated lift: position 7 at ~5% CTR target = ~118 clicks/month. At session-RPM $21.95 = ~$2.59/mo. Small $ but near-zero effort — pure title edit in DB/admin.
- Action: propose PR to add shortDescription override to mod record; or update mod.title to "Attachment Styles Mod — Sims 4 Relationship Overhaul".

**No-AI-slop rule analysis:** Operator is substantially right. Agreement with nuance documented in Task 2 of the 2026-06-24 session report.

**Measurement protocol:** Established. See Standing Decisions.
