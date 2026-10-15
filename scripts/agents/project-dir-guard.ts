/**
 * Project-dir write guard (E215, 2026-10-15).
 *
 * Several report writers resolve their output dir as
 *   process.env.MHM_PROJECT_DIR ?? '/Users/eputnam/java_projects/MHMFinds'
 * i.e. the *operator's* main checkout. Every funnel agent runs from its own worktree, so an agent
 * that forgot to export MHM_PROJECT_DIR silently wrote its dated report into the operator's tree:
 * 2 of 7 agents did exactly that with `funnel-scoreboard.ts` on 2026-10-14, and Pip's ranker did
 * it on 2026-10-01. The fix is a refusal, not a new default — a writer that cannot tell where it
 * belongs must not guess.
 *
 * Rule:
 *   - MHM_PROJECT_DIR set (non-empty)  -> honored as written (explicit intent; the runner sets it).
 *   - unset, and cwd's repo root IS the default checkout -> ok (the operator running by hand).
 *   - unset, and cwd's repo root is any other checkout (or no checkout) -> refuse, exit 2.
 *
 * Exit 2 is "could not run", never FAIL (1): nothing was written and nothing about the world was
 * graded. MHM_OPERATOR_TREE overrides the default checkout path (used by the test so it never has
 * to point a guarded script at the real operator tree).
 */

import { existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const PROJECT_DIR_ENV = 'MHM_PROJECT_DIR';
export const OPERATOR_TREE_ENV = 'MHM_OPERATOR_TREE';
export const OPERATOR_TREE_DEFAULT = '/Users/eputnam/java_projects/MHMFinds';
/** could-not-run — see "three exit codes" in CLAUDE.md. */
export const PROJECT_DIR_REFUSED_EXIT = 2;

export type ProjectDirResolution =
  | { ok: true; dir: string; source: 'env' | 'default' }
  | { ok: false; error: string };

/** Nearest ancestor of `start` (inclusive) holding a `.git` entry (dir in a checkout, file in a worktree). */
export function findRepoRoot(start: string): string | null {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function canonical(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

export function resolveProjectDir(opts: {
  env: Record<string, string | undefined>;
  cwd: string;
  script: string;
}): ProjectDirResolution {
  const explicit = opts.env[PROJECT_DIR_ENV]?.trim();
  if (explicit) return { ok: true, dir: resolve(explicit), source: 'env' };

  const defaultDir = opts.env[OPERATOR_TREE_ENV]?.trim() || OPERATOR_TREE_DEFAULT;
  const cwdRoot = findRepoRoot(opts.cwd);
  if (cwdRoot && canonical(cwdRoot) === canonical(defaultDir)) {
    return { ok: true, dir: defaultDir, source: 'default' };
  }
  const where = cwdRoot ? `a different checkout (${cwdRoot})` : `no git checkout (cwd ${opts.cwd})`;
  return {
    ok: false,
    error:
      `${opts.script}: refusing to write — ${PROJECT_DIR_ENV} is unset, so the output dir would default to ` +
      `${defaultDir}, but you are running from ${where}. ` +
      `Set ${PROJECT_DIR_ENV}=<your own worktree> and re-run. Nothing was written (exit ${PROJECT_DIR_REFUSED_EXIT} = could-not-run).`,
  };
}

/** Resolve from the live process; on refusal print to stderr and exit 2 before any read or write. */
export function requireProjectDir(script: string): string {
  const res = resolveProjectDir({ env: process.env, cwd: process.cwd(), script });
  if (!res.ok) {
    console.error(res.error);
    process.exit(PROJECT_DIR_REFUSED_EXIT);
  }
  return res.dir;
}
