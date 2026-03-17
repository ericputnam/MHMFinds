# Performance Optimization Guide for Mod Finder

## 🎯 Goal: Scale to 10,000+ Concurrent Users on Vercel

This document outlines the performance optimizations needed to scale the mod finder to handle tens of thousands of concurrent users on Vercel's serverless infrastructure.

---

## 📊 Current Architecture Analysis

### ✅ What's Already Good
1. **Redis Caching (Upstash)** - 5-minute TTL on mod lists
2. **24 Database Indexes** - Proper composite indexes for common queries
3. **Prisma Singleton** - Connection pooling for serverless
4. **10-second Function Timeout** - Configured in vercel.json

### 🚨 Critical Issues Identified

| Issue | Impact | Priority |
|-------|--------|----------|
| Facets fetch ALL mods | Timeout risk | **CRITICAL** |
| Tag counting in JS | O(n) complexity | **HIGH** |
| Non-deterministic cache keys | Low cache hits | **MEDIUM** |
| Missing edge caching | Higher latency | **MEDIUM** |
| No connection pooling config | Connection exhaustion | **MEDIUM** |

---

## 🔧 Optimization Strategies

### 1. Separate Facets from Main Query (CRITICAL)

**Problem**: The current `/api/mods` endpoint calculates facets by fetching ALL mods that match the search criteria, then processing them in JavaScript.

**Solution**: 
- Cache facets separately with longer TTL (10 minutes)
- Use database aggregations instead of JavaScript processing
- Lazy-load facets after initial render

```typescript
// Instead of fetching all mods for facets:
const allMods = await prisma.mod.findMany({ where: facetWhere, ... });

// Use database groupBy and cache separately:
const facets = await CacheService.getFacets(); // Check cache first
if (!facets) {
  const categoryGroups = await prisma.mod.groupBy({ by: ['category'], _count: true });
  // Cache for 10 minutes
}
```

### 2. Pre-aggregate Tag Counts (HIGH)

**Problem**: Tag counting uses `O(n)` JavaScript iteration on every request.

**Solutions**:
- Option A: Create a `tag_counts` materialized view (requires raw SQL)
- Option B: Cache tag counts separately with 15-minute TTL
- Option C: Use PostgreSQL's `unnest()` with `GROUP BY` for server-side aggregation

### 3. Deterministic Cache Keys (MEDIUM)

**Problem**: `JSON.stringify()` may produce different output for same objects.

**Solution**:
```typescript
// lib/cache.ts - Updated cache key generation
static generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedKeys = Object.keys(params).filter(k => params[k] != null).sort();
  const normalized = sortedKeys.map(k => `${k}=${String(params[k])}`).join('&');
  return `${prefix}:${normalized}`;
}
```

### 4. Edge Caching Headers (MEDIUM)

Add proper cache headers for CDN/Edge caching:

```typescript
// In API routes
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  }
});
```

### 5. Connection Pool Configuration (MEDIUM)

Update `DATABASE_URL` to include pool limits:
```
DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=30"
```

This prevents connection exhaustion in serverless environments where many instances spin up concurrently.

### 6. Limit Facet Data Transfer (LOW)

Reduce JSON payload size by:
- Limiting category tree depth to 2 levels
- Returning top 10 tags instead of top 20
- Omitting zero-count facets

---

## 📈 Implementation Priority

### Phase 1: Quick Wins (Deploy immediately)
- [ ] Add deterministic cache key generation
- [ ] Add edge caching headers
- [ ] Configure connection pooling
- [ ] Reduce debug logging in production

### Phase 2: Architecture Changes (1-2 days)
- [ ] Separate facets into dedicated endpoint `/api/facets`
- [ ] Cache facets with 10-minute TTL
- [ ] Lazy-load facets on client after initial render
- [ ] Add database-side tag aggregation

### Phase 3: Advanced Optimizations (Future)
- [ ] Static page generation for popular filters
- [ ] Implement stale-while-revalidate pattern
- [ ] Add query debouncing on frontend
- [ ] Consider read replicas for high traffic

---

## 🧪 Load Testing Recommendations

Before going live with high traffic:

1. **Use k6 or Artillery** to simulate concurrent users
2. **Test cache cold-start** scenarios (Redis empty)
3. **Monitor Prisma query timing** with events
4. **Check Vercel function invocations** in dashboard

### Sample k6 Test Script:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp to 100 users
    { duration: '1m', target: 1000 },   // Ramp to 1000 users
    { duration: '30s', target: 0 },     // Ramp down
  ],
};

export default function () {
  let res = http.get('https://your-domain.vercel.app/api/mods?gameVersion=Sims%204');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

---

## 📊 Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Cache Hit Rate | ~40% | ~80%+ | 2x |
| API Response (cached) | ~100ms | ~50ms | 2x |
| API Response (uncached) | ~1-3s | ~200-500ms | 5x |
| Max Concurrent Users | ~500 | ~10,000+ | 20x |

---

## 🔍 Monitoring Checklist

- [ ] Vercel Analytics enabled
- [ ] Redis cache hit/miss rates tracked
- [ ] Database query timing logged (slow queries > 100ms)
- [ ] Error rate monitoring (e.g., Sentry)
- [ ] Function timeout alerts configured

---

**Last Updated**: 2025-12-16
