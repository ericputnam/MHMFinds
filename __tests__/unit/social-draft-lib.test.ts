import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BANNED_PHRASES,
  MAX_HASHTAGS,
  NSFW_PATH_RE,
  approvalString,
  draftFilename,
  dropPending,
  isOptedOut,
  isPostable,
  normalizeDestination,
  parseOptout,
  pendingDraftPaths,
  rankDestinations,
  renderDraft,
  voiceLint,
  type LandingRow,
} from '../../scripts/agents/social-draft-lib';

const row = (path: string, sessions: number, channel: LandingRow['channel'], window: LandingRow['window'], host = 'musthavemods.com'): LandingRow => ({
  host,
  path,
  sessions,
  channel,
  window,
});

describe('normalizeDestination', () => {
  it('folds blog.* into the apex, strips query, enforces trailing slash', () => {
    expect(normalizeDestination('blog.musthavemods.com', '/sims-4-scars-cc?utm=x')).toBe('/sims-4-scars-cc/');
    expect(normalizeDestination('musthavemods.com', 'sims-4-scars-cc/')).toBe('/sims-4-scars-cc/');
  });
  it('drops (not set) and foreign hosts', () => {
    expect(normalizeDestination('musthavemods.com', '(not set)')).toBe('');
    expect(normalizeDestination('evil.example', '/x/')).toBe('');
  });
});

describe('isPostable / NSFW guard', () => {
  it('excludes NSFW and non-content paths', () => {
    expect(isPostable('/best-woohoo-mods-sims-4-ultimate-guide/')).toBe(false);
    expect(isPostable('/sims-4-adult-mods/')).toBe(false);
    expect(isPostable('/')).toBe(false);
    expect(isPostable('/category/sims-4/')).toBe(false);
    expect(isPostable('/go/abc/')).toBe(false);
    expect(isPostable('/submit-mod/')).toBe(false); // #2 by nonPinterest7d on 10-25, a form page
    expect(isPostable('/signup/')).toBe(false);
  });
  it('keeps normal content, collection and mod pages', () => {
    expect(isPostable('/sims-4-scars-cc/')).toBe(true);
    expect(isPostable('/games/sims-4/male-clothes/')).toBe(true);
    expect(isPostable('/mods/cmabc123/')).toBe(true);
    // The regex must not swallow ordinary words.
    expect(NSFW_PATH_RE.test('/sims-4-sexy-nails/')).toBe(true); // intentionally conservative
    expect(NSFW_PATH_RE.test('/sims-4-essex-houses/')).toBe(false);
  });
});

describe('rankDestinations', () => {
  const rows: LandingRow[] = [
    row('/a/', 100, 'all', '7d'),
    row('/a/', 90, 'pinterest', '7d'), // nonPinterest 10
    row('/b/', 60, 'all', '7d'),
    row('/b/', 10, 'pinterest', '7d'), // nonPinterest 50
    row('/b', 5, 'all', '7d', 'blog.musthavemods.com'), // folds into /b/ → 55
    row('/b/', 30, 'tumblr', '28d'),
    row('/newest/', 500, 'all', '7d'),
    row('/newest/', 495, 'pinterest', '7d'), // nonPinterest 5 — biggest page, lowest outcome
    row('/best-woohoo-mods-sims-4-ultimate-guide/', 400, 'all', '7d'),
    row('(not set)', 999, 'all', '7d'),
  ];
  it('ranks by non-Pinterest sessions, not by total or recency, and folds hosts', () => {
    const r = rankDestinations({ rows, min: 1 });
    expect(r.map((d) => d.path)).toEqual(['/b/', '/a/', '/newest/']);
    expect(r[0].nonPinterest7d).toBe(55);
    expect(r[0].tumblr28d).toBe(30);
  });
  it('never returns an NSFW path or (not set), whatever the sessions', () => {
    const r = rankDestinations({ rows, min: 1, rankBy: 'all7d' });
    expect(r.some((d) => /woohoo/.test(d.path))).toBe(false);
    expect(r.some((d) => d.path.includes('not set'))).toBe(false);
  });
  it('applies the minimum and the kinds filter', () => {
    expect(rankDestinations({ rows, min: 50 }).map((d) => d.path)).toEqual(['/b/']);
    expect(rankDestinations({ rows, min: 1, kinds: ['collection'] })).toEqual([]);
  });
});

describe('voiceLint', () => {
  it('passes plain human copy with ≤3 tags', () => {
    const copy = 'Scars CC that actually reads as skin, not a sticker. Forty-odd finds, creators linked on each. #ts4cc #sims4cc';
    expect(voiceLint(copy)).toEqual([]);
  });
  it('flags every banned phrase the operator named', () => {
    for (const phrase of ['elevate', 'dive in', 'game-changer', 'must-see', 'unleash', "whether you're", 'discover']) {
      expect(BANNED_PHRASES).toContain(phrase);
      const v = voiceLint(`Time to ${phrase} your game.`);
      expect(v.map((x) => x.rule)).toContain('banned-phrase');
    }
  });
  it('flags hashtag stacks, em-dash chains, rhetorical openers and emoji walls', () => {
    expect(voiceLint('x #a #b #c #d').map((v) => v.rule)).toContain('hashtag-stack');
    expect(MAX_HASHTAGS).toBe(3);
    expect(voiceLint('one — two — three').map((v) => v.rule)).toContain('em-dash-chain');
    expect(voiceLint('Looking for better hair? Here you go.').map((v) => v.rule)).toContain('rhetorical-opener');
    expect(voiceLint('wow 😍😍😍 so good').map((v) => v.rule)).toContain('emoji-wall');
  });
  it('does not flag "discovered" inside a longer word boundary case-insensitively but does flag the bare verb', () => {
    expect(voiceLint('Discover the best mods').map((v) => v.detail)).toContain('discover');
    expect(voiceLint('I rediscovered my old save').map((v) => v.rule)).not.toContain('banned-phrase');
  });
});

describe('opt-out list', () => {
  it('parses comments and blanks, matches case/space-insensitively', () => {
    const set = parseOptout('# creators who asked not to be featured\n  Some Creator  \n\nother-one # note\n');
    expect(set.size).toBe(2);
    expect(isOptedOut('some creator', set)).toBe(true);
    expect(isOptedOut('SOME   Creator', set)).toBe(true);
    expect(isOptedOut('Other-One', set)).toBe(true);
    expect(isOptedOut('third', set)).toBe(false);
    expect(isOptedOut(null, set)).toBe(false);
  });
});

describe('draft rendering', () => {
  const dest = {
    path: '/sims-4-scars-cc/',
    all7d: 120,
    all28d: 500,
    pinterest7d: 20,
    pinterest28d: 80,
    tumblr7d: 60,
    tumblr28d: 329,
    nonPinterest7d: 100,
    nonPinterest28d: 420,
    kind: 'post' as const,
  };
  it('names the approval string, the target URL and lists violations at the top', () => {
    const md = renderDraft({
      date: '2026-10-25',
      index: 1,
      platform: 'tumblr',
      dest,
      mods: [{ id: 'cm1', title: 'Scar set', author: 'Someone', thumbnail: null }],
      copy: 'Discover scars! #a #b #c #d',
      asset: '',
      account: 'test',
      rankBy: 'nonPinterest7d',
      rank: 1,
    });
    expect(md).toContain(approvalString('2026-10-25'));
    expect(md).toContain('approve social 2026-10-25');
    expect(md).toContain('target_url: https://musthavemods.com/sims-4-scars-cc/');
    expect(md).toContain('## Voice-rule violations');
    expect(md).toContain('banned-phrase: discover');
    expect(md).toContain('hashtag-stack');
    expect(md).toContain('by Someone');
  });
  it('marks an empty copy as not written, with no violations section', () => {
    const md = renderDraft({ date: '2026-10-25', index: 2, platform: 'reddit', dest, mods: [], copy: '', asset: '', account: 'x', rankBy: 'nonPinterest7d', rank: 2 });
    expect(md).toContain('voice_lint: copy not written yet');
    expect(md).not.toContain('## Voice-rule violations');
  });
  it('builds stable filenames', () => {
    expect(draftFilename(3, 'short-video', '/games/sims-4/male-clothes/')).toBe('03-short-video-games-sims-4-male-clothes.md');
  });
});

// E333 (2026-11-04) -------------------------------------------------------
describe('E333 non-content routes', () => {
  it('rejects the hyphenated auth routes that slipped through (/sign-in/ ranked 228 nonPinterest7d)', () => {
    for (const p of ['/sign-in/', '/sign-in/?callbackUrl=x', '/signin/', '/log-in/', '/login/', '/sign-out/', '/sign-up/', '/account/settings/', '/api/x/', '/go/abc/', '/creators/', '/creators/dashboard/', '/about/', '/privacy-policy/', '/terms/']) {
      expect(isPostable(normalizeDestination('musthavemods.com', p)), p).toBe(false);
    }
  });
  it('keeps the public content routes that share a prefix', () => {
    for (const p of ['/creator/atino00/', '/creator/', '/top-creators/', '/games/sims-4/hair-cc/', '/mods/cmabc123/', '/play/', '/sims-4-terms-of-endearment-mods/', '/about-face-cc/']) {
      expect(isPostable(p), p).toBe(true);
    }
  });

  // Walks app/: every top-level route must be classified, so a new auth/form
  // route cannot become a "destination" by default. Dotted entries (llms.txt,
  // sitemaps, robots.txt) are files, not pages; app/components holds no route.
  const CONTENT_ROUTES = new Set(['games', 'mods', 'creator', 'play', 'top-creators']);
  const SKIP = new Set(['components']);
  const appDir = join(__dirname, '..', '..', 'app');
  const routes = readdirSync(appDir).filter((d) => !d.includes('.') && !d.startsWith('_') && !d.startsWith('(') && !SKIP.has(d) && statSync(join(appDir, d)).isDirectory());
  it('found the app routes (vacuity guard)', () => {
    expect(routes.length).toBeGreaterThan(15);
    expect(routes).toContain('sign-in');
  });
  it.each(routes)('app/%s is postable only if it is a content route', (d) => {
    expect(isPostable(`/${d}/some-leaf/`)).toBe(CONTENT_ROUTES.has(d));
  });
});

describe('E333 pending-draft skip', () => {
  const draft = (status: string, url: string) => `---\nstatus: ${status}\nplatform: x\ntarget_url: ${url}\nbatch: 2026-10-31\n---\n\n## Copy\n`;
  it('collects DRAFT targets, normalized, and ignores posted/archived ones', () => {
    const pending = pendingDraftPaths([
      draft('DRAFT — Tier 2 until 2026-11-07; posts only after "approve social 2026-10-31"', 'https://musthavemods.com/black-sims-4-cc/'),
      draft('DRAFT', 'https://blog.musthavemods.com/sims-4-reshade'),
      draft('POSTED 2026-11-08 tiktok', 'https://musthavemods.com/sims-4-poses/'),
      draft('ARCHIVED unposted 2026-11-04', 'https://musthavemods.com/new-sims-4-mods-2026/'),
      'no front matter at all',
    ]);
    expect(Array.from(pending).sort()).toEqual(['/black-sims-4-cc/', '/sims-4-reshade/']);
  });
  it('drops pending destinations from the ranking and keeps order', () => {
    const ranked = rankDestinations({
      rows: [row('/a/', 300, 'all', '7d'), row('/b/', 200, 'all', '7d'), row('/c/', 100, 'all', '7d')],
    });
    expect(dropPending(ranked, new Set(['/b/'])).map((d) => d.path)).toEqual(['/a/', '/c/']);
  });
  it('the committed batches yield pending destinations (reads the real tree)', () => {
    const root = join(__dirname, '..', '..', 'reports', 'funnel', 'social', 'drafts');
    const texts: string[] = [];
    for (const b of readdirSync(root).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))) {
      for (const f of readdirSync(join(root, b)).filter((x) => /^\d{2}-.*\.md$/.test(x))) texts.push(readFileSync(join(root, b, f), 'utf8'));
    }
    expect(texts.length).toBeGreaterThan(10);
    const pending = pendingDraftPaths(texts);
    expect(pending.size).toBeGreaterThan(5);
    expect(pending.has('/black-sims-4-cc/')).toBe(true);
  });
});
