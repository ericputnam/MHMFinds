/**
 * Subscriber → account invite sender (Cass, E233, 2026-10-18). Tier 1 send.
 *
 *   npx tsx scripts/agents/subscriber-invite-send.ts --dry [--limit N] [--preview-out <path>]
 *   SUBSCRIBER_INVITE_ENABLED=true npx tsx scripts/agents/subscriber-invite-send.ts --live [--limit N]
 *
 * Recipients: `waitlist` subscribers with no `users` row, oldest first, minus
 * anyone already invited (prior live rows in reports/funnel/invite-sends.jsonl OR
 * NotificationLog event `invite-01`), minus EXCLUDED_RECIPIENT_HASHES, minus every
 * reject hash a live weekly send recorded. At most INVITE_HARD_CAP per run. All of
 * that lives in `lib/services/subscriberInvite.ts`; this file is I/O only.
 *
 * Exactly one of --dry / --live is required (no default on a send script). --live is
 * refused unless SUBSCRIBER_INVITE_ENABLED=true is in THIS process's environment — set
 * on the command line for one run, never written to .env.local. Unknown flags stop the
 * run (the 09-24 `--dry-run` typo lesson).
 *
 * Output and ledger are counts + sha256 hashes only. No address is printed, logged or
 * stored. The email carries no token (see the library header for why), and sendBulk
 * passes skipLog so no body reaches notification_logs.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { sendBulk, resolvePostalAddress } from '../../lib/services/bulkMailer';
import { collectRejects } from '../../lib/services/newsletterWeekly';
import {
  INVITE_CAMPAIGN,
  INVITE_HARD_CAP,
  INVITE_SITE,
  INVITE_SUBJECT,
  hashList,
  invitedHashesFromRecords,
  parseJsonl,
  renderInvite,
  selectInviteRecipients,
  weeklyRejectHashesFromRecords,
} from '../../lib/services/subscriberInvite';

const LEDGER_PATH = 'reports/funnel/invite-sends.jsonl';
const WEEKLY_LEDGER_PATH = 'reports/funnel/newsletter-sends.jsonl';
const LOG_PATH = 'logs/invite-send.log';
const REPLY_TO = 'simsnews@musthavemods.com';

const args = process.argv.slice(2);
const KNOWN = new Set(['--dry', '--live', '--limit', '--preview-out']);
const WITH_VALUE = new Set(['--limit', '--preview-out']);
for (let i = 0; i < args.length; i++) {
  if (!KNOWN.has(args[i])) {
    console.error(`unknown argument "${args[i].startsWith('--') ? args[i] : '<value>'}" — refusing to run (dry switch is --dry)`);
    process.exit(1);
  }
  if (WITH_VALUE.has(args[i])) i++;
}
const arg = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const dry = args.includes('--dry');
const live = args.includes('--live');
const limit = Number(arg('--limit') ?? 0) || 0;
const previewOut = arg('--preview-out');
if (dry === live) { console.error('need exactly one of --dry (select + render + count) or --live (send)'); process.exit(1); }
if (live && process.env.SUBSCRIBER_INVITE_ENABLED !== 'true') {
  console.error('--live refused: SUBSCRIBER_INVITE_ENABLED=true must be set in this process\'s environment (the Tier 1 send authorization). Run --dry first.');
  process.exit(1);
}

function readJsonl(path: string): unknown[] {
  return existsSync(path) ? parseJsonl(readFileSync(path, 'utf8')) : [];
}

function ledger(entry: Record<string, unknown>): void {
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n';
  for (const p of [LOG_PATH, LEDGER_PATH]) {
    mkdirSync(p.slice(0, p.lastIndexOf('/')), { recursive: true });
    appendFileSync(p, line);
  }
}

async function main() {
  if (!process.env.DIRECT_DATABASE_URL) throw new Error('needs DIRECT_DATABASE_URL');
  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_DATABASE_URL });
  try {
    const waitlist = await prisma.waitlist.findMany({
      select: { email: true, createdAt: true, id: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    // Case-insensitive account match: users.email is stored lower-cased by signup, but
    // OAuth providers may not be — never invite someone who already has an account.
    const accountRows = await prisma.$queryRaw<Array<{ email: string }>>`
      SELECT lower(trim(w.email)) AS email FROM waitlist w
      WHERE EXISTS (SELECT 1 FROM users u WHERE lower(trim(u.email)) = lower(trim(w.email)))`;
    const dbInviteRows = await prisma.notificationLog.findMany({
      where: { event: INVITE_CAMPAIGN },
      select: { body: true },
    });
    const dbRecords = dbInviteRows.map((r) => { try { return JSON.parse(r.body); } catch { return null; } });
    const invitedHashes = invitedHashesFromRecords([...readJsonl(LEDGER_PATH), ...dbRecords]);
    const weeklyRejectHashes = weeklyRejectHashesFromRecords(readJsonl(WEEKLY_LEDGER_PATH));

    const sel = selectInviteRecipients({
      waitlist,
      accountEmails: accountRows.map((r) => r.email),
      invitedHashes,
      weeklyRejectHashes,
      limit,
    });

    const postalAddress = resolvePostalAddress();
    const result = await sendBulk({
      recipients: sel.recipients,
      dryRun: !live,
      maxMessages: INVITE_HARD_CAP,
      site: INVITE_SITE,
      replyTo: REPLY_TO,
      fromName: 'MustHaveMods',
      postalAddress,
      build: ({ unsubscribeUrl }) => renderInvite({ unsubscribeUrl, postalAddress, site: INVITE_SITE }),
    });

    const summary: Record<string, unknown> = {
      kind: INVITE_CAMPAIGN,
      mode: live ? 'live' : 'dry',
      subject: INVITE_SUBJECT,
      ...sel.counts,
      recipients: sel.recipients.length,
      deferred: sel.deferred + result.deferred.length,
      hardCap: INVITE_HARD_CAP,
      attempted: result.attempted,
      sent: result.sent,
      failed: result.failed,
      transport: result.transport,
    };
    if (live) {
      // Every ATTEMPTED recipient is recorded (sent or rejected), so no one is ever invited twice.
      const attempted = result.results.map((r) => r.email);
      summary.invitedHashes = hashList(attempted);
      const rejects = collectRejects(result.results);
      if (rejects.length) summary.rejects = rejects;
      await prisma.notificationLog.create({
        data: { type: 'digest', channel: 'email', event: INVITE_CAMPAIGN, subject: INVITE_SUBJECT, body: JSON.stringify(summary), success: result.failed === 0 },
      }).catch((e) => console.warn(`[invite] NotificationLog write failed: ${String(e).slice(0, 120)}`));
    }
    ledger(summary);

    if (previewOut) {
      // A sample address, never a subscriber's.
      const sample = renderInvite({ unsubscribeUrl: `${INVITE_SITE}/api/unsubscribe/?e=SAMPLE&t=SAMPLE`, postalAddress, site: INVITE_SITE });
      writeFileSync(previewOut, sample.html);
    }

    const printable = { ...summary };
    delete printable.invitedHashes;
    console.log(JSON.stringify(printable, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // Never echo a transport error verbatim: SMTP servers quote the recipient.
  console.error(`[invite] failed: ${String(e).replace(/[^\s@]+@[^\s@]+/g, '<redacted>').slice(0, 300)}`);
  process.exit(1);
});
