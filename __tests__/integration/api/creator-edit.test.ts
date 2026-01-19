import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Import mocks BEFORE importing the route to ensure they're applied
import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma'

/**
 * Tests for /api/creator/mods/[id]/edit route
 * Creator mod edit submission endpoint
 */

// Mock creatorAuth
vi.mock('@/lib/auth/creatorAuth', () => ({
    requireCreator: vi.fn(),
}))

import { requireCreator } from '@/lib/auth/creatorAuth'
import { POST } from '@/app/api/creator/mods/[id]/edit/route'

const mockCreatorUser = {
    id: 'creator-1',
    email: 'creator@example.com',
    username: 'testcreator',
    displayName: 'Test Creator',
    isCreator: true,
    isAdmin: false,
}

const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    username: 'admin',
    displayName: 'Admin User',
    isCreator: false,
    isAdmin: true,
}

describe('API /api/creator/mods/[id]/edit', () => {
    beforeEach(() => {
        resetPrismaMocks()
        vi.clearAllMocks()
    })

    describe('POST - Create edit submission', () => {
        it('should reject unauthorized users', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: false,
                response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                }),
            } as any)

            const request = new NextRequest('http://localhost:3000/api/creator/mods/mod-1/edit', {
                method: 'POST',
                body: JSON.stringify({}),
            })

            const response = await POST(request, { params: { id: 'mod-1' } })
            expect(response!.status).toBe(401)
        })

        it('should return 404 when mod not found', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            mockPrismaClient.mod.findUnique.mockResolvedValue(null)

            const request = new NextRequest('http://localhost:3000/api/creator/mods/nonexistent/edit', {
                method: 'POST',
                body: JSON.stringify({ title: 'Updated Title' }),
            })

            const response = await POST(request, { params: { id: 'nonexistent' } })
            const json = await response!.json()

            expect(response!.status).toBe(404)
            expect(json.error).toBe('Mod not found')
        })

        it('should reject when creator does not own the mod', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            const mockMod = {
                id: 'mod-1',
                title: 'Existing Mod',
                creator: {
                    userId: 'different-creator-id',
                    user: {
                        id: 'different-creator-id',
                    },
                },
            }

            mockPrismaClient.mod.findUnique.mockResolvedValue(mockMod as any)

            const request = new NextRequest('http://localhost:3000/api/creator/mods/mod-1/edit', {
                method: 'POST',
                body: JSON.stringify({ title: 'Updated Title' }),
            })

            const response = await POST(request, { params: { id: 'mod-1' } })
            const json = await response!.json()

            expect(response!.status).toBe(403)
            expect(json.error).toBe('Forbidden - You can only edit your own mods')
        })

        it('should allow creator to edit their own mod', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            const mockMod = {
                id: 'mod-1',
                title: 'Existing Mod',
                source: 'Creator Upload',
                creator: {
                    userId: mockCreatorUser.id,
                    user: mockCreatorUser,
                },
            }

            const editData = {
                title: 'Updated Mod Title',
                description: 'Updated description',
                category: 'Furniture',
                tags: ['modern', 'updated'],
                version: '2.0',
            }

            const mockSubmission = {
                id: 'submission-1',
                userId: mockCreatorUser.id,
                approvedModId: 'mod-1',
                isEdit: true,
                modName: editData.title,
                description: editData.description,
                category: editData.category,
                tags: editData.tags,
                version: editData.version,
                status: 'pending',
                user: mockCreatorUser,
                approvedMod: mockMod,
            }

            mockPrismaClient.mod.findUnique.mockResolvedValue(mockMod as any)
            mockPrismaClient.modSubmission.create.mockResolvedValue(mockSubmission as any)

            const request = new NextRequest('http://localhost:3000/api/creator/mods/mod-1/edit', {
                method: 'POST',
                body: JSON.stringify(editData),
            })

            const response = await POST(request, { params: { id: 'mod-1' } })
            const json = await response!.json()

            expect(response!.status).toBe(201)
            expect(json.success).toBe(true)
            expect(json.submission.isEdit).toBe(true)
            expect(json.submission.approvedModId).toBe('mod-1')
            expect(json.message).toContain('Edit submitted for admin review')

            expect(mockPrismaClient.modSubmission.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: mockCreatorUser.id,
                    approvedModId: 'mod-1',
                    isEdit: true,
                    modName: editData.title,
                    description: editData.description,
                    status: 'pending',
                }),
                include: expect.any(Object),
            })
        })

        it('should allow admin to edit any mod', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockAdminUser,
                session: {} as any,
                isAdmin: true,
            })

            const mockMod = {
                id: 'mod-1',
                title: 'Existing Mod',
                source: 'User Submission',
                creator: {
                    userId: 'different-creator-id',
                    user: {
                        id: 'different-creator-id',
                    },
                },
            }

            mockPrismaClient.mod.findUnique.mockResolvedValue(mockMod as any)
            mockPrismaClient.modSubmission.create.mockResolvedValue({
                id: 'submission-1',
                userId: mockAdminUser.id,
                approvedModId: 'mod-1',
                isEdit: true,
                status: 'pending',
            } as any)

            const request = new NextRequest('http://localhost:3000/api/creator/mods/mod-1/edit', {
                method: 'POST',
                body: JSON.stringify({ title: 'Admin Updated Title' }),
            })

            const response = await POST(request, { params: { id: 'mod-1' } })
            const json = await response!.json()

            expect(response!.status).toBe(201)
            expect(json.success).toBe(true)
        })

        it('should handle database errors gracefully', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            mockPrismaClient.mod.findUnique.mockRejectedValue(new Error('Database error'))

            const request = new NextRequest('http://localhost:3000/api/creator/mods/mod-1/edit', {
                method: 'POST',
                body: JSON.stringify({ title: 'Test' }),
            })

            const response = await POST(request, { params: { id: 'mod-1' } })
            const json = await response!.json()

            expect(response!.status).toBe(500)
            expect(json.error).toBe('Failed to create edit submission')
        })

        it('should preserve source from original mod if not provided', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            const mockMod = {
                id: 'mod-1',
                title: 'Existing Mod',
                source: 'Original Source',
                creator: {
                    userId: mockCreatorUser.id,
                    user: mockCreatorUser,
                },
            }

            mockPrismaClient.mod.findUnique.mockResolvedValue(mockMod as any)
            mockPrismaClient.modSubmission.create.mockResolvedValue({} as any)

            const request = new NextRequest('http://localhost:3000/api/creator/mods/mod-1/edit', {
                method: 'POST',
                body: JSON.stringify({ title: 'Updated' }),
            })

            await POST(request, { params: { id: 'mod-1' } })

            expect(mockPrismaClient.modSubmission.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    source: 'Original Source',
                }),
                include: expect.any(Object),
            })
        })
    })
})
