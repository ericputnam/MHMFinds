import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

/**
 * Tests for middleware.ts
 * Route protection for /creators and /admin
 */

// Mock next-auth JWT
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn()
}))

import { getToken } from 'next-auth/jwt'

describe('Middleware - Route Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('/creators route protection', () => {
    it('should redirect unauthenticated users to /sign-in', async () => {
      vi.mocked(getToken).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/creators')
      const response = await middleware(request)

      expect(response?.status).toBe(307) // Redirect status
      expect(response?.headers.get('location')).toContain('/sign-in')
    })

    it('should allow creators to access /creators', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'user-123',
        email: 'creator@example.com',
        isCreator: true,
        isAdmin: false,
      } as any)

      const request = new NextRequest('http://localhost:3000/creators')
      const response = await middleware(request)

      // Should allow through (no redirect)
      expect(response?.status).not.toBe(307)
    })

    it('should redirect non-creators to home page', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'user-456',
        email: 'user@example.com',
        isCreator: false,
        isAdmin: false,
      } as any)

      const request = new NextRequest('http://localhost:3000/creators')
      const response = await middleware(request)

      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/')
    })

    it('should allow creators to access /creators/submit', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'user-123',
        email: 'creator@example.com',
        isCreator: true,
        isAdmin: false,
      } as any)

      const request = new NextRequest('http://localhost:3000/creators/submit')
      const response = await middleware(request)

      expect(response?.status).not.toBe(307)
    })

    it('should allow creators to access /creators/submissions', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'user-123',
        email: 'creator@example.com',
        isCreator: true,
        isAdmin: false,
      } as any)

      const request = new NextRequest('http://localhost:3000/creators/submissions')
      const response = await middleware(request)

      expect(response?.status).not.toBe(307)
    })

    it('should allow admin-creators to access /creators', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        isCreator: true,
        isAdmin: true,
      } as any)

      const request = new NextRequest('http://localhost:3000/creators')
      const response = await middleware(request)

      expect(response?.status).not.toBe(307)
    })
  })

  describe('/admin route protection', () => {
    it('should redirect unauthenticated users to /admin/login', async () => {
      vi.mocked(getToken).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/admin')
      const response = await middleware(request)

      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/admin/login')
    })

    it('should allow admins to access /admin', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        isCreator: false,
        isAdmin: true,
      } as any)

      const request = new NextRequest('http://localhost:3000/admin')
      const response = await middleware(request)

      expect(response?.status).not.toBe(307)
    })

    it('should redirect creators (non-admins) to /creators', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'creator-123',
        email: 'creator@example.com',
        isCreator: true,
        isAdmin: false,
      } as any)

      const request = new NextRequest('http://localhost:3000/admin')
      const response = await middleware(request)

      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/creators')
    })

    it('should redirect regular users to /admin/unauthorized', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        isCreator: false,
        isAdmin: false,
      } as any)

      const request = new NextRequest('http://localhost:3000/admin')
      const response = await middleware(request)

      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/admin/unauthorized')
    })

    it('should allow access to /admin/login without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/admin/login')
      const response = await middleware(request)

      // Should allow through (no redirect)
      const location = response?.headers.get('location')
      if (location) {
        expect(location).not.toContain('/admin/login')
      } else {
        // No redirect is expected, which is correct
        expect(location).toBeNull()
      }
    })

    it('should allow access to /admin/unauthorized without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/admin/unauthorized')
      const response = await middleware(request)

      // Should allow through
      expect(response?.status).not.toBe(307)
    })

    it('should allow admin-creators to access /admin', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'superuser-123',
        email: 'superuser@example.com',
        isCreator: true,
        isAdmin: true,
      } as any)

      const request = new NextRequest('http://localhost:3000/admin')
      const response = await middleware(request)

      expect(response?.status).not.toBe(307)
    })

    it('should protect admin sub-routes like /admin/mods', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'creator-123',
        email: 'creator@example.com',
        isCreator: true,
        isAdmin: false,
      } as any)

      const request = new NextRequest('http://localhost:3000/admin/mods')
      const response = await middleware(request)

      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/creators')
    })

    it('should protect admin API routes', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'creator-123',
        email: 'creator@example.com',
        isCreator: true,
        isAdmin: false,
      } as any)

      const request = new NextRequest('http://localhost:3000/admin/users')
      const response = await middleware(request)

      expect(response?.status).toBe(307)
      expect(response?.headers.get('location')).toContain('/creators')
    })
  })

  describe('Role-based access control', () => {
    it('should separate admin and creator access correctly', async () => {
      // Creator trying to access admin
      vi.mocked(getToken).mockResolvedValue({
        id: 'creator-123',
        email: 'creator@example.com',
        isCreator: true,
        isAdmin: false,
      } as any)

      const adminRequest = new NextRequest('http://localhost:3000/admin')
      const adminResponse = await middleware(adminRequest)
      expect(adminResponse?.headers.get('location')).toContain('/creators')

      // Admin trying to access creators (should be allowed if they're also a creator)
      vi.mocked(getToken).mockResolvedValue({
        id: 'admin-123',
        email: 'admin@example.com',
        isCreator: false,
        isAdmin: true,
      } as any)

      const creatorRequest = new NextRequest('http://localhost:3000/creators')
      const creatorResponse = await middleware(creatorRequest)
      // Non-creator admin should be redirected from /creators
      expect(creatorResponse?.status).toBe(307)
    })

    it('should handle users with both creator and admin roles', async () => {
      vi.mocked(getToken).mockResolvedValue({
        id: 'superuser-123',
        email: 'superuser@example.com',
        isCreator: true,
        isAdmin: true,
      } as any)

      // Should access both /admin and /creators
      const adminRequest = new NextRequest('http://localhost:3000/admin')
      const adminResponse = await middleware(adminRequest)
      expect(adminResponse?.status).not.toBe(307)

      const creatorRequest = new NextRequest('http://localhost:3000/creators')
      const creatorResponse = await middleware(creatorRequest)
      expect(creatorResponse?.status).not.toBe(307)
    })
  })
})
