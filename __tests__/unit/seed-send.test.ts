import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveSeedRecipients, SEED_ALLOWLIST_HASHES, SEED_MAX_RECIPIENTS } from '@/lib/services/seedSend';
import { hashRecipient } from '@/lib/services/sendExclusions';

// Synthetic, reserved-TLD addresses only (RFC 2606). Never a real mailbox.
const A = 'seed-a@example.test';
const B = 'seed-b@example.test';
const C = 'seed-c@example.test';
const D = 'seed-d@example.test';
const allow = [A, B, C, D].map(hashRecipient);

describe('resolveSeedRecipients (E240)', () => {
  it('ships inert: the committed allowlist is empty, so any env value is refused', () => {
    expect(SEED_ALLOWLIST_HASHES.length).toBe(0);
    const r = resolveSeedRecipients(A);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.unrecognisedHashes).toEqual([hashRecipient(A)]);
  });

  it('refuses an unset or empty env var', () => {
    expect(resolveSeedRecipients(undefined, allow).ok).toBe(false);
    expect(resolveSeedRecipients(' , ', allow).ok).toBe(false);
  });

  it(`caps at ${SEED_MAX_RECIPIENTS} even when every address is allowlisted`, () => {
    expect(SEED_MAX_RECIPIENTS).toBe(3);
    expect(resolveSeedRecipients([A, B, C, D].join(','), allow).ok).toBe(false);
    const ok = resolveSeedRecipients(`${A}, ${B} ,${C}`, allow);
    expect(ok).toEqual({ ok: true, recipients: [A, B, C] });
  });

  it('refuses the whole list when one address is not allowlisted, naming only its hash', () => {
    const stranger = 'reader@example.test';
    const r = resolveSeedRecipients(`${A},${stranger}`, allow);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.unrecognisedHashes).toEqual([hashRecipient(stranger)]);
      expect(r.reason).not.toContain('@');
    }
  });

  it('normalizes case/whitespace and de-duplicates before the cap', () => {
    const r = resolveSeedRecipients(` SEED-A@Example.TEST ,${A},${B}`, allow);
    expect(r).toEqual({ ok: true, recipients: [A, B] });
  });

  it('refuses a value that is not an address', () => {
    expect(resolveSeedRecipients('not-an-address', allow).ok).toBe(false);
  });
});

describe('newsletter-send-test.ts --seed wiring', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/agents/newsletter-send-test.ts'), 'utf8');
  it('takes seed recipients only from NEWSLETTER_SEED_TO via the library', () => {
    expect(src).toMatch(/resolveSeedRecipients\(process\.env\.NEWSLETTER_SEED_TO\)/);
  });
  it('refuses a seed address that is a subscriber or an account', () => {
    expect(src).toMatch(/a seed is never a subscriber/);
  });
  it('caps the transport at the seed count', () => {
    expect(src).toMatch(/maxMessages: seeds\.length/);
  });
});
