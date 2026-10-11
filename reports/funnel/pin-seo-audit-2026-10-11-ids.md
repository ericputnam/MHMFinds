# Pin SEO audit — 2026-10-11 (21 rows, Post Date 2026-10-11 .. 2026-10-25, proposals: template)

Read-only (`audit` mode). Scores rows scheduled in the next 14 days ("Is Posted"=false) against four rules: title 40-100 chars containing the primary keyword, description 100-400 chars with the keyword in the first sentence plus a related term and no hashtag spam, alt text (= title, no separate column) present and descriptive, board fit against `pinterest-boards.csv`. Proposals are deterministic templates, not an LLM call — reviewable, reproducible, and only ever touch "Post Title" / "AI Text Slug".

**Summary:** 21/21 passing all rules, 0 need a fix, mean score 89/100, 0 rows with unknown board fit (no board data to check against — not counted as a failure).

| id | destination | score | issues | proposed title | proposed description | proposed alt |
|---|---|---|---|---|---|---|
| 2117 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2260 | https://musthavemods.com/sims-4-cc-finds-for-april/ | 75 | board "Sims 4 Fall CC" does not obviously match topic "Sims 4 CC Finds For April" | — | — | — |
| 2846 | https://musthavemods.com/sims-4-lookbooks/ | 75 | board "Sims 4 Lookbook CC" does not obviously match topic "Sims 4 Lookbooks" | — | — | — |
| 2309 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 2149 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2323 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 2017 | https://musthavemods.com/sims-4-graphic-tees/ | 75 | board "Sims 4 Male Clothes" does not obviously match topic "Sims 4 Graphic Tees" | — | — | — |
| 2150 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2334 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 2049 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2077 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5112 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2050 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2078 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5113 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2277 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 2051 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2080 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5114 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2289 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 7591 | https://musthavemods.com/sims-4-maxis-match-hair/ | 100 | — | — | — | — |

Apply protocol: `--apply` writes "Post Title" / "AI Text Slug" only for rows above that (a) fail a rule and (b) whose proposal independently re-scores as passing every rule; prior values are saved to a rollback JSON before any write. Board mismatches are reported, never auto-changed.
