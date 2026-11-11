/**
 * Ingest-time CurseForge author lookup (Nova, E390, 2026-11-11).
 *
 * E340 (11-05) backfilled 470 CurseForge mods that carried no usable author,
 * but the ingest kept producing new ones: 38 of the 96 CurseForge rows the
 * writer-post scraper created 10-28 → 11-11 (40%) were written with
 * `author = NULL`, because mhmScraper skips CurseForge when it scrapes the
 * mod page for an author (Cloudflare 403s it) and the URL carries only the
 * project slug. A NULL-author mod rolls up to no /creator/[slug]/ page and
 * shows no "More from <creator>" on its own page, so every new CurseForge
 * mod was invisible to the creator surface until the next manual backfill.
 *
 * This asks the CurseForge API — the same `/v1/mods/search?gameId=78062&slug=`
 * lookup E304 gates approvals on and E340 backfilled with — at the moment the
 * row is created, under the backfill's rules (`planRow`): exact slug, exactly
 * one author, the name itself usable, and a suffix spelling folded onto a
 * creator page that already exists (`preferExistingPage`, the E293 class).
 * Anything else returns undefined, and the row is written exactly as before.
 *
 * The API key is read at call time (ESM import hoisting runs before
 * dotenv.config()) and never printed. No key → no lookup, no error.
 */

import { creatorKey } from '../creatorSlug';
import { MIN_MODS_FOR_PAGE } from '../creators';
import {
  type AuthorLookup,
  SPELLING_SUFFIXES,
  curseforgeProjectSlug,
  isUnusableAuthor,
  planRow,
  preferExistingPage,
} from '../../scripts/agents/curseforge-author-backfill-lib';
import { CURSEFORGE_SIMS4_GAME_ID } from '../../scripts/agents/approve-submissions-lib';

const LOOKUP_TIMEOUT_MS = 15_000;

/** One CurseForge search by exact project slug. Never throws. */
export async function lookupCurseForgeAuthor(
  slug: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AuthorLookup> {
  const url = `https://api.curseforge.com/v1/mods/search?gameId=${CURSEFORGE_SIMS4_GAME_ID}&slug=${encodeURIComponent(slug)}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { headers: { 'x-api-key': apiKey, Accept: 'application/json' }, signal: ctl.signal });
    if (!res.ok) return { kind: 'unreachable', detail: `HTTP ${res.status}` };
    const body = (await res.json()) as { data?: Array<{ id: number; slug: string; authors?: Array<{ name: string }> }> };
    const hit = (body.data ?? []).find((m) => m.slug === slug);
    if (!hit) return { kind: 'not-found' };
    return { kind: 'found', projectId: hit.id, authors: (hit.authors ?? []).map((a) => a.name) };
  } catch (error) {
    return { kind: 'unreachable', detail: String((error as Error)?.message ?? error).slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The creator keys preferExistingPage() can consult for `name`: its own key
 * plus every suffix variant. Lets the caller read only those keys' counts
 * from the DB instead of the whole catalog.
 */
export function candidateKeys(name: string): string[] {
  const k = creatorKey(name);
  const out = new Set<string>([k]);
  for (const s of SPELLING_SUFFIXES) {
    out.add(k + s);
    if (k.endsWith(s) && k.length > s.length) out.add(k.slice(0, -s.length));
  }
  out.delete('');
  return Array.from(out);
}

export interface SpellingRow {
  ckey: string;
  author: string;
  n: number;
}

export interface IngestAuthorDeps {
  apiKey: string | undefined;
  lookup: (slug: string, apiKey: string) => Promise<AuthorLookup>;
  /** Usable-author rows (SFW) whose creator key is in `keys`, grouped by spelling. */
  spellings: (keys: string[]) => Promise<SpellingRow[]>;
}

export type IngestAuthorResult =
  | { kind: 'set'; author: string; slug: string; folded: boolean }
  | { kind: 'skip'; reason: string };

/**
 * The author to write on a new row, or a skip. Only runs when the scraped
 * author is unusable and the download URL is a CurseForge Sims 4 project.
 */
export async function resolveCurseForgeIngestAuthor(
  row: { title: string; author?: string | null; downloadUrl?: string | null },
  deps: IngestAuthorDeps,
): Promise<IngestAuthorResult> {
  if (!isUnusableAuthor(row.author)) return { kind: 'skip', reason: 'has-author' };
  const slug = curseforgeProjectSlug(row.downloadUrl);
  if (!slug) return { kind: 'skip', reason: 'no-curseforge-slug' };
  if (!deps.apiKey) return { kind: 'skip', reason: 'no-api-key' };
  const lookup = await deps.lookup(slug, deps.apiKey);
  const decision = planRow(
    { id: '', title: row.title, author: row.author ?? null, downloadUrl: row.downloadUrl ?? null, sourceUrl: null },
    lookup,
  );
  if (decision.action !== 'set') return { kind: 'skip', reason: decision.reason };

  let author = decision.next;
  try {
    const rows = (await deps.spellings(candidateKeys(author))).filter((r) => !isUnusableAuthor(r.author));
    const keyCounts = new Map<string, number>();
    const best = new Map<string, { author: string; n: number }>();
    for (const r of rows) {
      keyCounts.set(r.ckey, (keyCounts.get(r.ckey) ?? 0) + r.n);
      const b = best.get(r.ckey);
      if (!b || r.n > b.n) best.set(r.ckey, { author: r.author.trim(), n: r.n });
    }
    const spellingOf = new Map<string, string>();
    best.forEach((v, k) => spellingOf.set(k, v.author));
    author = preferExistingPage(author, keyCounts, spellingOf, MIN_MODS_FOR_PAGE, creatorKey);
  } catch {
    // Spelling read failed: keep the CurseForge spelling. listCreators() already
    // folds separator-only differences; a suffix split is fixable later.
  }
  return { kind: 'set', author, slug, folded: author !== decision.next };
}
