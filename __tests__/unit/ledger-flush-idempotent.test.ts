import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * E126 (2026-09-27) — the ledger flush must be idempotent by row IDENTITY, not bytes.
 *
 * On the morning of 2026-09-27 the runner's seed step (`grep -F -x -v` of the operator tree's
 * changelog.md into Quinn's checkout of main) appended two rows main had already accounted for:
 *   - "PR #145 operator approvals 2026-09-21 (Tier 0 docs)" — relabelled on main as "Quinn: PR #145 …"
 *   - "06:55 after-merge Pip: PR #142 … ROLLED BACK, STILL FAILING" — replaced on main by a 07:14
 *     "after-merge (correcting row …)" row for the same commit.
 * These tests run the REAL scripts/agents/ledger-commit.sh (copied into a throwaway git repo whose
 * `origin` is a local bare repo — no network) and were seen red against the pre-fix tree:
 * `--merge-local` did not exist (exit 64), the flush landed the relabelled row a second time, and an
 * incident file with a non-timestamp name was copied by basename.
 */

const REPO = process.cwd();
const SCRIPT_SRC = join(REPO, 'scripts/agents/ledger-commit.sh');

const HEADER =
  '# Production change ledger\n\n| when | mode | who / what | commit | deployment | result | notes |\n|---|---|---|---|---|---|---|\n';
const MAIN_145 =
  '| 2026-09-21 20:01 | after-merge | Quinn: PR #145 operator approvals 2026-09-21 (Q12 applied; Tier 0 docs) | c6e005d | https://a.example | PASS | verified live · 5xx/15m=0 (deploy-verify 20:05) |';
const STALE_145 =
  '| 2026-09-21 20:01 | after-merge | PR #145 operator approvals 2026-09-21 (Tier 0 docs) | c6e005d | https://a.example | PASS | verified live · 5xx/15m=0  |';
const MAIN_142_CORRECTION =
  '| 2026-09-22 07:14 | after-merge (correcting row, written 2026-09-23 by Ops) | Pip: PR #142 writer-liveness monitor (E76, T0) — FALSE ALARM | 536ac96 | https://b.example | PASS (retro) | x |';
const STALE_142 =
  '| 2026-09-22 06:55 | after-merge | Pip: PR #142 writer-liveness monitor for the Pinterest pin queue (E76, T0) | 536ac96 | https://b.example | ROLLED BACK, STILL FAILING | was: smoke timeout |';
const MORNING_CHECK = '| 2026-09-27 06:35 | check | morning-check |  | https://c.example | PASS | scheduled/ad-hoc check · 5xx/15m=0  |';
const NEW_ROW = '| 2026-09-27 07:40 | after-merge | Sage: PR #999 something new | abc1234 | https://d.example | PASS | verified live |';

let dir: string;

function sh(cmd: string, args: string[], cwd: string, env: Record<string, string> = {}) {
  return spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 60_000 });
}
function git(cwd: string, ...args: string[]) {
  const r = sh('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], cwd);
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

/** A throwaway "repo" with the script at scripts/agents/, and a bare origin whose main has `mainRows`. */
function setup(mainRows: string[]) {
  const bare = join(dir, 'origin.git');
  const seed = join(dir, 'seed');
  const root = join(dir, 'root');
  mkdirSync(join(seed, 'reports/funnel'), { recursive: true });
  writeFileSync(join(seed, 'reports/funnel/changelog.md'), HEADER + mainRows.join('\n') + '\n');
  git(seed, 'init', '-q', '-b', 'main');
  git(seed, 'add', '.');
  git(seed, 'commit', '-q', '-m', 'seed');
  git(dir, 'clone', '-q', '--bare', seed, bare);
  git(dir, 'clone', '-q', bare, root);
  mkdirSync(join(root, 'scripts/agents'), { recursive: true });
  copyFileSync(SCRIPT_SRC, join(root, 'scripts/agents/ledger-commit.sh'));
  return { bare, root, script: join(root, 'scripts/agents/ledger-commit.sh') };
}
function mainChangelog(bare: string) {
  return git(dir, `--git-dir=${bare}`, 'show', 'main:reports/funnel/changelog.md');
}
const count = (text: string, needle: string) => text.split('\n').filter((l) => l === needle).length;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ledger-e126-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('ledger-commit.sh --merge-local (the runner seed step): identity-aware, append-only', () => {
  it('skips relabelled and corrected rows, keeps genuinely new ones, and logs the skip count', () => {
    const { script } = setup([]);
    const src = join(dir, 'operator-changelog.md');
    const dst = join(dir, 'quinn-changelog.md');
    writeFileSync(src, HEADER + [STALE_145, MAIN_145, STALE_142, MAIN_142_CORRECTION, MORNING_CHECK, NEW_ROW].join('\n') + '\n');
    writeFileSync(dst, HEADER + [MAIN_145, MAIN_142_CORRECTION, MORNING_CHECK].join('\n') + '\n');

    const r = sh('bash', [script, '--merge-local', src, '--into', dst], dir);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const out = readFileSync(dst, 'utf8');
    expect(count(out, STALE_145)).toBe(0);
    expect(count(out, STALE_142)).toBe(0);
    expect(count(out, MAIN_145)).toBe(1);
    expect(count(out, MORNING_CHECK)).toBe(1);
    expect(count(out, NEW_ROW)).toBe(1);
    expect(r.stdout).toContain('ledger: flush skipped 5 duplicate row(s)');

    // Idempotent: a second pass appends nothing.
    const before = readFileSync(dst, 'utf8');
    const r2 = sh('bash', [script, '--merge-local', src, '--into', dst], dir);
    expect(r2.status).toBe(0);
    expect(readFileSync(dst, 'utf8')).toBe(before);
    expect(r2.stdout).toContain('ledger: flush skipped 6 duplicate row(s)');
  });
});

describe('ledger-commit.sh --flush-pending: never re-lands a row main already has by identity', () => {
  it('drops a pending row whose (when, mode, commit) is on main under a new label, and clears the queue', () => {
    const { bare, script } = setup([MAIN_145]);
    const pending = join(dir, 'ledger-pending.jsonl');
    writeFileSync(
      pending,
      JSON.stringify({ ts: 'x', label: 'after-merge: PR #145', row: STALE_145, incident: null }) +
        '\n' +
        JSON.stringify({ ts: 'x', label: 'after-merge: PR #999', row: NEW_ROW, incident: null }) +
        '\n',
    );
    const r = sh('bash', [script, '--flush-pending', '--remote-url', bare], dir, { LEDGER_PENDING_FILE: pending });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const main = mainChangelog(bare);
    expect(count(main, STALE_145)).toBe(0);
    expect(count(main, MAIN_145)).toBe(1);
    expect(count(main, NEW_ROW)).toBe(1); // the flush still lands real rows
    expect(existsSync(pending)).toBe(false);
    expect(r.stdout).toContain('ledger: flush skipped 1 duplicate row(s)');
  });
});

describe('ledger-commit.sh --incident: the name is asserted, not silently copied by basename', () => {
  it('refuses a non-timestamp incident name (exit 64) and lands nothing', () => {
    const { bare, script } = setup([]);
    const inc = join(dir, 'e111-incident.md');
    writeFileSync(inc, '# Incident\n');
    const r = sh('bash', [script, '--row', NEW_ROW, '--incident', inc, '--remote-url', bare], dir, {
      LEDGER_PENDING_FILE: join(dir, 'p.jsonl'),
    });
    expect(r.status).toBe(64);
    expect(count(mainChangelog(bare), NEW_ROW)).toBe(0);
  });

  it('accepts incidents/YYYY-MM-DD-HHMMSS.md and lands it with its row', () => {
    const { bare, script } = setup([]);
    const inc = join(dir, '2026-09-27-064626.md');
    writeFileSync(inc, '# Incident\n');
    const r = sh('bash', [script, '--row', NEW_ROW, '--incident', inc, '--remote-url', bare], dir, {
      LEDGER_PENDING_FILE: join(dir, 'p.jsonl'),
    });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(count(mainChangelog(bare), NEW_ROW)).toBe(1);
    expect(git(dir, `--git-dir=${bare}`, 'ls-tree', '--name-only', 'main', 'reports/funnel/incidents/')).toContain(
      '2026-09-27-064626.md',
    );
  });
});
