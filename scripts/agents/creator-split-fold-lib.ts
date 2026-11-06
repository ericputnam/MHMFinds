/**
 * Pure rules for scripts/agents/creator-split-fold.ts (Nova, E356,
 * 2026-11-06). Offline-testable; no Prisma, no env.
 *
 * The pairs come from MOVED_CREATOR_KEYS in lib/creatorSlug.ts — the same
 * constant the creator page uses to 308 the emptied spelling — so the data
 * half and the redirect half cannot drift.
 */
import { authorSlug, creatorKey } from '../../lib/creatorSlug';

export const MAX_FOLD_ROWS = 5000;

export interface FoldRow {
  id: string;
  author: string;
}

export interface FoldDecision {
  id: string;
  fromKey: string;
  prior: string;
  next: string;
}

export interface FoldTarget {
  fromKey: string;
  toSlug: string;
  /** Most-used live author string whose dash-slug is toSlug; null = refuse this pair. */
  spelling: string | null;
  toKeyMods: number;
  fromKeyMods: number;
}

/**
 * For each moved key, the spelling to write: the most-used author string
 * (ties by string ASC) whose authorSlug is exactly the canonical slug. A
 * target with no such string, or a "move" from the larger key into the
 * smaller, is refused (spelling null) — the map would be stale.
 */
export function foldTargets(moved: Readonly<Record<string, string>>, counts: ReadonlyArray<{ author: string; n: number }>): FoldTarget[] {
  const out: FoldTarget[] = [];
  for (const [fromKey, toSlug] of Object.entries(moved)) {
    const toKey = creatorKey(toSlug);
    let best: { author: string; n: number } | null = null;
    let toKeyMods = 0;
    let fromKeyMods = 0;
    for (const c of counts) {
      const k = creatorKey(c.author);
      if (k === toKey) toKeyMods += c.n;
      if (k === fromKey) fromKeyMods += c.n;
      if (authorSlug(c.author) !== toSlug) continue;
      if (!best || c.n > best.n || (c.n === best.n && c.author < best.author)) best = c;
    }
    const sane = toKey !== fromKey && toKeyMods > fromKeyMods;
    out.push({ fromKey, toSlug, spelling: sane && best ? best.author : null, toKeyMods, fromKeyMods });
  }
  return out;
}

/** Every row whose author key is a moved key with a usable target. */
export function planFold(rows: ReadonlyArray<FoldRow>, targets: ReadonlyArray<FoldTarget>): FoldDecision[] {
  const byKey = new Map(targets.filter((t) => t.spelling).map((t) => [t.fromKey, t.spelling as string]));
  const out: FoldDecision[] = [];
  for (const r of rows) {
    const k = creatorKey(r.author);
    const next = byKey.get(k);
    if (next && next !== r.author) out.push({ id: r.id, fromKey: k, prior: r.author, next });
  }
  return out;
}

/** Apply only rows whose live author still equals the plan's prior. */
export function stillApplicable(plan: ReadonlyArray<FoldDecision>, live: ReadonlyMap<string, string | null>): { apply: FoldDecision[]; drifted: string[] } {
  const apply: FoldDecision[] = [];
  const drifted: string[] = [];
  for (const d of plan) {
    if (live.get(d.id) === d.prior) apply.push(d);
    else drifted.push(d.id);
  }
  return { apply, drifted };
}

/** Roll back only rows that still hold exactly what this plan wrote. */
export function rollbackable(plan: ReadonlyArray<FoldDecision>, live: ReadonlyMap<string, string | null>): FoldDecision[] {
  return plan.filter((d) => live.get(d.id) === d.next);
}

export function parsePlanName(argv: readonly string[]): string | null {
  const arg = argv.find((a) => a.startsWith('--plan='));
  if (!arg) return null;
  const name = arg.slice('--plan='.length);
  return /^creator-split-fold-\d{4}-\d{2}-\d{2}\.json$/.test(name) ? name : '';
}

export const KNOWN_FLAGS: ReadonlySet<string> = new Set(['--apply', '--rollback', '--replace-plan']);

export function unknownFlags(argv: readonly string[]): string[] {
  return argv.filter((a) => a.startsWith('--') && !a.startsWith('--plan=') && !KNOWN_FLAGS.has(a));
}
