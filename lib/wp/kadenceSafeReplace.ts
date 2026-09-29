/**
 * Kadence-safe post-content string replacement.
 *
 * WordPress/Kadence/Gutenberg stores a URL that appears inside a block's
 * comment-delimited JSON attributes (`<!-- wp:namespace/name {"url":"..."} -->`)
 * with different escaping than the SAME kind of URL sitting in a block's
 * saved HTML body (`<a href="...">`). Ground truth pulled from 6 real
 * MustHaveMods blog posts on 2026-09-28 (see
 * docs/WORDPRESS_GUIDE.md#kadence-safe-post-content-edits) shows:
 *
 *   - JSON-attribute copies (dynamic blocks like `kadence/singlebtn`,
 *     `kadence/advancedbtn`) escape a literal `&` as `\u0026` per
 *     Gutenberg's own `serializeAttributes()`.
 *   - HTML-body copies (`core/paragraph`, `core/heading`,
 *     `kadence/infobox`'s rendered link) use `&amp;` (or, in a few older
 *     posts, an un-encoded raw `&` — WordPress tolerates both).
 *
 * There is NO fixed "always a pair" rule: a self-closing/dynamic block
 * (ends its own opening comment in `/-->`, no separate `<!-- /wp:... -->`)
 * stores the URL ONLY in its JSON attributes; a static content block
 * stores it ONLY in its saved HTML. Each occurrence in a post is an
 * independent link instance, not a duplicate of another occurrence.
 *
 * Because of that, a same-length, no-escapable-character literal tag
 * swap (e.g. `musthavemod08-20` -> `musthavemod04-20`) never needs to
 * know which of the two forms it is touching: the substitution never
 * touches the escape character itself (the `&`, the `\u0026`, or a
 * closing `"`), only the plain alphanumeric tag digits next to it. This
 * module encodes that as a set of invariants a caller MUST satisfy
 * before treating a proposed edit as safe, rather than trying to be
 * clever about parsing every escaping form.
 *
 * This file has NO side effects (no fs, no network, no child_process).
 * All I/O (SSH, wp eval, writing) lives in scripts/wp/kadence-safe-replace.ts.
 */

import { parse as parseBlocksImpl } from '@wordpress/block-serialization-default-parser';

export interface ReplacementRequest {
  /** Exact literal substring to find. Never a regex. */
  from: string;
  /** Exact literal substring to substitute. */
  to: string;
}

export interface InvariantFailure {
  code:
    | 'LENGTH_MISMATCH'
    | 'FROM_REMAINS'
    | 'TO_COUNT_MISMATCH'
    | 'CONTENT_LENGTH_CHANGED'
    | 'BYTE_DRIFT_OUTSIDE_MATCH'
    | 'BLOCK_SHAPE_CHANGED'
    | 'NO_OCCURRENCES'
    | 'UNPARSEABLE_BLOCKS';
  message: string;
}

export interface InvariantResult {
  ok: boolean;
  occurrencesBefore: number;
  occurrencesReplaced: number;
  failures: InvariantFailure[];
}

/** Count non-overlapping literal occurrences of `needle` in `haystack`. */
export function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let idx = 0;
  for (;;) {
    idx = haystack.indexOf(needle, idx);
    if (idx === -1) break;
    count++;
    idx += needle.length;
  }
  return count;
}

/**
 * Literal (non-regex) global replace. Deliberately does NOT use a RegExp
 * so nothing in `from`/`to` can be misinterpreted as a pattern.
 */
export function literalReplaceAll(haystack: string, from: string, to: string): string {
  if (from.length === 0) return haystack;
  return haystack.split(from).join(to);
}

/**
 * Byte positions (as JS string indices) where `before` and `after` differ,
 * EXCLUDING any position that falls inside one of the known replacement
 * spans. Used to prove "nothing else in the post changed." Returns an
 * empty array when the only differences are the intended replacements.
 *
 * Because `from` and `to` must be the same length (enforced by the
 * caller's length invariant), a straight index-by-index compare is valid:
 * insertions/deletions elsewhere would already have failed the length
 * check before this function is ever called.
 */
export function diffOutsideKnownSpans(
  before: string,
  after: string,
  toLiteral: string,
): number[] {
  const driftIndices: number[] = [];
  if (before.length !== after.length) {
    // Caller should have already rejected this; fail closed by reporting
    // every index as drift rather than throwing.
    const max = Math.max(before.length, after.length);
    for (let i = 0; i < max; i++) driftIndices.push(i);
    return driftIndices;
  }

  // Build the set of indices covered by an occurrence of `to` in `after`
  // that is NOT also present at the same index in `before` (i.e. an
  // expected replacement span), so we can skip over it.
  const replacedSpans: Array<[number, number]> = [];
  if (toLiteral.length > 0) {
    let idx = 0;
    for (;;) {
      idx = after.indexOf(toLiteral, idx);
      if (idx === -1) break;
      replacedSpans.push([idx, idx + toLiteral.length]);
      idx += toLiteral.length;
    }
  }

  const insideReplacedSpan = (i: number) =>
    replacedSpans.some(([start, end]) => i >= start && i < end);

  for (let i = 0; i < before.length; i++) {
    if (before[i] !== after[i] && !insideReplacedSpan(i)) {
      driftIndices.push(i);
    }
  }
  return driftIndices;
}

/** A structural (not content) signature of a parsed Gutenberg block tree. */
export interface BlockShapeNode {
  blockName: string | null;
  attrKeyCount: number;
  sortedAttrKeys: string[];
  innerContentSlotCount: number;
  innerBlocks: BlockShapeNode[];
}

function shapeOf(blocks: ReturnType<typeof parseBlocksImpl>): BlockShapeNode[] {
  return blocks.map((b: any) => ({
    blockName: b.blockName ?? null,
    attrKeyCount: b.attrs ? Object.keys(b.attrs).length : 0,
    sortedAttrKeys: b.attrs ? Object.keys(b.attrs).sort() : [],
    innerContentSlotCount: Array.isArray(b.innerContent) ? b.innerContent.length : 0,
    innerBlocks: b.innerBlocks ? shapeOf(b.innerBlocks) : [],
  }));
}

export interface BlockShapeCheck {
  ok: boolean;
  beforeBlockCount: number;
  afterBlockCount: number;
  reason?: string;
}

/**
 * Parse both strings with WordPress's own default block grammar (the same
 * grammar `parse_blocks()` implements in PHP) and confirm the resulting
 * tree shapes are identical: same block names in the same order at every
 * level of nesting, same attribute KEY sets (not values — values are
 * expected to differ at the replacement spans), same number of
 * inner-content slots. This is what catches a flattened post (no block
 * delimiters survive) or a JSON attribute so corrupted that a sibling
 * block gets merged/dropped.
 */
export function checkBlockShapeUnchanged(before: string, after: string): BlockShapeCheck {
  let beforeBlocks: ReturnType<typeof parseBlocksImpl>;
  let afterBlocks: ReturnType<typeof parseBlocksImpl>;
  try {
    beforeBlocks = parseBlocksImpl(before);
  } catch (e) {
    return { ok: false, beforeBlockCount: -1, afterBlockCount: -1, reason: `before failed to parse: ${String(e).slice(0, 200)}` };
  }
  try {
    afterBlocks = parseBlocksImpl(after);
  } catch (e) {
    return { ok: false, beforeBlockCount: beforeBlocks.length, afterBlockCount: -1, reason: `after failed to parse: ${String(e).slice(0, 200)}` };
  }

  const beforeShape = shapeOf(beforeBlocks);
  const afterShape = shapeOf(afterBlocks);
  const beforeJson = JSON.stringify(beforeShape);
  const afterJson = JSON.stringify(afterShape);

  if (beforeJson !== afterJson) {
    return {
      ok: false,
      beforeBlockCount: beforeBlocks.length,
      afterBlockCount: afterBlocks.length,
      reason: 'block tree shape differs (name/attr-keys/nesting)',
    };
  }
  return { ok: true, beforeBlockCount: beforeBlocks.length, afterBlockCount: afterBlocks.length };
}

/**
 * The single entry point a caller should use to decide whether a proposed
 * `before -> after` post_content edit is safe to write. Pure: given the
 * same two strings it always returns the same verdict.
 */
export function checkReplacementInvariants(
  before: string,
  after: string,
  req: ReplacementRequest,
): InvariantResult {
  const failures: InvariantFailure[] = [];
  const occurrencesBefore = countOccurrences(before, req.from);

  if (req.from.length !== req.to.length) {
    failures.push({
      code: 'LENGTH_MISMATCH',
      message: `from ("${req.from}", ${req.from.length} chars) and to ("${req.to}", ${req.to.length} chars) are not the same length; this module only supports same-length literal swaps.`,
    });
  }

  if (occurrencesBefore === 0) {
    failures.push({
      code: 'NO_OCCURRENCES',
      message: `"${req.from}" does not appear in the before content; nothing to do.`,
    });
  }

  if (before.length !== after.length) {
    failures.push({
      code: 'CONTENT_LENGTH_CHANGED',
      message: `post_content length changed (${before.length} -> ${after.length}); a same-length swap must not change total length. This is the signature of wp_unslash stripping a backslash (e.g. "\\u0026" -> "u0026").`,
    });
  }

  const remaining = countOccurrences(after, req.from);
  if (remaining !== 0) {
    failures.push({
      code: 'FROM_REMAINS',
      message: `${remaining} occurrence(s) of "${req.from}" still present after replacement.`,
    });
  }

  const toBefore = countOccurrences(before, req.to);
  const toAfter = countOccurrences(after, req.to);
  const expectedToAfter = toBefore + occurrencesBefore;
  if (toAfter !== expectedToAfter) {
    failures.push({
      code: 'TO_COUNT_MISMATCH',
      message: `expected ${expectedToAfter} occurrence(s) of "${req.to}" after replacement (${toBefore} pre-existing + ${occurrencesBefore} replaced), found ${toAfter}.`,
    });
  }

  // Only run the byte-drift check when lengths match; otherwise every
  // index would trivially "drift" and the message would be redundant.
  if (before.length === after.length) {
    const drift = diffOutsideKnownSpans(before, after, req.to);
    if (drift.length > 0) {
      const sample = drift.slice(0, 5);
      failures.push({
        code: 'BYTE_DRIFT_OUTSIDE_MATCH',
        message: `${drift.length} byte position(s) differ outside any "${req.to}" span (first few indices: ${sample.join(', ')}). Something other than the intended tag changed.`,
      });
    }
  }

  const shapeCheck = checkBlockShapeUnchanged(before, after);
  if (!shapeCheck.ok) {
    failures.push({
      code: shapeCheck.beforeBlockCount === -1 || shapeCheck.afterBlockCount === -1
        ? 'UNPARSEABLE_BLOCKS'
        : 'BLOCK_SHAPE_CHANGED',
      message: shapeCheck.reason ?? 'block shape check failed',
    });
  }

  return {
    ok: failures.length === 0,
    occurrencesBefore,
    occurrencesReplaced: occurrencesBefore,
    failures,
  };
}

/**
 * Convenience wrapper: apply the literal replace and immediately run the
 * invariant check against the result. Does not write anything; purely
 * in-memory. The CLI is responsible for refusing to persist `after` when
 * `result.ok` is false.
 */
export function proposeReplacement(
  before: string,
  req: ReplacementRequest,
): { after: string; result: InvariantResult } {
  const after = literalReplaceAll(before, req.from, req.to);
  const result = checkReplacementInvariants(before, after, req);
  return { after, result };
}
