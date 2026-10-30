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
