# Vercel Deployment Checklist - MHMFinds

> **Current Status:** Deployed but returning 500 errors
> **Issue:** Missing environment variables in Vercel
> **Last Updated:** November 24, 2025

---

## 🚨 CRITICAL ISSUE: Why Your App Shows 500 Error

Your `.env.production` file was missing **ALL critical environment variables**:
- ❌ NEXTAUTH_SECRET (app can't authenticate users)
- ❌ NEXTAUTH_URL (OAuth callbacks fail)
- ❌ OAuth credentials (can't sign in)
- ❌ Redis config (caching fails, causes crashes)
- ❌ Turnstile keys (form submissions fail)

**Result:** App starts but crashes on any API call → HTTP 500 error

---

## ✅ Step-by-Step Fix

### 1. **Set Environment Variables in Vercel** (15-20 minutes)

Go to: [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → **Settings** → **Environment Variables**

Copy these variables and set them for **Production** environment:

#### 🔴 CRITICAL (Must Set - App Won't Work Without These)

```bash
# Database (with connection pooling)
DATABASE_URL=postgres://c974c960e992cf9fca808f55ae9a377b12e151f72bb83cd3d7d2998bd8ba2bb6:sk_i8_oFAOXqO1nyIC_lUOzt@db.prisma.io:5432/postgres?sslmode=require&pgbouncer=true&connection_limit=1

# Direct database URL (for migrations - no pooling)
DIRECT_DATABASE_URL=postgres://c974c960e992cf9fca808f55ae9a377b12e151f72bb83cd3d7d2998bd8ba2bb6:sk_i8_oFAOXqO1nyIC_lUOzt@db.prisma.io:5432/postgres?sslmode=require

# NextAuth (Generate NEW secret!)
NEXTAUTH_URL=https://mhm-finds-dw8l.vercel.app
NEXTAUTH_SECRET=[GENERATE NEW - SEE BELOW]

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=[YOUR_GOOGLE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET]

# Discord OAuth (from Discord Developer Portal)
DISCORD_CLIENT_ID=[YOUR_DISCORD_CLIENT_ID]
DISCORD_CLIENT_SECRET=[YOUR_DISCORD_CLIENT_SECRET]

# Redis (Upstash - create at upstash.com)
REDIS_URL=[YOUR_UPSTASH_REDIS_URL]
REDIS_TOKEN=[YOUR_UPSTASH_REDIS_TOKEN]

# Turnstile CAPTCHA (Cloudflare)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=[YOUR_SITE_KEY]
TURNSTILE_SECRET_KEY=[YOUR_SECRET_KEY]
```

#### 🟡 RECOMMENDED (For full functionality)

```bash
# OpenAI API (for AI search)
OPENAI_API_KEY=[YOUR_OPENAI_KEY]

# Security
CRON_SECRET=[GENERATE NEW]
ALLOWED_ORIGINS=https://mhm-finds-dw8l.vercel.app,https://musthavemods.com

# Rate Limiting
RATE_LIMIT_FREE_TIER=20
RATE_LIMIT_STANDARD_TIER=100
RATE_LIMIT_PREMIUM_TIER=500
RATE_LIMIT_ADMIN_TIER=1000

# Node Environment
NODE_ENV=production
```

---

### 2. **Generate Secrets**

#### NEXTAUTH_SECRET (CRITICAL - Do Not Skip!)
```bash
openssl rand -base64 32
```
Copy the output and paste it as `NEXTAUTH_SECRET` in Vercel.

**⚠️ WARNING:** NEVER use your development secret in production!

#### CRON_SECRET (Recommended)
```bash
openssl rand -hex 32
```

---

### 3. **Update OAuth Redirect URLs**

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: APIs & Services → Credentials
3. Click your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   ```
   https://mhm-finds-dw8l.vercel.app/api/auth/callback/google
   ```
5. Save

#### Discord OAuth
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to OAuth2 → General
4. Under "Redirects", add:
   ```
   https://mhm-finds-dw8l.vercel.app/api/auth/callback/discord
   ```
5. Save

---

### 4. **Set Up Redis (Upstash)** (5 minutes)

1. Go to [Upstash](https://upstash.com/)
2. Create account (free tier: 10K requests/day)
3. Click "Create Database"
   - Name: `mhmfinds-prod-cache`
   - Type: Regional
   - Region: Choose closest to your users (e.g., us-east-1)
4. Copy the credentials:
   - **UPSTASH_REDIS_REST_URL** → Use as `REDIS_URL`
   - **UPSTASH_REDIS_REST_TOKEN** → Use as `REDIS_TOKEN`
5. Paste into Vercel environment variables

---

### 5. **Set Up Turnstile (Cloudflare CAPTCHA)** (5 minutes)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to: Turnstile
3. Click "Add Site"
   - Domain: `mhm-finds-dw8l.vercel.app`
   - Widget Mode: Managed
4. Copy credentials:
   - **Site Key** → Use as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret Key** → Use as `TURNSTILE_SECRET_KEY`
5. Paste into Vercel environment variables

---

### 6. **Redeploy** (2 minutes)

After setting all environment variables in Vercel:

**Option A:** Push to Git
```bash
git push origin main
```

**Option B:** Manual Redeploy
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click "..." on latest deployment → "Redeploy"
3. Check "Use existing Build Cache"
4. Click "Redeploy"

---

### 7. **Verify Deployment** (5 minutes)

After redeployment completes:

#### Test Homepage
- [ ] Go to: `https://mhm-finds-dw8l.vercel.app`
- [ ] Should load WITHOUT 500 error
- [ ] Should show search bar and mods grid

#### Test API Routes
- [ ] Open: `https://mhm-finds-dw8l.vercel.app/api/mods`
- [ ] Should return JSON with mods data
- [ ] Check response for `fromCache: true/false`

#### Test Authentication
- [ ] Click "Sign In"
- [ ] Try "Sign in with Google"
- [ ] Should redirect to Google OAuth
- [ ] After login, should redirect back to site
- [ ] Should show your profile in navbar

#### Test Search
- [ ] Type "hair" in search bar
- [ ] Press Enter or click search
- [ ] Should show search results
- [ ] Try category filters
- [ ] Try "Clear All Filters" button

#### Test Mod Submission
- [ ] Go to Submit Mod page
- [ ] Fill out form
- [ ] Complete CAPTCHA
- [ ] Submit
- [ ] Should see success message (or error if rate limited)

---

## 🔧 Troubleshooting

### Still Getting 500 Error?

#### Check Vercel Logs
1. Go to Vercel Dashboard → Your Project → **Logs**
2. Look for error messages
3. Common issues:
   - `PrismaClientInitializationError` → Database URL wrong
   - `JWTSessionError` → NEXTAUTH_SECRET not set
   - `OAuth error` → Redirect URLs not configured

#### Check Database Connection
```bash
# Test production database locally
DATABASE_URL="your-prod-db-url" npx prisma db pull
```
If this fails, your DATABASE_URL is wrong.

#### Verify Environment Variables Set
1. Vercel Dashboard → Settings → Environment Variables
2. Verify **ALL** critical variables are set for "Production"
3. Check for typos in variable names

### OAuth Not Working?

#### Error: "redirect_uri_mismatch"
- Check OAuth redirect URLs include your Vercel domain
- Ensure no trailing slashes: ✅ `.../callback/google` ❌ `.../callback/google/`

#### Error: "Invalid client"
- Double-check CLIENT_ID and CLIENT_SECRET in Vercel
- Make sure you copied PRODUCTION credentials (not development)

### Database Issues?

#### Error: "Too many connections"
- Ensure `&pgbouncer=true&connection_limit=1` in DATABASE_URL
- Check you set DIRECT_DATABASE_URL for migrations

#### Error: "Schema is out of sync"
```bash
# Run migrations on production database
DATABASE_URL="your-prod-db-url" npx prisma migrate deploy
```

---

## 📝 Post-Deployment Tasks

### Set Up Monitoring (Recommended)

1. **Vercel Analytics** (Built-in)
   - Go to Vercel Dashboard → Analytics → Enable

2. **Sentry Error Tracking** (Optional)
   - Sign up at [sentry.io](https://sentry.io)
   - Get DSN
   - Add to Vercel environment variables:
     ```bash
     SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
     NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
     ```

### Set Up Cron Jobs (For Content Scraping)

1. Create file: `vercel.json` (already exists)
2. Add cron configuration:
   ```json
   {
     "crons": [{
       "path": "/api/cron/scrape-content",
       "schedule": "0 */6 * * *"
     }]
   }
   ```
3. Commit and push
4. Verify in Vercel Dashboard → Cron Jobs

---

## 🚀 Running Scraper Against Production DB

### From Your Local Machine

```bash
# Load production environment variables
export $(cat .env.production | xargs)

# Run scraper against production database
npm run scrape:mhm:prod
```

**What this does:**
- Sets `NODE_ENV=production`
- Reads `DATABASE_URL` from `.env.production`
- Scrapes musthavemods.com
- Inserts mods into **production** Prisma database

### Verify It Worked

```bash
# Check production database
DATABASE_URL="your-prod-db-url" npx prisma studio
```
Open Prisma Studio and check `Mod` table for new entries.

---

## ✅ Success Criteria

Your deployment is successful when:

- [x] Homepage loads (no 500 error)
- [x] `/api/mods` returns JSON data
- [x] Google OAuth login works
- [x] Discord OAuth login works
- [x] Search returns results
- [x] Filters work
- [x] Mod submission works
- [x] Cache working (`fromCache: true` in responses)
- [x] Database queries fast (<200ms)

---

## 📞 Need Help?

If you're still stuck after following this checklist:

1. **Check Vercel Logs** for specific error messages
2. **Verify environment variables** are EXACTLY as specified
3. **Test locally first** with `.env.production`:
   ```bash
   export $(cat .env.production | xargs)
   npm run build
   npm start
   ```
4. **Review Prisma logs** for database connection issues

---

## 🎉 After Successful Deployment

1. **Update DNS** (if using custom domain)
   - Point `musthavemods.com` to Vercel
   - Update `NEXTAUTH_URL` to custom domain

2. **Enable Analytics**
   - Vercel Analytics
   - Google Analytics (optional)

3. **Set up Backups**
   - Enable automatic backups in your database provider
   - Test restore procedure

4. **Monitor Performance**
   - Check Vercel Analytics daily
   - Monitor API response times
   - Watch for errors in Sentry

5. **Scale as Needed**
   - If traffic grows, upgrade Redis tier
   - Consider Prisma Accelerate for better database performance
   - Add read replicas if needed

---

**Last Updated:** November 24, 2025
**Vercel URL:** https://mhm-finds-dw8l.vercel.app
**Status:** Deployed (needs environment variables configured)
