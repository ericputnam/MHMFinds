#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMoreSources() {
  try {
    console.log('🔧 Adding more accessible content sources...');
    
    const newSources = [
      {
        name: 'Discord',
        baseUrl: 'https://discord.com',
        apiEndpoint: null,
        apiKey: null,
        isActive: true,
        scrapeInterval: 7200, // 2 hours
        rateLimit: 20,
      },
      {
        name: 'Pinterest',
        baseUrl: 'https://www.pinterest.com',
        apiEndpoint: null,
        apiKey: null,
        isActive: true,
        scrapeInterval: 3600, // 1 hour
        rateLimit: 40,
      },
      {
        name: 'Instagram',
        baseUrl: 'https://www.instagram.com',
        apiEndpoint: null,
        apiKey: null,
        isActive: true,
        scrapeInterval: 7200, // 2 hours
        rateLimit: 15,
      }
    ];
    
    for (const source of newSources) {
      await prisma.contentSource.upsert({
        where: { name: source.name },
        update: source,
        create: source,
      });
      console.log(`   ✅ Added/updated ${source.name} source`);
    }
    
    console.log('\n✅ All sources added successfully');
    
    // List all active sources
    const sources = await prisma.contentSource.findMany({
      where: { isActive: true },
      select: { name: true, isActive: true, lastScraped: true }
    });
    
    console.log('\n📋 All active content sources:');
    sources.forEach(source => {
      console.log(`   - ${source.name}: ${source.isActive ? 'Active' : 'Inactive'} (Last scraped: ${source.lastScraped || 'Never'})`);
    });
    
  } catch (error) {
    console.error('❌ Error adding sources:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMoreSources();
