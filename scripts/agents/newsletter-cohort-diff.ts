/**
 * newsletter-cohort-diff.ts — counts-only comparison of the weekly-issue send cohorts (Cass, E240).
 *
 *   npx tsx scripts/agents/newsletter-cohort-diff.ts [--dsn-hashes <file>]
 *
 * Issue 05 (97 sent) and issue-06 run 1 (99 sent) produced 0 `weekly-issue-*` GA4 sessions while
 * issue-06 run 2 (53 sent) produced 30. Before blaming inbox placement, this prints what differs
 * between the three recipient cohorts: subscriber source, mailbox-provider class, account overlap,
 * subscribe-date spread, and how many of each cohort's addresses hard-bounced (matched against the
 * sha256 list `mailbox-dsn-count.py --hashes` prints, one hash per line in `--dsn-hashes`).
 *
 * Cohorts are re-derived from today's `waitlist` (unsubscribes delete the row, so a cohort can be
 * a row or two smaller than the ledger's `recipients`), cut at the ledger's own instants:
 *   issue-05  createdAt <= ISSUE_05_AT                       (send had no orderBy: everyone)
 *   06-run1   createdAt <= RUN1_CURSOR                          (oldest-first, cursor = last attempted)
 *   06-run2   RUN1_CURSOR < createdAt <= RUN2_AT                (`--resume-after` tail)
 * Exclusion-list rows are dropped first, exactly as the send did.
 *
 * Never prints an address, a domain outside the five provider classes, or an env value.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { hashRecipient, isExcludedRecipient } from '../../lib/services/sendExclusions';

/** Instants copied from the live rows of reports/funnel/newsletter-sends.jsonl. */
export const ISSUE_05_AT = new Date('2026-10-11T15:34:27.310Z');
export const RUN1_CURSOR = new Date('2026-10-12T09:03:19.387Z');
export const RUN2_AT = new Date('2026-10-16T11:43:57.812Z');

/** Provider class from the domain. Only these five labels ever reach the terminal. */
export function providerClass(email: string): 'gmail' | 'microsoft' | 'yahoo-aol' | 'apple' | 'other' {
  const d = email.trim().toLowerCase().split('@')[1] ?? '';
  if (/^(gmail|googlemail)\.com$/.test(d)) return 'gmail';
  if (/^(outlook|hotmail|live|msn)\.[a-z.]+$/.test(d)) return 'microsoft';
  if (/^(yahoo|ymail|rocketmail|aol)\.[a-z.]+$/.test(d)) return 'yahoo-aol';
  if (/^(icloud|me|mac)\.com$/.test(d)) return 'apple';
  return 'other';
}

type Row = { email: string; source: string; createdAt: Date };

function tally<T extends string>(xs: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of xs) out[x] = (out[x] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--dsn-hashes');
  const dsn = new Set(
    i >= 0 ? readFileSync(args[i + 1], 'utf8').split(/\s+/).filter((h) => /^[0-9a-f]{64}$/.test(h)) : []
  );
  if (!process.env.DIRECT_DATABASE_URL) { console.error('could-not-run: DIRECT_DATABASE_URL missing'); process.exit(2); }
  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_DATABASE_URL });
  try {
    const all: Row[] = (await prisma.waitlist.findMany({
      select: { email: true, source: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })).filter((r) => r.email.includes('@') && !isExcludedRecipient(r.email));
    const users = await prisma.user.findMany({ select: { email: true } });
    const accounts = new Set(users.map((u) => (u.email ?? '').trim().toLowerCase()));
    const cohorts: Record<string, Row[]> = {
      'issue-05': all.filter((r) => r.createdAt <= ISSUE_05_AT),
      '06-run1': all.filter((r) => r.createdAt <= RUN1_CURSOR),
      '06-run2': all.filter((r) => r.createdAt > RUN1_CURSOR && r.createdAt <= RUN2_AT),
    };
    console.log(`waitlist rows (minus exclusion list): ${all.length}; dsn hashes loaded: ${dsn.size}`);
    for (const [name, rows] of Object.entries(cohorts)) {
      const hits = rows.filter((r) => dsn.has(hashRecipient(r.email))).length;
      const first = rows[0]?.createdAt.toISOString().slice(0, 10);
      const last = rows[rows.length - 1]?.createdAt.toISOString().slice(0, 10);
      console.log(`\n${name}: ${rows.length} rows, subscribed ${first} → ${last}`);
      console.log(`  source:   ${JSON.stringify(tally(rows.map((r) => r.source)))}`);
      console.log(`  provider: ${JSON.stringify(tally(rows.map((r) => providerClass(r.email))))}`);
      console.log(`  has account: ${rows.filter((r) => accounts.has(r.email.trim().toLowerCase())).length}`);
      const bounced = rows.filter((r) => dsn.has(hashRecipient(r.email)));
      console.log(`  hard-bounced (DSN hash match): ${hits} by provider ${JSON.stringify(tally(bounced.map((r) => providerClass(r.email))))}`);
      // A count of distinct domains, never the domains themselves.
      const others = rows.filter((r) => providerClass(r.email) === 'other').map((r) => r.email.split('@')[1].toLowerCase());
      console.log(`  'other' provider: ${others.length} rows over ${new Set(others).size} distinct domains`);
    }
    // run1 ⊇ issue-05, so count each DSN hash once over the union of issue-05/run1 and run2.
    const union = new Set([...cohorts['06-run1'], ...cohorts['06-run2']].map((r) => hashRecipient(r.email)));
    const unmatched = Array.from(dsn).filter((h) => !union.has(h)).length;
    console.log(`\nDSN hashes matching no cohort row (unsubscribed/deleted since, or other mail): ${unmatched}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith('newsletter-cohort-diff.ts')) {
  main().catch((e) => { console.error(String(e).slice(0, 200)); process.exit(1); });
}
