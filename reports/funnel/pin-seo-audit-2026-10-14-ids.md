# Pin SEO audit — 2026-10-14 (21 rows, Post Date 2026-10-14 .. 2026-10-28, proposals: template)

Read-only (`audit` mode). Scores rows scheduled in the next 14 days ("Is Posted"=false) against four rules: title 40-100 chars containing the primary keyword, description 100-400 chars with the keyword in the first sentence plus a related term and no hashtag spam, alt text (= title, no separate column) present and descriptive, board fit against `pinterest-boards.csv`. Proposals are deterministic templates, not an LLM call — reviewable, reproducible, and only ever touch "Post Title" / "AI Text Slug".

**Summary:** 21/21 passing all rules, 0 need a fix, mean score 96/100, 0 rows with unknown board fit (no board data to check against — not counted as a failure).

| id | destination | score | issues | proposed title | proposed description | proposed alt |
|---|---|---|---|---|---|---|
| 8979 | https://musthavemods.com/afro-hair-sims-4/ | 75 | board "Best of Must Have Mods (Sims 4 Mods & Sims 4 CC)" does not obviously match topic "Afro Hair Sims" | — | — | — |
| 8968 | https://musthavemods.com/sims-4-elf-cc/ | 75 | board "Best of Must Have Mods (Sims 4 Mods & Sims 4 CC)" does not obviously match topic "Sims 4 Elf CC" | — | — | — |
| 2701 | https://musthavemods.com/sims-4-room-ideas/ | 75 | board "Sims 4 House CC" does not obviously match topic "Sims 4 Room Ideas" | — | — | — |
| 2037 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 7971 | https://musthavemods.com/black-sims-4-cc/ | 100 | — | — | — | — |
| 2084 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5118 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2293 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 7623 | https://musthavemods.com/sims-4-maxis-match-hair/ | 100 | — | — | — | — |
| 2043 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 8019 | https://musthavemods.com/black-sims-4-cc/ | 100 | — | — | — | — |
| 2085 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5119 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2294 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 7629 | https://musthavemods.com/sims-4-maxis-match-hair/ | 100 | — | — | — | — |
| 8226 | https://musthavemods.com/afro-hair-sims-4/ | 100 | — | — | — | — |
| 2044 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 2086 | https://musthavemods.com/sims-4-male-urban-hair/ | 100 | — | — | — | — |
| 5120 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 2295 | https://musthavemods.com/sims-4-urban-hair-cc/ | 100 | — | — | — | — |
| 7640 | https://musthavemods.com/sims-4-maxis-match-hair/ | 100 | — | — | — | — |

Apply protocol: `--apply` writes "Post Title" / "AI Text Slug" only for rows above that (a) fail a rule and (b) whose proposal independently re-scores as passing every rule; prior values are saved to a rollback JSON before any write. Board mismatches are reported, never auto-changed.
