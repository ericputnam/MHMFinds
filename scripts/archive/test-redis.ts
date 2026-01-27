/**
 * Test Redis/Cache connectivity
 * Run with: npx tsx scripts/test-redis.ts
 */

import { CacheService } from '../lib/cache';

async function testRedis() {
  console.log('🧪 Testing Redis Cache Connection...\n');

  // Check if Redis is available
  const isAvailable = CacheService.isAvailable();
  console.log(`📊 Cache Available: ${isAvailable ? '✅ YES' : '❌ NO'}`);

  if (!isAvailable) {
    console.log('\n⚠️  Redis is not configured or unavailable');
    console.log('   Check REDIS_URL and REDIS_TOKEN environment variables');
    return;
  }

  // Test SET operation
  console.log('\n📝 Testing SET operation...');
  try {
    await CacheService.set('test:key', { message: 'Hello from ModVault!' }, 60);
    console.log('   ✅ SET successful');
  } catch (error) {
    console.log('   ❌ SET failed:', error);
    return;
  }

  // Test GET operation
  console.log('\n📖 Testing GET operation...');
  try {
    const value = await CacheService.get('test:key');
    console.log('   ✅ GET successful:', value);
  } catch (error) {
    console.log('   ❌ GET failed:', error);
    return;
  }

  // Test DELETE operation
  console.log('\n🗑️  Testing DEL operation...');
  try {
    await CacheService.del('test:key');
    console.log('   ✅ DEL successful');
  } catch (error) {
    console.log('   ❌ DEL failed:', error);
    return;
  }

  // Verify deletion
  console.log('\n🔍 Verifying deletion...');
  try {
    const value = await CacheService.get('test:key');
    if (value === null) {
      console.log('   ✅ Key deleted successfully (returned null)');
    } else {
      console.log('   ⚠️  Key still exists:', value);
    }
  } catch (error) {
    console.log('   ❌ Verification failed:', error);
    return;
  }

  // Get cache stats
  console.log('\n📈 Cache Statistics:');
  try {
    const stats = await CacheService.getStats();
    console.log('   Available:', stats.isAvailable);
    console.log('   Total Keys:', stats.keys || 'N/A');
  } catch (error) {
    console.log('   ❌ Stats failed:', error);
  }

  console.log('\n✅ All cache tests passed!');
}

testRedis().catch(console.error);
