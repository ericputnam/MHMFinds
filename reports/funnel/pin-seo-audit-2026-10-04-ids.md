# Pin SEO audit — 2026-10-04 (7 rows, Post Date 2026-10-04 .. 2026-10-18, proposals: page)

Proposal source `page`: title/description come from the destination post's own WP REST title + excerpt (read-only), rotated per sibling row; a field that already passes keeps its current value. 0 row(s) need a fix and have a clean page proposal; 0 row(s) point at a destination the WP API does not resolve and are never rewritten.

Read-only (`audit` mode). Scores rows scheduled in the next 14 days ("Is Posted"=false) against four rules: title 40-100 chars containing the primary keyword, description 100-400 chars with the keyword in the first sentence plus a related term and no hashtag spam, alt text (= title, no separate column) present and descriptive, board fit against `pinterest-boards.csv`. Proposals are deterministic templates, not an LLM call — reviewable, reproducible, and only ever touch "Post Title" / "AI Text Slug".

**Summary:** 7/7 passing all rules, 0 need a fix, mean score 86/100, 0 rows with unknown board fit (no board data to check against — not counted as a failure).

| id | destination | score | issues | proposed title | proposed description | proposed alt |
|---|---|---|---|---|---|---|
| 2145 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2319 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 2694 | https://musthavemods.com/sims-4-room-ideas/ | 75 | board "Sims 4 House CC" does not obviously match topic "Sims 4 Room Ideas" | — | — | — |
| 2374 | https://musthavemods.com/sims-4-rugs-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Rugs CC" | — | — | — |
| 2058 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2071 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 2285 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |

Apply protocol: `--apply` writes "Post Title" / "AI Text Slug" only for rows above that (a) fail a rule and (b) whose proposal independently re-scores as passing every rule; prior values are saved to a rollback JSON before any write. Board mismatches are reported, never auto-changed.
