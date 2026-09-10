import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  containsMarker,
  diffEnvNames,
  diffSnapshots,
  exitCodeFor,
  EXPECTED_REQUIRED,
  parseVercelEnvNames,
  redact,
  summaryLine,
  tiersFromCampaign,
  WELCOME_NOTE_MARKER,
  type Snapshot,
} from '../../scripts/agents/operator-did-probe-lib';

/**
 * The morning "operator did" probe (Rio, E35). These tests cover the pure half only — parsing,
 * diffing, redaction, exit codes — so they run with no Vercel login, no Patreon token, no network.
 */

const VERCEL_LS = `Vercel CLI 48.0.0
> Environment Variables found for ericputnams-projects/mhm-finds-dw5l [162ms]

 name                              value               environments    created
 UNSUBSCRIBE_SECRET                Encrypted           Production      1h ago
 SMTP_PASS                         Encrypted           Production      1d ago
 PATREON_CLIENT_ID                 Encrypted           Production      3d ago
 NEXT_PUBLIC_MEMBERSHIP_ENABLED    Encrypted           Production      3d ago
 NEXTAUTH_SECRET                   Encrypted           Production      1y ago

Common
- \`vercel env add\`
`;

function snap(over: Partial<Snapshot> = {}): Snapshot {
  return {
    date: '2026-09-10',
    generatedAt: '2026-09-10T13:00:00.000Z',
    env: {
      status: 'ok',
      present: ['SMTP_HOST', 'UNSUBSCRIBE_SECRET'],
      missing: ['EMAIL_POSTAL_ADDRESS'],
      optionalPresent: [],
      optionalMissing: ['UNSUBSCRIBE_MAILBOX'],
    },
    patreon: {
      status: 'ok',
      campaignId: '13460416',
      tiers: [
        { id: 't1', title: 'Support Tier', amount_cents: 100, published: true, patron_count: 8, edited_at: null, published_at: null, unpublished_at: null, descriptionHasMarker: false, descriptionHasPerk: false },
        { id: 't3', title: 'Tip Jar - Curious Simmer', amount_cents: 300, published: true, patron_count: 40, edited_at: '2026-09-09T01:35:00Z', published_at: null, unpublished_at: null, descriptionHasMarker: false, descriptionHasPerk: true },
      ],
      thanksMsgHasMarker: false,
      welcomeNoteObservable: false,
      welcomeNoteCheckedFields: ['campaign.thanks_msg', 'tier.description'],
    },
    blog: { status: 'ok', exitCode: 0 },
    ...over,
  };
}

describe('parseVercelEnvNames', () => {
  it('returns only the name column, in order, and stops at the footer', () => {
    expect(parseVercelEnvNames(VERCEL_LS)).toEqual([
      'UNSUBSCRIBE_SECRET',
      'SMTP_PASS',
      'PATREON_CLIENT_ID',
      'NEXT_PUBLIC_MEMBERSHIP_ENABLED',
      'NEXTAUTH_SECRET',
    ]);
  });

  it('never returns a value cell or the Common footer', () => {
    const names = parseVercelEnvNames(VERCEL_LS);
    expect(names).not.toContain('Encrypted');
    expect(names).not.toContain('Common');
    expect(names.every((n) => /^[A-Z][A-Z0-9_]*$/.test(n))).toBe(true);
  });

  it('is empty on garbage', () => {
    expect(parseVercelEnvNames('Error: not logged in')).toEqual([]);
    expect(parseVercelEnvNames('')).toEqual([]);
  });
});

describe('diffEnvNames', () => {
  it('splits required into present/missing and never counts optional as missing', () => {
    const d = diffEnvNames(['SMTP_HOST', 'UNSUBSCRIBE_SECRET', 'UNSUBSCRIBE_MAILBOX', 'NEXTAUTH_SECRET']);
    expect(d.present).toEqual(['SMTP_HOST', 'UNSUBSCRIBE_SECRET']);
    expect(d.missing).toContain('EMAIL_POSTAL_ADDRESS');
    expect(d.missing).toContain('NEXT_PUBLIC_SITE_URL');
    expect(d.missing).not.toContain('UNSUBSCRIBE_MAILBOX');
    expect(d.optionalPresent).toEqual(['UNSUBSCRIBE_MAILBOX']);
    expect(d.unexpected).toEqual(['NEXTAUTH_SECRET']);
    expect(d.present.length + d.missing.length).toBe(EXPECTED_REQUIRED.length);
  });

  it('expects exactly the 8 newsletter + 5 membership names', () => {
    expect(EXPECTED_REQUIRED).toHaveLength(13);
    for (const n of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM', 'EMAIL_POSTAL_ADDRESS', 'UNSUBSCRIBE_SECRET', 'NEXT_PUBLIC_SITE_URL', 'PATREON_CLIENT_ID', 'PATREON_CLIENT_SECRET', 'PATREON_CAMPAIGN_ID', 'PATREON_MEMBER_MIN_CENTS', 'NEXT_PUBLIC_MEMBERSHIP_ENABLED']) {
      expect(EXPECTED_REQUIRED).toContain(n);
    }
  });
});

describe('redact', () => {
  it('scrubs KEY=value pairs, bearer tokens, emails and long token-like runs but keeps names and counts', () => {
    const out = redact('SMTP_PASS=hunter2secret Bearer abc.def.ghi user@example.com tok_1234567890abcdefghijklmnopqrstuvwxyz $3 "Tip Jar" 8 patrons');
    expect(out).not.toContain('hunter2secret');
    expect(out).not.toContain('abc.def.ghi');
    expect(out).not.toContain('user@example.com');
    expect(out).not.toContain('tok_1234567890abcdefghijklmnopqrstuvwxyz');
    expect(out).toContain('SMTP_PASS=[REDACTED]');
    expect(out).toContain('Bearer [REDACTED]');
    expect(out).toContain('[email]');
    expect(out).toContain('$3 "Tip Jar" 8 patrons');
  });

  it('leaves ordinary env var names, ISO timestamps and dated file paths alone', () => {
    const s = 'UNSUBSCRIBE_SECRET present; edited 2026-09-09T01:35:00.000+00:00; NEXT_PUBLIC_MEMBERSHIP_ENABLED; reports/funnel/drafts/patreon-welcome-note-2026-09-09.md';
    expect(redact(s)).toBe(s);
  });

  it('scrubs a JWT and a 64-hex secret even without a KEY= prefix', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const hex = 'a3f9c2e1b7d84f60a3f9c2e1b7d84f60a3f9c2e1b7d84f60a3f9c2e1b7d84f60';
    const out = redact(`token ${jwt} and ${hex}`);
    expect(out).not.toContain(jwt);
    expect(out).not.toContain(hex);
  });
});

describe('tiersFromCampaign + containsMarker', () => {
  it('extracts tiers sorted by price and flags the perk line / welcome-note phrase in the description', () => {
    const tiers = tiersFromCampaign({
      data: { id: '13460416', attributes: { thanks_msg: '' } },
      included: [
        { type: 'tier', id: '5', attributes: { title: 'Extra Support', amount_cents: 500, published: true, patron_count: 0, description: '' } },
        { type: 'tier', id: '3', attributes: { title: 'Tip Jar', amount_cents: 300, published: true, patron_count: 40, edited_at: '2026-09-09T01:35:00Z', description: '<p>Skip the download countdown on MustHaveMods.com</p>' } },
        { type: 'goal', id: 'g', attributes: {} },
      ],
    });
    expect(tiers.map((t) => t.amount_cents)).toEqual([300, 500]);
    expect(tiers[0].descriptionHasPerk).toBe(true);
    expect(tiers[0].descriptionHasMarker).toBe(false);
    expect(tiers[0].edited_at).toBe('2026-09-09T01:35:00Z');
  });

  it('matches the welcome-note marker across HTML and whitespace, case-insensitively', () => {
    expect(containsMarker('<p>tap it and   Connect This\nPatreon&nbsp;account</p>', WELCOME_NOTE_MARKER)).toBe(true);
    expect(containsMarker('nothing here', WELCOME_NOTE_MARKER)).toBe(false);
    expect(containsMarker(null, WELCOME_NOTE_MARKER)).toBe(false);
  });

  it('the marker phrase really is in the welcome-note draft', () => {
    const draft = readFileSync(join(process.cwd(), 'reports/funnel/drafts/patreon-welcome-note-2026-09-09.md'), 'utf8');
    expect(containsMarker(draft, WELCOME_NOTE_MARKER)).toBe(true);
  });
});

describe('diffSnapshots', () => {
  it('with no baseline reports everything as new and still says the welcome note is not observable', () => {
    const d = diffSnapshots(null, snap());
    expect(d.baselineDate).toBeNull();
    expect(d.lines).toContain('+SMTP_HOST');
    expect(d.lines).toContain('+UNSUBSCRIBE_SECRET');
    expect(d.lines.some((l) => l.startsWith('EMAIL_POSTAL_ADDRESS still missing'))).toBe(true);
    expect(d.lines).toContain('$1 "Support Tier" published (8 patrons)');
    expect(d.lines).toContain('tier welcome note: not observable via API');
    expect(d.lines).toContain('functions.php markers: ok');
  });

  it('with a baseline reports only what changed, in the digest phrasing', () => {
    const prev = snap({
      date: '2026-09-09',
      env: { status: 'ok', present: ['SMTP_HOST'], missing: ['EMAIL_POSTAL_ADDRESS', 'UNSUBSCRIBE_SECRET'], optionalPresent: [], optionalMissing: ['UNSUBSCRIBE_MAILBOX'] },
    });
    const cur = snap();
    cur.patreon.tiers[1] = { ...cur.patreon.tiers[1], patron_count: 41 };
    const d = diffSnapshots(prev, cur);
    expect(d.baselineDate).toBe('2026-09-09');
    expect(d.lines).toContain('+UNSUBSCRIBE_SECRET');
    expect(d.lines).not.toContain('+SMTP_HOST');
    expect(d.lines).toContain('$1 "Support Tier" still published (8 patrons)');
    expect(d.lines).toContain('$3 "Tip Jar - Curious Simmer": patrons 40 → 41');
    expect(d.lines).toContain('functions.php markers still ok');
  });

  it('matches a reconstructed baseline tier by title when ids differ, and reports an unpublish', () => {
    const prev = snap({ date: '2026-09-09' });
    prev.patreon.tiers = prev.patreon.tiers.map((t) => ({ ...t, id: `reconstructed-${t.amount_cents}` }));
    const cur = snap();
    cur.patreon.tiers[0] = { ...cur.patreon.tiers[0], published: false, unpublished_at: '2026-09-10T02:00:00Z' };
    const d = diffSnapshots(prev, cur);
    expect(d.lines).toContain('$1 "Support Tier": published → unpublished');
    expect(d.lines.some((l) => l.includes('new tier'))).toBe(false);
  });

  it('matches a title that Patreon returns with trailing whitespace, and ignores edits older than the baseline', () => {
    const prev = snap({ date: '2026-09-09' });
    prev.patreon.tiers = prev.patreon.tiers.map((t) => ({ ...t, id: `reconstructed-${t.amount_cents}`, edited_at: null }));
    const cur = snap();
    cur.patreon.tiers = [
      { ...cur.patreon.tiers[0], edited_at: '2026-05-21T04:33:29.792+00:00' }, // pre-baseline edit: silent
      { ...cur.patreon.tiers[1], edited_at: '2026-09-10T02:00:00.000+00:00' }, // post-baseline edit: reported
    ];
    const tiers = tiersFromCampaign({
      included: [{ type: 'tier', id: 't3', attributes: { title: 'Tip Jar - Curious Simmer ', amount_cents: 300, published: true, patron_count: 40 } }],
    });
    expect(tiers[0].title).toBe('Tip Jar - Curious Simmer');
    const d = diffSnapshots(prev, cur);
    expect(d.lines).toContain('$1 "Support Tier" still published (8 patrons)');
    expect(d.lines).toContain('$3 "Tip Jar - Curious Simmer": edited 2026-09-10T02:00:00.000+00:00');
    expect(d.lines.some((l) => l.includes('no longer returned'))).toBe(false);
  });

  it('labels a tier absent from the baseline as "not in baseline", never "new tier"', () => {
    const prev = snap({ date: '2026-09-09' });
    const cur = snap();
    cur.patreon.tiers = [{ id: 't0', title: 'Free', amount_cents: 0, published: true, patron_count: 5330, edited_at: null, published_at: null, unpublished_at: null, descriptionHasMarker: false, descriptionHasPerk: false }, ...cur.patreon.tiers];
    const d = diffSnapshots(prev, cur);
    expect(d.lines).toContain('$0 "Free" published (5330 patrons) — not in baseline');
    expect(d.lines.join('\n')).not.toMatch(/new tier/);
  });

  it('reports a removed env name explicitly', () => {
    const prev = snap({ date: '2026-09-09' });
    const cur = snap({ env: { status: 'ok', present: ['SMTP_HOST'], missing: ['EMAIL_POSTAL_ADDRESS', 'UNSUBSCRIBE_SECRET'], optionalPresent: [], optionalMissing: [] } });
    expect(diffSnapshots(prev, cur).lines).toContain('−UNSUBSCRIBE_SECRET (was present, now missing)');
  });
});

describe('exit codes and summary line', () => {
  it('0 when every section observed, 2 when one could not run, 1 when the blog markers failed', () => {
    expect(exitCodeFor(snap())).toBe(0);
    expect(exitCodeFor(snap({ env: { status: 'could-not-run', note: 'vercel not logged in', present: [], missing: [], optionalPresent: [], optionalMissing: [] } }))).toBe(2);
    expect(exitCodeFor(snap({ blog: { status: 'fail', note: 'Missing: Mediavine sidebar element', exitCode: 1 } }))).toBe(1);
    // fail beats could-not-run
    expect(exitCodeFor(snap({ env: { status: 'could-not-run', present: [], missing: [], optionalPresent: [], optionalMissing: [] }, blog: { status: 'fail', exitCode: 1 } }))).toBe(1);
  });

  it('writes one greppable line with counts, tier states and the verdict — and no values', () => {
    const s = snap();
    const line = summaryLine(s, diffSnapshots(null, s), 0);
    expect(line).toMatch(/^2026-09-10T13:00:00\.000Z OK env=2\/3\(missing:EMAIL_POSTAL_ADDRESS\) tiers=\$1:pub:8\|\$3:pub:40 blog=ok baseline=none changes=\d+$/);
    expect(summaryLine(s, diffSnapshots(null, s), 2)).toContain(' COULD-NOT-RUN ');
    expect(summaryLine(s, diffSnapshots(null, s), 1)).toContain(' FAIL ');
  });
});

describe('the shipped probe script', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/agents/operator-did-probe.ts'), 'utf8');

  it('only lists env var names (vercel env ls), never pulls values', () => {
    expect(src).toMatch(/\['env', 'ls', 'production', '--cwd', OPERATOR_TREE\]/);
    expect(src).not.toMatch(/vercel env pull/);
    expect(src).not.toMatch(/env\.get\(/);
  });

  it('reuses check-blog-sidebar.sh instead of reimplementing the marker check', () => {
    expect(src).toMatch(/check-blog-sidebar\.sh/);
    expect(src).not.toMatch(/mhm_inject_mediavine_sidebar/);
  });

  it('passes every output through redact() and appends to logs/operator-did.log on the crash path too', () => {
    expect(src).toMatch(/const say = \(s: string\) => console\.log\(redact\(s\)\)/);
    expect(src).toMatch(/writeFileSync\(jsonPath, redact\(JSON\.stringify/);
    expect(src).toMatch(/main\(\)\.catch\([\s\S]*appendLog\(/);
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it('states that the tier welcome note is not observable via the API', () => {
    expect(src).toMatch(/not observable via API/);
  });
});
