# PRD: Scraper Facet Accuracy for New Mods

## Problem Statement

The content scrapers are not consistently extracting accurate facet data (author, category, age groups, gender, content type, etc.) for new mods. This leads to poor search/filter accuracy and a degraded user experience.

## Background

### Current Scraper Architecture

Two aggregator implementations exist:
- `lib/services/contentAggregator.ts` - Basic scraping (missing `author` field entirely)
- `lib/services/privacyAggregator.ts` - Advanced scraping with author extraction

### Supported Sources
| Source | Author Extraction | Facet Extraction | Status |
|--------|-------------------|------------------|--------|
| CurseForge | Partial (CSS selectors) | None | Primary source |
| Patreon | Not implemented | None | Hardcoded creators |
| Tumblr | Not implemented | None | Tag-based |
| Reddit | Not implemented | None | Incomplete |
| Sims Resource | Not implemented | None | Placeholder |
| ModTheSims | Not implemented | None | Placeholder |

### Current Issues

1. **Author field missing from basic aggregator** - `contentAggregator.ts` ScrapedMod interface lacks `author`
2. **No facet extraction during scraping** - All facets extracted post-import via AI
3. **Inconsistent data between sources** - Each source extracts different fields
4. **No validation of scraped data** - Bad data imported directly
5. **AI extraction runs separately** - Creates delay and potential for orphaned mods without facets

## Requirements

### Must Have

1. **Unified ScrapedMod Interface**
   - Add `author` field to `contentAggregator.ts`
   - Add facet fields to ScrapedMod: `contentType`, `ageGroups`, `gender`, `visualStyles`
   - Ensure both aggregators use the same interface

2. **Source-Specific Facet Extraction**
   - Extract facets during scraping, not after
   - Each source should have tailored extraction logic:
     - CurseForge: Parse categories, tags from mod page
     - Patreon: Extract from post content/tags
     - Tumblr: Extract from post tags
     - Reddit: Extract from flair and title patterns

3. **Validation Layer**
   - Validate scraped data before database insert
   - Reject mods with critical missing fields
   - Log validation failures for review

4. **AI-Assisted Extraction During Scraping**
   - Call `aiFacetExtractor` during scrape, not as separate job
   - Use vision extraction for thumbnail analysis
   - Fall back to keyword extraction if AI unavailable

5. **Facet Confidence Scoring**
   - Track extraction method: `scraped`, `ai-extracted`, `keyword-matched`
   - Store confidence score (0-1) for each facet
   - Flag low-confidence extractions for review

### Should Have

6. **Dry-Run Mode for New Sources**
   - Preview scraped data without database writes
   - Generate reports on data quality
   - Allow manual review before enabling

7. **Source Quality Metrics**
   - Track extraction success rate per source
   - Monitor facet coverage per source
   - Alert on degraded scraping quality

### Nice to Have

8. **Adaptive Extraction**
   - Learn from manual corrections
   - Improve keyword patterns over time
   - A/B test extraction methods

## Technical Approach

### Phase 1: Unified Interface

```typescript
// lib/services/types/scraped.ts
export interface ScrapedMod {
  // Required
  title: string;
  source: string;
  sourceUrl: string;

  // Author
  author?: string;
  authorUrl?: string;

  // Facets (extracted during scrape)
  contentType?: string;
  category?: string;
  ageGroups?: string[];
  gender?: string;
  visualStyles?: string[];

  // Metadata
  extractionMethod: 'scraped' | 'ai' | 'keyword' | 'manual';
  extractionConfidence: number; // 0-1

  // Existing fields
  description?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  price?: number;
  // ...
}
```

### Phase 2: Source-Specific Extractors

```typescript
// lib/services/extractors/curseforge.ts
export class CurseForgeExtractor {
  async extractFacets(html: string, url: string): Promise<Partial<ScrapedMod>> {
    // 1. Extract category from breadcrumb or URL path
    // 2. Extract tags from mod page
    // 3. Infer contentType from category (CAS vs Build/Buy)
    // 4. Extract author from .author-name selector
    // 5. Return structured facets
  }
}

// lib/services/extractors/patreon.ts
export class PatreonExtractor {
  async extractFacets(html: string, url: string): Promise<Partial<ScrapedMod>> {
    // 1. Extract creator name from page header or URL
    // 2. Extract tags from post
    // 3. Analyze description for content type keywords
  }
}
```

### Phase 3: Validation Pipeline

```typescript
// lib/services/validation/modValidator.ts
export class ModValidator {
  validate(mod: ScrapedMod): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!mod.title) errors.push('Missing title');
    if (!mod.source) errors.push('Missing source');

    // Facet quality
    if (!mod.author) warnings.push('Missing author');
    if (!mod.contentType) warnings.push('Missing content type');
    if (mod.extractionConfidence < 0.5) warnings.push('Low confidence extraction');

    return { valid: errors.length === 0, errors, warnings };
  }
}
```

### Phase 4: Integrated AI Extraction

```typescript
// In aggregator scrape loop:
async scrapeAndEnrich(rawMod: RawScrapedData): Promise<ScrapedMod> {
  // 1. Basic scraping
  const mod = await this.scrape(rawMod);

  // 2. AI facet extraction (inline, not post-process)
  if (!mod.contentType || !mod.ageGroups) {
    const aiFacets = await aiFacetExtractor.extract(mod);
    Object.assign(mod, aiFacets);
    mod.extractionMethod = 'ai';
  }

  // 3. Vision analysis if thumbnail available
  if (mod.thumbnailUrl && !mod.visualStyles) {
    const visionFacets = await visionExtractor.extract(mod.thumbnailUrl);
    Object.assign(mod, visionFacets);
  }

  // 4. Validate before return
  const validation = validator.validate(mod);
  if (!validation.valid) {
    throw new ScrapingError('Invalid mod data', validation.errors);
  }

  return mod;
}
```

## Source-Specific Extraction Strategies

### CurseForge
- **Author**: `.author-name` selector, fallback to title parsing
- **Category**: URL path (`/sims4/mods/clothing/` → clothing)
- **Tags**: Mod page tag list
- **Content Type**: Infer from category (hair, clothing = CAS; furniture = Build/Buy)

### Patreon
- **Author**: Extract from URL (`/c/{creator}`) or page header
- **Content Type**: Parse post title/description for keywords
- **Tags**: Post tags if available

### Tumblr
- **Author**: Blog name from URL or post metadata
- **Tags**: Post tags (primary data source)
- **Content Type**: Infer from tags (#ts4cc, #sims4hair, etc.)

### Reddit
- **Author**: Post author (u/username)
- **Content Type**: Subreddit and flair analysis
- **Category**: Flair or title prefix

### Sims Resource / ModTheSims
- **Author**: Creator profile link on mod page
- **Category**: Site category from breadcrumb
- **Content Type**: Site section (CAS, Build/Buy, etc.)

## Files to Create/Modify

### New Files
- `lib/services/types/scraped.ts` - Unified interfaces
- `lib/services/extractors/curseforge.ts` - CurseForge-specific extraction
- `lib/services/extractors/patreon.ts` - Patreon-specific extraction
- `lib/services/extractors/tumblr.ts` - Tumblr-specific extraction
- `lib/services/validation/modValidator.ts` - Validation layer

### Modify
- `lib/services/contentAggregator.ts` - Add author field, integrate extractors
- `lib/services/privacyAggregator.ts` - Integrate extractors, add validation
- `lib/services/aiFacetExtractor.ts` - Add inline extraction mode

## Success Metrics

1. **Facet Coverage**: >90% of new mods have all required facets populated
2. **Author Accuracy**: >95% of scraped authors match actual creator
3. **Content Type Accuracy**: >90% correct content type assignment
4. **Extraction Time**: <5 seconds average per mod (including AI)
5. **Validation Pass Rate**: >85% of scraped mods pass validation first try

## Testing

1. Scrape 100 mods from each source in dry-run mode
2. Manually verify facet accuracy
3. Compare AI extraction vs scraped extraction accuracy
4. Measure extraction time and cost
5. Monitor validation failure rates by source
