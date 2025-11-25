# Performance Optimization & Scalability Guide for MHMFinds

> **Goal:** Support 100K+ concurrent users with <100ms API response times
> **Last Updated:** November 2025

---

## Table of Contents

1. [Current Performance Baseline](#current-performance-baseline)
2. [Database Optimization](#database-optimization)
3. [Caching Strategy](#caching-strategy)
4. [API Performance](#api-performance)
5. [Frontend Optimization](#frontend-optimization)
6. [CDN & Static Assets](#cdn--static-assets)
7. [Background Jobs & Async Processing](#background-jobs--async-processing)
8. [Horizontal Scaling](#horizontal-scaling)
9. [Monitoring & Performance Tracking](#monitoring--performance-tracking)
10. [Load Testing](#load-testing)

---

## Current Performance Baseline

### Identified Bottlenecks

1. **🔴 N+1 Query Problem** - Multiple database queries in loops
2. **🔴 No Caching Layer** - Every request hits the database
3. **🔴 Synchronous Content Aggregation** - Blocking operations
4. **🔴 On-Demand AI Embeddings** - Expensive OpenAI API calls on every search
5. **🟡 No Database Read Replicas** - All reads/writes hit primary database
6. **🟡 No CDN for Images** - Images served directly from database URLs
7. **🟡 Inefficient Search** - Full table scans on large datasets

### Performance Goals

| Metric | Current | Target | Timeframe |
|--------|---------|--------|-----------|
| API Response Time (P95) | ~500ms | <100ms | 1 month |
| Homepage Load Time | ~2s | <1s | 2 weeks |
| Search Response | ~800ms | <200ms | 1 month |
| Concurrent Users | ~100 | 100,000+ | 3 months |
| Database Query Time (P95) | ~200ms | <50ms | 2 weeks |
| Cache Hit Rate | 0% | >80% | 1 month |

---

## Database Optimization

### 1. Add Strategic Indexes

Update `prisma/schema.prisma`:

```prisma
model Mod {
  // ... existing fields ...

  @@index([categoryId, isFree, createdAt], name: "category_free_created")
  @@index([isFeatured, publishedAt], name: "featured_published")
  @@index([downloadCount(sort: Desc)], name: "downloads_desc")
  @@index([rating(sort: Desc), ratingCount], name: "rating_desc")
  @@index([source, sourceId], name: "source_lookup")
  @@index([creatorId, publishedAt], name: "creator_mods")
  @@index([gameVersion, category], name: "game_version_category")
  @@index([isFree, price], name: "pricing_filter")
  @@index([createdAt(sort: Desc)], name: "newest_first")
}

model SearchIndex {
  // ... existing fields ...

  @@index([lastIndexed], name: "reindex_tracking")
}

model User {
  @@index([email], name: "email_lookup")
  @@index([isCreator, isPremium], name: "user_tiers")
}

model Favorite {
  @@index([userId, createdAt(sort: Desc)], name: "user_favorites")
  @@index([modId, createdAt], name: "mod_favorites")
}

model Download {
  @@index([userId, createdAt(sort: Desc)], name: "user_downloads")
  @@index([modId, createdAt(sort: Desc)], name: "mod_downloads")
  @@index([createdAt], name: "download_timeline")
}

model Review {
  @@index([modId, createdAt(sort: Desc)], name: "mod_reviews")
  @@index([userId], name: "user_reviews")
  @@index([rating, createdAt], name: "rating_reviews")
}

model Collection {
  @@index([userId, isPublic], name: "user_collections")
  @@index([isFeatured, updatedAt], name: "featured_collections")
}

model ModSubmission {
  @@index([status, createdAt(sort: Desc)], name: "pending_submissions")
  @@index([submitterEmail], name: "submission_tracking")
}

// Subscription models (for monetization)
model Subscription {
  @@index([userId], name: "user_subscription")
  @@index([stripeCustomerId], name: "stripe_customer")
  @@index([status, tier], name: "active_subscriptions")
  @@index([stripeCurrentPeriodEnd], name: "renewal_tracking")
}

model DownloadClick {
  @@index([userId, clickedAt(sort: Desc)], name: "user_click_history")
  @@index([modId, clickedAt], name: "mod_click_tracking")
  @@index([subscriptionId], name: "subscription_usage")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_performance_indexes
npx prisma db push
```

### 2. Fix N+1 Queries

**Before (Inefficient):**
```typescript
// app/api/mods/route.ts
const mods = await prisma.mod.findMany({
  take: 20,
});

// N+1 problem: Fetches creator for each mod
for (const mod of mods) {
  const creator = await prisma.creatorProfile.findUnique({
    where: { id: mod.creatorId },
  });
  mod.creator = creator;
}
```

**After (Optimized):**
```typescript
const mods = await prisma.mod.findMany({
  take: 20,
  include: {
    creator: {
      select: {
        id: true,
        handle: true,
        isVerified: true,
        user: {
          select: {
            displayName: true,
            avatar: true,
          },
        },
      },
    },
    categoryRel: {
      select: {
        name: true,
        slug: true,
        path: true,
      },
    },
  },
});
```

### 3. Implement Database Connection Pooling

For Prisma with serverless (Vercel), use connection pooling via Neon or PgBouncer:

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL") // For migrations
  relationMode = "prisma"
}
```

Add to `.env`:
```env
# Pooled connection (for queries)
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=10"

# Direct connection (for migrations)
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 4. Optimize Queries with Select

```typescript
// Only select needed fields
const mods = await prisma.mod.findMany({
  select: {
    id: true,
    title: true,
    thumbnail: true,
    price: true,
    rating: true,
    downloadCount: true,
    // Don't fetch large description field for list view
  },
  take: 20,
  orderBy: { createdAt: 'desc' },
});
```

### 5. Implement Cursor-Based Pagination

Create `/lib/pagination.ts`:

```typescript
import { Prisma } from '@prisma/client';

export interface CursorPaginationParams {
  cursor?: string;
  take?: number;
}

export async function cursorPaginate<T>(
  model: any,
  params: {
    cursor?: string;
    take: number;
    where?: any;
    orderBy?: any;
    select?: any;
    include?: any;
  }
) {
  const { cursor, take, where, orderBy, select, include } = params;

  const items = await model.findMany({
    take: take + 1, // Fetch one extra to check if there's a next page
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
    where,
    orderBy,
    select,
    include,
  });

  const hasNextPage = items.length > take;
  const resultItems = hasNextPage ? items.slice(0, -1) : items;

  return {
    items: resultItems,
    nextCursor: hasNextPage ? resultItems[resultItems.length - 1].id : null,
    hasNextPage,
  };
}
```

Usage:
```typescript
const result = await cursorPaginate(prisma.mod, {
  cursor: request.query.cursor,
  take: 20,
  where: { isFree: true },
  orderBy: { createdAt: 'desc' },
});
```

---

## Caching Strategy

### 1. Set Up Upstash Redis

```bash
npm install @upstash/redis ioredis
```

Create `/lib/cache.ts`:

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL || '',
  token: process.env.REDIS_TOKEN || '',
});

export class CacheService {
  private static TTL = {
    MODS_LIST: 300, // 5 minutes
    MOD_DETAIL: 600, // 10 minutes
    CREATOR_PROFILE: 1800, // 30 minutes
    TRENDING: 180, // 3 minutes
    USER_SESSION: 3600, // 1 hour
    SEARCH_RESULTS: 300, // 5 minutes
  };

  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data as T;
    } catch (error) {
      console.error('Cache GET error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await redis.setex(key, ttl, JSON.stringify(value));
      } else {
        await redis.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Cache SET error:', error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache DEL error:', error);
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Cached queries
  static async getModsList(params: any) {
    const cacheKey = `mods:list:${JSON.stringify(params)}`;
    const cached = await this.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from database
    const data = await fetchModsFromDB(params);

    // Cache for 5 minutes
    await this.set(cacheKey, data, this.TTL.MODS_LIST);

    return data;
  }

  static async getModDetail(modId: string) {
    const cacheKey = `mod:${modId}`;
    const cached = await this.get(cacheKey);

    if (cached) {
      return cached;
    }

    const data = await fetchModFromDB(modId);
    await this.set(cacheKey, data, this.TTL.MOD_DETAIL);

    return data;
  }

  static async invalidateMod(modId: string) {
    await this.del(`mod:${modId}`);
    await this.invalidatePattern('mods:list:*');
  }
}
```

### 2. Implement Cache-Aside Pattern

Update `/app/api/mods/route.ts`:

```typescript
import { CacheService } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get('page') || '1',
      category: searchParams.get('category'),
      sort: searchParams.get('sort') || 'newest',
    };

    // Try cache first
    const cacheKey = `mods:${JSON.stringify(params)}`;
    const cached = await CacheService.get(cacheKey);

    if (cached) {
      return NextResponse.json({
        ...cached,
        fromCache: true,
      });
    }

    // Fetch from database
    const mods = await prisma.mod.findMany({
      // ... query logic
    });

    const response = {
      mods,
      total: await prisma.mod.count(),
      page: parseInt(params.page),
    };

    // Cache for 5 minutes
    await CacheService.set(cacheKey, response, 300);

    return NextResponse.json({
      ...response,
      fromCache: false,
    });
  } catch (error) {
    // ...
  }
}
```

### 3. Cache Invalidation Strategy

```typescript
// When mod is updated
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const modId = params.id;

  // Update mod in database
  const updatedMod = await prisma.mod.update({
    where: { id: modId },
    data: updateData,
  });

  // Invalidate caches
  await CacheService.invalidateMod(modId);

  return NextResponse.json(updatedMod);
}
```

---

## API Performance

### 1. Implement Response Compression

Vercel automatically compresses responses, but you can optimize further:

Update `next.config.js`:
```javascript
module.exports = {
  compress: true, // Enable gzip compression
  // ...
};
```

### 2. Add Response Streaming for Large Datasets

```typescript
import { ReadableStream } from 'web-streams-polyfill';

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      const mods = await prisma.mod.findMany({
        take: 1000,
      });

      // Stream data in chunks
      const chunkSize = 100;
      for (let i = 0; i < mods.length; i += chunkSize) {
        const chunk = mods.slice(i, i + chunkSize);
        controller.enqueue(JSON.stringify(chunk) + '\n');
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

### 3. Implement GraphQL for Flexible Queries (Optional)

For complex UIs, consider migrating to GraphQL to reduce over-fetching:

```bash
npm install @apollo/server graphql
```

---

## Frontend Optimization

### 1. Code Splitting & Lazy Loading

Update components with dynamic imports:

```typescript
// app/page.tsx
import dynamic from 'next/dynamic';

const ModDetailsModal = dynamic(() => import('@/components/ModDetailsModal'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});

const ModGrid = dynamic(() => import('@/components/ModGrid'));
```

### 2. Image Optimization

Update `next.config.js`:
```javascript
module.exports = {
  images: {
    domains: [/* ... */],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};
```

Use Next.js Image component:
```typescript
import Image from 'next/image';

<Image
  src={mod.thumbnail}
  alt={mod.title}
  width={300}
  height={200}
  loading="lazy"
  placeholder="blur"
  blurDataURL={mod.thumbnailBlur}
/>
```

### 3. Implement Infinite Scroll

```typescript
// components/InfiniteModGrid.tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

export function InfiniteModGrid() {
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['mods'],
    queryFn: ({ pageParam = 0 }) => fetchMods({ page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  return (
    <div>
      {data?.pages.map((page) => (
        page.items.map((mod) => <ModCard key={mod.id} mod={mod} />)
      ))}
      <div ref={ref}>{isFetchingNextPage && 'Loading...'}</div>
    </div>
  );
}
```

### 4. Prefetch Critical Data

```typescript
// app/page.tsx
export async function generateMetadata() {
  // Prefetch trending mods during SSR
  const trending = await prisma.mod.findMany({
    take: 10,
    orderBy: { downloadCount: 'desc' },
  });

  return {
    title: 'MHMFinds - Discover Sims Mods',
    description: `Browse ${trending.length} trending mods`,
  };
}
```

---

## CDN & Static Assets

### 1. Use Vercel Edge Network

Vercel automatically serves static assets via CDN. Optimize by:

- Moving images to `/public` folder when possible
- Using `/_next/static/` for JS/CSS bundles (automatic)
- Leveraging Vercel's Image Optimization

### 2. External Image CDN (Optional)

For user-uploaded images, use Cloudinary or Uploadcare:

```bash
npm install cloudinary
```

```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Optimize image URL
const optimizedUrl = cloudinary.url(imageUrl, {
  transformation: [
    { width: 500, crop: 'scale' },
    { quality: 'auto' },
    { fetch_format: 'auto' },
  ],
});
```

---

## Background Jobs & Async Processing

### 1. Move Content Aggregation to Background

**Problem:** Scraping blocks API responses

**Solution:** Use Vercel Cron + Queue

Create `/app/api/cron/scrape-content/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { contentAggregator } from '@/lib/services/contentAggregator';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run aggregation in background
  contentAggregator.runAggregation()
    .then(() => console.log('Scraping completed'))
    .catch((error) => console.error('Scraping failed:', error));

  // Return immediately
  return NextResponse.json({ message: 'Scraping started' });
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-content",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 2. Use Upstash QStash for Job Queue

```bash
npm install @upstash/qstash
```

```typescript
import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Enqueue job
await qstash.publishJSON({
  url: 'https://yourdomain.com/api/jobs/generate-embeddings',
  body: { modId: 'xyz' },
  delay: 60, // Process after 60 seconds
});
```

---

## Horizontal Scaling

### 1. Stateless API Design

✅ Already stateless (using JWT tokens, no server-side sessions)

### 2. Database Read Replicas

For read-heavy workloads, use Neon's read replicas:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Write database (primary)
export const prismaWrite = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// Read database (replica)
export const prismaRead = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_READ_URL } },
});

// Helper to route queries
export function getPrismaClient(operation: 'read' | 'write') {
  return operation === 'write' ? prismaWrite : prismaRead;
}
```

Usage:
```typescript
// Read operations (90% of traffic)
const mods = await prismaRead.mod.findMany();

// Write operations
const newMod = await prismaWrite.mod.create({ data });
```

### 3. Edge Functions for Global Performance

Move read-heavy endpoints to Edge:

Create `/app/api/mods/edge/route.ts`:
```typescript
export const runtime = 'edge';

export async function GET(request: Request) {
  // This runs on Vercel Edge network (closer to users)
  const mods = await fetch('your-database-api');
  return Response.json(mods);
}
```

---

## Monitoring & Performance Tracking

### 1. Implement Custom Metrics

Create `/lib/metrics.ts`:

```typescript
export class Metrics {
  static async trackQueryTime(queryName: string, fn: () => Promise<any>) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;

      console.log(JSON.stringify({
        metric: 'query_time',
        query: queryName,
        duration,
        timestamp: new Date().toISOString(),
      }));

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(JSON.stringify({
        metric: 'query_error',
        query: queryName,
        duration,
        error: error.message,
        timestamp: new Date().toISOString(),
      }));
      throw error;
    }
  }
}
```

Usage:
```typescript
const mods = await Metrics.trackQueryTime('fetchTrendingMods', async () => {
  return await prisma.mod.findMany({ /* ... */ });
});
```

### 2. Set Up Vercel Analytics

Enable in Vercel Dashboard → Analytics (free)

### 3. Add Performance Budgets

Create `lighthouse.config.js`:
```javascript
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'interactive': ['error', { maxNumericValue: 3500 }],
      },
    },
  },
};
```

---

## Load Testing

### 1. Set Up k6 Load Testing

Install k6: https://k6.io/docs/getting-started/installation/

Create `load-tests/mods-api.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 for 5 minutes
    { duration: '2m', target: 200 }, // Ramp up to 200
    { duration: '5m', target: 200 }, // Stay at 200
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must complete in <200ms
    http_req_failed: ['rate<0.01'],   // Error rate must be <1%
  },
};

export default function () {
  const res = http.get('https://yourdomain.com/api/mods');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

Run test:
```bash
k6 run load-tests/mods-api.js
```

### 2. Database Load Testing

```javascript
export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Test various endpoints
  http.get('https://yourdomain.com/api/mods?page=1&limit=20', params);
  http.get('https://yourdomain.com/api/mods?category=gameplay', params);
  http.get('https://yourdomain.com/api/creators/rankings', params);

  sleep(Math.random() * 5);
}
```

---

## Performance Optimization Checklist

### Database (Priority: HIGH)
- [ ] Add all recommended indexes
- [ ] Implement connection pooling
- [ ] Fix N+1 queries
- [ ] Optimize select statements
- [ ] Implement cursor pagination
- [ ] Set up read replicas

### Caching (Priority: HIGH)
- [ ] Set up Redis (Upstash)
- [ ] Implement cache service
- [ ] Cache trending mods
- [ ] Cache user sessions
- [ ] Cache search results
- [ ] Implement cache invalidation

### API (Priority: MEDIUM)
- [ ] Enable response compression
- [ ] Implement rate limiting
- [ ] Add response streaming
- [ ] Optimize serialization

### Frontend (Priority: MEDIUM)
- [ ] Implement code splitting
- [ ] Optimize images with Next/Image
- [ ] Add lazy loading
- [ ] Implement infinite scroll
- [ ] Prefetch critical data

### Background Jobs (Priority: HIGH)
- [ ] Move scraping to cron
- [ ] Implement job queue
- [ ] Async email sending
- [ ] Background embedding generation

### Monitoring (Priority: HIGH)
- [ ] Set up performance tracking
- [ ] Add custom metrics
- [ ] Configure alerts
- [ ] Run load tests
- [ ] Monitor cache hit rates

---

## Expected Performance Gains

| Optimization | Expected Improvement |
|--------------|---------------------|
| Database indexes | 50-70% faster queries |
| Redis caching | 80-90% reduction in DB load |
| Connection pooling | 30-40% faster cold starts |
| Image optimization | 50-60% smaller payloads |
| Code splitting | 40-50% faster initial load |
| Read replicas | 2-3x read throughput |

---

**Next Steps:**
1. Implement database indexes (1 day)
2. Set up Redis caching (2 days)
3. Fix N+1 queries (1 day)
4. Move scraping to background (1 day)
5. Run load tests (ongoing)

Total estimated time: **1-2 weeks** for core optimizations.
