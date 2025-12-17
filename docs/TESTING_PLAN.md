# MHMFinds Testing Plan

> **Created:** December 17, 2024  
> **Stack:** Vitest + React Testing Library + MSW  
> **Goal:** Ensure core functionality doesn't break when making changes

---

## 📊 Test Coverage Strategy

### Priority Levels

| Priority | Area | Why | Coverage Target |
|----------|------|-----|-----------------|
| **P0 - Critical** | API Routes (mods, auth) | Revenue-affecting | 90%+ |
| **P0 - Critical** | Cache Service | Performance-critical | 90%+ |
| **P0 - Critical** | Subscription/Payment | Money handling | 95%+ |
| **P1 - High** | Core Components | User-facing | 80%+ |
| **P1 - High** | Authentication | Security | 85%+ |
| **P2 - Medium** | Utility Functions | Support code | 70%+ |
| **P3 - Low** | Static Pages | Low change rate | 50%+ |

---

## 🧪 Test Categories

### 1. Unit Tests
- Utility functions
- Cache key generation
- Data transformations
- Validation functions

### 2. Integration Tests  
- API route handlers
- Database operations (with test DB)
- Cache operations (mocked Redis)

### 3. Component Tests
- React components with RTL
- User interactions
- Conditional rendering

### 4. E2E Tests (Future)
- Critical user flows
- Playwright for browser automation

---

## 📁 Test File Structure

```
/Users/eputnam/java_projects/MHMFinds/
├── __tests__/
│   ├── unit/
│   │   ├── cache.test.ts
│   │   ├── api.test.ts
│   │   └── utils.test.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── mods.test.ts
│   │   │   ├── categories.test.ts
│   │   │   └── subscription.test.ts
│   │   └── services/
│   │       └── cacheService.test.ts
│   ├── components/
│   │   ├── ModCard.test.tsx
│   │   ├── ModGrid.test.tsx
│   │   ├── Hero.test.tsx
│   │   └── FilterBar.test.tsx
│   └── setup/
│       ├── setup.ts
│       └── mocks/
│           ├── prisma.ts
│           ├── redis.ts
│           └── handlers.ts
├── vitest.config.ts
└── package.json (updated with test scripts)
```

---

## 🎯 Core Test Cases

### API Route: `/api/mods` (CRITICAL)

```typescript
describe('GET /api/mods', () => {
  it('returns paginated mods list')
  it('filters by gameVersion correctly')
  it('filters by category correctly')
  it('returns cached response when available')
  it('includes correct pagination metadata')
  it('filters out NSFW content by default')
  it('only returns verified mods')
  it('handles search query parameter')
  it('supports sorting by downloads, rating, date')
  it('returns facets for filtering')
})
```

### Cache Service (CRITICAL)

```typescript
describe('CacheService', () => {
  describe('generateDeterministicKey', () => {
    it('produces same key regardless of object property order')
    it('excludes null/undefined values from key')
    it('handles nested objects')
  })
  
  describe('getModsList / setModsList', () => {
    it('caches and retrieves mod list correctly')
    it('expires after TTL')
    it('returns null when cache miss')
  })
})
```

### ModCard Component (HIGH)

```typescript
describe('ModCard', () => {
  it('renders mod title and description')
  it('shows creator handle when available')
  it('displays correct price (Free or $X.XX)')
  it('triggers onClick when card is clicked')
  it('toggles favorite state on heart click')
  it('shows rating when available')
  it('displays download count')
})
```

### Subscription Flow (CRITICAL)

```typescript
describe('ProtectedDownloadButton', () => {
  it('allows download when user has remaining clicks')
  it('blocks download when user is at limit')
  it('shows upgrade modal when limit reached')
  it('tracks click when download initiated')
  it('works for premium users without limit')
})
```

---

## ⚙️ Configuration Files

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        '**/*.d.ts',
        'scripts/**',
        'prisma/**'
      ]
    },
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
})
```

### Test Setup File

```typescript
// __tests__/setup/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))
```

---

## 📦 Dependencies to Install

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```

---

## 🚀 NPM Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## 📋 Implementation Phases

### Phase 1: Setup (Today)
- [x] Create testing plan
- [ ] Install dependencies
- [ ] Configure Vitest
- [ ] Create test setup files
- [ ] Create mocks for Prisma, Redis, NextAuth

### Phase 2: Critical Path Tests
- [ ] Cache service tests
- [ ] API mods route tests
- [ ] Subscription tracking tests

### Phase 3: Component Tests
- [ ] ModCard tests
- [ ] ModGrid tests
- [ ] Hero search tests
- [ ] FilterBar tests

### Phase 4: Integration Tests
- [ ] Full search flow
- [ ] Pagination
- [ ] Favorites

### Phase 5: CI Integration
- [ ] Add to Vercel build (optional)
- [ ] GitHub Actions workflow

---

**Last Updated:** December 17, 2024
