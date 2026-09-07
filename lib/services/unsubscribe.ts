/**
 * Per-recipient unsubscribe links (Cass, 2026-09-07)
 *
 * Every bulk send must carry a working, per-recipient unsubscribe link and the
 * RFC 2369 / RFC 8058 headers that let Gmail and Outlook render a native
 * "Unsubscribe" button. That button is the single biggest reason a list-mail
 * lands in the inbox instead of the spam folder: readers who can leave in one
 * click do not press "report spam".
 *
 * The token is a keyed HMAC of the address, so no database column and no
 * schema migration is needed to *generate* a link. Verification is
 * timing-safe. The signing key is `UNSUBSCRIBE_SECRET` when present, else
 * `NEXTAUTH_SECRET` (already required by the app), so nothing new has to be
 * provisioned.
 *
 * No secret value ever appears in a link, a log line or an email body.
 */

import { createHmac, timingSafeEqual } from 'crypto';

export const UNSUBSCRIBE_PATH = '/api/unsubscribe';

/** Mailbox that accepts `mailto:` unsubscribe requests (RFC 2369 fallback). */
export const UNSUBSCRIBE_MAILBOX =
  process.env.UNSUBSCRIBE_MAILBOX || 'unsubscribe@musthavemods.com';

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signingKey(): string {
  const key = process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!key) {
    throw new Error(
      'unsubscribe: no signing key. Set UNSUBSCRIBE_SECRET or NEXTAUTH_SECRET.'
    );
  }
  return key;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Deterministic per-recipient token. Same address + same key => same token. */
export function signUnsubscribeToken(email: string): string {
  return base64url(
    createHmac('sha256', signingKey()).update(normalizeEmail(email)).digest()
  );
}

/** Timing-safe check. Returns false on any malformed input rather than throwing. */
export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false;
  let expected: string;
  try {
    expected = signUnsubscribeToken(email);
  } catch {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function baseUrl(explicit?: string): string {
  const raw =
    explicit ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'https://musthavemods.com';
  return raw.replace(/\/+$/, '');
}

/** The link that goes in the footer *and* in the List-Unsubscribe header. */
export function buildUnsubscribeUrl(email: string, site?: string): string {
  const normalized = normalizeEmail(email);
  const e = base64url(normalized);
  const t = signUnsubscribeToken(normalized);
  return `${baseUrl(site)}${UNSUBSCRIBE_PATH}?e=${e}&t=${t}`;
}

/** Inverse of the `e` parameter. Returns null when the value is not decodable. */
export function decodeUnsubscribeEmail(e: string): string | null {
  try {
    const decoded = normalizeEmail(fromBase64url(e));
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function buildUnsubscribeMailto(email: string): string {
  return `mailto:${UNSUBSCRIBE_MAILBOX}?subject=unsubscribe%20${encodeURIComponent(
    normalizeEmail(email)
  )}`;
}

/**
 * RFC 2369 + RFC 8058 headers.
 *
 * `List-Unsubscribe-Post: List-Unsubscribe=One-Click` promises the mailbox
 * provider that the https URI accepts an unauthenticated POST and unsubscribes
 * without a confirmation page. Only emit it when that route really behaves
 * that way — `bulkMailer` refuses to send unless the caller asserts it.
 */
export function unsubscribeHeaders(
  email: string,
  opts: { site?: string; oneClick?: boolean } = {}
): Record<string, string> {
  const url = buildUnsubscribeUrl(email, opts.site);
  const headers: Record<string, string> = {
    'List-Unsubscribe': `<${url}>, <${buildUnsubscribeMailto(email)}>`,
  };
  if (opts.oneClick !== false) {
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  return headers;
}
