import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Phase 1 SEO Fixes - Tests
 *
 * These tests verify the following GSC issues are permanently fixed:
 * 1.1 - /homepage/ 301 redirect (PRD 8)
 * 1.2 - robots.txt includes Sitemap directive
 * 1.3 - sitemap-nextjs.xml includes game pages
 * 1.4 - sitemap-blog-pages.xml excludes /homepage/
 * 1.5 - No dead wp-sitemap rewrites in vercel.json
 */

// ============================================================
// 1.1 - vercel.json /homepage/ redirect
// ============================================================
describe('1.1 - /homepage/ 301 redirect in vercel.json', () => {
  let vercelConfig: any

  beforeEach(() => {
    const configPath = path.resolve(__dirname, '../../vercel.json')
    vercelConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  })

  it('should have a permanent redirect from /homepage to /', () => {
    const redirects = vercelConfig.redirects || []
    const homepageRedirect = redirects.find(
      (r: any) => r.source === '/homepage' && r.destination === '/'
    )
    expect(homepageRedirect).toBeDefined()
    expect(homepageRedirect.permanent).toBe(true)
  })

  it('should have a permanent redirect from /homepage/ to /', () => {
    const redirects = vercelConfig.redirects || []
    const homepageRedirect = redirects.find(
      (r: any) => r.source === '/homepage/' && r.destination === '/'
    )
    expect(homepageRedirect).toBeDefined()
    expect(homepageRedirect.permanent).toBe(true)
  })

  it('redirects should be defined before rewrites (execution order)', () => {
    // Vercel processes redirects before rewrites, but let's verify both arrays exist
    expect(vercelConfig.redirects).toBeDefined()
    expect(vercelConfig.redirects.length).toBeGreaterThan(0)
    expect(vercelConfig.rewrites).toBeDefined()
  })
})

// ============================================================
// 1.2 - robots.txt Sitemap directive
// ============================================================
describe('1.2 - robots.txt includes Sitemap directive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should append Sitemap directive to WordPress robots.txt', async () => {
    // Mock WordPress robots.txt response (no Sitemap line)
    const wpRobots = `User-agent: *
Disallow: /feed/
Disallow: /wp-json/`

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(wpRobots, { status: 200 })
    )

    const { GET } = await import('@/app/robots.txt/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('Sitemap: https://musthavemods.com/sitemap.xml')
    expect(content).toContain('Disallow: /feed/')
  })

  it('should not duplicate Sitemap directive if WordPress already includes one', async () => {
    const wpRobots = `User-agent: *
Disallow: /feed/
Sitemap: https://musthavemods.com/sitemap.xml`

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(wpRobots, { status: 200 })
    )

    const { GET } = await import('@/app/robots.txt/route')
    const response = await GET()
    const content = await response.text()

    // Count occurrences of Sitemap directive
    const sitemapCount = (content.match(/Sitemap:/g) || []).length
    expect(sitemapCount).toBe(1)
  })

  it('should include Sitemap directive in fallback response (WordPress down)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('', { status: 500 })
    )

    const { GET } = await import('@/app/robots.txt/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('Sitemap: https://musthavemods.com/sitemap.xml')
  })

  it('should include Sitemap directive in error fallback response', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    const { GET } = await import('@/app/robots.txt/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('Sitemap: https://musthavemods.com/sitemap.xml')
  })

  it('should return text/plain content type', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('User-agent: *\nAllow: /', { status: 200 })
    )

    const { GET } = await import('@/app/robots.txt/route')
    const response = await GET()

    expect(response.headers.get('Content-Type')).toBe('text/plain')
  })
})

// ============================================================
// 1.3 - sitemap-nextjs.xml includes game pages
// ============================================================
describe('1.3 - sitemap-nextjs.xml includes game pages', () => {
  it('should include /games/sims-4 in the sitemap', async () => {
    const { GET } = await import('@/app/sitemap-nextjs.xml/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('https://musthavemods.com/games/sims-4')
  })

  it('should include /games/stardew-valley in the sitemap', async () => {
    const { GET } = await import('@/app/sitemap-nextjs.xml/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('https://musthavemods.com/games/stardew-valley')
  })

  it('should include /games/minecraft in the sitemap', async () => {
    const { GET } = await import('@/app/sitemap-nextjs.xml/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('https://musthavemods.com/games/minecraft')
  })

  it('should include /mods browse page in the sitemap', async () => {
    const { GET } = await import('@/app/sitemap-nextjs.xml/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('https://musthavemods.com/mods')
  })

  it('should still include the original pages (/, /creators, /blog)', async () => {
    const { GET } = await import('@/app/sitemap-nextjs.xml/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('https://musthavemods.com/')
    expect(content).toContain('https://musthavemods.com/creators')
    expect(content).toContain('https://musthavemods.com/blog')
  })

  it('should return valid XML with urlset namespace', async () => {
    const { GET } = await import('@/app/sitemap-nextjs.xml/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(content).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
  })

  it('should return application/xml content type', async () => {
    const { GET } = await import('@/app/sitemap-nextjs.xml/route')
    const response = await GET()

    expect(response.headers.get('Content-Type')).toBe('application/xml')
  })
})

// ============================================================
// 1.4 - sitemap-blog-pages.xml excludes /homepage/
// ============================================================
describe('1.4 - sitemap-blog-pages.xml excludes /homepage/', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not include /homepage/ URL in the sitemap', async () => {
    // Mock WordPress pages API response including homepage
    const mockPages = [
      { id: 1, link: 'https://blog.musthavemods.com/about/', modified_gmt: '2026-01-15T10:00:00' },
      { id: 25, link: 'https://blog.musthavemods.com/homepage/', modified_gmt: '2026-01-15T10:00:00' },
      { id: 3, link: 'https://blog.musthavemods.com/privacy-policy/', modified_gmt: '2026-01-15T10:00:00' },
    ]

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockPages), {
        status: 200,
        headers: { 'X-WP-TotalPages': '1' },
      })
    )

    const { GET } = await import('@/app/sitemap-blog-pages.xml/route')
    const response = await GET()
    const content = await response.text()

    expect(content).not.toContain('/homepage/')
    expect(content).toContain('https://musthavemods.com/about/')
    expect(content).toContain('https://musthavemods.com/privacy-policy/')
  })

  it('should rewrite blog.musthavemods.com to musthavemods.com', async () => {
    const mockPages = [
      { id: 1, link: 'https://blog.musthavemods.com/about/', modified_gmt: '2026-01-15T10:00:00' },
    ]

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockPages), {
        status: 200,
        headers: { 'X-WP-TotalPages': '1' },
      })
    )

    const { GET } = await import('@/app/sitemap-blog-pages.xml/route')
    const response = await GET()
    const content = await response.text()

    expect(content).not.toContain('blog.musthavemods.com')
    expect(content).toContain('https://musthavemods.com/about/')
  })
})

// ============================================================
// 1.5 - No dead wp-sitemap rewrites in vercel.json
// ============================================================
describe('1.5 - No dead wp-sitemap rewrites in vercel.json', () => {
  let vercelConfig: any

  beforeEach(() => {
    const configPath = path.resolve(__dirname, '../../vercel.json')
    vercelConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  })

  it('should NOT have a rewrite for /wp-sitemap.xml', () => {
    const rewrites = vercelConfig.rewrites || []
    const wpSitemapRewrite = rewrites.find(
      (r: any) => r.source === '/wp-sitemap.xml'
    )
    expect(wpSitemapRewrite).toBeUndefined()
  })

  it('should NOT have a rewrite for /wp-sitemap-:type.xml', () => {
    const rewrites = vercelConfig.rewrites || []
    const wpSitemapTypeRewrite = rewrites.find(
      (r: any) => r.source === '/wp-sitemap-:type.xml'
    )
    expect(wpSitemapTypeRewrite).toBeUndefined()
  })

  it('should still have static asset rewrites (wp-content, wp-includes)', () => {
    const rewrites = vercelConfig.rewrites || []
    const wpContentRewrite = rewrites.find(
      (r: any) => r.source === '/wp-content/:path*'
    )
    const wpIncludesRewrite = rewrites.find(
      (r: any) => r.source === '/wp-includes/:path*'
    )
    expect(wpContentRewrite).toBeDefined()
    expect(wpIncludesRewrite).toBeDefined()
  })
})

// ============================================================
// 2.0 - Phase 2: Content Cannibalization 301 Redirects
// ============================================================
describe('2.0 - Content cannibalization 301 redirects in vercel.json', () => {
  let vercelConfig: any

  beforeEach(() => {
    const configPath = path.resolve(__dirname, '../../vercel.json')
    vercelConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  })

  const duplicatePairs = [
    { from: '/sims-4-cc-clothes-packs-2025/', to: '/sims-4-cc-clothes-packs/' },
    { from: '/sims-4-body-presets-2/', to: '/sims-4-body-presets/' },
    { from: '/sims-4-goth-cc-2/', to: '/sims-4-goth-cc/' },
    { from: '/sims-4-cc-2/', to: '/sims-4-cc/' },
    { from: '/sims-4-eyelashes-cc-2/', to: '/sims-4-eyelashes-cc/' },
    { from: '/15-must-have-sims-4-woohoo-mods-for-2025/', to: '/best-woohoo-mods-sims-4-ultimate-guide/' },
  ]

  for (const pair of duplicatePairs) {
    it(`should permanently redirect ${pair.from} to ${pair.to}`, () => {
      const redirects = vercelConfig.redirects || []
      const redirect = redirects.find(
        (r: any) => r.source === pair.from && r.destination === pair.to
      )
      expect(redirect).toBeDefined()
      expect(redirect.permanent).toBe(true)
    })
  }

  it('should have redirects for both trailing-slash and non-trailing-slash variants', () => {
    const redirects = vercelConfig.redirects || []
    for (const pair of duplicatePairs) {
      const withoutSlash = pair.from.replace(/\/$/, '')
      const withSlash = pair.from.endsWith('/') ? pair.from : pair.from + '/'
      expect(redirects.find((r: any) => r.source === withoutSlash)).toBeDefined()
      expect(redirects.find((r: any) => r.source === withSlash)).toBeDefined()
    }
  })
})

// ============================================================
// 3.0 - Phase 3: robots.txt blocks parameter URLs
// ============================================================
describe('3.0 - robots.txt blocks parameter URL indexing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should disallow ?creator= parameter URLs', async () => {
    const wpRobots = `User-agent: *\nDisallow: /feed/`

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(wpRobots, { status: 200 })
    )

    const { GET } = await import('@/app/robots.txt/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('Disallow: /*?creator=')
  })

  it('should disallow ?cat= parameter URLs', async () => {
    const wpRobots = `User-agent: *\nDisallow: /feed/`

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(wpRobots, { status: 200 })
    )

    const { GET } = await import('@/app/robots.txt/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('Disallow: /*?cat=')
  })

  it('should disallow ?p= and ?page_id= parameter URLs', async () => {
    const wpRobots = `User-agent: *\nDisallow: /feed/`

    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(wpRobots, { status: 200 })
    )

    const { GET } = await import('@/app/robots.txt/route')
    const response = await GET()
    const content = await response.text()

    expect(content).toContain('Disallow: /*?p=')
    expect(content).toContain('Disallow: /*?page_id=')
  })
})
