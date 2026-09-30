# Pin SEO audit — 2026-09-30 (21 rows, Post Date 2026-09-30 .. 2026-10-14, proposals: page)

Proposal source `page`: title/description come from the destination post's own WP REST title + excerpt (read-only), rotated per sibling row; a field that already passes keeps its current value. 0 row(s) need a fix and have a clean page proposal; 0 row(s) point at a destination the WP API does not resolve and are never rewritten.

Read-only (`audit` mode). Scores rows scheduled in the next 14 days ("Is Posted"=false) against four rules: title 40-100 chars containing the primary keyword, description 100-400 chars with the keyword in the first sentence plus a related term and no hashtag spam, alt text (= title, no separate column) present and descriptive, board fit against `pinterest-boards.csv`. Proposals are deterministic templates, not an LLM call — reviewable, reproducible, and only ever touch "Post Title" / "AI Text Slug".

**Summary:** 21/21 passing all rules, 0 need a fix, mean score 87/100, 0 rows with unknown board fit (no board data to check against — not counted as a failure).

| id | destination | score | issues | proposed title | proposed description | proposed alt |
|---|---|---|---|---|---|---|
| 2133 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 8984 | https://musthavemods.com/black-sims-4-cc/ | 75 | board "Best of Must Have Mods (Sims 4 Mods & Sims 4 CC)" does not obviously match topic "Black Sims 4 CC" | — | — | — |
| 8981 | https://musthavemods.com/sims-4-melanin-skin/ | 75 | board "Best of Must Have Mods (Sims 4 Mods & Sims 4 CC)" does not obviously match topic "Sims 4 Melanin Skin" | — | — | — |
| 8982 | https://musthavemods.com/sims-4-black-hair/ | 75 | board "Best of Must Have Mods (Sims 4 Mods & Sims 4 CC)" does not obviously match topic "Sims 4 Black Hair" | — | — | — |
| 2134 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 8985 | https://musthavemods.com/sims-4-boots-cc/ | 75 | board "Best of Must Have Mods (Sims 4 Mods & Sims 4 CC)" does not obviously match topic "Sims 4 Boots CC" | — | — | — |
| 2317 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 2135 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2318 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 8983 | https://musthavemods.com/sims-4-toddler-cc/ | 75 | board "Best of Must Have Mods (Sims 4 Mods & Sims 4 CC)" does not obviously match topic "Sims 4 Toddler CC" | — | — | — |
| 1654 | https://musthavemods.com/sims-4-cc-finds-for-may/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 CC Finds For May" | — | — | — |
| 5165 | https://musthavemods.com/sims-4-skin-overlay/ | 100 | — | — | — | — |
| 2090 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5017 | https://musthavemods.com/sims-4-furniture-cc/ | 100 | — | — | — | — |
| 5166 | https://musthavemods.com/sims-4-skin-overlay/ | 100 | — | — | — | — |
| 2092 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5018 | https://musthavemods.com/sims-4-furniture-cc/ | 100 | — | — | — | — |
| 2273 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 5167 | https://musthavemods.com/sims-4-skin-overlay/ | 100 | — | — | — | — |
| 5019 | https://musthavemods.com/sims-4-furniture-cc/ | 100 | — | — | — | — |
| 2274 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |

Apply protocol: `--apply` writes "Post Title" / "AI Text Slug" only for rows above that (a) fail a rule and (b) whose proposal independently re-scores as passing every rule; prior values are saved to a rollback JSON before any write. Board mismatches are reported, never auto-changed.
