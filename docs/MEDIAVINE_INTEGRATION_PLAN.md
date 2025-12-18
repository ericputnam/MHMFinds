# Mediavine Integration Implementation Plan

> **Created:** December 17, 2024  
> **Source:** Mediavine Support Email  
> **Goal:** Make MHMFinds mod finder compatible with Mediavine ad refresh

---

## 📋 Requirements Summary

| Requirement | Status | Description |
|-------------|--------|-------------|
| **1. Mediavine Script** | ✅ DONE | Add script to `<Head>` using `next/script` with `beforeInteractive` |
| **2. URL State for Pagination** | ✅ DONE | Update URL to `?page=2` when paginating |
| **3. URL State for Search** | ✅ DONE | Update URL to `?search=modern+kitchen` when searching |
| **4. URL State for Filters** | ✅ DONE | Update URL for category, game version, sort |
| **5. Add `mv-ads` class** | ✅ DONE | Add class to grid container for in-content ads |

---

## 🔧 Implementation Tasks

### Task 1: Add Mediavine Script Component
**File:** `app/layout.tsx`

```tsx
import Script from 'next/script'

// In <head>:
<Script
  id="mediavine-script"
  strategy="beforeInteractive"
  src="//scripts.mediavine.com/tags/musthavemods.js"
  data-noptimize="1"
  data-cfasync="false"
/>
```

**For Testing (use test script):**
```tsx
<Script
  id="mediavine-test"
  strategy="beforeInteractive"
  src="//scripts.mediavine.com/tags/mediavine-scripty-boi.js"
  data-noptimize="1"
  data-cfasync="false"
/>
```

---

### Task 2: Update URL State Management
**File:** `app/page.tsx`

Current behavior:
- State managed in React useState
- URL never changes when filters/pagination change

Required behavior:
- All filter state synced with URL query parameters
- URL updates when user interacts with filters
- Page loads with correct state from URL

**URL Parameters:**
| Parameter | Example | Current State Variable |
|-----------|---------|----------------------|
| `page` | `?page=2` | `pagination.page` (from API) |
| `search` | `?search=modern` | `searchQuery` |
| `category` | `?category=Furniture` | `selectedCategory` |
| `gameVersion` | `?gameVersion=Sims+4` | `selectedGameVersion` |
| `sort` | `?sort=downloads` | `sortBy` |
| `creator` | `?creator=testcreator` | `creatorParam` (already uses URL) |

**Implementation approach:**
1. Read initial state from `useSearchParams()`
2. Use `router.push()` or `router.replace()` to update URL on state change
3. Use `replace` instead of `push` to avoid cluttering browser history

---

### Task 3: Add `mv-ads` Class to Grid
**File:** `components/ModGrid.tsx`

```tsx
<div className={`grid ${getGridClasses(gridColumns)} gap-x-6 gap-y-10 mv-ads`}>
```

---

## 📁 Files to Modify

1. `app/layout.tsx` - Add Mediavine script
2. `app/page.tsx` - URL state management for filters/pagination
3. `components/ModGrid.tsx` - Add `mv-ads` class

---

## 🧪 Test Cases to Add

### URL State Tests
```typescript
describe('URL State Management', () => {
  it('updates URL when page changes')
  it('updates URL when search query changes')
  it('updates URL when category changes')
  it('updates URL when game version changes')
  it('updates URL when sort changes')
  it('reads initial state from URL on load')
  it('preserves existing params when updating one')
})
```

### Mediavine Integration Tests
```typescript
describe('Mediavine Integration', () => {
  it('grid container has mv-ads class')
  it('URL changes trigger ad refresh (URL includes all filter state)')
})
```

---

## ⚠️ Important Considerations

1. **Use `router.replace()` not `router.push()`**
   - Prevents back button from cycling through every filter change
   - Better UX for users

2. **Preserve creator param when updating other filters**
   - Currently uses URL already, don't break this

3. **URL encoding for search queries**
   - Use `encodeURIComponent()` for special characters

4. **Default values should NOT be in URL**
   - Only add params to URL when they differ from defaults
   - Cleaner URLs

---

## 📅 Implementation Order

1. ✅ Create this plan
2. ⏳ Task 2: URL State Management (most complex)
3. ⏳ Task 3: Add `mv-ads` class (simple)
4. ⏳ Task 1: Add Mediavine script (simple, do last for testing)
5. ⏳ Write unit tests
6. ⏳ Test with Mediavine test script
7. ⏳ Commit and deploy

---

**Last Updated:** December 17, 2024
