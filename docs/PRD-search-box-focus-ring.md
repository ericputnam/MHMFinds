# PRD: Fix Search Box Focus Ring (Blue Box)

## Problem Statement

When the search input is focused, a blue outline/ring appears around the input field. This is the browser's default focus indicator and doesn't match the site's design aesthetic.

## Current State

**Location**: `components/Hero.tsx` (line 119)

**Current styling**:
```tsx
<input
  className="flex-1 bg-transparent text-white placeholder-slate-500 px-3 sm:px-4 md:px-5 py-3 sm:py-4 outline-none text-sm sm:text-base md:text-lg font-medium min-w-0"
/>
```

The input has `outline-none` but still shows a blue focus ring because:
1. Tailwind's default `ring` utility may be applied via base styles
2. Browser default focus styles can persist
3. The `outline-none` doesn't remove Tailwind's `ring` focus state

## Solution

Add explicit focus ring removal classes to the input:

```tsx
<input
  className="flex-1 bg-transparent text-white placeholder-slate-500 px-3 sm:px-4 md:px-5 py-3 sm:py-4 outline-none focus:outline-none focus:ring-0 ring-0 text-sm sm:text-base md:text-lg font-medium min-w-0"
/>
```

**Classes added**:
- `focus:outline-none` - Removes outline on focus
- `focus:ring-0` - Removes Tailwind ring on focus
- `ring-0` - Removes any default ring

## Alternative: Custom Focus State

If a focus indicator is desired for accessibility, replace the blue box with a subtle custom indicator:

```tsx
<input
  className="flex-1 bg-transparent text-white placeholder-slate-500 px-3 sm:px-4 md:px-5 py-3 sm:py-4 outline-none focus:outline-none focus:ring-0 ring-0 focus:placeholder-slate-400 text-sm sm:text-base md:text-lg font-medium min-w-0"
/>
```

The parent container already has a focus-within style:
```tsx
<div className="... group-focus-within:border-sims-pink/50 transition-all">
```

This means the container border changes to pink when the input is focused - this is the intended focus indicator.

## Files to Modify

- `components/Hero.tsx` (line 119) - Add focus ring removal classes

## Implementation

This is a one-line fix:

```diff
- className="flex-1 bg-transparent text-white placeholder-slate-500 px-3 sm:px-4 md:px-5 py-3 sm:py-4 outline-none text-sm sm:text-base md:text-lg font-medium min-w-0"
+ className="flex-1 bg-transparent text-white placeholder-slate-500 px-3 sm:px-4 md:px-5 py-3 sm:py-4 outline-none focus:outline-none focus:ring-0 ring-0 text-sm sm:text-base md:text-lg font-medium min-w-0"
```

## Accessibility Consideration

Removing focus indicators can harm accessibility for keyboard users. However, this is acceptable here because:

1. The parent container has a visible focus-within state (`border-sims-pink/50`)
2. The search button remains focusable with visible states
3. The overall form group shows focus visually

## Testing

1. Click into search box - no blue ring should appear
2. Tab to search box - no blue ring, but container border should turn pink
3. Type in search box - styling remains consistent
4. Verify on Chrome, Firefox, Safari (each has different default focus styles)

## Priority

**Low** - This is a visual polish issue, not a functional bug.

## Estimated Effort

5 minutes - single line change.
