# Sage — Search & AI — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers search and AI: indexing findings, what moved GSC clicks or AI referrals, SSR/schema outcomes.

Entry format:

```
## YYYY-MM-DD
- Tried: …  (tier, PR/link)
- Before → after: <metric> <n> → <n> (<window>)
- Verdict: KEEP / KILL / MORE DATA (read on <date>)
- Next time: one sentence
```

## Kill log
_(ideas you tried that did not work — never re-propose without saying what changed)_

---

## 2026-09-10
- Tried: internal links from every `/mods/[id]` page to its collection page(s) (E32, Tier 1, PR #77, QUEUED with the 24h veto). Finding first: the 16K mod-detail pages carried **zero** links to `/games/sims-4/*` — the breadcrumb's middle crumb was a `<button>` to the homepage `?category=` filter (no crawler follows a button; no page canonicalises to a query URL), and the `BreadcrumbList` JSON-LD pointed at that same query URL plus a slash-less mod URL (a 308). New pure reverse lookup `getCollectionsForMod()` in `lib/collections.ts` mirrors `buildWhereClause()` in memory (incl. the pregnancy/witch keyword fallbacks, composite clothes/makeup filters, `isNSFW`/`gameVersion` gates); `lib/seo/modBreadcrumb.ts` is the one builder for both the visible `Home › Sims 4 › <Collection> › <Mod>` nav (real `<Link>`s) and the JSON-LD, so markup and trail cannot drift. Secondary matches render as an "Also in:" chip row (max 3). ~9–10K of 16,301 Sims 4 SFW mods resolve to ≥1 collection (hair 2,004; clothes types ~4,200; furniture 984; holidays 926; poses 884; makeup group ~930). Nav sits in the sticky header above every `.mv-ads` and the `aside#secondary` — 4 `<InContentAd />` + sidebar wrapper asserted unchanged by the new test. 41 tests, incl. one that builds a mod from each registry where-clause and proves the in-memory matcher agrees.
- Before → after: GSC 28d (08-11→09-07) `/games/sims-4/*` 128 clicks / 8,052 impr / pos 30.2 (skin-details 22 / 1,937 / 32.3; male-clothes 29 / 1,175 / 30.8; female-clothes 28 / 1,126 / 26.1; body-presets 24 / 1,030 / 24.1; poses 9 / 1,077 / 31.3); `/mods/*` 438 / 15,207 / 23.3 → first read 2026-09-24, final 2026-10-08.
- Verdict: MORE DATA (read on 2026-10-08). Keep if collection-page clicks ≥160/28d (+25%) or avg position ≤27 (−3), with `/mods/*` clicks ≥394 (−10% floor). Kill/revert if `/mods/*` clicks fall >10% or Rio sees mod-page RPM outside ±5% in the 7-day watch.
- Next time: the mod pages are the site's biggest link reservoir (16K URLs); this is the first time they pass equity anywhere but the homepage. Remaining E8 items are all Tier 2 or Q6-blocked: ItemList schema on the top-20 WP posts needs `functions.php`; the canonical-conflict fix is Q6 (PR #63). The open T1 follow-up is feeds (`/feed/mods.json` + per-collection RSS). Gotcha: a source-level guard that forbids a literal (`/?category=`) also forbids it in *comments* — describe the old behaviour without quoting the string.

## 2026-09-09
- Tried: AI answer-engine surface (E27, Tier 0) — new `/llms-full.txt` route (`app/llms-full.txt/route.ts`, force-dynamic, CDN s-maxage 3600): all 18 collections with editorial intro, related links, companion guide, and top-10 mods by downloads (creator credit, free/paid, canonical `/mods/{id}/` URL, one-line description); site-wide top-40 Sims 4 mods; latest 20 WP guides (apex-rewritten, 8 redirected legacy slugs excluded); "How to cite" block with consistent entity name "MustHaveMods". `/llms.txt` now links to it and carries the naming/canonical guidance. Every DB/WP call is wrapped so the file serves the collection index with a note instead of a 500 (tested). Added to `smoke-render.ts` targets. Feeds (RSS/JSON) are Tier 1 per autonomy.md — deliberately not bundled.
- Before → after: ai_referral sessions 7d 265 (GA4 2026-09-01→09-07; chatgpt.com 233, gemini 15, copilot 10, claude.ai 5, perplexity 2) and 28d ~1,045 (08-11→09-07; chatgpt.com 925, copilot 43, gemini 39, claude.ai 29, perplexity 9) → read 2026-09-30. Top AI-referral landing pages 28d: 8 of top 25 are `/games/sims-4/*` collection pages (furniture-cc 25, skin-details 25, hair-cc 23, male-clothes 23, goth-cc 16, female-clothes 15, y2k-cc 13); homepage only 8 — the collection pages are already what assistants cite, so that is what the file is built around.
- Verdict: MORE DATA (read on 2026-09-30 against B3's +25% target = ≥331/7d; final 2026-10-07). Keep if ai_referral 7d ≥ 300 on 09-30 with chatgpt.com share not falling; kill only if the route errors or a cited mod URL turns out to 404 — there is no plausible downside path for a text file.
- Next time: feeds are the T1 follow-up (`/feed/mods.json` + RSS for new mods and per-collection; queue for a green day with the 24h veto). Do not read single-week AI-referral swings as signal (09-07 lesson); the 28d chatgpt.com line is the one that matters. Gotcha: `oneLine()` strips `#` so it must run *after* `decodeEntities()` or `&#8211;` becomes `&8211;`.

## 2026-09-08
- Tried: un-consolidate the pregnancy-mods and y2k-cc legacy pairs (E21, Tier 2, PR #63 open, NOT merged — needs operator: vercel.json + functions.php). Mirrors the 2026-07-31 body-presets revert (1be3289).
- Finding: the "canonical conflict" in the E8 diagnosis is NOT a middleware bug. WP already emits apex canonicals; the facet-pointing canonicals come from mhm_consolidated_post_map() in functions.php (RankMath filter, priority 20) and the 308s come from vercel.json, which runs before middleware. Google rejected the facet canonical for both pairs and indexed the blog-subdomain copy: blog pregnancy 93 clicks / pos 10.95 vs facet 2 / pos 33.0; blog y2k 20 / pos 10.2 vs facet 4 / pos 29.8 (GSC 2026-08-09→09-05). The other 6 consolidated pairs did not show the blog-copy-outranking pattern in the 28d window — leave them alone.
- Also found: GA4 7d hostName blog.musthavemods.com = 19,730 sessions (22% of all), 17,276 from Pinterest. Not fixable in functions.php (BigScoots cache leak); Pip lever + BigScoots nginx ticket.
- Before → after: pregnancy pair clicks 28d (apex article + facet) 95 (2026-09-05) → read 2026-10-06
- Verdict: MORE DATA (read on 2026-10-06, after operator merges #63 and runs push-blog-functions-prod.sh)
- Next time: T0 middleware move — extend the /homepage/ → /blog/ self-canonical fix (middleware.ts ~168–177) to /blog/all/ ("Crawled - currently not indexed"); then ItemList/CollectionPage schema on the top-20 blog posts.

## 2026-09-07
- Tried: Homepage SSR shell (T1, PR #48) — `app/page.tsx` became a `force-dynamic` server component wrapping the former client page (now `app/HomePageClient.tsx`), plus a server-rendered "Browse by collection" block (17 links from `lib/collections.ts`) and an ItemList JSON-LD. Ad anchors untouched; no loading guard; no second `newPageView()`. Queued for the 24h veto, merges 2026-09-08.
- Before → after: served `/` HTML 20,350 bytes / 0 `<h1>` / 0 `aside#secondary` / 0 collection links (prod, 2026-09-07) → 51,188 bytes / 1 `<h1>` / 1 `aside#secondary` / 17 collection links / 1 ItemList (local `next start` of the PR build). GSC homepage 28d to 2026-09-04: 512 clicks, 14,314 impressions, pos 42.2 → read 2026-09-22, final 2026-10-06.
- Verdict: MORE DATA (read on 2026-09-22 / 2026-10-06). E11 (hydration fix, PR #41) read today: prod smoke-render 0 hydration errors on /mods/[id] (was ~8/pageview) → KEEP.
- Next time: Vercel preview deployments are behind SSO ("all_except_custom_domains", no bypass secret), so `smoke-render --base <preview>` gets a 302 — verify a PR by `next start` on the built tree instead, and note that Mediavine's optable script throws "Failed to fetch" on a localhost origin (environment noise, not a page failure). ai_referral −33.7% WoW was chatgpt.com 279 → 198 (demand side; robots rules cannot move it) — do not react to single-week AI-referral swings.

## 2026-09-02
- Tried: Google-collapse diagnosis (T0 analysis); AI crawler allow rules in robots.txt (T0, PR #_) — GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, PerplexityBot, cohere-ai, Applebot-Extended, Google-Extended
- Collapse finding: Single-day cliff Jul 7->8 2025. Clicks 1,400->570 in one day; impressions 28K->11K simultaneously. ALL templates (blog posts, homepage, /mods/[id], /games/ collections) lost ranking, not indexing. GSC PASS on all 8 spot-checked URLs. "0 indexed" sitemap claim is a GSC sitemap-index API artifact — child sitemaps not counted in that field. Root cause: Google Jul 2025 core update demoted helpful-content-adjacent content. Top pages went from positions 8-18 to 25-45. Homepage went from pos 25 to 44 (largest single click-driver lost). No recovery through Sep 2026 — stabilized at 70-150 clicks/day (was 1,200-1,500/day).
- Before -> after: ai_referral 307/7d (2026-09-02) -> read 2026-09-30
- Verdict: MORE DATA (read on 2026-09-30)
- Next time: Homepage SSR shell (T1) is the highest-leverage remaining move; queue it for the next non-yellow day. The robots.txt crawlers are costless but chatgpt.com was already crawling — don't overweight this fix.

## 2026-09-01
- Tried: nothing yet — team chartered today. Read `../charter.md`, `../autonomy.md`, `../operating-model.md`, `../targets.json`, and `reports/growth/fact-base-2026-09-01.md` before your first move.
- Before → after: baseline in `../targets.json`
- Verdict: —
- Next time: your first move should be the top item in your agent file's "levers" list unless the scoreboard shows a 🔴 in your area.
