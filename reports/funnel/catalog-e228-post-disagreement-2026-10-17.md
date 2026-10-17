# E228 — posts ranked by contentType vs URL-category disagreement (2026-10-17)

Read-only. `scripts/agents/catalog-post-disagreement.ts`. Disagreement = typed, unpinned row whose contentType is outside the URL category family; NULL and pinned rows never count.

- Rows with a sourceUrl: 16902
- URL category known: 390 posts / 5434 rows; unknown: 2513 posts / 11468 rows (not ranked)
- Disagree: 296 of 4891 typed unpinned rows on mapped posts
- Ranked (≥10 typed unpinned rows): 163; >50% disagree: 0
- Pins not yet at value (counted as pinned, DB still differs): 0

| # | Share | Dis/typed | NULL | Pinned | URL type | Post | Disagreeing types |
|---|---|---|---|---|---|---|---|
| 1 | 47.1% | 8/17 | 0 | 6 | furniture | /sims-4-farmhouse-cc/ | residential 6, tops 1, commercial 1 |
| 2 | 38.5% | 10/26 | 1 | 2 | accessories | /sims-4-accessories-cc/ | tops 2, full-body 2, gameplay-mod 2, skin 1, furniture 1, dresses 1, nails 1 |
| 3 | 35.3% | 12/34 | 0 | 0 | shoes | /sims-4-male-shoes-cc/ | bottoms 4, dresses 3, workout 2, tops 1, furniture 1, clutter 1 |
| 4 | 29.2% | 7/24 | 0 | 0 | furniture | /sims-4-cc-furniture/ | residential 3, shoes 1, makeup 1, tops 1, poses 1 |
| 5 | 28.0% | 7/25 | 0 | 3 | preset | /sims-4-nose-presets/ | skin 3, full-body 2, tops 1, decor 1 |
