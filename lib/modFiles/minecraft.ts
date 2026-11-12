/**
 * Content rules for hosted Minecraft files. Every format here is a zip, so
 * each one first passes the same strict parser as a Sims .zip (`openZip`:
 * no path tricks, encryption, ZIP64, overlaps, symlinks or zip bombs). These
 * rules then decide what may be inside.
 *
 *   .jar         Java Edition mod (Fabric, Quilt, Forge, NeoForge). Runs code.
 *                Needs its loader's manifest and at least one .class file.
 *                Refused: native libraries, executables and bundled jars
 *                (jar-in-jar), because a bundled jar is code we did not list.
 *   .zip         Java resource pack, data pack or skin pack: textures, models,
 *                sounds, text. No code at all.
 *   .mcpack      Bedrock pack. Needs a valid manifest.json.
 *   .mcaddon     Bedrock add-on: pack folders and/or .mcpack files.
 *   .mcworld     Bedrock world (level.dat + LevelDB files in db/).
 *   .mctemplate  Bedrock world template (a world plus manifest.json).
 *
 * Bedrock packs may carry Script API JavaScript (.js). Like a .jar, that is
 * code the player runs, so it is accepted and flagged (`runsCode`), and the
 * download page says so. We cannot scan bytecode or JavaScript for malware;
 * the SHA-256 recorded at verify is for the admin's lookup.
 */
import {
  entryExtension,
  isFinderMetadata,
  openZip,
  ZIP_LIMITS,
  type OpenedZipEntry,
  type ZipEntrySummary,
} from './zipInspect';

export type MinecraftFormat =
  | 'java-mod'
  | 'java-pack'
  | 'bedrock-pack'
  | 'bedrock-addon'
  | 'bedrock-world'
  | 'bedrock-template';

export type JavaModLoader = 'fabric' | 'quilt' | 'forge' | 'neoforge';

export interface MinecraftDetails {
  loader?: JavaModLoader;
  modId?: string;
  name?: string;
  version?: string;
  /** e.g. "~1.21.1" from fabric.mod.json, or the Bedrock min_engine_version. */
  minecraftVersion?: string;
  /** Java pack.mcmeta pack_format. */
  packFormat?: number;
  /** Bedrock module types across every manifest: resources, data, skin_pack, script… */
  packTypes?: string[];
}

export interface MinecraftInspection {
  ok: true;
  format: MinecraftFormat;
  entries: ZipEntrySummary[];
  entryCount: number;
  totalUncompressed: number;
  /** True for a .jar and for any Bedrock pack with JavaScript or a script module. */
  runsCode: boolean;
  /** .class files in a jar, .js files in a Bedrock file. */
  codeFileCount: number;
  details: MinecraftDetails;
  nested?: { name: string; entries: string[] }[];
}

export type MinecraftResult = MinecraftInspection | { ok: false; error: string };

/** Textures, models, sounds and text a Java resource/data/skin pack may hold. No code. */
const JAVA_ASSET_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'json', 'mcmeta', 'lang', 'txt', 'md', 'ogg', 'properties',
  'nbt', 'snbt', 'mcfunction',
  // Core shaders run on the GPU, not as program code.
  'fsh', 'vsh', 'glsl',
  // OptiFine custom entity models.
  'jem', 'jpm',
]);

/** A Java mod jar: the assets above plus compiled classes and loader metadata. */
const JAVA_MOD_EXTENSIONS = new Set([
  ...Array.from(JAVA_ASSET_EXTENSIONS),
  'class', 'toml', 'mf', 'accesswidener', 'cfg', 'kotlin_module',
]);

/** Jar signature files, accepted only directly under META-INF/. */
const JAR_SIGNATURE_EXTENSIONS = new Set(['sf', 'rsa', 'dsa', 'ec']);

/** A Bedrock pack: textures, models, sounds, text, structures, and Script API JavaScript. */
const BEDROCK_PACK_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'tga', 'json', 'lang', 'txt', 'md', 'ogg', 'fsb', 'wav',
  'mcfunction', 'mcstructure', 'material', 'js',
]);

/** A Bedrock world: pack files plus level data and LevelDB tables. */
const BEDROCK_WORLD_EXTENSIONS = new Set([...Array.from(BEDROCK_PACK_EXTENSIONS), 'dat', 'dat_old', 'ldb', 'log', 'sst']);

/** Named so the error can say what the file is, not just that it is unknown. */
const NATIVE_OR_EXECUTABLE = new Set([
  'dll', 'so', 'dylib', 'jnilib', 'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'sh', 'ps1', 'vbs', 'app', 'command',
]);
const ARCHIVES = new Set(['jar', 'zip', 'rar', '7z', 'gz', 'tar', 'mcpack', 'mcaddon', 'mcworld', 'mctemplate']);

const BEDROCK_MODULE_TYPES = new Set([
  'resources', 'data', 'skin_pack', 'world_template', 'script', 'javascript', 'client_data', 'interface',
]);

const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_NESTED_PACK_BYTES = 64 * 1024 * 1024;

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function quote(name: string): string {
  return `"${name.slice(0, 80)}"`;
}

/** Files without an extension that a jar may carry at its root: licence and readme texts. */
const JAR_ROOT_TEXT = /^(license|licence|notice|copying|readme|credits|authors)([_-][^/]*)?$/i;

/** LevelDB keeps CURRENT, LOCK and MANIFEST-000001 with no extension. */
const LEVELDB_BARE = /^(CURRENT|LOCK|LOG|LOG\.old|MANIFEST-\d+)$/;

function refusal(e: OpenedZipEntry, what: string): { ok: false; error: string } {
  const x = entryExtension(e.name);
  if (NATIVE_OR_EXECUTABLE.has(x)) return fail(`the ${what} contains native code or a program (.${x}: ${quote(e.name)})`);
  if (ARCHIVES.has(x)) return fail(`the ${what} contains another archive (.${x}: ${quote(e.name)}); bundled archives are not accepted`);
  return fail(`the ${what} contains a file type we do not accept (${x ? `.${x}` : 'no extension'}: ${quote(e.name)})`);
}

/**
 * Parse JSON the way Minecraft does: it tolerates a byte-order mark and
 * // or /* *\/ comments. Strings are copied verbatim, so a "//" inside a
 * URL survives.
 */
export function parseLenientJson(text: string): unknown {
  let out = '';
  let i = 0;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') {
      let j = i + 1;
      while (j < s.length && s[j] !== '"') j += s[j] === '\\' ? 2 : 1;
      out += s.slice(i, j + 1);
      i = j + 1;
    } else if (c === '/' && s[i + 1] === '/') {
      while (i < s.length && s[i] !== '\n') i++;
    } else if (c === '/' && s[i + 1] === '*') {
      const end = s.indexOf('*/', i + 2);
      i = end < 0 ? s.length : end + 2;
    } else {
      out += c;
      i++;
    }
  }
  return JSON.parse(out);
}

function readText(e: OpenedZipEntry, max = MAX_MANIFEST_BYTES): string | null {
  const b = e.read(max);
  if (!b) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    return null;
  }
}

function readJson(e: OpenedZipEntry): unknown | undefined {
  const text = readText(e);
  if (text === null) return undefined;
  try {
    return parseLenientJson(text);
  } catch {
    return undefined;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, max = 120): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
}

function summarize(entries: OpenedZipEntry[]): ZipEntrySummary[] {
  return entries.map(({ name, size, compressedSize, isDirectory }) => ({ name, size, compressedSize, isDirectory }));
}

/**
 * Many tools zip a pack inside one folder ("MyPack/manifest.json"). When
 * every entry shares one top folder, rules about "the root" apply inside it.
 */
function commonRoot(files: OpenedZipEntry[]): string {
  const tops = new Set(files.map((e) => (e.name.includes('/') ? e.name.split('/')[0] + '/' : '')));
  if (tops.size !== 1) return '';
  const [top] = Array.from(tops);
  return top;
}

function filesOf(entries: OpenedZipEntry[]): OpenedZipEntry[] {
  return entries.filter((e) => !e.isDirectory && !isFinderMetadata(e.name));
}

// ─── Java mod (.jar) ──────────────────────────────────────────────────────

function fabricDetails(json: unknown): MinecraftDetails | null {
  if (!isObject(json) || typeof json.id !== 'string' || !/^[a-z][a-z0-9_-]{1,63}$/.test(json.id)) return null;
  const depends = isObject(json.depends) ? json.depends : {};
  const mc = depends.minecraft;
  return {
    loader: 'fabric',
    modId: json.id,
    name: str(json.name),
    version: str(json.version, 60),
    minecraftVersion: Array.isArray(mc) ? str(mc.filter((v) => typeof v === 'string').join(' || ')) : str(mc, 60),
  };
}

function quiltDetails(json: unknown): MinecraftDetails | null {
  const ql = isObject(json) && isObject(json.quilt_loader) ? json.quilt_loader : null;
  if (!ql || typeof ql.id !== 'string' || !ql.id.trim()) return null;
  const meta = isObject(ql.metadata) ? ql.metadata : {};
  return { loader: 'quilt', modId: str(ql.id, 64), name: str(meta.name), version: str(ql.version, 60) };
}

function forgeDetails(toml: string, loader: 'forge' | 'neoforge'): MinecraftDetails | null {
  const modId = /^\s*modId\s*=\s*"([^"]+)"/m.exec(toml)?.[1];
  if (!modId) return null;
  return {
    loader,
    modId: modId.slice(0, 64),
    name: /^\s*displayName\s*=\s*"([^"]+)"/m.exec(toml)?.[1]?.slice(0, 120),
    version: /^\s*version\s*=\s*"([^"]+)"/m.exec(toml)?.[1]?.slice(0, 60),
  };
}

export function inspectJavaMod(buf: Buffer): MinecraftResult {
  const zip = openZip(buf);
  if (!zip.ok) return fail(zip.error.replace(/\bzip\b/g, '.jar'));
  const files = filesOf(zip.entries);

  let classCount = 0;
  for (const e of files) {
    const x = entryExtension(e.name);
    const inMetaInf = e.name.startsWith('META-INF/');
    const ok =
      JAVA_MOD_EXTENSIONS.has(x) ||
      (inMetaInf && !e.name.slice(9).includes('/') && JAR_SIGNATURE_EXTENSIONS.has(x)) ||
      // ServiceLoader registrations are text files named after a Java interface.
      (e.name.startsWith('META-INF/services/') && e.name.split('/').length === 3 && !NATIVE_OR_EXECUTABLE.has(x) && !ARCHIVES.has(x)) ||
      (!e.name.includes('/') && JAR_ROOT_TEXT.test(e.name));
    if (!ok) return refusal(e, '.jar');
    if (x === 'class') {
      classCount++;
      const magic = e.peek(4);
      if (!magic || magic.length < 4 || magic.readUInt32BE(0) !== 0xcafebabe) {
        return fail(`${quote(e.name)} is not a valid Java class file`);
      }
    }
  }

  const byName = new Map(files.map((e) => [e.name, e]));
  let details: MinecraftDetails | null = null;
  const fabric = byName.get('fabric.mod.json');
  const quilt = byName.get('quilt.mod.json');
  const neoforge = byName.get('META-INF/neoforge.mods.toml');
  const forge = byName.get('META-INF/mods.toml');
  if (fabric) {
    details = fabricDetails(readJson(fabric));
    if (!details) return fail('fabric.mod.json is not valid (it needs a lower-case "id")');
  } else if (quilt) {
    details = quiltDetails(readJson(quilt));
    if (!details) return fail('quilt.mod.json is not valid (it needs quilt_loader.id)');
  } else if (neoforge || forge) {
    const text = readText((neoforge ?? forge)!);
    details = text ? forgeDetails(text, neoforge ? 'neoforge' : 'forge') : null;
    if (!details) return fail('the mods.toml file is not valid (it needs a modId)');
  } else {
    return fail(
      'the .jar is not a Minecraft mod: it has no fabric.mod.json, quilt.mod.json or META-INF/mods.toml',
    );
  }
  if (classCount === 0) return fail('the .jar contains no compiled code (.class files)');

  return {
    ok: true,
    format: 'java-mod',
    entries: summarize(zip.entries),
    entryCount: zip.entries.length,
    totalUncompressed: zip.totalUncompressed,
    runsCode: true,
    codeFileCount: classCount,
    details,
  };
}

// ─── Java resource / data / skin pack (.zip) ─────────────────────────────

/** Extensions that make a zip a Minecraft pack rather than a box of README files. */
const JAVA_PACK_CONTENT = new Set(['png', 'json', 'mcmeta', 'ogg', 'mcfunction', 'nbt']);

export function inspectJavaPack(buf: Buffer): MinecraftResult {
  const zip = openZip(buf);
  if (!zip.ok) return fail(zip.error);
  const files = filesOf(zip.entries);

  let content = 0;
  for (const e of files) {
    const x = entryExtension(e.name);
    if (!JAVA_ASSET_EXTENSIONS.has(x)) return refusal(e, 'zip');
    if (JAVA_PACK_CONTENT.has(x)) content++;
    if (x === 'png') {
      const head = e.peek(8);
      if (!head || head.length < 8 || head.readUInt32BE(0) !== 0x89504e47) return fail(`${quote(e.name)} is not a valid PNG image`);
    }
  }
  if (content === 0) return fail('the zip has no Minecraft textures, models, sounds or data');

  const details: MinecraftDetails = {};
  const root = commonRoot(files);
  const mcmeta = files.find((e) => e.name === `${root}pack.mcmeta`);
  if (mcmeta) {
    const json = readJson(mcmeta);
    const pack = isObject(json) && isObject(json.pack) ? json.pack : null;
    if (!pack) return fail('pack.mcmeta is not valid (it needs a "pack" object)');
    if (typeof pack.pack_format === 'number') details.packFormat = pack.pack_format;
  }

  return {
    ok: true,
    format: 'java-pack',
    entries: summarize(zip.entries),
    entryCount: zip.entries.length,
    totalUncompressed: zip.totalUncompressed,
    runsCode: false,
    codeFileCount: 0,
    details,
  };
}

// ─── Bedrock (.mcpack / .mcaddon / .mcworld / .mctemplate) ───────────────

interface BedrockManifest {
  name?: string;
  version?: string;
  minEngine?: string;
  moduleTypes: string[];
}

function version(v: unknown): string | undefined {
  if (Array.isArray(v) && v.every((n) => typeof n === 'number')) return v.join('.');
  return str(v, 40);
}

function readBedrockManifest(e: OpenedZipEntry): BedrockManifest | string {
  const json = readJson(e);
  if (!isObject(json)) return `${quote(e.name)} is not valid JSON`;
  if (typeof json.format_version !== 'number') return `${quote(e.name)} has no format_version`;
  const header = isObject(json.header) ? json.header : null;
  if (!header || typeof header.uuid !== 'string' || !/^[0-9a-f-]{32,36}$/i.test(header.uuid)) {
    return `${quote(e.name)} has no header uuid`;
  }
  if (!Array.isArray(json.modules) || json.modules.length === 0) return `${quote(e.name)} has no modules`;
  const moduleTypes: string[] = [];
  for (const m of json.modules) {
    const type = isObject(m) ? m.type : undefined;
    if (typeof type !== 'string' || !BEDROCK_MODULE_TYPES.has(type)) {
      return `${quote(e.name)} has a module type we do not recognise (${String(type).slice(0, 40)})`;
    }
    moduleTypes.push(type);
  }
  return {
    name: str(header.name),
    version: version(header.version),
    minEngine: version(header.min_engine_version),
    moduleTypes,
  };
}

interface BedrockScan {
  jsCount: number;
  manifests: BedrockManifest[];
  nested: { name: string; entries: string[] }[];
}

/** Allowlist every file, read every manifest.json, and inspect nested .mcpack files when allowed. */
function scanBedrock(
  files: OpenedZipEntry[],
  allowed: Set<string>,
  what: string,
  opts: { leveldb?: boolean; nestedPacks?: boolean } = {},
): BedrockScan | { error: string } {
  const scan: BedrockScan = { jsCount: 0, manifests: [], nested: [] };
  for (const e of files) {
    const x = entryExtension(e.name);
    const base = e.name.split('/').pop() ?? '';
    const isLevelDb = opts.leveldb && /(^|\/)db\/[^/]+$/.test(e.name) && LEVELDB_BARE.test(base);
    if (opts.nestedPacks && x === 'mcpack') {
      const inner = e.read(MAX_NESTED_PACK_BYTES);
      if (!inner) return { error: `${quote(e.name)} could not be read` };
      const res = inspectBedrockPack(inner, true);
      if (!res.ok) return { error: `${quote(e.name)}: ${res.error}` };
      scan.jsCount += res.codeFileCount;
      scan.manifests.push({ moduleTypes: res.details.packTypes ?? [] });
      scan.nested.push({ name: e.name, entries: res.entries.filter((n) => !n.isDirectory).map((n) => n.name) });
      continue;
    }
    if (!allowed.has(x) && !isLevelDb) {
      const r = refusal(e, what);
      return { error: r.error };
    }
    if (x === 'js') scan.jsCount++;
    if (base === 'manifest.json') {
      const m = readBedrockManifest(e);
      if (typeof m === 'string') return { error: m };
      scan.manifests.push(m);
    }
  }
  return scan;
}

function bedrockResult(
  format: MinecraftFormat,
  zip: { entries: OpenedZipEntry[]; totalUncompressed: number },
  scan: BedrockScan,
  primary?: BedrockManifest,
): MinecraftInspection {
  const types = Array.from(new Set(scan.manifests.flatMap((m) => m.moduleTypes)));
  const scriptModule = types.includes('script') || types.includes('javascript');
  return {
    ok: true,
    format,
    entries: summarize(zip.entries),
    entryCount: zip.entries.length,
    totalUncompressed: zip.totalUncompressed,
    runsCode: scan.jsCount > 0 || scriptModule,
    codeFileCount: scan.jsCount,
    details: {
      name: primary?.name,
      version: primary?.version,
      minecraftVersion: primary?.minEngine,
      packTypes: types.length ? types : undefined,
    },
    nested: scan.nested.length ? scan.nested : undefined,
  };
}

export function inspectBedrockPack(buf: Buffer, nested = false): MinecraftResult {
  const zip = openZip(buf);
  if (!zip.ok) return fail(zip.error);
  const files = filesOf(zip.entries);
  const root = commonRoot(files);
  const manifest = files.find((e) => e.name === `${root}manifest.json`);
  if (!manifest) return fail('the .mcpack has no manifest.json at its top level');
  const scan = scanBedrock(files, BEDROCK_PACK_EXTENSIONS, '.mcpack', { nestedPacks: false });
  if ('error' in scan) return fail(scan.error);
  const primary = readBedrockManifest(manifest);
  if (typeof primary === 'string') return fail(primary);
  void nested;
  primary.name = localizedName(files, root, primary.name);
  return bedrockResult('bedrock-pack', zip, scan, primary);
}

/** Bedrock manifests often name a pack by a key ("pack.name") defined in texts/en_US.lang. */
function localizedName(files: OpenedZipEntry[], root: string, name: string | undefined): string | undefined {
  if (!name || !/^[\w-]+(\.[\w-]+)+$/.test(name)) return name;
  const lang = files.find((e) => e.name === `${root}texts/en_US.lang`);
  const text = lang ? readText(lang) : null;
  if (!text) return name;
  for (const line of text.split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq > 0 && line.slice(0, eq).trim() === name) {
      return str(line.slice(eq + 1).split('\t')[0].replace(/#.*$/, '')) ?? name;
    }
  }
  return name;
}

export function inspectBedrockAddon(buf: Buffer): MinecraftResult {
  const zip = openZip(buf);
  if (!zip.ok) return fail(zip.error);
  const files = filesOf(zip.entries);

  // Every loose file must sit in a pack folder that has its own manifest.json.
  // A lone top folder is a wrapper, unless it has its own manifest.json: then it
  // is the add-on's only pack folder (an .mcaddon with just a behaviour pack).
  const wrapper = commonRoot(files.filter((e) => entryExtension(e.name) !== 'mcpack'));
  const root = wrapper && files.some((e) => e.name === `${wrapper}manifest.json`) ? '' : wrapper;
  const packFolders = new Set(
    files
      .filter((e) => e.name.startsWith(root) && /^[^/]+\/manifest\.json$/.test(e.name.slice(root.length)))
      .map((e) => root + e.name.slice(root.length).split('/')[0] + '/'),
  );
  for (const e of files) {
    if (entryExtension(e.name) === 'mcpack' && !e.name.slice(root.length).includes('/')) continue;
    if (!Array.from(packFolders).some((f) => e.name.startsWith(f))) {
      return fail(`${quote(e.name)} is not inside a pack folder with a manifest.json`);
    }
  }
  const scan = scanBedrock(files, BEDROCK_PACK_EXTENSIONS, '.mcaddon', { nestedPacks: true });
  if ('error' in scan) return fail(scan.error);
  if (scan.manifests.length === 0) return fail('the .mcaddon contains no packs');
  return bedrockResult('bedrock-addon', zip, scan);
}

export function inspectBedrockWorld(buf: Buffer, template: boolean): MinecraftResult {
  const kind = template ? '.mctemplate' : '.mcworld';
  const zip = openZip(buf);
  if (!zip.ok) return fail(zip.error);
  const files = filesOf(zip.entries);
  const root = commonRoot(files);
  if (!files.some((e) => e.name === `${root}level.dat`)) return fail(`the ${kind} has no level.dat at its top level`);
  const manifest = files.find((e) => e.name === `${root}manifest.json`);
  if (template && !manifest) return fail('the .mctemplate has no manifest.json at its top level');
  const scan = scanBedrock(files, BEDROCK_WORLD_EXTENSIONS, kind, { leveldb: true });
  if ('error' in scan) return fail(scan.error);
  let primary: BedrockManifest | undefined;
  if (manifest) {
    const m = readBedrockManifest(manifest);
    if (typeof m === 'string') return fail(m);
    primary = m;
  }
  return bedrockResult(template ? 'bedrock-template' : 'bedrock-world', zip, scan, primary);
}

/** Keep the limits visible next to the rules that rely on them. */
export const MINECRAFT_LIMITS = { maxManifestBytes: MAX_MANIFEST_BYTES, maxNestedPackBytes: MAX_NESTED_PACK_BYTES, ...ZIP_LIMITS };
