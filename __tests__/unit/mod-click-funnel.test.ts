import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Mod Click Funnel Regression Tests
 *
 * Background: For ~8 days (Apr 15-23 2026), the homepage and game/collection
 * pages opened a `<ModDetailsModal>` overlay when a mod card was clicked
 * instead of navigating to /mods/[id]. The modal had:
 *   - No SSR / no ad sidebar / no in-content ad slots
 *   - Limited metadata for SEO
 *   - No URL change → no canonical share-able URL
 *
 * Commit 4e3da0a unified the click funnel through the SSR /mods/[id] page,
 * but the change lived on an un-merged branch (refactor/unify-click-funnel-mods-page)
 * and was almost lost again during the homepage visual overhaul.
 *
 * These source-code-level assertions prevent the modal funnel from being
 * re-introduced. If any test fails, internal mod clicks are silently bypassing
 * the ad-revenue page.
 *
 * NOTE: We exclude .claude/worktrees/** because those are isolated agent
 * worktrees, not part of the deployed codebase.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────
const projectRoot = path.resolve(__dirname, '../../')

function readSource(relativePath: string): string {
  const fullPath = path.resolve(projectRoot, relativePath)
  return fs.readFileSync(fullPath, 'utf-8')
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(projectRoot, relativePath))
}

/** Recursively collect *.tsx and *.ts under a directory, skipping noise dirs. */
function collectSources(dir: string): string[] {
  const out: string[] = []
  const skip = new Set(['node_modules', '.next', '.claude', 'dist', 'build', 'coverage'])
  function walk(absDir: string) {
    if (!fs.existsSync(absDir)) return
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue
      const full = path.join(absDir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        out.push(full)
      }
    }
  }
  walk(path.resolve(projectRoot, dir))
  return out
}

// ─── 1. ModDetailsModal must not exist ──────────────────────────────────────
describe('ModDetailsModal: file removed', () => {
  it('components/ModDetailsModal.tsx must NOT exist', () => {
    expect(fileExists('components/ModDetailsModal.tsx')).toBe(false)
  })

  it('no .tsx/.ts file in app/ or components/ may import ModDetailsModal', () => {
    const sources = [...collectSources('app'), ...collectSources('components')]
    const offenders: string[] = []
    for (const file of sources) {
      const src = fs.readFileSync(file, 'utf-8')
      // Match: import { ModDetailsModal } from '...'
      // Match: import ModDetailsModal from '...'
      // Match: from '.../ModDetailsModal'
      if (
        /import\s+\{[^}]*\bModDetailsModal\b[^}]*\}\s+from/.test(src) ||
        /import\s+ModDetailsModal\s+from/.test(src) ||
        /from\s+['"][^'"]*ModDetailsModal['"]/.test(src)
      ) {
        offenders.push(path.relative(projectRoot, file))
      }
    }
    expect(offenders).toEqual([])
  })
})

// ─── 2. ModCard must navigate, not delegate via prop ────────────────────────
describe('ModCard: direct navigation only (no onClick / onModClick prop)', () => {
  const src = readSource('components/ModCard.tsx')

  it('ModCardProps must NOT declare an onClick prop', () => {
    // Find the ModCardProps interface / type body
    const match = src.match(/interface\s+ModCardProps\s*\{([\s\S]*?)\n\}/)
    expect(match, 'ModCardProps interface must exist').toBeTruthy()
    const body = match![1]
    // The legacy modal-funnel prop names
    expect(body).not.toMatch(/\bonModClick\b/)
    // `onClick` as a prop is what triggered the modal handler before. The
    // internal `onClick` handlers on <article> and <button> are fine — they're
    // attribute usages, not prop declarations — and would NOT appear inside
    // the props interface body.
    expect(body).not.toMatch(/^\s*onClick\b/m)
  })

  it('ModCard must call router.push and target a /mods/[id] href', () => {
    // Two-part check: navigation happens via router.push, AND the file
    // contains an href that points at /mods/. (We don't pin the exact
    // expression — the href can be a template literal, a variable, or inline.)
    expect(src).toMatch(/router\.push\s*\(/)
    expect(src).toMatch(/[`'"]\/mods\/\$?\{?/)
  })

  it('ModCard must NOT contain modal state setters like setSelectedMod', () => {
    expect(src).not.toMatch(/\bsetSelectedMod\b/)
  })
})

// ─── 3. ModGrid must NOT forward an onModClick prop ─────────────────────────
describe('ModGrid: no onModClick passthrough', () => {
  const src = readSource('components/ModGrid.tsx')

  it('ModGridProps must NOT declare an onModClick prop', () => {
    const match = src.match(/interface\s+ModGridProps\s*\{([\s\S]*?)\n\}/)
    expect(match, 'ModGridProps interface must exist').toBeTruthy()
    expect(match![1]).not.toMatch(/\bonModClick\b/)
  })

  it('ModGrid render must NOT pass onClick to <ModCard>', () => {
    // Locate the JSX block where <ModCard ... /> is rendered
    const cardMatch = src.match(/<ModCard\b([\s\S]*?)\/>/)
    expect(cardMatch, '<ModCard /> render must exist').toBeTruthy()
    const cardProps = cardMatch![1]
    expect(cardProps).not.toMatch(/\bonClick\s*=/)
    expect(cardProps).not.toMatch(/\bonModClick\s*=/)
  })
})

// ─── 4. Page-level: no modal state for selected mod ─────────────────────────
describe('Page components: no selectedMod modal state', () => {
  const pages = [
    { name: 'Homepage', file: 'app/page.tsx' },
    { name: 'Game browse (/games/[game])', file: 'app/games/[game]/GamePageClient.tsx' },
    { name: 'Collection (/games/[game]/[topic])', file: 'app/games/[game]/[topic]/CollectionPageClient.tsx' },
  ]

  for (const page of pages) {
    it(`${page.name} must NOT keep selectedMod state`, () => {
      const src = readSource(page.file)
      // The legacy pattern was: const [selectedMod, setSelectedMod] = useState(...)
      expect(src).not.toMatch(/\[\s*selectedMod\s*,\s*setSelectedMod\s*\]/)
      expect(src).not.toMatch(/\bsetSelectedMod\b/)
    })

    it(`${page.name} must NOT render <ModDetailsModal>`, () => {
      const src = readSource(page.file)
      expect(src).not.toMatch(/<ModDetailsModal\b/)
    })

    it(`${page.name} must NOT pass onModClick to children`, () => {
      const src = readSource(page.file)
      expect(src).not.toMatch(/\bonModClick\s*=/)
    })
  }
})

// ─── 5. The SSR mod detail page must remain reachable ───────────────────────
describe('Mod detail SSR page exists (canonical click destination)', () => {
  it('app/mods/[id]/page.tsx must exist (SSR entry)', () => {
    expect(fileExists('app/mods/[id]/page.tsx')).toBe(true)
  })

  it('app/mods/[id]/ModDetailClient.tsx must exist (client shell)', () => {
    expect(fileExists('app/mods/[id]/ModDetailClient.tsx')).toBe(true)
  })
})
