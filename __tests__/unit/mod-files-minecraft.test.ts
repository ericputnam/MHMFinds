// @vitest-environment node
/**
 * Minecraft hosted files: the byte-level rules in lib/modFiles/minecraft.ts,
 * how validateModFileBytes routes each kind, and the game check that stops a
 * Minecraft file being attached to a Sims 4 mod (and the reverse).
 */
import { describe, expect, it, vi } from 'vitest';
import { buildZip, fakePackage, type ZipEntrySpec } from '../helpers/buildZip';

// lifecycle.ts imports prisma and storage; gameMismatchError touches neither.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/modFiles/storage', () => ({}));

import {
  inspectBedrockAddon,
  inspectBedrockPack,
  inspectBedrockWorld,
  inspectJavaMod,
  inspectJavaPack,
} from '@/lib/modFiles/minecraft';
import { validateModFileBytes } from '@/lib/modFiles/validate';
import { gameMismatchError } from '@/lib/modFiles/lifecycle';
import { fileGameOf, hostedGameOf, kindListText, kindsForGame } from '@/lib/modFiles/constants';

const CLASS = Buffer.concat([Buffer.from([0xca, 0xfe, 0xba, 0xbe, 0, 0, 0, 65]), Buffer.alloc(64, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 2)]);
const UUID_A = '8c6e3a38-4f4b-4b84-9a43-5b3c2f2a1a01';
const UUID_B = '8c6e3a38-4f4b-4b84-9a43-5b3c2f2a1a02';

const FABRIC_JSON = JSON.stringify({
  schemaVersion: 1,
  id: 'examplemod',
  version: '1.0.0',
  name: 'Example Mod',
  depends: { minecraft: '~1.21.1' },
});

function fabricJar(extra: ZipEntrySpec[] = []): Buffer {
  return buildZip([
    { name: 'META-INF/MANIFEST.MF', data: 'Manifest-Version: 1.0\n' },
    { name: 'fabric.mod.json', data: FABRIC_JSON },
    { name: 'com/example/ExampleMod.class', data: CLASS },
    { name: 'assets/examplemod/icon.png', data: PNG },
    ...extra,
  ]);
}

function manifest(type: string, name = 'Example Pack', uuid = UUID_A): string {
  return JSON.stringify({
    format_version: 2,
    header: { name, uuid, version: [1, 0, 0], min_engine_version: [1, 20, 0] },
    modules: [{ type, uuid: uuid.replace(/.$/, 'f'), version: [1, 0, 0] }],
  });
}

describe('Java mods (.jar)', () => {
  it('accepts a Fabric mod and flags it as running code', () => {
    const r = inspectJavaMod(fabricJar());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.format).toBe('java-mod');
    expect(r.runsCode).toBe(true);
    expect(r.codeFileCount).toBe(1);
    expect(r.details.loader).toBe('fabric');
    expect(r.details.modId).toBe('examplemod');
    expect(r.details.name).toBe('Example Mod');
  });

  it('accepts a Forge mod described by META-INF/mods.toml', () => {
    const jar = buildZip([
      {
        name: 'META-INF/mods.toml',
        data: 'modLoader="javafml"\nloaderVersion="[47,)"\n[[mods]]\nmodId="forgeexample"\nversion="2.0.0"\ndisplayName="Forge Example"\n',
      },
      { name: 'com/example/ForgeMod.class', data: CLASS },
    ]);
    const r = inspectJavaMod(jar);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.details.loader).toBe('forge');
    expect(r.details.modId).toBe('forgeexample');
  });

  it('refuses native code', () => {
    const r = inspectJavaMod(fabricJar([{ name: 'natives/helper.dll', data: 'MZ' }]));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toMatch(/native code or a program/);
  });

  it('refuses a bundled jar', () => {
    const r = inspectJavaMod(fabricJar([{ name: 'META-INF/jars/lib.jar', data: fabricJar() }]));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toMatch(/another archive/);
  });

  it('refuses a jar with no mod metadata', () => {
    const r = inspectJavaMod(buildZip([{ name: 'com/example/Main.class', data: CLASS }]));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toMatch(/not a Minecraft mod/);
  });

  it('refuses a jar with no compiled code', () => {
    const r = inspectJavaMod(buildZip([{ name: 'fabric.mod.json', data: FABRIC_JSON }]));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toMatch(/no compiled code/);
  });

  it('refuses a .class file without the Java magic number', () => {
    const r = inspectJavaMod(
      buildZip([
        { name: 'fabric.mod.json', data: FABRIC_JSON },
        { name: 'com/example/Fake.class', data: 'not a class file at all' },
      ]),
    );
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toMatch(/not a valid Java class file/);
  });

  it('refuses a Fabric id that is not lower-case', () => {
    const r = inspectJavaMod(
      buildZip([
        { name: 'fabric.mod.json', data: JSON.stringify({ schemaVersion: 1, id: 'BadId', version: '1' }) },
        { name: 'a/B.class', data: CLASS },
      ]),
    );
    expect(r).toMatchObject({ ok: false });
  });
});

describe('Java resource and skin packs (.zip)', () => {
  const pack = () =>
    buildZip([
      { name: 'pack.mcmeta', data: JSON.stringify({ pack: { pack_format: 34, description: 'Skins' } }) },
      { name: 'assets/minecraft/textures/entity/player/wide/steve.png', data: PNG },
    ]);

  it('accepts a pack with pack.mcmeta and textures', () => {
    const r = inspectJavaPack(pack());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.runsCode).toBe(false);
    expect(r.details.packFormat).toBe(34);
  });

  it('refuses a .png that is not a PNG', () => {
    const r = inspectJavaPack(buildZip([{ name: 'textures/skin.png', data: 'GIF89a' }]));
    expect(r).toMatchObject({ ok: false });
  });

  it('validateModFileBytes treats a texture zip as Minecraft and a .package zip as Sims', () => {
    const mc = validateModFileBytes(pack(), 'zip');
    expect(mc.ok && mc.inspection.game).toBe('minecraft');
    expect(mc.ok && mc.inspection.containsScript).toBe(false);

    const sims = validateModFileBytes(buildZip([{ name: 'Mods/thing.package', data: fakePackage() }]), 'zip');
    expect(sims.ok && sims.inspection.game).toBe('sims4');
  });

  it('a zip that is neither names both games in its error', () => {
    const r = validateModFileBytes(buildZip([{ name: 'readme.txt', data: 'hello' }]), 'zip');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no Sims 4 mod files.*no Minecraft pack files/);
  });
});

describe('Bedrock packs and add-ons', () => {
  it('accepts a resource .mcpack', () => {
    const r = inspectBedrockPack(
      buildZip([
        { name: 'manifest.json', data: manifest('resources') },
        { name: 'textures/blocks/stone.png', data: PNG },
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.runsCode).toBe(false);
    expect(r.details.packTypes).toEqual(['resources']);
    expect(r.details.name).toBe('Example Pack');
  });

  it('accepts a pack inside a single top folder', () => {
    const r = inspectBedrockPack(
      buildZip([
        { name: 'MyPack/manifest.json', data: manifest('resources') },
        { name: 'MyPack/pack_icon.png', data: PNG },
      ]),
    );
    expect(r.ok).toBe(true);
  });

  it('refuses a .mcpack with no manifest.json', () => {
    const r = inspectBedrockPack(buildZip([{ name: 'textures/a.png', data: PNG }]));
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toMatch(/no manifest\.json/);
  });

  it('refuses a manifest without a header uuid', () => {
    const bad = JSON.stringify({ format_version: 2, header: { name: 'x' }, modules: [{ type: 'resources' }] });
    const r = inspectBedrockPack(buildZip([{ name: 'manifest.json', data: bad }]));
    expect(r).toMatchObject({ ok: false });
  });

  it('flags a behaviour pack with a script module', () => {
    const r = inspectBedrockPack(
      buildZip([
        { name: 'manifest.json', data: manifest('script') },
        { name: 'scripts/main.js', data: 'import { world } from "@minecraft/server";' },
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.runsCode).toBe(true);
    expect(r.codeFileCount).toBe(1);
  });

  it('refuses an executable inside a pack', () => {
    const r = inspectBedrockPack(
      buildZip([
        { name: 'manifest.json', data: manifest('resources') },
        { name: 'setup.exe', data: 'MZ' },
      ]),
    );
    expect(r).toMatchObject({ ok: false });
  });

  it('accepts an .mcaddon of two pack folders', () => {
    const r = inspectBedrockAddon(
      buildZip([
        { name: 'Example RP/manifest.json', data: manifest('resources', 'RP', UUID_A) },
        { name: 'Example RP/textures/a.png', data: PNG },
        { name: 'Example BP/manifest.json', data: manifest('data', 'BP', UUID_B) },
        { name: 'Example BP/functions/hello.mcfunction', data: 'say hi' },
      ]),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.details.packTypes?.sort()).toEqual(['data', 'resources']);
  });

  it('accepts an .mcaddon of nested .mcpack files', () => {
    const inner = buildZip([
      { name: 'manifest.json', data: manifest('resources') },
      { name: 'textures/a.png', data: PNG },
    ]);
    const r = inspectBedrockAddon(buildZip([{ name: 'Example.mcpack', data: inner }]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nested?.[0].name).toBe('Example.mcpack');
  });

  it('refuses an .mcaddon file outside any pack folder', () => {
    const r = inspectBedrockAddon(
      buildZip([
        { name: 'RP/manifest.json', data: manifest('resources') },
        { name: 'stray/notes.txt', data: 'hi' },
      ]),
    );
    expect(r).toMatchObject({ ok: false });
  });
});

describe('Bedrock worlds', () => {
  const world = (extra: ZipEntrySpec[] = []) =>
    buildZip([
      { name: 'level.dat', data: Buffer.alloc(16, 3) },
      { name: 'levelname.txt', data: 'My World' },
      { name: 'db/CURRENT', data: 'MANIFEST-000001\n' },
      { name: 'db/MANIFEST-000001', data: Buffer.alloc(8) },
      { name: 'db/000003.ldb', data: Buffer.alloc(8) },
      ...extra,
    ]);

  it('accepts an .mcworld with level.dat and a LevelDB folder', () => {
    const r = inspectBedrockWorld(world(), false);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.runsCode).toBe(false);
  });

  it('refuses a world with no level.dat', () => {
    const r = inspectBedrockWorld(buildZip([{ name: 'db/CURRENT', data: 'x' }]), false);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toMatch(/no level\.dat/);
  });

  it('a .mctemplate also needs a manifest.json', () => {
    expect(inspectBedrockWorld(world(), true)).toMatchObject({ ok: false });
    const r = inspectBedrockWorld(world([{ name: 'manifest.json', data: manifest('world_template') }]), true);
    expect(r.ok).toBe(true);
  });
});

describe('validateModFileBytes: every Minecraft kind is a Minecraft file', () => {
  it.each([
    ['jar', fabricJar()],
    ['mcpack', buildZip([{ name: 'manifest.json', data: manifest('skin_pack') }, { name: 'steve.png', data: PNG }])],
    ['mcaddon', buildZip([{ name: 'RP/manifest.json', data: manifest('resources') }])],
    ['mcworld', buildZip([{ name: 'level.dat', data: Buffer.alloc(4) }])],
  ] as const)('%s', (kind, buf) => {
    const r = validateModFileBytes(buf, kind);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inspection.game).toBe('minecraft');
    expect(r.inspection.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r.inspection.containsScript).toBe(kind === 'jar');
  });
});

describe('game check', () => {
  it('maps game names to hostable games', () => {
    expect(hostedGameOf('Sims 4')).toBe('sims4');
    expect(hostedGameOf('Minecraft')).toBe('minecraft');
    expect(hostedGameOf('Stardew Valley')).toBeNull();
    expect(kindsForGame('sims4')).not.toContain('jar');
    expect(kindListText('sims4')).toBe('.package, .ts4script or .zip');
  });

  it('reads a zip game from the inspection, defaulting old rows to Sims', () => {
    expect(fileGameOf('zip', { game: 'minecraft' })).toBe('minecraft');
    expect(fileGameOf('zip', {})).toBe('sims4');
    expect(fileGameOf('jar', null)).toBe('minecraft');
  });

  it('refuses a Minecraft file on a Sims 4 mod and the reverse', () => {
    expect(gameMismatchError('jar', { game: 'minecraft' }, 'Sims 4')).toMatch(/Minecraft file, but this mod is for Sims 4/);
    expect(gameMismatchError('package', { game: 'sims4' }, 'Minecraft')).toMatch(/Sims 4 file, but this mod is for Minecraft/);
    expect(gameMismatchError('jar', { game: 'minecraft' }, 'Minecraft')).toBeNull();
  });

  it('refuses a hosted file for a game we cannot host', () => {
    expect(gameMismatchError('zip', { game: 'sims4' }, 'Stardew Valley')).toMatch(/only be hosted for Sims 4 and Minecraft/);
  });

  it('skips the check when the caller gives no game', () => {
    expect(gameMismatchError('jar', { game: 'minecraft' }, undefined)).toBeNull();
  });
});

describe('.mcaddon folder layout', () => {
  it('accepts a single pack folder, and the same packs inside a wrapper folder', () => {
    expect(inspectBedrockAddon(buildZip([{ name: 'BP/manifest.json', data: manifest('data') }])).ok).toBe(true);
    const wrapped = buildZip([
      { name: 'Addon/RP/manifest.json', data: manifest('resources', 'RP', UUID_A) },
      { name: 'Addon/BP/manifest.json', data: manifest('data', 'BP', UUID_B) },
    ]);
    expect(inspectBedrockAddon(wrapped).ok).toBe(true);
  });
});
