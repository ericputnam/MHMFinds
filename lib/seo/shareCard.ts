import type { Metadata } from 'next';
import { CATALOG_FINDS } from './catalogCount';

/**
 * Per-route share card: og:title / og:description / og:url / og:image and the
 * matching twitter:* tags, from one call (E337, Pip, 2026-11-05).
 *
 * Why: Next's metadata merge replaces a child's `openGraph` object wholesale.
 * A route that sets openGraph without `images` ships no og:image at all
 * (/play/, /creator/, /creator/<slug>/, /games/<game>/ on 2026-11-05), and a
 * route that sets no openGraph inherits the ROOT one, so /about/, /submit-mod/
 * and /top-creators/ unfurled with the homepage's title and
 * og:url=https://musthavemods.com/. Facebook, Discord and iMessage treat
 * og:url as the identity of a share, so those links were cards for the
 * homepage. `__tests__/unit/route-share-cards.test.ts` walks app/ and fails
 * any indexable route whose metadata does not come from here (or from
 * collectionMetadata / the mod-detail builder, which carry their own image).
 */
export const SITE_SHARE_IMAGE = '/og-image.jpg';
const SITE_SHARE_IMAGE_ALT = `MustHaveMods: ${CATALOG_FINDS} Sims 4 mods and CC`;

export interface ShareCardInput {
  title: string;
  description: string;
  /** Absolute canonical URL of the route, with trailing slash. */
  url: string;
  /** Absolute https image; anything else falls back to the site card. */
  image?: string | null;
  imageAlt?: string;
  type?: 'website' | 'profile' | 'article';
}

export function shareImageFor(image?: string | null): string {
  return image && image.startsWith('https://') ? image : SITE_SHARE_IMAGE;
}

export function shareCard(input: ShareCardInput): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = shareImageFor(input.image);
  const alt = image === SITE_SHARE_IMAGE ? SITE_SHARE_IMAGE_ALT : input.imageAlt || input.title;
  const imageEntry =
    image === SITE_SHARE_IMAGE ? { url: image, width: 1200, height: 630, alt } : { url: image, alt };
  return {
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.url,
      siteName: 'MustHaveMods',
      type: input.type ?? 'website',
      images: [imageEntry],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}
