# Vercel Deployment Checklist

## ✅ Phase 1: Critical Environment Variables

### Database (Already Set ✓)
- [x] `DATABASE_URL` - Prisma.io Postgres
- [x] `POSTGRES_URL` - Prisma.io Postgres
- [x] `DIRECT_DATABASE_URL` - Direct connection

### Authentication (REQUIRED)
- [ ] `NEXTAUTH_URL` → Set to: `https://mhm-finds-dw5l.vercel.app`
- [ ] `NEXTAUTH_SECRET` → Generate new: `openssl rand -base64 32`
- [ ] `GOOGLE_CLIENT_ID` → Add Vercel URL to Google Console redirect URIs
- [ ] `GOOGLE_CLIENT_SECRET` → From Google Console
- [ ] `DISCORD_CLIENT_ID` → Add Vercel URL to Discord app redirect URIs
- [ ] `DISCORD_CLIENT_SECRET` → From Discord Developer Portal

### APIs (Set These Now)
- [ ] `OPENAI_API_KEY` → Get from https://platform.openai.com/api-keys
- [ ] `PERPLEXITY_API_KEY` → Use existing key from .env.local

### Production Settings
- [ ] `NODE_ENV=production`
- [ ] `DEBUG=""` (empty string)

---

## ✅ Phase 2: Performance Optimization

### Caching (HIGHLY RECOMMENDED)
**Set up Upstash Redis** (Free tier: 10K commands/day)
1. Go to https://upstash.com
2. Create free Redis database
3. Copy connection strings to Vercel:
   - [ ] `REDIS_URL` → REST URL from Upstash
   - [ ] `REDIS_TOKEN` → REST Token from Upstash

### Image Optimization (Already Working ✓)
- [x] Next.js Image component configured
- [x] Approved image domains in `next.config.js`

---

## ✅ Phase 3: Security & Monitoring

### Security Headers (Add to Vercel Project Settings)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### Error Monitoring (RECOMMENDED)
**Sentry Setup** (Free tier: 5K errors/month)
1. Create account: https://sentry.io
2. Create new Next.js project
3. Add to Vercel:
   - [ ] `SENTRY_DSN` → From Sentry project settings
   - [ ] `NEXT_PUBLIC_SENTRY_DSN` → Same as above

### Rate Limiting (Bot Protection)
**Cloudflare Turnstile** (Free, better than reCAPTCHA)
1. Go to: https://dash.cloudflare.com/
2. Add Turnstile widget
3. Add to Vercel:
   - [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - [ ] `TURNSTILE_SECRET_KEY`

---

## ✅ Phase 4: Database Management

### Run Production Migrations
```bash
# Set production DATABASE_URL temporarily
export DATABASE_URL="your-vercel-postgres-url"

# Run migrations
npx prisma migrate deploy

# Seed initial data (if needed)
npx prisma db seed
```

### Database Backup Strategy
- [ ] Enable Prisma.io automatic backups (if using Prisma.io)
- [ ] Or set up manual backup cron job
- [ ] Test restore process

---

## ✅ Phase 5: Build Optimization

### Next.js Config (Review)
Check `next.config.js` for:
- [x] `output: 'standalone'` (for smaller deployments)
- [x] `swcMinify: true` (faster builds)
- [ ] `experimental.optimizePackageImports` (reduce bundle size)

### Bundle Analysis
```bash
# Install bundle analyzer
npm install -D @next/bundle-analyzer

# Run analysis
ANALYZE=true npm run build
```

### Remove Debug Logging
- [ ] Check for debug logs in production code

---

## ✅ Phase 6: Deployment Settings (Vercel Dashboard)

### Build & Development Settings
- [ ] **Framework Preset**: Next.js
- [ ] **Build Command**: `npm run build` (or `prisma generate && next build`)
- [ ] **Output Directory**: `.next`
- [ ] **Install Command**: `npm install`
- [ ] **Node Version**: 20.x (latest LTS)

### Environment Variable Scopes
Set variables to correct environments:
- **Production**: Live site variables
- **Preview**: Same as production (or separate preview DB)
- **Development**: Local dev (pulled via `vercel env pull`)

---

## ✅ Phase 7: Continuous Deployment

### Git Integration (Vercel Auto-Deploy)
- [x] Connected to GitHub repo
- [ ] **Production Branch**: `main`
- [ ] **Preview Branches**: All other branches
- [ ] Enable "Automatically Expose System Environment Variables"

### Deployment Protection
- [ ] Enable "Deployment Protection" for production
- [ ] Require approval for production deploys (optional)

---

## ✅ Phase 8: Domain & DNS (Optional)

### Custom Domain Setup
1. Go to Vercel Project → Settings → Domains
2. Add your domain: `modvault.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. Set up redirects:
   - [ ] `modvault.com` → `www.modvault.com`
   - [ ] Enable automatic HTTPS

---

## ✅ Phase 9: Monitoring & Analytics

### Vercel Analytics (Built-in)
- [ ] Enable Vercel Analytics (free tier)
- [ ] Enable Web Vitals tracking

### Speed Insights
- [ ] Add `@vercel/speed-insights` package
- [ ] Monitor Core Web Vitals

### Logging
- [ ] Set up Vercel Log Drains (optional)
- [ ] Or use external logging service (Datadog, LogDNA)

---

## ✅ Phase 10: Testing Production

### Pre-Launch Checklist
- [ ] Test all pages load correctly
- [ ] Test authentication (Google, Discord)
- [ ] Test database reads/writes
- [ ] Test image uploads (if applicable)
- [ ] Test API endpoints
- [ ] Test scraper functionality
- [ ] Check mobile responsiveness
- [ ] Run Lighthouse audit (aim for 90+ scores)

### Load Testing (Optional)
```bash
# Install k6
brew install k6

# Run load test
k6 run loadtest.js
```

---

## ✅ Phase 11: Local Dev Environment

### Separate Local Database (RECOMMENDED)
Option 1: **Local PostgreSQL**
```bash
# Install Postgres.app (macOS)
# Or use Docker:
docker run -d \
  --name modvault-dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=modvault_dev \
  -p 5432:5432 \
  postgres:16-alpine
```

Option 2: **Vercel Postgres Branch** (Recommended)
```bash
# Create separate dev database in Vercel dashboard
# Use branch-specific connection string
```

### Local .env Setup
Keep `.env.local` for local development:
```bash
# .env.local (local dev, never commit)
DATABASE_URL="postgresql://localhost:5432/modvault_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="local-dev-secret"
USE_OLLAMA=true
OLLAMA_MODEL=llama3.2:3b
```

### Pull Production Env (for reference)
```bash
# Pull production env vars (for reference only)
vercel env pull .env.production.local

# Never commit this file!
```

---

## 🎯 Priority Order

### Do These NOW (Critical):
1. ✅ Set `NEXTAUTH_URL` and `NEXTAUTH_SECRET` in Vercel
2. ✅ Set OAuth credentials (Google, Discord) with Vercel URLs
3. ✅ Run database migrations on production DB
4. ✅ Remove debug logging from code
5. ✅ Test production deployment thoroughly

### Do These SOON (Important):
6. 🔄 Set up Upstash Redis for caching
7. 🔄 Set up Sentry for error tracking
8. 🔄 Separate local dev database
9. 🔄 Enable Vercel Analytics

### Do These LATER (Nice to Have):
10. 📊 Bundle size optimization
11. 🔒 Cloudflare Turnstile
12. 🌐 Custom domain
13. 📈 Advanced monitoring

---

## 📋 Quick Commands Reference

```bash
# Deploy to production
git push origin main

# Deploy to preview
git push origin feature-branch

# Pull env vars from Vercel
vercel env pull

# Push env vars to Vercel
vercel env add VARIABLE_NAME

# Run production build locally
NODE_ENV=production npm run build
npm run start

# Database migrations (production)
npx prisma migrate deploy

# Check deployment logs
vercel logs

# Check build logs
vercel logs --build
```

---

## 🚨 Common Issues & Fixes

### Issue: "Module not found" in production
**Fix**: Add missing dependencies to `package.json`, not `devDependencies`

### Issue: Database connection timeout
**Fix**: Check Vercel → Settings → Functions → Max Duration (increase if needed)

### Issue: Environment variables not updating
**Fix**: Redeploy after changing env vars (they're locked at build time)

### Issue: Build failing
**Fix**:
1. Check build logs in Vercel dashboard
2. Run `npm run build` locally to reproduce
3. Check for TypeScript errors
4. Ensure all dependencies are installed

---

## ✅ Final Verification

Before going live:
- [ ] All critical env vars set in Vercel
- [ ] OAuth redirect URIs include Vercel URL
- [ ] Database migrations deployed
- [ ] All pages load without errors
- [ ] Authentication works
- [ ] No console errors in browser
- [ ] Lighthouse score > 80
- [ ] Mobile responsive
- [ ] SEO meta tags set
- [ ] Error monitoring active

**Production URL**: https://mhm-finds-dw5l.vercel.app

---

Last Updated: 2025-11-27
