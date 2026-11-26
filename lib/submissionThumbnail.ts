/**
 * No mod goes live without a thumbnail (2026-11-22).
 *
 * The public /submit-mod claim form has no image field, so a creator claim
 * arrives with `thumbnail: null, images: []`. Approval copied that through,
 * and ErinAOK's "Women's Aurelia Gown" (mod cmwsj6ph19ms1zyf7u7h3xp9v) went
 * live with a blank card. Both approval paths now resolve the thumbnail here
 * and refuse to approve when it resolves to nothing:
 *   - app/api/admin/submissions/[id]/approve/route.ts (the reviewer can
 *     upload one on /admin/submissions and it arrives as `override`)
 *   - scripts/agents/approve-submissions.ts (skips the row)
 *
 * Pure — no server import — so it is unit-testable.
 */

/** Hosts an override may point at: our own Vercel Blob uploads (/api/admin/upload-image). */
const OVERRIDE_HOST = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/;

export const MISSING_THUMBNAIL_ERROR =
  'This submission has no image. Upload a thumbnail before approving.';

function present(url: unknown): url is string {
  return typeof url === 'string' && url.trim().length > 0;
}

/** True for an https URL on our Blob store, the only place the review page uploads to. */
export function isAllowedThumbnailOverride(url: unknown): url is string {
  if (!present(url)) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && OVERRIDE_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

export interface ThumbnailInput {
  /** Uploaded by the reviewer at approval; must pass isAllowedThumbnailOverride. */
  override?: string | null;
  thumbnail: string | null;
  images: readonly string[];
  /** For an edit: the live mod's current thumbnail, kept when the edit carries none. */
  existingModThumbnail?: string | null;
}

/**
 * The thumbnail the approved mod gets: the reviewer's upload, else the
 * submission's thumbnail, else its first image, else (edits only) the
 * thumbnail the mod already has. `null` means "refuse the approval".
 */
export function resolveApprovalThumbnail(input: ThumbnailInput): string | null {
  if (isAllowedThumbnailOverride(input.override)) return input.override;
  if (present(input.thumbnail)) return input.thumbnail;
  const firstImage = input.images.find(present);
  if (firstImage) return firstImage;
  if (present(input.existingModThumbnail)) return input.existingModThumbnail;
  return null;
}
