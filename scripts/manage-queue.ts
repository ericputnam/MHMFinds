#!/usr/bin/env npx tsx
/**
 * Queue Management CLI
 *
 * Usage:
 *   npm run queue stats         - Show queue statistics
 *   npm run queue list          - List pending opportunities
 *   npm run queue approve <id>  - Approve an opportunity
 *   npm run queue reject <id>   - Reject an opportunity
 *   npm run queue expire [days] - Expire old opportunities
 *   npm run queue view <id>     - View opportunity details
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { actionQueue } from '@/lib/services/actionQueue';
import { prisma } from '@/lib/prisma';

const COMMANDS = ['stats', 'list', 'approve', 'reject', 'expire', 'view'];

async function showStats() {
  const stats = await actionQueue.getQueueStats();

  console.log('\n📊 Queue Statistics');
  console.log('═══════════════════════════════════════');
  console.log(`  Pending:     ${stats.pending}`);
  console.log(`  Approved:    ${stats.approved}`);
  console.log(`  Rejected:    ${stats.rejected}`);
  console.log(`  Implemented: ${stats.implemented}`);
  console.log(`  Expired:     ${stats.expired}`);
  console.log('───────────────────────────────────────');
  console.log(`  Est. Impact: $${stats.totalEstimatedImpact.toFixed(2)}`);
  console.log('═══════════════════════════════════════\n');
}

async function listPending() {
  const opportunities = await actionQueue.getPendingOpportunities(20);

  if (opportunities.length === 0) {
    console.log('\n✅ No pending opportunities in queue\n');
    return;
  }

  console.log('\n📋 Pending Opportunities');
  console.log('═══════════════════════════════════════════════════════════════════════════════');

  for (const opp of opportunities) {
    const impact = opp.estimatedRevenueImpact
      ? `$${Number(opp.estimatedRevenueImpact).toFixed(2)}`
      : 'Unknown';
    const confidence = `${(Number(opp.confidence) * 100).toFixed(0)}%`;

    console.log(`\n  ID: ${opp.id}`);
    console.log(`  ├─ Title: ${opp.title}`);
    console.log(`  ├─ Type: ${opp.opportunityType}`);
    console.log(`  ├─ Priority: ${opp.priority}/10 | Confidence: ${confidence}`);
    console.log(`  ├─ Est. Impact: ${impact}`);
    console.log(`  ├─ Page: ${opp.pageUrl ?? 'N/A'}`);
    console.log(`  ├─ Actions: ${opp.actions.length}`);
    console.log(`  └─ Created: ${opp.createdAt.toISOString()}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log(`\nShowing ${opportunities.length} opportunities\n`);
}

async function approveOpportunity(id: string) {
  if (!id) {
    console.error('❌ Error: Opportunity ID required');
    console.log('Usage: npm run queue approve <id>');
    process.exit(1);
  }

  const opp = await actionQueue.getOpportunity(id);
  if (!opp) {
    console.error(`❌ Error: Opportunity not found: ${id}`);
    process.exit(1);
  }

  if (opp.status !== 'PENDING') {
    console.error(`❌ Error: Opportunity is not pending (status: ${opp.status})`);
    process.exit(1);
  }

  await actionQueue.approveOpportunity(id, 'cli-admin');
  console.log(`\n✅ Approved opportunity: ${opp.title}`);
  console.log(`   Actions approved: ${opp.actions.length}\n`);
}

async function rejectOpportunity(id: string, reason?: string) {
  if (!id) {
    console.error('❌ Error: Opportunity ID required');
    console.log('Usage: npm run queue reject <id> [reason]');
    process.exit(1);
  }

  const opp = await actionQueue.getOpportunity(id);
  if (!opp) {
    console.error(`❌ Error: Opportunity not found: ${id}`);
    process.exit(1);
  }

  if (opp.status !== 'PENDING') {
    console.error(`❌ Error: Opportunity is not pending (status: ${opp.status})`);
    process.exit(1);
  }

  await actionQueue.rejectOpportunity(id, 'cli-admin', reason);
  console.log(`\n❌ Rejected opportunity: ${opp.title}`);
  if (reason) {
    console.log(`   Reason: ${reason}`);
  }
  console.log('');
}

async function expireOld(days: number) {
  const count = await actionQueue.expireOldOpportunities(days);
  console.log(`\n🗑️  Expired ${count} old opportunities (older than ${days} days)\n`);
}

async function viewOpportunity(id: string) {
  if (!id) {
    console.error('❌ Error: Opportunity ID required');
    console.log('Usage: npm run queue view <id>');
    process.exit(1);
  }

  const opp = await actionQueue.getOpportunity(id);
  if (!opp) {
    console.error(`❌ Error: Opportunity not found: ${id}`);
    process.exit(1);
  }

  console.log('\n📋 Opportunity Details');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log(`  ID:          ${opp.id}`);
  console.log(`  Title:       ${opp.title}`);
  console.log(`  Type:        ${opp.opportunityType}`);
  console.log(`  Status:      ${opp.status}`);
  console.log(`  Priority:    ${opp.priority}/10`);
  console.log(`  Confidence:  ${(Number(opp.confidence) * 100).toFixed(0)}%`);
  console.log(`  Est. Impact: $${opp.estimatedRevenueImpact ? Number(opp.estimatedRevenueImpact).toFixed(2) : 'Unknown'}`);
  console.log(`  Page URL:    ${opp.pageUrl ?? 'N/A'}`);
  console.log(`  Mod ID:      ${opp.modId ?? 'N/A'}`);
  console.log(`  Category:    ${opp.category ?? 'N/A'}`);
  console.log(`  Created:     ${opp.createdAt.toISOString()}`);
  console.log('\n  Description:');
  console.log(`  ${opp.description}`);

  console.log('\n  Actions:');
  for (const action of opp.actions) {
    console.log(`  ├─ [${action.status}] ${action.actionType}`);
    console.log(`  │  Data: ${JSON.stringify(action.actionData)}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');
}

async function main() {
  const [command, arg1, arg2] = process.argv.slice(2);

  if (!command || !COMMANDS.includes(command)) {
    console.log('\n📋 Queue Management CLI');
    console.log('═══════════════════════════════════════');
    console.log('\nUsage:');
    console.log('  npm run queue stats         - Show queue statistics');
    console.log('  npm run queue list          - List pending opportunities');
    console.log('  npm run queue approve <id>  - Approve an opportunity');
    console.log('  npm run queue reject <id>   - Reject an opportunity');
    console.log('  npm run queue expire [days] - Expire old opportunities (default: 30)');
    console.log('  npm run queue view <id>     - View opportunity details');
    console.log('');
    process.exit(0);
  }

  try {
    switch (command) {
      case 'stats':
        await showStats();
        break;
      case 'list':
        await listPending();
        break;
      case 'approve':
        await approveOpportunity(arg1);
        break;
      case 'reject':
        await rejectOpportunity(arg1, arg2);
        break;
      case 'expire':
        await expireOld(parseInt(arg1) || 30);
        break;
      case 'view':
        await viewOpportunity(arg1);
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
