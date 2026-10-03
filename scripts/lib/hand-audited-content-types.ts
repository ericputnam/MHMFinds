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
  // ── Audited 2026-09-30 (Rowan, E147) — rows whose contentType was a ROOM
  //    or LOT value: bathroom 22, kitchen 8, and the room-titled rows typed
  //    residential 20 / lot 22 / holidays 6 (78). A room is a theme, not a
  //    content type (the bathroom/kitchen/bedroom pages filter on `themes`);
  //    a kitchen set is not a lot. Decided from the TITLE alone; NULL where the
  //    title does not say ("Appliances", "Essentials"). KEEP rows are explicit
  //    no-ops so a later pass cannot re-break them. Guard: E147 in
  //    contentTypeDetector.ts (guardRoomTitledContentType).
  cmim8wrsd00r9oxy8ilexu6x6: { contentType: 'furniture', why: "E147 room-typed \"Mix It Bathroom Set\" — was bathroom; a bathroom set" },
  cmkq9lc8m002loxvgs3l6yqzm: { contentType: null, why: "E147 room-typed \"Sims 4 Bathroom Essentials\" — was bathroom; \"Essentials\" could be fixtures or clutter; title does not say" },
  cmkq9ivvr002doxvgkjcdc0jv: { contentType: null, why: "E147 room-typed \"Hamptons Sims 4 bathroom Addon\" — was bathroom; an add-on to a set; fixtures or clutter, title does not say" },
  cmim8wrwr00rboxy8l0vxhss3: { contentType: 'furniture', why: "E147 room-typed \"Sims 4 Modern Bathroom Set\" — was bathroom; a bathroom set" },
  cmikxi8v0000iox9ef38qnsuv: { contentType: 'furniture', why: "E147 room-typed \"Onda Shower\" — was bathroom; a shower" },
  cmkq9ku6w002joxvg5zklajal: { contentType: 'furniture', why: "E147 room-typed \"Serenity Bathroom CC for Sims 4\" — was bathroom; a named bathroom set (as E120 \"Chic Sims 4 Bathroom CC\")" },
  cmim8wst800rqoxy8098kqkzw: { contentType: 'furniture', why: "E147 room-typed \"Orbita Tub\" — was bathroom; a bathtub" },
  cmil0lqwm0009oxeeqd1tlr61: { contentType: 'furniture', why: "E147 room-typed \"Bathroom Baker Shower\" — was bathroom; a shower" },
  cmil1g91900dgoxeesr6icood: { contentType: 'furniture', why: "E147 room-typed \"Ariel Bathroom Set\" — was bathroom; a bathroom set" },
  cmkq9jvgc002goxvgc6llx4bx: { contentType: 'furniture', why: "E147 room-typed \"Sabra Bathroom Set for Sims 4\" — was bathroom; a bathroom set" },
  cmkq9k73d002hoxvgmw5j28b7: { contentType: 'furniture', why: "E147 room-typed \"Sims 4 Washroom Set\" — was bathroom; a washroom (bathroom) set" },
  cmim8wrnr00r7oxy83d32t36p: { contentType: 'furniture', why: "E147 room-typed \"Baysic Bathroom Set\" — was bathroom; a bathroom set" },
  cmknf8pu7001voxolokw5sue6: { contentType: 'furniture', why: "E147 room-typed \"Functional Bathroom Set\" — was bathroom; a bathroom set" },
  cmkq9l42c002koxvg8tldddwt: { contentType: 'furniture', why: "E147 room-typed \"Sims 4 Modern Bathroom\" — was bathroom; a named bathroom set (as E120 \"Eleanor Bathroom\")" },
  cmil0lc920002oxeejspwudw9: { contentType: 'furniture', why: "E147 room-typed \"Xero Shower\" — was bathroom; a shower" },
  cmikxi71p000hox9ewk2azjcs: { contentType: 'furniture', why: "E147 room-typed \"Silky Intentions Shower\" — was bathroom; a shower" },
  cmim8wtbk00rzoxy8k6aopcrs: { contentType: 'furniture', why: "E147 room-typed \"Oceane Bathroom Set\" — was bathroom; a bathroom set" },
  cmik9n6ih007doxk7r7xm7kj8: { contentType: 'furniture', why: "E147 room-typed \"Korea Retro Bathroom Set Part 1\" — was bathroom; a bathroom set" },
  cmil0lmqk0007oxeep7fjeco9: { contentType: 'furniture', why: "E147 room-typed \"Ragoon Shower\" — was bathroom; a shower" },
  cmkq9imw4002coxvgv7a23j0c: { contentType: 'furniture', why: "E147 room-typed \"Serene Sims 4 Bathroom CC\" — was bathroom; a named bathroom set" },
  cmikxi1wt000fox9e0l4l886p: { contentType: 'furniture', why: "E147 room-typed \"Bidet As It May Shower Tub Glass Combo\" — was bathroom; a shower/tub combo" },
  cmknfbcg0007toxolsjbrtj0t: { contentType: 'script-mod', why: "E147 room-typed \"Shower Tweaks\" — was bathroom; \"Tweaks\" is a mod, not an object (the detector's own 'tweak' rule says script-mod); not room-titled" },
  cmijo06e300myoxc8zm37gwls: { contentType: 'furniture', why: "E147 room-typed \"Stainless Steel Fridge and Stove\" — was kitchen; a fridge and a stove" },
  cmijlmhg7006ioxc88jn4hs9i: { contentType: 'clutter', why: "E147 room-typed \"Custom Kitchen Appliance: Rice Cooker\" — was kitchen; a countertop rice cooker (as E120 \"Functional Kitchen: Sims Mixer\")" },
  cmil0y1zs005voxeedhswgkoz: { contentType: 'furniture', why: "E147 room-typed \"Stockholm Fridge Refrigerator\" — was kitchen; a fridge" },
  cmil0yd8i0063oxeekt8pcu99: { contentType: 'furniture', why: "E147 room-typed \"Isla Refrigerator\" — was kitchen; a fridge" },
  cmil0z3zu006joxeeca9uhkhu: { contentType: 'furniture', why: "E147 room-typed \"Love The Less Kitchen Fridge\" — was kitchen; a fridge" },
  cmil0ybpi0062oxeevwn8rmhz: { contentType: 'furniture', why: "E147 room-typed \"Rioja Refrigerator\" — was kitchen; a fridge" },
  cmil0yfmn0064oxeee45cjzz2: { contentType: 'furniture', why: "E147 room-typed \"Country Cottage Refrigerator\" — was kitchen; a fridge; \"Cottage\" is a style, not a lot" },
  cmil0yjsw0065oxee6zcldq29: { contentType: 'furniture', why: "E147 room-typed \"Dasyatis Refrigerator\" — was kitchen; a fridge" },
  cmjh4kzrf001qoxyvksoijz8k: { contentType: 'holidays', why: "E147 room-typed \"Country Hearth Christmas Bedroom\" — was holidays; KEEP: title names Christmas; holidays-cc is the right shelf" },
  cmii5lt7p0035oxkzm9pjhjui: { contentType: 'decor', why: "E147 room-typed \"Aurum Bedroom Decorations\" — was holidays; title names decorations and no holiday" },
  cmil0y6ks005yoxeevpuisim0: { contentType: 'holidays', why: "E147 room-typed \"New York Christmas Refrigerator\" — was holidays; KEEP: title names Christmas" },
  cmim9n4j800iwoxy7yhjrhmjx: { contentType: 'furniture', why: "E147 room-typed \"Bambino Toddler Bedroom CC Pack\" — was holidays; a toddler bedroom set; no holiday in the title" },
  cmii46185002zoxkzo1yjxmoz: { contentType: 'holidays', why: "E147 room-typed \"Thanksgiving Kitchen Rugs\" — was holidays; KEEP: title names Thanksgiving" },
  cmijnscv300imoxc8hrugqgns: { contentType: 'clutter', why: "E147 room-typed \"Fleur kitchenware Pt.I\" — was holidays; kitchenware is clutter; no holiday in the title" },
  cmky94ghr00nuoxhcbxrds4d8: { contentType: 'furniture', why: "E147 room-typed \"Cottonwood Kitchen\" — was lot; a named kitchen set, not a lot" },
  cmky94mni00nvoxhcjex1wzpc: { contentType: 'furniture', why: "E147 room-typed \"Kitchen Time Set\" — was lot; a kitchen set, not a lot" },
  cmky66am900f3oxhcjhuixj9x: { contentType: 'furniture', why: "E147 room-typed \"Modern Kitchen Set\" — was lot; a kitchen set, not a lot" },
  cmku2mx27001yoxkzimot3phr: { contentType: 'furniture', why: "E147 room-typed \"Pink Bathroom Set\" — was lot; a bathroom set, not a lot" },
  cmky8uzsv00n1oxhcfv80xnr8: { contentType: 'furniture', why: "E147 room-typed \"Chalk Sims 4 Kitchen CC\" — was lot; a named kitchen set, not a lot" },
  cmky93mwu00nroxhc37thyidv: { contentType: 'furniture', why: "E147 room-typed \"Chop Chop! Kitchen Set Part 1\" — was lot; a kitchen set, not a lot" },
  cmky8ve3j00n2oxhc809bt6ot: { contentType: 'furniture', why: "E147 room-typed \"Herbalist Sims 4 Kitchen CC\" — was lot; a named kitchen set (E120 pinned its recolours furniture)" },
  cmku20w36001roxkzz82j42dn: { contentType: 'furniture', why: "E147 room-typed \"Cottage Dreams Bathroom CC\" — was lot; a bathroom set; \"Cottage\" is a style, not a lot" },
  cmky8y8xz00nboxhcqerhp411: { contentType: 'furniture', why: "E147 room-typed \"Cozy Kitchen CC for Sims 4\" — was lot; a named kitchen set, not a lot" },
  cmky90tpl00nioxhcm45aq4fl: { contentType: 'furniture', why: "E147 room-typed \"Sims 4 Grove Kitchen Set\" — was lot; a kitchen set, not a lot" },
  cmttziccy00agoxfe44m5qc5r: { contentType: null, why: "E147 room-typed \"DelSol Part 9: The Kitchen Appliances\" — was lot; \"Appliances\" is fridges or countertop clutter; title does not say" },
  cmky938oc00nqoxhckx0vnr96: { contentType: null, why: "E147 room-typed \"Sunwoven Kitchen Appliances\" — was lot; \"Appliances\" is fridges or countertop clutter; title does not say" },
  cmky299w400cfoxhcntx0qs1t: { contentType: 'furniture', why: "E147 room-typed \"3 Apratuka Bathroom Set\" — was lot; a bathroom set, not a lot" },
  cmky923sv00nmoxhctpliubdy: { contentType: 'furniture', why: "E147 room-typed \"Stylish-Wood Signature Kitchen\" — was lot; a named kitchen set, not a lot" },
  cmky91gql00nkoxhc9961t0s8: { contentType: null, why: "E147 room-typed \"IRL Kitchen Item Collection\" — was lot; \"Item Collection\" is fixtures or clutter; title does not say" },
  cmky8zwel00nfoxhc94ca14pf: { contentType: 'furniture', why: "E147 room-typed \"Sims 4 Vanilla Kitchen\" — was lot; a named kitchen set, not a lot" },
  cmky8znk800neoxhc81y1tmw1: { contentType: 'furniture', why: "E147 room-typed \"Green Witchy Kitchen Set\" — was lot; a kitchen set, not a lot" },
  cmsmbkxv600a5oxeu1396vsu5: { contentType: 'furniture', why: "E147 room-typed \"Lovely Kitchen Set A\" — was lot; a kitchen set, not a lot" },
  cmsmcn68000ugoxeu2lcmdsvo: { contentType: 'clutter', why: "E147 room-typed \"Gourmet Pottery Kitchen Set\" — was lot; pottery kitchenware (same title pinned clutter by E120)" },
  cmku1zbg1001ooxkz67b3hiar: { contentType: 'furniture', why: "E147 room-typed \"3 Kawaii Bathroom Set\" — was lot; a bathroom set, not a lot" },
  cmsmcs56b00x8oxeu2bww31vy: { contentType: 'lot', why: "E147 room-typed \"Ranch 5-Bedroom with In-Law Suite House\" — was lot; KEEP: a whole house; \"Bedroom\"/\"Suite\" describe the lot" },
  cmky92oki00nooxhcfmek09an: { contentType: 'furniture', why: "E147 room-typed \"Arc Kitchen Set\" — was lot; a kitchen set, not a lot" },
  cmijkg63v0002oxc8d6xmic1x: { contentType: 'furniture', why: "E147 room-typed \"Kitchen Enya Part 1\" — was residential; a named kitchen set, not a residential lot" },
  cmim8wtdp00s0oxy8kfsvki8a: { contentType: 'furniture', why: "E147 room-typed \"Bathroom Delight\" — was residential; a named bathroom set, not a residential lot" },
  cmijo0fa400n4oxc8agrh7mxp: { contentType: null, why: "E147 room-typed \"Industry Kitchen Appliances\" — was residential; \"Appliances\" is fridges or countertop clutter; title does not say" },
  cmknfb7260078oxolm8xlqxcj: { contentType: 'furniture', why: "E147 room-typed \"Naturalis Pantry Wall Shelves CC\" — was residential; wall shelves" },
  cmkxfs6vc000zoxj3pjonud24: { contentType: null, why: "E147 room-typed \"2 Pro Pantry\" — was residential; a pantry is a cabinet or a jar set; title does not say" },
  cmijkgt9o000ioxc8acoqwibw: { contentType: 'furniture', why: "E147 room-typed \"Kitchen Country\" — was residential; a named kitchen set, not a residential lot" },
  cmik9mvi40076oxk7jmz2pomc: { contentType: 'furniture', why: "E147 room-typed \"Merrit Kitchen\" — was residential; a named kitchen set, not a residential lot" },
  cmil0y59u005xoxeeddv6q8rf: { contentType: 'furniture', why: "E147 room-typed \"The Refrigerator\" — was residential; a fridge" },
  cmkxfrmyi000xoxj3sm2mwtva: { contentType: null, why: "E147 room-typed \"Annam Appliances\" — was residential; \"Appliances\" is fridges or countertop clutter; title does not say" },
  cmijkh25v000ooxc828smm9j4: { contentType: 'furniture', why: "E147 room-typed \"Duck Egg Blue Farmhouse Kitchen\" — was residential; a named kitchen set; \"Farmhouse\" is a style, not a lot" },
  cmim8wt1e00ruoxy8zuj91ai8: { contentType: 'furniture', why: "E147 room-typed \"Elen bathroom\" — was residential; a named bathroom set, not a residential lot" },
  cmijo026q00mvoxc8mlrktip0: { contentType: 'clutter', why: "E147 room-typed \"Country Coffee Appliances\" — was residential; countertop coffee makers (as E120 \"Altara Kitchen Appliances\")" },
  cmijn12i900adoxc87r0ctg9w: { contentType: 'clutter', why: "E147 room-typed \"Grandma’s Kitchen Utensil Rack\" — was residential; a utensil rack" },
  cmijnzylk00mtoxc83g2cwqp1: { contentType: 'furniture', why: "E147 room-typed \"Keep Life Simple Kitchen Dishwasher\" — was residential; a dishwasher" },
  cmijo0gub00n5oxc8m026xkal: { contentType: 'furniture', why: "E147 room-typed \"Ethel Kitchen Part 2\" — was residential; a named kitchen set, not a residential lot" },
  cmim8wsp900rooxy848ymulhy: { contentType: 'furniture', why: "E147 room-typed \"Zone Bathroom\" — was residential; a named bathroom set, not a residential lot" },
  cmijkg4rf0001oxc8qy5ec080: { contentType: 'furniture', why: "E147 room-typed \"Bathroom Country\" — was residential; a named bathroom set, not a residential lot" },
  cmil0xg41005moxeefi5ehy9p: { contentType: 'furniture', why: "E147 room-typed \"Rundown Fridge\" — was residential; a fridge" },
  cmil0l7ya0000oxeeoo53utnb: { contentType: 'furniture', why: "E147 room-typed \"Obal Shower\" — was residential; a shower" },
  cmil0lojq0008oxeeu68chtrt: { contentType: 'furniture', why: "E147 room-typed \"Regenerate Shower\" — was residential; a shower" },
  // ── Audited 2026-10-01 (Rowan, E154) — `holidays` rows whose title names no
  //    holiday are re-decided by guardHolidaysContentType (title-only detector
  //    or NULL). These pins are the rows where that answer was read and found
  //    wrong: typos of a holiday word (KEEP holidays), the detector's wrong
  //    answer, or a NULL where the title plainly names the type. Rule:
  //    lib/holidaysContentTypeRules.ts.
  cmim9099u01duoxy826ccmd6f: { contentType: 'holidays', why: "E154 holidays-typed \"Chistmas Dress\" — was holidays; typo of Christmas; from the christmas-cc post" },
  cmijp8bx600xooxc8kaho727a: { contentType: 'holidays', why: "E154 holidays-typed \"Simbrleen Pumpkin Bag\" — was holidays; typo of Simblreen (Halloween gift event)" },
  cmijno4sm00gqoxc8q72hyq4a: { contentType: 'holidays', why: "E154 holidays-typed \"Halloweeny Welcome Mats\" — was holidays; 'Halloweeny' — the halloween rule needs the whole word" },
  cmijjj8nc00aioxs34tv0chmm: { contentType: 'holidays', why: "E154 holidays-typed \"Moar Halloweeny Welcome Mats\" — was holidays; 'Halloweeny' — the halloween rule needs the whole word" },
  cmim8v2nb00g7oxy8owrhcqlw: { contentType: 'holidays', why: "E154 holidays-typed \"Halloween_Eyes\" — was holidays; underscore defeats the word boundary" },
  cmijnp42100h7oxc8sjf92qx8: { contentType: 'holidays', why: "E154 holidays-typed \"Helloween25 SET\" — was holidays; typo of Halloween 2025" },
  cmknfc8f5009roxolw0stowkw: { contentType: 'holidays', why: "E154 holidays-typed \"Matt Holiday XL- Rough\" — was holidays; matte holiday nails from the christmas-nails post; KEEP" },
  cmim9lfqn008yoxy7pdn1btzj: { contentType: null, why: "E154 holidays-typed \"Roman Holiday 50s CC Pack\" — was holidays; 'Roman Holiday' is the 1953 film; a mixed 50s pack, title names no single type" },
  cmim8rhuw000qoxy8g4zntbgh: { contentType: 'jewelry', why: "E154 holidays-typed \"Emily Red Carpet Earring\" — was holidays; detector said rugs via 'carpet'; it is an earring" },
  cmijloi8e006noxc8q2dtf5fw: { contentType: null, why: "E154 holidays-typed \"CAS Lighting\" — was holidays; detector said lighting (build/buy); it is a CAS lighting script, no right facet" },
  cml5sicbk001voxxr4bb6m3b0: { contentType: 'decor', why: "E154 holidays-typed \"Decorative Items And Lamps\" — was holidays; detector said lighting; title leads with decorative items" },
  cmim8ynex012voxy8cpwpl72y: { contentType: 'eyeliner', why: "E154 holidays-typed \"Gothic Eyeliner with 2D Eyelashes\" — was holidays; detector said lashes; the item is eyeliner" },
  cmim8ulpn00dooxy829hlzl9t: { contentType: null, why: "E154 holidays-typed \"Pumpkin Accessory\" — was holidays; detector said accessories; scraped as a Poses item — pose prop or CAS, title does not say" },
  cmijkw9150043oxc812j7uv94: { contentType: 'clutter', why: "E154 holidays-typed \"Romantic Breakfast In Bed Set\" — was holidays; detector said furniture via 'bed'; a breakfast tray set" },
  cmim8rhmx000noxy8ucaoyuxc: { contentType: 'clutter', why: "E154 holidays-typed \"Romantic Breakfast In Bed Set\" — was holidays; detector said furniture via 'bed'; a breakfast tray set" },
  cmijnoybo00h3oxc8dgi4pfb7: { contentType: null, why: "E154 holidays-typed \"Bat, Skulls, & Spider Wallpaper\" — was holidays; detector said decor; wallpaper is a build surface, no facet fits" },
  cmim8z3a1016coxy8mbc6dbip: { contentType: 'shoes', why: "E154 holidays-typed \"Nike Air Force 1s\" — was holidays; detector NULL; sneakers (from the shoes-cc post)" },
  cmim8vzts00lzoxy8dmudd84n: { contentType: 'shoes', why: "E154 holidays-typed \"Nike Airforce 1s\" — was holidays; detector NULL; sneakers (from the sneakers-cc post)" },
  cmijlmg2h006hoxc8m14v8ww9: { contentType: 'gameplay-mod', why: "E154 holidays-typed \"Grannies Cookbook\" — was holidays; detector NULL; the recipe-framework mod" },
  cmim8vcb900hxoxy8se7anvxj: { contentType: 'gameplay-mod', why: "E154 holidays-typed \"Autonomous Vampire Turning\" — was holidays; detector NULL; a behaviour mod" },
  cmim8vbqy00hooxy81x9fhcbo: { contentType: 'gameplay-mod', why: "E154 holidays-typed \"Possessed Child Mod\" — was holidays; detector NULL; title says mod" },
  cmikj1nog009soxnar7v4d21c: { contentType: 'furniture', why: "E154 holidays-typed \"Sony Wall Mounted TV\" — was holidays; detector NULL; TVs are furniture in this catalog (10 of 28)" },
  cmil0piwr001uoxeeb59r2ru5: { contentType: 'wall-art', why: "E154 holidays-typed \"Wall Decals 5\" — was holidays; detector NULL; wall decals" },
  cmim8rxqz0031oxy8hs5p1ctu: { contentType: 'accessories', why: "E154 holidays-typed \"Sweet Temptation Garters\" — was holidays; detector NULL; garters are a CAS accessory" },
  cmil1arsu00bboxeetrvn931b: { contentType: 'accessories', why: "E154 holidays-typed \"Tiffany Stockings\" — was holidays; detector NULL; hosiery is accessories (8 of 24 'stocking' titles, the plurality)" },
  cmjh4m14p006boxyv3n0c6td2: { contentType: 'full-body', why: "E154 holidays-typed \"Infant Elf Sleeper\" — was holidays; detector NULL; an infant sleeper is full-body (8 of 12 sleeper/onesie titles)" },
  cmknfatmt006loxol1jnlvani: { contentType: 'accessories', why: "E154 holidays-typed \"Hearts Plush Ear Muffs\" — was holidays; detector NULL; earmuffs" },
  cmknfats3006ooxols7w7t1pn: { contentType: 'accessories', why: "E154 holidays-typed \"S-Club WM Earmuffs\" — was holidays; detector NULL; earmuffs" },
  cmijnoru600gzoxc8348r9xda: { contentType: 'accessories', why: "E154 holidays-typed \"Arm Bandages\" — was holidays; detector NULL; a CAS accessory" },
  // ── Audited 2026-10-02 (Rowan, E161) — the 117 rows the first `--refreshed`
  //    ingest created, read title + description. Two classes were wrong:
  //    (a) the post URL category wins over the title in `saveModsToDatabase`
  //        (`detectContentTypeFromUrl(sourceUrl) || detectContentType(title, …)`),
  //        so every item on /sims-4-fall-cc-clothes/ was written `tops` — 20 of
  //        20, of which the title supports 5. Dresses, overalls, socks and
  //        mixed CAS collections all became tops.
  //    (b) the description-inference class on /sims-4-fall-outdoor-cc/ (URL
  //        maps to nothing, so title+description ran): "porch", "backyard"
  //        in the prose tripped the lot rule for a basket and a decor set.
  //    Pinned here (not a facet retag) because the two classes are a URL-rule
  //    question for the ingest path, filed in ideas-inbox; the rows are fixed now.
  cmuquj9jd002ooxbq3mw0iojd: { contentType: 'dresses', why: "E161 url-typed \"Little Fall Adventures Collection – Overall Dress\" — was tops; title says dress" },
  cmuquj9lo002poxbqgycapp7x: { contentType: 'dresses', why: "E161 url-typed \"Falling for November 2 – Overall Dress\" — was tops; title says dress" },
  cmuquja3n002voxbqe3w4t5jt: { contentType: 'dresses', why: "E161 url-typed \"Autumn 2026 “Get Famous” Female Dress\" — was tops; a sweater dress" },
  cmuquj9qi002qoxbq3aq0jf9g: { contentType: 'accessories', why: "E161 url-typed \"Cozy Long Scarf\" — was tops; a scarf (detector's own accessories rule)" },
  cmuquj9zn002uoxbqknwv2zsd: { contentType: 'accessories', why: "E161 url-typed \"Knitted Overknee Socks\" — was tops; socks (detector's own accessories rule)" },
  cmuquj9st002roxbqm0y0j167: { contentType: 'full-body', why: "E161 url-typed \"Autumn Girlish Outfit\" — was tops; an outfit (top + suspenders + skirt)" },
  cmuquja62002woxbq2sxfsmqn: { contentType: 'full-body', why: "E161 url-typed \"Autumn Overalls\" — was tops; overalls are full-body (detector's own rule)" },
  cmuqujai30030oxbqwkpfgcqu: { contentType: 'full-body', why: "E161 url-typed \"Toddler Aspen Fall Jumpsuit\" — was tops; a one-piece jumpsuit" },
  cmuqujaax002yoxbqrh1066cg: { contentType: 'bottoms', why: "E161 url-typed \"Autumn Denim Collection – Harvest Threads\" — was tops; description: a pair of denim pants" },
  cmuquj976002koxbq0p5bziue: { contentType: null, why: "E161 url-typed \"The Moss Collection\" — was tops; a seven-piece CAS set (jacket, skirt, dresses, boots); no single facet" },
  cmuquj9bx002loxbqlt9escus: { contentType: null, why: "E161 url-typed \"Ready for Fall Collection\" — was tops; a mixed CAS set; no single facet" },
  cmuquj9ei002moxbqw6wregco: { contentType: null, why: "E161 url-typed \"The Crisp and Cozy Collection\" — was tops; seven mixed CAS items; no single facet" },
  cmuquj9v3002soxbq2xxmv3nj: { contentType: null, why: "E161 url-typed \"Angel Orange Season Collection\" — was tops; a mixed CAS set; no single facet" },
  cmuqujakp0031oxbqhxwcwz7h: { contentType: null, why: "E161 url-typed \"The Cozy Corner Collection\" — was tops; a loungewear set (knits, bottoms); no single facet" },
  cmuqujan50032oxbqmi6iucwh: { contentType: null, why: "E161 url-typed \"Autumn Leaves Set\" — was tops; a two-piece (crop top + mini skirt); no single facet" },
  cmuquijzh000noxbq4p9j908m: { contentType: 'clutter', why: "E161 description-typed \"KHD Orchard Apple Basket\" — was lot via 'porches … farmhouse builds' in the prose; a basket is clutter" },
  cmuquijm0000ioxbqux8aaak5: { contentType: 'decor', why: "E161 description-typed \"Porchfully Yours – Build & Buy Set\" — was lot via 'Build' in the title; a 12-piece porch decor set" },
  cmuquik41000poxbqyz2ge5fb: { contentType: 'lot', why: "E161 description-typed \"Cozy Autumn Camper Van\" — was lot; KEEP: a tiny-house lot (CurseForge rooms-lots), title alone says nothing" },
  // ── Audited 2026-10-03 (Rowan, E168) — the `lot` rule became title-only and
  //    the retag (`retag-junk-build-facets.ts --lot-untitled`) would NULL every
  //    lot row whose title carries no lot word and whose post URL maps to no
  //    category. 137 such rows; each was read against its description and
  //    source post. 67 are real lots (hospitals, gyms, hotels, police stations,
  //    cemeteries, yachts, monthly-finds houses) — explicit KEEP no-ops, because
  //    the title alone says nothing and the URL slugs (`/sims-4-gym-lots/`,
  //    `/sims-4-hotel-lots/`, `/sims-4-castles/`, `/sims-4-cc-finds-for-…/`) are
  //    deliberately NOT widened into `SIMS_4_CONTENT_MAPPINGS` (never widen —
  //    filed in ideas-inbox). Two are decorative boats (decor). The other 68
  //    (clothing packs, cars, travel mods, moving clutter, toys) go NULL.
  //    The `why` quotes the description sentence that settles it.
  cmsmc1rb700iwoxeu4kndt4bp: { contentType: 'lot', why: "E168 lot-untitled \"Willow Creek Hospital\" — KEEP lot; If you want a clean, modern hospital for your save, you’ll love this build. [/sims-4-hospital-lots/]" },
  cmoistmuf0002oxvto4jmieqr: { contentType: 'lot', why: "E168 lot-untitled \"Everwyn Tower\" — KEEP lot; If you want a compact castle build with a classic fairytale feel, get the Everwyn Tower. [/sims-4-castles/]" },
  cmsmcmv0z00udoxeur7m3sl1d: { contentType: 'lot', why: "E168 lot-untitled \"Sims 4 Stranger Things Hawkins Police Station\" — KEEP lot; Sims 4 Stranger Things Hawkins Police Station is a detailed no-CC build inspired by the iconic Hawkins… [/sims-4-police-station-lot/]" },
  cmsmcucl000yeoxeuecdnndpf: { contentType: 'lot', why: "E168 lot-untitled \"Keratin Salon\" — KEEP lot; Keratin Salon is a luxurious beauty space designed with a modern urban aesthetic. [/sims-4-salon-cc/]" },
  cmsmcb1t800o5oxeuiuf2yps7: { contentType: 'lot', why: "E168 lot-untitled \"Medieval Village\" — KEEP lot; Medieval Village is a sprawling medieval-inspired rental lot built around an impressive castle estate and… [/sims-4-medieval-cc/]" },
  cmsmc2ykg00jmoxeu9wcomuh2: { contentType: 'lot', why: "E168 lot-untitled \"Grand Reef Hotel\" — KEEP lot; If you’re looking for a luxurious tropical getaway, the Grand Reef Hotel is an excellent choice. [/sims-4-hotel-lots/]" },
  cmsmd0ulv0121oxeu7b37sufo: { contentType: 'lot', why: "E168 lot-untitled \"Simbledon Tennis Club\" — KEEP lot; Simbledon Tennis Club is a luxury tennis venue inspired by prestigious country clubs and professional… [/sims-4-tennis-cc/]" },
  cmsmc3any00jvoxeulv3t9m9o: { contentType: 'lot', why: "E168 lot-untitled \"Florence Motel\" — KEEP lot; Florence Motel is a charming Mediterranean-inspired getaway perfect for romantic vacations and destination… [/sims-4-hotel-lots/]" },
  cmsmc3mzh00k5oxeuqqi6nr4q: { contentType: 'lot', why: "E168 lot-untitled \"Torres Amanecer Hotel\" — KEEP lot; Torres Amanecer Hotel is a modern, luxurious hotel designed with Mediterranean-inspired architecture. [/sims-4-hotel-lots/]" },
  cmu144kcn000eoxtzb6sfhk0m: { contentType: 'lot', why: "E168 lot-untitled \"Yacht Serenity\" — KEEP lot; The Yacht Serenity is a modern luxury boat designed for tropical getaways and relaxing holidays in Sulani. [/sims-4-boat-cc/]" },
  cmttzicye00aqoxfeajpoai1f: { contentType: 'lot', why: "E168 lot-untitled \"Mesa Pop Residence\" — KEEP lot; Mesa Pop Residence is a colorful two-bedroom home inspired by American modernism. [/sims-4-cc-finds-for-august-2026/]" },
  cmsmby3gf00gvoxeulnirms4t: { contentType: 'lot', why: "E168 lot-untitled \"Funeral Home CC\" — KEEP lot; Funeral Home CC is a spacious funeral home and crematorium built on a 64×64 lot in Windenburg. [/sims-4-funeral-cc/]" },
  cmqpxz97i002woxeeut4qrcr5: { contentType: 'lot', why: "E168 lot-untitled \"Medieval Tournament\" — KEEP lot; If you want a medieval-themed venue for storytelling or historical gameplay, get the Medieval Tournament lot. [/sims-4-cc-finds-for-march-2026/]" },
  cmu144k0f0009oxtz1r985gqy: { contentType: 'lot', why: "E168 lot-untitled \"Bar Captain Cook\" — KEEP lot; Bar Captain Cook is an incredible pirate ship build designed as a fully furnished bar on a 40×30 lot. [/sims-4-boat-cc/]" },
  cmu144k50000boxtz92a0nm60: { contentType: 'lot', why: "E168 lot-untitled \"Finn Boat\" — KEEP lot; Finn Boat is a modern three-story yacht designed for luxurious vacations with family or friends. [/sims-4-boat-cc/]" },
  cmu144jgr0002oxtzhycsu4op: { contentType: 'lot', why: "E168 lot-untitled \"The Bima Samudra – Luxury Power Yacht\" — KEEP lot; The Bima Samudra is a massive luxury power yacht built for Sims with serious money to spend. [/sims-4-boat-cc/]" },
  cml5sivsn003loxxrstsmtjlw: { contentType: 'lot', why: "E168 lot-untitled \"Phosphorescent Flower Shop\" — KEEP lot; Last on this list is the Phosphorescent Flower Shop, a striking Victorian–steampunk build that blends dark… [/sims-4-victorian-cc/]" },
  cmoipycu10021oxkjwxb2fv1z: { contentType: 'lot', why: "E168 lot-untitled \"66 Newcrest Street\" — KEEP lot; 66 Newcrest Street is a residential lot built on a 30×20 plot with 2 bedrooms and 2 bathrooms. [/sims-4-cc-finds-for-april-2026/]" },
  cmu144k2q000aoxtzlhx91kv1: { contentType: 'lot', why: "E168 lot-untitled \"Houseboat\" — KEEP lot; House boat is a modern, fully furnished home built to look like it’s floating right on the water. [/sims-4-boat-cc/]" },
  cmqpy8m8p008boxeeusr8yll1: { contentType: 'lot', why: "E168 lot-untitled \"215 Sim Lane\" — KEEP lot; The 215 Sim Lane build is a fully furnished, renovated, pleasant family home designed to preserve its… [/sims-4-cc-finds-for-january-2026/]" },
  cmoipycwt0022oxkj130anrrh: { contentType: 'lot', why: "E168 lot-untitled \"Grand Kinship Residence\" — KEEP lot; Grand Kinship Residence is a spacious, modern family home designed for big households and… [/sims-4-cc-finds-for-april-2026/]" },
  cmttzijst00bhoxfe16cxbv3d: { contentType: 'lot', why: "E168 lot-untitled \"Rooftop Gym & Fitness Center\" — KEEP lot; Rooftop Gym & Fitness Center is a spacious 40 x 30 fitness lot with everything your active Sims require… [/sims-4-gym-lots/]" },
  cmqpykdtv008goxeeeazrbd45: { contentType: 'lot', why: "E168 lot-untitled \"Plasma Vampire Nightclub\" — KEEP lot; The Plasma Vampire Nightclub is a neon fortress, glowing with electric pinks and purples and eerie… [/sims-4-vampire-cc/]" },
  cmuqujfmr0034oxbqsyd57ewy: { contentType: 'lot', why: "E168 lot-untitled \"Artia No. 5\" — KEEP lot; Artia No. [/sims-4-cc-finds-for-september-2026/]" },
  cmuqujftv0036oxbq7xblipic: { contentType: 'lot', why: "E168 lot-untitled \"Honeybrook Corner\" — KEEP lot; Honeybrook Corner is a cozy two-bedroom family home surrounded by flowers, greenery, and plenty of outdoor… [/sims-4-cc-finds-for-september-2026/]" },
  cmsmbce45005ooxeu4zpk6ze9: { contentType: 'lot', why: "E168 lot-untitled \"Ander\" — KEEP lot; Ander is a modern two-story home designed in a clean, neutral style. [/sims-4-cc-finds-for-july-2026/]" },
  cmttzicpq00amoxfedyw094h4: { contentType: 'lot', why: "E168 lot-untitled \"Build 01\" — KEEP lot; Build 01 is an abandoned, overgrown two-story home on a 20 x 15 residential lot. [/sims-4-cc-finds-for-august-2026/]" },
  cmttzicru00anoxfepywe5jw5: { contentType: 'lot', why: "E168 lot-untitled \"Seabreeze Terrace\" — KEEP lot; Seabreeze Terrace is a three-story tropical home built on a 40×30 lot in Sulani. [/sims-4-cc-finds-for-august-2026/]" },
  cmttzicw700apoxfemkw1pl5h: { contentType: 'lot', why: "E168 lot-untitled \"Glasswood Cabin 3\" — KEEP lot; Glasswood Cabin 3 is a modern two-story home with extensive glass windows, warm wood finishes, and outdoor… [/sims-4-cc-finds-for-august-2026/]" },
  cmsmbe2mh006noxeujfn9s0df: { contentType: 'lot', why: "E168 lot-untitled \"Casa Oasis de Cobre\" — KEEP lot; Casa Oasis de Cobre is a Spanish-inspired family home built on a 40×30 lot. [/sims-4-cc-finds-for-june-2026/]" },
  cmsmbe6el006qoxeu3mfxlc8c: { contentType: 'lot', why: "E168 lot-untitled \"Auralith\" — KEEP lot; Auralith is a bright contemporary villa with layered terraces and a private backyard pool, creating a… [/sims-4-cc-finds-for-june-2026/]" },
  cmttzijie00bdoxfeq8s0ga4b: { contentType: 'lot', why: "E168 lot-untitled \"Fit Box Gym\" — KEEP lot; Fit Box Gym is a functional fitness center designed for Sims who love staying active. [/sims-4-gym-lots/]" },
  cmttzijpq00bgoxfespws86id: { contentType: 'lot', why: "E168 lot-untitled \"Town Gym\" — KEEP lot; Town Gym is one of the best Sims 4 gym lots to add to your game in 2026. [/sims-4-gym-lots/]" },
  cmttzijxe00bjoxfe7892b8cj: { contentType: 'lot', why: "E168 lot-untitled \"Sculpt Lab\" — KEEP lot; Sculpt Lab is a high-end Pilates studio with a soft, luxurious aesthetic. [/sims-4-gym-lots/]" },
  cmttzike000bpoxfe8u7jy57a: { contentType: 'lot', why: "E168 lot-untitled \"Willow Creek Gym & Pool\" — KEEP lot; If you’re looking for a multipurpose fitness lot where your Sims can work out and enjoy a swim afterward,… [/sims-4-gym-lots/]" },
  cmttzikgh00bqoxfe6iaf8mey: { contentType: 'lot', why: "E168 lot-untitled \"Harbor Quarter Gym\" — KEEP lot; Harbor Quarter Gym is a spacious, modern fitness center designed as a replacement gym for the contemporary… [/sims-4-gym-lots/]" },
  cmttzikj400broxfeh7653tfr: { contentType: 'lot', why: "E168 lot-untitled \"Orchid Wellness Row\" — KEEP lot; Orchid Wellness Row is a modern three-story wellness center located in Del Sol Valley. [/sims-4-gym-lots/]" },
  cmttziklo00bsoxfepyyqwess: { contentType: 'lot', why: "E168 lot-untitled \"Gym “Triceps”\" — KEEP lot; Gym “Triceps” is a vibrant gym lot with a bold European-inspired exterior, perfect for those who want… [/sims-4-gym-lots/]" },
  cmttzikof00btoxfec57pe25z: { contentType: 'lot', why: "E168 lot-untitled \"Willow Athletic Club\" — KEEP lot; If you’re looking for a stylish gym your Sims can actually run as a small business, Willow Athletic Club… [/sims-4-gym-lots/]" },
  cmsmbghgz007toxeu598qe8pm: { contentType: 'lot', why: "E168 lot-untitled \"MonoLeaf Coffee Shop\" — KEEP lot; The Monolaf Coffee Shop is a modern two-floor build created for a 20×30 lot in Windenburg. [/sims-4-cc-finds-for-may-2026/]" },
  cmsmbgijy007uoxeub52pao1q: { contentType: 'lot', why: "E168 lot-untitled \"Dockside Tavern\" — KEEP lot; This is another of my favorite Sims 4 cc finds for May 2026. [/sims-4-cc-finds-for-may-2026/]" },
  cmttziktv00bvoxfe1c09dyps: { contentType: 'lot', why: "E168 lot-untitled \"Sudor Gym\" — KEEP lot; Sudor Gym is a modern 30×20 fitness lot built in Ciudad Enamorada. [/sims-4-gym-lots/]" },
  cmttzil3v00bzoxfe2xnxbtpx: { contentType: 'lot', why: "E168 lot-untitled \"The G Spot\" — KEEP lot; The G Spot is an all-girls gym with a bright pink and white aesthetic. [/sims-4-gym-lots/]" },
  cmqpykfa00090oxeeykxb3g6w: { contentType: 'lot', why: "E168 lot-untitled \"Ws Vampire Home Dimitrescu\" — KEEP lot; Fans of gothic architecture and Resident Evil, this one’s for you! The massive Vampire Home Dimitrescu is… [/sims-4-vampire-cc/]" },
  cmqpykev8008voxeej56n8d1l: { contentType: 'lot', why: "E168 lot-untitled \"St. Fiacre Cemetery\" — KEEP lot; The St. [/sims-4-vampire-cc/]" },
  cmsmbycj400h2oxeud7e4ljkv: { contentType: 'lot', why: "E168 lot-untitled \"Eternal Hollow Funeral Home\" — KEEP lot; Eternal Hollow Funeral Home is an elaborate 64×64 build with grand Gothic architecture, tall towers,… [/sims-4-funeral-cc/]" },
  cmmvarpz500bboxzglf8s0sp9: { contentType: 'lot', why: "E168 lot-untitled \"Glasswood Cabin 2\" — KEEP lot; Glasswood Cabin 2 is a stunning modern woodland home with sleek glass architecture and cozy cabin charm. [/sims-4-cc-finds-for-february-2026/]" },
  cmmvarqf400bdoxzg80u2a7gg: { contentType: 'lot', why: "E168 lot-untitled \"Valley Cabins\" — KEEP lot; Valley Cabins is a cozy residential rental lot designed as a small cabin-style community with three… [/sims-4-cc-finds-for-february-2026/]" },
  cmqpy0zz10064oxee0in9i29a: { contentType: 'lot', why: "E168 lot-untitled \"Blood Elf Village\" — KEEP lot; Blood Elf Village is a large fantasy build inspired by the Eversong Woods area from World of Warcraft. [/sims-4-elf-cc/]" },
  cmsmc1yjy00j2oxeunkqaf930: { contentType: 'lot', why: "E168 lot-untitled \"Modern Vet Clinic\" — KEEP lot; This modern vet clinic is a must-have for pet healthcare. [/sims-4-hospital-lots/]" },
  cmsmc238f00j5oxeu4dtmmw7l: { contentType: 'lot', why: "E168 lot-untitled \"Magnolia Grace Hospital\" — KEEP lot; Magnolia Grace Hospital is a realistic, fully functional medical center for the base game. [/sims-4-hospital-lots/]" },
  cmsmc30tc00jnoxeu2q48nr2x: { contentType: 'lot', why: "E168 lot-untitled \"Tartosa Grand Hotel\" — KEEP lot; If you want a luxurious Mediterranean-inspired hotel, Tartosa Grand Hotel is an excellent choice. [/sims-4-hotel-lots/]" },
  cmsmc31v600jooxeud96kx7z7: { contentType: 'lot', why: "E168 lot-untitled \"Enamorada Love Hotel\" — KEEP lot; Enamorada Love Hotel is a gorgeous multi-story build ideal for romantic getaways and couples-focused gameplay. [/sims-4-hotel-lots/]" },
  cmsmc36l400jsoxeugpfzabsp: { contentType: 'lot', why: "E168 lot-untitled \"Imperial Hotel for Rent\" — KEEP lot; Imperial Hotel for Rent is one of my favorite Sims 4 hotel lots. [/sims-4-hotel-lots/]" },
  cmsmc37ot00jtoxeusgclwz0z: { contentType: 'lot', why: "E168 lot-untitled \"Harborfront Motel\" — KEEP lot; If you’re looking for a cozy waterfront motel with realistic charm, Harborfront Motel is an excellent choice. [/sims-4-hotel-lots/]" },
  cmsmc3iwp00k2oxeujaer7c6h: { contentType: 'lot', why: "E168 lot-untitled \"Namuri Resort – Sims 4 Island Hotel\" — KEEP lot; Namuri Resort draws inspiration from Jeju Island and Sulani with its tranquil tropical design. [/sims-4-hotel-lots/]" },
  cmsmc3sij00k9oxeu8qkrbkwf: { contentType: 'lot', why: "E168 lot-untitled \"Grand Budapest Hotel 50×40\" — KEEP lot; Grand Budapest Hotel 50×40 is an impressive eight-level hotel inspired by Wes Anderson’s The Grand… [/sims-4-hotel-lots/]" },
  cmsmce6ib00pooxeu695hx8yc: { contentType: 'lot', why: "E168 lot-untitled \"Off-Grid Earthship\" — KEEP lot; Off-Grid Earthship is a fully furnished, eco-friendly homestead built for sustainable living. [/sims-4-off-the-grid-cc/]" },
  cmsmchyn400rxoxeutrix85ec: { contentType: 'lot', why: "E168 lot-untitled \"Pirate Bay Beach Area\" — KEEP lot; Pirate Bay Beach Area is the perfect pirate-inspired getaway with a massive docked ship, tropical scenery,… [/sims-4-pirate-cc/]" },
  cmsmcmhel00u3oxeu9eugpliw: { contentType: 'lot', why: "E168 lot-untitled \"Bridgecreek Police Station CC\" — KEEP lot; Bridgecreek Police Station CC is a small-town police department with a cozy, rustic design. [/sims-4-police-station-lot/]" },
  cmsmcmo1q00u8oxeuzfmo7p07: { contentType: 'lot', why: "E168 lot-untitled \"Police Station Gotham\" — KEEP lot; Police Station Gotham is a dark, dramatic police department inspired by Gotham. [/sims-4-police-station-lot/]" },
  cmsmcmrcz00uaoxeu7fhamj8n: { contentType: 'lot', why: "E168 lot-untitled \"Playtested Police Station\" — KEEP lot; Playtested Police Station is a one-story, CC-free build designed to make your Detective Career gameplay… [/sims-4-police-station-lot/]" },
  cmsmcmspc00uboxeu6ek1wrds: { contentType: 'lot', why: "E168 lot-untitled \"Stranger Things Police Station\" — KEEP lot; Stranger Things Police Station is a no-CC build inspired by the Hawkins Police Station from Stranger Things. [/sims-4-police-station-lot/]" },
  cmsmcnjvt00uroxeun7gbcx6x: { contentType: 'lot', why: "E168 lot-untitled \"Zora Ceramics\" — KEEP lot; Zora Ceramics is a charming custom pottery shop built inside a pink three-story townhouse. [/sims-4-pottery-cc/]" },
  cmsmcntx100uzoxeuw4b6oxyp: { contentType: 'lot', why: "E168 lot-untitled \"Pottery Business & Dream Home – Korean Inspired\" — KEEP lot; Pottery Business & Dream Home – Korean Inspired is a beautiful build with a pottery business and a cozy… [/sims-4-pottery-cc/]" },
  cmsmcqmq500wdoxeulr3l7h2u: { contentType: 'lot', why: "E168 lot-untitled \"Big Ranch\" — KEEP lot; If you want a sprawling countryside estate with plenty of room for horses, Big Ranch is one of the best… [/sims-4-ranch-cc/]" },
  cmsmcu7rn00yaoxeuc2xfa0bw: { contentType: 'lot', why: "E168 lot-untitled \"Old Town Salon\" — KEEP lot; Old Town Salon is a beautiful makeover of an old Tudor-style home in Windenburg. [/sims-4-salon-cc/]" },
  cmu144jpl0005oxtzp3uxf9n1: { contentType: 'decor', why: "E168 lot-untitled \"Kativip’s Medieval Boat\" — decor, not a lot; Kativip’s Medieval Boat is a decorative sailing boat converted from The Sims 2 for creating medieval… [/sims-4-boat-cc/]" },
  cmu144jy00008oxtz59ys6y09: { contentType: 'decor', why: "E168 lot-untitled \"Sea Yachts\" — decor, not a lot; If you’re looking for decorative yachts to make your Sims 4 waterfront lots feel more realistic, check out… [/sims-4-boat-cc/]" },
  // Three rows whose title names nothing and whose post URL maps to `tops`:
  //    the URL fallback would stand (by design), but a clothes PACK is a mixed
  //    CAS set with no single facet — same call as E161's "The Moss Collection".
  cmijpfntx0112oxc8ckst022u: { contentType: null, why: "E168 lot-untitled \"Vetiver Menswear Clothing\" — NULL; a menswear clothing pack, mixed CAS set, no single facet; the URL category tops is a guess [/sims-4-male-clothes-cc/]" },
  cmim9mw7000gyoxy7nuevnqp7: { contentType: null, why: "E168 lot-untitled \"70s Summer Flow Pack\" — NULL; a mixed CAS pack, no single facet; the URL category tops is a guess [/sims-4-cc-clothes-packs/]" },
  cmim9mv1n00geoxy7rysxoa2z: { contentType: null, why: "E168 lot-untitled \"Sims 4 CC Clothes Pack: City Adventurer\" — NULL; a mixed CAS pack, no single facet; the URL category tops is a guess [/sims-4-cc-clothes-packs/]" },
};

/**
 * The audited entry for a mod id, or undefined if a human never looked at it.
 */
export function handAuditedContentType(id: string): HandAuditedContentType | undefined {
  return HAND_AUDITED_CONTENT_TYPES[id];
}
