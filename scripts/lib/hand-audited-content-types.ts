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

  // ── Audited 2026-09-27 (Rowan, E120) — build/buy rows typed as CAS.
  //    Population: every Sims 4 row whose room theme (bedroom / kitchen /
  //    bathroom — all title-only since #170/#179/#187, 100% title-supported)
  //    carries a Create-a-Sim contentType. 76 of 532 room-theme rows: 32
  //    accessories, 12 tops, 8 glasses, 8 makeup, 4 full-body, 4 poses,
  //    2 lashes, 2 blush, 2 dresses, 1 hats, 1 shoes. Fridges, beds, showers
  //    and whole bathroom sets were rendering on makeup-cc, poses, shoes-cc
  //    and the clothes pages, and missing from furniture-cc.
  //
  //    Every row was read against its title AND its own description (not the
  //    shared blog-post description as rule input — only as a tie-breaker for
  //    furniture vs clutter vs decor). 58 -> furniture, 15 -> clutter,
  //    3 -> decor (bedding-only, a backsplash, a wallpaper set).
  //
  //    NOT fixed at the detector: the wrong types come from ~10 different
  //    words ("glass" in wine-fridge copy, "blush" inside "Roseblush",
  //    "accessories" in build-set titles, "makeup" in a bathroom-mess set) —
  //    heterogeneous failures, not one class rule. The class-level guard
  //    ("a room-titled row is never CAS") is queued separately.
  //
  //    Each `why` starts `E120 room-titled "<exact title>"` so
  //    __tests__/unit/room-theme-contenttype-pins.test.ts can re-run the
  //    title-only room rules over the pinned titles.
  cmijqd2jr01gnoxc8zc83pytf: { contentType: 'furniture', why: "E120 room-titled \"Cutie Bathroom\" — was glasses; desc: \"various decor and furniture for your washroom\"" },
  cmim8vppd00jyoxy89r1qok93: { contentType: 'furniture', why: "E120 room-titled \"Cozy Ruffle Bed\" — was poses; desc: \"a functional and animated bed\"" },
  cmim92u1601tloxy8xky3bghz: { contentType: 'clutter', why: "E120 room-titled \"Altara Kitchen Appliances\" — was glasses; desc: coffee maker, blender, stand mixer — \"functional clutter\"" },
  cmil163mc009moxeeu8zw6gz1: { contentType: 'clutter', why: "E120 room-titled \"Haute Cuisine Kitchen\" — was tops; desc: \"various decoration objects\" — bowls, coffee bags, spoons, a mixer" },
  cmiglj6w80017oxm5ap8kk2sn: { contentType: 'furniture', why: "E120 room-titled \"MilkyWay Bunk Bed\" — was tops; desc: \"this functional bed\"" },
  cmil16wri009uoxees7rt4fmp: { contentType: 'decor', why: "E120 room-titled \"Animal Print Bedding Set 1\" — was glasses; desc: \"only includes the bedding, you will have to get a separate bed frame\"" },
  cmktsi4gm002eoxol09kkokk1: { contentType: 'furniture', why: "E120 room-titled \"Sims 4 Bathroom Furniture Mod\" — was lashes; desc: Keep It Clean DIY Shower Set pieces" },
  cmil0xmjt005poxeej4hwcbfn: { contentType: 'furniture', why: "E120 room-titled \"Hello Kitty Fridge\" — was accessories; a fridge" },
  cmim92tf201taoxy8xbhbajpr: { contentType: 'clutter', why: "E120 room-titled \"Snooty Sims Mum’s Kitchen Set\" — was makeup; desc: \"gorgeous kitchenware\" (source: sims-4-kitchen-clutter-cc)" },
  cmikiodha003doxna4rws9rfw: { contentType: 'clutter', why: "E120 room-titled \"Bathroom Mess\" — was makeup; desc: \"14 beautiful objects\" of bathroom-counter mess; the makeup is set dressing" },
  cmim92tlc01tdoxy8i1eu5mfa: { contentType: 'clutter', why: "E120 room-titled \"Eevie Kitchen Accessories\" — was accessories; desc: \"a Sims 4 kitchen clutter cc… 20 stylish items\"" },
  cmim8vq6000k6oxy8adhg6fak: { contentType: 'furniture', why: "E120 room-titled \"Yuna Double Bed\" — was tops; a double bed" },
  cmky8xaj100n8oxhc5l5i5qxa: { contentType: 'decor', why: "E120 room-titled \"Sims 4 Tiled Kitchen Backsplash\" — was lashes; desc: kitchen/bathroom splashbacks, 18 swatches — a wall finish" },
  cmim8vqem00kaoxy8fe243tu6: { contentType: 'furniture', why: "E120 room-titled \"Duality Bed\" — was tops; desc: \"a gothic-inspired bedframe\"" },
  cmku1yslb001moxkzarsj8h5e: { contentType: 'furniture', why: "E120 room-titled \"1 Roseblush Bathroom Set\" — was blush; Arwenkaboom bathroom set; \"blush\" is inside the word \"Roseblush\"; desc is scraper boilerplate" },
  cmijkgyvk000moxc8mrg0yw7l: { contentType: 'clutter', why: "E120 room-titled \"Naturalis Pantry Organic Foods\" — was accessories; desc: pantry jars, baskets and fresh produce" },
  cmim8ws1a00rdoxy8tt99zlyg: { contentType: 'furniture', why: "E120 room-titled \"Coastal Bathroom Collection\" — was accessories; desc: \"a Sims 4 bathroom cc set\"" },
  cmim8xc8w00vdoxy8sw31lieq: { contentType: 'furniture', why: "E120 room-titled \"Adoranie Teen Bedroom\" — was tops; a teen bedroom set in 4 colours" },
  cmil0zpoo006qoxee9bpgzs23: { contentType: 'clutter', why: "E120 room-titled \"Korean Retro Kitchen Deco Set\" — was accessories; desc: rubber gloves, water bottle, sponge holder, rice cooker" },
  cmijj5wfs004foxs37yvk0qk7: { contentType: 'clutter', why: "E120 room-titled \"Funny Kitchen Series: Time To Bake\" — was accessories; desc: \"fully decorated cakes, chocolate cakes, and sugar cakes\"" },
  cmikk7cvm005oox33w56d7424: { contentType: 'furniture', why: "E120 room-titled \"The Carnival Afesta Kids Bedroom Set\" — was tops; desc: \"10-piece collection\" kids bedroom set" },
  cmil0q3wy0021oxeezsvb0nil: { contentType: 'furniture', why: "E120 room-titled \"Adrienne Bedroom\" — was dresses; desc: \"18 objects, including a double bed\"" },
  cmijj5p80004boxs35c333w70: { contentType: 'clutter', why: "E120 room-titled \"Naturalis Pantry Jars Part 4\" — was accessories; desc: \"a pantry fully stocked with neatly stacked jars\"" },
  cmil0yubx006coxeeyw0ey3k3: { contentType: 'furniture', why: "E120 room-titled \"Ethel Kitchen Fridge Built-In\" — was makeup; a built-in fridge" },
  cmil0z587006koxeeh0ft6irw: { contentType: 'furniture', why: "E120 room-titled \"The Midnight Hour Fitted Fridge\" — was glasses; desc: \"a bold, contemporary appliance\" — fridge" },
  cmikkgu3a00a5ox330vgx69mk: { contentType: 'furniture', why: "E120 room-titled \"Sloraki Toddlers Bedroom\" — was tops; desc: toddler bedroom pack, 12 creations" },
  cmil0y0hw005uoxee80r4aa4y: { contentType: 'furniture', why: "E120 room-titled \"SMEGlish Mini Fridge\" — was accessories; a mini fridge" },
  cmil0z07q006goxeejlepnqgn: { contentType: 'furniture', why: "E120 room-titled \"Wine Fridge\" — was glasses; a wine fridge; \"glass\" is the wine glass in the desc" },
  cmijjqz0600e0oxs38axtsa8q: { contentType: 'furniture', why: "E120 room-titled \"SOL Sims 4 Kitchen CC Pack\" — was accessories; desc: \"a modular kitchen cc pack\"" },
  cmil0xyq3005toxee75678w8l: { contentType: 'furniture', why: "E120 room-titled \"Poor Refrigerator\" — was accessories; a fridge" },
  cmijo00ou00muoxc8unyfjt1u: { contentType: 'furniture', why: "E120 room-titled \"Organic Oasis Hotel Suite Mini Fridge\" — was accessories; desc: \"fully functional mini fridge\"" },
  cmil0lh6f0004oxee2z9dq578: { contentType: 'furniture', why: "E120 room-titled \"Bathroom Gemini Shower\" — was makeup; desc: \"a luxurious corner shower\"" },
  cmil0yt0a006boxee0ccruzkw: { contentType: 'furniture', why: "E120 room-titled \"Kitchen Appliances Pack\" — was accessories; desc: \"contains a fridge with multiple gorgeous stickers\"" },
  cmil0laim0001oxeeahzlu0qj: { contentType: 'furniture', why: "E120 room-titled \"Calm Splash Shower\" — was accessories; desc: \"a cute, wooden shower base\"" },
  cmim92tta01thoxy8bpg5ac39: { contentType: 'furniture', why: "E120 room-titled \"Modern Kitchen Set\" — was accessories; desc: \"cabinets, counters, an oven, refrigerator, and stove hoods\"" },
  cmsmceczn00ptoxeuij0a8fpi: { contentType: 'furniture', why: "E120 room-titled \"Horse Ranch Fridge Off-Grid Compatible\" — was accessories; desc: \"a rustic refrigerator\"" },
  cmijnu5zy00jjoxc8hkchqfjn: { contentType: 'furniture', why: "E120 room-titled \"University Life Beds\" — was shoes; desc: \"single, double, bunk, and toddler beds\"" },
  cmil0xwh8005soxeeu6b33x6c: { contentType: 'furniture', why: "E120 room-titled \"Realistic Living Refrigerators\" — was accessories; fridges with magnets" },
  cmil0z1hk006hoxeeeia4hzyd: { contentType: 'furniture', why: "E120 room-titled \"Alces Refrigerator\" — was makeup; desc: \"a sleek, modern appliance\" — double-door fridge" },
  cmim8wrjb00r5oxy8alodrunz: { contentType: 'furniture', why: "E120 room-titled \"Country Sleek Bathroom\" — was makeup; desc: \"17 bathroom items\"" },
  cmikkh5v600adox33y85flboo: { contentType: 'furniture', why: "E120 room-titled \"Cartoon Bedroom Toddler Y Kids\" — was poses; desc: \"cartoon-inspired pieces\" for a toddler/kids bedroom" },
  cmil0xiel005noxeepdmxvdjd: { contentType: 'furniture', why: "E120 room-titled \"Glass Fridge\" — was accessories; a glass-front fridge" },
  cmil0xv8q005roxeerc0dzmhb: { contentType: 'furniture', why: "E120 room-titled \"Family Fridge\" — was accessories; a family-sized fridge" },
  cmil0z6h0006loxeeod059xe1: { contentType: 'furniture', why: "E120 room-titled \"Kitchen Julia – Fridge\" — was glasses; desc: \"a stylish refrigerator\"" },
  cmil0yqg20069oxeezjrh3go7: { contentType: 'furniture', why: "E120 room-titled \"True Refrigerators\" — was accessories; desc: \"a versatile fridge set\"" },
  cmim92tx501tjoxy8dinr5ziv: { contentType: 'clutter', why: "E120 room-titled \"Gourmet Pottery Kitchen Set\" — was accessories; handcrafted pottery kitchenware (source: kitchen clutter post)" },
  cmim8vq4100k5oxy81ijq7357: { contentType: 'furniture', why: "E120 room-titled \"Allie Bedframe\" — was makeup; desc: \"this bedframe\"" },
  cmim8wsr300rpoxy8aqdku69k: { contentType: 'furniture', why: "E120 room-titled \"Deluxe Bathroom Set\" — was accessories; desc: \"a collection of luxury bathroom objects\"" },
  cmijjqtso00dwoxs3rduxsh6c: { contentType: 'furniture', why: "E120 room-titled \"Chic Sims 4 Bathroom CC\" — was accessories; desc: \"Build and buy mode content\"" },
  cmijplbiu0143oxc80vdtkiza: { contentType: 'furniture', why: "E120 room-titled \"Hugo Bathroom Part 1 Furniture\" — was tops; title says \"Furniture\"" },
  cmikxid79000jox9eufcz05jq: { contentType: 'furniture', why: "E120 room-titled \"Modernism Shower\" — was makeup; desc: \"a contemporary bathing cubicle\"" },
  cmkq9jjvf002foxvgqy13a1us: { contentType: 'clutter', why: "E120 room-titled \"Sims 4 Bathroom Accessories\" — was accessories; Soloriya Marcia bathroom accessories; the \"your Sims\' look\" desc is scraper boilerplate" },
  cmil0xkhc005ooxeegklm3831: { contentType: 'furniture', why: "E120 room-titled \"Off-Grid Fridge\" — was accessories; an off-grid fridge" },
  cmku1z2qq001noxkzraggq22h: { contentType: 'clutter', why: "E120 room-titled \"2 Enchanted Bathroom Accessories\" — was hats; ModCo \"Enchanted Bathroom\" build collection accessories; no hat anywhere" },
  cmky92f8d00nnoxhcj70whkce: { contentType: 'furniture', why: "E120 room-titled \"Enchanted Kitchen Extras\" — was accessories; desc: \"a charming stove, a sparkling sink\"" },
  cmil0len00003oxeeas8a6306: { contentType: 'furniture', why: "E120 room-titled \"Keep It Clean DIY Shower Set\" — was accessories; desc: \"build your ideal contemporary shower… eight objects\"" },
  cmijnzvk200mroxc806rh6k4n: { contentType: 'furniture', why: "E120 room-titled \"Sorie Kitchen Appliances\" — was accessories; desc: \"a refrigerator, stove, stove hood\"" },
  cmil3p3i300hyoxpzydu2zsvx: { contentType: 'furniture', why: "E120 room-titled \"Eleanor Bathroom\" — was glasses; desc: bathroom set, \"multiple objects\"" },
  cmky8xmdq00n9oxhcdvwkurvs: { contentType: 'furniture', why: "E120 room-titled \"Quintin Sims 4 Kitchen Set\" — was blush; a kitchen set (creator post)" },
  cmky93w8d00nsoxhcrpuuq1wc: { contentType: 'furniture', why: "E120 room-titled \"Herbalist Kitchen Recolors\" — was accessories; recolours of Myshunosun\'s Herbalist kitchen" },
  cmil0y92i0060oxee3zixfm33: { contentType: 'furniture', why: "E120 room-titled \"Marie Kitchen\" — was tops; desc: \"a base game fridge with three doors\"" },
  cmil0yxlj006eoxeeo1kp1b26: { contentType: 'furniture', why: "E120 room-titled \"Rona Dream Kitchen Fridge\" — was tops; a fridge" },
  cmil0yyx2006foxee990ypqxt: { contentType: 'furniture', why: "E120 room-titled \"Kitchen Minimalist Fridge\" — was poses; a wide fridge" },
  cmik9mt4n0074oxk7gms92ohw: { contentType: 'furniture', why: "E120 room-titled \"Mid-Century Kitchen 1st Part\" — was accessories; desc: \"50s cc furniture comes with 12 pieces\"" },
  cmil0ywac006doxeehv5afzor: { contentType: 'furniture', why: "E120 room-titled \"Arcum Fridge\" — was tops; desc: \"a sleek fridge\"" },
  cmik9wee100c9oxk75x1yo1uo: { contentType: 'furniture', why: "E120 room-titled \"Mid-century Kitchen\" — was accessories; desc: \"12 creations, including upper and lower cabinets\"" },
  cmknfb7no007foxolq0g20and: { contentType: 'clutter', why: "E120 room-titled \"Bathroom Essentials Organizer CC\" — was full-body; desc: \"a functional storage piece… keep bathroom counters neat\"" },
  cmijko9dw0039oxc8s9qvu5up: { contentType: 'clutter', why: "E120 room-titled \"Functional Kitchen: Sims Mixer\" — was poses; desc: \"a standalone mixer\"" },
  cmikxhset000aox9evbz02v23: { contentType: 'furniture', why: "E120 room-titled \"Loft Bathroom Shower\" — was glasses; desc: \"a simple, elegant cubicle shower\"" },
  cmknfb7t6007ioxol3d3nsssx: { contentType: 'furniture', why: "E120 room-titled \"Auntie Vera’s Bathroom\" — was full-body; desc: \"Build and buy mode content created by Pierisim\"" },
  cmim8ws5g00rfoxy8a7p1q4yp: { contentType: 'furniture', why: "E120 room-titled \"Simple Bathroom Set\" — was accessories; desc: \"12 essential bathroom items\"" },
  cmky8kcaf00m3oxhcmq64hl51: { contentType: 'decor', why: "E120 room-titled \"Powder Room Wallpaper Collection\" — was full-body; a wallpaper collection" },
  cmijjrtfz00ejoxs3z6csxeip: { contentType: 'furniture', why: "E120 room-titled \"Blockhouse Sims 4 Bathroom CC Pack\" — was accessories; desc: \"everything you would expect in a bathroom pack\"" },
  cmim92y1y01u1oxy8jpghzuiw: { contentType: 'furniture', why: "E120 room-titled \"Agnes Bedroom CC\" — was dresses; desc: bedroom set, \"29 items\"" },
  cmikkgbu2009sox33ydlv2rib: { contentType: 'furniture', why: "E120 room-titled \"Omall Toddler’s Bedroom\" — was tops; desc: \"a high chair, a round rug\" — toddler bedroom set" },
  cmknfb7re007hoxold7px9wgu: { contentType: 'clutter', why: "E120 room-titled \"Forever Autumn Bathroom Storage CC\" — was full-body; desc: \"multiple bathroom organizers\"" },
};

/**
 * The audited entry for a mod id, or undefined if a human never looked at it.
 */
export function handAuditedContentType(id: string): HandAuditedContentType | undefined {
  return HAND_AUDITED_CONTENT_TYPES[id];
}
