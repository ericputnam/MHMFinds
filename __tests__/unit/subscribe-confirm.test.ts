/**
 * /api/subscribe/confirm/ route + token tests (Cass, 2026-09-10)
 *
 * Offline: prisma is mocked. What these guard:
 *  - a GET never mutates (link-scanners and prefetchers must not manufacture consent),
 *  - a forged, malformed or cross-purpose token is rejected before touching the database,
 *  - a valid POST records consent exactly once, idempotently, with `source='re-permission'`,
 *  - a confirm token cannot be replayed as an unsubscribe token and vice versa,
 *  - every URL the module emits carries the trailing slash `trailingSlash: true` requires,
 *  - the shipped send script links to the real endpoint, not the old preview placeholder.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const findUnique = vi.fn();
const upsert = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: { waitlist: { findUnique: (...a: unknown[]) => findUnique(...a), upsert: (...a: unknown[]) => upsert(...a) } },
  default: { waitlist: { findUnique: (...a: unknown[]) => findUnique(...a), upsert: (...a: unknown[]) => upsert(...a) } },
}));

import { GET, POST } from '@/app/api/subscribe/confirm/route';
import {
  CONFIRM_PATH,
  CONFIRM_SOURCE,
  buildConfirmUrl,
  signConfirmToken,
  verifyConfirmToken,
} from '@/lib/services/subscribeConfirm';
import {
  buildUnsubscribeUrl,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from '@/lib/services/unsubscribe';

const ORIGINAL_ENV = { ...process.env };
const EMAIL = 'Reader@Example.com';
const NORMALIZED = 'reader@example.com';

function req(url: string, method: 'GET' | 'POST' = 'GET', headers: Record<string, string> = {}) {
  return new NextRequest(url, { method, headers });
}

function readSource(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8');
}

describe('subscribe-confirm tokens', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-signing-key';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('round-trips: a token it signs is a token it verifies, case/whitespace insensitive', () => {
    const token = signConfirmToken(EMAIL);
    expect(verifyConfirmToken(EMAIL, token)).toBe(true);
    expect(verifyConfirmToken('  reader@EXAMPLE.com ', token)).toBe(true);
  });

  it('rejects a token issued for a different address', () => {
    expect(verifyConfirmToken(EMAIL, signConfirmToken('someone-else@example.com'))).toBe(false);
  });

  it('returns false on malformed input instead of throwing', () => {
    for (const [email, token] of [
      ['', 'abc'],
      [EMAIL, ''],
      [EMAIL, 'not-a-token'],
      [EMAIL, '!!!'],
    ] as [string, string][]) {
      expect(verifyConfirmToken(email, token)).toBe(false);
    }
  });

  it('returns false rather than throwing when no signing key is configured', () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    expect(verifyConfirmToken(EMAIL, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false);
  });

  it('is domain-separated: a confirm token is not an unsubscribe token, in either direction', () => {
    const confirm = signConfirmToken(EMAIL);
    const unsub = signUnsubscribeToken(EMAIL);
    expect(confirm).not.toBe(unsub);
    expect(verifyUnsubscribeToken(EMAIL, confirm)).toBe(false);
    expect(verifyConfirmToken(EMAIL, unsub)).toBe(false);
  });

  it('the unsubscribe round-trip still works unchanged alongside the new purpose token', () => {
    // Guards the derivation of already-issued unsubscribe links against this PR.
    expect(verifyUnsubscribeToken(EMAIL, signUnsubscribeToken(EMAIL))).toBe(true);
    const url = new URL(buildUnsubscribeUrl(EMAIL, 'https://musthavemods.com'));
    expect(url.pathname).toBe('/api/unsubscribe/');
    expect(verifyUnsubscribeToken(NORMALIZED, url.searchParams.get('t')!)).toBe(true);
  });

  it('builds a URL with the trailing slash and no plain-text address', () => {
    const url = buildConfirmUrl(EMAIL, 'https://musthavemods.com');
    expect(url.startsWith('https://musthavemods.com/api/subscribe/confirm/?')).toBe(true);
    expect(CONFIRM_PATH.endsWith('/')).toBe(true);
    expect(url.toLowerCase()).not.toContain(NORMALIZED);
    expect(url).not.toContain('%40');
  });
});

describe('/api/subscribe/confirm', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-signing-key';
    findUnique.mockReset();
    upsert.mockReset();
    findUnique.mockResolvedValue(null);
    upsert.mockResolvedValue({ id: 'w1' });
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('GET with a valid link shows the confirm button and does not mutate', async () => {
    const res = await GET(req(buildConfirmUrl(EMAIL, 'https://musthavemods.com')));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Yes, send me the weekly email');
    expect(html).toContain('method="POST"');
    expect(html).toContain('action="/api/subscribe/confirm/?e=');
    expect(findUnique).toHaveBeenCalledWith({ where: { email: NORMALIZED }, select: { id: true } });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('GET for an address already on the list says so without a button', async () => {
    findUnique.mockResolvedValue({ id: 'w1' });
    const res = await GET(req(buildConfirmUrl(EMAIL)));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("You're on the list");
    expect(html).not.toContain('method="POST"');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('POST records consent once, with the campaign source and an audit trail', async () => {
    const res = await POST(
      req(buildConfirmUrl(EMAIL), 'POST', { 'x-forwarded-for': '203.0.113.7', 'user-agent': 'Mail/1.0' })
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("You're subscribed");
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      where: { email: NORMALIZED },
      create: { email: NORMALIZED, source: CONFIRM_SOURCE, ipAddress: '203.0.113.7', userAgent: 'Mail/1.0' },
      update: {},
    });
  });

  it('POST is idempotent: a second click never rewrites an existing row', async () => {
    await POST(req(buildConfirmUrl(EMAIL), 'POST'));
    await POST(req(buildConfirmUrl(EMAIL), 'POST'));
    expect(upsert).toHaveBeenCalledTimes(2);
    for (const call of upsert.mock.calls) {
      expect((call[0] as { update: Record<string, unknown> }).update).toEqual({});
    }
  });

  it('POST treats a racing unique-constraint failure as success', async () => {
    upsert.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    const res = await POST(req(buildConfirmUrl(EMAIL), 'POST'));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("You're subscribed");
  });

  it('POST surfaces a real database failure as a 500, not a false confirmation', async () => {
    upsert.mockRejectedValue(new Error('connection refused'));
    const res = await POST(req(buildConfirmUrl(EMAIL), 'POST'));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("You're subscribed");
  });

  it('rejects a token issued for a different address before touching the database', async () => {
    const other = new URL(buildConfirmUrl('someone-else@example.com'));
    const mine = new URL(buildConfirmUrl(EMAIL));
    const forged = `${mine.origin}${mine.pathname}?e=${mine.searchParams.get('e')}&t=${other.searchParams.get('t')}`;
    for (const method of ['GET', 'POST'] as const) {
      const res = await (method === 'GET' ? GET : POST)(req(forged, method));
      expect(res.status).toBe(400);
      expect(await res.text()).toContain('Link not recognized');
    }
    expect(findUnique).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects an unsubscribe token replayed at the confirm endpoint', async () => {
    const unsub = new URL(buildUnsubscribeUrl(EMAIL));
    const mine = new URL(buildConfirmUrl(EMAIL));
    const replayed = `${mine.origin}${mine.pathname}?e=${mine.searchParams.get('e')}&t=${unsub.searchParams.get('t')}`;
    const res = await POST(req(replayed, 'POST'));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects missing or malformed parameters', async () => {
    for (const url of [
      'https://musthavemods.com/api/subscribe/confirm/',
      'https://musthavemods.com/api/subscribe/confirm/?e=&t=',
      'https://musthavemods.com/api/subscribe/confirm/?e=%3Cscript%3E&t=abc',
      'https://musthavemods.com/api/subscribe/confirm/?e=bm90LWFuLWVtYWls&t=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    ]) {
      const res = await POST(req(url, 'POST'));
      expect(res.status).toBe(400);
    }
    expect(upsert).not.toHaveBeenCalled();
  });

  it('the address never appears in the rendered page', async () => {
    for (const res of [await GET(req(buildConfirmUrl(EMAIL))), await POST(req(buildConfirmUrl(EMAIL), 'POST'))]) {
      expect((await res.text()).toLowerCase()).not.toContain(NORMALIZED);
    }
  });
});

describe('the shipped send script', () => {
  const src = readSource('scripts/agents/newsletter-send-test.ts');

  it('links to the real endpoint instead of the PREVIEW-NOT-LIVE placeholder', () => {
    expect(src).not.toContain('PREVIEW-NOT-LIVE');
    expect(src).toMatch(/buildConfirmUrl\(email, SITE\)/);
  });

  it('imports the link builder rather than hand-assembling the URL', () => {
    expect(src).toMatch(/from '\.\.\/\.\.\/lib\/services\/subscribeConfirm'/);
  });

  it('the route is served from the path the email links to', () => {
    expect(CONFIRM_PATH).toBe('/api/subscribe/confirm/');
    expect(readSource('app/api/subscribe/confirm/route.ts')).toMatch(
      /export const dynamic = 'force-dynamic'/
    );
  });
});
