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
  diversifyByContentType,
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

  it('spreads the "new this week" slots across content types before repeating one (E191 rider)', async () => {
    // Nine eligible rows, download-ordered: six hair first, then furniture,
    // makeup and a null type. Pre-rider the issue was six hair.
    const rows = [
      ...[1, 2, 3, 4, 5, 6].map((n) => mod({ id: `hair-${n}`, contentType: 'hair' })),
      mod({ id: 'furn-1', contentType: 'furniture' }),
      mod({ id: 'makeup-1', contentType: 'makeup' }),
      mod({ id: 'untyped-1', contentType: null }),
    ];
    const db = fakeDb({
      async findRecentMods() {
        return rows;
      },
    });
    const issue = await buildWeeklyIssueData(db, { now: new Date('2026-09-22T15:00:00Z') });
    const ids = issue.posts.map((p) => p.url.match(/\/mods\/([^/]+)\//)?.[1]);
    expect(ids).toEqual(['hair-1', 'furn-1', 'makeup-1', 'untyped-1', 'hair-2', 'hair-3']);
  });

  it('diversifyByContentType is pure, order-preserving and a no-op on diverse input', () => {
    const diverse = [
      mod({ id: 'a', contentType: 'hair' }),
      mod({ id: 'b', contentType: 'furniture' }),
      mod({ id: 'c', contentType: 'poses' }),
    ];
    expect(diversifyByContentType(diverse, 6).map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(diversifyByContentType(diverse, 2).map((m) => m.id)).toEqual(['a', 'b']);
    expect(diversifyByContentType(diverse, 0)).toEqual([]);
    // A single-type catalog still fills every slot — diversity never costs a post.
    const mono = [1, 2, 3].map((n) => mod({ id: `h${n}`, contentType: 'hair' }));
    expect(diversifyByContentType(mono, 6).map((m) => m.id)).toEqual(['h1', 'h2', 'h3']);
    expect(diverse.map((m) => m.id)).toEqual(['a', 'b', 'c']);
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
    vi.doUnmock('fs');
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
    // The file ledger is best-effort on Vercel but real on a laptop — never let a test append
    // to reports/funnel/newsletter-sends.jsonl (a first run of this test did).
    const appendFileSync = vi.fn();
    vi.doMock('fs', async (orig) => {
      const actual = await orig<typeof import('fs')>();
      const patched = { ...actual, appendFileSync, mkdirSync: vi.fn() };
      return { ...patched, default: patched };
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
    expect(appendFileSync).toHaveBeenCalled(); // intercepted, not written
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

/**
 * E184 (2026-10-11): the `--weekly` script path shares this one function with the
 * cron. Options: `dryRun` (preflight, flag not required, no durable row),
 * injected `prisma` (standalone scripts cannot use the Accelerate singleton),
 * `source` on the file-ledger line. Every on-site href — including the two
 * brand links — carries `utm_campaign=weekly-issue-NN`.
 */
describe('sendWeeklyNewsletter — E184 options (dry run, injected client, campaign tag)', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock('@/lib/prisma');
    vi.doUnmock('@/lib/services/bulkMailer');
    vi.doUnmock('fs');
    vi.resetModules();
  });

  function fakeClient() {
    const rows = [mod({ id: 'a' }), mod({ id: 'b' }), mod({ id: 'c' })];
    const logCreate = vi.fn().mockResolvedValue({});
    const client = {
      mod: { findMany: vi.fn().mockResolvedValue(rows), count: vi.fn().mockResolvedValue(42) },
      favorite: { groupBy: vi.fn().mockResolvedValue([]) },
      waitlist: { findMany: vi.fn().mockResolvedValue([{ email: 'one@example.com' }, { email: 'two@example.com' }]) },
      notificationLog: { create: logCreate },
    };
    return { client, logCreate };
  }

  async function mockFsAndMailer() {
    vi.doMock('fs', async (orig) => {
      const actual = await orig<typeof import('fs')>();
      const patched = { ...actual, appendFileSync: vi.fn(), mkdirSync: vi.fn() };
      return { ...patched, default: patched };
    });
    // Read the spy back through the registry: when the whole file runs, vitest keeps the
    // builtin `fs` mock instance from the previous describe alive across doUnmock/resetModules,
    // so a locally-captured vi.fn() can be a different object from the one the lib calls.
    const fsm = await import('fs');
    const appendFileSync = fsm.appendFileSync as unknown as ReturnType<typeof vi.fn>;
    // Refuse to run against the real fs — a dry run would append to the tracked ledger.
    expect(vi.isMockFunction(appendFileSync)).toBe(true);
    appendFileSync.mockClear();
    let renderedHtml = '';
    const sendBulk = vi.fn(async (opts: any) => {
      renderedHtml = opts.build({ email: opts.recipients[0], unsubscribeUrl: 'https://musthavemods.com/api/unsubscribe/?e=abc&t=def', index: 0 }).html;
      return { attempted: opts.recipients.length, sent: opts.dryRun ? 0 : opts.recipients.length, failed: 0, skipped: [], deferred: [], transport: opts.dryRun ? 'none' : 'mock', batches: 1, hourlyLimit: 100 };
    });
    vi.doMock('@/lib/services/bulkMailer', () => ({ sendBulk, resolvePostalAddress: () => '123 Test St, Testville' }));
    return { appendFileSync, sendBulk, html: () => renderedHtml };
  }

  it('dry run works with the flag UNSET, passes dryRun to sendBulk, writes no NotificationLog row, tags the file-ledger line with its source', async () => {
    vi.resetModules();
    delete process.env.NEWSLETTER_WEEKLY_ENABLED;
    // The singleton must not be touched when a client is injected.
    vi.doMock('@/lib/prisma', () => { throw new Error('singleton must not be imported when prisma is injected'); });
    const { appendFileSync, sendBulk } = await mockFsAndMailer();
    const { client, logCreate } = fakeClient();

    const { sendWeeklyNewsletter } = await import('@/lib/services/newsletterWeekly');
    const now = new Date('2026-10-11T16:00:00Z');
    const result = await sendWeeklyNewsletter({ dryRun: true, prisma: client as any, source: 'script', now });

    expect(result.skipped).toBeUndefined();
    expect(result.mode).toBe('dry');
    expect(result.campaign).toBe('weekly-issue-05');
    expect(result.recipients).toBe(2);
    expect(sendBulk).toHaveBeenCalledTimes(1);
    expect(sendBulk.mock.calls[0][0].dryRun).toBe(true);
    expect(logCreate).not.toHaveBeenCalled();
    // One line to each of logs/newsletter-send.log and reports/funnel/newsletter-sends.jsonl.
    expect(appendFileSync).toHaveBeenCalledTimes(2);
    const line = String(appendFileSync.mock.calls[0][1]);
    expect(line).toContain('"source":"script"');
    expect(line).toContain('"mode":"dry"');
    expect(line).not.toMatch(/@example\.com/);
  });

  it('live with the flag unset is skipped even with an injected client (the lib defence survives the new caller)', async () => {
    vi.resetModules();
    delete process.env.NEWSLETTER_WEEKLY_ENABLED;
    const { sendBulk } = await mockFsAndMailer();
    const { client, logCreate } = fakeClient();
    const { sendWeeklyNewsletter } = await import('@/lib/services/newsletterWeekly');
    const result = await sendWeeklyNewsletter({ prisma: client as any, source: 'script' });
    expect(result.skipped).toBe(true);
    expect(sendBulk).not.toHaveBeenCalled();
    expect(logCreate).not.toHaveBeenCalled();
    expect(client.waitlist.findMany).not.toHaveBeenCalled();
  });

  it('every on-site href in the rendered issue — brand links included — carries utm_campaign=weekly-issue-NN', async () => {
    vi.resetModules();
    process.env.NEWSLETTER_WEEKLY_ENABLED = 'true';
    const { sendBulk, html } = await mockFsAndMailer();
    const { client, logCreate } = fakeClient();
    const { sendWeeklyNewsletter } = await import('@/lib/services/newsletterWeekly');
    const result = await sendWeeklyNewsletter({ prisma: client as any, source: 'script', now: new Date('2026-10-11T16:00:00Z') });

    expect(result.mode).toBe('live');
    expect(sendBulk).toHaveBeenCalledTimes(1);
    expect(logCreate).toHaveBeenCalledTimes(1);
    const hrefs = Array.from(html().matchAll(/href="([^"]+)"/g)).map((m) => m[1].replace(/&amp;/g, '&'));
    const onSite = hrefs.filter((h) => /^https:\/\/(www\.)?musthavemods\.com\//.test(h) && !h.includes('/api/unsubscribe/'));
    const brand = onSite.filter((h) => new URL(h).pathname === '/');
    // Footer brand link always; "Browse and filter all N" only when the fake has saved mods (groupBy → [] here).
    expect(brand.length).toBeGreaterThanOrEqual(1);
    expect(onSite.length).toBeGreaterThan(3);
    for (const h of onSite) {
      expect(new URL(h).searchParams.get('utm_campaign'), `untagged: ${h}`).toBe('weekly-issue-05');
    }
  });

  /**
   * E205 (2026-10-14): issue 05's one 550 could not be excluded from issue 06 —
   * the row stored `failed: 1`, no DSN ever arrived. A live run must now carry
   * the sha256 of each synchronous reject (plus only its status code) in both
   * the file ledger and the durable NotificationLog body, and never the address
   * or the error text (SMTP errors echo the recipient).
   */
  it('a live run records the hash + status code of each synchronous reject, never the address or error text', async () => {
    vi.resetModules();
    process.env.NEWSLETTER_WEEKLY_ENABLED = 'true';
    const { appendFileSync, sendBulk } = await mockFsAndMailer();
    sendBulk.mockImplementationOnce(async (opts: any) => ({
      attempted: 2, sent: 1, failed: 1, skipped: [], deferred: [], transport: 'mock', batches: 1, hourlyLimit: 100,
      results: [
        { email: opts.recipients[0], subject: 's', sent: true, batch: 0, headers: {} },
        { email: opts.recipients[1], subject: 's', sent: false, batch: 0, headers: {},
          error: 'Error: Can\'t send mail - all recipients were rejected: 550 5.1.1 <two@example.com>: Recipient address rejected' },
      ],
    }));
    const { client, logCreate } = fakeClient();
    const { sendWeeklyNewsletter } = await import('@/lib/services/newsletterWeekly');
    const { hashRecipient } = await import('@/lib/services/sendExclusions');
    const result = await sendWeeklyNewsletter({ prisma: client as any, source: 'script', now: new Date('2026-10-15T14:00:00Z') });

    const expected = [{ hash: hashRecipient('two@example.com'), code: '5.1.1' }];
    expect(result.failed).toBe(1);
    expect(result.rejects).toEqual(expected);
    const line = String(appendFileSync.mock.calls[0][1]);
    expect(JSON.parse(line).rejects).toEqual(expected);
    const body = String(logCreate.mock.calls[0][0].data.body);
    expect(JSON.parse(body).rejects).toEqual(expected);
    for (const out of [line, body]) {
      expect(out).not.toMatch(/@/);
      expect(out).not.toMatch(/Recipient address rejected/);
    }
  });

  it('a dry run and a clean live run carry no rejects field', async () => {
    vi.resetModules();
    process.env.NEWSLETTER_WEEKLY_ENABLED = 'true';
    const { appendFileSync } = await mockFsAndMailer();
    const { client } = fakeClient();
    const { sendWeeklyNewsletter } = await import('@/lib/services/newsletterWeekly');
    const dry = await sendWeeklyNewsletter({ dryRun: true, prisma: client as any, source: 'script' });
    const live = await sendWeeklyNewsletter({ prisma: client as any, source: 'script' });
    expect(dry.rejects).toBeUndefined();
    expect(live.rejects).toBeUndefined();
    for (const c of appendFileSync.mock.calls) expect(String(c[1])).not.toContain('"rejects"');
  });
});

describe('sendWeeklyNewsletter — stable order + resume cursor past the hard cap (E205)', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.doUnmock('@/lib/services/bulkMailer');
    vi.doUnmock('fs');
    vi.resetModules();
  });

  it('reads waitlist oldest-first, names the deferred tail with a cursor, and a resumed run queries strictly after it', async () => {
    vi.resetModules();
    process.env.NEWSLETTER_WEEKLY_ENABLED = 'true';
    vi.doMock('fs', async (orig) => {
      const actual = await orig<typeof import('fs')>();
      const patched = { ...actual, appendFileSync: vi.fn(), mkdirSync: vi.fn() };
      return { ...patched, default: patched };
    });
    const fsm = await import('fs');
    expect(vi.isMockFunction(fsm.appendFileSync)).toBe(true);
    // Cap of 2: the third (newest) row is deferred.
    const sendBulk = vi.fn(async (opts: any) => ({
      attempted: 2, sent: 2, failed: 0, skipped: [], deferred: opts.recipients.slice(2), transport: 'mock', batches: 1, hourlyLimit: 100,
      results: opts.recipients.slice(0, 2).map((email: string) => ({ email, subject: 's', sent: true, batch: 0, headers: {} })),
    }));
    vi.doMock('@/lib/services/bulkMailer', () => ({ sendBulk, resolvePostalAddress: () => '123 Test St, Testville' }));
    const t = (d: string) => new Date(`2026-10-0${d}T00:00:00.000Z`);
    const rows = [
      { email: 'old@example.com', createdAt: t('1'), id: 'aaa1' },
      { email: 'mid@example.com', createdAt: t('2'), id: 'bbb2' },
      { email: 'new@example.com', createdAt: t('3'), id: 'ccc3' },
    ];
    const findMany = vi.fn().mockResolvedValue(rows);
    const client = {
      mod: { findMany: vi.fn().mockResolvedValue([mod({ id: 'a' }), mod({ id: 'b' })]), count: vi.fn().mockResolvedValue(42) },
      favorite: { groupBy: vi.fn().mockResolvedValue([]) },
      waitlist: { findMany },
      notificationLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const { sendWeeklyNewsletter } = await import('@/lib/services/newsletterWeekly');
    const first = await sendWeeklyNewsletter({ prisma: client as any, source: 'script' });

    expect(findMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]);
    expect(findMany.mock.calls[0][0].where).toBeUndefined();
    expect(first.deferred).toBe(1);
    expect(first.resumeCursor).toBe('2026-10-02T00:00:00.000Z~bbb2');
    expect(String((fsm.appendFileSync as any).mock.calls[0][1])).toContain('"resumeCursor":"2026-10-02T00:00:00.000Z~bbb2"');

    findMany.mockResolvedValueOnce([rows[2]]);
    const second = await sendWeeklyNewsletter({ prisma: client as any, source: 'script', resumeAfter: first.resumeCursor });
    expect(findMany.mock.calls[1][0].where).toEqual({
      OR: [{ createdAt: { gt: t('2') } }, { createdAt: t('2'), id: { gt: 'bbb2' } }],
    });
    expect(second.recipients).toBe(1);
    expect(second.resumedAfter).toBe(first.resumeCursor);
    expect(second.resumeCursor).toBeUndefined();
  });

  it('refuses a malformed cursor instead of silently restarting from the oldest subscriber', async () => {
    const { parseResumeCursor, sendWeeklyNewsletter } = await import('@/lib/services/newsletterWeekly');
    expect(() => parseResumeCursor('bbb2')).toThrow(/malformed/);
    expect(() => parseResumeCursor('not-a-date~bbb2')).toThrow(/malformed/);
    expect(() => parseResumeCursor('2026-10-02T00:00:00.000Z~')).toThrow(/malformed/);
    expect(parseResumeCursor('2026-10-02T00:00:00.000Z~bbb2').id).toBe('bbb2');
    const findMany = vi.fn();
    await expect(
      sendWeeklyNewsletter({ dryRun: true, prisma: { waitlist: { findMany } } as any, resumeAfter: 'garbage' })
    ).rejects.toThrow(/malformed/);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('smtpStatusCode / collectRejects (E205)', () => {
  it('keeps only a status code from the error string', async () => {
    const { smtpStatusCode } = await import('@/lib/services/newsletterWeekly');
    expect(smtpStatusCode('550 5.1.1 <x@y.z>: no such user')).toBe('5.1.1');
    expect(smtpStatusCode('Error: 552 mailbox full for x@y.z')).toBe('552');
    expect(smtpStatusCode('ECONNRESET')).toBeNull();
    expect(smtpStatusCode(undefined)).toBeNull();
  });

  it('hashes undelivered non-preview results only, sorted, and tolerates a missing results array', async () => {
    const { collectRejects } = await import('@/lib/services/newsletterWeekly');
    const { hashRecipient } = await import('@/lib/services/sendExclusions');
    expect(collectRejects(undefined)).toEqual([]);
    const out = collectRejects([
      { email: 'ok@example.com', sent: true },
      { email: 'dry@example.com', sent: false, preview: { html: '', text: '' } },
      { email: ' B@Example.com ', sent: false },
      { email: 'a@example.com', sent: false, error: '421 4.7.0 try later' },
    ]);
    const want = [
      { hash: hashRecipient('b@example.com'), code: null },
      { hash: hashRecipient('a@example.com'), code: '4.7.0' },
    ].sort((x, y) => x.hash.localeCompare(y.hash));
    expect(out).toEqual(want);
  });
});
