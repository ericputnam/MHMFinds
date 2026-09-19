# Page-RPM baseline — 2026-09-10 → 2026-09-16

_Generated 2026-09-18T11:05:17.194Z by `scripts/agents/page-rpm-snapshot.ts`. Source: Mediavine `/reports/pages` (top-150 paths per query, pulled per day under two sort orders and de-duplicated on day+path) and `/reports/metrics/earnings` for site totals. This is the **Before** for any ad-adjacent change on these page types (E55 grid-card decision, /play ad density, /go countdown). Keep rules are one-sided floors: a page type is unharmed if its post-change RPM is ≥ floor._

**Site (Mediavine, 2026-09-10→2026-09-16):** revenue **$1,492.09** · pageviews 134,830 · sessions 86,895 · page RPM **$11.07** · session RPM $17.17
Per-day page pulls: 14/14 ok.

## By page type

| Page type | Paths seen | MV pageviews | Revenue | Page RPM | Imp/pv | Viewability | Rev. coverage | GA4 pageviews | PV coverage | Keep floor (−3%) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| / (homepage grid) | 1 | 4,683 | $40.91 | **$8.74** | 10.13 | 68.3% | 2.7% | 4,683 | 100.0% | $8.48 |
| /games/[game]/[topic]/ (collection pages) | 5 | 1,684 | $13.61 | **$8.08** | 9.44 | 56.7% | 0.9% | 2,888 | 58.3% | $7.84 |
| /mods/[id]/ (mod detail) | 0 | 0 | $0.00 | **—** | — | — | 0.0% | 6,056 | 0.0% | — |
| /go/[modId]/ (download interstitial) | 0 | 0 | $0.00 | **—** | — | — | 0.0% | 216 | 0.0% | — |
| /play/ (daily game) | 0 | 0 | $0.00 | **—** | — | — | 0.0% | 8 | 0.0% | — |
| blog articles (WordPress, apex-proxied) | 130 | 64,305 | $770.12 | **$11.98** | 12.91 | 56.4% | 51.6% | — | — | $11.62 |
| **Unseen remainder** (site − every path seen; the long tail below the daily top-150 cut, i.e. `/mods/[id]/`, `/go/[modId]/` and small blog posts) | — | 64,158 | $667.45 | **$10.40** | — | — | 44.7% | — | — | $10.09 |

- Revenue seen across all buckets: $824.64 on 70,672 pageviews = 55.3% of site revenue.
- **Read a bucket's RPM only where coverage is high.** A low-coverage bucket is biased toward its best-earning paths (the report is sorted by revenue), so its RPM is an upper bound, not a mean.
- **`/mods/[id]/` and `/go/[modId]/` cannot be read from `/reports/pages` at all** — no single mod or interstitial path earns enough in a day to enter the top 150. Their Before is (a) the unseen-remainder row above — of which they are only 9.8% of pageviews; the rest is the blog long tail — and (b) an upper bound of GA4 pv × site page RPM: /mods/ ≤ $67.04, /go/ ≤ $2.39 for the window. A change on those pages is read against the remainder RPM floor **and** the site page RPM floor ($10.74), one-sided, never against a per-path number.
- GA4 `screenPageViews` total for the window: 134,830 vs Mediavine pageviews 134,830 — identical: Mediavine sources pageviews from the GA4 connection, so PV coverage is an absolute share, not an estimate.

## Top paths by revenue (whole window, single pull)

| # | Path | Type | Pageviews | Revenue | Page RPM |
|--:|---|---|--:|--:|--:|
| 1 | `/` | home | 4,683 | $40.94 | $8.74 |
| 2 | `/new-sims-4-mods-2026/` | blog | 1,890 | $39.14 | $20.71 |
| 3 | `/black-sims-4-cc/` | blog | 1,269 | $34.58 | $27.25 |
| 4 | `/sims-4-male-urban-clothes/` | blog | 1,347 | $23.49 | $17.44 |
| 5 | `/sims-4-black-hair/` | blog | 996 | $22.39 | $22.48 |
| 6 | `/must-have-mods-sims-4/` | blog | 971 | $18.71 | $19.27 |
| 7 | `/sims-4-melanin-skin/` | blog | 1,003 | $18.59 | $18.53 |
| 8 | `/sims-4-cc-furniture/` | blog | 1,442 | $16.87 | $11.70 |
| 9 | `/sims-4-cc-tattoo/` | blog | 1,227 | $16.29 | $13.28 |
| 10 | `/sims-4-skin-overlay/` | blog | 1,134 | $15.74 | $13.88 |
| 11 | `/sims-4-urban-tattoos/` | blog | 1,030 | $14.64 | $14.21 |
| 12 | `/sims-4-trait-mods/` | blog | 949 | $14.10 | $14.86 |

## How to re-read

```
npx tsx scripts/agents/page-rpm-snapshot.ts --start <YYYY-MM-DD> --end <YYYY-MM-DD> --out reports/funnel/page-rpm-<label>.md
```
Same window length, same weekday mix, Mediavine-finalized days only (end ≤ 2 days ago).

**On the read date, re-pull the baseline window in the same session** (run the command twice, once per window) and compare the two fresh files — do not compare a fresh read against the figures in this file. Mediavine's per-path attribution in `/reports/pages` keeps settling after a day's site totals are final: on 2026-09-16 two pulls of 2026-09-08→2026-09-14 an hour apart returned identical site totals but moved homepage pageviews 4,364 → 4,658 (+6.7%) and homepage RPM $10.58 → $10.12, i.e. more than the 3% keep tolerance. The keep floors above are only meaningful against a baseline re-pulled at the same maturity.
