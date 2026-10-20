# Writer brief — Week 43 (2026-10-20)

**Status note before anything else (read this first):** Writer briefs are
demoted to monthly-and-only-if-asked per the current charter, on the record
of 0/15 W36–W38 briefs adopted. That record showed a **brief-shape**
failure, not a demand-data failure: every prior brief proposed broad
head-term categories ("sims 4 decor cc", "sims 4 furniture cc"), and the
writer's actual publishing pattern is celebrity / aesthetic / single-item
posts (`nicki-minaj-cc`, `goth-nails-cc`). This brief was requested directly
by Quinn for W43 using the same GSC-demand + catalog-coverage methodology as
W38 — so it keeps W38's **structure** (adoption check, context, 5 ranked
topics, mod tables, performance tracking) but reshapes every **topic** into
a narrow single-item/aesthetic angle instead of a broad category roundup,
so it doesn't re-propose the format that already failed 15 times. If the
writer still doesn't pick any of these up, that's evidence the shape fix
wasn't enough — not evidence to retry the broad-category version a 16th
time.

## Adoption check — W38

W38's five topics (teen pregnancy mods, hospital builds, male body presets,
haunted/gothic houses, holiday decor bundles) were not visibly adopted in
the 30-day post list as distinct posts; the closest overlap is
`sims-4-halloween-decor` (2026-10-19), which predates this brief and isn't
attributable to it. Running tally stays **0/20 briefed topics adopted
across W36–W43** pending confirmation once W43 reads on 2026-10-27.

## Methodology (as instructed)

- **GSC demand**: 28-day window 2026-09-22→2026-10-19, queries containing
  "sims 4", impressions ≥50, average position >10 (i.e., no page currently
  ranks top 10 for that exact query — read literally as instructed; this
  undercounts cases where a *different* query on the same subject already
  ranks).
- **Catalog coverage**: facets (`contentType` single-select, `themes`
  multi-select) with ≥40 SFW (`isNSFW=false`) mods and no new mod of that
  facet added in the last 60 days (`MAX("createdAt")` < 2026-08-21) — a
  proxy for "catalog has depth, nothing recent to point a reader at."

**What the data actually showed, reported honestly:** crossing both legs
strictly produced **one** topic (#1 below). I widened to catalog-coverage-
only for the remaining four, and before using any of them I spot-checked
the top 5–6 rows by downloads — per the standing rule that `expectedCount`
proves nothing about whether the mods are *right*. Two stale facets
**failed that spot-check and are not in this brief**:

- `script-mod` (52 SFW, stale since 2026-08-09) — top rows include
  **Wicked Whims framework mods flagged SFW** ("Cuddle and Bath Together",
  "Wicked Whims – Menstrual Cycle Feature"). This is the same contamination
  class already on record for this facet (`lib/collections.ts:635`, "8
  adult-themed SFW-flagged titles"). **Flagging for Rowan, not fixing it
  myself** — catalog data quality is Rowan's lever now.
- `workout`/`fitness` theme (123 / 202 SFW, stale) — top row is **"Anorexia
  Trait," 405 downloads**, flagged SFW. Not a mod to anchor a brief topic
  on, and not a facet to leave as-is either. **Also flagging for Rowan.**

`romantic` theme was also rejected on the same spot-check (top rows:
"Teen Romance Mod" 8,062 dl, "Cuddle and Bath Together" again) — same
relationship/gameplay-mod bleed-through pattern as the documented
`jewelry`/`lighting`/`gameplay-mod` theme-keyword pollution. `minimalist`
and `luxury` themes were rejected for being too broad/generic (cuts across
hair, tattoos, kitchen sets, outfits — the same head-term-shaped problem
this brief is trying to avoid, just moved into the `themes` field).

`witch-cc`'s own production filter uses a title/description keyword match
(`__witch_keyword__`), not the `themes` array — the raw `themes` count for
"witchy" (320) and the live collection's `expectedCount` (60) disagree by
5x. I used the keyword match (matching what the live page actually filters
on) for Topic 2's numbers below, not the raw theme-array count.

## Topic 1 — Sims 4 body presets & sliders that aren't just "male presets"

**Why now:** facet `body-preset` has 150 SFW mods, none added since
2026-03-18 (>60 days). GSC: "sims 4 body presets" (23 impr, pos 23.4),
"sims 4 plus size body presets" (10 impr, pos 11.2), "sims 4 belly slider"
(13 impr, pos 13.4), "sims 4 butt slider" (7 impr, pos 35.1), "sims 4 hip
dip slider" (5 impr, pos 12.8), "body presets sims 4" (9 impr, pos 18.7),
"sims 4 body preset" (5 impr, pos 29.4) = **76 impressions, none ranking
top 10**. (Male-specific body-preset queries — "sims 4 male body presets"
etc. — already rank top 10 and are excluded; don't re-cover those.)

**Mod IDs to feature** (contentType=body-preset, SFW, by downloads):

| ID | Title | Creator | Downloads |
|---|---|---|--:|
| cmim8t9c3006koxy83xb7s382 | Solana Body Preset | 97822913* | 2,306 |
| cmim8t8q9006boxy89lmqihyq | Shorty Body Preset | Shorty Body 53194174* | 2,242 |
| cmim8rmm7001foxy81zjg4e7y | Boy Toy Body Preset Pack | Boy Toy Body 47039792* | 1,162 |
| cmmvaq0c9006ooxzg2a5n15b1 | Curves Body Preset | NoNvme Sims | 915 |
| cmijqgd0y000eox8odrnbf8u6 | BBL Body Preset | Bbl 2 1 Body 120591295* | 860 |

*Author names ending in a long digit string are the known URL-extraction
artifact (see `scripts/cleanup-author-data.ts`) — verify the real creator
name before publishing credit.

**Existing collection to link:** `/sims-4-body-presets/` (live,
expectedCount 139).

**Angle:** "not just male presets" — curvy/plus-size/BBL framing, single
clear object class, matches the writer's narrow single-item shape.

## Topic 2 — Witchy/spellcaster CC (single pieces, not a roundup)

**Why now:** catalog has depth (witch-cc live collection, expectedCount
60) with no fresh addition in the window I can date past 60 days via the
raw `themes` tag; GSC signal is thin and below the 50-impression bar on
any single query, so **this one doesn't clear the strict demand leg** —
flagging it as catalog-only, lower confidence than Topic 1.

**Mod IDs to feature** (title/description keyword match — same filter the
live collection uses):

| ID | Title | Creator | Downloads |
|---|---|---|--:|
| cmikil3jn002uoxnafjoezew1 | Modern Witch Mod | Modern Witch Mod 95740193* | 58 |
| cmijnvxjm00kjoxc8nswcpqce | The Late Night Snack Of The Selestial Witch | Late Night Snack 137964627* | 36 |
| cmijmylll009aoxc8olt88vdf | Scarlet Witch | 66635501* | 26 |
| cmijmtqf1006yoxc8hs1x5kf4 | Traditional Witchcraft | Rom Traditional 40071212* | 26 |
| cmikil6e2002woxnaj6i7im09 | The Sims 4: Fairies vs. Witches Mod | Sims 4 Fairies 52330299* | 21 |

*Same author-extraction caveat as Topic 1 — all five need a real-name
check before credit. Download counts here are low; this is a thin topic
and the writer may reasonably skip it. Worth noting that is itself a
signal: if demand doesn't clear the bar on this one either, don't re-brief
witch CC a third time.

**Existing collection to link:** `/sims-4-witch-cc/` (live).

**Angle:** single cauldron/broom/potion-shelf object, not "witch CC
roundup."

## Topic 3 — Streetwear CC pieces people are mixing right now

**Why now:** `streetwear` theme has 304 SFW mods, none added since
2026-01-25 (stale). No qualifying GSC query (≥50 impr, no top-10 post) was
found specifically for "streetwear" — catalog-only signal, same confidence
tier as Topic 2. No dedicated collection page exists for this theme.
**Handing the cluster idea to Rowan** rather than building the page myself
— this is a collection-page candidate, not mine to build.

**Mod IDs to feature** (themes contains streetwear, SFW, by downloads):

| ID | Title | Creator | Downloads |
|---|---|---|--:|
| cmik9y9as00dboxk727xfrkuf | Cyber Wave Collection | Cyber Wave 91407319* | 4,023 |
| cmijpflo20111oxc89wq4f4ee | Kobe Sweats | Kobe Sweats 135179830* | 2,871 |
| cmikko7nr00ebox33fz2j7gug | Men's Winter Clothing Collection | Lls Mens Winter 118052679* | 2,358 |
| cmikkctik0081ox33c0qa5fc8 | Loc Knots | Loc Knots 114008586* | 1,276 |
| cmikit1rb005uoxnabv7fzkdc | Lashes V4 | brandysims | 1,144 |

**Angle:** one or two single hero pieces (the Cyber Wave set, the Kobe
sweats) rather than a "streetwear CC" category post.

## Topic 4 — Boho CC: the pieces, not the whole aesthetic

**Why now:** `boho` theme has 98 SFW mods, none added since 2026-01-25
(stale). No qualifying GSC query found at ≥50 impressions — catalog-only.
Spot-check came back clean (unlike romantic/minimalist/luxury above), good
download counts, no contamination. No dedicated collection page exists —
flagging to Rowan as a cluster candidate.

**Mod IDs to feature:**

| ID | Title | Creator | Downloads |
|---|---|---|--:|
| cmim92p5001suoxy8lryo5xrv | Bohemian Knotless Braids | brandysims | 3,298 |
| cmikk6tqq0059ox337ynf0osm | Harmony Furniture Set | Lapanemona | 1,252 |
| cmim92pl201t1oxy8w7i0o7ft | Levis Jeans Unit | 112074578* | 1,162 |
| cmikij7he001ooxnakfot3pzi | Manon Hairstyle | Manon Hairstyle 128085737* | 590 |
| cmikj2yup00aioxnatbn1gdps | Cozy Cushion Sofa | Omostarz Sims | 452 |

**Angle:** a single hair or furniture piece (the braids, the cushion sofa),
not a boho-aesthetic roundup.

## Topic 5 — Winter outerwear CC (seasonal lead time)

**Why now:** `winter` theme has 278 SFW mods, none added since
2026-01-25 (stale); filtered to clothing-type facets (tops/bottoms/
full-body/accessories/shoes/jewelry) the contamination seen in the raw
theme query (gameplay/trait mods bleeding in) drops out. No qualifying GSC
query at ≥50 impressions found yet — this is the most speculative of the
five, justified mainly by seasonal timing (late Oct → Nov/Dec lead time)
rather than present-tense search demand. Flag as lowest-confidence; cut
first if the writer only wants 4.

**Mod IDs to feature** (themes contains winter, contentType restricted to
wearables, SFW, by downloads):

| ID | Title | Creator | Downloads |
|---|---|---|--:|
| cmikko7nr00ebox33fz2j7gug | Men's Winter Clothing Collection | Lls Mens Winter 118052679* | 2,358 |
| cmijqbpy801g9oxc8vbbd7xos | Chanel High and Low Boots Set | Sunberry Chanel 72664254* | 245 |
| cmim8y1cx010coxy8uimig033 | Short Padded Jacket | Rimings Short 76723127* | 46 |
| cmim8z1o1015noxy82frkh85m | Telfar X Ugg Merch Part Two | Telfarxugg Merch 60588840* | 30 |

**Angle:** single padded-jacket or boot-set piece, not a "winter CC"
category post.

## Catalog-hygiene handoff (for Rowan, not me)

Two facets failed the spot-check and need Rowan's attention independent of
this brief:
1. `script-mod` (52 SFW rows) — Wicked Whims adult-content mods flagged
   SFW (e.g. "Wicked Whims – Menstrual Cycle Feature", "Cuddle and Bath
   Together"). Same class already noted at `lib/collections.ts:635`.
2. `workout`/`fitness` theme (123/202 SFW rows) — top-downloaded row is
   "Anorexia Trait" (405 downloads), flagged SFW. Needs review before this
   facet backs any page or brief.
3. `romantic` theme shows the same relationship/gameplay-mod bleed-through
   pattern documented for `jewelry`/`lighting`/`gameplay-mod` — candidate
   for the same title-only retag treatment.

## Brief performance tracking

| Week | Topics proposed | Adopted (within 14d) | Notes |
|---|--:|--:|---|
| W36 | 5 | 0 | broad head-term categories |
| W37 | 5 | 0 | broad head-term categories |
| W38 | 5 | 0 (pending final check) | broad head-term categories |
| **W43** | **5** | **TBD — read 2026-10-27** | reshaped to single-item/aesthetic angles (E246) |
