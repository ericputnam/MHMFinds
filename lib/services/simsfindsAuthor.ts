/**
 * Simsfinds creator from the download page's own structured data
 * (Nova, E401, 2026-11-13). Shared by the ingest (mhmScraper) and the
 * one-off backfill (scripts/agents/simsfinds-author-backfill.ts).
 *
 * 91 SFW mods link a Simsfinds download but carry the aggregator's name
 * ("Simsfinds") or no author, so they roll up to no /creator/[slug]/ page.
 * A read-only probe of all 91 pages on 2026-11-13 (91/91 HTTP 200) found:
 *   - 71 pages publish `"author":{"@type":"Person","name":"…"}` in JSON-LD
 *     and carry `data-bycreator="1"` (the creator uploaded it themselves);
 *   - 20 carry `data-bycreator="0"` (a third party re-uploaded it) and
 *     publish no author at all.
 * Rules, each a "prefer NULL to a guess" choice:
 *   - exact host allowlist on the parsed host, `/downloads/<id>/` paths only;
 *   - require `data-bycreator="1"` — a re-upload's uploader is not the creator,
 *     and the URL's "-by-<name>-" fragment is never read (it is free text);
 *   - require exactly ONE distinct JSON-LD Person author;
 *   - the name must itself be usable (not junk, not a platform name).
 *
 * Pure: no I/O. `__tests__/unit/simsfinds-author.test.ts` imports it.
 */

import { isUnusableAuthor } from '../../scripts/agents/curseforge-author-backfill-lib';

export const SIMSFINDS_HOSTS: ReadonlySet<string> = new Set(['www.simsfinds.com', 'simsfinds.com']);

/** Numeric Simsfinds download id for `/downloads/<id>/…` on an exact host, else null. */
export function simsfindsDownloadId(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (!SIMSFINDS_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  const m = parsed.pathname.match(/^\/downloads\/(\d+)(?:\/|$)/);
  return m ? m[1] : null;
}

export type SimsfindsPageAuthor =
  | { kind: 'found'; author: string }
  | { kind: 'skip'; reason: 'not-by-creator' | 'no-author' | 'multi-author' | 'author-unusable' };

function personNames(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const n of node) personNames(n, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  const a = obj.author;
  const list = Array.isArray(a) ? a : a ? [a] : [];
  for (const x of list) {
    if (x && typeof x === 'object') {
      const name = (x as Record<string, unknown>).name;
      if (typeof name === 'string' && name.trim()) out.add(name.trim());
    }
  }
  if (Array.isArray(obj['@graph'])) personNames(obj['@graph'], out);
}

/** The creator a Simsfinds download page names for itself, under the rules above. */
export function simsfindsAuthorFromHtml(html: string): SimsfindsPageAuthor {
  // The download container's flag; the page carries it once per item.
  const flags = Array.from(html.matchAll(/data-bycreator="(\d)"/g)).map((m) => m[1]);
  if (flags.length === 0 || flags.some((f) => f !== '1')) return { kind: 'skip', reason: 'not-by-creator' };
  const names = new Set<string>();
  for (const m of Array.from(html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi))) {
    try {
      personNames(JSON.parse(m[1]), names);
    } catch {
      // A malformed block contributes nothing.
    }
  }
  if (names.size === 0) return { kind: 'skip', reason: 'no-author' };
  // Case-only differences are one name.
  const distinct = new Map<string, string>();
  names.forEach((n) => distinct.set(n.toLowerCase(), n));
  if (distinct.size > 1) return { kind: 'skip', reason: 'multi-author' };
  const author = Array.from(distinct.values())[0];
  if (isUnusableAuthor(author)) return { kind: 'skip', reason: 'author-unusable' };
  return { kind: 'found', author };
}
