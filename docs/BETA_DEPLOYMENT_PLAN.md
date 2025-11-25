# Beta Deployment Plan - Option C (1 Week Timeline)

> **Status:** In Progress
> **Target:** Beta Launch on Vercel
> **Expected Traffic:** ~1,000 concurrent users (scalable to 10K+)
> **Last Updated:** November 24, 2025

---

## Overview

This plan outlines the **minimal viable launch** strategy (Option C) to deploy MHMFinds as a public beta. This approach balances speed-to-market with production readiness, implementing critical performance and security features while deferring nice-to-haves.

---

## ✅ Completed Tasks (Phase 1)

### UI/UX Improvements
- [x] Add clear button (X) to search bar
- [x] Add "Clear All Filters" button in FilterBar
- [x] Display active filter pills with color coding
- [x] Improve filter reset UX

### Database Performance
- [x] Add 26 critical performance indexes
  - Mod table: verified/safe/newest, category, creator, source lookups
  - User, Favorite, Review, Download tables optimized
  - Composite indexes for common query patterns
- [x] Create migration: `20251125011604_add_performance_indexes`
- [x] **Expected improvement:** 50-70% faster queries

**Git Commit:** `4ce86d0` - Phase 1 UI improvements and database performance indexes

---

## 🔲 Remaining Tasks (Option C - 1 Week)

### Day 1-2: Redis Caching Layer (~1 day)

**Priority:** 🔴 CRITICAL

**Goal:** Reduce database load by 80-90%

**Tasks:**
- [ ] Set up Upstash Redis account (free tier: 10K requests/day)
  - Go to: https://upstash.com
  - Create database
  - Copy `REDIS_URL` and `REDIS_TOKEN`
- [ ] Install Redis client: `npm install @upstash/redis`
- [ ] Create `/lib/cache.ts` service
  - Cache mod list queries (TTL: 5 minutes)
  - Cache mod details (TTL: 10 minutes)
  - Cache creator profiles (TTL: 30 minutes)
  - Cache search results (TTL: 5 minutes)
- [ ] Implement cache-aside pattern in `/app/api/mods/route.ts`
- [ ] Add cache invalidation on mod updates
- [ ] Test cache hit rates (target: >80%)

**Files to modify:**
- `lib/cache.ts` (new)
- `app/api/mods/route.ts`
- `.env.example` (add REDIS_URL, REDIS_TOKEN)

**Estimated Time:** 6-8 hours

---

### Day 2: Connection Pooling (~1 hour)

**Priority:** 🔴 CRITICAL

**Goal:** Prevent database connection exhaustion

**Tasks:**
- [ ] Update `DATABASE_URL` in Vercel environment variables
  - Add `?pgbouncer=true&connection_limit=10` to connection string
  - OR use Neon's connection pooling URL
- [ ] Add `DIRECT_DATABASE_URL` for migrations
- [ ] Update `prisma/schema.prisma` with `directUrl`
- [ ] Test connection pooling locally
- [ ] Verify max connections don't exceed database limits

**Files to modify:**
- `prisma/schema.prisma`
- `.env.example`
- Vercel environment variables

**Estimated Time:** 1 hour

---

### Day 3: Admin Authentication Middleware (~2 hours)

**Priority:** 🔴 CRITICAL SECURITY

**Goal:** Protect admin routes from unauthorized access

**Tasks:**
- [ ] Create `/lib/middleware/auth.ts`
  - `requireAuth()` - Verify user is logged in
  - `requireAdmin()` - Verify user has isAdmin=true
  - `requireCreator()` - Verify user has isCreator=true
- [ ] Apply middleware to all `/app/api/admin/**` routes
- [ ] Apply middleware to `/app/api/creators/**` routes
- [ ] Test unauthorized access is blocked (401/403 responses)
- [ ] Document authentication requirements in API docs

**Files to modify:**
- `lib/middleware/auth.ts` (new)
- `app/api/admin/*/route.ts` (all admin routes)
- `app/api/creators/*/route.ts` (all creator routes)

**Estimated Time:** 2-3 hours

---

### Day 3-4: Input Validation with Zod (~3 hours)

**Priority:** 🔴 CRITICAL SECURITY

**Goal:** Prevent malicious/malformed input

**Tasks:**
- [ ] Create `/lib/validation/schemas.ts`
  - `ModCreateSchema` - Validate mod creation
  - `ModUpdateSchema` - Validate mod updates
  - `SubmissionSchema` - Validate mod submissions
  - `ReviewSchema` - Validate review submissions
- [ ] Apply validation to POST/PUT endpoints:
  - `/app/api/mods/route.ts` (POST)
  - `/app/api/mods/[id]/route.ts` (PUT)
  - `/app/api/submit-mod/route.ts` (POST)
  - `/app/api/admin/submissions/[id]/route.ts` (POST)
- [ ] Return 400 errors with validation details
- [ ] Test with invalid inputs

**Files to modify:**
- `lib/validation/schemas.ts` (new)
- `app/api/mods/route.ts`
- `app/api/mods/[id]/route.ts`
- `app/api/submit-mod/route.ts`

**Estimated Time:** 3-4 hours

---

### Day 4: Error Monitoring with Sentry (~1 hour)

**Priority:** 🟠 HIGH

**Goal:** Catch and track production errors

**Tasks:**
- [ ] Create Sentry account (free tier available)
- [ ] Install Sentry: `npm install @sentry/nextjs`
- [ ] Run: `npx @sentry/wizard@latest -i nextjs`
- [ ] Add `SENTRY_DSN` to environment variables
- [ ] Configure error sampling (100% for beta)
- [ ] Test error reporting with intentional error
- [ ] Set up email alerts for critical errors

**Files to modify:**
- `sentry.client.config.ts` (new)
- `sentry.server.config.ts` (new)
- `next.config.js`
- `.env.example`

**Estimated Time:** 1 hour

---

### Day 5: Rate Limiting (Redis-based) (~2 hours)

**Priority:** 🟠 HIGH

**Goal:** Prevent abuse and DDoS attacks

**Tasks:**
- [ ] Create `/lib/ratelimit.ts` using Upstash Redis
- [ ] Implement sliding window rate limiting
  - Public endpoints: 100 requests/15min per IP
  - Authenticated: 500 requests/15min per user
  - API key endpoints: 1000 requests/15min
- [ ] Apply to critical endpoints:
  - `/app/api/mods` (GET)
  - `/app/api/submit-mod` (POST)
  - `/app/api/auth/**` (all auth endpoints)
- [ ] Return 429 with Retry-After header
- [ ] Test rate limit enforcement

**Files to modify:**
- `lib/ratelimit.ts` (new)
- `app/api/mods/route.ts`
- `app/api/submit-mod/route.ts`

**Estimated Time:** 2-3 hours

---

### Day 5-6: Simple Load Testing (~2 hours)

**Priority:** 🟠 HIGH

**Goal:** Verify performance under load

**Tasks:**
- [ ] Install k6: https://k6.io/docs/getting-started/installation/
- [ ] Create `load-tests/mods-api.js`
  - Test: 100 concurrent users for 5 minutes
  - Endpoint: `/api/mods?page=1&limit=20`
  - Success criteria: P95 < 200ms, error rate < 1%
- [ ] Run test against local dev server
- [ ] Identify bottlenecks
- [ ] Re-run after optimizations
- [ ] Document results

**Files to create:**
- `load-tests/mods-api.js` (new)
- `load-tests/README.md` (new)

**Estimated Time:** 2 hours

---

### Day 6-7: Vercel Deployment Configuration (~3 hours)

**Priority:** 🔴 CRITICAL

**Goal:** Production-ready Vercel deployment

**Tasks:**
- [ ] Create `vercel.json` with:
  - Build configuration
  - Function timeouts (10s for API routes)
  - Security headers (HSTS, X-Frame-Options, etc.)
  - CORS settings
- [ ] Set up all environment variables in Vercel:
  - `DATABASE_URL` (with pgbouncer)
  - `DIRECT_DATABASE_URL`
  - `NEXTAUTH_SECRET` (generate new)
  - `NEXTAUTH_URL` (production domain)
  - `REDIS_URL`, `REDIS_TOKEN`
  - `SENTRY_DSN`
  - OAuth credentials (Google, Discord)
  - OpenAI API key
  - CurseForge API key
- [ ] Update OAuth redirect URLs:
  - Google Cloud Console
  - Discord Developer Portal
- [ ] Set up custom domain (if available)
- [ ] Run production database migrations

**Files to create:**
- `vercel.json` (new)

**Estimated Time:** 2-3 hours

---

## 🧪 Pre-Launch Testing Checklist

### Functional Tests
- [ ] Sign up with Google OAuth
- [ ] Sign up with Discord OAuth
- [ ] Search for mods
- [ ] Filter by category
- [ ] Sort by downloads/rating/newest
- [ ] View mod details modal
- [ ] Favorite a mod (authenticated)
- [ ] Submit a mod (rate limited)
- [ ] Admin: Approve submission (authenticated + isAdmin)

### Performance Tests
- [ ] Homepage loads in < 2s
- [ ] API `/api/mods` responds in < 200ms (cached)
- [ ] API `/api/mods` responds in < 500ms (uncached)
- [ ] Load test: 100 concurrent users, 0% errors

### Security Tests
- [ ] Admin routes blocked without authentication
- [ ] Rate limiting enforced (429 after limit)
- [ ] Invalid input rejected (400 with Zod errors)
- [ ] CSRF protection working (if implemented)

---

## 🚀 Launch Day Checklist

### Pre-Launch (24 hours before)
- [ ] All Option C tasks completed
- [ ] Load tests passed
- [ ] Security tests passed
- [ ] Database backups enabled
- [ ] Error monitoring configured
- [ ] Team briefed on launch plan

### Launch
- [ ] Deploy to Vercel production
- [ ] Run database migrations (if needed)
- [ ] Verify deployment successful
- [ ] Test critical user flows
- [ ] Monitor error rates (first 30 minutes)
- [ ] Monitor performance metrics
- [ ] Announce beta launch (social media, email list, etc.)

### Post-Launch (First 48 Hours)
- [ ] Monitor Sentry for errors (fix critical within 4 hours)
- [ ] Monitor Vercel Analytics for performance
- [ ] Monitor database query performance
- [ ] Monitor cache hit rates (target: >80%)
- [ ] Gather user feedback
- [ ] Document issues for Phase 2

---

## 📊 Success Criteria (Beta)

The beta launch is successful if:

- [ ] **Uptime:** >99% in first week
- [ ] **API Response Time (P95):** <500ms
- [ ] **Error Rate:** <1%
- [ ] **Authentication:** 100% working (Google + Discord OAuth)
- [ ] **Critical Bugs:** None blocking user flows
- [ ] **User Feedback:** Mostly positive (>70% positive sentiment)

---

## 🔄 Phase 2: Production-Ready (Post-Beta)

After beta validation, implement:

1. **Advanced Caching** (1-2 days)
   - Edge caching for static content
   - Stale-while-revalidate patterns
   - Cache warming for popular mods

2. **AI Search Optimization** (2-3 days)
   - Pre-compute embeddings (background job)
   - Cache embedding results
   - Implement vector similarity search

3. **Full Test Suite** (3-4 days)
   - Unit tests for critical functions
   - Integration tests for API routes
   - E2E tests with Playwright

4. **Advanced Security** (2-3 days)
   - CSRF protection
   - XSS sanitization (DOMPurify)
   - SQL injection prevention audit

5. **Monitoring & Analytics** (1-2 days)
   - Custom metrics dashboard
   - Performance budgets
   - User behavior analytics

**Total Phase 2 Time:** 2-3 weeks

---

## 🛠️ Quick Reference

### Environment Variables Needed

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://yourdomain.com"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."

# Redis
REDIS_URL="..."
REDIS_TOKEN="..."

# Monitoring
SENTRY_DSN="..."

# APIs
OPENAI_API_KEY="..."
CURSEFORGE_API_KEY="..."
```

### Critical Commands

```bash
# Database
npm run db:migrate              # Create migration
npm run db:push                 # Push schema without migration
npm run db:generate             # Generate Prisma client

# Development
npm run dev                     # Start dev server
npm run build                   # Build for production
npm run type-check              # Check TypeScript

# Load Testing
k6 run load-tests/mods-api.js   # Run load test
```

---

## 📝 Notes

- **Database:** PostgreSQL on Neon (free tier: 512MB, 10GB transfer/month)
- **Redis:** Upstash (free tier: 10K requests/day)
- **Sentry:** Free tier (5K events/month)
- **Vercel:** Hobby tier (100GB bandwidth, 6K serverless hours/month)

**Estimated Total Cost (Beta):** $0-10/month

---

**Document Owner:** Engineering Team
**Next Review:** After beta launch
**Feedback:** Report issues to GitHub or team Slack

---

*This document should be updated as tasks are completed. Check off items and add notes as you progress through the deployment.*
