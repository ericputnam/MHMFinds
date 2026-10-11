# E186 — posts ranked by contentType vs URL-category disagreement (2026-10-11)

Read-only. `scripts/agents/catalog-post-disagreement.ts`. Disagreement = typed, unpinned row whose contentType is outside the URL category family; NULL and pinned rows never count.

- Rows with a sourceUrl: 16822
- URL category known: 389 posts / 5413 rows; unknown: 2511 posts / 11409 rows (not ranked)
- Disagree: 579 of 5058 typed unpinned rows on mapped posts
- Ranked (≥10 typed unpinned rows): 166; >50% disagree: 6

| # | Share | Dis/typed | NULL | Pinned | URL type | Post | Disagreeing types |
|---|---|---|---|---|---|---|---|
| 1 | 100.0% | 28/28 | 0 | 0 | preset | /sims-4-lips-presets-cc/ | makeup 24, accessories 2, skin 1, full-body 1 |
| 2 | 79.3% | 23/29 | 1 | 0 | hats | /sims-4-hats-cc/ | full-body 10, tops 4, furniture 3, gameplay-mod 2, glasses 1, workout 1, hair 1, residential 1 |
| 3 | 67.4% | 29/43 | 0 | 0 | decor | /sims-4-fitness-clutter-cc/ | workout 28, accessories 1 |
| 4 | 61.1% | 11/18 | 0 | 5 | lot | /sims-4-farmhouse-cc/ | furniture 7, tops 1, accessories 1, decor 1, clutter 1 |
| 5 | 56.5% | 13/23 | 0 | 1 | decor | /sims-4-makeup-clutter/ | makeup 10, shoes 1, accessories 1, hair 1 |
| 6 | 52.4% | 11/21 | 0 | 1 | preset | /24-best-sims-4-body-presets-for-2024/ | skin 6, full-body 3, tattoos 1, workout 1 |
| 7 | 46.9% | 15/32 | 1 | 0 | eyes | /sims-4-eyes-cc/ | makeup 12, skin 2, eyebrows 1 |
| 8 | 46.7% | 7/15 | 0 | 2 | decor | /sims-4-food-clutter-cc/ | residential 2, glasses 1, makeup 1, shoes 1, full-body 1, workout 1 |
| 9 | 43.3% | 13/30 | 2 | 0 | accessories | /sims-4-male-accessories-cc/ | full-body 7, tops 3, furniture 1, decor 1, dresses 1 |
| 10 | 42.9% | 6/14 | 0 | 0 | lot | /sims-4-mid-century-modern-house/ | accessories 6 |
| 11 | 41.7% | 10/24 | 0 | 0 | furniture | /sims-4-cc-furniture/ | residential 3, accessories 3, shoes 1, makeup 1, tops 1, poses 1 |
| 12 | 40.0% | 10/25 | 0 | 0 | hair | /sims-4-two-tone-hair-cc/ | accessories 8, hats 2 |
| 13 | 39.3% | 11/28 | 0 | 0 | preset | /sims-4-nose-presets/ | makeup 3, skin 3, full-body 2, accessories 1, tops 1, decor 1 |
| 14 | 38.5% | 10/26 | 1 | 2 | accessories | /sims-4-accessories-cc/ | full-body 2, tops 2, gameplay-mod 2, skin 1, furniture 1, dresses 1, nails 1 |
| 15 | 35.3% | 12/34 | 0 | 0 | shoes | /sims-4-male-shoes-cc/ | bottoms 4, dresses 3, workout 2, tops 1, furniture 1, clutter 1 |
| 16 | 34.8% | 8/23 | 0 | 0 | lot | /sims-4-farmhouses/ | accessories 5, gym 2, decor 1 |
| 17 | 34.8% | 8/23 | 2 | 0 | lot | /sims-4-cabin-houses/ | accessories 6, decor 1, workout 1 |
| 18 | 32.0% | 8/25 | 2 | 1 | decor | /sims-4-decor-cc/ | residential 4, accessories 2, workout 1, makeup 1 |
| 19 | 31.8% | 7/22 | 0 | 0 | lot | /sims-4-tiny-houses/ | accessories 7 |
| 20 | 29.0% | 9/31 | 0 | 0 | hair | /sims-4-male-hair-cc-2024/ | full-body 3, tops 2, hats 2, dresses 1, accessories 1 |
| 21 | 28.6% | 6/21 | 0 | 0 | furniture | /sims-4-urban-furniture-cc/ | glasses 2, full-body 2, bottoms 1, accessories 1 |
| 22 | 27.3% | 6/22 | 1 | 0 | furniture | /sims-4-victorian-furniture-cc/ | tops 3, glasses 1, residential 1, accessories 1 |
| 23 | 26.3% | 5/19 | 1 | 0 | furniture | /sims-4-outdoor-furniture-cc/ | accessories 1, glasses 1, tops 1, shoes 1, residential 1 |
| 24 | 26.1% | 12/46 | 0 | 0 | lot | /sims-4-modern-houses/ | accessories 8, gym 3, furniture 1 |
| 25 | 26.1% | 12/46 | 4 | 3 | furniture | /sims-4-furniture-cc/ | residential 5, accessories 2, tops 2, shoes 1, makeup 1, full-body 1 |
| 26 | 26.0% | 13/50 | 1 | 0 | decor | /sims-4-clutter/ | residential 6, accessories 3, workout 2, shoes 2 |
| 27 | 25.9% | 7/27 | 0 | 0 | lot | /sims-4-family-house/ | accessories 6, gym 1 |
| 28 | 25.0% | 4/16 | 7 | 0 | makeup | /sims-4-halloween-makeup-cc/ | eyes 2, full-body 1, tattoos 1 |
| 29 | 23.7% | 9/38 | 1 | 0 | decor | /sims-4-fall-decor-cc/ | makeup 3, accessories 3, loading-screen 1, tops 1, residential 1 |
| 30 | 23.3% | 7/30 | 0 | 0 | preset | /sims-4-male-body-presets-cc/ | skin 2, bottoms 1, shoes 1, tops 1, hair 1, gameplay-mod 1 |
