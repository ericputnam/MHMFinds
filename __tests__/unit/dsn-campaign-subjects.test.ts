/**
 * E254 (Cass, 2026-10-21): every live send's subject must be attributable by the bounce
 * counter. `scripts/agents/mailbox-dsn-count.py` attributes a DSN to a campaign by a
 * substring of the returned message's subject (`CAMPAIGN_SUBJECTS`). A send whose subject
 * is missing there reads as "other" — E240 found 13 weekly DSNs filed under "other", and
 * the E233 invite-01 hard DSN of 10-19 (5.7.1) was "other" until this test's PR.
 *
 * Guard the constant, not a copy: INVITE_SUBJECT is imported from the module that sends it.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { INVITE_SUBJECT } from '../../lib/services/subscriberInvite';

const ROOT = join(__dirname, '..', '..');
const py = readFileSync(join(ROOT, 'scripts/agents/mailbox-dsn-count.py'), 'utf8');

/** The quoted values of the CAMPAIGN_SUBJECTS dict, comments stripped. */
function campaignNeedles(src: string): string[] {
  const m = src.match(/CAMPAIGN_SUBJECTS\s*=\s*\{([\s\S]*?)\n\}/);
  if (!m) return [];
  const body = m[1]
    .split('\n')
    .map((l) => l.replace(/#.*$/, ''))
    .join('\n');
  return Array.from(body.matchAll(/"[^"]+"\s*:\s*"([^"]+)"/g), (x) => x[1]);
}

describe('mailbox-dsn-count CAMPAIGN_SUBJECTS covers every live send subject', () => {
  const needles = campaignNeedles(py);

  it('parses the dict (vacuity guard)', () => {
    expect(needles.length).toBeGreaterThanOrEqual(3);
  });

  const covered = (subject: string) => needles.some((n) => subject.includes(n));

  it('attributes the E233 subscriber invite', () => {
    expect(covered(INVITE_SUBJECT)).toBe(true);
  });

  it('attributes the DB-built weekly issue (subject prefix in newsletterWeekly.ts)', () => {
    const weekly = readFileSync(join(ROOT, 'lib/services/newsletterWeekly.ts'), 'utf8');
    const m = weekly.match(/subject:\s*`([^`$]+)\$\{/);
    expect(m).not.toBeNull();
    expect(covered(m![1])).toBe(true);
  });
});
