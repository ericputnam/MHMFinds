/**
 * "Featured on MustHaveMods" creator badge (Nova, E269, 2026-10-25).
 *
 * Operator growth plan 10-24 ("Run — creators"): an embed creators put on
 * their own Patreon / Tumblr / CurseForge / site pages. Two jobs, one asset:
 *
 *  1. AUDIENCE — every badge is a link back to the creator's hosted page
 *     (`/creator/[slug]/`) tagged `utm_source=creator-badge`, so the sessions
 *     it sends are countable in GA4 as `sessionSource = creator-badge`
 *     (0 such sessions 2026-09-25 → 10-23, the BEFORE).
 *  2. VALIDATION — the plan asks for "proof of ownership (link back from the
 *     creator's page)" before a listing goes live. A badge on the creator's
 *     own page *is* that link back: the claim reviewer looks for it. No new
 *     schema, no auth change — `CreatorProfile.isVerified` already exists and
 *     the page already renders it (E158 `pageProfileFrom`).
 *
 * Pure helpers only (no DB, no React) so they are unit-tested offline
 * (`__tests__/unit/creator-badge.test.ts`). The page is
 * `app/creator/[slug]/badge/page.tsx`; the copy UI is
 * `components/creator/CreatorBadgeEmbed.tsx`.
 *
 * Not here on purpose: any wording a creator must "accept". A badge is a
 * picture and a link; agreements are Tier 2 (autonomy.md).
 */

import { creatorHref } from './creatorSlug';

export const SITE_ORIGIN = 'https://musthavemods.com';

/** GA4 `sessionSource` every badge click lands under. */
export const BADGE_UTM_SOURCE = 'creator-badge';
export const BADGE_UTM_MEDIUM = 'referral';

/**
 * Static assets under public/. Root-level with a dotted filename on purpose:
 * middleware.ts proxies any dot-free first path segment that is not in
 * NEXTJS_PREFIXES to WordPress, so `/badges/x.svg` would 404 on WP while
 * `/featured-on-musthavemods.svg` is served by Next (see
 * __tests__/unit/middleware-route-prefixes.test.ts for the rule).
 */
export const BADGE_VARIANTS = ['dark', 'light'] as const;
export type BadgeVariant = (typeof BADGE_VARIANTS)[number];

export const BADGE_IMAGE_PATH: Record<BadgeVariant, string> = {
  dark: '/featured-on-musthavemods.svg',
  light: '/featured-on-musthavemods-light.svg',
};

/** Intrinsic size of both SVGs; the embed sets width/height so pages don't reflow. */
export const BADGE_WIDTH = 240;
export const BADGE_HEIGHT = 56;

export const BADGE_ALT = 'Featured on MustHaveMods';

/** GA4 event fired when a creator copies an embed snippet. */
export const BADGE_COPY_EVENT = 'creator_badge_copy';

/**
 * GA4 event fired when a creator clicks through to their badge page from an
 * on-site prompt (E286). `source` is one of BADGE_CTA_SOURCES, never free text.
 */
export const BADGE_CTA_EVENT = 'creator_badge_cta';
export const BADGE_CTA_SOURCES = { dashboard: 'dashboard' } as const;

/** What the creator dashboard needs to show the "Get your badge" card. */
export interface DashboardBadge {
  href: string;
  displayName: string;
}

/**
 * The dashboard badge card (E286), decided server-side from the signed-in
 * creator's own CreatorProfile and the result of getCreatorPageData(handle).
 * Returns null — no card — unless that page actually renders for that exact
 * handle, so the card never links to a 404 (the badge page 404s whenever
 * getCreatorPageData does: an unclaimed profile with no catalog mods, or a
 * claimed one with 0 mods).
 */
export function dashboardBadge(
  profile: { handle: string } | null,
  page: { slug: string; displayName: string } | null,
): DashboardBadge | null {
  if (!profile || !profile.handle || !page) return null;
  if (page.slug !== profile.handle) return null;
  return { href: badgeHref(profile.handle), displayName: page.displayName };
}

/** Relative href of the badge page for one creator (trailing slash: next.config.js). */
export function badgeHref(slug: string): string {
  return `${creatorHref(slug)}badge/`;
}

/**
 * Absolute URL the badge links to: the creator's own hosted page, tagged so
 * GA4 attributes the session to the badge and the campaign to the creator.
 * `creatorHref` already trailing-slashes, so no 308 on the way in.
 */
export function badgeLinkUrl(slug: string): string {
  const params = new URLSearchParams({
    utm_source: BADGE_UTM_SOURCE,
    utm_medium: BADGE_UTM_MEDIUM,
    utm_campaign: slug,
  });
  return `${SITE_ORIGIN}${creatorHref(slug)}?${params.toString()}`;
}

export function badgeImageUrl(variant: BadgeVariant = 'dark'): string {
  return `${SITE_ORIGIN}${BADGE_IMAGE_PATH[variant]}`;
}

/** Minimal HTML escaping for the alt/title attributes (display names are free text). */
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * The HTML snippet a creator pastes. Plain `<a><img></a>` — Tumblr, Patreon's
 * HTML block, Blogger, WordPress and CurseForge project descriptions all
 * accept it; no script, no iframe, nothing that can run on their page.
 */
export function badgeEmbedHtml(slug: string, displayName: string, variant: BadgeVariant = 'dark'): string {
  const title = escapeAttr(`${displayName} on MustHaveMods`);
  return (
    `<a href="${badgeLinkUrl(slug)}" title="${title}">` +
    `<img src="${badgeImageUrl(variant)}" alt="${BADGE_ALT}" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" loading="lazy"></a>`
  );
}

/** Markdown form for READMEs, Ko-fi/Reddit profiles and CurseForge markdown descriptions. */
export function badgeEmbedMarkdown(slug: string, variant: BadgeVariant = 'dark'): string {
  return `[![${BADGE_ALT}](${badgeImageUrl(variant)})](${badgeLinkUrl(slug)})`;
}

/**
 * Where a copy came from, for the GA4 event — one of these three, never
 * free text, so the event parameter stays countable.
 */
export const BADGE_SNIPPET_KINDS = ['html', 'markdown', 'link'] as const;
export type BadgeSnippetKind = (typeof BADGE_SNIPPET_KINDS)[number];

export function badgeSnippet(kind: BadgeSnippetKind, slug: string, displayName: string, variant: BadgeVariant): string {
  switch (kind) {
    case 'html':
      return badgeEmbedHtml(slug, displayName, variant);
    case 'markdown':
      return badgeEmbedMarkdown(slug, variant);
    case 'link':
      return badgeLinkUrl(slug);
  }
}
