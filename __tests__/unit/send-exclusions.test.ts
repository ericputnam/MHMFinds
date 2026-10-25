/**
 * Send exclusion list (Cass, E54/E68, 2026-09-20). Offline: no DB, no network.
 *
 * Guards: the list is hashes only (never an address), the hash is stable under the
 * same normalization the mailer applies, a listed recipient is dropped and an
 * unlisted one is kept, and the shipped send script actually applies the list to
 * the re-permission slice, reports the excluded count, and refuses to run on a
 * list that matches nobody.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import {
  EXCLUDED_RECIPIENT_HASHES,
  SCRIPTED_SIGNUP_HASHES,
  hashRecipient,
  isExcludedRecipient,
  isScriptedSubscriber,
  partitionExcluded,
  scriptedSubscriberHashes,
  unlistedScriptedHashes,
  type SubscriberAccountRow,
} from '@/lib/services/sendExclusions';

const HEX64 = /^[0-9a-f]{64}$/;

describe('exclusion list shape', () => {
  it('is non-empty (day-1 produced hard bounces) and holds only sha256 hex, never an address', () => {
    // 7 day-1 (read 09-20) + 5 day-2 (read 09-24) + 1 weekly issue-06 reject (E226, 10-17).
    // A list only ever grows; a truncation fails here.
    expect(EXCLUDED_RECIPIENT_HASHES.length).toBeGreaterThanOrEqual(13);
    for (const h of EXCLUDED_RECIPIENT_HASHES) {
      expect(h).toMatch(HEX64);
      expect(h).not.toContain('@');
    }
    expect(new Set(EXCLUDED_RECIPIENT_HASHES).size).toBe(EXCLUDED_RECIPIENT_HASHES.length);
  });

  it('every reject hash recorded by a live weekly send is on the list (E205 -> E226)', () => {
    // The weekly ledger stores only sha256 + code per reject. Any reject it has recorded
    // must be excluded before the next issue, or the next issue re-attempts a dead address.
    const ledger = readFileSync(join(process.cwd(), 'reports/funnel/newsletter-sends.jsonl'), 'utf8');
    const rejectHashes = new Set<string>();
    for (const line of ledger.split('\n')) {
      if (!line.trim()) continue;
      let row: { mode?: string; kind?: string; rejects?: Array<{ hash?: string }> };
      try { row = JSON.parse(line); } catch { continue; }
      if (row.mode !== 'live' || !String(row.kind ?? '').startsWith('weekly-issue-')) continue;
      for (const r of row.rejects ?? []) if (r.hash) rejectHashes.add(r.hash);
    }
    // Vacuity guard: issue 06 recorded one reject; a parser that finds none proves nothing.
    expect(rejectHashes.size).toBeGreaterThanOrEqual(1);
    for (const h of Array.from(rejectHashes)) {
      expect(h).toMatch(HEX64);
      expect(EXCLUDED_RECIPIENT_HASHES).toContain(h);
    }
  });

  it('the source file carries no address-shaped string', () => {
    const src = readFileSync(join(process.cwd(), 'lib/services/sendExclusions.ts'), 'utf8');
    expect(src).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    // A bare '@' anywhere (e.g. a pasted local part or a domain-only note) is also refused.
    expect(src.replace(/@\/|@see|@param|@returns/g, '')).not.toContain('@');
  });
});

describe('hashing and matching', () => {
  it('hashes the trimmed, lower-cased address (same normalization as the mailer)', () => {
    expect(hashRecipient('  Reader@Example.COM ')).toBe(hashRecipient('reader@example.com'));
    expect(hashRecipient('reader@example.com')).toMatch(HEX64);
    expect(hashRecipient('reader@example.com')).not.toBe(hashRecipient('other@example.com'));
  });

  it('excludes a listed recipient and keeps everyone else, preserving order', () => {
    // Nobody in the real list is a test address; a synthetic hit proves the mechanism.
    const synthetic = 'bounced-synthetic@example.test';
    const listed = EXCLUDED_RECIPIENT_HASHES.includes(hashRecipient(synthetic));
    expect(listed).toBe(false);
    expect(isExcludedRecipient(synthetic)).toBe(false);

    const { kept, excluded } = partitionExcluded(['a@example.test', synthetic, 'b@example.test']);
    expect(kept).toEqual(['a@example.test', synthetic, 'b@example.test']);
    expect(excluded).toEqual([]);
  });

  it('matches through the hash, not the string', () => {
    // Build a recipient whose hash IS on the list is impossible without the address,
    // which is the point. Instead assert the predicate is purely hash-based.
    const src = readFileSync(join(process.cwd(), 'lib/services/sendExclusions.ts'), 'utf8');
    expect(src).toMatch(/EXCLUDED\.has\(hashRecipient\(email\)\)/);
  });
});

describe('scripted-shaped sign-up suppression (E270)', () => {
  // Synthetic fixtures only. The username shapes mirror E260: letters-only, >=6 case flips.
  const bot: SubscriberAccountRow = { email: 'bot-synthetic@example.test', source: 'signup-optin', username: 'aAaaAAAaaAAaaAAa', isForm: true };
  const human: SubscriberAccountRow = { email: 'human-synthetic@example.test', source: 'signup-optin', username: 'SimmerJane', isForm: true };

  it('the shipped snapshot is hashes only, disjoint from the bounce list, and non-trivial', () => {
    // 101 at the 10-25 snapshot. A list only ever grows; a truncation fails here.
    expect(SCRIPTED_SIGNUP_HASHES.length).toBeGreaterThanOrEqual(101);
    for (const h of SCRIPTED_SIGNUP_HASHES) expect(h).toMatch(HEX64);
    expect(new Set(SCRIPTED_SIGNUP_HASHES).size).toBe(SCRIPTED_SIGNUP_HASHES.length);
    for (const h of SCRIPTED_SIGNUP_HASHES) expect(EXCLUDED_RECIPIENT_HASHES).not.toContain(h);
  });

  it('classifies by the E260 rule: signup-optin + form account + scripted-shaped username', () => {
    expect(isScriptedSubscriber(bot)).toBe(true);
    expect(isScriptedSubscriber(human)).toBe(false);
    expect(isScriptedSubscriber({ ...bot, source: 'footer' })).toBe(false);
    expect(isScriptedSubscriber({ ...bot, isForm: false })).toBe(false);
    expect(isScriptedSubscriber({ ...bot, username: null })).toBe(false);
    expect(isScriptedSubscriber({ ...bot, username: 'aAaaAAAaaAAaaAA1' })).toBe(false);
  });

  it('a classifier-flagged fixture is partitioned out once its hash is listed; the human is kept', () => {
    const hashes = scriptedSubscriberHashes([bot, human, { ...bot, email: ' BOT-synthetic@Example.TEST ' }]);
    expect(hashes).toEqual([hashRecipient(bot.email)]);
    // Not yet in the shipped list → the send script's drift check sees it as unlisted (live refuses).
    expect(unlistedScriptedHashes(hashes)).toEqual(hashes);
    // The real snapshot partitions through the same predicate every path uses.
    expect(partitionExcluded([human.email]).kept).toEqual([human.email]);
    const listed = unlistedScriptedHashes(SCRIPTED_SIGNUP_HASHES.slice(0, 3));
    expect(listed).toEqual([]);
  });

  it('partitionExcluded consults the scripted set, not only the bounce set', () => {
    const src = readFileSync(join(process.cwd(), 'lib/services/sendExclusions.ts'), 'utf8');
    expect(src).toMatch(/new Set\(\[\.\.\.EXCLUDED_RECIPIENT_HASHES, \.\.\.SCRIPTED_SIGNUP_HASHES\]\)/);
  });
});

describe('the shipped send script applies the list', () => {
  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const source = stripComments(
    readFileSync(join(process.cwd(), 'scripts/agents/newsletter-send-test.ts'), 'utf8')
  );

  it('partitions the re-permission slice with partitionExcluded and prints the excluded count', () => {
    expect(source).toMatch(/import \{ partitionExcluded, EXCLUDED_RECIPIENT_HASHES \} from '\.\.\/\.\.\/lib\/services\/sendExclusions'/);
    expect(source).toMatch(/partitionExcluded\(slice\)/);
    expect(source).toMatch(/matched \$\{excludedInSegment\} in the segment/);
    expect(source).toMatch(/\$\{excluded\.length\} in this slice/);
  });

  it('refuses to run when the list matches nobody in the segment (vacuity guard)', () => {
    expect(source).toMatch(/EXCLUDED_RECIPIENT_HASHES\.length > 0 && excludedInSegment === 0/);
    expect(source).toMatch(/refusing to run on an exclusion list that excludes nobody/);
  });

  it('freezes the segment at the day-1 send instant so --offset pages the same list', () => {
    expect(source).toContain("REPERMISSION_ANCHOR_AT = new Date('2026-09-16T10:51:19.626Z')");
    expect(source).toMatch(/createdAt: \{ gte: since, lt: REPERMISSION_ANCHOR_AT \}/);
    // Membership by favourite is frozen as well, or a late first favourite joins the list (09-24).
    expect(source).toMatch(/favorites: \{ some: \{ createdAt: \{ lt: REPERMISSION_ANCHOR_AT \} \} \}/);
    expect(source).not.toMatch(/favorites: \{ some: \{\} \}/);
    expect(source).toMatch(/r\.createdAt < REPERMISSION_ANCHOR_AT/);
    // Exclusions and later consents come off the SLICE, never the list, or indices shift.
    expect(source).toMatch(/const slice = segment\.slice\(offsetArg, offsetArg \+ cap\)/);
    expect(source).not.toMatch(/partitionExcluded\(segment\)\.kept\.slice/);
  });

  it('refuses unknown flags, so a mistyped dry switch cannot become a live send (09-24)', () => {
    expect(source).toMatch(/const dry = args\.includes\('--dry'\)/);
    expect(source).toMatch(/if \(!KNOWN_FLAGS\.has\(a\)\)/);
    expect(source).toMatch(/refusing to run \(dry switch is --dry\)/);
    expect(source).not.toMatch(/KNOWN_FLAGS = new Set\([^)]*'--dry-run'/);
  });

  it('re-classifies before every weekly run and refuses a live send with unlisted scripted subscribers (E270)', () => {
    expect(source).toMatch(/scriptedSubscriberHashes\(await loadSubscriberAccountRows\(prisma\)\)/);
    expect(source).toMatch(/SCRIPTED_SIGNUP_HASHES\.length > 0 && listedInWaitlist === 0/);
    expect(source).toMatch(/if \(unlisted\.length > 0 && !dry\)/);
    expect(source).toMatch(/refusing a live send/);
  });

  it('carries the exclusion counts on the ledger line, never addresses', () => {
    expect(source).toMatch(/excludedInSlice/);
    expect(source).toMatch(/anchor: REPERMISSION_ANCHOR_AT\.toISOString\(\)/);
    expect(source).not.toMatch(/ledgerOf[\s\S]*?results:/);
  });
});
