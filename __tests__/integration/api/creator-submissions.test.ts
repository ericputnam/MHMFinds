import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Import mocks BEFORE importing the route to ensure they're applied
import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma'

/**
 * Tests for /api/creator/submissions route
 * Creator mod submission endpoint
 */

// Mock creatorAuth
vi.mock('@/lib/auth/creatorAuth', () => ({
    requireCreator: vi.fn(),
}))

import { requireCreator } from '@/lib/auth/creatorAuth'
import { POST, GET } from '@/app/api/creator/submissions/route'

const mockCreatorUser = {
    id: 'creator-1',
    email: 'creator@example.com',
    username: 'testcreator',
    displayName: 'Test Creator',
    isCreator: true,
    isAdmin: false,
}

describe('API /api/creator/submissions', () => {
    beforeEach(() => {
        resetPrismaMocks()
        vi.clearAllMocks()
    })

    describe('POST - Create submission', () => {
        it('should reject unauthorized users', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: false,
                response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                }),
            } as any)

            const request = new NextRequest('http://localhost:3000/api/creator/submissions', {
                method: 'POST',
                body: JSON.stringify({}),
            })

            const response = await POST(request)
            expect(response.status).toBe(401)
        })

        it('should create submission for authenticated creator', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            const submissionData = {
                title: 'My New Mod',
                description: 'A great mod',
                shortDescription: 'Great mod',
                category: 'Furniture',
                version: '1.0',
                gameVersion: 'Sims 4',
                tags: ['furniture', 'modern'],
                thumbnail: 'https://example.com/thumb.jpg',
                images: ['https://example.com/img1.jpg'],
                downloadUrl: 'https://example.com/download',
                sourceUrl: 'https://example.com/source',
                source: 'Creator Upload',
                author: 'Test Creator',
                isFree: true,
                price: null,
                currency: 'USD',
                isNSFW: false,
            }

            const mockSubmission = {
                id: 'submission-1',
                userId: mockCreatorUser.id,
                modName: submissionData.title,
                description: submissionData.description,
                shortDescription: submissionData.shortDescription,
                category: submissionData.category,
                version: submissionData.version,
                gameVersion: submissionData.gameVersion,
                tags: submissionData.tags,
                thumbnail: submissionData.thumbnail,
                images: submissionData.images,
                downloadUrl: submissionData.downloadUrl,
                sourceUrl: submissionData.sourceUrl,
                source: submissionData.source,
                author: submissionData.author,
                isFree: submissionData.isFree,
                price: submissionData.price,
                currency: submissionData.currency,
                isNSFW: submissionData.isNSFW,
                status: 'pending',
                isEdit: false,
                submitterName: mockCreatorUser.displayName,
                submitterEmail: mockCreatorUser.email,
                modUrl: submissionData.sourceUrl,
                createdAt: new Date().toISOString(),
                user: mockCreatorUser,
            }

            mockPrismaClient.modSubmission.create.mockResolvedValue(mockSubmission)

            const request = new NextRequest('http://localhost:3000/api/creator/submissions', {
                method: 'POST',
                body: JSON.stringify(submissionData),
            })

            const response = await POST(request)
            const json = await response.json()

            expect(response.status).toBe(201)
            expect(json.success).toBe(true)
            expect(json.submission).toEqual(expect.objectContaining({
                id: mockSubmission.id,
                userId: mockSubmission.userId,
                modName: mockSubmission.modName,
                status: 'pending',
            }))
            expect(json.message).toBe('Mod submitted successfully for review')

            expect(mockPrismaClient.modSubmission.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: mockCreatorUser.id,
                    modName: submissionData.title,
                    description: submissionData.description,
                    category: submissionData.category,
                    submitterName: mockCreatorUser.displayName,
                    submitterEmail: mockCreatorUser.email,
                    status: 'pending',
                    isEdit: false,
                }),
                include: expect.any(Object),
            })
        })

        it('should handle optional fields correctly', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            const minimalData = {
                title: 'Minimal Mod',
                description: 'Basic description',
                category: 'Other',
            }

            mockPrismaClient.modSubmission.create.mockResolvedValue({
                id: 'submission-2',
                userId: mockCreatorUser.id,
                modName: minimalData.title,
                description: minimalData.description,
                category: minimalData.category,
                status: 'pending',
                user: mockCreatorUser,
            } as any)

            const request = new NextRequest('http://localhost:3000/api/creator/submissions', {
                method: 'POST',
                body: JSON.stringify(minimalData),
            })

            const response = await POST(request)
            const json = await response.json()

            expect(response.status).toBe(201)
            expect(json.success).toBe(true)
        })

        it('should handle errors gracefully', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            mockPrismaClient.modSubmission.create.mockRejectedValue(new Error('Database error'))

            const request = new NextRequest('http://localhost:3000/api/creator/submissions', {
                method: 'POST',
                body: JSON.stringify({ title: 'Test', description: 'Test', category: 'Test' }),
            })

            const response = await POST(request)
            const json = await response.json()

            expect(response.status).toBe(500)
            expect(json.error).toBe('Failed to create submission')
        })
    })

    describe('GET - List submissions', () => {
        it('should reject unauthorized users', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: false,
                response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
                    status: 401,
                }),
            } as any)

            const request = new NextRequest('http://localhost:3000/api/creator/submissions')
            const response = await GET(request)

            expect(response.status).toBe(401)
        })

        it('should list submissions for authenticated creator', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            const mockSubmissions = [
                {
                    id: 'sub-1',
                    userId: mockCreatorUser.id,
                    modName: 'Mod 1',
                    description: 'Description 1',
                    category: 'Furniture',
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    user: mockCreatorUser,
                },
                {
                    id: 'sub-2',
                    userId: mockCreatorUser.id,
                    modName: 'Mod 2',
                    description: 'Description 2',
                    category: 'Clothing',
                    status: 'approved',
                    createdAt: new Date().toISOString(),
                    user: mockCreatorUser,
                    approvedMod: {
                        id: 'mod-1',
                        title: 'Mod 2',
                        downloadCount: 100,
                    },
                },
            ]

            const mockCounts = [
                { status: 'pending', _count: 1 },
                { status: 'approved', _count: 1 },
            ]

            mockPrismaClient.modSubmission.findMany.mockResolvedValue(mockSubmissions)
            mockPrismaClient.modSubmission.groupBy.mockResolvedValue(mockCounts)

            const request = new NextRequest('http://localhost:3000/api/creator/submissions')
            const response = await GET(request)
            const json = await response.json()

            expect(response.status).toBe(200)
            expect(json.submissions).toHaveLength(2)
            expect(json.submissions[0]).toEqual(expect.objectContaining({
                id: 'sub-1',
                status: 'pending',
            }))
            expect(json.counts.total).toBe(2)
            expect(json.counts.pending).toBe(1)
            expect(json.counts.approved).toBe(1)

            // Verify query only fetches creator's own submissions
            expect(mockPrismaClient.modSubmission.findMany).toHaveBeenCalledWith({
                where: { userId: mockCreatorUser.id },
                orderBy: { createdAt: 'desc' },
                include: expect.any(Object),
            })
        })

        it('should filter by status when provided', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            mockPrismaClient.modSubmission.findMany.mockResolvedValue([])
            mockPrismaClient.modSubmission.groupBy.mockResolvedValue([])

            const request = new NextRequest(
                'http://localhost:3000/api/creator/submissions?status=pending'
            )
            await GET(request)

            expect(mockPrismaClient.modSubmission.findMany).toHaveBeenCalledWith({
                where: {
                    userId: mockCreatorUser.id,
                    status: 'pending',
                },
                orderBy: { createdAt: 'desc' },
                include: expect.any(Object),
            })
        })

        it('should handle errors gracefully', async () => {
            vi.mocked(requireCreator).mockResolvedValue({
                authorized: true,
                user: mockCreatorUser,
                session: {} as any,
                isAdmin: false,
            })

            mockPrismaClient.modSubmission.findMany.mockRejectedValue(new Error('Database error'))

            const request = new NextRequest('http://localhost:3000/api/creator/submissions')
            const response = await GET(request)
            const json = await response.json()

            expect(response.status).toBe(500)
            expect(json.error).toBe('Failed to fetch submissions')
        })
    })
})
