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

## 2026-09-09
- Tried: catalog-ingest diagnosis + fix (T0, PR #73, E28). Cass's "0 mods in 7 days" was true and understated: last insert 2026-08-09 22:23Z, `scraping_jobs` has 0 rows ever, no launchd/cron/runner step calls any scraper, and every non-blog source (Patreon/Tumblr/TSR/CurseForge) last inserted 2026-01-29. Nothing broke — ingest was never scheduled; `scrape:mhm` runs only by hand and keeps freshness in an untracked `data/mhm-scraped-urls.csv` in the operator's checkout, so no worktree or job could run it without re-crawling all 667 posts. Added `--new-only` (freshness = distinct `Mod.sourceUrl` in the DB), `--since` (sitemap `<lastmod>`), `--dry-run`, a `scripts/agents/catalog-ingest-daily.sh` wrapper that logs one line per run, and 12 unit tests; ran dry (22 posts, 496 would-create, 0 errors), then live.
- Before → after: mods 15,888 → 16,374 (+486 from 22 posts published 08-10→09-09; 1 updated, 19 dedupe skips, 0 errors); posts with a mod row 493 → 515; wrapper re-run selects 0 of 668 (idempotent). 81 of 486 new rows have NULL contentType — all from the four "mods" posts (social-media, phone, funeral, moving): the detector has no rules for careers/aspirations/traits. Blog: 6 posts/7d; W37 adoption 0/5 (09-09 `sims-4-goth-nails-cc` is not a brief topic; goth cluster is the writer's own run).
- Verdict: KEEP the flags (they cost nothing when there is nothing to do). MORE DATA on cadence: read 2026-09-16 — keep if `mods added 7d` > 0 on every day a post was published, i.e. the schedule Quinn picks actually fires.
- Next time: when a pipeline "stalls", check whether it ever had a schedule before looking for a break — the whole insert history was manual bursts. Any state a scheduled job needs must live in the DB or in git, never in an untracked file in one checkout. Detector follow-up: a `gameplay-mod` rule for career/aspiration/trait/mod-title patterns would have tagged ~70 of the 81 NULLs.

## 2026-09-08
- Tried: junk-facet repair (T0, PR #61) — fixed `lighting`/`curtains` at the detector level, not just in the data. Two bugs: `keywordToRegex` already appends `(?:s|es)?`, so a rule listing both 'light' and 'lights' scored TWO matches off the single word "lights" and cleared the ">=2 description matches = medium confidence" bar; and the bare adjective 'light' was a `lighting` keyword. Then re-tagged the 147 affected rows **title-only** (description inference is what caused the mess), writing NULL when the title supports nothing, with 7 hand-audited id overrides.
- Before → after: `lighting` 140 rows / ~6 real → 19 / 19 real; `curtains` 7 / 0 real → 0; decor-cc grid 731 → 741; furniture 965 → 978; clutter 162 → 165; detector suite 14 → 21 tests; 128 of 147 rows rewritten, 84 to NULL. Blog: 6 posts/7d; W36 adoption still 0/2 full (09-08 `sims-4-goth-accessories` is a PARTIAL — right content-type cluster, wrong angle and no brief collection link).
- Verdict: MORE DATA (read on 2026-10-06; keep if `lighting` still spot-checks 100% fixtures and the three collection grids are flat-or-up).
- Next time: when a facet looks junky, find out *why the detector produced it* before writing a cleanup script — the plural double-count was a general bug affecting every rule with redundant singular/plural spellings, and a data-only fix would have left it re-poisoning the catalog on every scrape. Also: 84 rows went NULL and many are room sets ("Sleek Sims 4 Kitchen", "Kivik Living Room Part 1", "Grunge Kitchen") — the `furniture` rule has no bare room-name keywords, so ~40 of them are recoverable in a second T0 pass. Operational note: the shared `node_modules` symlink into Quinn's worktree emptied mid-run again (`next: command not found`); `rm -f node_modules && npm ci` took 7s and unblocked it — do it pre-emptively next run.

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
