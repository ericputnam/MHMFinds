import { describe, expect, it } from 'vitest';
import {
  NULL_FACET_TOKEN,
  assertNullFacetNeedsIds,
  contentTypeScope,
} from '../../scripts/lib/content-type-scope';

// E193 (Rowan, 2026-10-12): `contentType: { in: [...] }` never matches NULL,
// so hand-audited pins on NULL rows had no apply path in
// retag-junk-build-facets.ts. The `null` facet token opens that path for
// `--ids=` runs only.
describe('contentTypeScope', () => {
  it('keeps the plain IN filter when null is not named (pre-E193 behaviour)', () => {
    expect(contentTypeScope(['shoes', 'tops'])).toEqual({ contentType: { in: ['shoes', 'tops'] } });
  });

  it('adds an IS NULL branch when the null token is named', () => {
    expect(contentTypeScope(['shoes', NULL_FACET_TOKEN])).toEqual({
      OR: [{ contentType: { in: ['shoes'] } }, { contentType: null }],
    });
  });

  it('never passes the string "null" through as a contentType value', () => {
    const scope = contentTypeScope([NULL_FACET_TOKEN]) as { OR: Array<{ contentType: unknown }> };
    expect(JSON.stringify(scope)).not.toContain('"in":["null"]');
    expect(scope.OR).toContainEqual({ contentType: null });
  });
});

describe('assertNullFacetNeedsIds', () => {
  it('refuses a facet-wide pass over NULL rows', () => {
    expect(() => assertNullFacetNeedsIds(['accessories', 'null'], null)).toThrow(/--ids=/);
    expect(() => assertNullFacetNeedsIds(['null'], [])).toThrow(/--ids=/);
  });

  it('allows null with ids, and anything without null', () => {
    expect(() => assertNullFacetNeedsIds(['null'], ['abc'])).not.toThrow();
    expect(() => assertNullFacetNeedsIds(['lighting', 'curtains'], null)).not.toThrow();
  });
});
