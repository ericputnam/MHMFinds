# Google vs Bing Traffic Gap Analysis

**Date**: March 9, 2026
**Issue**: Bing sends 82,000 sessions/month vs Google's 6,900 sessions/month (12:1 ratio)

---

## 1. GSC Data Summary (Feb 7 - Mar 7, 2026)

### Overall Performance
| Metric | Value |
|--------|-------|
| Total Clicks | 3,381 |
| Total Impressions | 99,352 |
| Average CTR | 3.4% |
| Average Position | 26.9 |

**Key Insight**: Average position of **26.9** means most content ranks on page 3+ of Google. This is the single biggest factor explaining low Google traffic. Pages on page 3 get virtually zero clicks.

### Device Breakdown
| Device | Clicks | Impressions | CTR | Avg Position |
|--------|--------|-------------|-----|--------------|
| Desktop | 2,795 | 84,083 | 3.3% | 28.6 |
| Mobile | 577 | 14,707 | 3.9% | 17.8 |
| Tablet | 9 | 562 | 1.6% | 13.2 |

**Anomaly**: Desktop has 82.6% of clicks but average position 28.6 (page 3). Mobile performs better positionally (17.8) but gets far fewer impressions. This is unusual for a gaming/mods site where mobile should dominate.

### Top Countries by Clicks
| Country | Clicks | Impressions | CTR | Avg Position |
|---------|--------|-------------|-----|--------------|
| USA | 381 | 24,578 | 1.6% | 43.0 |
| France | 310 | 5,281 | 5.9% | 16.5 |
| Poland | 300 | 5,519 | 5.4% | 14.8 |
| Brazil | 177 | 4,712 | 3.8% | 16.9 |
| UK | 137 | 4,147 | 3.3% | 42.9 |

**Critical Finding**: USA average position is **43.0** (page 5!) with only 1.6% CTR. The English-speaking markets (USA, UK, Canada) all have terrible average positions (43-45), while non-English markets (France, Poland, Italy, Russia) rank much better (14-17). This strongly suggests the site is being outranked by established English-language competitors (TheGamer, GameRant, ModTheSims, Carl's Sims Guide, etc.) but does well in markets where English-language competition is thinner.

### Top Pages
The homepage gets 768 clicks (22.7% of all traffic). After that, traffic is spread thin across ~500+ WordPress blog posts, most getting single-digit clicks.

### blog.musthavemods.com Duplicate Content Issue
Google is still indexing **16+ pages** under the blog.musthavemods.com subdomain despite canonical tags pointing to musthavemods.com. Example:
- `blog.musthavemods.com/sims-4-body-presets/` - 35 clicks, 410 impressions (position 6.8)
- `blog.musthavemods.com/sims-4-trait-mods/` - 11 clicks, 512 impressions (position 9.3)
- `blog.musthavemods.com/sims-4-cas-cheat/` - 1 click, 1,033 impressions (position 10.1)

Google recognizes these as "Alternate page with proper canonical tag" but they still appear in search results and split ranking signals. The blog subdomain pages actually have BETTER positions than many musthavemods.com pages, meaning Google may still trust the original blog domain more.

### Indexing Health
Spot-checked pages show healthy indexing:
- Homepage: Submitted and indexed, crawled today (Mar 9)
- Top blog posts: Submitted and indexed, recent crawls
- No manual actions detected
- Rich results (FAQ schema) working on homepage
- robots.txt is clean and well-configured

---

## 2. Root Cause Analysis

### Primary Cause: Poor Google Rankings (Not an Indexing Problem)

The site IS indexed. The problem is **ranking position**. With an average position of 26.9 overall (and 43.0 in the USA), the site is effectively invisible on Google. By contrast, Bing's less competitive landscape allows the same content to rank much higher.

### Contributing Factors

**A. Bing Traffic is Artificially Inflated by AI Tools**
- Microsoft Copilot routes all searches through Bing; clicks appear as "Bing organic" in analytics
- ChatGPT Search traffic may also be attributed to Bing organic when referrer parsing fails
- Edge browser's default search (Bing) captures significant Windows desktop traffic
- This is a documented industry-wide trend as of mid-2025 (source: mediaandthemachine.substack.com)
- The 82,000 Bing sessions likely includes substantial Copilot/ChatGPT referral traffic

**B. Google's English-Market Competition is Brutal**
- USA position 43.0 vs France position 16.5 tells the whole story
- Sims 4 CC/mods is a mature, competitive niche on Google with established sites (Carl's Sims Guide, ModTheSims, The Sims Resource, GameRant, TheGamer)
- These competitors have years of domain authority, backlinks, and E-E-A-T signals
- Bing's algorithm weighs these factors differently, allowing newer sites to compete

**C. WordPress Proxy Architecture May Confuse Google**
The middleware proxies WordPress content through Vercel/Next.js:
- Google sees `musthavemods.com` serving WordPress HTML with `blog.musthavemods.com` asset URLs
- Canonical rewriting works (confirmed via URL Inspection) but internal linking still references the blog subdomain in some places
- Google is indexing both `musthavemods.com/slug/` and `blog.musthavemods.com/slug/` - splitting authority
- The proxy adds latency to page loads which could hurt Core Web Vitals on Google (Bing doesn't factor CWV as heavily)

**D. Content Quality / E-E-A-T Gaps**
- Most blog posts are listicle-style ("Best Sims 4 X CC") which Google has been devaluing since 2024-2025 HCU
- Author attribution shows "Felister Moraa" across most posts - Google may see this as a content farm signal
- Limited first-person experience signals (screenshots of actual gameplay, personal recommendations)

**E. Branded Traffic Dominance on Google**
Top Google queries are branded ("musthavemods", "must have mods", "musthavemods.com sims 4"). Non-branded competitive queries like "sims 4 mods" (position 54) and "sims 4 cc" (position 65) are buried deep. The site converts its own brand but fails to capture discovery traffic on Google.

---

## 3. Actionable Recommendations

### High Impact (Do First)

1. **Complete the blog.musthavemods.com Migration**
   - There are still 16+ blog.musthavemods.com URLs getting Google impressions
   - Submit removal requests for all blog.musthavemods.com URLs in GSC
   - Ensure 301 redirects are in place from blog subdomain to main domain
   - This consolidates link equity and stops signal splitting

2. **Target Quick-Win Keywords (Position 4-15)**
   - Pages ranking position 4-15 are closest to page 1 visibility
   - Focus on: sims-4-trait-mods (pos 9.3), sims-4-body-presets (pos 6.8), sims-4-cas-cheat (pos 10.1)
   - Update these posts with fresh content, better title tags, and internal links
   - GSC detected 3 formal quick wins (teen-jobs, health-mods, career-mods)

3. **Improve Title Tags for CTR**
   - Current CTR of 3.4% is low even for the positions
   - Add quantity signals, freshness dates ("March 2026"), and emotional triggers
   - Example: "Sims 4 Male Body Presets" -> "47 Best Sims 4 Male Body Presets CC (March 2026)"

### Medium Impact

4. **Add E-E-A-T Signals**
   - Create author pages with credentials for content writers
   - Add "Tested by [Author]" badges with dates
   - Include personal screenshots showing mods in-game
   - Add structured data (Article schema with author info)

5. **Build English-Market Backlinks**
   - The USA/UK/Canada position problem (43-45) suggests weak domain authority in English markets
   - Pursue guest posts on gaming blogs, Reddit community engagement, YouTube collaborations
   - Target .edu gaming community sites

6. **Optimize for Google's Mobile-First Index**
   - Mobile avg position (17.8) is much better than desktop (28.6) but gets fewer impressions
   - Ensure mobile page speed is excellent (LCP < 2.5s, FID < 100ms, CLS < 0.1)
   - The WordPress proxy adds overhead - consider edge caching for WordPress HTML responses

### Lower Impact / Monitoring

7. **Verify Bing Traffic Attribution**
   - Install Clarity (Microsoft's analytics) to understand Bing referral sources
   - Check if GA4 is misattributing Copilot/ChatGPT traffic as Bing organic
   - The 82K Bing number may actually be 40-50K real Bing + 30K Copilot/ChatGPT
   - This would make the gap less alarming (but still significant)

8. **Monitor Google Core Updates**
   - Daily click/impression trends are stable (no sudden drops), so no current penalty
   - The site may have been affected by earlier HCU/core updates
   - Track position changes after each Google update

---

## 4. Expected Impact

If the blog subdomain migration completes and quick-win keywords move to page 1:
- Estimated additional Google clicks: 500-1,000/month from quick wins alone
- If USA average position improves from 43 to 20: ~3-5x increase in US Google traffic
- Realistic target: 8,000-12,000 Google sessions/month within 3-6 months

The Bing traffic advantage will likely persist due to AI tool attribution. This is not necessarily a problem - it represents a genuine traffic source that should be monetized.

---

## Sources
- [Why Does My Site Rank Well on Bing and Not on Google?](https://www.contentpowered.com/blog/site-rank-bing-google/)
- [Bing Beat Google in Organic Traffic to My Blog](https://mediaandthemachine.substack.com/p/bing-beat-google-in-organic-traffic)
- [How Bing Discovery "Steals" Organic Traffic from Google Search](https://www.tldrseo.com/bing-google-organic-traffic/)
- [Why Is Organic Traffic Decreasing in 2026 - 10 Fixes](https://digirevisit.com/why-is-organic-traffic-decreasing/)
- [Google Penalty Recovery: A Comprehensive Guide for 2026](https://www.esearchlogix.com/blog/guide-for-google-penalty-recovery/amp/)
- [High Impressions but Low Clicks](https://www.contentpowered.com/blog/high-impressions-low-clicks/)
