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

## 2026-10-02
- Tried: E161 ingest stall — traced the runner log → selector → DB instead of trusting "catalog-ingest OK created=0" (Tier 0, PR #249). The stall was a selector invariant (`--new-only` = skip any post with a Mod row, forever), not a crash: `Selected 0 of 678 (663 older than --since, 15 already in DB)` on 6 of 7 mornings while the writer only re-edited old seasonal posts. `--refreshed` re-selects a known post whose sitemap `lastmod` is newer than `max(Mod.createdAt)` for its sourceUrl; the update path no longer re-types an existing row's contentType.
- Before → after: selected 0 of 678 → 9 of 678 (9 refreshed); created 0 → 117 in one run; catalog 16,561 → 16,678; new mods 7d 27 → 144 (read 10-09). Spot-check of the 117 found 17 (14.5%) wrong, all from two rules (URL category beats title; `lot` reads description) — 18 pinned in `hand-audited-content-types.ts`, 17 applied via `--ids=`, read-back 18/18.
- Verdict: MORE DATA (read 10-09: new mods 7d ≥ 100, 0 refresh churn, 0 rows created unverified).
- Next time: a summary line that prints `created=0` must also print *why* 0 (skipped-known vs skipped-since) — `refreshed=N` is now on the line; and any "already in DB" count larger than the created count is the first thing to read.

## 2026-10-01
- Tried: title-only repair of `holidays` contentType + ingest guard, 29 pins (T0, E154, PR #240; rollback file PR #242). No live writer: legacy import.
- Before -> after: 923 rows / 491 title-supported -> 503/503; 420 moved (176 NULL); top 24 12 -> 24/24. Season != holiday.
- Verdict: MORE DATA (read 2026-10-29; keep if 100% titled, pins 29/29, page engaged >=43/28d).
- Next time: collection pages are static — a data apply shows only after the next deploy; curl after one. The 176 new NULLs want an --ids pass.

## 2026-09-30
- Tried: hand-fix of the 78 rows typed as a room/lot value (bathroom 22, kitchen 8, room-titled residential 20 / lot 22 / holidays 6) + guard: room values never a contentType, room-titled sets never `lot` unless the title names a building (T0, E147). Writer found by replaying ingest, not guessed: URL category `/bathroom/` etc.
- Before → after: rows typed bathroom/kitchen 30 → 0; room-themed residential/lot/holidays 48 → 4 (kept: 1 house, 3 Christmas/Thanksgiving). 74 written (furniture 59, NULL 8, clutter 5), pins 78/78. Whole-catalog detector diff: 32 lot→NULL, all room-titled; ingest replay would have written `bedroom` on 118.
- Verdict: MORE DATA (read 2026-10-07; keep if these stay 0 and pins 78/78).
- Next time: holidays is 58.2% title-supported (top 24: 13) — the next facet repair, title-only, before any holidays promotion.

## 2026-09-29
- Tried: /account/favorites/ + Navbar heart → link (T1, E140, PR #223 queued). Chose it over the aiFacetExtractor guard after replaying every writer over E120's 76 rows: the extractor reproduces 2/76, not 74; 55/76 carry a CAS value in the old `category` field (Jan-2026 backfill from that field, code deleted 01-20). Title-only NULL retag: 518 → 516.
- Before → after: /account/favorites/ 0 pv (no route) → read 2026-10-07; 859 accounts / 22,477 favorites had no view; 10 lists >200 (max 507).
- Verdict: MORE DATA (read 2026-10-07; keep if ≥50 pv/7d and RPM ≥95%).
- Next time: replay the writer on the actual bad rows before writing "X wrote them" in a playbook. My 09-28 line was a guess, and it cost a day's top-priority slot.

## 2026-09-28
- Tried: class rule behind E120 — room-titled row (bedroom/kitchen/bathroom, title-only) never gets a CAS contentType; guard in detector + mhmScraper ingest; `--room-titled-cas` dry-run mode (T0, E132, PR #202 `323f50a`).
- Before → after: room-titled CAS rows 0/532 → 0/532 (0 written); whole-catalog sim re-ingest diff 2 rows, detector diff 4 (all E120, all CAS → NULL/furniture), non-room rows 0; E120 replay 26 agree / 47 NULL / 3 other build-buy / 0 CAS.
- Verdict: MORE DATA (read 2026-10-05; keep if count stays 0 and pins 76/76 no drift).
- Next time: diff the writer, not just the rule — today's ingest would have mistyped only 2 of E120's 76; the other 74 came from aiFacetExtractor's substring match. Find which code path wrote the bad rows before assuming it was the ingest.

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

_Older entries (up to 2026-09-24) live verbatim in `archive/playbooks/rowan-2026-09.md`; nothing deleted._
