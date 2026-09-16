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

/**
 * House rule: strip comments before locating markup. This repo's comments
 * deliberately quote the very patterns they warn about — `app/page.tsx`'s
 * header JSDoc names `<aside id="secondary">` while the element itself lives
 * in HomePageClient, and CollectionPageClient's capture-surface comment names
 * it 26 lines above the real aside. Matching raw source finds the
 * documentation, not the element.
 */
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

/**
 * The central registry of every page type that carries a Mediavine ad sidebar.
 * Sections 1, 3 and 5 below all iterate THIS array — a page type added here is
 * covered by every sidebar rule at once, and a page type that is missing from it
 * is covered by none of them silently. /play/ (E38) shipped with its rules
 * re-implemented in a per-page test instead of registered here, so it was outside
 * this suite for four days; registered with E58 (2026-09-16).
 */
const PAGES_WITH_SIDEBAR = [
  { name: 'Homepage', file: 'app/HomePageClient.tsx' },
  { name: 'Game browse (/games/[game])', file: 'app/games/[game]/GamePageClient.tsx' },
  { name: 'Mod detail (/mods/[id])', file: 'app/mods/[id]/ModDetailClient.tsx' },
  { name: 'Download interstitial (/go/[modId])', file: 'app/go/[modId]/GoClient.tsx' },
  { name: 'Daily game (/play/)', file: 'app/play/PlayClient.tsx' },
  { name: 'Collection page (/games/[game]/[topic])', file: 'app/games/[game]/[topic]/CollectionPageClient.tsx' },
]

// ============================================================
// 1. Every key page must have <aside id="secondary">
// ============================================================
describe('Sidebar presence: <aside id="secondary"> on all page types', () => {
  for (const page of PAGES_WITH_SIDEBAR) {
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
    const src = readSource('app/HomePageClient.tsx')
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

  it('Daily game (/play/) sidebar must use lg:block', () => {
    const src = readSource('app/play/PlayClient.tsx')
    const asideMatch = src.match(/id="secondary"[\s\S]*?className="([^"]*)"/)
    expect(asideMatch).toBeTruthy()
    expect(asideMatch![1]).toContain('lg:block')
    expect(asideMatch![1]).not.toContain('xl:block')
  })
})

// ============================================================
// 2b. The registry itself must be complete (the class, not the instance).
//     /play/ was missing from PAGES_WITH_SIDEBAR for four days and nothing
//     failed — the rules above simply never looked at it. Scan app/ for any
//     component that declares an ad sidebar and require it to be registered.
// ============================================================
describe('Registry completeness: every file with id="secondary" is in PAGES_WITH_SIDEBAR', () => {
  function tsxFilesWithSidebar(dir: string, out: string[] = []): string[] {
    const abs = path.resolve(__dirname, '../../', dir)
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) tsxFilesWithSidebar(rel, out)
      else if (entry.name.endsWith('.tsx')) {
        // Strip JSX/line comments first: this repo's comments deliberately quote
        // the very markup they warn about (`<aside id="secondary">`).
        if (stripComments(readSource(rel)).includes('id="secondary"')) out.push(rel)
      }
    }
    return out
  }

  const found = [...tsxFilesWithSidebar('app'), ...tsxFilesWithSidebar('components')]

  it('the scanner works (guards against a vacuous pass)', () => {
    expect(found.length).toBeGreaterThanOrEqual(PAGES_WITH_SIDEBAR.length)
  })

  for (const file of found) {
    it(`${file} must be registered in PAGES_WITH_SIDEBAR`, () => {
      expect(PAGES_WITH_SIDEBAR.map((p) => p.file)).toContain(file)
    })
  }
})

// ============================================================
// 3. No placeholder divs inside sidebar asides
// ============================================================
describe('Sidebar content: empty aside pattern (no min-h placeholders)', () => {
  for (const page of PAGES_WITH_SIDEBAR) {
    it(`${page.name} sidebar must NOT have min-h placeholder divs`, () => {
      const src = stripComments(readSource(page.file))
      // Extract the aside element content
      const asideStart = src.indexOf('id="secondary"')
      expect(asideStart).toBeGreaterThan(-1)
      // Get ~500 chars after the aside id to capture its children
      const asideRegion = src.substring(asideStart, asideStart + 500)
      // Find the closing </aside> within this region
      const closingIdx = asideRegion.indexOf('</aside>')
      if (closingIdx > -1) {
        const asideContent = asideRegion.substring(0, closingIdx)
        // Any min-h-[...] placeholder (250px, 600px, etc.) confuses
        // Mediavine's auto-fill — the aside must be empty
        expect(asideContent).not.toMatch(/min-h-\[/)
      }
    })
  }
})

// ============================================================
// 4. No left spacer divs on homepage or game browse
// ============================================================
describe('Layout: no left spacer divs wasting horizontal space', () => {
  it('Homepage must NOT have a left spacer div', () => {
    const src = readSource('app/HomePageClient.tsx')
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

  it('Download interstitial must NOT have an aria-hidden spacer div', () => {
    const src = readSource('app/go/[modId]/GoClient.tsx')
    // /go has no FacetedSidebar — any aria-hidden 300px element is a spacer
    const spacerPattern = /aria-hidden="true"[\s\S]{0,200}w-\[300px\]/
    const reversePattern = /w-\[300px\]"?[\s\S]{0,200}aria-hidden="true"/
    expect(src).not.toMatch(spacerPattern)
    expect(src).not.toMatch(reversePattern)
  })
})

// ============================================================
// 4b. Homepage server shell: the route entry must stay a per-request
//     server component around HomePageClient (Sage, 2026-09-07).
//     If app/page.tsx goes back to a static 'use client' page calling
//     useSearchParams(), the served HTML is once again a spinner with no
//     <h1>, no links, and no <aside id="secondary"> — crawlers score an
//     empty page and Mediavine's anchors only exist after hydration.
// ============================================================
describe('Homepage server shell (app/page.tsx wraps app/HomePageClient.tsx)', () => {
  it('app/page.tsx must be a server component (no use client directive)', () => {
    const src = readSource('app/page.tsx')
    expect(src).not.toMatch(/^\s*['"]use client['"]/m)
  })

  it('app/page.tsx must render per-request (force-dynamic) so useSearchParams does not bail to the spinner', () => {
    const src = readSource('app/page.tsx')
    expect(src).toMatch(/export const dynamic = ['"]force-dynamic['"]/)
  })

  it('app/page.tsx must render HomePageClient', () => {
    const src = readSource('app/page.tsx')
    expect(src).toMatch(/<HomePageClient\b/)
  })

  it('app/HomePageClient.tsx must be the client tree (use client) and hold the ad sidebar', () => {
    const src = readSource('app/HomePageClient.tsx')
    expect(src).toMatch(/^\s*['"]use client['"]/m)
    expect(src).toContain('id="secondary"')
  })

  it('app/HomePageClient.tsx must not gate the layout behind a loading return', () => {
    const src = readSource('app/HomePageClient.tsx')
    // A top-level `if (loading) return <Loader/>` hides every ad anchor from
    // Mediavine's initial DOM scan. The grid's own skeleton lives in ModGrid.
    expect(src).not.toMatch(/if \(loading\)\s*return/)
  })
})

// ============================================================
// 5. Sidebar must NEVER have position:sticky or position:fixed
// ============================================================
describe('Sidebar safety: no CSS sticky/fixed on ad sidebar', () => {
  for (const page of PAGES_WITH_SIDEBAR) {
    it(`${page.name} sidebar aside must NOT have sticky or fixed classes`, () => {
      const src = stripComments(readSource(page.file))
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
