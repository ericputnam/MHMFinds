/**
 * Newsletter preview / SMTP preflight (Cass, 2026-09-07; --weekly added 2026-09-21)
 *
 * Renders an issue exactly as `bulkMailer` would send it — headers, HTML and
 * the plain-text alternative — and sends nothing. This is the QA gate the
 * operator-queue T1 item asks for before a real issue goes out.
 *
 *   npx tsx scripts/agents/newsletter-preview.ts                 # issue #1 fixture (default)
 *   npx tsx scripts/agents/newsletter-preview.ts --weekly         # this week's DB-built issue
 *     (app/api/cron/weekly-newsletter, lib/services/newsletterWeekly.ts) — real DB read, no send
 *   npx tsx scripts/agents/newsletter-preview.ts --verify        # also open+auth the SMTP connection
 *   npx tsx scripts/agents/newsletter-preview.ts --out <path>    # write the rendered sample to a file
 *
 * It prints which credentials are *present*, never their values.
 */

import { writeFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

import { PrismaClient } from '@prisma/client';
import { previewBulkSend, resolvePostalAddress } from '../../lib/services/bulkMailer';
import { emailNotifier } from '../../lib/services/emailNotifier';
import { ISSUE_01, renderIssue, type IssueData } from '../../lib/services/newsletterIssue';
import { buildWeeklyIssueData, createPrismaDataSource } from '../../lib/services/newsletterWeekly';

/**
 * Standalone script → direct DB connection, like `directPrisma()` in
 * newsletter-send-test.ts. The shared `@/lib/prisma` Accelerate singleton is
 * Next.js-runtime-only; a bare `tsx` process can't resolve `prisma+postgres://`.
 */
function directPrisma(): PrismaClient {
  if (!process.env.DIRECT_DATABASE_URL) throw new Error('--weekly needs DIRECT_DATABASE_URL');
  return new PrismaClient({ datasourceUrl: process.env.DIRECT_DATABASE_URL });
}

const SAMPLE_RECIPIENTS = ['preview@example.com'];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const wantVerify = args.includes('--verify');
  const wantWeekly = args.includes('--weekly');
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? args[outIdx + 1] : undefined;

  const present = (name: string) => (process.env[name] ? 'set' : 'MISSING');

  console.log('Transport:', emailNotifier.transport());
  console.log('  SMTP_HOST :', present('SMTP_HOST'));
  console.log('  SMTP_PORT :', present('SMTP_PORT'));
  console.log('  SMTP_USER :', present('SMTP_USER'));
  console.log('  SMTP_PASS :', present('SMTP_PASS'));
  console.log('  EMAIL_FROM:', present('EMAIL_FROM'));

  if (wantVerify) {
    const verified = await emailNotifier.verifyTransport();
    console.log('Verify   :', verified.ok ? 'OK' : `FAILED (${verified.error ?? 'not configured'})`);
  }

  let issue: IssueData = ISSUE_01;
  if (wantWeekly) {
    console.log('\nBuilding this week\'s issue from the live database (read-only, no send)…');
    const client = directPrisma();
    try {
      issue = await buildWeeklyIssueData(createPrismaDataSource(client));
    } finally {
      await client.$disconnect();
    }
    console.log(`Built issue #${issue.number}: "${issue.subject}" (${issue.posts.length} posts, ${issue.saved.length} saved mods).`);
  }

  const preview = await previewBulkSend({
    recipients: SAMPLE_RECIPIENTS,
    build: ({ unsubscribeUrl }) =>
      renderIssue(issue, { unsubscribeUrl, postalAddress: resolvePostalAddress() }),
  });

  const sample = preview.results[0];
  console.log('\n--- headers ---');
  for (const [k, v] of Object.entries(sample.headers)) console.log(`${k}: ${v}`);
  console.log('\n--- plain text ---');
  console.log(sample.preview?.text ?? '(none)');
  console.log(
    `\nRendered ${preview.attempted} message(s), sent 0. Hourly limit ${preview.hourlyLimit}, ${preview.batches} batch(es).`
  );

  if (outPath) {
    writeFileSync(outPath, sample.preview?.html ?? '', 'utf8');
    console.log(`HTML written to ${outPath}`);
  }
}

main().catch((error) => {
  console.error('newsletter-preview failed:', error);
  process.exit(1);
});
