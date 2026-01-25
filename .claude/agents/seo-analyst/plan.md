# SEO-Analyst Agent - Implementation Plan

**Status:** Ready
**Created:** 2026-01-24

---

## Purpose

The SEO-Analyst agent performs SEO health checks using Google Search Console (GSC) and Google Analytics (GA4) data. It identifies optimization opportunities, tracks keyword rankings, and provides actionable recommendations for improving organic search visibility.

## Scope

### In Scope
- Querying Google Search Console for search performance data
- Analyzing GA4 metrics for user engagement
- Detecting "quick win" keyword opportunities
- Identifying pages with indexing issues
- Generating SEO health reports
- Tracking search position changes over time

### Out of Scope
- Making changes to website content (use other agents)
- Technical SEO audits (robots.txt, sitemaps)
- Backlink analysis (requires external tools)
- Competitor analysis
- Paid search (SEM) campaigns

---

## Data Sources

### Google Search Console (via MCP)
Available tools:
- `mcp__gsc__list_sites` - List verified properties
- `mcp__gsc__search_analytics` - Get search performance data
- `mcp__gsc__enhanced_search_analytics` - Advanced analytics with quick wins
- `mcp__gsc__detect_quick_wins` - Auto-detect optimization opportunities
- `mcp__gsc__index_inspect` - Check indexing status
- `mcp__gsc__list_sitemaps` - View submitted sitemaps

### Google Analytics (via MCP)
Available tools:
- `mcp__google-analytics__get_account_summaries` - List accounts
- `mcp__google-analytics__get_property_details` - Property info
- `mcp__google-analytics__run_report` - Run GA4 reports
- `mcp__google-analytics__run_realtime_report` - Real-time data

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     SEO-Analyst Agent Flow                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Receive task   │
                    │ (audit/report/  │
                    │  quick-wins)    │
                    └────────┬────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   Full Audit          Quick Wins           Page Analysis
        │                     │                     │
        ▼                     ▼                     ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ Query GSC │        │ Query GSC │        │ Query GSC │
  │ all data  │        │ positions │        │ page data │
  └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
        │                    │                    │
        ▼                    ▼                    ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ Query GA4 │        │ Filter    │        │ Check     │
  │ engagement│        │ 4-10 pos  │        │ indexing  │
  └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
        │                    │                    │
        ▼                    ▼                    ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ Correlate │        │ Rank by   │        │ Get GA4   │
  │ metrics   │        │ potential │        │ pageviews │
  └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Generate report │
                    │ with actions    │
                    └─────────────────┘
```

---

## Key Metrics

### Search Console Metrics
- **Impressions**: How often pages appear in search
- **Clicks**: How often users click through
- **CTR**: Click-through rate (clicks/impressions)
- **Position**: Average ranking position

### GA4 Metrics
- **Sessions**: Total visits
- **Users**: Unique visitors
- **Bounce Rate**: Single-page visits
- **Avg. Session Duration**: Time on site
- **Pages per Session**: Engagement depth

---

## Quick Wins Detection

"Quick wins" are keywords where the site ranks on page 1 (positions 4-10) but has low CTR. Small improvements can yield significant traffic gains.

### Criteria
```typescript
const quickWinCriteria = {
  positionMin: 4,        // Already on page 1
  positionMax: 10,       // But not top 3
  minImpressions: 50,    // Enough volume to matter
  maxCtr: 2,             // Low CTR (room for improvement)
};
```

### ROI Estimation
```typescript
const potentialClicks = impressions * (targetCtr - currentCtr);
const estimatedValue = potentialClicks * clickValue * conversionRate;
```

---

## Report Types

### 1. Full SEO Audit
```markdown
# SEO Health Report
Site: mhmfinds.com
Period: Last 30 days

## Summary
- Total Impressions: 125,000
- Total Clicks: 4,500
- Average CTR: 3.6%
- Average Position: 18.2

## Top Performing Pages
| Page | Impressions | Clicks | CTR | Position |
|------|-------------|--------|-----|----------|
| /mods/hair | 15,000 | 750 | 5.0% | 8.2 |
| /mods/furniture | 12,000 | 480 | 4.0% | 12.1 |

## Quick Win Opportunities
| Query | Page | Impressions | Position | CTR | Potential |
|-------|------|-------------|----------|-----|-----------|
| "sims 4 goth hair" | /mods/hair | 2,000 | 6.2 | 1.2% | +180 clicks |
| "cc furniture" | /mods/furniture | 1,500 | 7.8 | 0.8% | +120 clicks |

## Issues Found
- 5 pages not indexed
- 12 pages with low CTR
- 3 pages dropping in rankings

## Recommendations
1. Optimize title tags for quick win keywords
2. Add FAQ schema to high-impression pages
3. Investigate indexing issues
```

### 2. Quick Wins Report
```markdown
# Quick Wins Report
Generated: 2026-01-24

## Summary
- Total opportunities: 23
- Estimated additional clicks/month: +1,250
- Estimated value: $375/month

## Top 10 Opportunities
1. **"sims 4 maxis match hair"**
   - Page: /mods/hair/maxis-match
   - Position: 5.2 → Target: 3.0
   - Impressions: 3,200
   - Current CTR: 1.8% → Target: 5.0%
   - Potential: +102 clicks/month
   - Action: Optimize page title and meta description

2. **"best sims 4 furniture mods"**
   ...
```

### 3. Page-Level Analysis
```markdown
# Page Analysis: /mods/hair
Date: 2026-01-24

## Search Performance
- Impressions: 15,000 (last 30 days)
- Clicks: 750
- CTR: 5.0%
- Avg Position: 8.2

## Top Queries
| Query | Impressions | Clicks | Position |
|-------|-------------|--------|----------|
| sims 4 hair cc | 3,500 | 175 | 6.1 |
| maxis match hair | 2,200 | 132 | 7.3 |

## User Engagement (GA4)
- Pageviews: 2,100
- Avg Time on Page: 2:45
- Bounce Rate: 42%

## Indexing Status
- Indexed: Yes
- Last Crawled: 2026-01-22

## Recommendations
1. Add internal links to related mod pages
2. Optimize for "sims 4 alpha hair" (high impressions, not ranking)
3. Improve page load time (current: 3.2s)
```

---

## Tools Required

| Tool | Purpose |
|------|---------|
| mcp__gsc__* | Search Console queries |
| mcp__google-analytics__* | GA4 data |
| Write | Create reports |
| Read | Read existing reports for comparison |

---

## Invocation

### Full Audit
```bash
claude
> Run a full SEO audit for the last 30 days
```

### Quick Wins
```bash
claude
> Find SEO quick wins for mhmfinds.com
```

### Page Analysis
```bash
claude
> Analyze SEO performance for /mods/hair
```

### Index Check
```bash
claude
> Check if all mod pages are indexed
```

### Compare Periods
```bash
claude
> Compare SEO metrics: this month vs last month
```

---

## Success Criteria

1. Reports include actionable recommendations
2. Quick wins have estimated ROI
3. Data is accurate and recent (within 48 hours)
4. Indexing issues are identified
5. Recommendations are specific (not generic SEO advice)

---

## Limitations

1. **API limits**: GSC has quota limits
2. **Data delay**: GSC data is 2-3 days behind
3. **No implementation**: Agent reports, doesn't fix
4. **Site verification**: Must be verified in GSC
5. **Attribution**: Difficult to attribute changes to specific optimizations

---

## Integration Points

### With Other Agents
- **facet-curator**: SEO data can inform facet priorities
- **scraper-monitor**: New content opportunities
- **db-script**: Update meta descriptions

### With MonetizationOpportunity
The SEO agent can create opportunities:
```typescript
await prisma.monetizationOpportunity.create({
  data: {
    opportunityType: 'CONTENT_EXPANSION',
    title: 'Optimize page for "sims 4 goth hair"',
    description: 'Page ranks #6 with 1.2% CTR...',
    priority: 7,
    confidence: 0.85,
    pageUrl: '/mods/hair',
    estimatedRevenueImpact: 50,
  },
});
```

---

## Example Session

```
SEO-Analyst Agent Starting
==========================
Task: Find quick win opportunities

Connecting to Google Search Console...
- Site: sc-domain:mhmfinds.com
- Date range: 2025-12-25 to 2026-01-24 (30 days)

Fetching search analytics...
- Total queries: 2,456
- Total pages: 187

Detecting quick wins...
Criteria: Position 4-10, Impressions > 50, CTR < 2%

Found 23 quick win opportunities!

Top 5 Opportunities:

1. "sims 4 maxis match furniture"
   - Page: /mods/furniture
   - Position: 5.8
   - Impressions: 2,100
   - Current CTR: 1.4%
   - Potential: +147 clicks/month

   Recommendation: Update page title to include "Maxis Match"
   Current: "Furniture Mods | ModVault"
   Suggested: "Best Maxis Match Furniture Mods | ModVault"

2. "free sims 4 hair cc"
   - Page: /mods/hair
   - Position: 7.2
   - Impressions: 1,800
   - Current CTR: 0.9%
   - Potential: +126 clicks/month

   Recommendation: Add "free" prominently to title/description

3. ...

Summary:
- Total opportunities: 23
- Combined potential: +1,250 clicks/month
- Estimated value: $375/month (at $0.30/click)

Report saved to: scripts/reports/seo-quick-wins-20260124.md

Next steps:
1. Review recommendations
2. Prioritize by potential impact
3. Implement title/meta changes
4. Monitor results in 2 weeks
```
