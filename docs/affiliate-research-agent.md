# Affiliate Research Agent Documentation

This document provides comprehensive documentation for the Affiliate Research Agent system, a two-agent architecture for detecting, tracking, and optimizing affiliate monetization opportunities.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Services](#core-services)
4. [API Endpoints](#api-endpoints)
5. [Manual Testing](#manual-testing)
6. [Monitoring and Learning](#monitoring-and-learning)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Affiliate Research Agent is an intelligent monetization system that:

- **Scans** for affiliate monetization opportunities across the site
- **Analyzes** traffic patterns, buyer intent, and page performance
- **Queues** actionable recommendations for human approval
- **Tracks** the actual impact of implemented actions
- **Learns** from historical performance to improve future predictions

### Key Principles

1. **Human-in-the-loop**: All detected opportunities require admin approval before execution
2. **Data-driven decisions**: Recommendations are based on GA4 traffic data and monetization metrics
3. **Continuous learning**: The system improves estimates based on measured outcomes
4. **Transparency**: Full audit trail of decisions, approvals, and results

---

## Architecture

The system uses a two-agent architecture:

```
                           AFFILIATE RESEARCH AGENT SYSTEM
    ================================================================================

    +-------------------+       +-------------------+       +-------------------+
    |                   |       |                   |       |                   |
    |   DATA SOURCES    |       |  DETECTION AGENT  |       |   ACTION QUEUE    |
    |                   |       |                   |       |                   |
    +-------------------+       +-------------------+       +-------------------+
    |                   |       |                   |       |                   |
    | - GA4 Traffic     |------>| Affiliate         |------>| Pending           |
    | - Monetization    |       | Detector          |       | Opportunities     |
    |   Metrics         |       |                   |       |                   |
    | - Mod Database    |       | - No Affiliate    |       +--------+----------+
    |                   |       | - Buyer Intent    |                |
    +-------------------+       | - Traffic Source  |                v
                                | - Collections     |       +-------------------+
                                +-------------------+       |                   |
                                                            |  ADMIN APPROVAL   |
                                                            |                   |
    +-------------------+       +-------------------+       | - Review          |
    |                   |       |                   |       | - Approve/Reject  |
    |   LEARNING AGENT  |<------| IMPACT TRACKER    |<------| - Feedback        |
    |                   |       |                   |       |                   |
    +-------------------+       +-------------------+       +-------------------+
    |                   |       |                   |
    | - Prediction      |       | - Baseline Calc   |
    |   Accuracy        |       | - Measurement     |
    | - Adjustment      |       |   Windows         |
    |   Factors         |       | - Revenue Impact  |
    | - Trend Analysis  |       |                   |
    |                   |       |                   |
    +-------------------+       +-------------------+


                                DATA FLOW DIAGRAM
    ================================================================================

    +------------------+
    |   Orchestrator   |  Runs jobs on schedule (daily)
    +--------+---------+
             |
             v
    +------------------+     +------------------+     +------------------+
    |   GA4 Sync       |---->|  Affiliate Scan  |---->|  Queue Actions   |
    +------------------+     +------------------+     +------------------+
                                      |
                                      v
                             +------------------+
                             |  Deduplicate &   |
                             |  Create Opps     |
                             +------------------+
                                      |
                                      v
                             +------------------+     +------------------+
                             |  Admin Reviews   |---->|  Execute Action  |
                             +------------------+     +------------------+
                                                              |
                                                              v
                             +------------------+     +------------------+
                             |  Learning System |<----|  Track Impact    |
                             +------------------+     +------------------+
                                      |
                                      v
                             +------------------+
                             |  Adjust Future   |
                             |  Estimates       |
                             +------------------+
```

### Component Summary

| Component | File | Purpose |
|-----------|------|---------|
| Affiliate Detector | `lib/services/affiliateDetector.ts` | Scans for affiliate opportunities |
| Action Queue | `lib/services/actionQueue.ts` | Manages opportunities and approvals |
| Agent Orchestrator | `lib/services/agentOrchestrator.ts` | Coordinates all jobs |
| Agent Learning | `lib/services/agentLearning.ts` | Tracks accuracy and adjusts estimates |
| Scan Script | `scripts/scan-affiliate-opportunities.ts` | CLI entry point for scanning |

---

## Core Services

### 1. Affiliate Detector (`lib/services/affiliateDetector.ts`)

The primary detection engine that identifies affiliate monetization opportunities.

**Detection Methods:**

| Method | Description | Priority |
|--------|-------------|----------|
| `findPagesWithoutAffiliates()` | High-traffic pages with no affiliate clicks | High |
| `findBuyerIntentPages()` | Pages with purchase-intent keywords | High |
| `findTrafficSourceMismatches()` | Pinterest-heavy pages needing visual optimization | Medium |
| `findUnmonetizedCollections()` | Category/search pages with low click rates | High |

**Buyer Intent Keywords:**

```
patreon, exclusive, premium, early access, supporter,
download, get it, grab it, available now,
maxis match, alpha cc, high quality, collection, bundle
```

**Affiliate Programs Tracked:**

| Program | Commission | Best For |
|---------|------------|----------|
| Patreon | 8% (recurring) | Creator pages, exclusive content |
| CurseForge | 5% | Gameplay mods, scripts |
| Amazon | 4% | Setup guides, peripherals |
| The Sims Resource | 10% | CC roundups, lookbooks |

### 2. Action Queue (`lib/services/actionQueue.ts`)

Manages the opportunity lifecycle from detection to implementation.

**Opportunity Statuses:**

```
PENDING -> APPROVED -> EXECUTED -> IMPLEMENTED
                \-> REJECTED
                \-> EXPIRED (after 30 days)
```

**Key Methods:**

| Method | Description |
|--------|-------------|
| `createOpportunity(input)` | Creates new opportunity with deduplication |
| `getPendingOpportunities(limit)` | Gets opportunities awaiting review |
| `approveOpportunity(id, approvedBy)` | Approves an opportunity |
| `rejectOpportunity(id, rejectedBy, reason)` | Rejects with optional reason |
| `getQueueStats()` | Returns queue statistics |

### 3. Agent Orchestrator (`lib/services/agentOrchestrator.ts`)

Coordinates all agent jobs and manages scheduling.

**Job Types:**

| Job | Frequency | Purpose |
|-----|-----------|---------|
| `full` | Manual | Run all jobs in sequence |
| `ga4_sync` | Daily 6:00 AM | Pull traffic data from GA4 |
| `mediavine_sync` | Daily 6:30 AM | Pull revenue data |
| `affiliate_scan` | Daily 7:00 AM | Detect opportunities |
| `rpm_analysis` | Daily 7:30 AM | Analyze RPM performance |
| `forecast` | Weekly | Update revenue projections |
| `cleanup` | Weekly | Expire old opportunities |
| `auto_execute` | Daily | Execute approved actions |
| `report` | Manual | Generate status report |

### 4. Agent Learning (`lib/services/agentLearning.ts`)

Tracks prediction accuracy and adjusts future estimates.

**Key Features:**

- Calculates prediction accuracy by action type
- Provides adjustment factors for estimates (0.5x - 2.0x range)
- Detects accuracy trends (improving/stable/declining)
- Generates insights for admin dashboard

**Minimum Requirements:**

- 5 measurements needed before applying adjustments
- 60% confidence threshold for learning application
- 90-day rolling window for accuracy calculation

---

## API Endpoints

### Agent Control APIs

#### POST `/api/monetization/agent/run`

Triggers an agent job. Requires admin authentication.

**Request:**
```json
{
  "jobType": "affiliate_scan" | "ga4_sync" | "full" | ...
}
```

**Response:**
```json
{
  "success": true,
  "duration": 1523,
  "itemsProcessed": 45,
  "opportunitiesFound": 12,
  "error": null
}
```

#### GET `/api/monetization/agent/status`

Returns status of recent agent runs.

**Response:**
```json
{
  "lastRuns": {
    "full": {
      "startedAt": "2024-01-15T06:00:00Z",
      "completedAt": "2024-01-15T06:05:23Z",
      "status": "COMPLETED",
      "durationMs": 323000,
      "itemsProcessed": 156
    },
    "affiliate_scan": { ... }
  }
}
```

### Queue Management APIs

#### GET `/api/monetization/queue`

Lists pending opportunities and queue statistics.

**Query Parameters:**
- `limit` (optional): Max opportunities to return (default: 50)

**Response:**
```json
{
  "opportunities": [
    {
      "id": "cm1234...",
      "opportunityType": "AFFILIATE_PLACEMENT",
      "title": "Add affiliate links to \"Summer CC Pack\"",
      "description": "This page has 450 pageviews...",
      "priority": 8,
      "confidence": 0.85,
      "estimatedRevenueImpact": 12.50,
      "actions": [
        {
          "id": "act123...",
          "actionType": "ADD_AFFILIATE_LINK",
          "status": "PENDING"
        }
      ]
    }
  ],
  "stats": {
    "pending": 23,
    "approved": 5,
    "rejected": 12,
    "implemented": 89,
    "expired": 34,
    "totalEstimatedImpact": 287.50
  }
}
```

#### POST `/api/monetization/queue`

Approve or reject an opportunity.

**Request:**
```json
{
  "opportunityId": "cm1234...",
  "action": "approve" | "reject",
  "reason": "Optional rejection reason"
}
```

**Response:**
```json
{
  "success": true,
  "opportunity": { ... }
}
```

### Affiliate APIs

#### GET `/api/affiliates`

Get active affiliate offers for display.

**Query Parameters:**
- `limit` (optional): Max offers (default: 3)
- `category` (optional): Filter by category
- `source` (optional): Display context (interstitial, grid, sidebar)

**Response:**
```json
{
  "offers": [
    {
      "id": "aff123...",
      "name": "Premium CC Bundle",
      "description": "...",
      "imageUrl": "https://...",
      "affiliateUrl": "https://...",
      "partner": "Patreon",
      "category": "clothing"
    }
  ]
}
```

#### POST `/api/affiliates/click`

Track affiliate link clicks.

---

## Manual Testing

### 1. Run Affiliate Scan

```bash
# Run the affiliate opportunity scanner
npm run agent:scan-affiliates

# Expected output:
# Affiliate Opportunity Scanner
# ═══════════════════════════════════════
#   Scanning for monetization opportunities...
#
# ───────────────────────────────────────
#   Created 12 opportunities
#   Duration: 3.45s
# ═══════════════════════════════════════
```

### 2. Run Full Agent Cycle

```bash
# Run all agent jobs in sequence
npm run agent full

# Or via API (requires admin token):
curl -X POST http://localhost:3000/api/monetization/agent/run \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"jobType": "full"}'
```

### 3. View Queue Status

```bash
# Via CLI report
npm run agent report

# Or via API:
curl http://localhost:3000/api/monetization/queue \
  -H "Cookie: next-auth.session-token=YOUR_SESSION"
```

### 4. Approve/Reject Opportunities

```bash
# Approve an opportunity
curl -X POST http://localhost:3000/api/monetization/queue \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"opportunityId": "cm1234...", "action": "approve"}'

# Reject with reason
curl -X POST http://localhost:3000/api/monetization/queue \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{"opportunityId": "cm1234...", "action": "reject", "reason": "Not relevant"}'
```

### 5. Test Database Queries

```bash
# Check pending opportunities
npx prisma studio
# Navigate to MonetizationOpportunity table

# Or via SQL:
# SELECT * FROM monetization_opportunities WHERE status = 'PENDING' ORDER BY priority DESC;
```

---

## Monitoring and Learning

### Understanding the Learning System

The agent learning system operates on a feedback loop:

1. **Detection**: Agent creates opportunity with estimated revenue impact
2. **Approval**: Admin approves (or rejects) the opportunity
3. **Execution**: Action is implemented
4. **Measurement**: Impact tracked over measurement window (7-30 days)
5. **Learning**: Results compared to estimates, adjustment factors calculated

### Key Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Prediction Accuracy | 1 - abs(error/estimate) | >75% |
| Adjustment Factor | actual_impact / estimated_impact | 0.8 - 1.2 |
| Trend | Recent accuracy vs historical | Improving |
| Sample Size | Number of completed measurements | >50 per action type |

### Viewing Learning Insights

```typescript
// In code:
import { agentLearning } from '@/lib/services/agentLearning';

const dashboard = await agentLearning.getLearningDashboardData();
console.log('Overall Accuracy:', dashboard.overallAccuracy);
console.log('Total Measurements:', dashboard.totalMeasurements);
console.log('Recent Trend:', dashboard.recentTrend);
console.log('Insights:', dashboard.insights);
```

### Learning Data Sources

The learning system tracks:

- **ImpactMeasurement**: Records for each executed action
- **AgentLearningMetric**: Aggregated accuracy metrics by action type
- **MonetizationAction**: Pre/post execution metrics

### Measurement Windows

| Action Type | Window | Why |
|-------------|--------|-----|
| Add Affiliate Link | 30 days | Needs click volume |
| Update Meta Description | 14 days | SEO propagation |
| Add to Collection | 7 days | Internal traffic |
| Expand Content | 30 days | SEO + engagement |

---

## Troubleshooting

### Common Issues

#### 1. No Opportunities Being Created

**Symptoms:** Scan runs but creates 0 opportunities.

**Possible Causes:**
- No monetization metrics in database (GA4 not synced)
- All pages already have pending opportunities (deduplication)
- Traffic thresholds not met (need >100 pageviews)

**Solutions:**
```bash
# Verify GA4 data exists
npx prisma studio
# Check monetization_metrics table

# Run GA4 sync first
npm run agent ga4_sync

# Then run affiliate scan
npm run agent:scan-affiliates
```

#### 2. API Returns 401 Unauthorized

**Symptoms:** API calls fail with authentication error.

**Possible Causes:**
- Not logged in as admin
- Session expired
- Missing admin flag on user

**Solutions:**
```bash
# Verify admin status in database
# In Prisma Studio, check users table for isAdmin = true

# Create admin user if needed
npx tsx scripts/create-admin.ts
```

#### 3. Learning Not Applied

**Symptoms:** Estimates show "learning not applied".

**Possible Causes:**
- Fewer than 5 measurements completed
- Confidence below 60%
- No historical data for action type

**Solutions:**
- Wait for more measurements to complete
- Check ImpactMeasurement table for status = 'complete'
- Verify measurement windows have elapsed

#### 4. Agent Run Fails

**Symptoms:** Agent job returns error.

**Possible Causes:**
- Database connection issues
- Missing environment variables
- API rate limits

**Solutions:**
```bash
# Check logs for specific error
npm run agent full 2>&1 | tee agent.log

# Verify environment variables
echo $DATABASE_URL
echo $GA4_PROPERTY_ID

# Check database connectivity
npx prisma db push --accept-data-loss
```

#### 5. Duplicate Opportunities

**Symptoms:** Same opportunity appears multiple times.

**Possible Causes:**
- Deduplication not working
- Status not set correctly
- Different pageUrl formats

**Solutions:**
```sql
-- Find duplicates
SELECT "pageUrl", "opportunityType", COUNT(*)
FROM monetization_opportunities
WHERE status = 'PENDING'
GROUP BY "pageUrl", "opportunityType"
HAVING COUNT(*) > 1;

-- Clean up manually if needed
UPDATE monetization_opportunities
SET status = 'EXPIRED'
WHERE id IN (SELECT id FROM ... subquery for duplicates);
```

### Logs and Debugging

**Agent Run Logs:**
```bash
# View recent agent runs
SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT 10;

# Check for errors
SELECT * FROM agent_runs WHERE status = 'FAILED' ORDER BY started_at DESC;
```

**Enable Debug Logging:**
```typescript
// In affiliateDetector.ts, add:
console.log('Scanning page:', metric.pageUrl);
console.log('Pageviews:', totalPv, 'Affiliate clicks:', totalClicks);
```

### Health Checks

```bash
# Database connection
npx prisma db pull

# API health
curl http://localhost:3000/api/health

# Agent can run
npm run agent report
```

---

## Related Documentation

- [PRD-00: Monetization Agent Overview](./monetization-agent/PRD-00-overview.md)
- [PRD-04: Affiliate Detection](./monetization-agent/PRD-04-affiliate-detection.md)
- [PRD-07: Action Queue System](./monetization-agent/PRD-07-action-queue.md)
- [PRD-08: Agent Orchestrator](./monetization-agent/PRD-08-orchestrator.md)
- [PRD-20: Impact Tracking & Learning](./monetization-agent/PRD-20-impact-tracking.md)

---

## Quick Reference

### npm Scripts

| Command | Description |
|---------|-------------|
| `npm run agent full` | Run all agent jobs |
| `npm run agent:scan-affiliates` | Run affiliate scan only |
| `npm run agent report` | Show agent status report |
| `npm run queue list` | List pending opportunities |

### Key Files

| Purpose | Path |
|---------|------|
| Affiliate Detection | `lib/services/affiliateDetector.ts` |
| Action Queue | `lib/services/actionQueue.ts` |
| Orchestrator | `lib/services/agentOrchestrator.ts` |
| Learning System | `lib/services/agentLearning.ts` |
| API - Run Agent | `app/api/monetization/agent/run/route.ts` |
| API - Queue | `app/api/monetization/queue/route.ts` |
| CLI Script | `scripts/scan-affiliate-opportunities.ts` |

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Prisma database connection |
| `GA4_PROPERTY_ID` | For GA4 | Google Analytics property |
| `GA4_SERVICE_ACCOUNT_KEY` | For GA4 | GA4 API authentication |
| `OPENAI_API_KEY` | For AI | AI-powered analysis |
| `PERPLEXITY_API_KEY` | For Research | Product research via Perplexity |

---

## Persona Swarm System (Product Validation)

This section documents the Persona Swarm system for validating affiliate products through simulated user personas.

### Overview

The Persona Swarm is a second-generation enhancement to the Affiliate Research Agent that addresses the **0% conversion problem** on current affiliate offers (e.g., gaming peripherals like Logitech).

**Problem:** Current offers don't match audience interests (75% female, 18-34, searching for fashion CC)

**Solution:** A 5-persona swarm that validates products through simulated user perspectives before creating affiliate offers.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERSONA SWARM VALIDATION FLOW                │
└─────────────────────────────────────────────────────────────────┘

1. CONTENT ANALYSIS
   ┌──────────────┐
   │   Database   │ → Query contentType & theme distribution
   │  (Mod table) │ → Identify top categories by downloads
   └──────────────┘
         │
         ▼
2. PRODUCT RESEARCH
   ┌──────────────┐
   │  Perplexity  │ → Search for products matching themes
   │     API      │ → Filter out gaming/tech products
   └──────────────┘
         │
         ▼
3. SCORING
   ┌──────────────┐
   │   Scoring    │ → Demographic fit (35%)
   │  Algorithm   │ → Aesthetic match (30%)
   │              │ → Price point (20%)
   │              │ → Trend alignment (15%)
   └──────────────┘
         │
         ▼
4. PERSONA VALIDATION
   ┌──────────────┐
   │   Persona    │ → Emily (cottagecore, $45K)
   │    Swarm     │ → Sofia (Y2K, $25K)
   │   (5 votes)  │ → Luna (goth, $38K)
   │              │ → Mia (student, $12K)
   │              │ → Claire (professional, $65K)
   └──────────────┘
         │
         ▼
5. OFFER CREATION
   ┌──────────────┐
   │  Database    │ → Create AffiliateOffer record
   │ (if 3/5     │ → Store persona feedback
   │  approve)   │ → Track for conversion learning
   └──────────────┘
```

### The 5 Personas

| Name | Age | Location | Aesthetic | Income | Price Range |
|------|-----|----------|-----------|--------|-------------|
| Emily | 25 | Ohio, US | Cottagecore/Modern | $45K | $20-60 |
| Sofia | 22 | São Paulo | Y2K/Trendy | $25K | $10-35 |
| Luna | 28 | London | Goth/Alternative | $38K | $30-80 |
| Mia | 19 | Texas | Budget Student | $12K | $5-25 |
| Claire | 32 | Toronto | Professional/Minimal | $65K | $40-150 |

**Voting Rules:**
- Majority vote required: **3/5 must approve** for product to pass
- Each persona evaluates: "Would I buy this?", "Does it match my aesthetic?", "Is the price right?"

### Persona Swarm API Endpoints

#### POST `/api/affiliates/research`

Trigger a research cycle that analyzes content, researches products, and validates through personas.

**Request:**
```json
{
  "limit": 10,
  "themes": ["y2k", "cottagecore"]
}
```

**Response:**
```json
{
  "success": true,
  "runId": "clx123...",
  "productsFound": 25,
  "productsValidated": 25,
  "offersCreated": 8,
  "themesAnalyzed": ["y2k", "cottagecore"],
  "summary": "8/25 products passed persona validation"
}
```

#### POST `/api/affiliates/validate`

Manually validate products through the persona swarm.

**Request:**
```json
{
  "products": [
    {
      "name": "Butterfly Hair Clips Set",
      "price": 12.99,
      "category": "hair-accessories",
      "description": "Y2K style butterfly clips"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "total": 1,
  "passed": 1,
  "failed": 0,
  "results": [
    {
      "product": "Butterfly Hair Clips Set",
      "passed": true,
      "approvalCount": 4,
      "summary": "Appeals to 4/5 personas",
      "votes": {
        "emily": { "wouldBuy": true, "aestheticScore": 8, "priceFeeling": "perfect", "reasoning": "..." },
        "sofia": { "wouldBuy": true, "aestheticScore": 9, "priceFeeling": "perfect", "reasoning": "..." },
        "luna": { "wouldBuy": false, "aestheticScore": 4, "priceFeeling": "too_cheap", "reasoning": "..." },
        "mia": { "wouldBuy": true, "aestheticScore": 7, "priceFeeling": "perfect", "reasoning": "..." },
        "claire": { "wouldBuy": true, "aestheticScore": 6, "priceFeeling": "perfect", "reasoning": "..." }
      }
    }
  ]
}
```

#### POST `/api/affiliates/persona-chat`

Chat with a specific persona for brainstorming product ideas.

**Request:**
```json
{
  "persona": "sofia",
  "message": "What products would you want to see advertised on a Sims mod site?",
  "history": []
}
```

**Response:**
```json
{
  "success": true,
  "persona": "sofia",
  "response": "OMG yes! I'd love to see like, butterfly clips and those cute Y2K aesthetic things..."
}
```

#### GET `/api/affiliates/persona-chat`

List available personas.

#### GET `/api/affiliates/performance`

Get conversion metrics comparing persona-validated vs non-validated offers.

**Query params:** `?days=30`

**Response includes:**
- Overall metrics (CTR, conversion rate)
- Persona validation comparison (validated vs non-validated CTR)
- Performance by category and theme
- Correlation between persona score and conversions

### Scoring Algorithm

**Negative Signals (auto-rejection):**
- Contains "gaming", "gamer", "RGB"
- Category: peripherals, tech, electronics
- Price > $75

**Sweet Spot:** Products $15-50 in fashion, beauty, home decor categories

### Manual Testing

#### Test Research Cycle
```bash
curl -X POST http://localhost:3000/api/affiliates/research \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin-session>" \
  -d '{"limit": 5}'
```

#### Test Product Validation
```bash
curl -X POST http://localhost:3000/api/affiliates/validate \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin-session>" \
  -d '{
    "products": [
      {"name": "Butterfly Hair Clips", "price": 12.99, "category": "accessories"},
      {"name": "LED Fairy Lights", "price": 18.50, "category": "home-decor"}
    ]
  }'
```

#### Chat with Persona
```bash
curl -X POST http://localhost:3000/api/affiliates/persona-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin-session>" \
  -d '{"persona": "emily", "message": "Would you buy a $25 fairy light set?"}'
```

### Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Conversion Rate | 0% | >1% |
| Swarm Approval Rate | N/A | 60%+ |
| Unanimous Approval | N/A | >30% |
| CTR on Offers | 0.04% | >0.5% |

### Persona Swarm Files

| File | Purpose |
|------|---------|
| `.claude/agents/persona-swarm/plan.md` | Swarm definition |
| `.claude/agents/persona-swarm/prompt.md` | Master prompt |
| `.claude/agents/persona-swarm/emily.md` | Emily persona |
| `.claude/agents/persona-swarm/sofia.md` | Sofia persona |
| `.claude/agents/persona-swarm/luna.md` | Luna persona |
| `.claude/agents/persona-swarm/mia.md` | Mia persona |
| `.claude/agents/persona-swarm/claire.md` | Claire persona |
| `lib/services/personaSwarmService.ts` | Persona evaluation service |
| `lib/services/affiliateResearchService.ts` | Research service |
| `app/api/affiliates/research/route.ts` | Research API |
| `app/api/affiliates/validate/route.ts` | Validation API |
| `app/api/affiliates/persona-chat/route.ts` | Chat API |
| `app/api/affiliates/performance/route.ts` | Performance API |
