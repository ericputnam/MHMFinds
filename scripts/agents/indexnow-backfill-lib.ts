/**
 * indexnow-backfill-lib.ts — pure helpers for the E411 IndexNow mod-page
 * backfill with a randomized holdout (Sage, 2026-11-15). No I/O here;
 * `scripts/agents/indexnow-mod-backfill.ts` is the CLI and
 * `__tests__/unit/indexnow-backfill.test.ts` covers this file.
 *
 * Why a holdout and not just "push everything":
 *
 * The daily IndexNow push (E47, first run 2026-09-14, `--days 7`, later
 * `--days 2`) only ever sent mods created inside its window. Every mod created
 * before 2026-09-07 — 16,000+ of the 17,371 /sitemap-mods.xml URLs — has never
 * been submitted. GA4 2026-10-17→11-13: Bing lands on 5.2% of pre-July mod
 * pages vs Google's 15.3%, at ~5.1 Bing sessions per landing page, so Bing
 * coverage of the mod class *looks* like a lever worth thousands of sessions.
 *
 * But the cohorts IndexNow *did* push earn less on Bing, not more
 * (09-14→10-15: 5.1% of pages; 10-16→11-13: 2.1%), and those cohorts are also
 * younger, so the comparison cannot separate "IndexNow does nothing" from
 * "young pages have not been found yet". A deterministic 50/50 split by id
 * hash is the cheapest way to get a causal answer: treatment and control share
 * age, type and history, so a Bing-landing difference after the push is the
 * push. If treatment does not beat control, the full-catalog push is never
 * proposed again.
 *
 * Arms are a pure function of the mod id, so the grader recomputes them from
 * the database on the read date — no id list is committed.
 */

import { createHash } from 'node:crypto';

/** Salt for the arm hash. Changing it re-randomizes every mod — never do that mid-experiment. */
export const E411_SALT = 'E411';

/**
 * Mods created on or after this instant may have been inside a daily push
 * window (first run 2026-09-14 with `--days 7`), so they are excluded from
 * both arms. Everything strictly before it has never been submitted.
 */
export const BACKFILL_CUTOFF = new Date('2026-09-07T00:00:00Z');

/** IndexNow accepts at most 10,000 URLs per POST (indexnow.org/documentation). */
export const INDEXNOW_MAX_URLS_PER_POST = 10_000;

export type Arm = 'treatment' | 'control';

/** Deterministic 50/50 arm from sha256(`E411:<id>`): even first byte → treatment. */
export function backfillArm(id: string, salt: string = E411_SALT): Arm {
  const first = createHash('sha256').update(`${salt}:${id}`).digest()[0];
  return (first & 1) === 0 ? 'treatment' : 'control';
}

export interface BackfillRow {
  id: string;
  createdAt: Date;
}

export interface BackfillSplit {
  /** Treatment ids, sorted, truncated to `max`. */
  treatment: string[];
  /** Control ids, sorted (never sent). */
  control: string[];
  /** Rows dropped because createdAt ≥ cutoff (possibly pushed already). */
  excludedRecent: number;
  /** True when the treatment list was cut at `max`. */
  capped: boolean;
}

/**
 * Split the sitemap population into arms. Only rows strictly older than
 * `cutoff` enter either arm; ids are sorted so the POST body and any re-run
 * are byte-identical for the same population.
 */
export function splitBackfill(
  rows: readonly BackfillRow[],
  opts: { cutoff?: Date; max?: number; salt?: string } = {},
): BackfillSplit {
  const cutoff = opts.cutoff ?? BACKFILL_CUTOFF;
  const max = Math.max(0, Math.min(opts.max ?? INDEXNOW_MAX_URLS_PER_POST, INDEXNOW_MAX_URLS_PER_POST));
  const treatment: string[] = [];
  const control: string[] = [];
  let excludedRecent = 0;
  const seen = new Set<string>();
  for (const r of rows) {
    const id = String(r.id ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (!(r.createdAt instanceof Date) || Number.isNaN(r.createdAt.getTime()) || r.createdAt >= cutoff) {
      excludedRecent += 1;
      continue;
    }
    (backfillArm(id, opts.salt) === 'treatment' ? treatment : control).push(id);
  }
  treatment.sort();
  control.sort();
  const capped = treatment.length > max;
  return { treatment: capped ? treatment.slice(0, max) : treatment, control, excludedRecent, capped };
}

export interface ArmLandings {
  mods: number;
  /** Bing-organic landing sessions on the arm's /mods/<id>/ pages. */
  bingSessions: number;
  /** Distinct arm pages with ≥1 Bing-organic landing. */
  bingPages: number;
  /** Google-organic sessions, the placebo: IndexNow does not feed Google. */
  googleSessions: number;
}

/** `/mods/<id>/` or `/mods/<id>` → id; anything else → null. */
export function modIdFromLandingPage(path: string): string | null {
  const m = /^\/mods\/([a-z0-9]+)\/?$/i.exec(String(path ?? '').split('?')[0]);
  return m ? m[1] : null;
}

/**
 * Aggregate GA4 rows (landingPage, sessionSource, sessionMedium, sessions)
 * into per-arm totals. Only ids in `arms` count, so mods created after the
 * cutoff or flagged NSFW since never leak into the comparison.
 */
export function aggregateArmLandings(
  rows: ReadonlyArray<{ landingPage: string; source: string; medium: string; sessions: number }>,
  arms: { treatment: readonly string[]; control: readonly string[] },
): Record<Arm, ArmLandings> {
  const armOf = new Map<string, Arm>();
  for (const id of arms.treatment) armOf.set(id, 'treatment');
  for (const id of arms.control) armOf.set(id, 'control');
  const out: Record<Arm, ArmLandings> = {
    treatment: { mods: arms.treatment.length, bingSessions: 0, bingPages: 0, googleSessions: 0 },
    control: { mods: arms.control.length, bingSessions: 0, bingPages: 0, googleSessions: 0 },
  };
  const bingPages: Record<Arm, Set<string>> = { treatment: new Set(), control: new Set() };
  for (const r of rows) {
    const id = modIdFromLandingPage(r.landingPage);
    if (!id) continue;
    const arm = armOf.get(id);
    if (!arm) continue;
    const src = r.source.toLowerCase();
    if (r.medium.toLowerCase() !== 'organic') continue;
    const n = Number(r.sessions) || 0;
    if (src === 'bing') {
      out[arm].bingSessions += n;
      if (n > 0) bingPages[arm].add(id);
    } else if (src === 'google') {
      out[arm].googleSessions += n;
    }
  }
  out.treatment.bingPages = bingPages.treatment.size;
  out.control.bingPages = bingPages.control.size;
  return out;
}

/**
 * The pre-registered E411 rule (printed before the first read, never after).
 * Difference-in-differences on Bing sessions per mod: treatment's post/pre
 * ratio must beat control's by ≥10% relative AND the absolute
 * difference-in-differences must be ≥0.02 Bing sessions/mod (equal-length pre
 * and post windows; ≈160 sessions/14d on ~8,000 treated pages); anything else
 * is KILL (the push does not move Bing).
 */
export function gradeE411(
  pre: Record<Arm, ArmLandings>,
  post: Record<Arm, ArmLandings>,
): { verdict: 'KEEP' | 'KILL' | 'INCONCLUSIVE'; reason: string } {
  const rate = (a: ArmLandings) => (a.mods > 0 ? a.bingSessions / a.mods : 0);
  if (pre.treatment.mods === 0 || pre.control.mods === 0 || rate(pre.treatment) === 0 || rate(pre.control) === 0) {
    return { verdict: 'INCONCLUSIVE', reason: 'empty arm or zero baseline' };
  }
  const liftT = rate(post.treatment) / rate(pre.treatment);
  const liftC = rate(post.control) / rate(pre.control);
  const rel = liftT / liftC - 1;
  const abs = rate(post.treatment) - rate(pre.treatment) - (rate(post.control) - rate(pre.control));
  const reason = `lift T ${liftT.toFixed(3)} vs C ${liftC.toFixed(3)} (rel ${(rel * 100).toFixed(1)}%), DiD ${abs.toFixed(3)} sess/mod`;
  return rel >= 0.1 && abs >= 0.02 ? { verdict: 'KEEP', reason } : { verdict: 'KILL', reason };
}
