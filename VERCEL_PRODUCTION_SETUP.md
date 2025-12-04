# Vercel Production Setup Guide

## 🚀 Your deployment is live at: https://mhm-finds-dw5l.vercel.app

---

## Step 1: Configure Environment Variables in Vercel

Go to: https://vercel.com/your-account/mhmfinds/settings/environment-variables

### ✅ CRITICAL - Set These First:

```bash
# Database - ⚠️ COPY FROM YOUR .env.local (DO NOT USE THESE PLACEHOLDERS)
DATABASE_URL="your-database-url-from-prisma-io"
POSTGRES_URL="your-postgres-url-from-prisma-io"
DIRECT_DATABASE_URL="your-direct-database-url-from-prisma-io"
PRISMA_DATABASE_URL="your-prisma-accelerate-url"

# NextAuth - PRODUCTION VALUES
NEXTAUTH_URL="https://mhm-finds-dw5l.vercel.app"
NEXTAUTH_SECRET="Nnm14IgrA87w1i9huQhv03jHq6R3LsdSVPbRTk9dXgg="

# Production Settings
NODE_ENV="production"
DEBUG=""

# Admin Credentials
ADMIN_USERNAME="adminuser45"
ADMIN_PASSWORD="5GbHE%X9c%#tIg4i"
```

### ⚠️ STRIPE PRODUCTION KEYS - Get Live Keys First:

**Before setting these, you MUST:**
1. Go to https://dashboard.stripe.com/test/developers (switch to LIVE mode toggle)
2. Get your LIVE secret key (starts with `sk_live_...`)
3. Get your LIVE publishable key (starts with `pk_live_...`)
4. Create products in LIVE mode and get price IDs

```bash
# Stripe LIVE keys (NOT test keys!)
STRIPE_SECRET_KEY="sk_live_YOUR_LIVE_KEY"  # ⚠️ MUST be LIVE key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_LIVE_KEY"  # ⚠️ MUST be LIVE key
STRIPE_WEBHOOK_SECRET="whsec_YOUR_PRODUCTION_WEBHOOK_SECRET"  # ⚠️ Set this in Step 2

# Stripe Price IDs (from LIVE mode products)
NEXT_PUBLIC_STRIPE_CURIOUS_MONTHLY_PRICE_ID="price_YOUR_LIVE_MONTHLY_ID"
NEXT_PUBLIC_STRIPE_CURIOUS_QUARTERLY_PRICE_ID="price_YOUR_LIVE_QUARTERLY_ID"
NEXT_PUBLIC_STRIPE_CURIOUS_SEMIANNUAL_PRICE_ID="price_YOUR_LIVE_SEMIANNUAL_ID"
NEXT_PUBLIC_STRIPE_CURIOUS_ANNUAL_PRICE_ID="price_YOUR_LIVE_ANNUAL_ID"
```

### 📋 OPTIONAL - API Keys (copy from .env.local):

```bash
PERPLEXITY_API_KEY="your-perplexity-api-key"  # Copy from .env.local
OPENAI_API_KEY="your-openai-api-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
```

---

## Step 2: Set Up Production Stripe Webhook

### A. Create the Webhook in Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/webhooks (**switch to LIVE mode**)
2. Click **"Add endpoint"**
3. Set Endpoint URL to: `https://mhm-finds-dw5l.vercel.app/api/webhooks/stripe`
4. Select events to send:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
5. Click **"Add endpoint"**

### B. Get the Webhook Secret:

1. Click on your newly created webhook
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_...`)
4. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

### C. Test the Webhook:

1. Go to the webhook in Stripe dashboard
2. Click **"Send test webhook"**
3. Select `checkout.session.completed`
4. Click **"Send test webhook"**
5. Check that it shows a 200 response

---

## Step 3: Create LIVE Stripe Products

You need to create products in **LIVE mode** (not test mode):

1. Go to: https://dashboard.stripe.com/products (**switch to LIVE mode**)
2. Click **"Add product"**
3. Create "Curious Simmer Premium" with 4 prices:
   - **Monthly**: $6.49/month
   - **Quarterly**: $12.49/3 months
   - **Semi-Annual**: $16.49/6 months
   - **Annual**: $24.49/year (best value)
4. Copy each price ID and add to Vercel environment variables

---

## Step 4: Verify Deployment

1. **Check Vercel deployment**: https://vercel.com/your-account/mhmfinds
2. **Visit your site**: https://mhm-finds-dw5l.vercel.app
3. **Test sign-up**: Create a test account
4. **Test subscription**:
   - Use a test card: `4242 4242 4242 4242` (exp: any future date, CVC: any 3 digits)
   - Complete checkout
   - Verify webhook fires (check Stripe dashboard → Webhooks → Recent deliveries)
   - Verify account upgraded to premium (check admin dashboard)

---

## 🎉 You're Done!

Your production deployment is live with:
- ✅ Stripe subscriptions (live mode)
- ✅ Webhook integration
- ✅ Admin tools with auto-premium upgrade
- ✅ Database connected
- ✅ All environment variables set

---

## 🔧 Troubleshooting

### Webhook not firing:
- Check webhook URL is exactly: `https://mhm-finds-dw5l.vercel.app/api/webhooks/stripe`
- Verify webhook secret is correct in Vercel env vars
- Check Stripe dashboard → Webhooks → Recent deliveries for errors

### Subscription not upgrading:
- Check Vercel logs: `vercel logs --follow`
- Verify webhook secret matches
- Check that price IDs in Vercel match Stripe LIVE price IDs

### Environment variables not working:
- Vercel uses environment variables from dashboard, NOT .env files
- After updating env vars, redeploy: `vercel --prod`
- Check Vercel dashboard → Settings → Environment Variables

---

## 📞 Need Help?

- Vercel Logs: https://vercel.com/your-account/mhmfinds/logs
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Webhooks: https://dashboard.stripe.com/webhooks
