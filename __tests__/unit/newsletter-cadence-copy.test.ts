/**
 * Newsletter cadence copy guard (E314, Cass, 2026-11-01).
 *
 * E184 was graded KILL weekly → biweekly on 2026-10-29, so the finds email now goes
 * out every two weeks. On 2026-11-01, 20 user-facing strings in 9 files still
 * promised a weekly email: the homepage box, the hero kicker above it, the
 * collection, creator-index and creator-page boxes, the one-click
 * confirm/unsubscribe pages, the issue sign-off and the /go connect opt-in.
 * E305 (#414) fixed the connect opt-in in its own PR and left the rest.
 *
 * This guard finds the capture surfaces by scanning the tree. It does not use a
 * hand-kept list, so a new email box is covered from its first commit. It strips
 * comments before matching, because comments here quote the old copy on purpose.
 * The vacuity guard makes sure it cannot pass by finding nothing.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['app', 'components', 'lib'];

/** A file that renders or serves an email ask contains one of these. */
const CAPTURE_MARKERS = [/\/api\/subscribe/, /\bNewsletterSignup\b/, /\bEmailOptIn\b/, /\bHomeCapture\b/];

/** Email templates that state the cadence but have no form. */
const EMAIL_COPY_FILES = ['lib/services/newsletterWeekly.ts', 'lib/services/newsletterIssue.ts'];

/**
 * Exemptions. Each one says why it is exempt.
 * - ConnectEmailOptIn.tsx: its copy is the control arm of E305 (#414, held by
 *   Quinn under the operator's Tier 1 rule). #414 changes it to "every two weeks"
 *   and adds its own no-weekly assertion. Remove this entry once #414 merges.
 */
const PENDING_FILES = new Set(['components/ConnectEmailOptIn.tsx']);

/** Phrases that promise a weekly cadence to a reader. Identifiers like
 *  `weekly-issue-07` or `NEWSLETTER_WEEKLY_ENABLED` do not match. */
const WEEKLY_PROMISE = [
  /\bweekly\s+(?:finds|email|newsletter|sims|roundup|digest)\b/i,
  /\bemail me weekly\b/i,
  /\b(?:once|every|each|per)\s+(?:a\s+)?week\b/i,
  /\bemail a week\b/i,
  /\b(?:lands|arrives?)\s+in\s+a\s+week\b/i,
  /\bweek(?:&apos;|'|’)s best\b/i,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|html)$/.test(name)) out.push(relative(ROOT, p));
  }
  return out;
}

/** Remove block comments (including JSX `{/* … *\/}`) and line comments. A `//` that
 *  follows `:` is a URL scheme, not a comment. */
function stripComments(src: string): string {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
}

/** ISSUE_01 is the record of the issue sent on 2026-09-14, when the cadence was
 *  weekly. It is history, not a promise. Drop it before scanning. */
function stripHistoricalIssues(src: string): string {
  return src.replace(/export const ISSUE_01: IssueData = \{[\s\S]*?\n\};\n/, '');
}

function captureSurfaces(): string[] {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
  const found = files.filter((f) => {
    const src = readFileSync(join(ROOT, f), 'utf8');
    return CAPTURE_MARKERS.some((re) => re.test(src));
  });
  return Array.from(new Set([...found, ...EMAIL_COPY_FILES])).sort();
}

function weeklyHits(file: string): string[] {
  const src = stripHistoricalIssues(stripComments(readFileSync(join(ROOT, file), 'utf8')));
  const hits: string[] = [];
  src.split('\n').forEach((line, i) => {
    if (WEEKLY_PROMISE.some((re) => re.test(line))) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
  });
  return hits;
}

describe('newsletter cadence copy says every two weeks, never weekly (E314)', () => {
  const surfaces = captureSurfaces();

  it('finds the capture surfaces (vacuity guard)', () => {
    // 16 on 2026-11-01. A drop below 12 means the markers stopped matching.
    expect(surfaces.length).toBeGreaterThanOrEqual(12);
    for (const must of [
      'components/HomeCapture.tsx',
      'components/NewsletterSignup.tsx',
      'app/games/[game]/[topic]/CollectionPageClient.tsx',
      'app/creator/[slug]/CreatorPageClient.tsx',
      'app/api/subscribe/confirm/route.ts',
      'app/api/unsubscribe/route.ts',
      'lib/services/newsletterWeekly.ts',
    ]) {
      expect(surfaces).toContain(must);
    }
  });

  it('no capture surface or email template promises a weekly email', () => {
    const hits = surfaces.filter((f) => !PENDING_FILES.has(f)).flatMap(weeklyHits);
    expect(hits).toEqual([]);
  });

  it('the matcher catches the old copy and ignores identifiers and comments', () => {
    const old = [
      'One email a week, or ',
      'New mods from these creators, every week',
      'Yes, send me the weekly email',
      "That's it. Next one lands in a week.",
      'Get the week&apos;s best finds',
      'Weekly finds',
      'Email me weekly',
    ];
    for (const s of old) expect(WEEKLY_PROMISE.some((re) => re.test(s))).toBe(true);
    for (const s of ["const c = 'weekly-issue-07';", 'NEWSLETTER_WEEKLY_ENABLED', 'One email every two weeks']) {
      expect(WEEKLY_PROMISE.some((re) => re.test(s))).toBe(false);
    }
    expect(stripComments('a // every week\nb {/* weekly finds */} c /* once a week */ https://x.y')).not.toMatch(
      /week/
    );
  });
});
