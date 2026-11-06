/**
 * E355 (Sage, 2026-11-06): every creator page's ProfilePage JSON-LD carries
 * `dateModified`, and it is the value /sitemap-creators.xml declares for the
 * same URL.
 *
 * Live 2026-11-06, /creator/orchiona/ emitted ProfilePage {@id, url, name,
 * isPartOf, mainEntity, hasPart} and no date. Google lists dateModified as a
 * recommended ProfilePage property, and /creator/* takes AI landings with no
 * Google demand behind them (GA4 10-29→11-04: AI Assistant 101, Organic
 * Search 167).
 *
 * The sitemap dates a creator with creatorLastmod(listCreators().latest), and
 * `latest` is MAX(createdAt) over the creator's SFW author variants. The page
 * now reads MAX(createdAt) over the rows it lists (same variants, isNSFW
 * false) and passes it through the same function.
 * Pre-fix tree: every test below is red (no latestModCreatedAt, no
 * dateModified, no import).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const queryRawMock = vi.fn();
const aggregateMock = vi.fn();
const findManyMock = vi.fn();

vi.mock('../../lib/prisma', () => {
  const prisma = {
    $queryRaw: (...a: unknown[]) => queryRawMock(...a),
    creatorProfile: { findUnique: async () => null },
    mod: {
      aggregate: (...a: unknown[]) => aggregateMock(...a),
      findMany: (...a: unknown[]) => findManyMock(...a),
      count: async () => 0,
    },
  };
  return { prisma, default: prisma };
});

import { getCreatorPageData } from '../../lib/creators';
import { CREATOR_TEMPLATE_LASTMOD, creatorLastmod } from '../../lib/sitemapLastmod';

const ROOT = path.resolve(__dirname, '../..');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const read = (p: string) => stripComments(readFileSync(path.join(ROOT, p), 'utf8'));

beforeEach(() => {
  queryRawMock.mockReset().mockResolvedValue([{ author: 'Orchiona', mods: 12 }]);
  findManyMock.mockReset().mockResolvedValue([]);
  aggregateMock.mockReset();
});

describe('E355: getCreatorPageData exposes the newest listed mod date', () => {
  it('asks for MAX(createdAt) over the same where clause as the grid', async () => {
    aggregateMock.mockResolvedValue({ _sum: { downloadCount: 5 }, _max: { createdAt: new Date('2026-01-29T10:00:00Z') } });
    const data = await getCreatorPageData('orchiona');
    expect(data?.latestModCreatedAt).toBe('2026-01-29T10:00:00.000Z');
    const aggArgs = aggregateMock.mock.calls[0][0];
    const gridArgs = findManyMock.mock.calls[0][0];
    expect(aggArgs._max).toEqual({ createdAt: true });
    expect(aggArgs.where).toEqual(gridArgs.where);
    expect(aggArgs.where.isNSFW).toBe(false);
  });

  it('an old newest mod clamps up to the template date; a newer one wins', async () => {
    aggregateMock.mockResolvedValue({ _sum: { downloadCount: 5 }, _max: { createdAt: new Date('2026-01-29T10:00:00Z') } });
    const old = await getCreatorPageData('orchiona');
    expect(creatorLastmod(old!.latestModCreatedAt)).toBe(CREATOR_TEMPLATE_LASTMOD);

    aggregateMock.mockResolvedValue({ _sum: { downloadCount: 5 }, _max: { createdAt: new Date('2099-01-02T10:00:00Z') } });
    const fresh = await getCreatorPageData('orchiona');
    expect(creatorLastmod(fresh!.latestModCreatedAt)).toBe('2099-01-02');
  });

  it('no date (or a missing _max) degrades to the template date, never throws', async () => {
    aggregateMock.mockResolvedValue({ _sum: { downloadCount: 0 } });
    const data = await getCreatorPageData('orchiona');
    expect(data?.latestModCreatedAt).toBeNull();
    expect(creatorLastmod(data!.latestModCreatedAt)).toBe(CREATOR_TEMPLATE_LASTMOD);
  });
});

describe('E355: the page and the sitemap use the same function', () => {
  const page = read('app/creator/[slug]/page.tsx');

  it('the sitemap dates creators with creatorLastmod', () => {
    expect(read('app/sitemap-creators.xml/route.ts')).toMatch(/creatorLastmod\(r\.latest\)/);
  });

  it('the ProfilePage node emits dateModified: creatorLastmod(data.latestModCreatedAt)', () => {
    expect(page).toMatch(/import \{ creatorLastmod \} from '\.\.\/\.\.\/\.\.\/lib\/sitemapLastmod';/);
    const node = page.slice(page.indexOf("'@type': 'ProfilePage'"));
    expect(node.length).toBeGreaterThan(0);
    const body = node.slice(0, node.indexOf('mainEntity'));
    expect(body).toMatch(/dateModified:\s*creatorLastmod\(data\.latestModCreatedAt\)/);
  });

  it('the JSON-LD builder never invents a date from "now"', () => {
    const builder = page.slice(page.indexOf('function buildJsonLd'), page.indexOf('export default'));
    expect(builder.length).toBeGreaterThan(100);
    expect(builder).not.toMatch(/new Date\(|toISOString|\d{4}-\d{2}-\d{2}/);
  });
});
