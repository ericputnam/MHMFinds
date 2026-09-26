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

## 2026-09-26
- Tried: `bathroom-cc` page + title-only repair of `bathroom`, the last substring room theme (T0, E112, PR TBD). Bedroom shape: strong words never vetoed, weak `bath`/`shower`/`tub` + veto list. GSC demand thin (/sims-4-bathroom-cc/ 95 impr / 1 click, pos 43.9).
- Before → after: `bathroom` 456 rows / 121 title-supported by the final rule (26.5%; 154 = 33.8% by the old words, 24 of them baby showers) → 123 / 123; 2 added, 335 stripped; top 24 read 24/24. Wicked Whims was card #1; "Cuddle and Bath Together" (598 dl) would have been #1 without the `cuddle` veto.
- Verdict: MORE DATA (read 2026-10-24; keep if ≥200 engaged sessions OR ≥5 favorites in 28d and RPM ≥95%).
- Next time: all room themes are now title-only — the next catalog move is the mistyped-contentType `--ids=` hand-fix (bathroom sets typed glasses/lashes/makeup/tops, fridges typed tops), not another theme.

## 2026-09-25
- Tried: `kitchen-cc` collection page + title-only repair of the `kitchen` room theme, one PR (T0, E109, PR #179 `d80ae98`). Demand is thin (GSC 28d kitchen cluster 194 impr / 2 clicks vs bedroom ~394 / 7) — shipped as the spec'd traffic page because the fix is the durable part. The AI extractor cannot emit `kitchen` as a theme (it is a contentType there), so only `ROOM_THEME_RULES` needed the fix.
- Before → after: `kitchen` theme 345 rows / 118 title-supported (34.2%) → 160 / 160 (100%); 31 added (all fridges/appliances), 216 stripped; top 40 read 40/40. Worst old keyword: 'cooking' (card #2 would have been "Realistic Cooking Mod"). Descriptions caught two false friends a count would have kept: "Sims 4 Furniture Stove Set" is a potbelly stove, "Punk Pitstop Appliances" is a foosball table.
- Verdict: MORE DATA (read on 2026-10-23; keep if ≥200 engaged sessions OR ≥5 favorites in 28d and RPM ≥95%).
- Next time: bathroom (439 rows, Wicked Whims card #1) is the last room theme on the substring rule — same repair, and read the ambiguous-word rows' descriptions as a spot-check (never as rule input). The kitchen grid exposed mistyped contentType (fridges as glasses/tops/makeup) — an `--ids=` contentType hand-fix, not a retag.

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

_Entries 2026-09-08 and 2026-09-10 archived to `archive/playbooks/rowan-2026-09.md` (context budget)._
