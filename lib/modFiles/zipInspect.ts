/**
 * Strict, dependency-free ZIP inspector for creator uploads (.zip and
 * .ts4script — a .ts4script is a zip of Python).
 *
 * This never extracts anything to disk. It parses the central directory,
 * cross-checks every entry against its local header, and rejects anything an
 * extractor could interpret differently from what we inspected:
 *
 *   - ZIP64, multi-disk, trailing/prepended data, CD not ending at the EOCD
 *   - encrypted entries, compression other than stored/deflate
 *   - local header name/method that disagrees with the central directory,
 *     overlapping entries (zip-bomb / polyglot trick), duplicate names
 *   - symlinks and other non-regular Unix file types
 *   - path traversal, absolute paths, backslashes, drive letters, control
 *     and bidi characters, Windows reserved names, over-long or over-deep paths
 *   - a Unicode-path extra field (0x7075) whose name differs from the header
 *   - extensions outside a Sims-only allowlist, nested archives
 *   - more than 2,000 entries, >1 GB declared uncompressed, high ratios
 *
 * Rejection is always the safe answer: a creator can re-zip; a player who
 * runs a smuggled .exe cannot un-run it.
 */
import zlib from 'zlib';

export interface ZipEntrySummary {
  name: string;
  size: number;
  compressedSize: number;
  isDirectory: boolean;
}

export interface ZipInspection {
  ok: true;
  entries: ZipEntrySummary[];
  entryCount: number;
  totalUncompressed: number;
  containsScript: boolean;
  packageCount: number;
  scriptCount: number;
  /** For a .ts4script: the Python files inside. For a .zip: per nested .ts4script. */
  nested?: { name: string; entries: string[] }[];
}

export interface ZipRejection {
  ok: false;
  error: string;
}

export type ZipResult = ZipInspection | ZipRejection;

export type ZipProfile = 'mod-zip' | 'ts4script';

const SIG_EOCD = 0x06054b50;
const SIG_CD = 0x02014b50;
const SIG_LOCAL = 0x04034b50;
const SIG_ZIP64_LOCATOR = 0x07064b50;
const SIG_DATA_DESCRIPTOR = 0x08074b50;

export const ZIP_LIMITS = {
  maxEntries: 2000,
  maxTotalUncompressed: 1024 * 1024 * 1024,
  ratioCheckAbove: 10 * 1024 * 1024,
  maxRatio: 200,
  maxPathLength: 255,
  maxDepth: 8,
  maxNestedScriptBytes: 64 * 1024 * 1024,
} as const;

/** Files a Sims 4 player legitimately drops into Mods/ or Tray/, plus readme/preview files. */
const MOD_ZIP_EXTENSIONS = new Set([
  'package',
  'ts4script',
  // Tray (lots, rooms, Sims)
  'trayitem', 'blueprint', 'bpi', 'hhi', 'householdbinary', 'sgi', 'room', 'rmi',
  // Docs / previews
  'txt', 'md', 'cfg', 'png', 'jpg', 'jpeg', 'webp',
]);

/** Inside a .ts4script: Python and data only. Native code (.pyd/.dll/.so) is refused. */
const TS4SCRIPT_EXTENSIONS = new Set(['py', 'pyc', 'pyo', 'txt', 'md', 'json', 'cfg']);

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
// C0/C1 controls, DEL, bidi overrides/isolates/marks, BOM/zero-width chars.
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[\u0000-\u001f\u007f-\u009f؜​-‏‪-‮⁦-⁩﻿]/;
const WINDOWS_INVALID = /[<>:"|?*]/;

function reject(error: string): ZipRejection {
  return { ok: false, error };
}

function ext(name: string): string {
  const base = name.replace(/\/+$/, '').split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return '';
  return base.slice(dot + 1).toLowerCase();
}

/** Returns an error string if the entry path is unsafe, else null. */
export function checkEntryPath(name: string): string | null {
  if (name.length === 0) return 'an entry has an empty name';
  if (name.length > ZIP_LIMITS.maxPathLength) return 'an entry path is too long';
  if (FORBIDDEN_CHARS.test(name)) return 'an entry name contains hidden or control characters';
  if (name.includes('\\')) return 'an entry name contains a backslash';
  if (name.startsWith('/')) return 'an entry has an absolute path';
  if (/^[A-Za-z]:/.test(name)) return 'an entry has a drive-letter path';
  if (WINDOWS_INVALID.test(name)) return 'an entry name contains characters Windows cannot use';

  const trimmed = name.endsWith('/') ? name.slice(0, -1) : name;
  const segments = trimmed.split('/');
  if (segments.length > ZIP_LIMITS.maxDepth) return 'an entry is nested too deeply';
  for (const seg of segments) {
    if (seg === '') return 'an entry path has an empty folder name';
    if (seg === '.' || seg === '..') return 'an entry path tries to leave the archive folder';
    if (/[. ]$/.test(seg)) return 'an entry name ends with a dot or space';
    if (WINDOWS_RESERVED.test(seg)) return 'an entry uses a reserved Windows name';
  }
  return null;
}

/** macOS Finder metadata that we tolerate (it is never loaded by the game). */
function isMacMetadata(name: string): boolean {
  return name.startsWith('__MACOSX/') || name === '.DS_Store' || name.endsWith('/.DS_Store');
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

function decodeName(bytes: Buffer): string | null {
  try {
    return utf8.decode(bytes);
  } catch {
    return null;
  }
}

/** Walk extra-field records; return the Info-ZIP Unicode Path (0x7075) name if any. */
function readExtra(extra: Buffer): { unicodePath: string | null; malformed: boolean; zip64: boolean } {
  let off = 0;
  let unicodePath: string | null = null;
  let zip64 = false;
  while (off < extra.length) {
    if (off + 4 > extra.length) return { unicodePath, malformed: true, zip64 };
    const id = extra.readUInt16LE(off);
    const size = extra.readUInt16LE(off + 2);
    const start = off + 4;
    if (start + size > extra.length) return { unicodePath, malformed: true, zip64 };
    if (id === 0x0001) zip64 = true;
    if (id === 0x7075) {
      if (size < 5) return { unicodePath, malformed: true, zip64 };
      const decoded = decodeName(extra.subarray(start + 5, start + size));
      if (decoded === null) return { unicodePath, malformed: true, zip64 };
      unicodePath = decoded;
    }
    off = start + size;
  }
  return { unicodePath, malformed: false, zip64 };
}

interface RawEntry {
  name: string;
  method: number;
  flags: number;
  compressedSize: number;
  size: number;
  localOffset: number;
  dataStart: number;
  dataEnd: number;
  /** End of the whole local record (header + data + optional data descriptor). */
  recordEnd: number;
  isDirectory: boolean;
}

function findEocd(buf: Buffer): number {
  const min = Math.max(0, buf.length - 22 - 0xffff);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) {
      const commentLen = buf.readUInt16LE(i + 20);
      if (i + 22 + commentLen === buf.length) return i;
    }
  }
  return -1;
}

/** Read the first bytes of an entry's content without inflating the whole thing. */
function peekEntry(buf: Buffer, e: RawEntry, n: number): Buffer | null {
  const data = buf.subarray(e.dataStart, e.dataEnd);
  if (e.method === 0) return data.subarray(0, n);
  try {
    const out = zlib.inflateRawSync(data.subarray(0, Math.min(data.length, 4096)), {
      finishFlush: zlib.constants.Z_SYNC_FLUSH,
    });
    return out.subarray(0, n);
  } catch {
    return null;
  }
}

function inflateEntry(buf: Buffer, e: RawEntry, maxBytes: number): Buffer | null {
  if (e.size > maxBytes) return null;
  const data = buf.subarray(e.dataStart, e.dataEnd);
  try {
    const out = e.method === 0 ? Buffer.from(data) : zlib.inflateRawSync(data, { maxOutputLength: Math.max(1, e.size) });
    return out.length === e.size ? out : null;
  } catch {
    return null;
  }
}

function parseZip(buf: Buffer): RawEntry[] | ZipRejection {
  if (buf.length < 22) return reject('the archive is too small to be a zip file');
  if (buf.readUInt32LE(0) !== SIG_LOCAL) return reject('the file does not start like a zip file');

  const eocd = findEocd(buf);
  if (eocd < 0) return reject('the zip file is damaged or has extra data appended to it');
  if (eocd >= 20 && buf.readUInt32LE(eocd - 20) === SIG_ZIP64_LOCATOR) {
    return reject('ZIP64 archives are not supported — please re-zip with a standard tool');
  }

  const diskNo = buf.readUInt16LE(eocd + 4);
  const cdDisk = buf.readUInt16LE(eocd + 6);
  const entriesOnDisk = buf.readUInt16LE(eocd + 8);
  const totalEntries = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);

  if (totalEntries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    return reject('ZIP64 archives are not supported — please re-zip with a standard tool');
  }
  if (diskNo !== 0 || cdDisk !== 0 || entriesOnDisk !== totalEntries) {
    return reject('split (multi-part) zip files are not supported');
  }
  if (totalEntries === 0) return reject('the zip file is empty');
  if (totalEntries > ZIP_LIMITS.maxEntries) return reject(`the zip has more than ${ZIP_LIMITS.maxEntries} files`);
  if (cdOffset + cdSize !== eocd) return reject('the zip file directory is malformed');

  const entries: RawEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (p + 46 > eocd || buf.readUInt32LE(p) !== SIG_CD) return reject('the zip file directory is malformed');
    const madeBy = buf.readUInt16LE(p + 4);
    const flags = buf.readUInt16LE(p + 8);
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const diskStart = buf.readUInt16LE(p + 34);
    const extAttr = buf.readUInt32LE(p + 38);
    const localOffset = buf.readUInt32LE(p + 42);

    const recEnd = p + 46 + nameLen + extraLen + commentLen;
    if (recEnd > eocd) return reject('the zip file directory is malformed');
    const nameBytes = buf.subarray(p + 46, p + 46 + nameLen);
    const extra = buf.subarray(p + 46 + nameLen, p + 46 + nameLen + extraLen);
    p = recEnd;

    if (flags & 0x0001 || flags & 0x0040 || flags & 0x2000) {
      return reject('password-protected or encrypted zip files are not accepted');
    }
    if (method !== 0 && method !== 8) return reject('the zip uses an unsupported compression method');
    if (compressedSize === 0xffffffff || size === 0xffffffff || localOffset === 0xffffffff || diskStart !== 0) {
      return reject('ZIP64 archives are not supported — please re-zip with a standard tool');
    }

    const name = decodeName(nameBytes);
    if (name === null) return reject('an entry name is not valid text (re-zip with UTF-8 filenames)');
    const extraInfo = readExtra(extra);
    if (extraInfo.malformed) return reject('the zip file directory is malformed');
    if (extraInfo.zip64) return reject('ZIP64 archives are not supported — please re-zip with a standard tool');
    if (extraInfo.unicodePath !== null && extraInfo.unicodePath !== name) {
      return reject('an entry has two different names');
    }

    // Unix file type (upper 16 bits of external attributes when made on Unix).
    const hostOs = madeBy >> 8;
    if (hostOs === 3) {
      const type = (extAttr >>> 16) & 0xf000;
      if (type === 0xa000) return reject('the zip contains a symbolic link');
      if (type !== 0 && type !== 0x8000 && type !== 0x4000) return reject('the zip contains a special file');
    }
    const isDirectory = name.endsWith('/');
    if (isDirectory && size !== 0) return reject('the zip file directory is malformed');
    if (method === 0 && compressedSize !== size) return reject('the zip file directory is malformed');

    // Cross-check the local header — extractors read it, so it must agree.
    if (localOffset + 30 > cdOffset || buf.readUInt32LE(localOffset) !== SIG_LOCAL) {
      return reject('the zip file is malformed');
    }
    const lFlags = buf.readUInt16LE(localOffset + 6);
    const lMethod = buf.readUInt16LE(localOffset + 8);
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    if (lMethod !== method || (lFlags & 0x0001) !== (flags & 0x0001)) return reject('the zip file is malformed');
    const lName = buf.subarray(localOffset + 30, localOffset + 30 + lNameLen);
    if (!lName.equals(nameBytes)) return reject('an entry has two different names');
    const lExtra = buf.subarray(localOffset + 30 + lNameLen, localOffset + 30 + lNameLen + lExtraLen);
    const lExtraInfo = readExtra(lExtra);
    if (lExtraInfo.malformed || lExtraInfo.zip64) return reject('the zip file is malformed');
    if (lExtraInfo.unicodePath !== null && lExtraInfo.unicodePath !== name) {
      return reject('an entry has two different names');
    }

    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > cdOffset) return reject('the zip file is malformed');
    let recordEnd = dataEnd;
    if (flags & 0x0008) {
      const hasSig = dataEnd + 4 <= cdOffset && buf.readUInt32LE(dataEnd) === SIG_DATA_DESCRIPTOR;
      recordEnd = dataEnd + (hasSig ? 16 : 12);
      if (recordEnd > cdOffset) return reject('the zip file is malformed');
    }

    entries.push({
      name,
      method,
      flags,
      compressedSize,
      size,
      localOffset,
      dataStart,
      dataEnd,
      recordEnd,
      isDirectory,
    });
  }
  if (p !== eocd) return reject('the zip file directory is malformed');

  // Local records must tile the file exactly: start at 0, never overlap,
  // leave no gaps, and end where the central directory begins. Anything else
  // is bytes we did not inspect that some extractor might still read.
  const sorted = [...entries].sort((a, b) => a.localOffset - b.localOffset);
  if (sorted[0].localOffset !== 0) return reject('the zip file has data hidden at the start');
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].localOffset < sorted[i - 1].recordEnd) return reject('the zip file has overlapping entries');
    if (sorted[i].localOffset > sorted[i - 1].recordEnd) return reject('the zip file has hidden data between entries');
  }
  if (sorted[sorted.length - 1].recordEnd !== cdOffset) return reject('the zip file has hidden data before its directory');
  return entries;
}

function inspectEntries(
  buf: Buffer,
  entries: RawEntry[],
  profile: ZipProfile,
  depth: number,
): ZipResult {
  const allowed = profile === 'ts4script' ? TS4SCRIPT_EXTENSIONS : MOD_ZIP_EXTENSIONS;
  const seen = new Set<string>();
  let total = 0;
  let packageCount = 0;
  let scriptCount = 0;
  let pythonCount = 0;
  const nested: { name: string; entries: string[] }[] = [];

  for (const e of entries) {
    const pathError = checkEntryPath(e.name);
    if (pathError) return reject(`${pathError} ("${e.name.slice(0, 80)}")`);

    const key = e.name.replace(/\/+$/, '').normalize('NFC').toLowerCase();
    if (seen.has(key)) return reject(`the zip contains the same file twice ("${e.name.slice(0, 80)}")`);
    seen.add(key);

    total += e.size;
    if (total > ZIP_LIMITS.maxTotalUncompressed) return reject('the zip expands to more than 1 GB');
    if (e.size > ZIP_LIMITS.ratioCheckAbove && e.size / Math.max(1, e.compressedSize) > ZIP_LIMITS.maxRatio) {
      return reject('the zip contains a file with a suspicious compression ratio');
    }

    if (e.isDirectory) continue;
    if (profile === 'mod-zip' && isMacMetadata(e.name)) continue;

    const x = ext(e.name);
    if (!allowed.has(x)) {
      const what = x ? `.${x}` : 'no extension';
      return reject(
        profile === 'ts4script'
          ? `the script file contains a file type we do not accept (${what}: "${e.name.slice(0, 80)}")`
          : `the zip contains a file type we do not accept (${what}: "${e.name.slice(0, 80)}")`,
      );
    }

    if (x === 'package') {
      packageCount++;
      const head = peekEntry(buf, e, 4);
      if (!head || head.length < 4 || head.toString('latin1') !== 'DBPF') {
        return reject(`"${e.name.slice(0, 80)}" is not a valid .package file`);
      }
    } else if (x === 'ts4script') {
      scriptCount++;
      if (depth > 0) return reject('nested script archives are not accepted');
      const inner = inflateEntry(buf, e, ZIP_LIMITS.maxNestedScriptBytes);
      if (!inner) return reject(`"${e.name.slice(0, 80)}" could not be read`);
      const res = inspectZipBuffer(inner, 'ts4script', depth + 1);
      if (!res.ok) return reject(`"${e.name.slice(0, 80)}": ${res.error}`);
      nested.push({ name: e.name, entries: res.entries.filter((n) => !n.isDirectory).map((n) => n.name) });
    } else if (x === 'py' || x === 'pyc' || x === 'pyo') {
      pythonCount++;
    }
  }

  if (profile === 'mod-zip' && packageCount + scriptCount === 0) {
    return reject('the zip does not contain any .package or .ts4script files');
  }
  if (profile === 'ts4script' && pythonCount === 0) {
    return reject('the script file does not contain any Python code');
  }

  return {
    ok: true,
    entries: entries.map((e) => ({
      name: e.name,
      size: e.size,
      compressedSize: e.compressedSize,
      isDirectory: e.isDirectory,
    })),
    entryCount: entries.length,
    totalUncompressed: total,
    containsScript: profile === 'ts4script' || scriptCount > 0 || pythonCount > 0,
    packageCount,
    scriptCount: profile === 'ts4script' ? 1 : scriptCount,
    nested: nested.length ? nested : undefined,
  };
}

function inspectZipBuffer(buf: Buffer, profile: ZipProfile, depth: number): ZipResult {
  const parsed = parseZip(buf);
  if (!Array.isArray(parsed)) return parsed;
  return inspectEntries(buf, parsed, profile, depth);
}

export function inspectZip(buf: Buffer, profile: ZipProfile): ZipResult {
  return inspectZipBuffer(buf, profile, 0);
}
