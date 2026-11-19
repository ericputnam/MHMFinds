/**
 * E435 (Nova, 2026-11-19): /creator/[slug]/ links to the creator's own
 * Patreon / Tumblr / TSR / site, derived from the mods' download and source
 * URLs, and the ProfilePage Person carries them as sameAs.
 *
 * Run red first against pre-fix origin/main: section 1 fails there because
 * lib/creatorOfficialLinks.ts does not exist; sections 2 and 3 fail because
 * the page passes no `officialLinks`, builds no `sameAs`, and the client
 * renders no `creator-official-links` row.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  DENY_DOMAINS,
  MAX_OFFICIAL_LINKS,
  MIN_SITE_MODS,
  classifyOfficialUrl,
  creatorOfficialLinks,
  isDeniedHost,
} from '../../lib/creatorOfficialLinks';
import { CREATOR_LINK_CLICK_EVENT, GA4_SURFACE_PARAM } from '../../lib/analytics/gtag';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const mod = (id: string, downloadUrl: string | null, sourceUrl: string | null = null) => ({
  id,
  downloadUrl,
  sourceUrl,
});

describe('1. classifyOfficialUrl — what names a creator', () => {
  it('Patreon: vanity and /c/vanity resolve, posts and user ids do not', () => {
    expect(classifyOfficialUrl('https://www.patreon.com/madlen')).toEqual({
      platform: 'patreon',
      label: 'Patreon',
      href: 'https://www.patreon.com/madlen',
    });
    expect(classifyOfficialUrl('https://patreon.com/c/seoulsoulsims/posts')?.href).toBe(
      'https://www.patreon.com/seoulsoulsims',
    );
    expect(classifyOfficialUrl('https://www.patreon.com/posts/kobe-sweats-135179830')).toBeNull();
    expect(classifyOfficialUrl('https://www.patreon.com/user?u=75940181')).toBeNull();
    expect(classifyOfficialUrl('https://www.patreon.com/join/madlen')).toBeNull();
  });

  it('Tumblr: blog subdomain and www.tumblr.com/<blog> resolve, media hosts do not', () => {
    expect(classifyOfficialUrl('https://madlensims.tumblr.com/post/123/x')?.href).toBe(
      'https://madlensims.tumblr.com/',
    );
    expect(classifyOfficialUrl('https://www.tumblr.com/madlensims/123/x')?.href).toBe(
      'https://madlensims.tumblr.com/',
    );
    expect(classifyOfficialUrl('https://64.media.tumblr.com/abc/def.png')).toBeNull();
    expect(classifyOfficialUrl('https://www.tumblr.com/tagged/sims4cc')).toBeNull();
    expect(classifyOfficialUrl('https://t.umblr.com/redirect?z=x')).toBeNull();
  });

  it('TSR: only /members/<name> and /artists/<name> name the creator', () => {
    expect(classifyOfficialUrl('https://www.thesimsresource.com/members/SIMcredible/downloads/')).toEqual({
      platform: 'tsr',
      label: 'The Sims Resource',
      href: 'https://www.thesimsresource.com/members/SIMcredible/',
    });
    expect(classifyOfficialUrl('https://www.thesimsresource.com/artists/orchiona/')?.href).toBe(
      'https://www.thesimsresource.com/artists/orchiona/',
    );
    expect(classifyOfficialUrl('https://www.thesimsresource.com/downloads/details/id/123')).toBeNull();
  });

  it('own site: origin only, denied hosts (exact or dot-suffix) never', () => {
    expect(classifyOfficialUrl('https://seoul-soul.com/2024/some-post/?x=1')).toEqual({
      platform: 'site',
      label: 'seoul-soul.com',
      href: 'https://seoul-soul.com/',
    });
    for (const u of [
      'https://musthavemods.com/x',
      'https://simsfinds.com/x',
      'https://www.simfileshare.net/download/1',
      'https://files.simfileshare.net/download/1',
      'https://drive.google.com/file/d/x',
      'https://legacy.curseforge.com/members/x',
      'https://www.amazon.com/dp/x',
      'https://href.li/?https://x.com',
      'https://www.youtube.com/@creator',
      'https://modcollective.gg/x',
      'https://redbubbleus.sjv.io/abc',
      'https://store.steampowered.com/app/1',
      'https://www.humblebundle.com/store/x',
      'https://kiara.wpcomstaging.com/x',
    ]) {
      expect(classifyOfficialUrl(u), u).toBeNull();
    }
    expect(isDeniedHost('files.simfileshare.net')).toBe(true);
    expect(isDeniedHost('notsimfileshare.net')).toBe(false);
  });

  it('rejects non-http, empty and malformed values', () => {
    expect(classifyOfficialUrl(null)).toBeNull();
    expect(classifyOfficialUrl('')).toBeNull();
    expect(classifyOfficialUrl('mailto:x@y.z')).toBeNull();
    expect(classifyOfficialUrl('not a url')).toBeNull();
    expect(classifyOfficialUrl('javascript:alert(1)')).toBeNull();
  });

  it('the deny list has no www. prefix and no duplicates', () => {
    expect(DENY_DOMAINS.length).toBeGreaterThan(30);
    expect(new Set(DENY_DOMAINS).size).toBe(DENY_DOMAINS.length);
    for (const d of DENY_DOMAINS) expect(d.startsWith('www.'), d).toBe(false);
  });
});

describe('2. creatorOfficialLinks — aggregation over a page', () => {
  it('counts distinct mods per href, sorts by mods then platform, caps at MAX', () => {
    const links = creatorOfficialLinks([
      mod('a', 'https://www.patreon.com/posts/x-1', 'https://madlensims.tumblr.com/post/1'),
      mod('b', 'https://www.patreon.com/madlen', 'https://madlensims.tumblr.com/post/2'),
      mod('c', 'https://www.patreon.com/madlen', 'https://www.patreon.com/madlen'),
      mod('d', 'https://www.thesimsresource.com/members/Madlen/downloads/1'),
      mod('e', 'https://madlen-cc.com/a', 'https://madlen-cc.com/b'),
      mod('f', 'https://madlen-cc.com/c'),
      mod('g', 'https://one-off-shop.example/x'),
    ]);
    expect(links.map((l) => [l.platform, l.mods])).toEqual([
      ['patreon', 2],
      ['tumblr', 2],
      ['site', 2],
      ['tsr', 1],
    ]);
    expect(links.length).toBeLessThanOrEqual(MAX_OFFICIAL_LINKS);
    expect(links.find((l) => l.label === 'one-off-shop.example')).toBeUndefined();
  });

  it(`an own-site link needs ${MIN_SITE_MODS} distinct mods; platform vanities need one`, () => {
    expect(creatorOfficialLinks([mod('a', 'https://creator.example/p1', 'https://creator.example/p2')])).toEqual([]);
    expect(creatorOfficialLinks([mod('a', 'https://www.patreon.com/x1')])).toHaveLength(1);
  });

  it('excludes the claimed profile website host (rendered on its own line)', () => {
    const mods = [mod('a', 'https://creator.example/1'), mod('b', 'https://creator.example/2')];
    expect(creatorOfficialLinks(mods)).toHaveLength(1);
    expect(creatorOfficialLinks(mods, 'https://www.creator.example/about')).toEqual([]);
  });

  it('drops a platform whose identity is ambiguous under one author string', () => {
    // The junk author "Top" (production, 2026-11-19) pointed at two TSR members, 1 mod each.
    expect(
      creatorOfficialLinks([
        mod('a', 'https://www.thesimsresource.com/members/Beto_ae0/downloads/1'),
        mod('b', 'https://www.thesimsresource.com/members/Dissia/downloads/2'),
      ]),
    ).toEqual([]);
    // A clear leader (>= AMBIGUITY_RATIO x the runner-up) survives alone.
    const links = creatorOfficialLinks([
      mod('a', 'https://www.patreon.com/leader'),
      mod('b', 'https://www.patreon.com/leader'),
      mod('c', 'https://www.patreon.com/someone-else'),
    ]);
    expect(links.map((l) => l.href)).toEqual(['https://www.patreon.com/leader']);
    // Other platforms are untouched by one platform's ambiguity.
    expect(
      creatorOfficialLinks([
        mod('a', 'https://www.thesimsresource.com/members/X/'),
        mod('b', 'https://www.thesimsresource.com/members/Y/'),
        mod('c', 'https://xy.tumblr.com/'),
      ]).map((l) => l.platform),
    ).toEqual(['tumblr']);
  });

  it('is deterministic across input order', () => {
    const a = [mod('1', 'https://x1.tumblr.com/p'), mod('2', 'https://www.patreon.com/x1')];
    expect(creatorOfficialLinks(a)).toEqual(creatorOfficialLinks([...a].reverse()));
  });
});

describe('3. wiring — page, JSON-LD and client', () => {
  const page = stripComments(read('app/creator/[slug]/page.tsx'));
  const client = stripComments(read('app/creator/[slug]/CreatorPageClient.tsx'));

  it('the page derives links from the page mods and passes them to the client', () => {
    expect(page).toMatch(/creatorOfficialLinks\(data\.mods, data\.profile\?\.website\)/);
    expect(page).toMatch(/officialLinks=\{officialLinks\}/);
  });

  it('the Person carries sameAs only when there is something to say', () => {
    expect(page).toMatch(/sameAs\.length > 0 \? \{ sameAs \} : \{\}/);
  });

  it('the client renders the row in the hero, outside the ad anchor, with the click event', () => {
    const row = client.indexOf('data-testid="creator-official-links"');
    const aside = client.indexOf('id="secondary"');
    const headerClose = client.indexOf('</header>');
    expect(row).toBeGreaterThan(-1);
    expect(row).toBeLessThan(headerClose);
    expect(row).toBeLessThan(aside);
    expect(client).toMatch(/trackCreatorLinkClick\(/);
    expect(client).toMatch(/rel="noopener noreferrer nofollow"/);
  });

  it('the click event rides on the surface param, never on a traffic-source param', () => {
    const gtag = stripComments(read('lib/analytics/gtag.ts'));
    expect(CREATOR_LINK_CLICK_EVENT).toBe('creator_link_click');
    expect(GA4_SURFACE_PARAM).toBe('content_type');
    const fn = gtag.slice(gtag.indexOf('export function trackCreatorLinkClick'));
    const body = fn.slice(0, fn.indexOf('\n}\n'));
    expect(body).toMatch(/\[GA4_SURFACE_PARAM\]: 'creator-page'/);
    expect(body).not.toMatch(/\bsource\s*:/);
  });
});
