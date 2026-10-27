/**
 * Durable unsubscribe list + email-borne unsubscribes (2026-10-26)
 *
 * Offline. Guards:
 *  - the suppression lifecycle (create / already / stale / reactivate / clear),
 *  - that the lookup sendBulk uses maps hashes back to the exact addresses passed,
 *  - that the mailbox reader's output is validated, and anything odd is
 *    could-not-run — never "0 requests",
 *  - the Python reader's own classifier self-test, and that it can only read the
 *    mailbox through the read-only wrapper.
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import {
  clearUnsubscribe,
  isSuppressed,
  recordUnsubscribe,
  recordUnsubscribeHash,
  suppressionLookupFor,
  type SuppressionDb,
} from '@/lib/services/emailSuppression';
import { hashRecipient } from '@/lib/services/sendExclusions';
import {
  MailboxCouldNotRun,
  describeSync,
  parseReaderOutput,
  syncUnsubscribeMailbox,
} from '@/scripts/agents/unsubscribe-mailbox-lib';
import { fakeSuppressionDb } from '../fixtures/fakeSuppressionDb';

const asDb = (f: ReturnType<typeof fakeSuppressionDb>) => f.db as unknown as SuppressionDb;
const T = (iso: string) => new Date(iso);
const H = hashRecipient('reader@example.com');

describe('emailSuppression lifecycle', () => {
  it('records by hash only, case- and whitespace-insensitive', async () => {
    const f = fakeSuppressionDb();
    expect(await recordUnsubscribe(asDb(f), '  Reader@Example.COM ', 'link', T('2026-10-01'))).toBe('created');
    expect(Array.from(f.rows.keys())).toEqual([H]);
    expect(JSON.stringify(Array.from(f.rows.values()))).not.toContain('@');
    expect(await isSuppressed(asDb(f), 'reader@example.com')).toBe(true);
  });

  it('is idempotent while active', async () => {
    const f = fakeSuppressionDb();
    await recordUnsubscribe(asDb(f), 'reader@example.com', 'link', T('2026-10-01'));
    expect(await recordUnsubscribe(asDb(f), 'reader@example.com', 'mailto', T('2026-10-02'))).toBe('already');
    expect(f.rows.get(H)?.source).toBe('link');
  });

  it('a confirm after the request clears it; a request before the clear is stale; a newer one re-activates', async () => {
    const f = fakeSuppressionDb();
    await recordUnsubscribe(asDb(f), 'reader@example.com', 'link', T('2026-10-01'));
    expect(await clearUnsubscribe(asDb(f), 'reader@example.com', T('2026-10-05'))).toBe(1);
    expect(await isSuppressed(asDb(f), 'reader@example.com')).toBe(false);

    // Re-processing an old mailbox must not undo the re-subscribe.
    expect(await recordUnsubscribeHash(asDb(f), H, 'mailto', T('2026-10-03'))).toBe('stale');
    expect(await recordUnsubscribeHash(asDb(f), H, 'mailto', T('2026-10-05'))).toBe('stale');
    expect(await isSuppressed(asDb(f), 'reader@example.com')).toBe(false);

    expect(await recordUnsubscribeHash(asDb(f), H, 'reply', T('2026-10-09'))).toBe('reactivated');
    expect(await isSuppressed(asDb(f), 'reader@example.com')).toBe(true);
    expect(f.rows.get(H)?.source).toBe('reply');
  });

  it('a confirm never clears a request dated after it', async () => {
    const f = fakeSuppressionDb();
    await recordUnsubscribe(asDb(f), 'reader@example.com', 'mailto', T('2026-10-10'));
    expect(await clearUnsubscribe(asDb(f), 'reader@example.com', T('2026-10-09'))).toBe(0);
    expect(await isSuppressed(asDb(f), 'reader@example.com')).toBe(true);
  });

  it('survives a create race on the unique index', async () => {
    const f = fakeSuppressionDb();
    const realCreate = f.db.emailSuppression.create;
    let first = true;
    f.db.emailSuppression.create = async (args) => {
      if (first) {
        first = false;
        await realCreate(args); // the other request won
        throw Object.assign(new Error('unique'), { code: 'P2002' });
      }
      return realCreate(args);
    };
    expect(await recordUnsubscribeHash(asDb(f), H, 'mailto', T('2026-10-01'))).toBe('already');
  });

  it('rejects a malformed hash, an unknown source and an invalid date', async () => {
    const f = fakeSuppressionDb();
    await expect(recordUnsubscribeHash(asDb(f), 'reader@example.com', 'link')).rejects.toThrow(/64/);
    await expect(recordUnsubscribeHash(asDb(f), H, 'webhook' as never)).rejects.toThrow(/source/);
    await expect(recordUnsubscribeHash(asDb(f), H, 'link', new Date('nope'))).rejects.toThrow(/date/);
    expect(f.rows.size).toBe(0);
  });

  it('the lookup returns exactly the addresses it was given that are actively suppressed', async () => {
    const f = fakeSuppressionDb();
    await recordUnsubscribe(asDb(f), 'a@example.com', 'link', T('2026-10-01'));
    await recordUnsubscribe(asDb(f), 'b@example.com', 'link', T('2026-10-01'));
    await clearUnsubscribe(asDb(f), 'b@example.com', T('2026-10-02'));
    const hit = await suppressionLookupFor(asDb(f))(['a@example.com', 'b@example.com', 'c@example.com']);
    expect(Array.from(hit)).toEqual(['a@example.com']);
  });
});

const ok = (requests: unknown[]) => JSON.stringify({ status: 'ok', read_at: 'x', since: '2026-09-01', requests, counts: { scanned: 3 } });
const ROW = { hash: H, via: 'subject', requestedAt: '2026-10-20T10:00:00Z' };

describe('mailbox reader output', () => {
  it('parses the last JSON line and normalizes the date', () => {
    const out = parseReaderOutput(`noise\n${ok([ROW])}\n`);
    expect(out.requests).toEqual([{ hash: H, via: 'subject', requestedAt: '2026-10-20T10:00:00.000Z' }]);
  });

  it('treats could-not-run, missing JSON and malformed rows as could-not-run, never as zero requests', () => {
    for (const bad of [
      '',
      'Traceback (most recent call last):',
      JSON.stringify({ status: 'could-not-run', reason: 'IMAP connect/login failed (OSError)' }),
      JSON.stringify({ status: 'ok' }),
      ok([{ ...ROW, hash: 'reader@example.com' }]),
      ok([{ ...ROW, via: 'header' }]),
      ok([{ ...ROW, requestedAt: 'yesterday' }]),
    ]) {
      expect(() => parseReaderOutput(bad), bad).toThrow(MailboxCouldNotRun);
    }
  });

  it('carries the reader’s own reason through', () => {
    expect(() => parseReaderOutput(JSON.stringify({ status: 'could-not-run', reason: 'no INBOX' }))).toThrow(
      'reader: no INBOX'
    );
  });

  it('sync records mailto and reply requests with their sources, and a dry sync writes nothing', async () => {
    const f = fakeSuppressionDb();
    const H2 = hashRecipient('other@example.com');
    const reader = async () =>
      parseReaderOutput(ok([ROW, { hash: H2, via: 'reply', requestedAt: '2026-10-21T10:00:00Z' }]));

    const dry = await syncUnsubscribeMailbox(asDb(f), { apply: false, reader });
    expect(dry.found).toBe(2);
    expect(dry.applied).toBeNull();
    expect(f.rows.size).toBe(0);

    const live = await syncUnsubscribeMailbox(asDb(f), { apply: true, reader });
    expect(live.applied).toEqual({ created: 2, reactivated: 0, already: 0, stale: 0 });
    expect(f.rows.get(H)?.source).toBe('mailto');
    expect(f.rows.get(H2)?.source).toBe('reply');
    expect(describeSync(live)).not.toContain('@');

    const again = await syncUnsubscribeMailbox(asDb(f), { apply: true, reader });
    expect(again.applied).toEqual({ created: 0, reactivated: 0, already: 2, stale: 0 });
  });

  it('sync propagates could-not-run so a send stops', async () => {
    const f = fakeSuppressionDb();
    const reader = async () => {
      throw new MailboxCouldNotRun('reader: IMAP SEARCH failed');
    };
    await expect(syncUnsubscribeMailbox(asDb(f), { apply: true, reader })).rejects.toThrow(MailboxCouldNotRun);
  });
});

describe('mailbox-unsubscribe-requests.py', () => {
  const dir = join(process.cwd(), 'scripts/agents');

  it('passes its classifier self-test', () => {
    const out = execFileSync('python3', [join(dir, 'mailbox-unsubscribe-requests.py'), '--self-test'], {
      encoding: 'utf8',
      timeout: 30_000,
    });
    expect(out).toMatch(/self-test: (\d+)\/\1 passed/);
  });

  it('reaches the mailbox only through the read-only wrapper', () => {
    const strip = (s: string) => s.replace(/"""[\s\S]*?"""/g, '').replace(/#.*$/gm, '');
    for (const f of ['mailbox-unsubscribe-requests.py', 'mailbox-dsn-count.py']) {
      const src = strip(readFileSync(join(dir, f), 'utf8'));
      expect(src, f).not.toMatch(/\bimaplib\b/);
      expect(src, f).toContain('ReadOnlyMailbox');
    }
    const wrapper = strip(readFileSync(join(dir, '_mailbox_readonly.py'), 'utf8'));
    expect(wrapper).toContain('readonly=True');
    expect(wrapper).toContain('BODY.PEEK[]');
    // Every IMAP command the wrapper can issue — STORE/COPY/MOVE/EXPUNGE/APPEND/UID would fail this.
    const commands = new Set(Array.from(wrapper.matchAll(/__conn\.(\w+)\(/g), (m) => m[1]));
    expect(commands.size).toBeGreaterThan(0);
    expect(Array.from(commands).sort()).toEqual(['fetch', 'list', 'login', 'logout', 'search', 'select']);
  });
});
