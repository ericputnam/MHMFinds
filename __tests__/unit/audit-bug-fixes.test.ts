/**
 * Guards for the bugs fixed after the 2026-11-11 project audit. Each block names the
 * defect it would have caught; all of them are red against the pre-fix tree.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const prismaMock = {
  favorite: { findMany: vi.fn() },
  creatorProfile: { findMany: vi.fn() },
  mod: { findMany: vi.fn() },
  subscription: { updateMany: vi.fn(), update: vi.fn() },
};
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock, default: prismaMock }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));
const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
const syncAllNetworks = vi.fn();
vi.mock('@/lib/services/affiliateEarnings/earningsSync', () => ({
  syncAllNetworks: (...a: unknown[]) => syncAllNetworks(...a),
}));
const runJob = vi.fn();
vi.mock('@/lib/services/agentOrchestrator', () => ({ agentOrchestrator: { runJob: (...a: unknown[]) => runJob(...a) } }));
const constructEvent = vi.fn();
vi.mock('@/lib/services/stripeService', () => ({
  StripeService: { constructEvent: (...a: unknown[]) => constructEvent(...a) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cron endpoints fail closed', () => {
  const saved = process.env.CRON_SECRET;
  afterEach(() => {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  });

  const routes = [
    ['commission-sync', () => import('@/app/api/cron/commission-sync/route')],
    ['monetization-agent', () => import('@/app/api/cron/monetization-agent/route')],
  ] as const;

  for (const [name, load] of routes) {
    it(`${name}: 401 with CRON_SECRET unset, and nothing runs`, async () => {
      delete process.env.CRON_SECRET;
      const { GET } = await load();
      const res = await GET(new NextRequest(`http://localhost/api/cron/${name}/`));
      expect(res.status).toBe(401);
      expect(syncAllNetworks).not.toHaveBeenCalled();
      expect(runJob).not.toHaveBeenCalled();
    });

    it(`${name}: 401 with the wrong bearer`, async () => {
      process.env.CRON_SECRET = 'right';
      const { GET } = await load();
      const res = await GET(
        new NextRequest(`http://localhost/api/cron/${name}/`, { headers: { authorization: 'Bearer wrong' } }),
      );
      expect(res.status).toBe(401);
    });
  }
});

describe('Stripe webhook', () => {
  it('answers 500 (so Stripe retries) when processing the event fails', async () => {
    const { SubscriptionService } = await import('@/lib/services/subscriptionService');
    const spy = vi.spyOn(SubscriptionService, 'handleSubscriptionDeleted').mockRejectedValue(new Error('db down'));
    constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'customer.subscription.deleted',
      created: 1_700_000_000,
      data: { object: { id: 'sub_1' } },
    });
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const res = await POST(
      new NextRequest('http://localhost/api/webhooks/stripe/', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'sig' },
      }),
    );
    expect(spy).toHaveBeenCalled();
    expect(res.status).toBe(500);
    spy.mockRestore();
  });

  it('subscription.updated: no Invalid Date, unknown status left alone, unknown subscription is not a throw', async () => {
    const { SubscriptionService } = await import('@/lib/services/subscriptionService');
    prismaMock.subscription.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      SubscriptionService.handleSubscriptionUpdated({
        id: 'sub_x',
        status: 'paused',
        cancel_at_period_end: false,
        items: { data: [{ price: { id: 'price_1' }, current_period_end: 1_800_000_000 }] },
      }),
    ).resolves.toBeUndefined();
    const { data } = prismaMock.subscription.updateMany.mock.calls[0][0];
    expect(data.stripeCurrentPeriodEnd).toEqual(new Date(1_800_000_000 * 1000));
    expect(data.stripePriceId).toBe('price_1');
    expect('status' in data).toBe(false);

    prismaMock.subscription.updateMany.mockClear();
    await SubscriptionService.handleSubscriptionUpdated({ id: 'sub_y', status: 'past_due', items: { data: [] } });
    const second = prismaMock.subscription.updateMany.mock.calls[0][0].data;
    expect(second.status).toBe('PAST_DUE');
    expect('stripeCurrentPeriodEnd' in second).toBe(false);
  });
});

describe('creator rankings rank before paging', () => {
  it('returns the top creator by favorites even when it is the newest profile', async () => {
    // createdAt-ascending ids: old-1, old-2, new-star
    prismaMock.creatorProfile.findMany.mockImplementation(async (args: any) => {
      if (args?.where?.id?.in) {
        return (args.where.id.in as string[]).map((id) => ({
          id,
          handle: id,
          bio: null,
          website: null,
          isVerified: false,
          user: { displayName: null, avatar: null },
        }));
      }
      return [{ id: 'old-1' }, { id: 'old-2' }, { id: 'new-star' }];
    });
    prismaMock.mod.findMany.mockResolvedValue([
      { creatorId: 'old-1', downloadCount: 5, rating: null, _count: { favorites: 1 } },
      { creatorId: 'new-star', downloadCount: 50, rating: '4.00', _count: { favorites: 90 } },
      { creatorId: 'new-star', downloadCount: 10, rating: null, _count: { favorites: 10 } },
    ]);
    const { GET } = await import('@/app/api/creators/rankings/route');
    const res = await GET(new NextRequest('http://localhost/api/creators/rankings/?limit=1'));
    const json = await res.json();
    expect(json.creators).toHaveLength(1);
    expect(json.creators[0]).toMatchObject({
      id: 'new-star',
      totalFavorites: 100,
      totalDownloads: 60,
      modCount: 2,
      averageRating: 4,
    });
  });
});

describe('GET /api/account/favorites', () => {
  it('401 for a signed-out visitor, with no query', async () => {
    getServerSession.mockResolvedValue(null);
    const { GET } = await import('@/app/api/account/favorites/route');
    const res = await GET();
    expect(res.status).toBe(401);
    expect(prismaMock.favorite.findMany).not.toHaveBeenCalled();
  });

  it('returns only the session user\'s ids and is never cacheable', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1' } });
    prismaMock.favorite.findMany.mockResolvedValue([{ modId: 'a' }, { modId: 'b' }]);
    const { GET } = await import('@/app/api/account/favorites/route');
    const res = await GET();
    expect(await res.json()).toEqual({ ids: ['a', 'b'] });
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(prismaMock.favorite.findMany.mock.calls[0][0].where).toEqual({ userId: 'u1' });
  });

  it('a duplicate POST (400) counts as saved; nothing else does', async () => {
    const { isAlreadyFavorited } = await import('@/lib/capture/useGridFavoriteIds');
    expect(isAlreadyFavorited('POST', 400)).toBe(true);
    expect(isAlreadyFavorited('DELETE', 400)).toBe(false);
    expect(isAlreadyFavorited('POST', 401)).toBe(false);
    expect(isAlreadyFavorited('POST', 500)).toBe(false);
  });
});

describe('WordPress proxy forwards only WordPress cookies', () => {
  it('drops the NextAuth session and CSRF cookies', async () => {
    const { wordpressCookies } = await import('@/middleware');
    const header = [
      '__Secure-next-auth.session-token=SECRET',
      'next-auth.csrf-token=abc',
      'wordpress_logged_in_123=wp',
      'wp-settings-1=x',
      'comment_author_9=me',
      '_ga=GA1.1',
    ].join('; ');
    const out = wordpressCookies(header);
    expect(out).toBe('wordpress_logged_in_123=wp; wp-settings-1=x; comment_author_9=me');
    expect(out).not.toContain('next-auth');
    expect(wordpressCookies(null)).toBe('');
  });
});

describe('next.config.js keeps per-user API responses out of shared caches', () => {
  it('a private, no-store entry follows the blanket /api rule for every session-dependent prefix', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require('../../next.config.js');
    const rules: { source: string; headers: { key: string; value: string }[] }[] = await config.headers();
    const cacheRules = rules.filter((r) => r.headers.some((h) => h.key === 'Cache-Control'));
    const blanket = cacheRules.findIndex((r) => r.source === '/api/:path*');
    expect(blanket).toBeGreaterThanOrEqual(0);
    for (const prefix of ['account', 'admin', 'auth', 'creator', 'monetization', 'subscription']) {
      const i = cacheRules.findIndex((r) => r.source === `/api/${prefix}/:path*`);
      // Later entries win in Next.js, so the exemption must come after the blanket rule.
      expect(i, prefix).toBeGreaterThan(blanket);
      expect(cacheRules[i].headers[0].value).toBe('private, no-store');
    }
  });
});
