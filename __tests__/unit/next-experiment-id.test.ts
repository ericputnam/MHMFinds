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

// ---------------------------------------------------------------------------------------
// E344 — the script must RESERVE, not just read. On 11-04 parallel agents in sibling
// worktrees all read the same origin/main and printed the same id (E327 ×4, E329 ×3).
// The CLI cases below are red against the pre-E344 script: it printed the same id every
// time and ignored --hold.
// ---------------------------------------------------------------------------------------
import { execFile, execFileSync } from 'child_process'
import * as os from 'os'
import {
  extractBranchIds,
  extractOpenPrIds,
  readReservations,
  reserveExperimentIds,
  peekExperimentId,
  parseHold,
  withLock,
} from '../../scripts/agents/next-experiment-id'

const SCRIPT = path.join(ROOT, 'scripts', 'agents', 'next-experiment-id.ts')
const TSX = path.join(ROOT, 'node_modules', '.bin', 'tsx')

function tmpLog(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exp-id-'))
  return path.join(dir, 'reservations.jsonl')
}

function cliEnv(log: string) {
  return { ...process.env, MHM_EXPERIMENT_RESERVATIONS: log, MHM_EXPERIMENT_IDS_OFFLINE: '1' }
}

function runCli(log: string, args: string[] = []): string {
  return execFileSync(TSX, [SCRIPT, ...args], { cwd: ROOT, env: cliEnv(log), encoding: 'utf-8' }).trim()
}

function runCliAsync(log: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(TSX, [SCRIPT, ...args], { cwd: ROOT, env: cliEnv(log), encoding: 'utf-8' }, (err, stdout) =>
      err ? reject(err) : resolve(String(stdout).trim())
    )
  })
}

describe('next-experiment-id: CLI reserves (red against the pre-E344 script)', () => {
  it('two sequential calls from the same tree hand out two different ids', () => {
    const log = tmpLog()
    const a = runCli(log, ['--owner', 'test-a'])
    const b = runCli(log, ['--owner', 'test-b'])
    expect(a).toMatch(/^E\d+$/)
    expect(b).toMatch(/^E\d+$/)
    expect(b).not.toBe(a)
    expect(parseInt(b.slice(1), 10)).toBe(parseInt(a.slice(1), 10) + 1)
  }, 60_000)

  it('four concurrent calls (the 11-04 shape) hand out four distinct ids', async () => {
    const log = tmpLog()
    const out = await Promise.all([0, 1, 2, 3].map((i) => runCliAsync(log, ['--owner', `p${i}`])))
    expect(new Set(out).size).toBe(4)
    expect(readReservations(log).rows).toHaveLength(4)
  }, 90_000)

  it('ids held by hand (--hold E336-E345) are never handed out', () => {
    const log = tmpLog()
    const floor = nextExperimentId().next
    const lo = floor
    const hi = floor + 9
    runCli(log, ['--hold', `E${lo}-E${hi}`, '--owner', 'Quinn'])
    const next = parseInt(runCli(log, ['--owner', 'agent']).slice(1), 10)
    expect(next).toBe(hi + 1)
  }, 60_000)

  it('--peek reserves nothing', () => {
    const log = tmpLog()
    const a = runCli(log, ['--peek'])
    const b = runCli(log, ['--peek'])
    expect(a).toBe(b)
    expect(readReservations(log).rows).toHaveLength(0)
  }, 60_000)
})

describe('next-experiment-id: reservation library', () => {
  const fixed = () => [{ id: 335, source: 'fixture' }]

  it('reserveExperimentIds hands out consecutive ids and records the owner', () => {
    const file = tmpLog()
    expect(reserveExperimentIds({ file, owner: 'Ops', sources: fixed }).ids).toEqual([336])
    expect(reserveExperimentIds({ file, owner: 'Pip', count: 2, sources: fixed }).ids).toEqual([337, 338])
    expect(readReservations(file).rows.map((r) => r.owner)).toEqual(['Ops', 'Pip', 'Pip'])
    expect(peekExperimentId({ file, sources: fixed }).next).toBe(339)
  })

  it('a hold above the floor raises it; a reservation after a hold of E336–E345 is E346', () => {
    const file = tmpLog()
    reserveExperimentIds({ file, owner: 'Quinn', hold: parseHold('E336-E345'), sources: fixed })
    const r = reserveExperimentIds({ file, owner: 'Ops', sources: fixed })
    expect(r.ids).toEqual([346])
  })

  it('a torn/unparseable log line still raises the ceiling (can only skip ids, never repeat one)', () => {
    const file = tmpLog()
    fs.writeFileSync(file, '{"id":340,"owner":"x","at":"t","mode":"reserve"}\n{"id":35')
    // the torn tail has no E-token, so it adds nothing; a hand-edited "E352" line must count
    fs.appendFileSync(file, '\nhand note: E352 taken by Rio\n')
    expect(reserveExperimentIds({ file, sources: fixed }).ids).toEqual([353])
  })

  it('withLock breaks a stale lock and refuses a live one past waitMs', () => {
    const file = tmpLog()
    fs.mkdirSync(`${file}.lock`)
    expect(() => withLock(file, () => 1, { waitMs: 200, staleMs: 60_000 })).toThrow(/held/)
    const old = new Date(Date.now() - 10 * 60_000)
    fs.utimesSync(`${file}.lock`, old, old)
    expect(withLock(file, () => 42, { waitMs: 200, staleMs: 60_000 })).toBe(42)
    expect(fs.existsSync(`${file}.lock`)).toBe(false)
  })

  it('parseHold accepts E<n> and E<a>-E<b>, rejects junk and inverted ranges', () => {
    expect(parseHold('E344')).toEqual([344])
    expect(parseHold('E336-E338')).toEqual([336, 337, 338])
    expect(() => parseHold('E340-E336')).toThrow()
    expect(() => parseHold('banana')).toThrow()
  })
})

describe('next-experiment-id: open-PR and branch-name legs', () => {
  it('extracts ids from PR title, body and head branch', () => {
    const hits = extractOpenPrIds([
      { number: 460, title: 'funnel(cass): E341 copy test', body: 'Before: see E290', headRefName: 'funnel/cass/e341-copy' },
      { number: 461, title: 'no id here', body: '', headRefName: 'funnel/ops/E343_lock' },
    ])
    expect(hits.map((h) => h.id).sort((a, b) => a - b)).toEqual([290, 341, 341, 343])
  })

  it('branch-name ids need a separator on both sides (no years, no sha fragments)', () => {
    const ids = extractBranchIds(
      ['funnel/ops/e344-reserve', 'release-2026', 'fix/abc1e23f', 'funnel/watch-2026-10-29', 'e12'],
      'b'
    ).map((h) => h.id)
    expect(ids).toEqual([344, 12])
  })
})
