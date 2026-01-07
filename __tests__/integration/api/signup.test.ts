import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { mockPrismaClient, resetPrismaMocks } from '../../setup/mocks/prisma'

/**
 * Tests for app/api/auth/signup/route.ts
 * User signup with creator account option
 */

// Mock BEFORE importing the module
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient
}))

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password_123')
  }
}))

// Import AFTER mocks
import { POST } from '@/app/api/auth/signup/route'

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    resetPrismaMocks()
    vi.clearAllMocks()
  })

  describe('Creator Account Signup', () => {
    it('should create a creator account when isCreator is true', async () => {
      const signupData = {
        email: 'creator@example.com',
        password: 'password123',
        username: 'creatoruser',
        isCreator: true
      }

      const mockUser = {
        id: 'user-123',
        email: 'creator@example.com',
        username: 'creatoruser',
        displayName: 'creatoruser',
        isAdmin: false,
        isPremium: false,
        isCreator: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        bio: null,
      }

      // Mock Prisma transaction
      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: {
            create: vi.fn().mockResolvedValue(mockUser)
          },
          account: {
            create: vi.fn().mockResolvedValue({})
          },
          subscription: {
            create: vi.fn().mockResolvedValue({})
          },
          collection: {
            create: vi.fn().mockResolvedValue({})
          }
        })
      })

      mockPrismaClient.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.message).toBe('Account created successfully')
      expect(json.user.email).toBe('creator@example.com')
      expect(json.user.username).toBe('creatoruser')
    })

    it('should create a regular account when isCreator is false', async () => {
      const signupData = {
        email: 'user@example.com',
        password: 'password123',
        username: 'regularuser',
        isCreator: false
      }

      const mockUser = {
        id: 'user-456',
        email: 'user@example.com',
        username: 'regularuser',
        displayName: 'regularuser',
        isAdmin: false,
        isPremium: false,
        isCreator: false,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        bio: null,
      }

      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: {
            create: vi.fn().mockResolvedValue(mockUser)
          },
          account: {
            create: vi.fn().mockResolvedValue({})
          },
          subscription: {
            create: vi.fn().mockResolvedValue({})
          },
          collection: {
            create: vi.fn().mockResolvedValue({})
          }
        })
      })

      mockPrismaClient.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.user.username).toBe('regularuser')
    })

    it('should default isCreator to false when not provided', async () => {
      const signupData = {
        email: 'user@example.com',
        password: 'password123',
        username: 'defaultuser'
        // isCreator not provided
      }

      const mockUser = {
        id: 'user-789',
        email: 'user@example.com',
        username: 'defaultuser',
        displayName: 'defaultuser',
        isAdmin: false,
        isPremium: false,
        isCreator: false,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        bio: null,
      }

      mockPrismaClient.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: {
            create: vi.fn().mockResolvedValue(mockUser)
          },
          account: {
            create: vi.fn().mockResolvedValue({})
          },
          subscription: {
            create: vi.fn().mockResolvedValue({})
          },
          collection: {
            create: vi.fn().mockResolvedValue({})
          }
        })
      })

      mockPrismaClient.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })
  })

  describe('Validation', () => {
    it('should reject signup without email', async () => {
      const signupData = {
        password: 'password123',
        username: 'testuser'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.message).toContain('required')
    })

    it('should reject signup without password', async () => {
      const signupData = {
        email: 'test@example.com',
        username: 'testuser'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.message).toContain('required')
    })

    it('should reject signup without username', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'password123'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.message).toContain('required')
    })

    it('should reject invalid email format', async () => {
      const signupData = {
        email: 'not-an-email',
        password: 'password123',
        username: 'testuser'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.message).toContain('Invalid email')
    })

    it('should reject password shorter than 6 characters', async () => {
      const signupData = {
        email: 'test@example.com',
        password: '12345',
        username: 'testuser'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.message).toContain('at least 6 characters')
    })

    it('should reject duplicate email', async () => {
      const signupData = {
        email: 'existing@example.com',
        password: 'password123',
        username: 'testuser'
      }

      mockPrismaClient.user.findUnique.mockResolvedValueOnce({
        id: 'existing-user',
        email: 'existing@example.com',
        username: 'existinguser',
      } as any)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(409)
      expect(json.message).toContain('Email already registered')
    })

    it('should reject duplicate username', async () => {
      const signupData = {
        email: 'new@example.com',
        password: 'password123',
        username: 'existinguser'
      }

      // First call for email check returns null (email available)
      // Second call for username check returns existing user
      mockPrismaClient.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'existing-user',
          email: 'other@example.com',
          username: 'existinguser',
        } as any)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signupData),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(409)
      expect(json.message).toContain('Username already taken')
    })
  })
})
