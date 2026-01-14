# PRD: Author Data Cleanup and Extraction Research

## Problem Statement

Many mods in the database have incorrect, missing, or inconsistent author information. This affects discoverability, creator attribution, and the overall trust of the platform. Before implementing fixes, we need to research the best approaches for extracting accurate author data from various mod hosting platforms.

## Background

### Current State

**Database Fields:**
- `Mod.author` (String?) - Author name from scraping
- `Mod.creatorId` (String?) - FK to CreatorProfile
- `CreatorProfile` - Full creator entity with handle, bio, social links

**Known Issues:**
1. Many mods have `author: null` despite having a download link to a known platform
2. `author` and `creatorId` can diverge (author string exists but no linked profile)
3. Only CurseForge has author extraction implemented
4. Auto-created creator accounts use fake emails (`{name}@external.creator`)
5. Same creator appears with different name variations across sources

### Current Author Extraction by Source

| Source | Implemented | Method | Accuracy |
|--------|-------------|--------|----------|
| CurseForge | Yes | CSS selectors + title parsing | ~70% |
| Patreon | No | - | 0% |
| Tumblr | No | - | 0% |
| Reddit | No | - | 0% |
| Sims Resource | No | - | 0% |
| ModTheSims | No | - | 0% |
| Direct Links | No | - | 0% |

## Phase 1: Research (REQUIRED FIRST)

### Research Objectives

Before implementing any fixes, complete the following research:

#### 1. Platform URL Pattern Analysis
Document the URL structure for each platform to understand where author info lives:

```
CurseForge:
- Mod page: https://www.curseforge.com/sims4/mods/{mod-slug}
- Author page: https://www.curseforge.com/members/{author}/projects
- Can extract author from mod page DOM

Patreon:
- Creator page: https://www.patreon.com/{creator}
- Post page: https://www.patreon.com/posts/{id}
- Creator name in URL and page header

Tumblr:
- Blog: https://{username}.tumblr.com/post/{id}
- Author is the blog name (subdomain)

Reddit:
- Post: https://www.reddit.com/r/{subreddit}/comments/{id}/{slug}/
- Author: post metadata (u/username)

Sims Resource (TSR):
- Mod: https://www.thesimsresource.com/downloads/details/category/sims4/title/{slug}/id/{id}/
- Creator page: https://www.thesimsresource.com/artists/{username}/

ModTheSims:
- Mod: https://modthesims.info/d/{id}/{slug}.html
- Creator: https://modthesims.info/m/{username}/

Nexus Mods (not currently scraped):
- Mod: https://www.nexusmods.com/thesims4/mods/{id}
- Author: Mod page sidebar
```

#### 2. DOM Structure Analysis
For each platform, document:
- CSS selectors for author name
- Fallback selectors if primary fails
- API endpoints if available (prefer over scraping)
- Rate limits and ToS considerations

#### 3. Author Name Normalization Research
Research how to handle:
- Name variations: "TwistedMexi" vs "Twisted Mexi" vs "twistedmexi"
- Display names vs usernames
- Unicode characters in names
- Name changes over time

#### 4. Existing Data Analysis
Query the database to understand the scope:
```sql
-- Mods without author
SELECT COUNT(*) FROM mods WHERE author IS NULL;

-- Mods with author but no creator link
SELECT COUNT(*) FROM mods WHERE author IS NOT NULL AND "creatorId" IS NULL;

-- Most common sources for mods without authors
SELECT source, COUNT(*) FROM mods WHERE author IS NULL GROUP BY source;

-- Download URL patterns in mods without authors
SELECT "downloadUrl", source FROM mods WHERE author IS NULL LIMIT 100;
```

#### 5. API vs Scraping Analysis
For each platform, determine:
- Is there a public API?
- What data does the API provide?
- Rate limits and authentication requirements
- Scraping ToS compliance

### Research Deliverables

Create `docs/research/author-extraction-findings.md` with:
1. Platform-by-platform extraction strategies
2. Recommended approach for each source
3. Normalization rules for author names
4. Database analysis results
5. Risk assessment (rate limits, ToS, blocking)

## Phase 2: Data Analysis

### Audit Script Requirements

Create `scripts/audit-author-data.ts` to:

1. **Count Missing Authors**
   ```typescript
   // Total mods without author
   // Mods without author by source
   // Mods without author by content type
   ```

2. **Analyze Download URLs**
   ```typescript
   // Extract patterns from downloadUrl
   // Identify which URLs could have author extracted
   // Categorize by extraction difficulty
   ```

3. **Identify Duplicates**
   ```typescript
   // Find authors with name variations
   // Find creators with multiple accounts
   // Find mods attributed to wrong creator
   ```

4. **Generate Report**
   ```typescript
   // Summary statistics
   // List of actionable items
   // Estimated cleanup effort
   ```

## Phase 3: Extraction Implementation

### Platform-Specific Extractors

Based on research findings, implement extractors for each platform:

#### CurseForge (Improve Existing)
```typescript
// lib/services/extractors/curseforgeAuthor.ts
export async function extractCurseForgeAuthor(url: string): Promise<AuthorInfo> {
  // 1. Fetch mod page
  // 2. Try .author-name selector
  // 3. Try .project-author selector
  // 4. Try API if available
  // 5. Parse from title as last resort
  return { name, url, confidence };
}
```

#### Patreon (New)
```typescript
// lib/services/extractors/patreonAuthor.ts
export async function extractPatreonAuthor(url: string): Promise<AuthorInfo> {
  // 1. Parse creator name from URL (/c/{creator} or /{creator})
  // 2. Fetch page header for display name
  // 3. Extract from meta tags
  return { name, url, confidence };
}
```

#### Tumblr (New)
```typescript
// lib/services/extractors/tumblrAuthor.ts
export async function extractTumblrAuthor(url: string): Promise<AuthorInfo> {
  // 1. Parse subdomain from URL ({author}.tumblr.com)
  // 2. Fetch blog for display name
  // 3. Handle reblog attribution
  return { name, url, confidence };
}
```

#### Sims Resource (New)
```typescript
// lib/services/extractors/tsrAuthor.ts
export async function extractTSRAuthor(url: string): Promise<AuthorInfo> {
  // 1. Fetch mod page
  // 2. Extract creator from sidebar/header
  // 3. Get creator profile URL
  return { name, url, confidence };
}
```

#### ModTheSims (New)
```typescript
// lib/services/extractors/mtsAuthor.ts
export async function extractMTSAuthor(url: string): Promise<AuthorInfo> {
  // 1. Fetch mod page
  // 2. Extract from creator info box
  // 3. Get creator profile URL
  return { name, url, confidence };
}
```

### Universal URL Parser

```typescript
// lib/services/extractors/urlAuthorParser.ts
export function parseAuthorFromUrl(url: string): AuthorInfo | null {
  const patterns = [
    { regex: /patreon\.com\/(?:c\/)?([^\/]+)/, source: 'patreon' },
    { regex: /([^.]+)\.tumblr\.com/, source: 'tumblr' },
    { regex: /reddit\.com\/user\/([^\/]+)/, source: 'reddit' },
    { regex: /thesimsresource\.com\/artists\/([^\/]+)/, source: 'tsr' },
    { regex: /modthesims\.info\/m\/([^\/]+)/, source: 'mts' },
    { regex: /curseforge\.com\/members\/([^\/]+)/, source: 'curseforge' },
  ];

  for (const { regex, source } of patterns) {
    const match = url.match(regex);
    if (match) {
      return { name: match[1], source, confidence: 0.8 };
    }
  }
  return null;
}
```

## Phase 4: Cleanup Execution

### Cleanup Script Requirements

Create `scripts/cleanup-author-data.ts` with:

1. **Dry Run Mode**
   - Preview all changes without database writes
   - Generate report of proposed changes

2. **Incremental Processing**
   - Process in batches (100 mods at a time)
   - Respect rate limits for external fetches
   - Resume capability after interruption

3. **Confidence Thresholds**
   - Auto-apply changes with confidence > 0.9
   - Queue for review changes with confidence 0.5-0.9
   - Skip changes with confidence < 0.5

4. **Logging**
   - Log every change with before/after values
   - Track extraction method used
   - Record confidence scores

### Cleanup Priorities

1. **High Priority**: Mods with download URLs that can be parsed for author
2. **Medium Priority**: Mods from known sources without author extraction
3. **Low Priority**: Mods with ambiguous or missing download URLs

### Author Normalization

```typescript
// lib/services/authorNormalizer.ts
export function normalizeAuthor(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '') // Remove spaces for matching
    .replace(/[_-]/g, ''); // Normalize separators
}

export function findExistingCreator(authorName: string): CreatorProfile | null {
  const normalized = normalizeAuthor(authorName);
  // Search by normalized handle
  // Search by display name variations
  // Search by known aliases
}
```

## Files to Create

### Research
- `docs/research/author-extraction-findings.md` - Research results

### Scripts
- `scripts/audit-author-data.ts` - Database audit
- `scripts/cleanup-author-data.ts` - Cleanup execution

### Extractors
- `lib/services/extractors/curseforgeAuthor.ts`
- `lib/services/extractors/patreonAuthor.ts`
- `lib/services/extractors/tumblrAuthor.ts`
- `lib/services/extractors/tsrAuthor.ts`
- `lib/services/extractors/mtsAuthor.ts`
- `lib/services/extractors/urlAuthorParser.ts`

### Utilities
- `lib/services/authorNormalizer.ts`

## Success Metrics

1. **Coverage**: >95% of mods have an author assigned
2. **Accuracy**: >90% of authors correctly attributed (verified by sampling)
3. **Linkage**: >80% of mods linked to a CreatorProfile
4. **Normalization**: <5% duplicate creator profiles for same person

## Testing Plan

1. **Research Validation**
   - Manually verify extraction strategies work on 10 samples per platform
   - Document any edge cases discovered

2. **Audit Script Testing**
   - Run audit on production data
   - Verify counts match manual queries

3. **Extractor Testing**
   - Unit tests for each extractor
   - Integration tests with real URLs (mocked responses)
   - Rate limit compliance testing

4. **Cleanup Testing**
   - Run on test database first
   - Dry-run on production
   - Staged rollout (100 mods, 1000 mods, all mods)

## Risk Mitigation

1. **Rate Limiting**: Use delays, rotating user agents, proxy rotation
2. **ToS Compliance**: Prefer APIs over scraping where available
3. **Data Loss**: Always backup before cleanup, log all changes
4. **False Positives**: Use confidence thresholds, manual review queue
