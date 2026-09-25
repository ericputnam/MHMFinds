/**
 * "More from <creator>" is server-rendered and links to the creator page
 * (Nova, E106, 2026-09-25).
 *
 * Against the pre-E106 tree this file is red three ways: `creatorHrefFor`
 * does not exist, components/MoreFromCreator.tsx contains `fetch(` and
 * `useEffect`, and app/mods/[id]/page.tsx never imports getMoreFromCreator.
 *
 * Offline: lib/prisma is mocked; the wiring checks read source from disk.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { readFileSync } from 'fs';
import path from 'path';

vi.mock('../../lib/prisma', () => ({ prisma: {}, default: {} }));
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

import { MIN_MODS_FOR_PAGE } from '../../lib/creators';
import { creatorHrefFor, type MoreFromCreatorData } from '../../lib/creatorMods';
import { MoreFromCreator } from '../../components/MoreFromCreator';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

function card(i: number) {
  return {
    id: `mod-${i}`,
    title: `Mod ${i}`,
    thumbnail: null,
    category: 'Hair',
    gameVersion: 'Sims 4',
    isFree: true,
    price: null,
    rating: null,
  };
}

describe('creatorHrefFor — never link to a creator page that would 404', () => {
  it('links only when the creator clears MIN_MODS_FOR_PAGE', () => {
    expect(creatorHrefFor('Ravasheen', MIN_MODS_FOR_PAGE)).toBe('/creator/ravasheen/');
    expect(creatorHrefFor('RAVASHEEN', 53)).toBe('/creator/ravasheen/');
    expect(creatorHrefFor('Ravasheen', MIN_MODS_FOR_PAGE - 1)).toBeNull();
  });

  it('never links a junk author string or a missing author', () => {
    expect(creatorHrefFor('Kobe Sweats 135179830', 40)).toBeNull();
    expect(creatorHrefFor('75940181', 40)).toBeNull();
    expect(creatorHrefFor('', 40)).toBeNull();
    expect(creatorHrefFor(null, 40)).toBeNull();
  });
});

describe('<MoreFromCreator> renders crawlable links from server data', () => {
  it('prints six /mods/ links and the "See all" creator link', () => {
    const data: MoreFromCreatorData = {
      displayName: 'Ravasheen',
      totalMods: 53,
      creatorHref: '/creator/ravasheen/',
      mods: [1, 2, 3, 4, 5, 6].map(card),
    };
    render(<MoreFromCreator data={data} />);
    const links = screen.getAllByRole('link');
    const modLinks = links.filter((a) => a.getAttribute('href')?.startsWith('/mods/'));
    expect(modLinks).toHaveLength(6);
    // jsdom's next/link cannot see next.config.js `trailingSlash: true` and
    // strips the slash; the source literal is asserted in the wiring block.
    for (const a of modLinks) expect(a.getAttribute('href')).toMatch(/^\/mods\/mod-\d\/?$/);

    const seeAll = screen.getByRole('link', { name: /See all 53 mods by Ravasheen/ });
    expect(seeAll.getAttribute('href')).toMatch(/^\/creator\/ravasheen\/?$/);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('More from Ravasheen');
  });

  it('omits every /creator/ link when the creator has no page', () => {
    const data: MoreFromCreatorData = {
      displayName: 'Tiny Creator',
      totalMods: 3,
      creatorHref: null,
      mods: [1, 2].map(card),
    };
    render(<MoreFromCreator data={data} />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.startsWith('/creator/'))).toBe(false);
    expect(hrefs.filter((h) => h.startsWith('/mods/'))).toHaveLength(2);
    expect(screen.queryByText(/See all/)).toBeNull();
  });

  it('renders nothing for null data or an empty list', () => {
    const { container: c1 } = render(<MoreFromCreator data={null} />);
    expect(c1.innerHTML).toBe('');
    const { container: c2 } = render(
      <MoreFromCreator data={{ displayName: 'X', totalMods: 9, creatorHref: '/creator/x/', mods: [] }} />,
    );
    expect(c2.innerHTML).toBe('');
  });
});

describe('wiring — the block is resolved on the server, not fetched in the browser', () => {
  it('components/MoreFromCreator.tsx has no client fetch or effect', () => {
    const src = stripComments(read('components/MoreFromCreator.tsx'));
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/\buseEffect\b/);
    expect(src).not.toMatch(/\buseState\b/);
    expect(src).not.toContain('/api/mods/');
    // Trailing slash on every href (trailingSlash: true 308s bare paths).
    expect(src).toContain('href={`/mods/${mod.id}/`}');
  });

  it('app/mods/[id]/page.tsx resolves the data and hands it to the client component', () => {
    const page = stripComments(read('app/mods/[id]/page.tsx'));
    expect(page).toMatch(/import \{ getMoreFromCreator \} from '@\/lib\/creatorMods'/);
    expect(page).toMatch(/await getMoreFromCreator\(mod\.id, mod\.author\)/);
    expect(page).toMatch(/moreFromCreator=\{moreFromCreator\}/);

    const client = stripComments(read('app/mods/[id]/ModDetailClient.tsx'));
    expect(client).toMatch(/<MoreFromCreator data=\{moreFromCreator\} \/>/);
    // The block must stay a sibling of the InContentAd anchors: the line
    // that renders it is not nested inside a `.mv-ads` element.
    const idx = client.indexOf('<MoreFromCreator data=');
    const before = client.slice(0, idx);
    const opened = (before.match(/className="mv-ads[^"]*"/g) ?? []).length;
    const closed = (before.match(/end \.mv-ads/g) ?? []).length;
    // Every `.mv-ads` opened before this point is the self-closing
    // InContentAd helper (2 placeholder children) — none is left open.
    expect(before).toContain('function InContentAd');
    expect(opened).toBe(1); // only the helper's own className
    expect(closed).toBe(0);
  });

  it('the loader lives in its own file (one owner per helper per day)', () => {
    const lib = stripComments(read('lib/creatorMods.ts'));
    expect(lib).toMatch(/export async function getMoreFromCreator/);
    expect(stripComments(read('lib/creators.ts'))).not.toMatch(/getMoreFromCreator/);
    // Same 404 rule as the creator page itself.
    expect(lib).toContain('MIN_MODS_FOR_PAGE');
    expect(lib).toContain('isJunkAuthorSlug');
  });
});
