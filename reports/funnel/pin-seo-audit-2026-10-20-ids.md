# Pin SEO audit — 2026-10-20 (18 rows, Post Date 2026-10-20 .. 2026-11-03, proposals: template)

Read-only (`audit` mode). Scores rows scheduled in the next 14 days ("Is Posted"=false) against four rules: title 40-100 chars containing the primary keyword, description 100-400 chars with the keyword in the first sentence plus a related term and no hashtag spam, alt text (= title, no separate column) present and descriptive, board fit against `pinterest-boards.csv`. Proposals are deterministic templates, not an LLM call — reviewable, reproducible, and only ever touch "Post Title" / "AI Text Slug".

**Summary:** 18/18 passing all rules, 0 need a fix, mean score 94/100, 0 rows with unknown board fit (no board data to check against — not counted as a failure).

| id | destination | score | issues | proposed title | proposed description | proposed alt |
|---|---|---|---|---|---|---|
| 2375 | https://musthavemods.com/sims-4-rugs-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Rugs CC" | — | — | — |
| 2705 | https://musthavemods.com/sims-4-room-ideas/ | 75 | board "Sims 4 House CC" does not obviously match topic "Sims 4 Room Ideas" | — | — | — |
| 2376 | https://musthavemods.com/sims-4-rugs-cc/ | 75 | board "Sims 4 CC" does not obviously match topic "Sims 4 Rugs CC" | — | — | — |
| 2706 | https://musthavemods.com/sims-4-room-ideas/ | 75 | board "Sims 4 House CC" does not obviously match topic "Sims 4 Room Ideas" | — | — | — |
| 2034 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 5127 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 4237 | https://musthavemods.com/sims-4-cc-male-pieces/ | 100 | — | — | — | — |
| 2042 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 5128 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 4238 | https://musthavemods.com/sims-4-cc-male-pieces/ | 100 | — | — | — | — |
| 4521 | https://musthavemods.com/best-sims-4-main-menu-overrides/ | 100 | — | — | — | — |
| 7338 | https://musthavemods.com/best-sims-4-male-hair-cc/ | 100 | — | — | — | — |
| 2045 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |
| 5129 | https://musthavemods.com/sims-4-gshade-presets/ | 100 | — | — | — | — |
| 4239 | https://musthavemods.com/sims-4-cc-male-pieces/ | 100 | — | — | — | — |
| 4522 | https://musthavemods.com/best-sims-4-main-menu-overrides/ | 100 | — | — | — | — |
| 7349 | https://musthavemods.com/best-sims-4-male-hair-cc/ | 100 | — | — | — | — |
| 2047 | https://musthavemods.com/sims-4-urban-tattoos/ | 100 | — | — | — | — |

Apply protocol: `--apply` writes "Post Title" / "AI Text Slug" only for rows above that (a) fail a rule and (b) whose proposal independently re-scores as passing every rule; prior values are saved to a rollback JSON before any write. Board mismatches are reported, never auto-changed.
