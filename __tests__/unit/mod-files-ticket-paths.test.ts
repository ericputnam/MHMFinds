// @vitest-environment node
/**
 * Hosted mod files: download tickets (the server-side half of the /go
 * countdown), blob path rules, the saved-as filename, and the feature switch.
 */
import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { signTicket, verifyTicket } from '@/lib/modFiles/ticket';
import {
  approvedPath,
  isApprovedPath,
  isManagedPath,
  isQuarantinePathFor,
  isUploadId,
  newUploadId,
  quarantinePath,
} from '@/lib/modFiles/paths';
import { sanitizeDownloadName } from '@/lib/modFiles/filename';
import { hostedUploadsEnabled, modFilesToken } from '@/lib/modFiles/storage';
import { DOWNLOAD_TICKET_TTL_MS, DOWNLOAD_WAIT_MS, kindFromFilename } from '@/lib/modFiles/constants';

const SECRET = 'x'.repeat(48);
const UPLOAD = 'a'.repeat(32);
const NOW = 1_800_000_000_000;

function ticketAt(nbf = NOW + DOWNLOAD_WAIT_MS, exp = nbf + DOWNLOAD_TICKET_TTL_MS, m = 'mod123') {
  return signTicket({ u: UPLOAD, m, nbf, exp }, SECRET);
}

describe('download tickets', () => {
  it('refuses to mint or accept tickets without a strong secret (fails closed)', () => {
    expect(() => signTicket({ u: UPLOAD, m: 'm', nbf: 0, exp: 1 }, undefined)).toThrow();
    expect(() => signTicket({ u: UPLOAD, m: 'm', nbf: 0, exp: 1 }, 'short')).toThrow();
    const t = ticketAt();
    expect(verifyTicket(t, { modId: 'mod123', secret: undefined, now: NOW })).toEqual({ ok: false, reason: 'not-configured' });
    expect(verifyTicket(t, { modId: 'mod123', secret: 'x'.repeat(31), now: NOW })).toEqual({
      ok: false,
      reason: 'not-configured',
    });
  });

  it('is not usable before the countdown ends, and is usable after', () => {
    const t = ticketAt();
    expect(verifyTicket(t, { modId: 'mod123', secret: SECRET, now: NOW })).toEqual({ ok: false, reason: 'too-early' });
    expect(verifyTicket(t, { modId: 'mod123', secret: SECRET, now: NOW + DOWNLOAD_WAIT_MS - 1 }).ok).toBe(false);
    const ok = verifyTicket(t, { modId: 'mod123', secret: SECRET, now: NOW + DOWNLOAD_WAIT_MS });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.payload.u).toBe(UPLOAD);
  });

  it('expires', () => {
    const t = ticketAt();
    const exp = NOW + DOWNLOAD_WAIT_MS + DOWNLOAD_TICKET_TTL_MS;
    expect(verifyTicket(t, { modId: 'mod123', secret: SECRET, now: exp - 1 }).ok).toBe(true);
    expect(verifyTicket(t, { modId: 'mod123', secret: SECRET, now: exp })).toEqual({ ok: false, reason: 'expired' });
  });

  it('is bound to one mod', () => {
    expect(verifyTicket(ticketAt(), { modId: 'other', secret: SECRET, now: NOW + DOWNLOAD_WAIT_MS })).toEqual({
      ok: false,
      reason: 'wrong-mod',
    });
  });

  it('rejects a tampered body (e.g. an earlier nbf or another upload id)', () => {
    const [, mac] = ticketAt().split('.');
    const forged = Buffer.from(JSON.stringify({ v: 1, u: 'b'.repeat(32), m: 'mod123', nbf: 0, exp: NOW * 2 })).toString(
      'base64url',
    );
    expect(verifyTicket(`${forged}.${mac}`, { modId: 'mod123', secret: SECRET, now: NOW })).toEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('rejects a ticket signed with a different secret', () => {
    const other = signTicket({ u: UPLOAD, m: 'mod123', nbf: 0, exp: NOW * 2 }, 'y'.repeat(48));
    expect(verifyTicket(other, { modId: 'mod123', secret: SECRET, now: NOW })).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('is not interchangeable with a plain HMAC of the secret (purpose-labelled key)', () => {
    const body = Buffer.from(JSON.stringify({ v: 1, u: UPLOAD, m: 'mod123', nbf: 0, exp: NOW * 2 })).toString('base64url');
    const naive = createHmac('sha256', SECRET).update(body).digest('base64url');
    expect(verifyTicket(`${body}.${naive}`, { modId: 'mod123', secret: SECRET, now: NOW }).ok).toBe(false);
  });

  it('rejects malformed input', () => {
    for (const bad of [null, undefined, 42, '', 'abc', 'a.b.c', 'a b.c', `${'a'.repeat(600)}.b`]) {
      expect(verifyTicket(bad, { modId: 'mod123', secret: SECRET, now: NOW })).toMatchObject({ ok: false });
    }
  });
});

describe('blob paths', () => {
  it('mints 128-bit hex upload ids', () => {
    const a = newUploadId();
    expect(isUploadId(a)).toBe(true);
    expect(a).not.toBe(newUploadId());
    expect(isUploadId('../etc')).toBe(false);
    expect(isUploadId('A'.repeat(32))).toBe(false);
  });

  it('builds quarantine paths only from safe ids', () => {
    const id = newUploadId();
    expect(quarantinePath('clxuser12345', id, 'zip')).toBe(`mod-files/quarantine/clxuser12345/${id}.zip`);
    expect(() => quarantinePath('../../x', id, 'zip')).toThrow();
    expect(() => quarantinePath('clxuser12345', 'nothex', 'zip')).toThrow();
    expect(() => quarantinePath('clxuser12345', id, 'exe' as never)).toThrow();
  });

  it('ties a quarantine path to its owner and upload', () => {
    const id = newUploadId();
    const p = quarantinePath('clxuser12345', id, 'package');
    expect(isQuarantinePathFor(p, 'clxuser12345', id)).toBe(true);
    expect(isQuarantinePathFor(p, 'clxother1234', id)).toBe(false);
    expect(isQuarantinePathFor(p, 'clxuser12345', newUploadId())).toBe(false);
  });

  it('never treats a quarantine path, or anything outside mod-files/, as publicly downloadable', () => {
    const id = newUploadId();
    expect(isApprovedPath(approvedPath(id, 'Hair.package'))).toBe(true);
    expect(isApprovedPath(quarantinePath('clxuser12345', id, 'package'))).toBe(false);
    expect(isApprovedPath(`mod-files/approved/${id}/../quarantine/x.zip`)).toBe(false);
    expect(isManagedPath('mod-images/cover.webp')).toBe(false);
    expect(isManagedPath(`mod-files/approved/${id}/a/b.zip`)).toBe(false);
    expect(() => approvedPath(id, '../x.zip')).toThrow();
    expect(() => approvedPath('nothex', 'x.zip')).toThrow();
  });
});

describe('sanitizeDownloadName', () => {
  const id = 'f'.repeat(32);
  const cases: [string, 'package' | 'ts4script' | 'zip', string][] = [
    ['My Cool Hair.package', 'package', 'My_Cool_Hair.package'],
    ['../../etc/passwd', 'zip', 'passwd.zip'],
    ['C:\\Users\\me\\Desktop\\Mod.zip', 'zip', 'Mod.zip'],
    ['photo.jpg.exe', 'zip', 'photo_jpg.zip'],
    ['mod\u202Egnp.package', 'package', 'modgnp.package'],
    ['.hidden.package', 'package', 'hidden.package'],
    ['Script.TS4SCRIPT', 'ts4script', 'Script.ts4script'],
  ];
  it.each(cases)('%s → %s', (input, kind, expected) => {
    expect(sanitizeDownloadName(input, kind, id)).toBe(expected);
  });

  it('falls back to a generated name for empty or reserved names', () => {
    expect(sanitizeDownloadName('', 'zip', id)).toBe(`mod-${id.slice(0, 12)}.zip`);
    expect(sanitizeDownloadName('CON.package', 'package', id)).toBe(`mod-${id.slice(0, 12)}.package`);
    expect(sanitizeDownloadName('\u202E\u200B.zip', 'zip', id)).toBe(`mod-${id.slice(0, 12)}.zip`);
  });

  it('always produces a name the approved path accepts, with only the verified extension', () => {
    const hostile = ['a'.repeat(500), 'x/y\\z.exe', '<script>.zip', 'a..b..c', ' . ', 'naïve café.zip', '%2e%2e%2f.zip'];
    for (const input of hostile) {
      for (const kind of ['package', 'ts4script', 'zip'] as const) {
        const name = sanitizeDownloadName(input, kind, id);
        expect(() => approvedPath(id, name)).not.toThrow();
        expect(kindFromFilename(name)).toBe(kind);
        expect(name.split('.').length).toBe(2);
      }
    }
  });
});

describe('feature switch', () => {
  const token = 'vercel_blob_rw_abc_123';
  it('is off unless the private-store token and a strong secret are both set', () => {
    expect(hostedUploadsEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(hostedUploadsEnabled({ MOD_FILES_BLOB_READ_WRITE_TOKEN: token } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(
      hostedUploadsEnabled({ MOD_FILES_BLOB_READ_WRITE_TOKEN: token, NEXTAUTH_SECRET: 'short' } as unknown as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      hostedUploadsEnabled({ MOD_FILES_BLOB_READ_WRITE_TOKEN: token, NEXTAUTH_SECRET: SECRET } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it('never falls back to the public image store token', () => {
    const env = { BLOB_READ_WRITE_TOKEN: token, NEXTAUTH_SECRET: SECRET } as unknown as NodeJS.ProcessEnv;
    expect(modFilesToken(env)).toBeNull();
    expect(hostedUploadsEnabled(env)).toBe(false);
  });

  it('ignores a token with stray whitespace or the wrong shape', () => {
    expect(modFilesToken({ MOD_FILES_BLOB_READ_WRITE_TOKEN: `${token}\n` } as unknown as NodeJS.ProcessEnv)).toBe(token);
    expect(modFilesToken({ MOD_FILES_BLOB_READ_WRITE_TOKEN: 'not-a-token' } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
});
