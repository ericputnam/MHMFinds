import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  caseFlips,
  isScriptedUsername,
  summarizeSignups,
  formatCreatorFlaggedSignups,
  formatScriptedSignupWarning,
  SCRIPTED_USERNAME_MIN_CASE_FLIPS,
  type SignupRow,
} from '@/lib/funnel/signupQuality';

/**
 * Username SHAPES from the 2026-10-23 read (letters → a/A, digits → 9), never
 * the usernames themselves. Scripted: the 10-12 bot's random-case handles.
 * Human: the top shapes among unflagged form sign-ups the same week.
 */
const SCRIPTED_SHAPES = [
  'aAaaAAAaaAAaaAAa',
  'AaaaAAaaAaaaAaaAAa',
  'AAaAaAAAaaAAAaaAA',
  'aaAAaAaaaAAAaaaa',
  'aAaaaAAAaaAAaaAAa',
  'aaAAAaAaaAaAAaAaa',
];
const HUMAN_SHAPES = [
  'aaaaaaaa',       // lowercase word
  'Aaaaaaaa',       // Capitalised word
  'aaaaaa99',       // word + 2 digits
  'aaaaa9999',      // word + year
  'Aaaaa9999',
  'aaa9aaa9',
  'AAAA_AAAA9',     // ALLCAPS with underscore
  'AaaaAaaa',       // CamelCase two words (2 flips)
  'AaaAaaaAaaa',    // CamelCase three words (4 flips) — must stay human
  'aAaAaAa9',       // random case WITH a digit — the bot never uses digits
];

// Shapes are a/A/9 templates; render them to concrete strings so the regexes see real letters.
const render = (shape: string) => shape.replace(/a/g, 'x').replace(/A/g, 'X');

describe('isScriptedUsername (E260)', () => {
  it('vacuity guard: fixtures are non-trivial', () => {
    expect(SCRIPTED_SHAPES.length).toBeGreaterThanOrEqual(5);
    expect(HUMAN_SHAPES.length).toBeGreaterThanOrEqual(8);
  });

  it('flags every scripted shape from the 10-23 population', () => {
    for (const s of SCRIPTED_SHAPES) expect(isScriptedUsername(render(s)), s).toBe(true);
  });

  it('flags none of the human shapes, including CamelCase and random case with a digit', () => {
    for (const s of HUMAN_SHAPES) expect(isScriptedUsername(render(s)), s).toBe(false);
  });

  it('null, empty and non-letter handles are never scripted', () => {
    expect(isScriptedUsername(null)).toBe(false);
    expect(isScriptedUsername(undefined)).toBe(false);
    expect(isScriptedUsername('')).toBe(false);
    expect(isScriptedUsername('xXxXxXx-')).toBe(false);
  });

  it('the threshold is the exported constant, applied as ≥ (boundary case)', () => {
    // exactly MIN flips, letters only → scripted; one fewer → human
    const at = 'x' + 'Xx'.repeat(SCRIPTED_USERNAME_MIN_CASE_FLIPS / 2); // x X x X x X x → 6 flips
    expect(caseFlips(at)).toBe(SCRIPTED_USERNAME_MIN_CASE_FLIPS);
    expect(isScriptedUsername(at)).toBe(true);
    const below = at.slice(0, -1);
    expect(caseFlips(below)).toBe(SCRIPTED_USERNAME_MIN_CASE_FLIPS - 1);
    expect(isScriptedUsername(below)).toBe(false);
  });

  it('caseFlips skips digits and punctuation rather than resetting on them', () => {
    expect(caseFlips('xX9xX')).toBe(3);
    expect(caseFlips('XXXX_XXXX9')).toBe(0);
    expect(caseFlips('')).toBe(0);
  });
});

const NOW = new Date('2026-10-23T12:00:00Z');
const row = (o: Partial<SignupRow>): SignupRow => ({
  createdAt: new Date('2026-10-20T10:00:00Z'), username: 'xxxxxx', isCreator: false, isForm: true, optedIn: false, ...o,
});
const bot = (o: Partial<SignupRow> = {}) => row({ username: render(SCRIPTED_SHAPES[0]), isCreator: true, optedIn: true, ...o });

describe('summarizeSignups (E260)', () => {
  it('splits the 10-16→10-22 shape: scripted accounts tick both boxes, humans mostly neither', () => {
    const rows = [
      ...Array.from({ length: 5 }, () => bot()),
      row({ isCreator: true }),                       // a human creator tick
      row({ optedIn: true }),                         // a human opt-in
      row({}),
      row({ isForm: false, username: null }),         // OAuth account, no username
    ];
    const s = summarizeSignups(rows, NOW);
    expect(s.signups7d).toBe(9);
    expect(s.form7d).toBe(8);
    expect(s.creatorFlagged7d).toBe(6);
    expect(s.scripted7d).toBe(5);
    expect(s.scriptedFlagged7d).toBe(5);
    expect(s.scriptedOptedIn7d).toBe(5);
    expect(s.humanFlagged7d).toBe(1);
  });

  it('ignores rows outside [now−7d, now) so a superset read is safe', () => {
    const rows = [
      bot({ createdAt: new Date('2026-10-15T00:00:00Z') }), // 8.5 d old
      bot({ createdAt: new Date('2026-10-24T00:00:00Z') }), // future
      bot({ createdAt: new Date('2026-10-16T12:00:01Z') }), // just inside
    ];
    const s = summarizeSignups(rows, NOW);
    expect(s.signups7d).toBe(1);
    expect(s.scripted7d).toBe(1);
  });

  it('a scripted username on an OAuth account is not counted as scripted (the form is the bot path)', () => {
    const s = summarizeSignups([bot({ isForm: false })], NOW);
    expect(s.form7d).toBe(0);
    expect(s.scripted7d).toBe(0);
    expect(s.creatorFlagged7d).toBe(0);
  });

  it('empty input is all zeros and prints no warning', () => {
    const s = summarizeSignups([], NOW);
    expect(s.humanFlagged7d).toBe(0);
    expect(formatScriptedSignupWarning(s, 12)).toBe('');
  });
});

describe('formatting', () => {
  it('leads the creator cell with the old flagged count so the E178 series still reads', () => {
    const s = summarizeSignups([...Array.from({ length: 3 }, () => bot()), row({ isCreator: true })], NOW);
    expect(formatCreatorFlaggedSignups(s)).toBe('4 (3 scripted-shaped, 1 human-shaped)');
  });

  it('the warning nets the scripted opt-ins out of the subscriber rows and names the tier of a fix', () => {
    const s = summarizeSignups([...Array.from({ length: 3 }, () => bot()), row({ optedIn: true })], NOW);
    const w = formatScriptedSignupWarning(s, 10);
    expect(w).toContain('3 of 4 form accounts');
    expect(w).toContain('signup-optin rows 7d 10 → 7 net of them');
    expect(w).toContain('Tier 2');
    expect(formatScriptedSignupWarning(s, null)).not.toContain('net of them');
  });

  it('never prints a negative net', () => {
    const s = summarizeSignups([bot(), bot()], NOW);
    expect(formatScriptedSignupWarning(s, 1)).toContain('1 → 0 net of them');
  });
});

describe('funnel-scoreboard uses the shared classifier', () => {
  const src = readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('computes the split via summarizeSignups and prints both the row and the warning', () => {
    expect(src).toMatch(/summarizeSignups\(/);
    expect(src).toMatch(/formatCreatorFlaggedSignups\(/);
    expect(src).toMatch(/formatScriptedSignupWarning\(/);
    expect(src).toMatch(/Creator-flagged sign-ups 7d/);
  });

  it('does not re-implement the username rule inline', () => {
    expect(src).not.toMatch(/caseFlips|\[a-zA-Z\]\+\$/);
  });
});
