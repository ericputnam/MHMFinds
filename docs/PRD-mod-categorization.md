# PRD: Mod Categorization System Cleanup

## Problem Statement

Mods are not being categorized correctly, leading to poor search results and filter accuracy. The system has three competing categorization approaches, incomplete data, and no easy way to fix categorization at scale.

## Background

### Current Categorization Layers

| Layer | Field(s) | Status | Usage |
|-------|----------|--------|-------|
| **Legacy Flat** | `category` (String) | Deprecated | Still populated, used as fallback |
| **Hierarchical** | `categoryId`, `Category` table | Underutilized | Schema exists, rarely used |
| **Faceted** | `contentType`, `visualStyle`, `themes`, etc. | Primary | 40-60% populated |

### Facet Population Status

| Facet | Coverage | Notes |
|-------|----------|-------|
| `contentType` | ~40-50% | Many legacy mods missing |
| `visualStyle` | ~20-30% | Primarily for CC |
| `themes` | ~30-40% | Seasonal themes have better coverage |
| `ageGroups` | ~25-35% | Often set to defaults |
| `genderOptions` | ~40-50% | Complex exclusive filtering |
| `occultTypes` | ~5-10% | Not used in UI |
| `packRequirements` | ~10-15% | Stored but never used |

### Root Causes
1. Scraper doesn't extract facets during import
2. AI extraction runs separately and may miss mods
3. Legacy category field still being populated instead of facets
4. No validation prevents mods with missing categorization

## Requirements

### Must Have

1. **Audit Script**: Create comprehensive categorization audit
   - Count mods missing each facet
   - Identify mods with conflicting categorization
   - Generate actionable report

2. **Bulk Categorization Tool**: Easy way to categorize mods
   - Rule-based: "All mods with 'hair' in title → contentType: hair"
   - AI-assisted: Use GPT to categorize from title/description
   - Manual queue: Admin UI for reviewing uncategorized mods

3. **Content Type Inference Rules**
   ```
   Title contains "hair" → contentType: hair
   Title contains "dress" OR "gown" → contentType: dresses
   Title contains "furniture" OR "chair" OR "table" → contentType: furniture
   Title contains "pose" OR "poses" → contentType: poses
   Download URL contains "curseforge.com/sims4/mods" → likely script-mod
   ```

4. **Validation on Import**: Prevent new mods without categorization
   - Require at least `contentType` before saving
   - Flag mods for review if AI confidence < 0.7

5. **Deprecate Legacy Category**: Stop writing to `category` field
   - Map existing categories to facets
   - Remove from UI filters
   - Keep field for historical reference only

### Should Have

6. **Category Mapping Table**
   ```
   Legacy Category → Faceted Equivalent
   "Hair" → contentType: "hair"
   "Build/Buy" → contentType: "furniture" OR "decor" OR "lighting"
   "Script" → contentType: "script-mod"
   "Furniture" → contentType: "furniture"
   "Clothing" → contentType: "tops" OR "bottoms" OR "dresses" (needs subdivision)
   ```

7. **Smart Categorization API**
   - `POST /api/admin/categorize` - Bulk categorize by rules
   - `POST /api/admin/categorize/ai` - AI-assisted categorization
   - Dry-run mode to preview changes

8. **Admin Dashboard for Categorization**
   - View uncategorized mods
   - Quick-assign contentType with dropdown
   - Batch operations for similar mods

### Nice to Have

9. **User-Suggested Categorization**
   - "Is this categorized correctly?" feedback
   - Crowd-source corrections

10. **Auto-Learning Rules**
    - Track manual corrections
    - Suggest new rules based on patterns

## Technical Approach

### Phase 1: Audit

```typescript
// scripts/audit-categorization.ts
async function auditCategorization() {
  const report = {
    totalMods: 0,
    missingContentType: 0,
    missingVisualStyle: 0,
    hasLegacyCategoryOnly: 0,
    conflictingData: [],
    bySource: {},
  };

  const mods = await prisma.mod.findMany({
    select: {
      id: true,
      title: true,
      category: true,
      contentType: true,
      visualStyle: true,
      source: true,
    },
  });

  for (const mod of mods) {
    report.totalMods++;
    if (!mod.contentType) report.missingContentType++;
    if (!mod.visualStyle) report.missingVisualStyle++;
    if (mod.category && !mod.contentType) report.hasLegacyCategoryOnly++;

    // Track by source
    report.bySource[mod.source] = report.bySource[mod.source] || { total: 0, missing: 0 };
    report.bySource[mod.source].total++;
    if (!mod.contentType) report.bySource[mod.source].missing++;
  }

  return report;
}
```

### Phase 2: Rule-Based Categorization

```typescript
// lib/services/categorizationRules.ts
const CONTENT_TYPE_RULES = [
  { pattern: /\bhair\b/i, contentType: 'hair' },
  { pattern: /\bdress(es)?\b|\bgown\b/i, contentType: 'dresses' },
  { pattern: /\btop(s)?\b|\bshirt\b|\bblouse\b/i, contentType: 'tops' },
  { pattern: /\bbottom(s)?\b|\bpants\b|\bskirt\b|\bjeans\b/i, contentType: 'bottoms' },
  { pattern: /\bshoe(s)?\b|\bboot(s)?\b|\bheels\b/i, contentType: 'shoes' },
  { pattern: /\bmakeup\b|\blipstick\b|\beyeshadow\b/i, contentType: 'makeup' },
  { pattern: /\bskin\b|\bskinblend\b|\bskin\s*tone\b/i, contentType: 'skin-details' },
  { pattern: /\bfurniture\b|\bchair\b|\btable\b|\bbed\b|\bsofa\b/i, contentType: 'furniture' },
  { pattern: /\bpose(s)?\b/i, contentType: 'poses' },
  { pattern: /\bscript\b|\bmod\s*script\b/i, contentType: 'script-mod' },
  { pattern: /\blot\b|\bhouse\b|\bapartment\b/i, contentType: 'lots' },
];

export function inferContentType(title: string, description?: string): string | null {
  const text = `${title} ${description || ''}`.toLowerCase();

  for (const rule of CONTENT_TYPE_RULES) {
    if (rule.pattern.test(text)) {
      return rule.contentType;
    }
  }

  return null;
}
```

### Phase 3: Bulk Categorization Script

```typescript
// scripts/bulk-categorize.ts
async function bulkCategorize(dryRun = true) {
  const uncategorized = await prisma.mod.findMany({
    where: { contentType: null },
  });

  const changes = [];

  for (const mod of uncategorized) {
    const inferred = inferContentType(mod.title, mod.description);

    if (inferred) {
      changes.push({
        id: mod.id,
        title: mod.title,
        oldContentType: null,
        newContentType: inferred,
        confidence: 'rule-based',
      });

      if (!dryRun) {
        await prisma.mod.update({
          where: { id: mod.id },
          data: { contentType: inferred },
        });
      }
    }
  }

  console.log(`Would update ${changes.length} mods`);
  return changes;
}
```

### Phase 4: AI-Assisted Categorization (for ambiguous cases)

```typescript
// lib/services/aiCategorization.ts
export async function categorizeWithAI(mod: { title: string; description?: string }) {
  const prompt = `Categorize this Sims 4 mod into ONE content type.

Title: ${mod.title}
Description: ${mod.description || 'N/A'}

Valid content types:
- hair, makeup, skin-details, eyes, nails, eyebrows, eyelashes, beards
- tops, bottoms, dresses, full-body, shoes, accessories, jewelry, hats, glasses
- furniture, lighting, decor, build-mode
- poses, animations, script-mod, gameplay-mod
- lots, sims, pets

Respond with ONLY the content type, nothing else.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 20,
  });

  return response.choices[0].message.content?.trim().toLowerCase();
}
```

## Legacy Category Migration Map

```typescript
const LEGACY_TO_FACET_MAP: Record<string, string> = {
  'Hair': 'hair',
  'Makeup': 'makeup',
  'Skin': 'skin-details',
  'Eyes': 'eyes',
  'Clothing': null, // Needs subdivision
  'Tops': 'tops',
  'Bottoms': 'bottoms',
  'Dresses': 'dresses',
  'Shoes': 'shoes',
  'Accessories': 'accessories',
  'Furniture': 'furniture',
  'Build/Buy': null, // Needs subdivision (furniture, decor, lighting)
  'Script': 'script-mod',
  'Gameplay': 'gameplay-mod',
  'Poses': 'poses',
  'Lots': 'lots',
};
```

## Files to Create/Modify

### New Files
- `scripts/audit-categorization.ts` - Comprehensive audit
- `scripts/bulk-categorize.ts` - Rule-based bulk update
- `lib/services/categorizationRules.ts` - Inference rules
- `lib/services/aiCategorization.ts` - AI fallback
- `app/api/admin/categorize/route.ts` - Admin API

### Modify
- `lib/services/contentAggregator.ts` - Add categorization on import
- `lib/services/privacyAggregator.ts` - Add categorization on import
- `app/api/mods/route.ts` - Remove legacy category filter support

## Success Metrics

1. **Coverage**: >95% of mods have `contentType` assigned
2. **Accuracy**: >90% correct categorization (verified by sampling)
3. **Consistency**: No mods with conflicting legacy/faceted categories
4. **New Mods**: 100% of new imports have categorization

## Migration Plan

### Week 1: Audit
- Run audit script
- Document current state
- Identify high-impact gaps

### Week 2: Rule-Based Fix
- Apply rule-based categorization
- Review changes in dry-run
- Execute on production

### Week 3: AI Cleanup
- Run AI categorization on remaining uncategorized
- Manual review of low-confidence results
- Update mods

### Week 4: Validation
- Add validation to prevent new uncategorized mods
- Deprecate legacy category field in code
- Update documentation
