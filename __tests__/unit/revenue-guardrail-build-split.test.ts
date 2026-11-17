import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as lib from '../../scripts/agents/revenue-guardrail-lib';

/**
 * E427 (Ops, 2026-11-17): the guardrail prints how many in-window production deploys are build-relevant
 * and how many are paper-only. On 11-17 the 63 in-window deploys were 18 build + 45 paper, and the bound
 * (24) has been exceeded on every guardrail file since 10-13.
 *
 * The split is INFORMATIONAL. Arming the auto-rollback on it would be a change to the guardrail bound,
 * which is Tier 2. Section 3 below fails if decideAction ever starts reading it.
 */
const ROOT = process.cwd();
const DV = readFileSync(join(ROOT, 'scripts/agents/deploy-verify.sh'), 'utf8');

function bashIsPaper(paths: string[]): boolean[] {
  const m = DV.match(/^is_paper_path\(\) \{[\s\S]*?^\}$/m);
  expect(m, 'is_paper_path() not found in deploy-verify.sh').not.toBeNull();
  const script = `${m![0]}\nfor p in "$@"; do if is_paper_path "$p"; then echo 1; else echo 0; fi; done\n`;
  const r = spawnSync('bash', ['-c', script, 'x', ...paths], { encoding: 'utf8' });
  expect(r.status).toBe(0);
  return r.stdout.trim().split('\n').map((s) => s === '1');
}

const CORPUS = [
  '', 'CLAUDE.md', 'README.md', 'package.json', 'package-lock.json', 'next.config.js', 'vercel.json', 'tsconfig.json', '.gitignore',
  'reports/funnel/changelog.md', 'reports/funnel/2026-11-17.json', 'reports/funnel/history.json', 'reports/funnel/newsletter-sends.jsonl',
  'reports/funnel/incidents/x.md', 'reports/funnel/x.ts', 'docs/COMPOUND_LEARNINGS.md', 'docs/a/b.png', 'logs/funnel-daily.log',
  '.claude/agents/mhm-funnel/experiments.md', '.claude/agents/x.ts', '.claude/agents/x.mjs',
  'app/page.tsx', 'lib/prisma.ts', 'components/A.jsx', 'public/robots.txt', 'prisma/schema.prisma', 'scripts/agents/deploy-verify.sh',
  'scripts/agents/foo.ts', 'staging/wordpress/kadence-child-prod/functions.php', 'middleware.ts', 'x.cjs', 'notes.txt', 'unknown/dir/file.md',
];

describe('E427 1 — isPaperPath is the twin of deploy-verify.sh is_paper_path (parity on the real bash)', () => {
  it('agrees on every corpus path', () => {
    const bash = bashIsPaper(CORPUS);
    expect(bash.length).toBe(CORPUS.length);
    const diffs = CORPUS.filter((p, i) => lib.isPaperPath(p) !== bash[i]);
    expect(diffs).toEqual([]);
  });

  it('vacuity guard: the corpus holds both classes', () => {
    const bash = bashIsPaper(CORPUS);
    expect(bash.filter(Boolean).length).toBeGreaterThanOrEqual(8);
    expect(bash.filter((b) => !b).length).toBeGreaterThanOrEqual(15);
  });
});

const dep = (sha: string | undefined, ms = 1): lib.VercelDeployment => ({
  url: `u-${sha ?? 'none'}-${ms}.vercel.app`, createdAt: ms, state: 'READY', target: 'production', meta: sha ? { githubCommitSha: sha } : {},
});

describe('E427 2 — splitInWindowByBuild', () => {
  const files: Record<string, string[] | null> = {
    aaaaaaa: ['reports/funnel/changelog.md'],
    bbbbbbb: ['reports/funnel/2026-11-17.md', 'reports/funnel/history.json'],
    ccccccc: ['.claude/agents/mhm-funnel/experiments.md', 'CLAUDE.md'],
    ddddddd: ['app/page.tsx'],
    eeeeeee: null,
    fffffff: [],
  };
  const filesOf = (s: string) => files[s] ?? null;

  it('counts paper, build and unclassified; unclassified counts as build (fail closed)', () => {
    const s = lib.splitInWindowByBuild(
      ['aaaaaaa', 'bbbbbbb', 'ccccccc', 'ddddddd', 'eeeeeee', 'fffffff', undefined].map((x, i) => dep(x, i)),
      filesOf,
    );
    expect(s).toEqual({ build: 2, paper: 2, unclassified: 3, buildRelevant: 5, total: 7 });
  });

  it('history.json makes a commit build-relevant (the build traces it)', () => {
    expect(lib.splitInWindowByBuild([dep('bbbbbbb')], filesOf).build).toBe(1);
  });

  it('the line shows the count, the bound, and never says "eligible"', () => {
    const s = { build: 18, paper: 45, unclassified: 0, buildRelevant: 18, total: 63 };
    const line = lib.buildSplitLine(s);
    expect(line).toBe(`rollback bound split (E427, informational — the bound reads all 63): build-relevant 18 ≤ ${lib.ROLLBACK_BOUNDS.maxInWindowDeploys} · paper-only 45`);
    expect(line).not.toMatch(/eligible/);
    expect(lib.buildSplitLine({ ...s, unclassified: 2, buildRelevant: 30 })).toMatch(/build-relevant 30 > 24 · paper-only 45, 2 unclassified counted as build$/);
    expect(lib.buildSplitLine(null)).toMatch(/unavailable$/);
  });
});

describe('E427 3 — the split never arms the breaker (changing that is Tier 2)', () => {
  it('63 in window with only 18 build-relevant is still withheld', () => {
    const facts: lib.RollbackFacts = { inWindowCount: 63, rollbackTargetMs: 0, windowStartMs: 3_600_000 };
    const d = lib.decideAction('red-rpm', 'yes', 'https://t.vercel.app', facts);
    expect(d.action).toBe('investigate');
    expect(d.detail).toMatch(/in-window deploys 63 exceed rollback bound 24/);
  });

  it('the bound constant is unchanged by this PR', () => {
    expect(lib.ROLLBACK_BOUNDS.maxInWindowDeploys).toBe(24);
  });

  it('revenue-guardrail.ts hands decideAction the classifyWindow facts, never the split', () => {
    const src = readFileSync(join(ROOT, 'scripts/agents/revenue-guardrail.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/decideAction\(status, inWindow, rollbackTo, facts\)/);
    const call = src.match(/decideAction\([^)]*\)/g) ?? [];
    expect(call.length).toBe(1);
    expect(call[0]).not.toMatch(/split/);
    expect(src).toMatch(/splitInWindowByBuild\(inWindowDeps,/);
    expect(src).toMatch(/buildSplitLine\(split\)/);
  });
});
