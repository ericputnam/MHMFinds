# Triage memo: gaming catalog beyond Sims 4 (Q15)

Idea (ideas-inbox.md, operator, 2026-09-01): "Gaming catalog beyond Sims 4:
which game has Pinterest-shaped demand and no good mod finder?" — Nova,
2026-09-21

## What we already have, unbuilt

`lib/gameRoutes.ts` already defines `GAME_SLUGS`/`GAME_METADATA` with SEO
copy written for **sims-4, stardew-valley, animal-crossing, minecraft** — but
`lib/collections.ts` `getCollectionsForGame()` only ever returns collections
for `'sims-4'`; every other game returns `[]`. Zero collection pages exist for
any non-Sims-4 game. This has sat unbuilt since before 2026-09-01.

## Existing demand, measured (GA4 `properties/437117335`, apex domain, 90d;
GSC `sc-domain:musthavemods.com`)

| Game | GA4 sessions (existing blog content), ~90d | GSC query/page clicks | Nexus/CurseForge saturation |
|---|---|---|---|
| **Minecraft** | ~4,024 across 4 blog articles; top single article `/best-minecraft-shaders-2026/` = 2,499 sessions / 1,574 engaged | near-zero on direct query-text and exact-page checks (see caveat below) | CurseForge: 226,000 Minecraft projects, 800M downloads/mo, 11M MAU — saturated |
| **Stardew Valley** | ~2,979 across 6 blog articles | near-zero (same caveat) | Nexus: 33,828 Stardew mods — dominant but an order of magnitude smaller corpus than Minecraft's |
| Baldur's Gate 3 | 0 rows returned on query-text search | 0 | Nexus: ~13,000 mods, 509M downloads — fast-growing, still concentrated on Nexus |
| Skyrim | not separately tracked; general knowledge: most-modded game ever, 2B+ downloads on Nexus | 0 | maximally saturated, oldest/most mature finder ecosystem |
| Animal Crossing | 5 sessions total | 0 | small third-party CC scene, Nexus coverage thin |
| Cyberpunk / Palworld / Sims 3 | not separately tracked, no blog content | 0 | not evaluated further — no existing content or demand signal to build from |

**Caveat, stated honestly rather than hidden:** GA4 attributes thousands of
"Organic Search" sessions to the Minecraft/Stardew blog URLs above, but GSC
shows near-zero clicks for the same URLs and matching query terms over the
same window. Channel-group and hostname breakdowns rule out Organic Social
misattribution and subdomain mismatch. Unresolved — possibly GA4's "Organic
Search" bucket includes non-Google engines GSC can't see. This means the GA4
session numbers above are the real "people are landing on this content"
signal, but we should not claim Google-ranking momentum for these topics
without more evidence.

## Scraper reachability

`lib/services/mhmScraper.ts`/`mhmScraperUtils.ts` (the primary, currently-used
scraper) is already game-agnostic and has tested, passing game-detection for
both Stardew Valley and Minecraft (`scripts/test-scraper-games.ts` validates
against real blog URLs for both). This is a stronger signal than
`privacyAggregator.scrapeCurseForge()`, which is hardcoded to
`curseforge.com/sims4/mods` and would need rework for any game. **Net: catalog
reachability is roughly equal and low-effort for Minecraft or Stardew Valley
via the scraper we already run in production; it is not a differentiator
between the two.**

## Revenue fit

No Mediavine RPM-by-vertical data exists anywhere in the repo (checked
`reports/`, `experiments.md`, `targets.json`) — stating this as a gap rather
than guessing. The only grounded assumption: gaming/cosmetic content in a
female-skewing, visual, Pinterest-shaped niche (our whole thesis for Sims 4
CC) is the same shape for Stardew Valley farm/cosmetic mods (cozy-game
aesthetic, strong Pinterest presence) and weaker for Minecraft, where the
dominant demand (shaders, performance mods, redstone, modpacks) is
technical/utility-shaped, not cosmetic/aesthetic-shaped — a worse match to
our RPM thesis even though its GA4 session count is higher.

## Scoring

| Axis | Minecraft | Stardew Valley |
|---|---|---|
| Existing demand (GA4) | Higher (4,024) | Lower (2,979) |
| Pinterest-shape fit (visual/cosmetic/evergreen) | Weak — top content is shaders/performance, not cosmetic | Strong — cozy/cottagecore aesthetic already proven adjacent to our Sims 4 audience |
| Competition | Extremely saturated (CurseForge 226K projects) | Saturated but far smaller corpus (33,828), less utility-tooling-dominated |
| Scraper reachability | Equal, low-effort | Equal, low-effort |
| Revenue fit to our RPM thesis | Weaker (utility content) | Stronger (aesthetic content) |

## Recommendation: Stardew Valley, Tier 1 MVP, 2 weeks

Minecraft has more raw traffic today but the wrong content shape for our
"Pinterest-shaped demand" thesis and the most saturated finder market on the
list. Stardew Valley already has real, if unresolved-by-source, GA4 traffic,
a materially smaller/less-saturated mod corpus than Minecraft, a cozy/cottage
aesthetic that overlaps our existing Sims 4 CC audience, and zero catalog
infrastructure cost beyond a registry entry (the scraper already works, the
SEO metadata is already written).

**2-week Tier 1 MVP:**
1. One collection page, `lib/collections.ts` registry entry for
   `gameSlug: 'stardew-valley'` (reuses `CollectionDefinition` pattern,
   SSR + JSON-LD like every Sims 4 collection page), seeded from whatever
   Stardew mods `mhmScraper` can pull in a first pass.
2. 10 pins to Pinterest via the existing pinner backlog pattern (`E1`/`E56`
   precedent), linking to the new collection page.
3. Capture surface on the page per Cass's component, outside ad anchors.

**Explicit non-scope:** no CurseForge integration, no new scraper code
(`mhmScraper` already detects Stardew Valley), no second collection page yet.

## Reply options

- **approve 15 stardew** — ship the 2-week Stardew Valley collection-page +
  10-pin MVP as scoped above.
- **approve 15 minecraft** — do Minecraft instead (higher current traffic,
  weaker Pinterest/RPM fit — Nova does not recommend this option).
- **reject 15** — stay Sims-4-only; revisit when a clearer non-Sims signal
  appears.

Read on: 2026-10-05 (14 days after ship, if approved) — sessions to the new
`/games/stardew-valley/*` collection page ≥200/28d (mirrors the E7 makeup-cc
bar) OR ≥5 favorites from the page; Pinterest sessions to the page ≥20/7d
within 14 days of the first pin (mirrors E1's bar, which the Sims-4 catalog
pin test missed — use as the kill line, not just the keep line).
