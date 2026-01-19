import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Logitech G gaming products - pink, lilac, and Aurora collection for Sims audience
const logitechGOffers = [
  // === PINK GAMING GEAR - Top Priority ===
  {
    name: 'Logitech G PRO 2 LIGHTSPEED Mouse - Pink',
    description: 'Pro-grade wireless gaming mouse in pink. HERO 2 sensor with 44K DPI for precision gameplay.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/gaming/en/products/pro-2-lightspeed/gallery/pro2-lightspeed-pink-gallery1.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/1949430/11355?prodsku=910-007291_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fshop%2Fp%2Fpro-2-lightspeed.910-007291%3Futm_source%3Dgoogle&intsrc=CATF_15749',
    partner: 'Logitech G',
    partnerLogo: null,
    category: 'gaming-mice',
    priority: 95,
    promoText: '$119.99',
    promoColor: '#ec4899',
  },
  {
    name: 'Logitech G PRO X 2 Wireless Headset - Pink',
    description: 'Premium wireless gaming headset in pink with Bluetooth. Pro-grade audio for immersive Sims gameplay.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/gaming/en/products/pro-x-2-lightspeed/gallery/gallery-1-pro-x-2-lightspeed-gaming-headset-magenta.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/1949430/11355?prodsku=981-001274_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fshop%2Fp%2Fpro-x-2-wireless-headset.981-001274%3Futm_source%3Dgoogle&intsrc=CATF_15749',
    partner: 'Logitech G',
    partnerLogo: null,
    category: 'gaming-headsets',
    priority: 92,
    promoText: 'Pro Audio',
    promoColor: '#ec4899',
  },
  {
    name: 'Logitech G PRO X TKL RAPID Keyboard - Pink',
    description: 'Compact TKL gaming keyboard in pink with rapid trigger technology. RGB lighting included.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/gaming/en/products/pro-x-tkl-rapid/gallery/pro-x-tkl-rapid-magenta-gallery-1-us.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/1949430/11355?prodsku=920-013133_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fshop%2Fp%2Fpro-x-tkl-rapid.920-013133%3Futm_source%3Dgoogle&intsrc=CATF_15749',
    partner: 'Logitech G',
    partnerLogo: null,
    category: 'gaming-keyboards',
    priority: 90,
    promoText: '$159.99',
    promoColor: '#ec4899',
  },

  // === LILAC GAMING GEAR ===
  {
    name: 'Logitech G203 LIGHTSYNC Mouse - Lilac',
    description: 'Budget-friendly RGB gaming mouse in lilac. Perfect starter mouse for Sims players.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/gaming/en/products/refreshed-g203/2025-update/g203-mouse-top-angle-lilac-gallery-1.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/1949430/11355?prodsku=910-005851_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fshop%2Fp%2Fg203-lightsync-rgb-gaming-mouse.910-005851%3Futm_source%3Dgoogle&intsrc=CATF_15749',
    partner: 'Logitech G',
    partnerLogo: null,
    category: 'gaming-mice',
    priority: 88,
    promoText: 'Only $20.89',
    promoColor: '#8b5cf6',
  },
  {
    name: 'Logitech G305 LIGHTSPEED Mouse - Lilac',
    description: 'Wireless gaming mouse in lilac with HERO sensor. 250 hours of battery life.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/gaming/en/products/g305/2025-update/g305-lightspeed-mouse-top-angle-lilac-gallery-1.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/1949430/11355?prodsku=910-006020_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fshop%2Fp%2Fg305-lightspeed-wireless-gaming-mouse.910-006020%3Futm_source%3Dgoogle&intsrc=CATF_15749',
    partner: 'Logitech G',
    partnerLogo: null,
    category: 'gaming-mice',
    priority: 85,
    promoText: 'Wireless',
    promoColor: '#8b5cf6',
  },
  {
    name: 'Logitech G733 Wireless Headset - Lilac',
    description: 'Lightweight wireless headset in lilac with LIGHTSYNC RGB. Colorful and comfortable.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/gaming/en/products/g733/gallery/g733-lilac-gallery-1.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/1949430/11355?prodsku=981-000889_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fshop%2Fp%2Fg733-rgb-wireless-headset.981-000889%3Futm_source%3Dgoogle&intsrc=CATF_15749',
    partner: 'Logitech G',
    partnerLogo: null,
    category: 'gaming-headsets',
    priority: 86,
    promoText: 'RGB Lights',
    promoColor: '#8b5cf6',
  },

  // === AURORA COLLECTION (White, designed for smaller hands) ===
  {
    name: 'Logitech G705 Wireless Mouse - White',
    description: 'Aurora Collection wireless mouse designed for smaller hands. LIGHTSYNC RGB in elegant white.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/gaming/en/products/mouse/g705-wireless-mouse/gallery/g705-gallery-3.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/1949430/11355?prodsku=910-006365_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fshop%2Fp%2Fg705-wireless-gaming-mouse.910-006365%3Futm_source%3Dgoogle&intsrc=CATF_15749',
    partner: 'Logitech G',
    partnerLogo: null,
    category: 'gaming-mice',
    priority: 82,
    promoText: 'Small Hands',
    promoColor: '#6366f1',
  },
  {
    name: 'Logitech G735 Wireless Headset - White',
    description: 'Aurora Collection headset with Bluetooth in white. Designed for comfort during long sessions.',
    imageUrl: 'https://resource.logitech.com/b_white/content/dam/gaming/en/products/audio/g735-wireless-headset/gallery/2025/g735-3qtr-front-left-angle-gallery-1.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/1949430/11355?prodsku=981-001082_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fshop%2Fp%2Fg735-wireless-bluetooth-headset.981-001082%3Futm_source%3Dgoogle&intsrc=CATF_15749',
    partner: 'Logitech G',
    partnerLogo: null,
    category: 'gaming-headsets',
    priority: 80,
    promoText: 'Aurora',
    promoColor: '#6366f1',
  },
];

async function main() {
  console.log('🎮 Seeding Logitech G gaming products...\n');

  for (const offer of logitechGOffers) {
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
    console.error('Error seeding Logitech G:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
