# PRD: Navigation Testing and Fixes

## Problem Statement

The site navigation is broken in multiple areas, causing poor user experience. Users cannot reliably navigate between pages, and there are no comprehensive tests to catch navigation regressions.

## Background

### Current Navigation Components
- **Navbar** (`/components/Navbar.tsx`): Top navigation with logo, main links, user menu
- **Footer** (`/components/Footer.tsx`): Site-wide footer with multiple link sections
- **Admin Layout** (`/app/admin/layout.tsx`): Admin dashboard sidebar navigation
- **Creator Layout** (`/app/creators/layout.tsx`): Creator portal sidebar navigation

### Known Issues

1. **Mobile Navigation Not Implemented**
   - Navbar has a hamburger menu button but no mobile menu
   - Mobile users cannot access navigation links (Discover, Creators, Blog, Sign In)

2. **Broken/Missing Routes**
   - `/blog` - Footer links to this but route doesn't exist (redirects to external blog)
   - `/category/sims-4-mods` - Route doesn't exist
   - `/category/sims-4-cc` - Route doesn't exist
   - `/submit-mod` - Route doesn't exist (should be `/creators/submit`)

3. **Inconsistent Link Implementation**
   - Some internal links use `<a>` instead of Next.js `<Link>` (loses prefetching)
   - Some navigation uses `window.location.href` instead of `router.push()` (full page reload)

4. **Build Cache Corruption**
   - Webpack cache errors for vendor chunks (lucide-react, uuid, @vercel)
   - Requires manual `.next` folder deletion to fix

5. **No Test Coverage for Navigation Flows**
   - Existing Navbar tests only check element presence
   - No tests for actual navigation behavior
   - No tests for mobile navigation
   - No tests for protected routes

## Requirements

### Must Have

1. **Fix Mobile Navigation**
   - Implement mobile menu dropdown in Navbar
   - Include all navigation links: Discover, Creators, Blog, Sign In
   - Proper open/close behavior with animation
   - Close menu when navigating

2. **Fix Broken Routes**
   - Update Footer links to point to valid routes or remove them
   - Decide on `/blog` behavior (external redirect or internal page)
   - Create `/submit-mod` redirect to `/creators/submit` or update link

3. **Standardize Link Implementation**
   - Replace all `<a href>` with `<Link href>` for internal routes
   - Replace `window.location.href` with `router.push()` where appropriate
   - Document when full page reload is intentional (e.g., external links, logout)

4. **Create Navigation Test Suite**
   - Unit tests for Navbar component navigation
   - Unit tests for Footer component links
   - Integration tests for route protection (middleware)
   - Tests for mobile menu behavior

5. **Add Build Health Check**
   - Script to detect and fix corrupted webpack cache
   - Add to dev workflow documentation

### Should Have

6. **Breadcrumb Navigation**
   - Add breadcrumbs to mod detail pages
   - Add breadcrumbs to admin/creator portal pages
   - Consistent back navigation

7. **Active Link States**
   - Highlight current page in navigation
   - Visual feedback for active section

### Nice to Have

8. **Keyboard Navigation**
   - Implement proper focus management
   - Support keyboard shortcuts (e.g., Escape to close mobile menu)
   - ARIA labels for accessibility

9. **Navigation Analytics**
   - Track navigation patterns
   - Identify dead-end pages

## Technical Approach

### Phase 1: Fix Critical Issues

```typescript
// 1. Implement mobile menu in Navbar.tsx
// - Add state for menu open/close
// - Create MobileMenu component
// - Add animation (slide down or overlay)
// - Close on navigation or click outside

// 2. Fix Footer links
// - Audit all links
// - Update to use Link component
// - Remove or update broken routes
```

### Phase 2: Create Test Suite

```typescript
// __tests__/components/Navbar.navigation.test.tsx
describe('Navbar Navigation', () => {
  it('navigates to home when logo clicked')
  it('navigates to /top-creators when Creators link clicked')
  it('opens mobile menu on hamburger click')
  it('closes mobile menu after navigation')
  it('shows sign in link for unauthenticated users')
  it('shows user menu for authenticated users')
})

// __tests__/components/Footer.test.tsx
describe('Footer Navigation', () => {
  it('renders all navigation links')
  it('uses Next.js Link for internal routes')
  it('uses external links for blog')
  it('all internal links point to valid routes')
})

// __tests__/middleware/routeProtection.test.tsx
describe('Route Protection', () => {
  it('redirects unauthenticated users from /creators to /sign-in')
  it('redirects non-admin users from /admin to /admin/unauthorized')
  it('allows admin users to access /admin routes')
  it('allows creators to access /creators routes')
})
```

### Phase 3: Navigation Flow Tests

```typescript
// __tests__/navigation/flows.test.tsx
describe('Navigation Flows', () => {
  it('user can navigate from home to mod details and back')
  it('user can navigate through pagination')
  it('filtering updates URL without breaking back button')
  it('mobile user can access all main navigation items')
})
```

## Files to Modify

### Component Fixes
- `components/Navbar.tsx` - Add mobile menu
- `components/Footer.tsx` - Fix links
- `app/layout.tsx` - Ensure consistent navigation wrapper

### New Test Files
- `__tests__/components/Navbar.navigation.test.tsx`
- `__tests__/components/Footer.test.tsx`
- `__tests__/middleware/routeProtection.test.tsx`
- `__tests__/navigation/flows.test.tsx`

### Documentation
- `docs/DEVELOPMENT.md` - Add navigation patterns and build cache fix

## Testing Checklist

### Manual Testing
- [ ] Click every link in Navbar (desktop)
- [ ] Click every link in Footer
- [ ] Test mobile menu on phone or responsive mode
- [ ] Test protected routes as unauthenticated user
- [ ] Test protected routes as authenticated non-admin
- [ ] Test admin routes as admin user
- [ ] Test creator routes as creator user
- [ ] Verify back button works after navigation
- [ ] Verify URL updates correctly with filters

### Automated Testing
- [ ] All Navbar navigation tests pass
- [ ] All Footer tests pass
- [ ] All route protection tests pass
- [ ] All navigation flow tests pass

## Success Metrics

1. All navigation links resolve to valid pages
2. Mobile users can access full navigation
3. 100% test coverage for navigation components
4. No console errors during navigation
5. Back button works correctly throughout the site
6. Build cache corruption is detected and auto-fixed

## Build Cache Fix Script

Add to `package.json`:
```json
{
  "scripts": {
    "clean": "rm -rf .next",
    "dev:clean": "npm run clean && npm run dev"
  }
}
```

When encountering webpack cache errors, run `npm run dev:clean`.
