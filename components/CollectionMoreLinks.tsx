/**
 * CollectionMoreLinks — a server-renderable list of plain anchors to the
 * mods ranked just below a collection page's first-paint grid (E84).
 *
 * Deliberately a plain `<a>` list, not `next/link`: these exist so that
 * crawlers find the next 60 mods of the collection in the initial HTML.
 * A full navigation on click is fine for a discovery link.
 *
 * Placement rule: this is a sibling of the mod grid inside the main
 * column. It must never be rendered inside or adjacent to
 * `<aside id="secondary">` (see CLAUDE.md, Mediavine ad anchors).
 */

import React from 'react';
import { modHref, type ModLink } from '../lib/seo/collectionMoreLinks';

interface CollectionMoreLinksProps {
  title: string;
  links: ModLink[];
}

export function CollectionMoreLinks({ title, links }: CollectionMoreLinksProps) {
  if (links.length === 0) return null;

  return (
    <section
      className="mt-12 pt-8 border-t border-white/10"
      aria-labelledby="collection-more-links-heading"
      data-testid="collection-more-links"
    >
      <h2
        id="collection-more-links-heading"
        className="text-2xl font-bold text-white mb-4"
      >
        More {title}
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
        {links.map((link) => (
          <li key={link.id} className="min-w-0">
            <a
              href={modHref(link.id)}
              className="block truncate text-slate-300 hover:text-sims-pink transition-colors"
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default CollectionMoreLinks;
