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

### 2026-08-20 — Aug 12 position-collapse deep dive: external SERP volatility, not a code regression, small $ exposure

**Trigger:** Board-approved investigation into avg position 28→~42, impressions −33%+ since Aug 12, flagged Aug 16, "worsening."

**Verdict:** External, industry-wide Google SERP volatility (Aug 12–13, corroborated by multiple third-party rank trackers, unconfirmed by Google — next *confirmed* core update was Aug 26, after onset). NOT a code/template regression, NOT de-indexing. Full writeup: `reports/growth/position-collapse-aug12.md`.

**Evidence chain that got me there fast:**
1. `git log origin/main --since=2026-08-05` on app/lib/middleware.ts/vercel.json → literally zero commits between Aug 1 and Aug 16, and the two Aug 16 commits post-date the Aug 12 onset and don't touch sitemap/robots/canonical. No deploy can explain the timing.
2. Page-level GSC pull bucketed by URL pattern (Next.js `/mods/`, `/games/`, homepage, WordPress `blog.musthavemods.com`, ~600 individual WP slug pages) showed **every single bucket dropped 60–90% in the same window** — including `blog.musthavemods.com`, a completely separate host/codebase from the Next.js app. A template bug hits one bucket hard and leaves others flat; this hit everything uniformly. That's the tell for "external," not "our code."
3. `index_inspect` on 4 spot-check URLs (homepage, Next.js collection, WP slug page, mod-detail page): all PASS/indexed/ALLOWED, crawled within days. Confirms ranking event, not indexing event.
4. WebSearch for "Google search ranking volatility August 12 2026" surfaced 6+ independent SEO-industry trackers flagging a spike on exactly Aug 12–13 — corroborating an external cause without needing Google's own confirmation.
5. **Most important number: GSC clicks were flat-to-up (+8.3% wk/wk) despite impressions −46.6% and position 28.2→41.3.** When clicks hold but impressions/position crater, it means low-value long-tail impression breadth evaporated while the queries that actually convert were largely untouched. This is why the GA4 organic-session hit was only −5.0% (3,548→3,369 sessions/day), not remotely proportional to the alarming raw GSC headline numbers. **Standing lesson: always check clicks (not just impressions/position) and cross-check against GA4 session counts before sizing a "ranking collapse" — the click/session metric is what actually pays, and it can diverge sharply from impression/position aggregates when what's lost is long-tail breadth rather than money-term rankings.**

**$ exposure:** ~5,350 sessions/month at risk if the dip persists ≈ **$123/month** at $23/1,000-session blended RPM assumption — about 0.4% of the Organic Search channel. Nowhere near what "avg position 28→42" sounds like in isolation. Recommended re-check Aug 27 (no board approval needed — monitoring only, no fix to ship since nothing broke).

**Tooling gotcha (new):** `enhanced_search_analytics` with `rowLimit: 2000` on a page-dimension query silently truncated at exactly 2000 rows for a period with 2,900+ distinct URLs — the returned totals looked plausible (965 clicks, 92K impressions) but were actually ~34% short on impressions vs the true total (confirmed by cross-checking against the date-dimension sum). **Always set `rowLimit: 25000` (the max) for page/query dimension pulls on this property and verify `rows.length < rowLimit` before trusting the totals** — if `rows.length == rowLimit` exactly, the result is truncated and any "totals" derived from it are wrong. The MCP auto-writes to a file when the token limit is exceeded regardless of rowLimit, so there's no downside to always requesting the max and reading via `jq`/`python3` on the saved file instead of loading raw into context.

**Process note:** GSC MCP results that exceed the token limit get saved to a file under `.../tool-results/*.txt` — these are plain JSON (not truncated mid-object, the *tool output* is truncated but the *saved file* is complete). Read tool chokes on files this large; use `Bash` + `jq`/`python3 -c` directly against the saved path instead of the Read tool's offset/limit chunking, which is far faster for this kind of large structured-data diffing.

### 2026-08-16 — Traffic-drop investigation: search cleared, GA4 vs Mediavine session gap flagged

**Trigger:** Mediavine sessions reported down 18.4% WoW (76.6k vs 93.9k). GSC MCP creds confirmed fixed and working this run.

**GSC web search, last 7d (08-08→08-14) vs prior 7d (08-01→08-07):** clicks 475→484 (+1.9%), impressions 66,388→50,390 (-24.1%), avg position worse (~28.3→~33.7). Image search: clicks 381→428 (+12.3%). **Search clicks flat-to-up — not the cause of the session drop.** The impression/position drop is a real pattern worth tracking (concentrated in the last 3 days of the window, Aug 12-14) but it's an impression-volume/noise effect, not a click-driving ranking collapse: pages losing the most impressions (`/games/sims-4/male-clothes/`, `/skin-details/`, `/body-presets/`, `/poses/`, `/goth-cc/`) held flat-to-up clicks over the same period.

**GA4 channel breakdown, last7 (08-09→08-15) vs prior7 (08-02→08-08):** total sessions -5.7% (95,634→90,135) — itself far short of the reported 18.4%. Of the 5,499 lost sessions: Organic Social (Pinterest) = 62.7%, Direct = 24.7%, Organic Search = only 19.7% (-1,086 sessions, -4.4%). **Confirms (again) that Google organic is not my lane's problem this week — it's Pinterest/Direct.** Worth a standing note: when the CEO/Mark report an aggregate session drop, my first move should be the GA4 channel-group pull before diving into GSC — it immediately tells me whether to even look further.

**New process finding — Mediavine automation reliability:** `reports/mediavine/*.md` daily automated reports have failed (`🔴 Report failed: fetch failed`) every day 2026-08-10 through 2026-08-16 (7 straight days, still broken as of this run). This is outside my lane (Max/Mark own it) but I flagged it because the magnitude gap between GA4 (-5.7%) and the reported Mediavine figure (-18.4%) is large enough that a broken automated pipeline is a live hypothesis, not just "traffic fell." **Standing habit: when asked to corroborate someone else's revenue-drop number, always sanity-check whether the reporting pipeline that produced their number was itself healthy that week** (check `reports/<agent>/*.md` for failure markers) before accepting the number as ground truth.

**GSC MCP `type` param:** only accepts `web`/`image`/`video`/`news` — no `discover` enum value, despite the GSC API itself supporting a Discover search type. Can't query Discover via this MCP; falls back to GA4 channel data (which folds Discover into "Organic Search") as the substitute signal.

**Indexing:** 3/3 spot-checked pages (homepage, `/games/sims-4/goth-cc/`, `/games/sims-4/pregnancy-mods/`) PASS/indexed, crawled within the last week. No indexing issues. Confirmed via `git diff origin/main` that the goth-cc/cottagecore-cc/y2k-cc/vampire-cc collections are still live on `origin/main` — they only look "missing" in my local working tree because of unrelated uncommitted WIP (a facet-vocabulary-v2 migration on `feature/premium-intent-test`) that hasn't shipped. **Gotcha to remember: always diff local working-tree state against `origin/main` before concluding a page/collection was removed from production — local uncommitted branches are not what's live.**

**Quick wins (28d 07-18→08-14, position 4-15, CTR<2%, impr≥50):** 7 opportunities, ~30 clicks/mo (~$0.69/mo at ~$23 RPM) — small, same "average position too deep for CTR fixes to matter much" pattern as prior audits. Full list in `reports/gsc-analysis-2026-08-16.md`.

### 2026-07-30 — Weekly review: KPI-metric mislabel found + GSC impressions surge with CTR collapse

**GA4 (property 437117335):**
- Total sessions, 30d (30daysAgo→yesterday): **408,542** (+1.0% vs 404,502 targets.json baseline; -2.7% vs 420,000 target → within 10%, 🟡 on the literal target).
- Channel breakdown, 30d: Organic Social 282,643 (69.2%), **Organic Search 105,072** (25.7%), Direct 17,814, Referral 1,386, Unassigned 1,018, AI Assistant 498, Organic Video 111.
- True "Organic Search" channel — the one I actually own — week of 07-23→07-29: **25,064** vs prior week (07-16→07-22) **23,846** = **+5.1% WoW**, outpacing the +2.3% total-sessions WoW Mark reported (which is dominated by Pinterest/Organic Social).
- **KPI mislabel found:** `targets.json`'s `tim.baseline.monthlyOrganicSessions` (404,502) and `tim.targets.monthlyOrganicSessions` (420,000) are sourced from GA4 **total** sessions, not the Organic Search channel. The baseline's own `_source` note already flagged this ("organic share unknown until GA4 channel breakdown pulled") — it's now pulled. Recommend Mark/Sterling approve a follow-up: add a dedicated `organicSearchChannelSessions` baseline (105,072/30d) so my KPI stops rising/falling on Pinterest's performance, which I don't control.

**GSC (`sc-domain:musthavemods.com`, web-search only, ~2-3d lag — data through 07-28):**
- 6-day window 07-23→07-28 vs comparable prior 6-day window 07-16→07-21: clicks 465 vs 503 (**-7.6%**), impressions 61,232 vs 29,837 (**+105.2%**), CTR 0.76% vs ~1.69% (more than halved), avg position ~27.5 vs ~25.9 (worse, i.e., higher/further down).
- 27-day rolling (07-02→07-28) vs the 06-24 audit's comparable 28d period (May27–Jun23): clicks 2,074 vs 1,940 (+6.9%), impressions 185,179 vs 92,969 (**+99.2%**), CTR 1.12% vs 2.1% (nearly halved).
- **Read:** impressions nearly doubled in a month but clicks barely grew and CTR collapsed — this smells like the Jul 3 batch (vampire-cc, goth/cottagecore/y2k collection pages, canonical/sitemap changes, games-page dynamic render fix) surfaced a lot of new low-position impressions (broad/long-tail queries at position 20-40) that dilute aggregate CTR, rather than a genuine ranking improvement. **Not yet diagnosed at query level — this is next week's #1 action.**
- `detect_quick_wins` (position 4-10, impressions ≥50, CTR <2%, 07-02→07-29): 10 opportunities found (up from 4 in the 06-24 audit), total potential ~31 additional clicks/mo (~$0.70/mo at ~$22.7 RPM/1000 sessions) — mostly small individual mod-detail pages (love-triangle/relationship-mod cluster, milk thistle, teen lifestyle mods). Homepage "the sims 4 must have mods" (pos 8.6, 64 impr, 1.56% CTR) is STILL on the list despite the Jul 22 homepage title/meta fix — expected, since T+14 measurement isn't due until ~Aug 5 per the measurement protocol.

**Quick wins shipped this month (July, verified against `origin/main`, not stale local main):**
- **3 shipped**, all in PR #10 / commit `50cc0bf`, merged 2026-07-22: homepage title/meta ("Sims 4 Mods & CC Finder — 15,000+ Verified Finds"), Skin Details collection title/meta (was 0.22% CTR), Pose Packs collection title/meta (was 0.56% CTR, retitled for "gallery poses" phrasing GSC shows). Target is ≥4/month → **🔴 miss** (3/4).
- Not counted toward quick-wins (different category — content-gap/indexing plays, not CTR/title-meta fixes on existing rankings): vampire-cc + goth/cottagecore/y2k collection pages (new-page content gaps, 07-03), canonical hygiene + sitemap exclusions + games-page dynamic-render fix (indexing, 07-03), revert of wrongly-shipped body-preset 301s (bug fix restoring lost traffic, 07-12).
- **Process gotcha confirmed again:** my local `main` ref was stale and initially showed PR #10 as unmerged/only-on-a-feature-branch. Always `git fetch origin main` before concluding something didn't ship — checked against `origin/main`, not local `main`.

**Overall grade: 🟡 (literal KPI) / substance is closer to 🔴.** Total-session target is within 10%, and true Organic Search channel is genuinely accelerating (+5.1% WoW) — a real, attributable SEO win. But the leading indicator (GSC web-search clicks/CTR/position) is trending the wrong way, and quick-wins-shipped missed target. Honest read: growth this week came from Pinterest, not from my work; my own lane (Google organic) shows CTR/position degrading under an impression surge I haven't yet diagnosed.

**Highest-impact action for next week:** Pull GSC `query` + `page` dimensions for the last 28 days, segment by which queries/pages are driving the 99% impression surge, and determine whether it's (a) new Jul-3 collection pages ranking very poorly for a wide net of long-tail queries (fixable — de-prioritize the weakest, reinforce internal links to the strongest), (b) a canonical/duplicate-content dilution artifact from the Jul 3 consolidation, or (c) a genuine demand/seasonality shift. If the CTR loss is recoverable back to the prior ~2.1% CTR on the current impression volume, that's roughly **+1,800 clicks/mo ≈ +$45/mo** at current RPM — small in isolation but potentially a canary for a bigger ranking regression across everything shipped Jul 3, which would be worth much more (or much less) once diagnosed.

### 2026-07-12 — Weekly review: found a shipped-code-vs-decision discrepancy in the Jul 3 body-presets consolidation

**Site totals WoW:** clicks 449→469 (+4.5%), impressions 16,961→18,260 (+7.7%), CTR 2.65%→2.57%, position 24.63→25.20 (slightly worse). GA4 Organic Search sessions 24,378→24,577 (+0.8%). Flat-to-up, consistent with growth being a secondary priority this period. Note: GSC data for Jul 11 wasn't populated yet at review time (2–3 day lag) — treat "this week" as a slight undercount.

**Regression found:** `reports/rpm-dip-mitigation-2026-07-02.md`'s own "Update 2026-07-03" section documents a HYBRID decision — KEEP `/sims-4-male-body-presets-cc/`, `/sims-4-plus-size-body-presets/`, `/sims-4-athletic-body-presets/` live (well-ranking niche pages, ~600 clicks/quarter combined), only 301 the two generic weak pages. But `vercel.json` as shipped in `5af9390` redirects **all three** "keep" pages to `/games/sims-4/body-presets/`. Confirmed via `index_inspect` (`/sims-4-male-body-presets-cc/` = "Page with redirect", crawled Jul 8) and GSC page data: that page went 44→19 clicks, 545→226 impressions (pos 8.4) in one week, while the destination collection page only picked up 15 clicks/332 impr at a *worse* position (14.3). **Action for next week: revert those 3 specific redirects** — should be a quick `vercel.json` + `seo-phase1.test.ts` fix. Do NOT touch the 2 generic-page redirects (`/sims-4-body-presets/`, `/24-best-sims-4-body-presets-for-2024/`) — those were correctly targeted and are working as intended.

**New cannibalization vector (not in the original Jul 3 plan):** `blog.musthavemods.com/sims-4-body-presets/` went from 0 GSC impressions (through Jul 6) to 213/day by Jul 10, ranking position ~9 for the same "sims 4 body presets" cluster — despite its own `rel=canonical` already pointing to `/games/sims-4/body-presets/` (Google is self-selecting a different canonical and ignoring the hint). Two MHM pages are now competing for the same query instead of one consolidated page. Needs a WP-side content/redirect decision from whoever owns that post — flagged, not yet resolved.

**Verdict on the Jul 3 pregnancy-mods fix:** worked. `/games/sims-4/pregnancy-mods/` moved from "Crawled – currently not indexed" to "Submitted and indexed (PASS)".

**Process note:** always diff what a rpm-dip/mitigation report *says* it decided against what actually shipped in `vercel.json` / the registry — this is the second time a documented decision and the shipped code have diverged (first was the pregnancy `__pregnancy_keyword__` magic-value workaround). Worth a standing check in future reviews.

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
