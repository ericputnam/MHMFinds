# PRD: Author Data Cleanup and Extraction

## Status: IMPLEMENTED

This PRD has been implemented. See the operational guide below for usage.

---

## Problem Statement

Many mods in the database have incorrect, missing, or inconsistent author information. The original scraper extracted garbage data from URL path segments like "Title", "ShRef", "Id", "Www" instead of actual author names.

## Background

### Root Cause Analysis

The `mhmScraper.ts` had a flawed `extractAuthorFromUrl()` function that:

1. **Patreon URLs**: Extracted post IDs (e.g., "143548751") instead of creator names
2. **TSR URLs**: Extracted URL path segments like "title", "shRef", "id"
3. **Tumblr URLs**: Extracted "Www" from www.tumblr.com URLs
4. **Generic fallback**: Used domain name parts as author (producing garbage)

### Data Impact

From database analysis (January 2025):
- **Total mods**: 9,989
- **Mods with bad/garbage authors**: 6,492 (65%)
- **Mods with good authors**: 3,491 (35%)
- **Mods with null authors**: 4

**Top garbage author values:**
| Author | Count | Source |
|--------|-------|--------|
| Title | 2,043 | TSR `/title/` path segment |
| ShRef | 709 | TSR `shRef/` path segment |
| CurseForge Creator | 211 | Placeholder fallback |
| Www | 148 | www.tumblr.com URLs |
| Simsfinds | 115 | simsfinds.com domain |
| Id | 112 | TSR `/id/` path segment |
| ModTheSims Community | 90 | Placeholder fallback |

---

## Implementation

### 1. Cleanup Script

**File**: `scripts/cleanup-author-data.ts`

A comprehensive script that:
- Identifies mods with bad/missing author data
- Visits actual download URLs (Patreon, TSR, Tumblr, CurseForge, etc.)
- Extracts real author names from page content using platform-specific methods
- Validates extracted authors against known bad patterns
- Updates the database with correct author information

### 2. Scraper Fixes

**File**: `lib/services/mhmScraper.ts`

Updated the scraper with:
- New `isValidAuthor()` method to filter garbage values
- Completely rewritten `extractAuthorFromUrl()` that returns `undefined` for ambiguous URLs
- Enhanced `scrapeAuthorFromModPage()` with platform-specific extraction logic
- Proper fallback chain: URL extraction → Page scraping → Leave empty

---

## Operational Guide

### Running the Cleanup Script

```bash
# Dry run - see what would be fixed (recommended first)
npx tsx scripts/cleanup-author-data.ts

# Fix first 100 mods (good for testing)
npx tsx scripts/cleanup-author-data.ts --fix --limit=100

# Fix all mods (takes time due to rate limiting)
npx tsx scripts/cleanup-author-data.ts --fix
```

### Expected Output

```
🔍 Author Data Cleanup Script
============================================================
Mode: 📊 DRY RUN (report only)

📊 Finding mods with bad author data...
   Found 6492 mods with bad/missing authors

📊 Bad author distribution:
    2043 × "Title"
     709 × "ShRef"
     211 × "CurseForge Creator"
     ...

[1/6492] Processing: Example Mod...
   Current author: "Title"
   Download URL: https://www.thesimsresource.com/...
   ✅ Found author: "CreatorName" (via member link href)
   📝 Would update (dry run)
```

### Platform Support

| Platform | Status | Method | Notes |
|----------|--------|--------|-------|
| Tumblr | ✅ Working | Subdomain/path extraction | Very reliable |
| The Sims Resource | ✅ Working | URL pattern + page scraping | Extracts from `/artists/`, `/staff/`, `/members/` URLs |
| Patreon | ⚠️ Partial | Meta tag extraction | Works for public posts |
| CurseForge | ✅ Working | Wayback Machine fallback | Uses Internet Archive cached pages |
| ModTheSims | ✅ Working | Wayback Machine fallback | Uses Internet Archive cached pages |
| SimsFinds | ❌ Limited | Generic extraction | No author metadata available |

### Rate Limiting

The cleanup script includes:
- 2-second delay between requests
- Rotating user agents
- Graceful error handling

**Estimated time for full cleanup**: ~3.5 hours for 6,000 mods

### Re-running After Fixes

If you've run the scraper since the fix was applied, new mods should have correct authors. You can still run the cleanup script to catch any remaining issues:

```bash
# Check how many still need fixing
npx tsx scripts/cleanup-author-data.ts
```

---

## Bad Author Patterns

The following patterns are automatically detected as "bad" and will be cleaned up:

### Static Patterns
- `Title`, `ShRef`, `Id`, `Www`
- `Simsfinds`, `CurseForge Creator`, `ModTheSims Community`, `TSR Creator`
- `Wixsite`, `Blogspot`, `Amazon`, `Amzn`, `Tistory`, `Google`
- `Early Access`, `posts`
- `Creator Terms of Use`, `Terms of Use`, `Privacy Policy`
- `Contact`, `About`, `Home`, `Downloads`, `Categories`, `Search`, `Members`

### Dynamic Patterns
- Pure numeric values (Patreon post IDs like "143548751")
- Name + post ID patterns (like "Maia Hair 143566306")
- Values shorter than 2 characters

---

## Scraper Changes

### Before (Problematic)

```typescript
// OLD: Would extract "Title" from /title/mod-name/ paths
private extractAuthorFromUrl(url: URL): string | undefined {
  // ...
  const downloadMatch = pathname.match(/\/downloads\/details\/[^\/]+\/[^\/]+\/([^\/\?]+)/);
  const creatorName = memberMatch?.[1] || downloadMatch?.[1]; // BUG: Gets path segments
  // ...
  author = domainParts[domainParts.length - 2]; // BUG: Gets domain parts
}
```

### After (Fixed)

```typescript
// NEW: Returns undefined for ambiguous URLs, triggering page scraping
private extractAuthorFromUrl(url: URL): string | undefined {
  // Only extract from URLs where author is clearly in the URL
  // For TSR: Only from /members/CreatorName URLs
  // For Patreon: Only from /c/creatorname or /creatorname/posts patterns
  // For Tumblr: From subdomain (username.tumblr.com)
  // Otherwise: Return undefined to trigger page scraping

  if (!this.isValidAuthor(author)) return undefined;
  return author;
}
```

---

## Files Modified

### Created
- `scripts/cleanup-author-data.ts` - Main cleanup script

### Modified
- `lib/services/mhmScraper.ts`:
  - Added `badAuthorPatterns` list
  - Added `isValidAuthor()` method
  - Added `titleCase()` helper
  - Rewrote `extractAuthorFromUrl()`
  - Enhanced `scrapeAuthorFromModPage()`

---

## Future Improvements

1. **CurseForge API Integration**: Use official API instead of scraping
2. **Batch Processing**: Process in larger batches with checkpointing
3. **Creator Profile Linking**: Automatically link to CreatorProfile records
4. **Duplicate Detection**: Identify and merge duplicate creator profiles
5. **Scheduled Cleanup**: Run cleanup periodically to catch new issues

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Mods with valid author | >95% | 35% (pre-cleanup) |
| Author extraction accuracy | >90% | Varies by platform |
| Cleanup script success rate | >80% | ~60% (with Wayback Machine fallback) |

**Note**: Success rate improved significantly after adding:
- Wayback Machine fallback for blocked sites (CurseForge, ModTheSims)
- URL pattern extraction for TSR (`/artists/`, `/staff/`, `/members/` paths)
