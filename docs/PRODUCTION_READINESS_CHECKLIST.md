# Production Readiness Checklist for MHMFinds

> **Status:** Pre-Production
> **Target Launch Date:** TBD
> **Last Updated:** November 2025

---

## Overview

This checklist ensures MHMFinds is secure, performant, and ready for production deployment on Vercel. Each item is categorized by priority and estimated effort.

**Priority Levels:**
- 🔴 **CRITICAL** - Must be completed before launch (security/stability risks)
- 🟠 **HIGH** - Should be completed before launch (user experience)
- 🟡 **MEDIUM** - Should be completed soon after launch
- 🟢 **LOW** - Nice to have, can be done later

---

## Security (CRITICAL - Required for Launch)

### Authentication & Authorization

- [ ] 🔴 **Implement admin authentication middleware** (2-3 hours)
  - File: `/lib/middleware/auth.ts`
  - Apply to all `/api/admin/**/*` routes
  - See: `SECURITY_HARDENING.md#critical-missing-admin-authentication`

- [ ] 🔴 **Audit all API routes for authentication** (1-2 hours)
  - Review each route in `/app/api`
  - Add `requireAuth()`, `requireAdmin()`, or `requireCreator()` as needed
  - Verify proper session validation

- [ ] 🔴 **Implement RBAC (Role-Based Access Control)** (3-4 hours)
  - File: `/lib/rbac.ts`
  - Define permissions for each role
  - Apply to API routes and UI components

### Rate Limiting & DDoS Protection

- [ ] 🔴 **Set up Upstash Redis** (30 minutes)
  - Create account at upstash.com
  - Create database
  - Add `REDIS_URL` to Vercel environment variables

- [ ] 🔴 **Implement Redis-based rate limiting** (3-4 hours)
  - File: `/lib/ratelimit.ts`
  - Replace in-memory rate limiting in `/api/submit-mod/route.ts`
  - Apply to all public API endpoints
  - See: `SECURITY_HARDENING.md#high-in-memory-rate-limiting`

- [ ] 🟠 **Add tiered rate limiting** (2 hours)
  - Different limits for FREE, STANDARD, PREMIUM, ADMIN users
  - Implement in API middleware

### Input Validation & Sanitization

- [ ] 🔴 **Add Zod validation to all API routes** (4-6 hours)
  - File: `/lib/validation/schemas.ts`
  - Create schemas for all input types
  - Apply to GET, POST, PUT, DELETE endpoints
  - See: `SECURITY_HARDENING.md#input-validation-on-mods-api`

- [ ] 🔴 **Implement XSS protection** (2 hours)
  - Install `isomorphic-dompurify`
  - Sanitize all user inputs
  - Escape HTML in database queries

- [ ] 🟠 **Add CSRF protection** (2-3 hours)
  - File: `/lib/csrf.ts`
  - Implement token generation/validation
  - Apply to all state-changing operations

### Secrets Management

- [ ] 🔴 **Rotate all secrets** (30 minutes)
  - Generate new `NEXTAUTH_SECRET`
  - Generate new `CRON_SECRET`
  - Update in Vercel dashboard
  - Remove hardcoded secrets from git history

- [ ] 🔴 **Validate environment variables on startup** (1 hour)
  - File: `/lib/env.ts`
  - Use Zod to validate all env vars
  - Fail fast if critical vars are missing
  - See: `SECURITY_HARDENING.md#validate-environment-variables`

- [ ] 🟠 **Set up secret rotation schedule** (planning)
  - Document rotation procedures
  - Set calendar reminders (quarterly)

### Security Headers

- [ ] 🔴 **Update Content Security Policy** (1 hour)
  - Update `next.config.js`
  - Add CSP for Stripe, OpenAI, image domains
  - Test with browser dev tools

- [ ] 🔴 **Add HSTS header** (15 minutes)
  - Update `vercel.json`
  - Add `Strict-Transport-Security` header

- [ ] 🟠 **Implement security.txt** (30 minutes)
  - Create `public/.well-known/security.txt`
  - Add vulnerability disclosure policy

### Monitoring & Logging

- [ ] 🔴 **Set up Sentry error tracking** (1 hour)
  - Install `@sentry/nextjs`
  - Configure DSN in environment variables
  - Test error reporting

- [ ] 🟠 **Implement security event logging** (2 hours)
  - File: `/lib/security/logger.ts`
  - Log authentication failures
  - Log admin actions
  - Log rate limit violations

---

## Database (CRITICAL - Required for Launch)

### Schema & Migrations

- [ ] 🔴 **Add performance indexes** (1 hour)
  - Update `prisma/schema.prisma`
  - Add indexes to Mod, User, Favorite, Download, Review
  - Run migration: `npx prisma migrate dev --name add_performance_indexes`
  - See: `PERFORMANCE_OPTIMIZATION.md#add-strategic-indexes`

- [ ] 🔴 **Configure connection pooling** (30 minutes)
  - Update `DATABASE_URL` for pooling (Neon/Supabase)
  - Add `DIRECT_DATABASE_URL` for migrations
  - Update `prisma/schema.prisma` with `directUrl`

- [ ] 🔴 **Test migrations on staging database** (1 hour)
  - Create staging database
  - Run all migrations
  - Verify schema matches production expectations
  - Test rollback procedures

- [ ] 🟠 **Fix N+1 queries** (3-4 hours)
  - Audit all API routes for N+1 patterns
  - Add `include` clauses to fetch related data
  - Use `select` to limit fields
  - See: `PERFORMANCE_OPTIMIZATION.md#fix-n1-queries`

### Backup & Recovery

- [ ] 🔴 **Set up automated database backups** (30 minutes)
  - Enable backups in database provider dashboard
  - Verify retention policy (7+ days)
  - Test restore procedure

- [ ] 🟠 **Create manual backup script** (1 hour)
  - Script to export database to SQL file
  - Store backups in S3 or similar
  - Schedule weekly manual backups

- [ ] 🟡 **Document disaster recovery plan** (2 hours)
  - Step-by-step recovery procedures
  - RTO/RPO targets
  - Contact information for emergencies

---

## API Performance (HIGH - Launch Blocker)

### Caching

- [ ] 🔴 **Implement Redis caching layer** (4-6 hours)
  - File: `/lib/cache.ts`
  - Cache trending mods
  - Cache mod details
  - Cache creator profiles
  - Cache search results
  - See: `PERFORMANCE_OPTIMIZATION.md#caching-strategy`

- [ ] 🟠 **Add cache invalidation logic** (2-3 hours)
  - Invalidate on mod updates
  - Invalidate on creator updates
  - Implement cache warming for popular content

- [ ] 🟡 **Set up cache monitoring** (1 hour)
  - Track cache hit rates
  - Monitor cache memory usage
  - Set up alerts for low hit rates

### Query Optimization

- [ ] 🟠 **Implement cursor-based pagination** (2-3 hours)
  - File: `/lib/pagination.ts`
  - Replace offset pagination
  - Apply to all list endpoints
  - See: `PERFORMANCE_OPTIMIZATION.md#implement-cursor-based-pagination`

- [ ] 🟠 **Optimize SELECT queries** (2 hours)
  - Review all Prisma queries
  - Add `select` clauses to limit fields
  - Remove unnecessary data from responses

- [ ] 🟡 **Set up database query logging** (1 hour)
  - Enable slow query logging
  - Monitor query performance
  - Set up alerts for queries >500ms

### Response Optimization

- [ ] 🟡 **Enable response compression** (30 minutes)
  - Verify gzip enabled in `next.config.js`
  - Test with large responses

- [ ] 🟡 **Implement response streaming** (3-4 hours)
  - For large datasets (exports, bulk operations)
  - See: `PERFORMANCE_OPTIMIZATION.md#add-response-streaming`

---

## Frontend Performance (MEDIUM)

### Code Optimization

- [ ] 🟠 **Implement code splitting** (2-3 hours)
  - Add dynamic imports for heavy components
  - Split modal components
  - Split admin dashboard
  - See: `PERFORMANCE_OPTIMIZATION.md#code-splitting--lazy-loading`

- [ ] 🟡 **Add lazy loading for images** (1 hour)
  - Use Next.js Image component everywhere
  - Add blur placeholders
  - Configure image optimization in `next.config.js`

- [ ] 🟡 **Implement infinite scroll** (3-4 hours)
  - Replace pagination with infinite scroll
  - Use Intersection Observer
  - Add skeleton loaders

### Bundle Size

- [ ] 🟡 **Analyze bundle size** (1 hour)
  - Run: `npm run build` and analyze output
  - Use `@next/bundle-analyzer`
  - Identify large dependencies

- [ ] 🟡 **Tree-shake unused code** (2-3 hours)
  - Remove unused dependencies
  - Remove unused imports
  - Use dynamic imports for conditionally loaded code

---

## Deployment (CRITICAL - Required for Launch)

### Vercel Configuration

- [ ] 🔴 **Create `vercel.json`** (30 minutes)
  - Add build configuration
  - Configure function timeouts
  - Add security headers
  - Set up cron jobs
  - See: `VERCEL_DEPLOYMENT.md#vercel-configuration`

- [ ] 🔴 **Configure all environment variables in Vercel** (1-2 hours)
  - Use `.env.example` as reference
  - Set for Production, Preview, Development environments
  - Double-check all secrets are correct

- [ ] 🔴 **Set up custom domain** (30 minutes)
  - Add domain in Vercel dashboard
  - Update DNS records
  - Wait for SSL certificate provisioning
  - Update `NEXTAUTH_URL`

### OAuth Configuration

- [ ] 🔴 **Update Google OAuth redirect URLs** (15 minutes)
  - Add production domain to Google Cloud Console
  - Add preview domain (*.vercel.app)

- [ ] 🔴 **Update Discord OAuth redirect URLs** (15 minutes)
  - Add production domain to Discord Developer Portal
  - Add preview domain

### Stripe Configuration

- [ ] 🔴 **Create Stripe webhook for production** (30 minutes)
  - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
  - Select events to listen to
  - Copy webhook secret to Vercel

- [ ] 🔴 **Create Stripe products & prices** (1 hour)
  - Create Standard Monthly/Yearly products
  - Create Premium Monthly/Yearly products
  - Copy price IDs to environment variables

### Database Migration

- [ ] 🔴 **Run migrations on production database** (30 minutes)
  - Connect to production DB
  - Run: `npx prisma migrate deploy`
  - Verify schema
  - See: `VERCEL_DEPLOYMENT.md#run-database-migrations`

- [ ] 🟠 **Seed production database** (1 hour)
  - Create initial categories
  - Create initial content sources
  - Add sample data (if needed)

---

## Background Jobs (HIGH)

### Cron Jobs

- [ ] 🟠 **Move content aggregation to cron** (2-3 hours)
  - Create `/app/api/cron/scrape-content/route.ts`
  - Add authentication with `CRON_SECRET`
  - Configure schedule in `vercel.json`
  - See: `PERFORMANCE_OPTIMIZATION.md#move-content-aggregation-to-background`

- [ ] 🟠 **Create usage reset cron job** (1-2 hours)
  - Create `/app/api/cron/reset-usage/route.ts`
  - Reset subscription usage counters monthly
  - Schedule for midnight UTC

- [ ] 🟡 **Set up Upstash QStash for job queue** (3-4 hours)
  - Install `@upstash/qstash`
  - Implement job queue for async tasks
  - Move AI embedding generation to queue

---

## Monitoring & Analytics (HIGH)

### Error Tracking

- [ ] 🔴 **Configure Sentry** (1 hour)
  - See Security section above
  - Set up error alerts
  - Configure performance monitoring

### Performance Monitoring

- [ ] 🟠 **Enable Vercel Analytics** (5 minutes)
  - Enable in Vercel dashboard
  - Enable Web Analytics
  - Enable Speed Insights

- [ ] 🟡 **Set up custom metrics** (2-3 hours)
  - File: `/lib/metrics.ts`
  - Track query times
  - Track cache hit rates
  - Track API response times
  - See: `PERFORMANCE_OPTIMIZATION.md#implement-custom-metrics`

### Uptime Monitoring

- [ ] 🟠 **Set up uptime monitoring** (30 minutes)
  - Use UptimeRobot (free)
  - Monitor: `/api/health`
  - Set up email alerts
  - Check every 5 minutes

- [ ] 🟠 **Create health check endpoint** (30 minutes)
  - File: `/app/api/health/route.ts`
  - Check database connection
  - Check Redis connection
  - Return status JSON

---

## Documentation (MEDIUM)

### User Documentation

- [ ] 🟡 **Create user guide** (4-6 hours)
  - How to search for mods
  - How to favorite/download mods
  - How to upgrade subscription
  - How to submit mods

- [ ] 🟡 **Create creator guide** (3-4 hours)
  - How to create creator profile
  - How to monetize content
  - Best practices for mod submissions

### Developer Documentation

- [x] ✅ **Vercel deployment guide** (COMPLETED)
  - File: `docs/VERCEL_DEPLOYMENT.md`

- [x] ✅ **Security hardening guide** (COMPLETED)
  - File: `docs/SECURITY_HARDENING.md`

- [x] ✅ **Performance optimization guide** (COMPLETED)
  - File: `docs/PERFORMANCE_OPTIMIZATION.md`

- [ ] 🟡 **API documentation** (6-8 hours)
  - Document all endpoints
  - Request/response examples
  - Authentication requirements
  - Rate limits

- [ ] 🟡 **Update README.md** (1 hour)
  - Update deployment status
  - Update feature list
  - Update tech stack
  - Add badges (build status, license, etc.)

### Legal Documentation

- [ ] 🟠 **Create Privacy Policy** (2-3 hours)
  - Data collection practices
  - Cookie usage
  - Third-party services
  - User rights (GDPR compliance)

- [ ] 🟠 **Create Terms of Service** (2-3 hours)
  - User responsibilities
  - Content guidelines
  - Subscription terms
  - Refund policy

- [ ] 🟡 **Create DMCA Policy** (1-2 hours)
  - Copyright infringement reporting
  - Takedown procedures

---

## Testing (HIGH - Launch Blocker)

### Functional Testing

- [ ] 🔴 **Test all authentication flows** (2 hours)
  - Google OAuth signup/login
  - Discord OAuth signup/login
  - Session persistence
  - Logout functionality

- [ ] 🔴 **Test all API endpoints** (3-4 hours)
  - All CRUD operations
  - Error handling
  - Rate limiting
  - Authentication/authorization

- [ ] 🔴 **Test subscription flow** (2-3 hours)
  - Stripe checkout
  - Webhook handling
  - Subscription upgrades/downgrades
  - Cancellations

- [ ] 🟠 **Test mod submission flow** (1 hour)
  - Form validation
  - Rate limiting
  - Admin approval workflow

### Performance Testing

- [ ] 🟠 **Run load tests** (2-3 hours)
  - Install k6
  - Create test scripts
  - Test with 100+ concurrent users
  - Identify bottlenecks
  - See: `PERFORMANCE_OPTIMIZATION.md#load-testing`

- [ ] 🟡 **Test database performance** (2 hours)
  - Monitor query times under load
  - Verify indexes are being used
  - Test connection pool limits

### Security Testing

- [ ] 🔴 **Run security audit** (2-3 hours)
  - Test admin route authentication
  - Test rate limiting
  - Test input validation
  - Test CSRF protection
  - Attempt SQL injection
  - Attempt XSS attacks

- [ ] 🟠 **Run `npm audit`** (15 minutes)
  - Check for vulnerable dependencies
  - Update or fix vulnerabilities

- [ ] 🟡 **Consider penetration testing** (planning)
  - Hire third-party security firm
  - Or use automated tools (OWASP ZAP)

### Browser Testing

- [ ] 🟠 **Test on major browsers** (2 hours)
  - Chrome (desktop/mobile)
  - Safari (desktop/mobile)
  - Firefox (desktop/mobile)
  - Edge (desktop)

- [ ] 🟡 **Test accessibility** (2 hours)
  - Screen reader compatibility
  - Keyboard navigation
  - Color contrast
  - WCAG 2.1 AA compliance

---

## Post-Launch (Within 1 Week)

### Monitoring

- [ ] 🟠 **Monitor error rates** (ongoing)
  - Check Sentry daily
  - Fix critical errors within 24 hours

- [ ] 🟠 **Monitor performance** (ongoing)
  - Check Vercel Analytics
  - Review slow API endpoints
  - Optimize if needed

- [ ] 🟠 **Monitor costs** (ongoing)
  - Track Vercel usage
  - Track database costs
  - Track OpenAI API usage
  - Track Stripe fees

### Optimization

- [ ] 🟡 **Review and optimize based on real usage** (ongoing)
  - Identify popular features
  - Optimize hot paths
  - Remove unused features

### Marketing & Growth

- [ ] 🟡 **Set up Google Analytics** (30 minutes)
  - Add tracking ID
  - Set up conversion goals

- [ ] 🟡 **Set up SEO** (4-6 hours)
  - Add meta tags
  - Create sitemap.xml
  - Submit to Google Search Console
  - Optimize page titles/descriptions

---

## Estimated Time to Launch

### Critical Path (Must Complete)

| Category | Time Estimate |
|----------|---------------|
| Security | 20-25 hours |
| Database | 8-10 hours |
| API Performance | 10-12 hours |
| Deployment | 5-6 hours |
| Testing | 10-12 hours |
| **TOTAL** | **53-65 hours** |

### Recommended Before Launch

| Category | Time Estimate |
|----------|---------------|
| Frontend Performance | 8-10 hours |
| Background Jobs | 6-8 hours |
| Monitoring | 4-5 hours |
| Documentation (Legal) | 5-7 hours |
| **TOTAL** | **23-30 hours** |

### Grand Total

**76-95 hours** (~2-3 weeks of full-time work)

---

## Launch Day Checklist

### Pre-Launch (24 hours before)

- [ ] All critical tasks completed
- [ ] Load tests passed
- [ ] Security audit completed
- [ ] Backups configured and tested
- [ ] Monitoring alerts configured
- [ ] Team briefed on launch procedures

### Launch

- [ ] Deploy to production
- [ ] Verify deployment successful
- [ ] Run smoke tests
- [ ] Monitor error rates (first hour)
- [ ] Monitor performance (first hour)
- [ ] Verify Stripe webhooks working
- [ ] Verify OAuth working
- [ ] Test critical user flows

### Post-Launch (First 48 hours)

- [ ] Monitor Sentry for errors
- [ ] Monitor Vercel logs
- [ ] Monitor database performance
- [ ] Monitor user feedback
- [ ] Fix critical issues immediately
- [ ] Document any issues for retrospective

---

## Success Criteria

Launch is considered successful when:

- [ ] Zero critical security vulnerabilities
- [ ] API response times <200ms (P95)
- [ ] Error rate <0.1%
- [ ] Uptime >99.9% (first week)
- [ ] Payment processing working 100%
- [ ] Authentication working 100%
- [ ] All critical user flows tested and working

---

## Support & Escalation

**Production Issues:**
- Critical (site down): Fix immediately
- High (feature broken): Fix within 4 hours
- Medium (degraded UX): Fix within 24 hours
- Low (minor bug): Fix within 1 week

**Contact:**
- Development lead: [email]
- DevOps contact: [email]
- Security contact: security@yourdomain.com

---

**Last Updated:** November 2025
**Next Review:** Before launch
**Document Owner:** Engineering Team

This checklist should be reviewed and updated throughout the development process. Check off items as completed and update time estimates based on actual progress.
