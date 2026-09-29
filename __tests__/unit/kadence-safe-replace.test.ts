import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  countOccurrences,
  literalReplaceAll,
  diffOutsideKnownSpans,
  checkBlockShapeUnchanged,
  checkReplacementInvariants,
  proposeReplacement,
  type ReplacementRequest,
} from '@/lib/wp/kadenceSafeReplace';

// Fixtures are byte-for-byte slices cut (via scripts/lib extraction, not
// retyped) from 6 REAL, live MustHaveMods blog posts/pages downloaded
// 2026-09-28 (E134 item D repair scope), each still carrying the bad
// Amazon affiliate tag `musthavemod08-20`. See
// docs/WORDPRESS_GUIDE.md#kadence-safe-post-content-edits for the full
// investigation these fixtures come from.
const FIXTURE_DIR = join(__dirname, '../fixtures/kadence');
const load = (name: string) => readFileSync(join(FIXTURE_DIR, name), 'utf8');

const TAG_REQ: ReplacementRequest = {
  from: 'musthavemod08-20',
  to: 'musthavemod04-20',
};

describe('fixtures are real, unmodified Kadence/Gutenberg markup', () => {
  it('singlebtn-attr-json.txt is a self-closing dynamic block storing the tag only in JSON attrs (\\u0026-escaped)', () => {
    const raw = load('singlebtn-attr-json.txt');
    expect(raw).toContain('<!-- wp:kadence/advancedbtn');
    expect(raw).toContain('<!-- wp:kadence/singlebtn');
    // Self-closing: the singlebtn block ends its OWN opening comment in
    // "/-->" — there is no separate "<!-- /wp:kadence/singlebtn -->".
    expect(raw).not.toContain('<!-- /wp:kadence/singlebtn -->');
    expect(raw).toContain('/--></div>');
    expect(countOccurrences(raw, TAG_REQ.from)).toBe(1);
    // The tag sits between two &-escaped ampersands, not &amp;.
    expect(raw).toContain('\\u0026tag=musthavemod08-20\\u0026linkId=');
    // Real-world confirmation for operator-queue item E (rel=sponsored/nofollow
    // already exist as block attributes, not something a content edit adds).
    expect(raw).toContain('"noFollow":true');
    expect(raw).toContain('"sponsored":true');
  });

  it('paragraph-amp-escaped.txt stores the tag only in HTML body, &amp;-escaped', () => {
    const raw = load('paragraph-amp-escaped.txt');
    expect(raw).toContain('<!-- wp:paragraph -->');
    expect(raw).toContain('<!-- /wp:paragraph -->');
    expect(countOccurrences(raw, TAG_REQ.from)).toBe(1);
    expect(raw).toContain('&amp;tag=musthavemod08-20&amp;linkId=');
    expect(raw).not.toContain('\\u0026');
  });

  it('paragraph-raw-ampersand.txt stores the tag in HTML body with a raw, un-encoded &', () => {
    const raw = load('paragraph-raw-ampersand.txt');
    expect(countOccurrences(raw, TAG_REQ.from)).toBe(1);
    expect(raw).toContain('&tag=musthavemod08-20&linkId=');
    expect(raw).not.toContain('&amp;tag=musthavemod08-20');
  });

  it('infobox-html.txt (kadence/infobox) stores the tag in rendered HTML', () => {
    const raw = load('infobox-html.txt');
    expect(raw).toContain('<!-- wp:kadence/infobox');
    expect(countOccurrences(raw, TAG_REQ.from)).toBe(1);
  });

  it('multi-block-mixed.txt carries 2 independent occurrences (no attr/HTML pairing)', () => {
    const raw = load('multi-block-mixed.txt');
    expect(countOccurrences(raw, TAG_REQ.from)).toBe(2);
  });
});

describe('checkReplacementInvariants — positive cases (real fixtures, one per encoding form)', () => {
  const fixtureNames = [
    'singlebtn-attr-json.txt',
    'paragraph-amp-escaped.txt',
    'paragraph-raw-ampersand.txt',
    'infobox-html.txt',
    'multi-block-mixed.txt',
  ];

  it.each(fixtureNames)('%s: a same-length literal swap passes every invariant', (name) => {
    const before = load(name);
    const { after, result } = proposeReplacement(before, TAG_REQ);

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(after.length).toBe(before.length);
    expect(countOccurrences(after, TAG_REQ.from)).toBe(0);
    expect(countOccurrences(after, TAG_REQ.to)).toBe(result.occurrencesBefore);
    // Nothing outside the tag itself may differ.
    expect(diffOutsideKnownSpans(before, after, TAG_REQ.to)).toEqual([]);
  });

  it('does not touch the surrounding escape characters', () => {
    const before = load('singlebtn-attr-json.txt');
    const { after } = proposeReplacement(before, TAG_REQ);
    expect(after).toContain('\\u0026tag=musthavemod04-20\\u0026linkId=');
  });
});

describe('checkReplacementInvariants — negative case 1: wp_unslash-style backslash stripping', () => {
  it('flags CONTENT_LENGTH_CHANGED when a \\u0026 loses its backslash during save', () => {
    const before = load('singlebtn-attr-json.txt');
    const correctAfter = literalReplaceAll(before, TAG_REQ.from, TAG_REQ.to);
    expect(correctAfter.length).toBe(before.length); // sanity: correct edit is length-neutral

    // Simulate what wp_insert_post's wp_unslash() does to a raw string
    // containing a literal backslash: one & (right before our tag)
    // loses its backslash, becoming the bare 5-char literal "u0026".
    const corruptedAfter = correctAfter.replace('\\u0026tag=musthavemod04-20', 'u0026tag=musthavemod04-20');
    expect(corruptedAfter.length).toBe(before.length - 1);

    const result = checkReplacementInvariants(before, corruptedAfter, TAG_REQ);
    expect(result.ok).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain('CONTENT_LENGTH_CHANGED');
  });
});

describe('checkReplacementInvariants — negative case 2: a stray byte changes outside the tag', () => {
  it('flags BYTE_DRIFT_OUTSIDE_MATCH when an unrelated character is altered', () => {
    const before = load('paragraph-amp-escaped.txt');
    const correctAfter = literalReplaceAll(before, TAG_REQ.from, TAG_REQ.to);

    // Flip one character in "linkCode=sl1" to "linkCode=sl2" — same length,
    // nowhere near the tag, but a genuine unintended change.
    expect(correctAfter).toContain('linkCode=sl1');
    const driftedAfter = correctAfter.replace('linkCode=sl1', 'linkCode=sl2');
    expect(driftedAfter.length).toBe(correctAfter.length);

    const result = checkReplacementInvariants(before, driftedAfter, TAG_REQ);
    expect(result.ok).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain('BYTE_DRIFT_OUTSIDE_MATCH');
  });
});

describe('checkReplacementInvariants — negative case 3: a flattened post (block delimiters lost)', () => {
  it('flags BLOCK_SHAPE_CHANGED when block comments are stripped (e.g. REST content.rendered)', () => {
    const before = load('multi-block-mixed.txt');
    const correctAfter = literalReplaceAll(before, TAG_REQ.from, TAG_REQ.to);

    // Simulate writing through a path that flattens Gutenberg comments
    // (this is exactly why the task forbids writing content.rendered via
    // REST). Pad with trailing spaces so length still matches and the
    // length invariant can't "accidentally" catch this — isolating proof
    // that the block-shape check is doing real, independent work.
    const flattened = correctAfter.replace(/<!--\s*\/?wp:[^>]*-->/g, '');
    const padded = flattened + ' '.repeat(correctAfter.length - flattened.length);
    expect(padded.length).toBe(before.length);

    const result = checkReplacementInvariants(before, padded, TAG_REQ);
    expect(result.ok).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain('BLOCK_SHAPE_CHANGED');
    expect(result.failures.map((f) => f.code)).not.toContain('CONTENT_LENGTH_CHANGED');
  });

  it('checkBlockShapeUnchanged in isolation: real fixture has more top-level structure than its flattened form', () => {
    const before = load('multi-block-mixed.txt');
    const flattened = before.replace(/<!--\s*\/?wp:[^>]*-->/g, '');
    const check = checkBlockShapeUnchanged(before, flattened);
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/shape differs/);
  });
});

describe('checkReplacementInvariants — negative case 4: partial replace (occurrence count mismatch)', () => {
  it('flags FROM_REMAINS and TO_COUNT_MISMATCH when only one of two occurrences is replaced', () => {
    const before = load('multi-block-mixed.txt');
    expect(countOccurrences(before, TAG_REQ.from)).toBe(2);

    // A buggy replacer that only touches the first occurrence (e.g. one
    // that mistakenly assumed "one per post" or stopped after the first
    // block it recognized).
    const firstIdx = before.indexOf(TAG_REQ.from);
    const partialAfter =
      before.slice(0, firstIdx) +
      TAG_REQ.to +
      before.slice(firstIdx + TAG_REQ.from.length);

    const result = checkReplacementInvariants(before, partialAfter, TAG_REQ);
    expect(result.ok).toBe(false);
    const codes = result.failures.map((f) => f.code);
    expect(codes).toContain('FROM_REMAINS');
    expect(codes).toContain('TO_COUNT_MISMATCH');
  });
});

describe('meta-proof: these are genuine corruptions, not vacuous "always ok" passes', () => {
  // A deliberately neutered stand-in that skips every real invariant. If a
  // negative-case input could still only produce `ok: true` through some
  // accident of the real checker, this stub would agree with it and the
  // "proof" below would be meaningless. Showing the stub disagrees with
  // the real checker on every corrupted fixture demonstrates the negative
  // fixtures are truly broken and that only the real invariant logic (not
  // a no-op) catches them — i.e. the tests above go red if the invariant
  // checks are disabled/stubbed out.
  const alwaysOk = (_before: string, _after: string, req: ReplacementRequest) => ({
    ok: true,
    occurrencesBefore: 0,
    occurrencesReplaced: 0,
    failures: [] as { code: string; message: string }[],
    _req: req,
  });

  it('backslash-stripped case: stub says ok, real checker does not', () => {
    const before = load('singlebtn-attr-json.txt');
    const correctAfter = literalReplaceAll(before, TAG_REQ.from, TAG_REQ.to);
    const corruptedAfter = correctAfter.replace('\\u0026tag=musthavemod04-20', 'u0026tag=musthavemod04-20');
    expect(alwaysOk(before, corruptedAfter, TAG_REQ).ok).toBe(true);
    expect(checkReplacementInvariants(before, corruptedAfter, TAG_REQ).ok).toBe(false);
  });

  it('byte-drift case: stub says ok, real checker does not', () => {
    const before = load('paragraph-amp-escaped.txt');
    const correctAfter = literalReplaceAll(before, TAG_REQ.from, TAG_REQ.to);
    const driftedAfter = correctAfter.replace('linkCode=sl1', 'linkCode=sl2');
    expect(alwaysOk(before, driftedAfter, TAG_REQ).ok).toBe(true);
    expect(checkReplacementInvariants(before, driftedAfter, TAG_REQ).ok).toBe(false);
  });

  it('flattened-post case: stub says ok, real checker does not', () => {
    const before = load('multi-block-mixed.txt');
    const correctAfter = literalReplaceAll(before, TAG_REQ.from, TAG_REQ.to);
    const flattened = correctAfter.replace(/<!--\s*\/?wp:[^>]*-->/g, '');
    const padded = flattened + ' '.repeat(correctAfter.length - flattened.length);
    expect(alwaysOk(before, padded, TAG_REQ).ok).toBe(true);
    expect(checkReplacementInvariants(before, padded, TAG_REQ).ok).toBe(false);
  });

  it('partial-replace case: stub says ok, real checker does not', () => {
    const before = load('multi-block-mixed.txt');
    const firstIdx = before.indexOf(TAG_REQ.from);
    const partialAfter =
      before.slice(0, firstIdx) + TAG_REQ.to + before.slice(firstIdx + TAG_REQ.from.length);
    expect(alwaysOk(before, partialAfter, TAG_REQ).ok).toBe(true);
    expect(checkReplacementInvariants(before, partialAfter, TAG_REQ).ok).toBe(false);
  });
});

describe('input-validation guards', () => {
  it('LENGTH_MISMATCH when from/to are different lengths', () => {
    const before = load('paragraph-amp-escaped.txt');
    const badReq: ReplacementRequest = { from: 'musthavemod08-20', to: 'musthavemod4-20' };
    const after = literalReplaceAll(before, badReq.from, badReq.to);
    const result = checkReplacementInvariants(before, after, badReq);
    expect(result.ok).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain('LENGTH_MISMATCH');
  });

  it('NO_OCCURRENCES when the tag is not present at all', () => {
    const before = 'some post content with no amazon tags in it whatsoever';
    const after = before;
    const result = checkReplacementInvariants(before, after, TAG_REQ);
    expect(result.ok).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain('NO_OCCURRENCES');
  });
});

describe('countOccurrences / literalReplaceAll / diffOutsideKnownSpans — unit-level behavior', () => {
  it('countOccurrences counts non-overlapping matches', () => {
    expect(countOccurrences('aaaa', 'aa')).toBe(2);
    expect(countOccurrences('abcabcabc', 'abc')).toBe(3);
    expect(countOccurrences('abc', 'xyz')).toBe(0);
    expect(countOccurrences('abc', '')).toBe(0);
  });

  it('literalReplaceAll treats from/to as literal strings, not regex patterns', () => {
    // If this were a RegExp, "." and "-" would behave specially.
    expect(literalReplaceAll('a.b-c', '.', 'X')).toBe('aXb-c');
    expect(literalReplaceAll('tag=musthavemod08-20&x', 'musthavemod08-20', 'musthavemod04-20')).toBe(
      'tag=musthavemod04-20&x',
    );
  });

  it('diffOutsideKnownSpans reports nothing when only the expected span differs', () => {
    const before = 'tag=musthavemod08-20&rest';
    const after = 'tag=musthavemod04-20&rest';
    expect(diffOutsideKnownSpans(before, after, 'musthavemod04-20')).toEqual([]);
  });

  it('diffOutsideKnownSpans reports the exact index when something else also changed', () => {
    const before = 'tag=musthavemod08-20&rest';
    const after = 'tag=musthavemod04-20&rXst'; // 'e' -> 'X' outside the tag span
    const drift = diffOutsideKnownSpans(before, after, 'musthavemod04-20');
    expect(drift.length).toBe(1);
    expect(before[drift[0]]).toBe('e');
    expect(after[drift[0]]).toBe('X');
  });
});
