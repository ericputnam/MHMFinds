# Mediavine Dashboard Settings Audit

**Date**: March 9, 2026
**Note**: Unable to access the Mediavine publisher dashboard directly (requires authenticated browser session). This audit is based on Mediavine's official recommended settings documentation and best practices for gaming/mods niche sites.

---

## 1. Settings Checklist - Verify Each in Dashboard

Go to https://publishers.mediavine.com/sites/SW50ZXJuYWxTaXRlOjE0MzE4/settings and verify/adjust the following:

### A. In-Content Ad Settings (SETTINGS > IN CONTENT ADS)

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| Ad Limits | **Optimized for Content Length** | Lets Mediavine auto-scale ads based on post length. Never hard-cap. |
| Mobile Ad Density | **28-30%** | Default 28% is safe. Gaming niche tolerates 30% well since users expect ad-heavy content. |
| Desktop Ad Density | **20%** | Default. Desktop has sidebar ads supplementing, so in-content can stay moderate. |
| Minimum Ad Spacing | **2** (default) | If posts use short paragraphs (common in listicles), consider increasing to **3** to avoid ad stacking. |
| Placement Rules | **Anywhere** (default) | "Only after text paragraphs" would kill RPM on image-heavy mod posts. Keep default. |

### B. Adhesion Units (SETTINGS > AD UNITS)

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| Mobile Adhesion | **ON** | Sticky bottom-of-screen ads are high-RPM. Should always be enabled. |
| Desktop Adhesion | **ON** | Same principle. Gaming audiences are used to adhesion ads. |
| Adhesion Close Button | **Mediavine Default** | Don't force always-visible close - it reduces viewability time. |

### C. Sidebar Settings

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| Sidebar Sticky Ad | **ON** | When users scroll past sidebar content, a sticky ad follows. More time visible = more refreshes = higher RPM. |
| Sidebar Length | **Shorten if possible** | The shorter the sidebar, the faster users reach the sticky ad zone. Remove unnecessary sidebar widgets. |

### D. Video Settings (SETTINGS > VIDEO) - HIGH IMPACT

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| Universal Player - Mobile | **ON** | Mediavine reports average **34% RPM increase** from Universal Player. This is the single highest-impact setting. |
| Universal Player - Desktop | **ON** | Same benefit on desktop. |
| Autoplay | **ON** (muted) | Muted autoplay is industry standard and doesn't annoy users. Massive RPM boost. |
| Sticky Player | **ON** | Player follows user as they scroll, increasing viewability. |
| Outstream Video Adhesion | **ON** | Runs video ads on pages without embedded videos. |

**If Universal Player is currently OFF, turning it ON is the #1 action item from this audit.**

### E. Optimize for Pagespeed (SETTINGS > GENERAL)

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| Optimize Ads for Mobile Pagespeed | **ON** | Lazy-loads ads to improve Core Web Vitals. Critical since Google uses CWV for ranking. |
| Optimize Ads for Desktop Pagespeed | **ON** | Same for desktop. |
| Optimize for Core Web Vitals | **ON** | Must be enabled. Delays ad loading until after LCP. |

### F. Ad Category Opt-Outs (SETTINGS > AD CATEGORIES)

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| Category Opt-Outs | **NONE (or minimal)** | Each category opted out reduces advertiser competition in the auction. Every opt-out directly reduces RPM. Only opt out of categories that would genuinely offend your audience (unlikely for gaming niche). |

### G. PSA (Public Service Announcement) Ads

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| PSA Ads | **ON** | Risk-free. Only fills empty ad slots that would otherwise show nothing. Can improve secondary metrics like fill rate. |

### H. Grow (First-Party Data)

| Setting | Recommended Value | Why |
|---------|------------------|-----|
| Grow | **ON** | Collects first-party data for personalized ads in privacy-focused browsers (Safari, Firefox). Critical for 2026 as third-party cookies are deprecated. |
| Recommended Content Widget | **ON** | Increases pageviews per session, which directly increases ad impressions per user. |
| Social Sharing Buttons | **ON** | Social signals help Bing rankings and drive referral traffic. |

---

## 2. Content-Level Optimizations for RPM

These are not dashboard settings but directly affect Mediavine earnings:

### Word Count
- **Target**: 1,000-2,000 words minimum per post
- **Why**: Longer content = more in-content ad slots = higher page RPM
- Audit existing posts: any under 700 words should be expanded

### Font Size and Line Height
- **Font Size**: 18-20px (Mediavine recommended)
- **Line Height**: 1.6 minimum
- **Why**: Larger, more readable text increases scroll depth and ad viewability
- Check the WordPress theme's body font settings

### Image Spacing
- **Rule**: Always have text paragraphs between images
- **Why**: Mediavine's script wrapper inserts ads between paragraphs. Back-to-back images with no text = missed ad slots
- This is especially relevant for mod showcase posts that are image-heavy

### Heading Tags
- **Use real H2/H3 HTML tags**, not styled paragraphs
- **Why**: Mediavine's script wrapper uses heading tags as ad placement signals
- Verify WordPress posts use proper heading hierarchy

---

## 3. Gaming Niche-Specific Recommendations

### Desktop Traffic is Your Advantage
The gaming/mods audience skews heavily desktop (confirmed by GSC data: 82.6% desktop). Desktop ads typically have higher CPMs than mobile. Ensure desktop ad experience is optimized:
- Enable desktop sidebar sticky ads
- Enable desktop adhesion
- Desktop Universal Player ON

### Session RPM vs Page RPM
Gaming audiences tend to browse multiple pages per session (exploring different mod categories). Focus on:
- Internal linking between related mod posts
- "Related Posts" or "You May Also Like" sections (Grow handles this)
- Category/tag archive pages should be ad-enabled

### Seasonal Optimization
Sims 4 has traffic spikes around EA game updates, sales, and holiday events. Mediavine RPM also peaks in Q4 (Oct-Dec). Plan content calendar around these:
- Q4 2026: Holiday CC roundups, gift guides
- Major game updates: New expansion pack CC roundups

---

## 4. Priority Action Items

| Priority | Action | Expected Impact |
|----------|--------|-----------------|
| 1 | Turn ON Universal Player (mobile + desktop) if not already enabled | +34% RPM average |
| 2 | Enable "Optimize for Core Web Vitals" | Protects Google rankings + ad delivery |
| 3 | Enable Grow for first-party data collection | +5-15% RPM from personalized ads |
| 4 | Remove ALL ad category opt-outs (if any exist) | +2-10% RPM from increased competition |
| 5 | Enable PSA ads | Marginal RPM improvement, zero risk |
| 6 | Verify mobile/desktop pagespeed optimization is ON | Protects CWV scores |
| 7 | Enable sidebar sticky ads | +5-10% desktop RPM |
| 8 | Audit post word counts - expand thin posts | More ad slots per page |
| 9 | Check image-to-text ratio in posts | Ensure ad slots aren't missed |
| 10 | Enable Recommended Content widget | Increase pages/session |

---

## 5. How to Verify Current Settings

1. Log in to https://publishers.mediavine.com
2. Navigate to site settings for musthavemods.com
3. Screenshot each settings page and compare against this checklist
4. The Mediavine Health Check tool (in dashboard) will flag any suboptimal settings

---

## Sources
- [Mediavine Recommended Settings Quick Start Guide](https://help.mediavine.com/recommended-settings-quick-start-guide)
- [In-Content Ad Settings: Choose Wisely](https://www.mediavine.com/blog/in-content-ad-settings-choose-wisely-for-improved-rpm-and-ux/)
- [How Do I Improve My RPM? - Mediavine](https://www.mediavine.com/how-do-i-improve-my-rpm/)
- [The Universal Video Player - Mediavine Help](https://help.mediavine.com/the-universal-video-player)
- [12 Easy Ways to Grow Your Mediavine Income 2026](https://www.productiveblogging.com/grow-mediavine-income/)
- [How to Configure Mediavine Ad Settings to Optimize RPM](https://bloggingguide.com/how-to-configure-your-mediavine-ad-settings-to-optimize-rpm/)
