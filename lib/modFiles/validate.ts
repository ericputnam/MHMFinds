/**
 * Byte-level validation of a hosted mod file. The kind comes from the
 * server-recorded extension; the bytes must agree with it. Nothing here
 * trusts the browser-declared content type or filename.
 */
import { createHash } from 'crypto';
import { MAX_MOD_FILE_BYTES, type ModFileKind } from './constants';
import { inspectZip, type ZipEntrySummary } from './zipInspect';

export interface ModFileInspection {
  kind: ModFileKind;
  sizeBytes: number;
  sha256: string;
  containsScript: boolean;
  /** Bounded summary for the admin review screen. */
  summary: {
    format: string;
    entryCount?: number;
    totalUncompressed?: number;
    packageCount?: number;
    scriptCount?: number;
    entries?: { name: string; size: number }[];
    entriesTruncated?: boolean;
    nested?: { name: string; entries: string[] }[];
    dbpfVersion?: string;
    resourceCount?: number;
  };
}

export type ModFileValidation =
  | { ok: true; inspection: ModFileInspection }
  | { ok: false; error: string };

const DBPF_HEADER_BYTES = 96;
const MAX_LISTED_ENTRIES = 300;

/** Sims 4 .package files are DBPF 2.x containers. */
export function checkDbpf(buf: Buffer): { ok: true; version: string; resourceCount: number } | { ok: false; error: string } {
  if (buf.length < DBPF_HEADER_BYTES) return { ok: false, error: 'the file is too small to be a .package file' };
  if (buf.toString('latin1', 0, 4) !== 'DBPF') return { ok: false, error: 'the file is not a Sims .package file (wrong file signature)' };
  const major = buf.readUInt32LE(4);
  const minor = buf.readUInt32LE(8);
  if (major !== 2) return { ok: false, error: `unsupported .package version ${major}.${minor}` };
  const count = buf.readUInt32LE(36);
  const indexSize = buf.readUInt32LE(44);
  const indexPos = buf.readUInt32LE(64) || buf.readUInt32LE(40);
  if (count > 0 && (indexPos < DBPF_HEADER_BYTES || indexPos + indexSize > buf.length)) {
    return { ok: false, error: 'the .package file is damaged (index outside the file)' };
  }
  return { ok: true, version: `${major}.${minor}`, resourceCount: count };
}

export function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

function listEntries(entries: ZipEntrySummary[]) {
  const files = entries.filter((e) => !e.isDirectory);
  return {
    entries: files.slice(0, MAX_LISTED_ENTRIES).map((e) => ({ name: e.name, size: e.size })),
    entriesTruncated: files.length > MAX_LISTED_ENTRIES ? true : undefined,
  };
}

export function validateModFileBytes(buf: Buffer, kind: ModFileKind): ModFileValidation {
  if (buf.length === 0) return { ok: false, error: 'the file is empty' };
  if (buf.length > MAX_MOD_FILE_BYTES) return { ok: false, error: 'the file is larger than 100 MB' };

  const sha256 = sha256Hex(buf);

  if (kind === 'package') {
    const r = checkDbpf(buf);
    if (!r.ok) return r;
    return {
      ok: true,
      inspection: {
        kind,
        sizeBytes: buf.length,
        sha256,
        containsScript: false,
        summary: { format: 'DBPF', dbpfVersion: r.version, resourceCount: r.resourceCount },
      },
    };
  }

  const r = inspectZip(buf, kind === 'ts4script' ? 'ts4script' : 'mod-zip');
  if (!r.ok) return { ok: false, error: r.error };
  return {
    ok: true,
    inspection: {
      kind,
      sizeBytes: buf.length,
      sha256,
      containsScript: r.containsScript,
      summary: {
        format: kind === 'ts4script' ? 'ts4script (zip of Python)' : 'zip',
        entryCount: r.entryCount,
        totalUncompressed: r.totalUncompressed,
        packageCount: r.packageCount,
        scriptCount: r.scriptCount,
        ...listEntries(r.entries),
        nested: r.nested?.map((n) => ({ name: n.name, entries: n.entries.slice(0, MAX_LISTED_ENTRIES) })),
      },
    },
  };
}
