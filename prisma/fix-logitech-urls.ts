import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Fixes for malformed Logitech consumer URLs - using actual catalog data
const fixes = [
  {
    namePattern: 'Pebble Mouse 2 M350s',
    correctImageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/mice/pebble-mouse-2-m350s/update-2025/gallery/tonal-rose/pebble-mouse-2-m350s-tonal-rose-top-angle-gallery-1.png',
    correctAffiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=910-007023_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fpebble-2-m350s-wireless-mouse.910-007023%3Futm_source%3Dgoogle&intsrc=CATF_20733',
  },
  {
    namePattern: 'Zone Vibe 100',
    correctImageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/headsets/zone-vibe-100/gallery/zone-vibe-100-gallery-rose-1.png',
    correctAffiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=981-001258_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fzone-vibe-100-wireless.981-001258%3Futm_source%3Dgoogle&intsrc=CATF_20733',
  },
  {
    namePattern: 'Brio 500',
    correctImageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/webcams/brio-500/gallery/brio-500-gallery-rose-1.png',
    correctAffiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=960-001432_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fbrio-500-webcam.960-001432%3Futm_source%3Dgoogle&intsrc=CATF_20733',
  },
  {
    namePattern: 'Pebble 2 Combo',
    correctImageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/combos/pebble-2-combo/gallery/pebble-2-combo-top-tonal-rose-gallery-us.png',
    correctAffiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=920-012199_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fpebble-2-keyboard-mouse-combo.920-012199%3Futm_source%3Dgoogle&intsrc=CATF_20733',
  },
  {
    namePattern: 'Brio 100',
    correctImageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/webcams/brio-100/gallery/brio-100-gallery-offwhite-1.png',
    correctAffiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=960-001616_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fbrio-100-webcam.960-001616%3Futm_source%3Dgoogle&intsrc=CATF_20733',
  },
  {
    namePattern: 'POP Keys & Mouse Bundle',
    correctImageUrl: 'https://resource.logitech.com/b_white/content/dam/logitech/en/products/keyboards/pop-keys-wireless-mechanical/gallery/wave-2/pop-keys-gallery-mist-1.png',
    correctAffiliateUrl: 'https://logitech.cfzu.net/c/2956236/2268971/8585?prodsku=920-011232_en_US&u=https%3A%2F%2Fwww.logitech.com%2Fen-us%2Fshop%2Fp%2Fpop-keys-wireless-mechanical.920-011232%3Futm_source%3Dgoogle&intsrc=CATF_20733',
  },
];

async function main() {
  console.log('🔧 Fixing malformed Logitech consumer URLs...\n');

  for (const fix of fixes) {
    const offer = await prisma.affiliateOffer.findFirst({
      where: {
        name: { contains: fix.namePattern },
        partner: 'Logitech',
      },
    });

    if (!offer) {
      console.log(`⚠️  Not found: ${fix.namePattern}`);
      continue;
    }

    await prisma.affiliateOffer.update({
      where: { id: offer.id },
      data: {
        imageUrl: fix.correctImageUrl,
        affiliateUrl: fix.correctAffiliateUrl,
      },
    });

    console.log(`✅ Fixed: ${offer.name}`);
  }

  console.log('\n🎉 Done fixing URLs!');
}

main()
  .catch((e) => {
    console.error('Error fixing URLs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
