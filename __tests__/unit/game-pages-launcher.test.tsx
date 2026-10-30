import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GAMES, showsSims4Collections } from '@/components/launcher/games';
import { LauncherBelow } from '@/components/launcher/LauncherBelow';
import { LauncherHero } from '@/components/launcher/LauncherHero';
import { getGameFromSlug } from '@/lib/gameRoutes';

/**
 * 2026-10-28: the homepage's "Explore" game cards linked to /games/<slug>/,
 * which still rendered GamePageClient (the pre-launcher design), and the
 * launcher showed the Sims 4 collection blocks with Minecraft selected.
 *
 * The collection registry is Sims 4 only, so every launcher surface asks
 * showsSims4Collections(). These tests render each surface for every game in
 * GAMES (not a hand-picked one) so a new game or a new collections slot
 * cannot slip past.
 */
const ROOT = path.resolve(__dirname, '../..');
const MARKER = 'data-test-collections';
const slot = <div {...{ [MARKER]: '' }}>collections</div>;

describe('Sims 4 collections only on Sims 4 and All', () => {
  it('scans every launcher game (vacuity guard)', () => {
    expect(GAMES.length).toBeGreaterThanOrEqual(4);
    expect(GAMES.filter((g) => !showsSims4Collections(g.id)).length).toBeGreaterThanOrEqual(2);
  });

  for (const g of GAMES) {
    const expected = g.id === 'all' || g.id === 'sims4';

    it(`LauncherBelow ${expected ? 'shows' : 'hides'} collections for ${g.name}`, () => {
      const html = renderToStaticMarkup(
        <LauncherBelow game={g.value} gameCounts={{}} collectionsSlot={slot} types={[]} contentType="" onContentType={() => {}} />,
      );
      expect(html.includes(MARKER)).toBe(expected);
    });

    it(`LauncherHero ${expected ? 'shows' : 'hides'} collections for ${g.name}`, () => {
      const html = renderToStaticMarkup(<LauncherHero game={g.id} collections={slot} />);
      expect(html.includes(MARKER)).toBe(expected);
    });
  }
});

describe('/games/<slug>/ is the launcher', () => {
  it('every launcher game card links to a slug the game route accepts', () => {
    for (const g of GAMES.filter((x) => x.slug)) {
      expect(getGameFromSlug(g.slug!), g.slug).toBe(g.value);
    }
  });

  it('the legacy GamePageClient is gone and the route renders HomePageClient', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/games/[game]/GamePageClient.tsx'))).toBe(false);
    const src = fs.readFileSync(path.join(ROOT, 'app/games/[game]/page.tsx'), 'utf8');
    expect(src).toMatch(/<HomePageClient\b[\s\S]*routeGame=\{\{ slug: game, value: gameName \}\}/);
  });

  it('no source imports GamePageClient', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules', '.next', '.git', '__tests__'].includes(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(tsx?|jsx?)$/.test(e.name) && /from\s+['"][^'"]*GamePageClient['"]/.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(ROOT, p));
      }
    };
    for (const d of ['app', 'components', 'lib']) walk(path.join(ROOT, d));
    expect(hits).toEqual([]);
  });
});

describe('/games/<slug>/<topic>/ is the launcher too', () => {
  const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  // Comments here quote the old components by name; assert on code only.
  const code = read('app/games/[game]/[topic]/CollectionPageClient.tsx')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

  it('renders the launcher shell, not the legacy Navbar/ModGrid/Footer', () => {
    expect(code).toMatch(/launcher\/launcher\.css/);
    expect(code).toMatch(/className=\{`lx \$\{lxFontVars\}`\}/);
    for (const c of ['<LauncherHeader', '<LauncherGrid', '<LauncherFooter']) expect(code).toContain(c);
    for (const legacy of ['Navbar', 'ModGrid', 'components/Footer']) {
      expect(code, legacy).not.toMatch(new RegExp(`from\\s+['"][^'"]*${legacy}['"]`));
    }
  });

  it('stays statically generated: no useSearchParams in the client', () => {
    // useSearchParams() in an SSG page bails the tree out to a client-only
    // Suspense fallback, which would drop the grid from the served HTML.
    expect(code).not.toContain('useSearchParams');
    expect(read('app/games/[game]/[topic]/page.tsx')).toMatch(/generateStaticParams/);
  });

  it('header search on a collection page waits for Enter (it navigates away)', () => {
    expect(code).toMatch(/<LauncherHeader[\s\S]*?submitOnly[\s\S]*?\/>/);
  });
});
