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
  // ── Audited 2026-10-04 (Rowan, E168 apply top-24 spot-check) — 23 of the
  //    top 24 lot rows by downloads after the 80-row apply are lots; this one
  //    is a CAS set whose title carries the lot word `villa` (rule header:
  //    villa 38/8/12). Title-supported, so `--lot-untitled` never loads it.
  cmttzibbj00a1oxfefuotnlq2: { contentType: null, why: "E168 top24 \"Villa Amour Collection\" — NULL; a Love Island-inspired outfit set (dresses, a romper, accessories), mixed CAS, no single facet; `villa` is the lot word [/sims-4-cc-finds-for-august-2026/]" },
  // ── Audited 2026-10-07 (Rowan, E180). Sage flagged two `furniture` rows in a
  //    hub top-20 (10-04): "Functional Skincare Mod" and "Mini Pochette Bags".
  //    Both sit on blog posts whose every sibling was read row by row: the
  //    gameplay mods on /best-sims-4-realistic-mods/ were typed accessories /
  //    hair / furniture / workout, and the bags on /sims-4-bags-cc/ were typed
  //    full-body / furniture / workout / tops / dresses / makeup / poses /
  //    shoes. Heterogeneous wrong values on legacy rows (cmim8… ids), so each is
  //    pinned here, not re-decided by a facet-wide tool. Rows already right on
  //    those posts (5 gameplay-mod, 2 script-mod, 34 accessories) are untouched.
  //    Download-host category beats the blogger's prose where they disagree
  //    (TSR objects-decor-clutter, CurseForge build-buy).
  // /best-sims-4-realistic-mods/
  cmim8s8h2004koxy8ajzs531l: { contentType: 'gameplay-mod', why: 'E180 "Functional Skincare Mod" — gameplay-mod, was furniture; adds functional face washes/lotions with buffs and moods (Sage hub top-20 flag 10-04)' },
  cmim8s9oh004zoxy8x2g128gv: { contentType: 'gameplay-mod', why: 'E180 "Functional Personal Care Products" — gameplay-mod, was hair; a shop-online-for-products gameplay mod, not hair CC' },
  cmim8s9wg0051oxy8e36hxnvv: { contentType: 'gameplay-mod', why: 'E180 "Slice of Life" — gameplay-mod, was accessories; the KawaiiStacie life-sim overhaul' },
  cmim8s99e004toxy8p0ys4h6w: { contentType: 'gameplay-mod', why: 'E180 "100 Base Game Traits" — gameplay-mod, was accessories; a traits mod' },
  cmim8s9hm004woxy89r4grtpm: { contentType: 'gameplay-mod', why: 'E180 "SimNation Travel" — gameplay-mod, was accessories; a travel gameplay mod' },
  cmim8s941004roxy8a9cdspnw: { contentType: 'gameplay-mod', why: 'E180 "Functional Broom" — gameplay-mod, was accessories; brooms with sweep interactions' },
  cmim8s9fg004voxy8gxuwhbvm: { contentType: 'gameplay-mod', why: 'E180 "Better Seasonal Changes" — gameplay-mod, was accessories; changes seasonal parameters' },
  cmim8s9m9004yoxy8maisds25: { contentType: 'gameplay-mod', why: 'E180 "Family Therapy" — gameplay-mod, was accessories; a therapy gameplay mod' },
  cmim8s8lc004loxy8xxhxh6sk: { contentType: 'gameplay-mod', why: 'E180 "Life Tragedies" — gameplay-mod, was accessories; Sacrificial life-events mod' },
  cmim8s966004soxy8xldd1qz7: { contentType: 'gameplay-mod', why: 'E180 "SimCity Loans 2.0" — gameplay-mod, was accessories; a loans gameplay mod' },
  cmim8s8tm004ooxy8kw3ul4xd: { contentType: 'gameplay-mod', why: 'E180 "The One with All the Romance" — gameplay-mod, was accessories; a relationship interactions mod' },
  cmim8s8nt004moxy8zhs2x9hw: { contentType: 'gameplay-mod', why: 'E180 "Let’s Get Fit Modpack" — gameplay-mod, was workout; functional workout items, not workout clothing' },
  // /sims-4-bags-cc/ — wearable bags → accessories
  cmim8wmne00q6oxy8comhg52b: { contentType: 'accessories', why: 'E180 "Mini Pochette Bags" — accessories, was furniture; three wearable pochette bags (Sage hub top-20 flag 10-04)' },
  cmim8wn6l00qfoxy8s4wurdrv: { contentType: 'accessories', why: 'E180 "Prada Cleo Bags V2" — accessories, was furniture; a wearable flap bag' },
  cmim8wngv00qkoxy895t4pdtu: { contentType: 'accessories', why: 'E180 "Rimings" — accessories, was furniture; desc: "the best bag set to add to your Sim’s wardrobe"' },
  cmim8wnco00qioxy80z6od00s: { contentType: 'accessories', why: 'E180 "YUNSEOL Leather Square Hand Bag" — accessories, was full-body' },
  cmim8wnxi00qsoxy8f5kj29cy: { contentType: 'accessories', why: 'E180 "Mini Box Bag" — accessories, was full-body' },
  cmim8wmte00q9oxy88ll7g3yc: { contentType: 'accessories', why: 'E180 "Birkin Collection" — accessories, was full-body; Birkin bags in 8 swatches' },
  cmim8wmvj00qaoxy8zj7vpeob: { contentType: 'accessories', why: 'E180 "Horsebit Bag" — accessories, was full-body' },
  cmim8wnzh00qtoxy8lenvqmr9: { contentType: 'accessories', why: 'E180 "Metal Framed Clutch" — accessories, was full-body' },
  cmim8wmxt00qboxy84not54r8: { contentType: 'accessories', why: 'E180 "Fanny Pack" — accessories, was full-body; TSR sims4-accessories download' },
  cmim8wofd00r1oxy8ybeesymt: { contentType: 'accessories', why: 'E180 "Early Access-Hanging Spring Leather Bag" — accessories, was full-body' },
  cmim8wmh000q3oxy8mdy0cmay: { contentType: 'accessories', why: 'E180 "Prada Hobo Bag" — accessories, was tops; title names the bag (a crop top ships alongside)' },
  cmim8wnky00qmoxy8tysfuiq5: { contentType: 'accessories', why: 'E180 "University Nike Backpack" — accessories, was tops' },
  cmim8wo3d00qvoxy8alt72di3: { contentType: 'accessories', why: 'E180 "Sports Bag" — accessories, was workout; a wearable unisex bag' },
  cmim8wmjc00q4oxy847wdx53i: { contentType: 'accessories', why: 'E180 "Vintage Coach Hb Bag Accessory" — accessories, was makeup; ring-slot accessory (a decor version ships too)' },
  cmim8wohn00r2oxy8shmd418j: { contentType: 'accessories', why: 'E180 "Teddy Kelly Bag" — accessories, was decor; "both accessory and decor versions", listed as wearable' },
  cmim8wn2900qdoxy8cw8ulspr: { contentType: 'accessories', why: 'E180 "Square One Shoulder Leather Big Bag With Pose" — accessories, was poses; the bag is the item, the pose is a bonus' },
  // /sims-4-bags-cc/ — decor objects (download-host category wins over prose)
  cmim8wo9c00qyoxy8jxtu84pg: { contentType: 'decor', why: 'E180 "Sac a Main" — decor, was full-body; TSR download is sims4-objects-furnishing-decor-clutter ("gabrielle-handbag")' },
  cmim8wntd00qqoxy825yfi4zj: { contentType: 'decor', why: 'E180 "Luxe D’Tote Bag" — decor, was dresses; CurseForge download is build-buy' },
  cmim8wnve00qroxy876ncv3lo: { contentType: 'decor', why: 'E180 "BCP Deco Schoolbags" — decor, was full-body; title says Deco (Leo-4-Sims deco objects)' },
  cmim8wniv00qloxy8il1umjjw: { contentType: 'decor', why: 'E180 "Dior Tote Decor" — KEEP decor (no-op); title says Decor' },
  // /sims-4-bags-cc/ — no single facet
  cmim8wml700q5oxy8gpan8gmx: { contentType: null, why: 'E180 "CC #47.2" — NULL, was shoes; mixed CAS set (bags, lenses, sandals, bodysuits), title names nothing' },
  cmim8wo7c00qxoxy8c70vxacz: { contentType: null, why: 'E180 "Simkea Pose Accessory Bag" — NULL, was workout; pose-accessory object vs wearable is unclear from title and desc; NULL beats a guess' },

  // ── Audited 2026-10-11 (Rowan, E186). `scripts/agents/catalog-post-disagreement.ts`
  //    ranked 166 posts by the share of typed rows whose contentType disagrees
  //    with the post's own URL category; these are the worst three, read row
  //    by row from TITLES ONLY (the prose is what typed them). NULL beats a guess.
  // /sims-4-lips-presets-cc/ (URL category preset): 28 of 28 typed rows disagreed — 24
  // were `makeup`, so lip-shape presets sat on the live makeup-cc page. Title says
  // preset/slider -> preset; a lip cuff -> jewelry; anything a title cannot settle (shape
  // vs lipstick, "Kit"/"Set", two types named) -> NULL.
  cmil3nu3o00h9oxpzybzj3oqj: { contentType: 'jewelry', why: 'E186 "CyFi Lip Cuff" — jewelry, was makeup; a lip cuff is a piercing' },
  cmil3obul00hmoxpz3ob6u93e: { contentType: 'preset', why: 'E186 "Female Lips Preset" — preset, was makeup; title says preset' },
  cmil3o5ov00hhoxpzyb6w2opy: { contentType: 'preset', why: 'E186 "Lip Preset" — preset, was makeup; title says preset' },
  cmil3npzm00h6oxpz69rhmvpb: { contentType: 'preset', why: 'E186 "Lip Preset No. 2" — preset, was makeup; title says preset' },
  cmil3nmx000h4oxpzg5ffx7o5: { contentType: 'preset', why: 'E186 "Lip Presets For Latest Skin" — preset, was makeup; title says preset' },
  cmil3nwps00hboxpzl3qdh68y: { contentType: 'preset', why: 'E186 "Lips Preset" — preset, was makeup; title says preset' },
  cmil3nhgc00h0oxpz5wna25az: { contentType: 'preset', why: 'E186 "Lips Preset N23 To 30" — preset, was skin; title says preset' },
  cmil3nejf00gyoxpz4yt5z6lv: { contentType: 'preset', why: 'E186 "Love Yourself Presets Collection" — preset, was makeup; title says presets' },
  cmil3nk8600h2oxpzqbduym5t: { contentType: 'preset', why: 'E186 "Lucian Mouth Preset N11" — preset, was makeup; title says preset' },
  cmil3n9ad00gvoxpzzfji5iuz: { contentType: 'preset', why: 'E186 "Lucky Lip Presets" — preset, was makeup; title says presets' },
  cmil3oalj00hloxpzxiute46t: { contentType: 'preset', why: 'E186 "Mouth Preset" — preset, was makeup; title says preset' },
  cmil3o6t500hioxpzhawe52x8: { contentType: 'preset', why: 'E186 "Mouth Preset D1 To 5" — preset, was makeup; title says preset' },
  cmil3nz0b00hdoxpzjud8a62p: { contentType: 'preset', why: 'E186 "Pout Lip Slider" — preset, was makeup; a lip shape slider, preset class' },
  cmil3nfq300gzoxpzbvnw891j: { contentType: 'preset', why: 'E186 "Sims 4 Lip Preset 11 To 25" — preset, was makeup; title says preset' },
  cmil3o2f200hfoxpzmf1l3zfu: { contentType: 'preset', why: 'E186 "Sweet Lip Presets" — preset, was makeup; title says presets' },
  cmil3o04v00heoxpz7xy7oprk: { contentType: null, why: 'E186 "Asymmetrical Lips" — NULL, was makeup; shape or lipstick, title cannot tell' },
  cmil3nd7s00gxoxpzgy3qacfv: { contentType: null, why: 'E186 "Baby Face Kit" — NULL, was full-body; not an outfit; kit contents unnamed' },
  cmil3nxti00hcoxpzowqeu3xx: { contentType: null, why: 'E186 "Cleft Lip" — NULL, was accessories; preset or skin detail, title cannot tell' },
  cmil3nsle00h8oxpza7oiyidy: { contentType: null, why: 'E186 "Female Lips Preset And Makeup" — NULL, was makeup; title names two types' },
  cmil3nr9f00h7oxpzwp16s6ub: { contentType: null, why: 'E186 "Gloss Collection" — NULL, was accessories; likely lipgloss but unsure; not accessories' },
  cmil3o9bo00hkoxpzxjc5dt80: { contentType: null, why: 'E186 "Gpme Gold Natural Lips" — NULL, was makeup; shape or lipstick, title cannot tell' },
  cmil3nlky00h3oxpz0dsj6jf3: { contentType: null, why: 'E186 "Lip Kit" — NULL, was makeup; presets or lipstick, title cannot tell' },
  cmil3no6e00h5oxpzn7mhtzz7: { contentType: null, why: 'E186 "Lip Set" — NULL, was makeup; presets or lipstick, title cannot tell' },
  cmil3o7wb00hjoxpz39n9ag7a: { contentType: null, why: 'E186 "Lips Set" — NULL, was makeup; presets or lipstick, title cannot tell' },
  cmil3nvlj00haoxpzlkd65l9f: { contentType: null, why: 'E186 "Locking Lips" — NULL, was makeup; shape or lipstick, title cannot tell' },
  cmil3nb2c00gwoxpz06nt3qiy: { contentType: null, why: 'E186 "Presets And Makeup Set" — NULL, was makeup; title names two types' },
  cmil3o4i300hgoxpz6gjcyh2p: { contentType: null, why: 'E186 "Redefined Nat Lips" — NULL, was makeup; shape or lipstick, title cannot tell' },
  cmil3nivt00h1oxpzttxembde: { contentType: null, why: 'E186 "Summer Equinox" — NULL, was makeup; title names nothing' },
  // /sims-4-hats-cc/ (URL category hats): 23 of 29 typed rows disagreed (full-body 10,
  // tops 4, furniture 3, gameplay-mod 2, ...). Every title that names a hat/cap/beret ->
  // hats; two titles that name nothing -> NULL.
  cmim9337n01uzoxy83dfj5efr: { contentType: 'hats', why: 'E186 "Bear Hat" — hats, was full-body; title says hat' },
  cmim9335n01uyoxy881h6z1vp: { contentType: 'hats', why: 'E186 "Chasm DIY Bucket Hat" — hats, was furniture; title says hat' },
  cmim932j101uooxy8a6ohxh91: { contentType: 'hats', why: 'E186 "Cowboy Hat" — hats, was gameplay-mod; title says hat' },
  cmim933al01v0oxy8zttf4tbi: { contentType: 'hats', why: 'E186 "Cowboy Hat Recolor" — hats, was full-body; title says hat' },
  cmim932rq01usoxy83dtle5sn: { contentType: 'hats', why: 'E186 "Denim Bucket Hat" — hats, was tops; title says hat' },
  cmim933eg01v2oxy89fxvr74w: { contentType: 'hats', why: 'E186 "Denim Bunny Cap" — hats, was gameplay-mod; title says cap' },
  cmim9331s01uwoxy818lep6ne: { contentType: 'hats', why: 'E186 "Devil Hat" — hats, was tops; title says hat' },
  cmim932h401unoxy8uklp0fws: { contentType: 'hats', why: 'E186 "Freshman Year Collection Beret" — hats, was furniture; title says beret' },
  cmim933gh01v3oxy80wzs20ap: { contentType: 'hats', why: 'E186 "Hala Hala Hat And Mask" — hats, was glasses; hat named first; the mask is the bonus' },
  cmim931yj01ueoxy8d3ohnvs3: { contentType: 'hats', why: 'E186 "Hat Tiffany Version With Lace And Bow" — hats, was full-body; title says hat' },
  cmim933ch01v1oxy8jhip4zb4: { contentType: 'hats', why: 'E186 "Helene Hat" — hats, was full-body; title says hat' },
  cmim9333o01uxoxy8zzbvqujt: { contentType: 'hats', why: 'E186 "His And Hers Adidas Cap" — hats, was workout; title says cap' },
  cmim933mi01v6oxy83sin3j46: { contentType: 'hats', why: 'E186 "May Beret" — hats, was full-body; title says beret' },
  cmim9324v01uhoxy8365r2316: { contentType: 'hats', why: 'E186 "Niche Noir Hat Collection" — hats, was full-body; title says hat' },
  cmim932l901upoxy8ja1dwyff: { contentType: 'hats', why: 'E186 "Nike Skull Cap" — hats, was hair; a skull cap is headwear, not hair' },
  cmim932n901uqoxy8odnnmvpm: { contentType: 'hats', why: 'E186 "Paper Clip Rabbit Hat" — hats, was furniture; title says hat' },
  cmim932pk01uroxy8kq953eyx: { contentType: 'hats', why: 'E186 "Pina Colada Hat" — hats, was tops; title says hat' },
  cmim9328v01ujoxy8jf4euod7: { contentType: 'hats', why: 'E186 "S-Club WM Hat" — hats, was residential; title says hat' },
  cmim932d401uloxy81bg3na87: { contentType: 'hats', why: 'E186 "Sometimes Fur Hat" — hats, was full-body; title says hat' },
  cmim9320h01ufoxy86hf2htzd: { contentType: 'hats', why: 'E186 "Sunrise Hat" — hats, was tops; title says hat' },
  cmim933oj01v7oxy8ew3xfdii: { contentType: 'hats', why: 'E186 "Ushanka Hat Set" — hats, was full-body; title says hat' },
  cmim932f801umoxy8chexuh8k: { contentType: null, why: 'E186 "Maoni Cat" — NULL, was full-body; title names nothing' },
  cmim932zs01uvoxy8iprvw4lw: { contentType: null, why: 'E186 "Summer In Mount Koromebi Set" — NULL, was full-body; set of unnamed items' },
  // /sims-4-fitness-clutter-cc/ (URL category decor): 29 of 43 typed rows disagreed — 28
  // were `workout`, the CAS gym-clothes facet, on a post about objects. Equipment ->
  // furniture, tabletop items -> clutter, posters/decor -> decor; every "Fitness Set"/"Gym
  // set" title that could be an outfit -> NULL. `gym` was not used: it is itself mixed
  // (Flow Motion Clothes Set, Pilates Princess).
  cmknfblpw0086oxolc0evuxmn: { contentType: 'clutter', why: 'E186 "Clutter Dump: Functional Clutter Items" — clutter, was workout; title says clutter' },
  cmim8yimc011xoxy8a9ihlltj: { contentType: 'clutter', why: 'E186 "Health And Fitness Clutter" — clutter, was workout; title says clutter' },
  cmim8yj8x0128oxy8ukrw20i8: { contentType: 'clutter', why: 'E186 "Hype Sports Drink" — clutter, was workout; a drink object' },
  cmim8yjt2012ioxy8m1090gb8: { contentType: 'clutter', why: 'E186 "Protein Shaker And Protein Powder Tub" — clutter, was workout; tabletop objects' },
  cmim8yjgi012coxy81wfwae06: { contentType: 'clutter', why: 'E186 "Sims 4 Functional Gymnastics Chalk Bowl" — clutter, was workout; a functional object' },
  cmim8yj4u0126oxy8sliqk69p: { contentType: 'clutter', why: 'E186 "Whey Protein, Slimming Shakes, Meal Replacements, And Gummy Supplements" — clutter, was accessories; tabletop objects' },
  cmim8yiuf0121oxy8ah90f096: { contentType: 'furniture', why: 'E186 "Crossfit Treadmill" — furniture, was workout; exercise equipment object' },
  cmknfbli20082oxol7nat5enq: { contentType: 'furniture', why: 'E186 "Functional Treadmill" — furniture, was workout; exercise equipment object' },
  cmim8yjeq012boxy8wijxy68q: { contentType: 'furniture', why: 'E186 "Gym Equipment Set" — furniture, was workout; exercise equipment objects' },
  cmknfblny0085oxolyfihcxls: { contentType: 'furniture', why: 'E186 "Lots Of Gym Equipment" — furniture, was workout; exercise equipment objects' },
  cmim8yjih012doxy8y7reneua: { contentType: 'furniture', why: 'E186 "Strong Exercise Bench" — furniture, was workout; exercise equipment object' },
  cmim8yike011woxy8mmjdqb0l: { contentType: 'furniture', why: 'E186 "Strong Hex Dumbbell Ruck V1" — furniture, was workout; a dumbbell rack object' },
  cmim8yjkh012eoxy8jbfafkk5: { contentType: 'decor', why: 'E186 "Gym Posters" — decor, was workout; wall posters' },
  cmim8yjr4012hoxy8ok6c9t7t: { contentType: 'decor', why: 'E186 "Yosef Decor" — decor, was workout; title says decor' },
  cmim8yjmi012foxy8ew7eivz2: { contentType: null, why: 'E186 "Ats4-Fitness Set" — NULL, was workout; objects or outfit, title cannot tell' },
  cmim8yiyl0123oxy8shsu7uay: { contentType: null, why: 'E186 "Body Language" — NULL, was workout; title names nothing' },
  cmim8yjuw012joxy88998ppu4: { contentType: null, why: 'E186 "Boxing Collaboration" — NULL, was workout; objects or outfit, title cannot tell' },
  cmim8yjom012goxy8hx4anyap: { contentType: null, why: 'E186 "C4 Set S3 And S4" — NULL, was workout; title names nothing' },
  cmim8yiwj0122oxy8773bexpk: { contentType: null, why: 'E186 "Crossfit Gymbag" — NULL, was workout; wearable or object, title cannot tell' },
  cmim8yis80120oxy8n91lii38: { contentType: null, why: 'E186 "Crossfit Set" — NULL, was workout; objects or outfit, title cannot tell' },
  cmknfbllx0084oxol4f15daui: { contentType: null, why: 'E186 "February 2025 Set 1: Luxury Fitness" — NULL, was workout; objects or outfit, title cannot tell' },
  cmim8yio6011yoxy8g8if1ozq: { contentType: null, why: 'E186 "Fitness CC Sims 4" — NULL, was workout; title names no type' },
  cmim8yj6u0127oxy8knjjximn: { contentType: null, why: 'E186 "Gym Stuff" — NULL, was workout; title names no type' },
  cmim8yjcn012aoxy8svur96cx: { contentType: null, why: 'E186 "Home Fitness Set" — NULL, was workout; objects or outfit, title cannot tell' },
  cmim8yig7011voxy85al0l2rh: { contentType: null, why: 'E186 "Set Fitness 2" — NULL, was workout; objects or outfit, title cannot tell' },
  cmim8yj2k0125oxy8784d4yjg: { contentType: null, why: 'E186 "Sport and Gym set" — NULL, was workout; objects or outfit, title cannot tell' },
  cmim8yjas0129oxy8wjsgrpzm: { contentType: null, why: 'E186 "Sports And Gym" — NULL, was workout; objects or outfit, title cannot tell' },
  cmknfblvs0089oxolf8hjbmv0: { contentType: null, why: 'E186 "The Balance Collection" — NULL, was workout; title names nothing' },
  cmknfblrr0087oxolcp544ebu: { contentType: null, why: 'E186 "Yoga Set" — NULL, was workout; yoga mat or yoga outfit, title cannot tell' },

  // ── Audited 2026-10-12 (Rowan, E193). E186 continuation: the next three
  //    posts by URL-category disagreement (`catalog-post-disagreement.ts`) —
  //    /sims-4-makeup-clutter/ 13/23, /24-best-sims-4-body-presets-for-2024/
  //    11/21, /sims-4-eyes-cc/ 15/32 — read whole (E180 lesson), plus the
  //    10-10 ingest of /sims-4-leg-warmers-cc/ (27 rows typed five ways).
  //    Each row read by title, then its OWN per-item description and download
  //    URL category (TSR/CurseForge) as tiebreak — never the post's shared
  //    prose. Mixed sets whose current type is not wrong are pinned as keeps.
  //    LEGWEAR: no socks/legwear contentType exists (0 rows); off-post
  //    socks/tights/stockings titles (96) sit most often in `accessories` (34),
  //    which is also the CAS slot. Pure leg warmers -> accessories; a title
  //    that names a shoe or boot stays `shoes`. No new facet invented.
  cmikiouzu003noxnaekzsana9: { contentType: 'clutter', why: 'E193 "Bathroom Industry Cosmetics Clutter" — clutter, was furniture; title says clutter' },
  cmikio8ny003aoxnalxrx0kfe: { contentType: 'clutter', why: 'E193 "Before Bed Set" — clutter, was furniture; desc: clutter pack (spilled toothpaste); title names no CAS item' },
  cmikiogou003foxnavrpg6xdk: { contentType: 'clutter', why: 'E193 "Makeup Clutter" — clutter, was furniture; title says clutter' },
  cmikionwx003joxnaivc6x1tn: { contentType: 'clutter', why: 'E193 "Bauble and Bandera Beauty Supplies" — clutter, was accessories; TSR sims4-sets; desc: bathroom-counter objects' },
  cmikiotnr003moxnatqwc13ta: { contentType: 'clutter', why: 'E193 "Chic Cosmetic Part 1" — clutter, was makeup; CurseForge build-buy; desc: makeup clutter' },
  cmikioi2n003goxnaxdowxkf2: { contentType: 'clutter', why: 'E193 "Chic Cosmetics Part 2" — clutter, was makeup; CurseForge build-buy; desc: makeup clutter' },
  cmikip5zy003toxnaqcn9e8v7: { contentType: 'clutter', why: 'E193 "Dior Backstage Foundation" — clutter, was makeup; desc: a foundation bottle object, not CAS makeup' },
  cmikip202003roxnanaoy9vj0: { contentType: 'clutter', why: 'E193 "Glow Up Essentials Pack Part 1" — clutter, was makeup; desc: 18 objects incl candles' },
  cmikio4n00038oxna7zgee9ws: { contentType: 'clutter', why: 'E193 "GRWM Beauty Essentials" — clutter, was makeup; desc: ring light and vanity objects' },
  cmikiokio003hoxna3ek2nhzc: { contentType: 'clutter', why: 'E193 "HK Mac Makeup Set" — clutter, was makeup; TSR sets-objects; desc: 14-item clutter' },
  cmikioyw5003poxnal5ez8k0p: { contentType: 'clutter', why: 'E193 "Luxe Hair Tools Set" — clutter, was hair; CurseForge build-buy; hair dryer objects, not hair' },
  cmikiomje003ioxnadaz9vs3a: { contentType: 'clutter', why: 'E193 "Miranda Vanity Beauty Set" — clutter, was shoes; TSR sets-objects; desc: 14 vanity objects' },
  cmikip0c2003qoxnayp9tzq3n: { contentType: 'clutter', why: 'E193 "Myxdoll Functional Bratz Collection" — clutter, was makeup; functional = objects; desc: interactive set' },
  cmikiopnd003koxnaa1qdz09t: { contentType: 'clutter', why: 'E193 "Pink Makeup Set" — clutter, was makeup; desc: five objects' },
  cmikipa3s003voxnax9wh9r2q: { contentType: 'clutter', why: 'E193 "Pink Skin Things" — clutter, was makeup; desc: 11 dressing-table objects' },
  cmikip38f003soxna6mheasoq: { contentType: 'clutter', why: 'E193 "Slodie Beauty Makeup Set" — clutter, was makeup; desc: glam-station makeup clutter' },
  cmim8t8kr0069oxy8tipo8lad: { contentType: 'body-preset', why: 'E193 "Bodies" — body-preset, was full-body; Bodies by NNAO; desc: 3 body presets, not an outfit' },
  cmim8t94q006hoxy89x0fe8mc: { contentType: 'body-preset', why: 'E193 "Body Classique Physique" — body-preset, was skin; desc: body preset pack' },
  cmim8t8io0068oxy82mjmurre: { contentType: 'body-preset', why: 'E193 "BodyCare Kit" — body-preset, was tattoos; desc: body shapes and torsos preset pack' },
  cmim8t9eg006loxy8yk3oezsz: { contentType: null, why: 'E193 "Cleavage Mask" — NULL, was skin; preset or overlay, title cannot tell; NULL beats a guess' },
  cmim8t9s5006roxy8qqq79obl: { contentType: 'body-preset', why: 'E193 "Foot Model" — body-preset, was full-body; feet preset, as pinned Feet 1V Remaster' },
  cmim8t8nw006aoxy8cso7vton: { contentType: 'body-preset', why: 'E193 "Hourglass" — body-preset, was skin; desc: hourglass body preset' },
  cmim8t8sk006coxy8o5ipbech: { contentType: 'body-preset', why: 'E193 "Ivy Preset" — body-preset, was skin; title says preset; desc: female body preset' },
  cmim8t97h006ioxy8yp8uplmk: { contentType: 'body-preset', why: 'E193 "Juicy Preset" — body-preset, was skin; title says preset; desc: female body preset' },
  cmim8t9nh006poxy8bzrzldik: { contentType: 'body-preset', why: 'E193 "Strong-bod Preset" — body-preset, was workout; title says preset; a body shape, not workout wear' },
  cmim8t8xh006eoxy8qx4jzmo4: { contentType: 'body-preset', why: 'E193 "THOR with Veins" — body-preset, was full-body; desc: male body preset pack, not an outfit' },
  cmim8t8uu006doxy8ucqughqa: { contentType: 'body-preset', why: 'E193 "Vain Preset" — body-preset, was skin; title says preset; desc: body shape' },
  cmim92jc701rroxy85diy5j0e: { contentType: 'eyes', why: 'E193 "Cloop Eyes 13-24" — eyes, was makeup; title says eyes; eye colours' },
  cmim92j9y01rqoxy8u1m6hmse: { contentType: 'eyes', why: 'E193 "Comet Eyes Heterochromia" — eyes, was makeup; title says eyes; eye colours' },
  cmim92kqq01s8oxy8f1ekj4da: { contentType: 'eyes', why: 'E193 "Cora Eyes N87" — eyes, was makeup; title says eyes; TSR sims4-eyecolors' },
  cmim92jej01rsoxy8pg985fsy: { contentType: 'eyes', why: 'E193 "Eye Contacts N4-15 Infant Update" — eyes, was makeup; contacts = eye colours' },
  cmim92iyq01rloxy8i7lvlrho: { contentType: 'eyes', why: 'E193 "Eyes N134" — eyes, was makeup; title says eyes; eye colours' },
  cmim92jw601rzoxy82ebh8sx1: { contentType: 'eyes', why: 'E193 "Eyes N32" — eyes, was makeup; title says eyes; eye colours' },
  cmim92jje01ruoxy8tff2ojaw: { contentType: 'eyes', why: 'E193 "Eyes N44" — eyes, was makeup; title says eyes; TSR sims4-eyecolors' },
  cmim92jnw01rwoxy83urmre8t: { contentType: 'eyes', why: 'E193 "Kira Eyes" — eyes, was makeup; title says eyes; eye colours' },
  cmim92jtq01ryoxy83yz3hi3z: { contentType: 'eyes', why: 'E193 "Quartzo Eyes" — eyes, was makeup; title says eyes; eye colours' },
  cmim92jrb01rxoxy8xrvmxy05: { contentType: 'eyes', why: 'E193 "Rue Eyes" — eyes, was makeup; title says eyes; MagicHand eye colours' },
  cmim92k8001s2oxy8z0r8pf7m: { contentType: 'eyes', why: 'E193 "S-Club WM Ts4 Eye Colors" — eyes, was makeup; title says eye colors' },
  cmim92kcv01s4oxy8yj3i7zf6: { contentType: 'eyes', why: 'E193 "Savannah Eyes N109" — eyes, was makeup; title says eyes; TSR sims4-eyecolors' },
  cmim92l5y01seoxy8nznxdxvt: { contentType: 'eyebrows', why: 'E193 "Eyes And Eyebrows Set" — eyebrows, was eyebrows; keep: title names both; eyebrows not wrong' },
  cmim92kia01s6oxy8sbqb2ukt: { contentType: 'skin', why: 'E193 "Ivanka Contacts And Eyebags" — skin, was skin; keep: contacts + eyebags, skin not wrong' },
  cmim92iud01rjoxy8ycch3yb6: { contentType: null, why: 'E193 "Set For Eyes" — NULL, was skin; eye presets + overlays, title names no type' },
  cmv2cn9ci0019oxj2bsz8dzln: { contentType: 'shoes', why: 'E193 "Autumn Leg Warmer Heel Boots" — shoes, was shoes; keep: title names boots' },
  cmv2cn6lg000toxj2hqy389yp: { contentType: 'shoes', why: 'E193 "Ballet Shoes with Leg Warmers" — shoes, was shoes; keep: title names shoes' },
  cmv2cn7z60012oxj2e131e6r7: { contentType: 'accessories', why: 'E193 "Leg Warmers + Gloves Set" — accessories, was accessories; keep: leg warmers + gloves are CAS accessories' },
  cmv2cn7ik000zoxj2yl0zvl4g: { contentType: 'accessories', why: 'E193 "Amanda – Leg Warmers" — accessories, was tops; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn77l000xoxj2w0v870cx: { contentType: 'accessories', why: 'E193 "Amina – Leg Warmers" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cna43001doxj27x0qq22h: { contentType: 'accessories', why: 'E193 "Angelic Leg Warmers" — accessories, was bottoms; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn9kb001aoxj2zrhnnlge: { contentType: 'accessories', why: 'E193 "Ballet Leg Warmers" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn91r0017oxj2bmvsfrdj: { contentType: 'accessories', why: 'E193 "Cinnamoroll Back to School Collection – Warmers" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cnamm001foxj2rq5k29ha: { contentType: 'accessories', why: 'E193 "Dawls’ Equinox Nesa Ribbed Warmers" — accessories, was shoes; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn5u7000poxj214tbbhjt: { contentType: 'accessories', why: 'E193 "Ditto Legwarmers" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn7o40010oxj24zaxhmq3: { contentType: 'accessories', why: 'E193 "Gyaru Leg Warmers V2" — accessories, was bottoms; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cnae0001eoxj2q63me7n4: { contentType: 'accessories', why: 'E193 "Halloween 2024 – Warmers" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn720000woxj2gx9umvie: { contentType: 'accessories', why: 'E193 "Harajuku Leg Warmers" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn95i0018oxj2lol159g6: { contentType: 'accessories', why: 'E193 "Kiera Leg Warmers" — accessories, was bottoms; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn6wf000voxj2k96o2xry: { contentType: 'accessories', why: 'E193 "Kitty Cat Leg Warmers" — accessories, was full-body; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn8qs0015oxj286ixuo2p: { contentType: 'accessories', why: 'E193 "Kitty Leg Warmers" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn63d000qoxj2i7czdsxk: { contentType: 'accessories', why: 'E193 "Knit Leg Warmers" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn7d2000yoxj2a0b2s9tg: { contentType: 'accessories', why: 'E193 "Leg Warmers" — accessories, was shoes; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn8wb0016oxj2g6pw2my7: { contentType: 'accessories', why: 'E193 "Leg Warmers Set" — accessories, was shoes; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn84n0013oxj24uygl1a4: { contentType: 'accessories', why: 'E193 "Leg Warmers – Kids Set" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn8l70014oxj2388lmiof: { contentType: 'accessories', why: 'E193 "Lilian Leg Warmers" — accessories, was bottoms; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn6ef000soxj2kbsfq4qs: { contentType: 'accessories', why: 'E193 "Madelynn Leg Warmers" — accessories, was bottoms; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn9p9001boxj29cnubotv: { contentType: 'accessories', why: 'E193 "Monster High Leg Warmers" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn6tt000uoxj22ovaj552: { contentType: 'accessories', why: 'E193 "Puffy Leg Warmers" — accessories, was bottoms; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn7tx0011oxj2wpjdec31: { contentType: 'accessories', why: 'E193 "Rita Leg Warmers" — accessories, was tops; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn6ag000roxj2q11ydrsx: { contentType: 'accessories', why: 'E193 "Salty & Sweet Legwarmers" — accessories, was NULL; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  cmv2cn9y4001coxj2gcboi0uo: { contentType: 'accessories', why: 'E193 "Star Leg Warmers" — accessories, was bottoms; leg warmers are a CAS accessory slot (socks/tights), no legwear facet' },
  // E200 (Rowan, 2026-10-13): `accessories` was 891 rows, 178 (20.0%) with an
  // accessories word in the title; the writer was the dead legacy `category`
  // backfill (395 "CAS - Accessories", 204 "Other"), not the detector (19 of
  // 713 replay). `--accessories-untitled` re-decides the untitled rows by title,
  // then post URL category, then NULL. These pins are the rows that answer gets
  // wrong: 37 real wearables with no keyword (bags, stockings, wings, masks,
  // sleeves, bonnets) kept, and 14 wrong ADDs/strips corrected. Teeth (braces,
  // fangs), bandages, eye patches: no facet in CAS terms the site uses — NULL.
  cmim8zlak0191oxy8kcwejo7f: { contentType: 'accessories', why: 'E200 "Elf Bar Vape" — kept accessories (no accessories word in the title); description: "use it as an accessory in CAS"; held CAS accessory, not junk' },
  cmijjcoxu007noxs31l8fx0m5: { contentType: 'accessories', why: 'E200 "Bat Wings for Vampires" — kept accessories (no accessories word in the title); CAS wings' },
  cmkyi4bf400zkoxhcmgjvg3sb: { contentType: 'accessories', why: 'E200 "Dark Fairy Wings" — kept accessories (no accessories word in the title); CAS wings' },
  cmijqa52801fgoxc86v17076n: { contentType: 'accessories', why: 'E200 "More Wings" — kept accessories (no accessories word in the title); CAS wings' },
  cmkygemne00yioxhcds3bod1a: { contentType: 'accessories', why: 'E200 "Garden and Crystal Fairy Wings" — kept accessories (no accessories word in the title); CAS wings' },
  cmkyi3loc00zhoxhcn94zp3zq: { contentType: 'accessories', why: 'E200 "Sindriel Wings" — kept accessories (no accessories word in the title); CAS wings' },
  cmktseat70021oxol5n5mtbl8: { contentType: 'accessories', why: 'E200 "Bright Night Bonnet Recolor" — kept accessories (no accessories word in the title); sleep bonnet, worn headwear' },
  cmmvaq0gn006qoxzg4prckk4z: { contentType: 'accessories', why: 'E200 "SDX Silk Bonnets" — kept accessories (no accessories word in the title); silk bonnets, worn headwear' },
  cmkts7b62001doxol4phav8or: { contentType: 'accessories', why: 'E200 "Sweet & Salty Leg Warmers" — kept accessories (no accessories word in the title); leg warmers (E193 legwear class), off-post copy' },
  cmikiqgca004doxnanflf13yu: { contentType: 'accessories', why: 'E200 "Crystal Dungeon Collab with Kikuruacchi" — kept accessories (no accessories word in the title); worn mask, masks-cc post; description "the accessory"' },
  cmikiq0040045oxnarj3zz5z8: { contentType: 'accessories', why: 'E200 "Metal Mask Apocalypse" — kept accessories (no accessories word in the title); worn mask, masks-cc post' },
  cmikiqm5x004goxnaj6xbjs6h: { contentType: 'accessories', why: 'E200 "Medical Mask" — kept accessories (no accessories word in the title); worn mask, masks-cc post' },
  cmikipujb0041oxnaiu1fba57: { contentType: 'accessories', why: 'E200 "Venetian Mask" — kept accessories (no accessories word in the title); worn mask, masks-cc post' },
  cmikiqdby004boxnag9lectn6: { contentType: 'accessories', why: 'E200 "Venetian Mask Bauta" — kept accessories (no accessories word in the title); worn mask, masks-cc post' },
  cmim8woll00r4oxy8l2ee5dul: { contentType: 'accessories', why: 'E200 "Fendi Baguette" — kept accessories (no accessories word in the title); designer bag (bags-cc)' },
  cmoivjsdx000yoxr35b98zi2t: { contentType: 'accessories', why: 'E200 "Gia By Gigi" — kept accessories (no accessories word in the title); handbag set (bags-cc)' },
  cmim8wn4d00qeoxy8va1cxy7i: { contentType: 'accessories', why: 'E200 "Mcbling Collection" — kept accessories (no accessories word in the title); Dior bag (bags-cc)' },
  cmim8wodf00r0oxy8csahdrha: { contentType: 'accessories', why: 'E200 "Gucci Deco Set" — kept accessories (no accessories word in the title); bag, description "the accessory" (bags-cc)' },
  cmim8wo5g00qwoxy88wif8xt8: { contentType: 'accessories', why: 'E200 "Healthy Competition Collection" — kept accessories (no accessories word in the title); belt bag (bags-cc)' },
  cmoivjvmx001aoxr3hgmkwbhv: { contentType: 'accessories', why: 'E200 "LC Luxury Travel Set" — kept accessories (no accessories word in the title); tote + duffel bag set (bags-cc)' },
  cmktsb6tx001qoxolsd8o2cxa: { contentType: 'accessories', why: 'E200 "Fanny Pack Fever" — kept accessories (no accessories word in the title); fanny pack (bag)' },
  cmil1d0o800c1oxeebo9fzk2o: { contentType: 'accessories', why: 'E200 "Lace Stockings" — kept accessories (no accessories word in the title); stockings (stockings-cc), E193 legwear class' },
  cmil1b8fg00bfoxeeezeeazmo: { contentType: 'accessories', why: 'E200 "Rebel Stockings" — kept accessories (no accessories word in the title); stockings (stockings-cc), E193 legwear class' },
  cmktsbv8c001soxol9swqey7g: { contentType: 'accessories', why: 'E200 "Hanni Stocking" — kept accessories (no accessories word in the title); stockings, E193 legwear class' },
  cmil1c6y800bpoxee8drkh2zy: { contentType: 'accessories', why: 'E200 "Reila Fishnets" — kept accessories (no accessories word in the title); fishnets (stockings-cc), E193 legwear class' },
  cmil1cu9400byoxeeb1w048pz: { contentType: 'accessories', why: 'E200 "Stockings 10" — kept accessories (no accessories word in the title); stockings (stockings-cc), E193 legwear class' },
  cmil1c4vi00booxee5svkx5nm: { contentType: 'accessories', why: 'E200 "Fishnet Stockings" — kept accessories (no accessories word in the title); stockings (stockings-cc), E193 legwear class' },
  cmil1cvpm00bzoxeeug9guyps: { contentType: 'accessories', why: 'E200 "Gothic Rose Stockings" — kept accessories (no accessories word in the title); stockings (stockings-cc), E193 legwear class' },
  cmil32dl60097oxpzo4v6vyg8: { contentType: 'accessories', why: 'E200 "Stockings 27" — kept accessories (no accessories word in the title); stockings (socks-cc), E193 legwear class' },
  cmoipxne8000qoxkjfrdcg4e4: { contentType: 'accessories', why: 'E200 "Handsocks" — kept accessories (no accessories word in the title); hand socks / gloves (gloves-cc)' },
  cmttzgpbc0015oxfejqd3iqfp: { contentType: 'accessories', why: 'E200 "A Glove for Just One Hand" — kept accessories (no accessories word in the title); single glove (goth-accessories)' },
  cmil18vf500ajoxeemkzvpkj6: { contentType: 'accessories', why: 'E200 "Headphone" — kept accessories (no accessories word in the title); worn headphones, description "the accessory"' },
  cmsmbqczd00d1oxeugxg7v8y0: { contentType: 'accessories', why: 'E200 "Leg Orthoses Set for Toddler" — kept accessories (no accessories word in the title); description "medical accessory set" (leg braces)' },
  cmil1oaim00hdoxeev1wy4w6y: { contentType: 'accessories', why: 'E200 "Babe Waist Chain" — kept accessories (no accessories word in the title); waist chain (belt-cc)' },
  cmuy42z9b000coxinptp4gnln: { contentType: 'accessories', why: 'E200 "Arm Warmers" — kept accessories (no accessories word in the title); arm warmers (arm-warmers post)' },
  cmktsbj9k001roxolb70a29j0: { contentType: 'accessories', why: 'E200 "Fishnet Arm Sleeves" — kept accessories (no accessories word in the title); arm sleeves' },
  cmttzgocx000roxfekckuodya: { contentType: 'accessories', why: 'E200 "Oh My Goth – Ripped Goth Sleeves" — kept accessories (no accessories word in the title); arm sleeves (goth-accessories)' },
  cmik9udny00axoxk7ynxxnai3: { contentType: 'lot', why: 'E200 "The Bay Beauty" — lot, was accessories; TSR category sims4-lots-residential; a family mansion, title word "Beauty" typed it makeup' },
  cmika2vq700g9oxk7zgl1hhgg: { contentType: 'pet-accessories', why: 'E200 "Colorful Hats" — pet-accessories, was accessories; description: knit hats "on pet heads" (pet-cc post)' },
  cmijn9d9i00cboxc8cuu1eqqg: { contentType: 'gameplay-mod', why: 'E200 "Hidden Highlight" — gameplay-mod, was accessories; a mod that removes the hover outline; title word "Highlight" typed it blush' },
  cmsmcu42p00y7oxeukc7oxax2: { contentType: 'furniture', why: 'E200 "The Nail Salon Pack" — furniture, was accessories; build/buy salon set ("30 custom pieces for nail studios"), not nails' },
  cmsmcups000yooxeu51bu3ztm: { contentType: 'furniture', why: 'E200 "TIPS Set – Nail Salon" — furniture, was accessories; spa furniture/shelving/dividers set, not nails' },
  cmijkghy9000aoxc8i6y1ysk7: { contentType: 'furniture', why: 'E200 "Forest Hut Set" — furniture, was accessories; object set for a rustic interior; farmhouse-cc URL maps to lot (known URL-map miss)' },
  cmil2tago005coxpzfiuaeizj: { contentType: 'beard', why: 'E200 "The Hanneman" — beard, was accessories; beard/mustache (facial-hair-cc post); URL map read "hair-cc"' },
  cmim8xvxv00z2oxy8la7q7sv5: { contentType: 'beard', why: 'E200 "Intro" — beard, was accessories; beard pack by introsims; URL map read "hair-cc"' },
  cmim93qkr01wzoxy83s64h04b: { contentType: null, why: 'E200 "Gaming Sweatshirt" — NULL, was accessories; real-world Amazon product on a gift guide, not a mod' },
  cmim8uh5x00cwoxy8bx56f7fp: { contentType: null, why: 'E200 "Im-Peck-Able Bird Houses" — NULL, was accessories; functional birdhouse object mod; "houses" typed it lot; NULL beats a guess' },
  cmijo257400nqoxc8o1hugcr4: { contentType: null, why: 'E200 "Showgirl Era Drapes Walls" — NULL, was accessories; wallpaper set; "drapes" typed it curtains; no wall facet' },
  cmim91rea01nmoxy8qp7fxb8h: { contentType: 'skin', why: 'E200 "Jose Face Mask" — skin, was accessories; description: "a facial skin"; not a worn mask' },
  cmkyne0ud016coxhc267nt3l7: { contentType: 'shoes', why: 'E200 "Sims 4 70s CC Roller Skates" — shoes, was accessories; roller skates are footwear' },
  cmim9fhgl005moxqw8b9ejehc: { contentType: 'hats', why: 'E200 "Equestrian Riding Helmets" — hats, was accessories; riding helmets are headwear' },
  // ── Audited 2026-10-14 (Rowan, E207). The `eyes` and `makeup` grids (top 24
  //    by downloads on /mods and inside makeup-cc) carried masks, glasses, an
  //    animation, lash sets, nose presets and skins. Every row in `eyes` whose
  //    title names no eye colour / contact / iris, or names a lash / mask /
  //    slider / preset / face, and every `makeup` row whose title names a skin,
  //    overlay, preset, slider, necklace, teeth or vanity, was read by title,
  //    then its own description and download-URL category. NOT a rule fix:
  //    the 72 rows are wrong for ~10 different reasons (heterogeneous class).
  //    Catalog-wide counts behind the choices (title contains, 2026-10-14):
  //    "face tattoo" 15/15 tattoos; "gshade" 61/67 preset; "glasses" 47/64
  //    glasses; "overlay" 66/81 skin; "animation" 21/35 poses; "vanity" 7/13
  //    furniture; "teeth" 23 rows typed 9 ways (no teeth facet -> NULL).
  //    LASHES -> makeup, not `lashes`: 87 lash titles split makeup 35 /
  //    lashes 28 / eyes 10, and makeup-cc's contentTypeIn omits `lashes`, so
  //    `lashes` would drop them from the page whose copy promises lashes.
  //    FACE PRESETS -> `preset` (E186 lip-preset policy), even though 37 of 47
  //    "nose preset" titles sit in body-preset: the body-presets page is bodies.
  //    Two pinned keeps: Glimmer Catchlights (eyes), Dead Vibez (makeup, mixed).
  cmikiqstu004koxnatz0e88ye: { contentType: 'accessories', why: "E207 \"COD Ghost’s Mask\" — accessories, was eyes; worn mask (masks-cc, CurseForge create-a-sim); E200 mask policy" },
  cmikipx740043oxna79r7o8wx: { contentType: 'accessories', why: "E207 \"Magnolia C Ski Mask\" — accessories, was eyes; worn ski mask (masks-cc); E200 mask policy" },
  cmikiq7nq0048oxna8299hn9c: { contentType: 'accessories', why: "E207 \"Venetian Mask Columbina\" — accessories, was eyes; worn mask (masks-cc); siblings Venetian Mask/Bauta pinned accessories in E200" },
  cmikiqpoq004ioxna3yl3hbfy: { contentType: 'accessories', why: "E207 \"Ashwwa Fox Mask\" — accessories, was eyes; worn mask (masks-cc); E200 mask policy" },
  cmikippmy003yoxnanpgjmp50: { contentType: 'accessories', why: "E207 \"Cat Skull Mask\" — accessories, was eyes; worn mask (masks-cc); E200 mask policy" },
  cmikkiz5500b8ox330dn7sci4: { contentType: 'accessories', why: "E207 \"CyFi Net Mask\" — accessories, was eyes; lower-face mesh mask, TSR category sims4-accessories; desc \"face accessory\"" },
  cmijje8hp008coxs3yxxg2lq3: { contentType: 'skin', why: "E207 \"Bloody Vampire Face CC\" — skin, was eyes; blood face overlay (source slug \"bloody-face ... scar\"), a skin detail, not an eye colour" },
  cmik9shej00a0oxk7snter5af: { contentType: 'poses', why: "E207 \"Gossiping Animation Ver 1\" — poses, was eyes; paired animation (animations post); 21 of 35 \"animation\" titles are poses" },
  cmil0t9ic003roxee3v3kzuxx: { contentType: 'rugs', why: "E207 \"Random Rugs V2\" — rugs, was eyes; rugs (rugs-cc post); title says rugs" },
  cmim8tm7n0089oxy8vwmpzdux: { contentType: 'glasses', why: "E207 \"Miranda Y2K Glasses\" — glasses, was eyes; title says glasses (glasses-cc); 47 of 64 \"glasses\" titles are glasses" },
  cmim8tlvc0083oxy8c694xeda: { contentType: 'glasses', why: "E207 \"Kelly Sunglasses\" — glasses, was eyes; title says sunglasses (glasses-cc)" },
  cmim8tlxe0084oxy8w35srctl: { contentType: 'glasses', why: "E207 \"Oversized Frameless Sunglasses\" — glasses, was eyes; title says sunglasses (glasses-cc)" },
  cmim8tmg8008doxy897t2f1tc: { contentType: 'glasses', why: "E207 \"Cross-star Glasses\" — glasses, was eyes; title says glasses (glasses-cc)" },
  cmim8tln4007zoxy8ie9g16ma: { contentType: 'glasses', why: "E207 \"Paradox Glasses\" — glasses, was eyes; title says glasses (glasses-cc)" },
  cmim8tmv6008koxy8s2bkf5da: { contentType: 'glasses', why: "E207 \"Raymond Glasses\" — glasses, was eyes; title says glasses (glasses-cc)" },
  cmim8tmsx008joxy8ujuhvzuq: { contentType: 'glasses', why: "E207 \"Pretty in Pink – Heart Glasses\" — glasses, was eyes; title says glasses (glasses-cc)" },
  cmijqklkr002tox8o0guzsfmo: { contentType: 'tattoos', why: "E207 \"Android Face\" — tattoos, was eyes; desc \"android-themed face tattoo\"; 15 of 15 \"face tattoo\" titles are tattoos" },
  cmijptrm5018coxc8ff1479qy: { contentType: 'tattoos', why: "E207 \"Water Fairy Facepaint\" — tattoos, was eyes; desc \"a face tattoo\" (TSR costume makeup); face-tattoo class is tattoos" },
  cmim8w81h00n8oxy8z6e892fv: { contentType: null, why: "E207 \"Finnick\" — NULL, was eyes; a downloadable Sim (male-sims-download post); no facet fits; NULL beats a guess" },
  cmikk6fwz004yox33osr6j6pv: { contentType: 'wall-art', why: "E207 \"Boho Spiritual Tiles\" — wall-art, was eyes; wall art tiles, TSR paintingsposters; \"eyes\" was in the prose" },
  cmil2p89n0037oxpzzc4ujbso: { contentType: 'makeup', why: "E207 \"2D eyelashes A20\" — makeup, was eyes; lashes, not an eye colour; makeup (35 lash rows) keeps it on makeup-cc, which omits `lashes`" },
  cmim8vgi000iioxy8cuq1epd8: { contentType: 'makeup', why: "E207 \"2D Eyelashes\" — makeup, was eyes; infant lashes; makeup, as 2D eyelashes A20" },
  cmim9od1l00njoxy7n9moqejl: { contentType: 'makeup', why: "E207 \"Sims 4 Female Eyelashes\" — makeup, was eyes; lashes (eyelashes-cc); makeup, as 2D eyelashes A20" },
  cmim9oc5900n4oxy7dsjdv0l9: { contentType: 'makeup', why: "E207 \"Dramatic Sims 4 Eyelashes\" — makeup, was eyes; lashes (eyelashes-cc); makeup, as 2D eyelashes A20" },
  cmim9ocpj00ndoxy7ym8iktb7: { contentType: 'makeup', why: "E207 \"Sims 4 Short Eyelashes for Male Sims\" — makeup, was eyes; lashes (eyelashes-cc); makeup, as 2D eyelashes A20" },
  cmil2pb470039oxpzqauty0p5: { contentType: 'makeup', why: "E207 \"Maxis Match 2D Eyelashes N60\" — makeup, was eyes; lashes (eyelashes-cc-2); makeup, as 2D eyelashes A20" },
  cmim9oczk00nioxy70zzfpon4: { contentType: 'makeup', why: "E207 \"Sims 4 Mermaid CC Eyelashes\" — makeup, was eyes; lashes (eyelashes-cc); makeup, as 2D eyelashes A20" },
  cmigonxrn000woxkz4hm0ewnn: { contentType: 'makeup', why: "E207 \"Sims 4 Mermaid Eyelashes\" — makeup, was eyes; lashes (mermaid-cc); makeup, as 2D eyelashes A20" },
  cmigonlrv000qoxkz3141v9df: { contentType: 'makeup', why: "E207 \"Sims 4 Eyelashes for Mermaids\" — makeup, was eyes; lashes (mermaid-cc); makeup, as 2D eyelashes A20" },
  cmim9ocvn00ngoxy74aaoj6x6: { contentType: 'makeup', why: "E207 \"Sims 4 Maxis Match 3D Eyelashes Set\" — makeup, was eyes; lashes (eyelashes-cc); makeup, as 2D eyelashes A20" },
  cmim9jyqm002ooxy7b64rey0f: { contentType: 'preset', why: "E207 \"Sims 4 Eye Sliders\" — preset, was eyes; eyelid shape slider (sliders post); E186 slider -> preset" },
  cmijj22hv002loxs39fib12hv: { contentType: 'ui-preset', why: "E207 \"Easy on the Eyes GShade Preset\" — was eyes → preset; E272 (2026-10-25) → ui-preset: GShade/ReShade presets are `ui-preset` (lib/uiPresetRules.ts), moved with the other 94" },
  cmijpb77d00z6oxc8eyly9b68: { contentType: 'eyes', why: "E207 \"Glimmer Catchlights Collection\" — KEEP eyes: catchlights are an eye detail (desc \"make eyes look big and shiny\"); no eye word in title" },
  cmim9132u01j5oxy8982unpod: { contentType: 'skin', why: "E207 \"Sabrina Skin\" — skin, was makeup; title says skin; desc \"skin details and overlay version\" (skin-details post)" },
  cmim9fb9z004yoxqwiz7ofx0a: { contentType: 'skin', why: "E207 \"Ginevra Skin\" — skin, was makeup; title says skin; TSR category skindetails; 25 skin tones" },
  cmim913yj01jloxy8y0l6hi11: { contentType: 'skin', why: "E207 \"The Ladies Collection\" — skin, was makeup; desc \"a skin pack containing four skin overlays\" (skin-details post)" },
  cmijn1k3d00aioxc8opq4jo8k: { contentType: 'skin', why: "E207 \"Tres Beau: Lidiya Skin\" — skin, was makeup; title says skin; desc 12 skin shades (skin-overlay post)" },
  cmmvapj6d0056oxzgtufjzyp6: { contentType: 'skin', why: "E207 \"Natural To Makeup Skins\" — skin, was makeup; title says skins; desc \"sits in the Skin Details category\"" },
  cmim91r8m01njoxy8q2l3mmi2: { contentType: 'skin', why: "E207 \"Skin N14, Eye Masks, And Presets\" — skin, was makeup; skin named first; desc lists skins, then bonus presets (male-skin-details)" },
  cmijn1w1y00aroxc8evoeewk3: { contentType: 'skin', why: "E207 \"Avi Glam: Leon Skin\" — skin, was makeup; title says skin; 12 skin swatches (skin-overlay post)" },
  cmim8vfok00i4oxy8i4ufaxf2: { contentType: 'skin', why: "E207 \"Skin Details for Infants\" — skin, was makeup; title says skin details; mixed eyes/brows/skin set, skin is the named type" },
  cmim9142c01jnoxy8zw3t4mu0: { contentType: 'skin', why: "E207 \"Zaya Skin\" — skin, was makeup; title says skin; desc \"a full-body skin\"" },
  cmijn1ufp00aqoxc84lhokraa: { contentType: 'skin', why: "E207 \"Amalia Skin\" — skin, was makeup; title says skin; 18 natural tones + overlay" },
  cmim91qg601n6oxy8yrfmkhe2: { contentType: 'skin', why: "E207 \"Skin Presets\" — skin, was makeup; desc \"three different skin details\" plus presets (male-skin-details)" },
  cmim914eo01jtoxy8tfw5zbcv: { contentType: 'skin', why: "E207 \"Ashourina Skin\" — skin, was makeup; title says skin; desc face overlays and skins" },
  cmim91rgk01nnoxy8jfopus5x: { contentType: 'skin', why: "E207 \"Asia Skin Tone\" — skin, was makeup; title says skin tone; TSR category sims4-skintones" },
  cmijn1yqh00atoxc84mod1q4x: { contentType: 'skin', why: "E207 \"Rebel Gal: Candice Skin\" — skin, was makeup; title says skin; desc \"skin detail\", 10 skin shades" },
  cmim91r4o01nhoxy8rh9m5zlg: { contentType: 'skin', why: "E207 \"Finn Face Mask\" — skin, was makeup; desc \"realistic facial skin\"; Jose Face Mask (E200) precedent" },
  cmim91r2m01ngoxy8q54m0t94: { contentType: 'skin', why: "E207 \"Blake Face Mask\" — skin, was makeup; desc \"brown facial skin\", 6 colours; Jose Face Mask (E200) precedent" },
  cmkxz8mw1005koxhcigubdquh: { contentType: 'skin', why: "E207 \"Kids Vitiligo Beauty Skin Overlay\" — skin, was makeup; title says skin overlay; TSR category skindetails" },
  cmim91rx601nsoxy8x4u61kn3: { contentType: 'skin', why: "E207 \"Cogent Overlay\" — skin, was makeup; desc \"male skin details\", facial skin; 66 of 81 \"overlay\" titles are skin" },
  cmim913ur01jjoxy89jfhkf4c: { contentType: 'skin', why: "E207 \"Skylar Skin\" — skin, was makeup; title says skin; desc \"this skin detail comes in 22 swatches\"" },
  cmim9mil200fwoxy7hx869s9n: { contentType: 'skin', why: "E207 \"Acne Skin Detail CC\" — skin, was makeup; title says skin detail; acne overlay" },
  cmim91rah01nkoxy8efq07dw6: { contentType: 'skin', why: "E207 \"Antique Male Collection\" — skin, was makeup; desc skins in 40 shades + overlay (male-skin-details)" },
  cmika1kl400ffoxk7ixwq1e4l: { contentType: 'skin', why: "E207 \"Rebel Gal – Brooke Skin\" — skin, was makeup; title says skin; TSR category sims4-skintones" },
  cmijn1hs700agoxc8oibqlpre: { contentType: 'skin', why: "E207 \"Rosseta Skin\" — skin, was makeup; title says skin; desc \"this captivating overlay\", four tones" },
  cmsmd4cy9013ooxeu5mb2ef6y: { contentType: 'skin', why: "E207 \"Vitiligo Beauty Skin Overlay N2\" — skin, was makeup; title says skin overlay; desc \"in the skin details category\"" },
  cmim913sy01jioxy85l0bkkgz: { contentType: 'skin', why: "E207 \"Melissa Skin\" — skin, was makeup; title says skin; desc \"skin detail\"" },
  cmim91qea01n5oxy8ba1m23br: { contentType: 'skin', why: "E207 \"Cogent Skin\" — skin, was makeup; title says skin; desc \"a full-body skin\"" },
  cmijn2eqt00b3oxc8yxdaykg3: { contentType: 'skin', why: "E207 \"Lena Skin and Overlay\" — skin, was makeup; title says skin; TSR category sims4-skintones" },
  cmil2zrap007xoxpzme0xpnnh: { contentType: 'preset', why: "E207 \"Skylar Nose Preset\" — preset, was makeup; title says nose preset; E186 face preset -> preset (body-preset is bodies)" },
  cmil2zq15007woxpz0eaidyrg: { contentType: 'preset', why: "E207 \"Nose Preset 1\" — preset, was makeup; title says nose preset; E186 face preset -> preset" },
  cmil30nzo008goxpzmsbcal2c: { contentType: 'preset', why: "E207 \"Nose Preset 11\" — preset, was makeup; title says nose preset; E186 face preset -> preset" },
  cmim9jz73002woxy7pm7unxyk: { contentType: 'preset', why: "E207 \"Sims 4 Pouty Lip Slider\" — preset, was makeup; lip slider; E186 \"Pout Lip Slider\" -> preset" },
  cmim9fb7t004xoxqwrcc7zmqo: { contentType: 'preset', why: "E207 \"Lush – Lip Presets\" — preset, was makeup; title says lip presets; E186 lip preset -> preset" },
  cmik8zs9d0017oxk75483fu7e: { contentType: 'preset', why: "E207 \"Lip Preset 1\" — preset, was makeup; title says lip preset; E186 lip preset -> preset" },
  cmil3knb300froxpztioq7s6a: { contentType: 'jewelry', why: "E207 \"Angelika Necklace\" — jewelry, was makeup; title says necklace; desc layered necklace" },
  cmil1j6pc00evoxeeuqc3a3k4: { contentType: 'jewelry', why: "E207 \"Conway Necklace\" — jewelry, was makeup; title says necklace (jewelry-cc post)" },
  cmil15z6c009joxeefx4wb7dk: { contentType: 'furniture', why: "E207 \"Glamour Life Set\" — furniture, was makeup; desc \"luxe vanity collection\" of furniture and decor objects; 7 of 13 \"vanity\" titles are furniture" },
  cmknf9asf002woxolkdrnfoqg: { contentType: null, why: "E207 \"Growing Pains Child Teeth Set\" — NULL, was makeup; child teeth + braces overlays; teeth have no facet (23 titles typed 9 ways); NULL beats a guess" },
  cmim8vg9s00ieoxy8o7ogpbpr: { contentType: 'eyes', why: "E207 \"Infant Eyes\" — eyes, was makeup; title says eyes; 12 eye colours" },
  cmijjeg5c008hoxs3r9q9l87c: { contentType: 'makeup', why: "E207 \"Dead Vibez Vampire Skin Details CC\" — KEEP makeup: mixed scars/eyeliner/eyeshadow across categories; current type not wrong" },
  // E207 read-back found one more row in the makeup-cc composite top 24 (#17):
  cmknf91yr0027oxoljcxq23um: { contentType: 'hair', why: 'E207 "Seira Swoop V1 and V2" — hair, was eyebrows; desc "a sleek, side-swooped hairstyle" (hairstyles-cc post)' },
  // ── Audited 2026-10-15 (Rowan, E214). The rest of the makeup-cc composite:
  //    every row in `eyebrows` (198), `blush` (61), `lipstick` (36) and
  //    `eyeliner` (33) read by title; ambiguous ones by description and
  //    download URL. 110 wrong, for ~15 different reasons (skins, hairstyles,
  //    Sim downloads, lots, clothes, pose packs, CAS backgrounds) — a
  //    heterogeneous class, so `--ids` pins, not a rule. Catalog-wide counts
  //    behind the choices (title contains, 2026-10-15): "freckle" 12/18 skin,
  //    "mole" 15/21, "birthmark" 15/22, "vitiligo" 20/36, "wrinkle" 11/15,
  //    "skinblend" 15/17, " coat" 59/71 tops, "boots" 140/170 shoes, "skirt"
  //    54/122 bottoms (plurality), "jumpsuit" 44/51 full-body, " outfit"
  //    138/186 full-body, "pose pack" 363/405 poses, "map replacement" 10/20
  //    gameplay-mod. Sim downloads -> NULL (E207 policy). Mixed clothing sets
  //    whose pieces the description does not list -> NULL. KEEPS: contour and
  //    highlighter in `blush` (they sit in the CAS blush slot), a hairbase and
  //    forehead markings whose own descriptions say "blush category", two
  //    genetics sets that include blush, and a brow-led goth pack.
  cmmvapixk0052oxzga4pzbdq1: { contentType: "skin", why: "E214 \"Aïda Skin\" — skin, was eyebrows; title says skin (melanin-skin post)" },
  cmkq95d0g0016oxvgmfysfbhs: { contentType: "nails", why: "E214 \"3 Functional Press-On Nails & The Kimmy Hair\" — nails, was eyebrows; desc is 4 press-on nail sets; URL slug press-on-nails" },
  cmmvapnim005joxzgs60vrhlh: { contentType: "hair", why: "E214 \"Deion Juicy Two Strand Twists\" — hair, was eyebrows; twists hairstyle (black-hair post)" },
  cmmvaq004006koxzgulbiand2: { contentType: "skin", why: "E214 \"Tamara Skin\" — skin, was eyebrows; title says skin" },
  cmoipyafq0015oxkjzkj85dbd: { contentType: "hair", why: "E214 \"Serena V3 Hair Conversion\" — hair, was eyebrows; title says hair" },
  cmmvaphrb004ooxzgbr7vxto8: { contentType: "skin", why: "E214 \"Jade Skin\" — skin, was eyebrows; title says skin (melanin-skin post)" },
  cmmvapjcv0059oxzgkj0ro53h: { contentType: "skin", why: "E214 \"Bareface Pt5 Set\" — skin, was eyebrows; desc full-body melanin skin overlays (brow/browless options)" },
  cmmvaq0to006voxzgsbu5iyue: { contentType: "skin", why: "E214 \"Janelle Skin\" — skin, was eyebrows; title says skin" },
  cmmvaphtj004poxzgp3687py1: { contentType: "skin", why: "E214 \"Jamal Skin\" — skin, was eyebrows; title says skin (melanin-skin post)" },
  cmil1ou7i00hjoxee292n038g: { contentType: null, why: "E214 \"Yay, Female CC\" — NULL, was eyebrows; desc 3 bows + 2 nose presets, no brows; mixed, NULL beats a guess" },
  cmsmciokk00sfoxeurw7zbn8f: { contentType: "lot", why: "E214 \"Dentist & Plastic Surgery Offices\" — lot, was eyebrows; desc custom-built community lot" },
  cmoipyaao0013oxkjn1b286y2: { contentType: "hair", why: "E214 \"Tisane Hairstyle\" — hair, was eyebrows; title says hairstyle" },
  cmmvapib9004soxzgcx0txul9: { contentType: "skin", why: "E214 \"Savanna Skin\" — skin, was eyebrows; title says skin (melanin-skin post)" },
  cmknf9pwg003zoxolxr3dlzf4: { contentType: "gameplay-mod", why: "E214 \"CAS Close Up – No Emotions\" — gameplay-mod, was eyebrows; desc mod removing CAS facial animations (best-sims-4-mods post)" },
  cmsmd5qal014hoxeu48w8y6mk: { contentType: "skin", why: "E214 \"Juniper Creases Set\" — skin, was eyebrows; face creases (wrinkles-cc post); wrinkle titles 11/15 skin" },
  cmmvapifz004uoxzgftvry43v: { contentType: "skin", why: "E214 \"Samile Skin\" — skin, was eyebrows; title says skin" },
  cmim9jz15002toxy75oghz6fx: { contentType: "preset", why: "E214 \"Sims 4 Eyebrow Slider\" — preset, was eyebrows; slider (sliders post); E207 slider -> preset" },
  cmttzi798009goxfez2jwq08q: { contentType: "hair", why: "E214 \"Bathory Hair – Halloween Treat 1\" — hair, was eyebrows; title says hair (goth-hairstyle post)" },
  cmsmd4gns013roxeuaqtn4ztr: { contentType: "skin", why: "E214 \"Peachi Vitiligo V1\" — skin, was eyebrows; vitiligo skin detail; vitiligo titles 20/36 skin" },
  cmsmbbusl0059oxeurp74rlcn: { contentType: "tops", why: "E214 \"Sebastian Long Coat Men\" — tops, was eyebrows; coat; \" coat\" titles 59/71 tops" },
  cmoipyanr0018oxkj94wwqiu3: { contentType: "hair", why: "E214 \"Gwendolyn Hairstyle\" — hair, was eyebrows; title says hairstyle" },
  cmky03xa10089oxhca6ypq1tt: { contentType: "hair", why: "E214 \"Orangeade Children’s Braids Hair\" — hair, was eyebrows; title says hair" },
  cmsmd0eb3011ooxeul17awxcu: { contentType: "lot", why: "E214 \"Hampton’s Tennis Club\" — lot, was eyebrows; desc 40x40 community lot" },
  cmsmc6ibw00lpoxeu46j5co6g: { contentType: null, why: "E214 \"Marlon Sim\" — NULL, was eyebrows; a Sim download (male-sim-download post); E207 Sim -> NULL" },
  cmsmc6eqz00lmoxeuwaxh0zkw: { contentType: null, why: "E214 \"Etera Hone Sim\" — NULL, was eyebrows; a Sim download; E207 Sim -> NULL" },
  cmsmc67uu00lhoxeu6s32b8wf: { contentType: null, why: "E214 \"Nacho Sim\" — NULL, was eyebrows; a Sim download; E207 Sim -> NULL" },
  cmsmbmq9e00azoxeui4fwxtmq: { contentType: "hats", why: "E214 \"Cowboy Hat\" — hats, was eyebrows; title says hat" },
  cmsmbmei200aroxeu1qfw4f89: { contentType: "shoes", why: "E214 \"Rodeo Boots\" — shoes, was eyebrows; boots; \"boots\" titles 140/170 shoes" },
  cmmvaroe700auoxzgmvw3xzag: { contentType: "shoes", why: "E214 \"Sheer Kiss\" — shoes, was eyebrows; desc pointed pumps/heels set" },
  cmmvaphp6004noxzgmlfi8yzh: { contentType: "skin", why: "E214 \"Keeyah, Mari, Tati, and Kayah Skins\" — skin, was eyebrows; title says skins" },
  cmttzigbi00azoxfe6u6vl9b4: { contentType: "jewelry", why: "E214 \"Blahberry Pancake Iridescent Spiral Tapers\" — jewelry, was eyebrows; ear-gauge tapers (ear-gauge post)" },
  cmsmd6vmd014uoxeu2j5suxpi: { contentType: "skin", why: "E214 \"Betty Skin\" — skin, was eyebrows; title says skin (zombie post)" },
  cmsmd63t0014soxeuh2gtgwzg: { contentType: "skin", why: "E214 \"Forehead Wrinkles N01\" — skin, was eyebrows; wrinkles skin detail; wrinkle titles 11/15 skin" },
  cmsmd5ku8014doxeulg8kgec6: { contentType: "skin", why: "E214 \"Wrinkles 01–05\" — skin, was eyebrows; wrinkles skin detail" },
  cmsmd32ng013coxeutahct9gd: { contentType: "skin", why: "E214 \"Sunday Morning Skinblend – Unnatural Colors\" — skin, was eyebrows; skinblend; skinblend titles 15/17 skin" },
  cmsmcum9w00yloxeul5a9ywru: { contentType: "lot", why: "E214 \"Myshuno Salon & Spa\" — lot, was eyebrows; desc no-CC 30x30 lot (CurseForge rooms-lots)" },
  cmsmct2ne00xkoxeubtdxxueg: { contentType: "bottoms", why: "E214 \"Musa Skirt V. 2\" — bottoms, was eyebrows; skirt; \"skirt\" titles 54/122 bottoms (plurality)" },
  cmsmcsthf00xdoxeuseu001xi: { contentType: "bottoms", why: "E214 \"Soft Whisper Ruffle Skirt\" — bottoms, was eyebrows; skirt" },
  cmsmchwbz00rvoxeug4kf7t0c: { contentType: "dresses", why: "E214 \"Pirate Dress\" — dresses, was eyebrows; title says dress" },
  cmsmchttj00rtoxeuyai21sof: { contentType: "shoes", why: "E214 \"Pirate Boot\" — shoes, was eyebrows; boot" },
  cmsmc6srh00lxoxeuahdfm028: { contentType: null, why: "E214 \"Cole Sim Download\" — NULL, was eyebrows; a Sim download; E207 Sim -> NULL" },
  cmsmc6h0q00looxeuku6gcm1h: { contentType: null, why: "E214 \"Creed Sim\" — NULL, was eyebrows; a Sim download; E207 Sim -> NULL" },
  cmsmc65hg00lfoxeuath3mbis: { contentType: null, why: "E214 \"Tyler Sim\" — NULL, was eyebrows; a Sim download; E207 Sim -> NULL" },
  cmsmc5o3p00l9oxeuwyefa7ql: { contentType: "hair", why: "E214 \"Cam Braids\" — hair, was eyebrows; braids (male-cornrows post)" },
  cmsmbxr6n00guoxeuddw40tik: { contentType: "skin", why: "E214 \"Mole Pack 8\" — skin, was eyebrows; moles; \"mole\" titles 15/21 skin" },
  cmsmbxdxy00gkoxeu0puvsmki: { contentType: "skin", why: "E214 \"Details N92 Moles\" — skin, was eyebrows; moles skin detail" },
  cmsmbxb0q00gioxeulytofx5c: { contentType: "skin", why: "E214 \"Feeling Wicked Elphaba Freckles\" — skin, was eyebrows; freckles; \"freckle\" titles 12/18 skin" },
  cmsmbx2cq00gboxeu7eddvr2u: { contentType: "skin", why: "E214 \"Anthony Freckles\" — skin, was eyebrows; freckles skin detail" },
  cmsmbocw100c4oxeuojmcar7y: { contentType: "loading-screen", why: "E214 \"Cozy Nostalgic Living\" — loading-screen, was eyebrows; desc cozy loading-screen background (cozy-loading-screens post)" },
  cmsmbo0ek00bvoxeufwy8zx6t: { contentType: "loading-screen", why: "E214 \"Cozy Space Loading Screen\" — loading-screen, was eyebrows; title says loading screen" },
  cmsmbmaj500aooxeu351nf0gp: { contentType: "hats", why: "E214 \"The Cowboy Hat\" — hats, was eyebrows; title says hat" },
  cmsmbds8m006foxeu7ow1qgrb: { contentType: "shoes", why: "E214 \"Maxis Match Rain Boots\" — shoes, was eyebrows; boots" },
  cmsmbd549005xoxeu4igzfhrw: { contentType: null, why: "E214 \"Jasmine Set\" — NULL, was eyebrows; desc 5-piece set: 2 dresses, top, shorts, sandals; mixed, NULL beats a guess" },
  cmsmbd2s0005voxeu8a5y7vox: { contentType: "hair", why: "E214 \"Absolutely Hairstyle\" — hair, was eyebrows; title says hairstyle" },
  cmsmbcz2l005soxeu7ehd06x1: { contentType: "hair", why: "E214 \"Jackson Hairstyle\" — hair, was eyebrows; title says hairstyle" },
  cmsmb9udt0046oxeun029pd5b: { contentType: "skin", why: "E214 \"Soft Birthmark\" — skin, was eyebrows; birthmark; \"birthmark\" titles 15/22 skin" },
  cmsmb9kmt003yoxeuamyvisgo: { contentType: "skin", why: "E214 \"EA Birthmarks Conversions\" — skin, was eyebrows; birthmarks skin detail" },
  cmsmb9d9i003soxeua4e42s4j: { contentType: "skin", why: "E214 \"Birthmarks\" — skin, was eyebrows; birthmarks skin detail" },
  cmsmb9c3h003roxeun47e9725: { contentType: "skin", why: "E214 \"Heart Birthmarks\" — skin, was eyebrows; birthmarks skin detail" },
  cmoipyad20014oxkj40nwpmlu: { contentType: "hair", why: "E214 \"Kaitlyn Hairstyle Version 3\" — hair, was eyebrows; title says hairstyle" },
  cmmvaqf43007voxzgrqlxfxxc: { contentType: "shoes", why: "E214 \"Essential Boots Collection – Leather Heeled Ankle Boot\" — shoes, was eyebrows; ankle boot" },
  cmmvapikh004woxzg86y6cmva: { contentType: "skin", why: "E214 \"Blanca & Nicole Skins\" — skin, was eyebrows; title says skins" },
  cmmvapii9004voxzgi5nbx95u: { contentType: "skin", why: "E214 \"Jaden Skin\" — skin, was eyebrows; title says skin" },
  cmmvap7re003roxzgocknki66: { contentType: "hair", why: "E214 \"Hey, Sergeant!\" — hair, was eyebrows; desc 3 fade hairstyles" },
  cmky9iuyf00p2oxhcm326bxz2: { contentType: null, why: "E214 \"Mila Clothes Set\" — NULL, was eyebrows; clothes set, pieces not listed; NULL beats a guess" },
  cmky90iye00nhoxhc2hghw4iq: { contentType: null, why: "E214 \"The Brownstone Collection Part 1\" — NULL, was eyebrows; desc generic, no item named; NULL beats a guess" },
  cmku7gg8i003woxkzuyk0oqsp: { contentType: "hair", why: "E214 \"Kenny Hair Set\" — hair, was eyebrows; title says hair" },
  cmktsvoca003ooxol75z0a6wr: { contentType: "furniture", why: "E214 \"Janna Dining Room Set\" — furniture, was eyebrows; dining room set (modcollective collection)" },
  cmttzgp4p0012oxfebnqqfpfs: { contentType: "eyebrows", why: "E214 \"Alloy Pack\" — KEEP: desc leads with 4 eyebrow styles (+2 piercings, glasses); current type not wrong" },
  cmmvapjas0058oxzg1igadsxm: { contentType: "skin", why: "E214 \"Baddie Skinpack V1\" — skin, was blush; skinpack (melanin-skin post)" },
  cmmvapit90050oxzgiyrmhkcn: { contentType: "skin", why: "E214 \"Butter Skin\" — skin, was blush; title says skin" },
  cmsmbzsj400huoxeu5zy0ze3r: { contentType: "poses", why: "E214 \"Graduation Pose Pack\" — poses, was blush; pose pack; \"pose pack\" titles 363/405 poses" },
  cmmvapir4004zoxzg29vkahie: { contentType: "skin", why: "E214 \"Nova Girls Collection\" — skin, was blush; desc skins + skin overlays (+ tray Sims)" },
  cmkyikfi3010woxhcefun4rxu: { contentType: null, why: "E214 \"2 Yes I Do Wedding Collection\" — NULL, was blush; wedding set; \"blush\" is a colour in the desc; items not listed; NULL beats a guess" },
  cmsmc7g6i00m4oxeup8ljeipq: { contentType: "gameplay-mod", why: "E214 \"Sulani “Sunrise” Realistic Map Replacement\" — gameplay-mod, was blush; map replacement; titles 10/20 gameplay-mod" },
  cmsmbwvfb00g7oxeuy7mkd56u: { contentType: "skin", why: "E214 \"Freckles N2\" — skin, was blush; freckles skin detail" },
  cmsmbgaqb007ooxeusals3btq: { contentType: null, why: "E214 \"Base Game Addon, Part 3\" — NULL, was blush; desc mixed build-and-buy expansion; NULL beats a guess" },
  cmsmd44xk013joxeuuy9qr1r5: { contentType: "skin", why: "E214 \"Vitiligo\" — skin, was blush; vitiligo skin detail" },
  cmsmd41kb013goxeuynhe292i: { contentType: "skin", why: "E214 \"Oneiric Vitiligo Updated for Infants\" — skin, was blush; vitiligo skin detail" },
  cmsmd0icn011roxeut3923sml: { contentType: "poses", why: "E214 \"Tennis Pose Pack\" — poses, was blush; pose pack" },
  cmsmcijse00sboxeukm2nzncg: { contentType: "gameplay-mod", why: "E214 \"Who’s Your Surgeon? – The Plastic Vision Board Series\" — gameplay-mod, was blush; desc storytelling mod: social interactions + trait" },
  cmsmbx4t600gdoxeu5fmsz77y: { contentType: "skin", why: "E214 \"Details N62 V2 Freckles\" — skin, was blush; freckles skin detail" },
  cml5sivba003goxxr9o7az6yt: { contentType: "dresses", why: "E214 \"Victorian Silk Brocade Gown\" — dresses, was blush; gown" },
  cml5s41f0000ioxl1956qar83: { contentType: "hair", why: "E214 \"S-Club 080725 Wavy Ponytail Hair\" — hair, was blush; title says hair; URL map hair" },
  cmsmd2srw0134oxeu4e75fu7g: { contentType: "skin", why: "E214 \"Of The Earth – Plantsim Stuff\" — skin, was blush; desc skins, overlays, vines (unnatural-skin-tones post)" },
  cmsmcwbp700zioxeuzwhuty30: { contentType: "skin", why: "E214 \"Life’s A Beach Sunburn Scar\" — skin, was blush; desc full-body sunburn skin detail" },
  cmsmcvz4o00z9oxeuskysrd4p: { contentType: "skin", why: "E214 \"Nose Cuts\" — skin, was blush; desc facial scar detail (scars post)" },
  cmsmctu1q00y4oxeubkyvcd3t: { contentType: "tops", why: "E214 \"Sweater Ruffle Easy\" — tops, was blush; sweater" },
  cmsmctswq00y3oxeun50rhwje: { contentType: "dresses", why: "E214 \"Bustier Ruffle Long Dress\" — dresses, was blush; title says dress" },
  cmsmcfjfp00qkoxeupeoz0wiw: { contentType: "full-body", why: "E214 \"Tasha Outfit\" — full-body, was blush; outfit; \" outfit\" titles 138/186 full-body" },
  cmsmbx8nf00ggoxeub4fbg59q: { contentType: "skin", why: "E214 \"Loren Freckles N03\" — skin, was blush; freckles skin detail" },
  cmsmbpyt000croxeu1ghtp3df: { contentType: null, why: "E214 \"Disability Awareness\" — NULL, was blush; desc tees, crutches and poses; mixed, NULL beats a guess" },
  cmsmbkz1600a6oxeuec8c1igj: { contentType: null, why: "E214 \"Cinnamoroll & Mocha Recolor Pajama Set\" — NULL, was blush; desc pajamas + accessories; pajama titles split 23 full-body / 12 tops; NULL beats a guess" },
  cmsmbkmwg009xoxeuyn5v4mpt: { contentType: null, why: "E214 \"VIP Coquette Collection\" — NULL, was blush; desc CAS clothing set, items not listed; NULL beats a guess" },
  cmsmb89uq003aoxeu9ssc7tjv: { contentType: "decor", why: "E214 \"Unicorn Birthday CC\" — decor, was blush; desc 19 party decor objects + cake" },
  cmsmb5o1y0023oxeu8ef35m0r: { contentType: "decor", why: "E214 \"It’s a Girl!! Baby Shower Build\" — decor, was blush; desc party decor, balloons, signage, seating" },
  cmmvarth300bmoxzgt4x6j9ql: { contentType: "cas-background", why: "E214 \"Solid Pinks Set 2 CAS Backgrounds\" — cas-background, was blush; title says CAS backgrounds" },
  cmmvarmvo00a9oxzg5w1thga9: { contentType: "full-body", why: "E214 \"One-Shoulder Fitted Jumpsuit\" — full-body, was blush; jumpsuit; titles 44/51 full-body" },
  cmmvaq18y0070oxzgd90k0yli: { contentType: null, why: "E214 \"CS Madman Summer Set\" — NULL, was blush; desc tees + shorts + accessories; mixed, NULL beats a guess" },
  cmmvapo05005poxzgwcbh12sx: { contentType: "hair", why: "E214 \"Cheetah Print Hair\" — hair, was blush; title says hair" },
  cml5siuzl003doxxrm04g4d94: { contentType: "dresses", why: "E214 \"Otsuka Vintage Dress\" — dresses, was blush; title says dress" },
  cml5siu480034oxxrrjq7f3av: { contentType: "wall-art", why: "E214 \"Timeless Grace\" — wall-art, was blush; desc Victorian prints/paintings" },
  cmkyir4ab011goxhcmdryuclg: { contentType: "decor", why: "E214 \"Sims 4 Wedding Arches\" — decor, was blush; TSR sets-objects-miscellaneous; wedding arch objects" },
  cmkxzafev005qoxhc3jkonsf3: { contentType: "skin", why: "E214 \"Contouring Skin Details Mod\" — skin, was blush; TSR category makeup-female-skindetails" },
  cmil2khg2000noxpzy4z8alyf: { contentType: "blush", why: "E214 \"Face Contour CC Pack\" — KEEP: contour is cheek makeup that sits in the CAS blush slot" },
  cmmvashrg00epoxzgwkqi5jkk: { contentType: "blush", why: "E214 \"Bonnie Hairbase\" — KEEP: desc \"found in the makeup category under blush\"" },
  cmsmbqsa700ddoxeuqcki611h: { contentType: "blush", why: "E214 \"Albino Dream – Set of Genetics\" — KEEP: mixed genetics set incl. blushes; current type not wrong" },
  cmqpy1124006koxee5ad76s24: { contentType: "blush", why: "E214 \"September Set of Genetics\" — KEEP: mixed genetics set incl. moles-with-blush; current type not wrong" },
  cmttzgopg000woxfesqm5nahq: { contentType: "blush", why: "E214 \"Oh My Goth – Forehead Markings 2\" — KEEP: desc + TSR category say blush slot" },
  cmsmbt09900egoxeutsnm69zh: { contentType: "blush", why: "E214 \"Eye Patches\" — KEEP: under-eye skincare patches in CAS makeup slots; not the pirate eye patch" },
  cmkyazkef00rpoxhctja2e5ic: { contentType: "blush", why: "E214 \"Sims 4 Makeup Highlighter\" — KEEP: highlighter sits in the CAS blush slot" },
  cmkyare5p00r2oxhcxmuehtha: { contentType: "blush", why: "E214 \"1 Cheek Highlighter CC\" — KEEP: cheek highlighter, blush slot" },
  cmmvartle00booxzgclaurjno: { contentType: "cas-background", why: "E214 \"Kiss Mark CAS Background\" — cas-background, was lipstick; title says CAS background" },
  cmsmd4e5d013poxeuhxn5m6t6: { contentType: "skin", why: "E214 \"Camryn & Nala Vitiligo Skinpack\" — skin, was lipstick; skinpack (vitiligo post)" },
  cmsmbm9cp00anoxeuu294harr: { contentType: null, why: "E214 \"The Rodeo Set\" — NULL, was lipstick; desc clothing + accessories + a lipstick; mixed, NULL beats a guess" },
  cmmvartps00bqoxzge4uev95b: { contentType: "cas-background", why: "E214 \"Spicy Valentine CAS Backgrounds\" — cas-background, was lipstick; title says CAS backgrounds" },
  cmttzgyh5002aoxfek2g89925: { contentType: null, why: "E214 \"Nicki Minaj – The Sims 4\" — NULL, was eyeliner; a celebrity Sim download; E207 Sim -> NULL" },
  cmsmcw3z500zdoxeuxjpp8yl5: { contentType: "skin", why: "E214 \"Geralt Scars V1\" — skin, was eyeliner; facial scars (scars post)" },
  cmsmcvwaa00z7oxeutfluv7w2: { contentType: "skin", why: "E214 \"Scars 2\" — skin, was eyeliner; facial scars (scars post)" },

  // ── Audited 2026-10-16 (Sage, E217) — the three off-type cards in the top
  //    30 of /games/sims-4/skin-details/ (388 `skin` rows, grid order
  //    downloadCount desc), found during the E210 retitle (top-30 21/30 by
  //    title). Each was read against its own title, description and source
  //    post; all three were typed `skin` by the shared blog-post description,
  //    not by anything in the title. `--ids` pins, not a rule: three rows,
  //    three different causes. Catalog counts behind the targets (2026-10-16):
  //    /sims-4-lighting-mods/ rows are 6 gameplay-mod / 4 lighting / 3 NULL /
  //    2 skin / 1 cas-background / 1 hair — `lighting` is the light-FIXTURE
  //    facet (#61 cleared GShade presets and overlays out of it), so a
  //    lighting MOD goes to gameplay-mod with the plurality; swimsuit/bikini/
  //    swimwear titles are 37/67 full-body (the detector's own full-body
  //    keyword list names all three words). The Patreon source behind
  //    "1 Plumb Lippiez" returns 403 and its description is scraper
  //    boilerplate; "lippiez" is slang for lips and the catalog splits lip
  //    titles 63 makeup / 30 lipstick / 17 preset — a lip preset and a lip
  //    gloss are different facets, so NULL beats a guess. Same-shape row
  //    OUTSIDE the top 30 and deliberately not touched here (Rowan's scope):
  //    "Gentle CAS Lighting" is also `skin` from the lighting-mods post.
  cmijj9pxb006coxs3hrov7y67: { contentType: "gameplay-mod", why: "E217 \"Luumia’s No Gloom / No Blu\" — gameplay-mod, was skin; desc: \"I like using this lighting mod\" — removes the indoor blue/grey tint (lighting-mods post, 6/17 rows gameplay-mod); card #15 on skin-details" },
  cmim8wygv00syoxy87lzrqrja: { contentType: "full-body", why: "E217 \"Brandy x Plastic “The Island Gyal Collection”\" — full-body, was skin; desc: \"sexy and revealing swimsuits\" (swimsuit-cc post); swim titles 37/67 full-body; \"skin\" in the desc is the Sims' skin, not CC; card #19 on skin-details" },
  cmkxfu1bw0015oxj30ub93y26: { contentType: null, why: "E217 \"1 Plumb Lippiez\" — NULL, was skin; Patreon source 403, desc is NoNvme Studios boilerplate; lips, but preset vs lipstick vs gloss is unknowable from the title; NULL beats a guess; card #22 on skin-details" },
  cmik9xy3k00d1oxk7ijz6orjd: { contentType: "skin", why: "E217 \"Girls Night Set\" — KEEP: desc \"a cozy collection of sleepwear and skin presets\" — mixed set that does include skin presets; current type not wrong; card #7 on skin-details" },
  // ── Audited 2026-10-16 (Rowan, E221). Every row in `lashes` (41, Sims 4,
  //    SFW) read by title, then description + download URL, BEFORE `lashes`
  //    joins makeup-cc's `contentTypeIn` (it would otherwise put Kosmo Grillz
  //    at #18 of that grid). 19 wrong for ~10 reasons (jewelry, Sim downloads,
  //    scars, a fence, a loading screen, clothes) — heterogeneous, so `--ids`
  //    pins. NOT made `titleOnly` (measured, rejected): a whole-catalog replay
  //    of the ingest resolver with the flag on changes 4 of 16,903 answers,
  //    and 2 of those are Sim downloads that move lashes -> lipstick / hair,
  //    i.e. still wrong. The live class is "a Sim download's description
  //    lists its CAS parts", not the lashes rule.
  //    Same policies as E214: Sim downloads -> NULL, scars -> skin, mixed
  //    clothing sets -> NULL. Catalog title counts (2026-10-16): "costume"
  //    24/36 full-body, "apron" 13/32 full-body (plurality), "fence" 8/19 decor
  //    (8 NULL), "beard" 49/51 beard, "loading screen" 181/212.
  cmmvapzxk006joxzg7isekbcf: { contentType: "jewelry", why: "E221 \"Kosmo Grillz Collection\" — jewelry, was lashes; desc metallic gold/diamond grillz accessory; the one other grillz title is jewelry" },
  cmmvaq11e006yoxzgr2cgywby: { contentType: "jewelry", why: "E221 \"Swap Meet Collection: Rolex Jewelry\" — jewelry, was lashes; title says jewelry" },
  cmmvaq07z006moxzgv1t56xk7: { contentType: "jewelry", why: "E221 \"Clever Boy Chain\" — jewelry, was lashes; desc diamond clover necklace + pendant" },
  cmmvapo2d005qoxzg8yjye8uz: { contentType: "hair", why: "E221 \"Cieanna Hair / Messy Bun Half Up\" — hair, was lashes; title says hair" },
  cmttzgzel002ooxfe6b4qs9gq: { contentType: null, why: "E221 \"Nicki Minaj Sim\" — NULL, was lashes; a celebrity Sim download; E207 Sim -> NULL" },
  cmttzgs2y001eoxfei8qnc5pp: { contentType: null, why: "E221 \"Cardi B – The Sims 4\" — NULL, was lashes; a ready-made Sim + CC list; E207 Sim -> NULL" },
  cmsmcvme800z0oxeum6j8d2ku: { contentType: "skin", why: "E221 \"Random Arm (and Hand) Scars\" — skin, was lashes; body scars (scars post), as E214 scars" },
  cmsmcvcll00ysoxeu77ud56g1: { contentType: "skin", why: "E221 \"Tattoo Facial Scars\" — skin, was lashes; facial scars (scars post), as E214 Geralt Scars" },
  cmkylsbk1014eoxhcjwojzfae: { contentType: null, why: "E221 \"Flashback ’80 Collection\" — NULL, was lashes; set: t-shirt, skirt, sweater, jean, dress; mixed, NULL beats a guess" },
  cmsmbklsk009woxeucd1r249e: { contentType: null, why: "E221 \"Coquette Collection\" — NULL, was lashes; CAS pack of unlisted clothing pieces; NULL beats a guess" },
  cmsmcyuw3010poxeuf8awuybc: { contentType: "full-body", why: "E221 \"The Flash Costume\" — full-body, was lashes; desc full-body suit; costume titles 24/36 full-body" },
  cmsmb2tnt000poxeu87vqq5v6: { contentType: "full-body", why: "E221 \"Artist’s Apron\" — full-body, was lashes; apron titles 13/32 full-body (plurality)" },
  cmkyno6xa0178oxhc7yad35ke: { contentType: "tops", why: "E221 \"Midnight Lashes Top\" — tops, was lashes; a top named Midnight Lashes; source category CAS - Clothing" },
  cmkxy0cuj001qoxhc54xmurzg: { contentType: "beard", why: "E221 \"The Scarred Beard\" — beard, was lashes; desc facial hair category; beard titles 49/51" },
  cmsmcdbdp00paoxeu6nrolidp: { contentType: "loading-screen", why: "E221 \"TS4 Classy Towers Night Loading Screen\" — loading-screen, was lashes; title says loading screen" },
  cmsmcusx100yqoxeu0no5qyed: { contentType: "furniture", why: "E221 \"Glow Makeup Studio Pack\" — furniture, was lashes; desc 16-item salon set: retail counter, makeup table, shelves" },
  cmsmbvbct00floxeu0z03i84f: { contentType: "decor", why: "E221 \"Calm Splash\" — decor, was lashes; TSR buildmode-fencesgates; fence titles 8/19 decor (plurality)" },
  cmmvaptnd0068oxzg8pb69tog: { contentType: null, why: "E221 \"Default Flashcards Replacement\" — NULL, was lashes; a toddler-object texture override; no facet fits, NULL beats a guess" },
  cmkxz0sxj004woxhcgg0o6l8t: { contentType: "lashes", why: "E221 \"Toddler Slim 3D Eyelashes\" — KEEP: title says eyelashes; TSR files it under glasses, which is wrong" },
  cmim8ti00007noxy876bn76js: { contentType: "lashes", why: "E221 \"2D Eyelash Ultimate Collection\" — KEEP: 58 drawn-on lashes for the Lovestruck lash slot; desc calls them eyeliner-like, title wins" },
  cmim8zl800190oxy8eob8efci: { contentType: "lashes", why: "E221 \"Mix and Match Flower Lashes\" — KEEP: lashes with flower tips; source category CAS - Accessories is wrong" },
  // ── Audited 2026-10-17 (Rowan, E228). Next two posts in the E186
  //    URL-category disagreement queue, every row read by title, then
  //    description + download-URL category. /sims-4-food-clutter-cc/: 7 of 7
  //    disagreeing rows are food clutter typed from prose (residential,
  //    workout, makeup, glasses, shoes, full-body) -> clutter.
  //    /sims-4-male-accessories-cc/: 13 of 13 disagreeing rows are worn
  //    accessories typed as clothes/build -> hats 7, accessories 4, glasses 1,
  //    jewelry 1; plus 1 ADD from NULL (Basecap Set -> hats). Kept as-is: every
  //    'ok' row; Nickname Urban Techwear Set stays NULL (an outfit set).
  //    Six different source types, so `--ids` pins, never a facet-wide pass.
  cmim8xram00ydoxy8msy12mhz: { contentType: "accessories", why: "E228 \"Accessories Collections 03 For TS4\" — accessories, was furniture (/sims-4-male-accessories-cc/); title says accessories; desc 'gothic accessory … wardrobe'" },
  cmim8xqxi00y6oxy8qlaghtij: { contentType: "hats", why: "E228 \"Ade-caleb Bandana\" — hats, was full-body (/sims-4-male-accessories-cc/); TSR category sims4-accessories-male-hats" },
  cmim8xqbq00xvoxy8abt4we2z: { contentType: "hats", why: "E228 \"Archivefaction Cap With Barbed Wire\" — hats, was dresses (/sims-4-male-accessories-cc/); title says cap" },
  cmim8xqju00xzoxy8ah13w5mk: { contentType: "hats", why: "E228 \"Backward Strapped Baseball Hat\" — hats, was full-body (/sims-4-male-accessories-cc/); title says hat" },
  cmim8xpr900xloxy81d5xheu7: { contentType: "jewelry", why: "E228 \"Constant Necklace Male\" — jewelry, was tops (/sims-4-male-accessories-cc/); title says necklace" },
  cmim8xqhh00xyoxy8ihal6xmr: { contentType: "hats", why: "E228 \"FM & M Street Bucket Hats\" — hats, was full-body (/sims-4-male-accessories-cc/); title says hats" },
  cmim8xr4s00yaoxy8b3eqi08k: { contentType: "accessories", why: "E228 \"Insolence Headphones\" — accessories, was tops (/sims-4-male-accessories-cc/); headphones; the 2 other headphones on this post are accessories" },
  cmim8xr3000y9oxy8uajbqzos: { contentType: "glasses", why: "E228 \"Lexel Gravity\" — glasses, was tops (/sims-4-male-accessories-cc/); TSR category sims4-accessories-female-glasses; desc 'sunglasses accessory pack'" },
  cmim8xqlo00y0oxy8bf2tvhe9: { contentType: "hats", why: "E228 \"Merc Hat\" — hats, was full-body (/sims-4-male-accessories-cc/); title says hat" },
  cmim8xqpr00y2oxy8mrsgks9u: { contentType: "hats", why: "E228 \"Nike Hats\" — hats, was full-body (/sims-4-male-accessories-cc/); title says hats" },
  cmim8xqnw00y1oxy8inx50h5g: { contentType: "hats", why: "E228 \"Snapbacks\" — hats, was full-body (/sims-4-male-accessories-cc/); snapbacks are caps" },
  cmim8xq7w00xtoxy85m2qn24r: { contentType: "accessories", why: "E228 \"Sport Smartwatch For Men\" — accessories, was decor (/sims-4-male-accessories-cc/); TSR category sims4-accessories; the 3 other watches on this post are accessories (watches value question still open)" },
  cmim8xr8m00ycoxy8p5hf5r2n: { contentType: "accessories", why: "E228 \"Wireless Earphones\" — accessories, was full-body (/sims-4-male-accessories-cc/); earphones; same as the post's headphones" },
  cmim8xqdr00xwoxy8n1uy35pc: { contentType: "hats", why: "E228 \"Daydreamin’ Diy Basecap Set\" — hats, was null (/sims-4-male-accessories-cc/); ADD from NULL: basecap = baseball cap; desc 'male Sim's wardrobe … 100 colors'" },
  cmijj5dtc0044oxs31yl0ltu1: { contentType: "clutter", why: "E228 \"Chobani Set\" — clutter, was workout (/sims-4-food-clutter-cc/); yogurt cups; desc 'Greek yogurt clutter'" },
  cmijj5f9a0045oxs3yxj26u2x: { contentType: "clutter", why: "E228 \"Form And Function Preserves\" — clutter, was residential (/sims-4-food-clutter-cc/); pantry jars; TSR category decor-clutter" },
  cmijj5idi0047oxs32ee74nu5: { contentType: "clutter", why: "E228 \"Gelatteria Desserts\" — clutter, was full-body (/sims-4-food-clutter-cc/); display cakes/pies; desc 'pastry-shop clutter'" },
  cmijj5tfe004doxs3pj6js7h8: { contentType: "clutter", why: "E228 \"Home Cafeteria Goodies\" — clutter, was residential (/sims-4-food-clutter-cc/); desc '18 decorative … food clutter cc pieces'" },
  cmijj5r65004coxs3zrjxrprt: { contentType: "clutter", why: "E228 \"Laila Drinks\" — clutter, was glasses (/sims-4-food-clutter-cc/); 10 decorative beverages; desc 'clutter cc'" },
  cmijj5nn7004aoxs3h1feiheu: { contentType: "clutter", why: "E228 \"Random Foods Part 2\" — clutter, was makeup (/sims-4-food-clutter-cc/); desc 'This clutter set includes packaged snacks'" },
  cmijj59vt0041oxs33yww3p6x: { contentType: "clutter", why: "E228 \"Vogue Tray Boot Sushi Decor\" — clutter, was shoes (/sims-4-food-clutter-cc/); sushi boat ('Boot' is the title's typo for Boat); TSR category decor-clutter" },
  // ── Audited 2026-10-18 (Rowan, E235). Next two posts in the E186 URL-category
  //    disagreement queue, every row read by title (download-URL category or the
  //    row's OWN description only where the title names nothing):
  //    /sims-4-accessories-cc/ 10 DIS + 1 NULL ADD + 2 glasses-typed headsets;
  //    /sims-4-male-shoes-cc/ 12 DIS, all footwear. Plus the clutter top-30
  //    off-facet audit: 6 room sets / big appliances -> furniture, 1 keep.
  //    Kept unpinned: every other 'ok' row; "CC Pack" (shoes, title names nothing).
  //    Seven different source types, so `--ids` pins, never a facet-wide pass.
  cmil1kwwn00ftoxeeoellv9oh: { contentType: "nails", why: "E235 \"Basic Nails Updated To Fingernails Category\" — KEEP: title says nails; nails CC on an accessories post (DIS only by URL family) (/sims-4-accessories-cc/)" },
  cmil1l71j00fzoxeev8r9n7fo: { contentType: "jewelry", why: "E235 \"Clove Necklace\" — jewelry, was gameplay-mod; title says necklace (/sims-4-accessories-cc/)" },
  cmil1maqc00ghoxee08pi3xg3: { contentType: "jewelry", why: "E235 \"Exile Piercings\" — jewelry, was gameplay-mod; title says piercings (jewelry-cc holds piercings) (/sims-4-accessories-cc/)" },
  cmil1ltu300g9oxeeclj6p0lx: { contentType: "jewelry", why: "E235 \"Hand Catenay N01\" — jewelry, was tops; title is TSR's 'hand catenary' (chain); TSR category sims4-accessories-female-bracelets (/sims-4-accessories-cc/)" },
  cmil1lmdi00g6oxeers3rosxr: { contentType: "accessories", why: "E235 \"Lin Dian Earmuffs\" — accessories, was full-body; title says earmuffs (same as the two E154 earmuff pins) (/sims-4-accessories-cc/)" },
  cmil1l5nj00fyoxee96084wk5: { contentType: "jewelry", why: "E235 \"LL Necklace\" — jewelry, was dresses; title says necklace (/sims-4-accessories-cc/)" },
  cmil1m74700gfoxeeabljuumz: { contentType: "jewelry", why: "E235 \"Pink Romantic Earrings\" — jewelry, was tops; title says earrings (/sims-4-accessories-cc/)" },
  cmil1lhbm00g4oxeee6gftfx4: { contentType: "hats", why: "E235 \"Sade Bandana Early Access\" — hats, was furniture; title says bandana; desc 'headpiece'; same as E228 Ade-caleb Bandana (/sims-4-accessories-cc/)" },
  cmil1lx2j00gboxeeg3nsfqvo: { contentType: "accessories", why: "E235 \"Tonya Watch\" — accessories, was skin; title says watch; watches -> accessories as in E228 (watches value question still open) (/sims-4-accessories-cc/)" },
  cmil1lfvp00g3oxee8y904s5t: { contentType: "accessories", why: "E235 \"Waist Chain 02\" — accessories, was full-body; body chain; `chain` is a rejected jewelry keyword (31/7), so generic accessories, not jewelry (/sims-4-accessories-cc/)" },
  cmil1m8o000ggoxeeo0e1hbek: { contentType: "jewelry", why: "E235 \"Nihil Nose Chains\" — jewelry, was null; ADD from NULL: title names a nose piece; desc 'piercing set' (/sims-4-accessories-cc/)" },
  cmil1lvc600gaoxee07pzfwo8: { contentType: "accessories", why: "E235 \"Airpod Ribbon Headset\" — accessories, was glasses; a headset, not eyewear (E228 headphones -> accessories) (/sims-4-accessories-cc/)" },
  cmil1lqll00g8oxeehcqvq1ow: { contentType: "accessories", why: "E235 \"Claire Headphones\" — accessories, was glasses; title says headphones (E228 headphones -> accessories) (/sims-4-accessories-cc/)" },
  cmim8zg5b0182oxy8hjljluwe: { contentType: "shoes", why: "E235 \"Clog Sandals\" — shoes, was dresses; title says clog sandals (/sims-4-male-shoes-cc/)" },
  cmim8zfyu017zoxy8q60rp7yd: { contentType: "shoes", why: "E235 \"Concrete Set\" — shoes, was tops; title names no type, but its own (not shared) desc names Timberland-style boots; 391 dl (/sims-4-male-shoes-cc/)" },
  cmim8zhb9018joxy8gcu6aoi9: { contentType: "shoes", why: "E235 \"Corey Trainers\" — shoes, was workout; trainers are sneakers (/sims-4-male-shoes-cc/)" },
  cmim8zhpl018poxy8eym8ew58: { contentType: "shoes", why: "E235 \"Cowboy Boots\" — shoes, was bottoms; title says boots (/sims-4-male-shoes-cc/)" },
  cmim8zh2c018goxy8yt9rgsub: { contentType: "shoes", why: "E235 \"Cyberpunk Boots\" — shoes, was bottoms; title says boots (/sims-4-male-shoes-cc/)" },
  cmim8zhrs018qoxy8giz5abbs: { contentType: "shoes", why: "E235 \"Free Collection\" — shoes, was dresses; title names no type, its own desc: BeckySims Uggs shoe set (/sims-4-male-shoes-cc/)" },
  cmim8zgdt0186oxy8rf1qnqcx: { contentType: "shoes", why: "E235 \"Hockey Skates\" — shoes, was clutter; worn skates; TSR category sims4-shoes-male-elder (/sims-4-male-shoes-cc/)" },
  cmim8zgnz018aoxy8iccqopym: { contentType: "shoes", why: "E235 \"Leather Shoes For Male Sims\" — shoes, was bottoms; title says shoes (/sims-4-male-shoes-cc/)" },
  cmim8zhl9018noxy8iz9g07tb: { contentType: "shoes", why: "E235 \"Male Loafers\" — shoes, was dresses; title says loafers (/sims-4-male-shoes-cc/)" },
  cmim8zggk0187oxy8klo155d0: { contentType: "shoes", why: "E235 \"Nao Shoes\" — shoes, was workout; title says shoes (/sims-4-male-shoes-cc/)" },
  cmim8zh7x018ioxy8xrbq4ti8: { contentType: "shoes", why: "E235 \"New Balance\" — shoes, was furniture; a sneaker brand; Patreon post new-balance-530 (/sims-4-male-shoes-cc/)" },
  cmim8zglz0189oxy8pfe2j9dg: { contentType: "shoes", why: "E235 \"Slippers\" — shoes, was bottoms; title says slippers (/sims-4-male-shoes-cc/)" },
  cmikj0kwq0097oxnaijjvgahu: { contentType: "furniture", why: "E235 \"Inviciview Wall TV\" — furniture, was clutter (clutter #4); a wall-mounted TV object" },
  cmikk9i7b006oox33q8inutrj: { contentType: "furniture", why: "E235 \"Functional Washers and Dryers\" — furniture, was clutter (clutter #6); large appliances, like the E120 fridges" },
  cmky6trx500h5oxhck3jvq2ml: { contentType: "furniture", why: "E235 \"Merida Living Room Set\" — furniture, was clutter (clutter #23); room set: coffee tables, hampers; TSR sims4-sets-objects-livingroom" },
  cmktspatb0031oxol9nalmizg: { contentType: "furniture", why: "E235 \"Sims 4 Modern Bedroom Set\" — furniture, was clutter (clutter #26); room set led by a double bed" },
  cmil0qing002aoxee4xx4w7q2: { contentType: "furniture", why: "E235 \"Sabine Bathroom Set Part 1\" — furniture, was clutter (clutter #15); shower, sinks, mirrors" },
  cmim92tn901teoxy8j0n98qot: { contentType: "furniture", why: "E235 \"Dream Kitchen Set\" — furniture, was clutter (clutter #19); fridge and oven lead the set" },
  cmijo0d6v00n3oxc8jqyetef7: { contentType: "clutter", why: "E235 \"The Appliance Collection\" — KEEP: clutter (clutter #5); 11 countertop appliances (microwave, popcorn maker), same as E120 Altara Kitchen Appliances" },
  // ── Audited 2026-10-20 (Rowan, E249). /sims-4-cc-furniture/ — #2 in the E186
  //    URL-category queue (7/24 disagree; #1 farmhouse-cc 8/17 is the residential
  //    family call already parked). All 24 rows read by title; the 7 DIS rows are
  //    monthly room sets from one Patreon series plus an AK bedroom set, a hammock
  //    and a TSR decor set. Six different wrong types (residential ×3 from the word
  //    "Home"/"Entrance", poses, shoes, tops, makeup) — `--ids` pins, never a facet
  //    pass. 17 'ok' rows (furniture 14, decor 3) left unpinned.
  cmim8y4fk010hoxy8bjf663n0: { contentType: "furniture", why: "E249 \"Aggressivekitty Seaside Home Collection\" — furniture, was residential; an Aggressivekitty bedroom furniture set ('Home Collection' is the set name, not a lot) (/sims-4-cc-furniture/)" },
  cmim8y4ww010ooxy8rf4iyi0s: { contentType: "furniture", why: "E249 \"August Home Office\" — furniture, was residential; a home-office room set (desks, chair, shelves), not a lot (/sims-4-cc-furniture/)" },
  cmim8y4z2010poxy8jeai4w8j: { contentType: "furniture", why: "E249 \"November Entrance\" — furniture, was residential; entryway room set (hall table, ottoman), same monthly series as the furniture-typed siblings (/sims-4-cc-furniture/)" },
  cmim8y4mk010koxy80ea7b2op: { contentType: "furniture", why: "E249 \"Lazy Hammock\" — furniture, was poses; a functional hammock object (two animation versions), not a pose pack (/sims-4-cc-furniture/)" },
  cmim8y4rc010moxy8xem89ezt: { contentType: "furniture", why: "E249 \"October Coziness\" — furniture, was shoes; title names no facet, monthly room-set series (siblings September/October Comfort typed furniture/decor), post URL category furniture (/sims-4-cc-furniture/)" },
  cmim8y4te010noxy841um0y90: { contentType: "furniture", why: "E249 \"September Dining Room\" — furniture, was tops; a dining-room set (table, chairs) (/sims-4-cc-furniture/)" },
  cmim8y5kq010yoxy8tqor2wpt: { contentType: "decor", why: "E249 \"Veranda Extras\" — decor, was makeup; SIMcredible! TSR category sims4-sets-objects-decorative (plants, rugs, outdoor items) (/sims-4-cc-furniture/)" },
  // ── Audited 2026-10-21 (Rowan, E256). Face presets in the `body-preset` facet.
  //    All 150 body-preset rows read by title: 57 are nose or eye presets, not body
  //    presets. 2 sat in the /games/sims-4/body-presets/ top 24 ("Female Eye Presets for
  //    Sims 4" #18, "Babydoll Nose Preset Mod" #23). Source: the one-off
  //    backfill-body-preset-content-type.ts, whose CAS hint regex sent face|nose|eye|lip
  //    presets to body-preset (fixed in lib/bodyPresetRules.ts in the same PR). Policy
  //    from E186/E207: face preset -> `preset` (body-preset is bodies). Plus the
  //    /sims-4-nose-presets/ post (7/25 disagree) and the furniture-cc top-30 off-facet
  //    rows with the /sims-4-swimsuit-cc/ furniture-typed swimsuits behind #24.
  //    Rejected: "100+ Sims 4 CAS Presets" stays body-preset (Zerbu body-shape presets).
  cmkyosm9c01aooxhczh4gh3ba: { contentType: "preset", why: "E256 \"Sims 4 Almond Eye Preset\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyos5jt01amoxhccq7uw9j1: { contentType: "preset", why: "E256 \"Sims 4 Female Eye Presets\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyof42p019goxhclal9idge: { contentType: "preset", why: "E256 \"N5 Pointed Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyoor0d01aaoxhc6sksk22a: { contentType: "preset", why: "E256 \"Sims 4 Asian Eye Preset\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyojrm1019uoxhcnxag5ffv: { contentType: "preset", why: "E256 \"Tilted Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyn6zav015poxhcezawdw4n: { contentType: "preset", why: "E256 \"Sims 4 Alien Eye Preset\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyoepff019foxhcz7ffp48y: { contentType: "preset", why: "E256 \"Sims 4 Nose Presets for Females\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyofe8n019hoxhctk897ikg: { contentType: "preset", why: "E256 \"Broken Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyoh0ig019moxhc7knn9atr: { contentType: "preset", why: "E256 \"Female TS4 Nose Presets\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyoio8r019roxhcafh7fp8t: { contentType: "preset", why: "E256 \"TS4 Female Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil2zniv007uoxpz4opuuhbx: { contentType: "preset", why: "E256 \"Lookbook + Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies); the download is the nose preset (desc: \"a soft, rounded nose shape\")" },
  cmkyodui2019coxhcfzp526zq: { contentType: "preset", why: "E256 \"Sims 4 N1 Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyoe8q5019doxhchdli2242: { contentType: "preset", why: "E256 \"Nose Preset Pack #28-38\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyoqvcf01aioxhc7ihd619f: { contentType: "preset", why: "E256 \"Sims 4 N2 Eye Preset\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyooepv01a8oxhco7unlxiw: { contentType: "preset", why: "E256 \"Male Sims 4 Eye Presets\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyopd9v01acoxhcyhjqyjm1: { contentType: "preset", why: "E256 \"Female Eye Presets for Sims 4\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyool3c01a9oxhc0x5vpegl: { contentType: "preset", why: "E256 \"Sims 4 Eye Preset Collection\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyop3fj01aboxhce4dx8w5k: { contentType: "preset", why: "E256 \"Sims 4 Female Eye Preset\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyomsgw01a4oxhc7jeqzahn: { contentType: "preset", why: "E256 \"Button Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil30gp5008coxpza1g784du: { contentType: "preset", why: "E256 \"Nose Preset 10\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil2zk0r007roxpzkanlrwgu: { contentType: "preset", why: "E256 \"Male Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil2zl4h007soxpzt9w20pjo: { contentType: "preset", why: "E256 \"Olive Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyor89701ajoxhcvagzj0u0: { contentType: "preset", why: "E256 \"Female Sims 4 Eye Presets\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyod35y019aoxhc3emonw3i: { contentType: "preset", why: "E256 \"Female Nose Presets\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyodhru019boxhcqzy29tem: { contentType: "preset", why: "E256 \"Sims 4 Unisex Nose Presets\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyognq1019loxhc398y6nmy: { contentType: "preset", why: "E256 \"Female Nose Preset for Sims 4\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyoie6d019qoxhco1t1hg33: { contentType: "preset", why: "E256 \"Edith Sims 4 Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyojf4x019toxhcg1u7ibwa: { contentType: "preset", why: "E256 \"Nose Preset Mods\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyolf6701a0oxhci0j1gaaa: { contentType: "preset", why: "E256 \"Nose Presets for Male Sims\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyomei701a3oxhcvm10shtj: { contentType: "preset", why: "E256 \"Nose Preset 1\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyonk0o01a5oxhc222p0a3r: { contentType: "preset", why: "E256 \"Sims 4 Eye Presets\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyonu0l01a6oxhcq748z230: { contentType: "preset", why: "E256 \"Fox Soul Sims 4 Eye Presets\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyoqgzt01agoxhc1eurj9q7: { contentType: "preset", why: "E256 \"Sims 4 Non Default Eye Preset\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyose5n01anoxhcsh0gphmf: { contentType: "preset", why: "E256 \"Sims 4 Male Eye Preset\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyosud501apoxhc0386d4rx: { contentType: "preset", why: "E256 \"Set of Sims 4 Eye Presets\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil308sf0087oxpzpxrn1ibp: { contentType: "preset", why: "E256 \"Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil30c0t0089oxpzkzsd6n48: { contentType: "preset", why: "E256 \"Nara Nose Preset N14\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyok2v2019voxhcj8jjru07: { contentType: "preset", why: "E256 \"Valentino Nose Preset Mod\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyorup701aloxhcio97g3bv: { contentType: "preset", why: "E256 \"Sims 4 Eye Presets CC\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil2zx8c0081oxpzxlam4eeq: { contentType: "preset", why: "E256 \"Carissa Nose Preset N43\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyogart019koxhca9com96h: { contentType: "preset", why: "E256 \"Male Nose Presets\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyoq5q101afoxhcggl2ku3q: { contentType: "preset", why: "E256 \"N5 Sims 4 CAS Eye Preset\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyoo64501a7oxhcig55f42q: { contentType: "preset", why: "E256 \"Sims 4 Maxis Match Eye Preset\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyohbyu019noxhcavkphana: { contentType: "preset", why: "E256 \"Sims 4 Male Nose Preset\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyohiuz019ooxhcsruve4yk: { contentType: "preset", why: "E256 \"Maxis Match Nose Presets\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil30dnz008aoxpzchkmwua0: { contentType: "preset", why: "E256 \"Nose Preset 22\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil30p5l008hoxpz1ii9fgmk: { contentType: "preset", why: "E256 \"P-Nose Preset N1\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil303710085oxpznyczevbl: { contentType: "preset", why: "E256 \"Siana Nose Preset N24\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyol30z019zoxhc60c7lq8a: { contentType: "preset", why: "E256 \"Babydoll Nose Preset Mod\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyn3m5l015doxhctgrpe9hu: { contentType: "preset", why: "E256 \"Sims 4 Cyclops Eye Preset\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmkyopx3y01aeoxhc7l2fmgxq: { contentType: "preset", why: "E256 \"Visions Sims 4 Eye Presets\" — preset, was body-preset; title says eye preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil30mhh008foxpzc4xpcher: { contentType: "preset", why: "E256 \"Nose Preset 04\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil30kol008eoxpzjp6skg4u: { contentType: "preset", why: "E256 \"Nose Preset N6\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil2zosf007voxpziz86kes8: { contentType: "preset", why: "E256 \"Cavill Nose Preset + Nose Mask\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies); nose preset with its nose-mask overlay" },
  cmil301nl0084oxpz46vw5yq1: { contentType: "preset", why: "E256 \"Female Nose Presets N08 To N11\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil30ahx0088oxpzgcpc8cq6: { contentType: "preset", why: "E256 \"Dara Nose Preset N35\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil30f51008boxpz4nkrw4ub: { contentType: "preset", why: "E256 \"Delfina Nose Preset N34\" — preset, was body-preset; title says nose preset, a face preset (E186/E207 policy: body-preset is bodies)" },
  cmil2zusu007zoxpziab8y3bl: { contentType: "preset", why: "E256 \"Nose Presets\" — preset, was tops; TSR nose-shape pack (desc: \"three beautifully crafted nose shapes\") (/sims-4-nose-presets/)" },
  cmil2zvzb0080oxpzilvjfmld: { contentType: "preset", why: "E256 \"Maura Nose Preset N15\" — preset, was skin; MagicHand nose preset, TSR category sims4-mods-caspresets (/sims-4-nose-presets/)" },
  cmil2zykr0082oxpzz9cd8pk2: { contentType: "preset", why: "E256 \"3 Male Noses Presets\" — preset, was skin; three male nose presets (/sims-4-nose-presets/)" },
  cmil30hxf008doxpzdmidpoxe: { contentType: "preset", why: "E256 \"Bad Memory Nose Presets\" — preset, was decor; three nose presets (/sims-4-nose-presets/)" },
  cmil2zivn007qoxpzxueowfxm: { contentType: "preset", why: "E256 \"Noses, Noses, Noses\" — preset, was full-body; desc: \"contains three highly detailed noses… Each preset\" (/sims-4-nose-presets/)" },
  cmil2zm9l007toxpzfm91ksbq: { contentType: "preset", why: "E256 \"Lorem Ipsum\" — preset, was full-body; desc: \"three distinct Sims 4 nose presets\"; Patreon slug lorem-ipsum-nose (/sims-4-nose-presets/)" },
  cmil2zti6007yoxpzbg93z5sq: { contentType: "skin", why: "E256 \"Lemon Nose Details\" — KEEP: a nose skin-detail overlay (TSR sims4-makeup-female-skindetails), not a preset (/sims-4-nose-presets/)" },
  cmim8uhmm00d4oxy8txx74wqw: { contentType: "gameplay-mod", why: "E256 \"Bed Cuddle\" — gameplay-mod, was furniture; an interaction mod (couples snuggle while sleeping), not an object; furniture-cc #20 (/sims-4-cozy-mods/)" },
  cmoipxt4u000yoxkj6nutxrgw: { contentType: "gameplay-mod", why: "E256 \"Got2bVanity Hair Mod\" — gameplay-mod, was furniture; kikovanity wig-install routine via interactive animations; furniture-cc #26 (/new-sims-4-mods-2026/)" },
  cmik9kmqs005soxk7qa5tz5yu: { contentType: "residential", why: "E256 \"Oasis Springs Villa\" — residential, was furniture; a 30x20 house (3 bed, 3 bath, pool) from the modern-houses post; furniture-cc #28 (/sims-4-modern-houses/)" },
  cmim8wwzj00saoxy87rv0xev9: { contentType: "full-body", why: "E256 \"Designer Swimsuits\" — full-body, was furniture; child bikinis (desc); furniture-cc #24; swimsuit post types swimwear full-body (18 rows) (/sims-4-swimsuit-cc/)" },
  cmim8wwhb00s2oxy8blm0xupd: { contentType: "full-body", why: "E256 \"Swimsuit Set\" — full-body, was furniture; monokinis plus bikini tops and bottoms (/sims-4-swimsuit-cc/)" },
  cmim8wxf700shoxy87za8b1n3: { contentType: "full-body", why: "E256 \"Dissia’s Bowl Swimsuit\" — full-body, was furniture; TSR sims4-clothing-female-teenadultelder-swimwear (/sims-4-swimsuit-cc/)" },
  cmim8wylj00t0oxy8j4venrzq: { contentType: "full-body", why: "E256 \"Thea Bikini Swimwear\" — full-body, was furniture; bikini set with cover-up (/sims-4-swimsuit-cc/)" },
  cmim8wwnu00s5oxy8rzc20kzp: { contentType: "full-body", why: "E256 \"Kristen Swimsuit\" — full-body, was gameplay-mod; a swimsuit in 65 swatches (/sims-4-swimsuit-cc/)" },
  cmim8wxb300sfoxy8o1n1b96s: { contentType: "full-body", why: "E256 \"Ash Bikini\" — full-body, was skin; a bikini in 55 swatches (/sims-4-swimsuit-cc/)" },
  cmim8wx9600seoxy8rsvk5rot: { contentType: null, why: "E256 \"Summer Edge Set\" — NULL, was furniture; title names no item and the desc lists none (\"contains the following:\"); on the swimsuit post but a guess either way (/sims-4-swimsuit-cc/)" },

  // ── Audited 2026-10-23 (Rowan, E263). The 18 non-lots Sage found in the lots-hub
  //    top 48 (PR #359, `collection-hub-eligibility.ts --family=lots`). All 18 were
  //    typed `residential` — a facet with no live writer (lotContentTypeRules.ts).
  //    Decided by title first; where the title names no item, by the mod's OWN
  //    description sentence (it names the mod) and its source post. NULL where no
  //    facet is right: a save file, an EA pack, a pre-made Sim, a challenge (rules,
  //    not a file), walls (no build-mode wall facet exists), and an outfit set whose
  //    desc lists no item (E256 "Summer Edge Set" precedent). Heterogeneous reasons,
  //    so hand-fixed by id, not a class retag. Kiss and Grind's isNSFW is NOT decided here.
  cmika1ms500fhoxk73zvlkrux: { contentType: null, why: "E263 \"Love Island Challenge\" — NULL, was residential; a rules-based gameplay challenge (scarlet-v.blogspot), not a mod file or a lot; no challenge facet" },
  cmim8whx800p6oxy8efvsa856: { contentType: "clutter", why: "E263 \"Wash’n Wear Essentials\" — clutter, was residential; desc: \"contains 21 laundry clutter items\" (/sims-4-clutter/)" },
  cmim8vfre00i5oxy8a9f1nf7s: { contentType: "furniture", why: "E263 \"Swifty Sways Infant Swing\" — furniture, was residential; a functional infant swing object (/sims-4-infant-cc/)" },
  cmikk9rz5006wox33s47c746x: { contentType: "script-mod", why: "E263 \"Better Build/Buy\" — script-mod, was residential; a Build/Buy UI overhaul (TwistedMexi), same class as UI Cheats Extension in script-mod; not a lot (/best-sims-4-mods/)" },
  cmil18mat00afoxeedytdc506: { contentType: "decor", why: "E263 \"Hello Kitty Set\" — decor, was residential; desc: \"various decorative objects for your work/study area\" (/sims-4-hello-kitty-cc/)" },
  cmijl2xn7005goxc8oyeggz79: { contentType: "gameplay-mod", why: "E263 \"Adult Jobs for Teens\" — gameplay-mod, was residential; unlocks adult jobs for teens (MTS), changes job age rules rather than adding a career, so not `career` (/sims-4-teen-mods/)" },
  cmijn9ht400cdoxc80e7cakdj: { contentType: "furniture", why: "E263 \"Aesthetic Gaming Set Up\" — furniture, was residential; a gaming-nook object set, same call as \"Gaming PC Setup Collection\" (/sims-4-aesthetic-mods/)" },
  cmim9jo4l0023oxy79buu7zcc: { contentType: null, why: "E263 \"The Sims 4 Cats & Dogs\" — NULL, was residential; an EA expansion pack (Amazon link), not CC or a mod (/best-sims-4-expansion-packs/)" },
  cmikdcy38003joxbh0grsxqbz: { contentType: "furniture", why: "E263 \"Gaming PC Setup Collection\" — furniture, was residential; desc: \"adds sleek, high-quality items to your Sim’s gaming room\" (/sims-4-gaming-room-cc/)" },
  cmim8vuv600kyoxy89xvbqk49: { contentType: "gameplay-mod", why: "E263 \"Functional Pacifier\" — gameplay-mod, was residential; desc: \"The Functional Pacifier mod adds a functional pacifier\" with infant/toddler interactions (/sims-4-infant-mods/)" },
  cmim9esak001ooxqw9tr8zmh0: { contentType: null, why: "E263 \"All-World Save File with Mods\" — NULL, was residential; a save file, not a lot; save-file titles are split across 4 facets today, none of them right" },
  cmijkmtxb002uoxc88zv6cp5o: { contentType: null, why: "E263 \"Grunge Brick Walls\" — NULL, was residential; wall CC (build mode), not a lot; no wall facet exists and decor/furniture are buy-mode, so NULL beats a guess (/30-best-sims-4-brick-wall-cc…/)" },
  cmijpgnor011ooxc852utju39: { contentType: null, why: "E263 \"Basic Set 07\" — NULL, was residential; male outfit set but title names no item and desc lists none (\"you get the following:\"), E256 Summer Edge precedent (/sims-4-male-clothes-cc/)" },
  cmim9ka6x003xoxy7qfwa3fnn: { contentType: "career", why: "E263 \"Sims 4 Active Doggy Daycare Career\" — career, was residential; title names a career (ItsKatato) (/sims-4-custom-active-careers/)" },
  cmil0qctr0026oxeef6l4lo2h: { contentType: "furniture", why: "E263 \"Lotta Kidsroom Part. 2\" — furniture, was residential; desc: \"this set of furniture and decor… eight items\"; \"Lotta\" is not \"lot\" (/sims-4-modern-furniture-cc/)" },
  cmijpvf0z0198oxc8ku3nlctc: { contentType: "gameplay-mod", why: "E263 \"Lot Traits Pack\" — gameplay-mod, was residential; adds traits to lots (kiarasims4mods), a gameplay mod about lots, not a lot (/sims-4-traits/)" },
  cmim8rrsx002aoxy81rtglrco: { contentType: "gameplay-mod", why: "E263 \"Kiss and Grind\" — gameplay-mod, was residential; a romance-interaction mod (/sims-4-mods-for-realistic-relationships/). isNSFW left as-is: a separate E242-style call" },
  cmikd78hs000soxbhxrl6ojnt: { contentType: null, why: "E263 \"Eva\" — NULL, was residential; a pre-made Sim (desc: \"get this ready-made Sim\"), not CC of any facet (/sims-4-acne-cc/)" },

  // ── Audited 2026-10-28 (Rowan, E281). Non-poses in the `poses` facet behind
  //    /games/sims-4/poses/ (GSC 09-28→10-25: 1,176 impr, pos 12.9; the
  //    "gallery poses" cluster ≈315 impr at pos ≈8). Read the top 60 by
  //    downloads, then every one of the 922 rows whose title carries no
  //    pose/animation word (127). Most of those are creatively named pose packs
  //    from pose posts and stay. These 20 are not poses: gameplay mods from
  //    romance/teen posts, objects, a hairstyle, a bag, a lot, pre-made Sims.
  //    Decided by title, then the mod's OWN description sentence. NULL for mixed
  //    sets (clothes + hair + poses), Sims, and doors (no door facet; E263 walls
  //    precedent). Heterogeneous reasons, so hand-fixed by id, not a class retag.
  //    Left alone on purpose: "Dressage pack update!" (horse animations), the
  //    10 "Deco Sims" (posed sim statues), "First Kiss Override" (an animation
  //    override). "YouHoo" (a solo-WoHoo mod) is NOT moved: re-typing it to
  //    gameplay-mod without an isNSFW call would put it in the gameplay grids.
  cmmvasf1k00egoxzg645lamo4: { contentType: "gameplay-mod", why: "E281 \"Autonomous Proposals\" — gameplay-mod, was poses; desc: \"allows Sims to propose on their own\" (PolarBearSims, MTS); poses #16 (/sims-4-romance-mods/)" },
  cmijj49a2003loxs3qx4hhoc0: { contentType: "gameplay-mod", why: "E281 \"Auto Shorter Teens\" — gameplay-mod, was poses; desc: \"automatically shortens them in-game … no sliders or presets\" (MTS); poses #18 (/sims-4-teen-mods/)" },
  cmsmcikvt00scoxeux4xk5q6r: { contentType: null, why: "E281 \"My BBL Journey\" — NULL, was poses; desc: a collection of post-op clothing, poses and medical objects, a mixed set with no single facet; poses #29 (/sims-4-plastic-surgery-mods/)" },
  cmil3mobm00gpoxpz0gb8blk3: { contentType: "jewelry", why: "E281 \"Smile Karlie Grill\" — jewelry, was poses; grillz for female and male Sims, same call as E221 \"Kosmo Grillz Collection\" (/sims-4-cc-finds-for-january/)" },
  cmil106oc0070oxee6xg2nrkg: { contentType: "wall-art", why: "E281 \"K-pop Posters\" — wall-art, was poses; desc: \"wall decorations featuring … K-pop group visuals\" (/sims-4-korean-cc/)" },
  cmmvase7a00e2oxzgw7wu4wkq: { contentType: "gameplay-mod", why: "E281 \"The Sims 4 Passionate Romance Mod\" — gameplay-mod, was poses; title says mod; desc: adds romantic interactions (sacrificialmods) (/sims-4-romance-mods/)" },
  cmim8rs23002doxy89oorbfog: { contentType: "gameplay-mod", why: "E281 \"Passionate Romance Mod\" — gameplay-mod, was poses; the same Sacrificial mod from a second post (/sims-4-mods-for-realistic-relationships/)" },
  cmil130zy008coxeexzsclrnx: { contentType: "furniture", why: "E281 \"Dorm Sweet Dorm Office\" — furniture, was poses; desc: a seven-item study-area set (TSR SIMcredible!), room sets → furniture (E235) (/sims-4-office-cc/)" },
  cmijoq5xl00s0oxc83ggdp0x1: { contentType: null, why: "E281 \"Cedar Doors and Arches\" — NULL, was poses; eight build-mode doors and arches; no door facet exists, E263 walls precedent (/sims-4-doors-cc/)" },
  cmkyc3h8q00uqoxhc38xlkqph: { contentType: null, why: "E281 \"Sims 4 Stranger Things CC Sims\" — NULL, was poses; pre-made Sims for the Tray folder (#NoCC), not CC of any facet" },
  cmijkw03z003yoxc8z98nxlfw: { contentType: "clutter", why: "E281 \"Tasty Breakfast Collection\" — clutter, was poses; desc: \"a full spread of decor items, including … pancakes, waffles\" (/sims-4-breakfast-cc/)" },
  cmim9mv6b00ggoxy7h1tqkffa: { contentType: null, why: "E281 \"Sims 4 CC Clothes Pack for Male Sims\" — NULL, was poses; desc: 5 CAS items + a hair + a pose pack, a mixed set (/sims-4-cc-clothes-packs/)" },
  cmik9w08u00c0oxk7p77wgdf2: { contentType: "hair", why: "E281 \"Curbs 50s Hairstyles\" — hair, was poses; title says hairstyles; desc: a pin-up updo with victory rolls (/sims-4-1950s-cc/)" },
  cmiglj48n0015oxm58dg2hnta: { contentType: "accessories", why: "E281 \"Ricky Bag\" — accessories, was poses; desc: \"The handbag is designed with a structured shape\" (TSR) (/sims-4-cc-finds-for-november/)" },
  cmikk76e9005jox33n2s5c2sm: { contentType: "furniture", why: "E281 \"Casablanca Moroccan cc\" — furniture, was poses; desc: an 8-piece set (coffee table, pouf, lanterns), room sets → furniture (E235) (/sims-4-boho-furniture-cc/)" },
  cmil3ky7j00fwoxpzsdqt4pv5: { contentType: "clutter", why: "E281 \"Slay That Lace Set\" — clutter, was poses; desc: \"contains various clutter objects for Sims who love doing hair\" (/sims-4-cc-finds-for-february/)" },
  cmim9svco005nox5638ukt83u: { contentType: "community", why: "E281 \"Sims 4 Beach Wedding Venue\" — community, was poses; desc: \"The lot is built…\"; TSR category sims4-lots-community (/sims-4-wedding-cc/)" },
  cmilib4im00j4oxpzgvfe00qv: { contentType: "decor", why: "E281 \"Floret Grove\" — decor, was poses; desc: a garden set of bee boxes, planters, a lattice, a plant-display dresser (/sims-4-garden-cc/)" },
  cmim9sv3w005jox56mk4ri6uk: { contentType: "accessories", why: "E281 \"Sims 4 CC Wedding Bouquet\" — accessories, was poses; BEO's held bouquet, \"all ages, all genders\" CAS accessory (/sims-4-wedding-cc/)" },
  cmikab9mr00kvoxk7cg5hta26: { contentType: "accessories", why: "E281 \"Walking Canes\" — accessories, was poses; desc: \"The cane adds the perfect finishing touch to your elder Sim’s fashion\" (/sims-4-elder-cc/)" },

  // ── Audited 2026-11-04 (Rowan, E328). The 7 Atino00 rows approved by E304
  //    (Nova, 11-01) through the submission path, which resolves contentType
  //    with the E168 ingest resolver. One landed wrong (a wall portrait read as
  //    `hair` from "Dark Hair" in the title) and 4 landed NULL. Decided from the
  //    title, then the mod's OWN description (a creator submission, not a blog
  //    post's shared description). Peer typing checked on the whole catalog
  //    11-04: titled `portrait` → the one non-pose build-buy row is `wall-art`
  //    ("Wizard House Portraits #01"); titled `wallpaper` → 49 of 60 `decor`, so
  //    the floor-tile set follows the wallpaper precedent. The 2 rows already
  //    right are pinned as no-ops so a later pass cannot re-break them.
  cmvxxhtex0001oxx87u4lisos: { contentType: "wall-art", why: "E328 \"Elegant Dark Hair Victorian Lady Portraits\" — wall-art, was hair (\"Dark Hair\" in the title); desc: \"beautifully detailed portraits of elegant women … displayed in ornate gold and silver antique\" frames" },
  cmvxxhtu80003oxx890xvoc1j: { contentType: "decor", why: "E328 \"Angel sculpture, statue collection.\" — decor, was NULL; desc: \"4 Victorian-inspired angel statues\", antique marble and aged stone" },
  cmvxxhu0u0005oxx8259gjr5b: { contentType: "decor", why: "E328 \"Cute & kawaii cat and bunny doll\" — decor, was NULL; desc: \"four adorable decorative dolls … add a soft and whimsical touch to any room\"" },
  cmvxxhu7r0007oxx89bvki8fk: { contentType: "decor", why: "E328 \"Cute & Kawaii Doll Collection\" — decor, was NULL; desc: \"a charming collection of four cute & kawaii decorative dolls\"" },
  cmvxxhul0000boxx8n9vq98dr: { contentType: "decor", why: "E328 \"Elegant boho floor big collections\" — decor, was NULL; desc: \"Elegant boho floor tile collection\", 100+ swatches; floors/walls follow the wallpaper precedent (49 of 60 wallpaper titles are decor)" },
  cmvxxhueg0009oxx8kg0brfpj: { contentType: "decor", why: "E328 \"Cute & kawaii doll wallpaper\" — KEEP decor (no-op pin); desc: \"a sweet and dreamy kawaii wallpaper set\" — the word doll is the motif, not the object" },
  cmvxvtzus0003ox6gqfys2q3v: { contentType: "decor", why: "E328 \"Vintage decor set\" — KEEP decor (no-op pin); Atino00 submission, title is the type" },

  // ── Audited 2026-11-06 (Rowan, E362). The five off-type rows Sage found in
  //    the male-clothes (E338) and shoes-cc (E339) top 48 on 11-05, plus one
  //    heels row the E362 heels-theme dry run surfaced in `residential`. Six
  //    different reasons, so hand pins, not a facet-wide retag (E67 rule).
  //    Each was read against its own description and source post.
  cmikkd71t008box33oh47jz1b: { contentType: "hair", why: "E362 \"Mario Hairstyle\" — hair, was full-body (male-clothes #7); desc: \"a gorgeous Sims 4 male urban hair set featuring thick, wavy locs\" (source: sims-4-male-urban-hair)" },
  cmikkcp86007yox33xrpjf379: { contentType: "hair", why: "E362 \"Barrel Twists\" — hair, was full-body (male-clothes #15); desc: \"thick twists styled into cornrows\" (source: sims-4-male-urban-hair)" },
  cmim8zak9016zoxy8zigyk4eq: { contentType: "hair", why: "E362 \"'Jordan' Curly Curls\" — hair, was shoes (shoes-cc #30; \"Jordan\" read as the sneaker); desc: \"a long, middle-parted, sexy, curly hairstyle\" (source: sims-4-hair-cc-2024)" },
  cmim8zmls019moxy8t9vqudcj: { contentType: "nails", why: "E362 \"Shorty French Pedi\" — nails, was shoes (shoes-cc #9); desc: \"a cute French pedi for your toes in five stunning swatches\" — a toenail set, nails-cc territory" },
  cmijp0gzp00tpoxc8iab4hkwx: { contentType: "furniture", why: "E362 \"Luxury Custom Closet\" — furniture, was shoes (shoes-cc #24); desc: \"9 items, which include dressers, shelves, and wardrobes\" (source: best-sims-4-closet-cc)" },
  cmim9m9mf00f3oxy7pxfc7yb8: { contentType: "shoes", why: "E362 \"Edgy Sims 4 CC Heels\" — shoes, was residential; desc: \"You can never have too many cc shoes … The black heels\", download is a Patreon shoes post (source: sims-4-grunge-cc)" },

  // ── Audited 2026-11-07 (Sage, E368/E369). Every row of the two new hubs'
  //    facets was read by hand before the pages shipped: all 107
  //    `cas-background` rows and all 92 `beard` + `facial-hair` rows. These
  //    are the off-type ones, each against its own description. Kept on
  //    purpose: "Realistic CAS Room Lighting" (a lighting overlay made for
  //    CAS rooms, a fair find on the backgrounds page), "Intro" (desc: "an
  //    elegant beard pack"), and the hair-plus-beard combo sets.
  cmmvarujo00bzoxzglhj0z6ij: { contentType: "loading-screen", why: "E368 \"2-Rose Themed Intro/Loading/Main Menu Screens\" — loading-screen, was cas-background; desc: \"Intro, Loading, and Main Menu Screens pack\" (source: sims-4-valentines-cas-backgrounds)" },
  cmmvarulo00c0oxzg10xorwjg: { contentType: "loading-screen", why: "E368 \"Valentine’s Day TS4 Loading Screen\" — loading-screen, was cas-background; title is the type (source: sims-4-valentines-cas-backgrounds)" },
  cmmvartw700btoxzgq59m778o: { contentType: "loading-screen", why: "E368 \"Valentine’s Main Menu Override\" — loading-screen, was cas-background; desc: \"replacement that gives your Sims 4 start screen\" — main-menu screens sit with loading screens (same loading-screens hub)" },
  cmttzhexo004soxfe3jjlyh71: { contentType: "loading-screen", why: "E368 \"Valentine Plumbobs\" — loading-screen, was cas-background; desc: \"loading screen replacements\"; 10 of the 26 plumbob rows are already loading-screen" },
  cmim9r2bs001xox56jprvmpjy: { contentType: "nails", why: "E368 \"Sims 4 Pride Nails\" — nails, was cas-background; desc: \"these pride nails … 14 swatches\" (source: sims-4-nails-cc)" },
  cmmvaq02q006loxzgf42xtjml: { contentType: "skin", why: "E369 \"Class of Melanin (Male Version) Skin Pack v2\" — skin, was facial-hair (#3 by downloads); desc: \"a standout skin detail pack … overlays\" (source: black-sims-4-cc)" },
  cmsmc6dgk00lloxeudlvilok5: { contentType: null, why: "E369 \"Ryder Sim\" — NULL, was facial-hair; a Sim download (sims-4-male-sim-download); E207 Sim -> NULL" },
  cmsmc6y4x00m0oxeuzhd606xj: { contentType: null, why: "E369 \"Erik Sim Download\" — NULL, was beard; a Sim download (sims-4-male-sim-download); E207 Sim -> NULL" },
  cmsmcuiib00yioxeuh962c57w: { contentType: "commercial", why: "E369 \"His & Hers Salon and Barber\" — commercial, was beard; desc: \"a fully furnished community lot\" (source: sims-4-salon-cc)" },
  cmsmci7qw00s4oxeuu6e8m4op: { contentType: "full-body", why: "E369 \"Jack Sparrow- Pirates of the Caribbean\" — full-body, was facial-hair; desc: \"custom outfit includes … hair, facial hair, layered pirate clothing\" (source: sims-4-pirate-cc)" },

  // ── Audited 2026-11-07 (Rowan, E373). Six off-type / NULL rows in the
  //    29-row hello-kitty-cc grid, every row of which was read for the sanrio
  //    theme, plus the Atino00 kawaii doll row Quinn flagged after E328 (NULL
  //    breaks E328's keep rule). Six different reasons → hand pins (E67 rule).
  //    Each decided from the title, then the row's own description. The 4
  //    plumbob/phone-override NULLs in the same grid are left NULL on purpose:
  //    no content type fits a UI override (E343).
  cmw38p51j2n5axjdzvyersmw4: { contentType: "decor", why: "E373 \"Cute and kawaii doll collection\" — decor, was NULL; CurseForge build-buy (/sims4/build-buy/), desc: \"this adorable collection of decorative dolls\"; same set as the E328 decor pins" },
  cmil19n1w00awoxeehz3k2swv: { contentType: "furniture", why: "E373 \"Hello Kitty Vanity\" — furniture, was full-body; desc: \"one of the best makeup vanities … a mirror shaped like Hello Kitty, a desk, and a chair\" (source: sims-4-hello-kitty-cc)" },
  cmil18pk200agoxeezpqpt8od: { contentType: "accessories", why: "E373 \"My Melody and Sweet Piano Bag\" — accessories, was gameplay-mod; desc: \"this bag … You can wear it on the left and right hand\"" },
  cmil19bzj00aroxeefathhvyw: { contentType: "full-body", why: "E373 \"Hello Kitty Swimsuit\" — full-body, was skin (\"showing off some skin\" in the desc); desc: a swimsuit in 10 swatches" },
  cmim8zmpw019ooxy8oqut3tui: { contentType: "nails", why: "E373 \"Sanrio Klaws\" — nails, was tops; desc: \"these are long claws with cute designs … these nails may not be everyone's style\"" },
  cmkygcc0900yaoxhck170zeon: { contentType: "decor", why: "E373 \"ACPC Sanrio Plushies Set\" — decor, was full-body; simdertalia's Animal Crossing Pocket Camp item conversions, \"8 items\", plushies are objects" },

  // ── Audited 2026-11-09 (Sage, E377). All 130 SFW Sims 4 `eyebrows` rows
  //    were read before the eyebrows-cc hub shipped: 126 name a brow in the
  //    title. Of the other 4, three are Caroll Design makeup-and-genetics
  //    sets: brows plus eyeshadow, face paint and lip gloss, titled as
  //    makeup. They move to `makeup` and stay on makeup-cc. Kept on purpose:
  //    "Alloy Pack" (desc: "four eyebrow styles, two labret piercings, and a
  //    pair of … glasses"). Most of that set is brows, so it is a fair find on
  //    a brows page.
  cmky1qgk000apoxhc3krpxao5: { contentType: "makeup", why: "E377 \"Female Genetics & Makeup Set\" — makeup, was eyebrows; desc: \"Female eye genetics and makeup … brows … skinny wing\" (Caroll Design), a makeup set titled as one" },
  cmkyo1s38018eoxhcng2jrpzv: { contentType: "makeup", why: "E377 \"1 Paranormal Makeup & Genetics\" — makeup, was eyebrows; desc: \"set contains eyebrows, face paint eyes, face contour, eyeshadow and lip gloss\" (Caroll Design)" },
  cmky26c8s00c6oxhcd2llhz7p: { contentType: "makeup", why: "E377 \"2 Maxis Match Makeup & Genetics\" — makeup, was eyebrows; desc: \"Maxis Match makeup and genetics set … face paint eye set\" (Caroll Design)" },

  // ── Audited 2026-11-11 (Sage, E388). All 682 SFW Sims 4 `dresses` rows were
  //    read before the dresses-cc hub shipped. 74 are not dresses: 33 shoes, 12
  //    tights/wings/aprons (accessories), 6 jewelry, 6 hair, 4 swimsuits, 2 skins
  //    and 11 others. Nearly all came from description inference: "dress your
  //    Sim" / "dress your child in" reads as `dresses`. Each was decided from
  //    the title, then the row's own description. Kept on purpose: sets and
  //    collections that contain dresses, the overalls rows, "Romantic Pajama
  //    Set" (slip dress) and "Cute Apron Set with Bowknot Suspenders" (apron
  //    dresses). NULL where no facet fits: two Sims, a real-world sock gift,
  //    and a genetics set with a boilerplate description (prefer NULL to a guess).
  cmim8zpu0019roxy8vgw7dgf9: { contentType: "shoes", why: "E388 \"Black Cat 4’s\" — shoes, was dresses; desc: \"If you’re looking for cute Sims 4 kids shoes CC to dress your child in, get the Black Cat …\"" },
  cmmvaqdxb007hoxzg1uz1d8dw: { contentType: "shoes", why: "E388 \"Agnes Boots\" — shoes, was dresses; desc: \"Agnes Boots by Maximoons are a sleek, modern staple designed for female Sims. These …\"" },
  cmim8s4pd0049oxy8leaqiatn: { contentType: "shoes", why: "E388 \"Versace Sandals\" — shoes, was dresses; desc: \"The Versace Sandals cc are inspired by the popular designer brand Versace. They’re …\"" },
  cmikk5c8d004cox33njw8o19c: { contentType: "shoes", why: "E388 \"Tempo Heel Sandals\" — shoes, was dresses; desc: \"If you’re looking for glammed-up sandals for your Sim, get the Tempo Heel Sandals pack. …\"" },
  cmijnvl5j00kaoxc8tez8uv9f: { contentType: "shoes", why: "E388 \"Heat Mule Heels\" — shoes, was dresses; desc: \"Created by Charonlee SIMS, the Heat Mule Heels are a chic footwear choice designed with …\"" },
  cmijo7nwk00p2oxc8rlvc1q1n: { contentType: "shoes", why: "E388 \"Glitter Bow Stilettos S594\" — shoes, was dresses; desc: \"For those who love kitten heels, these ones by Mermalade are an excellent choice. The …\"" },
  cmim8zlny0197oxy8sjgb9b2e: { contentType: "shoes", why: "E388 \"Tiffany Boots\" — shoes, was dresses; desc: \"The Tiffany Boots are a stunning pair of knee-high boots with a thick sole. The …\"" },
  cmmvapswo005woxzgasqwza85: { contentType: "shoes", why: "E388 \"Maxis Match Sneakers for Kids & Toddlers\" — shoes, was dresses; desc: \"These Spencer sneakers are a wardrobe staple that fits most of your toddler’s outfits. …\"" },
  cmjh4kz08001joxyvgkqfykux: { contentType: "shoes", why: "E388 \"Toddler Leather Shiny Flats With Flower\" — shoes, was dresses; desc: \"These are cute toddler shoes with a simple leather design, a single strap, and small …\"" },
  cmim8zrfs01ajoxy8miygmw65: { contentType: "shoes", why: "E388 \"Simple Mary Jane\" — shoes, was dresses; desc: \"If you’re looking for a glossy pair of shoes for your child’s Sim, get the Simple Mary …\"" },
  cmijo5djw00o9oxc8l2y4o346: { contentType: "shoes", why: "E388 \"Black Toe Stiletto S566\" — shoes, was dresses; desc: \"Complete your Sim’s elegant look with these Black Toe Stilettos. They’re sling-back heels …\"" },
  cmsmbmz4000b6oxeukde46yad: { contentType: "shoes", why: "E388 \"Cowboy Boots\" — shoes, was dresses; desc: \"Cowboy Boots are classic western boots designed for feminine Sims. They have a pointed …\"" },
  cmsmbmvpq00b3oxeuf167t26r: { contentType: "shoes", why: "E388 \"High Heel Cowboy Shoes\" — shoes, was dresses; desc: \"High Heel Cowboy Shoes are stylish western boots designed for feminine Sims. The boots …\"" },
  cmsmbmrg300b0oxeuw0gk2ai5: { contentType: "shoes", why: "E388 \"Cowboy Carter Tour: Stuart Weitzman\" — shoes, was dresses; desc: \"Cowboy Carter Tour: Stuart Weitzman is a pair of knee-high metallic cowboy boots inspired …\"" },
  cmsmbkuv700a3oxeu5t06t0u6: { contentType: "shoes", why: "E388 \"Heart Heels\" — shoes, was dresses; desc: \"Heart Heels are adorable open-toe pieces with sculpted heart-shaped heels, fluffy …\"" },
  cmsmbdpwl006doxeugovxn2qs: { contentType: "shoes", why: "E388 \"Shoes KP1G – Toddler\" — shoes, was dresses; desc: \"Shoes KP1G – Toddler are adorable black flats designed with oversized bow accents across …\"" },
  cmsmbc29q005foxeulg9fisxb: { contentType: "shoes", why: "E388 \"Mermalade Seaside Stroll Strappy Sandals\" — shoes, was dresses; desc: \"Seaside Stroll Strappy Sandals are the perfect shoes for relaxed summer days and …\"" },
  cmsmbc14m005eoxeua4lywi6x: { contentType: "shoes", why: "E388 \"Child Mary Jane Heels\" — shoes, was dresses; desc: \"Child Mary Jane Heels are a cute formal shoe option for child Sims. They’re made with a …\"" },
  cmmvarom600ayoxzgtcifkfgv: { contentType: "shoes", why: "E388 \"Flatform Without Strap\" — shoes, was dresses; desc: \"This trendy platform sandal adds the perfect mix of casual and stylish to your Sim’s …\"" },
  cmmvarog700avoxzgf62mo7jn: { contentType: "shoes", why: "E388 \"Pearl Strap Stiletto Heel\" — shoes, was dresses; desc: \"The Pearl Strap Stiletto Heel is a gorgeous statement shoe with delicate pearl ankle …\"" },
  cmmvaqeqt007poxzg1fylko68: { contentType: "shoes", why: "E388 \"Leather Boots Womenswear\" — shoes, was dresses; desc: \"Leather Boots Womenswear are a clean and versatile pair of mid-calf boots that work …\"" },
  cmmvaqeay007noxzgp8fcz43l: { contentType: "shoes", why: "E388 \"Boots N02 Kids\" — shoes, was dresses; desc: \"Boots N02 Kids are the perfect cozy cold-weather option for your younger Sims. This …\"" },
  cmmvaqdv0007goxzg2lptbeij: { contentType: "shoes", why: "E388 \"Bowline Knee-High Boots\" — shoes, was dresses; desc: \"For those who love knee-high boots, download these ones by Guemara. They’re a beautiful …\"" },
  cmmvaqdsx007foxzgh6p2j94i: { contentType: "shoes", why: "E388 \"Purple Flower Boots\" — shoes, was dresses; desc: \"These velvet-style Purple Flower Boots are inspired by a real-life reference design. The …\"" },
  cmmvaqdqo007eoxzgaf1bks35: { contentType: "shoes", why: "E388 \"Countdown Thigh Boots\" — shoes, was dresses; desc: \"The Countdown Thigh Boots are bold thigh-high boots with sleek zip-front detailing and an …\"" },
  cmmvaqdme007coxzgvbkrxzft: { contentType: "shoes", why: "E388 \"Doc Knee High Boots\" — shoes, was dresses; desc: \"Nothing like a pair of classic knee-high boots to give your Sim an instantly cool, …\"" },
  cmmvaqdg30079oxzgsftlwx3g: { contentType: "shoes", why: "E388 \"Suede Whisper Boots Set\" — shoes, was dresses; desc: \"The Suede Whisper Boots Set features three distinct suede styles: Each pair comes in 25 …\"" },
  cmijkz548004xoxc89a2wsrr8: { contentType: "shoes", why: "E388 \"Gata High Heels\" — shoes, was dresses; desc: \"This list cannot be complete without a breathtaking Sims 4 shoe set. Gata High Heels is …\"" },
  cmil17u9n00a8oxeewpmeuzss: { contentType: "shoes", why: "E388 \"Print Sandals\" — shoes, was dresses; desc: \"As much as I don’t like thin heels, I still wanted to include an option for those who do. …\"" },
  cmikknm3y00e2ox33mouvovd1: { contentType: "shoes", why: "E388 \"Wedge Heel Slippers\" — shoes, was dresses; desc: \"Sometimes, I want to dress my Sims in normal, ordinary outfits, and these Wedge Heel …\"" },
  cmikknapq00dtox33kl3aqc34: { contentType: "shoes", why: "E388 \"Espadrilles Wedges\" — shoes, was dresses; desc: \"As mentioned earlier, Espadrilles Wedges are my favorite type of wedged heel, and these …\"" },
  cmikkmw3x00diox33f3bo4d1b: { contentType: "shoes", why: "E388 \"Micaella Heels\" — shoes, was dresses; desc: \"I love strappy heels, so I was excited to find this pair with a wedged heel. The Micaella …\"" },
  cmikkej42008wox33akd086am: { contentType: "shoes", why: "E388 \"Toddler Sandals With Flower Pattern\" — shoes, was dresses; desc: \"If you’re looking for a simple, versatile shoe set for your little one, check out the …\"" },
  cmijqj585001uox8o84qac5a5: { contentType: "hair", why: "E388 \"Myori Hair\" — hair, was dresses; desc: \"I love buss-down wigs designed with sleek, straight hair, and this Myori Hair is no …\"" },
  cmim8zb4z0178oxy8qmilo06q: { contentType: "hair", why: "E388 \"Imani Hair\" — hair, was dresses; desc: \"Get the Imani Hair CC if you’re looking for a base-game compatible set to dress your Sim. …\"" },
  cmim8zatq0173oxy85ieop6wb: { contentType: "hair", why: "E388 \"Claire Hairstyle\" — hair, was dresses; desc: \"Another great hairstyle CC for your child Sim is the Claire Hairstyle set. The pack …\"" },
  cmim924xn01pioxy8eqnc9z05: { contentType: "hair", why: "E388 \"Bloom Hair\" — hair, was dresses; desc: \"The Bloom Hair pack is another trendy Sims 4 kids hair cc to add to your mods folder. …\"" },
  cmim8xvtr00z0oxy8oqr947r1: { contentType: "hair", why: "E388 \"Ryan Gosling Hairstyle\" — hair, was dresses; desc: \"Another great Sims 4 male hair cc to dress your male Sim is the Ryan Gosling Hairstyle …\"" },
  cmijqm0yw003dox8ofy3fxua7: { contentType: "hair", why: "E388 \"Sleek Low Bun\" — hair, was dresses; desc: \"The Sleek Low Bun is a neat and slicked-back hairstyle perfect for formal events or …\"" },
  cmil32fbd0098oxpzad9p6fzq: { contentType: "accessories", why: "E388 \"Aura Stockings\" — accessories, was dresses; desc: \"The Aura Stockings from the Girls Next Door collection bring a touch of vintage glamour …\"" },
  cmijpt5s7017zoxc8jak3s6ia: { contentType: "accessories", why: "E388 \"Flos Fairy Wings\" — accessories, was dresses; desc: \"The Flos Fairy Wings are oversized, petal-shaped wings designed with soft gradients, …\"" },
  cmijpshja017ioxc8fmirnu0h: { contentType: "accessories", why: "E388 \"Fairy Wings\" — accessories, was dresses; desc: \"All butterfly lovers need to get these Fairy Wings. They’re designed with intricate …\"" },
  cmsmb2in8000hoxeu92kiqnnr: { contentType: "accessories", why: "E388 \"Female Apron Accessory\" — accessories, was dresses; desc: \"Female Apron Accessory is a waist-tied kitchen outfit with two large front pockets and a …\"" },
  cmsmb2qs7000noxeu7sw3nee1: { contentType: "accessories", why: "E388 \"Decades of Aprons\" — accessories, was dresses; desc: \"Decades of Aprons is a collection of overlay aprons inspired by household and workwear …\"" },
  cmim8y0de00zvoxy8ndjbkwf0: { contentType: "accessories", why: "E388 \"Tights Jessica\" — accessories, was dresses; desc: \"Tights Jessica are a great addition to your Sims 4 winter clothes cc collection. These …\"" },
  cmil1cpg400bwoxeejat4z5k2: { contentType: "accessories", why: "E388 \"Cute Tights\" — accessories, was dresses; desc: \"Create a feminine and whimsical outfit with these Cute Tights by Laupipi. They’re …\"" },
  cmil1at7f00bcoxeefds6jdah: { contentType: "accessories", why: "E388 \"Helgatisha Fishnet Tights Set 2\" — accessories, was dresses; desc: \"If you’re looking for beautiful fishnet tights with a flawless fit, check out the …\"" },
  cmil1aluo00b7oxeelli838mj: { contentType: "accessories", why: "E388 \"Ripped Stockings\" — accessories, was dresses; desc: \"If you’re looking for the perfect edgy accessory, check out the Ripped Stockings cc. …\"" },
  cmil1aggk00b4oxeevzvv2v07: { contentType: "accessories", why: "E388 \"Stocking Set\" — accessories, was dresses; desc: \"The Stocking Set contains thigh-high stockings in two designs. The first design is a …\"" },
  cmsmd0n11011voxeuxacpi7lx: { contentType: "accessories", why: "E388 \"Elastic Sweatband\" — accessories, was dresses; desc: \"Elastic Sweatband is a simple sports accessory designed to complete your tennis outfits …\"" },
  cmil1n6au00gtoxee6htw0ht1: { contentType: "accessories", why: "E388 \"Lunar Acc Belt\" — accessories, was dresses; desc: \"Sometimes, I want a high-waisted belt to snatch my Sim’s waist and create the illusion of …\"" },
  cmmvaoua2002hoxzg8fd44k0y: { contentType: "jewelry", why: "E388 \"Cambridge Lovers Knot Necklace v2\" — jewelry, was dresses; desc: \"The Cambridge Lover’s Knot Necklace V2 is a stunning piece of jewelry designed for female …\"" },
  cmmvaouq2002moxzg6c3hhs1y: { contentType: "jewelry", why: "E388 \"Faith of the Seven Necklace\" — jewelry, was dresses; desc: \"This themed pendant piece is designed for medieval and fantasy gameplay. It’s a clean …\"" },
  cmsmbrq5000duoxeurzdja74m: { contentType: "jewelry", why: "E388 \"Royal Earrings Set\" — jewelry, was dresses; desc: \"Royal Earrings Set is a pack filled with oversized gems, pearls, crystal drops, and …\"" },
  cmmvaro7000aroxzgs4km81kh: { contentType: "jewelry", why: "E388 \"Ivory Constellation Earrings\" — jewelry, was dresses; desc: \"If you want a pair of statement earrings with an elegant, celestial look, the Ivory …\"" },
  cmmvarca8009voxzgfdciju9v: { contentType: "jewelry", why: "E388 \"Pink Gemstone Diamond Dangle Earrings\" — jewelry, was dresses; desc: \"These Pink Gemstone Diamond Dangle Earrings are a delicate accessory with sparkling …\"" },
  cmik9vepx00bkoxk7qic4cilc: { contentType: "jewelry", why: "E388 \"Pearl Necklace\" — jewelry, was dresses; desc: \"If you’re looking for the perfect accessory for your 1950s look, get this Pearl Necklace. …\"" },
  cmijmxs37008toxc8svme2187: { contentType: "hats", why: "E388 \"Twine and Succulent Witch Hats\" — hats, was dresses; desc: \"The Twine and Succulent Witch Hats are simple yet beautiful hats to add to your Sims 4 …\"" },
  cmim8wy1f00sroxy8uqd17am0: { contentType: "full-body", why: "E388 \"Kiki Bikini\" — full-body, was dresses; desc: \"This set is a must-have for Sims who want to dress in a modern and trendy swimsuit for …\"" },
  cmikd8uy8001poxbhn167dp6p: { contentType: "full-body", why: "E388 \"Syla Swimsuit\" — full-body, was dresses; desc: \"The Syla Swimsuit is a gorgeous, fashion-forward one-piece that adds a streetwear …\"" },
  cmim8x5ye00tqoxy8zwu4vuj9: { contentType: "full-body", why: "E388 \"Toddler Swimsuit\" — full-body, was dresses; desc: \"Get the Toddler Swimsuit to dress your female Sims when going out for a swim. The set is …\"" },
  cmim8wy3v00ssoxy8d7feuffp: { contentType: "full-body", why: "E388 \"Camuflaje’s Summer in Mykonos – Swimsuit iv\" — full-body, was dresses; desc: \"If you want a sexy monokini to dress your female Sim for a lazy stroll by the shore, get …\"" },
  cmky2onab00dqoxhc6vqfy8yr: { contentType: "skin", why: "E388 \"N29  Skin Maxis Match\" — skin, was dresses; desc: \"A stylish dress created by Obscurus-sims. This Maxis Match content seamlessly blends with …\"" },
  cmkxze8e50063oxhcthamrlwt: { contentType: "skin", why: "E388 \"Maxis Match Skin N28\" — skin, was dresses; desc: \"A stylish dress created by Obscurus-Sims. This Maxis Match content seamlessly blends with …\"" },
  cmsmcof7f00v5oxeu1angr7iy: { contentType: "bottoms", why: "E388 \"Sugar Wide Leg Pants\" — bottoms, was dresses; desc: \"Sugar Wide Leg Pants are rainbow-gradient pants with a dramatic flared fit and soft, …\"" },
  cmsmcnoml00uvoxeuy1wxn8ze: { contentType: "tops", why: "E388 \"Dirty Tank Top\" — tops, was dresses; desc: \"Dirty Tank Top is a layered camisole designed for Sims who spend more time creating than …\"" },
  cmim9ncui00j4oxy7tn0cm7in: { contentType: "furniture", why: "E388 \"Barbie CC Kids Room Stuff Pack\" — furniture, was dresses; desc: \"If you ever wanted your Sims’ rooms to look like they’ve stepped right out of a Barbie …\"" },
  cmijp0q5400tvoxc8pcrcue02: { contentType: "furniture", why: "E388 \"Modern Luxury Dressing Room Part 2\" — furniture, was dresses; desc: \"Step into pure sophistication with this beautiful dressing room set that feels more like …\"" },
  cmijl2n1u005aoxc8oc2anixp: { contentType: "gameplay-mod", why: "E388 \"Senior Trip Mod\" — gameplay-mod, was dresses; desc: \"If you’re looking for Sims 4 teen mods that add excitement to your gameplay, get the …\"" },
  cmsmc6bbc00lkoxeua1wu02ar: { contentType: null, why: "E388 \"Min-Jun Sim\" — NULL, was dresses; desc: \"If you’re looking for a soft and charming male Sim, check out Min-Jun Sim. He’s a …\"" },
  cmikdb4vy002toxbhadlxtgur: { contentType: null, why: "E388 \"Barbie Sim\" — NULL, was dresses; desc: \"If you don’t have time to create a Barbie from scratch, get this ready-made Sim. She’s a …\"" },
  cmikixjwc007uoxna54e0hq2a: { contentType: null, why: "E388 \"Crazy Funky Dress Crew Socks\" — NULL, was dresses; desc: \"If you want to give your loved one a lighthearted, feel-good gift, the Jeasona Men’s …\"" },
  cmim8vbzx00hsoxy89maxn7b7: { contentType: null, why: "E388 \"Deadly Toddlers\" — NULL, was dresses; desc: \"Deadly Toddlers is inspired by one of the most popular horror movies ever, Chucky. You …\"" },
  cmkxxsjcl000yoxhc1uv85tek: { contentType: null, why: "E388 \"Melanique Maxis Match Genetics\" — NULL, was dresses; desc: \"A stylish dress created by Sims3melancholic. This Maxis Match content seamlessly blends …\"" },

  // ── Audited 2026-11-11 (Sage, E389). All 443 SFW Sims 4 `bottoms` rows were
  //    read before the bottoms-cc hub shipped. 48 are not trousers, skirts or
  //    shorts: 21 shoes, 12 belts/socks/stockings (accessories), 4 tattoos,
  //    2 hair, 2 bodysuits and 7 others. Kept on purpose: outfit sets that include
  //    bottoms, "Mermaid Scale Legs" (leggings) and "Basegame Overrides Part 1"
  //    (fixes pants). NULL: the Horse Ranch EA pack and a Sim.
  cmim90df101egoxy8n25dhnr4: { contentType: "shoes", why: "E389 \"Leather high-Heel boots\" — shoes, was bottoms; desc: \"If you want a sexy pair of high-heeled boots for your female Sim, get the Leather …\"" },
  cmikkexl70097ox33p083u09u: { contentType: "shoes", why: "E389 \"Hades Sneaker\" — shoes, was bottoms; desc: \"Completing this list is the Hades Sneaker, a stylish, trendy footwear option that adds …\"" },
  cmim90dcq01efoxy8x8mdbjw9: { contentType: "shoes", why: "E389 \"Knee High Boots\" — shoes, was bottoms; desc: \"The Knee High Boots are a sexy pair of thigh-high boots for your female Sim. They feature …\"" },
  cmikk52k10046ox33q4e3x28l: { contentType: "shoes", why: "E389 \"LV Slide\" — shoes, was bottoms; desc: \"The LV Slide is a stylish, designer-inspired footwear created for male and female Sims. …\"" },
  cmijqb42601fwoxc85emysqpg: { contentType: "shoes", why: "E389 \"Chanel Patent Calfskin Mules\" — shoes, was bottoms; desc: \"For those who love platform heels, these Chanel Patent Calfskin Mules are a great …\"" },
  cmim8z2vf0165oxy85jdm5cng: { contentType: "shoes", why: "E389 \"Zaya Fur High Heels\" — shoes, was bottoms; desc: \"The Zaya Fur High Heels CC is a sexy and sultry footwear set containing cute heels with …\"" },
  cmv2cn06w0002oxj2lgjciwiu: { contentType: "shoes", why: "E389 \"Summer Breeze Platform Flip-Flops\" — shoes, was bottoms; desc: \"Summer Breeze Platform Flip-Flops are chunky Y2K sandals with thick wedge soles and …\"" },
  cmu6tqgia000foxa4n9wfqyd4: { contentType: "shoes", why: "E389 \"La Signora\" — shoes, was bottoms; desc: \"La Signora (Shoe Set) is a sophisticated collection of three heels with a sleek, feminine …\"" },
  cmikk5td0004oox33z5o92lt4: { contentType: "shoes", why: "E389 \"High-Soled Sandals With Stripes\" — shoes, was bottoms; desc: \"If you’re looking to elevate your Sim’s summer style, the High-Soled Sandals With Stripes …\"" },
  cmim8zrk001aloxy8gtmkka9s: { contentType: "shoes", why: "E389 \"Child Slippers\" — shoes, was bottoms; desc: \"Another modest shoe set for your Sim is the Child Slippers CC. The pack contains a …\"" },
  cmim9sgab004iox56kltsz1xq: { contentType: "shoes", why: "E389 \"Sims 4 CC Boots\" — shoes, was bottoms; desc: \"I LOVE these simple high heel boots! The creator has made them in 14 different colors and …\"" },
  cmim90exx01f1oxy8j1p4y66b: { contentType: "shoes", why: "E389 \"Whiskey Boots\" — shoes, was bottoms; desc: \"The Whiskey Boots by Joliebean are country-inspired footwear designed for Simmers who …\"" },
  cmim90enu01ezoxy8lc6do675: { contentType: "shoes", why: "E389 \"Mary Janes With Leg Warmers\" — shoes, was bottoms; desc: \"If you want to keep your Sim warm during the cold season, get the Mary Janes With Leg …\"" },
  cmim90cnj01e3oxy8up8s7m9y: { contentType: "shoes", why: "E389 \"Bow Heeled Boots\" — shoes, was bottoms; desc: \"The Bow Heeled Boots cc is a beautiful Sims 4 boots cc to help improve your Sim’s fashion …\"" },
  cmim8zqdz01a1oxy8s2ek2z0u: { contentType: "shoes", why: "E389 \"Corey Trainers\" — shoes, was bottoms; desc: \"Who said kids can’t stay fit? The Corey Trainers CC by Plumbobs and Fries allows your …\"" },
  cmim8v6t400gtoxy8dddrrhru: { contentType: "shoes", why: "E389 \"Heel Boots\" — shoes, was bottoms; desc: \"Heel Boots are simplistic boots with heels. They also contain ankle bracelets with …\"" },
  cmil170wy009woxeepidp3g8k: { contentType: "shoes", why: "E389 \"Cheetah Heels\" — shoes, was bottoms; desc: \"As a die-hard fan of thigh-high boots, I am always looking for stunning Sims 4 boots to …\"" },
  cmikkn7c000dqox338d1dk7ic: { contentType: "shoes", why: "E389 \"Wedge Heels S161\" — shoes, was bottoms; desc: \"The Wedge Heels S161 are similar in shape to the ones included above, except these …\"" },
  cmika0cmg00eloxk7etuohxjo: { contentType: "shoes", why: "E389 \"Denim Stretch Heeled Boots\" — shoes, was bottoms; desc: \"These beautiful Denim stretch-heeled boots feature realistic denim detailing and folds …\"" },
  cmik9wbyw00c7oxk734w4ep6r: { contentType: "shoes", why: "E389 \"Retro Mary Jane\" — shoes, was bottoms; desc: \"When creating a 1950s-inspired look, we can’t forget the signature pump heels. These are …\"" },
  cmijpald900ywoxc8etv5a8qp: { contentType: "shoes", why: "E389 \"Chunky Flower Sandals\" — shoes, was bottoms; desc: \"Add the ultimate finishing touch to your Sim’s Y2K look with these Chunky Flower Sandals. …\"" },
  cmikkltqr00cxox33uobnw0gs: { contentType: "tattoos", why: "E389 \"Demyan Tattoo Set\" — tattoos, was bottoms; desc: \"The Demyan Tattoo Set is a minimal tattoo collection designed to evoke artistic taste in …\"" },
  cmikijj68001xoxnab5fyhyrj: { contentType: "tattoos", why: "E389 \"Botanica Tattoo Set\" — tattoos, was bottoms; desc: \"If you love tattoos, you need to add this Botanica Tattoo Set to your Sims 4 cc finds for …\"" },
  cmika5rk800hvoxk7znvq30ul: { contentType: "tattoos", why: "E389 \"Random Tattoos N3\" — tattoos, was bottoms; desc: \"The Random Tattoos No. 3 by Hitohari is a bold and minimalistic thigh tattoo that …\"" },
  cmika4xt700hdoxk7fgycjd6s: { contentType: "tattoos", why: "E389 \"Robynq Tattoo RL3052\" — tattoos, was bottoms; desc: \"If you want to give your Sims an inked-up look with meaning, this Robynq leg tattoo is a …\"" },
  cmil1n8dk00guoxeetpbwrz72: { contentType: "accessories", why: "E389 \"Medieval Belts Accessories\" — accessories, was bottoms; desc: \"The Medieval Belts Accessories feature finely crafted medieval belts in five distinct …\"" },
  cmil1c2o500bnoxee5gsixnqz: { contentType: "accessories", why: "E389 \"Punk Set Stocking\" — accessories, was bottoms; desc: \"The Punk Set Stocking pack is the perfect statement piece for rebellious and edgy Sims. …\"" },
  cmil1ae5p00b3oxeezb6fz8pw: { contentType: "accessories", why: "E389 \"Odd Goth Socks\" — accessories, was bottoms; desc: \"The Odd Goth Socks pack is a beautiful Sims 4 socks cc that adds an unconventional, edgy …\"" },
  cmil313y7008moxpz2mo7lhph: { contentType: "accessories", why: "E389 \"Adidas Socks\" — accessories, was bottoms; desc: \"The Adidas Socks pack is a gorgeous Sims 4 socks cc to add to your mods folder. It …\"" },
  cmil1n54c00gsoxeee5fdig6r: { contentType: "accessories", why: "E389 \"Cecelia Acc Belts with Chains\" — accessories, was bottoms; desc: \"The Cecelia Acc Belts with Chains is a bold accessory with cascading metal chains draping …\"" },
  cmil1nxw800h9oxeetjddwh34: { contentType: "accessories", why: "E389 \"Round Chain Accessory Belt Set\" — accessories, was bottoms; desc: \"The Round Chain Accessory Belt Set is a stylish statement piece comprising interconnected …\"" },
  cmil1o7sq00hcoxeec6n7sfug: { contentType: "accessories", why: "E389 \"Dakota Belt\" — accessories, was bottoms; desc: \"The Dakota Belt is a stunning waist accessory that pairs perfectly with normal, everyday …\"" },
  cmil1nwi200h8oxee4a050yxj: { contentType: "accessories", why: "E389 \"Spiked Belt\" — accessories, was bottoms; desc: \"I haven’t included many belt options exclusively for male Sims, so here’s one. This …\"" },
  cmil1nklv00h1oxeec2718tov: { contentType: "accessories", why: "E389 \"Vintage Hip Belt Accessory\" — accessories, was bottoms; desc: \"The Vintage Hip Belt Accessory is a wide, slightly slanted belt with a large metal buckle …\"" },
  cmil1nbg400gwoxeeky5enwkg: { contentType: "accessories", why: "E389 \"Big Round Belt\" — accessories, was bottoms; desc: \"The Big Round Belt cc is a statement accessory designed to add a bold, vintage touch to …\"" },
  cmil1mwls00gnoxee0hkbetab: { contentType: "accessories", why: "E389 \"Accessory Chain Belts\" — accessories, was bottoms; desc: \"If you’re looking for a stylish belt to add to your accessory collection, check out the …\"" },
  cmsmbqfg200d3oxeupqjtq62s: { contentType: "accessories", why: "E389 \"Prosthetic Legs\" — accessories, was bottoms; desc: \"These Prosthetic Legs are a great option for adding more inclusive character …\"" },
  cmijpk99u013eoxc8e9k1dzsj: { contentType: "jewelry", why: "E389 \"Signature Rings\" — jewelry, was bottoms; desc: \"Signature Rings are bold, edgy Sims 4 accessories designed with chunky and gothic …\"" },
  cmim92abq01qfoxy816hhf8oc: { contentType: "hair", why: "E389 \"Riquissima Hair\" — hair, was bottoms; desc: \"If you want a bold hairstyle to add to your Sims 4 cc curly hair collection, get the …\"" },
  cmil2m78e001roxpzz3gb4kff: { contentType: "hair", why: "E389 \"Reina Hair\" — hair, was bottoms; desc: \"If you want a modern style for female Sims, get the Reina Hair. It’s a straight bob with …\"" },
  cmim8rn0x001loxy8mg8tw8o1: { contentType: "body-preset", why: "E389 \"Valuka Body N6\" — body-preset, was bottoms; desc: \"If you’re looking for a fit Sims 4 male body preset cc, check out the Body N6 pack by …\"" },
  cmim8w3vx00mkoxy8659rme4d: { contentType: "full-body", why: "E389 \"Skims Thong Shaping Bodysuit\" — full-body, was bottoms; desc: \"If you love Skims and are looking for an exact replica to use in-game, get the Skims …\"" },
  cmikkj2hz00b9ox33z517osqu: { contentType: "full-body", why: "E389 \"CyFi EP Cyberpunk bodysuit\" — full-body, was bottoms; desc: \"The CyFi EP Cyberpunk bodysuit is a full-body outfit designed for your female Sim. It has …\"" },
  cmikivec4006woxnay9tz8dlr: { contentType: "rugs", why: "E389 \"Random Tufted Rugs Part 2\" — rugs, was bottoms; desc: \"Let your floors do the talking with the Random Tufted Rugs Part 2 set. This is a bold and …\"" },
  cmil1e71t00cioxeeavt5votb: { contentType: "wall-art", why: "E389 \"Music Artists Tapestries\" — wall-art, was bottoms; desc: \"The Music Artists Tapestries brings a music fandom aesthetic into your Sims space. These …\"" },
  cmijp1bte00u8oxc81c15z81l: { contentType: "decor", why: "E389 \"Stylish Closet Hanging Belts and Ties\" — decor, was bottoms; desc: \"When building a realistic wardrobe, the little details make all the difference, and this …\"" },
  cmim9jorg002eoxy7gm1iof01: { contentType: null, why: "E389 \"The Sims 4 Horse Ranch\" — NULL, was bottoms; desc: \"Saddle up and get ready for a wild ride with “The Sims 4 Horse Ranch” Expansion Pack, an …\"" },
  cmim8vkdp00izoxy8o3mvjk8p: { contentType: null, why: "E389 \"Lemon Meringue and Henna\" — NULL, was bottoms; desc: \"Lemon Meringue and Henna is a lemon-inspired Sim you can add to your Sims 4 gameplay. …\"" },
  // ── Audited 2026-11-13 (Sage, E399). All 1,083 SFW Sims 4 `tops` rows were
  //    read before the tops-cc hub shipped. 228 (21.1%) are not tops, twice the
  //    dresses/bottoms rate: 42 bottoms, 32 hair, 22 dresses, 22 full-body, 16
  //    shoes, 16 furniture, 15 accessories, 7 gameplay mods, 6 tattoos, 5 pet
  //    clothing and 26 others, plus 19 NULL. Each was decided from the title,
  //    then the row's own description. Kept on
  //    purpose: sets and collections that contain a top, bikini/swimsuit tops
  //    (two-piece swimsuits go to full-body, E388), "Apron With Rouches and
  //    T-Shirt", "Overall Denim Skirt & T-Shirt" and "Lazy Eyelids" (a kids'
  //    clothing set, despite the name). NULL where no facet fits: real-world
  //    products, Sims, save files and boilerplate descriptions.
  cmijpflo20111oxc89wq4f4ee: { contentType: "bottoms", why: "E399 \"Kobe Sweats\" — bottoms, was tops; desc: \"Created by POPPIN, Kobe Sweats are stylish, baggy sweatpants with built-in boxers. The …\"" },
  cmim8zq01019uoxy89at5dm2p: { contentType: "shoes", why: "E399 \"University Blue 6’s\" — shoes, was tops; desc: \"If you’re looking for a cool Jordan-inspired pair of sneakers for your kid Sim, get …\"" },
  cmim8vu0f00kkoxy8b093fcwc: { contentType: "gameplay-mod", why: "E399 \"Infant and Toddler Medical Care\" — gameplay-mod, was tops; desc: \"Infant and Toddler Medical Care is a realistic mod that adds healthcare to your …\"" },
  cmoivj1hm0005oxr3z90oqgk1: { contentType: "dresses", why: "E399 \"Devonne Set\" — dresses, was tops; desc: \"This fitted full-body dress is a must-have in your 2026 gameplay. It’s designed with a …\"" },
  cmim8vz5w00lmoxy81duvhx7q: { contentType: "shoes", why: "E399 \"Kids & Toddlers High top Converse Run Star\" — shoes, was tops; desc: \"The Kids and Toddlers High-top Converse Run Star sneakers cc come in 12 vibrant …\"" },
  cmil0q56g0022oxeen06h6910: { contentType: null, why: "E399 \"Spiral Stairs\" — NULL, was tops; desc: \"This list wouldn’t be complete without including these beautiful Spiral Stairs. I love …\"" },
  cmijj4cax003noxs3gpdacavn: { contentType: null, why: "E399 \"Teeth With Braces\" — NULL, was tops; desc: \"For those who want simple braces for their teens, these are an exceptional choice. …\"" },
  cmim8zlq60198oxy8wgtpnhxf: { contentType: "full-body", why: "E399 \"Pierced Bikini\" — full-body, was tops; desc: \"The Pierced Bikini is a sexy pair of swimwear designed solely for your adult female …\"" },
  cmik91i0f0029oxk7bug6tgon: { contentType: "bottoms", why: "E399 \"Elvira Skirt\" — bottoms, was tops; desc: \"If you’re into dark aesthetics like I am, you need the Elvira Skirt by Guemara. It’s a …\"" },
  cmim8zqa5019zoxy8elk62z6k: { contentType: "shoes", why: "E399 \"Air Jordan 8 Retro ‘South Beach’\" — shoes, was tops; desc: \"Another brand-inspired Sims 4 kids shoes cc is the Air Jordan 8 Retro ‘South Beach.’ …\"" },
  cmim8rmqs001goxy8gyzhdyjc: { contentType: "body-preset", why: "E399 \"Classic Physique Torso Body Mesh\" — body-preset, was tops; desc: \"Here’s a Sims 4 male body preset that’s perfect for athletic Simmers who are into …\"" },
  cmil0moxx000noxeedk6t2ez2: { contentType: "hair", why: "E399 \"Amarie Locs\" — hair, was tops; desc: \"EH Simsis a powerhouse when it comes to creating loc’d hairstyles for Sims. I’ve used …\"" },
  cmijkgvy2000koxc8gdktd3ac: { contentType: "furniture", why: "E399 \"Agota Livingroom\" — furniture, was tops; desc: \"If you’re looking for a warm, farmhouse-inspired living room set built around soft …\"" },
  cmim8y0w50104oxy894lxw86n: { contentType: "dresses", why: "E399 \"Modern N1\" — dresses, was tops; desc: \"Modern N1 is a set containing a turtleneck sweater dress and knee-high boots. The …\"" },
  cmikd8sgk001noxbhob26urfu: { contentType: "full-body", why: "E399 \"Sims 4 Swimwear Set\" — full-body, was tops; desc: \"If you’re looking for a modern Sims 4 swimwear cc that sits right on your Sim’s body, …\"" },
  cmoivj2lz000boxr3bplshebu: { contentType: "dresses", why: "E399 \"Mar Dress\" — dresses, was tops; desc: \"If you want a sleek, sculpted gown that highlights your Sim’s shape, I recommend using …\"" },
  cmikkorkv00epox33v67mahnu: { contentType: "bottoms", why: "E399 \"Joggers\" — bottoms, was tops; desc: \"I love a good pair of joggers, and these by blewis50 are outright stunning. They …\"" },
  cmikd8qe3001moxbhvaf85l0v: { contentType: "full-body", why: "E399 \"Ayria Bikini\" — full-body, was tops; desc: \"The Ayria Bikini is a beautiful, ultra-revealing two-piece swimsuit worthy of any …\"" },
  cmmvao4qi0009oxzggcgqv5lc: { contentType: "bottoms", why: "E399 \"Male Basic Jeans\" — bottoms, was tops; desc: \"The Male Basic Jeans are classic straight-leg denim pants designed for everyday wear. …\"" },
  cmmvao5ef000koxzgqcngpa7c: { contentType: "bottoms", why: "E399 \"Zachery Shorts\" — bottoms, was tops; desc: \"Zachery Shorts are relaxed Bermuda-style jogger shorts designed with a loose, …\"" },
  cmik91kow002boxk7ijtxsiz7: { contentType: "bottoms", why: "E399 \"Sahara Skirt\" — bottoms, was tops; desc: \"The Sahara Skirt is definitely one of my favorite CCs on this list. The long, flowy …\"" },
  cmil19ybx00b1oxeep111p87p: { contentType: "accessories", why: "E399 \"Fur Accessory\" — accessories, was tops; desc: \"Another great hand warmer option is this Fur Accessory. As the name suggests, it’s …\"" },
  cmijqb8l301fzoxc8gm5vys9e: { contentType: "bottoms", why: "E399 \"Jennie Chanel Set\" — bottoms, was tops; desc: \"This base-game compatible Sims 4 Chanel cc by EunoSims comprises two overalls and a …\"" },
  cmikiykl1008boxnaho4m9i57: { contentType: "hair", why: "E399 \"Curly High Top\" — hair, was tops; desc: \"The Curly High Top is a bold, textured hairstyle full of bounce and flair. This …\"" },
  cmika0vze00evoxk7u82r4omy: { contentType: "full-body", why: "E399 \"Tropical Bikini Top and Bottom\" — full-body, was tops; desc: \"It’s summer in Sims 4, and I know you’re probably looking for stylish swimsuit options …\"" },
  cmijq1a0s01broxc8z8xljo9b: { contentType: "hair", why: "E399 \"Estalian Ponytail\" — hair, was tops; desc: \"BrandySims creates stunning Sims 4 hair options for black girls, and this Estalian …\"" },
  cmijpuq2h018toxc8ros6frpy: { contentType: "gameplay-mod", why: "E399 \"Violent Trait\" — gameplay-mod, was tops; desc: \"Do you want pure chaos in your Sim’s household? Download the Violent Trait. It makes …\"" },
  cmmvao4b40002oxzgk6el1fxd: { contentType: "bottoms", why: "E399 \"Men’s Cargo Pants\" — bottoms, was tops; desc: \"Men’s Cargo Pants are casual utility-style trousers with a slim, tapered fit and …\"" },
  cmij3i909003koxkzbop514u8: { contentType: null, why: "E399 \"STGAubron Gaming PC Desktop\" — NULL, was tops; desc: \"If you prefer gaming on a desktop instead of a laptop, get the STGAubron Gaming PC …\"" },
  cmikisdlg005hoxnafawihksz: { contentType: "hair", why: "E399 \"Zoe Curls\" — hair, was tops; desc: \"Another great afro hair Sims 4 cc to add to your collection is the Zoe Curls by …\"" },
  cmil3lwro00gcoxpz0ns17mz7: { contentType: "jewelry", why: "E399 \"Lip Piercings\" — jewelry, was tops; desc: \"The Lip Piercings is one of the best Sims 4 cc finds for January to add to your mods …\"" },
  cmijq78kw01enoxc8fmmbsujg: { contentType: "full-body", why: "E399 \"Knit Swimwear and Hat Set\" — full-body, was tops; desc: \"If you’re on the hunt for the cutest, quirkiest swimsuit, get this Strawberry/Cloud …\"" },
  cmikd86ga001boxbh49uojiii: { contentType: "bottoms", why: "E399 \"Garota Bikini Bottom\" — bottoms, was tops; desc: \"If you’re looking for a sleek and simple swimwear bottom to show off your Sim’s …\"" },
  cmim8y0je00zyoxy8xnz5f7wz: { contentType: "hats", why: "E399 \"Fall Beanie\" — hats, was tops; desc: \"Fall Beanie is a simple yet stylish hat for your female Sims. It comes in 21 swatches, …\"" },
  cmim8w4r700mzoxy8msl8dhib: { contentType: "bottoms", why: "E399 \"Tight Skirt\" — bottoms, was tops; desc: \"If you’re looking for bandage skirts to add to your Sims 4 female clothes cc …\"" },
  cmmvaqf1j007uoxzg9s1x4mvw: { contentType: "shoes", why: "E399 \"Tia Boots\" — shoes, was tops; desc: \"If you’re looking for bold, edgy Sims 4 boots cc, the Tia Boots are the perfect pick. …\"" },
  cmikkn53y00doox330kmb75fa: { contentType: "shoes", why: "E399 \"Praia Heels\" — shoes, was tops; desc: \"I love the Praia Heels designed by Ruchellsims. They’re super high block heels with …\"" },
  cmijpsd6p017foxc8b7igjc4m: { contentType: "accessories", why: "E399 \"S-Club LL ts4 wings 202001\" — accessories, was tops; desc: \"You can never have enough wings for your fairy Sims, and these ones by S-Club are at …\"" },
  cmigsuccz001aoxkz5kmzkgsg: { contentType: "full-body", why: "E399 \"Sims 4 Mermaid Tail CC & Bra\" — full-body, was tops; desc: \"Oh MY! Look at how stunning these mermaid tails and bras are. They’re so pearlescent …\"" },
  cmijpimos012moxc8dxzhvokw: { contentType: "bottoms", why: "E399 \"Babilonia Skirt\" — bottoms, was tops; desc: \"This Babilonia Skirt is sleek and sophisticated, which makes it a perfect choice for …\"" },
  cmim8w3bk00maoxy8m9tfm4cn: { contentType: "bottoms", why: "E399 \"Leather Set 90\" — bottoms, was tops; desc: \"Leather Set 90 is a set of leather pants designed for female Sims, ages teen to elder. …\"" },
  cmil3m3mx00ggoxpzswu91rzp: { contentType: "hair", why: "E399 \"Frizzled Updo\" — hair, was tops; desc: \"The Frizzled Updo is a voluminous and bold hairstyle ideal for Simmers who want …\"" },
  cmijp3qty00vdoxc8hsr7oova: { contentType: "furniture", why: "E399 \"Closet Stuff\" — furniture, was tops; desc: \"A bachelor pad isn’t complete without a realistic closet, and this set gives you …\"" },
  cmmvaqy8j0092oxzgdvtr92nx: { contentType: "full-body", why: "E399 \"Felix Suit: Valentine’s Day Gift\" — full-body, was tops; desc: \"If you’re looking for a sharp and romantic outfit for your male Sims, get the Felix …\"" },
  cmsmcf7hr00qaoxeuj3vmwlka: { contentType: "full-body", why: "E399 \"Male Basic Overalls\" — full-body, was tops; desc: \"Male Basic Overalls are relaxed-fit denim overalls designed for casual everyday …\"" },
  cmil1cfkm00bsoxeeisy3wcn7: { contentType: "bottoms", why: "E399 \"Leggings\" — bottoms, was tops; desc: \"The Leggings cc by Camuflaje are perfect for casual, everyday wear. They boast a …\"" },
  cmmvarneo00adoxzgqirpjt99: { contentType: "bottoms", why: "E399 \"Hannah Shorts\" — bottoms, was tops; desc: \"If you want a simple, everyday staple for your Sims, the Hannah Shorts are a perfect …\"" },
  cmmvao4of0008oxzgwzmvgu9r: { contentType: "bottoms", why: "E399 \"Marcus Chain Jeans\" — bottoms, was tops; desc: \"The Marcus Chain Jeans are slim-fit denim pants with metal chain detailing …\"" },
  cmijp1itl00ucoxc8jnn26ymr: { contentType: "furniture", why: "E399 \"Walk-In Closet Collection\" — furniture, was tops; desc: \"If you’re looking for a sleek and versatile walk-in closet setup, the Walk In Closet …\"" },
  cmsmc63lw00leoxeutjnsqroj: { contentType: null, why: "E399 \"Daryl Sim Download\" — NULL, was tops; desc: \"Daryl Sim Download is a stylish male Sim with bright blue eyes and defined facial …\"" },
  cmijj0l19001woxs3ta2httgk: { contentType: "furniture", why: "E399 \"Palace Dining Set\" — furniture, was tops; desc: \"If you want a formal Victorian dining room that looks like a palace banquet hall, use …\"" },
  cmikkbztj007rox33j61yu2m0: { contentType: "hair", why: "E399 \"Awake\" — hair, was tops; desc: \"If you’re looking for a high-volume pixie cut for your male Sims, get this Awake …\"" },
  cmim90xwq01i9oxy8fjuc9v20: { contentType: "hair", why: "E399 \"Aelia Hair\" — hair, was tops; desc: \"If you’re into bun hairstyles, get the Aelia Hair by Arethabee. It’s a cute ponytail …\"" },
  cmijp2f9y00unoxc8yorjjkmw: { contentType: "full-body", why: "E399 \"Little Junior Autumn Overalls\" — full-body, was tops; desc: \"Designed specifically for toddlers, the Little Junior Autumn Overalls bring playful …\"" },
  cmim8rsai002hoxy87mt1rktt: { contentType: "gameplay-mod", why: "E399 \"Digital Romance Mod\" — gameplay-mod, was tops; desc: \"The Digital Romance Mod is a clear representative of today’s dating world where people …\"" },
  cmikd8p6t001loxbhlftudyeo: { contentType: "full-body", why: "E399 \"Tropical Bikini\" — full-body, was tops; desc: \"If you’re looking for a stylish and daring bikini that adds sass to tropical island …\"" },
  cmw28i2w8001joxfn01y1owd2: { contentType: "clutter", why: "E399 \"Folded Laundry Default Replacement\" — clutter, was tops; desc: \"Folded Laundry Default Replacement is a laundry mod designed to replace the original …\"" },
  cmil0vsi3004voxee5pae1xc0: { contentType: "shoes", why: "E399 \"Timberlands\" — shoes, was tops; desc: \"Does anyone remember how popular Timberlands were back in the day? Almost every …\"" },
  cmika04at00eeoxk7nqady1x3: { contentType: "bottoms", why: "E399 \"Timeless Denim Revolution Skirt\" — bottoms, was tops; desc: \"Busra-Tr makes some of the most beautiful Sims 4 clothing pieces, and this Timeless …\"" },
  cmkylqb9n0149oxhcz2p9bqbs: { contentType: "clutter", why: "E399 \"Straight From The 80s\" — clutter, was tops; desc: \"Straight From the 80s - Roller Skates 1 [clutter] A compilation of darling items …\"" },
  cmijmwp1z008ioxc82u0x1x70: { contentType: "full-body", why: "E399 \"Toadstool\" — full-body, was tops; desc: \"Toadstool is a collection of dungarees with frog designs. There are two versions: one …\"" },
  cmikk8rct006hox337j4toz6w: { contentType: "hair", why: "E399 \"Tonya Hair\" — hair, was tops; desc: \"If you’re looking for a charming, ribbon-wrapped updo for your Sim, the Tonya Hair is …\"" },
  cmsmblh8500ajoxeuxedp3too: { contentType: "accessories", why: "E399 \"Angelic Stockings\" — accessories, was tops; desc: \"Angelic Stockings are delicate, thigh-high socks designed for coquette styling. They …\"" },
  cmim8xgo200w9oxy8kbkjdv60: { contentType: "career", why: "E399 \"Tattoo Artist Career\" — career, was tops; desc: \"The Tattoo Artist Career is a mod by MarlynSims that allows creative Sims to express …\"" },
  cmikkbdpv007dox33mbe5gqfx: { contentType: "hair", why: "E399 \"Mid Curly Revamp\" — hair, was tops; desc: \"If you prefer the look of traditional pixie cuts, get this Mid Curly Bob. It’s a …\"" },
  cmim8u7xm00bgoxy8045zj1sg: { contentType: "food", why: "E399 \"Starbucks Coffee Set\" — food, was tops; desc: \"If you’re a coffee lover and want something warm and stylish to drink during autumn, …\"" },
  cmil3mdgm00gkoxpzn9xjdo9a: { contentType: "jewelry", why: "E399 \"Midi Rings\" — jewelry, was tops; desc: \"Midi Rings is a stunning jewelry set that features an elegant and gothic-inspired …\"" },
  cmku91rtw006toxkzoyag2ze4: { contentType: "pet-clothing", why: "E399 \"Sims 4 Wool Sweaters for Dogs\" — pet-clothing, was tops; desc: \"A stylish top created by Birba32. This custom content clothing item adds a fresh …\"" },
  cmmvau2zw00exoxzg8776t6qe: { contentType: "hair", why: "E399 \"Double Ponytail Hairstyle\" — hair, was tops; desc: \"The Double Pony Hairstyle is perfect for your Sim’s winter looks. It’s long and wavy, …\"" },
  cmoivj1ma0007oxr3sedq6r3w: { contentType: "dresses", why: "E399 \"Kielo Dress\" — dresses, was tops; desc: \"The Kielo Dress is a short, fitted dress inspired by classic Finnish styling. It comes …\"" },
  cmijj01he001koxs3awqgyl0s: { contentType: "curtains", why: "E399 \"Empire Redux\" — curtains, was tops; desc: \"For your bedroom, get the Empire Redux set. It recreates the over-the-top royal luxury …\"" },
  cmigu1q9b001roxkzee2wz1o6: { contentType: "food", why: "E399 \"Cherry Blossom Matcha Latte\" — food, was tops; desc: \"For those who want a breakfast drink option to add to their Sims 4 custom food recipe …\"" },
  cmika5p7n00htoxk7iaj1j42d: { contentType: "tattoos", why: "E399 \"Random Tattoos 48\" — tattoos, was tops; desc: \"If you’re looking for a soft and feminine tattoo for your female and male Sims, get …\"" },
  cmikklmvc00csox33psgt36wj: { contentType: "tattoos", why: "E399 \"Hottie Back Tattoos\" — tattoos, was tops; desc: \"I can’t stop creating hot, black-girl Sims, and I normally use the Hottie Back Tattoos …\"" },
  cmmvaqxtf008voxzgie69f0xb: { contentType: "full-body", why: "E399 \"Valentine’s Day: Wild Love Bodysuit\" — full-body, was tops; desc: \"Valentine’s Day: Wild Love Bodysuit is a daring, confident lingerie-style piece with a …\"" },
  cmijj0xeu0023oxs3q69zetqj: { contentType: "furniture", why: "E399 \"Living Room Victoria\" — furniture, was tops; desc: \"This Victorian living room set mixes wood, metal accents, and soft upholstery to …\"" },
  cmim8re46000eoxy8liwkm95l: { contentType: "furniture", why: "E399 \"Serenity Hot Tub CC Sims 4\" — furniture, was tops; desc: \"If you’re looking for a modern and gorgeous Sims 4 outdoor furniture cc, check out the …\"" },
  cmmvaqygk0096oxzgzqhug7oq: { contentType: "dresses", why: "E399 \"Valentine’s Day Heart Dress\" — dresses, was tops; desc: \"Valentine’s Day Heart Dress is one of my favorite Sims 4 valentines clothes cc on this …\"" },
  cmik91bdl0024oxk73kw5dplt: { contentType: "bottoms", why: "E399 \"H-Line Knee Skirt\" — bottoms, was tops; desc: \"If you want to create a formal look for your female Sim, get the H-Line Knee Skirt. …\"" },
  cmikkbb6u007box33cs54hvs1: { contentType: "hair", why: "E399 \"WINGS-OE0912\" — hair, was tops; desc: \"The WINGS OE0611 pixie cut is a sleek, asymmetrical style that combines structure with …\"" },
  cmikj1cbh009loxnak140bqdd: { contentType: "furniture", why: "E399 \"Smart TV\" — furniture, was tops; desc: \"This Smart TV blends realistic technology with a homey charm and a modern flat-screen …\"" },
  cmim92oh701skoxy8af196ngk: { contentType: "hair", why: "E399 \"Alysea\" — hair, was tops; desc: \"The Goddess Alysea Hair by Daylifesims is a Maxis Match hairstyle that features long, …\"" },
  cmsmcsyfh00xhoxeuua50erc7: { contentType: "bottoms", why: "E399 \"Asymmetrical Split Ruffles Skirt\" — bottoms, was tops; desc: \"Asymmetrical Split Ruffles Skirt is a statement bottom with an uneven hem, side split, …\"" },
  cmik911nx001yoxk7uun5xn4y: { contentType: "bottoms", why: "E399 \"Grace Skirt\" — bottoms, was tops; desc: \"The Grace Skirt is a long maxi skirt with a mermaid-inspired design. It’s the ultimate …\"" },
  cmikdbabr002woxbh6oucmi6i: { contentType: "hair", why: "E399 \"Barbie Hair Set\" — hair, was tops; desc: \"The Barbie Hair Set by daylifesims is one of my top Sims 4 Barbie cc finds on this …\"" },
  cmijp574b00w3oxc8gijlku01: { contentType: "skin", why: "E399 \"Male Skintone\" — skin, was tops; desc: \"If you’re looking for realistic skin options to give your male Sims more depth and …\"" },
  cmijngoxj00dsoxc8syurn40t: { contentType: "furniture", why: "E399 \"Lama Kidsroom Part 2\" — furniture, was tops; desc: \"Lastly, on my top Sims 4 furniture cc list for 2025 is the Lama Kidsroom Part 2. This …\"" },
  cmoivj1t1000aoxr3dfmwjgy5: { contentType: "dresses", why: "E399 \"Corset Belt Dress\" — dresses, was tops; desc: \"If you’re looking for a bold, statement mini dress, get the Corset Belt Dress set. …\"" },
  cmim8xv1v00yooxy8gkglhz89: { contentType: "hair", why: "E399 \"Blake Hair\" — hair, was tops; desc: \"Blake Hair is another great male CC hairstyle to add to your mods folder. The style …\"" },
  cmsmct6e000xnoxeuhekvtlmy: { contentType: "bottoms", why: "E399 \"Arcane Illusions – Ruffle Skirt\" — bottoms, was tops; desc: \"If you’re looking for a fairytale-inspired skirt, Arcane Illusions – Ruffle Skirt is a …\"" },
  cmoivj2z5000hoxr3c86iglgn: { contentType: "dresses", why: "E399 \"Fancy Present\" — dresses, was tops; desc: \"Fancy Present is a full-body dress designed with a structured bodice and a voluminous, …\"" },
  cmikk7of6005rox33y5sy8uqh: { contentType: "hair", why: "E399 \"Anna Hair\" — hair, was tops; desc: \"If you’re looking for an elegant, playful hairstyle for your toddler, the Anna Hair is …\"" },
  cmsmbtb5h00enoxeukq5b4fbn: { contentType: null, why: "E399 \"Reaper Eye Patch\" — NULL, was tops; desc: \"If you want a bold pirate eyepatch with gothic and alternative styling, the Reaper Eye …\"" },
  cmik91fhb0027oxk751rdt9f0: { contentType: "bottoms", why: "E399 \"Eternal Midi Skirt\" — bottoms, was tops; desc: \"I like the Eternal Midi Skirt as it’s simple yet comes in colorful prints and textures …\"" },
  cmika7l2r00ivoxk74nt9kwmm: { contentType: "poses", why: "E399 \"Motorcycle #3\" — poses, was tops; desc: \"If you want an alternative male pose pack for your edgy Sim, get the Motorcycle #3. It …\"" },
  cmik8y9at000boxk7a4wg9lzs: { contentType: "hair", why: "E399 \"Disconnected Top Knot\" — hair, was tops; desc: \"Sleek, clean, and sophisticated is how I would describe this Sims 4 man bun cc. The …\"" },
  cmil1n9yi00gvoxeejkkasfks: { contentType: "accessories", why: "E399 \"Belt Revolver One\" — accessories, was tops; desc: \"If you’re looking for a rugged, Western-inspired accessory, check out the Belt …\"" },
  cmikij624001noxnauqz9e52c: { contentType: "hair", why: "E399 \"Childlike Things\" — hair, was tops; desc: \"Childlike Things is a collection of hairstyles and accessories for adults and kids. …\"" },
  cmmvau3ee00f3oxzga00exnw4: { contentType: "shoes", why: "E399 \"Platform Winter Boots Male\" — shoes, was tops; desc: \"These Platform Winter Boots are the perfect shoe accessory for your male Sims. They’re …\"" },
  cmikipqtd003zoxna47d2u1q9: { contentType: "accessories", why: "E399 \"Phantom Mask\" — accessories, was tops; desc: \"If you’re looking for a mysterious, theatrical mask straight out of a dramatic opera …\"" },
  cmsmcsvsv00xfoxeu8q3gr4a5: { contentType: "bottoms", why: "E399 \"Ruffled Skirt\" — bottoms, was tops; desc: \"Ruffled Skirt (Prints) is a playful mini skirt with a soft ruffle hem. It’s available …\"" },
  cmijpvpd4019eoxc86re1pz6f: { contentType: "gameplay-mod", why: "E399 \"Feminine and Manly Traits\" — gameplay-mod, was tops; desc: \"I included this set for Simmers who want to bring back a bit of classic Sims humor and …\"" },
  cmijnuke000jooxc899royhvr: { contentType: "bottoms", why: "E399 \"Show Girl Tassel Bottom\" — bottoms, was tops; desc: \"Bring some sparkle and drama to your Sim’s wardrobes with this dazzling Showgirl …\"" },
  cmim8s347003roxy8letf3eeg: { contentType: "shoes", why: "E399 \"Leather Pumps 06\" — shoes, was tops; desc: \"If you love the look of pump heels, you need the Leather Pumps 06 designed by Jius …\"" },
  cmjh4kvpg0004oxyv5pnuthn4: { contentType: "hair", why: "E399 \"CAMO – Selita Braids\" — hair, was tops; desc: \"These Selita Braids look drop-dead gorgeous in-game. They come in 40 colors, which …\"" },
  cmikkd4i00089ox33bd7n2wk5: { contentType: "hair", why: "E399 \"Taper Fro\" — hair, was tops; desc: \"If you’re looking for a simple tapered fro for your male Sim, get this one. It’s a …\"" },
  cmoivj3ad000moxr3pr4krizq: { contentType: "dresses", why: "E399 \"Loly Set\" — dresses, was tops; desc: \"This polished, feminine set is built around structured mini dresses and sleek heels, …\"" },
  cmmvaqxvn008woxzg4h1x8z1q: { contentType: "dresses", why: "E399 \"Amour Bustier Dress\" — dresses, was tops; desc: \"Designed by BackTrack, the Amour Bustier Dress is a soft, romantic dress ideal for …\"" },
  cmmvaqxid008qoxzgr2vbwwla: { contentType: "dresses", why: "E399 \"Lovebird Dress & Tights\" — dresses, was tops; desc: \"The Lovebird Dress & Tights is a darling mini dress with puffy sleeves, delicate lace …\"" },
  cmil1nj8y00h0oxeef9czx0nh: { contentType: "accessories", why: "E399 \"Nilah Chain Belt Accessory\" — accessories, was tops; desc: \"If you’re looking for a sleek, elegant waist accessory, the Nilah Chain Belt Accessory …\"" },
  cmim9mdac00fioxy722idd5rd: { contentType: null, why: "E399 \"ASUS TUF Dash 15 (2021) Ultra Slim Gaming Laptop\" — NULL, was tops; desc: \"If you are wanting a gaming laptop that makes it easy to play sims anywhere, this is …\"" },
  cmijq204101c5oxc8cc4ur52n: { contentType: "hair", why: "E399 \"Fluffy Ponytail\" — hair, was tops; desc: \"The Fluffy Ponytail is a unique hairstyle unlike any other on this list. It’s playful …\"" },
  cmsmb2jtr000ioxeu83jtqxfh: { contentType: "accessories", why: "E399 \"Strawberry Cupcake Aprons\" — accessories, was tops; desc: \"Strawberry Cupcake Aprons are colorful pieces designed to celebrate the creator’s 30th …\"" },
  cmik9q1lh008xoxk7j3y6qo8m: { contentType: "commercial", why: "E399 \"La Villa Restaurant\" — commercial, was tops; desc: \"La Villa Restaurant is an old-fashioned build that brings a touch of timeless charm to …\"" },
  cmikj02cv0090oxnaan4drequ: { contentType: null, why: "E399 \"ASUS ROG Strix G18\" — NULL, was tops; desc: \"The ASUS ROG Strix G18 (2025) is designed for gamers seeking top-tier performance and …\"" },
  cmmvaqe83007moxzgm0tydc9y: { contentType: "shoes", why: "E399 \"Dark Purity Boots\" — shoes, was tops; desc: \"The Dark Purity Boots are a bold, gothic-inspired statement for Sims who lean into …\"" },
  cmmvaqeoq007ooxzgdahfw6pm: { contentType: "shoes", why: "E399 \"Female Suede High Boots\" — shoes, was tops; desc: \"Female Suede High Boots are a stylish everyday staple made from suede. These boots …\"" },
  cmmvaqev6007roxzg9b0e1ot6: { contentType: "shoes", why: "E399 \"Classic Suede Snow Boots Female\" — shoes, was tops; desc: \"Classic Suede Snow Boots Female are the winter shoes with a warm, snug silhouette. The …\"" },
  cmmvaqy3z0090oxzg4hbgyncq: { contentType: "dresses", why: "E399 \"Valentina’s Dress Multiple Hearts\" — dresses, was tops; desc: \"Valentina’s Dress Multiple Hearts is a stunning midi dress ideal for romantic …\"" },
  cmmvaqyal0093oxzgo52lfhqu: { contentType: "dresses", why: "E399 \"Desiree Dress\" — dresses, was tops; desc: \"Desiree Dress is a gorgeous, strapless mini dress with a flattering, fitted …\"" },
  cmmvaqycm0094oxzghopk5h42: { contentType: "dresses", why: "E399 \"Back Opening Mini Dress\" — dresses, was tops; desc: \"This strapless midi dress is created by Daph’s, and it has a stylish open back and a …\"" },
  cmmvaqyem0095oxzga3lqjv5y: { contentType: "dresses", why: "E399 \"Hidy and Hui Dresses\" — dresses, was tops; desc: \"The Hidy and Hui Dresses are a stunning Valentine-inspired mini collection, featuring …\"" },
  cmmvaqyij0097oxzgpy1ju1ht: { contentType: "dresses", why: "E399 \"Valentine’s Day Ruffled Dress\" — dresses, was tops; desc: \"The Valentine’s Day Ruffled Dress is a glamorous, romantic evening gown with a …\"" },
  cmmvarmtg00a8oxzgx9ibmp2m: { contentType: "bottoms", why: "E399 \"MYLAH Printed Shirt\" — bottoms, was tops; desc: \"If you’ve always wanted a bold mini skirt to add color and personality to your Sim’s …\"" },
  cmmvarpco00b1oxzgat0et7fv: { contentType: "shoes", why: "E399 \"12-District Platform Metallic Shoes\" — shoes, was tops; desc: \"12-District Platform Metallic Shoes are bold statement platforms that bring a modern …\"" },
  cmim93qeo01wwoxy8upazd0hi: { contentType: null, why: "E399 \"Gaming T-Shirts on Redbubble\" — NULL, was tops; desc: \"You can’t go wrong with a funny gaming t-shirt! And on RedBubble, there’s seriously …\"" },
  cmmvau3a900f1oxzgoni18q3y: { contentType: "full-body", why: "E399 \"Ivy Icy Park Snowy Outfit Set\" — full-body, was tops; desc: \"Another stunning ski outfit for your Sim’s winter activities is this Ivy Icy Park …\"" },
  cmmvau3ie00f5oxzg3tr1vhve: { contentType: "hats", why: "E399 \"Winter Earmuffs\" — hats, was tops; desc: \"This pair of fluffy earmuffs is a new mesh by Suzue. It’s available in ten swatches …\"" },
  cmmvau3kf00f6oxzgfqulh5w2: { contentType: "bottoms", why: "E399 \"Winter Pants\" — bottoms, was tops; desc: \"Winter Pants are short ruffle pants designed with a soft, feminine touch. They come in …\"" },
  cmmvau3ti00faoxzgoshz1b69: { contentType: "dresses", why: "E399 \"Fur Coat and Dress\" — dresses, was tops; desc: \"The Fur Coat and Dress is one of the most stylish Sims 4 winter clothes cc for female …\"" },
  cmmvau42f00feoxzgd0my1puu: { contentType: "dresses", why: "E399 \"Bella Dress\" — dresses, was tops; desc: \"Bella Dress is a knitted short dress designed with a fitted long-sleeve top and a …\"" },
  cmijqhbfh000qox8o3gke1l3y: { contentType: "dresses", why: "E399 \"Gown Draped with a Trench Coat\" — dresses, was tops; desc: \"We’ll start the list with this exquisite Gown Draped with a Trench Coat. Its …\"" },
  cmky78ini00htoxhc2xmdaprd: { contentType: "pet-clothing", why: "E399 \"Sims 4 Dog Shirt CC\" — pet-clothing, was tops; desc: \"A stylish top created by Turksimmer. This custom content clothing item adds a fresh …\"" },
  cmikj0efs0093oxnaejwvvvd2: { contentType: "furniture", why: "E399 \"Picasso Retro TV\" — furniture, was tops; desc: \"I decided to kick off this set with a retro piece that I used to see at my granny’s …\"" },
  cmku8zgf6006loxkzgz1f7rtl: { contentType: "pet-clothing", why: "E399 \"Sims 4 Pet Travel Vest\" — pet-clothing, was tops; desc: \"A stylish top created by DanSimsFantasy. This custom content clothing item adds a …\"" },
  cmku8zqkj006moxkzn6p25vbs: { contentType: "pet-clothing", why: "E399 \"Sims 4 Cat Hoodie CC\" — pet-clothing, was tops; desc: \"A stylish top created by Turksimmer. This custom content clothing item adds a fresh …\"" },
  cmku8xf0p006eoxkz1jd1zuml: { contentType: "pet-clothing", why: "E399 \"Small Pet Hoodie CC\" — pet-clothing, was tops; desc: \"A stylish top created by Turksimmer. This custom content clothing item adds a fresh …\"" },
  cmsmbthp600esoxeuog9n79tt: { contentType: null, why: "E399 \"Pirate Costume Eye Patch\" — NULL, was tops; desc: \"Pirate Costume Eye Patch is a clean and classic accessory perfect for building …\"" },
  cmsmbyn1900h9oxeukumaj9c9: { contentType: "gameplay-mod", why: "E399 \"Expanded Gravestone Selection Mod\" — gameplay-mod, was tops; desc: \"If you’re looking for more choices when selecting a gravestone, check out the Expanded …\"" },
  cmsmc6fwy00lnoxeup0mrm9fo: { contentType: null, why: "E399 \"Joon Woo Sim\" — NULL, was tops; desc: \"Joon Woo Sim is a polished male Sim with soft facial features, neatly styled dark …\"" },
  cmsmcfd4400qfoxeu5d6v6m2c: { contentType: "full-body", why: "E399 \"Emma Overalls\" — full-body, was tops; desc: \"The Emma Overalls are part of the Grace Collection, and they combine a fitted t-shirt …\"" },
  cmsmcfgnh00qioxeu2sdieiaw: { contentType: "full-body", why: "E399 \"Women’s Denim Overalls\" — full-body, was tops; desc: \"If you’re looking for overalls with a more customizable design, Women’s Denim Overalls …\"" },
  cmsmcfx6c00qvoxeu26ckenbw: { contentType: "full-body", why: "E399 \"Neon Overalls\" — full-body, was tops; desc: \"Neon Overalls are a bold recolor of the popular RYRI Overalls, bringing vibrant neon …\"" },
  cmijq1ie701bwoxc8r9sfhiut: { contentType: "hair", why: "E399 \"Valhalla\" — hair, was tops; desc: \"Sometimes it’s nice to break away from the cultural norms and create edgy, …\"" },
  cmsmcklv200t3oxeu6exnl4rh: { contentType: "decor", why: "E399 \"Police Investigation Deco Sims\" — decor, was tops; desc: \"Police Investigation Deco Sims is a police-themed deco set designed for realistic …\"" },
  cmsmcl7hj00teoxeu9nq8uert: { contentType: "decor", why: "E399 \"Police Station Investigation Set\" — decor, was tops; desc: \"The Police Station Investigation Set is a 10-piece crime scene collection designed to …\"" },
  cmsmcvtfl00z5oxeuicyizygg: { contentType: "skin", why: "E399 \"Scars 01 Top Body for Men\" — skin, was tops; desc: \"Scars 01 Top Body for Men is a bold set that adds a rugged, battle-worn look to your …\"" },
  cmim9ldeu007yoxy7mje6tekl: { contentType: "hair", why: "E399 \"Classic 1950s Topknot\" — hair, was tops; desc: \"A stylish top created by femmeonamissionsims. This alpha CC features a realistic, …\"" },
  cmim8za94016uoxy85tiz96ti: { contentType: "hair", why: "E399 \"“Reese” Hairstyle\" — hair, was tops; desc: \"“Reese” Hairstyle set is a hairstyle with two buns on the top sides and side fringes. …\"" },
  cmim8zqud01a9oxy8j6bd7h7t: { contentType: "shoes", why: "E399 \"Bat Slippers\" — shoes, was tops; desc: \"The Bat Slippers is a gorgeous cc featuring cute slippers with a bat doll design on …\"" },
  cmikkbtlx007nox33ya1h8d9z: { contentType: "hair", why: "E399 \"Short Bob\" — hair, was tops; desc: \"I couldn’t find many pixie cuts for children, but I still wanted to include a few …\"" },
  cmika1pfp00fjoxk7gkiwzljk: { contentType: "gameplay-mod", why: "E399 \"The Nanny Challenge\" — gameplay-mod, was tops; desc: \"The Nanny Challenge is a Sims 4 Rags to Riches challenge with sitcom flair, inspired …\"" },
  cmim946lb01yloxy8y2lzgz2s: { contentType: "bottoms", why: "E399 \"Billy Skirt\" — bottoms, was tops; desc: \"The Billy Skirt is a short denim skirt designed for child Sims. Its simple design …\"" },
  cmil3a11s00c7oxpzangyf0k0: { contentType: "dresses", why: "E399 \"Camila Sweater\" — dresses, was tops; desc: \"The Camila Sweater cc is a beautiful pack featuring a sexy, cozy sweater dress with …\"" },
  cmijpi9f7012coxc86w9rmujv: { contentType: "full-body", why: "E399 \"Pregnancy Swimsuit\" — full-body, was tops; desc: \"Summer doesn’t stop when you’re expecting, and thanks to the Pregnancy Swimsuit by …\"" },
  cmil1ak2s00b6oxee016l1ta8: { contentType: "accessories", why: "E399 \"Neko Socks\" — accessories, was tops; desc: \"If you’re looking for an adorable way to add personality to your Sim’s outfits, the …\"" },
  cmim8zbe1017coxy81psq9dg6: { contentType: "hair", why: "E399 \"Lana And Luna Hair\" — hair, was tops; desc: \"Lana And Luna Hair CC is another gorgeous Sims 4 hair cc to add to your Sim’s …\"" },
  cmsmcfhrn00qjoxeule3xr0iz: { contentType: "bottoms", why: "E399 \"Dyna Overall Skirt\" — bottoms, was tops; desc: \"Dyna Overall Skirt is a playful suspender skirt designed for creating fun, youthful …\"" },
  cmikd8xlj001roxbhhczqbg67: { contentType: "full-body", why: "E399 \"Valery Bikini\" — full-body, was tops; desc: \"The Valery Bikini is a flirty two-piece swimwear option with an added playful charm. …\"" },
  cmijpwgdn019ooxc875pdmpyk: { contentType: "furniture", why: "E399 \"Theorem Hallway Clothes Rack\" — furniture, was tops; desc: \"Created by SIMcredible!, one of the most talented cc creators, the Theorem Hallway …\"" },
  cmim9md1p00feoxy7ij5h8j83: { contentType: null, why: "E399 \"Lenovo Legion 5 Gaming Laptop\" — NULL, was tops; desc: \"As mentioned previously, a big issue for gaming laptops is overheating. Most of them …\"" },
  cmkq8vv7v000goxvgl8a72v1v: { contentType: "wall-art", why: "E399 \"Regency Era Portraits Set 2\" — wall-art, was tops; desc: \"Custom content created by AnachroSims. Enhance your Sims 4 experience with this …\"" },
  cmijpgf0t011ioxc8dql1dwpq: { contentType: "bottoms", why: "E399 \"Bottoms Set\" — bottoms, was tops; desc: \"If you want to achieve a teen look with baggy jean pants, here’s a great source. This …\"" },
  cmijpjtcc0133oxc867m53vyl: { contentType: "jewelry", why: "E399 \"Crashcore Choker\" — jewelry, was tops; desc: \"This punk choker is built for Sims who love standing out. It’s designed with a thick …\"" },
  cmijplgb10147oxc8694rfvmf: { contentType: "furniture", why: "E399 \"Strepera Office Electronics\" — furniture, was tops; desc: \"Turn your Sim’s study into a powerhouse of productivity with the Strepera Office …\"" },
  cmim8w39k00m9oxy8lzit8zlg: { contentType: "bottoms", why: "E399 \"Skirt 145\" — bottoms, was tops; desc: \"Skirt 145 is a midi skirt with a high slit on one side. It’s one of the best Sims 4 …\"" },
  cmijq6qy601eaoxc875bggd7p: { contentType: "bottoms", why: "E399 \"Flor Skirt\" — bottoms, was tops; desc: \"If you’re going for a soft, delicate aesthetic, this Flor skirt is the perfect …\"" },
  cmik912x7001zoxk7z9artnsh: { contentType: "bottoms", why: "E399 \"Split Mini Skirt\" — bottoms, was tops; desc: \"This is my favorite Sims 4 skirt cc for creating a normal, everyday look for my female …\"" },
  cmim8w51n00n4oxy8hymkfug5: { contentType: "bottoms", why: "E399 \"Honey Bxby Skirt\" — bottoms, was tops; desc: \"The Honey Bxby Skirt is a short mini-skirt with front pockets. It comes in 10 colors …\"" },
  cmim8wd9w00ocoxy8kjuxm3yp: { contentType: "hair", why: "E399 \"Jai Crimps\" — hair, was tops; desc: \"Jai Crimps is one of the best Sims 4 black hair styles in the game due to its stunning …\"" },
  cmika0k4f00eroxk7psppuxm8: { contentType: "bottoms", why: "E399 \"High Waist Denim Skirts\" — bottoms, was tops; desc: \"I’m obsessed with this High-Waist Denim Skirt, and you will be, too. It comes in …\"" },
  cmil31ydy0092oxpzkay4b1a7: { contentType: "accessories", why: "E399 \"Alluring Over-Knee Socks\" — accessories, was tops; desc: \"If you’re looking for the perfect blend of warmth and elegance, save the Alluring …\"" },
  cmik8y1bh0005oxk7bv4y4tf5: { contentType: "hair", why: "E399 \"Wavy Man Bun\" — hair, was tops; desc: \"Created by drteekaycee, the Wavy Man Bun offers players a textured, Afro-centric man …\"" },
  cmim8zpxz019toxy85fv3ulmh: { contentType: "shoes", why: "E399 \"High-top Converse Run Star\" — shoes, was tops; desc: \"The High-top Converse Run Star CC is another great addition to your kid’s shoe …\"" },
  cmil3ppgh00i8oxpz2qetqzpu: { contentType: "bottoms", why: "E399 \"Charlotte Skirt\" — bottoms, was tops; desc: \"If you’re looking for a beautiful skirt to pair with your blouses, get the Charlotte …\"" },
  cmim9luwb00byoxy7gkiwqydx: { contentType: "decor", why: "E399 \"Sims 4 Craft Room Decor\" — decor, was tops; desc: \"Did your adult child sim finally move out and now it’s time to convert their old …\"" },
  cmim8x78t00ucoxy8zbf27933: { contentType: "bottoms", why: "E399 \"Set-Bottom\" — bottoms, was tops; desc: \"If you’re looking for a cute bottom to complement a variety of tops, get the …\"" },
  cmim8xw7000z6oxy8sixoakr1: { contentType: "hair", why: "E399 \"Lorenzo\" — hair, was tops; desc: \"Buoy up your Sim’s fashion sense with the Lorenzo pack. It’s a laid-back hairstyle …\"" },
  cmim8zaro0172oxy8di6sojim: { contentType: "hair", why: "E399 \"Robin Hair\" — hair, was tops; desc: \"Any Simmer obsessed with Sims 4 hair cc will certainly love Robin Hair. This base-game …\"" },
  cmim8zm46019eoxy8xyh0tz73: { contentType: "bottoms", why: "E399 \"Tish Skirt\" — bottoms, was tops; desc: \"Tish Skirt is one of my most used Sims 4 cc finds on this list. This low-rise skirt …\"" },
  cmim8zs5t01avoxy80t6jxyj8: { contentType: "shoes", why: "E399 \"Cat Slippers\" — shoes, was tops; desc: \"All kids love pets, which is why you need The Cat Slippers CC. The shoes are designed …\"" },
  cmim8ynl8012yoxy84cvovihv: { contentType: "makeup", why: "E399 \"Neonatic Eyeshadow Set\" — makeup, was tops; desc: \"The Neonatic Eyeshadow Set is a collection of neon eyeshadows that allow you to …\"" },
  cmijmw6r40087oxc8u9eubf5b: { contentType: "shoes", why: "E399 \"Child Slippers With Unicorns\" — shoes, was tops; desc: \"Child Slippers With Unicorns are a set of cute child slippers with unicorns. They’re …\"" },
  cmim8zad9016woxy8idwf8rdl: { contentType: "hair", why: "E399 \"Maddie Hairstyle\" — hair, was tops; desc: \"The Maddie Hairstyle CC is a gorgeous set offering access to a unique and trendy style …\"" },
  cmikj05ix0092oxnav5ylla8y: { contentType: null, why: "E399 \"Lenovo Legion Pro 7i Gen 10\" — NULL, was tops; desc: \"The Lenovo Legion Pro 7i Gen 10 (2025) is a premium gaming laptop that masterfully …\"" },
  cmkyjzq85013coxhcy9a1xf70: { contentType: "dresses", why: "E399 \"Sims 4 80s CC Shirt\" — dresses, was tops; desc: \"ridgeport's papaya dress recolor i love this dress and i wanted to try recoloring with …\"" },
  cmika4z0t00heoxk72p681p2t: { contentType: "tattoos", why: "E399 \"Tattoo Z102\" — tattoos, was tops; desc: \"Zenx is one of those Sims 4 cc tattoo artists who creates highly detailed and …\"" },
  cmijmw1100083oxc84pyyhpfr: { contentType: "bottoms", why: "E399 \"Carroll Short\" — bottoms, was tops; desc: \"The Carroll Shorts are high-cut shorts designed for summer or beach wear. They contain …\"" },
  cmikda1ph002boxbhhu9exth7: { contentType: "accessories", why: "E399 \"Joker Mask\" — accessories, was tops; desc: \"The Joker Mask is a cute accessory inspired by Persona 5. This minimalist decorative …\"" },
  cmim8wxsu00snoxy8nupmxp4i: { contentType: "full-body", why: "E399 \"Swimsuit\" — full-body, was tops; desc: \"The Swimsuit | Simsulani is another must-have piece of beachwear for your Sim’s …\"" },
  cmim9jojw002aoxy7186ldyxu: { contentType: null, why: "E399 \"The Sims 4 Eco Lifestyle\" — NULL, was tops; desc: \"It pains me to put this expansion pack this low on the list. I love Evergreen Harbor. …\"" },
  cmik91pck002eoxk7gj6y0bhy: { contentType: "bottoms", why: "E399 \"Solara Skirt\" — bottoms, was tops; desc: \"Joan Campbell Beauty is one of my favorite custom content creators. They make …\"" },
  cmijkw4uo0040oxc8tpcbtpiq: { contentType: "clutter", why: "E399 \"Toast For Breakfast\" — clutter, was tops; desc: \"If you’re looking for simple breakfast clutter for your breakfast nook, download this …\"" },
  cmikdco46003eoxbh3cipu3ie: { contentType: "furniture", why: "E399 \"Bunny Gaming Chair\" — furniture, was tops; desc: \"This Sims 4 gaming room cc is a cute and realistic item that’s essential in completing …\"" },
  cmsmb2nsf000loxeuprj542ey: { contentType: "accessories", why: "E399 \"Apron for Kitchen\" — accessories, was tops; desc: \"Apron for Kitchen is a sleeveless halter apron designed for restaurant, café, and …\"" },
  cmik8yp28000joxk7r9q7ehzt: { contentType: "accessories", why: "E399 \"Corset Waistband\" — accessories, was tops; desc: \"We’ll start the list with this Corset Waistband by Mydarling20. It’s a simple corset …\"" },
  cmim8ugtf00cqoxy8t0jfvlwm: { contentType: "gameplay-mod", why: "E399 \"Remove Hats and More Indoors\" — gameplay-mod, was tops; desc: \"Your Sim likely wears warm clothing like berets, hats, and gloves to protect …\"" },
  cmikix7h3007moxnaom1ihcpp: { contentType: null, why: "E399 \"Sims-themed Daily Planner\" — NULL, was tops; desc: \"If you want to get a thoughtful gift for your friend, this Sims-themed Daily Planner …\"" },
  cmikix1o8007ioxnaeu6g9whv: { contentType: null, why: "E399 \"Ripple Junction Official Sims Plumbob T-shirt\" — NULL, was tops; desc: \"If you’re shopping for a Sims fan, the Ripple Junction The Sims Men’s Short Sleeve …\"" },
  cmijpw1df019ioxc8p3hz4gai: { contentType: "furniture", why: "E399 \"Retro Vibe Entry Way\" — furniture, was tops; desc: \"I encountered this set while compiling the Sims 4 50s CC Furniture list, and it felt …\"" },
  cmoivj1k20006oxr3ctajgh6o: { contentType: "dresses", why: "E399 \"Le Charme des Soirées\" — dresses, was tops; desc: \"Le Charme des Soirées is a two-piece dress set with a fitted corset mini dress and a …\"" },
  cmoivj2un000foxr3hi225hfn: { contentType: "dresses", why: "E399 \"The Swan Set\" — dresses, was tops; desc: \"The Swan Set is a corset-inspired dress set influenced by vintage silhouettes. You’ll …\"" },
  cmoivj3cq000noxr3jd9d7typ: { contentType: "bottoms", why: "E399 \"Edwardian Long Skirt\" — bottoms, was tops; desc: \"Nothing says timeless elegance quite like a flowing Edwardian-inspired maxi skirt. …\"" },
  cmoivj3m0000roxr38hkumqjk: { contentType: "bottoms", why: "E399 \"Classic Flare Jeans\" — bottoms, was tops; desc: \"Classic flare jeans bring back a timeless silhouette, but with a modern, clean finish. …\"" },
  cmim9md3v00ffoxy7olamos7j: { contentType: null, why: "E399 \"Alienware m15 R4 RTX 3070 Gaming Laptop\" — NULL, was tops; desc: \"It wouldn’t be a gaming laptop post without including an Alienware laptop. Alienware …\"" },
  cmika58vt00hkoxk7oe0kkpgv: { contentType: "tattoos", why: "E399 \"Tattoo-Random Snakes n4\" — tattoos, was tops; desc: \"The Random Snakes N4 Tattoo is a minimalist and hypnotic piece for your male and …\"" },
  cml5sitr60030oxxrl9biyvn5: { contentType: "lot", why: "E399 \"Le Mariage Noir\" — lot, was tops; desc: \"The Le Mariage Noir comes with shadowed rooftops, pointed arches, and richly carved …\"" },
  cmim9md5x00fgoxy75rmcocas: { contentType: null, why: "E399 \"Acer Predator Helios 300 PH315-54-760S Gaming Laptop\" — NULL, was tops; desc: \"When it comes to a gaming laptop, some things that are important to me are good …\"" },
  cmikdb1n6002roxbh1phnlpy9: { contentType: "furniture", why: "E399 \"Life in Plastic\" — furniture, was tops; desc: \"Welcome to Barbie World in The Sims 4, where everything’s pink, polished, and …\"" },
  cmikkbj28007hox334fstt1uk: { contentType: "hair", why: "E399 \"Dreaded Wonder\" — hair, was tops; desc: \"Not any creators design pixie cuts for black and POC Sims, so I was stoked to find …\"" },
  cmil31njd008xoxpzwf1n4qzu: { contentType: "accessories", why: "E399 \"Ariel Long Socks\" — accessories, was tops; desc: \"The Ariel Long Socks by Linavees are sleek, thigh-high socks with a finely ribbed …\"" },
  cmijo7l0f00p0oxc8w8225gvf: { contentType: "bottoms", why: "E399 \"Benrie Skirt\" — bottoms, was tops; desc: \"Available in 48 swatches, this high-waisted skirt is the perfect addition to your Sims …\"" },
  cmikix8yg007noxna3k5g6kf7: { contentType: null, why: "E399 \"Corsair K70 RGB Pro Mechanical Keyboard\" — NULL, was tops; desc: \"If you’re gifting a serious PC gamer, the Corsair K70 RGB PRO Mechanical Gaming …\"" },
  cmigu1kql001ooxkzk9ipf6kz: { contentType: "food", why: "E399 \"Black Forest Gateau\" — food, was tops; desc: \"Black Forest Gateau is a rich, layered chocolate dessert perfect for parties, …\"" },
  cmim93udd01xfoxy81pc9zmbk: { contentType: null, why: "E399 \"Sims Plumbob T-Shirt\" — NULL, was tops; desc: \"This is one of the bestselling Sims t-shirts you can find online! It comes in 16 color …\"" },
  cmim9ezjw002joxqwt0ccie96: { contentType: "full-body", why: "E399 \"Male CC Overalls for Sims 4\" — full-body, was tops; desc: \"It’s incredible how much of a difference a sleeveless shirt can make under overalls …\"" },
  cmijptfhc0184oxc8f6512oma: { contentType: "makeup", why: "E399 \"Fairy Eyeshadow\" — makeup, was tops; desc: \"The Fairy Eyeshadow is a soft, glowy set ideal for adding an elegant touch of fantasy …\"" },
  cmijpx1zr01a2oxc8fyrla1hk: { contentType: "furniture", why: "E399 \"Gold Fish Modern Hallway\" — furniture, was tops; desc: \"The Gold Fish Modern Hallway Set is a sleek addition to any entryway and is perfect …\"" },
  cmigonuj4000voxkzs8anf4m7: { contentType: "full-body", why: "E399 \"Mermaid Tails & Tops CC Recolors\" — full-body, was tops; desc: \"Please tell me you’re looking for some bright, beautiful color choices for your …\"" },
  cmik9w7d800c4oxk721eorxrv: { contentType: "accessories", why: "E399 \"Apron for Kitchen and Bakery\" — accessories, was tops; desc: \"If you’re playing a 50s housewife who spends most of her time in the kitchen baking …\"" },
  cmika52gb00hgoxk7t0bizf4s: { contentType: "tattoos", why: "E399 \"Graphic Neck Tattoo HQ\" — tattoos, was tops; desc: \"The Neck Tattoo by Suffocation Suzie is an edgy, minimalist piece for your feminine …\"" },
  cmim9qqxc0015ox56fl6suf6w: { contentType: "hair", why: "E399 \"Sims 4 Kids Top Bun\" — hair, was tops; desc: \"A stylish top created by Nords. This custom content clothing item adds a fresh fashion …\"" },
  cmim8thxy007moxy8f0w973n0: { contentType: "accessories", why: "E399 \"Deviant Accessory Harness\" — accessories, was tops; desc: \"One of the CAS items in the Sims 4 Lovestruck expansion pack is a harness that comes …\"" },
  cmijnfxnm00ddoxc8f9c27koj: { contentType: "furniture", why: "E399 \"Modern Set\" — furniture, was tops; desc: \"Add a bold touch to your interiors with the Modern Set, a small yet stunning furniture …\"" },
  cmknf8no4000toxolcvngzvkm: { contentType: "full-body", why: "E399 \"Shirt Overalls\" — full-body, was tops; desc: \"Shirt Overalls are a classic kid’s outfit, which is why I featured them on this Sims 4 …\"" },
  cmijkr0bx003poxc8bn221v4h: { contentType: "food", why: "E399 \"Sweet Pastry Roll collection\" — food, was tops; desc: \"If you’re looking for an extensive collection of sweet pastries to add to your game, …\"" },
  cmik9vsl200bvoxk7y7ip2pil: { contentType: "bottoms", why: "E399 \"Vintage Swimsuit Bottom\" — bottoms, was tops; desc: \"If you’re creating a ’50s summer save file, you need these Vintage Swimsuit Bottoms. …\"" },
  cmikkm5z900d7ox33fqsvy4n1: { contentType: "tattoos", why: "E399 \"Full Back Tattoo\" — tattoos, was tops; desc: \"Another pretty and cute tattoo to add to your mods folder is this Full Back Tattoo. …\"" },
  // ── Audited 2026-11-13 (Sage, E400). All 557 SFW Sims 4 `gameplay-mod` (506)
  //    and `script-mod` (51) rows were read while grading a gameplay-mods hub
  //    (graded NOT ELIGIBLE on 2 SFW-flagged adult rows; see collections.ts).
  //    85 (15.3%) are not mods: 17 whole lots (police stations, hospitals,
  //    hotels, a prison, a ranch) → lot; 22 CAS items (shoes, hats, hair, nails,
  //    a beard, a tattoo, body meshes) to their facets; 4 build/buy objects; and
  //    42 NULL — EA expansion packs, gaming laptops, other games (Sun Haven, My
  //    Time at Portia), Sim downloads, mixed clothing sets, mermaid tails, teeth
  //    and fangs (E200). Kept on purpose: functional objects (infant walker,
  //    horse waterer, functional dolls, coffee maker, kiln), overrides and
  //    replacements, challenges, traits and careers, and save files (they change
  //    how a game plays, unlike in a CAS facet).
  cmijmweih008boxc8fvyc61hk: { contentType: null, why: "E400 \"Cutie Pie Collection\" — NULL, was gameplay-mod; desc: \"As the name suggests, the Cutie Pie Collection is sure to transform your children into …\"" },
  cmim9nl9z00kboxy7tnw6l57s: { contentType: "furniture", why: "E400 \"Candy Covered\" — furniture, was gameplay-mod; desc: \"Introducing the adorable and functional nursery set by SIMcredibledesigns.com! This …\"" },
  cmil0n87v000yoxees2rm9tpk: { contentType: "nails", why: "E400 \"Pretty Girl Treatment Frenchies\" — nails, was script-mod; desc: \"You can’t go wrong with a cute French design, and these ones are usually my go-to. …\"" },
  cmim92oxo01sroxy88ejcda5x: { contentType: "hair", why: "E400 \"Shauna Box Braids\" — hair, was gameplay-mod; desc: \"If you’re a fan of box braids, you need to add this cc to your braids collection. The …\"" },
  cmigu1rkn001soxkzgmn37z77: { contentType: "food", why: "E400 \"Ice Coffee Set\" — food, was gameplay-mod; desc: \"Another great breakfast drink option to add to your 2025 collection is this Ice Coffee …\"" },
  cmijprprl016zoxc82pjsh606: { contentType: null, why: "E400 \"Fairycore Bloom Collection\" — NULL, was gameplay-mod; desc: \"Bring the woodland charm into your virtual world with this Fairycore Bloom Collection. …\"" },
  cmim9jog00028oxy7svpzjbg4: { contentType: null, why: "E400 \"The Sims 4 Get to Work\" — NULL, was gameplay-mod; desc: \"I believe this was the very first expansion pack. It brought with it active careers …\"" },
  cmijo07lq00mzoxc8fdmb7e2j: { contentType: "furniture", why: "E400 \"H&B Dual Wash Dual Dry\" — furniture, was gameplay-mod; desc: \"The H&B Dual Wash Dual Dry set brings realistic laundry appliances into your gameplay …\"" },
  cmim9jo8h0024oxy78m39mm6y: { contentType: null, why: "E400 \"The Sims 4 Discover University\" — NULL, was gameplay-mod; desc: \"Ever since The Sims 2 University came out, I’ve been a HUGE fan of my sims going to …\"" },
  cmim9johy0029oxy7i37z1z95: { contentType: null, why: "E400 \"The Sims 4 Get Together\" — NULL, was gameplay-mod; desc: \"In The Sims 4 Get Together, Windenburg is the star of the show. It’s a beautiful and …\"" },
  cmknf9amb002toxolwjk93ijb: { contentType: null, why: "E400 \"N34 Teeth\" — NULL, was gameplay-mod; desc: \"The N34 Teeth set adds a subtle, realistic touch to your Sim’s smile by slightly …\"" },
  cmsmc2jgp00jioxeup41l9xt5: { contentType: "lot", why: "E400 \"The Sims 4 Hospital\" — lot, was gameplay-mod; desc: \"The Sims 4 Hospital is a modern replacement for the default Get to Work hospital. This …\"" },
  cmikd7njn0013oxbhulmpwsih: { contentType: "accessories", why: "E400 \"Pimple Patches\" — accessories, was gameplay-mod; desc: \"If your teen or young adult has acne, you can get these Pimple Patches to cover it up. …\"" },
  cmim8vlq600jloxy8z5978lf1: { contentType: null, why: "E400 \"Monster High Iconic Werewolf Siblings\" — NULL, was gameplay-mod; desc: \"If you love Monster High, you can get all the siblings in-game with this Sim dump. …\"" },
  cmim9mdck00fjoxy79j1xlwbu: { contentType: null, why: "E400 \"Victus 16 Gaming Laptop\" — NULL, was gameplay-mod; desc: \"Several years ago, HP started making gaming laptops under the brand Omen. Since then …\"" },
  cmil3m7j000gjoxpzgx6gjdkb: { contentType: null, why: "E400 \"SZA Sim Download\" — NULL, was gameplay-mod; desc: \"If you want to add a celebrity to your Sim’s 4 neighborhood, SZA is the right choice. …\"" },
  cmim9lkkv009yoxy7vxwn3m7u: { contentType: null, why: "E400 \"Growing Up\" — NULL, was gameplay-mod; desc: \"Growing up is a life sim game where you’ll play your entire life from being a toddler …\"" },
  cmijkhswy000toxc8ngnrrfxm: { contentType: null, why: "E400 \"Flo’s Ivy League Set\" — NULL, was gameplay-mod; desc: \"Bring a polished, preppy aesthetic to your Sim’s wardrobes with Flo’s Ivy League Set. …\"" },
  cmim8vkod00j4oxy8u491pprv: { contentType: null, why: "E400 \"Erika and Eliza\" — NULL, was gameplay-mod; desc: \"Erika and Eliza are twins who copy each other’s style but not so much. While similar, …\"" },
  cmikknd4200dvox333rkc9ick: { contentType: "shoes", why: "E400 \"Birthday Wedges\" — shoes, was script-mod; desc: \"If you’re looking for a versatile pair of wedges to add to your daily rotation, get …\"" },
  cmim9ndr400jjoxy7dv2t5xjr: { contentType: "full-body", why: "E400 \"Barbie’s Closet Collection 2 CC\" — full-body, was gameplay-mod; desc: \"Give your Sims the ultimate Barbie fashion experience with this stunning set of …\"" },
  cmijmurux007loxc8v28z36ne: { contentType: "accessories", why: "E400 \"Horns Pack- Valhallanism\" — accessories, was gameplay-mod; desc: \"The Horns Pack – Valhallansim Mesh Edit brings an infernal edge to your supernatural …\"" },
  cmim9kw0x006soxy7tb0uihvk: { contentType: null, why: "E400 \"Beastly: Werewolf Fangs\" — NULL, was gameplay-mod; desc: \"With this mod, your Sims can now have the iconic werewolf fangs, adding a new level of …\"" },
  cmim8vlan00jdoxy8gga9wwju: { contentType: null, why: "E400 \"Brian Davis\" — NULL, was gameplay-mod; desc: \"If you want a male Sim to add to your Sims 4 world, get Brian Davis. He’s a …\"" },
  cmijnunx900jqoxc8rx0sv7du: { contentType: "tattoos", why: "E400 \"Cherry Bunnies Tattoo\" — tattoos, was gameplay-mod; desc: \"I know this design may not be everyone’s cup of tea, but the Cherry Bunnies Tattoo is …\"" },
  cmsmcmtwy00ucoxeuie906i6g: { contentType: "lot", why: "E400 \"New Sims 4 Police Station Build\" — lot, was gameplay-mod; desc: \"New Sims 4 Police Station Build is a realistic law enforcement lot designed for …\"" },
  cmim9jonr002coxy7evfiecqz: { contentType: null, why: "E400 \"The Sims 4 Snowy Escape\" — NULL, was gameplay-mod; desc: \"I was honestly disappointed when they announced Snowy Escape as an expansion pack. …\"" },
  cmil3q7ca00imoxpzptriq73c: { contentType: null, why: "E400 \"Daily Casual Set\" — NULL, was gameplay-mod; desc: \"The Daily Casual Set has everything you need to create simple and stunning looks for …\"" },
  cmim8r8gz0001oxy8c6y09y45: { contentType: "decor", why: "E400 \"Asian Garden Plants\" — decor, was gameplay-mod; desc: \"The Asian Garden Plants set by Sim Man 123 is another well-equipped Sims 4 garden cc …\"" },
  cmikkfl0n009lox33j0udbsqs: { contentType: "beard", why: "E400 \"Lexel Air\" — beard, was gameplay-mod; desc: \"Lexel Air is a sleek, well-shaped beard covering your Sim’s entire jawline. It’s thick …\"" },
  cmikj3rmd00auoxnaz1c6m7jf: { contentType: null, why: "E400 \"Sims Dump\" — NULL, was script-mod; desc: \"If you don’t have the time to create Sims from scratch, check out this Sim Dump …\"" },
  cmsmd4ufh0142oxeu7fjdh2a3: { contentType: "skin", why: "E400 \"Vitiligo V3\" — skin, was gameplay-mod; desc: \"If you’re looking for bold and highly visible vitiligo patterns for your Sims, check …\"" },
  cmsmc35d700jroxeumme1tu6f: { contentType: "lot", why: "E400 \"The Peninsula Suites\" — lot, was script-mod; desc: \"The Peninsula Suites is an elegant luxury hotel inspired by classic European …\"" },
  cmsmc1xb500j1oxeu02zp1e12: { contentType: "lot", why: "E400 \"ADM Hospital\" — lot, was gameplay-mod; desc: \"ADM Hospital is a large multi-story medical center built for players who want a …\"" },
  cmky9b6qb00odoxhcf26qq821: { contentType: "full-body", why: "E400 \"Sims 4 Ski Suit Recolor\" — full-body, was script-mod; desc: \"Custom content created by Simsulani. Enhance your Sims 4 experience with this …\"" },
  cmky0jm8k009noxhcz77p3tsf: { contentType: "hair", why: "E400 \"Bleached Super Funky Recolor\" — hair, was script-mod; desc: \"💬 9 🔁 783 ❤️ 1887 · download -> patreon | simfileshare · BLEACHED ☆ a super funky …\"" },
  cmigomw83000doxkzmqn58wok: { contentType: null, why: "E400 \"Life’s A Beach Mermaid Tail\" — NULL, was gameplay-mod; desc: \"This mermaid tail is bright, playful, and full of watercolor-like patterns that stand …\"" },
  cmim9lkrc00a1oxy7wmq3gdmu: { contentType: null, why: "E400 \"Sun Haven\" — NULL, was gameplay-mod; desc: \"Sun Haven, in my opinion, is the medieval and magical version of Stardew Valley. Your …\"" },
  cmim9kjc2005boxy7isg30orq: { contentType: "body-preset", why: "E400 \"Sims 4 Male Body Mod\" — body-preset, was gameplay-mod; desc: \"This is a sims 4 body mod for male sims. It’s meant to replicate just a very basic …\"" },
  cmim8w94700nroxy878drta3u: { contentType: null, why: "E400 \"Chang\" — NULL, was gameplay-mod; desc: \"Chang is a male Sim designed by Jadosims. He’s a typical player who loves music and …\"" },
  cmim8w8d000neoxy8b1vf0zrf: { contentType: null, why: "E400 \"Denji\" — NULL, was script-mod; desc: \"Denji is a character inspired by the main protagonist of the Chainsaw Man manga anime …\"" },
  cmim8rno7001toxy8ifq4xlsv: { contentType: "body-preset", why: "E400 \"Soft Boi And Dense Boi\" — body-preset, was gameplay-mod; desc: \"The Soft Boi And Dense Boi cc by Narci Cism is another gorgeous addition for Simmers …\"" },
  cmil3mi0n00gmoxpzmhxoa2sk: { contentType: "hats", why: "E400 \"Visceral Hat\" — hats, was gameplay-mod; desc: \"Visceral Hat is a bold and distinctive custom content ideal for players who want a …\"" },
  cmikk5p49004lox33ucf669qj: { contentType: "shoes", why: "E400 \"Pool Sliders For Men\" — shoes, was gameplay-mod; desc: \"Update your male Sim’s casual footwear with the Pool Sliders For Men, a sporty slip-on …\"" },
  cmikk0yfu0027ox3362c8x0bs: { contentType: null, why: "E400 \"Velvet Pajama Set\" — NULL, was gameplay-mod; desc: \"The Velvet Pajama Set (Spaghetti Skirt) cc for female Sims perfectly blends comfort …\"" },
  cmttzijkp00beoxfeoprkgcet: { contentType: "lot", why: "E400 \"Fitness & Gym\" — lot, was gameplay-mod; desc: \"If you’re looking for a stylish fitness center with plenty of space for your Sims to …\"" },
  cmttzig8v00ayoxfeikgzwqzp: { contentType: "jewelry", why: "E400 \"Tempo Plug Collection\" — jewelry, was gameplay-mod; desc: \"Tempo Plug Collection is a simple set of round ear plugs available in five sizes: XS, …\"" },
  cmsmcqlm500wcoxeu2prvlxkf: { contentType: "lot", why: "E400 \"Small Ranch\" — lot, was gameplay-mod; desc: \"Small Ranch is a cozy horse property for players who love realistic countryside …\"" },
  cmsmcpld700vwoxeu2wv12b3u: { contentType: "lot", why: "E400 \"Willow Creek Prison\" — lot, was script-mod; desc: \"Willow Creek Prison is a compact prison lot built for smaller saves and storytelling. …\"" },
  cmsmcmpzi00u9oxeu7tyfgu6d: { contentType: "lot", why: "E400 \"Little Police Station\" — lot, was gameplay-mod; desc: \"If you’re looking for a smaller police build for your save, check out the Little …\"" },
  cmsmcmmwn00u7oxeu1asklbwi: { contentType: "lot", why: "E400 \"Police Department Build\" — lot, was gameplay-mod; desc: \"Police Department Build is a modern law enforcement lot designed as an overhaul for …\"" },
  cmsmcmjup00u5oxeuunp5plex: { contentType: "lot", why: "E400 \"Oak Creek Police Dept.\" — lot, was gameplay-mod; desc: \"Oak Creek Police Dept. is a detailed brick police station ideal for law enforcement …\"" },
  cmsmcmiqx00u4oxeulijf22hh: { contentType: "lot", why: "E400 \"ADM Police\" — lot, was gameplay-mod; desc: \"ADM Police is a modern police department built for realistic law enforcement and …\"" },
  cmsmclaug00thoxeuweyd06e3: { contentType: "lot", why: "E400 \"Police Department Build\" — lot, was gameplay-mod; desc: \"The Police Department Build is a complete overhaul of the police station, included …\"" },
  cmsmcl9pp00tgoxeuai4seo6l: { contentType: "lot", why: "E400 \"Victorian Police Station Lot\" — lot, was gameplay-mod; desc: \"The Victorian Police Station Lot is a beautiful Victorian-style police station created …\"" },
  cmsmc3bxx00jwoxeuox16lh3l: { contentType: "lot", why: "E400 \"City Hotel\" — lot, was gameplay-mod; desc: \"City Hotel is a charming brick-clad building with vintage-inspired architecture, …\"" },
  cmsmc2klr00jjoxeupnd7bpdm: { contentType: "lot", why: "E400 \"Modern Hospital\" — lot, was gameplay-mod; desc: \"If you’re looking for a sleek, realistic replacement for the default hospital, Modern …\"" },
  cmsmc2fwx00jfoxeufj81g277: { contentType: "lot", why: "E400 \"LuxVet Clinic\" — lot, was gameplay-mod; desc: \"LuxVet Clinic is a modern veterinary hospital designed for pet owners who want a …\"" },
  cmsmc2a8q00jboxeusmtxm30n: { contentType: "lot", why: "E400 \"Rhoads Regional Hospital\" — lot, was gameplay-mod; desc: \"If you’re looking for a large, realistic hospital for detailed medical gameplay, …\"" },
  cmsmbaejo004ioxeuiy76ct1l: { contentType: null, why: "E400 \"1980 Fiat 124 Sport Spider\" — NULL, was gameplay-mod; desc: \"1980 Fiat 124 Sport Spider is a timeless convertible designed for coastal homes, …\"" },
  cmky9udfq00q0oxhcgedbpnk0: { contentType: null, why: "E400 \"Sims 4 Men’s Bathing Suit Recolor\" — NULL, was script-mod; desc: \"Custom content created by ReMaron. Enhance your Sims 4 experience with this …\"" },
  cmim8w9v000o2oxy86gl4v7wo: { contentType: null, why: "E400 \"Alec Rodney\" — NULL, was gameplay-mod; desc: \"If you’re looking for a toddler Sim to add in-game, get Alec Rodney. This male toddler …\"" },
  cmim9fnk2006zoxqwx5q7ianp: { contentType: null, why: "E400 \"Pearls & Champagne Maxis Match CC\" — NULL, was gameplay-mod; desc: \"This Pearls and Champagne maxis match cc collection of elegant and sophisticated …\"" },
  cmil1nm1800h2oxeeukcu373i: { contentType: "accessories", why: "E400 \"Creepy Yeha Ulyana Belt\" — accessories, was gameplay-mod; desc: \"The Creepy Yeha Ulyana Belt is a stylish, pearl-adorned accessory with a delicate, …\"" },
  cmijoqynl00sloxc8lmweif7s: { contentType: null, why: "E400 \"Toilet Door Recolor\" — NULL, was script-mod; desc: \"Bring more variety to your community build with these beautiful and simple toilet door …\"" },
  cmim9mczi00fdoxy7qu8runxm: { contentType: null, why: "E400 \"Acer Nitro 5 AN515-55-53E5 Gaming Laptop\" — NULL, was gameplay-mod; desc: \"The Acer Nitro 5 is the PERFECT introduction to gaming laptops because it’s cheaper …\"" },
  cmim9lkil009xoxy7euhbzmdy: { contentType: null, why: "E400 \"Snowtopia: Ski Resort Tycoon\" — NULL, was gameplay-mod; desc: \"In this game, you’ll plan, build, and improve a ski resort. How this game is like The …\"" },
  cmim9lkgh009woxy7h0tasku1: { contentType: null, why: "E400 \"Travellers Rest\" — NULL, was gameplay-mod; desc: \"In Travellers Rest, you’ll play as an innkeeper working hard to upgrade and manage …\"" },
  cmim9lk9s009toxy7f3102b0e: { contentType: null, why: "E400 \"No Time To Relax\" — NULL, was gameplay-mod; desc: \"No Time to Relax is a multiplayer life simulation game. You’ll compete against each …\"" },
  cmim9lk7i009soxy7nqt8kfi3: { contentType: null, why: "E400 \"My Time at Portia\" — NULL, was gameplay-mod; desc: \"In this post-apocalyptic game, you’ll be fulfilling quests and restoring a workshop …\"" },
  cmim9f745004coxqw0of9y5nz: { contentType: null, why: "E400 \"The Goth Family Nostalgic Refresh\" — NULL, was gameplay-mod; desc: \"I absolutely love this nostalgic refresh of the Goth Family! I’ve always loved the …\"" },
  cmim8w9zd00o4oxy8p6x9wefd: { contentType: null, why: "E400 \"Jackson Brukes\" — NULL, was gameplay-mod; desc: \"Jackson Brukes is an independent little rascal who will cause chaos wherever he is. If …\"" },
  cmim8w9of00nzoxy8cbc8pqaj: { contentType: null, why: "E400 \"Jaime\" — NULL, was gameplay-mod; desc: \"Jaime is another teen male Sim you can get for your gameplay. After downloading the …\"" },
  cmim8w87600nboxy8k740sq0j: { contentType: null, why: "E400 \"Windsor\" — NULL, was gameplay-mod; desc: \"Windsor is an athletic Sim who loves anything track and fitness. If you don’t find him …\"" },
  cmim8w7xh00n6oxy82qziq0cr: { contentType: null, why: "E400 \"Hugh\" — NULL, was gameplay-mod; desc: \"Hugh is a handsome fella who can add a sexy touch to your gameplay. He’s tall, …\"" },
  cmil1085o0071oxeen60mjtyj: { contentType: "full-body", why: "E400 \"Deco Dragon Robe\" — full-body, was gameplay-mod; desc: \"The Deco Dragon Robe cc is a decorative piece inspired by traditional Korean attire. …\"" },
  cmikknbur00duox33gabz8tye: { contentType: "shoes", why: "E400 \"Star Wedges\" — shoes, was script-mod; desc: \"I like finding unique Sims 4 creations, like these Star Wedges, with extra detailing …\"" },
  cmikipyi20044oxnaapn4jmov: { contentType: "accessories", why: "E400 \"Deer Mask Child\" — accessories, was gameplay-mod; desc: \"With the announcement of the Sims 4 Fairies pack, many players are seeking mythical …\"" },
  cmikii64d0016oxnayf94ll4e: { contentType: null, why: "E400 \"Belaloallure Y2K Style\" — NULL, was gameplay-mod; desc: \"The Belaloallure Y2K Style brings that early 2000s heat to your gameplay. This …\"" },
  cmikihuu8000xoxna3rp5zhz0: { contentType: null, why: "E400 \"Belaloallure CC\" — NULL, was gameplay-mod; desc: \"If you’re looking for bold, high-fashion vibes for your summer vacay, the Belaloallure …\"" },
  cmikaw7dz00l9oxk78e916pz1: { contentType: "hats", why: "E400 \"Anna Bonnet Hat\" — hats, was gameplay-mod; desc: \"The Anna Bonnet Hat is a beautifully crafted historical hat that you can use to …\"" },
  cmijqboph01g8oxc8crc9j68v: { contentType: "shoes", why: "E400 \"Chanel Stiletto Flat\" — shoes, was gameplay-mod; desc: \"You cannot create a Chanel-inspired look without the right shoes, and these pair of …\"" },
  cmijpoeqr015ooxc8fn0tauwn: { contentType: null, why: "E400 \"Honey Collection\" — NULL, was gameplay-mod; desc: \"If you want a collection of Sims 4 alpha clothes cc to add to your gameplay, get the …\"" },
  cmigsu98g0018oxkzmat2jxnh: { contentType: null, why: "E400 \"Sims 4 Mermaid Scales & Tails Recolors\" — NULL, was script-mod; desc: \"Speaking of MsFrankenstein, here are some playful recolors for mermaid scales and …\"" },
  cmigomsow000boxkzikrlcgww: { contentType: null, why: "E400 \"Adina\" — NULL, was gameplay-mod; desc: \"The Adina Mermaid Tail is a gorgeous option for mermaids who prefer a darker, elegant …\"" },
  // ── Audited 2026-11-13 (Sage, E400, houses-lots hub). All 983 SFW Sims 4 `lot`
  //    (394), `residential` (547), `commercial` (34) and `community` (8) rows
  //    were read before the lots hub shipped. 277 (28.2%) are not lots, almost
  //    all of them on `residential` (the blog-post URL category wrote it onto
  //    every row of a "family home" roundup): 131 NULL (walls, windows, doors,
  //    wallpaper and terrain, which have no facet; EA packs; other games; Sims;
  //    clothing packs; a save file), 61 furniture (room and hallway sets), 37
  //    gameplay mods (chores, retail, school, traits), 13 decor, 8 wall art and
  //    27 others. Kept on purpose: venues (parks, campgrounds, wedding venues,
  //    a waterpark), lot shells, and homes named after a person when the row's
  //    own description says it is a house (Drake Carson, Martha Perkins).
  cmijklro10028oxc8j3ukwcfy: { contentType: null, why: "E400 \"Bricks\" — NULL, was residential; desc: \"Created by Pralinesims, this collection features a variety of modern brick walls for …\"" },
  cmijnu8s500jloxc85b1o059v: { contentType: null, why: "E400 \"Newcrest University Stuff Pack\" — NULL, was community; desc: \"The Newcrest University Stuff Pack is an extensive collection with everything you need …\"" },
  cmijo276e00nroxc8b8a2bzkt: { contentType: null, why: "E400 \"Marble Wall Tiles Divorces for Walls and Floor\" — NULL, was residential; desc: \"For those who want to create luxurious interiors, get the Marble Wall Tiles Divorces …\"" },
  cmijns7fp00ijoxc8xpgenocm: { contentType: "furniture", why: "E400 \"Fleur hallway Pt.II\" — furniture, was residential; desc: \"The Fleur Hallway is an extensive Sims 4 fall outdoor CC collection with decorative …\"" },
  cml5sjan3003moxxr68caqczp: { contentType: null, why: "E400 \"Realistic Brick Walls\" — NULL, was residential; desc: \"There’s a familiar suburban charm in this set, and the range of colors makes it easy …\"" },
  cmijkvrwg003toxc84szetpzv: { contentType: "food", why: "E400 \"English Breakfasts\" — food, was residential; desc: \"If you’re looking for a classic breakfast spread full of hearty comfort food, this …\"" },
  cmim9joe90027oxy7xtx6tvyi: { contentType: null, why: "E400 \"The Sims 4 City Living\" — NULL, was residential; desc: \"The one reason you NEED Sims 4 City Living: apartments. Apartments were introduced in …\"" },
  cmil0owyj001ioxeeqjf2n1rd: { contentType: "plants", why: "E400 \"Naturalis Office Wall Plants\" — plants, was residential; desc: \"If you’re looking for an easy way to add a fresh, natural touch to your Sim’s office …\"" },
  cmijknyrj0033oxc8beyi2cfc: { contentType: "wall-art", why: "E400 \"Wall Art Paintings Menu and Posters For Bakery and Cafe\" — wall-art, was commercial; desc: \"If you’re looking for wall décor to complete your kitchen or bakery build, download …\"" },
  cmil0uvml004koxeeman0x7yd: { contentType: null, why: "E400 \"Axis-Marble Wall\" — NULL, was residential; desc: \"There was a time when marble walls were so popular that everyone had them on their …\"" },
  cmim8w4vo00n1oxy8i3eho3vt: { contentType: null, why: "E400 \"Winter At Home Essentials Set\" — NULL, was residential; desc: \"The Winter At Home Essentials Set is a cozy collection for female Sims who love …\"" },
  cmil0po48001xoxeeh2qrdsbr: { contentType: "wall-art", why: "E400 \"D720 Wall Decals Set\" — wall-art, was residential; desc: \"The D720 Wall Decals Set features 30 nature-inspired creations for your Sim’s indoor …\"" },
  cmijoqxb700skoxc8qbediqi5: { contentType: null, why: "E400 \"Modern Doors Dream\" — NULL, was residential; desc: \"If you’re looking for sleek and stylish interior door options, the Modern Doors Dream …\"" },
  cmijklxai002coxc82nbs13c5: { contentType: null, why: "E400 \"Weathered Bricks Wallpapers\" — NULL, was residential; desc: \"For Simmers who enjoy builds with a rougher, lived-in edge, these Weathered Bricks …\"" },
  cmim9jols002boxy7tfo10515: { contentType: null, why: "E400 \"The Sims 4 Island Living\" — NULL, was residential; desc: \"This is one of those expansion packs that sounds fun but just isn’t. Don’t get me …\"" },
  cmim9mix300fzoxy7m7lksoo4: { contentType: null, why: "E400 \"High School Sims CC Pack\" — NULL, was community; desc: \"With lots of patterns and bright colors, this cc pack is perfect for your teen sims …\"" },
  cmim9je6s000uoxy7yohx7v31: { contentType: null, why: "E400 \"Sims 4 Graduation Deco Sims\" — NULL, was residential; desc: \"I remember when I graduated high school and after the ceremony, it seemed like there …\"" },
  cmikj0qdh009aoxnaonim1bs7: { contentType: "furniture", why: "E400 \"Functional Big Screen TVs and Deco DVD/VHS VCR Combo\" — furniture, was residential; desc: \"If you’re looking for a retro home entertainment upgrade for your Sim, get the …\"" },
  cmim8uh1t00cuoxy8rh8pq3gm: { contentType: "gameplay-mod", why: "E400 \"Llamazon Marketplace\" — gameplay-mod, was residential; desc: \"If you love fall shopping and want to buy cute decor pieces or sets for your home, get …\"" },
  cmikdcelc0039oxbh2lehi3lz: { contentType: "furniture", why: "E400 \"Eat Play Sleep Repeat Set\" — furniture, was residential; desc: \"If your Sim spends their entire day gaming and eating, then the Eat Play Sleep Repeat …\"" },
  cmjh4kztc001roxyvw1hboyso: { contentType: "furniture", why: "E400 \"December 2025 Set\" — furniture, was residential; desc: \"This is a fully customizable playground set made for creativity. It features modular …\"" },
  cmim9oi3000nooxy7bmyl789h: { contentType: "gameplay-mod", why: "E400 \"Uplifting Sims 4 Elevators\" — gameplay-mod, was residential; desc: \"The functional elevator created by Ravasheen is a popular download in the sims …\"" },
  cmijpjzw40137oxc8jl3bhcie: { contentType: "wall-art", why: "E400 \"Metal Posters\" — wall-art, was residential; desc: \"Wall art is a must-have for any punk or metal-inspired space in 2025, and this poster …\"" },
  cmijob1dk00qkoxc8yq1p7aih: { contentType: null, why: "E400 \"Korea Apartment Windows Set Part 1\" — NULL, was residential; desc: \"This set captures the authentic look of Korean-style apartments. With a collection of …\"" },
  cmijo12mm00naoxc8wz66o6is: { contentType: null, why: "E400 \"Foundation Pack\" — NULL, was residential; desc: \"If you’re looking for realistic walls for both interiors and exteriors, this set has …\"" },
  cmim8w83h00n9oxy8obq05izu: { contentType: null, why: "E400 \"Nasir Randolph\" — NULL, was residential; desc: \"Nasir Randolph is a typical “bad boy.” He’s always chasing girls in local nightclubs …\"" },
  cmijoql2v00sboxc8sifrcp5y: { contentType: null, why: "E400 \"Levitas Part 4: Levitas Doors\" — NULL, was residential; desc: \"Looking to add a sleek, contemporary look to your Sim’s build, get the The Levitas …\"" },
  cmijnznyt00mmoxc8hk89514u: { contentType: "furniture", why: "E400 \"Organic Oasis Hotel Suite Minibar\" — furniture, was commercial; desc: \"The Organic Oasis Hotel Suite Minibar set features a range of essential appliances for …\"" },
  cmijknw6q0032oxc84k1zcy0c: { contentType: "gameplay-mod", why: "E400 \"Home Boulangerie Is Back!\" — gameplay-mod, was residential; desc: \"If you want to set up a fully functional bakery, check out this updated Home …\"" },
  cmijklbnn0022oxc85gfooy3p: { contentType: "gameplay-mod", why: "E400 \"Bonus Challenge: MasterChef Oasis Springs Edition\" — gameplay-mod, was residential; desc: \"If you prefer a more structured and realistic cooking-show experience, the MasterChef …\"" },
  cmim9joc50026oxy7h1sf2nic: { contentType: null, why: "E400 \"The Sims 4 Cottage Living\" — NULL, was residential; desc: \"This is the newest Sims 4 expansion pack, as of my first writing of this post. So, I …\"" },
  cmim8wj3700psoxy8m7foz1x4: { contentType: "clutter", why: "E400 \"Bubble Mailers\" — clutter, was residential; desc: \"Bubble Mailers is a set of mail and delivery ccs for your Sim’s front doorstep. If you …\"" },
  cmim9oi6z00nqoxy7cjvvr30e: { contentType: "gameplay-mod", why: "E400 \"Shop Chef Ingredients\" — gameplay-mod, was commercial; desc: \"If you love realistic gameplay and retail, then you need this set of cc ingredients! …\"" },
  cmim9n3yh00imoxy7889b6juf: { contentType: "furniture", why: "E400 \"Sims 4 CC Toddler Playpen\" — furniture, was residential; desc: \"If your sims need to get some work done and don’t want the toddlers making a mess …\"" },
  cmim91mp201msoxy8kmws9rpp: { contentType: "gameplay-mod", why: "E400 \"Better Autonomous Homework\" — gameplay-mod, was residential; desc: \"For some players, students never do their homework autonomously unless promoted. The …\"" },
  cmim8vlm600jjoxy8jqa65vqj: { contentType: null, why: "E400 \"Gianna Silva\" — NULL, was residential; desc: \"Another Sims 4 Sim download to add to your world is Gianna Silva. You can add her to …\"" },
  cmim8ugmb00cnoxy88qzs5i91: { contentType: "gameplay-mod", why: "E400 \"Laundry Service\" — gameplay-mod, was residential; desc: \"If you’re having a lazy autumn morning or simply don’t feel like doing laundry, you …\"" },
  cmim8ugd000cjoxy89me930bk: { contentType: "gameplay-mod", why: "E400 \"Sunrise Alarm Clock\" — gameplay-mod, was residential; desc: \"Lot 51’s Sunrise Alarm Clock is the perfect aesthetic mod to add to your Sims 4 autumn …\"" },
  cmijqdl5801h0oxc8yfbagqli: { contentType: null, why: "E400 \"Pink Marble Tile Wall\" — NULL, was residential; desc: \"Another great pink-themed tile option for your home is the Pink Marble Tile Wall. It’s …\"" },
  cmijoc0mo00r0oxc892j379f6: { contentType: null, why: "E400 \"Mandy Windows and Blinds\" — NULL, was residential; desc: \"Featuring 12 window pieces, the Mandy Windows and Blinds set is a must-have when …\"" },
  cmijoatq900qgoxc8swe33vcd: { contentType: null, why: "E400 \"Rotten Windows\" — NULL, was residential; desc: \"This set introduces rotten wood windows with shattered and stained glass to your Sim’s …\"" },
  cmijo23gl00npoxc81ddg4m39: { contentType: null, why: "E400 \"Bricks 7\" — NULL, was residential; desc: \"Bricks 7 are weathered, uneven walls for your base game. The detailing on the bricks …\"" },
  cmim9o3uh00mboxy7koflxhnl: { contentType: null, why: "E400 \"Sims 4 Senior Year Y2K CC Pack\" — NULL, was residential; desc: \"I really felt like this pack shows off more of the casual and laidback looks of the …\"" },
  cmijkngbp002zoxc8sdqudd5e: { contentType: "furniture", why: "E400 \"Ice Cream Shop Megana Part 2\" — furniture, was commercial; desc: \"Kicking off this list is the Ice Cream Shop Megana set, a bright and modern collection …\"" },
  cmik9rnxi009ooxk7d9sijuli: { contentType: null, why: "E400 \"Fairy House Set\" — NULL, was residential; desc: \"The Fairy House Set isn’t precisely a home but a pack with various whimsical …\"" },
  cmijnfr6i00daoxc8gxf9rxl0: { contentType: "furniture", why: "E400 \"Bayfront Home Children’s Room\" — furniture, was residential; desc: \"Bayfront Home Children’s Room is part of the beloved Bayfront series. You’ll instantly …\"" },
  cmim91mfw01mooxy8fdj9reti: { contentType: "gameplay-mod", why: "E400 \"SimU Online Classes\" — gameplay-mod, was residential; desc: \"The SimU Online Classes mod allows Sims to take online skill classes from their …\"" },
  cmim8ybht0114oxy8dx1m1476: { contentType: "furniture", why: "E400 \"Shop The Look – Athena Living\" — furniture, was commercial; desc: \"Shop The Look – Athena Living is a convenient set with modern and simple objects …\"" },
  cmim8whz300p7oxy8mcbt17ht: { contentType: null, why: "E400 \"Vanilla Girl Aesthetic CC\" — NULL, was residential; desc: \"If you’re looking for some cute decor items for your Sims home, get the Vanilla Girl …\"" },
  cmil0v71y004poxee099ji9ph: { contentType: null, why: "E400 \"Wallpaper 1\" — NULL, was residential; desc: \"I’ll end the list with Wallpaper 1, which adds a soft, stylish touch to your Sim’s …\"" },
  cmika911b00jsoxk7171od6dz: { contentType: null, why: "E400 \"Curve Pool Version 1\" — NULL, was residential; desc: \"If you’re looking for a beautiful pool to add a touch of flair to your Sim’s space, …\"" },
  cmijoqclv00s5oxc89ifg0fe1: { contentType: null, why: "E400 \"Sable Doors Part 1: Medium Walls\" — NULL, was residential; desc: \"The first part of the Sable Door collection introduces striking geometric panels …\"" },
  cmijo1u8100nkoxc8gs6jikx9: { contentType: null, why: "E400 \"Gray Stone Wall\" — NULL, was residential; desc: \"Give your build a strong and seamless foundation with this collection of grey stone …\"" },
  cmijl2rmr005doxc8p77xr9i4: { contentType: "gameplay-mod", why: "E400 \"Let Friends Age Up\" — gameplay-mod, was residential; desc: \"The Let Friends Age Up is an essential mod for teen Sims living on the same lot. It …\"" },
  cmtvefv7o0003oxl9opq16zrd: { contentType: "gameplay-mod", why: "E400 \"Travel to Venue – Hidden and Vacation Destinations\" — gameplay-mod, was lot; desc: \"Travel to Venue by TwelfthDoctor1 is a Sims 4 travel mod that lets your Sims visit …\"" },
  cmijnr8ob00i5oxc8s5x90q53: { contentType: "furniture", why: "E400 \"Winter Garden\" — furniture, was residential; desc: \"Created by Pierisim, the Winter Garden CC pack brings a calm and natural vibe to your …\"" },
  cmim8ugvk00croxy8jy92xsrk: { contentType: "gameplay-mod", why: "E400 \"Clean House & Ask to Clean House\" — gameplay-mod, was residential; desc: \"If you’re into fall cleaning, you’ll need the Clean House & Ask to Clean House mod. …\"" },
  cmijqa8ou01fioxc881uwaybi: { contentType: null, why: "E400 \"Grace Pierre\" — NULL, was residential; desc: \"If you’re anything like me, you probably don’t have the time and patience to create a …\"" },
  cmijobp7t00quoxc8bdld22wq: { contentType: null, why: "E400 \"Doriane Part 1: Windows\" — NULL, was residential; desc: \"Looking for a timeless selection of sleek, versatile windows? Download the Doriane …\"" },
  cmijitx2f0001oxs3qsvukhjj: { contentType: null, why: "E400 \"Sims 4 Toddler Mermaid Tail\" — NULL, was residential; desc: \"Unfortunately, this isn’t a toddler mermaid mod like I know a lot of simmers want, but …\"" },
  cmim8x29m00teoxy8lsa7ghbs: { contentType: "gameplay-mod", why: "E400 \"Chores\" — gameplay-mod, was residential; desc: \"Chores Mod lets you add Cleaning Schedules via the Parenthood Bulletin Board. This …\"" },
  cmijoc5cx00r3oxc8xsoupzst: { contentType: null, why: "E400 \"Industry Windows for Large Wall Size\" — NULL, was residential; desc: \"The Industry Windows for Large Wall Size CC is perfect if you want to transform your …\"" },
  cmil0ttzh003xoxeeae3c8k0q: { contentType: null, why: "E400 \"Morris And Co. Strawberry Thief Wallpaper\" — NULL, was residential; desc: \"If you’re looking for a timeless burst of vintage charm for your Sim’s interiors, the …\"" },
  cmim9o8m100mwoxy79h6xcmbo: { contentType: "furniture", why: "E400 \"Rustic Cottagecore CC Animal Shed\" — furniture, was residential; desc: \"Create the ultimate cottagecore aesthetic farm with this rustic cc animal shed! It …\"" },
  cmim92xn601tuoxy841whuz0s: { contentType: "furniture", why: "E400 \"Muji Set\" — furniture, was residential; desc: \"The Muji Set is a minimalist and functional custom content for the Sims 4, inspired by …\"" },
  cmim8x2te00tmoxy8arc50bvm: { contentType: "gameplay-mod", why: "E400 \"Insurance Company\" — gameplay-mod, was residential; desc: \"If you want your kids to be financially secure after your passing, get the Insurance …\"" },
  cmil12qfd0087oxeee1toh07q: { contentType: "furniture", why: "E400 \"December Home Office\" — furniture, was residential; desc: \"The December Home Officeset brings a soft and feminine touch to your Sim’s workspace. …\"" },
  cmijoc1vs00r1oxc8gxsfr1q6: { contentType: null, why: "E400 \"Altara Build Set\" — NULL, was residential; desc: \"The Altara Build Set is a versatile pack of windows and doors designed for modern …\"" },
  cmijoa8r900qaoxc8zn3wh6vr: { contentType: "shoes", why: "E400 \"Ugg Set\" — shoes, was residential; desc: \"Ugg lovers, this one’s for you. The pair of Ugg boots comes in two versions – short …\"" },
  cmijo1w1s00nloxc8hb6p3db8: { contentType: null, why: "E400 \"Oak Panel Wall\" — NULL, was residential; desc: \"Created by Kasa Kokos, the Oak Panel Wall features sleek oak paneling, ideal for …\"" },
  cmijntnxd00j8oxc8xc64si7q: { contentType: "gameplay-mod", why: "E400 \"Bachelor Of Sports\" — gameplay-mod, was residential; desc: \"Sports fans, this one’s for you. The mod unlocks the ability to attend Esports and …\"" },
  cmijl3xog005woxc8q2emhvik: { contentType: "decor", why: "E400 \"Victorian Doll House\" — decor, was residential; desc: \"This Victorian Doll House has pastel rooftops, towered peaks, and soft pink trim. It’s …\"" },
  cmijkmnl7002roxc8lcbwma53: { contentType: null, why: "E400 \"Pasquin Brick Wall LLS\" — NULL, was residential; desc: \"The Pasquin Brick Wall instantly shifts your builds into a playful, storybook mood …\"" },
  cmijkm5o1002ioxc84wfkssc0: { contentType: null, why: "E400 \"Brick It Wall\" — NULL, was residential; desc: \"If you’re looking for brick walls with heavy character and visible aging, grab this …\"" },
  cmigtx112001goxkzk0n6mqmy: { contentType: "food", why: "E400 \"Jerk Chicken\" — food, was residential; desc: \"Another Caribbean classic to add to your recipe collection is Jerk Chicken. This bold, …\"" },
  cmiglk7ty001joxm5m9r79qou: { contentType: "furniture", why: "E400 \"Ocean Whimsy Set\" — furniture, was residential; desc: \"This Sims 4 furniture cc set contains cute, mermaid-inspired pieces for your home. …\"" },
  cmqpykeq4008toxeeosc4ork1: { contentType: "tattoos", why: "E400 \"House Of Night Forehead Markings V2\" — tattoos, was lot; desc: \"The House of Night Forehead Markings V2 is a glowing crescent tattoo sprawled across …\"" },
  cmijpwz8u01a0oxc8q2bendlj: { contentType: "furniture", why: "E400 \"Cleo Hallway\" — furniture, was residential; desc: \"For those looking for a Scandinavian-inspired entryway, the Cleo Hallway set is a …\"" },
  cmil15niv009doxee9trmh2ia: { contentType: "furniture", why: "E400 \"Stylish Wood Home Office\" — furniture, was residential; desc: \"Elevate your Sim’s workspace with the Stylish Wood Home Office set, a part of the …\"" },
  cmijkmgk6002noxc81k94c7z5: { contentType: null, why: "E400 \"Brick Wall Dump 01\" — NULL, was residential; desc: \"If you’re looking for a wide range of modern brick options in one download, get this …\"" },
  cmil15web009hoxeey6ehfzv2: { contentType: "furniture", why: "E400 \"Cottagecore\" — furniture, was residential; desc: \"This charming Cottagecore set delicately captures the whimsiness of rustic kitchens. …\"" },
  cmim9kaay003zoxy761iu78uy: { contentType: "career", why: "E400 \"Sims 4 Active Lifeguard Career\" — career, was residential; desc: \"This is a new active career that I’ve come across recently. It’s a simple three-level …\"" },
  cmijpgsyh011soxc8j1yquemk: { contentType: null, why: "E400 \"CC Pack\" — NULL, was residential; desc: \"If you want a clothing set containing official and casual or sporty looks, get the CC …\"" },
  cmim8x1y900t9oxy8ww9s9z6v: { contentType: "gameplay-mod", why: "E400 \"Parent Discipline Actions for All\" — gameplay-mod, was residential; desc: \"The Parent Discipline Actions for All mod allows any Sim in the game, from teen to …\"" },
  cmijj12cb0025oxs3otq6fo58: { contentType: "furniture", why: "E400 \"FOLKLORE: Heritage Part 4\" — furniture, was residential; desc: \"This cozy Heritage nursery set brings warm folk charm to your historical space. The …\"" },
  cmik9n15z0079oxk7efh2ncgl: { contentType: "decor", why: "E400 \"Retro Diner Deco Set\" — decor, was commercial; desc: \"This Retro Diner Decor Set brings the charm of a classic American eatery right into …\"" },
  cmil0phbs001toxeefrxgb315: { contentType: "plants", why: "E400 \"Plants Collection\" — plants, was residential; desc: \"The Plants Collection is a stunning set of greenery designed to bring life to your …\"" },
  cmijjr4xh00e4oxs34jjni37t: { contentType: "furniture", why: "E400 \"Apartment Therapy CC Stuff Pack\" — furniture, was residential; desc: \"Is your sim obsessed with taking Simstagram photos of their home decor? If so, then …\"" },
  cmim9vk2l0005ox9syz76p08e: { contentType: "gameplay-mod", why: "E400 \"Sims 4 Toddler CC Traits\" — gameplay-mod, was residential; desc: \"There are just not enough toddler traits in the sims 4 base game! Luckily, Vicky Sims …\"" },
  cmim9lk0o009poxy74cse9jd9: { contentType: null, why: "E400 \"The Tenants\" — NULL, was residential; desc: \"In The Tenants, you’ll buy real estate, become a landlord, manage your tenants, and …\"" },
  cmim9lglw009eoxy7tj7mxfm6: { contentType: "furniture", why: "E400 \"Sims 4 Mid Century Modern Living Collection\" — furniture, was residential; desc: \"The retro tv that comes with this Midcentury-Modern custom content collection is …\"" },
  cmim8xga100w2oxy8kf0g6522: { contentType: "gameplay-mod", why: "E400 \"Teen Summer Camp Jobs\" — gameplay-mod, was residential; desc: \"Teen Summer Camp Jobs is a teen jobs collection mod comprising 7 jobs in the summer …\"" },
  cmim8ugxo00csoxy8pjduvdcj: { contentType: "gameplay-mod", why: "E400 \"Functional Broom\" — gameplay-mod, was residential; desc: \"Functional Broom is another exceptional cleaning mod for neat freaks. This base-game …\"" },
  cmikiuu73006ooxnai4dswwuq: { contentType: "lighting", why: "E400 \"Candelabra\" — lighting, was residential; desc: \"Candelabra is a gorgeous dark lighting accessory to add to your Sims 4 gothic …\"" },
  cmijpud4b018koxc8ygbpzoen: { contentType: "gameplay-mod", why: "E400 \"Born Chef Trait\" — gameplay-mod, was residential; desc: \"I was born into a family of chefs, and therefore, I had to include the Born Chef Trait …\"" },
  cmijp3yvb00vioxc8zns8v3ey: { contentType: "rugs", why: "E400 \"Bright Fluffy Carpet\" — rugs, was residential; desc: \"Add warmth and comfort to your bachelor pad with this fluffy carpet. It comes in 4 …\"" },
  cmijp0ty900tyoxc8ev1milye: { contentType: null, why: "E400 \"Be Barn Doors\" — NULL, was residential; desc: \"Add a touch of rustic charm to your Sim’s home with this versatile barn door set. The …\"" },
  cmijoq9jo00s3oxc8wk03r2pk: { contentType: null, why: "E400 \"YeHwa Doors\" — NULL, was residential; desc: \"Inspired by classic drama architecture, the YeHwa Doors set brings a traditional …\"" },
  cmijoax5c00qioxc8o3pdg3b0: { contentType: null, why: "E400 \"Claire Windows B with Shutter and Doors\" — NULL, was residential; desc: \"If you’re looking for a versatile suburban-inspired set, Claire Windows B with Shutter …\"" },
  cmijo57f500o5oxc89lkq6a0b: { contentType: null, why: "E400 \"The Greenhouse Collection\" — NULL, was residential; desc: \"If you prefer clothes packs with multiple options, the Greenhouse Collection is a …\"" },
  cmijn8pjm00bzoxc8stb80sam: { contentType: "gameplay-mod", why: "E400 \"K-202 Groundy Mod\" — gameplay-mod, was residential; desc: \"Another aesthetic mod by K-hippie is the K-202 Groundy Mod. It changes your backyard …\"" },
  cmijkmbfo002moxc8zvmwumm3: { contentType: null, why: "E400 \"Italia Exposed Brick Wall Murals\" — NULL, was residential; desc: \"I included the Italia Exposed Brick Wall Murals set on this list for its cinematic …\"" },
  cmijkm2b1002goxc8127r2jgq: { contentType: null, why: "E400 \"Wall 01: Brick Wall\" — NULL, was residential; desc: \"Designed with a bold, graphic quality and contrast-heavy texture, this Sims 4 brick …\"" },
  cmijjqsg200dvoxs3oiv9c3xm: { contentType: "furniture", why: "E400 \"Sims 4 Home Office CC Pack\" — furniture, was residential; desc: \"This is a HUGE cc pack! Altogether, you’ll receive 68 new items when downloading. …\"" },
  cmtvefvko0008oxl9cddewchv: { contentType: "gameplay-mod", why: "E400 \"Airport Lot Trait\" — gameplay-mod, was lot; desc: \"The Airport Lot Trait by KiaraSims4Mods lets you turn a custom airport build into a …\"" },
  cml5sjbo5003ooxxrw6ci5ob6: { contentType: null, why: "E400 \"Bricks\" — NULL, was residential; desc: \"If you’re looking for a richly textured brick wall with a lived-in, worn aesthetic, …\"" },
  cml5sjawo003noxxr7kgkxg16: { contentType: null, why: "E400 \"Brick Walls\" — NULL, was residential; desc: \"This masonry-style brick wall adds a grounded, textured look to your Sim’s home. The …\"" },
  cmkyo90ge018xoxhco6k3qi9l: { contentType: null, why: "E400 \"Sims 4 Greenhouse CC Pack\" — NULL, was lot; desc: \"Custom content created by Greenllamas. Enhance your Sims 4 experience with this …\"" },
  cmkygckhy00yboxhcoucocfg4: { contentType: null, why: "E400 \"I Made You a Dollhouse\" — NULL, was lot; desc: \"♡ This is an early access post - it will become public on Feb 3rd! ♡\"" },
  cmky6x7w300hhoxhcj66nxcsy: { contentType: "furniture", why: "E400 \"Apartment Therapy-Inspired Living Room\" — furniture, was lot; desc: \"Custom content created by Awingedllama. Enhance your Sims 4 experience with this …\"" },
  cmky5q2fa00euoxhc7e3vy2tu: { contentType: null, why: "E400 \"5 Parking Lot Male Set\" — NULL, was lot; desc: \"Custom content created by Joliebean. Enhance your Sims 4 experience with this …\"" },
  cmky1vaqg00b6oxhcxmvonm6s: { contentType: null, why: "E400 \"Housewives Pleasantview\" — NULL, was lot; desc: \"Custom content created by Joliebean. Enhance your Sims 4 experience with this …\"" },
  cmkxfvbi60019oxj37114l7rs: { contentType: "furniture", why: "E400 \"Fudge Market Stall\" — furniture, was commercial; desc: \"Custom content created by Littlbowbub. Enhance your Sims 4 experience with this …\"" },
  cmkxfti7e0013oxj3gq08d2y0: { contentType: "furniture", why: "E400 \"6 The Mini Media Set\" — furniture, was residential; desc: \"Custom content created by Midnitetech. Enhance your Sims 4 experience with this …\"" },
  cmkxfrwan000yoxj3zn9tvgxs: { contentType: "furniture", why: "E400 \"1 Bliss Hallway Stuff\" — furniture, was residential; desc: \"Custom content created by Myshunosun. Enhance your Sims 4 experience with this …\"" },
  cmkxfpud5000roxj3hgg03sug: { contentType: null, why: "E400 \"4 Mistletoe Set\" — NULL, was residential; desc: \"Custom content created by Sondescent. Enhance your Sims 4 experience with this …\"" },
  cmkxfplpm000qoxj3pxjzvzv6: { contentType: null, why: "E400 \"3 Lumière Collection\" — NULL, was residential; desc: \"Custom content created by Caio-CC. Enhance your Sims 4 experience with this …\"" },
  cmim91m1j01mioxy8d0onn8ay: { contentType: "gameplay-mod", why: "E400 \"Form Groups in School\" — gameplay-mod, was community; desc: \"As the name suggests, this mod allows your teenage Sims to group up, so they can sit …\"" },
  cmktsjgd7002ioxol8km54ldb: { contentType: null, why: "E400 \"3 Grandma’s House Stuff\" — NULL, was lot; desc: \"Custom content created by Jellypawss. Enhance your Sims 4 experience with this …\"" },
  cmim9nhqe00k1oxy7rk4ax4d8: { contentType: "gameplay-mod", why: "E400 \"Hire Teen for Restaurant\" — gameplay-mod, was commercial; desc: \"If you need teen wait staff for employment purposes, you want to check out this mod. …\"" },
  cmim9lkn3009zoxy756dywmjx: { contentType: null, why: "E400 \"No Place Like Home\" — NULL, was residential; desc: \"No Place Like Home is a post-apocalyptic farm building game. How this game is like The …\"" },
  cmikiwtkn007doxnatwv55wd0: { contentType: null, why: "E400 \"Finger Chopsticks for Gamers\" — NULL, was residential; desc: \"If you’re looking for a fun and quirky gift that’s actually super useful, get the …\"" },
  cmigomq0y0009oxkzyzkfbwaj: { contentType: "wall-art", why: "E400 \"Mermaid Wall Prints\" — wall-art, was residential; desc: \"Transform a plain room into an ocean-themed space with these Mermaid Wall Prints. Each …\"" },
  cmim9fjno006joxqwntuyk559: { contentType: "furniture", why: "E400 \"Hello Horses\" — furniture, was residential; desc: \"Exploring ‘Hello Horses’ by TheClutterCat has been a joy! This set wonderfully blends …\"" },
  cmijo1d2q00nfoxc8tuqnqejf: { contentType: null, why: "E400 \"Large Hex Walls\" — NULL, was residential; desc: \"Designed with a bold, eye-catching pattern, the Large Hex Walls are my go-to Sims 4 …\"" },
  cmim9fjpu006koxqwdtikw4qz: { contentType: "decor", why: "E400 \"Far West Wind Turbine\" — decor, was residential; desc: \"I absolutely love this Wind Turbine by serinion. This eco-friendly wind turbine not …\"" },
  cmknfb825007noxolb113vgcy: { contentType: "furniture", why: "E400 \"Vienna Bookshelf CC\" — furniture, was residential; desc: \"The Vienna Bookshelf is a modern, open-frame storage piece designed to organize and …\"" },
  cmknfb80c007moxol9tvua2rp: { contentType: "furniture", why: "E400 \"Ukiah Office Extra Storage CC\" — furniture, was residential; desc: \"For those who want storage options for their office, check out the Ukiah Office Extra …\"" },
  cmil0u4l90044oxeejioxvk0o: { contentType: null, why: "E400 \"Luxe Chester Walls\" — NULL, was residential; desc: \"I love a good quilted fabric, and the Luxe Chester Walls are no exception. They …\"" },
  cmijni7kz00dwoxc8pxyouoen: { contentType: null, why: "E400 \"Very Low Stone Wall\" — NULL, was residential; desc: \"Adding structure and charm to your landscaping, the Very Low Stone Wall is a subtle …\"" },
  cmijiv57y0003oxs3ceda348q: { contentType: "food", why: "E400 \"Sims 4 Cream Puff Doughnuts\" — food, was residential; desc: \"Does your sim love baking? Do they want to run an at-home bakery? These cream puff …\"" },
  cmil18ti900aioxeeb1atw3te: { contentType: "decor", why: "E400 \"Monokuma Plushie\" — decor, was residential; desc: \"I’m a huge fan of plushies, and I have them propped up throughout my apartment. To …\"" },
  cmijpl0ws013voxc8anwv21qy: { contentType: "furniture", why: "E400 \"Music Corner Pack\" — furniture, was residential; desc: \"Create a stunning music nook in your Sim’s home with items from the Music Corner Pack. …\"" },
  cmim9lk32009qoxy7q58asjin: { contentType: null, why: "E400 \"Hokko Life\" — NULL, was residential; desc: \"Hokko Life is a life simulation game with an adorable art style where you build a new …\"" },
  cmil3p0c700hwoxpzy02cdc11: { contentType: "furniture", why: "E400 \"Saffron Set\" — furniture, was residential; desc: \"The Saffron Set by Kerrigan House Designs includes eight original meshes to complete …\"" },
  cmil0u7990046oxeen83zcp6d: { contentType: null, why: "E400 \"Dino Wall\" — NULL, was residential; desc: \"If you’re fascinated by archeology and would like to show it off, the Dino Wall set is …\"" },
  cmijnicpq00dzoxc8oio53zdy: { contentType: "furniture", why: "E400 \"Golden Garden Part 3\" — furniture, was residential; desc: \"This Golden Garden Part 3 set transforms any outdoor space into a cozy, …\"" },
  cmijo9z8f00q4oxc8zljuyt4e: { contentType: null, why: "E400 \"November Foliage Wall\" — NULL, was residential; desc: \"The November Foliage Wall by coll22 adds instant autumn charm to any Sims 4 build. …\"" },
  cmijn8xcc00c3oxc8h6edwrpp: { contentType: "furniture", why: "E400 \"Home Office Kit\" — furniture, was residential; desc: \"If your Sim is a freelancer who works from home, you may want to get the Home Office …\"" },
  cmim8v77g00gzoxy8e00dusrf: { contentType: "rugs", why: "E400 \"Goth Doormat\" — rugs, was residential; desc: \"If you want to decorate your Sims 4 household to match your goth aesthetic, get this …\"" },
  cmijoqjyt00saoxc895tuw5fc: { contentType: null, why: "E400 \"Beo Industrial Arches Set\" — NULL, was residential; desc: \"Comprising nine doors and arches, the Beo Industrial Arches Set is perfect for Sims …\"" },
  cmim9m2vq00eboxy710jjhm2v: { contentType: "furniture", why: "E400 \"Work From Home Sims 4 CC Pack\" — furniture, was residential; desc: \"Working from home has never been more common than it has been in the past couple of …\"" },
  cmiglj5f60016oxm5vgugqbt0: { contentType: "plants", why: "E400 \"Animal Plant Pots\" — plants, was residential; desc: \"Looking for cute plants to add to your Sim’s home interior? Download this seven pack, …\"" },
  cmil11epn007ioxeew68jn3tv: { contentType: "furniture", why: "E400 \"Gale Dining\" — furniture, was residential; desc: \"My current Sims 4 dining room contains pieces from this Gale Dining set. It has: To …\"" },
  cmijor47q00spoxc8nbz3vgcq: { contentType: null, why: "E400 \"Brillante Panel Doors\" — NULL, was residential; desc: \"Add elegance and sophistication to any Sims 4 build with the Brillante Panel Doors. …\"" },
  cmijorc5300suoxc8pe1ailkv: { contentType: null, why: "E400 \"London Construction Set Part 1\" — NULL, was residential; desc: \"Completing this list is the London Construction Part 1, which introduces a beautiful …\"" },
  cmim8wigu00pgoxy802m3s058: { contentType: "clutter", why: "E400 \"Sims 4 Office Supplies Set\" — clutter, was residential; desc: \"The Sims 4 Office Supplies Set is a base-game compatible pack containing various decor …\"" },
  cmim92tz401tkoxy8dm7dtvpc: { contentType: "clutter", why: "E400 \"Bake It Up Stand Mixer And Cookbook\" — clutter, was residential; desc: \"The Bake It Up Stand Mixer And Cookbook cc is a beautiful Sims 4 kitchen clutter cc …\"" },
  cmijobjsc00qqoxc8kearpk2r: { contentType: null, why: "E400 \"Charlotte Part 2: Modern Windows\" — NULL, was residential; desc: \"Designed by Syboubou, the Charlotte Part 2: Modern Windows set is a French-inspired …\"" },
  cmim91ctz01l3oxy8huisdgl3: { contentType: "gameplay-mod", why: "E400 \"Better Build/Buy\" — gameplay-mod, was residential; desc: \"The Better Build/Buy mod adds filters for easier searching and unlocking debug items …\"" },
  cmijkgkif000coxc88f8tvc0j: { contentType: "furniture", why: "E400 \"Rustic Farmhouse Furniture\" — furniture, was residential; desc: \"The Rustic Farmhouse Furniture set contains a dining table, dining chair, hallway …\"" },
  cmil3oyu700hvoxpzk1twstfi: { contentType: "furniture", why: "E400 \"Cozy Rustic Sauna\" — furniture, was residential; desc: \"The Cozy Rustic Sauna by Severinka is a gorgeous set that brings an authentic sauna …\"" },
  cmijpwxto019zoxc89cgqu6mc: { contentType: "furniture", why: "E400 \"Innaley\" — furniture, was residential; desc: \"The Innaley Entryway Set is designed to make those first steps into your Sim’s home …\"" },
  cmil3qq9400itoxpzzltsyiad: { contentType: "furniture", why: "E400 \"Garden At Home Pack\" — furniture, was residential; desc: \"If you’re looking for the perfect Sims 4 garden cc to enhance your Sim’s gardening …\"" },
  cmijor1qf00snoxc8nzd7rjf0: { contentType: null, why: "E400 \"Swindon Construction Windows and Doors Part 2\" — NULL, was residential; desc: \"For those who prefer versatile colonial-inspired entries for their Sims 4 builds, the …\"" },
  cmikkd8bn008cox334dq2hcdm: { contentType: "hair", why: "E400 \"Static and Shock\" — hair, was residential; desc: \"I know a lot of people prefer maxis match hairstyles as they match the base game’s …\"" },
  cmijj6g4h004moxs3rn6cvvxk: { contentType: "lighting", why: "E400 \"Victorian Lamps\" — lighting, was residential; desc: \"Luxury rooms deserve dramatic lighting, like these Victorian lamps. It’s designed with …\"" },
  cmim9lugr00broxy7vhytyhex: { contentType: "decor", why: "E400 \"Sims 4 Wooden Toys\" — decor, was residential; desc: \"Even your sims will appreciate the simplicity of non-toxic wooden toys. Decorate your …\"" },
  cmijo2f1c00nuoxc8t5o7t8qp: { contentType: null, why: "E400 \"Distressed Wall\" — NULL, was residential; desc: \"If you want to bring rustic charm and a lived-in look to your Sim’s home, the …\"" },
  cmil1dy0900cdoxee6p9x596c: { contentType: "wall-art", why: "E400 \"Canvas Wall Art\" — wall-art, was residential; desc: \"If you’re looking for stylish canvases to style your Sim’s walls, check out the Canvas …\"" },
  cmim9sv8l005lox56iyt8x9i4: { contentType: "lighting", why: "E400 \"Sims 4 CC String Lights\" — lighting, was residential; desc: \"I thought these string lights would be perfect for setting up a gorgeous wedding venue …\"" },
  cmim9qq6o000uox56x4nkga9g: { contentType: null, why: "E400 \"Sims 4 Cottagecore Kids CC Pack\" — NULL, was residential; desc: \"Create-A-Sim custom content created by cmescapade. Enhance your Sims' appearance with …\"" },
  cmim9oib200nsoxy7fdzro4q1: { contentType: "gameplay-mod", why: "E400 \"Ink for Yourself Sims 4 Memory Journal\" — gameplay-mod, was residential; desc: \"If you are like me and LOVED the memory system from sims 2, you absolutely need this …\"" },
  cmim9oi1400nnoxy7y72j5dua: { contentType: "gameplay-mod", why: "E400 \"Market Science Sims 4 Retail Stands\" — gameplay-mod, was commercial; desc: \"These custom market stands for sims 4 give your sims more options when it comes to …\"" },
  cmim9nhsc00k2oxy7wu27qk5a: { contentType: "gameplay-mod", why: "E400 \"No Sitting on the Floor While at Restaurant\" — gameplay-mod, was commercial; desc: \"If you’re tired of your Sims sitting on the floor at expensive gourmet restaurants, …\"" },
  cmim9nho700k0oxy7avo9sbhv: { contentType: "gameplay-mod", why: "E400 \"Retail and Restaurant Price_F\" — gameplay-mod, was commercial; desc: \"This mod will make your retail stores and restaurants more realistic. It increases the …\"" },
  cmim9nhfl00jwoxy7ks1ws2j3: { contentType: "furniture", why: "E400 \"IND Restaurant – The Kitchen Area\" — furniture, was commercial; desc: \"Looking for a mod to add some industrial-chic style to your restaurant? Then you need …\"" },
  cmim9mvwp00gtoxy7fni0jbiy: { contentType: null, why: "E400 \"Bohemian Sims 4 CC Pack\" — NULL, was residential; desc: \"This cc pack reminds me a lot of the Solistice Collection that was higher up on this …\"" },
  cmim9md8500fhoxy7gya9vj4d: { contentType: null, why: "E400 \"Lenovo IdeaPad 3 Gaming Laptop\" — NULL, was residential; desc: \"If you’re looking for a great gaming laptop, but you don’t have a whole lot of money …\"" },
  cmim9m2xq00ecoxy7y0dlr6v5: { contentType: "furniture", why: "E400 \"Sims 4 CC Lounge set\" — furniture, was residential; desc: \"It isn’t often you find furniture that looks perfectly acceptable both indoor and …\"" },
  cmim9m2px00e9oxy75dnhduwx: { contentType: null, why: "E400 \"Home Improvements Fanmade Sims 4 Stuff Pack\" — NULL, was residential; desc: \"Whether you’re cluttering up a garage, filling out your workshop, or just enjoy having …\"" },
  cmim9m2fg00e6oxy7iwbcqart: { contentType: null, why: "E400 \"Sayulita Sims 4 CC Stuff Pack\" — NULL, was residential; desc: \"If you are looking to make a bold statement, this bedroom cc set has just what you …\"" },
  cmim9m21w00e1oxy7c6asnkqv: { contentType: "furniture", why: "E400 \"Modular Cubbies CC Add Ons\" — furniture, was residential; desc: \"I love modular furniture because it is so fun to watch things snap right into place …\"" },
  cmim9m1x700dzoxy7sqvs5rlt: { contentType: "furniture", why: "E400 \"Country Style Dining CC Pack\" — furniture, was residential; desc: \"This custom content pack is exactly what I picture when I imagine a nice formal meal …\"" },
  cmim9lkpe00a0oxy7pfinvtjm: { contentType: null, why: "E400 \"The Good Life\" — NULL, was residential; desc: \"In The Good Life, you’re playing journalist Naomi Hayward who has accepted a job to …\"" },
  cmim9lke3009voxy7bdsfqv5n: { contentType: null, why: "E400 \"Medieval Dynasty\" — NULL, was residential; desc: \"Medieval Dynasty is a medieval life simulator game where you build up your community …\"" },
  cmim9lkby009uoxy7xnfpuwe3: { contentType: null, why: "E400 \"Raft\" — NULL, was residential; desc: \"Raft is an open-world survival game where you work to build a floating home. How this …\"" },
  cmim9lk57009roxy7zq7ta8b9: { contentType: null, why: "E400 \"Spiritfarer\" — NULL, was residential; desc: \"Spiritfarer is a cozy game full of incredible storytelling with insanely good reviews. …\"" },
  cmim9ljyj009ooxy7sasyhpp4: { contentType: null, why: "E400 \"Farmer’s Dynasty\" — NULL, was residential; desc: \"Farmer’s Dynasty is a farming life simulation game where you’ll take care of all …\"" },
  cmim9k76y003woxy7pk5f9eif: { contentType: "gameplay-mod", why: "E400 \"Sibling Rivalry Custom Scenario\" — gameplay-mod, was residential; desc: \"I love the setup of this custom scenario. It’s super creative and totally unique. …\"" },
  cmim9ject000xoxy7qynudwgm: { contentType: null, why: "E400 \"Protestors Sims 4 Deco Sims\" — NULL, was residential; desc: \"This gives me flashbacks to when I was in college. Every couple of days a different …\"" },
  cmim9es5y001moxqw7ausn0o1: { contentType: null, why: "E400 \"Sims 4 Save File 1.0\" — NULL, was residential; desc: \"If you’re looking for a save file where no detail has been overlooked then THIS is the …\"" },
  cmim93ydk01xpoxy8pwahc6vl: { contentType: null, why: "E400 \"Monopoly Gamer Edition\" — NULL, was residential; desc: \"This Monopoly Gamer Edition inspired by Nintendo is the perfect gift for a collector. …\"" },
  cmim93uff01xgoxy8mk425i4v: { contentType: null, why: "E400 \"Cowplant Zipper Pouch\" — NULL, was residential; desc: \"This Sims-inspired zipper pouch would be perfect for school, work, or home. The purple …\"" },
  cmim93tvq01x6oxy88t3phvj4: { contentType: null, why: "E400 \"Sims Stickers\" — NULL, was residential; desc: \"Everyone loves stickers, especially about their favorite video game. Redbubble has …\"" },
  cmim91mbe01mmoxy8uv2h901o: { contentType: "gameplay-mod", why: "E400 \"High School Years Club Activities\" — gameplay-mod, was community; desc: \"The High School Years Club Activities school mod adds a set of six new activities for …\"" },
  cmim90ip501feoxy8nsnj8vx1: { contentType: null, why: "E400 \"Bright Year\" — NULL, was residential; desc: \"The Bright Year collection is an elf-inspired cc for your female Sim. It contains: All …\"" },
  cmim8z6f3016goxy8gi9xynjt: { contentType: "gameplay-mod", why: "E400 \"Saturday Jobs Pack\" — gameplay-mod, was residential; desc: \"The Saturday Jobs Pack (Adults & Teens) consists of ten careers your young adults can …\"" },
  cmim8xl5m00wsoxy8q0o55gm1: { contentType: "furniture", why: "E400 \"Altara Kids\" — furniture, was residential; desc: \"Altara Kids makes it easy for your child’s Sim bedroom to be a natural playground. …\"" },
  cmim8xhar00wkoxy8mc8r6vlb: { contentType: "gameplay-mod", why: "E400 \"Cyber Teacher\" — gameplay-mod, was residential; desc: \"If you’re a stay-at-home parent who wants to work from the comfort of their home, get …\"" },
  cmim8wt7800rxoxy8oggohhs0: { contentType: "furniture", why: "E400 \"Realce\" — furniture, was residential; desc: \"Realce is a modern and classy bathroom set with retro patterns and flowers to beautify …\"" },
  cmim8wixk00ppoxy8034yoeqy: { contentType: "clutter", why: "E400 \"Vintage Crockery\" — clutter, was residential; desc: \"Vintage Crockery is a Sims 4 clutter cc designed by the Leaf motif. The set contains …\"" },
  cmim8wi3400p9oxy8yo3fxjep: { contentType: "decor", why: "E400 \"Random Fall Items\" — decor, was residential; desc: \"The Random Fall Items pack contains some random fall decorative objects to make your …\"" },
  cmim8w9x700o3oxy80h08q6pk: { contentType: null, why: "E400 \"Liam Grifith\" — NULL, was residential; desc: \"Another toddler Sim to add to your Sims 4 household is Liam Grifith. He’s an outgoing …\"" },
  cmim8vuyx00l0oxy8qdgbtcpe: { contentType: "gameplay-mod", why: "E400 \"Toddlers and Infants at Parks\" — gameplay-mod, was residential; desc: \"If you generally love seeing babies or the idea of having children around, get the …\"" },
  cmim8ukqd00d8oxy8hgb1tehg: { contentType: "decor", why: "E400 \"Fall 2023 Set 1\" — decor, was residential; desc: \"The Fall 2023 Set 1 is a collection of modern and elegant pumpkins designed to make …\"" },
  cmim8u7zo00bhoxy8wme7bsih: { contentType: "decor", why: "E400 \"Autumn Garden\" — decor, was residential; desc: \"September and October are the best months to spend in your garden or patio admiring …\"" },
  cmim8rdq90008oxy8bqskgbi2: { contentType: "furniture", why: "E400 \"Garden Stories\" — furniture, was residential; desc: \"The Garden Stories is a beautiful Sims 4 outdoor furniture cc that’s inspired by …\"" },
  cmil1gits00dmoxeetgfdcoic: { contentType: "furniture", why: "E400 \"Life’s A Beach Aqua Set\" — furniture, was residential; desc: \"All the images I pinned on Pinterest were coral-themed, boho, and nautical. However, …\"" },
  cmil1f8rm00cyoxeeka90fzwx: { contentType: "decor", why: "E400 \"Beach Mood\" — decor, was residential; desc: \"The Beach Mood new set contains eight cute small decorative pieces, including a jar …\"" },
  cmil1dthh00caoxeexbfbojqe: { contentType: "wall-art", why: "E400 \"Arzoza Wall Paintings\" — wall-art, was residential; desc: \"The Arzoza Wall Paintings set brings a serene and timeless charm to your Sim’s home …\"" },
  cmil1ds6e00c9oxeevzzyrmam: { contentType: "wall-art", why: "E400 \"Countryside Scenes 2\" — wall-art, was residential; desc: \"I’ve always wanted to live in the countryside, but the city-life has me in a …\"" },
  cmil165gq009noxeepsfxy1hi: { contentType: "decor", why: "E400 \"Bay House Part 2: Decor\" — decor, was residential; desc: \"One of the best outdoor decor sets I’ve encountered is this Bay House Part 2: Decor. …\"" },
  cmil13zv8008woxee3uu6zxko: { contentType: "furniture", why: "E400 \"Baldridge Home Office\" — furniture, was residential; desc: \"Completing this Sims 4 office cc list is the Baldridge Home Office. It’s a …\"" },
  cmil13wm0008uoxeez02hxgza: { contentType: "furniture", why: "E400 \"Axcess Home Office\" — furniture, was residential; desc: \"Recently, I’ve done an office makeover for my Sim, and I used items from the Axcess …\"" },
  cmil12wft0089oxeek6r0cdp7: { contentType: "furniture", why: "E400 \"Home Office\" — furniture, was residential; desc: \"I love creating safe and productive home office spaces for my workaholic Sims, and …\"" },
  cmil0uybj004loxeeojk96bbt: { contentType: null, why: "E400 \"D720 Industrial Wall\" — NULL, was residential; desc: \"Transform your Sim’s space into a simple and stylish room with the D720 Industrial …\"" },
  cmil0umt1004foxeelmt4fqvt: { contentType: null, why: "E400 \"Rivages Mural\" — NULL, was residential; desc: \"If you’re looking for serene, nature-inspired wall art for your Sim’s home, the …\"" },
  cmil0ulay004eoxeeiw88l8pz: { contentType: null, why: "E400 \"Wallpaper Packs 1 And 2\" — NULL, was residential; desc: \"The Wallpaper Packs 1 And 2 give you 10 stylish wallpapers divided into wallpapers one …\"" },
  cmil0ujhm004doxeevg2lq8ua: { contentType: null, why: "E400 \"Chasm Wall Mural\" — NULL, was residential; desc: \"The Chasm Wall Mural is a striking black-and-white graffiti set designed to add an …\"" },
  cmil0u3810043oxee840tlnjh: { contentType: null, why: "E400 \"Fabric Wallpapers With Gold\" — NULL, was residential; desc: \"If you’re looking for sleek sophistication with a touch of glam, the Fabric Wallpapers …\"" },
  cmil0sp8o003eoxee7lcv8tih: { contentType: "plants", why: "E400 \"Basic Botanicals Collection\" — plants, was residential; desc: \"The Basic Botanicals Collection features minimalist, nature-inspired rugs with organic …\"" },
  cmil0snvg003doxee4n3lbz9o: { contentType: null, why: "E400 \"Many Different Carpets\" — NULL, was residential; desc: \"The Many Different Carpets set has every carpet style, aesthetic, and design you may …\"" },
  cmil0pkzt001voxeemfgu2qsh: { contentType: "plants", why: "E400 \"Nature In Living Green Wall 1\" — plants, was residential; desc: \"The Nature In Living Green Wall 1 by 1 set is a beautiful wall plant designed for …\"" },
  cmil0p238001koxeel8yqm1og: { contentType: "plants", why: "E400 \"Tropical View\" — plants, was residential; desc: \"Bring lush, vibrant greenery into your Sim’s homes with the Tropical View set. This …\"" },
  cmikkgan3009rox33sj2txav4: { contentType: "furniture", why: "E400 \"Toddler Set “Sue”\" — furniture, was residential; desc: \"I added this set because I love the creative design of the bed, which resembles a …\"" },
  cmikil4pd002voxnaeo3jezqb: { contentType: "gameplay-mod", why: "E400 \"Expanded Realm of Magic\" — gameplay-mod, was residential; desc: \"The Expanded Realm of Magic mod combines a bunch of mods that were previously …\"" },
  cmik9y4o100d7oxk7tokg7hpu: { contentType: null, why: "E400 \"Late Night Collection\" — NULL, was residential; desc: \"If you’re looking for late-night outfits for your male and female Sims, get this …\"" },
  cmik9sjdl00a1oxk733c8l2kc: { contentType: "gameplay-mod", why: "E400 \"Multiple Animations Pack\" — gameplay-mod, was residential; desc: \"I love it when creators design extensive Sims 4 animations with everything you need to …\"" },
  cmik9pscd008roxk7j1bujd6p: { contentType: "furniture", why: "E400 \"MM Mediterranian Dine\" — furniture, was residential; desc: \"The MM Mediterranean Dine is a charming three-story restaurant inspired by classic …\"" },
  cmijqe77401h8oxc88ubu72gb: { contentType: null, why: "E400 \"Flamingo Pink Wall Set\" — NULL, was residential; desc: \"I’ll end this list with the Flamingo Pink Wall Set. It’s a simple wallpaper designed …\"" },
  cmijqd5ak01gpoxc89h1veert: { contentType: "decor", why: "E400 \"Pink Mirror III\" — decor, was residential; desc: \"Pink Mirror III is one of my favorite mirror CCs, and I use it a lot in my bedroom and …\"" },
  cmijpx81s01a6oxc8n067nwlr: { contentType: "furniture", why: "E400 \"Rowlett Hallway Extra\" — furniture, was residential; desc: \"Want to add those little finishing touches after building your house? The Rowlett …\"" },
  cmijpx5ya01a5oxc8p1gjj6k3: { contentType: "furniture", why: "E400 \"Urbana Hallway\" — furniture, was residential; desc: \"Elegance comes in the form of clean lines and warm tones, and that’s exactly what the …\"" },
  cmijpwaaa019loxc8i0q31xyi: { contentType: "furniture", why: "E400 \"Luxury Hamptons Entryway Set\" — furniture, was residential; desc: \"Bring coastal elegance straight into your Sim’s home with the Luxury Hamptons Entryway …\"" },
  cmijor7ci00sroxc8zo6vxbwv: { contentType: null, why: "E400 \"Gateway Doors\" — NULL, was residential; desc: \"If you’re like me and love giving your Sim’s house a striking entryway, the Gateway …\"" },
  cmijor5de00sqoxc87bgk9gd4: { contentType: null, why: "E400 \"Darma Part 1: Doors\" — NULL, was residential; desc: \"Mincsims created the Darma Part 1 set, which introduces elegant arched doors and …\"" },
  cmijor2zu00sooxc8a4mof9sa: { contentType: null, why: "E400 \"Garance Doors and Windows Set\" — NULL, was residential; desc: \"Philo delivers again with these Garance Windows and Doors Set. They’re my go-to Sims 4 …\"" },
  cmijoqt1q00shoxc86zr0wb0c: { contentType: null, why: "E400 \"Thyme Doors and Windows Part 2\" — NULL, was residential; desc: \"This set draws inspiration from traditional Korean window patterns, bringing cultural …\"" },
  cmijoqqfv00sfoxc8z6u6f7mn: { contentType: null, why: "E400 \"Oh My Goth: Ostium Doors\" — NULL, was residential; desc: \"Looking for a dramatic entrance to fit gothic, cathedral, or fantasy builds? The …\"" },
  cmijoqgey00s8oxc80svi7lhp: { contentType: null, why: "E400 \"Bamboo Part 3: Windows and Doors\" — NULL, was residential; desc: \"For those who want tropical-inspired build items, the Bamboo Part 3 set is an …\"" },
  cmijoqf6m00s7oxc8mx8pxk25: { contentType: null, why: "E400 \"Simxties Chago Garage Doors\" — NULL, was residential; desc: \"The Chago Garage Doors set is part of the Simxties collaboration. It features eight …\"" },
  cmijoqe0z00s6oxc8j3xz2hpy: { contentType: null, why: "E400 \"Beo Industrial Doors Set\" — NULL, was residential; desc: \"If you’re like me and love the raw, modern look of lofts and warehouses, the Beo …\"" },
  cmijoq76e00s1oxc8ncpdjzjo: { contentType: null, why: "E400 \"Sable Doors Part 2: Short Wall\" — NULL, was residential; desc: \"Bring a modern geometric touch to short wall builds with the Sable Doors Part 2. The …\"" },
  cmijoce0g00r8oxc8blwkixtp: { contentType: null, why: "E400 \"Acies Windows CC\" — NULL, was residential; desc: \"Completing this list is the Acies Windows CC, a collection of oversized and …\"" },
  cmijoc7mv00r4oxc8vmcfc5ic: { contentType: null, why: "E400 \"Doriane Windows CC\" — NULL, was residential; desc: \"If you’re looking for a versatile set of windows and doors, the Doriane Windows CC is …\"" },
  cmijobz0700qzoxc86yvyfheo: { contentType: null, why: "E400 \"Charlotte French Windows\" — NULL, was residential; desc: \"For a distinctly European feel, grab the Charlotte French Windows pack. It contains 27 …\"" },
  cmijobsej00qwoxc8n3gjaank: { contentType: null, why: "E400 \"Ironic Windows\" — NULL, was residential; desc: \"Designed with a strong architectural look, the Ironic Windows set by Mincsims is a …\"" },
  cmijob94h00qooxc8sx9nd060: { contentType: null, why: "E400 \"Korea Apartment Windows Set: Part 2\" — NULL, was residential; desc: \"Expanding on the first collection, the Korea Apartment Windows Set Part 2 adds ten new …\"" },
  cmijo9v8b00q2oxc84x6ttwwh: { contentType: "wall-art", why: "E400 \"Cozy Autumn Canvases\" — wall-art, was residential; desc: \"Decorate your Sim’s space with these cozy autumn canvases. The paintings feature …\"" },
  cmijo2hww00nwoxc8adtfyac9: { contentType: null, why: "E400 \"Beadboard Wainscoting Wall\" — NULL, was residential; desc: \"The Beadboard Wainscoting Wall custom content adds a timeless, classic touch with a …\"" },
  cmijo2gew00nvoxc8a5d3h8ib: { contentType: null, why: "E400 \"Terrazzo Wall and Floor Tiles Jungle Sparks\" — NULL, was residential; desc: \"The Terrazzo Wall and Floor Tiles Jungle Sparks set is a must-have for your build when …\"" },
  cmijo2cmg00ntoxc8ytz4v2as: { contentType: null, why: "E400 \"Retro Tile Wall\" — NULL, was residential; desc: \"Anyone who enjoys playful, nostalgic interiors will find a lot to love in the Retro …\"" },
  cmijo1zqx00nnoxc8nmmj548h: { contentType: null, why: "E400 \"Atreya Stucco Wall\" — NULL, was residential; desc: \"Give your Sim’s interior a sleek, modern upgrade with the Atreya Stucco Wall. This …\"" },
  cmijo1pq700nioxc80uhq63ic: { contentType: null, why: "E400 \"Hearts Wall Set\" — NULL, was residential; desc: \"For those seeking a sweet and charming wall design, this heart-patterned set is the …\"" },
  cmijo1ewk00ngoxc8izvq48pu: { contentType: null, why: "E400 \"Eterna White Quartz Wall\" — NULL, was residential; desc: \"If you’re like me and love a fresh, natural wall design, this quartz texture is a …\"" },
  cmijo1bfg00neoxc8gkj28ct6: { contentType: null, why: "E400 \"Stone House Walls\" — NULL, was residential; desc: \"Designed by MDE, the Stone House Walls instantly add character and strength to any …\"" },
  cmijo1a3a00ndoxc8na5lodj4: { contentType: null, why: "E400 \"Minimalist Color Wall\" — NULL, was residential; desc: \"If you’re looking for clean, modern walls that provide a simple yet stylish backdrop …\"" },
  cmijo0w4100n8oxc8emc64cgk: { contentType: null, why: "E400 \"Sections Panels\" — NULL, was residential; desc: \"Starting us off is a bold geometric panel wall designed with triangular sections to …\"" },
  cmijnv2i500jxoxc844qrj980: { contentType: "furniture", why: "E400 \"Greece Hallway Extra\" — furniture, was residential; desc: \"Created by Onyxium, the Greece Hallway Extra Set is a must-have in your Sims 4 cc …\"" },
  cmijnu18s00jgoxc8cm80hcbh: { contentType: "gameplay-mod", why: "E400 \"More Roommates and Roommate Behavior Tweaks\" — gameplay-mod, was residential; desc: \"The More Roommates and Roommate Behavior Tweaks mod is a must-have for those who love …\"" },
  cmijnswil00ixoxc8ucw0dbji: { contentType: "furniture", why: "E400 \"A La Ferme Cottage Coop\" — furniture, was residential; desc: \"Want to create an autumn pumpkin cottage coop? Start with this cc collection. It …\"" },
  cmijnr4sm00i3oxc8ixskbiar: { contentType: "furniture", why: "E400 \"Pumpkin Spice Set\" — furniture, was residential; desc: \"Nothing says fall quite like pumpkins and rustic wood, and this Pumpkin Spice set …\"" },
  cmijnibdo00dyoxc8y13aebla: { contentType: null, why: "E400 \"Pavement Terrain Set 06\" — NULL, was residential; desc: \"Adding a touch of sophistication to outdoor spaces, the Pavement Terrain Set 6 …\"" },
  cmijkmxdn002woxc8ot1a66xa: { contentType: null, why: "E400 \"Brick Wall 11\" — NULL, was residential; desc: \"Completing this list is the Brick Wall 11 set, a collection built around moody tones. …\"" },
  cmijkmpps002soxc80mny7uvq: { contentType: null, why: "E400 \"Chevron Brick Wall\" — NULL, was residential; desc: \"Bring an instant touch of shabby-chic elegance to your builds with this chevron …\"" },
  cmijkmmd1002qoxc86urb7up9: { contentType: null, why: "E400 \"Ricovero Wall\" — NULL, was residential; desc: \"Ricovero Wall brings in an effortless wave of classic masonry charm to your interiors. …\"" },
  cmijkma40002loxc8ub98a89v: { contentType: null, why: "E400 \"Blue Graffiti Wall Brick\" — NULL, was residential; desc: \"This Blue Graffiti Wall Brick features hand-drawn blue doodles that instantly add …\"" },
  cmijkm8w1002koxc87mp8ihyv: { contentType: null, why: "E400 \"Herringbone Brick Wall\" — NULL, was residential; desc: \"Bring a refined, designer touch to your Sim’s interiors with the Herringbone Brick …\"" },
  cmijkm4b1002hoxc8zjz7aftl: { contentType: null, why: "E400 \"Brick Wall 10\" — NULL, was residential; desc: \"The Brick Wall 10 set has a gentle, sun-washed quality, perfect for bright, relaxed …\"" },
  cmijkm130002foxc80xxt4037: { contentType: null, why: "E400 \"Soft Brick Wall\" — NULL, was residential; desc: \"For those who want a softer brick wall option for their interiors, this one’s a great …\"" },
  cmijklyjy002doxc8r63ne2uy: { contentType: null, why: "E400 \"Exposed Brick Wall\" — NULL, was residential; desc: \"Nothing beats a classic exposed brick surface, and this one by Rirann is my go-to …\"" },
  cmijklvvj002boxc89ea67r0a: { contentType: null, why: "E400 \"Brick Foundation\" — NULL, was residential; desc: \"This foundation set offers you two brick textures with four color variations each. The …\"" },
  cmijkloao0026oxc82t030iqt: { contentType: null, why: "E400 \"Mixed Brick Walls Set\" — NULL, was residential; desc: \"This Mixed Brick Walls Set leans into a stylish, slightly weathered texture perfect …\"" },
  cmijkgp6z000foxc8f7dyydl0: { contentType: null, why: "E400 \"Farmhouse Entry White Wood Floor\" — NULL, was residential; desc: \"The Farmhouse Entry White Wood Floorset is bright, clean, and modern. The planks have …\"" },
  cmijkgf7u0008oxc8ied9yv3n: { contentType: "furniture", why: "E400 \"Nordic Farmhouse Dining\" — furniture, was residential; desc: \"If you want a beautiful, minimalist farmhouse dining set with clean lines and natural …\"" },
  cmijkgdp40007oxc8x634wis3: { contentType: "furniture", why: "E400 \"Farmhouse Dining Room\" — furniture, was residential; desc: \"Nothing spells out a cozy farmhouse dining space like a mix of soft wood tones, simple …\"" },
  cmijkgb5s0005oxc8lrt452g8: { contentType: "furniture", why: "E400 \"Fleur Hallway Part 1\" — furniture, was residential; desc: \"If all you want is a farmhouse hallway set with warm autumn tones and rustic textures, …\"" },
  cmijjr6c200e5oxs3ufas569y: { contentType: "furniture", why: "E400 \"Blockhouse Sims 4 Dining CC Pack\" — furniture, was residential; desc: \"Blockhouse is an entire cc series by kiwisim4. This is specifically the dining cc set …\"" },
  cmijjgsoy009doxs3l668vh80: { contentType: "rugs", why: "E400 \"Witchy Rugs\" — rugs, was residential; desc: \"Add instant mystic charm to any witch’s home with these Witchy Rugs. Featuring 12 …\"" },
  cmijjd6mo007voxs34elvqxo4: { contentType: "decor", why: "E400 \"Sims 4 CC Gravestones\" — decor, was residential; desc: \"Has your vampires’ front yard seemed a little barren and yet, full of life? Not to …\"" },
  cmijj89s0005hoxs38tg52mqt: { contentType: "decor", why: "E400 \"Gothic Revival Interior\" — decor, was residential; desc: \"The Gothic Revival Interior Fireplace is a carved stone mantle adorned with medieval …\"" },
  cmijj7l8h005aoxs327fmks4v: { contentType: "lighting", why: "E400 \"Tysons Lightings\" — lighting, was residential; desc: \"The Tysons Lighting collection by Onyxium contains various Sims 4 lamps cc for every …\"" },
  cmijj7asg0053oxs3a9ftiecc: { contentType: "lighting", why: "E400 \"Emblema Lamps\" — lighting, was residential; desc: \"Light fixtures don’t always need to be loud to make an impact, as sometimes sleek, …\"" },
  cmijivxv00008oxs3bhf1qo70: { contentType: "food", why: "E400 \"Ye Medieval – Peasant Homelife 3\" — food, was residential; desc: \"For those into historical gameplay, this food clutter set is a must-have. It contains …\"" },
  cmijiute20002oxs3i0a9k6fw: { contentType: "food", why: "E400 \"Pink Lemonade\" — food, was residential; desc: \"Add this Pink Lemonade by alwaysjustjay to your 2025 custom drink collection. It’s a …\"" },
  cmsmbv7sv00fioxeuoh7npq79: { contentType: null, why: "E400 \"A La Ferme Cottage Fences\" — NULL, was lot; desc: \"A La Ferme Cottage Fences is a collection of 14 rustic fences and matching gates …\"" },
};

/**
 * The audited entry for a mod id, or undefined if a human never looked at it.
 */
export function handAuditedContentType(id: string): HandAuditedContentType | undefined {
  return HAND_AUDITED_CONTENT_TYPES[id];
}

// ── isNSFW pins (Rowan, E242, 2026-10-19) ─────────────────────────────────
// Hand-audited `isNSFW` values, keyed by mod id. Same contract as the
// content-type pins above: a human decided from the TITLE and the known
// franchise (never the blog-post description, which is shared by every mod
// scraped from one post), and no automated pass may overwrite the answer.
// Every scraper `prisma.mod.update` that writes isNSFW routes it through
// `pinnedIsNSFW` (__tests__/unit/hand-audited-nsfw.test.ts scans for that).
//
// Source: the 8 adult-themed titles Sage found in the gameplay-mod/script-mod
// top 25 by downloads (playbooks/sage.md 2026-10-18), all isNSFW=false and all
// in the sitemap on 10-19. 6 flip to true; 2 are pinned SFW on purpose, so a
// later "flag everything that sounds like WooHoo" pass has to argue with a why.

export interface HandAuditedNsfw {
  isNSFW: boolean;
  why: string;
}

export const HAND_AUDITED_NSFW: Record<string, HandAuditedNsfw> = {
  cmijppd0j0162oxc81yf6k5dz: { isNSFW: true, why: 'E242 "MC WooHoo" — the MC Command Center WooHoo module (Deaderpool), sexual-content gameplay; top-25 #4, 3,055 downloads' },
  cmim8rrvz002boxy8vcqt0yrg: { isNSFW: true, why: 'E242 "Wicked Whims" — TURBODRIVER\'s explicit adult animation mod; top-25 #6' },
  cmijppj1r0166oxc850u0lir1: { isNSFW: true, why: 'E242 "Prostitution Mod" — sex work as gameplay; the title is the content' },
  cmim9dnuf000yoxqwqbhi32f4: { isNSFW: true, why: 'E242 "The Ho* It Up Mod" — sex-work gameplay mod (adult)' },
  cmim9jz39002uoxy7z2tbyidh: { isNSFW: true, why: 'E242 "Sims 4 Breast Slider Mod" — sexualised body slider; conservative call for an ad page' },
  cmikk9oj9006tox331c1a2g0g: { isNSFW: true, why: 'E242 "Basemental Drugs & Gangs Mods" — Basemental drugs/gangs mod; illegal-drug content, not sexual, flagged for ad-policy reasons' },
  cmim91d7u01l8oxy8mrvijtik: { isNSFW: false, why: 'E242 "Wonderful Whims" — KEEP SFW: TURBODRIVER publishes it as the non-explicit counterpart of Wicked Whims (attraction, relationships, cycle); the shared franchise is not the content' },
  cmim8rs4i002eoxy8enc7gbsp: { isNSFW: false, why: 'E242 "Cuddle and Bath Together" — KEEP SFW: shared cuddling/bathing at base-game level (base game censors); nothing in the title is adult' },
};

/**
 * The hand-audited isNSFW value for a mod id, or undefined if a human never
 * looked at it. Scrapers write `pinnedIsNSFW(id) ?? detected`.
 */
export function pinnedIsNSFW(id: string): boolean | undefined {
  return HAND_AUDITED_NSFW[id]?.isNSFW;
}
