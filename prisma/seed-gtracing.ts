import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GTRacing gaming chairs - high-value items for Sims audience
const gtracingOffers = [
  // === PINK CHAIRS - Top Priority ===
  {
    name: 'GTRacing GT890M Gaming Chair - Pink',
    description: 'Pink gaming chair with built-in Bluetooth speakers. Perfect for all-day Sims sessions with immersive audio.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0092/3828/2340/products/GT890M-PINK.jpg?v=1744165646',
    affiliateUrl: 'https://gtracing.sjv.io/c/2956236/1719124/18111?prodsku=39485289726032&u=https%3A%2F%2Fgtracing.com%2Fproducts%2Fgt890m%3Fvariant%3D39485289726032&intsrc=CATF_13261',
    partner: 'GTRacing',
    partnerLogo: null,
    category: 'gaming-chairs',
    priority: 100,
    promoText: 'Bluetooth Speakers',
    promoColor: '#ec4899',
  },
  {
    name: 'GTRacing GT890MF Gaming Chair - Pink',
    description: 'Premium pink gaming chair with footrest and speakers. Ultimate comfort for long gaming sessions.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0092/3828/2340/products/SKU.jpg?v=1743123192',
    affiliateUrl: 'https://gtracing.sjv.io/c/2956236/1719124/18111?prodsku=39485293854800&u=https%3A%2F%2Fgtracing.com%2Fproducts%2Fgt890mf-amz-h%3Fvariant%3D39485293854800&intsrc=CATF_13261',
    partner: 'GTRacing',
    partnerLogo: null,
    category: 'gaming-chairs',
    priority: 98,
    promoText: 'With Footrest',
    promoColor: '#ec4899',
  },

  // === PURPLE CHAIRS ===
  {
    name: 'GTRacing GT099 Gaming Chair - Purple',
    description: 'Stylish purple gaming chair with ergonomic design. 26% off original price.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0092/3828/2340/files/03_ef8875ee-9b0b-4159-bd85-ff8affd582bf.jpg?v=1766113762',
    affiliateUrl: 'https://gtracing.sjv.io/c/2956236/1719124/18111?prodsku=39485042196560&u=https%3A%2F%2Fgtracing.com%2Fproducts%2Fgt099%3Fvariant%3D39485042196560&intsrc=CATF_13261',
    partner: 'GTRacing',
    partnerLogo: null,
    category: 'gaming-chairs',
    priority: 92,
    promoText: '26% OFF',
    promoColor: '#8b5cf6',
  },
  {
    name: 'GTRacing GT890M Gaming Chair - Purple',
    description: 'Purple gaming chair with Bluetooth speakers built into the headrest. Game and listen in style.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0092/3828/2340/files/GT890M-_-1_15f91af0-bc71-49c5-8768-015e32f9c518.jpg?v=1744165650',
    affiliateUrl: 'https://gtracing.sjv.io/c/2956236/1719124/18111?prodsku=39485289857104&u=https%3A%2F%2Fgtracing.com%2Fproducts%2Fgt890m%3Fvariant%3D39485289857104&intsrc=CATF_13261',
    partner: 'GTRacing',
    partnerLogo: null,
    category: 'gaming-chairs',
    priority: 90,
    promoText: 'Bluetooth Speakers',
    promoColor: '#8b5cf6',
  },
  {
    name: 'GTRacing GT800A Gaming Chair - Purple',
    description: 'Purple gaming chair with retractable footrest. Flash sale pricing.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0092/3828/2340/products/gtplayer-pro-series-gt800a-gt800a-purple-kd-30098511003728.jpg?v=1758781905',
    affiliateUrl: 'https://gtracing.sjv.io/c/2956236/1719124/18111?prodsku=39784492007504&u=https%3A%2F%2Fgtracing.com%2Fproducts%2Fgt800a-f%3Fvariant%3D39784492007504&intsrc=CATF_13261',
    partner: 'GTRacing',
    partnerLogo: null,
    category: 'gaming-chairs',
    priority: 85,
    promoText: 'Flash Sale',
    promoColor: '#f59e0b',
  },

  // === WHITE CHAIRS ===
  {
    name: 'GTRacing GT099 Gaming Chair - White',
    description: 'Clean white gaming chair. Minimalist aesthetic for your setup. Was $189.99.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0092/3828/2340/files/06_adf94e05-07ac-4388-8c97-9f38f28b8432.jpg?v=1766113762',
    affiliateUrl: 'https://gtracing.sjv.io/c/2956236/1719124/18111?prodsku=39485042229328&u=https%3A%2F%2Fgtracing.com%2Fproducts%2Fgt099%3Fvariant%3D39485042229328&intsrc=CATF_13261',
    partner: 'GTRacing',
    partnerLogo: null,
    category: 'gaming-chairs',
    priority: 88,
    promoText: '31% OFF',
    promoColor: '#10b981',
  },
  {
    name: 'GTRacing GT890M Gaming Chair - White',
    description: 'White gaming chair with built-in Bluetooth speakers. Clean look, great sound.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0092/3828/2340/files/890m-_2.jpg?v=1744165648',
    affiliateUrl: 'https://gtracing.sjv.io/c/2956236/1719124/18111?prodsku=39485289791568&u=https%3A%2F%2Fgtracing.com%2Fproducts%2Fgt890m%3Fvariant%3D39485289791568&intsrc=CATF_13261',
    partner: 'GTRacing',
    partnerLogo: null,
    category: 'gaming-chairs',
    priority: 86,
    promoText: 'Bluetooth Speakers',
    promoColor: '#6366f1',
  },
  {
    name: 'GTRacing GT800A Gaming Chair - White',
    description: 'White gaming chair with footrest. Flash sale - limited time pricing.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0092/3828/2340/files/07_65205e5a-8370-4c7c-9d61-88ef6205e7b1.webp?v=1758781905',
    affiliateUrl: 'https://gtracing.sjv.io/c/2956236/1719124/18111?prodsku=39485393797200&u=https%3A%2F%2Fgtracing.com%2Fproducts%2Fgt800a-f%3Fvariant%3D39485393797200&intsrc=CATF_13261',
    partner: 'GTRacing',
    partnerLogo: null,
    category: 'gaming-chairs',
    priority: 82,
    promoText: 'Flash Sale',
    promoColor: '#f59e0b',
  },
];

async function main() {
  console.log('🪑 Seeding GTRacing gaming chairs...\n');

  for (const offer of gtracingOffers) {
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
    console.error('Error seeding GTRacing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
