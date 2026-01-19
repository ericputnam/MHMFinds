import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Import mocks BEFORE importing the route to ensure they're applied
import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma'

/**
 * Tests for /api/admin/submissions/[id]/approve route
 * Updated to handle creator submissions and edit workflow
 */

// Mock requireAdmin
vi.mock('@/lib/middleware/auth', () => ({
    requireAdmin: vi.fn(),
}))

import { requireAdmin } from '@/lib/middleware/auth'
import { POST } from '@/app/api/admin/submissions/[id]/approve/route'

const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    username: 'admin',
}

describe('API /api/admin/submissions/[id]/approve', () => {
    beforeEach(() => {
        resetPrismaMocks()
        vi.clearAllMocks()
    })

    describe('POST - Approve submission', () => {
        it('should reject unauthorized users', async () => {
            vi.mocked(requireAdmin).mockResolvedValue({
                authorized: false,
                response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                }),
            } as any)

            const request = new NextRequest('http://localhost:3000/api/admin/submissions/sub-1/approve', {
                method: 'POST',
            })

            const response = await POST(request, { params: { id: 'sub-1' } })
            expect(response!.status).toBe(401)
        })

        it('should return 404 when submission not found', async () => {
            vi.mocked(requireAdmin).mockResolvedValue({
                authorized: true,
                user: mockAdminUser,
            } as any)

            mockPrismaClient.modSubmission.findUnique.mockResolvedValue(null)

            const request = new NextRequest('http://localhost:3000/api/admin/submissions/nonexistent/approve', {
                method: 'POST',
            })

            const response = await POST(request, { params: { id: 'nonexistent' } })
            const json = await response!.json()

            expect(response!.status).toBe(404)
            expect(json.error).toBe('Submission not found')
        })

        it('should reject already processed submissions', async () => {
            vi.mocked(requireAdmin).mockResolvedValue({
                authorized: true,
                user: mockAdminUser,
            } as any)

            const mockSubmission = {
                id: 'sub-1',
                status: 'approved',
                modName: 'Test Mod',
            }

            mockPrismaClient.modSubmission.findUnique.mockResolvedValue(mockSubmission as any)

            const request = new NextRequest('http://localhost:3000/api/admin/submissions/sub-1/approve', {
                method: 'POST',
            })

            const response = await POST(request, { params: { id: 'sub-1' } })
            const json = await response!.json()

            expect(response!.status).toBe(400)
            expect(json.error).toBe('Submission already processed')
        })

        it('should create new mod from regular creator submission', async () => {
            vi.mocked(requireAdmin).mockResolvedValue({
                authorized: true,
                user: mockAdminUser,
            } as any)

            const mockSubmission = {
                id: 'sub-1',
                userId: 'creator-1',
                modName: 'New Creator Mod',
                description: 'A great mod',
                shortDescription: 'Great',
                category: 'Furniture',
                tags: ['modern', 'furniture'],
                thumbnail: 'https://example.com/thumb.jpg',
                images: ['https://example.com/img1.jpg'],
                version: '1.0',
                gameVersion: 'Sims 4',
                downloadUrl: 'https://example.com/download',
                sourceUrl: 'https://example.com/source',
                source: 'Creator Upload',
                author: 'Test Creator',
                isFree: true,
                price: null,
                currency: 'USD',
                isNSFW: false,
                status: 'pending',
                isEdit: false,
                approvedModId: null,
                submitterName: 'Test Creator',
                submitterEmail: 'creator@example.com',
                modUrl: 'https://example.com/source',
                user: {
                    id: 'creator-1',
                    creatorProfile: {
                        id: 'profile-1',
                    },
                },
            }

            const mockCreatedMod = {
                id: 'mod-1',
                title: mockSubmission.modName,
                description: mockSubmission.description,
                creatorId: 'profile-1',
            }

            mockPrismaClient.modSubmission.findUnique.mockResolvedValue(mockSubmission as any)
            mockPrismaClient.mod.create.mockResolvedValue(mockCreatedMod as any)
            mockPrismaClient.modSubmission.update.mockResolvedValue({} as any)

            const request = new NextRequest('http://localhost:3000/api/admin/submissions/sub-1/approve', {
                method: 'POST',
            })

            const response = await POST(request, { params: { id: 'sub-1' } })
            const json = await response!.json()

            expect(response!.status).toBe(200)
            expect(json.success).toBe(true)
            expect(json.mod).toEqual(mockCreatedMod)
            expect(json.message).toBe('Submission approved and mod created successfully')

            // Verify mod was created with creator link
            expect(mockPrismaClient.mod.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    title: mockSubmission.modName,
                    description: mockSubmission.description,
                    creatorId: 'profile-1',
                }),
            })

            // Verify submission was updated with approved status
            expect(mockPrismaClient.modSubmission.update).toHaveBeenCalledWith({
                where: { id: 'sub-1' },
                data: {
                    status: 'approved',
                    reviewedAt: expect.any(Date),
                    reviewedBy: mockAdminUser.id,
                    approvedModId: 'mod-1',
                },
            })
        })

        it('should update existing mod from edit submission', async () => {
            vi.mocked(requireAdmin).mockResolvedValue({
                authorized: true,
                user: mockAdminUser,
            } as any)

            const mockSubmission = {
                id: 'sub-2',
                userId: 'creator-1',
                modName: 'Updated Mod Title',
                description: 'Updated description',
                shortDescription: 'Updated',
                category: 'Furniture',
                tags: ['updated', 'modern'],
                version: '2.0',
                gameVersion: 'Sims 4',
                status: 'pending',
                isEdit: true,
                approvedModId: 'existing-mod-1',
                user: {
                    id: 'creator-1',
                    creatorProfile: {
                        id: 'profile-1',
                    },
                },
                approvedMod: {
                    id: 'existing-mod-1',
                    title: 'Old Title',
                },
            }

            const mockUpdatedMod = {
                id: 'existing-mod-1',
                title: mockSubmission.modName,
                description: mockSubmission.description,
            }

            mockPrismaClient.modSubmission.findUnique.mockResolvedValue(mockSubmission as any)
            mockPrismaClient.mod.update.mockResolvedValue(mockUpdatedMod as any)
            mockPrismaClient.modSubmission.update.mockResolvedValue({} as any)

            const request = new NextRequest('http://localhost:3000/api/admin/submissions/sub-2/approve', {
                method: 'POST',
            })

            const response = await POST(request, { params: { id: 'sub-2' } })
            const json = await response!.json()

            expect(response!.status).toBe(200)
            expect(json.success).toBe(true)
            expect(json.mod).toEqual(mockUpdatedMod)
            expect(json.message).toBe('Edit approved and mod updated successfully')

            // Verify mod was updated, not created
            expect(mockPrismaClient.mod.update).toHaveBeenCalledWith({
                where: { id: 'existing-mod-1' },
                data: expect.objectContaining({
                    title: mockSubmission.modName,
                    description: mockSubmission.description,
                    version: mockSubmission.version,
                    updatedAt: expect.any(Date),
                }),
            })

            expect(mockPrismaClient.mod.create).not.toHaveBeenCalled()
        })

        it('should create mod without creator link for anonymous submissions', async () => {
            vi.mocked(requireAdmin).mockResolvedValue({
                authorized: true,
                user: mockAdminUser,
            } as any)

            const mockSubmission = {
                id: 'sub-3',
                userId: null,
                modName: 'Anonymous Mod',
                description: 'From public form',
                category: 'Other',
                tags: [],
                status: 'pending',
                isEdit: false,
                user: null,
                modUrl: 'https://example.com/mod',
            }

            mockPrismaClient.modSubmission.findUnique.mockResolvedValue(mockSubmission as any)
            mockPrismaClient.mod.create.mockResolvedValue({ id: 'mod-2' } as any)
            mockPrismaClient.modSubmission.update.mockResolvedValue({} as any)

            const request = new NextRequest('http://localhost:3000/api/admin/submissions/sub-3/approve', {
                method: 'POST',
            })

            const response = await POST(request, { params: { id: 'sub-3' } })
            const json = await response!.json()

            expect(response!.status).toBe(200)
            expect(json.success).toBe(true)

            // Verify mod was created without creatorId
            expect(mockPrismaClient.mod.create).toHaveBeenCalledWith({
                data: expect.not.objectContaining({
                    creatorId: expect.anything(),
                }),
            })
        })

        it('should handle database errors gracefully', async () => {
            vi.mocked(requireAdmin).mockResolvedValue({
                authorized: true,
                user: mockAdminUser,
            } as any)

            mockPrismaClient.modSubmission.findUnique.mockRejectedValue(
                new Error('Database error')
            )

            const request = new NextRequest('http://localhost:3000/api/admin/submissions/sub-1/approve', {
                method: 'POST',
            })

            const response = await POST(request, { params: { id: 'sub-1' } })
            const json = await response!.json()

            expect(response!.status).toBe(500)
            expect(json.error).toBe('Failed to approve submission')
        })

        it('should use all creator submission fields when creating mod', async () => {
            vi.mocked(requireAdmin).mockResolvedValue({
                authorized: true,
                user: mockAdminUser,
            } as any)

            const fullSubmission = {
                id: 'sub-4',
                userId: 'creator-1',
                modName: 'Full Featured Mod',
                description: 'Complete description',
                shortDescription: 'Short desc',
                version: '1.5',
                gameVersion: 'Sims 4',
                category: 'Build',
                tags: ['build', 'modern', 'luxury'],
                thumbnail: 'https://example.com/thumb.jpg',
                images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
                downloadUrl: 'https://example.com/download',
                sourceUrl: 'https://example.com/source',
                source: 'Patreon',
                author: 'Pro Creator',
                isFree: false,
                price: 9.99,
                currency: 'USD',
                isNSFW: true,
                status: 'pending',
                isEdit: false,
                user: {
                    id: 'creator-1',
                    creatorProfile: { id: 'profile-1' },
                },
            }

            mockPrismaClient.modSubmission.findUnique.mockResolvedValue(fullSubmission as any)
            mockPrismaClient.mod.create.mockResolvedValue({ id: 'mod-3' } as any)
            mockPrismaClient.modSubmission.update.mockResolvedValue({} as any)

            const request = new NextRequest('http://localhost:3000/api/admin/submissions/sub-4/approve', {
                method: 'POST',
            })

            await POST(request, { params: { id: 'sub-4' } })

            expect(mockPrismaClient.mod.create).toHaveBeenCalledWith({
                data: {
                    title: fullSubmission.modName,
                    description: fullSubmission.description,
                    shortDescription: fullSubmission.shortDescription,
                    version: fullSubmission.version,
                    gameVersion: fullSubmission.gameVersion,
                    category: fullSubmission.category,
                    tags: fullSubmission.tags,
                    thumbnail: fullSubmission.thumbnail,
                    images: fullSubmission.images,
                    downloadUrl: fullSubmission.downloadUrl,
                    sourceUrl: fullSubmission.sourceUrl,
                    source: fullSubmission.source,
                    author: fullSubmission.author,
                    isFree: fullSubmission.isFree,
                    price: fullSubmission.price,
                    currency: fullSubmission.currency,
                    isNSFW: fullSubmission.isNSFW,
                    creatorId: 'profile-1',
                },
            })
        })
    })
})
