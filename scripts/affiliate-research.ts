#!/usr/bin/env npx tsx
/**
 * Affiliate Research CLI
 *
 * Usage:
 *   npx tsx scripts/affiliate-research.ts research [limit]
 *   npx tsx scripts/affiliate-research.ts validate "Product Name" 29.99 category
 *   npx tsx scripts/affiliate-research.ts chat emily "What products would you recommend?"
 *   npx tsx scripts/affiliate-research.ts personas
 *   npx tsx scripts/affiliate-research.ts performance [days]
 */

// CRITICAL: Import setup-env FIRST to load environment variables before any other imports
import './lib/setup-env';

import { affiliateResearchService } from '../lib/services/affiliateResearchService';
import { personaSwarmService } from '../lib/services/personaSwarmService';
import { prisma } from '../lib/prisma';

const command = process.argv[2];

async function main() {
  console.log('\n🛍️  Affiliate Research CLI\n');

  switch (command) {
    case 'research':
      await runResearch();
      break;
    case 'validate':
      await validateProduct();
      break;
    case 'chat':
      await chatWithPersona();
      break;
    case 'personas':
      listPersonas();
      break;
    case 'performance':
      await showPerformance();
      break;
    case 'history':
      await showHistory();
      break;
    case 'list':
      await listOffers();
      break;
    case 'clear':
      await clearOffers();
      break;
    default:
      showHelp();
  }

  await prisma.$disconnect();
}

async function runResearch() {
  const limit = parseInt(process.argv[3]) || 10;
  const themes = process.argv[4] ? process.argv[4].split(',') : undefined;

  console.log(`Running research cycle (limit: ${limit})...`);
  if (themes) console.log(`Themes: ${themes.join(', ')}`);
  console.log('');

  try {
    const result = await affiliateResearchService.runResearchCycle(limit, themes);

    console.log('✅ Research Complete!\n');
    console.log(`   Run ID:            ${result.runId}`);
    console.log(`   Themes Analyzed:   ${result.themesAnalyzed.join(', ')}`);
    console.log(`   Products Found:    ${result.productsFound}`);
    console.log(`   Products Validated: ${result.productsValidated}`);
    console.log(`   Offers Created:    ${result.offersCreated}`);
    console.log(`\n   ${result.summary}`);
  } catch (error) {
    console.error('❌ Research failed:', error);
  }
}

async function validateProduct() {
  const name = process.argv[3];
  const price = parseFloat(process.argv[4]);
  const category = process.argv[5] || 'accessories';

  if (!name || isNaN(price)) {
    console.log('Usage: npx tsx scripts/affiliate-research.ts validate "Product Name" 29.99 [category]');
    console.log('\nExample:');
    console.log('  npx tsx scripts/affiliate-research.ts validate "Butterfly Hair Clips" 12.99 accessories');
    return;
  }

  console.log(`Validating: ${name} ($${price}) [${category}]\n`);

  try {
    const result = await personaSwarmService.evaluateProduct({ name, price, category });

    console.log(result.passed ? '✅ PASSED' : '❌ REJECTED');
    console.log(`   Approval: ${result.approvalCount}/5 personas\n`);

    console.log('Votes:');
    for (const [persona, vote] of Object.entries(result.votes)) {
      const icon = vote.wouldBuy ? '👍' : '👎';
      const priceIcon = vote.priceFeeling === 'perfect' ? '💰' : vote.priceFeeling === 'too_expensive' ? '💸' : '🪙';
      console.log(`   ${icon} ${persona.padEnd(8)} | Aesthetic: ${vote.aestheticScore}/10 | Price: ${priceIcon} ${vote.priceFeeling}`);
      console.log(`      "${vote.reasoning}"\n`);
    }

    console.log(`Summary: ${result.summary}`);
  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

async function chatWithPersona() {
  const persona = process.argv[3];
  const message = process.argv[4];

  if (!persona || !message) {
    console.log('Usage: npx tsx scripts/affiliate-research.ts chat <persona> "message"');
    console.log('\nPersonas: emily, sofia, luna, mia, claire');
    console.log('\nExample:');
    console.log('  npx tsx scripts/affiliate-research.ts chat sofia "What Y2K products would you buy?"');
    return;
  }

  console.log(`Chatting with ${persona}...\n`);

  try {
    const response = await personaSwarmService.chatWithPersona(persona, message, []);
    console.log(`💬 ${persona.charAt(0).toUpperCase() + persona.slice(1)}:\n`);
    console.log(`   "${response}"`);
  } catch (error) {
    console.error('❌ Chat failed:', error);
  }
}

function listPersonas() {
  const personas = personaSwarmService.getPersonas();

  console.log('Available Personas:\n');
  console.log('┌──────────┬─────┬─────────────────┬─────────────────────────┬───────────────┐');
  console.log('│ ID       │ Age │ Location        │ Aesthetic               │ Price Range   │');
  console.log('├──────────┼─────┼─────────────────┼─────────────────────────┼───────────────┤');

  for (const p of personas) {
    const id = p.id.padEnd(8);
    const age = String(p.age).padEnd(3);
    const loc = p.location.substring(0, 15).padEnd(15);
    const aesthetic = p.aesthetic.substring(0, 23).padEnd(23);
    const price = `$${p.priceRange.min}-$${p.priceRange.max}`.padEnd(13);
    console.log(`│ ${id} │ ${age} │ ${loc} │ ${aesthetic} │ ${price} │`);
  }

  console.log('└──────────┴─────┴─────────────────┴─────────────────────────┴───────────────┘');

  console.log('\nTo chat with a persona:');
  console.log('  npx tsx scripts/affiliate-research.ts chat emily "What products do you like?"');
}

async function showPerformance() {
  const days = parseInt(process.argv[3]) || 30;

  console.log(`Performance (last ${days} days):\n`);

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const offers = await prisma.affiliateOffer.findMany({
      where: { createdAt: { gte: startDate } },
      select: {
        personaValidated: true,
        impressions: true,
        clicks: true,
        conversions: true,
        revenue: true,
      },
    });

    const validated = offers.filter(o => o.personaValidated);
    const nonValidated = offers.filter(o => !o.personaValidated);

    const sumMetrics = (arr: typeof offers) => ({
      impressions: arr.reduce((s, o) => s + o.impressions, 0),
      clicks: arr.reduce((s, o) => s + o.clicks, 0),
      conversions: arr.reduce((s, o) => s + o.conversions, 0),
      revenue: arr.reduce((s, o) => s + Number(o.revenue), 0),
    });

    const validatedMetrics = sumMetrics(validated);
    const nonValidatedMetrics = sumMetrics(nonValidated);

    const ctr = (m: typeof validatedMetrics) =>
      m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) : '0.00';
    const convRate = (m: typeof validatedMetrics) =>
      m.clicks > 0 ? ((m.conversions / m.clicks) * 100).toFixed(2) : '0.00';

    console.log('┌─────────────────────┬──────────────────┬──────────────────┐');
    console.log('│ Metric              │ Persona-Validated │ Non-Validated    │');
    console.log('├─────────────────────┼──────────────────┼──────────────────┤');
    console.log(`│ Offers              │ ${String(validated.length).padEnd(16)} │ ${String(nonValidated.length).padEnd(16)} │`);
    console.log(`│ Impressions         │ ${String(validatedMetrics.impressions).padEnd(16)} │ ${String(nonValidatedMetrics.impressions).padEnd(16)} │`);
    console.log(`│ Clicks              │ ${String(validatedMetrics.clicks).padEnd(16)} │ ${String(nonValidatedMetrics.clicks).padEnd(16)} │`);
    console.log(`│ CTR                 │ ${(ctr(validatedMetrics) + '%').padEnd(16)} │ ${(ctr(nonValidatedMetrics) + '%').padEnd(16)} │`);
    console.log(`│ Conversions         │ ${String(validatedMetrics.conversions).padEnd(16)} │ ${String(nonValidatedMetrics.conversions).padEnd(16)} │`);
    console.log(`│ Conv. Rate          │ ${(convRate(validatedMetrics) + '%').padEnd(16)} │ ${(convRate(nonValidatedMetrics) + '%').padEnd(16)} │`);
    console.log(`│ Revenue             │ $${validatedMetrics.revenue.toFixed(2).padEnd(15)} │ $${nonValidatedMetrics.revenue.toFixed(2).padEnd(15)} │`);
    console.log('└─────────────────────┴──────────────────┴──────────────────┘');

  } catch (error) {
    console.error('❌ Failed to fetch performance:', error);
  }
}

async function showHistory() {
  console.log('Recent Research Runs:\n');

  try {
    const runs = await prisma.affiliateResearchRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        startedAt: true,
        productsFound: true,
        productsValidated: true,
        offersDiscovered: true,
        themesAnalyzed: true,
      },
    });

    if (runs.length === 0) {
      console.log('No research runs yet. Run: npx tsx scripts/affiliate-research.ts research');
      return;
    }

    for (const run of runs) {
      const status = run.status === 'completed' ? '✅' : run.status === 'failed' ? '❌' : '⏳';
      const date = run.startedAt.toLocaleDateString();
      console.log(`${status} ${date} | Found: ${run.productsFound} | Validated: ${run.productsValidated} | Created: ${run.offersDiscovered}`);
      console.log(`   Themes: ${run.themesAnalyzed.join(', ') || 'auto-detected'}`);
      console.log(`   ID: ${run.id}\n`);
    }
  } catch (error) {
    console.error('❌ Failed to fetch history:', error);
  }
}

async function listOffers() {
  console.log('Existing Affiliate Offers:\n');

  try {
    const offers = await prisma.affiliateOffer.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        originalPrice: true,
        salePrice: true,
        isActive: true,
        personaScore: true,
        createdAt: true,
      },
    });

    if (offers.length === 0) {
      console.log('No offers yet. Run: npx tsx scripts/affiliate-research.ts research');
      return;
    }

    console.log(`Found ${offers.length} offers:\n`);
    for (const offer of offers) {
      const status = offer.isActive ? '✅' : '⏸️';
      const price = offer.salePrice || offer.originalPrice || 'N/A';
      console.log(`${status} ${offer.name.substring(0, 50)}`);
      console.log(`   Price: $${price} | Persona: ${offer.personaScore}/8 | ${offer.createdAt.toLocaleDateString()}`);
      console.log(`   ID: ${offer.id}\n`);
    }
  } catch (error) {
    console.error('❌ Failed to list offers:', error);
  }
}

async function clearOffers() {
  console.log('Clearing all affiliate offers...\n');

  try {
    const result = await prisma.affiliateOffer.deleteMany({});
    console.log(`✅ Deleted ${result.count} offers`);
  } catch (error) {
    console.error('❌ Failed to clear offers:', error);
  }
}

function showHelp() {
  console.log('Commands:\n');
  console.log('  research [limit] [themes]     Run a research cycle');
  console.log('                                Example: research 10 y2k,cottagecore\n');
  console.log('  validate "name" price [cat]   Validate a product through personas');
  console.log('                                Example: validate "Hair Clips" 12.99 accessories\n');
  console.log('  chat <persona> "message"      Chat with a persona');
  console.log('                                Example: chat sofia "What would you buy?"\n');
  console.log('  personas                      List all 8 personas\n');
  console.log('  performance [days]            Show conversion metrics (default: 30 days)\n');
  console.log('  history                       Show recent research runs\n');
  console.log('  list                          List all affiliate offers\n');
  console.log('  clear                         Clear all affiliate offers\n');
}

main().catch(console.error);
