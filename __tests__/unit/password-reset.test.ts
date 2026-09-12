/**
 * Forgot / reset password flow (Cass, 2026-09-12, Q1 a / E39).
 *
 * Offline: prisma and the email transport are mocked. What these guard:
 *  - the reset token is 256 bits of randomness and only its SHA-256 is stored,
 *  - a token is single-use, time-limited, and issuing a new one retires the old,
 *  - the forgot endpoint answers identically for known, unknown and malformed
 *    addresses (no account-enumeration oracle) and never returns the token,
 *  - a weak password is rejected before the token is consumed,
 *  - the raw token never reaches notification_logs (skipLog) or the console,
 *  - the reset link is built from the same base-URL chain as every other
 *    emailed link, and the client calls the trailing-slash API paths.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  verificationToken: { deleteMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
  account: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma: db, default: db }));

const mail = vi.hoisted(() => ({
  send: vi.fn(),
  isConfigured: vi.fn(),
}));
vi.mock('@/lib/services/emailNotifier', () => ({
  EmailNotifier: class {
    isConfigured = () => mail.isConfigured();
    send = (...a: unknown[]) => mail.send(...a);
  },
  emailNotifier: {},
}));

import {
  consumePasswordToken,
  createPasswordToken,
  peekPasswordToken,
  sendPasswordEmail,
} from '@/lib/services/authEmail';
import { POST as forgotPOST } from '@/app/api/auth/forgot-password/route';
import { GET as resetGET, POST as resetPOST } from '@/app/api/auth/reset-password/route';

const ORIGINAL_ENV = { ...process.env };
const EMAIL = 'Reader@Example.com';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const readSource = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8');

let ipCounter = 0;
/** Every request gets its own IP so the module-level rate limiter never bleeds between tests. */
function post(url: string, body: unknown, ip = `10.0.0.${++ipCounter}`) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

function resetAllMocks() {
  for (const table of Object.values(db)) for (const fn of Object.values(table)) fn.mockReset();
  mail.send.mockReset();
  mail.isConfigured.mockReset();
  mail.isConfigured.mockReturnValue(true);
  mail.send.mockResolvedValue(true);
  db.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
  db.verificationToken.create.mockResolvedValue({});
  db.user.update.mockResolvedValue({});
  db.account.update.mockResolvedValue({});
  db.account.create.mockResolvedValue({});
}

beforeEach(() => {
  resetAllMocks();
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXTAUTH_URL;
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.useRealTimers();
});

describe('createPasswordToken', () => {
  it('issues 256 bits of randomness and stores only the SHA-256, lower-cased identifier', async () => {
    const { rawToken } = await createPasswordToken(EMAIL, 'reset');
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);

    expect(db.verificationToken.create).toHaveBeenCalledTimes(1);
    const stored = db.verificationToken.create.mock.calls[0][0].data;
    expect(stored.identifier).toBe('reader@example.com');
    expect(stored.token).toBe(sha256(rawToken));
    expect(stored.token).not.toBe(rawToken);
  });

  it('retires every outstanding token for the address before writing the new one', async () => {
    await createPasswordToken(EMAIL, 'reset');
    expect(db.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: 'reader@example.com' } });
    const delOrder = db.verificationToken.deleteMany.mock.invocationCallOrder[0];
    const createOrder = db.verificationToken.create.mock.invocationCallOrder[0];
    expect(delOrder).toBeLessThan(createOrder);
  });

  it('reset tokens expire in 1 hour, invites in 14 days', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
    const reset = await createPasswordToken(EMAIL, 'reset');
    const invite = await createPasswordToken(EMAIL, 'invite');
    expect(reset.expires.getTime() - Date.now()).toBe(HOUR);
    expect(invite.expires.getTime() - Date.now()).toBe(14 * DAY);
  });

  it('never issues the same token twice', async () => {
    const a = await createPasswordToken(EMAIL, 'reset');
    const b = await createPasswordToken(EMAIL, 'reset');
    expect(a.rawToken).not.toBe(b.rawToken);
  });
});

describe('peekPasswordToken / consumePasswordToken', () => {
  it('rejects an empty token without touching the database', async () => {
    expect(await peekPasswordToken('')).toBeNull();
    expect(await consumePasswordToken('')).toBeNull();
    expect(db.verificationToken.findUnique).not.toHaveBeenCalled();
  });

  it('looks the token up by its hash, never by the raw value', async () => {
    db.verificationToken.findUnique.mockResolvedValue(null);
    await peekPasswordToken('raw-token');
    expect(db.verificationToken.findUnique).toHaveBeenCalledWith({ where: { token: sha256('raw-token') } });
  });

  it('treats an expired token as invalid and purges it', async () => {
    db.verificationToken.findUnique.mockResolvedValue({
      identifier: 'reader@example.com',
      token: sha256('raw-token'),
      expires: new Date(Date.now() - 1000),
    });
    expect(await peekPasswordToken('raw-token')).toBeNull();
    expect(db.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { token: sha256('raw-token') } });
  });

  it('peek does not consume; consume deletes exactly that hash and is single-use', async () => {
    db.verificationToken.findUnique.mockResolvedValue({
      identifier: 'reader@example.com',
      token: sha256('raw-token'),
      expires: new Date(Date.now() + HOUR),
    });

    expect(await peekPasswordToken('raw-token')).toEqual({ email: 'reader@example.com' });
    expect(db.verificationToken.deleteMany).not.toHaveBeenCalled();

    expect(await consumePasswordToken('raw-token')).toEqual({ email: 'reader@example.com' });
    expect(db.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { token: sha256('raw-token') } });

    // A concurrent consumer already deleted it: the second spend fails.
    db.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    expect(await consumePasswordToken('raw-token')).toBeNull();
  });
});

describe('sendPasswordEmail', () => {
  const RAW = 'a'.repeat(64);

  it('links to /set-password on NEXT_PUBLIC_SITE_URL and skips the notification log', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://musthavemods.com/';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    expect(await sendPasswordEmail(EMAIL, RAW, 'reset')).toBe(true);

    expect(mail.send).toHaveBeenCalledTimes(1);
    const [to, subject, html, options] = mail.send.mock.calls[0] as [string, string, string, Record<string, unknown>];
    expect(to).toBe(EMAIL);
    expect(subject).toMatch(/reset/i);
    expect(html).toContain(`https://musthavemods.com/set-password?token=${RAW}`);
    expect(html).not.toContain('localhost');
    expect(options).toMatchObject({ skipLog: true });
  });

  it('falls back to NEXTAUTH_URL, then to production', async () => {
    process.env.NEXTAUTH_URL = 'https://staging.example.com';
    await sendPasswordEmail(EMAIL, RAW, 'reset');
    expect(mail.send.mock.calls[0][2]).toContain(`https://staging.example.com/set-password?token=${RAW}`);

    mail.send.mockClear();
    delete process.env.NEXTAUTH_URL;
    await sendPasswordEmail(EMAIL, RAW, 'reset');
    expect(mail.send.mock.calls[0][2]).toContain(`https://musthavemods.com/set-password?token=${RAW}`);
  });

  it('fails closed with no transport: returns false, sends nothing, prints no token', async () => {
    mail.isConfigured.mockReturnValue(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(await sendPasswordEmail(EMAIL, RAW, 'reset')).toBe(false);
    expect(mail.send).not.toHaveBeenCalled();
    const printed = [...warn.mock.calls, ...log.mock.calls].flat().map(String).join('\n');
    expect(printed).not.toContain(RAW);
    expect(printed).not.toContain(EMAIL);

    warn.mockRestore();
    log.mockRestore();
  });
});

describe('POST /api/auth/forgot-password', () => {
  const URL = 'https://musthavemods.com/api/auth/forgot-password/';

  it('answers with the identical body for an unknown, a known and a malformed address', async () => {
    db.user.findUnique.mockImplementation(async ({ where }: { where: { email: string } }) =>
      where.email === 'reader@example.com' ? { id: 'u1', email: 'reader@example.com' } : null
    );

    const unknown = await forgotPOST(post(URL, { email: 'nobody@example.com' }));
    const known = await forgotPOST(post(URL, { email: EMAIL }));
    const malformed = await forgotPOST(post(URL, { email: 'not-an-email' }));
    const missing = await forgotPOST(post(URL, {}));

    const bodies = await Promise.all([unknown, known, malformed, missing].map((r) => r.text()));
    expect(unknown.status).toBe(200);
    expect(new Set(bodies).size).toBe(1);
    expect(new Set([unknown.status, known.status, malformed.status, missing.status]).size).toBe(1);
  });

  it('does nothing for an unknown address', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await forgotPOST(post(URL, { email: 'nobody@example.com' }));
    expect(db.verificationToken.create).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('issues a token and emails it for a known address, without echoing the token', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u1', email: 'reader@example.com' });
    const res = await forgotPOST(post(URL, { email: '  Reader@Example.com ' }));
    const body = await res.text();

    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'reader@example.com' } })
    );
    expect(db.verificationToken.create).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledTimes(1);

    const html = mail.send.mock.calls[0][2] as string;
    const raw = html.match(/token=([0-9a-f]{64})/)?.[1];
    expect(raw).toBeTruthy();
    expect(body).not.toContain(raw as string);
    expect(body).not.toContain('token');
  });

  it('never issues a token for the env-var admin account', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'admin', email: 'adminuser45@admin.local' });
    const res = await forgotPOST(post(URL, { email: 'adminuser45@admin.local' }));
    expect(res.status).toBe(200);
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.verificationToken.create).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('stays generic when the database throws', async () => {
    db.user.findUnique.mockRejectedValue(new Error('db down'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await forgotPOST(post(URL, { email: EMAIL }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    err.mockRestore();
  });

  it('rate-limits the sixth request from one IP within the hour', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const ip = '203.0.113.7';
    for (let i = 0; i < 5; i++) {
      expect((await forgotPOST(post(URL, { email: 'nobody@example.com' }, ip))).status).toBe(200);
    }
    const sixth = await forgotPOST(post(URL, { email: 'nobody@example.com' }, ip));
    expect(sixth.status).toBe(429);
  });
});

describe('/api/auth/reset-password', () => {
  const URL = 'https://musthavemods.com/api/auth/reset-password/';
  const RAW = 'b'.repeat(64);
  const liveRecord = () => ({
    identifier: 'reader@example.com',
    token: sha256(RAW),
    expires: new Date(Date.now() + HOUR),
  });

  it('GET validates a link without consuming it', async () => {
    db.verificationToken.findUnique.mockResolvedValue(liveRecord());
    const res = await resetGET(new NextRequest(`${URL}?token=${RAW}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true, email: 'reader@example.com' });
    expect(db.verificationToken.deleteMany).not.toHaveBeenCalled();
  });

  it('GET answers 400 for an unknown token', async () => {
    db.verificationToken.findUnique.mockResolvedValue(null);
    const res = await resetGET(new NextRequest(`${URL}?token=nope`));
    expect(res.status).toBe(400);
  });

  it('rejects a weak password before looking the token up, so the token survives', async () => {
    const res = await resetPOST(post(URL, { token: RAW, password: 'short' }));
    expect(res.status).toBe(400);
    expect(db.verificationToken.findUnique).not.toHaveBeenCalled();
    expect(db.verificationToken.deleteMany).not.toHaveBeenCalled();
    expect(db.account.update).not.toHaveBeenCalled();
  });

  it('rejects an unknown or expired token with 400 and writes nothing', async () => {
    db.verificationToken.findUnique.mockResolvedValue(null);
    const res = await resetPOST(post(URL, { token: RAW, password: 'correct horse battery' }));
    expect(res.status).toBe(400);
    expect(db.account.update).not.toHaveBeenCalled();
    expect(db.account.create).not.toHaveBeenCalled();
  });

  it('consumes the token, stores a bcrypt hash (never the plaintext) and marks the email verified', async () => {
    db.verificationToken.findUnique.mockResolvedValue(liveRecord());
    db.user.findUnique.mockResolvedValue({ id: 'u1', email: 'reader@example.com', emailVerified: null });
    db.account.findFirst.mockResolvedValue({ id: 'acct1' });

    const res = await resetPOST(post(URL, { token: RAW, password: 'correct horse battery' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });

    expect(db.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { token: sha256(RAW) } });

    expect(db.account.update).toHaveBeenCalledTimes(1);
    const stored = db.account.update.mock.calls[0][0].data.id_token as string;
    expect(stored).toMatch(/^\$2[aby]\$10\$/);
    expect(stored).not.toContain('correct horse battery');

    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' }, data: { emailVerified: expect.any(Date) } })
    );
  });

  it('creates the credentials row when the user has no Account yet', async () => {
    db.verificationToken.findUnique.mockResolvedValue(liveRecord());
    db.user.findUnique.mockResolvedValue({ id: 'u2', email: 'reader@example.com', emailVerified: new Date() });
    db.account.findFirst.mockResolvedValue(null);

    const res = await resetPOST(post(URL, { token: RAW, password: 'correct horse battery' }));
    expect(res.status).toBe(200);
    expect(db.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u2', provider: 'credentials', type: 'credentials' }),
      })
    );
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('loses the race cleanly: a token spent between peek and consume changes nothing', async () => {
    db.verificationToken.findUnique.mockResolvedValue(liveRecord());
    db.user.findUnique.mockResolvedValue({ id: 'u1', email: 'reader@example.com', emailVerified: null });
    db.verificationToken.deleteMany.mockResolvedValue({ count: 0 });

    const res = await resetPOST(post(URL, { token: RAW, password: 'correct horse battery' }));
    expect(res.status).toBe(400);
    expect(db.account.findFirst).not.toHaveBeenCalled();
    expect(db.account.update).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

describe('source-level guards', () => {
  it('client pages call the trailing-slash API paths (next.config trailingSlash: true)', () => {
    const forgot = readSource('app/forgot-password/page.tsx');
    const set = readSource('app/set-password/page.tsx');
    expect(forgot).toContain("fetch('/api/auth/forgot-password/'");
    expect(forgot).not.toContain("fetch('/api/auth/forgot-password'");
    expect(set).toContain('/api/auth/reset-password/?token=');
    expect(set).toContain("fetch('/api/auth/reset-password/'");
    expect(set).not.toContain("fetch('/api/auth/reset-password'");
  });

  it('the password email is never written to notification_logs', () => {
    expect(readSource('lib/services/authEmail.ts')).toMatch(/skipLog:\s*true/);
  });

  it('the sign-in page links to /forgot-password', () => {
    expect(readSource('app/sign-in/page.tsx')).toContain('href="/forgot-password"');
  });

  it('the forgot route stays generic for the admin account and on every branch', () => {
    const src = readSource('app/api/auth/forgot-password/route.ts');
    expect(src).toContain("endsWith('@admin.local')");
    expect(src).not.toMatch(/rawToken[^\n]*NextResponse/);
  });
});
