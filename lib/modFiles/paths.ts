/**
 * Blob pathnames for hosted mod files. Every pathname is minted by the
 * server from ids it controls — never from user input — and every pathname
 * the server is about to act on is re-checked against these patterns.
 *
 *   quarantine: mod-files/quarantine/<userId>/<uploadId>.<kind>
 *   approved:   mod-files/approved/<uploadId>/<downloadName>
 *
 * Only `approved/` paths are ever presigned for the public.
 */
import { randomBytes } from 'crypto';
import { MOD_FILE_KINDS, type ModFileKind } from './constants';

export const MOD_FILES_PREFIX = 'mod-files/';
export const QUARANTINE_PREFIX = 'mod-files/quarantine/';
export const APPROVED_PREFIX = 'mod-files/approved/';

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const KIND_GROUP = MOD_FILE_KINDS.join('|');
const QUARANTINE_RE = new RegExp(`^mod-files/quarantine/([A-Za-z0-9_-]{8,64})/([a-f0-9]{32})\\.(${KIND_GROUP})$`);
const APPROVED_RE = /^mod-files\/approved\/([a-f0-9]{32})\/([A-Za-z0-9._\-()[\]]{1,124})$/;

/** Upload ids are 128 random bits, hex. Not guessable, not sequential. */
export function newUploadId(): string {
  return randomBytes(16).toString('hex');
}

export function isUploadId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-f0-9]{32}$/.test(id);
}

export function quarantinePath(userId: string, uploadId: string, kind: ModFileKind): string {
  if (!ID_RE.test(userId)) throw new Error('Unsupported user id format');
  if (!isUploadId(uploadId)) throw new Error('Invalid upload id');
  if (!(MOD_FILE_KINDS as readonly string[]).includes(kind)) throw new Error('Invalid kind');
  return `${QUARANTINE_PREFIX}${userId}/${uploadId}.${kind}`;
}

export function approvedPath(uploadId: string, downloadName: string): string {
  const p = `${APPROVED_PREFIX}${uploadId}/${downloadName}`;
  if (!APPROVED_RE.test(p) || !isUploadId(uploadId)) throw new Error('Invalid approved path');
  return p;
}

/** True only when `pathname` is exactly the quarantine slot for this user + upload. */
export function isQuarantinePathFor(pathname: string, userId: string, uploadId: string): boolean {
  const m = QUARANTINE_RE.exec(pathname);
  return !!m && m[1] === userId && m[2] === uploadId;
}

export function isApprovedPath(pathname: string): boolean {
  return APPROVED_RE.test(pathname);
}

export function isManagedPath(pathname: string): boolean {
  return QUARANTINE_RE.test(pathname) || APPROVED_RE.test(pathname);
}
