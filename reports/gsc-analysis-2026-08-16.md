# Growth / SEO Audit — 2026-08-16 (Traffic-Drop Support)
**Property:** sc-domain:musthavemods.com · GSC data through 2026-08-14 (lag ~2 days)
**Trigger:** Mediavine sessions reported down 18.4% WoW (76.6k vs 93.9k). Mark diagnosing Mediavine-side; this is the search-side check.

## Bottom line

**Search does not explain the session drop.** GSC web-search clicks are flat-to-up WoW (+1.9%), image-search clicks are up WoW (+12.3%), and GA4 "Organic Search" channel sessions are down only 4.4% WoW — a fraction of the reported 18.4% aggregate decline. The overwhelming majority of the GA4 session loss is concentrated in **Organic Social** (Pinterest, ~63% of the lost sessions) and **Direct** (~25% of the lost sessions), not search. No code shipped to `main` in the last 7 days (last commit 2026-07-22), ruling out a deploy-caused ranking/indexing regression. Indexing spot-checks on 3 key pages all PASS.

**Separately flagged (for Mark/Sterling):** `reports/mediavine/*.md` daily automation has returned `🔴 Report failed: fetch failed` every single day since 2026-08-10 (7 consecutive days, through today). Worth confirming the 76.6k/93.9k figures didn't come from a broken/partial automated pull — same category of MCP credential issue that was just fixed for GSC could be affecting the Mediavine pipeline too.

---

## 1. GSC clicks WoW (web search, last 7 vs prior 7)

Last 7 days (08-08 → 08-14) vs prior 7 days (08-01 → 08-07):

| Metric | Prior 7d | Last 7d | Δ |
|---|---|---|---|
| Clicks (web) | 475 | 484 | **+1.9%** |
| Impressions (web) | 66,388 | 50,390 | -24.1% |
| Avg position (web, daily avg) | ~28.3 | ~33.7 | worse |
| Clicks (image) | 381 | 428 | **+12.3%** |
| Impressions (image) | 35,795 | 33,638 | -6.0% |

Combined web+image clicks: 856 → 912 (**+6.5% WoW**). Note: the `type` filter on this GSC MCP only accepts `web`/`image`/`video`/`news` — Discover isn't queryable here; recommend a manual check of the Discover tab in the GSC UI as a follow-up, though GA4's "Organic Search" channel (below) already captures Discover-driven sessions and shows no comparable collapse.

**Read:** impressions fell hardest in the last 3 days of the window (Aug 12-14 dropped to ~4,400-4,500/day from ~10,000-12,000/day Aug 8-11), and average position got numerically worse over the same days (28→42-44) even as daily clicks held steady or rose. That pattern — losing a large pool of long-tail/low-position impressions while click-driving positions hold — reads as GSC's query mix losing broad/low-value impression noise, not a genuine ranking collapse on the pages that actually convert.

## 2. GA4 channel breakdown — where the session loss actually is

GA4 property 437117335, last 7 days (08-09 → 08-15) vs prior 7 days (08-02 → 08-08):

| Channel | Prior 7d | Last 7d | Δ sessions | Δ% |
|---|---|---|---|---|
| Organic Social | 62,792 | 59,344 | -3,448 | -5.5% |
| Organic Search | 24,917 | 23,831 | **-1,086** | **-4.4%** |
| Direct | 7,272 | 5,911 | -1,361 | -18.7% |
| Referral | 373 | 442 | +69 | +18.5% |
| Unassigned | 165 | 427 | +262 | +158.8% |
| AI Assistant | 103 | 166 | +63 | +61.2% |
| Organic Video | 12 | 12 | 0 | 0% |
| Organic Shopping | 0 | 2 | +2 | — |
| **Total** | **95,634** | **90,135** | **-5,499** | **-5.7%** |

Of the 5,499 net session loss: Organic Social accounts for **62.7%**, Direct accounts for **24.7%**, Organic Search accounts for **19.7%** (positive channels offset the rest). GA4's total decline (-5.7%) is itself much smaller than the -18.4% Mediavine figure — a discrepancy worth reconciling with Mark before treating 18.4% as the true traffic-side number; it may partly reflect a Mediavine-specific session definition (monetizable/bot-filtered) or the broken automation flagged above.

**Verdict: search is not the story here.** Pinterest (Organic Social) and Direct are where the volume went missing.

## 3. Queries/pages that lost the most clicks WoW

Pulled full query (08-08→08-14 vs 08-01→08-07) and page-level breakdowns (capped at 1,000 rows each — covers ~100% of query clicks and ~59% of page impressions in each period; long-tail beyond the cap is immaterial to the totals above, which come from the uncapped date-only pull).

**Query level:** losses are small and broad-based — no concentrated query loss. Biggest single-query losses are -8 clicks ("musthave mods", a branded misspelling that dropped from position 12 with only 12 impressions — noise) and -4 clicks ("must have sims 4 mods"). Net effect across the top 1,000 queries is actually **+6 clicks** (205 last7 vs 199 prior7). Top gainers: "neko swirl sims 4" (+6), "must have mods" (+5), "nekoswirl gshade preset" (+4) — a creator/trend-name cluster trending up.

**Page level:** the biggest *impression* losses are concentrated in the `/games/sims-4/*` collection pages (male-clothes -474, skin-details -345, body-presets -312, poses -200, goth-cc -190) and several legacy WP pages that dropped out of the top-1,000 sample entirely (makeup-cc-finds, career-mods, shoes-cc, beds, hair-mods — likely long-tail rows below the cutoff, not confirmed zeroed). Critically, **clicks on the collection pages losing impressions did not fall** — they were flat or up (male-clothes 4→7, female-clothes 3→8, skin-details 3→3, body-presets 4→4, poses 4→4). This mirrors the query-level finding: losing peripheral impression volume without losing the clicks that matter.

Homepage: clicks 119→111 (-6.7%), impressions 5,256→5,000 (-4.9%), position 36.0→38.1 (slightly worse) — small, not the driver.

**Conclusion: broad, low-magnitude, largely impression-side (not click-side) softening. Nothing here resembles an 18% session-driving event.**

## 4. Quick wins (`detect_quick_wins`, position 4-15, impressions ≥50, CTR <2%, 28d window 07-18→08-14)

| Query / page | Position | Impressions | Current CTR | Est. additional clicks/mo |
|---|---|---|---|---|
| "love triangle mod sims 4" → `/mods/cmim8rron.../` | 7.6 | 152 | 0% | +8 |
| "cas.fulleditmode not working" → `/cas-fulleditmode-not-working/` | 9.3 | 111 | 0% | +6 |
| "teen stories and activities mod sims 4" → `/mods/cmijl2e1h.../` | 9.0 | 101 | 0.99% | +4 |
| "must have mods" → `blog.musthavemods.com/` | 4.7 | 54 | 0% | +3 |
| "sims 4 love triangle mod" → `/mods/cmim8rron.../` | 7.6 | 65 | 0% | +3 |
| "xmlinjector_snippets_shopfooddelivery" → `/sims-4-food-mods/` | 7.7 | 53 | 0% | +3 |
| "the sims 4 must have mods" → `/` | 8.8 | 59 | 1.69% | +2 |

**Total upside: ~30 clicks/mo ≈ ~$0.69/mo** at an assumed ~$23 session-RPM/1,000 sessions (targets.json baseline $21.95, trending toward ~$23 per Mark's 2026-07-01 note). Small in isolation — consistent with prior audits' finding that the property's average position (~28) is too deep for CTR fixes alone to move much revenue; content/ranking depth remains the bigger lever, not this week's priority given the traffic-drop investigation.

Effort: all S (title/meta or schema tweaks on existing pages). The two `/mods/cmim8rron.../` "love triangle" rows are the same page under two query variants — worth one title/meta pass, not two.

## 5. Indexing spot-check

No pages shipped to `main` in the last 7 days (last commit to `main` was 2026-07-22, `5bda109`). Spot-checked the 3 most recent SEO-relevant pages instead:

| Page | Verdict | Coverage | Last crawl |
|---|---|---|---|
| `https://musthavemods.com/` | PASS | Submitted and indexed | 2026-08-16 (today) |
| `https://musthavemods.com/games/sims-4/goth-cc/` (Jul 3 batch) | PASS | Submitted and indexed | 2026-08-10 |
| `https://musthavemods.com/games/sims-4/pregnancy-mods/` (Jul 3 fix) | PASS | Submitted and indexed | 2026-07-28 |

All three: `robotsTxtState: ALLOWED`, canonical self-referential, `pageFetchState: SUCCESSFUL`. **No indexing issues found.** Confirmed via `git diff origin/main -- lib/collections.ts` that `goth-cc`, `cottagecore-cc`, `y2k-cc`, `vampire-cc` collections are still live on `origin/main` (they only appear removed in my local uncommitted working-tree branch, which is unrelated WIP — not deployed).

---

## Recommendation to the team

1. **Don't spend more search-side effort chasing this drop** — it isn't a search problem. Redirect investigation to Mark (Mediavine data reliability + the 7-day-broken daily automation) and to Pinterest/Organic-Social and Direct traffic patterns, which account for ~87% of the GA4-measured loss.
2. Ship the 7 quick wins above opportunistically (S effort, ~$0.69/mo) — not urgent, doesn't move this week's number.
3. Flag to Mark/Sterling: reconcile the GA4 total-session decline (-5.7%) against the reported Mediavine decline (-18.4%) — the gap is large enough that it should be resolved before treating 18.4% as ground truth.

— Tim, Growth
