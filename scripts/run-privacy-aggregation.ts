#!/usr/bin/env tsx

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

import { privacyAggregator } from '../lib/services/privacyAggregator';
import { getPrivacyConfig } from '../lib/config/privacy';

async function main() {
  try {
    console.log('🚀 Starting MustHaveMods Privacy-Focused Content Aggregation');
    console.log('=' .repeat(60));
    
    // Get privacy configuration
    const config = getPrivacyConfig();
    console.log('📋 Privacy Configuration:');
    console.log(`   - Min Delay: ${config.minDelay}ms`);
    console.log(`   - Max Delay: ${config.maxDelay}ms`);
    console.log(`   - Jitter Range: ${config.jitterRange}ms`);
    console.log(`   - Max Requests per Session: ${config.maxRequestsPerSession}`);
    console.log(`   - Session Timeout: ${config.sessionTimeout / 60000} minutes`);
    console.log(`   - Random Referers: ${config.enableRandomReferers ? 'Enabled' : 'Disabled'}`);
    console.log(`   - User Agent Rotation: ${config.userAgentRotation ? 'Enabled' : 'Disabled'}`);
    console.log(`   - Header Randomization: ${config.enableHeaderRandomization ? 'Enabled' : 'Disabled'}`);
    console.log('');
    
    // Set environment variables for privacy level
    process.env.PRIVACY_LEVEL = process.env.PRIVACY_LEVEL || 'default';
    console.log(`🔒 Privacy Level: ${process.env.PRIVACY_LEVEL.toUpperCase()}`);
    console.log('');
    
    // Run aggregation
    console.log('🌐 Starting content aggregation...');
    const startTime = Date.now();
    
    await privacyAggregator.runAggregation();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('');
    console.log('✅ Content aggregation completed successfully!');
    console.log(`⏱️  Total duration: ${duration.toFixed(2)} seconds`);
    console.log(`📊 Average time per request: ${(duration / 100).toFixed(2)} seconds`);
    console.log('');
    console.log('🔒 Privacy features maintained throughout the process');
    console.log('🌍 Multiple sessions rotated to avoid detection');
    console.log('⏰ Respectful delays maintained between requests');
    
  } catch (error) {
    console.error('❌ Error during content aggregation:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
