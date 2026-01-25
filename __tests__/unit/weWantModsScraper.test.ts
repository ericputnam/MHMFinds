import { describe, it, expect } from 'vitest';
import { extractCategoryFromUrl } from '@/lib/services/weWantModsScraper';

/**
 * Tests for WM (wewantmods.com) URL category extraction (SCR-001)
 * URL structure: wewantmods.com/sims4/{category}/{item-slug}
 */
describe('extractCategoryFromUrl', () => {
    describe('simple paths', () => {
        it('extracts category from standard path: /sims4/bathroom/item-name', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/bathroom/modern-sink-set')
            ).toBe('bathroom');
        });

        it('extracts category from hair path', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/hair/ponytail-hairstyle')
            ).toBe('hair');
        });

        it('extracts category from furniture path', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/furniture/cozy-sofa')
            ).toBe('furniture');
        });

        it('extracts category from makeup path', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/makeup/natural-blush-set')
            ).toBe('makeup');
        });

        it('extracts category from decor path', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/decor/modern-plants')
            ).toBe('decor');
        });

        it('extracts category from poses path', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/poses/couple-poses-pack')
            ).toBe('poses');
        });
    });

    describe('nested paths', () => {
        it('extracts most specific category from nested path: /sims4/cas/eyebrows/item', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/cas/eyebrows/natural-brows')
            ).toBe('eyebrows');
        });

        it('extracts eyelashes from nested cas path', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/cas/eyelashes/fluffy-lashes')
            ).toBe('eyelashes');
        });

        it('extracts lipstick from nested makeup path', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/makeup/lipstick/glossy-lips')
            ).toBe('lipstick');
        });

        it('extracts bedroom from nested build path', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/build/bedroom/cozy-bed-set')
            ).toBe('bedroom');
        });

        it('extracts kitchen from nested build-buy path', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/build-buy/kitchen/modern-appliances')
            ).toBe('kitchen');
        });
    });

    describe('category-only paths', () => {
        it('extracts category when no item slug present', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/bathroom/')
            ).toBe('bathroom');
        });

        it('extracts category without trailing slash', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/hair')
            ).toBe('hair');
        });
    });

    describe('edge cases and invalid URLs', () => {
        it('returns undefined for homepage URL', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/')
            ).toBeUndefined();
        });

        it('returns undefined for sims4 root without category', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/')
            ).toBeUndefined();
        });

        it('returns undefined for non-WM URLs', () => {
            expect(
                extractCategoryFromUrl('https://thesimsresource.com/sims4/hair/item-name')
            ).toBeUndefined();
        });

        it('returns undefined for invalid URLs', () => {
            expect(
                extractCategoryFromUrl('not-a-valid-url')
            ).toBeUndefined();
        });

        it('returns undefined for empty string', () => {
            expect(
                extractCategoryFromUrl('')
            ).toBeUndefined();
        });

        it('returns undefined for non-sims4 paths', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/about')
            ).toBeUndefined();
        });

        it('returns undefined for sims3 paths (not sims4)', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims3/hair/ponytail')
            ).toBeUndefined();
        });
    });

    describe('URL variations', () => {
        it('handles HTTP URLs', () => {
            expect(
                extractCategoryFromUrl('http://wewantmods.com/sims4/bathroom/modern-sink')
            ).toBe('bathroom');
        });

        it('handles www subdomain', () => {
            expect(
                extractCategoryFromUrl('https://www.wewantmods.com/sims4/hair/ponytail')
            ).toBe('hair');
        });

        it('handles URLs with query parameters', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/furniture/sofa-set?ref=home')
            ).toBe('furniture');
        });

        it('handles URLs with hash fragments', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/decor/plants#comments')
            ).toBe('decor');
        });

        it('normalizes category to lowercase', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/BATHROOM/Modern-Sink')
            ).toBe('bathroom');
        });

        it('handles categories with hyphens', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/build-buy/kitchen-table')
            ).toBe('build-buy');
        });
    });

    describe('real-world URL examples', () => {
        it('extracts bathroom from real bathroom collection URL', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/bathroom/elegant-bathroom-sink-by-creator')
            ).toBe('bathroom');
        });

        it('extracts hair from real hairstyle URL', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/hair/long-wavy-hairstyle-v2')
            ).toBe('hair');
        });

        it('extracts eyebrows from nested CAS eyebrows URL', () => {
            expect(
                extractCategoryFromUrl('https://wewantmods.com/sims4/cas/eyebrows/natural-thick-eyebrows-set')
            ).toBe('eyebrows');
        });
    });
});
