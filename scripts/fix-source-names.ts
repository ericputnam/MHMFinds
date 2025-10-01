#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSourceNames() {
  try {
    console.log('🔧 Fixing source name mismatches...');
    
    // Update "The Sims Resource" to "SimsResource" to match the aggregator
    await prisma.contentSource.updateMany({
      where: { name: 'The Sims Resource' },
      data: { name: 'SimsResource' }
    });
    
    console.log('✅ Source names fixed successfully');
    
    // List all active sources with their new names
    const sources = await prisma.contentSource.findMany({
      where: { isActive: true },
      select: { name: true, isActive: true, lastScraped: true }
    });
    
    console.log('\n📋 Updated content sources:');
    sources.forEach(source => {
      console.log(`   - ${source.name}: ${source.isActive ? 'Active' : 'Inactive'} (Last scraped: ${source.lastScraped || 'Never'})`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing source names:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSourceNames();
