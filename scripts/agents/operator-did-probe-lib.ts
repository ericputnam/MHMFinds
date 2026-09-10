/**
 * scripts/agents/operator-did-probe-lib.ts — the pure half of the morning "operator did" probe.
 *
 * No network, no filesystem, no env reads: everything here takes strings/objects in and returns
 * strings/objects out, so `__tests__/unit/operator-did-probe.test.ts` can exercise the diff and
 * redaction logic without a Vercel login, a Patreon token or a database. The side-effecting half
 * lives in `operator-did-probe.ts`.
 */

// ---------------------------------------------------------------------------------------------
// Expected Vercel Production env var NAMES (names only — this probe never reads a value).
// ---------------------------------------------------------------------------------------------

/** The 8 newsletter vars `lib/services/` reads (env.example, PR #70), all required before a real send. */
export const NEWSLETTER_REQUIRED = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'EMAIL_POSTAL_ADDRESS',
  'UNSUBSCRIBE_SECRET',
  'NEXT_PUBLIC_SITE_URL',
] as const;

/** Read by the same code but with a code-side default; reported, never counted as missing. */
export const NEWSLETTER_OPTIONAL = [
  'UNSUBSCRIBE_MAILBOX',
  'SMTP_HOURLY_LIMIT',
  'SMTP_MAX_CONNECTIONS',
  'SMTP_MAX_MESSAGES',
] as const;

/** Patreon OAuth + membership (Q5 / PR #52, #62). */
export const MEMBERSHIP_REQUIRED = [
  'PATREON_CLIENT_ID',
  'PATREON_CLIENT_SECRET',
  'PATREON_CAMPAIGN_ID',
  'PATREON_MEMBER_MIN_CENTS',
  'NEXT_PUBLIC_MEMBERSHIP_ENABLED',
] as const;

export const EXPECTED_REQUIRED: readonly string[] = [...NEWSLETTER_REQUIRED, ...MEMBERSHIP_REQUIRED];
export const EXPECTED_OPTIONAL: readonly string[] = [...NEWSLETTER_OPTIONAL];

/** Why a missing name matters, in the operator's terms. Keep to one clause each. */
export const WHY_IT_MATTERS: Record<string, string> = {
  EMAIL_POSTAL_ADDRESS: 'hard blocker — sendBulk() throws without a CAN-SPAM postal address',
  UNSUBSCRIBE_SECRET: 'must be the SAME value in .env.local and Vercel, else unsubscribe links say "Link not recognized"',
  NEXT_PUBLIC_SITE_URL: 'scripts without an explicit site build localhost links (also needed in .env.local)',
  SMTP_HOST: 'no SMTP host → transport falls through to "none", newsletter only console.logs',
  SMTP_PORT: 'no SMTP port → transport falls through to "none"',
  SMTP_USER: 'no SMTP user → transport falls through to "none"',
  SMTP_PASS: 'no SMTP password → transport falls through to "none"',
  EMAIL_FROM: 'From falls back to noreply@musthavemods.com',
  PATREON_CLIENT_ID: 'Sign in with Patreon cannot start',
  PATREON_CLIENT_SECRET: 'Sign in with Patreon cannot complete',
  PATREON_CAMPAIGN_ID: 'load-bearing: unset means ANY active patron of ANY creator counts as a member',
  PATREON_MEMBER_MIN_CENTS: 'membership threshold falls back to 0 cents',
  NEXT_PUBLIC_MEMBERSHIP_ENABLED: 'the /go countdown skip, CTA and Member badge do not render',
};

// ---------------------------------------------------------------------------------------------
// Redaction — every string that leaves this probe goes through here.
// ---------------------------------------------------------------------------------------------

const KEY_VALUE_RE = /\b([A-Z][A-Z0-9_]{2,})=(?!\[REDACTED\])\S+/g;
const BEARER_RE = /\bBearer\s+\S+/gi;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/**
 * 32+ unbroken chars of [A-Za-z0-9_] containing both a digit and a letter — hex secrets, base64url
 * keys, JWT segments. Hyphens and dots are deliberately excluded so dated filenames and ISO timestamps
 * survive; structured forms (`KEY=…`, `Bearer …`) are caught by the rules above regardless.
 */
const TOKEN_RE = /\b(?=[A-Za-z0-9_]*\d)(?=[A-Za-z0-9_]*[A-Za-z])[A-Za-z0-9_]{32,}\b/g;
/** JWTs: three base64url segments joined by dots, first one `eyJ`. */
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;

/**
 * Scrub anything that could be a secret or a person: `KEY=value` pairs, bearer tokens, email
 * addresses, and long token-like runs. Env var NAMES, tier titles and counts survive untouched.
 */
export function redact(input: string): string {
  return input
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(KEY_VALUE_RE, (_m, key: string) => `${key}=[REDACTED]`)
    .replace(EMAIL_RE, '[email]')
    .replace(JWT_RE, '[REDACTED]')
    .replace(TOKEN_RE, '[REDACTED]');
}

// ---------------------------------------------------------------------------------------------
// Vercel `env ls` parsing + expected-name diff
// ---------------------------------------------------------------------------------------------

const ENV_NAME_RE = /^[A-Z][A-Z0-9_]*$/;

/**
 * Pull env var NAMES out of `vercel env ls <env>` output. The CLI prints a ` name` header (possibly
 * with more columns), one name per row, then a blank line and a "Common" footer. We take the first
 * whitespace-separated token of every row after the header that looks like an env name, and stop at
 * the first blank line. Anything else on the row (created-at, environments) is ignored; values are
 * never printed by the CLI in the first place.
 */
export function parseVercelEnvNames(stdout: string): string[] {
  const lines = stdout.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /^\s*name\b/i.test(l));
  const names: string[] = [];
  const seen = new Set<string>();
  for (let i = headerIdx >= 0 ? headerIdx + 1 : 0; i < lines.length; i++) {
    const line = lines[i];
    if (headerIdx >= 0 && line.trim() === '') break;
    const first = line.trim().split(/\s+/)[0];
    if (first && ENV_NAME_RE.test(first) && !seen.has(first)) {
      seen.add(first);
      names.push(first);
    }
  }
  return names;
}

export interface EnvDiff {
  present: string[];
  missing: string[];
  optionalPresent: string[];
  optionalMissing: string[];
  /** Present in Vercel but not in either expected list — informational only. */
  unexpected: string[];
}

export function diffEnvNames(
  actual: readonly string[],
  required: readonly string[] = EXPECTED_REQUIRED,
  optional: readonly string[] = EXPECTED_OPTIONAL
): EnvDiff {
  const have = new Set(actual);
  const known = new Set([...required, ...optional]);
  return {
    present: required.filter((n) => have.has(n)),
    missing: required.filter((n) => !have.has(n)),
    optionalPresent: optional.filter((n) => have.has(n)),
    optionalMissing: optional.filter((n) => !have.has(n)),
    unexpected: actual.filter((n) => !known.has(n)),
  };
}

// ---------------------------------------------------------------------------------------------
// Patreon tiers
// ---------------------------------------------------------------------------------------------

export interface TierObservation {
  id: string;
  title: string;
  amount_cents: number;
  published: boolean;
  patron_count: number;
  edited_at: string | null;
  published_at: string | null;
  unpublished_at: string | null;
  /** Does the tier description carry the welcome-note marker phrase? */
  descriptionHasMarker: boolean;
  /** Does the tier description carry the Q4 step-1 perk line? */
  descriptionHasPerk: boolean;
}

/** Distinctive phrase from `reports/funnel/drafts/patreon-welcome-note-2026-09-09.md` (both versions). */
export const WELCOME_NOTE_MARKER = 'connect this patreon account';
/** Q4 step 1 perk line, as pasted 2026-09-09T01:35Z into the $3 tier. */
export const PERK_LINE_MARKER = 'skip the download countdown';

export function normaliseText(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function containsMarker(text: string | null | undefined, marker: string): boolean {
  return normaliseText(text).includes(marker.toLowerCase());
}

export interface CampaignResponse {
  data?: { id?: string; attributes?: Record<string, unknown> };
  included?: Array<{ type: string; id: string; attributes: Record<string, unknown> }>;
}

/** Turn the raw `GET /campaigns/{id}?include=tiers` body into per-tier observations (no PII fields exist on tiers). */
export function tiersFromCampaign(body: CampaignResponse): TierObservation[] {
  const tiers = (body.included ?? []).filter((r) => r.type === 'tier');
  return tiers
    .map((t) => {
      const a = t.attributes ?? {};
      const description = typeof a.description === 'string' ? a.description : '';
      return {
        id: String(t.id),
        // Patreon returns titles verbatim, trailing whitespace included ("Tip Jar - Curious Simmer ").
        title: typeof a.title === 'string' && a.title.trim() ? a.title.trim() : '(untitled)',
        amount_cents: typeof a.amount_cents === 'number' ? a.amount_cents : 0,
        published: a.published === true,
        patron_count: typeof a.patron_count === 'number' ? a.patron_count : 0,
        edited_at: typeof a.edited_at === 'string' ? a.edited_at : null,
        published_at: typeof a.published_at === 'string' ? a.published_at : null,
        unpublished_at: typeof a.unpublished_at === 'string' ? a.unpublished_at : null,
        descriptionHasMarker: containsMarker(description, WELCOME_NOTE_MARKER),
        descriptionHasPerk: containsMarker(description, PERK_LINE_MARKER),
      };
    })
    .sort((x, y) => x.amount_cents - y.amount_cents || x.title.localeCompare(y.title));
}

export const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

// ---------------------------------------------------------------------------------------------
// Snapshot + delta
// ---------------------------------------------------------------------------------------------

export type SectionStatus = 'ok' | 'could-not-run' | 'fail';

export interface Snapshot {
  date: string; // YYYY-MM-DD
  generatedAt: string; // ISO
  /** true when the file was hand-built from documented observations rather than by the probe. */
  reconstructed?: boolean;
  reconstructedFrom?: string;
  env: {
    status: SectionStatus;
    note?: string;
    present: string[];
    missing: string[];
    optionalPresent: string[];
    optionalMissing: string[];
  };
  patreon: {
    status: SectionStatus;
    note?: string;
    campaignId?: string;
    tiers: TierObservation[];
    /** campaign.thanks_msg carries the welcome-note marker phrase */
    thanksMsgHasMarker?: boolean | null;
    /** length of campaign.thanks_msg after tag-stripping (0 = not set); never the text itself */
    thanksMsgLength?: number | null;
    welcomeNoteObservable: false;
    welcomeNoteCheckedFields: string[];
  };
  blog: {
    status: SectionStatus;
    note?: string;
    exitCode: number | null;
  };
}

export interface Delta {
  baselineDate: string | null;
  lines: string[];
}

function tierLabel(t: TierObservation): string {
  return `${dollars(t.amount_cents)} "${t.title}"`;
}

/**
 * Human "since yesterday" lines. With no baseline every observation is reported as new. Each line is
 * short enough to paste into the digest as-is.
 */
export function diffSnapshots(prev: Snapshot | null, cur: Snapshot): Delta {
  const lines: string[] = [];

  // --- env names ---------------------------------------------------------------------------
  if (cur.env.status === 'ok') {
    const prevPresent = new Set(prev && prev.env.status === 'ok' ? [...prev.env.present, ...prev.env.optionalPresent] : []);
    const curPresent = [...cur.env.present, ...cur.env.optionalPresent];
    const added = prev && prev.env.status === 'ok' ? curPresent.filter((n) => !prevPresent.has(n)) : curPresent;
    // Array.from, not spread: tsconfig targets ES5 without downlevelIteration (PR #19 gotcha).
    const removed = prev && prev.env.status === 'ok' ? Array.from(prevPresent).filter((n) => !curPresent.includes(n)) : [];
    if (!prev || prev.env.status !== 'ok') {
      lines.push(`env (no baseline): ${cur.env.present.length}/${cur.env.present.length + cur.env.missing.length} required names present`);
    }
    for (const n of added) lines.push(`+${n}`);
    for (const n of removed) lines.push(`−${n} (was present, now missing)`);
    for (const n of cur.env.missing) lines.push(`${n} still missing` + (WHY_IT_MATTERS[n] ? ` — ${WHY_IT_MATTERS[n]}` : ''));
  } else {
    lines.push(`env: ${cur.env.status}${cur.env.note ? ` (${cur.env.note})` : ''}`);
  }

  // --- tiers -------------------------------------------------------------------------------
  if (cur.patreon.status === 'ok') {
    const prevList = prev && prev.patreon.status === 'ok' ? prev.patreon.tiers : [];
    const prevTiers = new Map(prevList.map((t) => [t.id, t]));
    const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    for (const t of cur.patreon.tiers) {
      const p = prevTiers.get(t.id) ?? prevList.find((x) => sameTitle(x.title, t.title));
      const state = t.published ? 'published' : 'unpublished';
      if (!p) {
        lines.push(`${tierLabel(t)} ${state} (${t.patron_count} patrons)${prev ? ' — not in baseline' : ''}`);
        continue;
      }
      const changes: string[] = [];
      if (p.published !== t.published) changes.push(`${p.published ? 'published' : 'unpublished'} → ${state}`);
      if (p.amount_cents !== t.amount_cents) changes.push(`${dollars(p.amount_cents)} → ${dollars(t.amount_cents)}`);
      if (!sameTitle(p.title, t.title)) changes.push(`renamed from "${p.title}"`);
      if (p.patron_count !== t.patron_count) changes.push(`patrons ${p.patron_count} → ${t.patron_count}`);
      // An edit counts only if it is newer than what the baseline knew (or, when the baseline had no
      // edited_at — reconstructed files — newer than the baseline day itself). ISO strings sort lexically.
      const editedSince = p.edited_at ?? `${prev!.date}T00:00:00.000+00:00`;
      if (t.edited_at && t.edited_at > editedSince) changes.push(`edited ${t.edited_at}`);
      if (p.descriptionHasPerk !== t.descriptionHasPerk) changes.push(`perk line ${t.descriptionHasPerk ? 'added' : 'removed'}`);
      if (p.descriptionHasMarker !== t.descriptionHasMarker) changes.push(`welcome-note phrase ${t.descriptionHasMarker ? 'appeared' : 'gone'} in description`);
      lines.push(
        changes.length
          ? `${tierLabel(t)}: ${changes.join(', ')}`
          : `${tierLabel(t)} still ${state} (${t.patron_count} patrons)`
      );
    }
    for (const p of prevList) {
      if (!cur.patreon.tiers.some((t) => t.id === p.id || sameTitle(t.title, p.title))) lines.push(`${tierLabel(p)} no longer returned by the API`);
    }
    const prevThanks = prev && prev.patreon.status === 'ok' ? prev.patreon.thanksMsgHasMarker : undefined;
    if (cur.patreon.thanksMsgHasMarker !== undefined && cur.patreon.thanksMsgHasMarker !== null) {
      if (prevThanks !== cur.patreon.thanksMsgHasMarker) {
        lines.push(`campaign thanks_msg welcome-note phrase: ${cur.patreon.thanksMsgHasMarker ? 'present' : 'absent'}${prev ? ` (was ${prevThanks === undefined || prevThanks === null ? 'unknown' : prevThanks ? 'present' : 'absent'})` : ''}`);
      }
    }
    lines.push('tier welcome note: not observable via API');
  } else {
    lines.push(`patreon: ${cur.patreon.status}${cur.patreon.note ? ` (${cur.patreon.note})` : ''}`);
  }

  // --- blog markers ------------------------------------------------------------------------
  const prevBlog = prev ? prev.blog.status : null;
  if (prevBlog !== cur.blog.status) {
    lines.push(`functions.php markers: ${cur.blog.status}${prev ? ` (was ${prevBlog})` : ''}`);
  } else {
    lines.push(`functions.php markers still ${cur.blog.status}`);
  }

  return { baselineDate: prev ? prev.date : null, lines };
}

/** Overall exit code: 1 if any section really failed, else 2 if any could not run, else 0. */
export function exitCodeFor(s: Snapshot): 0 | 1 | 2 {
  const statuses = [s.env.status, s.patreon.status, s.blog.status];
  if (statuses.includes('fail')) return 1;
  if (statuses.includes('could-not-run')) return 2;
  return 0;
}

/** The single line appended to logs/operator-did.log. Falsifiable, greppable, no secrets. */
export function summaryLine(s: Snapshot, delta: Delta, code: number): string {
  const env =
    s.env.status === 'ok'
      ? `env=${s.env.present.length}/${s.env.present.length + s.env.missing.length}${s.env.missing.length ? `(missing:${s.env.missing.join(',')})` : ''}`
      : `env=${s.env.status}`;
  const tiers =
    s.patreon.status === 'ok'
      ? `tiers=${s.patreon.tiers.map((t) => `${dollars(t.amount_cents)}:${t.published ? 'pub' : 'unpub'}:${t.patron_count}`).join('|')}`
      : `tiers=${s.patreon.status}`;
  const blog = `blog=${s.blog.status}`;
  const changed = delta.lines.filter((l) => /^[+−]|→|added|removed|appeared|gone|renamed|no longer|\(was /.test(l)).length;
  const verdict = code === 0 ? 'OK' : code === 2 ? 'COULD-NOT-RUN' : 'FAIL';
  return redact(`${s.generatedAt} ${verdict} ${env} ${tiers} ${blog} baseline=${delta.baselineDate ?? 'none'} changes=${changed}`);
}
