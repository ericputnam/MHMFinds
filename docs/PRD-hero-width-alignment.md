# PRD: Hero Section Width Alignment

## Problem Statement

The Hero section (search bar, game filters, trending tags) is narrower than the content grid below it. This creates a visual disconnect where the top of the page doesn't align with the bottom, making the layout feel inconsistent.

## Current State

**Hero Section**:
- Uses `max-w-5xl` (1024px) for content
- Centered with `mx-auto`
- Search bar and filters constrained to this width

**Content Grid Section**:
- Full width with sidebar (~250px) + mod grid
- Extends to container edges
- Visual width appears ~1200-1400px

**Result**: The search bar and filters appear to "float" in a narrower column while the content below is much wider.

## Visual Reference

```
Current Layout:
┌─────────────────────────────────────────────────────────┐
│                                                         │
│         ┌─────── Hero (max-w-5xl) ───────┐              │
│         │  Find Sims 4 CC...             │              │
│         │  [══════ Search Bar ══════]    │              │
│         │  [Sims 4] [Stardew] [MC]        │              │
│         │  Trending: Wicked Whims...      │              │
│         └─────────────────────────────────┘              │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Filters │        Mod Grid (full width)           │   │
│  │         │  [Card] [Card] [Card] [Card]           │   │
│  │         │  [Card] [Card] [Card] [Card]           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

Desired Layout:
┌─────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐   │
│  │           Find Sims 4 CC...                      │   │
│  │  [═══════════════ Search Bar ════════════════]   │   │
│  │  [Sims 4] [Stardew] [Animal Crossing] [MC]       │   │
│  │  Trending: Wicked Whims, MCCC, UI Cheats...      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Filters │        Mod Grid (full width)           │   │
│  │         │  [Card] [Card] [Card] [Card]           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Requirements

### Must Have

1. **Align Hero width with content grid width**
   - Hero section should span the same width as Filters + Mod Grid
   - Maintain responsive behavior on smaller screens

2. **Keep search bar appropriately sized**
   - Search bar can have a max-width for usability
   - But overall Hero container should match content width

### Options

**Option A: Expand Hero to full container width**
- Change Hero `max-w-5xl` to match content grid container
- Keep search bar with reasonable max-width inside
- Game filters and trending can span wider

**Option B: Constrain content grid to match Hero**
- Make the mod grid narrower to match Hero
- Reduces visible content, not recommended

**Option C: Two-tier Hero layout**
- Title and search bar stay centered (max-w-5xl)
- Game filters and trending expand to full width
- Creates visual hierarchy

## Technical Approach

### Option A Implementation (Recommended)

**Current Hero.tsx structure:**
```tsx
<div className="container mx-auto px-4 pt-8 pb-12 relative z-10">
  <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
    {/* Title, search, filters */}
  </div>
</div>
```

**Updated structure:**
```tsx
<div className="container mx-auto px-4 pt-8 pb-12 relative z-10">
  {/* Title stays centered with max-width for readability */}
  <div className="max-w-4xl mx-auto text-center mb-6">
    <h1>...</h1>
    <p>...</p>
  </div>

  {/* Search and filters expand to full width */}
  <div className="w-full max-w-[1400px] mx-auto">
    <form className="max-w-3xl mx-auto mb-6">
      {/* Search bar - keep reasonable width */}
    </form>

    <div className="flex flex-wrap justify-center gap-3">
      {/* Game filters - can span wider */}
    </div>

    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {/* Trending tags - can span wider */}
    </div>
  </div>
</div>
```

### Match with page.tsx container

The main page uses:
```tsx
<div className="flex-1 flex">
  {/* Sidebar */}
  <aside className="w-64 ...">

  {/* Main content */}
  <main className="flex-1 ...">
```

The Hero should use the same container width as the parent page.

## Files to Modify

- `components/Hero.tsx` - Adjust max-width classes
- `app/page.tsx` - Ensure consistent container usage

## Success Criteria

1. Hero section visually aligns with content grid edges
2. Search bar remains appropriately sized (not stretched too wide)
3. Layout looks cohesive from top to bottom
4. Responsive behavior maintained on mobile/tablet

## Testing

1. Desktop (1920px): Hero aligns with content edges
2. Laptop (1440px): Same alignment, adjusted for viewport
3. Tablet (768px): Both sections stack/collapse consistently
4. Mobile (375px): Full-width on both sections

## Priority

**Medium** - Visual polish issue that affects perceived quality.

## Estimated Effort

30 minutes - CSS/Tailwind class adjustments.
