# PRD: Filter Visibility and UX Improvements

## Problem Statement

When filters are selected, it's not obvious to users that their results are being filtered. This leads to confusion when expected content (like trending mods) doesn't appear. Users need clearer visual feedback about active filters and easier ways to reset them.

## Background

### Current Issues
1. **Hidden active filters**: Users forget they have filters selected
2. **Trending confusion**: Trending mods don't appear when filters narrow results
3. **No "clear all" prominence**: Reset option isn't obvious
4. **Filter state lost**: Users don't realize filters persist across searches

### Current Filter Indicators
- Filter sidebar shows checked checkboxes
- Some active filter pills exist but may not be prominent
- No global "filters active" banner or badge

## Requirements

### Must Have

1. **Prominent Active Filter Banner**
   - When ANY filter is selected, show a visible banner/bar
   - Display count of active filters
   - Include "Clear All Filters" button
   - Position above results or in sticky header

   ```
   ┌────────────────────────────────────────────────────────┐
   │ 🔍 Filters Active (3)  [Hair] [Female] [Free]  [Clear All] │
   └────────────────────────────────────────────────────────┘
   ```

2. **Filter Badge on Search Results Header**
   - Show "20 mods (filtered)" instead of just "20 mods"
   - Visual indicator that results are narrowed

3. **Trending Section Filter Awareness**
   - When filters are active, show message: "Trending mods for your filters"
   - Or: "Clear filters to see all trending mods"
   - Don't silently hide trending content

4. **Sticky Filter Summary**
   - Active filter chips visible at top of results
   - Individual "x" to remove each filter
   - Always visible while scrolling

### Should Have

5. **Filter State Indicator in Search Bar**
   - Small badge/icon showing filters are active
   - Tooltip showing which filters

6. **Empty State with Filter Context**
   - When no results: "No mods match your filters"
   - Suggest: "Try removing some filters" with quick action

7. **URL Reflects Filter State**
   - Filters persist in URL for sharing
   - Back button restores previous filter state

### Nice to Have

8. **Filter History**
   - "Recently used filters" section
   - Quick re-apply common filter combinations

9. **Saved Filter Presets**
   - Save custom filter combinations
   - "My favorite filters" for logged-in users

## Technical Approach

### Phase 1: Active Filter Banner

```tsx
// components/ActiveFilterBanner.tsx
interface ActiveFilterBannerProps {
  filters: {
    contentTypes: string[];
    visualStyles: string[];
    ageGroups: string[];
    genderOptions: string[];
    priceFilter: string;
  };
  onClearAll: () => void;
  onRemoveFilter: (type: string, value: string) => void;
}

export function ActiveFilterBanner({ filters, onClearAll, onRemoveFilter }: ActiveFilterBannerProps) {
  const activeFilters = [
    ...filters.contentTypes.map(v => ({ type: 'contentType', value: v, label: v })),
    ...filters.visualStyles.map(v => ({ type: 'visualStyle', value: v, label: v })),
    ...filters.ageGroups.map(v => ({ type: 'ageGroup', value: v, label: v })),
    ...filters.genderOptions.map(v => ({ type: 'gender', value: v, label: v })),
    ...(filters.priceFilter ? [{ type: 'price', value: filters.priceFilter, label: filters.priceFilter }] : []),
  ];

  if (activeFilters.length === 0) return null;

  return (
    <div className="bg-sims-pink/10 border border-sims-pink/30 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">
            Filters Active ({activeFilters.length})
          </span>
          {activeFilters.map((filter, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-sims-pink/20 text-sims-pink px-2 py-1 rounded-full text-xs"
            >
              {filter.label}
              <button
                onClick={() => onRemoveFilter(filter.type, filter.value)}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <button
          onClick={onClearAll}
          className="text-sm text-slate-400 hover:text-white underline"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
```

### Phase 2: Results Header Update

```tsx
// In page.tsx results section
<div className="flex items-center justify-between mb-4">
  <span className="text-slate-400">
    {totalCount} mods
    {hasActiveFilters && (
      <span className="text-sims-pink ml-1">(filtered)</span>
    )}
  </span>
  <SortDropdown value={sort} onChange={setSort} />
</div>
```

### Phase 3: Trending Section Awareness

```tsx
// In Hero.tsx or trending section
{hasActiveFilters ? (
  <div className="text-center text-slate-400 text-sm">
    <p>Showing trending for your current filters.</p>
    <button
      onClick={onClearFilters}
      className="text-sims-pink hover:underline"
    >
      Clear filters to see all trending
    </button>
  </div>
) : (
  <TrendingTags ... />
)}
```

### Phase 4: Empty State Enhancement

```tsx
// components/EmptyState.tsx
export function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {hasFilters ? 'No mods match your filters' : 'No mods found'}
      </h3>
      <p className="text-slate-400 mb-4">
        {hasFilters
          ? 'Try removing some filters to see more results'
          : 'Try a different search term'}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="bg-sims-pink hover:bg-sims-pink/90 text-white px-4 py-2 rounded-lg"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
```

## Visual Design

### Color Coding for Filter Types
| Filter Type | Color |
|-------------|-------|
| Content Type | Pink (`sims-pink`) |
| Visual Style | Blue (`sims-blue`) |
| Age Group | Orange |
| Gender | Purple |
| Price | Green |

### Filter Badge States
- **Active**: Solid background with "x" button
- **Hover**: Slightly brighter, "x" more visible
- **Focus**: Ring outline for accessibility

## Files to Create/Modify

### New Files
- `components/ActiveFilterBanner.tsx` - Banner component
- `components/EmptyState.tsx` - Enhanced empty state

### Modify
- `app/page.tsx` - Add banner, update results header
- `components/Hero.tsx` - Filter-aware trending section
- `components/FacetedSidebar.tsx` - Ensure consistent filter state

## Success Metrics

1. **Reduced confusion**: Users understand why results are limited
2. **Faster filter reset**: "Clear All" used more frequently
3. **Better engagement**: Users explore more with filter awareness
4. **Reduced support**: Fewer "where are my mods?" questions

## Testing

1. Select multiple filters → banner appears with all filters listed
2. Click individual "x" → that filter removed, others remain
3. Click "Clear All" → all filters cleared, full results shown
4. With filters active → results show "(filtered)" indicator
5. No results with filters → empty state shows clear filters option
6. Trending section → shows filter context message

## Priority

**High** - This directly impacts user experience and comprehension.

## Estimated Effort

2-3 hours for full implementation.
