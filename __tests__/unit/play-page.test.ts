/**
 * /play — MAIN CHARACTER daily styling game: source-level guards.
 *
 * Same pattern as sidebar-sticky-health.test.ts and
 * canonical-trailing-slash.test.ts: assert the *structure* of the source,
 * not runtime behaviour. Every failure mode guarded here is silent —
 * a missing ad anchor, a single-child .mv-ads, a loading gate, or a
 * canonical pointing at a 308 produces no error anywhere, it just quietly
 * costs money or indexing.
 *
 * Shipped with E38 (PR for Q1 b, 2026-09-12).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, '../../', rel), 'utf-8');

const page = read('app/play/page.tsx');
const client = read('app/play/PlayClient.tsx');
const dailyRoute = read('app/api/game/daily/route.ts');
const game = read('lib/game/mainCharacter.ts');

describe('/play server/client split', () => {
  it('page.tsx is a server component (no "use client")', () => {
    expect(page).not.toMatch(/['"]use client['"]/);
  });

  it('PlayClient.tsx is the client component', () => {
    expect(client.trimStart().startsWith("'use client'")).toBe(true);
  });

  it('page.tsx exports dynamic = force-dynamic (the episode changes daily)', () => {
    expect(page).toMatch(/export const dynamic = 'force-dynamic'/);
  });

  it('the daily episode API is force-dynamic too (it queries the DB)', () => {
    expect(dailyRoute).toMatch(/export const dynamic = 'force-dynamic'/);
    expect(dailyRoute).not.toMatch(/force-static/);
  });
});

describe('/play canonical and og:url end with a trailing slash', () => {
  // next.config.js sets trailingSlash: true, so /play 308s to /play/.
  // A canonical pointing at a redirect is the exact conflicting signal
  // that kept /games/sims-4/pregnancy-mods/ out of Google's index.
  it('next.config.js still sets trailingSlash: true', () => {
    expect(read('next.config.js')).toMatch(/trailingSlash:\s*true/);
  });

  it('no musthavemods.com/play URL in the metadata omits the slash', () => {
    // Line comments are stripped: the explanatory comment above the
    // canonical deliberately writes the bad form to describe it.
    const code = page.replace(/^\s*\/\/.*$/gm, '');
    const urls = Array.from(code.matchAll(/https:\/\/musthavemods\.com\/play\/?/g)).map(
      (m) => m[0]
    );
    expect(urls.length).toBeGreaterThanOrEqual(2); // canonical + og:url
    for (const u of urls) {
      expect(u.endsWith('/play/')).toBe(true);
    }
  });

  it('the sitemap lists /play/ with a trailing slash', () => {
    expect(read('app/sitemap-nextjs.xml/route.ts')).toMatch(
      /\$\{baseUrl\}\/play\/`/
    );
  });
});

// Strip JSX comments before locating the ad anchors. The explanatory
// comments above the sidebar legitimately contain the literal string
// `<aside id="secondary">` and the words "sticky" / "placeholder divs",
// so matching against the raw source finds the documentation, not the
// element. Everything below is asserted against real JSX only.
const clientCode = client.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const asideEl = (clientCode.match(/<aside\b[\s\S]*?<\/aside>/) || [''])[0];
const asideOpenTag = (asideEl.match(/^<aside\b[\s\S]*?>/) || [''])[0];

describe('/play is routed to Next.js, not proxied to WordPress', () => {
  // getWordPressUrl()'s catch-all proxies any first path segment that is
  // not in NEXTJS_PREFIXES to blog.musthavemods.com. A missing entry does
  // not fail the build or the type-check — the page just serves a
  // WordPress 404. Confirmed against a local production build before this
  // entry was added.
  const mw = read('middleware.ts');

  it("NEXTJS_PREFIXES contains 'play'", () => {
    const set = mw.slice(
      mw.indexOf('const NEXTJS_PREFIXES'),
      mw.indexOf(']);', mw.indexOf('const NEXTJS_PREFIXES'))
    );
    expect(set).toMatch(/'play'/);
  });

  it('the WordPress catch-all still gates on NEXTJS_PREFIXES', () => {
    expect(mw).toMatch(/!NEXTJS_PREFIXES\.has\(firstSegment\)/);
  });
});

describe('/play Mediavine ad anchors', () => {
  it('renders an empty <aside id="secondary"> sidebar anchor', () => {
    expect(asideEl).not.toBe('');
    expect(asideOpenTag).toMatch(/id="secondary"/);
    expect(asideOpenTag).toMatch(/widget-area primary-sidebar/);
  });

  it('the sidebar is visible from lg (1024px), not xl', () => {
    expect(asideOpenTag).toMatch(/hidden lg:block/);
    expect(asideOpenTag).not.toMatch(/hidden xl:block/);
  });

  it('the sidebar carries no position:sticky/fixed (Mediavine handles it)', () => {
    expect(asideOpenTag).not.toMatch(/sticky/);
    expect(asideOpenTag).not.toMatch(/\bfixed\b/);
    expect(asideOpenTag).toMatch(/overflow-visible/);
  });

  it('the sidebar body is empty — no min-h placeholder div', () => {
    const inner = asideEl
      .replace(/^<aside\b[\s\S]*?>/, '')
      .replace(/<\/aside>$/, '')
      .trim();
    expect(inner).toBe('');
  });

  it('has a .mv-ads in-content container', () => {
    expect(clientCode).toMatch(/className="mv-ads"/);
  });

  it('the .mv-ads container has at least two element children', () => {
    // Mediavine injects display ads BETWEEN children of .mv-ads — a
    // single-child container stays permanently empty.
    const start = clientCode.indexOf('className="mv-ads"');
    expect(start).toBeGreaterThan(-1);
    const region = clientCode.slice(start, clientCode.indexOf('<aside'));
    const sectionOpens = (region.match(/<section\b/g) || []).length;
    expect(sectionOpens).toBeGreaterThanOrEqual(2);
  });

  it('no capture surface (newsletter form) is nested inside .mv-ads', () => {
    const start = clientCode.indexOf('className="mv-ads"');
    const region = clientCode.slice(start, clientCode.indexOf('<aside'));
    expect(region).not.toMatch(/NewsletterSignup/);
  });
});

describe('/play does not gate its layout behind a loading spinner', () => {
  // A component that returns <Loader/> while fetching hides every ad
  // anchor from Mediavine's single initial DOM scan. /play must render
  // the shell with skeletons instead.
  it('has no early `if (loading) return` style guard', () => {
    expect(client).not.toMatch(/if \(loading\)\s*return/);
    expect(client).not.toMatch(/if \(!data\)\s*return/);
  });

  it('renders animate-pulse skeletons while the episode loads', () => {
    expect(client).toMatch(/animate-pulse/);
  });

  it('never calls mediavine.newPageView() (the global hook owns it)', () => {
    expect(client).not.toMatch(/newPageView/);
  });
});

describe('/play scoring is deterministic and offline', () => {
  it('the episode rotation is seeded, not random', () => {
    expect(game).toMatch(/export function seededShuffle/);
    expect(game).toMatch(/export function seededRandom/);
    // No bare Math.random anywhere — the whole point is that every player
    // sees the same episode on the same day.
    expect(game).not.toMatch(/Math\.random\(\)/);
  });

  it('pins the game timezone explicitly (no server/browser date drift)', () => {
    expect(game).toMatch(/timeZone: 'America\/New_York'/);
  });

  it('the daily route only serves verified, non-NSFW mods with thumbnails', () => {
    expect(dailyRoute).toMatch(/isVerified: true/);
    expect(dailyRoute).toMatch(/isNSFW: false/);
    expect(dailyRoute).toMatch(/thumbnail: \{ not: null \}/);
  });

  it('"shop the look" links go through the /go interstitial, not straight out', () => {
    // /go/[modId] is the page that carries the download ad units.
    expect(client).toMatch(/href=\{`\/go\/\$\{item\.id\}`\}/);
  });
});
