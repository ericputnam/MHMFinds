/**
 * Test-send newsletter issue #1 and the re-permission email to explicit addresses.
 * Renders exactly what bulkMailer would send to a subscriber (headers, HTML, text).
 *
 *   npx tsx scripts/agents/newsletter-send-test.ts --to a@b.com[,c@d.com] [--only issue|repermission] [--dry]
 *   npx tsx scripts/agents/newsletter-send-test.ts --from-db --only issue [--dry]
 *
 * --from-db loads every row of `waitlist` (people who typed their address into a
 * signup form or ticked the sign-in box; unsubscribes delete the row) so no address
 * is ever pasted into a shell or a log. Only the count is printed. It is the issue #1
 * send path; it does not apply to the re-permission email, which targets accounts.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { writeFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { sendBulk, resolvePostalAddress } from '../../lib/services/bulkMailer';
import { buildConfirmUrl } from '../../lib/services/subscribeConfirm';
import { ISSUE_01, renderIssue } from '../../lib/services/newsletterIssue';

const SITE = 'https://musthavemods.com';
const REPLY_TO = 'simsnews@musthavemods.com';
// CAN-SPAM requires a valid postal address in every commercial email. It comes from
// EMAIL_POSTAL_ADDRESS; bulkMailer refuses a real send without it. A dry run may render
// without it so copy can be reviewed — the footer line is simply omitted, never faked.
const POSTAL_ADDRESS = resolvePostalAddress();
const ADDRESS_LINE = POSTAL_ADDRESS ? `MustHaveMods · ${POSTAL_ADDRESS}` : '';

const args = process.argv.slice(2);
const arg = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const fromDb = args.includes('--from-db');
const only = arg('--only');
const dry = args.includes('--dry');
if (!fromDb && !arg('--to')) { console.error('need --to a@b.com[,c@d.com] or --from-db'); process.exit(1); }
if (fromDb && only !== 'issue') { console.error('--from-db is the issue send path: pass --only issue'); process.exit(1); }

/** Subscriber addresses from the DB (direct connection, like funnel-scoreboard.ts). Never printed. */
async function loadRecipients(): Promise<string[]> {
  if (!fromDb) return (arg('--to') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!process.env.DIRECT_DATABASE_URL) throw new Error('--from-db needs DIRECT_DATABASE_URL');
  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_DATABASE_URL });
  try {
    const rows = await prisma.waitlist.findMany({ select: { email: true }, orderBy: { createdAt: 'asc' } });
    const list = Array.from(new Set(rows.map((r) => r.email.trim().toLowerCase()).filter((e) => e.includes('@'))));
    console.log(`recipients: ${list.length} from waitlist (${rows.length} rows)`);
    return list;
  } finally {
    await prisma.$disconnect();
  }
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
  if (only !== 'repermission') {
    const r = await sendBulk({ ...common, build: ({ unsubscribeUrl }) =>
      renderIssue(ISSUE_01, { unsubscribeUrl, postalAddress: POSTAL_ADDRESS, site: SITE }) });
    // With --from-db the per-address status stays out of the terminal and any log; counts only.
    const detail = fromDb
      ? `errors: ${r.results.filter((x) => x.error).length}`
      : r.results.map((x) => `${x.email}:${x.sent ? 'ok' : x.error ?? 'dry'}`).join(' ');
    console.log(`issue-01     → attempted ${r.attempted} sent ${r.sent} failed ${r.failed}`, detail);
    if (dry) writeFileSync('/tmp/issue-01-preview.html', r.results[0].preview!.html);
  }
  if (only !== 'issue') {
    const r = await sendBulk({ ...common, build: ({ email, unsubscribeUrl }) => {
      // Real, per-recipient, HMAC-signed consent link (live since PR #76). The token is
      // domain-separated from the unsubscribe token, so this link can only ever subscribe.
      // It must be signed with the SAME UNSUBSCRIBE_SECRET that production verifies with,
      // or every link is a 400 — the failure that killed the 09-08 test send's footer links.
      const confirmUrl = buildConfirmUrl(email, SITE);
      return { subject: 'Do you want the weekly Sims 4 finds email?', html: rePermHtml(confirmUrl, unsubscribeUrl), text: rePermText(confirmUrl) };
    } });
    console.log(`re-permission → attempted ${r.attempted} sent ${r.sent} failed ${r.failed}`, r.results.map((x) => `${x.email}:${x.sent ? 'ok' : x.error ?? 'dry'}`).join(' '));
  }
}
// The pooled SMTP transport keeps the event loop alive; exit explicitly once every sendMail has resolved.
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
