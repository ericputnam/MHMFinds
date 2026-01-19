# Monetization Agent - System Overview

## Executive Summary

The MHMFinds Monetization Agent is an autonomous revenue optimization system that:
- Monitors traffic, content performance, and user behavior
- Detects monetization opportunities (affiliate, RPM, membership)
- Queues actionable recommendations for human approval
- Forecasts revenue growth and tracks performance
- Learns which actions increase revenue per visitor

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MONETIZATION AGENT                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ Data Layer   │───▶│ Analysis     │───▶│ Action       │          │
│  │              │    │ Engine       │    │ Queue        │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ GA4 API      │    │ Opportunity  │    │ Admin        │          │
│  │ Mediavine    │    │ Detection    │    │ Dashboard    │          │
│  │ Internal DB  │    │ Forecasting  │    │ (Approve)    │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                  Learning Loop                        │          │
│  │  Track actions → Measure impact → Rank by ROI        │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## PRD Index

| PRD | Component | Priority | Dependencies |
|-----|-----------|----------|--------------|
| [PRD-01](./PRD-01-database-schema.md) | Database Schema | P0 | None |
| [PRD-02](./PRD-02-ga4-connector.md) | GA4 Data Connector | P0 | PRD-01 |
| [PRD-03](./PRD-03-mediavine-connector.md) | Mediavine Connector | P0 | PRD-01 |
| [PRD-04](./PRD-04-affiliate-detection.md) | Affiliate Opportunity Detection | P1 | PRD-01, 02 |
| [PRD-05](./PRD-05-rpm-analyzer.md) | RPM Analysis Engine | P1 | PRD-01, 02, 03 |
| [PRD-06](./PRD-06-revenue-forecasting.md) | Revenue Forecasting | P1 | PRD-01, 02, 03 |
| [PRD-07](./PRD-07-action-queue.md) | Action Queue System | P0 | PRD-01 |
| [PRD-08](./PRD-08-orchestrator.md) | Agent Orchestrator | P0 | All above |
| [PRD-09](./PRD-09-admin-dashboard.md) | Admin Dashboard | P2 | PRD-07 |

## Implementation Order

### Phase 1: Foundation (Build First)
1. **PRD-01**: Database schema for all monetization data
2. **PRD-07**: Action queue system (so recommendations can be stored)
3. **PRD-02**: GA4 connector (traffic + affiliate click data)
4. **PRD-03**: Mediavine connector (RPM data)

### Phase 2: Intelligence (Build Second)
5. **PRD-04**: Affiliate detection engine
6. **PRD-05**: RPM analysis engine
7. **PRD-06**: Revenue forecasting

### Phase 3: Orchestration (Build Third)
8. **PRD-08**: Main orchestrator that schedules all jobs
9. **PRD-09**: Admin dashboard for approving actions

## Tech Stack

- **Runtime**: Node.js scripts executed via npm commands
- **Database**: PostgreSQL (existing Prisma setup)
- **APIs**: GA4 Data API, Mediavine Reporting API
- **Scheduling**: npm scripts + cron or Vercel cron
- **AI**: OpenAI API for opportunity classification

## Environment Variables Required

```env
# GA4
GA4_PROPERTY_ID=your-property-id
GA4_SERVICE_ACCOUNT_KEY=base64-encoded-service-account-json

# Mediavine
MEDIAVINE_API_KEY=your-api-key
MEDIAVINE_SITE_ID=your-site-id

# OpenAI (already have)
OPENAI_API_KEY=existing-key
```

## Success Metrics

| Metric | Baseline | Target (90 days) |
|--------|----------|------------------|
| RPM | Current | +15% |
| Affiliate Click Rate | Current | +25% |
| Revenue/Visitor | Current | +20% |
| Actions Approved | N/A | 50+/week |

## Risk Mitigation

1. **Human in the loop**: All actions require approval before execution
2. **Rollback capability**: Track what changes were made, allow reverting
3. **Rate limiting**: Don't overwhelm APIs with requests
4. **Data validation**: Verify data quality before making decisions
