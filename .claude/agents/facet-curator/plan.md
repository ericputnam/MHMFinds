# Facet-Curator Agent - Implementation Plan

**Status:** Ready
**Created:** 2026-01-24

---

## Purpose

The Facet-Curator agent manages the quality and consistency of the faceted taxonomy system. It analyzes FacetDefinition records, identifies quality issues, merges duplicates, and suggests new facets based on mod data patterns.

## Scope

### In Scope
- Auditing FacetDefinition table for quality issues
- Detecting and merging duplicate facets
- Identifying missing facets from mod data
- Standardizing facet display names and values
- Analyzing facet usage statistics
- Suggesting facet hierarchy improvements

### Out of Scope
- Changing the Prisma schema
- Modifying mod records directly (use db-script for that)
- Creating new facet types (schema change required)
- UI changes to filter components

---

## Facet Types in Schema

From the Prisma schema, the following facet types exist:

| Facet Type | Field | Selection | Example Values |
|------------|-------|-----------|----------------|
| contentType | Mod.contentType | Single | hair, tops, furniture, lighting |
| visualStyle | Mod.visualStyle | Single | alpha, maxis-match, semi-maxis |
| themes | Mod.themes[] | Multi | christmas, goth, cottagecore |
| ageGroups | Mod.ageGroups[] | Multi | toddler, teen, adult |
| genderOptions | Mod.genderOptions[] | Multi | masculine, feminine, unisex |
| occultTypes | Mod.occultTypes[] | Multi | vampire, werewolf, human |
| packRequirements | Mod.packRequirements[] | Multi | base-game, seasons |

---

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Facet-Curator Agent Flow                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Receive task   │
                    │  (audit/merge/  │
                    │   suggest)      │
                    └────────┬────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   Full Audit           Specific Type         Merge Request
        │                     │                     │
        ▼                     ▼                     ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ Load all  │        │ Load type │        │ Find dups │
  │ facets    │        │ facets    │        │ by value  │
  └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
        │                    │                    │
        ▼                    ▼                    ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │ Run all   │        │ Check     │        │ Merge &   │
  │ checks    │        │ quality   │        │ update    │
  └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Generate report │
                    │ with findings   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Suggest fixes   │
                    │ (scripts/manual)│
                    └─────────────────┘
```

---

## Quality Checks

### 1. Missing Definitions
Find facet values used in mods but not in FacetDefinition:
```typescript
const modsWithContentType = await prisma.mod.findMany({
  select: { contentType: true },
  where: { contentType: { not: null } },
  distinct: ['contentType'],
});

const definedContentTypes = await prisma.facetDefinition.findMany({
  where: { facetType: 'contentType' },
  select: { value: true },
});

const missing = modsWithContentType.filter(
  m => !definedContentTypes.some(d => d.value === m.contentType)
);
```

### 2. Orphan Definitions
Find FacetDefinitions with no mods using them:
```typescript
for (const def of definitions) {
  const count = await prisma.mod.count({
    where: { contentType: def.value },
  });
  if (count === 0) orphans.push(def);
}
```

### 3. Case Inconsistencies
Check for values that differ only by case:
```typescript
const values = definitions.map(d => d.value);
const lowercased = values.map(v => v.toLowerCase());
const duplicates = lowercased.filter((v, i) => lowercased.indexOf(v) !== i);
```

### 4. Display Name Issues
- Missing display names
- Display names identical to values
- Inconsistent capitalization
- Duplicate display names across types

### 5. Sort Order Gaps
Check for non-sequential sortOrder values:
```typescript
const sorted = definitions.sort((a, b) => a.sortOrder - b.sortOrder);
for (let i = 0; i < sorted.length - 1; i++) {
  if (sorted[i + 1].sortOrder - sorted[i].sortOrder > 1) {
    gaps.push({ before: sorted[i], after: sorted[i + 1] });
  }
}
```

### 6. Inactive but Used
Facets marked inactive but still referenced by mods.

---

## Merge Operations

When merging duplicate facets:

1. **Identify canonical value**: Usually the one with more usage
2. **Update mods**: Move all references to canonical value
3. **Delete duplicate**: Remove the redundant FacetDefinition
4. **Log change**: Record in audit log

Example merge script:
```typescript
// Merge "Tops" -> "tops" (standardize to lowercase)
await prisma.$transaction([
  prisma.mod.updateMany({
    where: { contentType: 'Tops' },
    data: { contentType: 'tops' },
  }),
  prisma.facetDefinition.delete({
    where: { facetType_value: { facetType: 'contentType', value: 'Tops' } },
  }),
]);
```

---

## Suggestion Engine

The agent can suggest new facets based on:

### Pattern Detection
Analyze mod titles/descriptions for common patterns:
```typescript
const titlePatterns = [
  { pattern: /\bgoth\b/i, suggestedTheme: 'goth' },
  { pattern: /\bvintage\b/i, suggestedTheme: 'vintage' },
  { pattern: /\bchristmas\b/i, suggestedTheme: 'christmas' },
];
```

### Tag Analysis
Extract potential facets from legacy tags:
```typescript
const tagCounts = {};
const mods = await prisma.mod.findMany({ select: { tags: true } });
for (const mod of mods) {
  for (const tag of mod.tags) {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
}
// Suggest facets for tags with > 50 occurrences
```

### Clustering
Group similar mods and identify common attributes:
```typescript
const furnitureMods = await prisma.mod.findMany({
  where: { contentType: 'furniture' },
});
// Analyze for sub-categories: "living room", "bedroom", "kitchen"
```

---

## Report Format

### Audit Report
```markdown
# Facet Quality Audit Report
Generated: 2026-01-24T10:30:00Z

## Summary
- Total FacetDefinitions: 127
- Issues Found: 12
- Critical: 2
- Warning: 5
- Info: 5

## Critical Issues

### Missing Definitions (2)
| Facet Type | Value | Mod Count |
|------------|-------|-----------|
| contentType | skin-overlay | 45 |
| themes | dark-academia | 23 |

## Warnings

### Case Inconsistencies (3)
| Facet Type | Values | Action |
|------------|--------|--------|
| themes | "Goth", "goth" | Merge to "goth" |
| visualStyle | "Alpha", "alpha" | Merge to "alpha" |

### Orphan Definitions (2)
| Facet Type | Value | Last Used |
|------------|-------|-----------|
| themes | legacy-theme | Never |
| contentType | deprecated-type | Never |

## Info

### Usage Statistics
| Facet Type | Total Definitions | Active | Average Usage |
|------------|-------------------|--------|---------------|
| contentType | 24 | 24 | 426 mods |
| themes | 35 | 32 | 89 mods |
| visualStyle | 5 | 5 | 2,164 mods |

## Suggested Actions
1. Run `scripts/facet-add-missing.ts` to create missing definitions
2. Run `scripts/facet-merge-duplicates.ts --fix` to merge case duplicates
3. Consider deleting orphan definitions manually
```

---

## Tools Required

| Tool | Purpose |
|------|---------|
| Read | Read Prisma schema, existing scripts |
| Write | Create audit reports, fix scripts |
| Bash | Run Prisma queries, execute scripts |
| Grep | Search mod data for patterns |

---

## Invocation

### Full Audit
```bash
claude
> Run facet-curator to audit all facet definitions
```

### Specific Type
```bash
claude
> Audit the contentType facets for quality issues
```

### Merge Request
```bash
claude
> Merge duplicate theme facets: "Goth" into "goth"
```

### Suggestions
```bash
claude
> Suggest new facets based on mod tag analysis
```

---

## Success Criteria

1. Audit report generated with all issues identified
2. No false positives in duplicate detection
3. Merge scripts are safe (use transactions)
4. Usage statistics are accurate
5. Suggestions include justification (mod count, patterns)

---

## Limitations

1. **No schema changes**: Cannot add new facet types
2. **Single database**: Works with local dev DB only
3. **No AI classification**: Pattern matching only (no ML)
4. **Manual merges**: Complex merges need human review
5. **Read-mostly**: Direct fixes require db-script agent

---

## Example Session

```
Facet-Curator Agent Starting
============================
Task: Full facet quality audit

Loading FacetDefinitions...
- contentType: 24 definitions
- visualStyle: 5 definitions
- themes: 35 definitions
- ageGroups: 8 definitions
- genderOptions: 3 definitions
- occultTypes: 7 definitions
- packRequirements: 45 definitions

Running quality checks...

1. Missing Definitions Check
   - Found: "skin-overlay" used by 45 mods but no definition
   - Found: "dark-academia" theme used by 23 mods but no definition

2. Case Inconsistency Check
   - Found: "Goth" and "goth" (themes) - recommend merge
   - Found: "Alpha" and "alpha" (visualStyle) - recommend merge

3. Orphan Definitions Check
   - Found: "legacy-theme" (themes) - 0 mods using it

4. Display Name Check
   - OK: All definitions have display names

5. Sort Order Check
   - Warning: Gap in contentType sortOrder (5 -> 12)

Generating report...
- Report saved to: scripts/reports/facet-audit-20260124.md

Suggested fixes:
1. Create missing definitions:
   > Run: npx tsx scripts/facet-add-missing.ts

2. Merge case duplicates:
   > Run: npx tsx scripts/facet-merge-case.ts --fix

3. Review orphan definitions manually

Audit complete. 12 issues found (2 critical, 5 warning, 5 info).
```
