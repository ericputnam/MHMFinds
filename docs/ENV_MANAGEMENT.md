# Environment Variable Management Guide

> **Managing environment variables between local development and Vercel production**
> **Last Updated:** November 2025

---

## Overview

This guide explains how to manage environment variables for MHMFinds across local development and Vercel production environments.

---

## File Structure

```
MHMFinds/
├── .env                    # Local development (gitignored)
├── .env.example           # Template with documentation
├── .env.production        # Production values (gitignored)
└── scripts/
    ├── sync-env-to-vercel.js   # Node.js script to upload to Vercel
    └── sync-env-to-vercel.sh   # Bash script (alternative)
```

**IMPORTANT:** Both `.env` and `.env.production` are gitignored. Never commit these files!

---

## Environment Variables by Category

### Variables That MUST Be Different in Production

| Variable | Local Value | Production Value | Why Different? |
|----------|-------------|------------------|----------------|
| `DATABASE_URL` | `postgresql://eputnam@localhost:5432/modvault` | Vercel's `POSTGRES_URL` or Neon/Supabase URL | Different database servers |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://yourdomain.vercel.app` | Different domains |
| `NEXTAUTH_SECRET` | (dev secret) | **(NEW secret)** | Security best practice |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` | Test vs. live mode |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` | Test vs. live mode |
| `STRIPE_WEBHOOK_SECRET` | (test webhook) | (production webhook) | Different webhook endpoints |
| `STRIPE_*_PRICE_ID` | (test prices) | (live prices) | Different Stripe products |
| `REDIS_URL` | `redis://localhost:6379` | Upstash production URL | Different Redis servers |
| `CRON_SECRET` | (dev secret) | **(NEW secret)** | Security best practice |
| `TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` (test) | Real site key | Test vs. production |
| `TURNSTILE_SECRET_KEY` | `1x0000000000000000000000000000000AA` (test) | Real secret | Test vs. production |
| `NODE_ENV` | `development` | `production` | Environment flag |
| `DEBUG` | `modvault:*` | `` (empty) | No debug logs in production |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | `https://yourdomain.com` | CORS security |
| `SENTRY_DSN` | (dev project) | (production project) | Separate error tracking |
| `GOOGLE_ANALYTICS_ID` | (optional) | Production ID | Separate analytics |

### Variables That Should Be the SAME

| Variable | Notes |
|----------|-------|
| `GOOGLE_CLIENT_ID` | Same OAuth app works for both |
| `GOOGLE_CLIENT_SECRET` | *(Just update redirect URLs)* |
| `DISCORD_CLIENT_ID` | Same OAuth app works for both |
| `DISCORD_CLIENT_SECRET` | *(Just update redirect URLs)* |
| `OPENAI_API_KEY` | Same API key |
| `PERPLEXITY_API_KEY` | Same API key |
| `SENDGRID_API_KEY` | Same email service |
| `AWS_*` | Same S3 bucket (or use separate buckets) |
| `PATREON_*` | Same API credentials |
| All other API keys | Generally the same |

### Variables Managed by Vercel Automatically

When you create a Vercel Postgres database, Vercel automatically provides:

- `POSTGRES_URL` - Pooled connection (use this as `DATABASE_URL`)
- `POSTGRES_PRISMA_URL` - Direct connection for migrations
- `POSTGRES_URL_NON_POOLED` - Non-pooled connection

**You don't need to manually set these!** Vercel sets them automatically.

---

## Initial Setup

### 1. Copy Your Local .env to .env.production

```bash
cp .env .env.production
```

### 2. Update Production-Specific Values

Edit `.env.production` and change these values:

```bash
# Update domain
NEXTAUTH_URL="https://your-actual-domain.vercel.app"

# Generate NEW secret (run this command)
openssl rand -base64 32
# Then paste output as NEXTAUTH_SECRET

# Update Stripe to LIVE keys
STRIPE_SECRET_KEY="sk_live_YOUR_LIVE_KEY"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_LIVE_KEY"

# Get from: https://upstash.com
REDIS_URL="redis://default:xxxxx@your-upstash-instance.upstash.io:6379"

# Generate NEW cron secret
openssl rand -hex 32
# Then paste as CRON_SECRET

# Update Turnstile to real keys
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-real-site-key"
TURNSTILE_SECRET_KEY="your-real-secret-key"

# Production settings
NODE_ENV="production"
DEBUG=""
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

### 3. Leave Placeholder Values

Keep these as placeholders until you're ready:
- Variables you haven't configured yet
- Optional features not yet implemented
- Test keys you're still using

The upload script will **automatically skip** placeholder values like:
- `your-*`
- `xxxxx`
- `REPLACE_WITH_*`
- Test keys like `1x00000000000000000000AA`

---

## Uploading to Vercel

### Method 1: Using the Node.js Script (Recommended)

```bash
# Upload all variables to production
npm run env:push

# Follow the prompts:
# 1. Login to Vercel (if not already)
# 2. Choose environment: production / preview / development
# 3. Confirm upload
```

The script will:
- ✅ Read `.env.production`
- ✅ Skip placeholder values
- ✅ Upload each variable to Vercel
- ✅ Update existing variables
- ✅ Show a summary of results

### Method 2: Using Vercel CLI Directly

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login
vercel login

# Link to your project
vercel link

# Add a single variable
vercel env add VARIABLE_NAME production

# Remove a variable
vercel env rm VARIABLE_NAME production

# List all variables
vercel env ls
```

### Method 3: Using Vercel Dashboard (Manual)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter **Key** and **Value**
6. Select **Production** environment
7. Click **Save**

---

## Vercel Database Setup

### If Using Vercel Postgres

1. Go to Vercel Dashboard → **Storage** → **Create Database**
2. Select **Postgres**
3. Choose a region
4. Vercel automatically sets:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLED`

5. **Update your Prisma schema:**

```prisma
datasource db {
  provider = "postgresql"
  url = env("POSTGRES_PRISMA_URL") // Uses connection pooling
  directUrl = env("POSTGRES_URL_NON_POOLED") // For migrations
}
```

6. **DO NOT** manually set `DATABASE_URL` - Vercel handles this.

### If Using External Database (Neon/Supabase)

1. Create database at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com)

2. Get connection strings:
   - **Pooled URL** (for queries) → use as `DATABASE_URL`
   - **Direct URL** (for migrations) → use as `DIRECT_DATABASE_URL`

3. Add to Vercel:
```bash
vercel env add DATABASE_URL production
# Paste pooled URL

vercel env add DIRECT_DATABASE_URL production
# Paste direct URL
```

4. Update Prisma schema:
```prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

---

## Managing Secrets

### Generating Secure Secrets

```bash
# For NEXTAUTH_SECRET (base64)
openssl rand -base64 32

# For CRON_SECRET (hex)
openssl rand -hex 32

# For admin password (strong random)
openssl rand -base64 32
```

### Rotating Secrets

**When to rotate:**
- Every 90 days (recommended)
- After a security incident
- After team member leaves
- Before production launch

**How to rotate:**

1. Generate new secret
2. Update in Vercel:
   ```bash
   vercel env rm NEXTAUTH_SECRET production -y
   vercel env add NEXTAUTH_SECRET production
   # Paste new secret
   ```
3. Trigger new deployment:
   ```bash
   vercel --prod
   ```

---

## OAuth Provider Setup for Production

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Edit your OAuth Client ID
5. Add **Authorized redirect URI**:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```
6. Save

**Note:** You can use the same client ID/secret for both local and production!

### Discord OAuth

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2** → **General**
4. Add redirect:
   ```
   https://your-domain.vercel.app/api/auth/callback/discord
   ```
5. Save

---

## Stripe Configuration for Production

### Create Live Mode Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle to **Live Mode** (switch at top)
3. Go to **Products** → **Add product**
4. Create:
   - Standard Monthly ($4.99/month)
   - Standard Yearly ($49/year)
   - Premium Monthly ($9.99/month)
   - Premium Yearly ($99/year)
5. Copy each **Price ID** (starts with `price_`)
6. Update in `.env.production`:
   ```
   STRIPE_STANDARD_MONTHLY_PRICE_ID="price_xxxxx"
   STRIPE_STANDARD_YEARLY_PRICE_ID="price_xxxxx"
   STRIPE_PREMIUM_MONTHLY_PRICE_ID="price_xxxxx"
   STRIPE_PREMIUM_YEARLY_PRICE_ID="price_xxxxx"
   ```

### Create Live Webhook

1. In Stripe Dashboard (Live Mode) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.vercel.app/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy **Signing secret** (starts with `whsec_`)
7. Add to Vercel:
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET production
   ```

---

## Verifying Your Setup

### 1. Check Environment Variables

```bash
# List all variables
npm run env:list

# Or via Vercel dashboard
# https://vercel.com/dashboard → Settings → Environment Variables
```

### 2. Test Build

```bash
# Pull production env locally (for testing)
vercel env pull .env.production

# Test build with production env
NODE_ENV=production npm run build
```

### 3. Deploy and Monitor

```bash
# Deploy to production
vercel --prod

# Watch deployment logs
vercel logs --follow
```

---

## Troubleshooting

### Issue: "Database connection failed"

**Solution:** Verify `DATABASE_URL` is set correctly in Vercel

```bash
vercel env ls production | grep DATABASE_URL
```

### Issue: "NEXTAUTH_SECRET is not set"

**Solution:** Add the secret

```bash
vercel env add NEXTAUTH_SECRET production
# Paste your secret
```

### Issue: "OAuth redirect URI mismatch"

**Solution:** Add production domain to OAuth provider settings
- Google: Add `https://your-domain.vercel.app/api/auth/callback/google`
- Discord: Add `https://your-domain.vercel.app/api/auth/callback/discord`

### Issue: "Stripe webhook signature verification failed"

**Solution:** Ensure webhook secret matches production webhook

1. Check webhook endpoint URL matches: `https://your-domain.vercel.app/api/webhooks/stripe`
2. Copy signing secret from Stripe dashboard
3. Update in Vercel: `vercel env add STRIPE_WEBHOOK_SECRET production`

### Issue: "Rate limiting not working"

**Solution:** Ensure `REDIS_URL` is set and Upstash Redis is configured

```bash
vercel env add REDIS_URL production
# Paste Upstash URL: redis://default:xxxxx@your-instance.upstash.io:6379
```

---

## Best Practices

### 1. Never Commit Secrets
- ✅ `.env` is in `.gitignore`
- ✅ `.env.production` is in `.gitignore`
- ✅ Only commit `.env.example` (with placeholders)

### 2. Use Different Secrets in Production
- ✅ Different `NEXTAUTH_SECRET`
- ✅ Different `CRON_SECRET`
- ✅ Different Stripe keys (live, not test)
- ✅ Different Turnstile keys (real, not test)

### 3. Document Your Variables
- Keep `.env.example` up to date with all variables
- Add comments explaining what each variable is for
- Document how to obtain API keys

### 4. Rotate Secrets Regularly
- Schedule quarterly secret rotation
- Use a password manager or secrets vault
- Document rotation procedures

### 5. Monitor Access
- Review who has access to Vercel project
- Audit environment variable changes
- Use Vercel's activity log

---

## Quick Reference

### Common Commands

```bash
# Upload all variables to production
npm run env:push

# Pull production variables to local file
npm run env:pull

# List all variables
npm run env:list

# Deploy to production
vercel --prod

# View production logs
vercel logs --follow

# Generate secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -hex 32     # For CRON_SECRET
```

### File Locations

- Local development: `.env`
- Production values: `.env.production`
- Template/documentation: `.env.example`
- Upload script: `scripts/sync-env-to-vercel.js`

### Important URLs

- Vercel Dashboard: https://vercel.com/dashboard
- Google Cloud Console: https://console.cloud.google.com
- Discord Developer Portal: https://discord.com/developers/applications
- Stripe Dashboard: https://dashboard.stripe.com
- Upstash: https://upstash.com
- Neon: https://neon.tech
- Supabase: https://supabase.com

---

**Last Updated:** November 2025

For questions or issues, refer to:
- Main deployment guide: `docs/VERCEL_DEPLOYMENT.md`
- Security guide: `docs/SECURITY_HARDENING.md`
