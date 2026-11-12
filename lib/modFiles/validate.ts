/**
 * Byte-level validation of a hosted mod file. The kind comes from the
 * server-recorded extension; the bytes must agree with it. Nothing here
 * trusts the browser-declared content type or filename.
 */
import { createHash } from 'crypto';
import { MAX_MOD_FILE_BYTES, type HostedGame, type ModFileKind } from './constants';
import { inspectZip, openZip, entryExtension, type ZipEntrySummary } from './zipInspect';
import {
  inspectBedrockAddon,
  inspectBedrockPack,
  inspectBedrockWorld,
  inspectJavaMod,
  inspectJavaPack,
  type MinecraftDetails,
  type MinecraftInspection,
  type MinecraftResult,
} from './minecraft';

export interface ModFileInspection {
  kind: ModFileKind;
  /** Which game the bytes are for. Absent on rows verified before Minecraft support (all Sims). */
  game: HostedGame;
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
    /** .class files in a jar, .js files in a Bedrock file. */
    codeFileCount?: number;
    minecraft?: MinecraftDetails;
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
        game: 'sims4',
        sizeBytes: buf.length,
        sha256,
        containsScript: false,
        summary: { format: 'DBPF', dbpfVersion: r.version, resourceCount: r.resourceCount },
      },
    };
  }

  if (kind === 'ts4script') return simsZip(buf, kind, sha256);
  if (kind === 'zip') return zipOfEitherGame(buf, sha256);

  const mc: MinecraftResult =
    kind === 'jar'
      ? inspectJavaMod(buf)
      : kind === 'mcpack'
        ? inspectBedrockPack(buf)
        : kind === 'mcaddon'
          ? inspectBedrockAddon(buf)
          : inspectBedrockWorld(buf, kind === 'mctemplate');
  if (!mc.ok) return mc;
  return minecraftValidation(mc, kind, buf.length, sha256);
}

const MINECRAFT_FORMAT_LABEL: Record<MinecraftInspection['format'], string> = {
  'java-mod': 'Minecraft Java mod',
  'java-pack': 'Minecraft Java pack',
  'bedrock-pack': 'Minecraft Bedrock pack',
  'bedrock-addon': 'Minecraft Bedrock add-on',
  'bedrock-world': 'Minecraft Bedrock world',
  'bedrock-template': 'Minecraft Bedrock world template',
};

function minecraftValidation(mc: MinecraftInspection, kind: ModFileKind, size: number, sha256: string): ModFileValidation {
  const label = MINECRAFT_FORMAT_LABEL[mc.format];
  const loader = mc.details.loader ? ` (${mc.details.loader[0].toUpperCase()}${mc.details.loader.slice(1)})` : '';
  return {
    ok: true,
    inspection: {
      kind,
      game: 'minecraft',
      sizeBytes: size,
      sha256,
      containsScript: mc.runsCode,
      summary: {
        format: label + loader,
        entryCount: mc.entryCount,
        totalUncompressed: mc.totalUncompressed,
        codeFileCount: mc.codeFileCount,
        minecraft: mc.details,
        ...listEntries(mc.entries),
        nested: mc.nested?.map((n) => ({ name: n.name, entries: n.entries.slice(0, MAX_LISTED_ENTRIES) })),
      },
    },
  };
}

function simsZip(buf: Buffer, kind: 'zip' | 'ts4script', sha256: string): ModFileValidation {
  const r = inspectZip(buf, kind === 'ts4script' ? 'ts4script' : 'mod-zip');
  if (!r.ok) return { ok: false, error: r.error };
  return {
    ok: true,
    inspection: {
      kind,
      game: 'sims4',
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

/** Extensions that only a Sims mod zip carries. */
const SIMS_ONLY = new Set(['package', 'ts4script', 'trayitem', 'blueprint', 'bpi', 'hhi', 'sgi', 'householdbinary', 'room', 'rmi']);

/**
 * A .zip is a Sims mod or a Minecraft Java pack (resource, data or skin
 * pack). Sims rules go first. If the zip holds any Sims-only file type, the
 * Sims answer stands, so a Sims creator still gets the Sims error. Otherwise
 * the Minecraft pack rules get a turn.
 */
function zipOfEitherGame(buf: Buffer, sha256: string): ModFileValidation {
  const sims = simsZip(buf, 'zip', sha256);
  if (sims.ok) return sims;

  const opened = openZip(buf);
  if (!opened.ok) return sims; // a structural problem: the Sims message already names it
  if (opened.entries.some((e) => !e.isDirectory && SIMS_ONLY.has(entryExtension(e.name)))) return sims;

  const mc = inspectJavaPack(buf);
  if (mc.ok) return minecraftValidation(mc, 'zip', buf.length, sha256);
  if (/no Minecraft textures/.test(mc.error)) {
    return {
      ok: false,
      error: 'the zip contains no Sims 4 mod files (.package or .ts4script) and no Minecraft pack files (textures, models, sounds or data)',
    };
  }
  return mc;
}
