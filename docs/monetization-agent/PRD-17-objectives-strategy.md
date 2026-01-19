# PRD-17: Monetization Agent Objectives & Strategy

## Overview
Define the strategic objectives, success metrics, and operational framework for the MustHaveMods Monetization Agent. This document serves as the north star for all monetization decisions.

## Priority: P0 (Foundation)
## Dependencies: None
## Estimated Implementation: Documentation only

---

## Mission Statement

**The Monetization Agent exists to maximize sustainable revenue from MustHaveMods traffic while maintaining excellent user experience and content quality.**

The agent should think like a combination of:
- **Growth PM** - Identifying opportunities to increase revenue
- **CRO Specialist** - Optimizing conversion rates
- **Affiliate Manager** - Maximizing affiliate earnings
- **Ad Ops Manager** - Optimizing RPM without hurting UX

---

## Revenue Streams

### 1. Display Advertising (Mediavine)
**Current State**: Primary revenue source
**Metric**: RPM (Revenue Per Mille / 1000 pageviews)
**Target**: $15-25 RPM depending on traffic source

| Traffic Source | Typical RPM | Notes |
|----------------|-------------|-------|
| Google Search | $18-25 | High intent, valuable |
| Pinterest | $8-15 | Visual browsers, lower intent |
| Direct | $12-18 | Returning users |
| Social | $6-12 | Casual browsers |

**Optimization Levers**:
- Ad placement (above fold, in-content, sticky)
- Page load speed (faster = better viewability)
- Content length (longer = more ad slots)
- Scroll depth (engaging content = more impressions)

### 2. Affiliate Revenue
**Current State**: Underutilized opportunity
**Platforms**: Amazon, Patreon creator links, game stores
**Target**: $2-5 RPM equivalent

**Affiliate Opportunities**:
| Type | Commission | Use Case |
|------|------------|----------|
| Gaming peripherals | 3-8% | "Best mouse for building in Sims 4" |
| PC components | 2-4% | "Recommended specs for mods" |
| Game purchases | 2-5% | Links to buy Sims 4 packs |
| Patreon | $0 (traffic) | Drive traffic to creators |
| Digital goods | 10-30% | CC packs, presets |

**High-Value Pages for Affiliates**:
- Mod detail pages with "requirements" (link to packs)
- "Best of" collection pages
- Tutorial/guide content
- Pages with buyer-intent keywords

### 3. Future Revenue Streams (Not Yet Implemented)
- **Premium memberships** - Ad-free experience, early access
- **Creator subscriptions** - Revenue share with mod creators
- **Sponsored placements** - Featured mod spots
- **Digital products** - Curated CC packs

---

## Key Performance Indicators (KPIs)

### Primary KPIs
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Total Monthly Revenue | $X | +20% YoY | Mediavine + Affiliates |
| Blended RPM | $X | $18+ | Total Revenue / (Pageviews/1000) |
| Affiliate Conversion Rate | X% | 2%+ | Clicks → Purchases |

### Secondary KPIs
| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Pages with Affiliates | 30%+ | Coverage of opportunity |
| Avg Session Duration | 3+ min | More ad impressions |
| Pages per Session | 2.5+ | More pageviews |
| Bounce Rate | <60% | Engaged users |
| Core Web Vitals | Green | Better ad viewability |

### Guardrail Metrics (Don't Let These Degrade)
| Metric | Threshold | Action if Violated |
|--------|-----------|-------------------|
| Page Load Time | <3s | Reduce ad density |
| User Satisfaction | No complaints | Review recent changes |
| SEO Rankings | No drops | Audit content changes |
| Ad Viewability | >70% | Adjust placements |

---

## Opportunity Detection Rules

### High-Priority Opportunities (Auto-approve candidates)

1. **High Traffic, No Affiliates**
   - Page has >500 monthly pageviews
   - No affiliate links present
   - Content matches affiliate categories
   - **Action**: Add relevant affiliate links

2. **Below-Average RPM**
   - Page RPM < site average by >30%
   - Page has >200 monthly pageviews
   - **Action**: Analyze ad placement, content length

3. **Buyer Intent Keywords**
   - Title/content contains: "best", "download", "get", "buy", "pack", "DLC"
   - No affiliate links present
   - **Action**: Add affiliate links

### Medium-Priority Opportunities (Human review)

4. **Traffic Source Mismatch**
   - Pinterest traffic on text-heavy page → Add more images
   - Google traffic on image-only page → Add more text/schema

5. **High Bounce Rate**
   - Bounce >80% with decent traffic
   - **Action**: Improve content, add related mods

6. **Thin Content**
   - Page has <300 words
   - Could support more ad inventory with expansion
   - **Action**: Expand content

### Low-Priority Opportunities (Log for review)

7. **Seasonal Campaigns**
   - Upcoming holiday/event
   - Related content exists
   - **Action**: Create themed collection, promote

8. **Underperforming Collections**
   - Category page with low engagement
   - **Action**: Curate better, improve organization

---

## Action Types & Execution

### Safe for Auto-Execution
| Action | Risk | Implementation |
|--------|------|----------------|
| Add affiliate link to mod | Low | API update to mod.affiliateLinks |
| Update meta description | Low | API update to mod.metaDescription |
| Add to collection | Low | Create collection relation |
| Internal link suggestion | Low | Generate, human places |

### Requires Human Review
| Action | Risk | Why |
|--------|------|-----|
| Change ad placement | Medium | Could hurt UX |
| Modify content | Medium | Quality control |
| Create new page | Medium | SEO implications |
| Remove content | High | Could break links |

### Never Auto-Execute
| Action | Risk | Why |
|--------|------|-----|
| Delete anything | Critical | Irreversible |
| Change URLs | Critical | SEO disaster |
| Modify user data | Critical | Privacy |
| External API calls | High | Rate limits, costs |

---

## Seasonal Calendar

The Sims community has predictable traffic patterns:

| Month | Pattern | Opportunity |
|-------|---------|-------------|
| January | Post-holiday dip (-5%) | Focus on evergreen content |
| February | Valentine's (+10%) | Romantic CC collections |
| March-April | Spring (+5%) | Spring cleaning, new builds |
| May-June | Summer ramp (+15%) | School's out, more gaming |
| July | Peak summer (+18%) | Maximum engagement |
| August | Back to school (-5%) | Student deals, PC upgrades |
| September | Fall content (+8%) | Halloween prep starts |
| October | Halloween peak (+15%) | Spooky CC, costumes |
| November | Holiday shopping (+10%) | Gift guides, deals |
| December | Holiday peak (+20%) | Winter CC, gifts, family time |

**Agent Should**:
- 2 weeks before seasonal peak: Surface relevant content
- During peak: Ensure affiliate links are active
- After peak: Archive seasonal, promote evergreen

---

## Revenue Estimation Formulas

### Affiliate Revenue Estimate
```
Monthly Revenue =
  Monthly Pageviews ×
  Click-Through Rate (2-5%) ×
  Conversion Rate (1-3%) ×
  Average Order Value ($30-50) ×
  Commission Rate (3-8%)

Example:
  10,000 pageviews × 3% CTR × 2% conv × $40 AOV × 5% commission
  = 10,000 × 0.03 × 0.02 × $40 × 0.05
  = $1.20/month for that page
```

### RPM Improvement Estimate
```
Monthly Impact =
  (New RPM - Current RPM) ×
  (Monthly Pageviews / 1000)

Example:
  ($18 - $12 RPM) × (50,000 / 1000)
  = $6 × 50
  = $300/month improvement
```

### Confidence Scoring
```
Confidence = Base × Traffic Factor × Data Recency × Historical Accuracy

Base: 0.7 (default)
Traffic Factor: min(1.0, pageviews/1000)
Data Recency: 1.0 if <7 days, 0.8 if <30 days, 0.6 if older
Historical Accuracy: Adjusted based on past estimate accuracy
```

---

## Success Criteria

### Phase 1: Detection (Complete)
- [x] Agent detects affiliate opportunities
- [x] Agent detects RPM issues
- [x] Agent queues for human review
- [x] Human can approve/reject

### Phase 2: Execution (Current)
- [ ] Approved actions can be auto-executed
- [ ] Safe actions execute without approval
- [ ] Notifications sent on new opportunities
- [ ] Impact tracked post-execution

### Phase 3: Learning (Future)
- [ ] Agent learns from approval patterns
- [ ] Estimates improve based on actuals
- [ ] Low-confidence opportunities auto-rejected
- [ ] High-confidence opportunities auto-approved

### Phase 4: Autonomous (Future)
- [ ] Agent runs daily without intervention
- [ ] Weekly summary reports generated
- [ ] Only exceptions require human attention
- [ ] Revenue growth is measurable and attributable

---

## Constraints & Guidelines

### DO
- Prioritize user experience over revenue
- Test changes with small traffic first
- Track everything for learning
- Respect creator content and attribution
- Follow affiliate program terms of service

### DON'T
- Add excessive ads that hurt load time
- Use misleading affiliate placements
- Modify content without quality review
- Make changes during traffic peaks
- Ignore negative user feedback

---

## Appendix: Affiliate Link Templates

### Amazon Product Link
```
https://www.amazon.com/dp/{ASIN}?tag=musthavemods-20
```

### Game Store Links
```
EA: https://www.ea.com/games/the-sims/the-sims-4/store/addons/{pack-id}
Steam: https://store.steampowered.com/app/{app-id}
```

### Patreon Creator Link
```
https://www.patreon.com/{creator-name}?utm_source=musthavemods
```

---

## Review Schedule

This document should be reviewed:
- **Monthly**: KPI targets and actuals
- **Quarterly**: Strategy and priorities
- **Annually**: Revenue stream mix and new opportunities
