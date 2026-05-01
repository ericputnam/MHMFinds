# PRD — SEO Strategy Research: Where Should We Actually Compete?

**Status:** Research / Discovery (no implementation until findings reviewed)
**Created:** 2026-04-30
**Owner:** Eric
**Outcome:** A grounded, data-backed strategy doc + ranked roadmap (not vibes-based recommendations)

---

## Why this PRD exists

We're making SEO decisions today (hero copy, what verticals to expand into, whether to broaden positioning to "gaming mods" generally) without site-specific data. The Apr 30 conversation surfaced this directly: every claim about "what we can rank for" was reasoning from priors, not from GSC, GA, or competitor data we actually have.

This PRD is a **research mandate, not an implementation plan**. The deliverable is a strategy doc, not a feature ship. We will not commit to long-tail page generation, vertical expansion, or rewrites of category pages until the research is done and reviewed.

## What we already know vs. what we're guessing

| Question | What we have | What we're guessing |
|---|---|---|
| What we currently rank for | GSC data — accessible | — |
| What queries drive our clicks/impressions | GSC — accessible | — |
| Which pages convert downloads | Prisma + GA — accessible | — |
| Which queries are "quick wins" (positions 11-20) | GSC `detect_quick_wins` — accessible | — |
| Search volume for target keywords | None natively | Guessing from intuition |
| Competitor DA / backlink profile | None natively | Guessing |
| SERP feature ownership (who owns featured snippets / People Also Ask) | None natively | Guessing |
| Content gap vs. top-ranking competitors | None natively | Guessing |

**Implication:** We can do ~70% of this research with tools already wired up (GSC, GA, Prisma, web search). The remaining 30% needs either a paid tool (Surfer / Ahrefs / SEMrush) or manual SERP inspection.

## Research questions

Listed in priority order. Each question has a defined data source and deliverable.

### Q1. What does our current organic profile look like?
- **Source:** GSC `enhanced_search_analytics` over last 90d, segmented by query and page
- **Output:**
  - Top 50 queries by impressions (where we appear)
  - Top 50 queries by clicks (where we win)
  - Average position distribution (how many queries are pos 1-3, 4-10, 11-20, 21+)
  - CTR vs. position curve (are we underperforming for our position?)
  - Page-level winner table — which URLs do all the work
- **Tool:** GSC MCP, already wired

### Q2. Where are the quick wins?
- **Source:** GSC `detect_quick_wins` — queries at positions 11-20 with non-trivial impressions
- **Output:** Ranked list of "1 page edit could move this to page 1" opportunities, with target URL and current keyword
- **Tool:** GSC MCP, already wired

### Q3. What's the long-tail vs. head-term split in our traffic?
- **Hypothesis (untested):** Long-tail compounds. We claim it's a small-site advantage but haven't verified for *our* site.
- **Source:** GSC query breakdown by impression/click distribution
- **Output:** Pareto chart — what % of clicks come from the top 10 / 100 / 1000 queries
- **Decision unlocked:** If it's already long-tail-driven, doubling down is correct. If it's head-term-driven, generalize positioning.

### Q4. Who actually owns the SERPs for our top target keywords?
- **Source:** Manual SERP inspection (web search) for 30 priority keywords
- **Sample keywords to check:**
  - `best sims 4 mods 2026`
  - `sims 4 cc finds`
  - `sims 4 maxis match cc`
  - `stardew valley mods`
  - `stardew aesthetic mods`
  - `minecraft shaders`
  - `minecraft texture packs`
  - `mods like [popular mod name]` (5 variants)
  - `[creator] mods` (5 variants)
- **Output:** Per-keyword: top 10 results with domain, content type (forum / mod page / listicle / aggregator), and rough difficulty score
- **Tool:** WebSearch + manual review. Could be agent-delegated.

### Q5. What's our content gap vs. top-ranking competitors?
- **Source:** For 5-10 priority keywords where we want to rank, fetch the top 3 results and compare structure
- **Output:** Per-keyword: what content/sections do top results have that we don't (word count, schema markup, internal linking, freshness signals, mod count, images)
- **Tool:** WebFetch + Read. Could be Surfer if we acquire it (see "Open decisions")

### Q6. Where is Nexus / CurseForge / TSR weak?
- **Source:** SERP inspection + their own site structure
- **Output:** List of query types where the giants underperform — likely candidates: cross-platform creator pages, "mods like X" recommendations, themed roundups, fresh-discovery surfaces
- **Tool:** Manual + WebFetch
- **Decision unlocked:** Confirms or refutes the "structurally weak" claim from earlier conversation

### Q7. Should we expand to a 4th game? Which one?
- **Candidates (intuition-derived, to be validated):** Baldur's Gate 3, Cyberpunk 2077, indie titles (Hades, Cult of the Lamb), Cities: Skylines
- **Source:** GSC for any incidental impressions on non-Sims-Stardew-Minecraft queries; SERP inspection for difficulty in candidate verticals; Reddit/Discord community size as a demand proxy
- **Output:** Decision matrix — game × difficulty × audience size × scraper cost × strategic fit
- **Decision unlocked:** Vertical expansion roadmap

### Q8. How well-indexed are we right now?
- **Source:** GSC `index_inspect` on a sample of mod URLs and category pages; sitemap submission status
- **Output:** % of our URLs indexed, vs. submitted, vs. existing in DB. Identifies whether the bottleneck is "Google doesn't know about us" or "Google chose not to rank us"
- **Tool:** GSC MCP, already wired

## Methodology

### Phase 1 — First-party data (no external tools needed)
1. Pull GSC last 90d data for Q1, Q2, Q3, Q8
2. Cross-reference with GA acquisition data — which landing pages convert (mod download = conversion)
3. Cross-reference with Prisma — do top-converting pages map to mods we have rich data for, or are users abandoning thin pages?
4. Produce **Findings Doc Part 1: "Where we are"** — current state, no recommendations yet

### Phase 2 — SERP inspection (WebSearch / agent-delegated)
1. Build target keyword list (~30 keywords across the 3 game verticals)
2. For each, capture top 10 SERPs and classify by domain authority/content type
3. Identify SERP features (featured snippets, PAA, image packs, video carousels) per keyword
4. Produce **Findings Doc Part 2: "Who owns what"**

### Phase 3 — Content gap analysis (WebFetch on competitors)
1. Pick 10 priority keywords where we have a fighting chance (medium difficulty)
2. Fetch top 3 ranking pages each
3. Build comparison: word count, schema, internal links, mod count, freshness, multimedia
4. Produce **Findings Doc Part 3: "What it takes to compete"**

### Phase 4 — Synthesis
1. Combine all three into a single strategy doc with:
   - Tier 1 plays: low-effort, high-confidence (e.g., "fix the 12 quick-win pages")
   - Tier 2 plays: scaled long-tail (e.g., "generate 50 themed landing pages from facets")
   - Tier 3 plays: structural bets (e.g., "build creator profile pages as a moat")
   - Anti-recommendations: what NOT to chase (head terms we'd lose on)
2. Each play has: keyword targets, effort estimate, expected impact, success metric
3. Review with Eric, ratify or modify, then convert top 3 plays into implementation PRDs

## Deliverables

1. `docs/research/seo-current-state.md` — Phase 1 output
2. `docs/research/seo-serp-landscape.md` — Phase 2 output
3. `docs/research/seo-content-gaps.md` — Phase 3 output
4. `docs/research/seo-strategy.md` — Phase 4 synthesis (the actual usable doc)
5. Optional: a Notion/Sheet keyword tracker for ongoing rank monitoring

## Open decisions (need user input before Phase 2)

### Tool acquisition
We are missing search-volume and competitor-backlink data natively. Options:

| Tool | Cost (rough) | Strength | Weakness |
|---|---|---|---|
| **Surfer SEO** | $69-$119/mo | Content optimization, SERP analyzer, content audit. Strong for "what should this page contain to rank?" | Less keyword research depth than Ahrefs |
| **Ahrefs** | $99-$399/mo | Best-in-class keyword volume, backlinks, competitor analysis | Expensive; UI overkill for solo use |
| **SEMrush** | $129-$249/mo | All-in-one, decent at everything | Jack of all trades |
| **Free tools (Ubersuggest, GSC alone, manual SERP)** | $0 | Already have GSC | Volume estimates unreliable |

**Recommendation:** Start Phase 1+2 with free tools. Decide on a paid tool *after* Phase 2 reveals which gaps actually matter. The conversation may answer itself — if quick wins are abundant, we don't need Surfer to start.

### Scope of vertical expansion research (Q7)
Do we want this PRD to also produce a "should we add BG3" recommendation, or is that a separate research effort? **Default:** include, mark as Phase 5 if time-constrained.

### llms.txt / GEO considerations
Should this PRD also cover Generative Engine Optimization (LLM citation traffic), or is that the sister PRD? **Default:** sister PRD (`PRD-ai-traffic-research.md`) — they're related but the methodology is different enough that combining them would dilute both.

## Success criteria for this PRD

This PRD is "done" when:
- All 8 research questions have data-backed answers (or explicit "not enough data, here's why")
- The synthesis doc identifies 3 ranked Tier 1 plays with effort + impact estimates
- Anti-recommendations are documented (what NOT to chase)
- Eric has reviewed and ratified the strategy doc, OR rejected it and said why
- Top 3 plays are converted into implementation PRDs in `docs/PRD-INDEX.md`

## What this PRD explicitly does NOT do

- Implement any pages, schema, sitemaps, or content
- Make decisions on tool purchases (just recommends)
- Replace ongoing tactical SEO work (e.g., the existing `PRD-traffic-recovery.md` should ship independently)
- Cover LLM/AI-search traffic (separate PRD)

## Estimated effort

- Phase 1 (first-party data): 2-3 hours of agent work + 1 hour review
- Phase 2 (SERP inspection): 4-6 hours, mostly agent-delegated
- Phase 3 (content gap): 3-4 hours
- Phase 4 (synthesis): 1-2 hours of careful writing + Eric review

Total: ~12-15 hours of agent work, ~3-4 hours of Eric review, spread over a week.

---

## Watch-outs

- **Don't conflate "ranking" with "winning."** Position 5 with 0 clicks is worse than position 8 with high CTR. Always weight by clicks, not just position.
- **Recency bias in GSC.** Last 7d is noisy; use 90d for trends, 28d for current state.
- **Survivorship bias in SERP inspection.** Sites we see ranking are the winners — we're not seeing what tried and failed. Treat content gap analysis as "what works *if you can compete*", not "what guarantees ranking."
- **CLAUDE.md "long-tail compounds" is itself an unverified prior.** Q3 explicitly tests this for our site. If it's wrong, the existing compound-learnings note should be updated.
