import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatOwnedAddsHeadline,
  humanShapedOwnedAdds,
  summarizeSignups,
  type SignupQualitySummary,
} from '@/lib/funnel/signupQuality';

/**
 * E267 (Nova, 2026-10-24): the scoreboard headline leads with owned-audience
 * adds net of scripted-shaped sign-ups (E260), raw figure beside it.
 * Numbers below are the 10-24 production scoreboard: accounts +149, email
 * +86 → 235 raw; 57 scripted-shaped form accounts, all 57 opted in.
 */
const summary = (over: Partial<SignupQualitySummary> = {}): SignupQualitySummary => ({
  signups7d: 149, form7d: 101, creatorFlagged7d: 70, scripted7d: 57,
  scriptedFlagged7d: 57, scriptedOptedIn7d: 57, humanFlagged7d: 13, ...over,
});

describe('formatOwnedAddsHeadline', () => {
  it('split present: human-shaped leads, raw and both exclusions in parentheses', () => {
    expect(formatOwnedAddsHeadline(235, summary())).toBe(
      '**121 human-shaped** (235 raw; 57 scripted accounts + 57 scripted opt-ins excluded; E260)',
    );
  });

  it('split null: raw headline with "(split unavailable)", never blank', () => {
    expect(formatOwnedAddsHeadline(235, null)).toBe('**235** (split unavailable)');
  });

  it('zero scripted: human-shaped equals raw and still says so', () => {
    const clean = summarizeSignups([], new Date('2026-10-24T12:00:00Z'));
    expect(formatOwnedAddsHeadline(40, clean)).toBe(
      '**40 human-shaped** (40 raw; 0 scripted accounts + 0 scripted opt-ins excluded; E260)',
    );
  });

  it('raw null: "?" regardless of the split (the DB section failed)', () => {
    expect(formatOwnedAddsHeadline(null, summary())).toBe('**?**');
    expect(formatOwnedAddsHeadline(null, null)).toBe('**?**');
  });

  it('opt-ins counted separately from accounts (not every scripted account ticks the box)', () => {
    expect(formatOwnedAddsHeadline(100, summary({ scripted7d: 10, scriptedOptedIn7d: 4 }))).toBe(
      '**86 human-shaped** (100 raw; 10 scripted accounts + 4 scripted opt-ins excluded; E260)',
    );
  });
});

describe('humanShapedOwnedAdds', () => {
  it('235 − 57 − 57 = 121', () => {
    expect(humanShapedOwnedAdds(235, summary())).toBe(121);
  });
  it('null in → null out', () => {
    expect(humanShapedOwnedAdds(null, summary())).toBeNull();
    expect(humanShapedOwnedAdds(235, null)).toBeNull();
  });
  it('clamps at 0, never negative', () => {
    expect(humanShapedOwnedAdds(5, summary())).toBe(0);
  });
});

/** Comments in this repo quote the patterns they warn about; strip them before asserting on source. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('scoreboard and history wiring (source guard)', () => {
  const scoreboard = stripComments(readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8'));
  const history = stripComments(readFileSync(join(process.cwd(), 'scripts/agents/funnel-history.ts'), 'utf8'));

  it('the Headline line renders owned adds through formatOwnedAddsHeadline, not an inline raw count', () => {
    const line = scoreboard.split('\n').find((l) => l.includes('**Headline:**'));
    expect(line, 'no **Headline:** line found').toBeTruthy();
    expect(line).toContain('formatOwnedAddsHeadline(');
    expect(line).not.toMatch(/\*\*\$\{ownedAdds7d \?\? '\?'\}\*\*/);
  });

  it('JSON headline carries ownedAdds7dHumanShaped next to the raw ownedAdds7d', () => {
    expect(scoreboard).toMatch(/headline:\s*\{\s*ownedAdds7d,\s*ownedAdds7dHumanShaped,/);
  });

  it('a failed sign-up read is null, not an all-zero summary', () => {
    expect(scoreboard).not.toMatch(/signupQuality[^=\n]*=\s*summarizeSignups\(\[\]/);
  });

  it('history.json reads the human-shaped figure from the scoreboard headline', () => {
    expect(history).toContain('ownedAdds7dHumanShaped: db(scoreboard?.headline?.ownedAdds7dHumanShaped)');
  });
});
