#!/usr/bin/env npx tsx
/**
 * Affiliate Opportunity Scanner
 *
 * Scans the site for affiliate monetization opportunities.
 *
 * Usage:
 *   npm run agent:scan-affiliates
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { affiliateDetector } from '@/lib/services/affiliateDetector';
import { prisma } from '@/lib/prisma';

async function main() {
  console.log('\n🔍 Affiliate Opportunity Scanner');
  console.log('═══════════════════════════════════════');
  console.log('  Scanning for monetization opportunities...\n');

  try {
    const startTime = Date.now();
    const count = await affiliateDetector.scanForOpportunities();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n───────────────────────────────────────');
    console.log(`  ✅ Created ${count} opportunities`);
    console.log(`  ⏱️  Duration: ${duration}s`);
    console.log('═══════════════════════════════════════\n');

    // Show summary of opportunities created
    if (count > 0) {
      console.log('📋 Recently Created Opportunities:');

      const recent = await prisma.monetizationOpportunity.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          },
        },
        orderBy: { priority: 'desc' },
        take: 5,
        select: {
          title: true,
          opportunityType: true,
          priority: true,
          estimatedRevenueImpact: true,
        },
      });

      for (const opp of recent) {
        const impact = opp.estimatedRevenueImpact
          ? `$${Number(opp.estimatedRevenueImpact).toFixed(2)}`
          : 'Unknown';
        console.log(`  • [P${opp.priority}] ${opp.title}`);
        console.log(`    Type: ${opp.opportunityType} | Est. Impact: ${impact}`);
      }

      console.log('\n  Run `npm run queue list` to see all pending opportunities\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
