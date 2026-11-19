/**
 * Creator official links — the creator's own Patreon / Tumblr / TSR / site,
 * derived from the download and source URLs of the mods already on their
 * /creator/[slug]/ page (Nova, E435, 2026-11-19).
 *
 * Why: only a claimed CreatorProfile (23 of ~750 pages) carries an off-site
 * link today, so 97% of creator pages name a creator Google and ChatGPT
 * cannot tie to the creator's real home. The catalog already knows it: run
 * over production on 2026-11-19 (read-only, top 48 SFW mods per author
 * string, 799 author strings with >=5 SFW mods) this function returns >=1
 * link for 452 of them — tumblr 214, TSR 202, patreon 101, own site 50.
 * The page gets a visible "Find <creator> on ..." row and the ProfilePage's
 * Person gets `sameAs`, both from in-memory data, no query.
 *
 * Pure: takes the page's mods (already SFW-filtered by getCreatorPageData,
 * top CREATOR_PAGE_SIZE by downloads), returns at most MAX_OFFICIAL_LINKS.
 * Tested by __tests__/unit/creator-official-links.test.ts.
 *
 * Rules:
 *  - Hosts are parsed with `new URL`, never substring-matched. A platform
 *    is recognised by exact host; a deny domain by exact host or dot-bounded
 *    suffix (`x.simfileshare.net`).
 *  - Patreon: only a vanity URL (`patreon.com/<vanity>`, `patreon.com/c/<vanity>`)
 *    names the creator; `/posts/<id>` and `/user?u=` do not, and are dropped.
 *  - Tumblr: `<blog>.tumblr.com` or `www.tumblr.com/<blog>`; media hosts
 *    (`64.media.tumblr.com`, `assets.tumblr.com`) and reserved paths are dropped.
 *  - TSR: `/members/<name>` or `/artists/<name>` only — any other TSR path is
 *    the platform, not the creator.
 *  - Own site: any host outside DENY_DOMAINS, origin only, and it must be the
 *    destination of >= MIN_SITE_MODS distinct mods (a single mod pointing at a
 *    host is more often an affiliate or aggregator than a home page).
 *  - One identity per platform: when a platform resolves to two different
 *    creators under one author string (the junk author "Top" pointed at two
 *    TSR members), the leader must hold >= AMBIGUITY_RATIO x the runner-up's
 *    mods or the whole platform is dropped — the same ambiguous-identity skip
 *    the E370 Patreon backfill used.
 *  - Nothing here is a capture surface and nothing renders inside an ad anchor.
 */

export type OfficialPlatform = 'patreon' | 'tumblr' | 'tsr' | 'site';

export interface CreatorOfficialLink {
  platform: OfficialPlatform;
  /** Visible label: "Patreon", "Tumblr", "The Sims Resource", or the bare host. */
  label: string;
  href: string;
  /** Distinct mods on the page whose URLs resolve to this link. */
  mods: number;
}

export const MAX_OFFICIAL_LINKS = 4;
/** An own-domain link needs this many distinct mods behind it. */
export const MIN_SITE_MODS = 2;
/** Two identities on one platform: keep the leader only if it has this many times the runner-up's mods. */
export const AMBIGUITY_RATIO = 2;

const PLATFORM_ORDER: readonly OfficialPlatform[] = ['patreon', 'tumblr', 'tsr', 'site'];

const PLATFORM_LABEL: Record<Exclude<OfficialPlatform, 'site'>, string> = {
  patreon: 'Patreon',
  tumblr: 'Tumblr',
  tsr: 'The Sims Resource',
};

/** Patreon path segments that are routes, not vanities. */
const PATREON_RESERVED = new Set([
  'posts', 'user', 'c', 'join', 'checkout', 'login', 'signup', 'home', 'explore', 'create',
  'bepatron', 'm', 'api', 'file', 'collection', 'collections', 'messages', 'settings', 'search',
  'policy', 'legal', 'about', 'pricing', 'product', 'cw', 'oauth2',
]);

/** Tumblr subdomains and first path segments that are not blogs. */
const TUMBLR_RESERVED = new Set([
  'www', 'assets', 'media', 'static', 'at', 'api', 'embed', 'safe', 'help', 'support',
  'blog', 'dashboard', 'search', 'tagged', 'post', 'login', 'register', 'explore',
  'communities', 'reblog', 'likes', 'following', 'settings', 'privacy', 'policy', 'tips',
]);

/**
 * Hosts that are never a creator's home: this site, aggregators, file hosts,
 * stores, URL shorteners, redirectors, path-keyed social platforms, and the
 * platforms handled above (so a non-vanity Patreon/Tumblr/TSR URL cannot fall
 * through to "own site"). Matched on the parsed host, exact or dot-suffix.
 */
export const DENY_DOMAINS: readonly string[] = [
  'musthavemods.com',
  'patreon.com',
  'tumblr.com',
  'thesimsresource.com',
  // aggregators / catalogues
  'simsfinds.com',
  'sims4downloads.net',
  'thesimscatalog.com',
  'simsdomination.com',
  'simsdom.com',
  'sims4updates.net',
  'modthesims.info',
  'curseforge.com',
  'overwolf.com',
  'nexusmods.com',
  'loverslab.com',
  'modcollective.gg',
  'mod.io',
  'ea.com',
  // file hosts
  'simfileshare.net',
  'mediafire.com',
  'mega.nz',
  'mega.io',
  'google.com',
  'dropbox.com',
  'onedrive.live.com',
  'box.com',
  'archive.org',
  'sims4studio.com',
  // stores / affiliates (seen in the 2026-11-19 production sample)
  'amazon.com',
  'amzn.to',
  'humblebundle.com',
  'sjv.io',
  'steampowered.com',
  'modrinth.com',
  'wpcomstaging.com',
  // shorteners / redirectors
  'href.li',
  't.umblr.com',
  'bit.ly',
  'tinyurl.com',
  'linktr.ee',
  'pin.it',
  // path-keyed social: the host alone names the platform, not the creator
  'pinterest.com',
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'facebook.com',
  'twitter.com',
  'x.com',
  'reddit.com',
  'discord.gg',
  'discord.com',
  'github.com',
  'ko-fi.com',
  'boosty.to',
  'twitch.tv',
  'tiktok.com',
];

function hostOf(raw: string): { host: string; url: URL } | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (!host || !host.includes('.')) return null;
  return { host, url };
}

export function isDeniedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, '');
  return DENY_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`));
}

const HANDLE = /^[a-z0-9][a-z0-9_-]{1,62}$/i;

function segments(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean);
}

/** Classify one URL; null when it names nothing official. */
export function classifyOfficialUrl(raw: string | null | undefined): Omit<CreatorOfficialLink, 'mods'> | null {
  if (!raw) return null;
  const parsed = hostOf(raw);
  if (!parsed) return null;
  const { host, url } = parsed;
  const seg = segments(url);

  if (host === 'patreon.com') {
    let vanity: string | undefined;
    if (seg[0]?.toLowerCase() === 'c' && seg[1]) vanity = seg[1];
    else if (seg[0] && !PATREON_RESERVED.has(seg[0].toLowerCase())) vanity = seg[0];
    if (!vanity || !HANDLE.test(vanity)) return null;
    return { platform: 'patreon', label: PLATFORM_LABEL.patreon, href: `https://www.patreon.com/${vanity}` };
  }

  if (host === 'tumblr.com') {
    const blog = seg[0];
    if (!blog || TUMBLR_RESERVED.has(blog.toLowerCase()) || !HANDLE.test(blog)) return null;
    return { platform: 'tumblr', label: PLATFORM_LABEL.tumblr, href: `https://${blog.toLowerCase()}.tumblr.com/` };
  }
  if (host.endsWith('.tumblr.com')) {
    const labels = host.slice(0, -'.tumblr.com'.length).split('.');
    if (labels.length !== 1) return null; // 64.media.tumblr.com and friends
    const blog = labels[0];
    if (TUMBLR_RESERVED.has(blog) || !HANDLE.test(blog)) return null;
    return { platform: 'tumblr', label: PLATFORM_LABEL.tumblr, href: `https://${blog}.tumblr.com/` };
  }

  if (host === 'thesimsresource.com') {
    const kind = seg[0]?.toLowerCase();
    const name = seg[1];
    if ((kind !== 'members' && kind !== 'artists') || !name || !HANDLE.test(name)) return null;
    return { platform: 'tsr', label: PLATFORM_LABEL.tsr, href: `https://www.thesimsresource.com/${kind}/${name}/` };
  }

  if (isDeniedHost(host)) return null;
  return { platform: 'site', label: host, href: `https://${host}/` };
}

interface LinkSourceMod {
  id: string;
  downloadUrl?: string | null;
  sourceUrl?: string | null;
}

/**
 * Official links for a creator page, from its mods. Deterministic: most mods
 * first, then platform order, then href. `exclude` drops links whose host
 * equals the given one (the claimed profile's website is rendered separately).
 */
export function creatorOfficialLinks(
  mods: readonly LinkSourceMod[],
  exclude?: string | null,
): CreatorOfficialLink[] {
  const byHref = new Map<string, CreatorOfficialLink & { modIds: Set<string> }>();
  for (const mod of mods) {
    const seen = new Set<string>();
    for (const raw of [mod.downloadUrl, mod.sourceUrl]) {
      const link = classifyOfficialUrl(raw);
      if (!link || seen.has(link.href)) continue;
      seen.add(link.href);
      const entry = byHref.get(link.href) ?? { ...link, mods: 0, modIds: new Set<string>() };
      entry.modIds.add(mod.id);
      entry.mods = entry.modIds.size;
      byHref.set(link.href, entry);
    }
  }

  const excludeHost = exclude ? hostOf(exclude)?.host ?? null : null;

  const sorted = Array.from(byHref.values())
    .filter((l) => l.platform !== 'site' || l.mods >= MIN_SITE_MODS)
    .filter((l) => !excludeHost || hostOf(l.href)?.host !== excludeHost)
    .sort((a, b) => b.mods - a.mods || a.href.localeCompare(b.href));

  // One identity per platform (see header): the first entry per platform is
  // its leader; it survives only when no runner-up comes within the ratio.
  const leaders = new Map<OfficialPlatform, CreatorOfficialLink & { modIds: Set<string> }>();
  const dropped = new Set<OfficialPlatform>();
  for (const l of sorted) {
    const leader = leaders.get(l.platform);
    if (!leader) leaders.set(l.platform, l);
    else if (leader.mods < AMBIGUITY_RATIO * l.mods) dropped.add(l.platform);
  }

  return Array.from(leaders.values())
    .filter((l) => !dropped.has(l.platform))
    .sort(
      (a, b) =>
        b.mods - a.mods ||
        PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform) ||
        a.href.localeCompare(b.href),
    )
    .slice(0, MAX_OFFICIAL_LINKS)
    .map(({ modIds: _ignored, ...rest }) => rest);
}
