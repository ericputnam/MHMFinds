<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Rowan — Catalog & Product — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers catalog data
quality, collection pages, mod-page/`/go` flow quality, and returning-visitor
+ favorites metrics.

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

_Seeded 2026-09-22 from Nova's playbook: collection-page learnings moved here
because collection pages are now Rowan's, not Nova's. Full originals in
`archive/playbooks/nova-2026-09.md` and the live `playbooks/nova.md`._

## 2026-09-24
- Tried: `bedroom-cc` collection page + title-only repair of the `bedroom` theme, one PR (T0, E100, PR #170 `565f35d`). Picked bedroom over kitchen/bathroom on demand: GSC 28d bedroom listicle cluster ~394 impr / 7 clicks vs bathroom 105 / 1, kitchen 45 / 0, and bedroom queries ("bed frame cc" pos 16.8, "teen bedroom cc" 21.9) hit no browse page. Room themes are NOT in `THEME_KEYWORDS` — they come from `ROOM_THEME_RULES` in `contentTypeDetector.ts` (`String.includes` over title then description); the fix went there, not in the extractor.
- Before → after: `bedroom` theme 523 rows / 195 title-supported (37.3%) → 250 / 250 (100%); 39 added, 312 stripped; top 40 read 40/40. The old `'sleeping'` keyword was the worst single word (9 of 16 `sleep*` titles are pose packs). A bare "bed" needed a veto list — the first dry run's ADD list had "Bed Cuddle", "Read in Bed", "Cat Window Hanging Bed" and three bed pose packs. Titles-only cost the old #1 card ("Teen Space", 7,998 dl, bedroom clutter per description).
- Verdict: MORE DATA (read on 2026-10-22; keep if ≥200 engaged sessions OR ≥5 favorites in 28d and RPM ≥95%).
- Next time: kitchen (345 rows / 33.6%) and bathroom (439 / 20.7%, Wicked Whims is card #1) have the same `ROOM_THEME_RULES` bug; copy the two-level rule (strong words never vetoed, bare noun + veto list). Four beds are typed tops/shoes/makeup (Yuna Double Bed, Duality Bed, University Life Beds, Allie Bedframe) — a contentType hand-fix via `--ids=`, not a retag.

## 2026-09-23
- Tried: `halloween-cc` collection page + title-only repair of the `halloween` theme, one PR (T0, E90). Picked on demand + timing: lots/houses had the biggest GSC cluster (hospital-lots 3,529 impr) but `residential`+`lot` were 55.5% title-clean with a Love Island challenge at #2; `glasses` 41.8% (the word "glass"); beard 93% but 80 impr. Halloween: 9 articles, ~519 impr/28d **before** the October peak.
- Before → after: `halloween` theme 547 rows / 190 title-supported (34.7%) → 190 / 190 (100%); 53 added, 410 stripped; top 40 read 38/40. Source fixed: THEME_KEYWORDS no longer maps witch/vampire/ghost/pumpkin → halloween; `lib/halloweenThemeRules.ts` is title-only and also filters AI-only tags. Collection routes 23 → 24.
- Verdict: MORE DATA (read 2026-10-21; keep if ≥200 engaged sessions OR ≥5 favorites in 28d; 7-day RPM watch on the page).
- Next time: every THEME_KEYWORDS entry has the same bug (substring over title+description) — `bedroom` 43.6%, `kitchen` 44.6%, `bathroom` 37.6% title-supported today. Fix a theme at the source before paging it; `pumpkin` and `ghost` were rejected by reading the dry run's ADD list, not the STRIP list.

## 2026-09-21
- Tried: `kids-cc` collection page **and the class bug behind it, in one PR** (T0, PR #136, `7816cbe`, E72). On 09-20 I rejected this cluster — 752 rows on infant/toddler/child, only 45.6% of titles carrying a kid word — and wrote…
- Before → after: `ageGroups` kid axis **752 rows / 343 title-supported (45.6%) → 686 / 686 (100%)** — 362 added, 428 stripped, 35 rewritten, 289 no-ops over a 1,114-row union population, verified by a separate read of the changed…
- Verdict: MORE DATA (read 2026-10-19; keep if ≥15 engaged sessions in the 7d to the read date **and** aggregate collection-page engaged sessions ≥95% of 1,069 **and** `/sims-4-kids-cc/` impressions ≥80% of 153 — i.e. the page has…
- Next time: three things. **(1) Distinguish a class bug from heterogeneous junk by asking whether one rule is uniformly wrong, and check both directions.** 09-20's nails case was six wrong rows for six reasons and correctly got `…

## 2026-09-20
- Tried: `nails-cc` collection page + a 6-row repair of the `nails` facet in the same PR (T0, PR #127, E67). `nails` was the last clean un-paged contentType: 151 rows, 0 pages, 0 mod detail pages with a collection breadcrumb. **Re…
- Before → after: `nails` facet 151 rows / 92.7% title-clean → 145 / **97.2%** (141 of 145), top 12 by downloads 12/12 genuine and two 8-row mid-grid samples 16/16; collection routes 21 → 22; mod detail pages with a collection bre…
- Verdict: MORE DATA (read 2026-10-18; keep if ≥200 engaged sessions OR ≥5 favorites in the first 28 days — the bar used for decor-cc, shoes-cc, loading-screens and jewelry-cc). E38 reads **KILL** on its own rule; `/play` keeps it…
- Next time: **take the facet-wide dry run even when you intend a narrow fix, then throw it away.** `--facets=nails` proposed 21 changes and **15 were wrong** — rule priority beats the literal word "nails" in a title ("S-Club Nail…

## 2026-09-13
- Tried: `shoes-cc` collection page (T0, PR TBD, E43) — the largest **clean** un-paged contentType left in the 16,409-mod catalog. Facet audit of every uncovered cluster first: `accessories` (863) + `jewelry` (550) + `hats` (201)…
- Before → after: collection routes 18 → 19; `/games/sims-4/shoes-cc/` engaged sessions 0 (page did not exist) → read 2026-10-11. GSC baseline for the shoe cluster, 28d to 2026-09-10: 11 blog articles, **1,651 impressions / 19 cli…
- Verdict: MORE DATA (read 2026-10-11; keep if ≥200 engaged sessions or ≥5 favorites from the page in the first 28d, same bar as decor-cc).
- Next time: **audit the facet before you rank clusters by size.** Accessories was the obvious pick on row count and would have shipped a page whose top three cards are a dating-app mod, a traits mod and a Coach handbag. The 09-08…

## 2026-09-10
- Tried: `gameplay-mod` detector rule + NULL re-tag (T0, PR #79, E33) — the follow-up I specced on 09-09. The rule already existed (467 rows); what it lacked were nouns for the three things a gameplay mod is usually named after. A…
- Before → after: catalog rows carrying a contentType facet 15,929/16,384 (97.22%) → 15,994/16,384 (97.62%); NULL 455 → 390; gameplay-mod 467 → 480, decor 611 → 633 (22 wallpapers, which is also 22 more cards on the decor-cc page…
- Verdict: MORE DATA (read 2026-09-24; keep if the /games/* grids are flat-or-up, a spot-check of the 65 re-tagged rows is still 100% correct, and the next ingest run adds < 10 NULL rows from a "mods" post).
- Next time: **run the new script's dry run against the previous audit before trusting it.** The title-only pass proposed re-tagging "Green Lantern – Injustice God Among Us" as `lighting` — the exact row PR #61 had hand-cleared tw…

## 2026-09-08
- Tried: junk-facet repair (T0, PR #61) — fixed `lighting`/`curtains` at the detector level, not just in the data. Two bugs: `keywordToRegex` already appends `(?:s|es)?`, so a rule listing both 'light' and 'lights' scored TWO matc…
- Before → after: `lighting` 140 rows / ~6 real → 19 / 19 real; `curtains` 7 / 0 real → 0; decor-cc grid 731 → 741; furniture 965 → 978; clutter 162 → 165; detector suite 14 → 21 tests; 128 of 147 rows rewritten, 84 to NULL. Blog:…
- Verdict: MORE DATA (read on 2026-10-06; keep if `lighting` still spot-checks 100% fixtures and the three collection grids are flat-or-up).
- Next time: when a facet looks junky, find out *why the detector produced it* before writing a cleanup script — the plural double-count was a general bug affecting every rule with redundant singular/plural spellings, and a data-o…

## 2026-09-07
- Tried: decor-cc collection page (T0, PR #51) — `contentTypeIn ['decor','plants','rugs','wall-art']` = 731 SFW Sims 4 mods, the largest un-paged content type in the 15,888-mod catalog; excluded `lighting` (140) and `curtains` (7)…
- Before → after: collection routes 17 → 18; /games/sims-4/clutter/ related cards 1 → 3; canonical-trailing-slash suite red → 15/15 green; decor-cc engaged sessions 0 (page did not exist) → read 2026-10-05; GSC baseline ~104 impre…
- Verdict: MORE DATA (read on 2026-10-05; keep if ≥200 engaged sessions or ≥5 favorites from the page).
- Next time: run the touched page-type's existing test suite against origin/main *before* writing code — the red test was 3 days old and nobody had run it. When folding facets into a `contentTypeIn` collection, sample the top rows…
