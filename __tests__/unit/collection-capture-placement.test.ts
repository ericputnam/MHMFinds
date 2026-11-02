/**
 * E323 (Cass, 2026-11-02): the collection hub's email capture renders directly
 * under the 48-card grid, not as the last thing on the page.
 *
 * Before E323 the form came after 60 more-links, related collections and the
 * creators block: 2,009 sessions / 4,387 views on hubs → 1 newsletter_signup
 * (GA4 10-25→10-31). This guard pins the placement and the ad-safety rules:
 *   - sibling of <LauncherGrid> (the grid owns the .mv-ads container; a
 *     sibling does not change in-content ad geometry),
 *   - before <CollectionMoreLinks>, so it is above the long link list,
 *   - inside the main column, before <aside id="secondary">,
 *   - this file never names .mv-ads itself.
 * Comments are stripped first: the file's own comments quote these markers.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const stripComments = (s: string) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const client = stripComments(
  readFileSync(join(ROOT, 'app/games/[game]/[topic]/CollectionPageClient.tsx'), 'utf8'),
);

describe('E323 collection-page capture placement', () => {
  const capture = client.indexOf('aria-labelledby="collection-news-heading"');
  const form = client.indexOf('<NewsletterSignup source="collection-page"');
  const gridEnd = client.indexOf('/>', client.indexOf('<LauncherGrid'));
  const more = client.indexOf('<CollectionMoreLinks');
  const related = client.indexOf('aria-labelledby="related-collections-heading"');
  const creators = client.indexOf('aria-labelledby="collection-creators-heading"');
  const aside = client.indexOf('<aside');

  it('finds every landmark (vacuity guard)', () => {
    for (const at of [capture, form, gridEnd, more, related, creators, aside]) {
      expect(at).toBeGreaterThan(-1);
    }
    expect(client.split('<NewsletterSignup source="collection-page"').length - 1).toBe(1);
  });

  it('renders after the grid closes and before the more-links, related and creators blocks', () => {
    expect(capture).toBeGreaterThan(gridEnd);
    expect(capture).toBeLessThan(more);
    expect(capture).toBeLessThan(related);
    expect(capture).toBeLessThan(creators);
    expect(form).toBeGreaterThan(capture);
    expect(form).toBeLessThan(more);
  });

  it('stays in the main column, before the ad aside, and never names .mv-ads', () => {
    expect(capture).toBeLessThan(aside);
    expect(capture).toBeLessThan(client.lastIndexOf('</div>', aside));
    expect(client).not.toMatch(/mv-ads/);
  });
});
