/**
 * Minimal, deliberately hackable zip writer for the hosted-mod-file validator
 * tests. Real zip libraries refuse to produce the malformed archives we need
 * to prove are rejected (symlinks, mismatched local/central names, hidden
 * bytes between records), so every field is overridable here.
 */
import zlib from 'zlib';

export interface ZipEntrySpec {
  name: string;
  data?: Buffer | string;
  /** 0 = stored, 8 = deflate. Default 8 for files, 0 for directories. */
  method?: number;
  /** General-purpose flags in both headers (default 0x0800, UTF-8 names). */
  flags?: number;
  /** Version made by. High byte = host OS (3 = Unix). Default 0x031e. */
  madeBy?: number;
  /** External attributes. Default regular file 0644 (or dir 0755) for Unix. */
  extAttr?: number;
  /** Extra field written to BOTH headers unless overridden. */
  extra?: Buffer;
  /** Override what the local header says (to fake disagreements). */
  localName?: string;
  localMethod?: number;
  localFlags?: number;
  /** Raw name bytes, bypassing UTF-8 encoding (for invalid-UTF-8 tests). */
  rawName?: Buffer;
  /** Override the sizes in the central directory. */
  cdSize?: number;
  cdCompressedSize?: number;
}

export interface ZipBuildOptions {
  /** Bytes written before the first local header. */
  prefix?: Buffer;
  /** Bytes inserted between local record i and i+1, keyed by i. */
  gapAfter?: Record<number, Buffer>;
  /** Bytes after the last local record, before the central directory. */
  beforeCd?: Buffer;
  /** Bytes appended after the EOCD (not counted as a comment). */
  trailing?: Buffer;
  /** Point central-directory entry i at entry j's local header. */
  localOffsetFrom?: Record<number, number>;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}
function u32(n: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0);
  return b;
}

export function buildZip(specs: ZipEntrySpec[], opts: ZipBuildOptions = {}): Buffer {
  const parts: Buffer[] = [];
  let offset = 0;
  const push = (b: Buffer) => {
    parts.push(b);
    offset += b.length;
  };
  if (opts.prefix) push(opts.prefix);

  const records: {
    spec: ZipEntrySpec;
    nameBytes: Buffer;
    method: number;
    flags: number;
    crc: number;
    size: number;
    compressedSize: number;
    localOffset: number;
  }[] = [];

  specs.forEach((spec, i) => {
    const isDir = spec.name.endsWith('/');
    const raw = typeof spec.data === 'string' ? Buffer.from(spec.data) : spec.data ?? Buffer.alloc(0);
    const method = spec.method ?? (isDir ? 0 : 8);
    const body = method === 8 ? zlib.deflateRawSync(raw) : raw;
    const flags = spec.flags ?? 0x0800;
    const nameBytes = spec.rawName ?? Buffer.from(spec.name, 'utf8');
    const localNameBytes = spec.localName !== undefined ? Buffer.from(spec.localName, 'utf8') : nameBytes;
    const extra = spec.extra ?? Buffer.alloc(0);
    const crc = crc32(raw);

    const localOffset = offset;
    push(
      Buffer.concat([
        u32(0x04034b50),
        u16(20),
        u16(spec.localFlags ?? flags),
        u16(spec.localMethod ?? method),
        u16(0),
        u16(0),
        u32(crc),
        u32(body.length),
        u32(raw.length),
        u16(localNameBytes.length),
        u16(extra.length),
        localNameBytes,
        extra,
        body,
      ]),
    );
    records.push({ spec, nameBytes, method, flags, crc, size: raw.length, compressedSize: body.length, localOffset });
    if (opts.gapAfter?.[i]) push(opts.gapAfter[i]);
  });
  if (opts.beforeCd) push(opts.beforeCd);

  const cdOffset = offset;
  records.forEach((r, i) => {
    const isDir = r.spec.name.endsWith('/');
    const madeBy = r.spec.madeBy ?? 0x031e;
    const extAttr = r.spec.extAttr ?? (madeBy >> 8 === 3 ? ((isDir ? 0o040755 : 0o100644) << 16) >>> 0 : 0);
    const extra = r.spec.extra ?? Buffer.alloc(0);
    const target = opts.localOffsetFrom?.[i];
    const localOffset = target !== undefined ? records[target].localOffset : r.localOffset;
    push(
      Buffer.concat([
        u32(0x02014b50),
        u16(madeBy),
        u16(20),
        u16(r.flags),
        u16(r.method),
        u16(0),
        u16(0),
        u32(r.crc),
        u32(r.spec.cdCompressedSize ?? r.compressedSize),
        u32(r.spec.cdSize ?? r.size),
        u16(r.nameBytes.length),
        u16(extra.length),
        u16(0),
        u16(0),
        u16(0),
        u32(extAttr),
        u32(localOffset),
        r.nameBytes,
        extra,
      ]),
    );
  });
  const cdSize = offset - cdOffset;
  push(
    Buffer.concat([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(records.length),
      u16(records.length),
      u32(cdSize),
      u32(cdOffset),
      u16(0),
    ]),
  );
  if (opts.trailing) push(opts.trailing);
  return Buffer.concat(parts);
}

/** A minimal valid DBPF 2.1 header with no resources (96 bytes + padding). */
export function fakePackage(extra = 32): Buffer {
  const b = Buffer.alloc(96 + extra);
  b.write('DBPF', 0, 'latin1');
  b.writeUInt32LE(2, 4);
  b.writeUInt32LE(1, 8);
  return b;
}

/** Info-ZIP Unicode Path extra field (0x7075) carrying `name`. */
export function unicodePathExtra(name: string): Buffer {
  const nameBytes = Buffer.from(name, 'utf8');
  const body = Buffer.concat([Buffer.from([1]), u32(0), nameBytes]);
  return Buffer.concat([u16(0x7075), u16(body.length), body]);
}

/** A valid .ts4script (zip of Python). */
export function fakeTs4script(extraEntries: ZipEntrySpec[] = []): Buffer {
  return buildZip([{ name: 'mymod/__init__.pyc', data: Buffer.from([0x42, 0x0d, 0x0d, 0x0a, 1, 2, 3]) }, ...extraEntries]);
}
