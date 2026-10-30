/**
 * "Featured on MustHaveMods" creator badge (Nova, E269, 2026-10-25).
 *
 * Offline, source-level + pure-lib. Red on the pre-E269 tree: the lib, the
 * page, the component and both SVGs do not exist, and the hero carries no
 * badge link or verified label (cases marked [pre-fix red]).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  BADGE_ALT,
  BADGE_HEIGHT,
  BADGE_IMAGE_PATH,
  BADGE_SNIPPET_KINDS,
  BADGE_UTM_MEDIUM,
  BADGE_UTM_SOURCE,
  BADGE_VARIANTS,
  BADGE_WIDTH,
  SITE_ORIGIN,
  badgeEmbedHtml,
  badgeEmbedMarkdown,
  badgeHref,
  badgeLinkUrl,
  badgeSnippet,
} from '../../lib/creatorBadge';

const ROOT = path.resolve(__dirname, '../..');

/** Same parse as middleware-route-prefixes.test.ts (not imported: importing a test file re-registers its suites). */
function parseNextjsPrefixes(source: string): Set<string> {
  const start = source.indexOf('const NEXTJS_PREFIXES');
  const end = source.indexOf(']);', start);
  const body = source.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  return new Set(Array.from(body.matchAll(/['"]([^'"]+)['"]/g)).map((m) => m[1]));
}
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const PAGE = 'app/creator/[slug]/badge/page.tsx';
const COMPONENT = 'components/creator/CreatorBadgeEmbed.tsx';
const HERO = 'app/creator/[slug]/CreatorPageClient.tsx';
const LIB = 'lib/creatorBadge.ts';

describe('lib/creatorBadge — link back + attribution', () => {
  it('badgeHref nests under the creator page with a trailing slash (trailingSlash: true)', () => {
    expect(badgeHref('ravasheen')).toBe('/creator/ravasheen/badge/');
  });

  it('badgeLinkUrl points at the creator page and tags the session as creator-badge', () => {
    const u = new URL(badgeLinkUrl('little-ms-sam'));
    expect(u.origin).toBe(SITE_ORIGIN);
    expect(u.pathname).toBe('/creator/little-ms-sam/'); // trailing slash: no 308 on the way in
    expect(u.searchParams.get('utm_source')).toBe(BADGE_UTM_SOURCE);
    expect(u.searchParams.get('utm_medium')).toBe(BADGE_UTM_MEDIUM);
    expect(u.searchParams.get('utm_campaign')).toBe('little-ms-sam');
    expect(BADGE_UTM_SOURCE).toBe('creator-badge'); // the GA4 sessionSource the keep-if reads
  });

  it('the HTML embed is a plain anchor + image: alt, fixed size, no script/iframe/handlers', () => {
    const html = badgeEmbedHtml('ravasheen', 'Ravasheen', 'dark');
    expect(html.startsWith('<a href="https://musthavemods.com/creator/ravasheen/?utm_source=creator-badge')).toBe(true);
    expect(html).toContain(`alt="${BADGE_ALT}"`);
    expect(html).toContain(`width="${BADGE_WIDTH}"`);
    expect(html).toContain(`height="${BADGE_HEIGHT}"`);
    expect(html).toContain(`src="${SITE_ORIGIN}${BADGE_IMAGE_PATH.dark}"`);
    expect(html).not.toMatch(/<script|<iframe|\son\w+=/i);
  });

  it('escapes a display name with quotes/angle brackets in the title attribute', () => {
    const html = badgeEmbedHtml('x', `Bob "The <Sim>" & Co`, 'light');
    expect(html).toContain('title="Bob &quot;The &lt;Sim&gt;&quot; &amp; Co on MustHaveMods"');
    expect(html).not.toContain('"The <Sim>"');
  });

  it('markdown form carries the same image and link', () => {
    const md = badgeEmbedMarkdown('ravasheen', 'light');
    expect(md).toBe(
      `[![${BADGE_ALT}](${SITE_ORIGIN}${BADGE_IMAGE_PATH.light})](${badgeLinkUrl('ravasheen')})`,
    );
  });

  it('badgeSnippet covers every kind and every variant', () => {
    for (const kind of BADGE_SNIPPET_KINDS) {
      for (const variant of BADGE_VARIANTS) {
        const s = badgeSnippet(kind, 'ravasheen', 'Ravasheen', variant);
        expect(s).toContain(badgeLinkUrl('ravasheen'));
        if (kind !== 'link') expect(s).toContain(BADGE_IMAGE_PATH[variant]);
      }
    }
  });
});

describe('badge assets live in public/ at the root with a dotted name (never proxied to WordPress)', () => {
  for (const variant of BADGE_VARIANTS) {
    const rel = BADGE_IMAGE_PATH[variant];
    it(`${rel} exists and is the badge [pre-fix red]`, () => {
      const file = path.join(ROOT, 'public', rel);
      expect(existsSync(file)).toBe(true);
      const svg = readFileSync(file, 'utf8');
      expect(svg).toContain('<svg');
      expect(svg).toContain('Featured on MustHaveMods');
      expect(svg).toContain(`width="${BADGE_WIDTH}"`);
      expect(svg).toContain(`height="${BADGE_HEIGHT}"`);
      expect(svg).not.toMatch(/<script/i);
    });

    it(`${rel} bypasses the middleware catch-all by construction (single dotted segment)`, () => {
      const segments = rel.split('/').filter(Boolean);
      expect(segments).toHaveLength(1);
      expect(segments[0]).toContain('.');
    });
  }
});

describe('badge page — nested route, noindex, no ad anchor, no new prefix needed', () => {
  it('exists under app/creator/[slug]/ and there is no new top-level app/ directory for it [pre-fix red]', () => {
    expect(existsSync(path.join(ROOT, PAGE))).toBe(true);
    expect(existsSync(path.join(ROOT, 'app/badge'))).toBe(false);
    expect(existsSync(path.join(ROOT, 'app/badges'))).toBe(false);
    // 'creator' already covers it; nothing new to add to middleware.
    expect(parseNextjsPrefixes(read('middleware.ts')).has('creator')).toBe(true);
  });

  it('is noindex and reuses the gated creator loader (junk/thin slugs 404 the same way)', () => {
    const src = stripComments(read(PAGE));
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false/);
    expect(src).toContain("from '../../../../lib/creators'");
    expect(src).toContain('getCreatorPageData(slug)');
    expect(src).toContain('notFound()');
  });

  it('declares no ad sidebar and no .mv-ads (utility page, outside PAGES_WITH_SIDEBAR)', () => {
    const src = stripComments(read(PAGE));
    expect(src).not.toContain('id="secondary"');
    expect(src).not.toMatch(/\bmv-ads\b/);
    expect(stripComments(read(COMPONENT))).not.toContain('id="secondary"');
  });

  it('renders the preview with next/image, never a raw <img>', () => {
    const comp = stripComments(read(COMPONENT));
    expect(comp).toContain("from 'next/image'");
    expect(comp).not.toMatch(/<img\b/);
    expect(stripComments(read(PAGE))).not.toMatch(/<img\b/);
  });

  it('links the unclaimed creator to the existing claim form (ownership proof = badge on their page)', () => {
    const src = stripComments(read(PAGE));
    expect(src).toContain("from '../../../../lib/creatorClaim'");
    expect(src).toContain('claimHref(data.slug)');
  });

  it('contains no agreement / money wording (creator agreements and payouts are Tier 2)', () => {
    const texts = [PAGE, COMPONENT, LIB].map((p) => stripComments(read(p))).join('\n');
    expect(texts).not.toMatch(/\b(agree|agreement|terms of|accept(s|ed)? (the|these)|rev(enue)?[- ]share|payout|paid placement)\b/i);
    expect(texts).not.toMatch(/\$\d/);
  });
});

describe('creator page hero — badge link + visible verified label [pre-fix red]', () => {
  const hero = stripComments(read(HERO));

  it('links every creator page to its badge page', () => {
    expect(hero).toContain("from '../../../lib/creatorBadge'");
    expect(hero).toContain('href={badgeHref(data.slug)}');
    expect(hero).toContain('data-testid="creator-badge-link"');
  });

  it('the validated marker is fed by the existing isVerified field and has a visible label', () => {
    expect(hero).toContain('data.profile?.isVerified');
    expect(hero).toContain('data-testid="creator-verified-mark"');
    expect(hero).toContain('Verified creator');
    // Guard: no new field invented for "validated" — isVerified is the only flag read.
    expect(hero).not.toMatch(/isValidated|validatedAt|isFeaturedCreator/);
  });

  it('the badge link sits in the hero <header>, before the ad-sidebar grid', () => {
    const link = hero.indexOf('data-testid="creator-badge-link"');
    const headerClose = hero.indexOf('</header>');
    const aside = hero.indexOf('id="secondary"');
    expect(link).toBeGreaterThan(0);
    expect(link).toBeLessThan(headerClose);
    expect(headerClose).toBeLessThan(aside);
  });
});
