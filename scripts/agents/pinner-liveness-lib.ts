/**
 * Pinner liveness — pure helpers shared by funnel-scoreboard.ts (and mirrored
 * in check-pinner.sh's inline python). No network, no filesystem, no secrets.
 *
 * Why this exists (E41, 2026-09-13): the queue table `n8n_pinterest_posts` has
 * no posted-at column. "Last posted" was computed as max(`Post Date`) over
 * `Is Posted = true` rows — but `Post Date` is the *scheduled* date the writer
 * assigned when the row was created, and the poster drains oldest-first inside
 * a 14-day window. On 2026-09-13 the poster had posted 47 pins in the previous
 * 24 h (Pinterest `created_at` 2026-09-13T10:40:04 six minutes before the
 * check) while every one of those rows carried `Post Date = 2026-09-11`, so the
 * scoreboard led the digest with a 🔴 "stalled 2d ago" over a healthy pipeline.
 *
 * The truthful signal is Pinterest's own `created_at` on the account's newest
 * pins (`GET /v5/pins`, newest first). `Post Date` is kept only as a labelled
 * proxy for the day the API cannot be reached, and a proxy alone can never be
 * a 🔴 — it produced the false positive this file replaces.
 */

export interface PinLike {
  id?: string;
  created_at?: string | null;
  link?: string | null;
}

export interface PinSummary {
  /** ISO-8601 UTC of the newest pin, or null when no pin was seen. */
  lastCreatedAt: string | null;
  /** Pins whose created_at is within the last 24 h of `now`. */
  created24h: number;
  /** Pins whose created_at is within the last 7 d of `now` (bounded by `sampled`). */
  created7d: number;
  /** How many pins were inspected — the 7 d count is a floor when this equals the page cap. */
  sampled: number;
}

export type LivenessLevel = 'ok' | 'red' | 'unverified';
export type LivenessSource = 'pinterest' | 'post-date-proxy' | 'none';

export interface LivenessAssessment {
  level: LivenessLevel;
  source: LivenessSource;
  /** Hours since the last pin (Pinterest) or since the proxy date (proxy); null when nothing is known. */
  hoursSince: number | null;
  message: string;
}

/**
 * Pinterest returns `created_at` as `2026-09-13T10:40:04` — UTC with no zone
 * designator. `Date.parse` would read that as *local* time, which on a CDT
 * runner shifts every pin 5 h into the future. Append `Z` unless a zone is
 * already present. Returns null for anything unparseable.
 */
export function parsePinterestTimestamp(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(s);
  const d = new Date(hasZone ? s : `${s}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function summarizePins(pins: readonly PinLike[], now: Date = new Date()): PinSummary {
  let last: Date | null = null;
  let created24h = 0;
  let created7d = 0;
  const t = now.getTime();
  for (const pin of pins) {
    const d = parsePinterestTimestamp(pin.created_at);
    if (!d) continue;
    if (!last || d.getTime() > last.getTime()) last = d;
    const age = t - d.getTime();
    if (age < 0) continue; // clock skew: never count a future pin as recent
    if (age <= 24 * 3600e3) created24h += 1;
    if (age <= 7 * 24 * 3600e3) created7d += 1;
  }
  return { lastCreatedAt: last ? last.toISOString() : null, created24h, created7d, sampled: pins.length };
}

export const DEFAULT_RED_AFTER_HOURS = 36;

/**
 * Decide the staleness flag.
 *
 * - Pinterest `created_at` available → `ok` or `red` (> `redAfterHours`).
 * - Only the Post Date proxy available → `unverified` with the proxy stated
 *   plainly. Never `red`: the proxy reads "stale" whenever the poster is
 *   draining a batch that was scheduled days ago, which is its normal state.
 * - Nothing available → `unverified`.
 *
 * The poster runs every 20 min and the queue is deliberately metered at
 * ~10–30 pins/day, so 36 h with nothing created is a stall, not a lull. A
 * legitimately empty queue is reported separately by the schedulable count.
 */
export function assessLiveness(input: {
  lastCreatedAt: string | null;
  lastPostDateProxy: string | null;
  now?: Date;
  redAfterHours?: number;
}): LivenessAssessment {
  const now = input.now ?? new Date();
  const redAfter = input.redAfterHours ?? DEFAULT_RED_AFTER_HOURS;
  const last = parsePinterestTimestamp(input.lastCreatedAt);
  if (last) {
    const hours = Math.max(0, (now.getTime() - last.getTime()) / 3600e3);
    const rounded = Math.round(hours * 10) / 10;
    if (hours > redAfter) {
      return {
        level: 'red',
        source: 'pinterest',
        hoursSince: rounded,
        message: `last pin created ${last.toISOString().slice(0, 16).replace('T', ' ')}Z (${rounded} h ago, Pinterest API) — the Pinterest pipeline is stalled`,
      };
    }
    return {
      level: 'ok',
      source: 'pinterest',
      hoursSince: rounded,
      message: `last pin created ${last.toISOString().slice(0, 16).replace('T', ' ')}Z (${rounded} h ago, Pinterest API)`,
    };
  }
  if (input.lastPostDateProxy) {
    const proxy = new Date(`${input.lastPostDateProxy.slice(0, 10)}T00:00:00Z`);
    const hours = Number.isNaN(proxy.getTime()) ? null : Math.max(0, (now.getTime() - proxy.getTime()) / 3600e3);
    return {
      level: 'unverified',
      source: 'post-date-proxy',
      hoursSince: hours == null ? null : Math.round(hours * 10) / 10,
      message: `liveness unverified — Pinterest API unavailable; newest posted row is dated ${input.lastPostDateProxy.slice(0, 10)} (scheduled date, not a posting timestamp)`,
    };
  }
  return { level: 'unverified', source: 'none', hoursSince: null, message: 'liveness unverified — neither the Pinterest API nor the queue answered' };
}

/** Exit code for check-pinner.sh step 1 (house 0/2/1 discipline). */
export function livenessExitCode(level: LivenessLevel): 0 | 1 | 2 {
  if (level === 'red') return 1;
  if (level === 'unverified') return 2;
  return 0;
}
