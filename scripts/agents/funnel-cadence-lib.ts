/**
 * Funnel cadence — which mornings are AGENT DAYS (Quinn + specialists) and which are OFF DAYS (guard only).
 *
 * Operator 2026-11-07 ("Yes, change it", swarm redesign §6 step 2): Quinn and the specialists run every
 * other day; the guard (morning check, catalog ingest, scoreboard, history, revenue circuit breaker) runs
 * every day. The scheduled task `mhm-funnel-daily` (~/.claude/scheduled-tasks/mhm-funnel-daily/SKILL.md)
 * computes the day type as `(today - 2026-11-07).days % 2` and says "The rule lives in
 * scripts/agents/funnel-cadence-lib.ts (AGENT_DAY_ANCHOR = 2026-11-07, AGENT_DAY_EVERY = 2); change it there
 * and here together." — but until E394 (2026-11-11) this file did not exist, so nothing on main knew the
 * cadence and the run-liveness grader read both off days (11-08, 11-10) as MISSED mornings.
 *
 * Every date before the anchor was a daily-cadence agent day. Pure: no clock, no IO.
 */

export const AGENT_DAY_ANCHOR = '2026-11-07';
export const AGENT_DAY_EVERY = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(iso: string): number {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(t)) throw new Error(`bad date ${iso}`);
  return Math.round(t / DAY_MS);
}

/** true = Quinn and the specialists are scheduled that morning; false = guard-only off day. */
export function isAgentDay(iso: string): boolean {
  const diff = dayNumber(iso) - dayNumber(AGENT_DAY_ANCHOR);
  if (diff < 0) return true;
  return diff % AGENT_DAY_EVERY === 0;
}

export function isOffDay(iso: string): boolean {
  return !isAgentDay(iso);
}
