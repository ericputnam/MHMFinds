/**
 * Subscriber → account invite (Cass, E233, 2026-10-18). Offline: no DB, no network.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import { hashRecipient } from '@/lib/services/sendExclusions';
import {
  INVITE_CAMPAIGN,
  INVITE_HARD_CAP,
  invitedHashesFromRecords,
  inviteSignupUrl,
  renderInvite,
  selectInviteRecipients,
  weeklyRejectHashesFromRecords,
} from '@/lib/services/subscriberInvite';

const d = (s: string) => new Date(s);
const row = (email: string, at: string, id = email) => ({ email, createdAt: d(at), id });
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('selectInviteRecipients', () => {
  const base = {
    accountEmails: [] as string[],
    invitedHashes: [] as string[],
    weeklyRejectHashes: [] as string[],
  };

  it('orders oldest subscriber first, not by input order', () => {
    const sel = selectInviteRecipients({
      ...base,
      waitlist: [row('c@x.test', '2026-10-03'), row('a@x.test', '2026-10-01'), row('b@x.test', '2026-10-02')],
    });
    expect(sel.recipients).toEqual(['a@x.test', 'b@x.test', 'c@x.test']);
  });

  it('drops anyone with an account, case-insensitively', () => {
    const sel = selectInviteRecipients({
      ...base,
      waitlist: [row(' Has@X.test ', '2026-10-01'), row('no@x.test', '2026-10-02')],
      accountEmails: ['has@x.test'],
    });
    expect(sel.recipients).toEqual(['no@x.test']);
    expect(sel.counts.hasAccount).toBe(1);
  });

  it('never re-invites a hash a prior live run recorded (idempotent)', () => {
    const prior = invitedHashesFromRecords([
      { kind: INVITE_CAMPAIGN, mode: 'live', invitedHashes: [hashRecipient('old@x.test')] },
      // a dry run is a preflight, not an invite — it must not suppress anyone
      { kind: INVITE_CAMPAIGN, mode: 'dry', invitedHashes: [hashRecipient('dry@x.test')] },
    ]);
    const sel = selectInviteRecipients({
      ...base,
      waitlist: [row('old@x.test', '2026-10-01'), row('dry@x.test', '2026-10-02')],
      invitedHashes: prior,
    });
    expect(sel.recipients).toEqual(['dry@x.test']);
    expect(sel.counts.alreadyInvited).toBe(1);
  });

  it('drops every reject hash a live weekly send recorded', () => {
    const rejects = weeklyRejectHashesFromRecords([
      { kind: 'weekly-issue-06', mode: 'live', rejects: [{ hash: hashRecipient('dead@x.test'), code: null }] },
      { kind: 'repermission', rejects: [{ hash: hashRecipient('other@x.test'), code: null }] },
    ]);
    const sel = selectInviteRecipients({
      ...base,
      waitlist: [row('dead@x.test', '2026-10-01'), row('other@x.test', '2026-10-02')],
      weeklyRejectHashes: rejects,
    });
    expect(sel.recipients).toEqual(['other@x.test']);
    expect(sel.counts.weeklyReject).toBe(1);
  });

  it('caps a run at INVITE_HARD_CAP whatever --limit asks, and reports the tail as deferred', () => {
    const waitlist = Array.from({ length: INVITE_HARD_CAP + 7 }, (_, i) =>
      row(`u${i}@x.test`, new Date(Date.UTC(2026, 8, 1) + i * 1000).toISOString())
    );
    const sel = selectInviteRecipients({ ...base, waitlist, limit: 10_000 });
    expect(sel.recipients).toHaveLength(INVITE_HARD_CAP);
    expect(sel.deferred).toBe(7);
    expect(selectInviteRecipients({ ...base, waitlist, limit: 5 }).recipients).toEqual(
      ['u0@x.test', 'u1@x.test', 'u2@x.test', 'u3@x.test', 'u4@x.test']
    );
  });

  it('applies the shared exclusion list through partitionExcluded (library, not caller)', () => {
    const src = stripComments(readFileSync(join(process.cwd(), 'lib/services/subscriberInvite.ts'), 'utf8'));
    expect(src).toMatch(/partitionExcluded\(/);
  });
});

describe('the invite email', () => {
  const UNSUB = 'https://musthavemods.com/api/unsubscribe/?e=abc&t=def';
  const msg = renderInvite({ unsubscribeUrl: UNSUB, postalAddress: '1 Test St, Town, ST 00000' });

  it('carries the per-recipient unsubscribe link and the postal address in html and text', () => {
    expect(msg.html).toContain(UNSUB);
    expect(msg.text).toContain(UNSUB);
    expect(msg.html).toContain('1 Test St');
    expect(msg.text).toContain('1 Test St');
  });

  it('links to the credentials sign-up with a trailing slash, utm_campaign=invite-01 and no address', () => {
    const u = new URL(inviteSignupUrl());
    expect(u.pathname).toBe('/sign-in/');
    expect(u.searchParams.get('mode')).toBe('signup');
    expect(u.searchParams.get('utm_campaign')).toBe('invite-01');
    expect(u.searchParams.get('ref')).toBe('invite-01');
    expect(inviteSignupUrl()).not.toMatch(/@|%40/);
    expect(msg.html).toContain(inviteSignupUrl().replace(/&/g, '&amp;'));
  });

  it('carries no token and no fake urgency', () => {
    expect(msg.html).not.toMatch(/token=/);
    expect(msg.html + msg.text).not.toMatch(/\b(hurry|last chance|expires|only \d+|limited|today only|spots)\b/i);
    // It must not claim an account already exists (none does for these readers).
    expect(msg.html + msg.text).not.toMatch(/account is ready|set up an account for you/i);
  });
});

describe('sources hold no address', () => {
  it('library and script contain no email-shaped string outside the sender mailbox', () => {
    for (const f of ['lib/services/subscriberInvite.ts', 'scripts/agents/subscriber-invite-send.ts']) {
      const src = readFileSync(join(process.cwd(), f), 'utf8').replace(/simsnews@musthavemods\.com/g, '');
      expect(src, f).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/);
    }
  });

  it('the script refuses --live without SUBSCRIBER_INVITE_ENABLED and needs exactly one of --dry/--live', () => {
    const src = stripComments(readFileSync(join(process.cwd(), 'scripts/agents/subscriber-invite-send.ts'), 'utf8'));
    expect(src).toMatch(/process\.env\.SUBSCRIBER_INVITE_ENABLED !== 'true'/);
    expect(src).toMatch(/dry === live/);
  });
});
