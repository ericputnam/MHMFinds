/**
 * Scripted (bot) sign-ups vs human sign-ups, as pure math (Nova, E260,
 * 2026-10-23). The DB read lives in scripts/agents/funnel-scoreboard.ts; this
 * module only classifies rows.
 *
 * Why this exists: E211 (10-15) sent every "I'm a creator" sign-up to a
 * "submit your first mod" welcome, graded on submissions from flagged
 * accounts. The read (10-23) was 0 of ≥3 — and the pool it targeted was not
 * creators. Read-only DB 10-23, form (credentials) sign-ups since 10-15:
 *   flagged 86 → 6% had ever favorited or clicked a download, 86/86 also
 *   ticked the newsletter box, username avg 16.9 chars, 0 submissions;
 *   unflagged 46 → 76% active, 14/46 opted in, avg 9.3 chars.
 * GA4 `sign_up` (fired by the page's JS) counted 43 in the same window — the
 * unflagged count, to within 3, in both the pre- and post-10-15 windows. The
 * flagged accounts have random-case letters-only usernames (e.g. the shape
 * `aAaaAAAaaAAaaAAa`), 104 distinct IPs on 115 rows, one browser UA family.
 * Onset was the week of 2026-10-12: 58 such accounts vs 0–6/week before.
 * Every one of them ticked both boxes, so they inflate three rows at once:
 * creator-flagged sign-ups (Nova), `signup-optin` subscribers (Cass) — 68 of
 * the 87 opt-in rows in the 7d to 10-23 — and registered accounts (Quinn).
 *
 * The classifier never gates a sign-up, a delete or a flag; the sign-up
 * route is auth (Tier 2) and any bot gate there is the operator's call. Its
 * one write-side use (Cass, E270, 2026-10-25) is send suppression: the
 * scripted-shaped `signup-optin` subscribers are excluded from every send by
 * hash through `lib/services/sendExclusions.ts`. What this does is let the scoreboard print the count with
 * its scripted share, so nobody grades a creator or capture experiment on a
 * population that is 80% script.
 *
 * Threshold, chosen on the pre-onset population BEFORE reading the post-onset
 * one (06-01→10-11, 1,054 form accounts, 789 of them active):
 *   case flips ≥4 → 26 pre-onset accounts match, 11 of them active (1.4%);
 *   case flips ≥6 → 11 match, 2 active (0.25%).            ← chosen
 * Post-onset flagged accounts: 97 of 117 have ≥6 flips, 106 have ≥4. The
 * stricter rule misses ~9 bots a fortnight and mislabels ~1 human a month;
 * the looser one would mislabel ~3 humans a month. Rejected: username length
 * alone (human CamelCase handles reach 17 chars), the creator flag alone
 * (5–6 real humans a week tick it), opt-in alone (14 of 46 humans did).
 */

/** Minimum upper↔lower transitions, letters only, for `isScriptedUsername`. */
export const SCRIPTED_USERNAME_MIN_CASE_FLIPS = 6;

/** Number of upper↔lower transitions across the letters of `s`; digits and punctuation are skipped. */
export function caseFlips(s: string): number {
  let flips = 0;
  let prev: 'u' | 'l' | '' = '';
  for (const ch of s) {
    const c: 'u' | 'l' | '' = /[a-z]/.test(ch) ? 'l' : /[A-Z]/.test(ch) ? 'u' : '';
    if (!c) continue;
    if (prev && c !== prev) flips++;
    prev = c;
  }
  return flips;
}

/**
 * True for the random-case, letters-only handle the 10-12 bot generates.
 * A username with any digit, underscore or hyphen is never scripted-shaped
 * (the sign-up route allows `[a-zA-Z0-9_-]{3,20}`; the bot uses letters only).
 */
export function isScriptedUsername(username: string | null | undefined): boolean {
  if (!username || !/^[a-zA-Z]+$/.test(username)) return false;
  return caseFlips(username) >= SCRIPTED_USERNAME_MIN_CASE_FLIPS;
}

export interface SignupRow {
  createdAt: Date;
  username: string | null;
  /** User.isCreator — the "I'm a creator" box. */
  isCreator: boolean;
  /** Has an Account row with provider `credentials` (the form), vs OAuth. */
  isForm: boolean;
  /** A `signup-optin` subscriber row exists for the account's email. */
  optedIn: boolean;
}

export interface SignupQualitySummary {
  /** Accounts created in [now−7d, now), any provider. */
  signups7d: number;
  /** Of those, credentials-form accounts. */
  form7d: number;
  /** Form accounts with isCreator. The E178/E211 "flagged" population. */
  creatorFlagged7d: number;
  /** Form accounts whose username is scripted-shaped. */
  scripted7d: number;
  /** Scripted-shaped AND isCreator. */
  scriptedFlagged7d: number;
  /** Scripted-shaped AND opted in — the inflation on the `signup-optin` subscriber source. */
  scriptedOptedIn7d: number;
  /** creatorFlagged7d − scriptedFlagged7d: the creator ticks a human plausibly made. */
  humanFlagged7d: number;
}

const DAY_MS = 864e5;

/** Rows older than 7 d or in the future are ignored, so a caller may hand it any superset. */
export function summarizeSignups(rows: readonly SignupRow[], now: Date = new Date()): SignupQualitySummary {
  const t = now.getTime();
  const d7 = t - 7 * DAY_MS;
  const s: SignupQualitySummary = {
    signups7d: 0, form7d: 0, creatorFlagged7d: 0, scripted7d: 0,
    scriptedFlagged7d: 0, scriptedOptedIn7d: 0, humanFlagged7d: 0,
  };
  for (const r of rows) {
    const c = r.createdAt.getTime();
    if (Number.isNaN(c) || c >= t || c < d7) continue;
    s.signups7d++;
    if (!r.isForm) continue;
    s.form7d++;
    if (r.isCreator) s.creatorFlagged7d++;
    if (!isScriptedUsername(r.username)) continue;
    s.scripted7d++;
    if (r.isCreator) s.scriptedFlagged7d++;
    if (r.optedIn) s.scriptedOptedIn7d++;
  }
  s.humanFlagged7d = s.creatorFlagged7d - s.scriptedFlagged7d;
  return s;
}

/**
 * Long-range-health cell: `79 (75 scripted-shaped, 4 human-shaped)`.
 * The leading number is the old "flagged" count so the E178 series still reads.
 */
export function formatCreatorFlaggedSignups(s: SignupQualitySummary): string {
  return `${s.creatorFlagged7d} (${s.scriptedFlagged7d} scripted-shaped, ${s.humanFlagged7d} human-shaped)`;
}

/**
 * Owned-audience bullet. Returns '' when nothing scripted-shaped signed up,
 * so a clean week prints no warning at all.
 */
export function formatScriptedSignupWarning(s: SignupQualitySummary, optInRows7d: number | null): string {
  if (s.scripted7d === 0) return '';
  const optIn = optInRows7d == null
    ? ''
    : ` · signup-optin rows 7d ${optInRows7d} → ${Math.max(0, optInRows7d - s.scriptedOptedIn7d)} net of them`;
  return `⚠️ Scripted-shaped sign-ups 7d: ${s.scripted7d} of ${s.form7d} form accounts (${s.scriptedFlagged7d} ticked "I'm a creator", ${s.scriptedOptedIn7d} ticked the newsletter)${optIn} — diagnostic (lib/funnel/signupQuality.ts, E260); a sign-up gate is Tier 2`;
}
