#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addRedditSource() {
  try {
    console.log('🔧 Adding Reddit content source...');
    
    await prisma.contentSource.upsert({
      where: { name: 'Reddit' },
      update: {
        isActive: true,
        scrapeInterval: 3600,
        rateLimit: 30,
      },
      create: {
        name: 'Reddit',
        baseUrl: 'https://www.reddit.com',
        apiEndpoint: null,
        apiKey: null,
        isActive: true,
        scrapeInterval: 3600,
        rateLimit: 30,
      },
    });
    
    console.log('✅ Reddit source added/updated successfully');
    
    // List all active sources
    const sources = await prisma.contentSource.findMany({
      where: { isActive: true },
      select: { name: true, isActive: true, lastScraped: true }
    });
    
    console.log('\n📋 Active content sources:');
    sources.forEach(source => {
      console.log(`   - ${source.name}: ${source.isActive ? 'Active' : 'Inactive'} (Last scraped: ${source.lastScraped || 'Never'})`);
    });
    
  } catch (error) {
    console.error('❌ Error adding Reddit source:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRedditSource();
