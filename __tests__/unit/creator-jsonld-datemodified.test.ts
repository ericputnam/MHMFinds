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
import {
  CREATOR_TEMPLATE_LASTMOD,
  creatorDateModified,
  creatorLastmod,
  toJsonLdDateTime,
} from '../../lib/sitemapLastmod';
import { readdirSync, statSync } from 'fs';

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

  it('the ProfilePage node emits dateModified: creatorDateModified(data.latestModCreatedAt)', () => {
    expect(page).toMatch(/import \{ creatorDateModified \} from '\.\.\/\.\.\/\.\.\/lib\/sitemapLastmod';/);
    const node = page.slice(page.indexOf("'@type': 'ProfilePage'"));
    expect(node.length).toBeGreaterThan(0);
    const body = node.slice(0, node.indexOf('mainEntity'));
    expect(body).toMatch(/dateModified:\s*creatorDateModified\(data\.latestModCreatedAt\)/);
  });

  it('the JSON-LD builder never invents a date from "now"', () => {
    const builder = page.slice(page.indexOf('function buildJsonLd'), page.indexOf('export default'));
    expect(builder.length).toBeGreaterThan(100);
    expect(builder).not.toMatch(/new Date\(|toISOString|\d{4}-\d{2}-\d{2}/);
  });
});

/**
 * Search Console, 2026-11-07: "Invalid datetime value for \"dateModified\""
 * on Profile pages. Google types ProfilePage dateCreated/dateModified as
 * DateTime; E355 emitted the bare YYYY-MM-DD sitemap stamp. The JSON-LD now
 * carries the same day as a full ISO 8601 DateTime with an explicit offset.
 */
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

describe('ProfilePage dateModified is an ISO 8601 DateTime (Search Console 2026-11-07)', () => {
  it('creatorDateModified is a full DateTime on the same day as the sitemap lastmod', () => {
    for (const latest of [null, undefined, '2026-01-29T10:00:00.000Z', new Date('2099-01-02T23:30:00Z')]) {
      const dt = creatorDateModified(latest);
      expect(dt).toMatch(ISO_DATETIME);
      expect(Number.isNaN(Date.parse(dt))).toBe(false);
      expect(dt.slice(0, 10)).toBe(creatorLastmod(latest));
    }
    expect(creatorDateModified(null)).toBe(`${CREATOR_TEMPLATE_LASTMOD}T00:00:00+00:00`);
  });

  it('toJsonLdDateTime rejects anything that is not a YYYY-MM-DD stamp', () => {
    expect(toJsonLdDateTime('2026-11-07')).toBe('2026-11-07T00:00:00+00:00');
    expect(() => toJsonLdDateTime('')).toThrow();
    expect(() => toJsonLdDateTime('2026-11-07T00:00:00Z')).toThrow();
  });

  // Every ProfilePage node in app/ and components/, not just this one page:
  // its dateModified must not be fed by a date-only helper or literal.
  it('no ProfilePage node in app/ or components/ feeds dateModified a date-only value', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(tsx?|jsx?)$/.test(name)) files.push(full);
      }
    };
    walk(path.join(ROOT, 'app'));
    walk(path.join(ROOT, 'components'));
    const nodes: Array<{ file: string; body: string }> = [];
    for (const file of files) {
      const src = stripComments(readFileSync(file, 'utf8'));
      let i = src.indexOf("'@type': 'ProfilePage'");
      while (i !== -1) {
        nodes.push({ file, body: src.slice(i, i + 600) });
        i = src.indexOf("'@type': 'ProfilePage'", i + 1);
      }
    }
    expect(nodes.length).toBeGreaterThan(0); // vacuity guard
    for (const { file, body } of nodes) {
      const m = body.match(/dateModified:\s*([^,\n]+)/);
      if (!m) continue;
      const expr = m[1];
      expect(expr, path.relative(ROOT, file)).not.toMatch(/Lastmod\(|toDateStamp\(|^['"`]\d{4}-\d{2}-\d{2}['"`]$|split\('T'\)|slice\(0,\s*10\)/);
    }
  });
});
