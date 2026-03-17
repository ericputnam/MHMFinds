# Quick Start: Deploy to Vercel in 30 Minutes

> **Fast track guide to get MHMFinds deployed to production**
> **Prerequisite:** You have a Vercel account and the repo pushed to GitHub

---

## Step 1: Prepare Environment Variables (10 minutes)

### 1.1 Copy and Edit .env.production

```bash
# File already created for you: .env.production
# Edit it and update these CRITICAL values:

# 1. Your production domain (replace with actual domain)
NEXTAUTH_URL="https://your-app-name.vercel.app"

# 2. Generate NEW secret for production
openssl rand -base64 32
# Copy output and paste as NEXTAUTH_SECRET

# 3. Generate NEW cron secret
openssl rand -hex 32
# Copy output and paste as CRON_SECRET

# 4. Set production mode
NODE_ENV="production"
DEBUG=""

# 5. Update CORS
ALLOWED_ORIGINS="https://your-app-name.vercel.app"
```

### 1.2 Optional: Set Up Redis (Recommended)

**Why:** Required for rate limiting and caching in production

1. Go to https://upstash.com
2. Create account (free tier available)
3. Create new Redis database
4. Copy **REST URL** and **Token**
5. Update in `.env.production`:
   ```
   REDIS_URL="redis://default:xxxxx@your-instance.upstash.io:6379"
   REDIS_TOKEN="xxxxxxxxxxxxxxxxxxxxx"
   ```

**Skip if:** You want to deploy first and add later

---

## Step 2: Deploy to Vercel (5 minutes)

### 2.1 Connect GitHub Repository

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select your **MHMFinds** repository
4. Click **Import**

### 2.2 Configure Build Settings

Vercel should auto-detect Next.js. Verify:

- **Framework Preset:** Next.js
- **Build Command:** `npm run vercel-build` (or use default)
- **Output Directory:** `.next` (leave as default)
- **Install Command:** `npm install` (leave as default)

### 2.3 Environment Variables

**Option A: Upload All at Once (Recommended)**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Upload all variables
npm run env:push
# Choose: production
# Confirm: y
```

**Option B: Manual Upload (Slower)**

1. In Vercel import screen, click **Environment Variables**
2. Copy variables from `.env.production`
3. Paste key-value pairs
4. Select **Production** environment

**IMPORTANT:** These variables will be auto-skipped (placeholders):
- `your-google-client-id`
- `your-openai-api-key`
- `xxxxx`
- etc.

You'll need to add real values for these later.

### 2.4 Deploy

Click **Deploy** and wait (3-5 minutes)

---

## Step 3: Set Up Database (10 minutes)

### Option A: Vercel Postgres (Easiest)

1. While deployment is running, go to **Storage** tab
2. Click **Create Database** → **Postgres**
3. Choose a region (same as your app)
4. Click **Create**

Vercel automatically sets:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLED`

**Done!** Database is ready.

### Option B: Neon (Free Tier, More Features)

1. Go to https://neon.tech
2. Create account and new project
3. Select region close to your Vercel deployment
4. Copy **Connection string**
5. Add to Vercel:
   ```bash
   vercel env add DATABASE_URL production
   # Paste: postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 3.1 Run Migrations

After database is created:

```bash
# Method 1: Via deployment (automatic)
# Vercel runs migrations during build via vercel-build script

# Method 2: Manual (if needed)
vercel env pull .env.production
npx prisma migrate deploy
```

---

## Step 4: Configure OAuth (5 minutes)

### 4.1 Google OAuth

1. Go to https://console.cloud.google.com
2. Select your project
3. **APIs & Services** → **Credentials**
4. Edit your OAuth Client ID
5. Add redirect URI:
   ```
   https://your-app-name.vercel.app/api/auth/callback/google
   ```
6. Save

### 4.2 Discord OAuth

1. Go to https://discord.com/developers/applications
2. Select your application
3. **OAuth2** → **General**
4. Add redirect URI:
   ```
   https://your-app-name.vercel.app/api/auth/callback/discord
   ```
5. Save

**Note:** You can use the same CLIENT_ID and SECRET from local .env

---

## Step 5: Verify Deployment (5 minutes)

### 5.1 Check Deployment Status

1. Go to Vercel dashboard
2. Check deployment logs
3. Look for errors

### 5.2 Test Core Functionality

Visit your deployed app: `https://your-app-name.vercel.app`

Test:
- [ ] Homepage loads
- [ ] Search works
- [ ] Mod cards display
- [ ] OAuth login (Google/Discord)
- [ ] Database connection works

### 5.3 Check Environment Variables

```bash
# List all variables
vercel env ls

# Should see:
# - DATABASE_URL (or POSTGRES_URL)
# - NEXTAUTH_URL
# - NEXTAUTH_SECRET
# - etc.
```

---

## You're Live! 🎉

Your app is now deployed at: `https://your-app-name.vercel.app`

---

## What's Missing (Optional)

These can be added later:

### Redis (Highly Recommended)
**Why:** Rate limiting and caching
**Time:** 10 minutes
**Guide:** See `docs/ENV_MANAGEMENT.md#vercel-database-setup`

### Stripe (For Monetization)
**Why:** Payment processing
**Time:** 30 minutes
**Guide:** See `docs/ENV_MANAGEMENT.md#stripe-configuration-for-production`

### Monitoring (Recommended)
**Why:** Error tracking
**Time:** 15 minutes
**Guide:**
1. Sign up at https://sentry.io
2. Create new Next.js project
3. Copy DSN
4. Add to Vercel: `vercel env add SENTRY_DSN production`

### Custom Domain
**Why:** Professional URL
**Time:** 10 minutes
**Guide:**
1. Vercel Dashboard → **Domains**
2. Add your domain
3. Update DNS records as instructed
4. Wait for SSL provisioning (automatic)
5. Update `NEXTAUTH_URL` to new domain

---

## Troubleshooting

### "Build failed: Prisma client not generated"
**Fix:** Add to package.json scripts (already done):
```json
"postinstall": "prisma generate"
```

### "Database connection failed"
**Fix:** Check `DATABASE_URL` is set in Vercel:
```bash
vercel env ls production | grep DATABASE
```

### "OAuth redirect URI mismatch"
**Fix:** Add production domain to OAuth provider settings (see Step 4)

### "Page not loading / 500 error"
**Fix:** Check deployment logs:
```bash
vercel logs --follow
```

---

## Next Steps

After initial deployment:

1. **Add Missing API Keys** (OpenAI, Stripe, etc.)
   ```bash
   vercel env add OPENAI_API_KEY production
   ```

2. **Set Up Redis** (if not done yet)
   - See `docs/ENV_MANAGEMENT.md`

3. **Configure Stripe** (for payments)
   - Create products in live mode
   - Set up webhook
   - See `docs/ENV_MANAGEMENT.md#stripe-configuration-for-production`

4. **Security Hardening**
   - Read `docs/SECURITY_HARDENING.md`
   - Implement admin authentication (CRITICAL)
   - Add rate limiting with Redis

5. **Performance Optimization**
   - Read `docs/PERFORMANCE_OPTIMIZATION.md`
   - Add database indexes
   - Implement caching

---

## Complete Deployment Checklist

- [ ] `.env.production` created and updated
- [ ] Deployed to Vercel
- [ ] Database created and migrated
- [ ] OAuth redirects configured
- [ ] Core functionality tested
- [ ] Environment variables verified
- [ ] Redis configured (optional but recommended)
- [ ] Custom domain added (optional)
- [ ] Monitoring set up (optional)

---

**Total Time:** 30-45 minutes for basic deployment
**With optional features:** 1-2 hours

For detailed guides, see:
- **Full deployment:** `docs/VERCEL_DEPLOYMENT.md`
- **Environment management:** `docs/ENV_MANAGEMENT.md`
- **Security:** `docs/SECURITY_HARDENING.md`
- **Performance:** `docs/PERFORMANCE_OPTIMIZATION.md`
