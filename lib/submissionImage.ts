// The preview image a visitor attaches on /submit-mod (2026-11-26).
//
// The form is public and anonymous, so it never gets a Blob upload token
// (that would be free image hosting for anyone). Instead the browser shrinks
// the picture (lib/shrinkImageForUpload.ts) and sends it in the JSON body as a
// data URL; the route stores it on Blob only after the CAPTCHA, the rate limit
// and the duplicate check have passed. Shared by client and server: no
// server-only imports here.

/** Longest side after the browser shrinks the image. The hero is 66vw wide. */
export const SUBMISSION_IMAGE_MAX_SIDE = 1600;

/**
 * Hard cap on the decoded image. A 1600px JPEG at q0.85 is ~200–600 KB; the
 * cap leaves room and keeps the base64 body well under Vercel's 4.5 MB limit.
 */
export const SUBMISSION_IMAGE_MAX_BYTES = 3 * 1024 * 1024;

export const SUBMISSION_IMAGE_REQUIRED = 'Please add a preview image of the mod.';

export type DecodedSubmissionImage = {
  buffer: Buffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
};

/** The type is read from the bytes, never from the data URL's own label. */
function sniff(buf: Buffer): DecodedSubmissionImage['contentType'] | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;

/**
 * Decode and check the `imageData` field. Returns the bytes to store, or an
 * error message safe to show the visitor.
 */
export function decodeSubmissionImage(
  value: unknown
): { ok: true; image: DecodedSubmissionImage } | { ok: false; error: string } {
  if (typeof value !== 'string' || value.trim() === '') {
    return { ok: false, error: SUBMISSION_IMAGE_REQUIRED };
  }
  const match = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=\s]+)$/.exec(value);
  if (!match) return { ok: false, error: 'The preview image could not be read. Please choose it again.' };
  // Reject before decoding anything oversized (base64 is 4/3 of the bytes).
  if (match[1].length > Math.ceil((SUBMISSION_IMAGE_MAX_BYTES * 4) / 3) + 4) {
    return { ok: false, error: 'The preview image is too large. Please use a smaller one.' };
  }
  const buffer = Buffer.from(match[1], 'base64');
  if (buffer.length === 0 || buffer.length > SUBMISSION_IMAGE_MAX_BYTES) {
    return { ok: false, error: 'The preview image is too large. Please use a smaller one.' };
  }
  const contentType = sniff(buffer);
  if (!contentType) {
    return { ok: false, error: 'The preview image must be a JPG, PNG or WebP picture.' };
  }
  return { ok: true, image: { buffer, contentType, extension: EXT[contentType] } };
}
