# Catalog inflow read — 2026-10-18 (Nova, E232, Tier 0)

Scoreboard row that moved: **New mods 7d (prior 7d): 80 (130)**, −38% WoW. Owned by Nova.
Catalog total 16,903. `targets.json` longRange `catalogNewModsPerWeek` baseline 208/wk.

## Decision rule (committed before the per-post table was pulled)

Windows are the scoreboard's own: last 7d = `Mod.createdAt ≥ 2026-10-11 10:43Z`, prior 7d =
`2026-10-04 10:43Z → 2026-10-11 10:43Z`. Four candidate causes, graded in this order; the
first that fires is the cause, later ones are noted:

| Candidate | Fires if |
|---|---|
| (b) scraper stopped / erroring | any `catalog-ingest` summary line in 10-11→10-18 is FAIL or COULD-NOT-RUN, or `errors>0`, or a post published ≥36 h before a morning run still has 0 rows after that run |
| (d) an aggregator source went quiet | any `Mod.source` ≠ `MustHaveMods.com` has rows in the prior 7d and 0 in the last 7d |
| (c) posts scraped but rows deduped/rejected | created ÷ found < 50% on a post whose first row ever is inside the window (a first-time ingest) |
| (a) the writer published fewer posts | posts yielding rows in the window < prior window AND per-post yield of first-time posts within ±25% of the prior week (26/post → 19.5–32.5) |

## Readings

**(b) Scraper — did not fire.** `catalog-ingest-daily.sh` ran from the funnel runner on 7/7
mornings 10-12→10-18 (and 10-10, 10-11 twice), every line `OK … errors=0`:

| run (UTC) | pages | created | updated | refreshed |
|---|--:|--:|--:|--:|
| 10-10 12:07 | 4 | 52 | 1 | 2 |
| 10-11 13:03 / 14:59 | 2 / 2 | 0 / 0 | 0 | 2 |
| 10-12 10:35 | 3 | 10 | 0 | 2 |
| 10-13 10:35 | 2 | 0 | 0 | 2 |
| 10-14 10:36 | 4 | 49 | 0 | 3 |
| 10-15 10:35 | 2 | 0 | 0 | 2 |
| 10-16 10:36 | 3 | 21 | 2 | 2 |
| 10-17 10:35 | 2 | 0 | 0 | 2 |
| 10-18 10:35 | 2 | 0 | 0 | 2 |

Publish → first-row lag: halloween-mods 1.3 h, halloween-cc-finds-for-2026 29 h,
cowboy-hat-cc 31 h (published 10-15 03:42Z; the 10-15 10:35Z run saw a 685-entry sitemap, the
10-16 run 686 — the WordPress sitemap lagged the publish, not the scraper). No post published
≥36 h before a run had 0 rows after it. `data/mhm-scraped-urls.csv` is irrelevant to this path:
`--new-only` takes freshness from the DB (the CSV is untracked and last written 2026-08-09).

**(d) Aggregator — did not fire.** 392 of 392 rows created in 28d carry
`source = MustHaveMods.com`. CurseForge/Patreon aggregators, creator submissions (0 in 7d, 7
pending since 10-03) and first-party mods contributed 0 rows in both windows. There is one
inflow path, and it is the writer's posts.

**(c) Dedupe — fired on one post, correctly.** Per post, from the run logs (`Found N mods in
this post` vs `Created`):

| window | post | published (WP `date_gmt`) | found | created | note |
|---|---|---|--:|--:|---|
| prior | sims-4-trench-coat-cc | 10-05 | 27 | 26 | |
| prior | sims-4-blanket-cc | 10-06 | 29 | 29 | |
| prior | sims-4-arm-warmers | 10-07 | 24 | 23 | |
| prior | sims-4-leg-warmers-cc | 10-08 | 30 | 27 | |
| prior | sims-4-y2k-cc-finds-for-2026 | 10-09 | 25 | 25 | |
| **prior total** | 5 posts | | **135** | **130** | 96% created, 26.0/post |
| last | sims-4-halloween-mods | 10-12 | 10 | 10 | small post (10 items) |
| last | sims-4-halloween-cc-finds-for-2026 | 10-13 | 32 | 32 | |
| last | sims-4-halloween-loading-screens | **re-dated** 10-14 | 48 | 17 | slug first ingested 2025-11-29 (26 rows); 31 of 48 "already complete" |
| last | sims-4-cowboy-hat-cc | 10-15 | 25 | 21 | 2 updated, 2 already in catalog |
| **last total** | 4 posts | | **115** | **80** | 70% created, 20.0/post |

Excluding the re-dated post, first-time posts created 63 of 67 found (94%) — same as the prior
week. The 31 skipped rows are the dedupe (`downloadUrl` / title+sourceUrl) doing its job on a
post the writer re-published with a new date; the scoreboard's "Blog posts: 4 in 7d" counts
that re-publish as a new post.

**(a) Writer cadence — fired.** Posts yielding rows: 5 → 4. First-time per-post yield 26.0 →
21.0 (−19%, inside ±25%). Decomposition of the −38%: posts −20% × per-post −23% (the per-post
leg is the re-dated post's 17 and the 10-item halloween-mods post). The writer's last post is
10-15; 10-16/17/18 have none (the scoreboard's Pinner-writer flag "looks dead", 72 h, is the
same signal). Mechanically, with no new post the row reads 80 through 10-19, **70 on 10-20,
21 on 10-22**, and 0 on 10-23.

## Verdict

Not a scraper, detector, or aggregator fault. Nothing to run and nothing to fix in
`lib/services/mhmScraper.ts` or `contentTypeDetector.ts`. The number was misread because it
has no denominator.

**Fix (this PR, Tier 0):** the scoreboard row now prints
`80 from 4 posts, 20.0/post (130 from 5, 26.0/post)` — the same two counts, with "posts that
yielded rows" from the same table and predicate (`lib/funnel/catalogInflow.ts`, 8 tests
pinning this read; JSON gains `catalog.posts7d` / `catalog.postsPrior7d`, history fields
unchanged).

**Side finding (inbox, Tier 0 later):** `--refreshed` re-fetches `sims-4-nursery-cc` and
`sims-4-y2k-cc-finds-for-2025` every morning (9 runs 10-10→10-18, 0 created) because it
compares sitemap `lastmod` to `max(Mod.createdAt)`, which never advances when a re-scrape
creates nothing. ~2 pages + ~40 author-page fetches a day; not an inflow cause.

**Supply implication for Nova's levers:** 100% of catalog inflow rides one human's posting
cadence. The creator submission path (7 pending, Q26 dropped 10-18 unreviewed) is the only
second path that exists, and it is gated on an operator review that has not happened in 15
days. Nova stops pitching new recruiting per Q26's own text.

— Nova, Creators & Supply
