/**
 * Weekly newsletter builder + cron gate tests (Cass, 2026-09-21)
 *
 * Offline: prisma is mocked everywhere; `buildWeeklyIssueData` takes an
 * in-memory fake `NewsletterDb` instead of the real database, matching the
 * "pure: no network, no DB" rule the underlying renderer already enforces.
 *
 * What these guard:
 *  - the cron route no-ops (never calls the send path) unless
 *    NEWSLETTER_WEEKLY_ENABLED is exactly "true", regardless of CRON_SECRET;
 *  - the cron route 401s an unauthenticated/misauthenticated request even
 *    when the flag is on, and fails CLOSED when CRON_SECRET is unset;
 *  - Part A (2026-09-30) ships unscheduled: no vercel.json cron points at it;
 *  - flag on + secret reaches the real send path (mailer mocked) with the
 *    100/run cap, and every on-site URL in the rendered issue carries the
 *    trailing slash (`trailingSlash: true` covers /api/* too);
 *  - `sendWeeklyNewsletter` itself re-checks the flag (defense in depth —
 *    it must refuse to send even if some future caller skips the route);
 *  - the issue builder only selects mods whose image is on an allowed host,
 *    and widens its lookback window instead of crashing when the last 7
 *    days don't have enough eligible mods;
 *  - `computeIssueNumber` / `formatDateLabel` are pure and deterministic.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const notificationLogCreate = vi.fn().mockResolvedValue({});
vi.mock('@/lib/prisma', () => ({
  prisma: { notificationLog: { create: (...a: unknown[]) => notificationLogCreate(...a) } },
  default: { notificationLog: { create: (...a: unknown[]) => notificationLogCreate(...a) } },
}));

import {
  buildWeeklyIssueData,
  computeIssueNumber,
  formatDateLabel,
  pickCollectionDefinition,
  type ModRow,
  type NewsletterDb,
  type SavedModRow,
} from '@/lib/services/newsletterWeekly';

const ORIGINAL_ENV = { ...process.env };

function req(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { method: 'GET', headers });
}

function mod(overrides: Partial<ModRow> = {}): ModRow {
  return {
    id: 'mod-1',
    title: 'Test Mod',
    thumbnail: 'https://blog.musthavemods.com/wp-content/uploads/test-300x200.jpg',
    shortDescription: 'A short blurb about the mod.',
    description: null,
    contentType: 'hair',
    downloadCount: 10,
    createdAt: new Date('2026-09-18T00:00:00Z'),
    ...overrides,
  };
}

function fakeDb(overrides: Partial<NewsletterDb> = {}): NewsletterDb {
  return {
    async findRecentMods() {
      return [mod({ id: 'a' }), mod({ id: 'b' }), mod({ id: 'c' })];
    },
    async findMostSaved() {
      const saved: SavedModRow[] = [
        { ...mod({ id: 'saved-1' }), saves: 12 },
        { ...mod({ id: 'saved-2' }), saves: 9 },
      ];
      return saved;
    },
    async countMods() {
      return 42;
    },
    async catalogCount() {
      return 12345;
    },
    ...overrides,
  };
}

describe('computeIssueNumber / formatDateLabel', () => {
  it('is deterministic and pure — same date in, same number out', () => {
    const d = new Date('2026-09-22T15:00:00Z');
    expect(computeIssueNumber(d)).toBe(computeIssueNumber(new Date('2026-09-22T15:00:00Z')));
  });

  it('increases by one issue per elapsed week', () => {
    const week0 = computeIssueNumber(new Date('2026-09-15T00:00:00Z'));
    const week1 = computeIssueNumber(new Date('2026-09-22T00:00:00Z'));
    const week2 = computeIssueNumber(new Date('2026-09-29T00:00:00Z'));
    expect(week1).toBe(week0 + 1);
    expect(week2).toBe(week0 + 2);
  });

  it('never collides with the hand-built issue #1 (2026-09-14)', () => {
    expect(computeIssueNumber(new Date('2026-09-15T00:00:00Z'))).toBeGreaterThanOrEqual(2);
  });

  it('formats a date without any locale/Intl dependence', () => {
    expect(formatDateLabel(new Date('2026-09-22T00:00:00Z'))).toBe('September 22, 2026');
    expect(formatDateLabel(new Date('2026-01-05T00:00:00Z'))).toBe('January 5, 2026');
  });
});

describe('pickCollectionDefinition', () => {
  it('always returns a definition from the registry, deterministically per week', () => {
    const a = pickCollectionDefinition(new Date('2026-09-22T00:00:00Z'));
    const b = pickCollectionDefinition(new Date('2026-09-22T12:00:00Z'));
    expect(a).toBe(b);
    expect(a.slug).toBeTruthy();
  });
});

describe('buildWeeklyIssueData', () => {
  it('builds an issue from the fake DB with posts, saved mods, a collection and a catalog count', async () => {
    const issue = await buildWeeklyIssueData(fakeDb(), { now: new Date('2026-09-22T15:00:00Z') });
    expect(issue.posts.length).toBeGreaterThanOrEqual(2);
    expect(issue.saved.length).toBeGreaterThan(0);
    expect(issue.catalogCount).toBe(12345);
    expect(issue.collection.url).toContain('https://musthavemods.com');
    expect(issue.asks).toHaveLength(2);
    expect(issue.number).toBe(computeIssueNumber(new Date('2026-09-22T15:00:00Z')));
  });

  it('UTM-tags on-site links for GA4 attribution (source=newsletter, medium=email), but not off-site links', async () => {
    const issue = await buildWeeklyIssueData(fakeDb(), { now: new Date('2026-09-22T15:00:00Z') });
    const campaign = `weekly-issue-${String(issue.number).padStart(2, '0')}`;
    for (const url of [issue.posts[0].url, issue.saved[0].url, issue.collection.url, issue.asks[0].ctaUrl]) {
      expect(url).toContain('utm_source=newsletter');
      expect(url).toContain('utm_medium=email');
      expect(url).toContain(`utm_campaign=${campaign}`);
    }
    // The Patreon ask is off-site — we don't control UTM handling there.
    expect(issue.asks[1].ctaUrl).not.toContain('utm_source');
  });

  it('filters out mods whose image is not on an allowed host', async () => {
    const db = fakeDb({
      async findRecentMods() {
        return [
          mod({ id: 'off-host', thumbnail: 'https://images.surferseo.art/x.jpg' }),
          mod({ id: 'ok-1' }),
          mod({ id: 'ok-2' }),
        ];
      },
    });
    const issue = await buildWeeklyIssueData(db, { now: new Date('2026-09-22T15:00:00Z') });
    for (const post of issue.posts) {
      expect(post.image.startsWith('https://blog.musthavemods.com')).toBe(true);
    }
  });

  it('widens the lookback window instead of crashing on a slow content week', async () => {
    const now = new Date('2026-09-22T15:00:00Z');
    const calls: number[] = [];
    const db = fakeDb({
      async findRecentMods({ since }) {
        const days = Math.round((now.getTime() - since.getTime()) / (24 * 60 * 60 * 1000));
        calls.push(days);
        // Only the widest window (28d) returns enough eligible mods.
        if (days < 28) return [];
        return [mod({ id: 'late-1' }), mod({ id: 'late-2' })];
      },
    });
    const issue = await buildWeeklyIssueData(db, { now });
    expect(issue.posts.length).toBeGreaterThanOrEqual(2);
    expect(calls).toContain(28);
  });

  it('throws rather than sending a hollow issue when no window has enough eligible mods', async () => {
    const db = fakeDb({
      async findRecentMods() {
        return [];
      },
    });
    await expect(buildWeeklyIssueData(db, { now: new Date('2026-09-22T15:00:00Z') })).rejects.toThrow(
      /fewer than 2/
    );
  });
});

describe('GET /api/cron/weekly-newsletter — enabled/disabled gate + auth', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CRON_SECRET = 'test-cron-secret';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock('@/lib/services/newsletterWeekly');
  });

  it('401s when the bearer token is missing or wrong, even with the flag on', async () => {
    process.env.NEWSLETTER_WEEKLY_ENABLED = 'true';
    const send = vi.fn();
    vi.doMock('@/lib/services/newsletterWeekly', () => ({ sendWeeklyNewsletter: send }));
    const { GET } = await import('@/app/api/cron/weekly-newsletter/route');

    const res1 = await GET(req('https://musthavemods.com/api/cron/weekly-newsletter'));
    expect(res1.status).toBe(401);

    const res2 = await GET(
      req('https://musthavemods.com/api/cron/weekly-newsletter', { authorization: 'Bearer wrong' })
    );
    expect(res2.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it('is a no-op (200, skipped) when NEWSLETTER_WEEKLY_ENABLED is unset, even with a valid token', async () => {
    delete process.env.NEWSLETTER_WEEKLY_ENABLED;
    const send = vi.fn();
    vi.doMock('@/lib/services/newsletterWeekly', () => ({ sendWeeklyNewsletter: send }));
    const { GET } = await import('@/app/api/cron/weekly-newsletter/route');

    const res = await GET(
      req('https://musthavemods.com/api/cron/weekly-newsletter', {
        authorization: 'Bearer test-cron-secret',
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.skipped).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it('is a no-op when the flag is any value other than the literal string "true"', async () => {
    process.env.NEWSLETTER_WEEKLY_ENABLED = 'TRUE';
    const send = vi.fn();
    vi.doMock('@/lib/services/newsletterWeekly', () => ({ sendWeeklyNewsletter: send }));
    const { GET } = await import('@/app/api/cron/weekly-newsletter/route');

    const res = await GET(
      req('https://musthavemods.com/api/cron/weekly-newsletter', {
        authorization: 'Bearer test-cron-secret',
      })
    );
    expect((await res.json()).skipped).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it('calls the send path when authorized and the flag is exactly "true"', async () => {
    process.env.NEWSLETTER_WEEKLY_ENABLED = 'true';
    const send = vi.fn().mockResolvedValue({ success: true, sent: 3, recipients: 3 });
    vi.doMock('@/lib/services/newsletterWeekly', () => ({ sendWeeklyNewsletter: send }));
    const { GET } = await import('@/app/api/cron/weekly-newsletter/route');

    const res = await GET(
      req('https://musthavemods.com/api/cron/weekly-newsletter', {
        authorization: 'Bearer test-cron-secret',
      })
    );
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('fails CLOSED: 401 with no send when CRON_SECRET is unset, even with the flag on', async () => {
    delete process.env.CRON_SECRET;
    process.env.NEWSLETTER_WEEKLY_ENABLED = 'true';
    const send = vi.fn();
    vi.doMock('@/lib/services/newsletterWeekly', () => ({ sendWeeklyNewsletter: send }));
    const { GET } = await import('@/app/api/cron/weekly-newsletter/route');

    const res1 = await GET(req('https://musthavemods.com/api/cron/weekly-newsletter/'));
    const res2 = await GET(
      req('https://musthavemods.com/api/cron/weekly-newsletter/', { authorization: 'Bearer undefined' })
    );
    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it('is force-dynamic (never statically rendered or cached as a page)', async () => {
    vi.doMock('@/lib/services/newsletterWeekly', () => ({ sendWeeklyNewsletter: vi.fn() }));
    const mod = await import('@/app/api/cron/weekly-newsletter/route');
    expect(mod.dynamic).toBe('force-dynamic');
  });

  it('POST delegates to the same GET handler (manual trigger, same auth)', async () => {
    process.env.NEWSLETTER_WEEKLY_ENABLED = 'true';
    const send = vi.fn().mockResolvedValue({ success: true, sent: 0, recipients: 0 });
    vi.doMock('@/lib/services/newsletterWeekly', () => ({ sendWeeklyNewsletter: send }));
    const { POST } = await import('@/app/api/cron/weekly-newsletter/route');

    const res = await POST(
      req('https://musthavemods.com/api/cron/weekly-newsletter', {
        authorization: 'Bearer test-cron-secret',
      })
    );
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('sendWeeklyNewsletter — re-checks the flag itself', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('is inert when called directly with the flag off, regardless of caller', async () => {
    delete process.env.NEWSLETTER_WEEKLY_ENABLED;
    const { sendWeeklyNewsletter } = await import('@/lib/services/newsletterWeekly');
    const result = await sendWeeklyNewsletter();
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
  });
});

describe('Part A is unscheduled (E78 split, 2026-09-30)', () => {
  it('vercel.json has no cron pointing at /api/cron/weekly-newsletter — Part B is Tier 2 (Q18)', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const cfg = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));
    const crons: Array<{ path?: string }> = cfg.crons ?? [];
    // Scanner vacuity guard: the file parsed and has the other crons.
    expect(crons.length).toBeGreaterThan(0);
    // When the operator approves "approve 78-cron", the Part B PR deletes this assertion.
    expect(crons.filter((c) => String(c.path).includes('weekly-newsletter'))).toEqual([]);
  });
});

describe('sendWeeklyNewsletter — flag on, real send path, mailer mocked', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock('@/lib/prisma');
    vi.doUnmock('@/lib/services/bulkMailer');
    vi.resetModules();
  });

  it('sends to deduped waitlist rows through sendBulk (live, capped at 100) and every on-site href has a trailing slash', async () => {
    vi.resetModules();
    process.env.NEWSLETTER_WEEKLY_ENABLED = 'true';
    const rows = [mod({ id: 'a' }), mod({ id: 'b' }), mod({ id: 'c' })];
    const logCreate = vi.fn().mockResolvedValue({});
    vi.doMock('@/lib/prisma', () => {
      const p = {
        mod: { findMany: vi.fn().mockResolvedValue(rows), count: vi.fn().mockResolvedValue(42) },
        favorite: { groupBy: vi.fn().mockResolvedValue([]) },
        waitlist: {
          findMany: vi.fn().mockResolvedValue([
            { email: 'One@Example.com ' },
            { email: 'one@example.com' },
            { email: 'two@example.com' },
            { email: 'not-an-address' },
          ]),
        },
        notificationLog: { create: logCreate },
      };
      return { prisma: p, default: p };
    });
    const unsub = 'https://musthavemods.com/api/unsubscribe/?e=abc&t=def';
    let renderedHtml = '';
    const sendBulk = vi.fn(async (opts: any) => {
      renderedHtml = opts.build({ email: opts.recipients[0], unsubscribeUrl: unsub, index: 0 }).html;
      return { attempted: opts.recipients.length, sent: opts.recipients.length, failed: 0, skipped: [], deferred: [], transport: 'mock', batches: 1, hourlyLimit: 100 };
    });
    vi.doMock('@/lib/services/bulkMailer', () => ({
      sendBulk,
      resolvePostalAddress: () => '123 Test St, Testville',
    }));

    const { sendWeeklyNewsletter, WEEKLY_NEWSLETTER_HARD_CAP } = await import('@/lib/services/newsletterWeekly');
    const result = await sendWeeklyNewsletter();

    expect(sendBulk).toHaveBeenCalledTimes(1);
    const opts = sendBulk.mock.calls[0][0];
    expect(opts.dryRun).toBe(false);
    expect(opts.maxMessages).toBe(WEEKLY_NEWSLETTER_HARD_CAP);
    expect(WEEKLY_NEWSLETTER_HARD_CAP).toBe(100);
    expect([...opts.recipients].sort()).toEqual(['one@example.com', 'two@example.com']);
    expect(result).toMatchObject({ success: true, sent: 2, recipients: 2 });
    // Counts-only durable ledger — never an address.
    expect(logCreate).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logCreate.mock.calls[0])).not.toMatch(/@example\.com/);

    expect(renderedHtml).toContain(unsub);
    const hrefs = Array.from(renderedHtml.matchAll(/href="([^"]+)"/g)).map((m) => m[1].replace(/&amp;/g, '&'));
    const onSite = hrefs.filter((h) => /^https:\/\/(www\.)?musthavemods\.com\//.test(h));
    expect(onSite.length).toBeGreaterThan(3);
    for (const h of onSite) {
      const path = new URL(h).pathname;
      expect(path.endsWith('/'), `missing trailing slash: ${h}`).toBe(true);
    }
  });
});
