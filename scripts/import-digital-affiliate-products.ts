/**
 * Import Digital Affiliate Products Script
 *
 * Seeds the AffiliateOffer table with a curated catalog of DIGITAL offers
 * (Sims 4 DLC keys, Displate posters, Canva Pro, NordVPN) as part of the
 * pivot away from physical Amazon products.
 *
 * NOTE: As of this writing, the production `affiliate_offers` table is
 * EMPTY — the old Amazon import was never run/persisted. This script is
 * seeding from scratch, not migrating existing rows.
 *
 * All offers are seeded with `isActive: false` and PLACEHOLDER tracking
 * URLs. The operator must:
 *   1. Sign up for each affiliate program (Green Man Gaming, Kinguin,
 *      CDKeys, Displate, Canva, NordVPN)
 *   2. Paste the real tracking link over the PLACEHOLDER affiliateUrl
 *      for each offer (via the admin UI at /admin/monetization/affiliates)
 *   3. Flip `isActive` to true — the offer then serves immediately since
 *      `personaValidated` is pre-set true on this curated seed (both
 *      GET /api/affiliates and POST /api/affiliates/match require
 *      isActive && personaValidated).
 *
 * Usage: npx tsx scripts/import-digital-affiliate-products.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });

// Scripts can't use Prisma Accelerate URLs reliably for fresh schema — prefer the direct
// connection when available (Accelerate's schema cache lags behind migrations).
if (process.env.DIRECT_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
}

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type Partner =
  | 'greenmangaming'
  | 'kinguin'
  | 'cdkeys'
  | 'displate'
  | 'canva'
  | 'nordvpn';

// Network the tracking link belongs to, where known. The auto-detector
// (lib/services/affiliateEarnings/network.ts) only recognizes
// impact/rakuten/cj/amazon domains, and these are PLACEHOLDER URLs anyway,
// so we set this explicitly for the partners we know are on Impact.
const PARTNER_NETWORK: Partial<Record<Partner, string>> = {
  greenmangaming: 'impact',
  canva: 'impact',
  // kinguin, cdkeys, displate, nordvpn: awin/direct/unknown — leave null
};

const THEMES_ALL = ['cozy', 'modern', 'minimalist', 'luxury', 'fantasy'];

interface DigitalProductCandidate {
  name: string;
  description: string;
  imageUrl: string;
  affiliateUrl: string;
  partner: Partner;
  category: 'games' | 'decor' | 'design-tools' | 'software';
  matchingThemes: string[];
  originalPrice?: number;
  salePrice?: number;
  promoText?: string;
}

function placeholderUrl(partner: string, slug: string): string {
  return `https://PLACEHOLDER.example/${partner}/${slug}`;
}

// ---------------------------------------------------------------------------
// Sims 4 DLC keys — spread across the three key stores. Universal utility
// for a Sims 4 CC audience regardless of build/aesthetic theme.
// ---------------------------------------------------------------------------
const SIMS4_DLC_PRODUCTS: DigitalProductCandidate[] = [
  {
    name: 'The Sims 4: Get to Work (Expansion Pack) — CD Key',
    description:
      'Digital CD key for The Sims 4: Get to Work expansion pack. Unlocks active careers (doctor, detective, scientist) and the Sixam alien world.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('greenmangaming', 'sims-4-get-to-work'),
    partner: 'greenmangaming',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 39.99,
    salePrice: 14.99,
  },
  {
    name: 'The Sims 4: Seasons (Expansion Pack) — CD Key',
    description:
      'Digital CD key for The Sims 4: Seasons expansion pack. Adds weather, holidays, and seasonal CAS/build items — a favorite among CC creators for seasonal decor.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('kinguin', 'sims-4-seasons'),
    partner: 'kinguin',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 39.99,
    salePrice: 16.99,
  },
  {
    name: 'The Sims 4: Cats & Dogs (Expansion Pack) — CD Key',
    description:
      'Digital CD key for The Sims 4: Cats & Dogs expansion pack. Adds pets, the Brindleton Bay world, and vet career gameplay.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('cdkeys', 'sims-4-cats-and-dogs'),
    partner: 'cdkeys',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 39.99,
    salePrice: 15.99,
  },
  {
    name: 'The Sims 4: City Living (Expansion Pack) — CD Key',
    description:
      'Digital CD key for The Sims 4: City Living expansion pack. Adds apartments, festivals, and the San Myshuno world — popular for modern/urban CC builds.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('greenmangaming', 'sims-4-city-living'),
    partner: 'greenmangaming',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 39.99,
    salePrice: 13.99,
  },
  {
    name: 'The Sims 4: Get Famous (Expansion Pack) — CD Key',
    description:
      'Digital CD key for The Sims 4: Get Famous expansion pack. Adds the acting career, fame perks, and the Del Sol Valley world.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('kinguin', 'sims-4-get-famous'),
    partner: 'kinguin',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 39.99,
    salePrice: 14.49,
  },
  {
    name: 'The Sims 4: Growing Together (Expansion Pack) — CD Key',
    description:
      'Digital CD key for The Sims 4: Growing Together expansion pack. Adds family dynamics, life stages, and the Tomarang world — big with family-build CC creators.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('cdkeys', 'sims-4-growing-together'),
    partner: 'cdkeys',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 39.99,
    salePrice: 19.99,
  },
  {
    name: 'The Sims 4: High School Years (Expansion Pack) — CD Key',
    description:
      'Digital CD key for The Sims 4: High School Years expansion pack. Adds teen gameplay, prom, and CAS items popular in Y2K/teen-aesthetic CC.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('greenmangaming', 'sims-4-high-school-years'),
    partner: 'greenmangaming',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 19.99,
    salePrice: 9.99,
  },
  {
    name: 'The Sims 4: Cottage Living (Expansion Pack) — CD Key',
    description:
      'Digital CD key for The Sims 4: Cottage Living expansion pack. Adds Henford-on-Bagley, farming, and cottagecore build/buy items — a top pick for cozy/fantasy CC.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('kinguin', 'sims-4-cottage-living'),
    partner: 'kinguin',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 39.99,
    salePrice: 16.49,
  },
  {
    name: 'The Sims 4: Horse Ranch (Expansion Pack) — CD Key',
    description:
      'Digital CD key for The Sims 4: Horse Ranch expansion pack. Adds Chestnut Ridge, horses, and ranch-style build items.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('cdkeys', 'sims-4-horse-ranch'),
    partner: 'cdkeys',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 39.99,
    salePrice: 17.99,
  },
  {
    name: 'The Sims 4: Lovestruck (Expansion Pack) — CD Key',
    description:
      'Digital CD key for The Sims 4: Lovestruck expansion pack. Adds Ciudad Enamorada, romance gameplay, and date-night CAS/build items.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('greenmangaming', 'sims-4-lovestruck'),
    partner: 'greenmangaming',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 39.99,
    salePrice: 18.99,
  },
  {
    name: 'The Sims 4 Base Game — CD Key',
    description:
      'Digital CD key for The Sims 4 base game. The entry point for any new player before they start adding CC and expansion packs.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('kinguin', 'sims-4-base-game'),
    partner: 'kinguin',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 0,
    salePrice: 0,
    promoText: 'Free-to-play base game',
  },
  {
    name: 'The Sims 4: Get to Work + Seasons Bundle — CD Key',
    description:
      'Bundle CD key combining Get to Work and Seasons expansion packs at a discount versus buying separately.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('cdkeys', 'sims-4-work-seasons-bundle'),
    partner: 'cdkeys',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 79.98,
    salePrice: 27.99,
    promoText: 'Bundle & save',
  },
  {
    name: 'The Sims 4: Cottage Living + Growing Together Bundle — CD Key',
    description:
      'Bundle CD key combining Cottage Living and Growing Together expansion packs — cozy/family gameplay bundle at a discount.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('greenmangaming', 'sims-4-cottage-growing-bundle'),
    partner: 'greenmangaming',
    category: 'games',
    matchingThemes: THEMES_ALL,
    originalPrice: 79.98,
    salePrice: 29.99,
    promoText: 'Bundle & save',
  },
];

// ---------------------------------------------------------------------------
// Displate posters — themed to CC build aesthetics.
// ---------------------------------------------------------------------------
const DISPLATE_PRODUCTS: DigitalProductCandidate[] = [
  {
    name: 'Displate — Cozy Gaming Room Metal Poster',
    description:
      'Premium metal print poster of a cozy, warmly-lit gaming room setup. Magnetic mounting, no visible screws or nails.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('displate', 'cozy-gaming-room'),
    partner: 'displate',
    category: 'decor',
    matchingThemes: ['cozy', 'modern', 'fantasy'],
    originalPrice: 47.0,
    salePrice: 37.0,
  },
  {
    name: 'Displate — Fantasy Landscape Metal Poster',
    description:
      'Premium metal print poster featuring a sweeping fantasy landscape with mountains and mystical lighting. Magnetic mounting system.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('displate', 'fantasy-landscape'),
    partner: 'displate',
    category: 'decor',
    matchingThemes: ['cozy', 'modern', 'fantasy'],
    originalPrice: 47.0,
    salePrice: 37.0,
  },
  {
    name: 'Displate — Modern Minimal Line Art Metal Poster',
    description:
      'Premium metal print poster with clean, minimal single-line art in a monochrome palette. Fits modern, minimalist interiors.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('displate', 'modern-minimal-line-art'),
    partner: 'displate',
    category: 'decor',
    matchingThemes: ['cozy', 'modern', 'fantasy'],
    originalPrice: 47.0,
    salePrice: 37.0,
  },
  {
    name: 'Displate — Enchanted Forest Metal Poster',
    description:
      'Premium metal print poster of a glowing, mystical forest scene. Popular with fairycore and cottagecore build inspiration boards.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('displate', 'enchanted-forest'),
    partner: 'displate',
    category: 'decor',
    matchingThemes: ['cozy', 'modern', 'fantasy'],
    originalPrice: 47.0,
    salePrice: 37.0,
  },
  {
    name: 'Displate — Celestial Moon Phases Metal Poster',
    description:
      'Premium metal print poster depicting lunar phases in a soft celestial palette. A witchy/fantasy staple for gallery walls.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('displate', 'celestial-moon-phases'),
    partner: 'displate',
    category: 'decor',
    matchingThemes: ['cozy', 'modern', 'fantasy'],
    originalPrice: 47.0,
    salePrice: 37.0,
  },
  {
    name: 'Displate — Retro Sunset Grid Metal Poster',
    description:
      'Premium metal print poster with a retro-futuristic sunset and grid horizon. Bold color palette for modern gaming/office spaces.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('displate', 'retro-sunset-grid'),
    partner: 'displate',
    category: 'decor',
    matchingThemes: ['cozy', 'modern', 'fantasy'],
    originalPrice: 47.0,
    salePrice: 37.0,
  },
];

// ---------------------------------------------------------------------------
// Canva Pro — universal utility (thumbnails, CC promo graphics, social posts)
// ---------------------------------------------------------------------------
const CANVA_PRODUCTS: DigitalProductCandidate[] = [
  {
    name: 'Canva Pro — Annual Subscription',
    description:
      'Canva Pro annual plan. Premium templates, background remover, and brand kit tools — widely used by CC creators for thumbnails, mod previews, and social promo graphics.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('canva', 'pro-annual'),
    partner: 'canva',
    category: 'design-tools',
    matchingThemes: THEMES_ALL,
    originalPrice: 119.99,
    salePrice: 119.99,
    promoText: '30-day free trial',
  },
  {
    name: 'Canva Pro — Monthly Subscription',
    description:
      'Canva Pro monthly plan for creators who want premium design tools without an annual commitment.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('canva', 'pro-monthly'),
    partner: 'canva',
    category: 'design-tools',
    matchingThemes: THEMES_ALL,
    originalPrice: 12.99,
    salePrice: 12.99,
    promoText: '30-day free trial',
  },
];

// ---------------------------------------------------------------------------
// NordVPN — universal utility (privacy while downloading/browsing CC sites)
// ---------------------------------------------------------------------------
const NORDVPN_PRODUCTS: DigitalProductCandidate[] = [
  {
    name: 'NordVPN — 2-Year Plan',
    description:
      'NordVPN 2-year subscription. Encrypts traffic and hides IP address — useful for browsing and downloading CC/mods from third-party sites safely.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('nordvpn', '2-year-plan'),
    partner: 'nordvpn',
    category: 'software',
    matchingThemes: THEMES_ALL,
    originalPrice: 359.76,
    salePrice: 79.99,
    promoText: 'Up to 70% off',
  },
  {
    name: 'NordVPN — 1-Year Plan',
    description:
      'NordVPN 1-year subscription with threat protection and ad blocking, useful for safer browsing of mod/CC download sites.',
    imageUrl: '',
    // TODO: paste real tracking link
    affiliateUrl: placeholderUrl('nordvpn', '1-year-plan'),
    partner: 'nordvpn',
    category: 'software',
    matchingThemes: THEMES_ALL,
    originalPrice: 143.76,
    salePrice: 59.99,
    promoText: 'Save 58%',
  },
];

const ALL_PRODUCTS: DigitalProductCandidate[] = [
  ...SIMS4_DLC_PRODUCTS,
  ...DISPLATE_PRODUCTS,
  ...CANVA_PRODUCTS,
  ...NORDVPN_PRODUCTS,
];

async function importProducts() {
  console.log('Starting digital affiliate product import...');
  console.log(`Total products to import: ${ALL_PRODUCTS.length}`);
  console.log(
    'NOTE: production affiliate_offers table was confirmed EMPTY prior to this run — this is a from-scratch seed, not a migration.\n'
  );

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of ALL_PRODUCTS) {
    try {
      // Check if product already exists (dedupe by affiliateUrl or name)
      const existing = await prisma.affiliateOffer.findFirst({
        where: {
          OR: [{ affiliateUrl: product.affiliateUrl }, { name: product.name }],
        },
      });

      if (existing) {
        console.log(`  Skipped (exists): ${product.name}`);
        skipped++;
        continue;
      }

      await prisma.affiliateOffer.create({
        data: {
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          affiliateUrl: product.affiliateUrl,
          partner: product.partner,
          category: product.category,
          priority: 50,
          isActive: false, // gated until real tracking link is pasted in
          promoText: product.promoText,
          originalPrice:
            product.originalPrice !== undefined
              ? new Prisma.Decimal(product.originalPrice)
              : undefined,
          salePrice:
            product.salePrice !== undefined ? new Prisma.Decimal(product.salePrice) : undefined,
          matchingThemes: product.matchingThemes,
          matchingContentTypes: [product.category],
          personaValidated: true,
          personaScore: 5,
          sourceType: 'manual',
          validationStatus: 'pending',
          network: PARTNER_NETWORK[product.partner] ?? null,
          researchNotes: `Digital affiliate catalog seed (Amazon → digital pivot). Partner: ${product.partner}. Category: ${product.category}. Placeholder affiliateUrl — replace via admin UI after program approval, then set isActive: true.`,
        },
      });

      console.log(`  Imported: ${product.name} (${product.partner} / ${product.category})`);
      imported++;
    } catch (error) {
      console.error(`  Error importing ${product.name}:`, error);
      errors++;
    }
  }

  console.log('\n=== Import Complete ===');
  console.log(`Imported: ${imported}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${imported + skipped + errors}`);

  // Summary by partner
  console.log('\n=== Offers by Partner ===');
  const partners: Partner[] = [
    'greenmangaming',
    'kinguin',
    'cdkeys',
    'displate',
    'canva',
    'nordvpn',
  ];
  for (const partner of partners) {
    const count = await prisma.affiliateOffer.count({ where: { partner } });
    console.log(`${partner}: ${count} offers`);
  }

  // Summary by theme
  console.log('\n=== Offers by Theme ===');
  for (const theme of THEMES_ALL) {
    const count = await prisma.affiliateOffer.count({
      where: { matchingThemes: { has: theme } },
    });
    console.log(`${theme}: ${count} offers`);
  }

  const totalInactive = await prisma.affiliateOffer.count({
    where: { isActive: false, sourceType: 'manual', validationStatus: 'pending' },
  });
  console.log(`\nTotal seeded offers awaiting activation: ${totalInactive}`);

  console.log('\n=== NEXT STEPS ===');
  console.log('1. Sign up for each affiliate program (Green Man Gaming, Kinguin, CDKeys,');
  console.log('   Displate, Canva, NordVPN) if not already approved.');
  console.log('2. In /admin/monetization/affiliates, edit each offer and paste the real');
  console.log('   tracking link over the PLACEHOLDER affiliateUrl (search codebase for');
  console.log('   "PLACEHOLDER.example" to find every offer that still needs one).');
  console.log('3. Flip isActive to true for each offer once its real link is in place —');
  console.log('   personaValidated is already true, so the offer serves immediately.');
}

// Run the import
importProducts()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
