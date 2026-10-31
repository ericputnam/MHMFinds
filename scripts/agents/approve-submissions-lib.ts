/**
 * Approve pending creator submissions with a proof-of-ownership gate
 * (Nova, E304, 2026-10-31). Pure half; I/O is approve-submissions.ts.
 *
 * The operator's growth plan (2026-10-24) asks for proof of ownership before
 * a listing goes live. This is the half of that proof a script can check:
 *
 *   1. the submission's download URL is a CurseForge project that EXISTS
 *      (looked up by slug through the CurseForge API, Sims 4 gameId 78062);
 *   2. the project's author on CurseForge names the submission's author; and
 *   3. the submission's author names the submitting account (username or
 *      display name) — the same `authorNamesAccount` rule E190 added for
 *      backfills, because nobody is looking at the row when a script runs.
 *
 * Only `source-verified` rows may be written. Every other verdict is a skip
 * with its reason recorded in the frozen plan, never a guess.
 *
 * What this does NOT prove: that the account is that person. Approval mints
 * the E183 pending, unverified profile; identity is still promotion in
 * /admin/creator-claims (E151/E166). Nor is "verified email" proven: the
 * credentials sign-up stamps `emailVerified` at creation
 * (app/api/auth/signup/route.ts "Auto-verify for credentials signup"), so
 * the plan records HOW the email counts as verified and treats
 * `credentials-auto` as informational, not as evidence.
 */
import { creatorKey } from '../../lib/creatorSlug';
import { planApprovalProfile } from '../../lib/submissionApprovalProfile';

/** Hard cap on rows one apply may write. The known population is 7. */
export const MAX_APPROVE_ROWS = 50;

/** CurseForge's game id for The Sims 4 (api.curseforge.com /v1/games). */
export const CURSEFORGE_SIMS4_GAME_ID = 78062;

/** Exact host allowlist — never a substring test (`curseforge.com.evil.example`). */
const CURSEFORGE_HOSTS = new Set(['www.curseforge.com', 'curseforge.com']);

export type EmailVerifiedVia = 'oauth' | 'credentials-auto' | 'none';

export interface SubmissionRow {
  submissionId: string;
  status: string;
  isEdit: boolean;
  userId: string | null;
  submitterIsAdmin: boolean;
  existingProfileId: string | null;
  author: string | null;
  displayName: string | null;
  username: string | null;
  modName: string;
  description: string;
  modUrl: string;
  downloadUrl: string | null;
  createdAt: string;
  emailVerifiedVia: EmailVerifiedVia;
}

export type SourceLookup =
  | { kind: 'found'; projectId: number; authors: string[]; downloads: number; created: string }
  | { kind: 'not-found' }
  | { kind: 'unreachable'; detail: string }
  | { kind: 'unchecked' };

export type Verdict =
  | 'source-verified'
  | 'author-not-account'
  | 'author-not-source'
  | 'source-not-found'
  | 'source-unreachable'
  | 'source-unchecked';

export type SkipReason = Verdict | 'not-pending' | 'edit' | 'anonymous' | 'admin' | 'no-valid-slug';

export interface Evidence {
  verdict: Verdict;
  curseforgeSlug: string | null;
  sourceAuthors: string[];
  sourceProjectId: number | null;
  sourceDownloads: number | null;
  sourceCreated: string | null;
  authorKey: string;
  accountKeys: string[];
  emailVerifiedVia: EmailVerifiedVia;
}

export type Decision =
  | {
      submissionId: string;
      action: 'approve';
      userId: string;
      profile: { kind: 'create'; handle: string } | { kind: 'link'; profileId: string };
      modName: string;
      evidence: Evidence;
    }
  | { submissionId: string; action: 'skip'; reason: SkipReason; modName: string; evidence: Evidence | null };

export type WritableDecision = Extract<Decision, { action: 'approve' }>;

/** `/sims4/<class>/<slug>` on an exact CurseForge host, else null. */
export function curseforgeSlug(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (!CURSEFORGE_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 3 || parts[0].toLowerCase() !== 'sims4') return null;
  const slug = parts[2].toLowerCase();
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}

/** Separator-, case-blind name equality on the E293 creator key; empty never matches. */
export function nameMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ka = creatorKey(a);
  const kb = creatorKey(b);
  return ka.length > 0 && ka === kb;
}

export function ownershipVerdict(
  row: Pick<SubmissionRow, 'author' | 'username' | 'displayName'>,
  lookup: SourceLookup,
): Verdict {
  if (lookup.kind === 'unchecked') return 'source-unchecked';
  if (lookup.kind === 'unreachable') return 'source-unreachable';
  if (lookup.kind === 'not-found') return 'source-not-found';
  if (!lookup.authors.some((a) => nameMatches(a, row.author))) return 'author-not-source';
  if (!nameMatches(row.author, row.username) && !nameMatches(row.author, row.displayName)) return 'author-not-account';
  return 'source-verified';
}

export function evidenceFor(row: SubmissionRow, lookup: SourceLookup): Evidence {
  const found = lookup.kind === 'found' ? lookup : null;
  return {
    verdict: ownershipVerdict(row, lookup),
    curseforgeSlug: curseforgeSlug(row.downloadUrl ?? row.modUrl),
    sourceAuthors: found ? found.authors : [],
    sourceProjectId: found ? found.projectId : null,
    sourceDownloads: found ? found.downloads : null,
    sourceCreated: found ? found.created : null,
    authorKey: typeof row.author === 'string' ? creatorKey(row.author) : '',
    accountKeys: [row.username, row.displayName].filter((n): n is string => typeof n === 'string' && n.length > 0).map(creatorKey),
    emailVerifiedVia: row.emailVerifiedVia,
  };
}

export function planApprovalRow(row: SubmissionRow, lookup: SourceLookup): Decision {
  const skip = (reason: SkipReason, evidence: Evidence | null): Decision => ({
    submissionId: row.submissionId,
    action: 'skip',
    reason,
    modName: row.modName,
    evidence,
  });
  if (row.status !== 'pending') return skip('not-pending', null);
  const plan = planApprovalProfile({
    isEdit: row.isEdit,
    userId: row.userId,
    submitterIsAdmin: row.submitterIsAdmin,
    existingProfileId: row.existingProfileId,
    author: row.author,
    displayName: row.displayName,
    username: row.username,
  });
  // An edit, an anonymous or a staff submission has no account to prove
  // ownership against — those stay with the admin dashboard.
  if (plan.kind === 'none') return skip(plan.reason, null);
  const evidence = evidenceFor(row, lookup);
  if (evidence.verdict !== 'source-verified') return skip(evidence.verdict, evidence);
  return {
    submissionId: row.submissionId,
    action: 'approve',
    userId: row.userId as string,
    profile: plan.kind === 'create' ? { kind: 'create', handle: plan.data.handle } : { kind: 'link', profileId: plan.profileId },
    modName: row.modName,
    evidence,
  };
}

export function planApprovals(rows: SubmissionRow[], lookups: Map<string, SourceLookup>): Decision[] {
  return rows.map((r) => planApprovalRow(r, lookups.get(r.submissionId) ?? { kind: 'unchecked' }));
}

export function writable(decisions: Decision[]): WritableDecision[] {
  return decisions.filter((d): d is WritableDecision => d.action === 'approve');
}

/** The part of a decision that must not move between the frozen plan and the live re-plan. */
export function signature(d: Decision): string {
  if (d.action === 'skip') return JSON.stringify({ id: d.submissionId, action: 'skip', reason: d.reason });
  return JSON.stringify({
    id: d.submissionId,
    action: 'approve',
    userId: d.userId,
    profile: d.profile,
    verdict: d.evidence.verdict,
    slug: d.evidence.curseforgeSlug,
    authors: d.evidence.sourceAuthors,
  });
}

/**
 * Which frozen-plan rows may still be written: the live re-plan (fresh DB
 * read AND a fresh CurseForge lookup) must agree on action, account,
 * profile, verdict and source authors. Anything that drifted is skipped,
 * never re-derived — the frozen plan is what the 24 h veto saw.
 */
export function stillApplicable(frozen: WritableDecision[], live: Decision[]): { apply: WritableDecision[]; drifted: string[] } {
  const bySub = new Map(live.map((d) => [d.submissionId, signature(d)]));
  const apply: WritableDecision[] = [];
  const drifted: string[] = [];
  for (const f of frozen) {
    if (bySub.get(f.submissionId) === signature(f)) apply.push(f);
    else drifted.push(f.submissionId);
  }
  return { apply, drifted };
}

/** A dry run must never overwrite a non-empty plan: it is the rollback artifact. */
export function shouldWritePlan(existingRows: number | null, replace: boolean): boolean {
  return existingRows == null || existingRows === 0 || replace;
}

/** `--ids=a,b,c` → ['a','b','c']; absent → null (all pending); present but empty → []. */
export function parseIds(argv: readonly string[]): string[] | null {
  const arg = argv.find((a) => a.startsWith('--ids='));
  if (!arg) return null;
  return arg
    .slice('--ids='.length)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const KNOWN_FLAGS = new Set(['--apply', '--rollback', '--replace-plan']);

/** Unknown flags are refused, never ignored — a typo in `--aply` must not become a dry run. */
export function unknownFlags(argv: readonly string[]): string[] {
  return argv.filter((a) => a.startsWith('--') && !a.startsWith('--ids=') && !KNOWN_FLAGS.has(a));
}

export function emailVerifiedVia(input: { emailVerified: Date | string | null; providers: string[] }): EmailVerifiedVia {
  if (input.providers.some((p) => p !== 'credentials')) return 'oauth';
  return input.emailVerified ? 'credentials-auto' : 'none';
}
