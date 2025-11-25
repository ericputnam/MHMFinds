# COMPREHENSIVE MONETIZATION IMPLEMENTATION PLAN FOR MHMFINDS

> **Created:** November 21, 2025
> **Status:** Planning Phase
> **Estimated Implementation:** 3-4 weeks

---

## EXECUTIVE SUMMARY

This plan outlines a complete membership/monetization system for MHMFinds that tracks download button clicks (not actual downloads), uses Stripe for payment processing, and implements a simple 3-tier pricing model designed for the Sims modding community's budget. The implementation leverages the existing NextAuth authentication, Prisma database, and PostgreSQL infrastructure.

---

## 1. PRICING STRATEGY

### Recommended Tier Structure

**FREE TIER - "Casual Player"**
- Price: $0/month
- Download clicks: 10 per month
- Access to all free mods
- Basic search functionality
- Collection creation (up to 3 collections)
- Target: Casual players, trying the platform

**STANDARD TIER - "Mod Enthusiast"** (RECOMMENDED - Sweet Spot)
- Price: $4.99/month OR $49/year (save $10)
- Download clicks: 100 per month
- Access to all free mods
- Priority support
- Unlimited collections
- Early access to new features
- No ads (if you add them later)
- Target: Regular players who mod frequently

**PREMIUM TIER - "Ultimate Simmer"**
- Price: $9.99/month OR $99/year (save $20)
- Download clicks: Unlimited
- Access to all free mods
- Exclusive premium mod recommendations
- Advanced AI search features
- Priority customer support
- Creator profile badge
- Downloadable mod pack exports
- Early beta access
- Target: Power users, content creators

### Pricing Rationale
- **$4.99 sweet spot**: Comparable to a coffee, affordable for hobbyist gamers
- **Lower than streaming services**: Netflix/Spotify are $10-15, positioning this as more affordable
- **Competitive with Patreon tiers**: Most mod creators charge $3-10/tier
- **Annual discount**: 17-20% savings encourages longer commitment
- **10 free clicks**: Generous enough to try the platform, restrictive enough to convert

---

## 2. PAYMENT SOLUTION RECOMMENDATION

### Winner: STRIPE

**Why Stripe over Patreon:**

| Feature | Stripe | Patreon |
|---------|--------|---------|
| Full control over UX | ✓ | ✗ (redirects to Patreon) |
| Custom branding | ✓ | Limited |
| Transaction fees | 2.9% + $0.30 | 5-12% + payment fees |
| Subscription management | Built-in | Built-in |
| One-click upgrades | ✓ | ✗ |
| User stays on site | ✓ | ✗ |
| API integration | Excellent | Good |
| Implementation complexity | Moderate | Easy |
| Revenue share | None | 5-12% |

**Stripe Advantages:**
1. **Lower fees**: Save 2-9% per transaction
2. **Seamless UX**: Users never leave your site
3. **Full control**: Custom upgrade flows, branded checkout
4. **Better for scale**: As you grow, Stripe scales better
5. **Trust**: Industry standard (Shopify, Amazon, etc.)

**Patreon Use Case:**
- Only if you want to leverage Patreon's creator ecosystem
- If you want to offer exclusive content posts (not just downloads)
- If implementation speed is critical (faster initial setup)

**Recommendation**: Start with Stripe. You can always add Patreon as an alternative payment method later.

---

## 3. DATABASE SCHEMA CHANGES

### New Tables and Fields

```prisma
// Add to schema.prisma

// ============================================
// SUBSCRIPTION MODELS
// ============================================

enum SubscriptionTier {
  FREE
  STANDARD
  PREMIUM
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  PAUSED
  TRIALING
}

enum BillingInterval {
  MONTHLY
  YEARLY
}

model Subscription {
  id                    String              @id @default(cuid())
  userId                String              @unique
  tier                  SubscriptionTier    @default(FREE)
  status                SubscriptionStatus  @default(ACTIVE)
  billingInterval       BillingInterval?

  // Stripe fields
  stripeCustomerId      String?             @unique
  stripeSubscriptionId  String?             @unique
  stripePriceId         String?
  stripeCurrentPeriodEnd DateTime?

  // Usage tracking
  monthlyClickLimit     Int                 @default(10)
  clicksUsedThisMonth   Int                 @default(0)
  lastResetDate         DateTime            @default(now())

  // Lifecycle
  startedAt             DateTime            @default(now())
  canceledAt            DateTime?
  cancelAtPeriodEnd     Boolean             @default(false)
  trialEndsAt           DateTime?

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  // Relations
  user                  User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  clickHistory          DownloadClick[]
  invoices              Invoice[]

  @@index([userId])
  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
  @@map("subscriptions")
}

// ============================================
// DOWNLOAD CLICK TRACKING
// ============================================

model DownloadClick {
  id             String       @id @default(cuid())
  userId         String
  modId          String
  subscriptionId String

  // Metadata
  ipAddress      String?
  userAgent      String?
  referrer       String?

  clickedAt      DateTime     @default(now())

  // Relations
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  mod            Mod          @relation(fields: [modId], references: [id], onDelete: Cascade)
  subscription   Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([userId, clickedAt])
  @@index([modId])
  @@index([subscriptionId])
  @@map("download_clicks")
}

// ============================================
// INVOICE TRACKING
// ============================================

model Invoice {
  id                  String       @id @default(cuid())
  subscriptionId      String

  stripeInvoiceId     String       @unique
  amountPaid          Decimal      @db.Decimal(10,2)
  currency            String       @default("USD")
  status              String       // paid, open, void, uncollectible

  billingReason       String?      // subscription_create, subscription_cycle, etc.
  hostedInvoiceUrl    String?
  invoicePdf          String?

  periodStart         DateTime
  periodEnd           DateTime
  paidAt              DateTime?

  createdAt           DateTime     @default(now())

  // Relations
  subscription        Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([subscriptionId])
  @@index([stripeInvoiceId])
  @@map("invoices")
}

// ============================================
// UPDATE EXISTING USER MODEL
// ============================================

model User {
  // ... existing fields ...

  // Add new relations
  subscription       Subscription?
  downloadClicks     DownloadClick[]

  // ... existing relations ...
}

// ============================================
// UPDATE EXISTING MOD MODEL
// ============================================

model Mod {
  // ... existing fields ...

  // Add new relation
  downloadClicks     DownloadClick[]

  // ... existing relations ...
}
```

---

## 4. IMPLEMENTATION PHASES

### PHASE 1: Foundation (Week 1) - HIGHEST PRIORITY

**Goal**: Set up database schema, Stripe account, basic services

**Tasks**:
1. Create Stripe account, get API keys
2. Add Stripe SDK to project: `npm install stripe @stripe/stripe-js`
3. Add new environment variables to `.env`
4. Update Prisma schema with new models
5. Run migration: `npx prisma migrate dev --name add_subscription_system`
6. Create service layer files:
   - `/lib/services/stripeService.ts`
   - `/lib/services/subscriptionService.ts`
   - `/lib/services/usageService.ts`
7. Create seed script for default FREE subscriptions

**Deliverables**:
- Database schema updated
- Stripe account configured
- Service layer created
- All existing users have FREE tier subscriptions

---

### PHASE 2: Core API Routes (Week 1-2)

**Goal**: Build backend API endpoints for subscription management

**API Routes to Create**:
1. `/app/api/subscription/check-limit/route.ts` - Validates user has clicks remaining
2. `/app/api/subscription/track-click/route.ts` - Records download clicks
3. `/app/api/subscription/create-checkout/route.ts` - Creates Stripe Checkout session
4. `/app/api/subscription/manage/route.ts` - Stripe Customer Portal access
5. `/app/api/subscription/status/route.ts` - Returns current subscription details
6. `/app/api/webhooks/stripe/route.ts` - Handles Stripe webhook events

**Webhook Events to Handle**:
- `checkout.session.completed` → Activate subscription
- `customer.subscription.updated` → Update subscription status
- `customer.subscription.deleted` → Cancel subscription
- `invoice.payment_succeeded` → Record payment
- `invoice.payment_failed` → Handle failed payment

---

### PHASE 3: Frontend Components (Week 2)

**Components to Create**:
1. `/components/subscription/UpgradeModal.tsx` - Pricing comparison modal
2. `/components/subscription/PricingCard.tsx` - Reusable tier card
3. `/components/subscription/SubscriptionBanner.tsx` - Usage warning banner
4. `/components/subscription/UsageIndicator.tsx` - Click counter display
5. `/components/subscription/DownloadButton.tsx` - Smart download button
6. `/app/pricing/page.tsx` - Full pricing page
7. `/app/account/subscription/page.tsx` - Subscription management

**Components to Modify**:
- `ModDetailsModal.tsx` - Add download tracking
- `Navbar.tsx` - Add upgrade button & subscription status
- `Footer.tsx` - Add pricing page link

---

### PHASE 4: Download Click Integration (Week 2-3)

**Goal**: Integrate usage tracking into download flow

**Key Changes**:
1. Update download button to check limits
2. Track clicks before allowing download
3. Show usage indicators
4. Display upgrade modal when limit reached
5. Add low-click warnings

---

### PHASE 5: Stripe Integration & Testing (Week 3)

**Goal**: Complete payment flow and test thoroughly

**Tasks**:
1. Create Stripe products and prices
2. Configure webhook endpoint
3. Test all payment flows
4. Implement edge case handling
5. Add logging and monitoring

**Test Scenarios**:
- FREE → Standard upgrade
- Standard → Premium upgrade
- Cancellation flow
- Failed payment handling
- Proration on mid-cycle upgrade

---

### PHASE 6: Usage Reset & Cron Jobs (Week 3-4)

**Goal**: Automate monthly usage resets

**Tasks**:
1. Create `/app/api/cron/reset-usage/route.ts`
2. Set up cron trigger (Vercel Cron or external service)
3. Add email notifications (optional)

**Cron Schedule**: Daily at midnight UTC to reset subscriptions 30+ days old

---

### PHASE 7: Analytics & Optimization (Week 4+)

**Goal**: Track conversion metrics and optimize funnel

**Metrics to Track**:
- Free to Paid conversion rate (target: 5-10%)
- Upgrade modal CTR (target: 15-20%)
- Churn rate (target: <5% monthly)
- Average Revenue Per User (target: $3-5)

---

### PHASE 8: Polish & Launch (Week 4+)

**Goal**: Final testing and launch

**Tasks**:
- Comprehensive testing
- Create user documentation
- Set up support infrastructure
- Prepare marketing materials
- Soft launch to beta users
- Full launch

---

## 5. UX FLOWS

### Flow 1: New User Discovers Limit

```
1. User signs up → FREE subscription created (10 clicks)
2. Downloads first mod → Success, "9 downloads remaining"
3. At 3 clicks: Warning badge appears
4. At 0 clicks: Download blocked, upgrade modal opens
5. User upgrades → Stripe checkout → Success
6. User now has 100 clicks (Standard) or unlimited (Premium)
```

### Flow 2: User Approaches Limit

```
1. User with 2 clicks logs in
2. Yellow banner: "2 downloads remaining"
3. Downloads mod → "1 click left" warning
4. Final download → Upgrade modal appears
5. User can upgrade or wait for monthly reset
```

### Flow 3: User Cancels Subscription

```
1. User goes to Account → Subscription
2. Clicks "Manage Subscription" → Stripe Portal
3. Cancels subscription
4. Access continues until period ends
5. On renewal date: Downgraded to FREE tier
```

---

## 6. PROJECTED RESULTS

### Revenue Projections (1,000 Users)

```
Free Users: 800 (80%) - $0 revenue
Standard Users: 150 (15%) - 150 × $4.99 = $748.50/month
Premium Users: 50 (5%) - 50 × $9.99 = $499.50/month

Gross Revenue: $1,248/month
Stripe Fees (3%): -$37.44
Net Revenue: $1,210.56/month ($14,527/year)
```

### Key Metrics Targets

- **Free to Paid Conversion**: 5-10% within 3 months
- **Monthly Recurring Revenue**: $1,000-2,000 at 1,000 users
- **Customer Lifetime Value**: $50+ (10+ months retention)
- **Churn Rate**: <5% monthly
- **Break-Even**: ~50 paid subscribers

---

## 7. ESTIMATED COSTS

### Stripe Fees
- **Per Transaction**: 2.9% + $0.30
- **Example**: $4.99 subscription = $0.44 fee = $4.55 net (91.2%)

### Infrastructure
- Stripe Account: Free (pay-as-you-go)
- Database Storage: Minimal increase
- Email Service: SendGrid free tier (100/day)

---

## 8. ENVIRONMENT VARIABLES NEEDED

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_STANDARD_MONTHLY_PRICE_ID=price_...
STRIPE_STANDARD_YEARLY_PRICE_ID=price_...
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...

# Cron Security
CRON_SECRET=your_random_secret_here
```

---

## 9. TESTING CHECKLIST

### Manual Testing
- [ ] New user signup creates FREE subscription
- [ ] Download click increments counter
- [ ] Reaching limit blocks downloads
- [ ] Upgrade modal appears correctly
- [ ] Stripe checkout completes
- [ ] Webhook updates subscription
- [ ] Premium users have unlimited downloads
- [ ] Cancellation works
- [ ] Monthly reset resets counters

### Edge Cases
- [ ] Rapid clicks (race conditions)
- [ ] Multiple sessions
- [ ] Webhook failures
- [ ] Subscription expires mid-browse
- [ ] Database connection failures

---

## 10. SUCCESS FACTORS

### What Makes This Work
1. **Simple pricing**: 3 clear tiers
2. **Generous free tier**: 10 clicks builds trust
3. **Affordable pricing**: $4.99 is impulse-buy territory
4. **Seamless UX**: Never leave the site
5. **Clear value**: Users know exactly what they get

### Potential Pitfalls to Avoid
- Don't make free tier too restrictive
- Don't surprise users with charges
- Don't make cancellation hard
- Don't forget webhook security
- Don't neglect mobile UX

---

## 11. NEXT STEPS

### Immediate Actions
1. **Review this plan** - Approve or request changes
2. **Create Stripe account** - Get test API keys
3. **Update database schema** - Add subscription tables
4. **Start Phase 1** - Foundation setup

### Decision Points
- Confirm pricing tiers ($4.99/$9.99 or different?)
- Choose cron service (Vercel vs external)
- Decide on trial period (optional)
- Select email service (SendGrid, Mailgun, etc.)

---

## 12. RESOURCES

### Documentation
- [Stripe Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

### Tools
- [Stripe CLI](https://stripe.com/docs/stripe-cli) - Test webhooks locally
- [Stripe Dashboard](https://dashboard.stripe.com) - Manage products/subscriptions
- [Prisma Studio](https://www.prisma.io/studio) - Visualize database

---

## APPENDIX: CODE EXAMPLES

### SubscriptionService Example

```typescript
// /lib/services/subscriptionService.ts

import { prisma } from '@/lib/prisma';
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client';

export class SubscriptionService {

  static async getUserSubscription(userId: string) {
    return await prisma.subscription.findUnique({
      where: { userId },
      include: {
        clickHistory: {
          orderBy: { clickedAt: 'desc' },
          take: 10
        }
      }
    });
  }

  static async canUserDownload(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    tier: SubscriptionTier;
  }> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      throw new Error('No subscription found for user');
    }

    // Premium has unlimited
    if (subscription.tier === 'PREMIUM') {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
        tier: subscription.tier
      };
    }

    // Check if subscription is active
    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIALING') {
      return {
        allowed: false,
        remaining: 0,
        limit: subscription.monthlyClickLimit,
        tier: subscription.tier
      };
    }

    // Check monthly limit
    const remaining = subscription.monthlyClickLimit - subscription.clicksUsedThisMonth;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      limit: subscription.monthlyClickLimit,
      tier: subscription.tier
    };
  }

  static async trackDownloadClick(
    userId: string,
    modId: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
    }
  ) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      throw new Error('No subscription found');
    }

    // Create click record
    await prisma.downloadClick.create({
      data: {
        userId,
        modId,
        subscriptionId: subscription.id,
        ...metadata
      }
    });

    // Increment counter (except for premium)
    if (subscription.tier !== 'PREMIUM') {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          clicksUsedThisMonth: {
            increment: 1
          }
        }
      });
    }

    // Update mod download count
    await prisma.mod.update({
      where: { id: modId },
      data: {
        downloadCount: { increment: 1 }
      }
    });
  }
}
```

---

**END OF MONETIZATION PLAN**

*This plan is a living document. Update as requirements change or new insights emerge.*
