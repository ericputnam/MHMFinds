import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard (E420, 2026-11-15): `deploy-verify.sh` run from a per-agent worktree must leave that
 * worktree's tracked files untouched.
 *
 * Until E420, ledger() appended its row to `$ROOT/reports/funnel/changelog.md` (the agent's checkout of
 * main) AND ledger-commit.sh landed the same row on origin/main. The agent's next
 * `git checkout -b funnel/<a>/<slug> origin/main` then refused ("local changes would be overwritten") —
 * three agents hit it on 11-13 and it was carried open in CLAUDE.md since. The primary tree
 * ($FUNNEL_PRIMARY_WT, Quinn's) keeps its same-run mirror; a standalone run (no primary) keeps $ROOT's.
 *
 * The REAL script runs from a throwaway root with stub `vercel` / `sleep` on PATH (the TIMEOUT path:
 * stub Vercel lists no deploys) — nothing reaches GitHub or Vercel. No ledger-commit.sh is copied for
 * the end-to-end cases, so nothing is pushed anywhere.
 */
const SRC = join(process.cwd(), 'scripts/agents/deploy-verify.sh');
const raw = readFileSync(SRC, 'utf8');
const HEADER = '# Production change ledger\n\n| when | mode | who / what | commit | deployment | result | notes |\n|---|---|---|---|---|---|---|\n| 2026-11-14 06:35 | check | morning-check |  | x | PASS | y |\n';
const SHA = 'abcdef1234567890abcdef1234567890abcdef12';

let tmp: string;
let root: string;
let primary: string;
let bin: string;

function stub(name: string, body: string) {
  const p = join(bin, name);
  writeFileSync(p, `#!/bin/sh\n${body}\n`);
  chmodSync(p, 0o755);
}
const rowsOf = (dir: string) => {
  const f = join(dir, 'reports/funnel/changelog.md');
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.startsWith('| 20') && !l.includes('morning-check')) : [];
};

function verify(primaryWt: string | null) {
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'test', PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: tmp };
  if (primaryWt !== null) env.FUNNEL_PRIMARY_WT = primaryWt;
  const r = spawnSync('/bin/bash', [join(root, 'scripts/agents/deploy-verify.sh'), '--after-merge', '--wait-min', '0', '--sha', SHA, '--label', 'Ops: ad-hoc E420'], {
    cwd: root, encoding: 'utf8', env, timeout: 60_000,
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'dv-agent-'));
  primary = join(tmp, 'funnel-wt');
  root = join(tmp, 'funnel-wt-ops');
  bin = join(tmp, 'bin');
  for (const d of [bin, join(root, 'scripts/agents'), join(root, 'reports/funnel'), join(primary, 'reports/funnel')]) mkdirSync(d, { recursive: true });
  copyFileSync(SRC, join(root, 'scripts/agents/deploy-verify.sh'));
  writeFileSync(join(root, 'reports/funnel/changelog.md'), HEADER);
  writeFileSync(join(primary, 'reports/funnel/changelog.md'), HEADER);
  stub('vercel', `echo vercel "$@" >>"${tmp}/vercel.calls"; exit 1`);
  stub('sleep', 'exit 0');
});

afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe('deploy-verify.sh never dirties a per-agent worktree (E420)', () => {
  it('agent tree ≠ primary → agent changelog byte-identical, row mirrored to the primary (fails pre-fix)', () => {
    const r = verify(primary);
    expect(r.out).toMatch(/ledger-commit.sh not found/); // the script really reached ledger() (vacuity guard)
    expect(readFileSync(join(root, 'reports/funnel/changelog.md'), 'utf8')).toBe(HEADER);
    expect(rowsOf(primary)).toHaveLength(1);
    expect(rowsOf(primary)[0]).toMatch(/\| after-merge \| Ops: ad-hoc E420 \| abcdef1 \|/);
  });

  it('primary given as a different spelling of the SAME tree (trailing slash) → still mirrored once', () => {
    verify(`${root}/`);
    expect(rowsOf(root)).toHaveLength(1);
  });

  it('standalone run (no FUNNEL_PRIMARY_WT) → $ROOT keeps its row, as before', () => {
    verify(null);
    expect(rowsOf(root)).toHaveLength(1);
  });

  it('primary path that does not exist → falls back to writing $ROOT (never loses the local mirror)', () => {
    verify(join(tmp, 'nope'));
    expect(rowsOf(root)).toHaveLength(1);
  });
});

describe('ledger(): a landed incident file is removed from the agent worktree only (E420)', () => {
  const fn = (name: string) => raw.match(new RegExp(`^${name}\\(\\) \\{[^\\n]*\\n[\\s\\S]*?\\n\\}\\n`, 'm'))?.[0] ?? '';

  function runLedger(lcExit: number, primaryWt: string) {
    writeFileSync(join(root, 'scripts/agents/ledger-commit.sh'), `#!/bin/sh\necho "$@" >>"${tmp}/lc.calls"\nexit ${lcExit}\n`);
    chmodSync(join(root, 'scripts/agents/ledger-commit.sh'), 0o755);
    const inc = join(root, 'reports/funnel/incidents/2026-11-15-070000.md');
    mkdirSync(join(root, 'reports/funnel/incidents'), { recursive: true });
    writeFileSync(inc, '# Incident\n');
    const script = [
      `ROOT='${root}'; FUNNEL_PRIMARY_WT='${primaryWt}'; INC_DIR='${root}/reports/funnel/incidents'; LOG='${tmp}/dv.log'`,
      `TS='2026-11-15 07:00'; MODE=after-merge; LABEL='Ops: x'; SHA='${SHA}'; DEPLOY_URL=''`,
      `PR_NOTE=''; PR_NUM=''; PR_MC=''; GRADED=''; PLATFORM_RES=''; SUPER_RES=''; LAST_INCIDENT_FILE='${inc}'`,
      `log() { echo "$*" >>"$LOG"; }`,
      fn('pr_mc_note'), fn('ledger'),
      `ledger "ROLLED BACK -> x" "was: y"; echo "LIF=[$LAST_INCIDENT_FILE]"`,
    ].join('\n');
    const r = spawnSync('/bin/bash', ['-c', script], { encoding: 'utf8' });
    return { out: r.stdout + r.stderr, incExists: existsSync(inc), lc: readFileSync(join(tmp, 'lc.calls'), 'utf8') };
  }

  it('extracts the real ledger() (vacuity guard)', () => {
    expect(fn('ledger')).toContain('ledger-commit.sh');
  });

  it('landed (rc 0) in an agent tree → incident passed to ledger-commit, then removed (fails pre-fix)', () => {
    const r = runLedger(0, primary);
    expect(r.lc).toMatch(/--incident .*2026-11-15-070000\.md/);
    expect(r.incExists).toBe(false);
    expect(r.out).toContain('LIF=[]');
  });

  it('not landed (rc 2) → incident kept (it is still the only copy besides the queue)', () => {
    expect(runLedger(2, primary).incExists).toBe(true);
  });

  it('landed but $ROOT IS the primary → incident kept', () => {
    expect(runLedger(0, root).incExists).toBe(true);
  });
});
