import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  CONFIRM_PATH,
  CONFIRM_SOURCE,
  decodeConfirmEmail,
  verifyConfirmToken,
} from '@/lib/services/subscribeConfirm';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/subscribe/confirm/?e=<base64url email>&t=<hmac token>
 *
 * The target of the "YES, SEND IT" button in the one-time re-permission email
 * (`reports/funnel/drafts/re-permission-email-2026-09-08.md`). Links are built by
 * `buildConfirmUrl` in `lib/services/subscribeConfirm.ts`.
 *
 * GET  → a confirmation page with one button. It reads, it never writes. Corporate
 *        link-scanners and mail prefetchers follow every GET in an email; if GET
 *        subscribed people, the campaign would manufacture consent from software
 *        clicks — the exact thing a permission email exists to avoid. The extra click
 *        costs conversion and buys the only thing that makes the "yes" real.
 * POST → records consent. Idempotent: a double click is not a double subscribe and
 *        never downgrades an existing row's source.
 *
 * "Subscribed" means "has a row in `waitlist`" — the only opt-in table on main. There is
 * no marketing-consent column in the schema (checked 2026-09-08) and adding one is a
 * Tier 2 migration, so consent is recorded entirely in existing columns:
 * `source = 're-permission'` is the consent record and the campaign's attribution key,
 * and `ipAddress` / `userAgent` / `createdAt` are the audit trail of who clicked and when.
 *
 * The address never appears in a log line or in the rendered page, and the endpoint does
 * no lookup on `e` alone — the token is a keyed HMAC of the address, so a link only ever
 * works for the address it was issued to. It is domain-separated from the unsubscribe
 * token, so neither link can do the other's job.
 *
 * No GA4 event fires here: this page is standalone HTML served by the route, not a page
 * of the app, so the site's analytics bundle is not loaded. Attribution comes from the DB
 * `source` column, which is what the scoreboard's "Subscribers by source" line reads.
 */

const SITE = 'https://musthavemods.com';

function params(request: NextRequest) {
  // nextUrl.searchParams can be empty on Vercel edge (known gotcha) — check both.
  const nu = request.nextUrl.searchParams;
  const fu = new URL(request.url).searchParams;
  return {
    e: nu.get('e') || fu.get('e') || '',
    t: nu.get('t') || fu.get('t') || '',
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function page(
  title: string,
  body: string,
  opts: { status?: number; button?: { e: string; t: string } } = {}
) {
  const action = opts.button
    ? `${CONFIRM_PATH}?e=${encodeURIComponent(opts.button.e)}&t=${encodeURIComponent(opts.button.t)}`
    : null;
  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex">
<title>${escapeHtml(title)} · MustHaveMods</title>
</head>
<body style="margin:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <main style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:36px 32px;max-width:420px;text-align:center;color:#1f2937;">
    <div style="font-size:20px;font-weight:700;margin-bottom:12px;color:#111827;">MustHaveMods</div>
    <h1 style="font-size:20px;margin:0 0 12px;color:#111827;">${escapeHtml(title)}</h1>
    <p style="font-size:15px;line-height:1.6;color:#4b5563;margin:0 0 22px;">${escapeHtml(body)}</p>
    ${
      action
        ? `<form method="POST" action="${action}"><button type="submit" style="background:#4f46e5;color:#ffffff;border:0;font-size:15px;font-weight:600;padding:12px 26px;border-radius:6px;cursor:pointer;">Yes, send me the weekly email</button></form>`
        : `<a href="${SITE}/" style="color:#4f46e5;font-size:14px;">Back to MustHaveMods</a>`
    }
  </main>
</body></html>`;
  return new NextResponse(html, {
    status: opts.status ?? 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Returns the verified address, or null when the link is malformed or forged. */
function verifiedEmail(request: NextRequest): { email: string; e: string; t: string } | null {
  const { e, t } = params(request);
  if (!/^[A-Za-z0-9_-]{4,512}$/.test(e) || !/^[A-Za-z0-9_-]{16,128}$/.test(t)) return null;
  const email = decodeConfirmEmail(e);
  if (!email || !verifyConfirmToken(email, t)) return null;
  return { email, e, t };
}

const INVALID = [
  'Link not recognized',
  'This link is invalid or was issued for a different address. Reply to the email you received and a human will sort it out.',
] as const;

const ALREADY = [
  "You're on the list",
  'This address is already signed up for the weekly finds email. Nothing more to do — the next issue will arrive on schedule.',
] as const;

export async function GET(request: NextRequest) {
  try {
    const v = verifiedEmail(request);
    if (!v) return page(INVALID[0], INVALID[1], { status: 400 });
    const row = await prisma.waitlist.findUnique({ where: { email: v.email }, select: { id: true } });
    if (row) return page(ALREADY[0], ALREADY[1]);
    return page(
      'Send you the weekly Sims 4 finds email?',
      'One click and you are on the list: one email a week with the CC and mods worth your download slot, and nothing else. You can leave from the footer of any issue.',
      { button: { e: v.e, t: v.t } }
    );
  } catch (error) {
    console.error('[subscribe/confirm] GET failed:', error instanceof Error ? error.message : error);
    return page('Something went wrong', 'Please try the link again in a moment.', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const v = verifiedEmail(request);
    if (!v) return page(INVALID[0], INVALID[1], { status: 400 });

    // Audit trail of the consent, in columns that already exist. Same fields the footer
    // form records via /api/waitlist — no schema change, no new kind of data.
    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      // Idempotent: `update: {}` means a second click (or a retried POST) changes nothing
      // and never rewrites the source of a row that came from another surface.
      await prisma.waitlist.upsert({
        where: { email: v.email },
        create: { email: v.email, source: CONFIRM_SOURCE, ipAddress, userAgent },
        update: {},
      });
    } catch (error) {
      // Two clicks landing at once race on the unique index; the loser sees P2002, which
      // means the row exists — that is success, not an error.
      const code = (error as { code?: string })?.code;
      if (code !== 'P2002') throw error;
    }

    return page(
      "You're subscribed",
      'Thank you — that is the whole opt-in. The weekly finds email starts arriving with the next issue, and every one of them has a one-click unsubscribe in the footer.'
    );
  } catch (error) {
    console.error('[subscribe/confirm] POST failed:', error instanceof Error ? error.message : error);
    return page('Something went wrong', 'Please try the link again in a moment.', { status: 500 });
  }
}
