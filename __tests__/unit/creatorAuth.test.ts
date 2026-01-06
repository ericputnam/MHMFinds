import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Import mocks BEFORE importing the module to ensure they're applied
import { mockPrismaClient, resetPrismaMocks } from '../setup/mocks/prisma'

/**
 * Tests for lib/auth/creatorAuth.ts
 * Creator authentication helper
 */

// Mock next-auth server session
vi.mock('next-auth', () => ({
    default: vi.fn(), // NextAuth default export
    getServerSession: vi.fn(),
}))

import { getServerSession } from 'next-auth'
import { requireCreator } from '@/lib/auth/creatorAuth'

describe('creatorAuth', () => {
    beforeEach(() => {
        resetPrismaMocks()
        vi.clearAllMocks()
    })

    describe('requireCreator', () => {
        it('should return unauthorized when no session exists', async () => {
            vi.mocked(getServerSession).mockResolvedValue(null)

            const request = new NextRequest('http://localhost:3000/api/test')
            const result = await requireCreator(request)

            expect(result.authorized).toBe(false)
            expect(result.response).toBeDefined()

            const json = await result.response?.json()
            expect(json.error).toBe('Unauthorized - Please sign in')
        })

        it('should return unauthorized when session has no user', async () => {
            vi.mocked(getServerSession).mockResolvedValue({
                user: null,
                expires: new Date().toISOString(),
            } as any)

            const request = new NextRequest('http://localhost:3000/api/test')
            const result = await requireCreator(request)

            expect(result.authorized).toBe(false)
        })

        it('should return forbidden when user is not creator or admin', async () => {
            vi.mocked(getServerSession).mockResolvedValue({
                user: {
                    email: 'user@example.com',
                    name: 'Test User',
                },
                expires: new Date().toISOString(),
            } as any)

            mockPrismaClient.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                username: 'testuser',
                displayName: 'Test User',
                isCreator: false,
                isAdmin: false,
            })

            const request = new NextRequest('http://localhost:3000/api/test')
            const result = await requireCreator(request)

            expect(result.authorized).toBe(false)
            expect(result.response).toBeDefined()

            const json = await result.response?.json()
            expect(json.error).toBe('Forbidden - Creator access required')
        })

        it('should authorize creator users', async () => {
            vi.mocked(getServerSession).mockResolvedValue({
                user: {
                    email: 'creator@example.com',
                    name: 'Creator User',
                },
                expires: new Date().toISOString(),
            } as any)

            const mockUser = {
                id: 'creator-1',
                email: 'creator@example.com',
                username: 'creator',
                displayName: 'Creator User',
                isCreator: true,
                isAdmin: false,
            }

            mockPrismaClient.user.findUnique.mockResolvedValue(mockUser)

            const request = new NextRequest('http://localhost:3000/api/test')
            const result = await requireCreator(request)

            expect(result.authorized).toBe(true)
            expect(result.user).toEqual(mockUser)
            expect(result.isAdmin).toBe(false)
        })

        it('should authorize admin users', async () => {
            vi.mocked(getServerSession).mockResolvedValue({
                user: {
                    email: 'admin@example.com',
                    name: 'Admin User',
                },
                expires: new Date().toISOString(),
            } as any)

            const mockUser = {
                id: 'admin-1',
                email: 'admin@example.com',
                username: 'admin',
                displayName: 'Admin User',
                isCreator: false,
                isAdmin: true,
            }

            mockPrismaClient.user.findUnique.mockResolvedValue(mockUser)

            const request = new NextRequest('http://localhost:3000/api/test')
            const result = await requireCreator(request)

            expect(result.authorized).toBe(true)
            expect(result.user).toEqual(mockUser)
            expect(result.isAdmin).toBe(true)
        })

        it('should authorize users who are both creator and admin', async () => {
            vi.mocked(getServerSession).mockResolvedValue({
                user: {
                    email: 'superuser@example.com',
                    name: 'Super User',
                },
                expires: new Date().toISOString(),
            } as any)

            const mockUser = {
                id: 'super-1',
                email: 'superuser@example.com',
                username: 'superuser',
                displayName: 'Super User',
                isCreator: true,
                isAdmin: true,
            }

            mockPrismaClient.user.findUnique.mockResolvedValue(mockUser)

            const request = new NextRequest('http://localhost:3000/api/test')
            const result = await requireCreator(request)

            expect(result.authorized).toBe(true)
            expect(result.user).toEqual(mockUser)
            expect(result.isAdmin).toBe(true)
        })

        it('should query user by email from session', async () => {
            vi.mocked(getServerSession).mockResolvedValue({
                user: {
                    email: 'creator@example.com',
                    name: 'Creator User',
                },
                expires: new Date().toISOString(),
            } as any)

            mockPrismaClient.user.findUnique.mockResolvedValue({
                id: 'creator-1',
                email: 'creator@example.com',
                username: 'creator',
                displayName: 'Creator User',
                isCreator: true,
                isAdmin: false,
            })

            const request = new NextRequest('http://localhost:3000/api/test')
            await requireCreator(request)

            expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
                where: { email: 'creator@example.com' },
                select: {
                    id: true,
                    isCreator: true,
                    isAdmin: true,
                    email: true,
                    username: true,
                    displayName: true,
                },
            })
        })

        it('should return forbidden when user not found in database', async () => {
            vi.mocked(getServerSession).mockResolvedValue({
                user: {
                    email: 'nonexistent@example.com',
                    name: 'Ghost User',
                },
                expires: new Date().toISOString(),
            } as any)

            mockPrismaClient.user.findUnique.mockResolvedValue(null)

            const request = new NextRequest('http://localhost:3000/api/test')
            const result = await requireCreator(request)

            expect(result.authorized).toBe(false)
        })
    })
})
