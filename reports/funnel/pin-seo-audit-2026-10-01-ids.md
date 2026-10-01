# Pin SEO audit — 2026-10-01 (21 rows, Post Date 2026-10-01 .. 2026-10-15, proposals: page)

Proposal source `page`: title/description come from the destination post's own WP REST title + excerpt (read-only), rotated per sibling row; a field that already passes keeps its current value. 0 row(s) need a fix and have a clean page proposal; 0 row(s) point at a destination the WP API does not resolve and are never rewritten.

Read-only (`audit` mode). Scores rows scheduled in the next 14 days ("Is Posted"=false) against four rules: title 40-100 chars containing the primary keyword, description 100-400 chars with the keyword in the first sentence plus a related term and no hashtag spam, alt text (= title, no separate column) present and descriptive, board fit against `pinterest-boards.csv`. Proposals are deterministic templates, not an LLM call — reviewable, reproducible, and only ever touch "Post Title" / "AI Text Slug".

**Summary:** 21/21 passing all rules, 0 need a fix, mean score 88/100, 0 rows with unknown board fit (no board data to check against — not counted as a failure).

| id | destination | score | issues | proposed title | proposed description | proposed alt |
|---|---|---|---|---|---|---|
| 2136 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2320 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 1655 | https://musthavemods.com/sims-4-cc-finds-for-may/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 CC Finds For May" | — | — | — |
| 2137 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2322 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 1656 | https://musthavemods.com/sims-4-cc-finds-for-may/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 CC Finds For May" | — | — | — |
| 2138 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2324 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 1657 | https://musthavemods.com/sims-4-cc-finds-for-may/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 CC Finds For May" | — | — | — |
| 8976 | https://musthavemods.com/sims-4-necklace-cc/ | 75 | board "Best of Must Have Mods (Sims 4 Mods & Sims 4 CC)" does not obviously match topic "Sims 4 Necklace CC" | — | — | — |
| 5168 | https://musthavemods.com/sims-4-skin-overlay/ | 100 | — | — | — | — |
| 2089 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5020 | https://musthavemods.com/sims-4-furniture-cc/ | 100 | — | — | — | — |
| 2275 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 5021 | https://musthavemods.com/sims-4-furniture-cc/ | 100 | — | — | — | — |
| 2276 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 8060 | https://musthavemods.com/sims-4-toddler-cc/ | 100 | — | — | — | — |
| 8892 | https://musthavemods.com/sims-4-houses/ | 100 | — | — | — | — |
| 5022 | https://musthavemods.com/sims-4-furniture-cc/ | 100 | — | — | — | — |
| 2278 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 8067 | https://musthavemods.com/sims-4-toddler-cc/ | 100 | — | — | — | — |

Apply protocol: `--apply` writes "Post Title" / "AI Text Slug" only for rows above that (a) fail a rule and (b) whose proposal independently re-scores as passing every rule; prior values are saved to a rollback JSON before any write. Board mismatches are reported, never auto-changed.
