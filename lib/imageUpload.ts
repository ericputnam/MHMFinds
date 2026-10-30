// Shared (client + server) rules for mod images entered by hand in the admin
// forms. Kept free of server-only imports so the form component can use it.

/** Content types the admin image upload accepts. SVG is deliberately excluded. */
export const ALLOWED_UPLOAD_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

/** 15 MB — big enough for full-size Patreon PNG previews. */
export const MAX_UPLOAD_IMAGE_BYTES = 15 * 1024 * 1024;

// Image hosts whose addresses can't be stored as-is: Patreon post images are
// signed URLs (token-hash / token-time) that expire, and the host isn't in
// next.config.js images.remotePatterns, so /_next/image rejects them with 400.
const REHOST_HOSTNAME_SUFFIXES = ['patreonusercontent.com'];

/** True when an image URL must be copied to our own Blob storage before saving. */
export function needsRehost(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return REHOST_HOSTNAME_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
    );
  } catch {
    return false;
  }
}
