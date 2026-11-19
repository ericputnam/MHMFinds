/**
 * Image-sitemap entries (E431 / E432, Pip, 2026-11-19).
 *
 * Google Images sent 1,624 clicks on 151,657 impressions in the 28 days to
 * 2026-11-16 (GSC type=image), and 1,465 of those clicks landed on WordPress
 * posts. The 17,438 SFW verified mod pages — every one with a thumbnail that
 * is already the page's og:image — took 116 clicks across 1,447 pages, and
 * the 51 collection hubs took 36, because no sitemap told Google which image
 * belongs to which Next.js URL. These helpers add `<image:image>` children to
 * `/sitemap-mods.xml` (one thumbnail per mod) and `/sitemap-nextjs.xml`
 * (the top card images per hub, in the hub's own order).
 *
 * Rules:
 * - Only absolute http(s) URLs are emitted; a relative or malformed
 *   thumbnail produces no `<image:image>` rather than an invalid sitemap.
 * - Everything inside the element is XML-escaped (titles carry `&` and `<`).
 * - The hub query never throws: a crawler surface degrades to no images,
 *   never to a 500.
 */

import { buildWhereClause, getCollection } from '../collections';
import { prisma } from '../prisma';

export const IMAGE_SITEMAP_NS = 'http://www.google.com/schemas/sitemap-image/1.1';

/** Card images per collection hub in /sitemap-nextjs.xml (the hub's first grid row set). */
export const HUB_IMAGE_COUNT = 12;

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** True for an absolute http(s) URL — the only kind an image sitemap may carry. */
export function isSitemapImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export type SitemapImage = { loc: string; title?: string | null };

/**
 * `<image:image>` blocks for one `<url>`, indented to sit inside it.
 * Returns '' when no image qualifies, so the caller can splice it in
 * unconditionally.
 */
export function imageEntries(images: ReadonlyArray<SitemapImage>, indent = '    '): string {
  const blocks: string[] = [];
  for (const img of images) {
    if (!isSitemapImageUrl(img.loc)) continue;
    const title = typeof img.title === 'string' ? img.title.trim() : '';
    blocks.push(
      `${indent}<image:image>\n` +
        `${indent}  <image:loc>${escapeXml(img.loc)}</image:loc>\n` +
        (title ? `${indent}  <image:title>${escapeXml(title)}</image:title>\n` : '') +
        `${indent}</image:image>`,
    );
  }
  return blocks.join('\n');
}

/**
 * The thumbnails a collection hub shows first — same where-clause and
 * ordering as app/games/[game]/[topic]/page.tsx (downloadCount desc,
 * createdAt desc), so the sitemap names images the page actually renders.
 * Never throws.
 */
export async function collectionHubImages(
  gameSlug: string,
  topicSlug: string,
  take = HUB_IMAGE_COUNT,
): Promise<SitemapImage[]> {
  const collection = getCollection(gameSlug, topicSlug);
  if (!collection) return [];
  try {
    const rows = await prisma.mod.findMany({
      where: {
        ...buildWhereClause(collection.filter),
        gameVersion: collection.game,
        isNSFW: false,
        thumbnail: { not: null },
      },
      orderBy: [{ downloadCount: 'desc' }, { createdAt: 'desc' }],
      take,
      select: { thumbnail: true, title: true },
    });
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r) => isSitemapImageUrl(r.thumbnail))
      .map((r) => ({ loc: r.thumbnail as string, title: r.title }));
  } catch {
    return [];
  }
}
