import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Logitech consumer products - curated for Sims modding audience (pink, rose, aesthetic peripherals)
// URLs extracted from Logitech-EN-US_IR.txt.gz catalog
const logitechConsumerOffers = [
  // === ROSE/PINK PRODUCTS - Top Priority ===
  {
    name: 'Logitech Pebble Mouse 2 M350s - Tonal Rose',
    description: 'Slim, portable wireless mouse in beautiful rose color. Whisper-quiet clicks for late-night Sims sessions.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/mice/pebble-mouse-2-m350s/update-2025/gallery/tonal-rose/pebble-mouse-2-m350s-tonal-rose-top-angle-gallery-1.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=910-007023_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fpebble-2-m350s-wireless-mouse.910-007023%3Futm_source%3Dgoogle&intsrc=CATF_20733',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'mice',
    priority: 95,
    promoText: '$19.99',
    promoColor: '#ec4899',
  },
  {
    name: 'Logitech Zone Vibe 100 - Rose',
    description: 'Wireless headphones in rose with up to 20 hours of battery life. Lightweight comfort for marathon gaming.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/headsets/zone-vibe-100/gallery/zone-vibe-100-gallery-rose-1.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=981-001258_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fzone-vibe-100-wireless.981-001258%3Futm_source%3Dgoogle&intsrc=CATF_20733',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'headsets',
    priority: 92,
    promoText: 'Wireless',
    promoColor: '#ec4899',
  },
  {
    name: 'Logitech Brio 500 Webcam - Rose',
    description: 'Full HD webcam in rose with auto light correction. Perfect for streaming your Sims builds.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/webcams/brio-500/gallery/brio-500-gallery-rose-1.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=960-001432_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fbrio-500-webcam.960-001432%3Futm_source%3Dgoogle&intsrc=CATF_20733',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'webcams',
    priority: 88,
    promoText: 'For Streaming',
    promoColor: '#ec4899',
  },
  {
    name: 'Logitech Pebble 2 Combo - Tonal Rose',
    description: 'Matching keyboard and mouse combo in tonal rose. Whisper-quiet keys for peaceful gaming.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/combos/pebble-2-combo/gallery/pebble-2-combo-top-tonal-rose-gallery-us.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=920-012199_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fpebble-2-keyboard-mouse-combo.920-012199%3Futm_source%3Dgoogle&intsrc=CATF_20733',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'combos',
    priority: 90,
    promoText: 'Bundle Deal',
    promoColor: '#ec4899',
  },

  // === WHITE/NEUTRAL PRODUCTS ===
  {
    name: 'Logitech Brio 100 Webcam - Off-White',
    description: 'Budget-friendly Full HD webcam in off-white. Auto light balance for any setup.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/webcams/brio-100/gallery/brio-100-gallery-offwhite-1.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=960-001616_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fbrio-100-webcam.960-001616%3Futm_source%3Dgoogle&intsrc=CATF_20733',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'webcams',
    priority: 75,
    promoText: '$24.99',
    promoColor: '#6366f1',
  },
  {
    name: 'Logitech POP Keys & Mouse Bundle - Mist',
    description: 'Retro-style mechanical keyboard with emoji keys and matching mouse in misty lavender.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/keyboards/pop-keys-wireless-mechanical/gallery/wave-2/pop-keys-gallery-mist-1.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=920-011232_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fpop-keys-wireless-mechanical.920-011232%3Futm_source%3Dgoogle&intsrc=CATF_20733',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'combos',
    priority: 85,
    promoText: 'Emoji Keys!',
    promoColor: '#8b5cf6',
  },
];

async function main() {
  console.log('🖱️ Seeding Logitech consumer products...\n');

  for (const offer of logitechConsumerOffers) {
    const existing = await prisma.affiliateOffer.findFirst({
      where: { affiliateUrl: offer.affiliateUrl },
    });

    if (existing) {
      console.log(`⏭️  Skipping (exists): ${offer.name}`);
      continue;
    }

    await prisma.affiliateOffer.create({
      data: {
        ...offer,
        isActive: true,
        impressions: 0,
        clicks: 0,
      },
    });
    console.log(`✅ Created: ${offer.name}`);
  }

  const count = await prisma.affiliateOffer.count();
  console.log(`\n🎉 Done! Total affiliate offers: ${count}`);
}

main()
  .catch((e) => {
    console.error('Error seeding Logitech consumer:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
