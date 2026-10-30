/**
 * Hand-written title / meta description overrides for individual mod pages
 * (E268, Sage, 2026-10-25).
 *
 * Why individuals and not a rule: E83 (KILLED 2026-10-07) showed the
 * /mods/* class converts normally — 2.9% CTR at positions 6–10 on GSC
 * 2026-09-25→10-22 — while a handful of gameplay-mod pages that carry most
 * of the catalog's non-brand impressions do not. Their `shortDescription`
 * is the first 200 characters of a blog paragraph written in the first
 * person ("I love playing relationship storylines, but they're always
 * filled with romantic getaways…"), so the snippet under the result never
 * says what the mod does. Seven pages, same 28 days:
 *
 *   id                          page                              impr  clk  pos
 *   cmijql8fw0034ox8oaadxjlsu   Messy Relationships Mod            691    6  8.8
 *   cmttzir9d00cqoxfeqpi3tlrc   Intimate Lap Kiss                  356    6  7.9
 *   cmijl2e1h0055oxc80c1ssg1c   Teen Stories and Activities Mod    332    3  7.9
 *   cmmvasdcy00droxzgi9g77mz6   Attachment Styles Mod              329    0  9.1
 *   cmijj9pxb006coxs3hrov7y67   Luumia's No Gloom / No Blu         212    3 10.5
 *   cmijj9nnn006aoxs35tk9i2ug   Even Better In-game Lighting Mod   209    0 13.8
 *   cmijql77i0033ox8opf704hd7   Holiday Drama Mod                  184    1  8.6
 *                                                                2,313   19  → 0.82%
 *
 * Every sentence below is taken from the mod's own description in the
 * catalog (what it adds, how many, where the menu is, free or not). Keep
 * each under META_DESCRIPTION_MAX; `__tests__/unit/mod-meta-overrides.test.ts`
 * enforces the length and that the override is what the page serves.
 *
 * E284 (Sage, 2026-10-29) — cohort 2, same mechanism, GSC 2026-09-30→10-27.
 * Every query these pages rank for is the mod's own name ("into the light
 * sims 4" 24 impr at 5.5, "dynamic teen life sims 4" 16 at 24.3, "better
 * build buy" 19 at 25.9, "turbo careers sims 4" 9 at 15), so the searcher
 * already knows the mod and the snippet has to say it is the right page:
 *
 *   id                          page                              impr  clk  pos
 *   cmikk9rz5006wox33s47c746x   Better Build/Buy                   123    1 22.7
 *   cmijl26ba0052oxc81fpj97z8   Dynamic Teen Life                  109    1 17.0
 *   cmijj9r10006doxs3sfkry95m   Into the Light                     101    1  6.0
 *   cmim8vu9e00kooxy84hrhwlni   Live-In Services                    70    1 14.7
 *   cmim8vbvv00hqoxy8kthztwog   Black Magic Mod                     69    1  9.6
 *   cmikk9l1p006qox3307hgn5ku   Turbo Careers Mod Pack              60    1 15.3
 *                                                                  532    6  → 1.13%
 *
 * Add a row only for a page with its own GSC evidence (≥60 impressions in
 * 28d at a position ≤ 23 with CTR under half the class), and write the
 * numbers into a table above. This is not a place for templated text.
 */

export interface ModMetaOverride {
  /** Full <title>, including the " | MustHaveMods" suffix. Omit to keep the rule-built title. */
  title?: string;
  description: string;
}

export const MOD_META_OVERRIDES: Readonly<Record<string, ModMetaOverride>> = {
  // Messy Relationships Mod for Sims 4 — "messy relationship(s) mod sims 4"
  cmijql8fw0034ox8oaadxjlsu: {
    description:
      'Messy Relationships adds 22 mean-spirited interactions — betrayal, scandals, infidelity — under a new social menu for Sims already in a romance. Free.',
  },
  // Intimate Lap Kiss (Simkatu) — "intimate lap kiss sims 4". A romance
  // interaction mod, not CC, so the title drops the " - Sims 4 CC" qualifier.
  cmttzir9d00cqoxfeqpi3tlrc: {
    title: 'Intimate Lap Kiss Mod for Sims 4 | MustHaveMods',
    description:
      "Simkatu's Intimate Lap Kiss adds a lap-kiss romance interaction for couples seated on sofas, benches, beds or pool edges — plus a Flirty buff chance. Free.",
  },
  // Teen Stories and Activities Mod — "teen(s) stories and activities mod sims 4"
  cmijl2e1h0055oxc80c1ssg1c: {
    description:
      'Teen Stories and Activities gives teen Sims 15 rabbit-hole outings — parties, hangouts and more — but they must ask permission first or risk trouble. Free.',
  },
  // Attachment Styles Mod (elle) — "attachment styles sims 4"
  cmmvasdcy00droxzgi9g77mz6: {
    description:
      "elle's Attachment Styles gives Sims one of four traits — Secure, Anxious, Avoidant or Disorganized — shaping how they flirt, bond and react in love. Free.",
  },
  // Luumia's No Gloom / No Blu — "sims 4 no blu no glo"
  cmijj9pxb006coxs3hrov7y67: {
    description:
      "Luumia's No Blu and No Gloom strip the blue and grey indoor tint from Sims 4 lighting so skin tones and walls read true — made for CAS and indoor shots.",
  },
  // Even Better In-game Lighting Mod — "better in game lighting mod sims 4"
  cmijj9nnn006aoxs35tk9i2ug: {
    description:
      'Even Better In-Game Lighting brightens indoor and outdoor scenes without adding lamps, in bright, average and dark versions. Base-game compatible and free.',
  },
  // Holiday Drama Mod (ellesimsworld) — "holiday drama sims 4"
  cmijql77i0033ox8opf704hd7: {
    description:
      "ellesimsworld's Holiday Drama adds a pie menu of stir-the-pot family interactions — ask who the father is, give unwanted advice — for messy holidays. Free.",
  },

  // ---- E284 cohort 2 (2026-10-29) ----
  // Better Build/Buy (TwistedMexi) — "better build buy sims 4"
  cmikk9rz5006wox33s47c746x: {
    description:
      "TwistedMexi's Better Build/Buy revamps the Build/Buy catalog: debug and live-edit items unlocked, custom filters, better categories, freer placement. Free.",
  },
  // Dynamic Teen Life — "dynamic teen life sims 4"
  cmijl26ba0052oxc81fpj97z8: {
    description:
      'Dynamic Teen Life adds popularity, social groups, after-school activities and dating to teen Sims. Base game compatible; packs unlock modules. Free.',
  },
  // Into the Light — "into the light sims 4". contentType is null in the
  // catalog, so the rule-built title had no "Mod" qualifier at all.
  cmijj9r10006doxs3sfkry95m: {
    title: 'Into the Light Lighting Mod for Sims 4 | MustHaveMods',
    description:
      'Into the Light, a Sims 4 lighting mod, removes the blue aura around Sims in dark rooms, so they look brighter and less corpse-like in CAS shots. Free.',
  },
  // Live-In Services (LittleMsSam) — "live in services sims 4". contentType null, as above.
  cmim8vu9e00kooxy84hrhwlni: {
    title: 'Live-In Services Mod for Sims 4 | MustHaveMods',
    description:
      "LittleMsSam's Live-In Services lets you hire a nanny who stays in the household instead of clocking out. Updated for Sims 4 patches. Free.",
  },
  // Black Magic Mod — "black magic mod sims 4"
  cmim8vbvv00hqoxy8kthztwog: {
    description:
      "Black Magic Mod lets Sims 4 witches sell another Sim's soul to the Old Gods for new spells and potions. Needs XML Injector and Spellbook Injector. Free.",
  },
  // Turbo Careers Mod Pack (Zerbu) — "turbo careers sims 4"
  cmikk9l1p006qox3307hgn5ku: {
    description:
      "Zerbu's Turbo Careers turns rabbit-hole jobs — criminal, business, tech guru — into active careers you follow to work, with tasks and promotions. Free.",
  },
};

export function modMetaOverride(id: string | null | undefined): ModMetaOverride | undefined {
  if (!id) return undefined;
  return MOD_META_OVERRIDES[id];
}
