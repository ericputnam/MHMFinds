# Page-RPM baseline — 2026-09-08 → 2026-09-14

_Generated 2026-09-16T11:01:16.578Z by `scripts/agents/page-rpm-snapshot.ts`. Source: Mediavine `/reports/pages` (top-150 paths per query, pulled per day under two sort orders and de-duplicated on day+path) and `/reports/metrics/earnings` for site totals. This is the **Before** for any ad-adjacent change on these page types (E55 grid-card decision, /play ad density, /go countdown). Keep rules are one-sided floors: a page type is unharmed if its post-change RPM is ≥ floor._

**Site (Mediavine, 2026-09-08→2026-09-14):** revenue **$1,523.74** · pageviews 137,215 · sessions 87,631 · page RPM **$11.10** · session RPM $17.39
Per-day page pulls: 14/14 ok.

## By page type

| Page type | Paths seen | MV pageviews | Revenue | Page RPM | Imp/pv | Viewability | Rev. coverage | GA4 pageviews | PV coverage | Keep floor (−3%) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| / (homepage grid) | 1 | 4,658 | $47.12 | **$10.12** | 11.27 | 68.0% | 3.1% | 5,044 | 92.3% | $9.82 |
| /games/[game]/[topic]/ (collection pages) | 5 | 1,899 | $14.62 | **$7.70** | 9.02 | 56.5% | 1.0% | 3,208 | 59.2% | $7.47 |
| /mods/[id]/ (mod detail) | 0 | 0 | $0.00 | **—** | — | — | 0.0% | 6,375 | 0.0% | — |
| /go/[modId]/ (download interstitial) | 0 | 0 | $0.00 | **—** | — | — | 0.0% | 342 | 0.0% | — |
| /play/ (daily game) | 0 | 0 | $0.00 | **—** | — | — | 0.0% | 5 | 0.0% | — |
| blog articles (WordPress, apex-proxied) | 136 | 60,252 | $781.72 | **$12.97** | 14.07 | 55.9% | 51.3% | — | — | $12.58 |
| **Unseen remainder** (site − every path seen; the long tail below the daily top-150 cut, i.e. `/mods/[id]/`, `/go/[modId]/` and small blog posts) | — | 70,406 | $680.28 | **$9.66** | — | — | 44.6% | — | — | $9.37 |

- Revenue seen across all buckets: $843.46 on 66,809 pageviews = 55.4% of site revenue.
- **Read a bucket's RPM only where coverage is high.** A low-coverage bucket is biased toward its best-earning paths (the report is sorted by revenue), so its RPM is an upper bound, not a mean.
- **`/mods/[id]/` and `/go/[modId]/` cannot be read from `/reports/pages` at all** — no single mod or interstitial path earns enough in a day to enter the top 150. Their Before is (a) the unseen-remainder row above — of which they are only 9.5% of pageviews; the rest is the blog long tail — and (b) an upper bound of GA4 pv × site page RPM: /mods/ ≤ $70.76, /go/ ≤ $3.80 for the window. A change on those pages is read against the remainder RPM floor **and** the site page RPM floor ($10.77), one-sided, never against a per-path number.
- GA4 `screenPageViews` total for the window: 137,215 vs Mediavine pageviews 137,215 — identical: Mediavine sources pageviews from the GA4 connection, so PV coverage is an absolute share, not an estimate.

## Top paths by revenue (whole window, single pull)

| # | Path | Type | Pageviews | Revenue | Page RPM |
|--:|---|---|--:|--:|--:|
| 1 | `/` | home | 4,658 | $47.15 | $10.12 |
| 2 | `/new-sims-4-mods-2026/` | blog | 1,847 | $41.11 | $22.26 |
| 3 | `/black-sims-4-cc/` | blog | 1,133 | $32.61 | $28.78 |
| 4 | `/sims-4-male-urban-clothes/` | blog | 1,238 | $24.32 | $19.64 |
| 5 | `/sims-4-black-hair/` | blog | 937 | $21.81 | $23.28 |
| 6 | `/sims-4-melanin-skin/` | blog | 984 | $21.38 | $21.73 |
| 7 | `/must-have-mods-sims-4/` | blog | 946 | $19.14 | $20.23 |
| 8 | `/sims-4-cc-furniture/` | blog | 1,410 | $17.63 | $12.50 |
| 9 | `/sims-4-cc-tattoo/` | blog | 1,232 | $17.42 | $14.14 |
| 10 | `/sims-4-skin-overlay/` | blog | 1,064 | $15.57 | $14.63 |
| 11 | `/sims-4-urban-tattoos/` | blog | 984 | $15.42 | $15.67 |
| 12 | `/sims-4-cc-finds-for-january/` | blog | 1,078 | $14.66 | $13.60 |

## How to re-read

```
npx tsx scripts/agents/page-rpm-snapshot.ts --start <YYYY-MM-DD> --end <YYYY-MM-DD> --out reports/funnel/page-rpm-<label>.md
```
Same window length, same weekday mix, Mediavine-finalized days only (end ≤ 2 days ago).

**On the read date, re-pull the baseline window in the same session** (run the command twice, once per window) and compare the two fresh files — do not compare a fresh read against the figures in this file. Mediavine's per-path attribution in `/reports/pages` keeps settling after a day's site totals are final: on 2026-09-16 two pulls of 2026-09-08→2026-09-14 an hour apart returned identical site totals but moved homepage pageviews 4,364 → 4,658 (+6.7%) and homepage RPM $10.58 → $10.12, i.e. more than the 3% keep tolerance. The keep floors above are only meaningful against a baseline re-pulled at the same maturity.
