import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard (E155, 2026-10-01): `deploy-verify.sh --after-merge --label "...PR #N..."` must not
 * verify — or write a ledger row — under the label of a PR that is not MERGED.
 *
 * 09-30: a `gate; merge; verify` chain (`;`, not `&&`) ran Pip's verify under the #227 label while the
 * graded head was Cass's #226, and the ledger needed a correction row. The REAL script runs here from a
 * throwaway root with stub `gh` / `vercel` / `sleep` on PATH: nothing reaches GitHub or Vercel, and the
 * minimal env never carries FUNNEL_PRIMARY_WT, so no other tree's ledger is touched.
 */
const SRC = join(process.cwd(), 'scripts/agents/deploy-verify.sh');
const raw = readFileSync(SRC, 'utf8');

let root: string;
let bin: string;

function stub(name: string, body: string) {
  const p = join(bin, name);
  writeFileSync(p, `#!/bin/sh\n${body}\n`);
  chmodSync(p, 0o755);
}

function verify(label: string, ghJson: string | null, extra: string[] = []) {
  stub('gh', ghJson === null ? `echo gh >>"${root}/gh.calls"; exit 1` : `echo gh >>"${root}/gh.calls"; echo '${ghJson}'`);
  const r = spawnSync('/bin/bash', [join(root, 'scripts/agents/deploy-verify.sh'), '--after-merge', '--wait-min', '0', '--label', label, ...extra], {
    cwd: root,
    encoding: 'utf8',
    env: { NODE_ENV: 'test', PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: root },
    timeout: 60_000,
  });
  const changelog = join(root, 'reports/funnel/changelog.md');
  return {
    code: r.status,
    out: `${r.stdout}${r.stderr}`,
    rows: existsSync(changelog) ? readFileSync(changelog, 'utf8').split('\n').filter((l) => l.startsWith('| 20')) : [],
    vercelCalled: existsSync(join(root, 'vercel.calls')),
    ghCalled: existsSync(join(root, 'gh.calls')),
  };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dv-pr-'));
  bin = join(root, 'bin');
  mkdirSync(bin);
  mkdirSync(join(root, 'scripts/agents'), { recursive: true });
  copyFileSync(SRC, join(root, 'scripts/agents/deploy-verify.sh'));
  stub('vercel', `echo vercel "$@" >>"${root}/vercel.calls"; exit 1`);
  stub('sleep', 'exit 0');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

const OID = 'abcdef1234567890abcdef1234567890abcdef12';

describe('deploy-verify.sh --after-merge refuses a label whose PR is not MERGED (E155)', () => {
  it('OPEN PR → exit 2, REFUSED, no ledger row, Vercel never touched (fails pre-fix)', () => {
    const r = verify('Pip: PR #227 pin top-up', '{"state":"OPEN","mergeCommit":null}', ['--sha', '6970725']);
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/REFUSED: --label names PR #227 but gh says it is OPEN, not MERGED/);
    expect(r.rows).toHaveLength(0);
    expect(r.vercelCalled).toBe(false);
  });

  it('CLOSED (unmerged) PR is refused the same way', () => {
    const r = verify('Cass: PR #12 x', '{"state":"CLOSED","mergeCommit":null}');
    expect(r.code).toBe(2);
    expect(r.rows).toHaveLength(0);
  });

  it('MERGED PR without --sha verifies its mergeCommit (fails pre-fix: commit column empty)', () => {
    const r = verify('Ops: PR #5 thing', `{"state":"MERGED","mergeCommit":{"oid":"${OID}"}}`);
    expect(r.out).toMatch(/PR #5 MERGED as abcdef1; no --sha given/);
    expect(r.vercelCalled).toBe(true); // it went on to verify
    expect(r.rows).toHaveLength(1); // TIMEOUT row (stub Vercel lists nothing)
    expect(r.rows[0]).toMatch(/\| Ops: PR #5 thing \| abcdef1 \|/);
  });

  it('gh cannot answer → verify still runs (could-not-check is not a refusal) and the row says so', () => {
    const r = verify('Ops: PR #5 thing', null, ['--sha', OID]);
    expect(r.out).toMatch(/WARN: could not read PR #5 state/);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatch(/PR #5 state unverified/);
  });

  it('a label with no "PR #N" never calls gh', () => {
    const r = verify('Quinn: ad-hoc', '{"state":"OPEN"}', ['--sha', OID]);
    expect(r.ghCalled).toBe(false);
    expect(r.out).not.toMatch(/REFUSED/);
  });
});

describe('pr_mc_note: the row records mergeCommit vs graded head when they differ', () => {
  const fn = (name: string) => raw.match(new RegExp(`^${name}\\(\\) \\{[^\\n]*\\n[\\s\\S]*?\\n\\}\\n`, 'm'))?.[0] ?? '';
  const run = (expr: string) =>
    spawnSync('/bin/bash', ['-c', `${fn('label_pr')}\n${fn('pr_mc_note')}\n${expr}`], { encoding: 'utf8' }).stdout;

  it('extracts the real functions (vacuity guard)', () => {
    expect(fn('label_pr')).toContain('PR #');
    expect(fn('pr_mc_note')).toContain('mergeCommit');
  });

  it('differs → "PR #N mergeCommit X ≠ graded head Y"', () => {
    expect(run(`pr_mc_note 226 ${OID} 6970725aaaa`)).toBe('PR #226 mergeCommit abcdef1 ≠ graded head 6970725 · \n');
  });

  it('same commit (either side abbreviated) → no note', () => {
    expect(run(`pr_mc_note 226 ${OID} abcdef1`)).toBe('');
    expect(run(`pr_mc_note 226 abcdef1 ${OID}`)).toBe('');
    expect(run(`pr_mc_note 226 ${OID} ''`)).toBe('');
  });

  it('label_pr takes the first PR number in the label', () => {
    expect(run(`label_pr 'Pip: PR #227 top-up (after PR #226)'`)).toBe('227\n');
    expect(run(`label_pr 'Quinn: no pr here'`)).toBe('');
  });
});
