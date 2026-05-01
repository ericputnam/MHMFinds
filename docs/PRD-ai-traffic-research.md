# PRD — AI Traffic Research: Capturing LLM & Generative Search Citations

**Status:** Research / Discovery (no implementation until findings reviewed)
**Created:** 2026-04-30
**Owner:** Eric
**Outcome:** A grounded strategy for getting MHMFinds cited and surfaced by AI assistants (ChatGPT, Claude, Perplexity, Google AI Overviews, Gemini, Copilot)

---

## Why this PRD exists

A non-trivial share of mod discovery is shifting from Google search → LLM-mediated answers. A user asking ChatGPT "what's the best Sims 4 CC creator for maxis-match clothing" gets an answer-with-citations, not a blue-link list. If we don't appear in that citation set, we're invisible to that user — even if we rank #3 organically.

This is sometimes called **Generative Engine Optimization (GEO)**, **LLM SEO**, or **Answer Engine Optimization (AEO)**. The mechanics overlap with traditional SEO (~60%) but diverge meaningfully (~40%) — different signals matter, different tools are emerging, and the playbook is unsettled.

This PRD is a **research mandate**, not an implementation plan. We need to figure out:
1. Whether AI traffic is a real opportunity for our niche or a distraction
2. What signals drive citation in each major AI surface
3. What we'd need to change about the site (technical + content) to win citations
4. Which tools, if any, to acquire for monitoring

We will not commit to llms.txt, content rewrites, or AI-targeted page generation until the research is done.

## What we already know vs. what we're guessing

| Question | What we know | What we're guessing |
|---|---|---|
| Is anyone asking LLMs about mods? | Anecdotal (yes) | Volume — could be tiny or substantial |
| Do LLMs cite mod sites? | Anecdotal (Reddit, Nexus, MTS yes) | Whether MHMFinds is ever cited |
| What signals drive citations | Industry guesses (schema, freshness, mentions on Reddit, structured data) | Site-specific evidence |
| Whether `llms.txt` actually does anything | Adopted by Anthropic, OpenAI engagement unclear | Effect on citations |
| Whether AI Overviews steal traffic from us | Aggregate industry data shows -30-60% CTR drops | Our specific exposure |
| What our brand mention frequency looks like in LLM responses | Zero data | Total guess |

**Implication:** Almost everything in this space is unverified. The first goal of the research is establishing a baseline: do LLMs ever mention us today, and under what conditions?

## Research questions

### Q1. Are users actually asking LLMs about our domain?
- **Sub-questions:**
  - What's the volume of LLM queries in our niche (mods, CC, specific game discovery)?
  - Are those queries growing, flat, or shrinking?
  - What's the user intent — research, recommendations, troubleshooting?
- **Source:**
  - Reddit / Discord scraping for "ChatGPT told me", "I asked Claude", "Perplexity says" mentions in modding subreddits (r/thesims, r/StardewValley, r/Minecraft, r/ModdedMinecraft, r/Sims4Mods)
  - SimilarWeb / industry reports for AI surface usage growth (qualitative)
  - GSC for "where is X" / "best X" / "recommendations for X" query growth (proxy for AI-mediated demand)
- **Tool:** Web search + agent-delegated Reddit scraping

### Q2. Do LLMs currently cite MHMFinds?
- **Methodology:** Run 30 representative queries across ChatGPT, Claude, Perplexity, Google AI Overviews, Gemini, and check which sources are cited. Record: do we appear? where in citation order? which page is cited?
- **Sample query set:**
  - "Best Sims 4 CC creators in 2026"
  - "Where can I find Stardew Valley aesthetic mods"
  - "What's the best Minecraft shader pack for low-end PCs"
  - "Recommend mods like Wicked Whims" (5 variants)
  - "Where to find [creator] mods" (5 creators)
  - "Compare Sims 4 mod sites" (meta query)
  - "Free Sims 4 maxis match cc"
  - "Stardew Valley Expanded compatibility" (deep-cut)
  - "How to install Minecraft Forge mods" (tutorial)
  - "Best aesthetic Sims 4 cc 2026"
- **Output:** Citation matrix — query × surface × cited domains × our position
- **Tool:** Manual + scripted (some surfaces have APIs: Perplexity, OpenAI; others require browser automation)

### Q3. Who DOES get cited in our niche, and why?
- **Source:** From Q2's citation matrix, identify the domains that consistently win
- **Output:** Per-cited-domain analysis: schema markup, content depth, freshness, backlink profile (rough), brand mention frequency on Reddit/forums, age, content type
- **Hypothesis to test:** Reddit threads, Nexus, individual creator sites, and listicle-style blog posts dominate citations. Aggregator sites (us) may underperform vs. authoritative single-source sites.
- **Tool:** WebFetch + Read on cited pages

### Q4. What signals drive citation? (Best understood industry mechanics)
- **Surfaces & signals:**

| Surface | Underlying retrieval | Signals known to matter |
|---|---|---|
| **Google AI Overviews** | Live Google index + Gemini reasoning | Same as traditional SEO + structured data, freshness, fact density |
| **ChatGPT (search-enabled)** | Bing index + GPT reasoning | Bing ranking, structured data, freshness, brand authority |
| **Perplexity** | Their own crawler + multiple sources | Citation-friendly content (lists, structured), fresh, schema-rich |
| **Claude (web search)** | Brave + first-party | Recency, source quality, alignment with query |
| **Gemini** | Google index + Gemini | Same as AI Overviews |
| **GitHub Copilot / dev tools** | Different stack, code-focused | N/A for our niche |

- **Output:** Per-surface signal-importance matrix, with confidence levels (known / suspected / guessing)
- **Tool:** Synthesis from public research (industry reports, papers, AI vendor docs)

### Q5. Does our content currently look "LLM-friendly"?
- **What "LLM-friendly" means (working hypothesis):**
  - Clear answer to a question on the page (not buried in a search UI)
  - Structured data (Schema.org: SoftwareApplication, CreativeWork, Review, ItemList)
  - Fact density (counts, dates, ratings, specifications)
  - Clean canonical URLs without session/tracking params
  - Few client-side-only renders (LLMs may not execute JS, or may not retry on slow renders)
  - Recency signals in content body, not just metadata
- **Methodology:** Audit a sample of our pages (`/`, `/games/sims-4`, `/mods/[id]`, `/sims-4/cc/maxis-match`, blog posts) against this checklist
- **Output:** Per-page-type score + remediation list
- **Tool:** Manual audit + the `__tests__/unit/seo-phase1.test.ts` suite as a starting checklist

### Q6. Should we adopt llms.txt?
- **Background:** `llms.txt` is a proposed convention (similar to robots.txt) for telling LLMs what content to prioritize. Adopted by Anthropic. Unclear if OpenAI/Google honor it.
- **Source:** Vendor docs, current adoption examples
- **Output:** Recommendation + draft `llms.txt` if go-ahead
- **Decision unlocked:** Quick implementation if recommended

### Q7. Should we publish a structured "facts about MHMFinds" page?
- **Hypothesis:** LLMs build internal knowledge representations from authoritative pages. A `/about/facts` style page with structured claims ("MHMFinds has 14,000 mods across Sims 4, Stardew Valley, and Minecraft. We aggregate from..." etc.) may seed those representations.
- **Source:** Examples from other niches (e.g., how recipe sites structure metadata for AI)
- **Output:** Recommendation + draft page if go-ahead

### Q8. What tools exist for monitoring LLM mentions?
- **Candidates:**
  - **Profound** — LLM citation tracking, ~$500/mo
  - **Otterly.ai** — AI search rank tracking, ~$59-$249/mo
  - **AthenaHQ** — newer, GEO-focused
  - **Peec AI** — LLM ranking monitoring
  - **DIY:** scripted query runner against Perplexity/OpenAI APIs, log citations weekly
- **Output:** Decision matrix; cost vs. signal value; DIY feasibility estimate
- **Decision unlocked:** Whether to acquire a tool or build a tracker

### Q9. Are we leaking data to LLMs we don't want to leak?
- **Sub-questions:**
  - Are crawlers (GPTBot, Claude-Web, PerplexityBot, Google-Extended) crawling us?
  - What fraction of our crawl budget is LLM bots vs. search bots?
  - Do we want to allow LLM training crawls? (Different from inference-time fetches.)
- **Source:** Vercel logs, robots.txt audit
- **Output:** Crawler traffic breakdown + policy recommendation

## Methodology

### Phase 1 — Baseline measurement (no commitment, just data)
1. Run the 30-query citation matrix (Q2) — establishes "do we exist" today
2. Audit a sample of 10 pages against LLM-friendliness criteria (Q5)
3. Pull crawler traffic from Vercel logs (Q9)
4. Produce **Findings Doc Part 1: "Are we visible?"**

### Phase 2 — Niche demand sizing
1. Reddit/Discord scraping for AI-mediated query mentions in modding communities (Q1)
2. GSC analysis of "recommendation" / "best" / "compare" query growth as a proxy
3. Produce **Findings Doc Part 2: "Is this market real for us?"**

### Phase 3 — Competitive analysis
1. From Q2's matrix, deep-dive the top-cited competitors (Q3)
2. Identify what makes them citable
3. Produce **Findings Doc Part 3: "What gets cited"**

### Phase 4 — Signal synthesis
1. Combine industry research (Q4) with our own audit (Q5) to identify the gap
2. Test cheap interventions on a sample of pages: add schema, add fact-density content, add freshness signals — see if citation frequency moves over 30-60 days
3. Produce **Findings Doc Part 4: "What we'd need to change"**

### Phase 5 — Tooling decision
1. Evaluate monitoring tools (Q8)
2. Build a minimal DIY tracker (run 30 queries weekly, log citations) as a baseline regardless of paid tool decision
3. Produce tooling recommendation

### Phase 6 — Strategy synthesis
1. Combine Phases 1-5 into ranked plays
2. Honest "is this worth pursuing" verdict given findings
3. If yes: top 3 plays converted to implementation PRDs
4. If no: documented decision + monitoring cadence to revisit

## Deliverables

1. `docs/research/ai-citation-baseline.md` — Phase 1 (citation matrix + audit + crawler logs)
2. `docs/research/ai-niche-demand.md` — Phase 2
3. `docs/research/ai-competitive-analysis.md` — Phase 3
4. `docs/research/ai-signal-synthesis.md` — Phase 4
5. `docs/research/ai-tooling-decision.md` — Phase 5
6. `docs/research/ai-traffic-strategy.md` — Phase 6 synthesis (the actual usable doc)
7. `scripts/llm-citation-tracker.ts` — DIY weekly citation tracker (regardless of paid tool decision)

## Open decisions (need user input before Phase 5)

### Tool acquisition

| Tool | Cost | What it gives us | Should we wait? |
|---|---|---|---|
| **Profound** | ~$500/mo | LLM citation tracking across surfaces, share-of-voice | Wait until baseline confirms LLM traffic is meaningful |
| **Otterly.ai** | $59-$249/mo | AI rank tracking, brand monitoring | Mid-tier — viable if we go deep |
| **AthenaHQ / Peec AI** | Newer pricing | Various GEO-specific metrics | Evaluate after Phase 5 |
| **Surfer SEO** | $69-$119/mo | Has some GEO features now; better as a SEO tool | Cross-check with sister PRD (`PRD-seo-strategy-research.md`) |
| **DIY tracker** | $0 (just OpenAI/Perplexity API costs) | Limited to surfaces with APIs | Build regardless |

**Recommendation:** Build the DIY tracker first. It's cheap and gives us a baseline. Acquire a paid tool only if Phase 1 shows meaningful LLM traffic potential AND we need broader surface coverage than DIY can give.

### Crawler policy
- Currently we don't have explicit GPTBot / Claude-Web / PerplexityBot / Google-Extended directives in robots.txt
- Decision: allow all (current state — by omission), allow some, or block training-only crawls
- **Default recommendation:** Allow all inference-time fetches. Re-evaluate training crawl policy after Q9 reveals volume.

### Scope of behavior change
- This PRD as written is research-only — no behavior changes until Phase 6 ratifies them
- BUT: there are a few "obviously safe" interventions that don't really need research (e.g., adding `Article` schema to blog posts, ensuring mod detail pages have rich structured data). Should we ship those in parallel? **Default:** yes, but track them in `PRD-traffic-recovery.md`, not here.

## Success criteria for this PRD

This PRD is "done" when:
- All 9 research questions have data-backed answers (or "not enough data, here's why")
- Phase 1 baseline is established and the citation tracker is running
- Phase 6 synthesis has a clear verdict: pursue / monitor / abandon
- If "pursue": top 3 plays converted to implementation PRDs
- If "monitor": agreed cadence for re-evaluation (e.g., quarterly citation tracker review)
- Eric has reviewed and ratified the verdict

## What this PRD explicitly does NOT do

- Implement any pages, schema additions, llms.txt files, or content rewrites
- Make purchasing decisions on tools (only recommends)
- Replace ongoing SEO work — those are sister concerns covered by `PRD-seo-strategy-research.md` and `PRD-traffic-recovery.md`
- Address "AI inside the product" (e.g., recommendation engine, search rerank) — that's product work, not traffic acquisition

## Estimated effort

- Phase 1 (baseline citation matrix + audit): 4-6 hours, mostly agent-delegated
- Phase 2 (niche demand sizing): 2-3 hours
- Phase 3 (competitive analysis): 3-4 hours
- Phase 4 (signal synthesis + cheap experiments): 4-6 hours setup + 30-60 days monitoring
- Phase 5 (tooling decision): 1-2 hours
- Phase 6 (synthesis): 2-3 hours writing + Eric review

Total: ~15-20 hours of agent work + 30-60 days of passive monitoring + ~3-4 hours Eric review.

---

## Watch-outs

- **The space is moving fast.** Findings from Q4 (signal mechanics) may be stale within 90 days. Build a cadence to revisit, not a one-shot doc.
- **Citation ≠ traffic.** Being cited by ChatGPT doesn't mean clicks if the LLM answers in-line. Track impression equivalents, not just visits.
- **Don't over-rotate on AI traffic at SEO's expense.** Traditional search is still ~85% of organic discovery for our niche (likely). LLM traffic is a complement, not a replacement, for the foreseeable future.
- **GEO best practices are largely unverified.** Most "GEO tips" articles are vibes. Treat the signals matrix (Q4) as hypothesis, not fact, until our own experiments confirm or refute.
- **API rate limits & cost.** Running 30 queries weekly across 5 surfaces is ~150 calls/week. Manageable, but track cost. Some surfaces (Google AI Overviews) don't have an API and require browser automation.
- **Sister PRD overlap.** `PRD-seo-strategy-research.md` (sister doc) covers traditional search. They share some methodology (SERP inspection, content audit) but the deliverables are independent. Run them in parallel; don't merge.
