/**
 * Download tickets: a short HMAC-signed token that proves the player sat
 * through the /go countdown before the file is released. Stateless — no DB
 * write on download (GET must never mutate).
 *
 *   ticket = base64url(JSON{v,u,m,nbf,exp}) + "." + base64url(HMAC-SHA256)
 *
 * The key is derived from NEXTAUTH_SECRET with a purpose label, so a ticket
 * can never be confused with a session JWT. A missing or short secret fails
 * closed: no tickets are minted or accepted.
 */
import { createHmac, timingSafeEqual } from 'crypto';

const LABEL = 'mhm:mod-file-ticket:v1';
const MAX_TICKET_LENGTH = 512;

export interface TicketPayload {
  v: 1;
  /** ModUpload id */
  u: string;
  /** Mod id */
  m: string;
  /** not-before, ms since epoch */
  nbf: number;
  /** expiry, ms since epoch */
  exp: number;
}

function deriveKey(secret: string | undefined): Buffer | null {
  if (!secret || secret.length < 32) return null;
  return createHmac('sha256', secret).update(LABEL).digest();
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function sign(key: Buffer, body: string): string {
  return b64url(createHmac('sha256', key).update(body).digest());
}

export function ticketSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.NEXTAUTH_SECRET;
}

export function signTicket(payload: Omit<TicketPayload, 'v'>, secret: string | undefined): string {
  const key = deriveKey(secret);
  if (!key) throw new Error('Download tickets are not configured');
  const body = b64url(Buffer.from(JSON.stringify({ v: 1, ...payload })));
  return `${body}.${sign(key, body)}`;
}

export type TicketCheck =
  | { ok: true; payload: TicketPayload }
  | { ok: false; reason: 'malformed' | 'bad-signature' | 'too-early' | 'expired' | 'wrong-mod' | 'not-configured' };

export function verifyTicket(
  ticket: unknown,
  opts: { modId: string; now?: number; secret: string | undefined },
): TicketCheck {
  const key = deriveKey(opts.secret);
  if (!key) return { ok: false, reason: 'not-configured' };
  if (typeof ticket !== 'string' || ticket.length === 0 || ticket.length > MAX_TICKET_LENGTH) {
    return { ok: false, reason: 'malformed' };
  }
  const parts = ticket.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) {
    return { ok: false, reason: 'malformed' };
  }
  const [body, mac] = parts;
  const expected = Buffer.from(sign(key, body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: 'bad-signature' };
  }

  let payload: TicketPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (
    !payload ||
    payload.v !== 1 ||
    typeof payload.u !== 'string' ||
    typeof payload.m !== 'string' ||
    !Number.isFinite(payload.nbf) ||
    !Number.isFinite(payload.exp)
  ) {
    return { ok: false, reason: 'malformed' };
  }
  const now = opts.now ?? Date.now();
  if (payload.m !== opts.modId) return { ok: false, reason: 'wrong-mod' };
  if (now < payload.nbf) return { ok: false, reason: 'too-early' };
  if (now >= payload.exp) return { ok: false, reason: 'expired' };
  return { ok: true, payload };
}
