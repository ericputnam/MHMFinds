/**
 * Backfill AffiliateOffer.network from each offer's affiliateUrl.
 *
 * The commission-sync system detects the network at click time regardless,
 * but a populated column makes the admin dashboard and ad-hoc queries useful.
 *
 * Usage:
 *   npx tsx scripts/backfill-affiliate-network.ts            # dry run
 *   npx tsx scripts/backfill-affiliate-network.ts --apply    # write changes
 */
import { prisma } from '../lib/prisma';
import { detectNetworkFromUrl } from '../lib/services/affiliateEarnings/network';

async function main() {
  const apply = process.argv.includes('--apply');

  const offers = await prisma.affiliateOffer.findMany({
    where: { network: null },
    select: { id: true, name: true, affiliateUrl: true },
  });

  console.log(`${offers.length} offers with no network set`);

  let detected = 0;
  let unknown = 0;
  for (const offer of offers) {
    const network = detectNetworkFromUrl(offer.affiliateUrl);
    if (!network) {
      unknown++;
      console.log(`  ? unknown network: ${offer.name} (${offer.affiliateUrl.slice(0, 60)})`);
      continue;
    }
    detected++;
    console.log(`  ${apply ? '✓' : '→'} ${network}: ${offer.name}`);
    if (apply) {
      await prisma.affiliateOffer.update({ where: { id: offer.id }, data: { network } });
    }
  }

  console.log(
    `\n${detected} detected, ${unknown} unknown.${apply ? ' Applied.' : ' Dry run — rerun with --apply to write.'}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
