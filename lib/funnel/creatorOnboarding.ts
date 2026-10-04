/**
 * "Creators onboarded" and the submission review queue, as pure math (Nova, E172).
 * The I/O lives in scripts/agents/funnel-scoreboard.ts; this module only
 * classifies rows, so the definition can be unit tested without Prisma.
 *
 * Why this exists: until 2026-10-04 the scoreboard counted
 * `CreatorProfile.userId ∩ ModSubmission.userId`. The creator dashboard path
 * (`POST /api/creator/submissions`, gated on `User.isCreator`) never creates
 * a CreatorProfile, and neither does the admin approve route. Only the E122
 * claim path (`/submit-mod?creator=`) does. So a creator who signed up, ticked
 * "I'm a creator" and submitted 7 mods (2026-10-03) read as 0 onboarded, and
 * so did the 2 creator accounts whose submissions were approved in January.
 * All 20 CreatorProfile rows are seed rows with no submissions. The old join
 * could only ever count claimants.
 *
 * Definition now: a distinct signed-in, non-admin account that is a creator
 * (`isCreator` OR holds a CreatorProfile) and has >=1 ModSubmission.
 * Anonymous submissions (userId NULL) cannot be attributed and never count.
 * Admins are excluded so a test submission from the operator is not a creator.
 */

export interface SubmissionRow {
  userId: string | null;
  status: string;
  createdAt: Date;
  isCreator: boolean;
  isAdmin: boolean;
  hasCreatorProfile: boolean;
}

export interface CreatorOnboardingSummary {
  /** Distinct creator accounts with >=1 submission of any status. The charter number. */
  onboarded: number;
  /** Of those, how many have >=1 approved submission (i.e. are actually hosted). */
  onboardedApproved: number;
  /** Submissions in status `pending`, any submitter. */
  pendingReview: number;
  /** Whole days since the oldest pending submission was created; null when none pending. */
  oldestPendingDays: number | null;
}

export function isCountableCreator(r: SubmissionRow): boolean {
  return !!r.userId && !r.isAdmin && (r.isCreator || r.hasCreatorProfile);
}

export function summarizeCreatorSubmissions(rows: SubmissionRow[], now: Date): CreatorOnboardingSummary {
  const creators = new Set<string>();
  const approved = new Set<string>();
  let pendingReview = 0;
  let oldestPending: number | null = null;
  for (const r of rows) {
    if (r.status === 'pending') {
      pendingReview++;
      const t = r.createdAt.getTime();
      if (oldestPending == null || t < oldestPending) oldestPending = t;
    }
    if (!isCountableCreator(r)) continue;
    creators.add(r.userId as string);
    if (r.status === 'approved') approved.add(r.userId as string);
  }
  return {
    onboarded: creators.size,
    onboardedApproved: approved.size,
    pendingReview,
    oldestPendingDays: oldestPending == null ? null : Math.floor((now.getTime() - oldestPending) / 864e5),
  };
}
