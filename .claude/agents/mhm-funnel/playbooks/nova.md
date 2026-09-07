# Nova — Content & Creators — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers content: which briefs the writer used and how they performed, collection pages that worked, creator outreach response rates.

Entry format:

```
## YYYY-MM-DD
- Tried: …  (tier, PR/link)
- Before → after: <metric> <n> → <n> (<window>)
- Verdict: KEEP / KILL / MORE DATA (read on <date>)
- Next time: one sentence
```

## Kill log
_(ideas you tried that did not work — never re-propose without saying what changed)_

---

## 2026-09-07
- Tried: decor-cc collection page (T0, PR #51) — `contentTypeIn ['decor','plants','rugs','wall-art']` = 731 SFW Sims 4 mods, the largest un-paged content type in the 15,888-mod catalog; excluded `lighting` (140) and `curtains` (7) as junk-tagged (top `lighting` rows are a GShade preset, a skin overlay and a Ford Crown Victoria). Also fixed 4 dangling `related` slugs (clutter, holidays-cc, furniture-cc) that the renderer dropped silently, and wired makeup-cc's missing `blogUrl`, which had left `canonical-trailing-slash.test.ts` red on origin/main since PR #32 (2026-09-04).
- Before → after: collection routes 17 → 18; /games/sims-4/clutter/ related cards 1 → 3; canonical-trailing-slash suite red → 15/15 green; decor-cc engaged sessions 0 (page did not exist) → read 2026-10-05; GSC baseline ~104 impressions at pos 20–42 for 5 clicks across the decor cluster (28d to 09-04). Blog: 5 posts/7d, latest sims-4-cardi-b-cc is not a W36/W37 brief topic (E12 adoption 0/2).
- Verdict: MORE DATA (read on 2026-10-05; keep if ≥200 engaged sessions or ≥5 favorites from the page).
- Next time: run the touched page-type's existing test suite against origin/main *before* writing code — the red test was 3 days old and nobody had run it. When folding facets into a `contentTypeIn` collection, sample the top rows of every facet; row count alone would not have caught that 2 of 6 decor-adjacent facets are junk. Chose T0 decor-cc over the T1 creator page because a T1 queues until tomorrow and moves no number this week.

## 2026-09-01
- Tried: nothing yet — team chartered today. Read `../charter.md`, `../autonomy.md`, `../operating-model.md`, `../targets.json`, and `reports/growth/fact-base-2026-09-01.md` before your first move.
- Before → after: baseline in `../targets.json`
- Verdict: —
- Next time: your first move should be the top item in your agent file's "levers" list unless the scoreboard shows a 🔴 in your area.
