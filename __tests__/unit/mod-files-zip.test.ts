// @vitest-environment node
/**
 * Hosted mod files: the byte-level checks every creator upload must pass
 * before an admin can even review it. Each malformed archive here is built
 * by hand (see __tests__/helpers/buildZip.ts) because real zip tools refuse
 * to write them, and they are exactly what an attacker would send.
 */
import { describe, expect, it } from 'vitest';
import { checkEntryPath, inspectZip } from '@/lib/modFiles/zipInspect';
import { checkDbpf, validateModFileBytes } from '@/lib/modFiles/validate';
import { MAX_MOD_FILE_BYTES } from '@/lib/modFiles/constants';
import { buildZip, fakePackage, fakeTs4script, unicodePathExtra } from '../helpers/buildZip';

const SYMLINK_ATTR = (0o120777 << 16) >>> 0;
const FIFO_ATTR = (0o010644 << 16) >>> 0;

function rejected(buf: Buffer, profile: 'mod-zip' | 'ts4script' = 'mod-zip'): string {
  const r = inspectZip(buf, profile);
  if (r.ok) throw new Error('expected the archive to be rejected');
  return r.error;
}

describe('inspectZip — archives we accept', () => {
  it('accepts a zip of .package files with a readme and a preview image', () => {
    const r = inspectZip(
      buildZip([
        { name: 'Hair/' },
        { name: 'Hair/MyHair.package', data: fakePackage() },
        { name: 'Hair/MyHair_Accessory.package', data: fakePackage(), method: 0 },
        { name: 'README.txt', data: 'Put the .package files in Mods.' },
        { name: 'preview.png', data: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
      ]),
      'mod-zip',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.packageCount).toBe(2);
    expect(r.scriptCount).toBe(0);
    expect(r.containsScript).toBe(false);
    expect(r.entryCount).toBe(5);
  });

  it('accepts a zip with a nested .ts4script and flags it as a script mod', () => {
    const r = inspectZip(
      buildZip([
        { name: 'MyMod.package', data: fakePackage() },
        { name: 'MyMod.ts4script', data: fakeTs4script([{ name: 'mymod/config.json', data: '{}' }]), method: 0 },
      ]),
      'mod-zip',
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.containsScript).toBe(true);
    expect(r.scriptCount).toBe(1);
    expect(r.nested).toEqual([{ name: 'MyMod.ts4script', entries: ['mymod/__init__.pyc', 'mymod/config.json'] }]);
  });

  it('accepts a .ts4script on its own', () => {
    const r = inspectZip(fakeTs4script(), 'ts4script');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.containsScript).toBe(true);
  });

  it('tolerates macOS Finder metadata, which the game never loads', () => {
    const r = inspectZip(
      buildZip([
        { name: 'MyHair.package', data: fakePackage() },
        { name: '__MACOSX/._MyHair.package', data: 'resource fork junk' },
        { name: '.DS_Store', data: 'finder junk' },
      ]),
      'mod-zip',
    );
    expect(r.ok).toBe(true);
  });

  it('accepts a matching Info-ZIP Unicode Path extra field', () => {
    const r = inspectZip(
      buildZip([{ name: 'Café.package', data: fakePackage(), extra: unicodePathExtra('Café.package') }]),
      'mod-zip',
    );
    expect(r.ok).toBe(true);
  });
});

describe('inspectZip — structure attacks', () => {
  it('rejects a file that is not a zip at all', () => {
    expect(rejected(fakePackage())).toMatch(/does not start like a zip/);
    expect(rejected(Buffer.from('<html><script>alert(1)</script></html>'.padEnd(64, ' ')))).toMatch(
      /does not start like a zip/,
    );
  });

  it('rejects bytes hidden before the first entry (polyglot / self-extractor)', () => {
    const zip = buildZip([{ name: 'a.package', data: fakePackage() }], { prefix: Buffer.from('MZ\x90\x00 fake exe stub') });
    expect(rejected(zip)).toMatch(/does not start like a zip/);
  });

  it('rejects bytes appended after the end of the archive', () => {
    const zip = buildZip([{ name: 'a.package', data: fakePackage() }], { trailing: Buffer.from('appended payload') });
    expect(rejected(zip)).toMatch(/damaged or has extra data appended/);
  });

  it('rejects bytes hidden between two entries', () => {
    const zip = buildZip(
      [
        { name: 'a.package', data: fakePackage() },
        { name: 'b.package', data: fakePackage() },
      ],
      { gapAfter: { 0: Buffer.from('hidden bytes no extractor lists') } },
    );
    expect(rejected(zip)).toMatch(/hidden data between entries/);
  });

  it('rejects bytes hidden before the central directory', () => {
    const zip = buildZip([{ name: 'a.package', data: fakePackage() }], { beforeCd: Buffer.from('hidden tail') });
    expect(rejected(zip)).toMatch(/hidden data before its directory/);
  });

  it('rejects two directory entries pointing at the same bytes', () => {
    const zip = buildZip(
      [
        { name: 'a.package', data: fakePackage() },
        { name: 'a.package', data: fakePackage() },
      ],
      { localOffsetFrom: { 1: 0 } },
    );
    expect(rejected(zip)).toMatch(/overlapping entries/);
  });

  it('rejects a local header whose name differs from the directory (extractor confusion)', () => {
    const zip = buildZip([{ name: 'readme.txt', localName: 'evil.exe', data: 'x' }]);
    expect(rejected(zip)).toMatch(/two different names/);
  });

  it('rejects a Unicode Path extra field that names a different file', () => {
    const zip = buildZip([{ name: 'a.package', data: fakePackage(), extra: unicodePathExtra('../../evil.exe') }]);
    expect(rejected(zip)).toMatch(/two different names/);
  });

  it('rejects a local header whose compression method differs from the directory', () => {
    const zip = buildZip([{ name: 'a.package', data: fakePackage(), localMethod: 0 }]);
    expect(rejected(zip)).toMatch(/malformed/);
  });

  it('rejects encrypted or password-protected entries', () => {
    expect(rejected(buildZip([{ name: 'a.package', data: fakePackage(), flags: 0x0801 }]))).toMatch(/encrypted/);
    expect(rejected(buildZip([{ name: 'a.package', data: fakePackage(), flags: 0x2800 }]))).toMatch(/encrypted/);
  });

  it('rejects compression methods we cannot inspect', () => {
    expect(rejected(buildZip([{ name: 'a.package', data: fakePackage(), method: 12 }]))).toMatch(
      /unsupported compression method/,
    );
  });

  it('rejects a stored entry whose sizes disagree', () => {
    const zip = buildZip([{ name: 'a.package', data: fakePackage(), method: 0, cdSize: 9999 }]);
    expect(rejected(zip)).toMatch(/malformed/);
  });

  it('rejects an empty archive', () => {
    expect(rejected(buildZip([]))).toMatch(/too small|empty|does not start/);
  });

  it('rejects entry names that are not valid UTF-8', () => {
    const zip = buildZip([{ name: 'x', rawName: Buffer.from([0x61, 0xff, 0xfe, 0x2e, 0x70]), data: 'x' }]);
    expect(rejected(zip)).toMatch(/not valid text/);
  });

  it('rejects Unix symbolic links', () => {
    const zip = buildZip([
      { name: 'a.package', data: fakePackage() },
      { name: 'link.package', data: '../../../../etc/passwd', method: 0, extAttr: SYMLINK_ATTR },
    ]);
    expect(rejected(zip)).toMatch(/symbolic link/);
  });

  it('rejects other Unix special files', () => {
    const zip = buildZip([{ name: 'a.package', data: fakePackage(), extAttr: FIFO_ATTR }]);
    expect(rejected(zip)).toMatch(/special file/);
  });

  it('rejects a compression bomb', () => {
    const zip = buildZip([{ name: 'zeros.package', data: Buffer.alloc(11 * 1024 * 1024) }]);
    expect(rejected(zip)).toMatch(/compression ratio/);
  });
});

describe('inspectZip — path attacks', () => {
  const one = (name: string) => rejected(buildZip([{ name, data: fakePackage() }]));

  it('rejects path traversal', () => {
    expect(one('../evil.package')).toMatch(/tries to leave/);
    expect(one('Mods/../../evil.package')).toMatch(/tries to leave/);
  });

  it('rejects absolute and drive-letter paths', () => {
    expect(one('/etc/evil.package')).toMatch(/absolute path/);
    expect(one('C:/Windows/evil.package')).toMatch(/drive-letter/);
  });

  it('rejects backslash separators', () => {
    expect(one('Mods\\..\\evil.package')).toMatch(/backslash/);
  });

  it('rejects bidi overrides and control characters (e.g. a name that displays as .package)', () => {
    expect(one('evil\u202Eegakcap.exe')).toMatch(/hidden or control characters/);
    expect(one('evil\u0000.package')).toMatch(/hidden or control characters/);
    expect(one('evil\u200B.package')).toMatch(/hidden or control characters/);
  });

  it('rejects reserved Windows names and names ending in a dot or space', () => {
    expect(one('CON.package')).toMatch(/reserved Windows name/);
    expect(one('Mods/lpt1.package')).toMatch(/reserved Windows name/);
    expect(one('Mods./a.package')).toMatch(/ends with a dot or space/);
  });

  it('rejects paths nested too deeply or too long', () => {
    expect(one('a/b/c/d/e/f/g/h/i.package')).toMatch(/nested too deeply/);
    expect(one(`${'x'.repeat(260)}.package`)).toMatch(/too long/);
  });

  it('rejects the same file twice, including case and Unicode-normalisation variants', () => {
    const zip = buildZip([
      { name: 'Hair.package', data: fakePackage() },
      { name: 'hair.PACKAGE', data: fakePackage() },
    ]);
    expect(rejected(zip)).toMatch(/same file twice/);
    const nfc = buildZip([
      { name: 'Caf\u00e9.package', data: fakePackage() },
      { name: 'Cafe\u0301.package', data: fakePackage() },
    ]);
    expect(rejected(nfc)).toMatch(/same file twice/);
  });

  it('checkEntryPath accepts ordinary mod paths', () => {
    expect(checkEntryPath('Mods/Creator - Hair (v2)/Hair_01.package')).toBeNull();
    expect(checkEntryPath('Tray/0x00000001!0x0000000000000001.trayitem')).toBeNull();
  });
});

describe('inspectZip — content rules', () => {
  it('rejects executables and other file types the game does not use', () => {
    for (const name of ['setup.exe', 'run.bat', 'payload.js', 'macro.docm', 'lib.dll', 'inner.zip', 'noext']) {
      const zip = buildZip([
        { name: 'a.package', data: fakePackage() },
        { name, data: 'x' },
      ]);
      expect(rejected(zip)).toMatch(/file type we do not accept/);
    }
  });

  it('rejects a .package entry that is not a DBPF file', () => {
    const zip = buildZip([{ name: 'a.package', data: 'MZ this is really an exe' }]);
    expect(rejected(zip)).toMatch(/is not a valid \.package file/);
  });

  it('rejects a zip with no .package or .ts4script in it', () => {
    const zip = buildZip([{ name: 'README.txt', data: 'hello' }]);
    expect(rejected(zip)).toMatch(/does not contain any \.package or \.ts4script/);
  });

  it('rejects native code inside a .ts4script', () => {
    for (const name of ['mymod/native.pyd', 'mymod/native.dll', 'mymod/native.so']) {
      expect(rejected(fakeTs4script([{ name, data: 'MZ' }]), 'ts4script')).toMatch(/file type we do not accept/);
    }
  });

  it('rejects native code inside a .ts4script inside a zip', () => {
    const zip = buildZip([
      { name: 'MyMod.ts4script', data: fakeTs4script([{ name: 'mymod/native.pyd', data: 'MZ' }]), method: 0 },
    ]);
    expect(rejected(zip)).toMatch(/MyMod\.ts4script.*file type we do not accept/);
  });

  it('rejects a .ts4script with no Python in it', () => {
    expect(rejected(buildZip([{ name: 'readme.txt', data: 'x' }]), 'ts4script')).toMatch(/does not contain any Python/);
  });

  it('rejects .package files inside a .ts4script', () => {
    expect(rejected(fakeTs4script([{ name: 'a.package', data: fakePackage() }]), 'ts4script')).toMatch(
      /file type we do not accept/,
    );
  });
});

describe('checkDbpf', () => {
  it('accepts a DBPF 2.x header', () => {
    expect(checkDbpf(fakePackage())).toEqual({ ok: true, version: '2.1', resourceCount: 0 });
  });

  it('rejects too-small files, wrong magic and unsupported versions', () => {
    expect(checkDbpf(Buffer.from('DBPF')).ok).toBe(false);
    const wrong = fakePackage();
    wrong.write('PK\x03\x04', 0, 'latin1');
    expect(checkDbpf(wrong)).toMatchObject({ ok: false, error: expect.stringMatching(/wrong file signature/) });
    const v3 = fakePackage();
    v3.writeUInt32LE(3, 4);
    expect(checkDbpf(v3)).toMatchObject({ ok: false, error: expect.stringMatching(/unsupported .package version/) });
  });

  it('rejects an index that points outside the file', () => {
    const b = fakePackage();
    b.writeUInt32LE(5, 36); // 5 resources
    b.writeUInt32LE(1000, 44); // index size
    b.writeUInt32LE(96, 64); // index position
    expect(checkDbpf(b)).toMatchObject({ ok: false, error: expect.stringMatching(/index outside the file/) });
  });
});

describe('validateModFileBytes', () => {
  it('rejects empty and oversized files', () => {
    expect(validateModFileBytes(Buffer.alloc(0), 'package')).toMatchObject({ ok: false });
    expect(validateModFileBytes(Buffer.alloc(MAX_MOD_FILE_BYTES + 1), 'zip')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/larger than 100 MB/),
    });
  });

  it('checks the bytes against the declared kind, never the extension alone', () => {
    const zip = buildZip([{ name: 'a.package', data: fakePackage() }]);
    expect(validateModFileBytes(zip, 'package').ok).toBe(false);
    expect(validateModFileBytes(fakePackage(), 'zip').ok).toBe(false);
    expect(validateModFileBytes(zip, 'ts4script').ok).toBe(false);
  });

  it('returns a SHA-256 and a summary for accepted files', () => {
    const r = validateModFileBytes(fakePackage(), 'package');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inspection.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(r.inspection.containsScript).toBe(false);
    expect(r.inspection.summary).toMatchObject({ format: 'DBPF', dbpfVersion: '2.1' });

    const s = validateModFileBytes(fakeTs4script(), 'ts4script');
    expect(s.ok && s.inspection.containsScript).toBe(true);
  });
});
