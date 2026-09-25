# Pinterest read-back — 2026-09-25 (E102: grade E26; runway top-up under the standing approval)

Owner: Pip (Traffic). Source: GA4 property 437117335, `sessionSource` CONTAINS "pinterest", both serving hosts (`musthavemods.com` + `blog.musthavemods.com`), `landingPage` CONTAINS the 14 E26 destination slugs. Windows anchored at 2026-09-23 (last finalized day in the scoreboard).

## 1. E26 grade — stranded-pin revival (PR #69, 140 rows re-dated 2026-09-10 → 09-23 at 10/day)

Keep rule (archive/experiments-2026-09.md): "Pinterest sessions 7d beat the taper trend by >= 3 pts, no spam signal, posted pins/day rises toward ~29". Read: Pinterest sessions to the 14 destinations that received the revived pins, pre-window (2026-08-27 → 09-09) vs during-window (2026-09-10 → 09-23), against the site-wide Pinterest total over the same two windows.

| Set | Pre 14d | During 14d | Delta |
|---|--:|--:|--:|
| 14 E26 destinations (apex + blog.*) | 6,325 | 5,842 | **-7.6%** |
| Site-wide Pinterest (apex + blog.*) | 126,754 | 126,649 | -0.1% |
| ... of which apex | 90,585 | 87,319 | -3.6% |
| ... of which blog.* | 36,169 | 39,330 | +8.7% |

Per destination (pre → during, both hosts): sims-4-cc-tattoo 2,022 → 1,765 · dress-cc 1,433 → 1,210 · black-sims-4-cc 1,183 → 1,146 · cc-finds-for-march-2026 460 → 486 · bags-cc 331 → 333 · toddler-cc 232 → 228 · piercings 255 → 215 · sims-4-houses 133 → 146 · female-clothes-cc 117 → 142 · afro-hair-sims-4 82 → 97 · valentines-cc 32 → 30 · sims-4-couple-poses (exact; `-2` sibling excluded) 31 → 23 · male-clothes-cc 10 → 9 · flower-crown-cc 4 → 12.

The treated set trailed the site by ~7.5 points; the rule needed it to lead by 3. The pins/day leg cannot be attributed (E46/E56 and the 09-19 rollback moved posting rate inside the window). Three of the four largest destinations (tattoo, dress, black-sims-4-cc = 73% of the treated sessions) fell 3-16%.

**Verdict: E26 KILL.** Recency-selected revival (the 140 rows were "the newest stranded rows") did not lift the destinations it pointed at. Consistent with E15 (KILL) and the E75 finding that recency is anti-correlated with earning power. Nothing to roll back: the 140 rows have posted. What changes: every revival since 09-22 goes through `pin-runway-topup.py --ids-from <sessions-ranked package>`; today's top-up (section 2) is the first one graded on that selection.

## 2. Runway top-up (standing approval 2026-09-22, Tier 0 bounded)

- Tool's own dry run: `Inventory: 63 · Trailing-14d posted rate: 34.36/day · runway 1.83d < 2.0d floor` — gate fired.
- Selection: `rank-pin-destinations.ts` package `reports/funnel/pin-revival-package-2026-09-25.json` (26 destinations, 163 ids, 7d window 09-17 → 09-23, min 50 sessions/7d), `--max-per-url 1`.
- Applied: **21 rows re-dated**, 7/day on 2026-09-25/26/27 (7 <= 34.36 posted rate; hard cap 21), 8 destinations: wedges-cc 3, cc-finds-for-april 3, couple-poses-2 3, cc-finds-for-november 3, skin-overlay 3, furniture-cc 3, tv-cc 2, plants-cc 1. 0 dead destinations, 0 dead images, 2 rows dropped for a dead/unverifiable board section, 0 on blog.*.
- Ledger: `reports/funnel/pin-runway-topup-2026-09-25.json` (experiment tag SD-22-topup). Rollback: `python3 scripts/agents/revive-stranded-pins.py --rollback reports/funnel/pin-runway-topup-2026-09-25.json --apply`.
- Runway after: ~2.44d by the tool's own arithmetic (84 rows in the 14d window). Still below the 3.0d target; the cap, not the floor, bound the count. Tomorrow's run re-checks; the tool refuses a second apply on the same UTC day.
- Read for this slice (E102 keep rule): Pinterest sessions to the 8 destinations, 7d ending 2026-10-02 vs 7d ending 2026-09-23 (before: 976 + 837 + 523 + 384 + 346 + 248 + 148 + 136 = 3,598/7d), must beat site-wide Pinterest WoW by >= 3 pts. Same rule that killed E26, applied to sessions-ranked selection.

## 3. Watch items

- blog.* is where the Pinterest growth is (+8.7% vs apex -3.6% in the E26 window): the host-normalization bug in `MHMUtils` (ideas-inbox) is now a measurable share of the channel, not a nuisance.
- 48 of the 84 rows in the 14d posting window point at four destinations (cc-finds-for-april, cc-finds-for-november, couple-poses-2, skin-overlay — 12 rows each). Sibling pins to one URL sharing identical copy is a Pinterest dedupe risk; the E103 per-row excerpt rotation exists for exactly this shape.
