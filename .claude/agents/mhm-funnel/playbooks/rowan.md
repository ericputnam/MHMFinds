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

## 2026-10-07
- Tried: E180 — 34 `--ids=` hand pins on the two posts behind Sage's hub flags: `/best-sims-4-realistic-mods/` 12 → gameplay-mod (were accessories ×9, hair, furniture, workout) and `/sims-4-bags-cc/` 16 → accessories, 3 → decor (trusted TSR/CurseForge category over the post wording), 2 → NULL, 1 kept; 16 already-right rows untouched. PR #267 `e004314`, Tier 0, merged after Rio's CLEAR (first gate attempt sat behind an "owner not written yet" lock ~10 min); verify PASS 07:33; `/games/sims-4/furniture-cc/` no longer lists Functional Skincare or Pochette. Pins file now 338 entries.
- Before → after: 34 wrong of 41 rows on the two posts → 33 written, 34/34 read-back at the pinned value; read 10-14. Reads: E140 KILL on usage (14 pv / 9 users vs 50; route stays), E147 KEEP (0 room values, 78/78 pins), E162 KEEP (1 failing file of 126 at d62016d). Catalog 16,771 mods, 813 NULL (4.8%), 210 new in 7d.
- Verdict: MORE DATA (read 2026-10-14).
- Next time: when a hub flag names two rows, read the whole source post — 34 of its 41 rows were wrong, not 2; and a NULL beats a guess on a mixed set ("CC #47.2").

## 2026-10-04
- Tried: E168 apply, `--lot-untitled --apply` with a new write-once rollback file (T0; ledger `3e4ff73`; PR for pin + playbook). The dry run reproduced the 10-03 plan exactly first: 80/80 same (id, from, to), E161 18/18.
- Before → after: lot 362 → 282 = 158 title + 52 URL + 72 pinned, 0 prose-typed (separate read-back query). 80/80 at target. E168 pins 72/72; the 10-03 report said 70, but 67+2+3=72. Top 24 by downloads: 23/24 lots. Villa Amour Collection is an outfit set titled with the lot word `villa`, now NULL-pinned (dry run only, not applied). Live read: 1 row ingested since 3d9eb80 (Automne Set → furniture, right), so it is partial.
- Verdict: MORE DATA (read 10-10: ≤5% wrong of the next 100 ingested, lot 0 prose-typed, pins 72/72). E120 KEEP (room-theme CAS 0, pins 76/76).
- Next time: an apply's `--rollback-out` overwrites without a guard (#250 covers dry runs only). Always pass a fresh path and `test -e` it first. The signed-off plan on `main` is the real rollback.

## 2026-10-03
- Tried: E168 — ingest precedence (confident title > URL category > description) + `lot` rule title-only (`lib/lotContentTypeRules.ts`), 70 E168 pins (T0, PR HELD-RED: breaker RED, nothing applied). Dry run `--lot-untitled`: 362 rows → 80 change (71 NULL, 4 decor, 3 full-body, 1 gameplay-mod, 1 hair), 124 no-ops (57 URL-category, 67 pinned real lots). Plan: `reports/funnel/catalog-e168-lot-retag-2026-10-03.json`.
- Before → after: lot 362 / 152 title-supported (42.0%) → after apply 282 / 158 (56.0%) + 57 URL + 67 pins = 0 prose-typed. Part (a) replay: 5,412 URL-category rows differ on 861 (15.9%), never to NULL.
- Verdict: MORE DATA (read 10-10: ≤5% wrong on next 100 ingested rows; lot 0 prose-typed; pins 70/70).
- Next time: an inherited keyword is re-measured the moment precedence changes — `home` (76 titles) would have flipped 12 furniture/gym sets to `lot` once the title beat the URL; measure against the URL-category rows, not just the catalog. Reading all 137 NULL strips row by row found 67 real lots on slugs the URL map does not know (`-lots/`, `/castles/`, monthly finds) — the STRIP list is where the cost hides.

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

_Older entries (up to 2026-09-26) live verbatim in `archive/playbooks/rowan-2026-09.md`; nothing deleted._
