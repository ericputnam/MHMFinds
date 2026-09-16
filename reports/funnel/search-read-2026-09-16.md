# Search & AI read — 2026-09-16 (E57)

**Question asked:** the scoreboard shows google_organic 7d **2,404 (+32.2%)** and
ai_referral 7d **323 (+21.9%)**. Which pages and queries moved, and was it the
homepage SSR shell (09-08), the new collection pages (shoes-cc 09-13,
loading-screens 09-15), or the un-consolidated legacy posts (09-12)?

**Short answer:** none of them, and the +32.2% is not corroborated by Google
Search Console. GSC clicks over the same days are **flat to slightly down**.
Two real, smaller wins *are* visible in GSC — the un-consolidated blog posts and
the collection pages — but they are worth roughly +45 clicks/week between them,
not +580 sessions/week. The headline number should not be spent.

Windows are finalized (GSC lags 2–3 days). GSC = `sc-domain:musthavemods.com`,
`type=web` unless stated. GA4 = property 437117335, `sessionSource=google` /
`sessionMedium=organic`.

---

## 1. The contradiction, stated as one number

GA4 counts **sessions**; GSC counts **clicks from a Google result**. The ratio
between them is normally stable. It is not.

| Window | GA4 google/organic sessions per day | GSC clicks per day (web + image) | GA4 : GSC |
|---|---|---|---|
| 2026-09-01 → 09-07 | 262.6 | 144.9 | **1.81** |
| 2026-09-08 → 09-13 | 326.7 | 139.7 | **2.34** |

GSC per-day clicks went **down 3.6%** across the same span in which GA4 went
**up 24.4%**. The ratio moved 1.81 → 2.34 (+29%).

Raw daily figures behind the table:

GSC `type=web` clicks — 09-01..09-07: 89, 84, 87, 84, 89, 98, 91 (**622**);
09-08..09-13: 81, 56, 56, 85, 122, 107 (**507** over 6 days).
GSC `type=image` clicks — 09-01..09-07: 47, 62, 59, 63, 51, 56, 54 (**392**);
09-08..09-13: 65, 54, 51, 52, 51, 58 (**331** over 6 days).

GA4 google/organic sessions (apex + blog host) — 09-01..09-07: 219, 198, 199,
326, 437, 231, 228 (**1,838**); 09-08..09-14: 229, 194, 321, 418, 389, 409, 485
(**2,445**).

GSC has no click-side event that corresponds to the 09-10 → 09-14 run of
300–485-session days. Google Discover is the usual benign explanation for
GA4-without-GSC organic traffic, and it is ruled out below.

## 2. What the extra sessions actually are

GA4 google/organic, landing page × device, 2026-09-10→09-14 (5 days, "spike")
vs 2026-09-01→09-03 (3 days, "base"), normalized to sessions/day:

| Landing page | Device | Base /day | Spike /day |
|---|---|---|---|
| `/` | desktop | 19.0 | 23.8 |
| `/` | mobile | 5.7 | 5.6 |
| `/sims-4-male-body-presets-cc/` | desktop | 10.0 | 9.8 |
| `/sims-4-hospital-lots/` | desktop | 2.7 | 6.2 |
| `/sims-4-pregnancy-mods/` | desktop | 1.7 | 3.8 |
| `(not set)` | desktop | 14.3 | 9.4 |

Three things this rules out:

- **Not Discover.** Discover is ~95% mobile and concentrates on one or two
  articles. Here mobile on the homepage is dead flat (5.7 → 5.6/day) and the
  growth is desktop.
- **Not the homepage SSR shell (merged 09-08).** GSC homepage clicks 7d
  **fell** 130 → 84 (09-07→09-13 vs 08-31→09-06) on *rising* impressions
  (1,934 → 2,191) and a flat-to-better position (37.9 → 36.0). GA4 homepage
  sessions were 194 → 195 — flat. See §4 for why the click drop is demand, not
  a regression.
- **Not any single page.** The query returned **1,302 landing-page rows**; the
  named pages above account for well under a quarter of the total. The growth
  is spread thin across the tail, on desktop, with no GSC clicks behind it.

That shape — diffuse, desktop, invisible to GSC — is the same pattern the team
already agreed not to trust for Bing organic. I am applying the same rule to
Google: **treat google_organic 7d as unverified until the ratio in §1 comes
back down.**

## 3. The two wins that ARE real (both visible in GSC)

**a) The 09-12 un-consolidation (E21 / PR #63).** 09-12 and 09-13 are the two
highest GSC click days in the whole 21-day window (122 and 107, against a
08-24→09-06 daily range of 66–110). GSC clicks 7d by page, 09-07→09-13 vs
08-31→09-06:

| Page | Prev | Cur | Δ |
|---|---|---|---|
| `blog.musthavemods.com/sims-4-pregnancy-mods/` | 18 | 37 | **+106%** |
| `blog.musthavemods.com/sims-4-hospital-lots/` | 28 | 43 | +54% |
| `blog.musthavemods.com/` | 45 | 68 | +51% |
| blog subdomain, all pages in top 40 | 107 | 154 | **+44%** |

`/sims-4-pregnancy-mods/` is exactly the page PR #63 un-consolidated on 09-12
(canonical returned to the article, facet redirect removed). Its official E21
read is 2026-10-06 and this is 1–2 days of post-ship data, so it is early
signal, not a verdict — but it is moving the right way and it is the single
largest page-level gain in the window.

**b) Collection pages (E32 mod-page breadcrumb links, live 09-12).** GSC clicks
7d across `/games/sims-4/*` in the top-40 page list: **33 → 43 (+30%)**, on
impressions 1,280 → 1,582 (+24%). Per page: poses 2 → 9, female-clothes 6 → 8,
skin-details 6 → 8, male-clothes 5 → 4, body-presets 12 → 9, plus
pregnancy-mods 3 and y2k-cc 2 newly in the top 40. Both lists are truncated at
a 2-click floor, so treat the aggregate as directional. E32's read stays
2026-09-24.

## 4. Why homepage clicks fell — demand, not ranking

GSC by query, 09-07→09-13 vs 08-24→08-30:

| Query | Prev clicks / impressions / position | Cur clicks / impressions / position |
|---|---|---|
| `musthavemods` | 69 / 74 / 1.07 | 28 / 36 / 1.03 |
| `must have mods` | 29 / 80 / 4.50 | 14 / 64 / 4.25 |
| `musthavemods.com` | 9 / 12 / 1.00 | 4 / 5 / 1.00 |

Position is unchanged at 1.0–4.5 on all three. **Impressions halved** — fewer
people typed the brand name. That is a demand-side move, and it is the whole
explanation for the homepage's 130 → 84. Nothing to fix in search; it is a
brand-awareness question for Pip/Cass, not an SEO one.

Non-brand long tail moved the other way over the same span: `sims 4 must have
mods` 0 → 12 clicks, `sims 4 pregnancy mods` 0 → 5, `pregnancy mods sims 4`
0 → 3, `sims 4 hospital lot` 0 → 3, `hospital mod sims 4` 0 → 3.

## 5. Indexing and plumbing: no gap found

Checked because the brief asked whether a new page was missing from the
sitemap, `llms.txt`, or the IndexNow set. It is not.

| URL | Verdict | Coverage | Last crawl |
|---|---|---|---|
| `/games/sims-4/shoes-cc/` (shipped 09-13) | PASS | Submitted and indexed | 2026-09-13T15:31Z |
| `/games/sims-4/loading-screens/` (shipped 09-15) | PASS | Submitted and indexed | 2026-09-15T16:30Z |

`loading-screens` was crawled and indexed **the same day it shipped**, within
hours. Google's canonical equals ours on both. Both slugs are in
`lib/collections.ts`, so they are automatically in `/sitemap-nextjs.xml`,
`/llms.txt`, `/llms-full.txt`, the per-collection feeds, and the IndexNow
submission set — no manual registration step was missed.

`loading-screens` carries no `sitemap` field in its inspection result yet,
unlike shoes-cc. That is consistent with it having been discovered by IndexNow
or an internal link before the sitemap was re-fetched; it is indexed either
way, so no action.

**E52's own gate, due today, passes.** The 09-16 runner log contains:

```
2026-09-16T10:40:53Z indexnow mode=live status=OK urls=69 mods=47 collections=22 dropped=0 cap=500 days=2 http=200 reason=ok
```

`mode=live` is present, so the step-0c2 wiring executed on schedule — the 09-28
Bing read is valid. Note `http=200`, up from `202` on the 09-15 first run:
IndexNow has validated the key file and is now accepting submissions outright.
`collections=22` is up from 21, which is loading-screens entering the set.

## 6. AI referral: +21.9% is also long-tail, and cannot be corroborated

chatgpt.com top landing pages, 09-08→09-14 vs 09-01→09-07: `/sims-4-elf-cc/`
16 → 16, `/games/sims-4/skin-details/` 7 → 8, `(not set)` 8 → 13. The named
pages are flat; the growth is in the tail, same shape as §2.

Unlike Google there is no second source to check AI referrals against — no
console, and feed/`llms-full.txt` fetches carry no JS so they are not in GA4.
I am **not** claiming the +21.9% as an E27/E42 win, and I am not claiming it is
noise either. The E2/E27/E42 read on 2026-09-30 stands, and if the Google ratio
in §1 turns out to be a tagging or bot artifact, ai_referral should be
re-examined for the same artifact before B3 is graded.

---

## Decision rule (written before the read, per house convention)

**Metric:** GA4 : GSC ratio for Google organic — GA4 `sessionSource=google` /
`sessionMedium=organic` sessions per day ÷ GSC (`type=web` + `type=image`)
clicks per day, over a matched finalized 7-day window.

**Baseline:** **1.81** (2026-09-01 → 09-07). Current: **2.34**
(2026-09-08 → 09-13). Stable historical range needs one more reading to
establish; 1.81 is the only clean pre-divergence week measured.

**Read on:** **2026-09-23** (window 09-14 → 09-20, finalized).

**Keep if / conclude:**
- Ratio back at **≤ 2.00** on 09-23 → the divergence was transient; treat
  google_organic as real again and grade B3 normally.
- Ratio **still ≥ 2.20** on 09-23 → the +32.2% is an artifact. google_organic
  gets a "unverified" marker in the scoreboard and is excluded from B3 and from
  any RPM-per-session reasoning until diagnosed.
- Ratio **≥ 2.20 AND** GSC clicks/day have fallen below 130 → escalate: real
  search traffic is declining behind an inflated GA4 headline, which is the
  worst case and the one this read exists to catch.

**Rollback:** none — this move changed no production surface.

## What I did NOT do, and why

No code shipped. The brief offered three candidate Tier 0 fixes; the data
closed all three:

- *A new collection page missing from a surface* — checked, both are indexed
  and in every surface (§5).
- *`index_inspect` showing not-indexed → push via IndexNow* — both PASS, and
  the daily IndexNow push is already running and now returning 200 (§5).
- *Adding `/play/` and the per-collection feed to `smoke-render.ts`* — the feed
  route `/feeds/sims-4/hair-cc/` was added on 09-15 and is live. `/play/`
  remains absent. I deliberately did not add it in the same run as this read:
  `smoke-render` failures trigger an automatic `vercel rollback`, and the 09-15
  lesson is that a target must be checked against `expectations()` with a real
  render before it is wired to a destructive action. It is a clean standalone
  move for a later run, and it belongs to whoever owns `/play`.

## Next

1. Wire the §1 ratio into `funnel-scoreboard.ts` as a self-check so a
   GA4/GSC divergence flags itself instead of being found by hand. Deliberately
   not done today: Pip and Rio both edited that file on 09-13 and collided, so
   it wants its own run and its own PR.
2. Remaining reads: E18 09-22, E32 09-24, E37 09-26, E47/E52 09-28,
   E2/E27/E42 09-30, E21 10-06.
3. Remaining unshipped lever: `Dataset` schema on collection pages — Tier 2
   (schema is operator-owned). The facet-page titles/metas lever is **closed**:
   skin-details, male-clothes, female-clothes, poses and body-presets all
   already carry hand-written head-term `metaTitle`/`metaDescription` in
   `lib/collections.ts`. Their CTR at positions 27–30 is ~1.6%, which is
   normal for that position — the constraint there is rank, not the snippet.

— Sage, Search & AI
