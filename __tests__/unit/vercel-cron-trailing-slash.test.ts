/**
 * `trailingSlash: true` (next.config.js) makes `/api/cron/x` answer 308 → `/api/cron/x/`,
 * and Vercel cron does not follow redirects — a slash-less cron path is a job that never
 * runs, with no error anywhere. It has happened twice: commission-sync (fixed in #523) and
 * mod-upload-cleanup (added slash-less in #533, eleven days after #523).
 *
 * This walks every cron in vercel.json. Red pre-fix: the mod-upload-cleanup case.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as {
  crons?: { path: string; schedule: string }[];
};
const crons = config.crons ?? [];

/**
 * Crons that are slash-less ON PURPOSE, i.e. deliberately kept from running. Each needs a
 * reason. Fixing one means deleting its entry here in the same PR — the last case below
 * fails if an entry is left behind for a path that now has its slash.
 */
const DELIBERATELY_DORMANT: Record<string, string> = {
  '/api/cron/monetization-agent':
    'Tier 2: its daily `full` job runs auto_execute, which writes affiliate links, meta descriptions ' +
    'and collection membership to production. Enabling it needs an explicit operator decision (#523).',
};

describe('vercel.json cron paths', () => {
  it('vacuity guard: the file parsed and lists the crons', () => {
    expect(crons.length).toBeGreaterThanOrEqual(3);
    expect(next().trailingSlash).toBe(true);
  });

  it('every cron path ends in a trailing slash, or is listed as deliberately dormant', () => {
    const offenders = crons
      .map((c) => c.path)
      .filter((p) => !p.endsWith('/') && !(p in DELIBERATELY_DORMANT));
    expect(offenders).toEqual([]);
  });

  it('every cron path points at a route file that exists', () => {
    for (const { path } of crons) {
      const route = join(ROOT, 'app', path.replace(/^\/|\/$/g, ''), 'route.ts');
      expect(existsSync(route), path).toBe(true);
    }
  });

  it('the dormant list holds only crons that are still in vercel.json and still slash-less', () => {
    const paths = new Set(crons.map((c) => c.path));
    for (const dormant of Object.keys(DELIBERATELY_DORMANT)) {
      expect(paths.has(dormant), `${dormant} is no longer a slash-less cron — remove it from DELIBERATELY_DORMANT`).toBe(true);
    }
  });
});

function next(): { trailingSlash?: boolean } {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../next.config.js');
}
