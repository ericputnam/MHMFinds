# Measurement Protocol (SEO / on-page changes)

Required by charter **SD-2**. Every SEO change is measured before/after — no
exceptions. Authored by Tim, 2026-06-24. GSC data lags ~2–3 days; title-tag effects
typically show in 7–14 days, sometimes up to 28. So we use two checkpoints.

## 1. Pre-deploy snapshot (required before any merge)

Record in the `ideas-backlog.md` row before the PR merges:

| Field | Source |
|---|---|
| Target query | the GSC query that motivated the change |
| Target page URL | full URL |
| Baseline clicks (28d) | GSC `search_analytics`, dims = query+page, last 28d |
| Baseline impressions (28d) | same pull |
| Baseline CTR | same pull |
| Baseline position | same pull |
| Deploy date | date PR merges + deploys |
| Change description | one sentence: what changed and why |

## 2. Checkpoint 1 — T+17 days (early read)

Re-pull GSC for the same query+page. Directional signal only. **Do not kill** at
T+17 unless position moved **>3 positions worse**.

## 3. Checkpoint 2 — T+31 days (verdict)

Pull GSC query+page for the 28 days ending 3 days before the check date.

- **Keep** if ≥2 of: position improved ≥1.0 (or held within 0.5 with a CTR jump);
  CTR up ≥0.5 pp; clicks up in absolute terms.
- **Kill/revert** if BOTH: position flat-or-worse (within 0.5 / worse) AND CTR
  flat-or-worse. (Flat clicks alone ≠ revert — low-volume queries look flat.)

## 4. Revenue translation

Record estimate vs actual: `incremental clicks × session-RPM` (current ~$22). Log
both in the owner's playbook learning entry, and roll into `scorecard.md`.

## Paste-ready backlog row

```
| [change] | [URL] | [query] | Deploy: [date] | Baseline: [clicks]c / [impr]i / [CTR]% / pos [N] | T+17: [date] | T+31 verdict: [date] | Est +[X] clicks/mo (~$[Y]) | Actual: TBD |
```

## What this prevents

- Declaring a win on week-1 data before re-crawl.
- A failed change sitting forever with no kill date.
- Apples-to-oranges windows — always 28d, always query+page dimension.
