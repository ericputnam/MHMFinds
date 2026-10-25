/**
 * Social draft pipeline — pure helpers for scripts/agents/social-draft.ts
 * (E265, growth plan 2026-10-24 "Walk" rank 1-3, Pip — Traffic).
 *
 * WHY THIS EXISTS
 *   The operator's 10-24 directive makes non-Pinterest sessions a headline
 *   (160k Nov / 240k Dec) and names short video, Tumblr and Reddit as Pip's
 *   channels. Every public post on those channels is Tier 2 until 2026-11-07:
 *   drafts go to reports/funnel/social/drafts/YYYY-MM-DD/, one operator-queue
 *   row per batch, nothing posts until the operator replies
 *   "approve social <date>". This file is the part of the pipeline that can be
 *   unit-tested without GA4, Prisma or the network:
 *
 *   1. rankDestinations — which URLs to post about, ranked by the outcome we
 *      want to move (non-Pinterest sessions by default), never by recency
 *      (CLAUDE.md: "Rank a scarce repeatable action by the outcome you want to
 *      move, never by input recency"). NSFW paths and non-content paths are
 *      dropped before ranking.
 *   2. voiceLint — the operator's voice rule as a checklist a script can run
 *      on every caption ("it can't look like AI wrote it"). It flags; it does
 *      not rewrite. A draft with violations is still written, with the
 *      violations listed at the top, so a human sees them.
 *   3. renderDraft / parseOptout — the draft file format and the creator
 *      opt-out list (growth-plan.md "Creator assets").
 *
 * No network, no filesystem, no secrets — same discipline as
 * rank-pin-destinations-lib.ts. All I/O lives in social-draft.ts.
 */

export type Platform = 'tumblr' | 'short-video' | 'reddit' | 'x';

export const PLATFORMS: readonly Platform[] = ['tumblr', 'short-video', 'reddit', 'x'];

/** Growth plan rank order (10-24): short video first, then Tumblr, Reddit; X/Bluesky lowest. */
export const PLATFORM_RANK: Record<Platform, number> = { 'short-video': 1, tumblr: 2, reddit: 3, x: 5 };

/** The day the operator said Tier 2 for new-channel posts may be revisited. */
export const SOCIAL_TIER2_UNTIL = '2026-11-07';

/** Env flag the poster would check. OFF by default; even ON, no poster is wired (tokens are Tier 2). */
export const SOCIAL_POSTING_FLAG = 'SOCIAL_POSTING_ENABLED';

/** The exact string the operator types to release a batch (growth-plan.md). */
export function approvalString(date: string): string {
  return `approve social ${date}`;
}

/**
 * Paths that must never be posted: NSFW/adult content (growth-plan.md "NSFW mods
 * never appear"). Measured on the 28d GA4 landing-page list 2026-10-25: matches
 * /sims-4-adult-mods/, /best-woohoo-mods-sims-4-ultimate-guide/ (the #3 Tumblr
 * earner, 174/28d — excluded on purpose), /sims-4-wicked-whims-*; 0 false
 * positives in the top 200 paths.
 */
export const NSFW_PATH_RE = /adult|woohoo|nsfw|wicked|\bsex|porn|nude|kink|basemental/i;

/**
 * Paths that are not a destination a social post can point at: GA4's
 * "(not set)", the homepage, WP archive/category/page/tag/author/feed URLs,
 * search, auth and account pages, the /go interstitial, and site forms.
 * `/submit-mod/` ranked #2 by non-Pinterest sessions 7d (480, 2026-10-17→23)
 * on the first dry run — a form page that the scripted-shaped sign-ups hit
 * (E260), not something to post about.
 */
export const NON_CONTENT_PATH_RE =
  /^\/$|^\/(category|page|tag|author|feed|search|go|api|auth|signin|login|account|admin|wp-|submit-mod|sign-?up|register|forgot-password|set-password|favorites|profile|dashboard|newsletter|unsubscribe|confirm|creator-signup)/i;

export interface LandingRow {
  host: string;
  path: string;
  sessions: number;
  /** 'all' | 'pinterest' | 'tumblr' — which GA4 filter produced this row. */
  channel: 'all' | 'pinterest' | 'tumblr';
  /** '7d' | '28d' */
  window: '7d' | '28d';
}

export interface RankedDestination {
  path: string;
  all7d: number;
  all28d: number;
  pinterest7d: number;
  pinterest28d: number;
  tumblr7d: number;
  tumblr28d: number;
  /** all − pinterest, the headline the growth plan asks Pip to move. */
  nonPinterest7d: number;
  nonPinterest28d: number;
  kind: 'collection' | 'mod' | 'post';
}

export type RankBy = 'nonPinterest7d' | 'nonPinterest28d' | 'tumblr28d' | 'all7d';

const APEX = 'musthavemods.com';
const BLOG = 'blog.musthavemods.com';

/** blog.* folds into the apex (same content, 301 since #208); query/fragment stripped; trailing slash enforced. */
export function normalizeDestination(host: string | null | undefined, path: string | null | undefined): string {
  const h = (host ?? '').trim().toLowerCase();
  if (h && h !== APEX && h !== BLOG) return '';
  let p = (path ?? '').trim();
  if (!p || p === '(not set)') return '';
  p = p.split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  if (!p.endsWith('/')) p = `${p}/`;
  return p;
}

export function classifyPath(path: string): RankedDestination['kind'] {
  if (path.startsWith('/games/')) return 'collection';
  if (path.startsWith('/mods/')) return 'mod';
  return 'post';
}

/** True when the path may be posted about at all. */
export function isPostable(path: string): boolean {
  if (!path) return false;
  if (NON_CONTENT_PATH_RE.test(path)) return false;
  if (NSFW_PATH_RE.test(path)) return false;
  return true;
}

export interface RankOptions {
  rows: LandingRow[];
  rankBy?: RankBy;
  /** Minimum value of the rankBy metric to be included. Default 20. */
  min?: number;
  /** Keep only these kinds; default all three. */
  kinds?: ReadonlyArray<RankedDestination['kind']>;
}

/**
 * Aggregates GA4 landing rows into one record per destination and sorts by
 * the chosen outcome, descending. Pure.
 */
export function rankDestinations(opts: RankOptions): RankedDestination[] {
  const rankBy: RankBy = opts.rankBy ?? 'nonPinterest7d';
  const min = opts.min ?? 20;
  const kinds = new Set(opts.kinds ?? ['collection', 'mod', 'post']);
  const by = new Map<string, RankedDestination>();
  for (const r of opts.rows) {
    const path = normalizeDestination(r.host, r.path);
    if (!isPostable(path)) continue;
    const s = Number.isFinite(r.sessions) ? r.sessions : 0;
    let d = by.get(path);
    if (!d) {
      d = {
        path,
        all7d: 0,
        all28d: 0,
        pinterest7d: 0,
        pinterest28d: 0,
        tumblr7d: 0,
        tumblr28d: 0,
        nonPinterest7d: 0,
        nonPinterest28d: 0,
        kind: classifyPath(path),
      };
      by.set(path, d);
    }
    if (r.channel === 'all') {
      if (r.window === '7d') d.all7d += s;
      else d.all28d += s;
    } else if (r.channel === 'pinterest') {
      if (r.window === '7d') d.pinterest7d += s;
      else d.pinterest28d += s;
    } else if (r.channel === 'tumblr') {
      if (r.window === '7d') d.tumblr7d += s;
      else d.tumblr28d += s;
    }
  }
  const out: RankedDestination[] = [];
  for (const d of Array.from(by.values())) {
    d.nonPinterest7d = Math.max(0, d.all7d - d.pinterest7d);
    d.nonPinterest28d = Math.max(0, d.all28d - d.pinterest28d);
    if (!kinds.has(d.kind)) continue;
    if (d[rankBy] < min) continue;
    out.push(d);
  }
  out.sort((a, b) => b[rankBy] - a[rankBy] || a.path.localeCompare(b.path));
  return out;
}

// ---------------------------------------------------------------- voice rule

/**
 * growth-plan.md "Voice rule (operator, 10-24)". Lower-cased substring match
 * on word boundaries. "discover" is Quinn's 10-25 addition ("no 'Discover…'").
 */
export const BANNED_PHRASES: readonly string[] = [
  'elevate',
  'dive in',
  'game-changer',
  'game changer',
  'must-see',
  'must see',
  'unleash',
  "whether you're",
  'whether you are',
  'discover',
  'look no further',
  'in today’s',
  "in today's",
  'take your',
  'to the next level',
  'ultimate guide',
];

export const MAX_HASHTAGS = 3;
export const MAX_EMOJI = 2;

export interface VoiceViolation {
  rule: string;
  detail: string;
}

// Built via the constructor: tsconfig targets es5, where a literal with the `u` flag is a compile error (TS1501).
const EMOJI_RE = new RegExp('\\p{Extended_Pictographic}', 'gu');
const HASHTAG_RE = new RegExp('(^|\\s)#[\\p{L}\\p{N}_]+', 'gu');

/**
 * Returns [] when the copy passes every mechanical check of the voice rule.
 * This cannot judge "sounds like an ad" — a human still reads it aloud — but
 * it catches the patterns the operator named.
 */
export function voiceLint(copy: string): VoiceViolation[] {
  const out: VoiceViolation[] = [];
  const text = copy ?? '';
  const lower = text.toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    const re = new RegExp(`(^|[^a-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
    if (re.test(lower)) out.push({ rule: 'banned-phrase', detail: phrase });
  }

  const hashtags = text.match(HASHTAG_RE) ?? [];
  if (hashtags.length > MAX_HASHTAGS) {
    out.push({ rule: 'hashtag-stack', detail: `${hashtags.length} hashtags (max ${MAX_HASHTAGS})` });
  }

  const emDashes = (text.match(/—|--/g) ?? []).length;
  if (emDashes >= 2) out.push({ rule: 'em-dash-chain', detail: `${emDashes} em dashes` });

  const firstSentence = text.trim().split(/(?<=[.!?])\s/)[0] ?? '';
  if (/^\s*(ever|looking|want|tired|ready|are you|do you|have you|who else|what if)\b.*\?/i.test(firstSentence)) {
    out.push({ rule: 'rhetorical-opener', detail: firstSentence.slice(0, 60) });
  }

  const emoji = (text.match(EMOJI_RE) ?? []).length;
  if (emoji > MAX_EMOJI) out.push({ rule: 'emoji-wall', detail: `${emoji} emoji (max ${MAX_EMOJI})` });

  // Triple-adjective lists: "X, Y, and Z" where all three are short words ending in common adjective suffixes.
  if (/\b\w+(?:y|ful|ous|ive|al|ic),\s+\w+(?:y|ful|ous|ive|al|ic),?\s+and\s+\w+(?:y|ful|ous|ive|al|ic)\b/i.test(text)) {
    out.push({ rule: 'triple-adjective', detail: 'three adjectives in a row' });
  }

  return out;
}

// ---------------------------------------------------------------- opt-out

/** Lower-cased, trimmed, inner whitespace collapsed — how creator names are compared. */
export function normalizeCreator(name: string | null | undefined): string {
  return (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** One creator per line; '#' comments and blank lines ignored. */
export function parseOptout(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of (text ?? '').split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    out.add(normalizeCreator(line));
  }
  return out;
}

export function isOptedOut(author: string | null | undefined, optout: Set<string>): boolean {
  const n = normalizeCreator(author);
  return !!n && optout.has(n);
}

// ---------------------------------------------------------------- draft files

export interface DraftMod {
  id: string;
  title: string;
  author: string | null;
  thumbnail: string | null;
}

export interface DraftInput {
  date: string;
  index: number;
  platform: Platform;
  dest: RankedDestination;
  /** Mods on the destination, already filtered for NSFW and opt-out. */
  mods: DraftMod[];
  /** Human-written caption; empty string = still to write. */
  copy: string;
  /** Where the image/video comes from (a URL or a description). */
  asset: string;
  /** Account the post would go out from, e.g. "@musthavemods (Tumblr)". */
  account: string;
  rankBy: RankBy;
  rank: number;
}

export function draftFilename(index: number, platform: Platform, path: string): string {
  const slug = path.replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'home';
  return `${String(index).padStart(2, '0')}-${platform}-${slug}.md`;
}

export function targetUrl(path: string): string {
  return `https://${APEX}${path}`;
}

/** The whole draft as markdown. Violations are listed at the top so the approver sees them first. */
export function renderDraft(d: DraftInput): string {
  const violations = d.copy.trim() ? voiceLint(d.copy) : [];
  const lines: string[] = [];
  lines.push('---');
  lines.push(`status: DRAFT — Tier 2 until ${SOCIAL_TIER2_UNTIL}; posts only after the operator replies "${approvalString(d.date)}"`);
  lines.push(`platform: ${d.platform}`);
  lines.push(`account: ${d.account}`);
  lines.push(`target_url: ${targetUrl(d.dest.path)}`);
  lines.push(`batch: ${d.date}`);
  lines.push(`ranked_by: ${d.rankBy} (rank ${d.rank})`);
  lines.push(`sessions: all7d=${d.dest.all7d} nonPinterest7d=${d.dest.nonPinterest7d} tumblr28d=${d.dest.tumblr28d} pinterest7d=${d.dest.pinterest7d}`);
  lines.push(`kind: ${d.dest.kind}`);
  lines.push(`voice_lint: ${d.copy.trim() ? (violations.length ? `${violations.length} violation(s)` : 'pass') : 'copy not written yet'}`);
  lines.push('---');
  lines.push('');
  if (violations.length) {
    lines.push('## Voice-rule violations (fix before approval)');
    for (const v of violations) lines.push(`- ${v.rule}: ${v.detail}`);
    lines.push('');
  }
  lines.push('## Why this URL');
  lines.push(
    `Ranked #${d.rank} by ${d.rankBy} (GA4, finalized windows). It already earns ${d.dest.nonPinterest7d} non-Pinterest sessions/7d ` +
      `and ${d.dest.tumblr28d} Tumblr sessions/28d, so a post here rides proven demand instead of guessing. Never chosen by recency.`,
  );
  lines.push('');
  lines.push('## Copy');
  lines.push(d.copy.trim() ? d.copy.trim() : '_(write by hand — voice rule in growth-plan.md; the generator never writes captions)_');
  lines.push('');
  lines.push('## Asset');
  lines.push(d.asset || '_(screenshot or clip of the first mod below; credit the creator on screen)_');
  lines.push('');
  lines.push('## Mods and creators to credit');
  if (d.mods.length === 0) {
    lines.push('_(no catalog rows matched this URL — credit the creators named in the article)_');
  } else {
    for (const m of d.mods) {
      lines.push(`- ${m.title}${m.author ? ` — by ${m.author}` : ''} · https://${APEX}/mods/${m.id}/${m.thumbnail ? ` · img: ${m.thumbnail}` : ''}`);
    }
  }
  lines.push('');
  lines.push('## Rules this draft was checked against');
  lines.push(`- NSFW paths excluded (${NSFW_PATH_RE.source}); NSFW catalog rows excluded; creator opt-out list honoured.`);
  lines.push(`- ≤${MAX_HASHTAGS} real community tags, no em-dash chains, no rhetorical opener, no banned phrases, ≤${MAX_EMOJI} emoji.`);
  lines.push('- Creator named and linked; one concrete detail you can see in the image.');
  lines.push('');
  return lines.join('\n');
}

/** Rows a human can read in the batch README. */
export function renderBatchTable(items: Array<Pick<DraftInput, 'platform' | 'dest' | 'rank'> & { file: string; lint: number | null }>): string {
  const lines: string[] = [];
  lines.push('| # | Platform | Target | nonPinterest 7d | Tumblr 28d | Pinterest 7d | Lint | File |');
  lines.push('|---|---|---|--:|--:|--:|---|---|');
  for (const it of items) {
    lines.push(
      `| ${it.rank} | ${it.platform} | \`${it.dest.path}\` | ${it.dest.nonPinterest7d} | ${it.dest.tumblr28d} | ${it.dest.pinterest7d} | ${
        it.lint === null ? 'no copy' : it.lint === 0 ? 'pass' : `${it.lint} violation(s)`
      } | \`${it.file}\` |`,
    );
  }
  return lines.join('\n');
}
