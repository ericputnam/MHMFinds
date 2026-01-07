import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Navbar } from '@/components/Navbar'
import React from 'react'

/**
 * Tests for components/Navbar.tsx
 * Navbar component with Creator Portal button
 */

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

// Mock UsageIndicator component
vi.mock('@/components/subscription/UsageIndicator', () => ({
  UsageIndicator: () => <div data-testid="usage-indicator">Usage Indicator</div>
}))

import { useSession } from 'next-auth/react'

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Creator Portal Button Visibility', () => {
    it('should show Creator Portal button for logged-in creators', () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'creator-123',
            email: 'creator@example.com',
            username: 'creatoruser',
            isCreator: true,
            isAdmin: false,
            isPremium: false,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const creatorButton = screen.getAllByText('Creator Portal')
      expect(creatorButton.length).toBeGreaterThan(0)
    })

    it('should NOT show Creator Portal button for regular users', () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            username: 'regularuser',
            isCreator: false,
            isAdmin: false,
            isPremium: false,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const creatorButton = screen.queryAllByText('Creator Portal')
      expect(creatorButton.length).toBe(0)
    })

    it('should NOT show Creator Portal button when not logged in', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const creatorButton = screen.queryAllByText('Creator Portal')
      expect(creatorButton.length).toBe(0)
    })

    it('should show Creator Portal button for admin-creators', () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            username: 'adminuser',
            isCreator: true,
            isAdmin: true,
            isPremium: false,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const creatorButton = screen.getAllByText('Creator Portal')
      expect(creatorButton.length).toBeGreaterThan(0)
    })

    it('should NOT show Creator Portal button for admins who are not creators', () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'admin-456',
            email: 'admin@example.com',
            username: 'adminuser',
            isCreator: false,
            isAdmin: true,
            isPremium: false,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const creatorButton = screen.queryAllByText('Creator Portal')
      expect(creatorButton.length).toBe(0)
    })
  })

  describe('Creator Portal Button in User Menu', () => {
    it('should include Creator Portal in navbar for creators', () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'creator-123',
            email: 'creator@example.com',
            username: 'creatoruser',
            isCreator: true,
            isAdmin: false,
            isPremium: false,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      // Should have Creator Portal visible (dropdown items are in DOM but hidden)
      const creatorButtons = screen.getAllByText('Creator Portal')
      expect(creatorButtons.length).toBeGreaterThan(0)
    })

    it('should NOT include Creator Portal for non-creators', () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            username: 'regularuser',
            isCreator: false,
            isAdmin: false,
            isPremium: true,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const creatorButton = screen.queryAllByText('Creator Portal')
      expect(creatorButton.length).toBe(0)
    })
  })

  describe('Navigation Links', () => {
    it('should show Creators link pointing to /top-creators', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const creatorsLink = screen.getByText('Creators')
      expect(creatorsLink).toBeDefined()
      expect(creatorsLink.closest('a')?.getAttribute('href')).toBe('/top-creators')
    })

    it('should show Discover link', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const discoverLink = screen.getByText('Discover')
      expect(discoverLink).toBeDefined()
      expect(discoverLink.closest('a')?.getAttribute('href')).toBe('/')
    })
  })

  describe('Authentication State', () => {
    it('should show Sign In button when not authenticated', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const signInButton = screen.getByText('Sign In')
      expect(signInButton).toBeDefined()
    })

    it('should show user menu when authenticated', () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com',
            username: 'testuser',
            isCreator: false,
            isAdmin: false,
            isPremium: false,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const username = screen.getByText('testuser')
      expect(username).toBeDefined()
    })

    it('should show username for premium users', () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'user-123',
            email: 'premium@example.com',
            username: 'premiumuser',
            isCreator: false,
            isAdmin: false,
            isPremium: true,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      // Premium users should see their username in the navbar
      const username = screen.getByText('premiumuser')
      expect(username).toBeDefined()
    })
  })

  describe('Creator Portal Button Link', () => {
    it('should link to /creators route', () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: {
            id: 'creator-123',
            email: 'creator@example.com',
            username: 'creatoruser',
            isCreator: true,
            isAdmin: false,
            isPremium: false,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
        status: 'authenticated',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      const creatorLinks = screen.getAllByText('Creator Portal')
      // Check at least one link points to /creators
      const hasCorrectLink = creatorLinks.some(
        el => el.closest('a')?.getAttribute('href') === '/creators'
      )
      expect(hasCorrectLink).toBe(true)
    })
  })

  describe('Loading State', () => {
    it('should handle loading state gracefully', () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: 'loading',
        update: vi.fn(),
      } as any)

      render(<Navbar />)

      // Should render without Creator Portal button during loading
      const creatorButton = screen.queryAllByText('Creator Portal')
      expect(creatorButton.length).toBe(0)
    })
  })
})
