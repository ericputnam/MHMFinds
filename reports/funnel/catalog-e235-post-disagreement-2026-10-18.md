# E235 — posts ranked by contentType vs URL-category disagreement (2026-10-18)

Read-only. `scripts/agents/catalog-post-disagreement.ts`. Disagreement = typed, unpinned row whose contentType is outside the URL category family; NULL and pinned rows never count.

- Rows with a sourceUrl: 16902
- URL category known: 390 posts / 5434 rows; unknown: 2513 posts / 11468 rows (not ranked)
- Disagree: 274 of 4865 typed unpinned rows on mapped posts
- Ranked (≥10 typed unpinned rows): 163; >50% disagree: 0
- Pins not yet at value (counted as pinned, DB still differs): 0

| # | Share | Dis/typed | NULL | Pinned | URL type | Post | Disagreeing types |
|---|---|---|---|---|---|---|---|
| 1 | 47.1% | 8/17 | 0 | 6 | furniture | /sims-4-farmhouse-cc/ | residential 6, tops 1, commercial 1 |
| 2 | 29.2% | 7/24 | 0 | 0 | furniture | /sims-4-cc-furniture/ | residential 3, shoes 1, makeup 1, tops 1, poses 1 |
| 3 | 28.0% | 7/25 | 0 | 3 | preset | /sims-4-nose-presets/ | skin 3, full-body 2, tops 1, decor 1 |
| 4 | 26.7% | 8/30 | 0 | 1 | hair | /sims-4-male-hair-cc-2024/ | full-body 3, tops 2, hats 2, dresses 1 |
| 5 | 25.0% | 4/16 | 7 | 0 | makeup | /sims-4-halloween-makeup-cc/ | eyes 2, full-body 1, tattoos 1 |
| 6 | 23.8% | 5/21 | 0 | 0 | furniture | /sims-4-urban-furniture-cc/ | glasses 2, full-body 2, bottoms 1 |
| 7 | 23.3% | 7/30 | 0 | 0 | body-preset | /sims-4-male-body-presets-cc/ | skin 2, shoes 1, bottoms 1, tops 1, hair 1, gameplay-mod 1 |
| 8 | 22.7% | 5/22 | 1 | 0 | furniture | /sims-4-victorian-furniture-cc/ | tops 3, glasses 1, residential 1 |
