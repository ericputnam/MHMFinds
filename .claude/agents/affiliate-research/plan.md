# Affiliate Research Agent - Implementation Plan

**Status:** Active
**Created:** 2026-01-25

---

## Purpose

The Affiliate Research Agent performs data-driven product discovery based on mod content analysis. It identifies products that match the MHMFinds audience demographics and validates them through the Persona Swarm before creating affiliate offers.

## Problem Statement

Current affiliate strategy is failing:
- Oyrosy jewelry: **0% conversion** on 47 clicks
- Logitech peripherals: Previously tried, **0% conversion**
- Fundamental mismatch between products shown and audience interests

## Audience Profile

| Attribute | Value |
|-----------|-------|
| Monthly Sessions | 400K+ |
| Gender | 75%+ Female |
| Age | 18-34 |
| Traffic Source | 66% Pinterest |
| Device | 94% Desktop (playing Sims) |
| Location | 37% US, 63% International |
| Top Interests | Fashion CC (35K), Beauty (25K), Hair (15K), Furniture (12K) |

**Key Insight:** Users search for luxury brand CC (Fendi, Louis Vuitton) and specific aesthetics (goth, cottagecore, Y2K). They want **affordable trendy fashion**, not gaming gear.

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Affiliate Research Flow                       │
└─────────────────────────────────────────────────────────────────┘

1. CONTENT ANALYSIS
   ┌──────────────┐
   │   Database   │ → analyzeContentDistribution()
   │  (Mod table) │ → Returns top contentTypes and themes by downloads
   └──────────────┘
         │
         ▼
2. PRODUCT RESEARCH
   ┌──────────────┐
   │  Perplexity  │ → researchProductsForTheme(theme)
   │     API      │ → Returns ProductCandidate[]
   └──────────────┘
         │
         ▼
3. SCORING
   ┌──────────────┐
   │   Scoring    │ → scoreProduct(product)
   │  Algorithm   │ → Returns ScoredProduct with finalScore
   └──────────────┘
         │
         ▼
4. PERSONA VALIDATION
   ┌──────────────┐
   │   Persona    │ → personaSwarmService.batchValidate()
   │    Swarm     │ → 3/5 personas must approve
   └──────────────┘
         │
         ▼
5. OFFER CREATION
   ┌──────────────┐
   │  Database    │ → createOfferFromProduct()
   │              │ → AffiliateOffer with metadata
   └──────────────┘
```

---

## Scoring Algorithm

### Category Priorities (based on downloads)

1. **Fashion/Clothing** - matches clothing CC (tops, bottoms, dresses)
2. **Beauty/Makeup** - matches makeup CC
3. **Hair Accessories** - matches hair CC
4. **Room Decor** - matches furniture CC
5. **Digital Products** - Sims packs, design tools

### Scoring Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| Demographic Fit | 35% | Does price/category fit 18-34 female? |
| Aesthetic Match | 30% | Does it match popular themes (goth, cottagecore, Y2K)? |
| Price Point | 20% | Is it in $15-50 sweet spot? |
| Trend Alignment | 15% | Is it currently trending? |

### Price Sweet Spot

- **Optimal:** $15-50 (affordable impulse buys)
- **Acceptable:** $10-75
- **Reject:** Over $75

### Style-to-Product Mapping

| CC Theme | Real Products |
|----------|---------------|
| Goth | Dark makeup, black clothing, chokers, silver jewelry |
| Cottagecore | Floral dresses, fairy lights, wicker baskets, dried flowers |
| Y2K | Butterfly clips, chunky jewelry, lip gloss, mini bags |
| Modern | Minimalist decor, neutral aesthetics, clean-line furniture |

### Negative Signals (automatic rejection)

Products are rejected if they:
- Contain keywords: "gaming", "gamer", "RGB", "esports"
- Category: peripherals, tech, computer accessories
- Price > $75
- Target audience: male gamers

---

## Integration Points

### Services Used

1. **PerplexityService** - External product research via API
2. **PersonaSwarmService** - Validates products through 5-persona swarm
3. **AgentLearning** - Adjusts estimates based on historical accuracy
4. **ActionQueue** - Creates opportunities for approved products

### Database Models

- **AffiliateOffer** - Stores validated product offers
- **AffiliateResearchRun** - Tracks research cycle metadata
- **Mod** - Source of contentType/theme distribution

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/affiliates/research` | POST | Trigger research cycle |
| `/api/affiliates/validate` | POST | Manual product validation |
| `/api/affiliates/performance` | GET | Get conversion metrics |

---

## Tools Required

| Tool | Purpose |
|------|---------|
| Read | Read database results, configuration |
| Bash | Run scripts, database queries |
| Grep | Search for patterns in codebase |
| Glob | Find files by pattern |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Conversion Rate | 0% | >1% |
| CTR on Offers | 0.04% | >0.5% |
| Products Matching Themes | 0% | 100% |
| Persona Approval Rate | N/A | 60%+ (3/5) |

---

## Learning Loop

```
Research → Score → Validate → Deploy → Track Conversions → Adjust Weights
```

After 5+ conversions per category, the system learns:
- Which themes convert best
- Which price points work
- Which personas best predict conversions
