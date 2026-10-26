/**
 * /api/unsubscribe route tests (Cass, 2026-09-08)
 *
 * Offline: prisma is mocked. What these guard:
 *  - a GET never mutates (link prefetchers must not unsubscribe people),
 *  - a forged or malformed token is rejected before touching the database,
 *  - a valid POST removes exactly that address, idempotently, with a 2xx
 *    (RFC 8058 one-click contract promised by `List-Unsubscribe-Post`),
 *  - a valid POST records the address on the durable unsubscribe list
 *    (email_suppressions, by hash) before it deletes the waitlist row,
 *  - the links `buildUnsubscribeUrl` produces are the links the route accepts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import type { fakeSuppressionDb as FakeFactory } from '../fixtures/fakeSuppressionDb';

const findUnique = vi.fn();
const deleteMany = vi.fn();
const sup = vi.hoisted(() => ({ fake: undefined as unknown as ReturnType<typeof FakeFactory> }));
vi.mock('@/lib/prisma', () => {
  const client = {
    waitlist: { findUnique: (...a: unknown[]) => findUnique(...a), deleteMany: (...a: unknown[]) => deleteMany(...a) },
    emailSuppression: new Proxy({}, { get: (_t, k) => (sup.fake.db.emailSuppression as Record<string | symbol, unknown>)[k] }),
  };
  return { prisma: client, default: client };
});

import { GET, POST } from '@/app/api/unsubscribe/route';
import { buildUnsubscribeUrl } from '@/lib/services/unsubscribe';
import { hashRecipient } from '@/lib/services/sendExclusions';
import { fakeSuppressionDb } from '../fixtures/fakeSuppressionDb';

const ORIGINAL_ENV = { ...process.env };
const EMAIL = 'Reader@Example.com';

function req(url: string, method: 'GET' | 'POST' = 'GET') {
  return new NextRequest(url, { method });
}

describe('/api/unsubscribe', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test-signing-key';
    findUnique.mockReset();
    deleteMany.mockReset();
    sup.fake = fakeSuppressionDb();
    findUnique.mockResolvedValue({ id: 'w1' });
    deleteMany.mockResolvedValue({ count: 1 });
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('GET with a valid link shows the confirmation page and does not mutate', async () => {
    const res = await GET(req(buildUnsubscribeUrl(EMAIL, 'https://musthavemods.com')));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Yes, unsubscribe me');
    expect(html).toContain('method="POST"');
    expect(html).toContain('action="/api/unsubscribe/?e=');
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'reader@example.com' }, select: { id: true } });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('GET for an address that already unsubscribed says so without a button', async () => {
    findUnique.mockResolvedValue(null);
    sup.fake = fakeSuppressionDb([
      { emailHash: hashRecipient(EMAIL), source: 'link', requestedAt: new Date('2026-10-01'), clearedAt: null },
    ]);
    const res = await GET(req(buildUnsubscribeUrl(EMAIL)));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Already unsubscribed');
    expect(html).not.toContain('method="POST"');
  });

  it('GET still offers the button to an address with no list row and no opt-out (e.g. an account that was mailed)', async () => {
    findUnique.mockResolvedValue(null);
    const res = await GET(req(buildUnsubscribeUrl(EMAIL)));
    expect(await res.text()).toContain('Yes, unsubscribe me');
    expect(sup.fake.rows.size).toBe(0); // GET never writes
  });

  it('POST with a valid link removes exactly that address and answers 2xx', async () => {
    const res = await POST(req(buildUnsubscribeUrl(EMAIL), 'POST'));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("You're unsubscribed");
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { email: 'reader@example.com' } });
    const row = sup.fake.rows.get(hashRecipient(EMAIL));
    expect(row?.source).toBe('link');
    expect(row?.clearedAt).toBeNull();
  });

  it('POST stores only the hash, never the address', async () => {
    await POST(req(buildUnsubscribeUrl(EMAIL), 'POST'));
    expect(JSON.stringify(Array.from(sup.fake.rows.entries())).toLowerCase()).not.toContain('reader@example.com');
  });

  it('POST records the opt-out before deleting, so a failed delete still leaves the address suppressed', async () => {
    deleteMany.mockRejectedValue(new Error('db blip'));
    const res = await POST(req(buildUnsubscribeUrl(EMAIL), 'POST'));
    expect(res.status).toBe(500);
    expect(sup.fake.rows.get(hashRecipient(EMAIL))?.clearedAt).toBeNull();
  });

  it('POST is idempotent: a second click is still a 2xx', async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await POST(req(buildUnsubscribeUrl(EMAIL), 'POST'));
    const res = await POST(req(buildUnsubscribeUrl(EMAIL), 'POST'));
    expect(res.status).toBe(200);
    expect(sup.fake.rows.size).toBe(1);
  });

  it('rejects a token issued for a different address before touching the database', async () => {
    const other = new URL(buildUnsubscribeUrl('someone-else@example.com'));
    const mine = new URL(buildUnsubscribeUrl(EMAIL));
    const forged = `${mine.origin}${mine.pathname}?e=${mine.searchParams.get('e')}&t=${other.searchParams.get('t')}`;
    for (const method of ['GET', 'POST'] as const) {
      const res = await (method === 'GET' ? GET : POST)(req(forged, method));
      expect(res.status).toBe(400);
      expect(await res.text()).toContain('Link not recognized');
    }
    expect(findUnique).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
    expect(sup.fake.rows.size).toBe(0);
  });

  it('rejects missing or malformed parameters', async () => {
    for (const url of [
      'https://musthavemods.com/api/unsubscribe/',
      'https://musthavemods.com/api/unsubscribe/?e=&t=',
      'https://musthavemods.com/api/unsubscribe/?e=%3Cscript%3E&t=abc',
      'https://musthavemods.com/api/unsubscribe/?e=bm90LWFuLWVtYWls&t=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    ]) {
      const res = await POST(req(url, 'POST'));
      expect(res.status).toBe(400);
    }
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('the address never appears in the rendered page', async () => {
    const res = await GET(req(buildUnsubscribeUrl(EMAIL)));
    expect((await res.text()).toLowerCase()).not.toContain('reader@example.com');
  });
});
