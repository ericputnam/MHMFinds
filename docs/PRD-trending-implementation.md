# PRD: Trending Mods Implementation

## Problem Statement

The "Trending" section in the Hero component displays hardcoded SEO search suggestions, not actual trending mods. Users expect to see dynamically popular content based on real engagement data.

## Background

### Current State
- Hero.tsx (lines 12-54) contains hardcoded `trendingByGame` object
- These are static SEO-driven suggestions like "Wicked Whims", "MCCC", "Poses"
- No API endpoint exists for fetching trending mods
- Sorting by "downloads" exists but doesn't account for recency

### Available Data for Trending Calculation
| Field | Type | Usage |
|-------|------|-------|
| `downloadCount` | Int | Total lifetime downloads |
| `favorites` | Int | Total favorites count |
| `rating` | Float | Calculated 1-5 star rating |
| `createdAt` | DateTime | When mod was added |
| `updatedAt` | DateTime | Last modification |
| Reviews | Relation | User reviews with timestamps |

### Current Sorting Options
- `relevance` - AI/semantic search scoring
- `downloads` - Lifetime download count (not time-weighted)
- `rating` - Star rating
- `newest` - Creation date

## Requirements

### Must Have

1. **Trending API Endpoint**
   - Create `GET /api/mods/trending`
   - Calculate trending score using time-weighted engagement
   - Support parameters: `limit`, `timeFrame`, `game`
   - Cache results (1-6 hours)

2. **Trending Score Algorithm**
   ```
   score = (recent_downloads * 0.4) +
           (recent_favorites * 0.3) +
           (recent_reviews * 0.2) +
           (velocity_bonus * 0.1)

   where:
   - recent_* = activity within timeFrame (default 7 days)
   - velocity_bonus = growth rate vs previous period
   ```

3. **Database Support**
   - Add `TrendingSnapshot` table to track periodic metrics
   - Or use time-based queries on existing data
   - Index optimization for trending queries

4. **Hero Component Update**
   - Fetch actual trending mods on page load
   - Display real mod cards or links
   - Keep game-specific filtering

### Should Have

5. **Trending by Category**
   - Trending hair mods, trending furniture, etc.
   - Filter trending by contentType facet

6. **Trending Cache Strategy**
   - Redis cache for trending results
   - Invalidate on significant engagement changes
   - Fallback to static list if cache fails

7. **"Rising" vs "Hot" Distinction**
   - Hot: High absolute engagement
   - Rising: High growth rate (new mods gaining traction)

### Nice to Have

8. **Personalized Trending**
   - Weight by user's preferred categories
   - "Trending in categories you like"

9. **Trending Analytics**
   - Track which trending items get clicked
   - A/B test trending algorithms

## Technical Approach

### Phase 1: API Endpoint

```typescript
// app/api/mods/trending/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const timeFrame = searchParams.get('timeFrame') || '7d';
  const game = searchParams.get('game');

  // Calculate cutoff date
  const days = parseInt(timeFrame);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Query with time-weighted scoring
  const trending = await prisma.$queryRaw`
    SELECT
      m.*,
      (
        COALESCE(m."downloadCount", 0) * 0.4 +
        COALESCE(m.favorites, 0) * 0.3 +
        (SELECT COUNT(*) FROM reviews r WHERE r."modId" = m.id AND r."createdAt" > ${cutoff}) * 50 * 0.2 +
        CASE WHEN m."createdAt" > ${cutoff} THEN 100 ELSE 0 END * 0.1
      ) as trending_score
    FROM mods m
    WHERE m."isVerified" = true
    ${game ? Prisma.sql`AND m."gameVersion" = ${game}` : Prisma.empty}
    ORDER BY trending_score DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({ mods: trending });
}
```

### Phase 2: Caching Layer

```typescript
// lib/services/trendingCache.ts
const CACHE_KEY = 'trending:mods';
const CACHE_TTL = 6 * 60 * 60; // 6 hours

export async function getTrendingMods(options: TrendingOptions) {
  const cacheKey = `${CACHE_KEY}:${options.game || 'all'}:${options.timeFrame}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch fresh
  const trending = await fetchTrendingFromDB(options);

  // Cache result
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(trending));

  return trending;
}
```

### Phase 3: Hero Component Update

```typescript
// components/Hero.tsx
const [trendingMods, setTrendingMods] = useState<Mod[]>([]);

useEffect(() => {
  fetch(`/api/mods/trending?limit=7&game=${selectedGame}`)
    .then(res => res.json())
    .then(data => setTrendingMods(data.mods))
    .catch(() => {
      // Fallback to hardcoded suggestions
      setTrendingMods([]);
    });
}, [selectedGame]);

// Display actual trending mods or fallback to static suggestions
{trendingMods.length > 0 ? (
  <TrendingModCards mods={trendingMods} />
) : (
  <TrendingSearchTags game={selectedGame} onSearch={onSearch} />
)}
```

## Database Schema Addition (Optional)

For more accurate trending with historical data:

```prisma
model TrendingSnapshot {
  id          String   @id @default(cuid())
  modId       String
  mod         Mod      @relation(fields: [modId], references: [id], onDelete: Cascade)
  downloads   Int
  favorites   Int
  reviews     Int
  rating      Float?
  snapshotAt  DateTime @default(now())

  @@index([modId, snapshotAt])
  @@index([snapshotAt])
}
```

This allows calculating velocity (growth between snapshots).

## Files to Create/Modify

### New Files
- `app/api/mods/trending/route.ts` - Trending API endpoint
- `lib/services/trendingCache.ts` - Caching layer (optional)
- `components/TrendingModCards.tsx` - Display component (optional)

### Modify
- `components/Hero.tsx` - Fetch and display real trending
- `prisma/schema.prisma` - Add TrendingSnapshot (optional)

## Success Metrics

1. **Engagement**: Trending section click-through rate > 15%
2. **Freshness**: Trending mods change daily/weekly (not stale)
3. **Accuracy**: Manual review confirms trending mods are actually popular
4. **Performance**: Trending API response < 200ms (cached)

## Testing

1. Verify trending scores match expected ranking
2. Test cache invalidation
3. Test fallback when cache/API fails
4. Load test trending endpoint
5. Verify game-specific filtering works
