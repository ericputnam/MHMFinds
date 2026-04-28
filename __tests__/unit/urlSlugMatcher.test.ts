import { describe, it, expect } from 'vitest';
import {
  tokenizeSlug,
  matchContentTypeFromSlug,
} from '@/lib/services/scraperExtraction/urlSlugMatcher';

// ===========================================================================
// tokenizeSlug
// ===========================================================================

describe('tokenizeSlug', () => {
  it('drops stopwords (sims, 4, cc)', () => {
    expect(tokenizeSlug('https://musthavemods.com/sims-4-watch-cc/')).toEqual(['watch']);
  });

  it('drops numeric-only tokens', () => {
    expect(tokenizeSlug('https://musthavemods.com/best-sims-4-makeup-cc-2024/'))
      .toEqual(['makeup']);
  });

  it('drops single-char tokens', () => {
    // The "a" should drop even if slug structure is odd.
    expect(tokenizeSlug('/a-hair-b/')).toEqual(['hair']);
  });

  it('accepts a bare path (no origin)', () => {
    expect(tokenizeSlug('/sims-4-hair-cc-pack/')).toEqual(['hair']);
  });

  it('returns [] for empty input', () => {
    expect(tokenizeSlug('')).toEqual([]);
  });

  it('lowercases tokens', () => {
    expect(tokenizeSlug('/Sims-4-HAIR-CC/')).toEqual(['hair']);
  });

  it('splits on underscores', () => {
    expect(tokenizeSlug('/sims_4_hair_cc/')).toEqual(['hair']);
  });

  it('drops the stopword "download"', () => {
    expect(tokenizeSlug('/sims-4-hair-cc-download/')).toEqual(['hair']);
  });

  it('drops the stopword "new"', () => {
    expect(tokenizeSlug('/sims-4-new-cc-pack/')).toEqual([]);
  });
});

// ===========================================================================
// matchContentTypeFromSlug — PRD-specified fixtures
// ===========================================================================

describe('matchContentTypeFromSlug — PRD fixtures', () => {
  it('/sims-4-watch-cc/ → watches (user motivating example)', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-watch-cc/')).toEqual({
      contentType: 'watches',
      confidence: 'high',
      strategy: 'url-slug-keyword',
    });
  });

  it('/sims-4-hair-cc-pack/ → hair', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-hair-cc-pack/'))
      .toMatchObject({ contentType: 'hair', confidence: 'high' });
  });

  it('/best-sims-4-makeup-cc-2024/ → makeup', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/best-sims-4-makeup-cc-2024/'))
      .toMatchObject({ contentType: 'makeup', confidence: 'high' });
  });

  it('/sims-4-hair-salon-set/ → hair (priority beats furniture)', () => {
    // `salon` maps to furniture, `hair` maps to hair.
    // VOCABULARY_PRIORITY places `hair` before `furniture`.
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-hair-salon-set/'))
      .toMatchObject({ contentType: 'hair', confidence: 'high' });
  });

  it('/sims-4-new-cc-pack/ → null (no vocabulary match)', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-new-cc-pack/')).toBeNull();
  });

  it('/halloween-decor-sims-4/ → seasonal (priority beats decor)', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/halloween-decor-sims-4/'))
      .toMatchObject({ contentType: 'seasonal', confidence: 'high' });
  });
});

// ===========================================================================
// matchContentTypeFromSlug — additional real-world MHM/WWM fixtures
// ===========================================================================

describe('matchContentTypeFromSlug — real-world URL patterns', () => {
  it('/sims-4-eyelashes-cc/ → lashes (granular beats makeup)', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-eyelashes-cc/'))
      .toMatchObject({ contentType: 'lashes' });
  });

  it('/sims-4-skin-overlay-cc/ → skin', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-skin-overlay-cc/'))
      .toMatchObject({ contentType: 'skin' });
  });

  it('/sims-4-dress-cc/ → dresses', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-dress-cc/'))
      .toMatchObject({ contentType: 'dresses' });
  });

  it('/sims-4-furniture-cc/ → furniture', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-furniture-cc/'))
      .toMatchObject({ contentType: 'furniture' });
  });

  it('/sims-4-kitchen-cc/ → kitchen', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-kitchen-cc/'))
      .toMatchObject({ contentType: 'kitchen' });
  });

  it('/sims-4-bathroom-cc/ → bathroom', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-bathroom-cc/'))
      .toMatchObject({ contentType: 'bathroom' });
  });

  it('/sims-4-poses-pack/ → poses', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-poses-pack/'))
      .toMatchObject({ contentType: 'poses' });
  });

  it('/sims-4-shoes-cc/ → shoes', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-shoes-cc/'))
      .toMatchObject({ contentType: 'shoes' });
  });

  it('/sims-4-hat-cc/ → hats', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-hat-cc/'))
      .toMatchObject({ contentType: 'hats' });
  });

  it('/sims-4-eyebrow-cc/ → eyebrows (granular beats makeup)', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-eyebrow-cc/'))
      .toMatchObject({ contentType: 'eyebrows' });
  });

  it('/sims-4-lipstick-cc/ → lipstick (granular beats makeup)', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-lipstick-cc/'))
      .toMatchObject({ contentType: 'lipstick' });
  });

  it('/sims-4-jewelry-cc/ → jewelry (granular beats accessories)', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-jewelry-cc/'))
      .toMatchObject({ contentType: 'jewelry' });
  });

  it('/sims-4-christmas-decor-cc/ → seasonal (priority beats decor)', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-christmas-decor-cc/'))
      .toMatchObject({ contentType: 'seasonal' });
  });

  it('/sims-4-gameplay-mod/ → gameplay-mod', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-gameplay-mod/'))
      .toMatchObject({ contentType: 'gameplay-mod' });
  });

  it('/sims-4-house-build/ → lot', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-house-build/'))
      .toMatchObject({ contentType: 'lot' });
  });

  it('/sims-4-trait-mod/ → trait', () => {
    // 'mod' is a stopword → tokens = ['trait']
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-trait-mod/'))
      .toMatchObject({ contentType: 'trait' });
  });

  it('/sims-4-tattoo-cc/ → tattoos', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-tattoo-cc/'))
      .toMatchObject({ contentType: 'tattoos' });
  });

  it('/sims-4-nails-cc/ → nails', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-nails-cc/'))
      .toMatchObject({ contentType: 'nails' });
  });

  it('/sims-4-bedroom-cc/ → bedroom', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-bedroom-cc/'))
      .toMatchObject({ contentType: 'bedroom' });
  });

  it('/sims-4-eyes-cc/ → eyes', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/sims-4-eyes-cc/'))
      .toMatchObject({ contentType: 'eyes' });
  });

  it('/best-cc-sims-4-finds/ → null (no vocabulary match)', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/best-cc-sims-4-finds/'))
      .toBeNull();
  });
});

// ===========================================================================
// matchContentTypeFromSlug — edge cases
// ===========================================================================

describe('matchContentTypeFromSlug — edge cases', () => {
  it('returns null for empty URL', () => {
    expect(matchContentTypeFromSlug('')).toBeNull();
  });

  it('handles bare path input', () => {
    expect(matchContentTypeFromSlug('/sims-4-watch-cc/'))
      .toMatchObject({ contentType: 'watches' });
  });

  it('is case-insensitive', () => {
    expect(matchContentTypeFromSlug('https://musthavemods.com/SIMS-4-WATCH-CC/'))
      .toMatchObject({ contentType: 'watches' });
  });

  it('ignores the query string and domain', () => {
    expect(matchContentTypeFromSlug('https://example.com/sims-4-hair-cc/?utm_source=x'))
      .toMatchObject({ contentType: 'hair' });
  });

  it('returns high confidence and url-slug-keyword strategy', () => {
    const result = matchContentTypeFromSlug('https://musthavemods.com/sims-4-hair-cc/');
    expect(result?.confidence).toBe('high');
    expect(result?.strategy).toBe('url-slug-keyword');
  });
});
