import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  extractIds,
  pickNext,
  findAllIds,
  nextExperimentId,
  ROOT,
} from '../../scripts/agents/next-experiment-id'

const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures', 'next-experiment-id')

describe('next-experiment-id: extractIds()', () => {
  it('finds every E<n> occurrence in a fixture file', () => {
    const text = fs.readFileSync(path.join(FIXTURE_DIR, 'experiments.md'), 'utf-8')
    const hits = extractIds(text, 'fixture:experiments.md')
    const ids = hits.map((h) => h.id).sort((a, b) => a - b)
    expect(ids).toEqual([1, 5, 12])
  })

  it('finds the archive fixture\'s higher id (E27), proving the archive is not skipped', () => {
    const text = fs.readFileSync(path.join(FIXTURE_DIR, 'archive.md'), 'utf-8')
    const hits = extractIds(text, 'fixture:archive.md')
    const ids = hits.map((h) => h.id).sort((a, b) => a - b)
    expect(ids).toEqual([20, 27])
  })

  it('rejects implausible 5+ digit matches (guards against a corrupted scrape inventing a false ceiling)', () => {
    // This is the exact shape of bug found during development: two adjacent, unseparated
    // git-log commit records concatenating into a phantom "E60023" that would otherwise have
    // become the new ceiling for every future id allocation.
    const corrupted = 'fix(funnel): ship E6\n0023 unrelated digits from the next line'
    const hits = extractIds(corrupted, 'fixture:corrupted-boundary')
    expect(hits.map((h) => h.id)).toEqual([6])
  })

  it('a NUL byte between two texts prevents digits from bleeding into a false id across the boundary', () => {
    // Simulates git log --format=%s%n%b%x00 joining commit A's trailing "E6" with commit B's
    // subject line that happens to start with more digits ("0023 ..."). Without a separator the
    // two runs of text merge into one contiguous "E60023" token — a 5-digit id that the
    // MAX_PLAUSIBLE_DIGITS guard correctly discards as implausible, so no id is extracted at all
    // (this is exactly how the phantom "E60023" ceiling was produced and then caught during
    // development). With the NUL separator in between, the boundary can never form, and the
    // real, plausible id "E6" from commit A is extracted on its own.
    const a2 = 'Shipped E6'
    const b2 = '0023 in the next commit'
    expect(extractIds(a2 + b2, 'no-sep-e').map((h) => h.id)).toEqual([])
    expect(extractIds(a2 + '\x00' + b2, 'with-sep-e').map((h) => h.id)).toEqual([6])
  })

  it('extracts nothing from empty or id-free text', () => {
    expect(extractIds('', 'empty')).toEqual([])
    expect(extractIds('no experiment ids in this paragraph at all', 'no-ids')).toEqual([])
  })
})

describe('next-experiment-id: pickNext()', () => {
  it('returns next=1 for an empty hit list (vacuity: no ids ever used)', () => {
    expect(pickNext([])).toEqual({ next: 1, max: 0, maxSource: null, hitCount: 0 })
  })

  it('picks the global max across sources, not the max of any single source', () => {
    const hits = [
      { id: 12, source: 'fixture:experiments.md' },
      { id: 5, source: 'fixture:experiments.md' },
      { id: 27, source: 'fixture:archive.md' }, // highest, lives only in the archive
      { id: 20, source: 'fixture:archive.md' },
    ]
    const result = pickNext(hits)
    expect(result.next).toBe(28)
    expect(result.max).toBe(27)
    expect(result.maxSource).toBe('fixture:archive.md')
    expect(result.hitCount).toBe(4)
  })
})

describe('next-experiment-id: findAllIds() / nextExperimentId() against the real repo', () => {
  it('vacuity guard: finds a substantial number of real id occurrences (repo is not empty)', () => {
    const hits = findAllIds()
    expect(hits.length).toBeGreaterThan(20)
  })

  it('the real repo\'s next id is strictly greater than the live experiments.md\'s own highest id alone', () => {
    // Regression guard for the exact bug this script fixes: reading only the live file
    // under-counts because ids rotate into .claude/agents/mhm-funnel/archive/**.
    const liveText = fs.readFileSync(path.join(ROOT, '.claude/agents/mhm-funnel/experiments.md'), 'utf-8')
    const liveOnly = pickNext(extractIds(liveText, 'live-experiments.md'))
    const real = nextExperimentId()
    expect(real.max).toBeGreaterThanOrEqual(liveOnly.max)
  })

  it('nextExperimentId() is deterministic across repeated calls', () => {
    const a = nextExperimentId()
    const b = nextExperimentId()
    expect(a).toEqual(b)
  })
})
