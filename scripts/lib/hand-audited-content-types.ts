/**
 * Hand-audited content types, keyed by mod id.
 *
 * These are the rows where a human read the title (and, where noted, the
 * description) and found the detector's answer wrong. They exist because a
 * keyword detector cannot be made right for every proper noun in a 16,000-row
 * catalog, and because a wrong facet is worse than no facet — a Ford Crown
 * Victoria in the `lighting` filter is visible to every visitor who opens that
 * collection page.
 *
 * `contentType: null` means "the detector's answer is wrong and no facet is
 * right" — the row is deliberately left out of every facet.
 *
 * Shared by:
 *   - scripts/retag-junk-build-facets.ts   (2026-09-08, PR #61)
 *   - scripts/retag-null-content-types.ts  (2026-09-10, E33)
 *
 * It lives here rather than inside either script because importing a script
 * that calls `main()` at module load would run that script as a side effect.
 * It is data only: no imports, no I/O.
 */

export interface HandAuditedContentType {
  /** The facet to write, or null to leave/clear the row's content type. */
  contentType: string | null;
  /** Why, in the words of whoever eyeballed it. Dated. */
  why: string;
}

export const HAND_AUDITED_CONTENT_TYPES: Record<string, HandAuditedContentType> = {
  // ── Audited 2026-09-08 (Nova, PR #61) while repairing the junk
  //    `lighting` and `curtains` facets. Title-only detection landed wrong.
  // detector reads "Crown" (hats rule) out of "Crown Victoria"
  cmsmclm4800tqoxeu90ps0m8x: { contentType: 'vehicles', why: '2010 Ford Crown Victoria Police Interceptor is a car' },
  // "Mirror" (furniture rule) outranks "Boots" by rule priority
  cmmvaqe1h007joxzg06n11j35: { contentType: 'shoes', why: 'Lollipop Mirror Boots are shoes, not a mirror' },
  // title misspells "Lightning Bolt" as "Lighting Bolt"
  cmkylj0q00143oxhco3tj9fd5: { contentType: 'jewelry', why: 'Neon Lighting Bolt Earrings are earrings' },
  // "Home" (lot rule) matches, but this is a career pack
  cmsmbyry300hcoxeugu1vn5w0: { contentType: 'career', why: 'Careers - Funeral Home and Cemetery is a career mod' },
  // "Beauty" (makeup rule) matches; this is a commercial build set
  cmil0qqyv002goxeeotn4bc55: { contentType: 'furniture', why: 'Mid Century Modern Beauty Salon is a build/buy set' },
  // "Build" (lot rule) matches; a "build set" is CC, not a downloadable lot
  cmijocccm00r7oxc8a9nqtzvv: { contentType: null, why: 'Vibe Build Set is CC of unknown type, not a lot' },

  // ── Audited 2026-09-10 (Nova, E33) while re-tagging NULL rows.
  // "Lantern" is a real light-fixture keyword, so the title alone reads as
  // lighting. Cleared to null on 09-08; the description settles it —
  // "This Green Lantern costume recreates Hal Jordan's appearance" — so it is
  // clothing, and full-body puts it in the clothes collections instead of
  // nowhere.
  cmsmczfbc0115oxeu8gxj9o8h: { contentType: 'full-body', why: 'Green Lantern - Injustice is a superhero costume (source: sims-4-superhero-cc)' },
  // 'suite' is a furniture keyword ("Bedroom Suite"), but this is a
  // 14-bedroom hotel build from sims-4-hotel-lots.
  cmsmc32y500jpoxeu0xv20m7g: { contentType: 'lot', why: 'Hampton Inn & Suites is a hotel lot, not a furniture suite' },

  // ── Audited 2026-09-18 (Nova, E63) while repairing the junk `jewelry`
  //    facet ahead of the jewelry-cc collection page. Every one of these was
  //    read against its own description and source post, not just its title.
  //    'nose' is NOT a jewelry keyword (48 of its 95 catalog titles are nose
  //    presets and sliders), so the nose-piercing sets have to be named here.
  cmijpbg6x00zcoxc88kjc0ib2: { contentType: 'jewelry', why: 'Nose Set No.02 for Sims 4 (FKA) is a nose-piercing set — 742 downloads, the 2nd-biggest row in the facet' },
  cmil1jik900f3oxeentmx5025: { contentType: 'jewelry', why: 'Nose Set No. 02 — desc: "a stunning nose jewellery collection containing multiple nose piercings, septums, and hoops"' },
  cmobv7ql0000dox2nhlzclhdm: { contentType: 'jewelry', why: 'Nose Set No. 02 (Chi) — desc: "this Sims 4 nose piercing cc pack" (source: sims-4-nose-piercings)' },
  cmil1mie300gkoxeezas6cvgw: { contentType: 'jewelry', why: 'Goth is Rock Collection — desc names "a sharp spike bridge, an asymmetrical septum"; 378 downloads' },
  cmik90abd001koxk7glldvgpw: { contentType: 'jewelry', why: 'Van Cleef Set is the jewellery house — desc: "contains a bracelet…"' },
  // 'cushion' (furniture/clutter) outranks 'ring' by rule priority, so the
  // title alone sends a diamond wedding ring set into the clutter facet.
  cmil1j4pn00euoxeeb32q0kh7: { contentType: 'jewelry', why: 'Elongated Cushion Cut Diamond Wedding Rings Set is a ring set, not a cushion (source: sims-4-jewelry-cc)' },
  cmohdavw30009oxbly05phd1a: { contentType: 'jewelry', why: 'Sacred Metal Pack — desc: "a bold facial piercing set with stacked septum rings" (source: sims-4-piercings)' },
  cmohdawxe000noxbl6gndj315: { contentType: 'jewelry', why: 'Circle Of Life Set — desc: "a collection of earplugs, tunnels, and hangers" (source: sims-4-piercings)' },
  cmohdawih000hoxbl37m8qryk: { contentType: 'jewelry', why: 'Jayla Set — desc: "a sleek swirl-style septum piercing" (source: sims-4-piercings)' },
  cmohiywpn000foxrbnyrlkt3z: { contentType: 'jewelry', why: 'Elara Petite Set — desc: "a delicate bracelet… tiny star-like charms" (source: sims-4-bracelet-cc)' },
  // Not jewelry at all, and NULL would be a worse answer than the right facet.
  cmsmclvgy00ttoxeutfy4452i: { contentType: 'gameplay-mod', why: 'Law and Disorder is a Lumpinou crime-and-justice gameplay mod (source: sims-4-police-mods)' },

  // ── Audited 2026-09-20 (Nova, E67) while clearing the six junk rows out of
  //    the `nails` facet ahead of the nails-cc collection page. 151 rows,
  //    140 of them carrying a nail word in the title (92.7%); every one of
  //    the 11 that do not was read against its own description.
  //
  //    NOT fixed at the detector level, deliberately: the six wrong rows are
  //    six different rules winning on six different words, not one class bug.
  //    A facet-wide `--facets=nails` re-tag was dry-run first and rejected —
  //    it proposed 21 changes, 15 of them wrong, because rule priority beats
  //    the literal word "nails" in the title ("S-Club Nails Art Accessories"
  //    -> accessories, "Nails N1 - Solid + Chipped Overlay" -> skin, "Sims 4
  //    Toenail Recolors in 7 Palettes" -> makeup, "Sponge Bob Summer Set" ->
  //    hair on "bob"). Raising the nails rule's priority is a whole-catalog
  //    change and gets its own PR with its own before/after diff.
  //
  //    Keyword candidates measured against the whole catalog and REJECTED so
  //    nobody re-proposes them: `claw` matches 12 titles and only 4 are nail
  //    sets (3 jewelry — Witch Claw Ring, Honey Claw Earrings — 3 hair
  //    — Kayla Claw Clip, Wolverine's Claw Fade — 1 pose pack, 1 gameplay
  //    mod). `pedicure` is clean (2 of 2) but is worth 2 rows, both of which
  //    are already tagged `nails`.
  //
  //    The five `nails` entries below are no-ops today — they exist so that a
  //    future facet-wide run cannot clear a real nail set whose title happens
  //    to name no nail (the exact failure mode PR #79 hit on "Green Lantern").
  cmim8t9ug006soxy8n3xl4lzi: { contentType: 'body-preset', why: 'Feet 1V Remaster — desc: "another feet body mod… this preset pack"; 121 downloads, it was the 2nd card on the nails grid' },
  cmim9sgo9004pox56w8vh1i9u: { contentType: 'shoes', why: 'Sims 4 Wedge Sandals are shoes (detector agrees on the title: "sandals")' },
  cmijpe0nl010doxc83xqarcd0: { contentType: 'lot', why: 'Mediterranean Sunrise — desc: "a four-story villa… rustic stone exteriors"; title alone gives no facet' },
  cmijpewy3010soxc8wgaq5w7t: { contentType: 'lot', why: 'E&R Gilmore\'s Villa — desc: "a grand traditional villa… two-story home"' },
  cmil1j9cx00exoxeeta6tj96x: { contentType: 'jewelry', why: 'Bruna Ring Set — desc: "a stunning collection of sleek, gold-toned rings"' },
  cmil1lba500g1oxeelar7nglh: { contentType: 'jewelry', why: 'WM Rings 202001 — desc: "a sparkling ring for your engagement or wedding"' },
  cmttzglfn000loxfeho9mpzqr: { contentType: 'nails', why: 'Black Tips in 5 Shapes — desc: "a dark twist on classic French tips"; title names no nail' },
  cmmvaq23l0078oxzgntho5ivo: { contentType: 'nails', why: 'Brina B Set — desc: "a bold, ultra-feminine nail set… long coffin"' },
  cmikaak6d00knoxk737aiohf7: { contentType: 'nails', why: 'Sponge Bob Summer Set — desc: "the extra-long ballerina" nails; the detector reads "bob" as hair' },
  cmmvaq1da0072oxzgzieaj6cx: { contentType: 'nails', why: 'Ashley Set — desc: "a fierce XL nail collection… the extra-long claws"' },
  cmim9r2rz0025ox56q059m13i: { contentType: 'nails', why: 'Sims 4 Default Pedicure — desc: "a gorgeous toenail polish set"' },
};

/**
 * The audited entry for a mod id, or undefined if a human never looked at it.
 */
export function handAuditedContentType(id: string): HandAuditedContentType | undefined {
  return HAND_AUDITED_CONTENT_TYPES[id];
}
