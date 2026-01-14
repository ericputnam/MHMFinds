# PRD: Age Category Cleanup

## Problem Statement

Mods are appearing in incorrect age category filters. For example, "Sims 4 Dorie Hair for Male Sims" (an adult/YA item) is appearing in the Child category. This creates a poor user experience when users filter by age group and see irrelevant results.

## Background

### Current System
- Age groups are stored as `String[]` in the `ageGroups` field on the Mod model
- Valid values: `infant`, `toddler`, `child`, `teen`, `young-adult`, `adult`, `elder`, `all-ages`
- Mods can have multiple age groups (e.g., `["teen", "young-adult", "adult", "elder"]`)
- Age filtering uses Prisma's `hasSome` operator (OR logic)

### Root Causes
1. **Weak keyword extraction**: Simple text matching catches false positives (e.g., "childish" matching "child")
2. **Missing validation**: Non-CAS items (furniture, gameplay mods) shouldn't have age groups but sometimes do
3. **AI extraction errors**: OpenAI extraction occasionally misclassifies items
4. **Legacy data**: Older mods may have been imported with incorrect categorization

## Requirements

### Must Have
1. **Audit Script**: Create a script to identify all potentially miscategorized mods
   - Flag mods where title/description keywords contradict assigned age groups
   - Flag non-CAS items that have age groups assigned
   - Generate report of flagged items with confidence scores

2. **Cleanup Script**: Create a script to fix miscategorized mods
   - Remove age groups from non-CAS content types (furniture, decor, gameplay-mods, lots, build-mode)
   - Re-extract age groups for CAS items using improved extraction logic
   - Support dry-run mode to preview changes

3. **Improved Extraction Logic**: Update `aiFacetExtractor.ts` with:
   - Better keyword patterns (exclude "childish", "childhood", "baby pink", etc.)
   - Content-type awareness (only assign age groups to CAS items)
   - Title-priority extraction (trust title over description)

4. **Validation Rules**: Add validation in the API/extraction pipeline
   - Prevent age group assignment to non-CAS content types
   - Validate that assigned age groups make sense for the content

### Should Have
5. **Admin Dashboard**: Add UI for manual review of flagged items
   - Show flagged mods with suggested corrections
   - Allow one-click approval or manual override

6. **Logging**: Track all automated changes for audit purposes

### Nice to Have
7. **Confidence scoring**: Rate each age group assignment with a confidence score
8. **User feedback mechanism**: Allow users to report miscategorized mods

## Technical Approach

### Phase 1: Audit
```typescript
// scripts/audit-age-categories.ts
// 1. Query all mods with ageGroups
// 2. For each mod, check:
//    - Content type (is it CAS?)
//    - Title keywords vs assigned age groups
//    - Description keywords vs assigned age groups
// 3. Flag mismatches and generate report
```

### Phase 2: Cleanup
```typescript
// scripts/fix-age-categories.ts
// 1. Remove age groups from non-CAS items
// 2. Re-run extraction on flagged CAS items
// 3. Apply changes with transaction support
// 4. Log all changes
```

### Phase 3: Prevention
- Update `aiFacetExtractor.ts` with content-type awareness
- Add validation layer in `/api/mods` route

## Content Type Reference

**CAS Items (should have age groups)**:
- hair, hats, tops, bottoms, dresses, full-body, shoes, accessories, jewelry, glasses, makeup, skin-details, tattoos, piercings, nails, eyelashes, eyebrows, beards, face-presets, body-presets, sims

**Non-CAS Items (should NOT have age groups)**:
- furniture, decor, lighting, build-mode, lots, gameplay-mods, script-mods, cheats, tools, poses, animations, pets, objects

## Success Metrics

1. Zero false positives when filtering by age category
2. All non-CAS mods have empty `ageGroups` arrays
3. Extraction accuracy > 95% for new mods
4. User-reported miscategorizations reduced to near zero

## Files to Modify

- `lib/services/aiFacetExtractor.ts` - Add content-type awareness
- `app/api/mods/route.ts` - Add validation rules
- Create `scripts/audit-age-categories.ts`
- Create `scripts/fix-age-categories.ts`

## Testing

1. Run audit script and review flagged items manually
2. Run cleanup script in dry-run mode first
3. Verify filters show correct results after cleanup
4. Test new mod creation with various content types
