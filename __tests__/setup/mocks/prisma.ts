import { vi } from 'vitest'

/**
 * Mock Prisma Client for testing
 * Provides mocked versions of all Prisma methods
 */
export const mockPrismaClient = {
    mod: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
    },
    user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    category: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    subscription: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    downloadClick: {
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
    },
    favorite: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    creatorProfile: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    modSubmission: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
    },
    affiliateOffer: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    },
    affiliateClick: {
        create: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn((fn) => fn(mockPrismaClient)),
}

// Mock the prisma import
vi.mock('@/lib/prisma', () => ({
    prisma: mockPrismaClient,
    default: mockPrismaClient,
}))

vi.mock('../../../lib/prisma', () => ({
    prisma: mockPrismaClient,
    default: mockPrismaClient,
}))

export const resetPrismaMocks = () => {
    Object.values(mockPrismaClient).forEach((model) => {
        if (typeof model === 'object' && model !== null) {
            Object.values(model).forEach((method) => {
                if (typeof method === 'function' && 'mockClear' in method) {
                    (method as ReturnType<typeof vi.fn>).mockClear()
                }
            })
        }
    })
}
