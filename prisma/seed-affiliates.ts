import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Curated Logitech products for Sims modding audience
// Focus: Pink/Aurora aesthetic, streaming gear, accessible price points
const affiliateOffers = [
  // === PINK / AURORA COLLECTION - Hero Products ===
  {
    name: 'Yeti Microphone - Pink Dawn',
    description: 'Premium USB mic in gorgeous pink. Perfect for streaming your Sims builds and Let\'s Plays.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/microphones/yeti-for-aurora/gallery/blue-yeti-mic-pink-dawn-gallery-2.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=988-000530_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fstreaming-gear%2Fyeti-aurora.988-000530.html',
    partner: 'Logitech',
    partnerLogo: 'https://resource.logitech.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/non-braid/logi-g-logo-702x526.png',
    category: 'streaming',
    priority: 100,
    promoText: 'Aurora Collection',
    promoColor: '#ec4899',
  },
  {
    name: 'G705 Wireless Gaming Mouse',
    description: 'Compact wireless mouse designed for smaller hands. Aurora Collection styling with RGB.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/mouse/g705-wireless-mouse/gallery/g705-gallery-2.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=910-006365_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fgaming-mice%2Fg705-wireless-gaming-mouse.910-006365.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'peripherals',
    priority: 95,
    promoText: 'Best Seller',
    promoColor: '#8b5cf6',
  },
  {
    name: 'G735 Wireless Headset',
    description: 'Lightweight wireless headset with plush ear cups. Made for all-day Sims sessions.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/audio/g735-wireless-headset/gallery/g735-gallery-2.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=981-001082_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fgaming-audio%2Fg735-wireless-bluetooth-headset.981-001082.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'peripherals',
    priority: 90,
    promoText: 'Aurora Collection',
    promoColor: '#ec4899',
  },
  {
    name: 'PRO X SUPERLIGHT 2 - Pink',
    description: 'Ultra-lightweight wireless gaming mouse in stunning magenta. Pro-level performance.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/pro-x-superlight-2/gallery-1-pro-x-superlight-2-gaming-mouse-magenta.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=910-006795_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fgaming-mice%2Fpro-x2-superlight-wireless-mouse.910-006795.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'peripherals',
    priority: 85,
    promoText: 'Pink Edition',
    promoColor: '#ec4899',
  },

  // === BUDGET FRIENDLY - High Conversion ===
  {
    name: 'G840 XL Desk Mat - Pink',
    description: 'Extra-large pink gaming mousepad. Complete your aesthetic desk setup.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/g840/g840-magenta/g840-magenta-gallery-2.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=943-000712_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fgaming-mouse-pads%2Fg840-cloth-xl-gaming-mouse-pad.943-000712.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'peripherals',
    priority: 80,
    promoText: 'Under $40',
    promoColor: '#10b981',
  },
  {
    name: 'Mouse Pad - Pink Dawn',
    description: 'Soft cloth mousepad in Pink Dawn. Matches the Aurora Collection perfectly.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/accessories/mouse-pad/mouse-pad-gallery-2-pink.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=943-000730_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fgaming-mouse-pads%2Fmouse-pad-g705.943-000730.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'peripherals',
    priority: 75,
    promoText: 'Under $30',
    promoColor: '#10b981',
  },
  {
    name: 'Snowball iCE - White',
    description: 'Entry-level USB microphone. Great for getting started with Sims streaming.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/streaming-gear/snowball-ice-usb-microphone/gallery/snowball-ice-microphones-three-quarter-view-gloss-white.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=988-000070_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fstreaming-gear%2Fsnowball-ice-usb-microphone.988-000070.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'streaming',
    priority: 70,
    promoText: 'Budget Pick',
    promoColor: '#3b82f6',
  },

  // === KEYBOARDS ===
  {
    name: 'PRO X TKL Keyboard - Pink',
    description: 'Wireless mechanical keyboard in magenta. RGB lighting and premium switches.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/pro-x-tkl/gallery-2-pro-x-tkl-magenta-lightspeed-gaming-keyboard.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=920-012154_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fgaming-keyboards%2Fpro-x-tkl-wireless-keyboard.920-012154.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'peripherals',
    priority: 82,
    promoText: 'Pink Edition',
    promoColor: '#ec4899',
  },
  {
    name: 'G515 TKL Keyboard - White',
    description: 'Low-profile wireless keyboard. Sleek, minimal design with RGB.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/g515-lightspeed-tkl/gallery/g515-keyboard-white-gallery-2-us.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=920-012535_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fgaming-keyboards%2Fg515-tkl-wireless-keyboard.920-012535.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'peripherals',
    priority: 72,
    promoText: 'New',
    promoColor: '#6366f1',
  },

  // === WHITE ALTERNATIVES ===
  {
    name: 'Yeti Microphone - White Mist',
    description: 'Premium USB mic in elegant white. Studio-quality sound for content creators.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/microphones/yeti-for-aurora/gallery/blue-yeti-mic-white-mist-gallery-2.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=988-000529_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fstreaming-gear%2Fyeti-aurora.988-000529.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'streaming',
    priority: 88,
    promoText: 'Aurora Collection',
    promoColor: '#ec4899',
  },
  {
    name: 'PRO X 2 Headset - Pink',
    description: 'Premium wireless gaming headset in magenta. Incredible sound for immersive gameplay.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/pro-x-2-lightspeed/gallery/gallery-2-pro-x-2-lightspeed-gaming-headset-magenta.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=981-001274_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Fgaming-audio%2Fpro-x-2-wireless-headset.981-001274.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'peripherals',
    priority: 78,
    promoText: 'Premium',
    promoColor: '#f59e0b',
  },

  // === ACCESSORIES - Impulse Buys ===
  {
    name: 'Keyboard Top Plate - Pink Dawn',
    description: 'Swap your G715 keyboard top plate for this gorgeous pink option.',
    imageUrl: 'https://resource.logitech.com/content/dam/gaming/en/products/accessories/g715-keyboard-topper/g715-keyboard-topper-gallery-2-pink.png',
    affiliateUrl: 'https://logitech.cfzu.net/c/2956236/800029/11355?prodsku=943-000626_en_US&u=https%3A%2F%2Fwww.logitechg.com%2Fen-us%2Fproducts%2Faccessories%2Ftop-plate-g715-wireless.943-000626.html',
    partner: 'Logitech',
    partnerLogo: null,
    category: 'peripherals',
    priority: 60,
    promoText: 'Only $19.99',
    promoColor: '#10b981',
  },
];

async function main() {
  console.log('🎮 Seeding affiliate offers for MustHaveMods...\n');

  for (const offer of affiliateOffers) {
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
    console.error('Error seeding affiliates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
