#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCurseForgeSource() {
  try {
    console.log('🔧 Updating CurseForge source configuration...');
    
    await prisma.contentSource.update({
      where: { name: 'CurseForge' },
      data: {
        apiEndpoint: null,
        apiKey: null,
        rateLimit: 80, // Reduced rate limit for stealth scraping
      },
    });
    
    console.log('✅ CurseForge source updated successfully');
    console.log('   - API endpoint removed');
    console.log('   - API key removed');
    console.log('   - Rate limit reduced to 80 (more stealthy)');
    
    // Show updated source
    const source = await prisma.contentSource.findUnique({
      where: { name: 'CurseForge' },
      select: { name: true, apiEndpoint: true, apiKey: true, rateLimit: true, isActive: true }
    });
    
    console.log('\n📋 Updated CurseForge configuration:');
    console.log(`   - Name: ${source?.name}`);
    console.log(`   - API Endpoint: ${source?.apiEndpoint || 'None (stealth mode)'}`);
    console.log(`   - API Key: ${source?.apiKey || 'None (stealth mode)'}`);
    console.log(`   - Rate Limit: ${source?.rateLimit}`);
    console.log(`   - Active: ${source?.isActive}`);
    
  } catch (error) {
    console.error('❌ Error updating CurseForge source:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCurseForgeSource();

