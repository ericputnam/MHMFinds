# Scraper-Monitor Agent - Implementation Plan

**Status:** Ready
**Created:** 2026-01-24

---

## Purpose

The Scraper-Monitor agent executes and monitors content aggregation jobs. It runs scraper scripts, tracks progress, handles errors gracefully, and provides statistics on scraping operations across all content sources.

## Scope

### In Scope
- Running content aggregation scripts (standard and privacy modes)
- Monitoring ScrapingJob status in database
- Tracking new mods discovered per source
- Handling rate limiting and retry logic
- Generating scraping statistics reports
- Managing ContentSource configurations

### Out of Scope
- Writing new scrapers (that's development work)
- Modifying scraper logic
- Direct production scraping (privacy concerns)
- Real-time scraping dashboards (use Prisma Studio)

---

## Content Sources

From the database schema and services:

| Source | Service | Script | Rate Limit |
|--------|---------|--------|------------|
| CurseForge | contentAggregator.ts | content:aggregate | 100/hour |
| Patreon | privacyAggregator.ts | content:privacy | 50/hour |
| Tumblr | privacyAggregator.ts | content:stealth | 30/hour |
| MustHaveMods | mhmScraper.ts | scrape-musthavemods | 60/hour |
| WM | weWantModsScraper.ts | run-wewantmods-scraper | 40/hour |

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                   Scraper-Monitor Agent Flow                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Receive task   │
                    │ (run/monitor/   │
                    │  report)        │
                    └────────┬────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   Run Scraper         Monitor Jobs          Generate Report
        │                     │                     │
        ▼                     ▼                     ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ Check     │        │ Query     │        │ Query     │
  │ source    │        │ running   │        │ all jobs  │
  │ status    │        │ jobs      │        │ & stats   │
  └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
        │                    │                    │
        ▼                    ▼                    ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ Create    │        │ Check     │        │ Aggregate │
  │ job record│        │ progress  │        │ metrics   │
  └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
        │                    │                    │
        ▼                    ▼                    ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ Execute   │        │ Handle    │        │ Format    │
  │ script    │        │ errors    │        │ report    │
  └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
        │                    │                    │
        ▼                    ▼                    ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ Update    │        │ Retry or  │        │ Output    │
  │ job status│        │ mark fail │        │ report    │
  └───────────┘        └───────────┘        └───────────┘
```

---

## Scraping Modes

### Standard Mode (`content:aggregate`)
- Default rate limiting
- Basic user agent rotation
- Good for well-behaved APIs (CurseForge)

### Privacy Mode (`content:privacy`)
- 3-8 second delays between requests
- User agent rotation
- Session management
- For sensitive sources

### Stealth Mode (`content:stealth`)
- 5-15 second delays
- Proxy rotation (if configured)
- Geographic IP rotation
- For sources with aggressive bot detection

### Conservative Mode (`content:conservative`)
- 10-30 second delays
- Maximum stealth settings
- Very slow but safest

---

## ScrapingJob Status Flow

```
pending → running → completed
              ↓
           failed
```

### Status Meanings
- **pending**: Job created, not yet started
- **running**: Currently executing
- **completed**: Finished successfully
- **failed**: Encountered error, may retry

---

## Job Management

### Create Job
```typescript
await prisma.scrapingJob.create({
  data: {
    sourceId: source.id,
    status: 'pending',
  },
});
```

### Start Job
```typescript
await prisma.scrapingJob.update({
  where: { id: job.id },
  data: {
    status: 'running',
    startedAt: new Date(),
  },
});
```

### Complete Job
```typescript
await prisma.scrapingJob.update({
  where: { id: job.id },
  data: {
    status: 'completed',
    completedAt: new Date(),
    itemsFound: totalFound,
    itemsProcessed: totalProcessed,
  },
});
```

### Fail Job
```typescript
await prisma.scrapingJob.update({
  where: { id: job.id },
  data: {
    status: 'failed',
    completedAt: new Date(),
    error: errorMessage,
  },
});
```

---

## Error Handling

### Rate Limit Errors
```typescript
if (error.message.includes('429') || error.message.includes('rate limit')) {
  // Wait and retry with exponential backoff
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  await sleep(delay);
  return retry();
}
```

### Connection Errors
```typescript
if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
  // Log and continue with next item
  console.error(`Connection error for ${url}, skipping...`);
  continue;
}
```

### Parse Errors
```typescript
if (error.message.includes('parse') || error.message.includes('selector')) {
  // Source page structure may have changed
  await notifyStructureChange(source);
  job.status = 'failed';
  job.error = 'Page structure changed - needs scraper update';
}
```

---

## Statistics Report

### Daily Report Format
```markdown
# Scraping Statistics Report
Generated: 2026-01-24T23:59:00Z

## Summary (Last 24 Hours)
- Total jobs: 12
- Successful: 10
- Failed: 2
- New mods: 147
- Updated mods: 523

## By Source
| Source | Jobs | Success | New Mods | Errors |
|--------|------|---------|----------|--------|
| CurseForge | 4 | 4 | 89 | 0 |
| Patreon | 3 | 2 | 34 | 1 |
| MustHaveMods | 3 | 3 | 24 | 0 |
| WM | 2 | 1 | 0 | 1 |

## Error Details
1. Patreon job #xyz (10:30 AM)
   - Error: Rate limited after 45 requests
   - Items processed: 45/100

2. WM job #abc (3:15 PM)
   - Error: Connection timeout
   - Items processed: 0/50

## Recommendations
- Patreon: Reduce batch size or increase delays
- WM: Check if site is accessible
```

### Weekly Trends
```markdown
## Weekly Trends (Last 7 Days)
| Day | Jobs | New Mods | Success Rate |
|-----|------|----------|--------------|
| Mon | 15 | 234 | 93% |
| Tue | 12 | 189 | 100% |
| Wed | 14 | 201 | 86% |
| Thu | 11 | 156 | 91% |
| Fri | 13 | 178 | 100% |
| Sat | 8 | 95 | 100% |
| Sun | 6 | 67 | 83% |

Total: 79 jobs, 1,120 new mods, 93% success rate
```

---

## Tools Required

| Tool | Purpose |
|------|---------|
| Read | Read scraper configs and source data |
| Bash | Execute npm scripts, monitor processes |
| Grep | Search logs for errors |
| Write | Create statistics reports |

---

## Invocation

### Run Scraper
```bash
claude
> Run the CurseForge scraper
```

### Run with Mode
```bash
claude
> Run Patreon scraper in stealth mode
```

### Monitor Running Jobs
```bash
claude
> Monitor current scraping jobs
```

### Generate Report
```bash
claude
> Generate scraping statistics for the last 7 days
```

### Check Source Status
```bash
claude
> Check if all content sources are healthy
```

---

## Success Criteria

1. Scraper starts without errors
2. ScrapingJob record created and updated
3. New mods saved to database
4. Errors logged with context
5. Statistics accurate and up-to-date

---

## Limitations

1. **No parallel scraping**: One source at a time to avoid overload
2. **Local only**: Does not run production scrapers
3. **No proxy management**: Proxy config is manual
4. **No real-time monitoring**: Polling-based status checks
5. **Timeout**: Long-running jobs may timeout (10 min limit)

---

## Safety Measures

### Before Running
1. Check last scrape time (avoid too-frequent runs)
2. Verify database connection
3. Check ContentSource.isActive flag

### During Execution
1. Log progress every 10 items
2. Respect rate limits
3. Handle errors gracefully (don't crash)

### After Completion
1. Update ScrapingJob record
2. Update ContentSource.lastScraped
3. Generate summary stats

---

## Example Session

```
Scraper-Monitor Agent Starting
==============================
Task: Run CurseForge scraper

Checking source status...
- Source: CurseForge
- Last scraped: 2026-01-24T06:00:00Z (4 hours ago)
- Rate limit: 100 requests/hour
- Status: Active

Creating scraping job...
- Job ID: clx123abc

Starting scraper...
$ npm run content:aggregate

[CurseForge] Starting aggregation...
[CurseForge] Fetching page 1...
[CurseForge] Found 25 mods
[CurseForge] Processing mod: Modern Kitchen Set
[CurseForge] Processing mod: Goth Hair Collection
...
[CurseForge] Fetching page 2...
[CurseForge] Found 25 mods
...
[CurseForge] Aggregation complete

Updating job status...
- Status: completed
- Items found: 89
- Items processed: 89
- New mods: 23
- Updated mods: 66
- Duration: 4m 32s

Source updated:
- lastScraped: 2026-01-24T10:04:32Z

Scraping job complete!

Summary:
- New mods added: 23
- Existing mods updated: 66
- Errors: 0

Next scheduled run: 2026-01-24T14:00:00Z (in 4 hours)
```
