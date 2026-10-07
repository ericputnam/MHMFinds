/**
 * Creator-flag audit, pure classification (Nova, E178, 2026-10-07).
 *
 * The 10-04 inbox line read "338 accounts carry the creator flag, 3 have ever
 * submitted" as a supply leak. Before anyone builds a nudge for 335 people,
 * classify who they are. `User.isCreator` is written by exactly three paths:
 *   1. the sign-up form's "I'm a creator" checkbox (app/sign-in/page.tsx ->
 *      app/api/auth/signup/route.ts) — self-declared, unverified;
 *   2. seed scripts (scripts/seed-creators-manual.ts, populateCreators.ts,
 *      app/api/admin/seed-creators) on `musthavemods.generated`;
 *   3. lib/services/privacyAggregator.ts on `external.creator`.
 * (2) and (3) are PLACEHOLDER_ACCOUNT_DOMAINS — no human, never a lead.
 *
 * Every account lands in exactly ONE bucket, first match wins, so the bucket
 * counts partition the population and sum to it (tested).
 *
 * The I/O lives in creator-flag-audit.ts; this module never touches Prisma.
 */
import { isJunkAuthorSlug, isNonCreatorSlug } from '../../lib/creatorSlug';

export interface FlaggedAccount {
  createdAt: Date;
  isAdmin: boolean;
  placeholder: boolean;
  /** Sorted distinct Account.provider values, e.g. ['credentials']. */
  providers: string[];
  hasCreatorProfile: boolean;
  submissions: number;
  favorites: number;
  downloadClicks: number;
  /** authorSlug(username) and authorSlug(displayName) — computed in SQL with the lib/creators.ts expression. */
  usernameSlug: string;
  displayNameSlug: string;
  /** Catalog mods whose author slug equals usernameSlug / displayNameSlug. */
  usernameSlugMods: number;
  displayNameSlugMods: number;
}

export const BUCKETS = [
  'seed-placeholder',
  'admin',
  'submitted',
  'holds-creator-profile',
  'catalog-author-match',
  'creatorish-handle',
  'player-active',
  'dormant',
] as const;
export type Bucket = (typeof BUCKETS)[number];

export const BUCKET_MEANING: Record<Bucket, string> = {
  'seed-placeholder': 'script-minted account on a placeholder domain; no human',
  admin: 'operator account',
  submitted: '>=1 ModSubmission — already counted as onboarded',
  'holds-creator-profile': 'has a CreatorProfile (claim path) but 0 submissions',
  'catalog-author-match': 'username/displayName slug equals a real catalog author slug — a known creator who never submitted',
  'creatorish-handle': 'handle contains cc/sims/mods/creat/design/studio/build — weak signal only',
  'player-active': 'favorited or clicked a download — behaves like a player',
  dormant: 'no favorite, download click, submission or profile',
};

/** Weak "sounds like a creator" handle test. Deliberately loose; never a verdict on its own. */
export const CREATORISH_HANDLE = /(cc|sims?|mods?|creat|design|studio|build)/;

/** A slug counts as a catalog creator only if it is not junk and not a platform. */
export function isCreatorAuthorSlug(slug: string): boolean {
  return slug.length > 0 && !isJunkAuthorSlug(slug) && !isNonCreatorSlug(slug);
}

export function catalogMatchMods(a: FlaggedAccount): number {
  const u = isCreatorAuthorSlug(a.usernameSlug) ? a.usernameSlugMods : 0;
  const d = isCreatorAuthorSlug(a.displayNameSlug) ? a.displayNameSlugMods : 0;
  return Math.max(u, d);
}

export function bucketFor(a: FlaggedAccount): Bucket {
  if (a.placeholder) return 'seed-placeholder';
  if (a.isAdmin) return 'admin';
  if (a.submissions > 0) return 'submitted';
  if (a.hasCreatorProfile) return 'holds-creator-profile';
  if (catalogMatchMods(a) > 0) return 'catalog-author-match';
  if (CREATORISH_HANDLE.test(a.usernameSlug) || CREATORISH_HANDLE.test(a.displayNameSlug)) return 'creatorish-handle';
  if (a.favorites > 0 || a.downloadClicks > 0) return 'player-active';
  return 'dormant';
}

export const AGE_BANDS = ['0-7d', '8-30d', '31-90d', '91-180d', '>180d'] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export function ageBand(createdAt: Date, now: Date): AgeBand {
  const d = Math.floor((now.getTime() - createdAt.getTime()) / 864e5);
  if (d <= 7) return '0-7d';
  if (d <= 30) return '8-30d';
  if (d <= 90) return '31-90d';
  if (d <= 180) return '91-180d';
  return '>180d';
}

export function signupSource(a: FlaggedAccount): string {
  if (a.placeholder) return 'script/aggregator';
  if (a.providers.length === 0) return 'no-login';
  return a.providers.join('+');
}

export interface AuditSummary {
  total: number;
  byBucket: Record<Bucket, number>;
  byAge: Record<AgeBand, number>;
  bySource: Record<string, number>;
  /** Humans = not placeholder, not admin. */
  humans: number;
  humansWithFavorite: number;
  humansWithDownloadClick: number;
}

export function summarize(rows: FlaggedAccount[], now: Date): AuditSummary {
  const byBucket = Object.fromEntries(BUCKETS.map((b) => [b, 0])) as Record<Bucket, number>;
  const byAge = Object.fromEntries(AGE_BANDS.map((b) => [b, 0])) as Record<AgeBand, number>;
  const bySource: Record<string, number> = {};
  let humans = 0;
  let fav = 0;
  let dl = 0;
  for (const r of rows) {
    byBucket[bucketFor(r)]++;
    const s = signupSource(r);
    bySource[s] = (bySource[s] ?? 0) + 1;
    if (r.placeholder || r.isAdmin) continue;
    humans++;
    byAge[ageBand(r.createdAt, now)]++;
    if (r.favorites > 0) fav++;
    if (r.downloadClicks > 0) dl++;
  }
  return { total: rows.length, byBucket, byAge, bySource, humans, humansWithFavorite: fav, humansWithDownloadClick: dl };
}

/** Percent with one decimal, for print only. Never compare on this. */
export function pct(n: number, d: number): string {
  return d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(1)}%`;
}
