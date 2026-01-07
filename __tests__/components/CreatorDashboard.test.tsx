import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CreatorDashboard from '@/app/creators/page'
import React from 'react'

/**
 * Tests for app/creators/page.tsx
 * Creator Dashboard component
 */

// Mock fetch globally
global.fetch = vi.fn()

describe('Creator Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dashboard Stats Display', () => {
    it('should display creator statistics correctly', async () => {
      const mockData = {
        submissions: [
          {
            id: 'sub-1',
            modName: 'Test Mod',
            status: 'pending',
            createdAt: new Date().toISOString(),
            thumbnail: null,
          }
        ],
        counts: {
          total: 10,
          pending: 3,
          approved: 7,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Creator Dashboard')).toBeDefined()
      })

      // Check stats are displayed
      await waitFor(() => {
        expect(screen.getByText('10')).toBeDefined() // Total submissions
        expect(screen.getByText('3')).toBeDefined() // Pending
        expect(screen.getByText('7')).toBeDefined() // Approved
      })
    })

    it('should show zero stats for new creators', async () => {
      const mockData = {
        submissions: [],
        counts: {
          total: 0,
          pending: 0,
          approved: 0,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      await waitFor(() => {
        expect(screen.getByText('No submissions yet')).toBeDefined()
      })
    })
  })

  describe('Submission Status Badges', () => {
    it('should display pending status correctly', async () => {
      const mockData = {
        submissions: [
          {
            id: 'sub-1',
            modName: 'Pending Mod',
            status: 'pending',
            createdAt: new Date().toISOString(),
            thumbnail: null,
          }
        ],
        counts: {
          total: 1,
          pending: 1,
          approved: 0,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      await waitFor(() => {
        // "Pending Review" appears in both stats card and submission badge
        const pendingElements = screen.getAllByText('Pending Review')
        expect(pendingElements.length).toBeGreaterThan(0)
      })
    })

    it('should display approved status correctly', async () => {
      const mockData = {
        submissions: [
          {
            id: 'sub-1',
            modName: 'Approved Mod',
            status: 'approved',
            createdAt: new Date().toISOString(),
            thumbnail: null,
            approvedMod: {
              id: 'mod-1',
              downloadCount: 150,
            }
          }
        ],
        counts: {
          total: 1,
          pending: 0,
          approved: 1,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Approved')).toBeDefined()
      })
    })

    it('should display rejected status correctly', async () => {
      const mockData = {
        submissions: [
          {
            id: 'sub-1',
            modName: 'Rejected Mod',
            status: 'rejected',
            createdAt: new Date().toISOString(),
            thumbnail: null,
          }
        ],
        counts: {
          total: 1,
          pending: 0,
          approved: 0,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Rejected')).toBeDefined()
      })
    })
  })

  describe('Quick Actions', () => {
    it('should show Submit New Mod action', async () => {
      const mockData = {
        submissions: [],
        counts: {
          total: 0,
          pending: 0,
          approved: 0,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Submit New Mod')).toBeDefined()
      })
    })

    it('should show View My Submissions action', async () => {
      const mockData = {
        submissions: [],
        counts: {
          total: 0,
          pending: 0,
          approved: 0,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      await waitFor(() => {
        expect(screen.getByText('View My Submissions')).toBeDefined()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading message while fetching data', () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        new Promise(() => {}) // Never resolves
      )

      render(<CreatorDashboard />)

      expect(screen.getByText('Loading dashboard...')).toBeDefined()
    })
  })

  describe('Download Count Display', () => {
    it('should show download counts for approved mods', async () => {
      const mockData = {
        submissions: [
          {
            id: 'sub-1',
            modName: 'Popular Mod',
            status: 'approved',
            createdAt: new Date().toISOString(),
            thumbnail: null,
            approvedMod: {
              id: 'mod-1',
              downloadCount: 5000,
            }
          }
        ],
        counts: {
          total: 1,
          pending: 0,
          approved: 1,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      await waitFor(() => {
        // Download count appears both in stats card and individual submission
        const downloadElements = screen.getAllByText('5,000')
        expect(downloadElements.length).toBeGreaterThan(0)
      }, { timeout: 3000 })
    })

    it('should calculate total downloads correctly', async () => {
      const mockData = {
        submissions: [
          {
            id: 'sub-1',
            modName: 'Mod 1',
            status: 'approved',
            createdAt: new Date().toISOString(),
            thumbnail: null,
            approvedMod: {
              id: 'mod-1',
              downloadCount: 1000,
            }
          },
          {
            id: 'sub-2',
            modName: 'Mod 2',
            status: 'approved',
            createdAt: new Date().toISOString(),
            thumbnail: null,
            approvedMod: {
              id: 'mod-2',
              downloadCount: 500,
            }
          }
        ],
        counts: {
          total: 2,
          pending: 0,
          approved: 2,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      // Total downloads should be 1500
      await waitFor(() => {
        const totalText = screen.getByText('1,500')
        expect(totalText).toBeDefined()
      })
    })
  })

  describe('Recent Submissions List', () => {
    it('should display up to 5 recent submissions', async () => {
      const mockSubmissions = Array.from({ length: 10 }, (_, i) => ({
        id: `sub-${i}`,
        modName: `Mod ${i}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        thumbnail: null,
      }))

      const mockData = {
        submissions: mockSubmissions,
        counts: {
          total: 10,
          pending: 10,
          approved: 0,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      await waitFor(() => {
        // Should show first 5 submissions
        expect(screen.getByText('Mod 0')).toBeDefined()
        expect(screen.getByText('Mod 4')).toBeDefined()
      })
    })

    it('should show empty state when no submissions exist', async () => {
      const mockData = {
        submissions: [],
        counts: {
          total: 0,
          pending: 0,
          approved: 0,
        }
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      render(<CreatorDashboard />)

      await waitFor(() => {
        expect(screen.getByText('No submissions yet')).toBeDefined()
        expect(screen.getByText('Submit Your First Mod')).toBeDefined()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('API Error'))

      render(<CreatorDashboard />)

      await waitFor(() => {
        // Should still render the dashboard structure even on error
        expect(screen.getByText('Creator Dashboard')).toBeDefined()
      })
    })
  })
})
