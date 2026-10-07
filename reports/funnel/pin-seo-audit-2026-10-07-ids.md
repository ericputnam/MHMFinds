# Pin SEO audit — 2026-10-07 (21 rows, Post Date 2026-10-07 .. 2026-10-21, proposals: template)

Read-only (`audit` mode). Scores rows scheduled in the next 14 days ("Is Posted"=false) against four rules: title 40-100 chars containing the primary keyword, description 100-400 chars with the keyword in the first sentence plus a related term and no hashtag spam, alt text (= title, no separate column) present and descriptive, board fit against `pinterest-boards.csv`. Proposals are deterministic templates, not an LLM call — reviewable, reproducible, and only ever touch "Post Title" / "AI Text Slug".

**Summary:** 21/21 passing all rules, 0 need a fix, mean score 89/100, 0 rows with unknown board fit (no board data to check against — not counted as a failure).

| id | destination | score | issues | proposed title | proposed description | proposed alt |
|---|---|---|---|---|---|---|
| 2146 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2321 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 2695 | https://musthavemods.com/sims-4-room-ideas/ | 75 | board "Sims 4 House CC" does not obviously match topic "Sims 4 Room Ideas" | — | — | — |
| 2147 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2332 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 2696 | https://musthavemods.com/sims-4-room-ideas/ | 75 | board "Sims 4 House CC" does not obviously match topic "Sims 4 Room Ideas" | — | — | — |
| 2148 | https://musthavemods.com/sims-4-wedges-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Wedges CC" | — | — | — |
| 2333 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 2698 | https://musthavemods.com/sims-4-room-ideas/ | 75 | board "Sims 4 House CC" does not obviously match topic "Sims 4 Room Ideas" | — | — | — |
| 2059 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2074 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5109 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2286 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 2060 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2075 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5110 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2287 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 2061 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2076 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5111 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2288 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |

Apply protocol: `--apply` writes "Post Title" / "AI Text Slug" only for rows above that (a) fail a rule and (b) whose proposal independently re-scores as passing every rule; prior values are saved to a rollback JSON before any write. Board mismatches are reported, never auto-changed.
