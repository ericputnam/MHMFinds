/**
 * Test-send newsletter issue #1 and the re-permission email to explicit addresses.
 * Renders exactly what bulkMailer would send to a subscriber (headers, HTML, text).
 *
 *   npx tsx scripts/agents/newsletter-send-test.ts --to a@b.com[,c@d.com] [--only issue|repermission] [--dry]
 *   npx tsx scripts/agents/newsletter-send-test.ts --from-db --only issue [--dry]
 *   npx tsx scripts/agents/newsletter-send-test.ts --accounts-from-db --only repermission [--limit N] [--offset N] [--dry]
 *
 * --from-db loads every row of `waitlist` (people who typed their address into a
 * signup form or ticked the sign-in box; unsubscribes delete the row) so no address
 * is ever pasted into a shell or a log. Only the count is printed. It is the issue #1
 * send path; it does not apply to the re-permission email, which targets accounts.
 *
 * --accounts-from-db is the re-permission path (day-1 warm-up segment of
 * `reports/funnel/drafts/re-permission-email-2026-09-08.md` §5): registered accounts
 * with >=1 favourite, created in the last REPERMISSION_ENGAGED_DAYS days, not already in
 * `waitlist`. Capped at REPERMISSION_HARD_CAP per run no matter what --limit says;
 * --offset pages through a segment larger than the cap on later days. Counts only.
 *
 * Every run — dry or live, any source — appends one counts-only line to
 * LEDGER_PATH (tracked) and logs/newsletter-send.log (gitignored). Issue #1 went out
 * on 2026-09-14 and the only proof was a bounce in the sending mailbox, because
 * bulkMailer passes skipLog and this script wrote nothing. Never again.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { appendFileSync, mkdirSync, writeFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { sendBulk, resolvePostalAddress } from '../../lib/services/bulkMailer';
import { buildConfirmUrl } from '../../lib/services/subscribeConfirm';
import { ISSUE_01, renderIssue } from '../../lib/services/newsletterIssue';
import { partitionExcluded, EXCLUDED_RECIPIENT_HASHES } from '../../lib/services/sendExclusions';

const SITE = 'https://musthavemods.com';
const REPLY_TO = 'simsnews@musthavemods.com';
// CAN-SPAM requires a valid postal address in every commercial email. It comes from
// EMAIL_POSTAL_ADDRESS; bulkMailer refuses a real send without it. A dry run may render
// without it so copy can be reviewed — the footer line is simply omitted, never faked.
const POSTAL_ADDRESS = resolvePostalAddress();
const ADDRESS_LINE = POSTAL_ADDRESS ? `MustHaveMods · ${POSTAL_ADDRESS}` : '';

/** Counts-only send ledger, one JSON line per run. Tracked so a later run can prove a send happened. */
const LEDGER_PATH = 'reports/funnel/newsletter-sends.jsonl';
const LOG_PATH = 'logs/newsletter-send.log';
/** Re-permission day-1 ceiling per run (draft §5: ~100, bounce < 3% before day 3). Code-only. */
const REPERMISSION_HARD_CAP = 100;
/** Day-1 segment: engaged accounts created within this many days. */
const REPERMISSION_ENGAGED_DAYS = 90;
/**
 * The segment is frozen at the moment the day-1 batch went out (the live ledger
 * line in reports/funnel/newsletter-sends.jsonl). Both the 90-day window and the
 * "already in waitlist" exclusion are evaluated as of this instant, so --offset N
 * on any later day pages through the SAME ordered list day-1 was cut from.
 * Without the anchor the window slides a day per day and every consent since
 * drops a row out of the front of the list, shifting every index and silently
 * skipping accounts that were never attempted. Accounts that consented AFTER the
 * anchor are still removed from the slice (they said yes; never ask twice), and
 * hard-bounced accounts are removed by EXCLUDED_RECIPIENT_HASHES — but both are
 * removed from the slice, not from the list, so the paging stays aligned.
 */
const REPERMISSION_ANCHOR_AT = new Date('2026-09-16T10:51:19.626Z');

const args = process.argv.slice(2);
const arg = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const fromDb = args.includes('--from-db');
const accountsFromDb = args.includes('--accounts-from-db');
const only = arg('--only');
const dry = args.includes('--dry');
const limitArg = Number(arg('--limit') ?? 0);
const offsetArg = Math.max(0, Number(arg('--offset') ?? 0) || 0);
if (!fromDb && !accountsFromDb && !arg('--to')) { console.error('need --to a@b.com[,c@d.com], --from-db or --accounts-from-db'); process.exit(1); }
if (fromDb && accountsFromDb) { console.error('pick one of --from-db / --accounts-from-db'); process.exit(1); }
if (fromDb && only !== 'issue') { console.error('--from-db is the issue send path: pass --only issue'); process.exit(1); }
if (accountsFromDb && only !== 'repermission') { console.error('--accounts-from-db is the re-permission path: pass --only repermission'); process.exit(1); }
/** True when addresses came from the DB: nothing per-recipient may reach the terminal or a log. */
const dbSourced = fromDb || accountsFromDb;

function directPrisma(): PrismaClient {
  if (!process.env.DIRECT_DATABASE_URL) throw new Error('DB-sourced recipients need DIRECT_DATABASE_URL');
  return new PrismaClient({ datasourceUrl: process.env.DIRECT_DATABASE_URL });
}

/** Subscriber addresses from the DB (direct connection, like funnel-scoreboard.ts). Never printed. */
async function loadRecipients(): Promise<string[]> {
  if (accountsFromDb) return loadAccounts();
  if (!fromDb) return (arg('--to') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const prisma = directPrisma();
  try {
    const rows = await prisma.waitlist.findMany({ select: { email: true }, orderBy: { createdAt: 'asc' } });
    const list = Array.from(new Set(rows.map((r) => r.email.trim().toLowerCase()).filter((e) => e.includes('@'))));
    console.log(`recipients: ${list.length} from waitlist (${rows.length} rows)`);
    return list;
  } finally {
    await prisma.$disconnect();
  }
}

/** Counts from the last re-permission selection, for the ledger line. Never addresses. */
let repermissionCounts: {
  segment: number;
  consentedSince: number;
  excludedInSlice: number;
  excludedInSegment: number;
  excludedBeforeOffset: number;
  exclusionList: number;
} | undefined;

/**
 * Re-permission segment, frozen at REPERMISSION_ANCHOR_AT. Deterministic order
 * (oldest first) so --offset pages without overlap across days. Anyone in `waitlist`
 * at the anchor was excluded from the list on day-1 and still is; anyone who joined
 * `waitlist` since (consented, by re-permission or any other surface) and anyone on
 * the hard-bounce exclusion list is dropped from the SLICE. Never printed.
 */
async function loadAccounts(): Promise<string[]> {
  const prisma = directPrisma();
  try {
    const waitlistRows = await prisma.waitlist.findMany({ select: { email: true, createdAt: true } });
    const norm = (e: string) => e.trim().toLowerCase();
    const optedInAtAnchor = new Set(
      waitlistRows.filter((r) => r.createdAt < REPERMISSION_ANCHOR_AT).map((r) => norm(r.email))
    );
    const optedInSince = new Set(
      waitlistRows.filter((r) => r.createdAt >= REPERMISSION_ANCHOR_AT).map((r) => norm(r.email))
    );
    const since = new Date(REPERMISSION_ANCHOR_AT.getTime() - REPERMISSION_ENGAGED_DAYS * 24 * 60 * 60 * 1000);
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: since, lt: REPERMISSION_ANCHOR_AT }, favorites: { some: {} } },
      select: { email: true },
      orderBy: { createdAt: 'asc' },
    });
    const segment = Array.from(
      new Set(
        users
          .map((u) => norm(u.email))
          .filter((e) => e.includes('@') && !e.endsWith('@admin.local') && !optedInAtAnchor.has(e))
      )
    );
    const cap = Math.min(REPERMISSION_HARD_CAP, limitArg > 0 ? Math.floor(limitArg) : REPERMISSION_HARD_CAP);
    const slice = segment.slice(offsetArg, offsetArg + cap);
    // Vacuity guard on the exclusion list: if none of its hashes matches anyone in the
    // segment, the hashes are wrong (or the segment is), and the run must not pretend
    // the dead addresses are handled.
    const { kept: segmentKept } = partitionExcluded(segment);
    const excludedInSegment = segment.length - segmentKept.length;
    if (EXCLUDED_RECIPIENT_HASHES.length > 0 && excludedInSegment === 0) {
      throw new Error(
        `re-permission: EXCLUDED_RECIPIENT_HASHES has ${EXCLUDED_RECIPIENT_HASHES.length} entries but none ` +
          'matches an account in the segment — refusing to run on an exclusion list that excludes nobody'
      );
    }
    // How many of the matches sit before this offset, i.e. inside batches already sent.
    // On day-2 that number must equal the whole list: every hash came from day-1's DSNs,
    // so if the frozen segment reproduces day-1 they are all in [0, 100).
    const beforeOffset = segment.slice(0, offsetArg);
    const excludedBeforeOffset = beforeOffset.length - partitionExcluded(beforeOffset).kept.length;
    const { kept: notExcluded, excluded } = partitionExcluded(slice);
    const list = notExcluded.filter((e) => !optedInSince.has(e));
    const consentedSince = notExcluded.length - list.length;
    repermissionCounts = {
      segment: segment.length,
      consentedSince,
      excludedInSlice: excluded.length,
      excludedInSegment,
      excludedBeforeOffset,
      exclusionList: EXCLUDED_RECIPIENT_HASHES.length,
    };
    console.log(
      `segment (frozen ${REPERMISSION_ANCHOR_AT.toISOString()}): ${segment.length} accounts ` +
        `(>=1 favourite, created <=${REPERMISSION_ENGAGED_DAYS}d before the anchor, not in waitlist at the anchor)`
    );
    console.log(
      `exclusion list: ${EXCLUDED_RECIPIENT_HASHES.length} hashes → matched ${excludedInSegment} in the segment ` +
        `(${excludedBeforeOffset} before offset ${offsetArg}, ${excluded.length} in this slice); ` +
        `consented since the anchor and dropped from this slice: ${consentedSince}`
    );
    console.log(`recipients: ${list.length} (offset ${offsetArg}, cap ${cap}, slice ${slice.length})`);
    return list;
  } finally {
    await prisma.$disconnect();
  }
}

/** One counts-only line per run. Never an address, never a subject line with an address in it. */
function writeLedger(entry: Record<string, unknown>): void {
  const line = JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n';
  for (const path of [LOG_PATH, LEDGER_PATH]) {
    try {
      mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
      appendFileSync(path, line);
    } catch (e) {
      console.warn(`[warn] ledger not written to ${path}: ${String(e).slice(0, 80)}`);
    }
  }
  console.log(`ledger → ${LEDGER_PATH}`);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const F = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
const shell = (_preheader: string, body: string, footer: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="${F}max-width:600px;margin:0 auto;padding:24px 20px;color:#1f2937;font-size:16px;line-height:1.5;">
${body}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px;">
<p style="font-size:12px;color:#9ca3af;line-height:1.5;margin:0;">${footer}</p>
</div></body></html>`;

// ---------- Issue #1 ----------
// The issue itself is the site-styled template in lib/services/newsletterIssue.ts
// (operator-approved v2 mock, 2026-09-12: no gradients, no glow, no pills, no
// emoji, no hidden preheader). ISSUE_01 carries the week's six posts and the
// four most-saved mods; renderIssue() takes the unsubscribe link and the
// CAN-SPAM address from the caller, never from a hardcoded string.
const MUTED = 'color:#6b7280;';

// ---------- Re-permission ----------
function rePermHtml(confirmUrl: string, unsubscribeUrl: string): string {
  const body = `
<p>Hi —</p>
<p>You created a free account at musthavemods.com and saved some CC. We have never sent you anything, and we are not going to start without asking.</p>
<p>We're launching a weekly email: the CC and mods worth your download slot, one email a week, nothing else. Want it?</p>
<p style="margin:24px 0;"><a href="${confirmUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:6px;">Yes, send it</a></p>
<p style="${MUTED}font-size:13px;word-break:break-all;">Or copy this link: ${confirmUrl}</p>
<p>If you don't click, nothing happens. You stay signed up for the site, your saved finds stay where they are, and you will not get this email again.</p>
<p>— The MustHaveMods team</p>`;
  const footer = `You're receiving this one message because you have an account at musthavemods.com. This is not a marketing email and there is nothing to unsubscribe from — we're asking permission before there is. ${esc(ADDRESS_LINE)}<br>Never want to hear from us again, not even to ask? <a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a>.`;
  return shell("You have an account at MustHaveMods. We've never emailed you. Only click if you want us to start.", body, footer);
}
function rePermText(confirmUrl: string): string {
  return `Hi —

You created a free account at musthavemods.com and saved some CC. We have
never sent you anything, and we are not going to start without asking.

We're launching a weekly email: the CC and mods worth your download slot,
one email a week, nothing else. Want it?

  YES, SEND IT: ${confirmUrl}

If you don't click, nothing happens. You stay signed up for the site, your
saved finds stay where they are, and you will not get this email again.

— The MustHaveMods team

You're receiving this one message because you have an account at
musthavemods.com. This is not a marketing email and there is nothing to
unsubscribe from — we're asking permission before there is.
${ADDRESS_LINE}
`;
}

async function main() {
  if (!POSTAL_ADDRESS) {
    console.warn(
      '[warn] EMAIL_POSTAL_ADDRESS is not set: the CAN-SPAM footer line is omitted. ' +
        'Dry runs still render; a real send will be refused by bulkMailer.'
    );
  }
  const recipients = await loadRecipients();
  if (!recipients.length) { console.error('no recipients'); process.exit(1); }
  const common = {
    recipients,
    dryRun: dry,
    site: SITE,
    replyTo: REPLY_TO,
    fromName: 'MustHaveMods',
    postalAddress: POSTAL_ADDRESS,
  };
  const source = fromDb ? 'from-db' : accountsFromDb ? 'accounts-from-db' : 'to';
  const ledgerOf = (kind: string, subject: string, r: Awaited<ReturnType<typeof sendBulk>>) => ({
    kind,
    subject,
    mode: dry ? 'dry' : 'live',
    source,
    site: SITE,
    transport: r.transport,
    recipients: recipients.length,
    attempted: r.attempted,
    sent: r.sent,
    failed: r.failed,
    skipped: r.skipped.length,
    deferred: r.deferred.length,
    batches: r.batches,
    hourlyLimit: r.hourlyLimit,
    offset: accountsFromDb ? offsetArg : undefined,
    ...(accountsFromDb && repermissionCounts ? { anchor: REPERMISSION_ANCHOR_AT.toISOString(), ...repermissionCounts } : {}),
    cwd: process.cwd(),
  });
  if (only !== 'repermission') {
    const r = await sendBulk({ ...common, build: ({ unsubscribeUrl }) =>
      renderIssue(ISSUE_01, { unsubscribeUrl, postalAddress: POSTAL_ADDRESS, site: SITE }) });
    // With --from-db the per-address status stays out of the terminal and any log; counts only.
    const detail = dbSourced
      ? `errors: ${r.results.filter((x) => x.error).length}`
      : r.results.map((x) => `${x.email}:${x.sent ? 'ok' : x.error ?? 'dry'}`).join(' ');
    console.log(`issue-01     → attempted ${r.attempted} sent ${r.sent} failed ${r.failed}`, detail);
    writeLedger(ledgerOf('issue-01', ISSUE_01.subject, r));
    if (dry) writeFileSync('/tmp/issue-01-preview.html', r.results[0].preview!.html);
  }
  if (only !== 'issue') {
    const subject = 'Do you want the weekly Sims 4 finds email?';
    const r = await sendBulk({ ...common, build: ({ email, unsubscribeUrl }) => {
      // Real, per-recipient, HMAC-signed consent link (live since PR #76). The token is
      // domain-separated from the unsubscribe token, so this link can only ever subscribe.
      // It must be signed with the SAME UNSUBSCRIBE_SECRET that production verifies with,
      // or every link is a 400 — the failure that killed the 09-08 test send's footer links.
      const confirmUrl = buildConfirmUrl(email, SITE);
      return { subject, html: rePermHtml(confirmUrl, unsubscribeUrl), text: rePermText(confirmUrl) };
    } });
    const detail = dbSourced
      ? `errors: ${r.results.filter((x) => x.error).length}`
      : r.results.map((x) => `${x.email}:${x.sent ? 'ok' : x.error ?? 'dry'}`).join(' ');
    console.log(`re-permission → attempted ${r.attempted} sent ${r.sent} failed ${r.failed}`, detail);
    writeLedger(ledgerOf('re-permission', subject, r));
    if (dry) writeFileSync('/tmp/re-permission-preview.html', r.results[0].preview!.html);
  }
}
// The pooled SMTP transport keeps the event loop alive; exit explicitly once every sendMail has resolved.
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
