# Ralph Agent Instructions - Content Type Backfill

## Your Task

1. Read `scripts/ralph/prd-content-type-backfill.json`
2. Read `scripts/ralph/progress-content-type-backfill.txt`
   (check Codebase Patterns first)
3. Check you're on the correct branch: `feat/content-type-backfill`
4. Pick highest priority story
   where `passes: false`
5. Implement that ONE story
6. Run typecheck: `npm run type-check`
7. Update progress file with learnings
8. Commit: `feat: [ID] - [Title]`
9. Update prd JSON: `passes: true`
10. Append learnings to progress file

## Progress Format

APPEND to progress-content-type-backfill.txt:

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

### Current Database State
- 10,447 total mods
- 45 mods with NULL contentType
- 4 content types WITHOUT FacetDefinitions: pet-furniture, cas-background, loading-screen, preset

### Content Type Strategy
- Granular types: eyebrows, lashes, eyeliner, blush, lipstick, beard (NOT all under "makeup")
- Room-based items use themes array: bathroom, kitchen, bedroom, etc.
- Object type stays in contentType: furniture, decor, clutter, lighting

### Example Categorizations
- "Elegant Bathroom Sink Set" -> contentType: "furniture", themes: ["bathroom"]
- "Natural Eyebrows Pack" -> contentType: "eyebrows"
- "Kitchen Clutter Collection" -> contentType: "clutter", themes: ["kitchen"]
- "Maxis Match Lashes" -> contentType: "lashes", visualStyle: "maxis-match"

### Prisma Patterns
```typescript
import { prisma } from '@/lib/prisma';

// Load env for scripts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
```

### FacetDefinition Schema
```prisma
model FacetDefinition {
  id          String   @id @default(cuid())
  facetType   String   // "contentType", "visualStyle", "themes"
  value       String   // "eyebrows", "bathroom", etc.
  displayName String   // "Eyebrows", "Bathroom"
  description String?
  icon        String?
  color       String?
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  @@unique([facetType, value])
}
```

## Stop Condition

If ALL stories pass, reply:
<promise>COMPLETE</promise>

Otherwise end normally.
