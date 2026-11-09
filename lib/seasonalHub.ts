/**
 * The collection hub that leads the homepage hero strip while its season is
 * on (Sage, E378, 2026-11-09).
 *
 * Why: holiday search demand is sharply seasonal, and the homepage is the
 * best-linked page on the site. In last year's run-up, organic landings on
 * Christmas paths went from 322 (2025-10-26 → 11-08) to 522 (11-09 → 11-22)
 * to 2,101 (11-23 → 12-24). In 2026-10-26 → 11-08 the Christmas hub got 17
 * search+AI landings against 210 on the legacy Christmas articles, and the
 * homepage did not link it at all (it sat in the "Show all" overflow).
 *
 * Windows are inclusive [month, day] pairs in UTC. app/page.tsx is
 * force-dynamic, so the pill changes on the first request of the window.
 * Every slug must exist in SIMS4_COLLECTIONS (home-seasonal-hub.test.ts).
 */
export interface SeasonalWindow {
  slug: string;
  from: [month: number, day: number];
  to: [month: number, day: number];
}

export const SEASONAL_HUBS: SeasonalWindow[] = [
  { slug: 'halloween-cc', from: [10, 1], to: [10, 31] },
  { slug: 'christmas-cc', from: [11, 1], to: [12, 31] },
];

/** The in-season hub slug for `now`, or null outside every window. */
export function seasonalHubSlug(now: Date = new Date()): string | null {
  const key = (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  for (const w of SEASONAL_HUBS) {
    const from = w.from[0] * 100 + w.from[1];
    const to = w.to[0] * 100 + w.to[1];
    if (key >= from && key <= to) return w.slug;
  }
  return null;
}
