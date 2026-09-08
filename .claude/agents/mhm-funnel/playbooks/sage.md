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
