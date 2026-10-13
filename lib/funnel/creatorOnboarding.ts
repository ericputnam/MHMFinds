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
 *
 * House accounts (E197, 2026-10-13): the operator also tests from a NON-admin
 * account, so `isAdmin` alone did not catch it. The 2026-01-06 approval
 * ("SimwithShan") came from that account and was 1 of the 3 "onboarded" and
 * 1 of the 2 "approved" every scoreboard printed from 10-04 to 10-13. Real
 * external creators were 2 (1 approved). House accounts are listed by user id
 * (opaque cuid, no email) with the reason, and are excluded from `onboarded`
 * but still count toward `pendingReview` (a pending row is work either way).
 */

/**
 * Non-admin accounts that belong to the team, keyed by User.id. Add one only
 * with evidence in the `why`; a wrong entry hides a real creator.
 */
export const HOUSE_ACCOUNT_USER_IDS: Readonly<Record<string, string>> = {
  // DB read 2026-10-13: username matches the operator's own name, credentials
  // login, created 2025-12-10; its only submission (approved 2026-01-06) is
  // authored "SimwithShan", and the 2025-11-29 anonymous test submission is
  // signed with the operator's name. E190 already skipped it (author ≠ account).
  cmizeyic40000kv043ipicngs: 'operator test account (non-admin), 01-06 SimwithShan approval',
};

export function isHouseAccount(userId: string | null): boolean {
  return !!userId && Object.prototype.hasOwnProperty.call(HOUSE_ACCOUNT_USER_IDS, userId);
}

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
  /** Distinct house accounts (HOUSE_ACCOUNT_USER_IDS) with submissions that were left out of `onboarded`. */
  houseExcluded: number;
}

export function isCountableCreator(r: SubmissionRow): boolean {
  return !!r.userId && !r.isAdmin && !isHouseAccount(r.userId) && (r.isCreator || r.hasCreatorProfile);
}

export function summarizeCreatorSubmissions(rows: SubmissionRow[], now: Date): CreatorOnboardingSummary {
  const creators = new Set<string>();
  const approved = new Set<string>();
  let pendingReview = 0;
  let oldestPending: number | null = null;
  const house = new Set<string>();
  for (const r of rows) {
    if (isHouseAccount(r.userId)) house.add(r.userId as string);
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
    houseExcluded: house.size,
  };
}
