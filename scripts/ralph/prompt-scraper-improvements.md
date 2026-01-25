# Ralph Agent Instructions - Scraper Content Type Improvements

## Your Task

1. Read `scripts/ralph/prd-scraper-improvements.json`
2. Read `scripts/ralph/progress-scraper-improvements.txt`
   (check Codebase Patterns first)
3. Check you're on the correct branch: `feat/scraper-content-type`
4. Pick highest priority story
   where `passes: false`
5. Implement that ONE story
6. Run typecheck: `npm run type-check`
7. Update progress file with learnings
8. Commit: `feat: [ID] - [Title]`
9. Update prd JSON: `passes: true`
10. Append learnings to progress file

## Progress Format

APPEND to progress-scraper-improvements.txt:

## [Date] - [Story ID]
- What was implemented
- Files changed
- **Learnings:**
  - Patterns discovered
  - Gotchas encountered
---

## Codebase Patterns

Add reusable patterns to the TOP
of progress file as you discover them.

## Key Context

### IMPORTANT: Run Backfill PRD First
This PRD depends on CTB-003 (contentTypeDetector.ts) from the Content Type Backfill PRD.
Complete at least CTB-001 through CTB-004 before starting this PRD.

### WM (wewantmods.com) URL Structure
```
https://wewantmods.com/sims4/{category}/{item-slug}

Examples:
- https://wewantmods.com/sims4/bathroom/elegant-sink-set
- https://wewantmods.com/sims4/hair/wavy-ponytail
- https://wewantmods.com/sims4/eyebrows/natural-brows-pack
- https://wewantmods.com/sims4/cas/presets/face-preset-01
```

### Content Type Strategy
- URL path is PRIMARY signal for contentType
- Title/description are SECONDARY confirmation
- If URL says "bathroom", that's a room theme (add to themes array)
- If URL says "eyebrows", that's the contentType

### Example Expected Behavior
```
URL: /sims4/bathroom/modern-sink
Title: "Modern Bathroom Sink Set"
Result:
  contentType: "furniture"
  themes: ["bathroom"]

URL: /sims4/eyebrows/thick-brows
Title: "Thick Natural Eyebrows"
Result:
  contentType: "eyebrows"
```

### Auto-Create FacetDefinitions
When encountering unknown categories, create FacetDefinitions automatically:
```typescript
async function ensureFacetDefinitionExists(facetType: string, value: string) {
  await prisma.facetDefinition.upsert({
    where: { facetType_value: { facetType, value } },
    update: {},
    create: {
      facetType,
      value,
      displayName: toTitleCase(value),
      sortOrder: 100,
      isActive: true,
    },
  });
}
```

### Scraper File Location
Main scraper: `lib/services/weWantModsScraper.ts`

## Stop Condition

If ALL stories pass, reply:
<promise>COMPLETE</promise>

Otherwise end normally.
