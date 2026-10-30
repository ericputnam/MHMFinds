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
    // Launcher classes (components/launcher/launcher.css): the collection
    // page renders inside the .lx shell since 2026-10-28.
    <section
      className="below-sec"
      aria-labelledby="collection-more-links-heading"
      data-testid="collection-more-links"
    >
      <div className="sec-head">
        <h2 id="collection-more-links-heading">More {title}</h2>
      </div>
      <ul className="more-links">
        {links.map((link) => (
          <li key={link.id}>
            <a href={modHref(link.id)}>{link.title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default CollectionMoreLinks;
