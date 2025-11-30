# Stripe Pricing Setup Guide

## Step 1: Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Click "Add product"
3. Create **Curious Simmer Premium** product with these 4 prices:

### Monthly Plan
- **Name**: Curious Simmer Premium - Monthly
- **Price**: $6.49 USD
- **Billing period**: Monthly (recurring)
- **Payment link URL**: (optional)
- After creating, **copy the Price ID** (starts with `price_`)

### Quarterly Plan
- **Name**: Curious Simmer Premium - Quarterly
- **Price**: $12.49 USD
- **Billing period**: Every 3 months (recurring)
- After creating, **copy the Price ID**

### Semi-Annual Plan
- **Name**: Curious Simmer Premium - Semi-Annual
- **Price**: $16.49 USD
- **Billing period**: Every 6 months (recurring)
- After creating, **copy the Price ID**

### Annual Plan
- **Name**: Curious Simmer Premium - Annual
- **Price**: $24.49 USD
- **Billing period**: Yearly (recurring)
- After creating, **copy the Price ID**

## Step 2: Update Your .env File

Replace lines 77-80 in your `.env` file with the actual Price IDs from Stripe:

```env
# Replace these with your actual Stripe Price IDs from Step 1
NEXT_PUBLIC_STRIPE_CURIOUS_MONTHLY_PRICE_ID=price_YOUR_MONTHLY_ID_HERE
NEXT_PUBLIC_STRIPE_CURIOUS_QUARTERLY_PRICE_ID=price_YOUR_QUARTERLY_ID_HERE
NEXT_PUBLIC_STRIPE_CURIOUS_SEMIANNUAL_PRICE_ID=price_YOUR_SEMIANNUAL_ID_HERE
NEXT_PUBLIC_STRIPE_CURIOUS_ANNUAL_PRICE_ID=price_YOUR_ANNUAL_ID_HERE
```

**IMPORTANT**: Note the `NEXT_PUBLIC_` prefix - this is required for client-side access!

## Step 3: Restart Your Dev Server

After updating .env:
1. Stop your dev server (Ctrl+C)
2. Run `npm run dev` again
3. The new price IDs will be loaded

## Verification

After restarting, the upgrade flow should work. You can test with Stripe test cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002

Any future expiry date and any 3-digit CVC will work.
