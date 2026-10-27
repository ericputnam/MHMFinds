/**
 * Record unsubscribe requests that arrived by email (2026-10-26).
 *
 *   npx tsx scripts/agents/process-unsubscribe-mailbox.ts            # read + count only
 *   npx tsx scripts/agents/process-unsubscribe-mailbox.ts --apply    # also record them
 *   npx tsx scripts/agents/process-unsubscribe-mailbox.ts --since 2026-10-01 --apply
 *
 * Reads the sending mailbox read-only (`mailbox-unsubscribe-requests.py`) and
 * upserts each request into `email_suppressions` by hash. Idempotent. The send
 * scripts run the same sync before every LIVE send; this CLI is for running it on
 * its own (e.g. daily, or to check the mailbox is readable before a send day).
 *
 * Counts only — no address is printed. Exit codes: 0 ok, 2 could not run
 * (mailbox or database unreachable). Recording an unsubscribe only ever stops
 * mail, so `--apply` needs no send authorization.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { PrismaClient } from '@prisma/client';

import { describeSync, MailboxCouldNotRun, syncUnsubscribeMailbox } from './unsubscribe-mailbox-lib';

const args = process.argv.slice(2);
const KNOWN = new Set(['--apply', '--since']);
for (let i = 0; i < args.length; i++) {
  if (!KNOWN.has(args[i])) {
    console.error(`unknown argument "${args[i]}" (known: ${Array.from(KNOWN).join(', ')})`);
    process.exit(2);
  }
  if (args[i] === '--since') i++;
}
const apply = args.includes('--apply');
const sinceIdx = args.indexOf('--since');
const since = sinceIdx >= 0 ? args[sinceIdx + 1] : undefined;
if (sinceIdx >= 0 && !/^\d{4}-\d{2}-\d{2}$/.test(since ?? '')) {
  console.error('--since needs YYYY-MM-DD');
  process.exit(2);
}

async function main(): Promise<number> {
  if (!process.env.DIRECT_DATABASE_URL) {
    console.error('could-not-run: needs DIRECT_DATABASE_URL');
    return 2;
  }
  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_DATABASE_URL });
  try {
    const r = await syncUnsubscribeMailbox(prisma, { apply, since });
    console.log(describeSync(r));
    console.log(`  mailbox: ${JSON.stringify(r.readerCounts)}`);
    return 0;
  } catch (e) {
    const why = e instanceof MailboxCouldNotRun ? e.message : `database error (${(e as { code?: string })?.code ?? 'unknown'})`;
    console.error(`could-not-run: ${why}`);
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((code) => process.exit(code));
