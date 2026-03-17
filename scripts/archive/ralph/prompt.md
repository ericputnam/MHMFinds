# Ralph Agent Instructions - Admin Facet Editor

## Your Task

1. Read `scripts/ralph/prd.json`
2. Read `scripts/ralph/progress.txt`
   (check Codebase Patterns first)
3. Check you're on the correct branch: `feat/admin-facet-editor`
4. Pick highest priority story
   where `passes: false`
5. Implement that ONE story
6. Run typecheck: `npm run type-check`
7. Update progress.txt with learnings
8. Commit: `feat: [ID] - [Title]`
9. Update prd.json: `passes: true`
10. Append learnings to progress.txt

## Progress Format

APPEND to progress.txt:

## [Date] - [Story ID]
- What was implemented
- Files changed
- **Learnings:**
  - Patterns discovered
  - Gotchas encountered
---

## Codebase Patterns

Add reusable patterns to the TOP
of progress.txt as you discover them.

## Key Context

### Facet Schema (from prisma/schema.prisma)
```
// On Mod model:
contentType String?    // single-select: hair, tops, bottoms, furniture, etc.
visualStyle String?    // single-select: alpha, maxis-match, semi-maxis, etc.
themes      String[]   // multi-select: christmas, cottagecore, y2k, etc.

// FacetDefinition model - UI metadata
model FacetDefinition {
  id          String   @id @default(cuid())
  facetType   String   // "contentType", "visualStyle", "themes"
  value       String   // "hair", "alpha", "christmas"
  displayName String   // "Hair", "Alpha CC", "Christmas"
  description String?
  icon        String?
  color       String?
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  @@unique([facetType, value])
}
```

### Existing Admin Pages
- `/admin/mods` - Mods list with bulk actions
- `/admin/mods/[id]/edit` - Individual mod edit (needs facet fields)
- `/admin/categories` - Currently manages deprecated Category model (repurpose for FacetDefinition)

### API Patterns
- Admin APIs at `/api/admin/*`
- Use `getServerSession(authOptions)` for auth
- Check `session?.user?.isAdmin` for admin access
- Return proper error responses with status codes

## Stop Condition

If ALL stories pass, reply:
<promise>COMPLETE</promise>

Otherwise end normally.
