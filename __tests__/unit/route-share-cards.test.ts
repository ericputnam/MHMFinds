import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { shareCard, shareImageFor, SITE_SHARE_IMAGE } from '../../lib/seo/shareCard';

/**
 * E337 (Pip, 2026-11-05): every indexable route ships its own share card.
 *
 * Next replaces a child's `openGraph` wholesale, so a route that sets
 * openGraph without `images` has no og:image, and a route that sets none
 * inherits the root one — og:url=https://musthavemods.com/ and the homepage
 * title. Live on 2026-11-05: /about/, /submit-mod/, /top-creators/,
 * /privacy-policy/ and /terms/ unfurled as the homepage; /play/, /creator/,
 * /creator/<slug>/ and /games/<game>/ had no og:image; /forgot-password/ and
 * /set-password/ served `index, follow` with canonical "/".
 *
 * The scan walks every app/ page.tsx, finds the nearest file in its chain
 * (page, then each ancestor layout below the root) that exports metadata, and
 * requires that file to build its card via shareCard() / collectionMetadata()
 * or to set openGraph with url + images itself. noindex routes are exempt
 * unless their metadata sets openGraph anyway. Red on the pre-fix tree: 3 of 6
 * cases, 11 routes (the 10 above plus /creator/<slug>/).
 */
const ROOT = path.resolve(__dirname, '../..');
const APP = path.join(ROOT, 'app');

/** Not served to anonymous visitors, so nothing to share. Each needs a reason. */
const EXEMPT: Record<string, string> = {
  'app/creators': 'creator dashboard: middleware 307s anonymous visitors to /sign-in',
};

function strip(src: string): string {
  return src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function walkPages(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'api' || e.name === 'admin') continue;
      walkPages(p, out);
    } else if (e.name === 'page.tsx') out.push(p);
  }
  return out;
}

const exportsMetadata = (src: string) =>
  /export\s+(const\s+metadata\b|async\s+function\s+generateMetadata\b|function\s+generateMetadata\b)/.test(src);
const isNoindex = (src: string) => /index:\s*false|['"]noindex/.test(src);
const hasCard = (src: string) =>
  /\bshareCard\(|\bcollectionMetadata\(/.test(src) ||
  (/openGraph\s*:/.test(src) && /\burl\s*:/.test(src) && /\bimages\s*:/.test(src));

type Verdict = { route: string; ok: boolean; why: string };

function judge(pageFile: string): Verdict {
  const rel = path.relative(ROOT, pageFile).split(path.sep).join('/');
  const route = rel.replace(/^app/, '').replace(/\/page\.tsx$/, '/') || '/';
  if (rel === 'app/page.tsx') return { route, ok: true, why: 'homepage: root layout card' };
  for (const prefix of Object.keys(EXEMPT)) {
    if (rel.startsWith(prefix + '/')) return { route, ok: true, why: `exempt: ${EXEMPT[prefix]}` };
  }
  const chain: string[] = [];
  for (let dir = path.dirname(pageFile); dir !== APP; dir = path.dirname(dir)) {
    const files = dir === path.dirname(pageFile) ? ['page.tsx', 'layout.tsx'] : ['layout.tsx'];
    for (const f of files) {
      const p = path.join(dir, f);
      if (fs.existsSync(p)) chain.push(strip(fs.readFileSync(p, 'utf8')));
    }
  }
  const source = chain.find(exportsMetadata);
  // A source that sets openGraph means the route is meant to be shared, even
  // when it is noindex on one branch (/creator/<slug>/ below MIN_MODS_FOR_PAGE).
  if (source && /openGraph\s*:/.test(source) && !hasCard(source)) {
    return { route, ok: false, why: 'openGraph without url + images' };
  }
  if (chain.some(isNoindex) && !(source && hasCard(source))) {
    return { route, ok: true, why: 'noindex' };
  }
  if (!source) return { route, ok: false, why: 'no metadata below the root: inherits the homepage card' };
  return hasCard(source)
    ? { route, ok: true, why: 'own card' }
    : { route, ok: false, why: 'metadata without openGraph url + images' };
}

describe('every indexable route ships its own share card (E337)', () => {
  const verdicts = walkPages(APP).map(judge);

  it('finds the routes (vacuity guard)', () => {
    expect(verdicts.length).toBeGreaterThanOrEqual(20);
    expect(verdicts.filter((v) => v.why === 'own card').length).toBeGreaterThanOrEqual(10);
    expect(verdicts.filter((v) => v.why === 'noindex').length).toBeGreaterThanOrEqual(4);
  });

  it('no indexable route inherits the homepage card or lacks og:image', () => {
    expect(verdicts.filter((v) => !v.ok)).toEqual([]);
  });
});

describe('shareCard()', () => {
  it('sets og:url, og:image and twitter:image', () => {
    const card = shareCard({ title: 'T', description: 'D', url: 'https://musthavemods.com/about/' });
    const og = card.openGraph as { url: string; images: Array<{ url: string }> };
    expect(og.url).toBe('https://musthavemods.com/about/');
    expect(og.images[0].url).toBe(SITE_SHARE_IMAGE);
    expect((card.twitter as { images: string[] }).images).toEqual([SITE_SHARE_IMAGE]);
  });

  it('uses an https image and falls back to the site card otherwise', () => {
    expect(shareImageFor('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg');
    expect(shareImageFor('http://cdn.example/a.jpg')).toBe(SITE_SHARE_IMAGE);
    expect(shareImageFor(null)).toBe(SITE_SHARE_IMAGE);
    expect(shareImageFor('')).toBe(SITE_SHARE_IMAGE);
  });

  it('the site card file exists', () => {
    expect(fs.existsSync(path.join(ROOT, 'public', SITE_SHARE_IMAGE))).toBe(true);
  });
});

describe('/play share text ends with the slash (E337)', () => {
  it('buildShareText names musthavemods.com/play/', () => {
    const src = strip(fs.readFileSync(path.join(ROOT, 'lib/game/mainCharacter.ts'), 'utf8'));
    expect(src).toContain("'musthavemods.com/play/'");
    expect(src).not.toContain("'musthavemods.com/play'");
  });
});
