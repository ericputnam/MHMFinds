# MHM "Main Character Energy" Trait Pack

First-party Sims 4 mod built for the MustHaveMods Pinterest/Patreon launch.
Four base-game-compatible CAS personality traits, each with a permanent
always-on mood buff and a custom icon:

| Trait | Buff (moodlet) | Mood | Icon |
|---|---|---|---|
| Main Character | Main Character Energy | +1 Confident | amber star |
| Golden Retriever Energy | Golden Retriever Energy | +1 Playful | golden paw |
| Delulu | Certified Delulu | +1 Happy | lilac heart |
| Cottagecore Dreamer | Meadow Mind | +1 Inspired | sage mushroom |

- **File**: `dist/MHM-Main-Character-Energy-Trait-Pack-v1.0.package` (~32 KB)
- **Requires**: base game only, no packs, no script mods (pure tuning — does
  not need "Script Mods Allowed", only "Enable Custom Content and Mods")
- **Ages**: Teen through Elder
- **Localization**: English strings shipped to all 18 game locales (no blank
  text in non-English games)

## Build / validate

```bash
npm install
npm run build      # regenerates dist/ from build.js (deterministic)
npm run validate   # reads dist package back from raw bytes, 100+ assertions
```

## How it was verified

All game constants were sourced from extracted game tuning and cross-checked
against two independent sources (Zerbu's Mod Constructor presets and
TURBODRIVER's extracted tuning), not from memory:

- Mood instance IDs: Confident 14634, Energized 14636, Happy 14640,
  Inspired 14641, Playful 14642
- `TraitType.PERSONALITY = 0` (decompiled `simulation/traits/trait_type.py`)
- Trait SimData schema hash `0x992BFA76` (group `0x005FDD0C`), Buff SimData
  schema hash `0x71722956` (group `0x0017E8F6`)
- STBL group `0x80000000`, locale code in instance high byte
- Icons ship as both PNG (`0x2F7D0004`) and shuffled DST DDS (`0x00B2D882`)
  under the same instance, matching how shipping mods do it
- Every tunable field name in the trait and buff XML was checked against
  decompiled EA simulation code (`simulation/traits/traits.py`,
  `simulation/buffs/buff.py`, `simulation/sims/lod_mixin.py`). This caught
  one issue: `always_on_buffs` is not present in that decompile, so the
  traits use the verified classic `buffs` list instead ("Buffs that should
  be added to the Sim whenever this trait is equipped" per EA's own
  docstring), matching the XML shape of shipping trait mods

`validate.js` re-parses every resource from the final file: DBPF header,
tuning XML class/module/instance hashes, SimData round-trips, string-key
cross-references (every key referenced by tuning must exist in every STBL),
buff↔trait references, icon instance references, and DST shuffle state.

## In-game QA checklist (must pass before public launch)

Static validation cannot replace a live game test. Before posting the
download link publicly, run this 5-minute smoke test on a real install:

1. Drop the `.package` into `Documents/Electronic Arts/The Sims 4/Mods`
   (no subfolder needed, but one level deep is fine).
2. Game Options → Other → check "Enable Custom Content and Mods" → restart.
3. Create A Sim → traits dropdown: all 4 traits appear with icons and
   descriptions, no "missing string" placeholders.
4. Give one Sim "Main Character", enter Live Mode: a visible "+1 Confident
   — Main Character Energy" moodlet is present and does not expire.
5. Repeat quickly for one more trait (e.g. Delulu → +1 Happy).
6. Check the trait persists after save/reload.
7. Optional: switch game language to Spanish → strings show English text,
   not empty boxes.

## Version history

- **v1.0** — initial release, 4 traits.
