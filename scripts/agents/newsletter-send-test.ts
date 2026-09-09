/**
 * Test-send newsletter issue #1 and the re-permission email to explicit addresses.
 * Renders exactly what bulkMailer would send to a subscriber (headers, HTML, text).
 *
 *   npx tsx scripts/agents/newsletter-send-test.ts --to a@b.com[,c@d.com] [--only issue|repermission] [--dry]
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { writeFileSync } from 'fs';
import { sendBulk } from '../../lib/services/bulkMailer';

const SITE = 'https://musthavemods.com';
const REPLY_TO = 'simsnews@musthavemods.com';
// CAN-SPAM requires a valid postal address in every commercial email. Operator must supply before the real send.
const ADDRESS_LINE = 'MustHaveMods · [postal address required by CAN-SPAM — operator to supply]';

const args = process.argv.slice(2);
const arg = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const recipients = (arg('--to') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const only = arg('--only');
const dry = args.includes('--dry');
if (!recipients.length) { console.error('need --to'); process.exit(1); }

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
const posts: [string, string][] = [
  ['31+ Sims 4 Goth Accessories — jewelry, tattoos, spikes, stockings', 'https://blog.musthavemods.com/sims-4-goth-accessories/'],
  ['16+ Sims 4 Cardi B CC for the ultimate Bardi makeover', 'https://blog.musthavemods.com/sims-4-cardi-b-cc/'],
  ['10 Sims 4 social media mods for influencer gameplay', 'https://blog.musthavemods.com/sims-4-social-media-mods/'],
  ['25+ Sims 4 Nicki Minaj CC — hair, skin overlay, sim download, shoes', 'https://blog.musthavemods.com/sims-4-nicki-minaj-cc/'],
  ['24+ Sims 4 Y2K makeup CC for the ultimate 2000s look', 'https://blog.musthavemods.com/sims-4-y2k-makeup-cc/'],
  ["24+ Sims 4 Y2K hairstyles for your Sim's Y2K era", 'https://blog.musthavemods.com/sims-4-y2k-hairstyles/'],
];
const saved: [string, string, number][] = [
  ['2025 81', 'tops', 184], ['Sims 4 3D Eyelashes Ver 5', 'makeup', 165], ['Hair Collection', 'hair', 144], ['Teen Space', 'furniture', 144],
];
const H2 = 'font-size:18px;margin:28px 0 10px;color:#111827;';
const A = 'color:#4f46e5;text-decoration:underline;';
const MUTED = 'color:#6b7280;';

function issueHtml(unsubscribeUrl: string): string {
  const body = `
<h1 style="font-size:22px;margin:0 0 4px;color:#111827;">Your first MustHaveMods roundup</h1>
<p style="${MUTED}margin:0 0 20px;">Six new CC lists, one collection, and what everyone else saved this week.</p>
<p>Hi —</p>
<p>You signed up for MustHaveMods at some point and then heard nothing from us. That was us, not you. This is issue #1; from here it's one email a week with the CC and mods worth your download slot, and nothing else.</p>
<p>Here's everything we published this week.</p>
<ol style="padding-left:22px;margin:0;">
${posts.map(([t, u]) => `<li style="margin:0 0 12px;"><a href="${u}" style="${A}">${esc(t)}</a></li>`).join('\n')}
</ol>
<h2 style="${H2}">One from the catalog</h2>
<p>If you only click one thing: the full <a href="${SITE}/games/sims-4/makeup-cc/" style="${A}">Makeup CC collection</a> — 922 pieces across makeup, eyebrows, eyeliner, blush, lipstick and eyes, all filterable by pack and creator.</p>
<h2 style="${H2}">Most-saved this week by everyone else</h2>
<ul style="padding-left:22px;margin:0;">
${saved.map(([n, c, s]) => `<li style="margin:0 0 6px;">${esc(n)} <span style="${MUTED}">(${c})</span> — ${s} saves</li>`).join('\n')}
</ul>
<p style="margin-top:12px;">Browse and filter all 15,888: <a href="${SITE}/" style="${A}">musthavemods.com</a></p>
<h2 style="${H2}">Two small things</h2>
<p><strong>Save what you like.</strong> A free account keeps your finds in one place instead of 30 open tabs: <a href="${SITE}/sign-in/" style="${A}">create one here</a>.</p>
<p><strong>Skip the download countdown.</strong> If you support us on Patreon at $3 or more, you can connect Patreon on any download page and the 10-second wait disappears. <a href="https://www.patreon.com/musthavemods" style="${A}">Our Patreon</a>.</p>
<p>That's it. Next one lands in a week.</p>
<p>— The MustHaveMods team</p>`;
  const footer = `You are getting this because you signed up at musthavemods.com. ${esc(ADDRESS_LINE)}<br><a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a> — one click, no login.`;
  return shell('Goth accessories, Cardi B CC, Y2K makeup, and the social media mods everyone asked for.', body, footer);
}

function issueText(unsubscribeUrl: string): string {
  return `Hi —

You signed up for MustHaveMods at some point and then heard nothing from us.
That was us, not you. This is issue #1; from here it's one email a week with
the CC and mods worth your download slot, and nothing else.

Here's everything we published this week.

${posts.map(([t, u], i) => `${i + 1}. ${t}\n   ${u}`).join('\n\n')}

--

One from the catalog

If you only click one thing: the full Makeup CC collection — 922 pieces
across makeup, eyebrows, eyeliner, blush, lipstick and eyes, all filterable
by pack and creator.
${SITE}/games/sims-4/makeup-cc/

--

Most-saved this week by everyone else

${saved.map(([n, c, s]) => `  ${n} (${c}) — ${s} saves`).join('\n')}

Browse and filter all 15,888: ${SITE}/

--

Two small things

Save what you like. A free account keeps your finds in one place instead of
30 open tabs: ${SITE}/sign-in/

Skip the download countdown. If you support us on Patreon at $3 or more, you
can connect Patreon on any download page and the 10-second wait disappears.
https://www.patreon.com/musthavemods

That's it. Next one lands in a week.

— The MustHaveMods team

--
You are getting this because you signed up at musthavemods.com.
${ADDRESS_LINE}
Unsubscribe: ${unsubscribeUrl}
`;
}

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
  const common = { recipients, dryRun: dry, site: SITE, replyTo: REPLY_TO, fromName: 'MustHaveMods' };
  if (only !== 'repermission') {
    const r = await sendBulk({ ...common, build: ({ unsubscribeUrl }) => ({
      subject: 'Your first MustHaveMods roundup — 6 new CC lists', html: issueHtml(unsubscribeUrl), text: issueText(unsubscribeUrl) }) });
    console.log(`issue-01     → attempted ${r.attempted} sent ${r.sent} failed ${r.failed}`, r.results.map((x) => `${x.email}:${x.sent ? 'ok' : x.error ?? 'dry'}`).join(' '));
    if (dry) writeFileSync('/tmp/issue-01-preview.html', r.results[0].preview!.html);
  }
  if (only !== 'issue') {
    const r = await sendBulk({ ...common, build: ({ email, unsubscribeUrl }) => {
      // The confirm endpoint (/api/subscribe/confirm) is not built yet; this is a labelled preview link.
      const confirmUrl = `${SITE}/api/subscribe/confirm?e=${encodeURIComponent(email)}&t=PREVIEW-NOT-LIVE`;
      return { subject: 'Do you want the weekly Sims 4 finds email?', html: rePermHtml(confirmUrl, unsubscribeUrl), text: rePermText(confirmUrl) };
    } });
    console.log(`re-permission → attempted ${r.attempted} sent ${r.sent} failed ${r.failed}`, r.results.map((x) => `${x.email}:${x.sent ? 'ok' : x.error ?? 'dry'}`).join(' '));
  }
}
// The pooled SMTP transport keeps the event loop alive; exit explicitly once every sendMail has resolved.
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
