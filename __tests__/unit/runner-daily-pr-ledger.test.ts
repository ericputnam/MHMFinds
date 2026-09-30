import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard for run-funnel-daily.sh's `# >>> daily-pr-ledger` step (E148, 2026-09-30).
 *
 * Quinn's session often ends before its own after-merge verify runs, so the daily PR's ledger row was
 * written retroactively by hand for #173, #190, #198, #206 and #224. The runner now owns that row: after
 * Quinn exits it finds today's `funnel: daily run YYYY-MM-DD (#N)` commit on origin/main and, when the
 * ledger on origin/main has no after-merge row for it, runs deploy-verify --after-merge with a
 * Quinn-attributed label.
 *
 * This test extracts the REAL block from the runner and runs it under /bin/bash (3.2, the scheduled
 * task's shell) against a throwaway bare "origin" and a clone standing in for Quinn's worktree, with a
 * stub deploy-verify.sh that records its arguments and appends the row the real one would.
 * Invariants: idempotent (never a second row), bounded polling with a line per poll, an explicit
 * DID NOT FIRE line when nothing merged, UNKNOWN (no write) when origin cannot be read, and never a
 * second verify while one is in flight.
 */
const RUNNER = 'scripts/agents/run-funnel-daily.sh';
const BASH = '/bin/bash';
const DAY = '2026-09-30';
const LABEL = `Quinn: PR #300 funnel: daily run ${DAY} (Tier 0 docs)`;
const raw = readFileSync(join(process.cwd(), RUNNER), 'utf8');
const block = raw.match(/^# >>> daily-pr-ledger\n[\s\S]*?^# <<< daily-pr-ledger\n/m)?.[0] ?? '';

const HEADER =
  '# Production change ledger\n\n| when | mode | who / what | commit | deployment | result | notes |\n|---|---|---|---|---|---|---|\n' +
  '| 2026-09-29 07:46 | after-merge | Ops: PR #218 writer-liveness flag inflow-only (E141) | 4e8cbe9 | https://x | PASS | ok |\n';

let base: string;
let origin: string;
let seed: string;
let tree: string;

const gitEnv = {
  PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@example.invalid',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@example.invalid',
  GIT_CONFIG_NOSYSTEM: '1',
};

function gitProcEnv(): NodeJS.ProcessEnv {
  return { ...gitEnv, HOME: base } as unknown as NodeJS.ProcessEnv;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: gitProcEnv() }).trim();
}

/** Land a commit on origin/main (optionally appending ledger rows) and return its full sha. */
function landOnOrigin(subject: string, ledgerRows: string[] = []): string {
  git(seed, 'pull', '-q', '--ff-only', 'origin', 'main');
  const f = join(seed, 'reports/funnel/changelog.md');
  if (ledgerRows.length) writeFileSync(f, readFileSync(f, 'utf8') + ledgerRows.map((r) => `${r}\n`).join(''));
  else writeFileSync(join(seed, 'touch.txt'), `${subject}\n`);
  git(seed, 'add', '-A');
  git(seed, 'commit', '-q', '-m', subject);
  git(seed, 'push', '-q', 'origin', 'HEAD:main');
  return git(seed, 'rev-parse', 'HEAD');
}

function writeExec(path: string, body: string): string {
  writeFileSync(path, body);
  chmodSync(path, 0o755);
  return path;
}

function run(env: Record<string, string> = {}): { out: string; rc: number; dvCalls: string[] } {
  const script = `log() { echo "LOG $*"; }\n${block}\ndaily_pr_ledger "${DAY}" "$TREE"\necho "RC=$?"\n`;
  const r = spawnSync(BASH, ['-uo', 'pipefail', '-c', script], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: {
      ...gitEnv,
      HOME: base,
      TREE: tree,
      LOG_FILE: join(base, 'runner.log'),
      DPL_POLL_S: '1',
      DPL_MAX_WAIT_S: '3',
      DPL_SLEEP: 'true',
      DPL_PGREP: writeExec(join(base, 'pgrep-none'), '#!/bin/sh\nexit 1\n'),
      ...env,
    } as unknown as NodeJS.ProcessEnv,
    timeout: 60_000,
  });
  const out = `${r.stdout}${r.stderr}`;
  const rc = Number(out.match(/RC=(\d+)/)?.[1] ?? -1);
  const argsFile = join(base, 'dv-args');
  const dvCalls = existsSync(argsFile) ? readFileSync(argsFile, 'utf8').split('\n').filter(Boolean) : [];
  return { out, rc, dvCalls };
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'dpl-'));
  origin = join(base, 'origin.git');
  seed = join(base, 'seed');
  tree = join(base, 'quinn-wt');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin], { env: gitProcEnv() });
  execFileSync('git', ['clone', '-q', origin, seed], { env: gitProcEnv(), stdio: 'ignore' });
  git(seed, 'checkout', '-q', '-b', 'main');
  mkdirSync(join(seed, 'reports/funnel'), { recursive: true });
  writeFileSync(join(seed, 'reports/funnel/changelog.md'), HEADER);
  git(seed, 'add', '-A');
  git(seed, 'commit', '-q', '-m', 'init');
  git(seed, 'push', '-q', 'origin', 'HEAD:main');
  landOnOrigin('funnel: daily run 2026-09-29 (#224)'); // yesterday's daily PR — must never count as today's
  execFileSync('git', ['clone', '-q', origin, tree], { env: gitProcEnv(), stdio: 'ignore' });
  mkdirSync(join(tree, 'scripts/agents'), { recursive: true });
  // Stub deploy-verify: records its argv and appends the row the real ledger() would (local tree only).
  writeExec(
    join(tree, 'scripts/agents/deploy-verify.sh'),
    `#!/bin/bash
printf '%s\\n' "$*" >>"${join(base, 'dv-args')}"
SHA=""; LABEL=""
while [ $# -gt 0 ]; do case "$1" in --sha) SHA="$2"; shift ;; --label) LABEL="$2"; shift ;; esac; shift; done
printf '| 2026-09-30 08:00 | after-merge | %s | %s | https://stub | PASS | verified live |\\n' "$LABEL" "\${SHA:0:7}" >>reports/funnel/changelog.md
exit 0
`,
  );
});

afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

describe('run-funnel-daily.sh daily-pr-ledger block (E148)', () => {
  it('exists in the runner (vacuity guard) and is invoked with the node_modules tree after Quinn, before the operator mirror', () => {
    expect(block.length).toBeGreaterThan(500);
    expect(block).toMatch(/^daily_pr_ledger\(\) \{/m);
    const code = raw
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');
    const call = code.search(/^\s*daily_pr_ledger "\$TODAY" "\$WT"/m);
    const quinn = code.search(/log "Quinn finished\."/);
    const mirror = code.search(/python3 - "\$WT\/reports\/funnel\/changelog\.md" "\$PROJECT_DIR\/reports\/funnel\/changelog\.md"/);
    expect(call, 'daily_pr_ledger "$TODAY" "$WT" call').toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(quinn);
    expect(call).toBeLessThan(mirror);
  });

  it('merged with no row: runs deploy-verify once with the full sha and a Quinn label, and logs the row it wrote', () => {
    const sha = landOnOrigin(`funnel: daily run ${DAY} (#300)`);
    landOnOrigin('fix(x): later unrelated merge (#301)'); // HEAD moved on; the daily commit is still found
    const { out, rc, dvCalls } = run();
    expect(rc).toBe(0);
    expect(dvCalls).toEqual([`--after-merge --sha ${sha} --label ${LABEL}`]);
    expect(out).toContain(`LOG daily-pr-ledger: ROW | 2026-09-30 08:00 | after-merge | ${LABEL} | ${sha.slice(0, 7)} |`);
  });

  it('idempotent by commit: a row with the merge sha already on origin/main → no verify', () => {
    const sha = landOnOrigin(`funnel: daily run ${DAY} (#300)`);
    landOnOrigin('funnel(ledger): after-merge: Quinn: PR #300', [
      `| 2026-09-30 07:40 | after-merge | Quinn: PR #300 funnel: daily run ${DAY} | ${sha.slice(0, 7)} | https://x | PASS | ok |`,
    ]);
    const { out, rc, dvCalls } = run();
    expect(rc).toBe(0);
    expect(dvCalls).toEqual([]);
    expect(out).toContain('already has an after-merge row on origin/main');
  });

  it('idempotent by label: a row that graded a later HEAD (different commit) still counts for PR #N', () => {
    landOnOrigin(`funnel: daily run ${DAY} (#300)`);
    landOnOrigin('funnel(ledger): after-merge: Quinn: PR #300', [
      `| 2026-09-30 07:40 | after-merge | Quinn: PR #300 funnel: daily run ${DAY} (Tier 0 docs) | abc1234 | https://x | PASS | main moved past caller |`,
    ]);
    const { out, rc, dvCalls } = run();
    expect(rc).toBe(0);
    expect(dvCalls).toEqual([]);
    expect(out).toContain('LOG daily-pr-ledger: PR #300 (');
  });

  it('does not confuse PR #3000 or a non-after-merge row with PR #300', () => {
    const sha = landOnOrigin(`funnel: daily run ${DAY} (#300)`);
    landOnOrigin('funnel(ledger): unrelated', [
      `| 2026-09-30 07:40 | after-merge | Quinn: PR #3000 funnel: daily run ${DAY} | fffffff | https://x | PASS | ok |`,
      `| 2026-09-30 07:41 | check | morning-check PR #300 daily run | ${sha.slice(0, 7)}x | https://x | PASS | ok |`,
    ]);
    expect(run().dvCalls.length).toBe(1);
  });

  it('not merged: polls within the bound, one log line per poll, then an explicit DID NOT FIRE line and no verify', () => {
    const { out, rc, dvCalls } = run({ DPL_MAX_WAIT_S: '3' });
    expect(rc).toBe(2);
    expect(dvCalls).toEqual([]);
    expect(out.match(/LOG daily-pr-ledger: poll \d+ — /g)?.length).toBe(3);
    expect(out).toContain(`LOG daily-pr-ledger: DID NOT FIRE — 'funnel: daily run ${DAY}' not merged to origin/main yet after 3s / 3 poll(s)`);
  });

  it('merged mid-poll: picks it up on a later poll and writes the row', () => {
    const merger = writeExec(
      join(base, 'merge-on-sleep'),
      `#!/bin/bash
[ -f "${join(base, 'merged')}" ] && exit 0
touch "${join(base, 'merged')}"
cd "${seed}" && git pull -q --ff-only origin main && echo x >>touch.txt && git commit -qam "funnel: daily run ${DAY} (#300)" && git push -q origin HEAD:main
`,
    );
    const { out, rc, dvCalls } = run({ DPL_SLEEP: merger, DPL_MAX_WAIT_S: '5' });
    expect(rc).toBe(0);
    expect(out).toContain('LOG daily-pr-ledger: poll 1 — ');
    expect(dvCalls.length).toBe(1);
    expect(out).toContain('LOG daily-pr-ledger: ROW ');
  });

  it('origin unreadable: UNKNOWN, never a verify', () => {
    landOnOrigin(`funnel: daily run ${DAY} (#300)`);
    git(tree, 'remote', 'set-url', 'origin', join(base, 'does-not-exist.git'));
    const { out, rc, dvCalls } = run({ DPL_MAX_WAIT_S: '1' });
    expect(rc).toBe(2);
    expect(dvCalls).toEqual([]);
    expect(out).toMatch(/DID NOT FIRE — .*UNKNOWN \(git fetch origin main failed/);
  });

  it('never starts a second verify while a deploy-verify --after-merge is still running', () => {
    landOnOrigin(`funnel: daily run ${DAY} (#300)`);
    const busy = writeExec(join(base, 'pgrep-busy'), '#!/bin/sh\nexit 0\n');
    const { out, rc, dvCalls } = run({ DPL_PGREP: busy, DPL_MAX_WAIT_S: '2' });
    expect(rc).toBe(2);
    expect(dvCalls).toEqual([]);
    expect(out).toContain('a deploy-verify --after-merge is still running (not starting a second)');
  });
});
