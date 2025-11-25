# Complete Vercel Deployment Guide for MHMFinds

> **Last Updated:** November 2025
> **Status:** Production Ready
> **Estimated Deployment Time:** 2-3 hours

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Database Setup (PostgreSQL)](#database-setup)
4. [Environment Variables](#environment-variables)
5. [Vercel Configuration](#vercel-configuration)
6. [Deployment Steps](#deployment-steps)
7. [Post-Deployment Tasks](#post-deployment-tasks)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Services

- **Vercel Account** ([vercel.com](https://vercel.com))
- **GitHub Account** (repository must be pushed to GitHub)
- **PostgreSQL Database** (choose one):
  - Vercel Postgres (recommended for simplicity)
  - Neon (generous free tier, excellent for serverless)
  - Supabase (includes additional features)
  - AWS RDS (production-grade but more complex)
- **Stripe Account** (for monetization)
- **OpenAI API Key** (for AI features)
- **OAuth Providers**:
  - Google Cloud Console (OAuth)
  - Discord Developer Portal (OAuth)

### Optional but Recommended

- **Upstash Redis** (for rate limiting and caching - critical for production)
- **Sentry Account** (error monitoring)
- **SendGrid/Resend** (email notifications)
- **Cloudflare** (CDN and DDoS protection)

---

## Pre-Deployment Checklist

### Code Quality & Security

- [ ] Run `npm run type-check` - ensure no TypeScript errors
- [ ] Run `npm run lint` - fix all linting issues
- [ ] Run `npm run build` - verify production build succeeds
- [ ] Remove all console.log statements from production code
- [ ] Review and fix security issues in `SECURITY_HARDENING.md`
- [ ] Ensure all sensitive data uses environment variables
- [ ] Verify `.env` is in `.gitignore`
- [ ] Create `.env.example` with placeholder values

### Database

- [ ] Review Prisma schema for production readiness
- [ ] Add necessary database indexes (see Performance Optimization guide)
- [ ] Test migrations on staging database
- [ ] Plan database backup strategy
- [ ] Configure connection pooling

### Dependencies

- [ ] Review and update dependencies: `npm outdated`
- [ ] Check for security vulnerabilities: `npm audit`
- [ ] Ensure production dependencies are in `dependencies` (not `devDependencies`)

---

## Database Setup

### Option 1: Vercel Postgres (Recommended for Beginners)

1. Go to your Vercel dashboard → Storage → Create Database
2. Select PostgreSQL
3. Choose a region (same as your Vercel deployment for lowest latency)
4. Copy the `DATABASE_URL` connection string
5. Vercel will automatically set the environment variable

### Option 2: Neon (Recommended for Production)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Select region closest to your Vercel deployment
4. Copy the connection string (should look like):
   ```
   postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Enable connection pooling and copy the pooled connection string
6. Add to Vercel environment variables

### Option 3: Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection String
3. Copy the "Connection Pooling" URL (uses port 6543)
4. Enable SSL mode
5. Add to Vercel environment variables

### Database Configuration Best Practices

```env
# Use connection pooling for serverless (Neon/Supabase)
DATABASE_URL="postgresql://..."

# Prisma connection pool settings (add to schema.prisma)
# datasource db {
#   provider = "postgresql"
#   url = env("DATABASE_URL")
#   directUrl = env("DIRECT_DATABASE_URL") # For migrations
#   relationMode = "prisma"
# }
```

---

## Environment Variables

### Creating Environment Variables in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable below
3. Select environments: Production, Preview, Development

### Required Environment Variables

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DIRECT_DATABASE_URL="postgresql://..." # For migrations (Neon/Supabase only)

# ============================================
# NEXTAUTH
# ============================================
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# ============================================
# OAUTH PROVIDERS
# ============================================
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxxxxxxx"

DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"

# ============================================
# OPENAI (AI Features)
# ============================================
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxx"

# ============================================
# STRIPE (Monetization)
# ============================================
STRIPE_SECRET_KEY="sk_live_xxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_xxxxxxxxxxxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxx"

# Stripe Price IDs (create in Stripe Dashboard)
STRIPE_STANDARD_MONTHLY_PRICE_ID="price_xxxxxxxxxxxxxxxxxxxxx"
STRIPE_STANDARD_YEARLY_PRICE_ID="price_xxxxxxxxxxxxxxxxxxxxx"
STRIPE_PREMIUM_MONTHLY_PRICE_ID="price_xxxxxxxxxxxxxxxxxxxxx"
STRIPE_PREMIUM_YEARLY_PRICE_ID="price_xxxxxxxxxxxxxxxxxxxxx"

# ============================================
# REDIS (Critical for Production)
# ============================================
REDIS_URL="redis://default:xxxxx@flying-bird-12345.upstash.io:6379"

# ============================================
# MONITORING (Highly Recommended)
# ============================================
SENTRY_DSN="https://xxxxx@o123456.ingest.sentry.io/123456"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@o123456.ingest.sentry.io/123456"

# ============================================
# EMAIL (For notifications)
# ============================================
SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxxx"
FROM_EMAIL="noreply@yourdomain.com"

# ============================================
# SECURITY
# ============================================
CRON_SECRET="generate-random-secret-for-cron-endpoints"
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"

# ============================================
# NODE ENVIRONMENT
# ============================================
NODE_ENV="production"
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate CRON_SECRET
openssl rand -hex 32
```

### Setting Up OAuth Providers

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to Credentials → Create Credentials → OAuth Client ID
5. Application type: Web application
6. Authorized redirect URIs:
   - `https://your-domain.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
7. Copy Client ID and Client Secret

#### Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application
3. Go to OAuth2 → General
4. Add Redirects:
   - `https://your-domain.vercel.app/api/auth/callback/discord`
   - `http://localhost:3000/api/auth/callback/discord`
5. Copy Client ID and Client Secret

---

## Vercel Configuration

### vercel.json Configuration

Create `vercel.json` in your project root:

```json
{
  "buildCommand": "npx prisma generate && npm run build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "crons": [
    {
      "path": "/api/cron/reset-usage",
      "schedule": "0 0 * * *"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-DNS-Prefetch-Control",
          "value": "on"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

### Update package.json

Add Vercel-specific scripts:

```json
{
  "scripts": {
    "vercel-build": "npx prisma generate && npx prisma migrate deploy && npm run build",
    "postinstall": "npx prisma generate"
  }
}
```

### Update next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification
  swcMinify: true,

  // Optimize images
  images: {
    domains: [
      'www.thesimsresource.com',
      'simsdom.com',
      'sims4studio.com',
      'cdn.patreon.com',
      'curseforge.com',
      'media.tumblr.com',
      'images.unsplash.com',
      'via.placeholder.com',
      'musthavemods.com'
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.stripe.com https://api.openai.com",
              "frame-src 'self' https://js.stripe.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Optimize production build
  productionBrowserSourceMaps: false,

  // Enable React strict mode
  reactStrictMode: true,

  // Optimize output
  output: 'standalone',
};

module.exports = nextConfig;
```

---

## Deployment Steps

### Step 1: Prepare Repository

```bash
# Ensure you're on the main branch
git checkout main

# Commit all changes
git add .
git commit -m "chore: prepare for production deployment"

# Push to GitHub
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Select "Import Git Repository"
3. Choose your GitHub repository
4. Click "Import"

### Step 3: Configure Build Settings

Vercel should auto-detect Next.js. Verify:

- **Framework Preset:** Next.js
- **Build Command:** `npm run vercel-build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Root Directory:** `./`

### Step 4: Add Environment Variables

1. In the import flow, click "Environment Variables"
2. Add all variables from the section above
3. Or bulk add: Click "Add Another" → Paste `.env` contents
4. Ensure variables are set for "Production" environment

### Step 5: Deploy

1. Click "Deploy"
2. Wait for deployment (first deploy takes 3-5 minutes)
3. Vercel will:
   - Install dependencies
   - Generate Prisma client
   - Run database migrations
   - Build Next.js application
   - Deploy to edge network

### Step 6: Run Database Migrations

**IMPORTANT:** Migrations should be run during the build process, but verify:

```bash
# Option 1: Via Vercel CLI (recommended)
npm i -g vercel
vercel login
vercel env pull .env.production
npx prisma migrate deploy

# Option 2: Manually via Vercel dashboard
# Go to Deployments → Latest → View Function Logs
# Verify "Running migrations" in logs
```

### Step 7: Seed Database (First Deployment Only)

```bash
# Option 1: Via Vercel CLI
vercel env pull .env.production
npm run db:seed

# Option 2: Create a one-time endpoint
# Add to app/api/admin/seed/route.ts (secure with admin auth!)
# Visit https://your-domain.vercel.app/api/admin/seed
```

---

## Post-Deployment Tasks

### 1. Configure Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain (e.g., `mhmfinds.com`)
3. Update DNS records as instructed by Vercel
4. Wait for SSL certificate provisioning (automatic)
5. Update `NEXTAUTH_URL` environment variable to your custom domain

### 2. Set Up Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret
5. Add as `STRIPE_WEBHOOK_SECRET` in Vercel

### 3. Configure Monitoring

#### Sentry Setup

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

Update `sentry.client.config.ts` and `sentry.server.config.ts` with your DSN.

#### Vercel Analytics

1. Go to Vercel Dashboard → Analytics
2. Enable Web Analytics (free)
3. Enable Speed Insights (free)

### 4. Set Up Upstash Redis

1. Create account at [upstash.com](https://upstash.com)
2. Create new Redis database
3. Select region closest to Vercel deployment
4. Copy REST URL
5. Add as `REDIS_URL` to Vercel environment variables
6. Redeploy to apply changes

### 5. Configure Email Service

#### Option 1: Resend (Recommended)

```bash
npm install resend
```

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Get API key
4. Add as `RESEND_API_KEY`

#### Option 2: SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key
3. Verify sender email/domain
4. Add as `SENDGRID_API_KEY`

### 6. Enable Cron Jobs

Cron jobs are configured in `vercel.json`. Verify they're running:

1. Go to Vercel Dashboard → Cron Jobs
2. Verify "reset-usage" job is scheduled
3. Test manually: Click "Trigger" button

---

## Monitoring & Maintenance

### Health Checks

Create a health check endpoint at `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
      },
      { status: 503 }
    );
  }
}
```

### Uptime Monitoring

Use a service like:
- **UptimeRobot** (free, 5-minute intervals)
- **Better Uptime** (more features, paid)
- **Vercel Monitoring** (built-in)

Monitor: `https://your-domain.vercel.app/api/health`

### Log Monitoring

1. **Vercel Logs**: Dashboard → Deployments → View Function Logs
2. **Sentry**: Tracks errors and performance
3. **LogTail/DataDog**: Advanced log aggregation (optional)

### Database Backups

#### Vercel Postgres
- Automatic daily backups (retained for 7 days)
- Manual backups via dashboard

#### Neon
- Point-in-time recovery (free tier: 7 days, paid: 30 days)
- Manual backups: Project settings → Backups

#### Manual Backup Script

```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup-20251122.sql
```

---

## Troubleshooting

### Build Failures

**Error: Prisma Client not generated**
```bash
# Solution: Ensure postinstall script exists
# package.json
"scripts": {
  "postinstall": "npx prisma generate"
}
```

**Error: Module not found**
```bash
# Solution: Clear Vercel cache
# Dashboard → Settings → Clear Cache → Deploy
```

**Error: TypeScript errors**
```bash
# Run locally
npm run type-check
# Fix all errors before deploying
```

### Runtime Errors

**Error: Can't reach database**
- Verify `DATABASE_URL` is set correctly
- Ensure SSL mode is enabled: `?sslmode=require`
- Check database is publicly accessible
- Verify connection pooling is configured

**Error: NextAuth callback URL mismatch**
- Update `NEXTAUTH_URL` to match your domain
- Update OAuth provider redirect URLs
- Clear browser cookies and try again

**Error: Stripe webhook signature failed**
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check webhook endpoint URL is correct
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Performance Issues

**Slow API responses**
- Check database query performance in logs
- Add database indexes (see PERFORMANCE_OPTIMIZATION.md)
- Implement Redis caching
- Use Vercel Edge Functions for static data

**High memory usage**
- Reduce Prisma batch sizes
- Implement pagination
- Optimize images
- Review memory-intensive operations

**Cold start delays**
- Upgrade to Vercel Pro for faster cold starts
- Implement warming endpoints
- Use edge middleware for authentication

---

## Rollback Procedure

If deployment fails or causes issues:

1. **Instant Rollback via Dashboard**
   - Go to Deployments
   - Find previous working deployment
   - Click "Promote to Production"

2. **Via CLI**
   ```bash
   vercel rollback
   ```

3. **Via Git**
   ```bash
   git revert HEAD
   git push origin main
   # Vercel auto-deploys
   ```

---

## Security Reminders

- [ ] All secrets are in environment variables, not code
- [ ] `.env` is in `.gitignore`
- [ ] Admin routes are protected with authentication
- [ ] Rate limiting is enabled on all public endpoints
- [ ] CORS is properly configured
- [ ] CSP headers are set
- [ ] Webhook endpoints validate signatures
- [ ] Database credentials use SSL
- [ ] OAuth redirect URLs are whitelisted

---

## Next Steps

After successful deployment:

1. Review [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) and implement all recommendations
2. Review [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) for scaling
3. Set up monitoring alerts
4. Configure automated backups
5. Create staging environment
6. Implement CI/CD pipeline
7. Load test your application

---

**Deployment Complete!** 🚀

Your MHMFinds application should now be live at your Vercel domain. Monitor logs for the first few hours to catch any issues early.

For questions or issues, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Prisma Deployment Guides](https://www.prisma.io/docs/guides/deployment)
