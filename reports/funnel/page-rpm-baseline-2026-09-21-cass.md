# Page-RPM baseline — 2026-09-13 → 2026-09-19

_Generated 2026-09-21T10:54:04.684Z by `scripts/agents/page-rpm-snapshot.ts`. Source: Mediavine `/reports/pages` (top-150 paths per query, pulled per day under two sort orders and de-duplicated on day+path) and `/reports/metrics/earnings` for site totals. This is the **Before** for any ad-adjacent change on these page types (E55 grid-card decision, /play ad density, /go countdown). Keep rules are one-sided floors: a page type is unharmed if its post-change RPM is ≥ floor._

**Site (Mediavine, 2026-09-13→2026-09-19):** revenue **$1,484.80** · pageviews 133,152 · sessions 86,079 · page RPM **$11.15** · session RPM $17.25
Per-day page pulls: 14/14 ok.

## By page type

| Page type | Paths seen | MV pageviews | Revenue | Page RPM | Imp/pv | Viewability | Rev. coverage | GA4 pageviews | PV coverage | Keep floor (−3%) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| / (homepage grid) | 1 | 3,536 | $31.09 | **$8.79** | 10.75 | 68.2% | 2.1% | 4,173 | 84.7% | $8.53 |
| /games/[game]/[topic]/ (collection pages) | 4 | 1,161 | $10.75 | **$9.26** | 11 | 56.3% | 0.7% | 2,479 | 46.8% | $8.98 |
| /mods/[id]/ (mod detail) | 0 | 0 | $0.00 | **—** | — | — | 0.0% | 5,766 | 0.0% | — |
| /go/[modId]/ (download interstitial) | 0 | 0 | $0.00 | **—** | — | — | 0.0% | 187 | 0.0% | — |
| /play/ (daily game) | 0 | 0 | $0.00 | **—** | — | — | 0.0% | 12 | 0.0% | — |
| blog articles (WordPress, apex-proxied) | 147 | 53,092 | $758.71 | **$14.29** | 14.96 | 57.8% | 51.1% | — | — | $13.86 |
| **Unseen remainder** (site − every path seen; the long tail below the daily top-150 cut, i.e. `/mods/[id]/`, `/go/[modId]/` and small blog posts) | — | 75,363 | $684.25 | **$9.08** | — | — | 46.1% | — | — | $8.81 |

- Revenue seen across all buckets: $800.55 on 57,789 pageviews = 53.9% of site revenue.
- **Read a bucket's RPM only where coverage is high.** A low-coverage bucket is biased toward its best-earning paths (the report is sorted by revenue), so its RPM is an upper bound, not a mean.
- **`/mods/[id]/` and `/go/[modId]/` cannot be read from `/reports/pages` at all** — no single mod or interstitial path earns enough in a day to enter the top 150. Their Before is (a) the unseen-remainder row above — of which they are only 7.9% of pageviews; the rest is the blog long tail — and (b) an upper bound of GA4 pv × site page RPM: /mods/ ≤ $64.29, /go/ ≤ $2.09 for the window. A change on those pages is read against the remainder RPM floor **and** the site page RPM floor ($10.82), one-sided, never against a per-path number.
- GA4 `screenPageViews` total for the window: 133,152 vs Mediavine pageviews 133,152 — identical: Mediavine sources pageviews from the GA4 connection, so PV coverage is an absolute share, not an estimate.

## Top paths by revenue (whole window, single pull)

| # | Path | Type | Pageviews | Revenue | Page RPM |
|--:|---|---|--:|--:|--:|
| 1 | `/new-sims-4-mods-2026/` | blog | 1,476 | $35.50 | $24.05 |
| 2 | `/black-sims-4-cc/` | blog | 1,059 | $31.76 | $29.99 |
| 3 | `/` | home | 3,536 | $31.13 | $8.80 |
| 4 | `/sims-4-male-urban-clothes/` | blog | 1,111 | $23.82 | $21.44 |
| 5 | `/sims-4-black-hair/` | blog | 781 | $21.09 | $27.00 |
| 6 | `/must-have-mods-sims-4/` | blog | 816 | $18.62 | $22.82 |
| 7 | `/sims-4-melanin-skin/` | blog | 789 | $18.07 | $22.90 |
| 8 | `/sims-4-cc-furniture/` | blog | 1,177 | $16.77 | $14.25 |
| 9 | `/sims-4-cc-tattoo/` | blog | 1,011 | $15.71 | $15.54 |
| 10 | `/sims-4-urban-tattoos/` | blog | 861 | $15.00 | $17.42 |
| 11 | `/sims-4-skin-overlay/` | blog | 922 | $14.90 | $16.16 |
| 12 | `/best-sims-4-realistic-mods/` | blog | 528 | $14.18 | $26.86 |

## How to re-read

```
npx tsx scripts/agents/page-rpm-snapshot.ts --start <YYYY-MM-DD> --end <YYYY-MM-DD> --out reports/funnel/page-rpm-<label>.md
```
Same window length, same weekday mix, Mediavine-finalized days only (end ≤ 2 days ago).

**On the read date, re-pull the baseline window in the same session** (run the command twice, once per window) and compare the two fresh files — do not compare a fresh read against the figures in this file. Mediavine's per-path attribution in `/reports/pages` keeps settling after a day's site totals are final: on 2026-09-16 two pulls of 2026-09-08→2026-09-14 an hour apart returned identical site totals but moved homepage pageviews 4,364 → 4,658 (+6.7%) and homepage RPM $10.58 → $10.12, i.e. more than the 3% keep tolerance. The keep floors above are only meaningful against a baseline re-pulled at the same maturity.
