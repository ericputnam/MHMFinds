/**
 * Bulk mailer + unsubscribe unit tests (Cass, 2026-09-07)
 *
 * These run entirely offline: no SMTP connection, no network, no database.
 * The send function is injected, `sleep` and `now` are injected, and prisma is
 * mocked. What they guard is the list of things that make a bulk send safe:
 * throttle ceiling, batching, unsubscribe headers, plain-text alternative,
 * dry-run-by-default, and the refusal to send with no transport.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { notificationLog: { create: vi.fn() } },
  default: { notificationLog: { create: vi.fn() } },
}));

import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_HOURLY_LIMIT,
  chunk,
  normalizeRecipients,
  previewBulkSend,
  resolveHourlyLimit,
  sendBulk,
} from '@/lib/services/bulkMailer';
import { htmlToPlainText, emailNotifier } from '@/lib/services/emailNotifier';
import {
  buildUnsubscribeUrl,
  decodeUnsubscribeEmail,
  signUnsubscribeToken,
  unsubscribeHeaders,
  verifyUnsubscribeToken,
} from '@/lib/services/unsubscribe';

const ORIGINAL_ENV = { ...process.env };

function build({ unsubscribeUrl, email }: { unsubscribeUrl: string; email: string }) {
  return {
    subject: 'New Sims 4 finds this week',
    html:
      `<p>Hi ${email}</p><p>Five new mods.</p>` +
      `<p><a href="${unsubscribeUrl}">Unsubscribe</a></p>`,
  };
}

function recipients(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `sim${i}@example.com`);
}

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = 'test-signing-key-not-a-real-secret';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://musthavemods.com';
  delete process.env.SMTP_HOST;
  delete process.env.SENDGRID_API_KEY;
  delete process.env.SMTP_HOURLY_LIMIT;
  emailNotifier.resetTransport();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
});

describe('unsubscribe tokens', () => {
  it('round-trips the address and verifies its own token', () => {
    const url = buildUnsubscribeUrl('Reader@Example.COM');
    const params = new URL(url).searchParams;
    expect(decodeUnsubscribeEmail(params.get('e')!)).toBe('reader@example.com');
    expect(verifyUnsubscribeToken('reader@example.com', params.get('t')!)).toBe(true);
  });

  it('is case- and whitespace-insensitive on the address', () => {
    expect(signUnsubscribeToken('  Reader@Example.com ')).toBe(
      signUnsubscribeToken('reader@example.com')
    );
  });

  it('rejects a tampered token and another subscriber token', () => {
    const token = signUnsubscribeToken('reader@example.com');
    expect(verifyUnsubscribeToken('reader@example.com', `${token}x`)).toBe(false);
    expect(verifyUnsubscribeToken('someone-else@example.com', token)).toBe(false);
    expect(verifyUnsubscribeToken('reader@example.com', '')).toBe(false);
  });

  it('never puts the signing secret in the link', () => {
    expect(buildUnsubscribeUrl('reader@example.com')).not.toContain(
      process.env.NEXTAUTH_SECRET
    );
  });

  it('emits List-Unsubscribe with https + mailto, and One-Click only when asserted', () => {
    const optIn = unsubscribeHeaders('reader@example.com', { oneClick: true });
    expect(optIn['List-Unsubscribe']).toMatch(/^<https:\/\/musthavemods\.com\/api\/unsubscribe\?/);
    expect(optIn['List-Unsubscribe']).toContain('mailto:');
    expect(optIn['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');

    const optOut = unsubscribeHeaders('reader@example.com', { oneClick: false });
    expect(optOut['List-Unsubscribe-Post']).toBeUndefined();
  });
});

describe('recipient hygiene', () => {
  it('lowercases, trims, drops malformed addresses and de-duplicates', () => {
    const { valid, skipped } = normalizeRecipients([
      ' Reader@Example.com ',
      'reader@example.com',
      'not-an-email',
      '',
      'second@example.com',
    ]);
    expect(valid).toEqual(['reader@example.com', 'second@example.com']);
    expect(skipped).toHaveLength(3);
  });
});

describe('throttle ceiling', () => {
  it('defaults to 100/hour and never resolves above it', () => {
    expect(DEFAULT_HOURLY_LIMIT).toBe(100);
    expect(resolveHourlyLimit()).toBe(100);
    expect(resolveHourlyLimit(50)).toBe(50);
    expect(resolveHourlyLimit(5000)).toBe(100);
  });

  it('clamps an env override above the ceiling too', () => {
    process.env.SMTP_HOURLY_LIMIT = '10000';
    expect(resolveHourlyLimit()).toBe(100);
    process.env.SMTP_HOURLY_LIMIT = '40';
    expect(resolveHourlyLimit()).toBe(40);
  });

  it('waits out the rolling hour instead of exceeding the limit', async () => {
    const waits: number[] = [];
    let clock = 1_000_000;
    const result = await sendBulk({
      recipients: recipients(25),
      build,
      dryRun: true,
      hourlyLimit: 10,
      batchSize: 5,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
      now: () => clock,
    });

    // 25 messages at 10/hour => two full windows have to drain.
    expect(waits).toEqual([3_600_000, 3_600_000]);
    expect(result.throttleWaitsMs).toEqual(waits);
    expect(result.attempted).toBe(25);
  });

  it('does not wait when the run fits inside one window', async () => {
    const waits: number[] = [];
    await sendBulk({
      recipients: recipients(20),
      build,
      dryRun: true,
      hourlyLimit: 100,
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    expect(waits).toEqual([]);
  });
});

describe('batching and warm-up', () => {
  it('chunks recipients by batch size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(DEFAULT_BATCH_SIZE).toBe(20);
  });

  it('splits a run into the expected number of batches', async () => {
    const result = await sendBulk({
      recipients: recipients(45),
      build,
      dryRun: true,
      batchSize: 20,
    });
    expect(result.batches).toBe(3);
    expect(result.results.filter((r) => r.batch === 0)).toHaveLength(20);
    expect(result.results.filter((r) => r.batch === 2)).toHaveLength(5);
  });

  it('defers everything past maxMessages rather than sending it', async () => {
    const result = await sendBulk({
      recipients: recipients(30),
      build,
      dryRun: true,
      maxMessages: 17,
    });
    expect(result.attempted).toBe(17);
    expect(result.deferred).toHaveLength(13);
  });
});

describe('message shape', () => {
  it('gives every recipient their own unsubscribe URL and headers', async () => {
    const result = await sendBulk({ recipients: recipients(3), build, dryRun: true });
    const urls = result.results.map(
      (r) => r.headers['List-Unsubscribe'].match(/<(https:[^>]+)>/)![1]
    );
    expect(new Set(urls).size).toBe(3);
    for (const r of result.results) {
      expect(r.headers['List-Unsubscribe']).toBeTruthy();
    }
  });

  it('withholds List-Unsubscribe-Post unless one-click is explicitly asserted', async () => {
    const off = await sendBulk({ recipients: recipients(1), build, dryRun: true });
    expect(off.results[0].headers['List-Unsubscribe-Post']).toBeUndefined();

    const on = await sendBulk({
      recipients: recipients(1),
      build,
      dryRun: true,
      oneClickUnsubscribe: true,
    });
    expect(on.results[0].headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('derives a plain-text alternative that keeps the unsubscribe link', async () => {
    const result = await sendBulk({ recipients: recipients(1), build, dryRun: true });
    const text = result.results[0].preview!.text;
    expect(text).not.toContain('<');
    expect(text).toContain('/api/unsubscribe?');
  });

  it('refuses to render a message whose body omits the unsubscribe link', async () => {
    await expect(
      sendBulk({
        recipients: recipients(1),
        build: () => ({ subject: 'no way out', html: '<p>hi</p>' }),
        dryRun: true,
      })
    ).rejects.toThrow(/unsubscribe link/i);
  });

  it('htmlToPlainText keeps link targets and strips markup', () => {
    const text = htmlToPlainText('<p>Hello</p><a href="https://x.test/a">click</a>');
    expect(text).toContain('Hello');
    expect(text).toContain('click (https://x.test/a)');
    expect(text).not.toContain('<a');
  });
});

describe('send safety', () => {
  it('is a dry run unless the caller opts out, and never calls the transport', async () => {
    const send = vi.fn().mockResolvedValue(true);
    const result = await sendBulk({ recipients: recipients(4), build, send });
    expect(result.dryRun).toBe(true);
    expect(send).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
    expect(result.results[0].preview).toBeDefined();
  });

  it('previewBulkSend renders without sending', async () => {
    const result = await previewBulkSend({ recipients: recipients(2), build });
    expect(result.dryRun).toBe(true);
    expect(result.results).toHaveLength(2);
  });

  it('throws rather than sending when no transport is configured', async () => {
    await expect(
      sendBulk({ recipients: recipients(1), build, dryRun: false })
    ).rejects.toThrow(/no transport configured/i);
  });

  it('sends with headers and a text part once a transport exists', async () => {
    process.env.SMTP_HOST = 'smtp.example.test';
    emailNotifier.resetTransport();
    const send = vi.fn().mockResolvedValue(true);

    const result = await sendBulk({
      recipients: recipients(2),
      build,
      dryRun: false,
      send,
      fromName: 'MustHaveMods',
    });

    expect(result.transport).toBe('smtp');
    expect(send).toHaveBeenCalledTimes(2);
    const [to, subject, html, opts] = send.mock.calls[0];
    expect(to).toBe('sim0@example.com');
    expect(subject).toBe('New Sims 4 finds this week');
    expect(html).toContain('/api/unsubscribe?');
    expect(opts.headers['List-Unsubscribe']).toBeTruthy();
    expect(opts.text).toBeTruthy();
    expect(opts.skipLog).toBe(true);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('counts a transport failure instead of throwing the whole run away', async () => {
    process.env.SMTP_HOST = 'smtp.example.test';
    emailNotifier.resetTransport();
    const send = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('550 mailbox unavailable'));

    const result = await sendBulk({ recipients: recipients(2), build, dryRun: false, send });
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.results[1].error).toContain('550');
  });
});

describe('transport selection', () => {
  it('prefers SMTP over SendGrid, and reports none when unconfigured', () => {
    emailNotifier.resetTransport();
    expect(emailNotifier.transport()).toBe('none');
    expect(emailNotifier.isConfigured()).toBe(false);

    process.env.SENDGRID_API_KEY = 'sg-placeholder';
    emailNotifier.resetTransport();
    expect(emailNotifier.transport()).toBe('sendgrid');

    process.env.SMTP_HOST = 'smtp.example.test';
    emailNotifier.resetTransport();
    expect(emailNotifier.transport()).toBe('smtp');
    expect(emailNotifier.isConfigured()).toBe(true);
  });
});
