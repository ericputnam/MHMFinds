/**
 * E84 (2026-09-23): crawlable "More <collection>" links on
 * /games/[game]/[topic] for the mods ranked below the first-paint grid.
 *
 * Against pre-fix origin/main the module import and every source guard
 * fail (the module and component do not exist); the render cases are new.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import {
  INITIAL_PAGE_SIZE,
  MORE_LINKS_COUNT,
  modHref,
} from '@/lib/seo/collectionMoreLinks';
import { CollectionMoreLinks } from '@/components/CollectionMoreLinks';

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const read = (rel: string) => stripComments(readFileSync(join(process.cwd(), rel), 'utf8'));

describe('collectionMoreLinks constants', () => {
  it('keeps the grid at 48 and links a bounded slice below it', () => {
    expect(INITIAL_PAGE_SIZE).toBe(48);
    expect(MORE_LINKS_COUNT).toBeGreaterThanOrEqual(20);
    expect(MORE_LINKS_COUNT).toBeLessThanOrEqual(100);
  });

  it('modHref keeps the trailing slash (trailingSlash: true)', () => {
    expect(modHref('abc123')).toBe('/mods/abc123/');
  });
});

describe('<CollectionMoreLinks />', () => {
  const links = Array.from({ length: 5 }, (_, i) => ({ id: `id${i}`, title: `Mod ${i}` }));

  it('renders one plain anchor per link with the canonical mod href', () => {
    render(<CollectionMoreLinks title="Hair CC" links={links} />);
    const anchors = screen.getAllByRole('link');
    expect(anchors).toHaveLength(5);
    anchors.forEach((a, i) => {
      expect(a).toHaveAttribute('href', `/mods/id${i}/`);
      expect(a).toHaveTextContent(`Mod ${i}`);
    });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('More Hair CC');
  });

  it('renders nothing at all when there are no links', () => {
    const { container } = render(<CollectionMoreLinks title="Hair CC" links={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('is a plain <a> list, not next/link, so the HTML is crawlable without hydration', () => {
    const src = read('components/CollectionMoreLinks.tsx');
    expect(src).not.toMatch(/from 'next\/link'/);
    expect(src).toMatch(/<a\s/);
    expect(src).toMatch(/modHref\(/);
  });
});

describe('/games/[game]/[topic] wiring (source guards)', () => {
  const page = read('app/games/[game]/[topic]/page.tsx');
  const client = read('app/games/[game]/[topic]/CollectionPageClient.tsx');

  it('page fetches the slice after the grid using the shared constants', () => {
    expect(page).toMatch(/from '.*lib\/seo\/collectionMoreLinks'/);
    expect(page).toMatch(/skip:\s*INITIAL_PAGE_SIZE/);
    expect(page).toMatch(/take:\s*MORE_LINKS_COUNT/);
    expect(page).toMatch(/moreLinks=\{moreLinks\}/);
    // Crawler surface degrades to an empty list, never a 500.
    expect(page).toMatch(/\.catch\(\(\): ModLink\[\] => \[\]\)/);
  });

  it('client renders the list inside the main column, before the ad aside', () => {
    const more = client.indexOf('<CollectionMoreLinks');
    const grid = client.indexOf('<ModGrid');
    const aside = client.indexOf('<aside');
    expect(more).toBeGreaterThan(grid);
    expect(more).toBeLessThan(aside);
    // The main column closes (</div>) before the aside opens; the list
    // must be inside that column, i.e. before the last </div> preceding <aside>.
    const mainColumnClose = client.lastIndexOf('</div>', aside);
    expect(more).toBeLessThan(mainColumnClose);
  });
});
