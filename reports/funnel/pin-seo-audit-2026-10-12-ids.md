# Pin SEO audit — 2026-10-12 (21 rows, Post Date 2026-10-12 .. 2026-10-26, proposals: template)

Read-only (`audit` mode). Scores rows scheduled in the next 14 days ("Is Posted"=false) against four rules: title 40-100 chars containing the primary keyword, description 100-400 chars with the keyword in the first sentence plus a related term and no hashtag spam, alt text (= title, no separate column) present and descriptive, board fit against `pinterest-boards.csv`. Proposals are deterministic templates, not an LLM call — reviewable, reproducible, and only ever touch "Post Title" / "AI Text Slug".

**Summary:** 21/21 passing all rules, 0 need a fix, mean score 96/100, 0 rows with unknown board fit (no board data to check against — not counted as a failure).

| id | destination | score | issues | proposed title | proposed description | proposed alt |
|---|---|---|---|---|---|---|
| 2335 | https://musthavemods.com/sims-4-plants-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Plants CC" | — | — | — |
| 8970 | https://musthavemods.com/sims-4-hat-cc/ | 75 | board "Best of Must Have Mods (Sims 4 Mods & Sims 4 CC)" does not obviously match topic "Sims 4 Hat CC" | — | — | — |
| 2699 | https://musthavemods.com/sims-4-room-ideas/ | 75 | board "Sims 4 House CC" does not obviously match topic "Sims 4 Room Ideas" | — | — | — |
| 2046 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2081 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5115 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2290 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 7592 | https://musthavemods.com/sims-4-maxis-match-hair/ | 100 | — | — | — | — |
| 1888 | https://musthavemods.com/sims-4-male-urban-facial-hair/ | 100 | — | — | — | — |
| 2063 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2082 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5116 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2291 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 7594 | https://musthavemods.com/sims-4-maxis-match-hair/ | 100 | — | — | — | — |
| 1895 | https://musthavemods.com/sims-4-male-urban-facial-hair/ | 100 | — | — | — | — |
| 2064 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2083 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5117 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2292 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 7609 | https://musthavemods.com/sims-4-maxis-match-hair/ | 100 | — | — | — | — |
| 4234 | https://musthavemods.com/sims-4-cc-male-pieces/ | 100 | — | — | — | — |

Apply protocol: `--apply` writes "Post Title" / "AI Text Slug" only for rows above that (a) fail a rule and (b) whose proposal independently re-scores as passing every rule; prior values are saved to a rollback JSON before any write. Board mismatches are reported, never auto-changed.
