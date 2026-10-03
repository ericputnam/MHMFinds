# E168 — `lot` facet dry run (Rowan, 2026-10-03) — NOT APPLIED

Circuit breaker RED-RPM on 2026-10-03: the PR is HELD-RED and this is a dry run only.
The production DB apply waits until Quinn confirms the PR merged.

## What changed in code (same PR)

1. `resolveIngestContentType(title, description, urlContentType)` in
   `lib/services/contentTypeDetector.ts`: a confident (medium/high — the detector's
   own threshold) TITLE answer beats the blog post's URL category; the URL category
   is the fallback when the title names nothing; the shared description is the last
   resort; `guardRoomTitledContentType` still runs last. `mhmScraper.saveModsToDatabase`
   now calls it instead of `detectContentTypeFromUrl(url) || detectContentType(title, desc)`.
2. The `lot` rule is title-only (`lib/lotContentTypeRules.ts`, `titleOnly: true` on the
   `KeywordRule`; PASS 2 skips it). `home`, `build`, `renovation`, `community lot`
   dropped from the inherited list with counts in the header; `castle`, `penthouse`,
   `palace`, `duplex`, `no cc` added.
3. 70 hand-audited pins (`scripts/lib/hand-audited-content-types.ts`, why prefix
   `E168 lot-untitled`): 67 real lots the title cannot see (KEEP lot), 2 decorative
   boats (decor), 3 clothes packs whose URL says `tops` (NULL — mixed CAS set).

## Whole-catalog replay of part (a) — 16,692 rows, read 2026-10-03

5,412 rows carry a URL category. New composition differs on 861 (15.9%), never to NULL;
where it differs the stored value agrees with the NEW answer 468 times and with the OLD
224. Top transitions: tops→dresses 140, tops→full-body 93, decor→clutter 77,
tops→bottoms 75, accessories→jewelry 50, poses→pregnancy 40, decor→furniture 36,
makeup→eyeliner 25 / lipstick 24 / blush 21, hair→facial-hair 18 / beard 16,
tops→shoes 15 / accessories 15 / hats 14. Only 6 URL-category rows would newly become
`lot` (Cozy Cottage, Palace Dining Set, Apartment Therapy CC Stuff Pack, Lots Of Gym
Equipment, Girly Apartment, A La Ferme Cottage Gardening) — recorded as known misses in
the rule header; before `home` was dropped it was 17.

## Dry run — `retag-junk-build-facets.ts --lot-untitled`

```
Loaded 362 rows; 204 untitled-or-pinned lot rows in scope; 158 title-supported rows untouched (43.6% title-supported before).
E161 pins: 18 · found 18 · at pinned value 18 · not yet / drifted 0
In scope: 57 rows carry a URL category, 147 carry none (title or NULL decides).
STRIP (leaving) : lot 80
ADD   (entering): (null) 71, decor 4, full-body 3, gameplay-mod 1, hair 1
Selectivity     : facet population 362 -> in scope 204 (56.4%) -> changing 80 (39.2% of scope); unchanged/pinned no-op 124
Rollback file   : reports/funnel/catalog-e168-lot-retag-2026-10-03.json (80 rows, prior values in "from")
```

Lot facet after apply: 282 rows = 158 title-supported (56.0%) + 57 kept by the post's
URL category (`/sims-4-houses/` etc.) + 67 hand-pinned real lots. **0 rows typed from
prose.** "≥95% title-supported" cannot be the keep rule for this facet — the hospitals,
gyms and hotels have no lot word in their titles and their post slugs
(`/sims-4-gym-lots/`, `/sims-4-hotel-lots/`, `/sims-4-castles/`,
`/sims-4-cc-finds-for-<month>/`) are deliberately not widened into
`SIMS_4_CONTENT_MAPPINGS` (never widen — filed in ideas-inbox). The measurable keep
rule is: every lot row is title-supported, URL-categorised, or pinned by id.

### STRIP — top 24 by downloads (all → NULL; read against description + source post)

1 Home Gym Set [72] · Male Clothing CC Dump [47] · Pompom Clothing Collection [18] ·
Date Night CC Clothing Pack [16] · Sims 4 Male Clothes Pack [14] · Casual Sims 4 CC
Clothes Pack [11] · Elena Toddler Clothing Pack [10] · Sims 4 Male Clothing CC Pack [10] ·
Sunny Skies Sims 4 CC Clothes Pack [9] · LorySims Cars CC [8] · Casual Classics Sims 4 CC
Clothes Pack [4] · Resorts & Hotels Mod [4] · Sims 4 Lamborghini Cars Collection [4] ·
2 Home Base CC Pack [2] · Euphoria Sims 4 CC Clothes Pack [2] · Fairy Forest Nursery [2] ·
Historical Pottery Wheel & Kiln Recolors [1] · Mini Mod: No Off-the-Grid Notification [1] ·
Sims 4 CC Clothes Pack for Female Sims [1] · Mover Deco Sims [1] · Coastal Cozy Toddler
Clothing [1] · U-Haul Moving Truck Deco [1] · Going North – World Mod [1] · Sims 4 CC
Clothes Pack [0].

The 71 NULLs are clothing packs (≈40), cars, travel/off-the-grid mods, moving clutter,
toys, phone overrides, candles/lights, fences, a Sim download, pottery recolors, two
build/buy collections. None is a lot. NULL beats a guess for all of them.

### ADD — every non-NULL destination (9 rows)

decor: Homey Wallpapers 2, Arthouse Wallpaper Designs (detector), Kativip's Medieval Boat,
Sea Yachts (E168 pins — "decorative" per description) · full-body: Medieval Maid Uniform,
Energy Activewear Clothing, Lift Activewear Clothing · gameplay-mod: SimsTuber Career ·
hair: 3 Charlotte Short Bob. Read: all nine are right.

Before the three NULL pins, the URL fallback would have made Vetiver Menswear Clothing,
70s Summer Flow Pack and Sims 4 CC Clothes Pack: City Adventurer `tops` — the E161
"Moss Collection" class (mixed CAS pack, no single facet). Pinned NULL.

### The 67 KEEP pins (would have been NULL without them — the STRIP list's real cost)

Hospitals (Willow Creek Hospital, Magnolia Grace Hospital, Modern Vet Clinic), gyms
(11 on `/sims-4-gym-lots/`), hotels/motels (9), police stations (5), Everwyn Tower,
Keratin Salon, Old Town Salon, Simbledon Tennis Club, Medieval Village, Medieval
Tournament, Plasma Vampire Nightclub, Ws Vampire Home Dimitrescu, St. Fiacre Cemetery,
Funeral Home CC, Eternal Hollow Funeral Home, Blood Elf Village, Pirate Bay Beach Area,
Big Ranch, Off-Grid Earthship, Zora Ceramics, Pottery Business & Dream Home, MonoLeaf
Coffee Shop, Dockside Tavern, Phosphorescent Flower Shop, yachts/boats built as lots
(Yacht Serenity, Finn Boat, Bar Captain Cook, The Bima Samudra, Houseboat), and the
monthly-finds houses (66 Newcrest Street, 215 Sim Lane, Grand Kinship Residence,
Honeybrook Corner, Artia No. 5, Ander, Build 01, Seabreeze Terrace, Glasswood Cabin 2/3,
Valley Cabins, Casa Oasis de Cobre, Auralith, Mesa Pop Residence). Each pin's `why`
quotes the description sentence that settles it and the source-post slug.

## Apply (after the PR lands and Quinn clears the breaker) — Tier 0 data

```
cd <worktree> && npx tsx scripts/retag-junk-build-facets.ts --lot-untitled --verbose \
  --rollback-out=reports/funnel/catalog-e168-lot-retag-2026-10-03.json --apply
```

Expected: 80 changes (71 NULL). Read-back: `SELECT count(*) FROM "Mod" WHERE "contentType"='lot'`
→ 282; E161 pins 18/18; E168 pins 70/70 at value. Commit the plan file on `main` first.

## Rollback

Revert the PR; restore each row's `from` value by id from
`reports/funnel/catalog-e168-lot-retag-2026-10-03.json` (80 rows, `{id, title, from, to}`).
A later dry run at that path is refused by the #250 guard, so the plan survives.
