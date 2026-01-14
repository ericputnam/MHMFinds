# PRD Index & Tracker

This document tracks all Product Requirements Documents (PRDs) for the MHMFinds project.

## Status Legend

| Status | Meaning |
|--------|---------|
| `Not Started` | PRD created, work not begun |
| `In Progress` | Currently being implemented |
| `In Review` | Implementation complete, awaiting review |
| `Completed` | Fully implemented and deployed |
| `On Hold` | Paused for dependencies or prioritization |
| `Cancelled` | No longer needed |

## PRD Tracker

### Bugs Fixed (No PRD Required)

| Issue | Priority | Status | Fixed | Notes |
|-------|----------|--------|-------|-------|
| Facet filter cache bug | Critical | **Completed** | 2025-01-13 | Cache key missing faceted filters - selecting Hair showed only 8 mods |

### Data Quality & Cleanup

| PRD | Priority | Status | Created | Completed | Notes |
|-----|----------|--------|---------|-----------|-------|
| [Age Category Cleanup](./PRD-age-category-cleanup.md) | High | Not Started | 2025-01-13 | - | Fix misfits in age filters (e.g., adult items in Child) |
| [Author Data Cleanup](./PRD-author-data-cleanup.md) | High | Not Started | 2025-01-13 | - | Research-first approach to fix author extraction |
| [Mod Categorization](./PRD-mod-categorization.md) | High | Not Started | 2025-01-13 | - | Fix contentType and facet population (~40-60% incomplete) |

### Scraper & Data Pipeline

| PRD | Priority | Status | Created | Completed | Notes |
|-----|----------|--------|---------|-----------|-------|
| [Scraper Facet Accuracy](./PRD-scraper-facet-accuracy.md) | High | Not Started | 2025-01-13 | - | Ensure new mods get accurate facets on import |

### Features & Functionality

| PRD | Priority | Status | Created | Completed | Notes |
|-----|----------|--------|---------|-----------|-------|
| [Trending Implementation](./PRD-trending-implementation.md) | Medium | Not Started | 2025-01-13 | - | Replace hardcoded trending with dynamic data |
| [Filter Visibility UX](./PRD-filter-visibility-ux.md) | High | Not Started | 2025-01-13 | - | Make active filters more obvious |
| [Pagination Per-Page](./PRD-pagination-per-page.md) | Medium | **Completed** | 2026-01-13 | 2026-01-13 | Allow users to select 20, 50, or 100 mods per page |

### Navigation & Testing

| PRD | Priority | Status | Created | Completed | Notes |
|-----|----------|--------|---------|-----------|-------|
| [Navigation Testing](./PRD-navigation-testing.md) | Medium | Not Started | 2025-01-13 | - | Fix broken nav + add unit tests |

### UI/UX Polish

| PRD | Priority | Status | Created | Completed | Notes |
|-----|----------|--------|---------|-----------|-------|
| [Search Box Focus Ring](./PRD-search-box-focus-ring.md) | Low | **Completed** | 2025-01-13 | 2025-01-13 | Added focus:ring-0 to input |
| [Hero Width Alignment](./PRD-hero-width-alignment.md) | Medium | **Completed** | 2025-01-13 | 2025-01-13 | Restructured Hero layout - title centered, search/filters full width |

---

## Summary

| Category | Total | Not Started | In Progress | Completed |
|----------|-------|-------------|-------------|-----------|
| Bugs Fixed | 1 | 0 | 0 | 1 |
| Data Quality | 3 | 3 | 0 | 0 |
| Scraper | 1 | 1 | 0 | 0 |
| Features | 3 | 2 | 0 | 1 |
| Navigation | 1 | 1 | 0 | 0 |
| UI/UX | 2 | 0 | 0 | 2 |
| **Total** | **11** | **7** | **0** | **4** |

---

## Implementation Priority Order (Recommended)

### Phase 1: Critical Fixes
1. **Filter Visibility UX** - Users confused by hidden filters
2. **Search Box Focus Ring** - Quick win, 5 min fix
3. **Hero Width Alignment** - Visual polish, 30 min fix

### Phase 2: Data Quality
4. **Mod Categorization** - 40-60% of mods missing contentType
5. **Age Category Cleanup** - Misfits causing filter issues
6. **Author Data Cleanup** - Research first, then implement

### Phase 3: Scraper Improvements
7. **Scraper Facet Accuracy** - Prevent future data issues

### Phase 4: Features
8. **Trending Implementation** - Replace hardcoded trending
9. **Navigation Testing** - Fix nav + add test coverage

---

## How to Update This Document

When starting work on a PRD:
1. Change status to `In Progress`
2. Add any relevant notes

When completing a PRD:
1. Change status to `Completed`
2. Add completion date
3. Update the summary counts

When creating a new PRD:
1. Add file to appropriate section above
2. Update summary counts
