# PRD-20: Impact Tracking & Learning

## Overview
Implement a closed-loop learning system that tracks the actual revenue impact of executed monetization actions, compares them to estimates, and uses this data to improve future predictions and decision-making.

## Priority: P1 (Critical for Agent Intelligence)
## Dependencies: PRD-18 (Auto-Execution), PRD-06 (Revenue Forecasting)
## Estimated Implementation: 2-3 days

---

## Problem Statement

Currently, the monetization agent makes predictions but never learns from outcomes:
- Estimated revenue impacts are never verified against actual results
- Good predictions and bad predictions are treated equally
- The agent can't improve its accuracy over time
- Admin has no way to see if actions actually worked

## Solution

Create a feedback loop that:
1. **Tracks actual impact** of executed actions over time
2. **Compares predictions to reality** to calculate accuracy
3. **Adjusts future estimates** based on historical performance
4. **Surfaces insights** about what works and what doesn't
5. **Auto-tunes confidence** based on track record

---

## Core Concepts

### Impact Measurement Window

Actions need time to show results. Measurement windows:

| Action Type | Measurement Window | Why |
|-------------|-------------------|-----|
| Add Affiliate Link | 30 days | Need enough clicks to measure conversion |
| Update Meta Description | 14 days | SEO changes take time to propagate |
| Add to Collection | 7 days | Internal traffic changes quickly |
| Expand Content | 30 days | SEO + engagement metrics need time |
| Add Ad Slot | 7 days | RPM impact visible quickly |

### Attribution Model

To measure impact, we need:
1. **Baseline period**: 30 days before action
2. **Measurement period**: Window after action
3. **Control comparison**: Similar pages without changes (when possible)

```
Impact = (Metric_After - Metric_Before) × Attribution_Factor

Attribution_Factor accounts for:
- Seasonality (compare to same period last year)
- Site-wide trends (normalize against site average)
- External factors (algorithm updates, viral content)
```

---

## Database Schema

### Add ImpactMeasurement model

```prisma
model ImpactMeasurement {
  id              String   @id @default(cuid())

  // Link to action
  actionId        String
  action          MonetizationAction @relation(fields: [actionId], references: [id])

  // Measurement metadata
  measurementType String   // revenue, traffic, rpm, conversion
  measurementWindow Int    // Days measured
  startDate       DateTime
  endDate         DateTime

  // Baseline data (before action)
  baselineValue   Decimal
  baselinePeriodStart DateTime
  baselinePeriodEnd DateTime

  // Measured data (after action)
  measuredValue   Decimal

  // Calculated impact
  absoluteImpact  Decimal  // measuredValue - baselineValue
  percentImpact   Decimal  // (absoluteImpact / baselineValue) * 100
  revenueImpact   Decimal? // Estimated monthly $ impact

  // Comparison to prediction
  estimatedImpact Decimal  // Original prediction
  predictionError Decimal  // Percentage error
  predictionAccuracy Decimal // 1 - abs(error), capped at 0

  // Attribution
  attributionConfidence Decimal // How confident are we this was due to the action
  attributionNotes String?

  // Status
  status          String   @default("pending") // pending, measuring, complete, inconclusive
  completedAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([actionId])
  @@index([status])
  @@index([endDate])
}
```

### Add AgentLearningMetric model

```prisma
model AgentLearningMetric {
  id              String   @id @default(cuid())

  // What this metric tracks
  metricType      String   // prediction_accuracy, execution_success, etc.
  actionType      String?  // If specific to an action type
  opportunityType String?  // If specific to opportunity type

  // Time period
  periodStart     DateTime
  periodEnd       DateTime
  periodType      String   // daily, weekly, monthly

  // Values
  sampleSize      Int
  meanValue       Decimal
  medianValue     Decimal?
  stdDeviation    Decimal?
  minValue        Decimal?
  maxValue        Decimal?

  // Trending
  previousPeriodValue Decimal?
  trend           Decimal? // Percentage change from previous

  createdAt       DateTime @default(now())

  @@unique([metricType, actionType, opportunityType, periodStart, periodType])
  @@index([metricType, periodStart])
}
```

### Update MonetizationAction model

```prisma
model MonetizationAction {
  // ... existing fields ...

  // Learning fields
  impactMeasurements ImpactMeasurement[]
  verifiedImpact     Decimal?   // Final measured impact
  verifiedAt         DateTime?
  learningApplied    Boolean    @default(false)
}
```

---

## Implementation

### 1. Impact Tracker Service

Create `lib/services/impactTracker.ts`:

```typescript
interface MeasurementConfig {
  actionType: string;
  measurementWindow: number;
  metrics: string[];
  requiresControl: boolean;
}

class ImpactTracker {
  // Configuration for each action type
  private configs: Record<string, MeasurementConfig> = {
    ADD_AFFILIATE_LINK: {
      actionType: 'ADD_AFFILIATE_LINK',
      measurementWindow: 30,
      metrics: ['affiliate_clicks', 'affiliate_revenue', 'conversion_rate'],
      requiresControl: false
    },
    UPDATE_META_DESCRIPTION: {
      actionType: 'UPDATE_META_DESCRIPTION',
      measurementWindow: 14,
      metrics: ['organic_traffic', 'ctr', 'impressions'],
      requiresControl: false
    },
    // ... other configs
  };

  // Start tracking for an executed action
  async startTracking(actionId: string): Promise<void> {
    const action = await prisma.monetizationAction.findUnique({
      where: { id: actionId }
    });

    if (!action || !action.executedAt) return;

    const config = this.configs[action.type];
    if (!config) return;

    // Calculate baseline
    const baseline = await this.calculateBaseline(action, config);

    // Create measurement record
    await prisma.impactMeasurement.create({
      data: {
        actionId,
        measurementType: 'composite',
        measurementWindow: config.measurementWindow,
        startDate: action.executedAt,
        endDate: new Date(
          action.executedAt.getTime() + config.measurementWindow * 24 * 60 * 60 * 1000
        ),
        baselineValue: baseline.value,
        baselinePeriodStart: baseline.start,
        baselinePeriodEnd: baseline.end,
        measuredValue: 0,
        absoluteImpact: 0,
        percentImpact: 0,
        estimatedImpact: action.estimatedImpact || 0,
        predictionError: 0,
        predictionAccuracy: 0,
        attributionConfidence: 0.8,
        status: 'pending'
      }
    });
  }

  // Process measurements that are ready
  async processPendingMeasurements(): Promise<void> {
    const ready = await prisma.impactMeasurement.findMany({
      where: {
        status: 'pending',
        endDate: { lte: new Date() }
      },
      include: { action: true }
    });

    for (const measurement of ready) {
      await this.completeMeasurement(measurement);
    }
  }

  // Complete a single measurement
  private async completeMeasurement(measurement: ImpactMeasurement): Promise<void> {
    const action = measurement.action;

    // Fetch actual metrics for measurement period
    const actualMetrics = await this.fetchActualMetrics(
      action,
      measurement.startDate,
      measurement.endDate
    );

    // Calculate impact
    const impact = this.calculateImpact(
      Number(measurement.baselineValue),
      actualMetrics.value
    );

    // Calculate prediction accuracy
    const estimated = Number(measurement.estimatedImpact);
    const actual = impact.revenueImpact;
    const error = estimated !== 0
      ? ((actual - estimated) / estimated) * 100
      : 0;
    const accuracy = Math.max(0, 1 - Math.abs(error) / 100);

    // Update measurement
    await prisma.impactMeasurement.update({
      where: { id: measurement.id },
      data: {
        measuredValue: actualMetrics.value,
        absoluteImpact: impact.absolute,
        percentImpact: impact.percent,
        revenueImpact: impact.revenueImpact,
        predictionError: error,
        predictionAccuracy: accuracy,
        attributionConfidence: actualMetrics.confidence,
        status: 'complete',
        completedAt: new Date()
      }
    });

    // Update action with verified impact
    await prisma.monetizationAction.update({
      where: { id: action.id },
      data: {
        verifiedImpact: impact.revenueImpact,
        verifiedAt: new Date()
      }
    });

    // Feed into learning system
    await this.recordLearning(action, measurement, accuracy);
  }

  private async calculateBaseline(
    action: MonetizationAction,
    config: MeasurementConfig
  ): Promise<{ value: number; start: Date; end: Date }> {
    // Get metrics for 30 days before action
    const end = action.executedAt!;
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const metrics = await prisma.monetizationMetric.findMany({
      where: {
        pageId: (action.actionData as any)?.modId,
        date: { gte: start, lt: end }
      }
    });

    // Calculate average daily value
    const total = metrics.reduce((sum, m) => sum + Number(m.revenue || 0), 0);
    const avg = metrics.length > 0 ? total / metrics.length : 0;

    return { value: avg, start, end };
  }

  private async fetchActualMetrics(
    action: MonetizationAction,
    start: Date,
    end: Date
  ): Promise<{ value: number; confidence: number }> {
    const metrics = await prisma.monetizationMetric.findMany({
      where: {
        pageId: (action.actionData as any)?.modId,
        date: { gte: start, lte: end }
      }
    });

    const total = metrics.reduce((sum, m) => sum + Number(m.revenue || 0), 0);
    const avg = metrics.length > 0 ? total / metrics.length : 0;

    // Confidence based on data quality
    const confidence = metrics.length >= 14 ? 0.9 :
                      metrics.length >= 7 ? 0.7 :
                      0.5;

    return { value: avg, confidence };
  }

  private calculateImpact(baseline: number, measured: number) {
    const absolute = measured - baseline;
    const percent = baseline !== 0 ? (absolute / baseline) * 100 : 0;
    const revenueImpact = absolute * 30; // Monthly impact

    return { absolute, percent, revenueImpact };
  }

  private async recordLearning(
    action: MonetizationAction,
    measurement: ImpactMeasurement,
    accuracy: number
  ): Promise<void> {
    // Record to learning metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.agentLearningMetric.upsert({
      where: {
        metricType_actionType_opportunityType_periodStart_periodType: {
          metricType: 'prediction_accuracy',
          actionType: action.type,
          opportunityType: null,
          periodStart: today,
          periodType: 'daily'
        }
      },
      update: {
        sampleSize: { increment: 1 },
        meanValue: accuracy // Would need proper aggregation
      },
      create: {
        metricType: 'prediction_accuracy',
        actionType: action.type,
        opportunityType: null,
        periodStart: today,
        periodEnd: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        periodType: 'daily',
        sampleSize: 1,
        meanValue: accuracy
      }
    });
  }
}
```

### 2. Learning Service

Create `lib/services/agentLearning.ts`:

```typescript
interface LearningInsight {
  actionType: string;
  averageAccuracy: number;
  sampleSize: number;
  trend: 'improving' | 'stable' | 'declining';
  recommendedAdjustment: number; // Multiplier for estimates
}

class AgentLearning {
  // Get current accuracy for an action type
  async getAccuracyForType(actionType: string): Promise<number> {
    const recent = await prisma.impactMeasurement.findMany({
      where: {
        action: { type: actionType },
        status: 'complete',
        completedAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      }
    });

    if (recent.length === 0) return 0.7; // Default accuracy

    const total = recent.reduce((sum, m) => sum + Number(m.predictionAccuracy), 0);
    return total / recent.length;
  }

  // Get adjustment factor for estimates
  async getEstimateAdjustment(actionType: string): Promise<number> {
    const measurements = await prisma.impactMeasurement.findMany({
      where: {
        action: { type: actionType },
        status: 'complete'
      },
      orderBy: { completedAt: 'desc' },
      take: 50
    });

    if (measurements.length < 5) return 1.0; // Not enough data

    // Calculate average over/under estimation
    const ratios = measurements.map(m => {
      const estimated = Number(m.estimatedImpact);
      const actual = Number(m.revenueImpact);
      return estimated !== 0 ? actual / estimated : 1;
    });

    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

    // Cap adjustment to reasonable range
    return Math.max(0.5, Math.min(2.0, avgRatio));
  }

  // Generate insights for admin dashboard
  async generateInsights(): Promise<LearningInsight[]> {
    const actionTypes = [
      'ADD_AFFILIATE_LINK',
      'UPDATE_META_DESCRIPTION',
      'ADD_TO_COLLECTION',
      'EXPAND_CONTENT'
    ];

    const insights: LearningInsight[] = [];

    for (const actionType of actionTypes) {
      const accuracy = await this.getAccuracyForType(actionType);
      const adjustment = await this.getEstimateAdjustment(actionType);
      const trend = await this.calculateTrend(actionType);

      insights.push({
        actionType,
        averageAccuracy: accuracy,
        sampleSize: await this.getSampleSize(actionType),
        trend,
        recommendedAdjustment: adjustment
      });
    }

    return insights;
  }

  // Calculate if accuracy is improving, stable, or declining
  private async calculateTrend(
    actionType: string
  ): Promise<'improving' | 'stable' | 'declining'> {
    const recent = await prisma.impactMeasurement.findMany({
      where: {
        action: { type: actionType },
        status: 'complete'
      },
      orderBy: { completedAt: 'desc' },
      take: 20
    });

    if (recent.length < 10) return 'stable';

    // Compare first half to second half
    const firstHalf = recent.slice(0, 10);
    const secondHalf = recent.slice(10);

    const firstAvg = firstHalf.reduce((s, m) =>
      s + Number(m.predictionAccuracy), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, m) =>
      s + Number(m.predictionAccuracy), 0) / secondHalf.length;

    const diff = firstAvg - secondAvg;

    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }

  private async getSampleSize(actionType: string): Promise<number> {
    return prisma.impactMeasurement.count({
      where: {
        action: { type: actionType },
        status: 'complete'
      }
    });
  }

  // Apply learning to improve future estimates
  async adjustEstimate(
    actionType: string,
    baseEstimate: number
  ): Promise<{ adjusted: number; confidence: number }> {
    const adjustment = await this.getEstimateAdjustment(actionType);
    const accuracy = await this.getAccuracyForType(actionType);
    const sampleSize = await this.getSampleSize(actionType);

    // Confidence increases with more data
    const dataConfidence = Math.min(1, sampleSize / 50);

    // Blend base estimate with adjusted estimate based on confidence
    const adjusted = baseEstimate * (1 - dataConfidence) +
                    (baseEstimate * adjustment) * dataConfidence;

    return {
      adjusted,
      confidence: accuracy * dataConfidence
    };
  }
}
```

### 3. Integration with Opportunity Detection

Update affiliate detector, RPM analyzer, etc.:

```typescript
class AffiliateDetector {
  private learning = new AgentLearning();

  async detectOpportunities(): Promise<MonetizationOpportunity[]> {
    const rawOpportunities = await this.findAffiliateOpportunities();

    // Adjust estimates based on learning
    const adjusted = await Promise.all(
      rawOpportunities.map(async (opp) => {
        const { adjusted, confidence } = await this.learning.adjustEstimate(
          'ADD_AFFILIATE_LINK',
          opp.estimatedRevenueImpact
        );

        return {
          ...opp,
          estimatedRevenueImpact: adjusted,
          confidence: Math.min(opp.confidence, confidence),
          estimateAdjusted: true,
          originalEstimate: opp.estimatedRevenueImpact
        };
      })
    );

    return adjusted;
  }
}
```

---

## API Endpoints

### GET /api/monetization/learning/insights

Get learning insights for admin dashboard:

```typescript
// Response
{
  insights: [
    {
      actionType: "ADD_AFFILIATE_LINK",
      averageAccuracy: 0.78,
      sampleSize: 45,
      trend: "improving",
      recommendedAdjustment: 1.12
    },
    // ...
  ],
  overallAccuracy: 0.72,
  totalMeasurements: 156,
  recentImprovements: [
    "Affiliate link predictions improved 15% this month",
    "Meta description changes showing strong correlation with CTR"
  ]
}
```

### GET /api/monetization/learning/measurements

Get impact measurements:

```typescript
// Query params
{
  actionId?: string;
  actionType?: string;
  status?: 'pending' | 'measuring' | 'complete';
  limit?: number;
  offset?: number;
}

// Response
{
  measurements: ImpactMeasurement[];
  total: number;
  byStatus: { pending: number; measuring: number; complete: number };
}
```

### GET /api/monetization/actions/:id/impact

Get impact data for a specific action:

```typescript
// Response
{
  action: MonetizationAction;
  measurement: ImpactMeasurement | null;
  comparison: {
    estimated: number;
    actual: number;
    accuracy: number;
    error: string; // "Over-estimated by 12%"
  };
  attribution: {
    confidence: number;
    factors: string[]; // ["Seasonality adjusted", "Normalized against site trend"]
  };
}
```

---

## Admin UI

### Learning Dashboard Page

Create `/admin/monetization/learning/page.tsx`:

```tsx
export default function LearningPage() {
  return (
    <div className="space-y-6">
      <h1>Agent Learning & Impact</h1>

      {/* Overall Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Overall Accuracy"
          value="72%"
          trend="+5% vs last month"
        />
        <StatCard
          title="Actions Measured"
          value="156"
          subtitle="45 pending"
        />
        <StatCard
          title="Verified Revenue Impact"
          value="+$847/mo"
          trend="From 89 actions"
        />
        <StatCard
          title="Prediction Error"
          value="±18%"
          trend="Improving"
        />
      </div>

      {/* Accuracy by Action Type */}
      <Card>
        <CardHeader>
          <CardTitle>Accuracy by Action Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action Type</TableHead>
                <TableHead>Sample Size</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Adjustment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insights.map(insight => (
                <TableRow key={insight.actionType}>
                  <TableCell>{insight.actionType}</TableCell>
                  <TableCell>{insight.sampleSize}</TableCell>
                  <TableCell>
                    <Badge variant={insight.averageAccuracy > 0.7 ? 'success' : 'warning'}>
                      {(insight.averageAccuracy * 100).toFixed(0)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TrendIndicator trend={insight.trend} />
                  </TableCell>
                  <TableCell>{insight.recommendedAdjustment.toFixed(2)}x</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Measurements */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Impact Measurements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Estimated</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurements.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.action.type}</TableCell>
                  <TableCell>${Number(m.estimatedImpact).toFixed(2)}/mo</TableCell>
                  <TableCell>${Number(m.revenueImpact || 0).toFixed(2)}/mo</TableCell>
                  <TableCell>
                    <ErrorBadge error={m.predictionError} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Chart: Accuracy Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Prediction Accuracy Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={accuracyTrend} />
        </CardContent>
      </Card>

      {/* Scatter: Estimated vs Actual */}
      <Card>
        <CardHeader>
          <CardTitle>Estimated vs Actual Impact</CardTitle>
          <CardDescription>
            Points on the diagonal = perfect predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScatterPlot
            data={measurements}
            x="estimatedImpact"
            y="revenueImpact"
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Scheduled Jobs

Add to orchestrator:

```typescript
// Run daily to start tracking for newly executed actions
schedule('0 1 * * *', async () => {
  const tracker = new ImpactTracker();

  // Find executed actions without tracking
  const untracked = await prisma.monetizationAction.findMany({
    where: {
      status: 'EXECUTED',
      executedAt: { not: null },
      impactMeasurements: { none: {} }
    }
  });

  for (const action of untracked) {
    await tracker.startTracking(action.id);
  }
});

// Run daily to complete measurements that are ready
schedule('0 2 * * *', async () => {
  const tracker = new ImpactTracker();
  await tracker.processPendingMeasurements();
});

// Run weekly to aggregate learning metrics
schedule('0 3 * * 0', async () => {
  const learning = new AgentLearning();
  await learning.aggregateWeeklyMetrics();
});
```

---

## Acceptance Criteria

1. [ ] Database schema updated with ImpactMeasurement and AgentLearningMetric models
2. [ ] ImpactTracker service created
   - [ ] startTracking() creates measurement record
   - [ ] processPendingMeasurements() completes ready measurements
   - [ ] Baseline calculation works correctly
3. [ ] AgentLearning service created
   - [ ] getAccuracyForType() returns historical accuracy
   - [ ] getEstimateAdjustment() calculates correction factor
   - [ ] generateInsights() provides dashboard data
   - [ ] adjustEstimate() modifies predictions based on learning
4. [ ] Integration with opportunity detectors (estimates adjusted)
5. [ ] Learning dashboard page created
   - [ ] Accuracy stats cards
   - [ ] Accuracy by action type table
   - [ ] Recent measurements list
   - [ ] Accuracy trend chart
   - [ ] Estimated vs actual scatter plot
6. [ ] API endpoints implemented
7. [ ] Scheduled jobs for tracking and measurement
8. [ ] npm run type-check passes

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Prediction accuracy | >75% | Average (1 - \|error\|) |
| Measurements completed | >90% | Complete / Started |
| Accuracy improvement | +10%/quarter | Trend of average accuracy |
| Time to measurement | <35 days | Avg measurement window |
| Data utilization | >80% | Actions with verified impact |

---

## Future Enhancements

- **A/B Testing**: Run controlled experiments with action groups
- **ML Model**: Train regression model on historical data
- **Anomaly Detection**: Flag measurements that seem wrong
- **Causal Inference**: More sophisticated attribution modeling
- **Real-time Learning**: Update estimates as measurements complete
- **Confidence Intervals**: Show ranges instead of point estimates
