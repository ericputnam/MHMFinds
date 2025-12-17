# Mediavine Ad Strategy for MHMFinds

> **Created:** December 17, 2024  
> **Goal:** Maximize ad revenue while maintaining excellent user experience  
> **Prerequisite:** 50,000+ sessions/month to qualify for Mediavine

---

## 📊 Mediavine Overview

### Why Mediavine?
- **Higher RPMs** than AdSense ($15-30+ vs $2-8 typically)
- **Optimized for Core Web Vitals** - minimal impact on page speed
- **Smart lazy loading** - ads load as user scrolls
- **Premium advertiser relationships** - gaming/lifestyle verticals pay well
- **Full service** - they handle all optimization

### Qualification Requirements
- 50,000 sessions in the last 30 days
- Original, quality content
- Good standing with Google (no policy violations)
- Site speed requirements (they'll check Core Web Vitals)

---

## 🎯 Ad Placement Strategy for MHMFinds

### Your Site Structure Analysis

| Page Type | Traffic Potential | Ad Opportunity | Priority |
|-----------|------------------|----------------|----------|
| Homepage (/) | Highest | Medium (browsing) | HIGH |
| Mod Grid | Very High | High (engagement) | HIGHEST |
| Mod Detail Modal | High | Medium (conversion point) | MEDIUM |
| Category Pages | High | High (browsing) | HIGH |
| Creator Pages | Medium | Medium | MEDIUM |
| Static Pages (About, Terms) | Low | Low | LOW |

---

## 🏗️ Recommended Ad Placements

### 1. **Sticky Sidebar Ad** (Desktop Only) - HIGHEST REVENUE
**Location:** Right sidebar, sticky while scrolling mod grid  
**Format:** 300x600 or 300x250  
**Why:** High viewability, doesn't interrupt browsing  
**Implementation:**

```tsx
// components/ads/SidebarAd.tsx
'use client';

import React, { useEffect } from 'react';

interface SidebarAdProps {
  className?: string;
}

export const SidebarAd: React.FC<SidebarAdProps> = ({ className = '' }) => {
  useEffect(() => {
    // Mediavine will auto-inject ads into data-ad-unit elements
    if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
      (window as any).adsbygoogle.push({});
    }
  }, []);

  return (
    <aside className={`hidden lg:block sticky top-24 ${className}`}>
      {/* Mediavine auto-injects here based on their script */}
      <div 
        data-ad-unit="sidebar_atf"
        className="bg-mhm-card/50 rounded-xl p-2 text-center min-h-[600px]"
      >
        <span className="text-xs text-slate-500">Advertisement</span>
      </div>
    </aside>
  );
};
```

### 2. **In-Feed Ads** (Between Mod Cards) - HIGH REVENUE
**Location:** Every 8-12 mod cards in the grid  
**Format:** Native/display blend  
**Why:** Seamless integration, high engagement  
**Implementation:**

```tsx
// In ModGrid.tsx - Insert ad units between mod cards
{mods.map((mod, index) => (
  <React.Fragment key={mod.id}>
    <ModCard mod={mod} ... />
    
    {/* Insert ad after every 8th card */}
    {(index + 1) % 8 === 0 && index !== mods.length - 1 && (
      <div 
        className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4"
        data-ad-unit="in-feed"
      >
        <InFeedAd />
      </div>
    )}
  </React.Fragment>
))}
```

### 3. **Below Hero/Search Bar** - MEDIUM-HIGH REVENUE
**Location:** Between search bar and filter bar  
**Format:** Leaderboard (728x90) or responsive  
**Why:** High visibility, catches users before browsing  

```tsx
// In page.tsx, after Hero component
<Hero onSearch={handleSearch} isLoading={loading} />

{/* Top ad unit - only shown after initial load */}
{!loading && mods.length > 0 && (
  <div className="container mx-auto px-4 py-4">
    <div data-ad-unit="below_header" className="text-center">
      {/* Mediavine injects leaderboard here */}
    </div>
  </div>
)}

<FilterBar ... />
```

### 4. **Sticky Footer Ad** (Mobile Only) - HIGH REVENUE
**Location:** Bottom of screen, sticky  
**Format:** 320x50 or 320x100  
**Why:** High viewability on mobile, industry standard  
**Note:** Mediavine handles this automatically with their mobile optimization

### 5. **Content Bottom Ad**
**Location:** Before footer  
**Format:** Large rectangle (336x280) or leaderboard  
**Why:** Captures users at content end  

---

## 💰 Revenue Optimization Tips

### A. Page Speed Considerations

Mediavine is optimized for speed, but you should still:

1. **Lazy load ads** - Already handled by Mediavine
2. **Preconnect to Mediavine CDN** - Add to layout.tsx:

```tsx
// In app/layout.tsx <head>
<link rel="preconnect" href="https://scripts.mediavine.com" />
<link rel="dns-prefetch" href="https://scripts.mediavine.com" />
<link rel="preconnect" href="https://www.googletagservices.com" />
```

3. **Use Mediavine's Universal Player** for video ads (higher RPM)

### B. Premium Subscriber Ad Removal

Since you have a subscription model, offer ad-free experience to paid users:

```tsx
// In any component with ads
import { useSession } from 'next-auth/react';

export const AdComponent = () => {
  const { data: session } = useSession();
  
  // Don't show ads to premium users
  if (session?.user?.isPremium) {
    return null;
  }
  
  return <div data-ad-unit="..." />;
};
```

### C. Content Length for Better Ad Density

Mediavine's algorithm places more ads on longer content. For your mod detail views:

- **Short description (< 100 words)**: 1-2 ads max
- **Medium description (100-300 words)**: 2-3 ads
- **Long description (300+ words)**: 3-4 ads

### D. Mobile-First Optimization

70%+ of gaming sites traffic is mobile. Ensure:

- **Sticky bottom bar ad** enabled (Mediavine default)
- **In-content ads** every 2-3 screens on mobile
- **No interstitials** on mod browsing (disrupts flow)

---

## 📐 Ad Layout for Your Pages

### Homepage Layout (Desktop)

```
┌─────────────────────────────────────────────────────────┐
│                      NAVBAR                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                    HERO / SEARCH                         │
│                                                          │
├─────────────────────────────────────────────────────────┤
│              [ LEADERBOARD AD - 728x90 ]                │
├─────────────────────────────────────────────────────────┤
│                    FILTER BAR                            │
├───────────────────────────────────────────┬─────────────┤
│                                           │  SIDEBAR    │
│   MOD CARD   MOD CARD   MOD CARD   MOD   │    AD       │
│                                    CARD   │  300x600    │
│   MOD CARD   MOD CARD   MOD CARD   MOD   │  (sticky)   │
│                                    CARD   │             │
├───────────────────────────────────────────┤             │
│         [ IN-FEED AD - FULL WIDTH ]       │             │
├───────────────────────────────────────────┤             │
│   MOD CARD   MOD CARD   MOD CARD   MOD   │             │
│                                    CARD   │             │
│   MOD CARD   MOD CARD   MOD CARD   MOD   │             │
│                                    CARD   │             │
├───────────────────────────────────────┬───┴─────────────┤
│         [ BOTTOM CONTENT AD ]          │                │
├────────────────────────────────────────┴────────────────┤
│                       FOOTER                             │
└─────────────────────────────────────────────────────────┘
```

### Homepage Layout (Mobile)

```
┌─────────────────────┐
│       NAVBAR        │
├─────────────────────┤
│    HERO / SEARCH    │
├─────────────────────┤
│   [ MOBILE AD ]     │
├─────────────────────┤
│     FILTER BAR      │
├─────────────────────┤
│     MOD CARD        │
│     MOD CARD        │
│     MOD CARD        │
│     MOD CARD        │
├─────────────────────┤
│   [ IN-FEED AD ]    │
├─────────────────────┤
│     MOD CARD        │
│     MOD CARD        │
│     MOD CARD        │
│     MOD CARD        │
├─────────────────────┤
│      FOOTER         │
├─────────────────────┤
│ [ STICKY BOTTOM AD ]│
└─────────────────────┘
```

---

## 🚫 Ad Placements to AVOID

1. **Inside Mod Detail Modal** - Disrupts conversion flow
2. **Interstitials on navigation** - High bounce risk for gaming sites
3. **Auto-play video with sound** - Mediavine doesn't do this, but worth noting
4. **Above the fold only** - Need ads throughout content for RPM
5. **Too close to download buttons** - Accidental clicks = low ad quality score

---

## ⚙️ Mediavine Implementation Steps

### Step 1: Apply to Mediavine
- Go to [mediavine.com/join](https://www.mediavine.com/join)
- Submit your site for review
- Wait 1-2 weeks for approval

### Step 2: Install Mediavine Script

Once approved, add their script to `app/layout.tsx`:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* ... existing head content ... */}
        
        {/* Mediavine Script - Add in production only */}
        {process.env.NODE_ENV === 'production' && (
          <script
            async
            data-cfasync="false"
            src="//scripts.mediavine.com/tags/musthavemods.js"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Step 3: Configure Ad Settings in Mediavine Dashboard

Recommended settings:
- **Video Player**: Enabled (higher RPM)
- **Sticky Sidebar**: Enabled (desktop)
- **Sticky Footer**: Enabled (mobile)
- **In-Content Ads**: Enabled
- **Lazy Loading**: Maximum (for page speed)
- **Ad Density**: Medium-High for gaming content

### Step 4: Create Ad Wrapper Components

```tsx
// components/ads/AdWrapper.tsx
'use client';

import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';

interface AdWrapperProps {
  children: ReactNode;
  className?: string;
  showLabel?: boolean;
}

export const AdWrapper = ({ children, className = '', showLabel = true }: AdWrapperProps) => {
  const { data: session } = useSession();
  
  // Hide ads for premium users
  if (session?.user?.isPremium) {
    return null;
  }
  
  return (
    <div className={`ad-wrapper ${className}`}>
      {showLabel && (
        <span className="text-[10px] text-slate-500 uppercase tracking-wider block text-center mb-1">
          Advertisement
        </span>
      )}
      {children}
    </div>
  );
};
```

### Step 5: Add Placeholder Components for Ad Units

```tsx
// components/ads/InFeedAd.tsx
'use client';

import { AdWrapper } from './AdWrapper';

export const InFeedAd = () => {
  return (
    <AdWrapper className="my-6 py-4 bg-mhm-card/30 rounded-xl">
      {/* Mediavine auto-fills this based on data-ad-unit */}
      <div 
        data-ad-unit="in-feed"
        className="min-h-[250px] flex items-center justify-center"
      />
    </AdWrapper>
  );
};

// components/ads/LeaderboardAd.tsx
'use client';

import { AdWrapper } from './AdWrapper';

export const LeaderboardAd = () => {
  return (
    <AdWrapper className="my-4">
      <div 
        data-ad-unit="leaderboard"
        className="min-h-[90px] max-w-[728px] mx-auto"
      />
    </AdWrapper>
  );
};
```

---

## 📈 Expected Revenue

### RPM Estimates for Gaming/Hobbyist Niche

| Source | Estimated RPM | Notes |
|--------|---------------|-------|
| US Traffic | $15-30 | Highest value |
| UK/CA/AU Traffic | $10-20 | Premium markets |
| EU Traffic | $8-15 | Good value |
| Other | $3-8 | Lower but volume helps |
| **Blended Average** | **$12-20** | Depends on traffic mix |

### Monthly Revenue Projections

| Monthly Sessions | Conservative ($12 RPM) | Optimistic ($20 RPM) |
|------------------|------------------------|----------------------|
| 50,000 (min) | $600 | $1,000 |
| 100,000 | $1,200 | $2,000 |
| 250,000 | $3,000 | $5,000 |
| 500,000 | $6,000 | $10,000 |
| 1,000,000 | $12,000 | $20,000 |

### Revenue Optimization Levers

1. **Increase session duration** → More ad impressions per session
2. **Increase pages per session** → More ads viewed
3. **Focus on US traffic** → Higher RPMs
4. **Enable video ads** → 2-3x higher RPM for video
5. **A/B test ad density** → Find sweet spot

---

## ✅ Pre-Launch Checklist

Before Mediavine application:

- [ ] 50,000+ sessions/month verified in Google Analytics
- [ ] Privacy Policy includes Mediavine section (you already have this!)
- [ ] No copyright issues with content
- [ ] Site loads in < 3 seconds (Core Web Vitals)
- [ ] Mobile-responsive design (you have this!)
- [ ] Original content (mod discovery is original curation)
- [ ] HTTPS enabled (you have this!)

After Mediavine approval:

- [ ] Add Mediavine script to layout.tsx
- [ ] Create AdWrapper component for premium user exclusion
- [ ] Configure dashboard settings (density, video, etc.)
- [ ] Test ads on staging before production
- [ ] Monitor Core Web Vitals after ad implementation
- [ ] Set up Mediavine dashboard alerts for earnings

---

## 🔄 Integration with Subscription Model

Your monetization strategy should be:

```
FREE USERS:
├── See all ads
├── 5 lifetime download clicks
└── Can upgrade to remove ads

PREMIUM USERS ($4.99/mo):
├── NO ADS (huge selling point!)
├── Unlimited downloads
└── Priority support
```

This creates a powerful incentive: "**Go Premium to remove ads AND get unlimited downloads**"

### Revenue Math

If you have:
- 100,000 monthly sessions
- 80% free users (see ads) = 80,000 ad sessions
- 20% premium @ $4.99/mo = 20,000 × $4.99 = ~$4,000/mo (hypothetically if 20,000 users)

More realistically with 5% conversion:
- Ad revenue: 80,000 sessions × $15 RPM = $1,200/mo
- Subscription: 500 premium users × $4.99 = $2,495/mo
- **Total: $3,695/mo**

---

## 📚 Resources

- [Mediavine Publisher Portal](https://reporting.mediavine.com/)
- [Mediavine Help Center](https://help.mediavine.com/)
- [Core Web Vitals Checker](https://web.dev/measure/)
- [Ad Density Best Practices](https://www.mediavine.com/ad-density-best-practices/)

---

**Last Updated:** December 17, 2024
