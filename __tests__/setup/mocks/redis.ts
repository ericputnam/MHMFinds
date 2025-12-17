import { vi } from 'vitest'

/**
 * Mock Redis/Cache for testing
 * Simulates Upstash Redis behavior
 */

// In-memory cache store for tests
let mockCacheStore: Map<string, { value: any; expiry?: number }> = new Map()

export const mockRedisClient = {
    get: vi.fn(async <T>(key: string): Promise<T | null> => {
        const item = mockCacheStore.get(key)
        if (!item) return null
        if (item.expiry && Date.now() > item.expiry) {
            mockCacheStore.delete(key)
            return null
        }
        return item.value as T
    }),

    set: vi.fn(async (key: string, value: any): Promise<void> => {
        mockCacheStore.set(key, { value })
    }),

    setex: vi.fn(async (key: string, ttl: number, value: any): Promise<void> => {
        mockCacheStore.set(key, {
            value,
            expiry: Date.now() + (ttl * 1000)
        })
    }),

    del: vi.fn(async (...keys: string[]): Promise<void> => {
        keys.forEach(key => mockCacheStore.delete(key))
    }),

    keys: vi.fn(async (pattern: string): Promise<string[]> => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        return Array.from(mockCacheStore.keys()).filter(key => regex.test(key))
    }),

    flushdb: vi.fn(async (): Promise<void> => {
        mockCacheStore.clear()
    }),
}

// Helper to clear cache between tests
export const clearMockCache = () => {
    mockCacheStore.clear()
    vi.clearAllMocks()
}

// Helper to set cache values directly for testing
export const setMockCacheValue = (key: string, value: any, ttlSeconds?: number) => {
    mockCacheStore.set(key, {
        value,
        expiry: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined,
    })
}

// Helper to get raw cache for assertions
export const getMockCacheStore = () => mockCacheStore

// Mock the Upstash Redis import
vi.mock('@upstash/redis', () => ({
    Redis: vi.fn(() => mockRedisClient),
}))
