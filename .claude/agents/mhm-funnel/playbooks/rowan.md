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

## 2026-10-31 — E307 christmas-cc (title-only theme, 262 cards)
- Tried: 7th theme moved to title-only (`lib/christmasThemeRules.ts`), page `/games/sims-4/christmas-cc/`, PR #419 49cdb66 PASS.
- Before → after: `christmas` 312 rows / 59.6% title-supported ("Beard N3", "FSP Family Portrait" at cards #3–#4) → 262 / 100%; 18 Christmas queries (≈43 impr, 0 clicks) landing on no browse page → a 262-card page, top 24 by downloads hand-read 24/24.
- Verdict: MORE DATA — read 11-14 / 11-28.
- Next time: the first dry run's STRIP list is where the missing word hides — "Christmassy Fireplace" was in it, which is how `christmas(?:sy)?` got into the pattern. A theme that already sits in `FACET_VALUES.themes` needs the halloween wiring (drop the keyword map, filter the AI-only tag at the merge), not the wedding "not in FACET_VALUES" guard. Rejections worth remembering: `elf` (Elf Bar Vape, 1,089 dl), `stocking` (hosiery, 0/24), `holly` (a name), `advent` (creator countdowns), bare `holiday` (holidays-cc territory).

## 2026-10-30 (scheduled run) — E296 `/games/sims-4/gallery-poses/` (#411 908a2b1, T0)
- Tried: a title-only `gallery-pose` theme (88 rows, dry run add 88 / strip 0 / no-op 3; rejections recorded: bare `gallery` 58 → a lot, bare `cas` 207 → UI mods); poses + body-presets link in; wedding-cc metaTitle gained "Browse" because `canonical-trailing-slash.test.ts` was red on main after #403.
- Before → after: "gallery pose" family 12 clk / 227 impr at pos 6–9, 100% landing on the 902-row poses page → 88-card exact page live 11:37Z; read 11-13 / 11-27 at ≥12 clk with ≥50% landing on the new page, poses ≥33.
- Verdict: MORE DATA. Q35 asks to retarget the legacy `/sims-4-gallery-poses/` 301 (50 of the 88 rows came from that one article).
- Next time: a head-term page that absorbs a 301 from a narrower article inherits the narrow queries at a mediocre position — check redirected legacy slugs before adding a theme; they are both the evidence and the seed. Run `canonical-trailing-slash.test.ts` before opening the PR, not after.

_Seeded 2026-09-22 from Nova's playbook: collection-page learnings moved here
because collection pages are now Rowan's, not Nova's. Full originals in
`archive/playbooks/nova-2026-09.md` and the live `playbooks/nova.md`._

## 2026-10-30
- Tried: landed #394 (E281, 20 poses pins, applied 20/20). E289 (T0): `/games/sims-4/wedding-cc/` on a new title-only `wedding` theme (`lib/weddingThemeRules.ts`; 6 words accepted, 10 rejected with counts), 118 rows applied, detector wired. Inbound from poses + jewelry-cc. Graded E256 KEEP.
- Before → after: wedding theme 0 → 118 (top 24 hand-read 24/24 wedding); poses 922 → 902. Nearest page /goth-cc/ 98 sessions/7d (GA4 10-22→10-28); wedding queries ~170 impr/28d, no page.
- Verdict: MORE DATA (read 2026-11-13).
- Next time: on a brand-new theme, apply before generating covers. The covers test reads prod, so a page with 0 tagged rows cannot pass it.

## 2026-10-23
- Tried: E263 (T0, #363 55994c0; ledger 0d49439): Sage's 18 lots-grid non-lots (#359), all `residential`; 18 --ids pins, 12 retyped, 6 NULL. Graded E221 KEEP, E214 EXTEND, E90/E100/E109 KILL.
- Before → after: lots top-48 off-type 16 → 6, none of the 18 left (the 6 are 5 wall rows + an EA pack); read-back 18/18; residential 566 → 548.
- Verdict: MORE DATA (read 2026-11-04 with Sage's lots re-read).
- Next time: `residential` has no writer and is 39.4% lot-titled; walls/doors/windows posts alone put ≥71 rows there. Clearing a top-N layer just lets the next layer of the same class move up. Fix the class, don't chase the grid.

## 2026-10-21
- Tried: E256 (T0, #355 a600e55; apply ledger 2b7b414): read all 150 body-preset rows; 57 were nose/eye presets from the backfill's CAS hint regex. Rule moved to lib/bodyPresetRules.ts + 74 --ids pins (incl. nose post, furniture top-30, swimsuit post). Graded E207 KEEP.
- Before → after: body-preset 150 → 93, face titles 57 → 0 (top 24 2 → 0); nose post 7 → 0; furniture top-30 off-facet 4 → 0; copy 130+ → 90+. E207 eyes/makeup/makeup-cc/eyes-cc top 24 0/0/0/0, 73/73.
- Verdict: MORE DATA (read 2026-10-28).
- Next time: a one-off backfill is a writer too. When a facet has no detector path (body-preset), find the script that filled it before blaming the rows. And collection grids are static at build, so curl after the next build, not right after apply.

## 2026-10-20
- Tried: E249 — 7 `--ids` pins on /sims-4-cc-furniture/ (T0, #349 258034c; apply ledger 8e74b63); graded E200 KEEP and E242 KEEP (flip leg).
- Before → after: post disagreement 7/24 → 0/17; catalog 274/4,885 → 267/4,878; 6 earlier pin sets all still at value (E235 32/32 … E186 80/80). E200 share 70.9% → 67.7% because 15 hand-verified untitled pins (E207/E235/E228) entered the denominator — a miss on the rule, not on junk (untitled unpinned 3/266, all real).
- Verdict: KEEP (read E249 2026-10-27).
- Next time: a "title-supported share" rule must exclude hand-pinned rows from its denominator, or every verified pin lowers the score it was meant to raise; and join `gh pr view` to the merge with `&&`, not `;` (`--delete-branch` exits 1 while `main` is held elsewhere — `state` was MERGED).

## 2026-10-19
- Tried: E242 (T0): isNSFW pins for Sage's 8 adult titles in the gameplay/script top 25, decided from title + franchise: 6 → true (MC WooHoo, Wicked Whims, Prostitution, Ho* It Up, Breast Slider, Basemental), 2 pinned SFW (Wonderful Whims, Cuddle and Bath). `HAND_AUDITED_NSFW` + `pinnedIsNSFW`; 3 scraper update paths now honour it (the test found the third). Graded E193 KEEP, E228 KEEP.
- Before → after: 8/8 isNSFW=false and 8/8 in sitemap-mods → 6 true; 0 of 8 in any live collection grid (31 pages curled), but /pregnancy-mods/ copy names MC WooHoo + Wonderful Whims. Cost: the 6 leave sitemap/feeds/`/mods`, ~42 GSC clicks/28d on their pages. Test 10/13 red pre-fix.
- Verdict: MORE DATA (read 2026-10-20).
- Next time: the gameplay top 25 opens with Teen Romance and Teen Pregnancy (#1, #2). Sage should rule on those before the hub ships. Do not widen E242 to cover them.

## 2026-10-18
- Tried: E235 (T0): URL map `/clutter/`→clutter, `/body-preset/`→body-preset (E228's two KNOWN_GAPS, now assertions; 3 of 21 red pre-fix) + 32 `--ids` pins: /sims-4-accessories-cc/ 13, /sims-4-male-shoes-cc/ 12, clutter top-30 7 (6 room sets/big appliances → furniture, 1 keep). Graded E186 KEEP.
- Before → after: disagree 296/4,891 → 274/4,865; accessories-cc 10/26 → 0, male-shoes 12/34 → 0; clutter 226 → 219, top 30 room sets 6 → 0. Replay: 14 posts / 361 rows change URL category, ingest answer differs on 129, 0 stored rows move (E161: ingest never re-types). Pins E186 80/80, E193 69/69, E228 21/21, E235 32/32.
- Verdict: MORE DATA (read 2026-10-25).
- Next time: keep the disagreement FAMILY equal to the old one when a map entry splits, or the headline number moves for no real change (296 held exactly across the map edit).

## 2026-10-17
- Tried: E228 (T0, PR #325 aed39ae): URL map `/jewelry/`→jewelry and `/farmhouse-cc/`→furniture, a registry guard test (30 collections walked, 2 of 19 cases red pre-fix), 21 `--ids` pins on food-clutter and male-accessories; `catalog-post-disagreement.ts` prints pins-not-yet-at-value and takes `--label`.
- Before → after: food-clutter 7/15 → 0/8, male-accessories 13/30 → 0/17; catalog mismatches 318/4,911 → 296/4,891; posts >50% wrong 1 → 0; farmhouse-cc 10/17 → 8/17 (map entry only). Map change touches 60 post categories on ingest, 0 DB rows rewritten.
- Verdict: MORE DATA (read 2026-10-19).
- Next time: the URL map is the ingest fallback, so measure it against the registry, not only against the disagreement tool. FAMILY agreement hid the jewelry gap (the accessories family contains jewelry).

