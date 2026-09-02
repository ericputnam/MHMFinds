# Viewability Fix — 2026-09-01 (response to Lauren Funari, Mediavine Support)

**Status:** Code fix for `/go/[modId]` is done and verified (tests + type-check + `npm run build`), not committed.
Two remaining levers are Mediavine dashboard settings and need Eric's explicit go-ahead (listed in §5).

---

## 1. What Lauren said, and what we did with each point

| Lauren's point | Our action |
|---|---|
| Universal Player is at ~80%, so the /go player workaround is not the viewability problem | Confirmed from `mv_ad_units` (UVP 79.6–89% every month Mar–Aug). |
| /go relocation script hunts `.mv-outstream-container` and may match nothing; inline ad box hides itself after 8 s. Remove both. | **Done** in `app/go/[modId]/GoClient.tsx`: removed the MutationObserver/poll relocation, the 8 s hide timer, the `#mhm-inline-video-slot` box and its refs/state (−214 / +39 lines). Left a comment block explaining why so it is not re-added. |
| Consider disabling Optimize for Pagespeed because /go visitors don't scroll | **Recommend NOT doing this.** It is site-wide, the dashboard labels both toggles "Enable (Recommended)", Mediavine's own viewability guide lists enabling both as a viewability recommendation, and /go pages are not in the top 141 pages by impressions (last 7 days). The cost would land on every list post to help a page family that barely earns. |

## 2. Where the low viewability actually lives

Site viewability 54.8% (Aug 4 – Sep 2). Blended down by the **Content** (in-content) unit:

| Unit | Viewability | Impressions (30d) |
|---|---|---|
| Content | 43.5% | 2.83M |
| Sidebar Sticky | 63.5% | 2.7M |
| Universal Player | 79.6% | ~0.6M |
| Adhesion | 87.8% | ~1.2M |

Content viewability by month (parent unit): Mar 45.5 · Apr15–May14 46.7 · Jun 45.7 · Jul 44.2 · Aug 24–31 42.0.
Chronic and slowly drifting down, no cliff. Desktop and mobile are within 1–2 pts of each other, so it is not a device-layout bug.

91% of impressions come from proxied WordPress posts. Page-level data (last 7 days, `mv_top_pages`) splits cleanly by post type:

| Post type | Examples | Viewability |
|---|---|---|
| Text-heavy mod lists (paragraphs/bullets under each item) | /new-sims-4-mods-2026/ 65.0 · /must-have-mods-sims-4/ 68.8 · /sims-4-trait-mods/ 63.4 | **63–69%** |
| Image-gallery CC posts (image → ad → caption) | /sims-4-wedges-cc/ 47.1 · /sims-4-male-sim-download 48.0 · /sims-4-dress-cc/ 51.3 · /sims-4-eyes-cc/ 52.6 · /sims-4-lips-presets-cc/ 52.0 · /sims-4-clutter/ 52.2 · /sims-4-coquette-cc 52.2 | **47–54%** |
| Next.js home | / | 68.5% |

DOM inspection of the two archetypes (live pages, 30 in-content ad boxes each):

- `/sims-4-wedges-cc/` — **19 of 30 ads are inserted immediately after an image**, 10 after text. Repeating pattern: `h2 → figure(450px) → AD → caption p → description p`. Readers scanning a gallery move image-to-image; the ad sits between the picture and its caption and is scrolled past.
- `/new-sims-4-mods-2026/` — 8 of 30 after an image, 22 after paragraphs/lists. Ads land after text the reader is actually reading.

Mediavine's wrapper config for our site has `content_require_text: 0`, i.e. the "only place ads after text" directive is **off**. Mediavine's OAE article states that this directive is still respected under Optimized Ad Experience, and it is the one in-content placement control we keep under OAE.

## 3. Things checked and ruled out (so nobody re-investigates them)

- **Image lazy-loading / page weight:** Perfmatters JS lazy-load is active on content images (44 lazy, 4 preloaded); only 9 images load at page start. TTFB 40 ms, DCL ~0.4 s, load ~0.5 s (warm). Not a factor.
- **Grow "recommended content" widget in the sidebar:** `#grow-me-sidebar-recs-root` is `display:none` / 0 px on both WP posts and the Next.js home. Not pushing sidebar ads down.
- **Sidebar ATF unit:** dashboard selector `.mhm-mv-sidebar-atf` exists nowhere; the old "Sidebar" unit (Mar 2026) ran at 36.7% viewability before it was removed. Leaving it off is correct.
- **Overlapping fixed elements:** only the privacy button (353×40) and Mediavine's own adhesion container. Nothing covers in-content ads.
- **Double `newPageView()` / hidden ad anchors on Next.js pages:** already fixed earlier; home page runs 68.5%.
- **Ad density config:** OAE (`mv_managed`) controls density; health history shows ~13 in-content ads per desktop pageview against Mediavine's goal of 3. Health check is documented as safe to ignore under OAE, but it does mean a lot of ads get loaded during fast scrolls.
- **Live ad-fill measurement in a browser:** not possible from a hidden tab. Mediavine only fills lazy slots when `document.visibilityState === 'visible'`. This is expected behaviour, not a bug.

## 4. Verification of the shipped change

```
npx vitest run __tests__/unit/sidebar-sticky-health.test.ts __tests__/unit/mod-detail-ads.test.ts   # 28/28 pass
npx tsc --noEmit   # no new errors (pre-existing __tests__/integration/api/* errors only)
npm run build      # exit 0; /go/[modId] builds at 7.05 kB
```

Nothing has been committed or deployed.

## 5. Recommendations (need Eric's decision — dashboard settings)

1. **Turn on "only place in-content ads after text"** (Dashboard → Settings → In-Content Ads; if the toggle is hidden under OAE, ask Lauren to set it on the account). Expected: gallery posts move from ~47–54% toward the 60%+ the text posts already hit, because the ad moves from under the image to under the caption/description. Fewer total in-content impressions on gallery posts, but higher CPM per impression. Read the Content unit's viewability after 14 days.
2. **Keep Optimize for Mobile/Desktop PageSpeed ON.** Decline Lauren's suggestion. If she wants /go pages to load ads without scroll, ask whether that can be scoped to a URL pattern rather than site-wide.
3. **Do not switch OAE → Custom Control yet.** Try #1 first; it is the smaller change and directly targets the observed image-then-ad pattern.
4. Optional, code-side, later: on the Next.js side keep `.mv-ads` hubs text-first (already true). On WordPress, new CC posts should put the item name/description directly under the image as one block so the first ad slot lands after text even without the directive.

## 6. Draft reply to Lauren

> Hi Lauren — thanks for the detail.
>
> 1. We've removed the custom relocation script and the 8-second timeout on the /go pages as you suggested; that deploys with our next release.
> 2. We'd prefer to keep Optimize for Mobile/Desktop PageSpeed enabled. Those pages are a small share of our impressions and the setting is site-wide. If there is a way to exempt /go/* from the scroll delay we'd take it, but not at the cost of the rest of the site.
> 3. On the in-content unit: our page-level data shows the gap is between post types. Text-heavy list posts run 63–69% viewability; image-gallery CC posts run 47–54%. On the gallery posts 19 of 30 in-content ads are inserted directly after an image, ahead of the item's caption. Our account currently has the "only after text" directive off (`content_require_text: 0`). Could you enable that directive for musthavemods.com, or confirm where we can toggle it while OAE is on? We'd like to read Content viewability 14 days after the change.
>
> Thanks,
> Eric
