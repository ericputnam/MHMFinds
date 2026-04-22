import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Sidebar Sticky Health Score Tests
 *
 * These tests ensure the Mediavine sidebar infrastructure stays intact
 * across all key page types. The sidebar was missing or misconfigured,
 * causing a health score of 12.9 (target: 50+).
 *
 * Root causes fixed:
 * - GamePageClient had NO sidebar at all
 * - Homepage sidebar used xl:block (1280px) instead of lg:block (1024px)
 * - Placeholder divs inside asides confused Mediavine's auto-fill
 * - Left spacer divs wasted 300px of horizontal space
 *
 * If any of these tests fail, sidebar ad revenue will drop.
 */

// Helper: read a source file relative to project root
function readSource(relativePath: string): string {
  const fullPath = path.resolve(__dirname, '../../', relativePath)
  return fs.readFileSync(fullPath, 'utf-8')
}

// ============================================================
// 1. Every key page must have <aside id="secondary">
// ============================================================
describe('Sidebar presence: <aside id="secondary"> on all page types', () => {
  const pagesWithSidebar = [
    { name: 'Homepage', file: 'app/page.tsx' },
    { name: 'Game browse (/games/[game])', file: 'app/games/[game]/GamePageClient.tsx' },
    { name: 'Mod detail (/mods/[id])', file: 'app/mods/[id]/ModDetailClient.tsx' },
    { name: 'Download interstitial (/go/[modId])', file: 'app/go/[modId]/GoClient.tsx' },
  ]

  for (const page of pagesWithSidebar) {
    it(`${page.name} must have id="secondary"`, () => {
      const src = readSource(page.file)
      expect(src).toContain('id="secondary"')
    })

    it(`${page.name} must have widget-area primary-sidebar classes`, () => {
      const src = readSource(page.file)
      expect(src).toContain('widget-area primary-sidebar')
    })

    it(`${page.name} must have role="complementary"`, () => {
      const src = readSource(page.file)
      expect(src).toContain('role="complementary"')
    })
  }
})

// ============================================================
// 2. Sidebar must be visible at lg breakpoint (1024px), not xl
// ============================================================
describe('Sidebar breakpoint: visible at lg (1024px), not xl (1280px)', () => {
  it('Homepage sidebar must NOT use xl:block (would hide from 1024-1279px)', () => {
    const src = readSource('app/page.tsx')
    // Find the aside element's className — should contain lg:block, not xl:block
    const asideMatch = src.match(/id="secondary"[\s\S]*?className="([^"]*)"/)
    expect(asideMatch).toBeTruthy()
    const className = asideMatch![1]
    expect(className).toContain('lg:block')
    expect(className).not.toContain('xl:block')
  })

  it('Game browse sidebar must use lg:block', () => {
    const src = readSource('app/games/[game]/GamePageClient.tsx')
    const asideMatch = src.match(/id="secondary"[\s\S]*?className="([^"]*)"/)
    expect(asideMatch).toBeTruthy()
    expect(asideMatch![1]).toContain('lg:block')
  })
})

// ============================================================
// 3. No placeholder divs inside sidebar asides
// ============================================================
describe('Sidebar content: empty aside pattern (no min-h placeholders)', () => {
  const pages = [
    { name: 'Homepage', file: 'app/page.tsx' },
    { name: 'Game browse', file: 'app/games/[game]/GamePageClient.tsx' },
    { name: 'Mod detail', file: 'app/mods/[id]/ModDetailClient.tsx' },
  ]

  for (const page of pages) {
    it(`${page.name} sidebar must NOT have min-h-[250px] placeholder divs`, () => {
      const src = readSource(page.file)
      // Extract the aside element content
      const asideStart = src.indexOf('id="secondary"')
      expect(asideStart).toBeGreaterThan(-1)
      // Get ~500 chars after the aside id to capture its children
      const asideRegion = src.substring(asideStart, asideStart + 500)
      // Find the closing </aside> within this region
      const closingIdx = asideRegion.indexOf('</aside>')
      if (closingIdx > -1) {
        const asideContent = asideRegion.substring(0, closingIdx)
        expect(asideContent).not.toContain('min-h-[250px]')
      }
    })
  }
})

// ============================================================
// 4. No left spacer divs on homepage or game browse
// ============================================================
describe('Layout: no left spacer divs wasting horizontal space', () => {
  it('Homepage must NOT have a left spacer div', () => {
    const src = readSource('app/page.tsx')
    // The old spacer was: <div className="hidden lg:block flex-shrink-0 w-[300px]" aria-hidden="true" />
    // It should not exist between the flex container and the FacetedSidebar
    const spacerPattern = /aria-hidden="true"[\s\S]*?w-\[300px\][\s\S]*?FacetedSidebar/
    const reversePattern = /w-\[300px\][\s\S]*?aria-hidden="true"[\s\S]{0,200}FacetedSidebar/
    expect(src).not.toMatch(spacerPattern)
    expect(src).not.toMatch(reversePattern)
  })

  it('Game browse must NOT have a left spacer div', () => {
    const src = readSource('app/games/[game]/GamePageClient.tsx')
    const spacerPattern = /aria-hidden="true"[\s\S]*?w-\[300px\][\s\S]*?FacetedSidebar/
    const reversePattern = /w-\[300px\][\s\S]*?aria-hidden="true"[\s\S]{0,200}FacetedSidebar/
    expect(src).not.toMatch(spacerPattern)
    expect(src).not.toMatch(reversePattern)
  })
})

// ============================================================
// 5. Sidebar must NEVER have position:sticky or position:fixed
// ============================================================
describe('Sidebar safety: no CSS sticky/fixed on ad sidebar', () => {
  const pages = [
    { name: 'Homepage', file: 'app/page.tsx' },
    { name: 'Game browse', file: 'app/games/[game]/GamePageClient.tsx' },
    { name: 'Mod detail', file: 'app/mods/[id]/ModDetailClient.tsx' },
    { name: 'Download interstitial', file: 'app/go/[modId]/GoClient.tsx' },
  ]

  for (const page of pages) {
    it(`${page.name} sidebar aside must NOT have sticky or fixed classes`, () => {
      const src = readSource(page.file)
      const asideStart = src.indexOf('id="secondary"')
      expect(asideStart).toBeGreaterThan(-1)
      // Check the className on the same element (within 300 chars)
      const region = src.substring(asideStart, asideStart + 300)
      const classMatch = region.match(/className="([^"]*)"/)
      if (classMatch) {
        expect(classMatch[1]).not.toContain('sticky')
        expect(classMatch[1]).not.toContain('fixed')
      }
    })
  }
})
