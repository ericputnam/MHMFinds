/**
 * Client-safe constants for creator-hosted mod files. No Node imports here:
 * this module is shared by the browser upload form and the server routes.
 * The server is the authority on every limit; the browser copy is only for
 * early, friendly error messages.
 */

/** Hard cap on one hosted file (operator decision, 2026-11-07). */
export const MAX_MOD_FILE_BYTES = 100 * 1024 * 1024;

/** Accepted top-level upload types. .rar / .7z are deliberately excluded:
 *  we cannot inspect them without adding a native decompressor. */
export const MOD_FILE_KINDS = ['package', 'ts4script', 'zip'] as const;
export type ModFileKind = (typeof MOD_FILE_KINDS)[number];

/** Every hosted file is stored and served as opaque bytes. Never let the
 *  browser-declared type through: a text/html "mod" must never render. */
export const MOD_FILE_CONTENT_TYPE = 'application/octet-stream';

/** Per-uploader rolling 24 h limits, counted from database rows (not memory),
 *  so they hold across serverless instances. */
export const MOD_UPLOADS_PER_DAY = 20;
export const MOD_UPLOAD_BYTES_PER_DAY = 1024 * 1024 * 1024;

/** A pending row must receive its bytes within this window. */
export const PENDING_UPLOAD_TTL_MS = 60 * 60 * 1000;

/** Client-upload token lifetime. */
export const CLIENT_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Wait before a download ticket becomes usable (mirrors the /go countdown). */
export const DOWNLOAD_WAIT_MS = 9_000;
/** How long a download ticket stays usable once valid. */
export const DOWNLOAD_TICKET_TTL_MS = 15 * 60 * 1000;
/** How long a presigned blob URL lives. Short on purpose: it is a bearer link. */
export const PRESIGNED_URL_TTL_MS = 5 * 60 * 1000;

export const MOD_FILE_ACCEPT_ATTR = '.package,.ts4script,.zip';

/** Lower-cased extension of the final path segment, or '' if none. */
export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

export function kindFromFilename(name: string): ModFileKind | null {
  const ext = extensionOf(name);
  return (MOD_FILE_KINDS as readonly string[]).includes(ext) ? (ext as ModFileKind) : null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
