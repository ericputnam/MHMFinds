# MustHaveMods LLC — Agent Team Charter & Growth Strategy

> **Created:** February 25, 2026
> **Entity:** MustHaveMods LLC (S-Corp)
> **Owner:** Eric Putnam
> **Domain:** musthavemods.com
> **Mission:** Scale MustHaveMods from ~$5.7K/month to $20K+/month within 12 months through data-driven, AI-automated growth across multiple revenue streams.

---

## Table of Contents

1. [Business Assessment (Current State)](#1-business-assessment)
2. [Agent Team Org Chart](#2-agent-team-org-chart)
3. [Agent Role Definitions](#3-agent-role-definitions)
4. [Revenue Growth Strategy](#4-revenue-growth-strategy)
5. [Expense Management](#5-expense-management)
6. [Legal & Compliance](#6-legal--compliance)
7. [Weekly Operating Cadence](#7-weekly-operating-cadence)
8. [KPIs & Success Metrics](#8-kpis--success-metrics)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Appendix: Research Sources](#10-appendix)

---

## 1. Business Assessment

### Traffic (GA4, Last 30 Days — Jan 26 to Feb 24, 2026)

| Metric | Value |
|--------|-------|
| Monthly Sessions | **398,619** |
| Monthly Pageviews | **~540,000** |
| Unique Users | **~320,000** |
| Engaged Sessions | **65.4%** |
| Avg Session Duration | **5 min 12 sec** |
| Bounce Rate | **33.4%** |

### Traffic Sources (GA4, Last 30 Days)

| Channel | Sessions | Share | Notes |
|---------|----------|-------|-------|
| Organic Social (Pinterest) | 262,670 | **65.8%** | Primary acquisition channel |
| Organic Search | 112,193 | **28.1%** | Bing dominates (~109K); Google only ~3,300 clicks |
| Direct | 18,780 | 4.7% | Returning users / bookmarks |
| Referral | 2,672 | 0.7% | External links |
| Unassigned | 2,136 | 0.5% | |
| Organic Video | 166 | 0.04% | Negligible |
| Email | 2 | 0% | **No email marketing exists** |

### Google Search Console (Last 28 Days)

| Metric | Value |
|--------|-------|
| Google Clicks | **3,328/month** |
| Google Impressions | **~140,000/month** |
| Average CTR | **~2.4%** |
| Average Position | **~27** |

**Critical Insight:** Organic Search shows 112K sessions in GA4 but only 3,300 from Google. **Bing/DuckDuckGo/Yahoo drive ~97% of organic search traffic.** Google position avg of 27 means massive untapped Google growth.

### Revenue (Verified from Mediavine Dashboard)

| Stream | Monthly Revenue | Notes |
|--------|----------------|-------|
| Mediavine Display Ads | **$5,684** | Last 30 days verified. RPM $13.78, 412K sessions |
| Amazon Affiliate | **~$0–50** | Demographic doesn't convert on Amazon |
| Subscriptions (Stripe) | **$0** | Built but no active subscribers |
| Email | **$0** | No email list exists |
| Sponsored Content | **$0** | Not pursued |
| Digital Products | **$0** | Not built |
| **Total** | **~$5,700/mo** | |

**Historical Context:**
- **2025 full year:** $84,369.20 (~$7,030/month average)
- **2026 YTD (Jan 1 - Feb 25):** $9,126.18 (~$4,890/month — Q1 seasonal dip)
- **Last 30 days:** $5,684.46 (recovering from January lows)
- **Revenue share:** 82% (Loyalty program)
- **Mediavine program tier:** Loyalty (qualified for 2026)

### Audience Profile

- **94% desktop** (actively playing Sims 4 while browsing)
- **~75% female**, 18-35
- **37% US**, strong Brazil, UK, France, Poland, Spain presence
- **58.6% English**, with Portuguese, Spanish, French
- High-intent: saving/downloading mods, not casually browsing
- Engagement: 65%+ engaged sessions, 5+ min average

### Platform Inventory

| Asset | Status |
|-------|--------|
| Next.js 14 App (musthavemods.com) | Active, production |
| WordPress Blog (proxied through apex) | Active, ~100+ posts |
| Pinterest Automation (MHMUtils) | Active, 1-2 pins/day |
| N8N Workflow | Active, article image distribution |
| Mediavine | Active, primary revenue |
| Amazon Associates | Active, not converting |
| Stripe/Subscriptions | Built, no subscribers |
| Monetization Agent | Built, inactive/needs rebuild |
| Admin Panel | Active, full-featured |
| GA4 + GSC + Clarity | Active, tracking |
| Email Marketing | **Does not exist** |
| Reddit | Test workflow only |

### SWOT Analysis

**Strengths:**
- 400K monthly sessions — significant traffic base
- 65% engagement rate — high-quality audience
- Sophisticated tech stack (Next.js + Prisma + AI embeddings)
- Pinterest pipeline driving consistent, growing traffic
- Multi-game architecture ready for expansion
- Strong branded search (position 1.4 for "musthavemods")

**Weaknesses:**
- 66% single-channel dependency on Pinterest
- Google organic is essentially non-existent (position 27 avg)
- Zero revenue diversification beyond Mediavine
- No email list (biggest missed opportunity)
- Affiliate strategy failing (wrong programs for demographic)
- 1 human writer, 5 posts/month (content velocity too low)
- Monetization agent built but not delivering value

**Opportunities:**
- Mediavine RPM optimization (Universal Video Player = instant +34%)
- Email list on 400K/month traffic could build 10K+ subscribers fast
- Programmatic SEO (mod database = thousands of indexable pages)
- Lifestyle affiliate crossover (LTK, fashion, home decor)
- Minecraft + Stardew Valley = untapped game markets
- Digital products (mod lists, guides, templates)
- Sponsored content ($500-2,750/post)

**Threats:**
- Pinterest algorithm changes could devastate traffic overnight
- Mediavine RPM seasonal drops (Q1 especially)
- Google SEO competition in gaming niche
- Platform ToS changes (Pinterest, EA, mod sources)
- Rising AI content competition

---

## 2. Agent Team Org Chart

```
                    ┌─────────────────┐
                    │   OWNER (Human) │
                    │  Eric Putnam    │
                    │  Final approvals│
                    │  Blog writing   │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │  CEO AGENT      │
                    │  (Coordinator)  │
                    │  Weekly plans   │
                    │  Decision maker │
                    └────────┬────────┘
                             │
          ┌──────────┬───────┼───────┬──────────┐
          │          │       │       │          │
    ┌─────┴─────┐ ┌─┴───┐ ┌─┴───┐ ┌─┴───┐ ┌───┴────┐
    │ CFO AGENT │ │ CMO │ │ CTO │ │ CLO │ │ COO    │
    │ Revenue & │ │     │ │     │ │     │ │ Ops &  │
    │ Expenses  │ │     │ │     │ │     │ │ Process│
    └─────┬─────┘ └──┬──┘ └──┬──┘ └──┬──┘ └───┬────┘
          │          │       │       │         │
          │     ┌────┴────┐  │       │         │
          │     │         │  │       │    ┌────┴────┐
          │  ┌──┴──┐ ┌───┴┐ │       │    │ Content │
          │  │ SEO │ │Soc.│ │       │    │ Planner │
          │  │Dir. │ │Med.│ │       │    │ Agent   │
          │  └─────┘ │Dir.│ │       │    └─────────┘
          │          └────┘ │       │
          │                 │       │
     ┌────┴─────────────────┴───┐   │
     │  IMPLEMENTATION SWARM    │   │
     │  (Technical Agents)      │   │
     │  - Frontend Dev Agent    │   │
     │  - Backend Dev Agent     │   │
     │  - WordPress Dev Agent   │   │
     │  - Data Pipeline Agent   │   │
     │  - Analytics Agent       │   │
     └─────────────────────────┘   │
                                    │
                              ┌─────┴─────┐
                              │ Compliance │
                              │ Monitor    │
                              └───────────┘
```

---

## 3. Agent Role Definitions

### CEO Agent — Strategic Coordinator

**Invocation:** Weekly Monday planning session via Claude Code
**Responsibilities:**
- Reviews all KPI dashboards (GA4, GSC, Mediavine, affiliate)
- Produces the **Weekly Execution Plan** (WEP) with prioritized tasks
- Assigns tasks to department agents
- Escalates decisions requiring human approval to Owner
- Conducts monthly strategic reviews with data-driven recommendations
- Maintains this charter document with updated targets

**Data Sources:** GA4 MCP, GSC MCP, Mediavine dashboard, Supabase metrics
**Output:** Weekly Execution Plan (markdown doc in `docs/weekly-plans/`)

**Decision Authority:**
- Autonomous: Task prioritization, content calendar adjustments, SEO task assignment
- Requires Owner Approval: New revenue stream launches, expenses > $50/month, partnership agreements, legal decisions

---

### CFO Agent — Revenue & Expense Management

**Invocation:** Weekly (part of Monday planning), Monthly deep-dive
**Responsibilities:**
- Tracks all revenue streams with daily/weekly/monthly granularity
- Maintains revenue forecast model (actual vs. projected)
- Monitors expenses and flags anomalies
- Produces monthly P&L statement
- Recommends budget allocation for growth investments
- Tracks MoM revenue growth (primary success metric)

**Revenue Tracking:**
```
Monthly Revenue Dashboard
├── Mediavine Ad Revenue (daily from dashboard)
├── Affiliate Revenue
│   ├── Amazon Associates
│   ├── Humble Bundle
│   ├── CDKeys
│   ├── LTK/ShopStyle
│   └── Other programs
├── Digital Product Sales (Stripe/Gumroad)
├── Sponsored Content
├── Email Revenue (affiliate + sponsored sends)
└── Membership/Subscription (Stripe)
```

**Expense Tracking:**
```
Monthly Expense Dashboard
├── Hosting (Vercel) — ~$20/month
├── Database (Prisma/PostgreSQL) — ~$0-25/month
├── BigScoots (WordPress hosting) — ~$X/month
├── Domains — ~$15/year
├── API Costs (OpenAI, Perplexity) — ~$X/month
├── Email Service (ConvertKit/Mailchimp) — $0-29/month
├── Pinterest API — $0
├── Cloudflare — $0
├── Claude Code / AI Tools — ~$X/month
├── Design Tools (Canva) — $0-13/month
└── Total Monthly Burn Rate
```

**Output:** Monthly P&L in `docs/financials/` (git-ignored for security), revenue dashboard updates

---

### CMO Agent — Growth Strategy

**Invocation:** Weekly planning, daily monitoring via automated scripts
**Responsibilities:**
- Owns traffic growth across all channels
- Manages SEO Director and Social Media Director sub-agents
- Plans content calendar (topics for human writer)
- Identifies new audience segments and content opportunities
- Manages affiliate program strategy and partnerships
- Plans seasonal campaigns (Q4 ad revenue push, game launches, holidays)

**Key Strategies (see Section 4 for details):**
1. Google SEO recovery (position 27 → top 10)
2. Pinterest scaling (1-2 pins/day → 3-5 pins/day)
3. Email list building (0 → 10K in 12 months)
4. Affiliate program diversification (Amazon → Humble Bundle, CDKeys, LTK)
5. Minecraft + Stardew Valley content expansion

**Sub-Agents:**

#### SEO Director Agent
- Weekly GSC audit (clicks, impressions, position changes)
- Identifies striking-distance keywords (position 4-20)
- Produces content briefs for blog posts
- Manages programmatic SEO page generation
- Monitors Core Web Vitals
- Manages internal linking strategy

#### Social Media Director Agent
- Manages Pinterest posting strategy (MHMUtils pipeline)
- Monitors Pinterest analytics (impressions, saves, clicks)
- Plans pin content calendar
- Manages Reddit community engagement (when activated)
- Tracks social referral traffic in GA4

---

### CTO Agent — Technical Implementation

**Invocation:** As-needed based on Weekly Execution Plan tasks
**Responsibilities:**
- Owns all technical implementation across the stack
- Manages the Implementation Swarm (sub-agents for specific tasks)
- Ensures code quality, security, and performance
- Monitors site uptime and Core Web Vitals
- Implements new features requested by CMO/CFO

**Implementation Swarm:**

| Agent | Domain | Key Tasks |
|-------|--------|-----------|
| Frontend Dev | Next.js app | UI changes, new pages, email capture forms |
| Backend Dev | API routes, Prisma | New endpoints, data models, integrations |
| WordPress Dev | Blog, Kadence theme | Ad placement, content formatting, WP plugins |
| Data Pipeline | Scripts, scrapers | Mod aggregation, analytics sync, automation |
| Analytics Agent | GA4, GSC, dashboards | Report generation, anomaly detection |

---

### CLO Agent — Legal & Compliance

**Invocation:** Monthly review, on-demand for legal questions
**Responsibilities:**
- Monitors compliance with ad network ToS (Mediavine, Google AdSense policies)
- Reviews affiliate disclosure requirements (FTC compliance)
- Ensures GDPR/CCPA compliance for user data collection
- Monitors copyright/DMCA considerations for mod content
- Reviews platform ToS changes (Pinterest, EA, CurseForge)
- Advises on trademark protection for "MustHaveMods" brand
- Reviews contracts/agreements before Owner signs

**Standing Requirements:**
- Every page with affiliate links MUST have FTC disclosure
- Privacy Policy and Terms of Service must be current
- Cookie consent banner for EU visitors (GDPR)
- CCPA opt-out mechanism for California users
- Affiliate relationships disclosed per FTC 16 CFR Part 255
- Content scraping must respect robots.txt and ToS

---

### COO Agent — Operations & Process

**Invocation:** Weekly planning, process optimization as-needed
**Responsibilities:**
- Manages the Content Planner Agent
- Optimizes operational workflows and automation
- Monitors cron jobs, API health, pipeline reliability
- Manages the compound learning system
- Ensures weekly plans are executed and tracked

#### Content Planner Agent
- Produces weekly content suggestions for human writer
- Bases suggestions on: GSC keyword gaps, trending topics, seasonal relevance, RPM data
- Formats as actionable briefs with:
  - Target keyword(s) and search volume
  - Suggested title and outline
  - Internal linking targets
  - Estimated traffic impact
  - Affiliate integration opportunities

---

## 4. Revenue Growth Strategy

### Phase 1: Quick Wins (Weeks 1-4) — Target: +$1,000-2,000/month

These require minimal effort and can be implemented immediately.

#### 4.1.1 Mediavine — Fix What's Broken, Test What's Left

**Verified Mediavine Settings Audit (Feb 25, 2026):**
The following are ALREADY optimized — no action needed:
- Universal Video Player: ON (desktop + mobile)
- Video placement optimization: ON (mobile + desktop)
- Mid-Roll: ON
- CWV optimization: ALL ON (mobile, desktop, CLS)
- Adhesion units: ALL ON (mobile, tablet, desktop, close button OFF)
- Slidebar Ad: ON
- GumGum In-Image Ads: ON
- Ad Block Recovery: ON
- In-Content: "Optimize Ad Experience" mode
- Sticky Sidebar CLS: ON

**Action Items (actually remaining):**

1. **FIX ads.txt — P0 CRITICAL** (already implemented in vercel.json)
   - Mediavine dashboard warns: "Ads may become unavailable" while ads.txt is missing
   - Root cause: middleware catch-all was intercepting `/ads.txt` requests
   - Fix: Added vercel.json rewrite to proxy `/ads.txt` to WordPress origin
   - Expected impact: **Unknown but potentially significant** — missing ads.txt means some demand partners can't bid on your inventory, directly suppressing RPM
   - Status: Fix deployed in vercel.json, needs Vercel deploy to take effect

2. **Test Desktop Interstitial Ads** (currently OFF)
   - Full-screen, high-CPM ads shown between page clicks
   - Your audience is **94% desktop** — this unit could be meaningful
   - Risk: May increase bounce rate. Run 7-day test, compare RPM vs bounce.
   - Expected impact: **+$200-500/month** if RPM gain outweighs bounce increase

3. **Test Mobile Interstitial Ads** (currently OFF, lower priority)
   - Only 6% of traffic is mobile — limited impact
   - Expected impact: **+$50-100/month**

4. **Investigate Grow Subscribe / First-Party Data**
   - Grow is included in your Loyalty tier
   - Authenticated traffic earns up to 60% more on ad impressions
   - Grow Subscribe can simultaneously build an email list
   - Status: Needs login to grow.me dashboard to check current configuration
   - Potential impact: **+10-20% RPM on authenticated users** (need to verify if already active)

5. **Ad Color Mode consideration**
   - Currently set to "Light" — your site uses a dark theme (#0B0F19)
   - Switching to "Dark" may improve visual integration and reduce ad blindness
   - Low risk, easy to test

**Realistic Mediavine Impact:**
- Current: $5,684/month (RPM $13.78)
- After ads.txt fix + interstitial test: **$6,000-6,500/month** (+5-15%)
- Mediavine settings are already well-optimized. Major RPM growth will come from content length, session depth, and seasonal (Q4) improvements, not settings toggles.

#### 4.1.2 Affiliate Program Diversification

**Drop Amazon. Activate these:**

| Program | Commission | Why It Fits | Apply URL |
|---------|-----------|-------------|-----------|
| Humble Bundle | 8% (4-12% range) | Game bundles, Sims-adjacent titles | humblepartners.humblebundle.com |
| CDKeys | 5% new / 2% existing | Discounted Sims 4 expansion packs | cdkeys.com/affiliates |
| EA Origin (FlexOffers) | Varies | Direct Sims 4 pack sales | flexoffers.com |
| Razer | Up to 12% | Pink Quartz line targets your demo | razer.com/affiliate |
| SecretLab | Up to 12% | Gaming chairs, $400-600 AOV | secretlab.co/affiliate |

**Content to create:**
- "Where to Buy Sims 4 Expansion Packs Cheapest" (CDKeys affiliate)
- "Best Gaming Setup for Sims 4 Players" (Razer, SecretLab)
- "Games Like The Sims 4 — Best Simulation Games Bundle" (Humble Bundle)

#### 4.1.3 Email List Foundation

**Setup (Week 1):**
- Sign up for ConvertKit free tier (up to 1,000 subscribers) or Mailchimp free
- Connect to Mediavine Grow Subscribe
- Create lead magnet: **"The Ultimate Sims 4 CC Starter Pack — 100+ Essential Mods, Tested & Compatible"**
  - This costs nothing to create — you already curate this data
  - Format: PDF or landing page with download links
- Place email capture: Grow Spotlight widget + dedicated landing page

**Growth projection:**
- At 400K sessions/month and 0.5% conversion rate = **2,000 new subscribers/month**
- 3-month target: 6,000 subscribers
- 6-month target: 12,000 subscribers
- Revenue begins at 5,000+ subscribers

---

### Phase 2: SEO Recovery (Weeks 2-12) — Target: +$2,000-4,000/month

Google organic is the biggest untapped growth lever. Position 27 average with 140K impressions means massive lost clicks.

#### 4.2.1 Striking-Distance Content Refresh

**Process (SEO Director Agent runs weekly):**
1. Pull GSC data for pages with position 4-30 and 100+ impressions
2. Prioritize by: (impressions × potential CTR improvement)
3. Produce content refresh briefs:
   - Add 500-1,000 words of new, relevant content
   - Update meta title for CTR (keyword-first, under 60 chars)
   - Add FAQ schema markup
   - Improve internal linking (3-5 relevant links per post)
   - Update images and alt text
4. Human writer executes refresh OR agent auto-updates meta/schema

**Top 10 Immediate Refresh Targets (from GSC data):**

| Page | Clicks | Impressions | Position | Action |
|------|--------|-------------|----------|--------|
| /sims-4-skin-overlay/ | 86 | 3,144 | 23.8 | Content refresh + schema |
| /sims-4-wicked-whims-exception-error/ | 35 | 2,216 | 12.2 | Meta title + FAQ schema |
| /sims-4-custom-content-packs/ | 45 | 2,120 | 38.2 | Major refresh + internal links |
| /sims-4-reshade/ | 34 | 2,107 | 24.3 | Content expansion |
| /sims-4-male-body-presets-cc/ | 111 | 2,309 | 13.5 | Already good — optimize meta |
| /sims-4-male-skin-details/ | 74 | 1,839 | 13.0 | Schema + internal links |
| /sims-4-korean-cc/ | 34 | 1,468 | 14.6 | Content refresh |
| /sims-4-female-clothes-cc/ | 37 | 1,347 | 30.4 | Major refresh needed |
| /sims-4-vampire-cc/ | 70 | 1,287 | 15.3 | Optimize for featured snippet |
| /best-sims-4-wedding-cc/ | 47 | 1,245 | 14.1 | Seasonal + schema |

**Expected outcome:** 2-5 position improvement per page. A page moving from position 25 to position 10 can see 5-10x click increase.

#### 4.2.2 Programmatic SEO

**Your mod database is a programmatic SEO goldmine.**

Template pages to generate at scale:
1. **Mod Category Pages**: `/sims-4/[category]/` — e.g., "/sims-4/hair-cc/", "/sims-4/furniture-mods/"
2. **Creator Pages**: `/creators/[handle]/` — already built, ensure indexable
3. **Tag Combination Pages**: `/sims-4/maxis-match-hair/`, `/sims-4/alpha-clothes/`
4. **Pack-Specific Pages**: "/sims-4/mods-for-seasons/", "/sims-4/base-game-cc/"

**Implementation:**
- Start with 50-100 highest-value pages
- Each page must have unique, meaningful content (not just database fields)
- Use AI to generate 200-300 word descriptions per page
- Separate XML sitemap for programmatic pages
- Drip-feed: add 20-50 pages per week (don't dump thousands at once)

**Expected outcome:** 500-2,000+ new indexed pages within 6 months. Long-tail traffic of 5-20 clicks/page/month = 2,500-40,000 additional monthly clicks.

#### 4.2.3 Internal Linking Architecture (Hub & Spoke)

**Hub Pages** (comprehensive pillar content):
- /sims-4-cc/ (all CC overview)
- /sims-4-mods/ (all gameplay mods)
- /stardew-valley-mods/ (new game hub)
- /minecraft-mods/ (new game hub)

**Spoke Pages** (specific topics linking back to hub):
- Individual mod posts, category pages, creator pages

**Implementation:**
- Every spoke page links to its hub (1-2 links)
- Hub pages link to all relevant spokes
- Cross-link between related hubs
- Expected outcome: **50% increase in organic traffic within 6 months** (industry benchmark)

---

### Phase 3: Revenue Diversification (Months 2-6) — Target: +$3,000-6,000/month

#### 4.3.1 Digital Products

**Product 1: "Sims 4 CC Mega Guide"** ($9-19)
- Curated mod list with 500+ tested, compatible mods
- Organized by category with screenshots
- Updated monthly (subscription potential)
- Sell via Gumroad (low fees) or Stripe (already integrated)

**Product 2: "Mod Organizer Template"** ($5-9)
- Notion or Google Sheets template
- Track installed mods, compatibility, favorites
- Nearly zero production cost

**Product 3: "Build Challenge Pack"** ($3-7)
- Printable challenge cards + digital checklist
- Legacy challenge tracker, 100 baby challenge, build prompts
- Low effort, high perceived value for community

**Sales Channel:** Email list + blog post CTAs + Pinterest pins
**Target:** 50-200 sales/month at $10 avg = $500-2,000/month

#### 4.3.2 Sponsored Content

**Approach:**
- Do NOT cold pitch. Create a "Advertise With Us" page with traffic stats
- Target: Gaming companies, CC tool makers, lifestyle brands
- Rates: $500-1,500/post (conservative for your traffic level)
- Target: 2-4 sponsored posts/month

**Potential sponsors:**
- EA / Maxis (game updates, pack launches)
- CC creation tools (Sims 4 Studio, Blender plugins)
- Gaming peripheral companies (Razer, Logitech)
- Lifestyle brands targeting your demographic

#### 4.3.3 Lifestyle Affiliate Crossover

**Strategy:** Bridge gaming aesthetic with real-world products.

**Apply to LTK (formerly rewardStyle):**
- 10-25% commission (up to 30%)
- Perfect for your 75% female, lifestyle-conscious audience
- Content types:
  - "Sims 4 Fashion CC Inspired By Real Outfits" (link real products)
  - "Decorate Your Room Like Your Sims Build" (home decor links)
  - "Cozy Gaming Setup Essentials" (lifestyle + gaming crossover)

**Apply to Collective Voice (ShopStyle):**
- 70/30 revenue share with 1,400+ retailers
- Nordstrom, Macy's, Saks partnerships
- Commission rates up to 50%

#### 4.3.4 Email Monetization

**Once list reaches 5,000+ subscribers:**
- Weekly newsletter with 1 affiliate recommendation = $200-500/month
- Monthly sponsored email send = $150-375 per send (at $30 CPM)
- Product launch emails (3-5% conversion rate vs 1-2% on-site)
- Welcome sequence with affiliate links = passive revenue

---

### Phase 4: Scale & Compound (Months 6-12) — Target: $15,000-20,000+/month

#### 4.4.1 Multi-Game Expansion

Minecraft and Stardew Valley are set up but have zero content. Each game represents a new traffic vertical.

**Content Plan:**
- 2 posts/month per new game (human writer or contracted)
- Pinterest boards for each game (replicate Sims 4 strategy)
- Programmatic SEO pages from mod database
- Separate email segments per game

**Target:** Each game at 20% of Sims 4 traffic within 12 months = +80K sessions/month each

#### 4.4.2 Pinterest Scaling

Current: 1-2 pins/day → Target: 3-5 pins/day
- Increase banner pin frequency
- Add Idea Pins (multi-page format, higher engagement)
- Expand to Minecraft and Stardew Valley boards
- A/B test pin designs
- Direct affiliate pins (allowed on Pinterest)

#### 4.4.3 Community/Membership

**Discord Server + Premium Tier:**
- Free tier: General chat, mod recommendations
- Premium ($5/month): Early access to curated lists, exclusive creator Q&As, priority support
- Target: 200-500 paying members = $1,000-2,500/month

#### 4.4.4 Compound Growth Effects

By month 12, multiple revenue streams create compounding:
- Higher traffic → more Mediavine revenue AND more email signups
- Larger email list → more product sales AND more affiliate clicks
- More content → better SEO → more organic traffic → more ad revenue
- Multi-game → diversified traffic sources → platform risk reduction

---

### Revenue Projection Summary

| Revenue Stream | Now (Verified) | Month 3 | Month 6 | Month 12 |
|---------------|-----|---------|---------|----------|
| Mediavine (ads.txt fix + seasonal recovery) | $5,684 | $6,500 | $7,500 | $9,000 |
| Affiliate (diversified away from Amazon) | $50 | $500 | $1,500 | $3,000 |
| Digital Products | $0 | $300 | $1,000 | $2,500 |
| Sponsored Content | $0 | $750 | $1,500 | $3,000 |
| Email Revenue | $0 | $100 | $500 | $1,500 |
| Membership | $0 | $0 | $500 | $1,500 |
| **Total** | **$5,734** | **$8,150** | **$12,500** | **$20,500** |
| **MoM Growth** | — | +14% | +15% | +8% |

**Notes on Mediavine projection:**
- Q1 (Jan-Mar) is historically lowest RPM. 2025 avg was $7,030/month.
- Q4 (Oct-Dec) is highest — expect $8,000-10,000/month from Mediavine alone.
- ads.txt fix should recover suppressed demand immediately.
- Traffic growth from SEO/Pinterest compounds Mediavine revenue naturally.
- $9,000/month by Month 12 is conservative given 2025 performance + traffic growth.

---

## 5. Expense Management

### Current Monthly Expenses (Estimated)

| Category | Cost | Notes |
|----------|------|-------|
| Vercel Hosting | $20 | Pro plan |
| BigScoots (WordPress) | $35-50 | Managed WordPress |
| Domains | $2 | ($15/year amortized) |
| Prisma Accelerate | $0-25 | Based on usage |
| OpenAI API | $5-20 | Embeddings, search |
| Perplexity API | $5-20 | Research |
| Claude Code | $20-100 | Based on usage |
| Pinterest API | $0 | Free tier |
| Cloudflare | $0 | Free tier |
| **Current Total** | **~$100-250/mo** | |

### Planned New Expenses

| Category | Cost | When | ROI Justification |
|----------|------|------|-------------------|
| ConvertKit (email) | $0-29/mo | Month 1 | Free to 1K subs; $1-2/sub/year revenue |
| Gumroad (products) | 10% per sale | Month 2 | Only pays when you earn |
| Canva Pro (pin design) | $13/mo | Month 1 | Better pin images → more clicks |
| Content contractor (optional) | $100-300/mo | Month 4+ | For Minecraft/Stardew posts |
| **Planned Total** | **~$50-350/mo** | | |

### Expense Rules (CFO Agent Enforced)

1. **No expense without projected ROI.** Every new cost must have a data-backed justification.
2. **Revenue-first spending.** New expenses only after corresponding revenue stream is proven.
3. **Monthly burn rate cap:** $500/month until revenue exceeds $10K/month.
4. **Quarterly expense audit.** CFO Agent reviews all expenses, cuts anything with negative ROI.
5. **Free-tier first.** Always start with free versions. Upgrade only when limits are hit.

---

## 6. Legal & Compliance

### Standing Legal Requirements

#### FTC Affiliate Disclosure
- **Every page with affiliate links** must have clear disclosure
- Disclosure must be "clear and conspicuous" — near the top of the page, not buried in footer
- Recommended text: *"This post contains affiliate links. If you make a purchase through these links, MustHaveMods may earn a commission at no additional cost to you."*
- Pinterest pins with affiliate links need disclosure in description

#### Privacy & Data
- **Privacy Policy** must cover: data collection, cookies, third-party services (Mediavine, GA4, Clarity), user rights
- **GDPR**: Cookie consent banner for EU visitors (you have strong EU traffic: France, Poland, Spain, UK)
- **CCPA**: Opt-out mechanism for California users
- **Mediavine CMP**: Mediavine provides a Consent Management Platform — ensure it's enabled

#### Copyright & Content
- Mod screenshots and descriptions: Fair use for review/curation purposes
- Always attribute mod creators
- Respond promptly to DMCA takedown requests
- Do NOT host mod files directly — link to creator's distribution platform

#### Trademark
- Consider trademark registration for "MustHaveMods" (word mark)
- Monitor for domain squatters and brand impersonation
- Cost: ~$250-350 for USPTO filing (can be done via self-filing)

#### Tax (S-Corp)
- Maintain clean revenue/expense records (CFO Agent responsibility)
- Quarterly estimated tax payments
- Deductible expenses: hosting, tools, API costs, contractor payments
- Consult CPA for S-Corp salary vs. distribution optimization

---

## 7. Weekly Operating Cadence

### Monday: Planning Day (CEO Agent)

**Morning Session (30-45 min Claude Code session):**

1. **Data Pull** (automated via MCP tools):
   - GA4: Last 7 days sessions, pageviews, traffic sources, top pages
   - GSC: Last 7 days clicks, impressions, position changes, new keywords
   - Mediavine: Last 7 days RPM, revenue, top-earning pages
   - Pinterest: Last 7 days impressions, saves, clicks
   - Email: Subscribers added, open rate, click rate
   - Affiliate: Clicks, conversions, revenue

2. **KPI Dashboard Update:**
   - Week-over-week changes for all metrics
   - Flag any anomalies (traffic drops, RPM changes, ranking losses)
   - Update running MoM revenue tracker

3. **Weekly Execution Plan (WEP):**
   - Review prior week's completed/incomplete tasks
   - Prioritize this week's tasks by impact
   - Assign to department agents
   - Identify any tasks requiring Owner input

4. **Content Brief for Writer:**
   - 1-2 blog post topics with SEO data, outlines, and keyword targets
   - Based on: GSC keyword gaps, trending topics, seasonal calendar

**Output:** `docs/weekly-plans/WEP-YYYY-MM-DD.md`

### Tuesday-Thursday: Execution Days

**Automated (no human input required):**
- Pinterest pins posted (6am cron)
- N8N article image distribution
- Email welcome sequences (if new subscribers)
- Monitoring scripts run

**Agent-Executed (via Claude Code sessions as needed):**
- SEO Director: Content refresh implementations, meta tag updates
- CTO: Technical tasks from WEP
- WordPress Dev: Blog optimizations, ad placement changes
- Analytics Agent: Mid-week data check

### Friday: Review Day (CEO Agent)

**Afternoon Session (15-20 min):**
1. Task completion check — what shipped this week?
2. Quick metrics check — any Friday anomalies?
3. Prepare weekend content (Pinterest has high weekend traffic)
4. Update task backlog for next Monday

### Monthly: Deep Dive (First Monday)

**Extended Session (60-90 min):**
1. Full month P&L review (CFO Agent)
2. MoM revenue growth calculation
3. Traffic trend analysis by channel
4. SEO ranking changes (month-over-month)
5. Email list growth and engagement
6. Affiliate performance review
7. Expense audit
8. Strategy adjustments for next month
9. Content calendar for next month
10. Owner review and approval of any strategic changes

**Output:** `docs/monthly-reviews/REVIEW-YYYY-MM.md`

---

## 8. KPIs & Success Metrics

### Primary KPI: Monthly Revenue (MoM Growth)

**Target: 15-30% MoM growth for first 6 months, 8-15% MoM for months 6-12**

### Revenue KPIs

| Metric | Current (Verified) | Month 3 Target | Month 6 Target | Month 12 Target |
|--------|---------|----------------|----------------|-----------------|
| Total Monthly Revenue | $5,734 | $8,150 | $12,500 | $20,500 |
| Mediavine RPM | $13.78 | $15 | $16 | $18 |
| Mediavine Monthly Rev | $5,684 | $6,500 | $7,500 | $9,000 |
| Affiliate Monthly Rev | $50 | $500 | $1,500 | $3,000 |
| Email Subscribers | 0 | 4,000 | 10,000 | 20,000 |
| Revenue Streams Active | 1 | 4 | 6 | 6 |

### Traffic KPIs

| Metric | Current | Month 3 Target | Month 6 Target | Month 12 Target |
|--------|---------|----------------|----------------|-----------------|
| Monthly Sessions | 399K | 425K | 500K | 650K |
| Google Organic Clicks | 3,300 | 5,000 | 10,000 | 25,000 |
| Pinterest Sessions | 263K | 280K | 310K | 350K |
| Email Traffic | 0 | 2,000 | 8,000 | 20,000 |
| Avg Google Position | 27 | 22 | 16 | 12 |

### Engagement KPIs

| Metric | Current | Target |
|--------|---------|--------|
| Engaged Sessions | 65.4% | 68%+ |
| Avg Session Duration | 5:12 | 5:30+ |
| Pages per Session | 1.35 | 1.8+ |
| Email Open Rate | N/A | 35%+ |
| Email Click Rate | N/A | 5%+ |

### Content KPIs

| Metric | Current | Target |
|--------|---------|--------|
| Blog Posts/Month | 5 | 8-10 |
| Pinterest Pins/Day | 1-2 | 3-5 |
| Programmatic Pages | 0 | 500+ |
| Content Refreshes/Month | 0 | 4-8 |

---

## 9. Implementation Roadmap

### Week 1: Foundation (Fix Critical Issues + Start Revenue Diversification)

| Task | Agent | Priority | Expected Impact |
|------|-------|----------|-----------------|
| **Deploy ads.txt fix** (already in vercel.json) | CTO | P0 | Recover suppressed ad demand — RPM lift |
| Investigate Grow Subscribe status on grow.me | CTO | P0 | Potential +10-20% RPM on authenticated traffic |
| Test Desktop Interstitial Ads (7-day test) | CTO/WordPress | P1 | +$200-500/month if RPM > bounce impact |
| Switch ad Color Mode to Dark | CTO/WordPress | P2 | Better visual integration with dark theme |
| Sign up ConvertKit free tier | COO | P0 | Email infrastructure |
| Create lead magnet: CC Starter Pack | Content Planner | P1 | Email capture begins |
| Apply: Humble Bundle affiliate | CMO | P1 | New revenue stream |
| Apply: CDKeys affiliate | CMO | P1 | New revenue stream |
| Set up weekly plan template | CEO | P1 | Operating rhythm |
| FTC disclosure audit (all pages) | CLO | P1 | Legal compliance |

### Week 2: SEO Foundation

| Task | Agent | Priority | Expected Impact |
|------|-------|----------|-----------------|
| GSC striking-distance audit | SEO Director | P0 | Identify top 20 refresh targets |
| Refresh top 5 striking-distance pages (meta only) | SEO Director | P0 | Quick position improvements |
| Add FAQ schema to top 10 blog posts | CTO/Backend | P1 | Rich snippets in SERP |
| Internal linking audit (identify orphan pages) | SEO Director | P1 | Better crawlability |
| Begin programmatic SEO template (category pages) | CTO/Frontend | P1 | Scalable page generation |
| Apply: EA Creator Network | CMO | P2 | Partnership pipeline |
| Apply: LTK (lifestyle affiliate) | CMO | P2 | High-commission crossover |

### Weeks 3-4: Content & Affiliate

| Task | Agent | Priority | Expected Impact |
|------|-------|----------|-----------------|
| First content brief to writer (SEO-optimized) | Content Planner | P0 | Data-driven content |
| Launch email welcome sequence (3-5 emails) | COO/Backend | P0 | Subscriber onboarding |
| Implement affiliate links on top 10 pages | CMO | P1 | Revenue from existing traffic |
| Create "Advertise With Us" page | CTO/Frontend | P1 | Sponsored content pipeline |
| Deploy first batch of 25 programmatic pages | CTO | P1 | New indexed pages |
| Pinterest posting increase to 3/day | Social Media Dir | P1 | More Pinterest traffic |
| Create first digital product (CC Mega Guide) | Content Planner | P2 | New revenue stream |

### Month 2: Acceleration

| Task | Agent | Priority |
|------|-------|----------|
| Content refresh: next 10 striking-distance pages | SEO Director | P0 |
| Deploy next 50 programmatic pages | CTO | P0 |
| Launch digital product on Gumroad | CMO | P1 |
| First sponsored content pitch | CMO | P1 |
| Pinterest Idea Pins rollout | Social Media Dir | P1 |
| Hub-and-spoke linking implementation | SEO Director | P1 |
| Email list: first affiliate newsletter send | CMO | P2 |
| GDPR cookie consent audit | CLO | P2 |

### Month 3: Diversification

| Task | Agent | Priority |
|------|-------|----------|
| Minecraft content: first 2 blog posts | Content Planner | P1 |
| Stardew Valley content: first 2 blog posts | Content Planner | P1 |
| Deploy programmatic pages to 200+ | CTO | P1 |
| Second digital product launch | CMO | P1 |
| Email: first sponsored newsletter send | CMO | P1 |
| Review all affiliate performance, cut losers | CFO | P1 |
| Monthly deep-dive: first full P&L | CFO | P0 |

### Months 4-6: Scale

- Programmatic pages → 500+
- New game content → 4 posts/month each
- Email list → 10K subscribers
- Activate Reddit community engagement
- Launch Discord community
- Explore membership tier
- Target: $12,500/month revenue

### Months 7-12: Compound

- Programmatic pages → 1,000+
- Email → 20K subscribers
- All 6 revenue streams active and growing
- Multi-game traffic diversification
- Pinterest channel risk reduced below 50%
- Target: $20,000+/month revenue

---

## 10. Appendix

### How to Invoke Agent Sessions

Each agent session is a Claude Code conversation. Use the following patterns:

```bash
# Monday Planning (CEO Agent)
# Start a new Claude Code session and say:
"Run the Monday CEO planning session. Pull GA4, GSC, and review
last week's WEP. Generate this week's WEP."

# SEO Director Session
"Run the SEO Director weekly audit. Pull GSC data, identify
striking-distance keywords, and produce content refresh briefs."

# CFO Monthly Review
"Run the CFO monthly deep-dive. Pull all revenue data, calculate
MoM growth, produce the monthly P&L."

# Content Planner
"Run the Content Planner. Based on GSC gaps and trending topics,
produce 2 content briefs for this week's blog posts."
```

### MCP Tools Available

| Tool | Used By | Purpose |
|------|---------|---------|
| `mcp__google-analytics__run_report` | CEO, CFO, CMO | Traffic data |
| `mcp__google-analytics__run_realtime_report` | CEO | Live traffic check |
| `mcp__gsc__search_analytics` | SEO Director | Search performance |
| `mcp__gsc__enhanced_search_analytics` | SEO Director | Advanced search + quick wins |
| `mcp__gsc__detect_quick_wins` | SEO Director | Auto-identify SEO opportunities |
| `mcp__gsc__index_inspect` | SEO Director | Check indexing status |
| `mcp__alpaca__*` | CFO (if applicable) | Investment/treasury |

### Revenue Tracking Template

```markdown
## Revenue — Week of YYYY-MM-DD

### Mediavine
- Daily avg RPM: $X.XX
- Weekly pageviews: X,XXX
- Weekly revenue: $X,XXX

### Affiliate
- Humble Bundle: $X (X clicks, X conversions)
- CDKeys: $X (X clicks, X conversions)
- LTK: $X (X clicks, X conversions)
- Other: $X

### Digital Products
- CC Mega Guide: X sales × $X = $X
- Other: $X

### Sponsored Content
- [Brand]: $X (published MM/DD)

### Email
- Subscribers: X,XXX (+XXX this week)
- Revenue from email: $X

### Total Week: $X,XXX
### Running Monthly Total: $X,XXX
### MoM Trajectory: +XX%
```

### Key Research Sources

- Mediavine RPM optimization: productiveblogging.com, mediavine.com/blog
- Affiliate programs: authorityhacker.com, getlasso.co
- Pinterest monetization: hilltopads.com, improvado.io
- Revenue diversification: writenest9.com, influencermarketinghub.com
- Programmatic SEO: semrush.com, getpassionfruit.com
- Email list building: quicksprout.com, campaignrefinery.com
- Content refresh ROI: seo-day.de, searchengineland.com
- Hub-and-spoke model: seo-kreativ.de

---

## Document History

| Date | Change |
|------|--------|
| 2026-02-25 | Initial charter created with real GA4/GSC data |
| 2026-02-25 | Corrected with verified Mediavine dashboard data: $5,684/mo, RPM $13.78, 2025 total $84K. Removed false "quick wins" (Universal Player, adhesion, ad density already enabled). Added ads.txt fix (vercel.json rewrite). Updated all projections. |

---

*This document is the operating manual for the MustHaveMods agent team. It should be reviewed and updated monthly during the CEO deep-dive session. All revenue projections are estimates based on industry benchmarks and current traffic data — actual results will be tracked in weekly/monthly reviews.*
