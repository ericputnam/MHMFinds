/**
 * Scripted-shaped `signup-optin` subscribers → sha256 hashes (Cass, E270, 2026-10-25).
 *
 *   npx tsx scripts/agents/scripted-signup-hashes.ts            # counts only
 *   npx tsx scripts/agents/scripted-signup-hashes.ts --hashes   # + the hashes not yet listed
 *
 * Read-only. Joins every `waitlist` row to the account with the same address and applies
 * `scriptedSubscriberHashes` (the E260 rule, lib/funnel/signupQuality.ts) — classified by
 * rule, never hand-picked. Prints counts and hashes only, never an address. Paste the
 * printed hashes into `SCRIPTED_SIGNUP_HASHES` in lib/services/sendExclusions.ts.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { PrismaClient } from '@prisma/client';

import { loadSubscriberAccountRows } from './_subscriber-account-rows';
import { SCRIPTED_SIGNUP_HASHES, scriptedSubscriberHashes, unlistedScriptedHashes } from '../../lib/services/sendExclusions';

const args = process.argv.slice(2);
for (const a of args) if (a !== '--hashes') { console.error(`unknown flag ${a}`); process.exit(1); }

async function main(): Promise<void> {
  if (!process.env.DIRECT_DATABASE_URL) throw new Error('needs DIRECT_DATABASE_URL');
  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_DATABASE_URL });
  try {
    const rows = await loadSubscriberAccountRows(prisma);
    const optIn = rows.filter((r) => r.source === 'signup-optin').length;
    const current = scriptedSubscriberHashes(rows);
    const unlisted = unlistedScriptedHashes(current);
    console.log(`waitlist rows ${rows.length} · signup-optin ${optIn} · scripted-shaped ${current.length} · listed ${SCRIPTED_SIGNUP_HASHES.length} · unlisted ${unlisted.length}`);
    if (args.includes('--hashes')) for (const h of unlisted) console.log(`  '${h}', // E270 scripted-shaped signup-optin`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(String(e).slice(0, 200)); process.exit(1); });
