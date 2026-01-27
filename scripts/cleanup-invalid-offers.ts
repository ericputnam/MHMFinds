/**
 * Cleanup script to remove affiliate offers with invalid/fake URLs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const offers = await prisma.affiliateOffer.findMany({
    select: { id: true, name: true, affiliateUrl: true }
  });

  const invalidOffers = offers.filter(o => {
    const url = o.affiliateUrl || '';
    const hasTag = url.includes('tag=');
    const isAmazon = url.includes('amazon.com');
    // Invalid if it's an Amazon URL without an affiliate tag
    return isAmazon && !hasTag;
  });

  console.log('Invalid offers found:', invalidOffers.length);
  invalidOffers.forEach(o => console.log(' -', o.name, '|', o.affiliateUrl.slice(0, 50)));

  if (invalidOffers.length > 0) {
    const result = await prisma.affiliateOffer.deleteMany({
      where: { id: { in: invalidOffers.map(o => o.id) } }
    });
    console.log('\nDeleted:', result.count, 'invalid offers');
  } else {
    console.log('\nNo invalid offers to delete');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
