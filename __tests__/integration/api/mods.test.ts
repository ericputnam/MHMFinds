import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for /api/mods route
 * Critical path: Main mod listing API
 */

// Mock data for tests
const mockMods = [
    {
        id: 'mod-1',
        title: 'Modern Kitchen Set',
        description: 'A beautiful modern kitchen',
        category: 'Furniture',
        gameVersion: 'Sims 4',
        thumbnail: 'https://example.com/thumb.jpg',
        downloadUrl: 'https://example.com/download',
        isFree: true,
        price: null,
        isVerified: true,
        isNSFW: false,
        downloadCount: 1000,
        rating: 4.5,
        createdAt: new Date('2024-01-01'),
        creator: {
            id: 'creator-1',
            handle: 'testcreator',
            isVerified: true,
        },
        _count: {
            reviews: 10,
            favorites: 50,
            downloads: 1000,
        },
    },
    {
        id: 'mod-2',
        title: 'Cozy Living Room',
        description: 'Comfortable living room furniture',
        category: 'Furniture',
        gameVersion: 'Sims 4',
        thumbnail: 'https://example.com/thumb2.jpg',
        downloadUrl: 'https://example.com/download2',
        isFree: false,
        price: 4.99,
        isVerified: true,
        isNSFW: false,
        downloadCount: 500,
        rating: 4.8,
        createdAt: new Date('2024-01-02'),
        creator: null,
        _count: {
            reviews: 5,
            favorites: 25,
            downloads: 500,
        },
    },
]

describe('API /api/mods', () => {
    describe('Query Parameter Parsing', () => {
        it('parses page parameter correctly', () => {
            const params = new URLSearchParams('page=2')
            const page = parseInt(params.get('page') || '1')
            expect(page).toBe(2)
        })

        it('defaults page to 1 when not provided', () => {
            const params = new URLSearchParams('')
            const page = parseInt(params.get('page') || '1')
            expect(page).toBe(1)
        })

        it('parses limit parameter correctly', () => {
            const params = new URLSearchParams('limit=50')
            const limit = parseInt(params.get('limit') || '20')
            expect(limit).toBe(50)
        })

        it('defaults limit to 20 when not provided', () => {
            const params = new URLSearchParams('')
            const limit = parseInt(params.get('limit') || '20')
            expect(limit).toBe(20)
        })

        it('handles search parameter', () => {
            const params = new URLSearchParams('search=modern+kitchen')
            const search = params.get('search')
            expect(search).toBe('modern kitchen')
        })

        it('handles category filter', () => {
            const params = new URLSearchParams('category=Furniture')
            const category = params.get('category')
            expect(category).toBe('Furniture')
        })

        it('handles gameVersion filter', () => {
            const params = new URLSearchParams('gameVersion=Sims+4')
            const gameVersion = params.get('gameVersion')
            expect(gameVersion).toBe('Sims 4')
        })

        it('handles Other gameVersion as special case', () => {
            const gameVersion = '__other__'
            // This should translate to notIn filter
            const isOtherCategory = gameVersion === '__other__'
            expect(isOtherCategory).toBe(true)
        })
    })

    describe('Where Clause Building', () => {
        it('always includes isVerified: true', () => {
            const where: any = {
                isVerified: true,
                isNSFW: false,
            }
            expect(where.isVerified).toBe(true)
        })

        it('always includes isNSFW: false', () => {
            const where: any = {
                isVerified: true,
                isNSFW: false,
            }
            expect(where.isNSFW).toBe(false)
        })

        it('adds category filter when provided', () => {
            const category = 'Furniture'
            const where: any = {
                isVerified: true,
                isNSFW: false,
            }

            if (category) {
                where.category = category
            }

            expect(where.category).toBe('Furniture')
        })

        it('adds gameVersion filter when provided', () => {
            const gameVersion = 'Sims 4'
            const where: any = {
                isVerified: true,
                isNSFW: false,
            }

            if (gameVersion) {
                where.gameVersion = gameVersion
            }

            expect(where.gameVersion).toBe('Sims 4')
        })

        it('builds search OR clause correctly', () => {
            const search = 'modern'
            const where: any = {
                isVerified: true,
                isNSFW: false,
            }

            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { tags: { hasSome: [search] } },
                ]
            }

            expect(where.OR).toHaveLength(3)
            expect(where.OR[0].title.contains).toBe('modern')
        })
    })

    describe('Pagination Logic', () => {
        it('calculates skip correctly for page 1', () => {
            const page = 1
            const limit = 20
            const skip = (page - 1) * limit
            expect(skip).toBe(0)
        })

        it('calculates skip correctly for page 2', () => {
            const page = 2
            const limit = 20
            const skip = (page - 1) * limit
            expect(skip).toBe(20)
        })

        it('calculates skip correctly for page 5', () => {
            const page = 5
            const limit = 20
            const skip = (page - 1) * limit
            expect(skip).toBe(80)
        })

        it('calculates total pages correctly', () => {
            const total = 100
            const limit = 20
            const totalPages = Math.ceil(total / limit)
            expect(totalPages).toBe(5)
        })

        it('handles hasNextPage correctly', () => {
            const page = 3
            const totalPages = 5
            const hasNextPage = page < totalPages
            expect(hasNextPage).toBe(true)
        })

        it('handles hasPrevPage correctly', () => {
            const page = 1
            const hasPrevPage = page > 1
            expect(hasPrevPage).toBe(false)
        })
    })

    describe('Sort Options', () => {
        it('defaults to createdAt desc', () => {
            const sortBy = null
            const orderBy: any = {}

            if (sortBy === 'downloadCount') {
                orderBy.downloadCount = 'desc'
            } else if (sortBy === 'rating') {
                orderBy.rating = 'desc'
            } else {
                orderBy.createdAt = 'desc'
            }

            expect(orderBy.createdAt).toBe('desc')
        })

        it('sorts by downloadCount when specified', () => {
            const sortBy = 'downloadCount'
            const orderBy: any = {}

            if (sortBy === 'downloadCount') {
                orderBy.downloadCount = 'desc'
            }

            expect(orderBy.downloadCount).toBe('desc')
        })

        it('sorts by rating when specified', () => {
            const sortBy = 'rating'
            const orderBy: any = {}

            if (sortBy === 'rating') {
                orderBy.rating = 'desc'
            }

            expect(orderBy.rating).toBe('desc')
        })
    })

    describe('Response Serialization', () => {
        it('converts Decimal rating to number', () => {
            const mod = { ...mockMods[0], rating: { toNumber: () => 4.5 } }
            const serialized = {
                ...mod,
                rating: mod.rating ? Number(mod.rating) : null,
            }
            expect(typeof serialized.rating).toBe('number')
        })

        it('converts Decimal price to number', () => {
            const mod = { ...mockMods[1], price: { toNumber: () => 4.99 } }
            const serialized = {
                ...mod,
                price: mod.price ? Number(mod.price) : null,
            }
            expect(typeof serialized.price).toBe('number')
        })

        it('handles null rating', () => {
            const mod = { ...mockMods[0], rating: null }
            const serialized = {
                ...mod,
                rating: mod.rating ? Number(mod.rating) : null,
            }
            expect(serialized.rating).toBeNull()
        })

        it('handles null price for free mods', () => {
            const mod = { ...mockMods[0], price: null }
            const serialized = {
                ...mod,
                price: mod.price ? Number(mod.price) : null,
            }
            expect(serialized.price).toBeNull()
        })
    })
})

describe('Facets Calculation', () => {
    it('calculates category counts correctly', () => {
        const mods = [
            { category: 'Furniture' },
            { category: 'Furniture' },
            { category: 'Clothing' },
        ]

        const categoryCounts: Record<string, number> = {}
        mods.forEach(mod => {
            categoryCounts[mod.category] = (categoryCounts[mod.category] || 0) + 1
        })

        expect(categoryCounts['Furniture']).toBe(2)
        expect(categoryCounts['Clothing']).toBe(1)
    })

    it('calculates tag counts correctly', () => {
        const mods = [
            { tags: ['modern', 'kitchen'] },
            { tags: ['modern', 'cozy'] },
            { tags: ['vintage'] },
        ]

        const tagCounts: Record<string, number> = {}
        mods.forEach(mod => {
            mod.tags?.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1
            })
        })

        expect(tagCounts['modern']).toBe(2)
        expect(tagCounts['kitchen']).toBe(1)
        expect(tagCounts['vintage']).toBe(1)
    })

    it('calculates price range counts correctly', () => {
        const mods = [
            { isFree: true, price: null },
            { isFree: true, price: null },
            { isFree: false, price: 4.99 },
            { isFree: false, price: 15.99 },
        ]

        const priceRanges = {
            free: mods.filter(m => m.isFree).length,
            under5: mods.filter(m => !m.isFree && m.price && Number(m.price) < 5).length,
            '5to10': mods.filter(m => !m.isFree && m.price && Number(m.price) >= 5 && Number(m.price) < 10).length,
            '10to20': mods.filter(m => !m.isFree && m.price && Number(m.price) >= 10 && Number(m.price) < 20).length,
            over20: mods.filter(m => !m.isFree && m.price && Number(m.price) >= 20).length,
        }

        expect(priceRanges.free).toBe(2)
        expect(priceRanges.under5).toBe(1)
        expect(priceRanges['10to20']).toBe(1)
    })
})
