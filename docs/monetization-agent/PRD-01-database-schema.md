# PRD-01: Monetization Agent Database Schema

## Overview
Define the database schema to store all monetization-related data, metrics, recommendations, and action history.

## Priority: P0 (Foundation)
## Dependencies: None
## Estimated Implementation: 2 hours

---

## Schema Design

### 1. MonetizationMetric
Stores daily snapshots of key metrics per page/content.

```prisma
model MonetizationMetric {
  id            String   @id @default(cuid())

  // Content reference
  modId         String?  // If metric is for a mod
  pageUrl       String   // Full URL or path
  pageType      String   // "mod", "category", "search", "home", "creator"

  // Traffic metrics (from GA4)
  pageviews     Int      @default(0)
  uniqueVisitors Int     @default(0)
  avgSessionDuration Float @default(0)  // seconds
  bounceRate    Float    @default(0)    // 0-1
  scrollDepth   Float    @default(0)    // avg scroll depth 0-100

  // Traffic sources (from GA4)
  trafficGoogle   Int    @default(0)
  trafficPinterest Int   @default(0)
  trafficDirect   Int    @default(0)
  trafficSocial   Int    @default(0)
  trafficOther    Int    @default(0)

  // Revenue metrics (from Mediavine)
  impressions   Int      @default(0)
  adRevenue     Decimal  @default(0) @db.Decimal(10, 4)
  rpm           Decimal  @default(0) @db.Decimal(10, 4)  // Revenue per 1000 pageviews

  // Affiliate metrics (from GA4 events)
  affiliateClicks     Int @default(0)
  affiliateConversions Int @default(0)
  affiliateRevenue    Decimal @default(0) @db.Decimal(10, 2)

  // Engagement metrics
  modDownloads  Int      @default(0)
  modFavorites  Int      @default(0)

  // Timestamp
  metricDate    DateTime @db.Date
  createdAt     DateTime @default(now())

  // Relations
  mod           Mod?     @relation(fields: [modId], references: [id], onDelete: SetNull)

  @@unique([pageUrl, metricDate])
  @@index([metricDate])
  @@index([modId])
  @@index([pageType, metricDate])
  @@map("monetization_metrics")
}
```

### 2. MonetizationOpportunity
Detected opportunities for revenue improvement.

```prisma
model MonetizationOpportunity {
  id              String   @id @default(cuid())

  // Classification
  opportunityType String   // "affiliate", "rpm_optimization", "membership_cta", "content_gap"
  priority        String   // "high", "medium", "low"
  confidence      Float    // 0-1 confidence score

  // Context
  pageUrl         String?
  modId           String?
  category        String?

  // Opportunity details
  title           String
  description     String   @db.Text
  reasoning       String   @db.Text  // Why this opportunity was detected

  // Predicted impact
  estimatedRevenueImpact Decimal? @db.Decimal(10, 2)  // Monthly $ estimate
  estimatedRpmIncrease   Float?   // Percentage increase

  // Status
  status          String   @default("pending")  // "pending", "approved", "rejected", "implemented", "expired"

  // Timestamps
  detectedAt      DateTime @default(now())
  expiresAt       DateTime?  // Some opportunities are time-sensitive
  reviewedAt      DateTime?
  reviewedBy      String?
  implementedAt   DateTime?

  // Relations
  mod             Mod?     @relation(fields: [modId], references: [id], onDelete: SetNull)
  actions         MonetizationAction[]

  @@index([status])
  @@index([opportunityType])
  @@index([detectedAt])
  @@map("monetization_opportunities")
}
```

### 3. MonetizationAction
Specific actions to take for an opportunity.

```prisma
model MonetizationAction {
  id              String   @id @default(cuid())
  opportunityId   String

  // Action definition
  actionType      String   // "inject_affiliate", "add_cta", "optimize_layout", "create_content"
  actionData      Json     // Structured data for the action

  // Human-readable
  title           String
  description     String   @db.Text

  // Status tracking
  status          String   @default("pending")  // "pending", "approved", "rejected", "executed", "rolled_back"
  approvedAt      DateTime?
  approvedBy      String?
  executedAt      DateTime?

  // Impact measurement (filled after execution)
  preExecutionMetrics  Json?   // Snapshot before
  postExecutionMetrics Json?   // Snapshot after
  measuredImpact       Decimal? @db.Decimal(10, 2)  // Actual $ impact

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  opportunity     MonetizationOpportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([actionType])
  @@map("monetization_actions")
}
```

### 4. RevenueForecast
Revenue forecasting and tracking.

```prisma
model RevenueForecast {
  id              String   @id @default(cuid())

  // Forecast period
  forecastMonth   DateTime @db.Date  // First day of month

  // Revenue breakdown (forecasted)
  forecastedAdRevenue       Decimal @db.Decimal(10, 2)
  forecastedAffiliateRevenue Decimal @db.Decimal(10, 2)
  forecastedMembershipRevenue Decimal @db.Decimal(10, 2)
  forecastedTotalRevenue    Decimal @db.Decimal(10, 2)

  // Actuals (filled as month progresses)
  actualAdRevenue           Decimal? @db.Decimal(10, 2)
  actualAffiliateRevenue    Decimal? @db.Decimal(10, 2)
  actualMembershipRevenue   Decimal? @db.Decimal(10, 2)
  actualTotalRevenue        Decimal? @db.Decimal(10, 2)

  // Growth metrics
  monthOverMonthGrowth      Float?   // Percentage
  yearOverYearGrowth        Float?   // Percentage

  // Forecast confidence
  confidenceLevel           Float    @default(0.7)  // 0-1
  forecastNotes             String?  @db.Text

  // Model info
  modelVersion              String   @default("v1")
  inputDataSnapshot         Json?    // What data was used

  // Timestamps
  generatedAt     DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([forecastMonth])
  @@map("revenue_forecasts")
}
```

### 5. AgentRun
Track each agent execution for debugging and learning.

```prisma
model AgentRun {
  id              String   @id @default(cuid())

  // Run info
  runType         String   // "full", "ga4_sync", "mediavine_sync", "opportunity_scan", "forecast"
  status          String   @default("running")  // "running", "completed", "failed"

  // Timing
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  durationMs      Int?

  // Results
  itemsProcessed  Int      @default(0)
  opportunitiesFound Int   @default(0)
  errorsEncountered Int    @default(0)

  // Logs
  logSummary      String?  @db.Text
  errorDetails    Json?

  @@index([runType])
  @@index([startedAt])
  @@map("agent_runs")
}
```

---

## Implementation Steps

### Step 1: Add to Prisma Schema
Add all models above to `prisma/schema.prisma`.

### Step 2: Add Relations to Existing Models
Update the `Mod` model to include reverse relations:

```prisma
// Add to existing Mod model
model Mod {
  // ... existing fields ...

  // Monetization relations
  monetizationMetrics    MonetizationMetric[]
  monetizationOpportunities MonetizationOpportunity[]
}
```

### Step 3: Generate and Apply Migration

```bash
npm run db:generate
npm run db:migrate -- --name add_monetization_agent_schema
```

### Step 4: Create Seed Data (Optional)
Create initial seed for testing:

```typescript
// scripts/seed-monetization.ts
import { prisma } from '../lib/prisma';

async function seedMonetization() {
  // Create a sample opportunity for testing
  await prisma.monetizationOpportunity.create({
    data: {
      opportunityType: 'affiliate',
      priority: 'high',
      confidence: 0.85,
      title: 'Sample Affiliate Opportunity',
      description: 'This is a test opportunity',
      reasoning: 'Seeded for testing',
      status: 'pending',
    },
  });

  console.log('Seeded monetization test data');
}

seedMonetization();
```

---

## Validation Criteria

- [ ] All models created in Prisma schema
- [ ] Migration applied successfully
- [ ] Indexes created for performance
- [ ] Relations working (can query Mod.monetizationMetrics)
- [ ] Test insert/query for each model works

---

## Next Steps
After completing this PRD, proceed to:
- **PRD-02**: GA4 Connector (to populate MonetizationMetric)
- **PRD-07**: Action Queue System (to use MonetizationAction)
