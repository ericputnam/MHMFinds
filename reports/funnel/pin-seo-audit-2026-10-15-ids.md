# Pin SEO audit — 2026-10-15 (18 rows, Post Date 2026-10-15 .. 2026-10-29, proposals: page)

Proposal source `page`: title/description come from the destination post's own WP REST title + excerpt (read-only), rotated per sibling row; a field that already passes keeps its current value. 0 row(s) need a fix and have a clean page proposal; 0 row(s) point at a destination the WP API does not resolve and are never rewritten.

Read-only (`audit` mode). Scores rows scheduled in the next 14 days ("Is Posted"=false) against four rules: title 40-100 chars containing the primary keyword, description 100-400 chars with the keyword in the first sentence plus a related term and no hashtag spam, alt text (= title, no separate column) present and descriptive, board fit against `pinterest-boards.csv`. Proposals are deterministic templates, not an LLM call — reviewable, reproducible, and only ever touch "Post Title" / "AI Text Slug".

**Summary:** 18/18 passing all rules, 0 need a fix, mean score 99/100, 0 rows with unknown board fit (no board data to check against — not counted as a failure).

| id | destination | score | issues | proposed title | proposed description | proposed alt |
|---|---|---|---|---|---|---|
| 2702 | https://musthavemods.com/sims-4-room-ideas/ | 75 | board "Sims 4 House CC" does not obviously match topic "Sims 4 Room Ideas" | — | — | — |
| 2035 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2036 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2088 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5121 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 5122 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2296 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 2297 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 2038 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2039 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 5123 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 5124 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2298 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 2299 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 2040 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2041 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 5125 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 5126 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |

Apply protocol: `--apply` writes "Post Title" / "AI Text Slug" only for rows above that (a) fail a rule and (b) whose proposal independently re-scores as passing every rule; prior values are saved to a rollback JSON before any write. Board mismatches are reported, never auto-changed.
