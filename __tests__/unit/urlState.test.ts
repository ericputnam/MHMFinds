import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for URL State Management logic
 * This mirrors the logic in app/page.tsx to ensure URL parameters are built correctly
 */

describe('URL State Management Logic', () => {
    const buildUrlParams = (
        state: {
            currentPage: number;
            searchQuery: string;
            selectedCategory: string;
            selectedGameVersion: string;
            sortBy: string;
            creatorParam: string | null;
        },
        overrides: Record<string, any> = {}
    ) => {
        const params = new URLSearchParams();

        const page = overrides.page !== undefined ? overrides.page : state.currentPage;
        const search = overrides.search !== undefined ? overrides.search : state.searchQuery;
        const category = overrides.category !== undefined ? overrides.category : state.selectedCategory;
        const gameVersion = overrides.gameVersion !== undefined ? overrides.gameVersion : state.selectedGameVersion;
        const sort = overrides.sort !== undefined ? overrides.sort : state.sortBy;
        const creator = overrides.creator !== undefined ? overrides.creator : state.creatorParam;

        // Only add non-default values to URL
        if (page > 1) params.set('page', page.toString());
        if (search) params.set('search', search);
        if (category && category !== 'All') params.set('category', category);
        if (gameVersion && gameVersion !== 'Sims 4') params.set('gameVersion', gameVersion);
        if (sort && sort !== 'relevance') params.set('sort', sort);
        if (creator) params.set('creator', creator);

        return params;
    };

    const defaultState = {
        currentPage: 1,
        searchQuery: '',
        selectedCategory: 'All',
        selectedGameVersion: 'Sims 4',
        sortBy: 'relevance',
        creatorParam: null,
    };

    it('returns empty params for default state', () => {
        const params = buildUrlParams(defaultState);
        expect(params.toString()).toBe('');
    });

    it('includes page when greater than 1', () => {
        const params = buildUrlParams({ ...defaultState, currentPage: 2 });
        expect(params.get('page')).toBe('2');
    });

    it('includes search query when not empty', () => {
        const params = buildUrlParams({ ...defaultState, searchQuery: 'modern kitchen' });
        expect(params.get('search')).toBe('modern kitchen');
    });

    it('includes category when not "All"', () => {
        const params = buildUrlParams({ ...defaultState, selectedCategory: 'Furniture' });
        expect(params.get('category')).toBe('Furniture');
    });

    it('includes gameVersion when not "Sims 4"', () => {
        const params = buildUrlParams({ ...defaultState, selectedGameVersion: 'Sims 3' });
        expect(params.get('gameVersion')).toBe('Sims 3');
    });

    it('includes sort when not "relevance"', () => {
        const params = buildUrlParams({ ...defaultState, sortBy: 'downloads' });
        expect(params.get('sort')).toBe('downloads');
    });

    it('includes creator when not null', () => {
        const params = buildUrlParams({ ...defaultState, creatorParam: 'testcreator' });
        expect(params.get('creator')).toBe('testcreator');
    });

    it('handles multiple parameters correctly', () => {
        const params = buildUrlParams({
            currentPage: 3,
            searchQuery: 'clutter',
            selectedCategory: 'Decor',
            selectedGameVersion: 'Sims 4',
            sortBy: 'newest',
            creatorParam: null,
        });

        expect(params.get('page')).toBe('3');
        expect(params.get('search')).toBe('clutter');
        expect(params.get('category')).toBe('Decor');
        expect(params.get('sort')).toBe('newest');
        expect(params.has('gameVersion')).toBe(false); // Default value
    });

    it('applies overrides correctly', () => {
        const params = buildUrlParams(defaultState, { page: 5, search: 'test' });
        expect(params.get('page')).toBe('5');
        expect(params.get('search')).toBe('test');
    });
});
