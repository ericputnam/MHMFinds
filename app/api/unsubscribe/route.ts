import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  decodeUnsubscribeEmail,
  verifyUnsubscribeToken,
} from '@/lib/services/unsubscribe';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/unsubscribe?e=<base64url email>&t=<hmac token>
 *
 * The target of every newsletter footer link and of the RFC 2369 / RFC 8058
 * `List-Unsubscribe` headers that `lib/services/bulkMailer.ts` attaches to each
 * message (links are built by `buildUnsubscribeUrl` in `lib/services/unsubscribe.ts`).
 *
 * GET  → confirmation page with one button. Mail scanners and corporate
 *        link-checkers prefetch GETs, so a GET never changes anything.
 * POST → unsubscribes. Also what Gmail/Yahoo call for their native
 *        "Unsubscribe" button (`List-Unsubscribe-Post: List-Unsubscribe=One-Click`):
 *        an unauthenticated POST with no confirmation step, answered with 2xx.
 *
 * "Subscribed" means "has a row in `waitlist`" (the only opt-in table on main).
 * Unsubscribing removes that row. There is no soft-delete column on `waitlist`;
 * adding one is a schema change (Tier 2, queued for the operator). Until then,
 * removing the row is the honest reading of "take me off the list" and is what
 * CAN-SPAM requires within 10 business days — here it is immediate.
 *
 * The address never appears in a log line; the token is a keyed HMAC of it, so
 * a link only works for the address it was issued to.
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
    ? `/api/unsubscribe?e=${encodeURIComponent(opts.button.e)}&t=${encodeURIComponent(opts.button.t)}`
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
        ? `<form method="POST" action="${action}"><button type="submit" style="background:#4f46e5;color:#ffffff;border:0;font-size:15px;font-weight:600;padding:12px 26px;border-radius:6px;cursor:pointer;">Yes, unsubscribe me</button></form>`
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
  const email = decodeUnsubscribeEmail(e);
  if (!email || !verifyUnsubscribeToken(email, t)) return null;
  return { email, e, t };
}

const INVALID = [
  'Link not recognized',
  'This unsubscribe link is invalid or was issued for a different address. Reply to any of our emails and a human will remove you.',
] as const;

export async function GET(request: NextRequest) {
  try {
    const v = verifiedEmail(request);
    if (!v) return page(INVALID[0], INVALID[1], { status: 400 });
    const row = await prisma.waitlist.findUnique({ where: { email: v.email }, select: { id: true } });
    if (!row) {
      return page('Already unsubscribed', 'This address is not on the list. You will not get any more emails from us.');
    }
    return page(
      'Unsubscribe from the weekly finds email?',
      'One click and you are off the list. No login, no survey. You can sign up again from the site whenever you like.',
      { button: { e: v.e, t: v.t } }
    );
  } catch (error) {
    console.error('[unsubscribe] GET failed:', error instanceof Error ? error.message : error);
    return page('Something went wrong', 'Please try the link again in a moment.', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const v = verifiedEmail(request);
    if (!v) return page(INVALID[0], INVALID[1], { status: 400 });
    // deleteMany is idempotent: a second click, or Gmail retrying its one-click POST, is not an error.
    await prisma.waitlist.deleteMany({ where: { email: v.email } });
    return page(
      "You're unsubscribed",
      'No more emails from MustHaveMods. Changed your mind later? Sign up again from the site.'
    );
  } catch (error) {
    console.error('[unsubscribe] POST failed:', error instanceof Error ? error.message : error);
    return page('Something went wrong', 'Please try the link again in a moment.', { status: 500 });
  }
}
