/**
 * E380 (Cass, 2026-11-09): the collection-hub email block also offers a free
 * account, attributed as `collection-page` end to end.
 *
 * Guards:
 *   - the link is inside the capture <section> (after its heading, before the
 *     NewsletterSignup form) — so it inherits E323's placement guard: under
 *     the grid, outside .mv-ads, before <aside id="secondary">;
 *   - the href comes from collectionAccountHref(collectionHref(collection)),
 *     which carries mode=signup, ref=collection-page and a same-site redirect
 *     back to the hub, with the trailing slash on /sign-in/;
 *   - the source constant equals the email form's source, so both legs read
 *     on one row (imported, not restated);
 *   - the sign-in page still copies `ref` into the GA4 sign_up event.
 * Comments are stripped first: comments in this repo quote what they warn about.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  COLLECTION_CAPTURE_SOURCE,
  COLLECTION_ACCOUNT_CTA_EVENT,
  collectionAccountHref,
} from '../../lib/capture/collectionAccountOffer';

const ROOT = join(__dirname, '..', '..');
const stripComments = (s: string) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const client = stripComments(
  readFileSync(join(ROOT, 'app/games/[game]/[topic]/CollectionPageClient.tsx'), 'utf8'),
);
const signIn = stripComments(readFileSync(join(ROOT, 'app/sign-in/page.tsx'), 'utf8'));

describe('E380 collection-hub account offer', () => {
  it('builds a signup href with the hub source and a return to the hub', () => {
    const href = collectionAccountHref('/games/sims-4/hair-cc/');
    expect(href.startsWith('/sign-in/?')).toBe(true);
    const q = new URLSearchParams(href.split('?')[1]);
    expect(q.get('mode')).toBe('signup');
    expect(q.get('ref')).toBe(COLLECTION_CAPTURE_SOURCE);
    expect(q.get('redirect')).toBe('/games/sims-4/hair-cc/');
  });

  it('shares its source with the hub email form', () => {
    expect(COLLECTION_CAPTURE_SOURCE).toBe('collection-page');
    expect(client).toContain(`<NewsletterSignup source="${COLLECTION_CAPTURE_SOURCE}"`);
    expect(COLLECTION_ACCOUNT_CTA_EVENT).toBe('account_cta_click');
  });

  it('renders the link inside the capture section, before the email form', () => {
    const section = client.indexOf('aria-labelledby="collection-news-heading"');
    const link = client.indexOf('collectionAccountHref(collectionHref(collection))');
    const form = client.indexOf('<NewsletterSignup source="collection-page"');
    const more = client.indexOf('<CollectionMoreLinks');
    for (const at of [section, link, form, more]) expect(at).toBeGreaterThan(-1);
    expect(link).toBeGreaterThan(section);
    expect(link).toBeLessThan(form);
    expect(link).toBeLessThan(more);
    expect(client.split('collectionAccountHref(').length - 1).toBe(1);
  });

  it('fires the click event with the hub source', () => {
    expect(client).toMatch(/onClick=\{handleAccountCtaClick\}/);
    expect(client).toMatch(/COLLECTION_ACCOUNT_CTA_EVENT,\s*\{\s*source:\s*COLLECTION_CAPTURE_SOURCE\s*\}/);
  });

  it('the sign-in page still copies ref into sign_up', () => {
    expect(signIn).toMatch(/'sign_up'/);
    expect(signIn).toMatch(/ref:\s*searchParams\?\.get\('ref'\)/);
  });
});
